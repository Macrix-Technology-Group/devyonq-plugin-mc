'use strict'
// Where the settings hook reads from (IP-MC-SERVER-002 Step 10; ARCH D19, D20, D23; AC-7, AC-21). The shipped copy reads
// no CanonQ variable and no credentials file: it resolves the client's session from the credential store, as mc17 login
// kept it, and every read goes to the harness gateway of that session through the client's own transport, one read route
// for each CanonQ path the settings modules name. No function here prints or ends the process: each answers a value, or
// { ok: false, refusal }.

const path = require('node:path')

/*  The client's parts, two folders above the plugin's harness folder: client/lib in a package, core/client/lib in a
 *  checkout of devyonq-mc. */
const CLIENT_LIB = path.join(__dirname, '..', '..', '..', 'client', 'lib')

/*  The two hosts a test gateway may stand on. */
const LOOPBACK = ['127.0.0.1', '[::1]']

/*  Compares two folders resolved, and on Windows without letter case. */
const sameFolder = (a, b) => (process.platform === 'win32' ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b))

/*  The home folder, read by name from USERPROFILE on Windows and from HOME elsewhere: { ok, home, name }, or a refusal that
 *  names the variable where it is unset or empty. */
function homeFolder () {
  const name = process.platform === 'win32' ? 'USERPROFILE' : 'HOME'
  const value = process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME
  if (!value) return { ok: false, refusal: 'REFUSED: the home folder variable ' + name + ' is ' + (value === undefined ? 'unset' : 'empty') + ', so the settings hook reads nothing.' }
  return { ok: true, home: value, name }
}

/*  An address split into its parts, or null where it is no absolute http or https address. */
function addressOf (value) {
  try {
    const u = new URL(String(value))
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { scheme: u.protocol.replace(/:$/, ''), origin: null, host: u.host, hostname: u.hostname }
    return { scheme: u.protocol.replace(/:$/, ''), origin: u.origin, host: u.host, hostname: u.hostname }
  } catch (e) {
    return null
  }
}

/*  The read route of the harness gateway each CanonQ path of the settings modules maps onto (ARCH Interface Contracts,
 *  The read kinds): { kind, query }, or null for a path no read route serves. */
function readRouteOf (route) {
  const p = String(route).replace(/\?.*$/, '')
  let m
  if (p === '/api/me') return { kind: 'me', query: {} }
  if (p === '/api/docbase/databases') return { kind: 'collections', query: {} }
  if ((m = /^\/api\/docbase\/databases\/([^/]+)\/documents$/.exec(p))) return { kind: 'collection', query: { id: decodeURIComponent(m[1]) } }
  if ((m = /^\/api\/docbase\/documents\/([^/]+)\/versions$/.exec(p))) return { kind: 'versions', query: { id: decodeURIComponent(m[1]) } }
  if ((m = /^\/api\/docbase\/documents\/([^/]+)$/.exec(p))) return { kind: 'document', query: { id: decodeURIComponent(m[1]) } }
  return null
}

/*  The client's context for the settings hook: the one the client handed where the hook runs inside it, else one built
 *  for this process from the client's own frame, with the session read from the credential store. Answers { ok, ctx } or
 *  { ok: false, refusal }. */
function clientContext (given) {
  try {
    const ctx = given || require(path.join(CLIENT_LIB, 'main.js')).contextOf({})
    const { openStore } = require(path.join(CLIENT_LIB, 'store.js'))
    const { readSession, tenantMismatch } = require(path.join(CLIENT_LIB, 'session.js'))
    ctx.store = ctx.store || openStore(ctx)
    ctx.session = ctx.session || readSession(ctx)
    const mismatch = tenantMismatch(ctx.session)
    if (mismatch) return { ok: false, refusal: 'REFUSED: ' + mismatch }
    return { ok: true, ctx }
  } catch (e) {
    return { ok: false, refusal: 'REFUSED: ' + String((e && e.message) || e).split('\n')[0] }
  }
}

/*  The GET the settings modules take, over the client's gateway transport: `get(url, pat)` reads the CanonQ path at the
 *  end of `url` through its read route and resolves { json, etag } with the content CanonQ answered; it rejects with
 *  `status` set where the gateway refuses, and with the cause in its message where DevyonQ cannot be reached. */
function gatewayGet (ctx) {
  const { call, refusalWords, Unreachable } = require(path.join(CLIENT_LIB, 'transport.js'))
  return async (url) => {
    const r = readRouteOf(String(url))
    if (!r) throw new Error('the path ' + String(url).slice(0, 120) + ' has no read route of the harness gateway')
    let res
    try {
      res = await call(ctx, 'reads', { kind: r.kind }, undefined, r.query)
    } catch (e) {
      if (e instanceof Unreachable) throw new Error('DevyonQ cannot be reached at ' + ctx.session.gateway + ' (' + e.why + ')')
      throw e
    }
    if (res.status === 502 || res.status === 504) throw new Error('DevyonQ cannot be reached at ' + ctx.session.gateway + ' (the gateway answered ' + res.status + ')')
    if (res.status !== 200) { const e = new Error('answered ' + res.status + ': ' + (refusalWords(ctx, res) || '')); e.status = res.status; throw e }
    if (!res.json || typeof res.json !== 'object' || !('content' in res.json)) throw new Error('answered no JSON')
    return { json: res.json.content, etag: res.json.etag || null }
  }
}

/*  Resolves the run's home folder and the client's session, refusing before any request where either does not stand.
 *  `options.client` is the client's context where the hook runs inside the client. Answers { ok, home, creds: { url, pat,
 *  ctx, get }, host, instance: { origin, host, named }, sameHost, gateway } or { ok: false, refusal }. The settings are
 *  read where the person signed in, so the host of the reads and the settings instance are one. */
function resolve (options) {
  const o = options || {}
  const h = homeFolder()
  if (!h.ok) return h
  const c = clientContext(o.client || null)
  if (!c.ok) return c
  const gateway = String(c.ctx.session.gateway).replace(/\/+$/, '')
  const a = addressOf(gateway)
  if (!a || !a.origin) return { ok: false, refusal: 'REFUSED: the client keeps no gateway address the hook can read; run mc17 login in a terminal of your own.' }
  return { ok: true, home: h.home, creds: { url: '', pat: null, ctx: c.ctx, get: gatewayGet(c.ctx) }, host: a.host, instance: { origin: a.origin, host: a.host, named: false }, sameHost: true, gateway }
}

/*  The refusal where the reads and the settings instance part, which a session from mc17 login never meets. */
function hostRefusal (r) {
  return 'REFUSED: the reads point to ' + r.host + ', and the settings instance is ' + r.instance.host + '. The settings hook reads the settings where the client signed in alone.'
}

/*  The line that says where the settings were read from. */
function instanceLine (r) {
  return 'the settings read through DevyonQ at ' + (r.gateway || r.instance.origin) + ', the gateway mc17 login kept'
}

module.exports = { CLIENT_LIB, LOOPBACK, addressOf, clientContext, gatewayGet, homeFolder, hostRefusal, instanceLine, readRouteOf, resolve, sameFolder }

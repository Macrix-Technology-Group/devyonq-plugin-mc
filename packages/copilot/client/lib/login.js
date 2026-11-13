'use strict'
// mc17 login (ARCH D15, D19; AC-10, AC-15, AC-28, AC-32):
//
//   mc17 login [--gateway <address>] [--tenant <tenant id or the person's DevyonQ MCP address>] [--token]
//
// Without --gateway the address is the production gateway. Without --tenant the browser sign-in opens the gateway's
// tenant page /choose-tenant first: the person signs in, picks one of their tenants, and the page sends the browser back to
// the loopback with the tenant's id, where the listener sends the same tab on to the sign-in for that tenant. --token
// needs --tenant, since no browser takes part. Login needs a terminal and refuses where none stands. With a
// browser the client signs in by OAuth with PKCE S256 and keeps the pqoat1 key and its pqort1 refresh token; with
// --token it reads a pqpat1 from the terminal with no echo, never from an argument. It then calls POST .../harness/session
// and keeps what the gateway answers, with the address, the tenant and the program paths, in the credential store,
// after a probe item proves the store works. It prints the gateway address, and for a gateway other than production
// the ids of its checking keys. No value it keeps is printed and no file holds one.
//
// For a gateway other than production it warns first and goes on only where the person types the gateway's host, before
// it reads any key. It records the node it checked, by its path and the sha256 of its bytes, in node.json of the
// client's own folder ~/.mc17/client, which the launchers read and check at every start; the credential store holds no
// program path the launchers run (the review of IP-MC-SERVER-002).
//
//   mc17 logout
//
// Removes every item the client keeps of a sign-in from the credential store, and the record of node, so the computer
// counts as one with no sign-in. Like login it needs a terminal of the person's own. The key DevyonQ issued stays valid
// until it expires or the person revokes its connection on DevyonQ's Connect AI agent page, which it says.

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { spawn } = require('node:child_process')
const { admitsAddress, originRequest, refusalOf, Unreachable } = require('./transport.js')
const { contractHeader } = require('./contract.js')
const { openStore, ITEMS } = require('./store.js')
const { probe } = require('./os-store.js')
const { resolvePrograms } = require('./programs.js')
const { writeAtomic } = require('./places.js')

/*  The production gateway (IP-MC-SERVER-002 Step 6). */
const PRODUCTION = 'https://app.devyonq.ai'
/*  The path of the client document the gateway's origin serves (D19). */
const CLIENT_DOCUMENT = '/mc17/oauth-client.json'
/*  The loopback return path the client document names. */
const RETURN_PATH = '/callback'
/*  The gateway's tenant page, which a person opens to pick a tenant where login names none (devyonq-saas
 *  src/platform/client/choose-tenant.ts), and the loopback path it returns the tenant to. */
const TENANT_PAGE = '/choose-tenant'
const TENANT_PATH = '/tenant'
/*  A tenant id as DevyonQ issues one, the one form the tenant page may hand back. */
const TENANT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/*  The longest the browser sign-in waits for the browser to come back to the loopback (the review of IP-MC-SERVER-002);
 *  past it the listener closes and login fails, naming the wait. The test build alone may name a shorter one. */
const SIGN_IN_DEADLINE_MS = 5 * 60 * 1000
/*  A personal access token as DevyonQ issues one: pqpat1.<key id>.<secret>, the key id a UUID and the secret 32 random
 *  bytes in base64url (devyonq-saas src/platform/server/identity/agent-access.ts, sessions.ts newSecretWithHash). */
const PAT_FORM = /^pqpat1\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[A-Za-z0-9_-]{20,}$/i

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/*  The flags of mc17 login, refusing any other: { gateway, tenant, token } or { refused }. */
function loginArgs (argv) {
  const out = { gateway: null, tenant: null, token: false }
  for (let i = 1; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--token') out.token = true
    else if (a === '--gateway' || a === '--tenant') {
      if (argv[i + 1] === undefined) return { refused: a + ' takes a value' }
      out[a.slice(2)] = argv[i + 1]
      i += 1
    } else return { refused: 'mc17 login takes --gateway <address>, --tenant <tenant> and --token, and no ' + a }
  }
  if (!out.tenant && out.token) return { refused: 'mc17 login --token needs --tenant <tenant id or your DevyonQ MCP address>; without --token you pick the tenant in the browser' }
  return out
}

/*  The tenant id of `given`, a tenant id or a DevyonQ MCP address of the gateway `gateway`: { tenant } or { refused }. */
function tenantOf (given, gateway) {
  const s = String(given).trim()
  const m = /^(https?:\/\/[^/]+)\/api\/v1\/tenants\/([^/]+)\/devyonq\/mcp\/?$/.exec(s)
  if (m) {
    if (new URL(m[1]).origin !== new URL(gateway).origin) return { refused: 'the MCP address ' + s + ' stands at ' + m[1] + ', and the gateway is ' + gateway + '; name the gateway with --gateway' }
    return { tenant: decodeURIComponent(m[2]) }
  }
  if (/^[A-Za-z0-9_-]{1,100}$/.test(s)) return { tenant: s }
  return { refused: 'the tenant ' + JSON.stringify(s) + ' is neither a tenant id nor a DevyonQ MCP address of the form <gateway>/api/v1/tenants/<id>/devyonq/mcp' }
}

/*  Whether a terminal stands: the person's own standard input and output, or, in the test build alone, its stand-in. */
function terminalOf (ctx) {
  if (ctx.test && ctx.test.terminal === 'stdin') return { stand: true, fake: true }
  return { stand: Boolean(process.stdin.isTTY && (process.stdout.isTTY || process.stderr.isTTY)), fake: false }
}

/*  Reads one line from the terminal, with no echo where `hidden`. What a chunk carries past the line stays for the next
 *  read, so two lines a terminal sends at once are read one after the other. */
function readTyped (ctx, prompt, hidden) {
  return new Promise((resolve, reject) => {
    const term = terminalOf(ctx)
    ctx.err(prompt)
    const input = process.stdin
    let got = ''
    let raw = false
    let settled = false
    const done = (v, e, rest) => {
      if (settled) return
      settled = true
      ctx.typedRest = rest || ''
      input.removeListener('data', onData)
      input.removeListener('end', onEnd)
      if (raw) input.setRawMode(false)
      input.pause()
      if (hidden) ctx.err('\n')
      if (e) reject(e); else resolve(v)
    }
    const take = (text) => {
      for (let i = 0; i < text.length; i += 1) {
        const ch = text[i]
        if (ch === '\r' || ch === '\n') { done(got, null, text.slice(ch === '\r' && text[i + 1] === '\n' ? i + 2 : i + 1)); return true }
        if (ch === '\u0003') { done(null, new Error('the sign-in was stopped')); return true }
        if (ch === '\u007f' || ch === '\b') got = got.slice(0, -1)
        else got += ch
      }
      return false
    }
    const onData = (chunk) => { take(String(chunk)) }
    const onEnd = () => { ctx.typedEnded = true; done(got, null, '') }
    const rest = ctx.typedRest || ''
    ctx.typedRest = ''
    if (take(rest)) return
    if (ctx.typedEnded || input.readableEnded) { done(got, null, ''); return }
    if (hidden && !term.fake) { input.setRawMode(true); raw = true }
    input.on('data', onData)
    input.on('end', onEnd)
    input.resume()
    input.setEncoding('utf8')
  })
}

/*  Reads one line from the terminal with no echo. */
function readHidden (ctx, prompt) {
  return readTyped(ctx, prompt, true)
}

/*  The record of node the launchers read (the review of IP-MC-SERVER-002): node.json in the client's own folder
 *  ~/.mc17/client, { path, path64, sha256 } of the node login checked, path64 the path in base64 for the POSIX launcher's
 *  reading. Answers its path. */
function writeNodeRecord (ctx, node) {
  const bytes = fs.readFileSync(node)
  const record = { path: node, path64: Buffer.from(String(node), 'utf8').toString('base64'), sha256: crypto.createHash('sha256').update(bytes).digest('hex') }
  const file = path.join(ctx.places.own, 'node.json')
  writeAtomic(file, Buffer.from(JSON.stringify(record) + '\n', 'utf8'))
  return file
}

/*  The session route's answer for the key `token` at `gateway` and `tenant`. */
async function sessionAnswer (ctx, gateway, tenant, token) {
  const base = String(ctx.contract.doc.base).replace('{tenantId}', encodeURIComponent(tenant))
  const route = require('./contract.js').routeOf(ctx.contract, 'session')
  const res = await originRequest(gateway, ctx.test, gateway.replace(/\/+$/, '') + base + route.path, 'POST', {
    Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', [ctx.contract.doc.header || 'MC-Harness-Contract']: contractHeader(ctx.contract)
  }, '{}')
  return res
}

/*  The OAuth endpoints of the gateway's sign-in, from its authorization-server document. */
async function oauthEndpoints (ctx, gateway) {
  const res = await originRequest(gateway, ctx.test, gateway.replace(/\/+$/, '') + '/.well-known/oauth-authorization-server', 'GET')
  const m = res.json || {}
  if (res.status !== 200 || typeof m.authorization_endpoint !== 'string' || typeof m.token_endpoint !== 'string') throw new Error('the gateway ' + gateway + ' serves no sign-in document at /.well-known/oauth-authorization-server')
  for (const u of [m.authorization_endpoint, m.token_endpoint]) if (new URL(u).origin !== new URL(gateway).origin) throw new Error('the sign-in document names ' + u + ', which stands outside the gateway ' + gateway)
  return { authorize: m.authorization_endpoint, token: m.token_endpoint }
}

/*  A form body. */
const form = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&')

/*  Opens `url` in the person's browser, through the system's own opener. */
function openBrowser (url) {
  const run = (bin, args) => { try { const p = spawn(bin, args, { detached: true, stdio: 'ignore', windowsHide: true }); p.on('error', () => {}); p.unref() } catch (_) { /* the person opens the address by hand */ } }
  if (process.platform === 'win32') run(require('node:path').join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'rundll32.exe'), ['url.dll,FileProtocolHandler', url])
  else if (process.platform === 'darwin') run('/usr/bin/open', [url])
  else run('/usr/bin/xdg-open', [url])
}

/*  The browser sign-in (D19): PKCE S256, the client document as client_id, a loopback return on a port the system gives,
 *  and the tenant's DevyonQ MCP address as the resource. Where `tenant` is null the browser opens the gateway's tenant
 *  page first, with its own state, and the tenant id it returns to the loopback, checked against that state and the form
 *  of a tenant id, is the tenant of the sign-in: the listener answers it with a redirect to the authorization page, so
 *  the same tab goes on to the sign-in. Answers { token, refresh, tenant, name }, `name` the slug the page named or null. */
async function browserSignIn (ctx, gateway, tenant) {
  const ends = await oauthEndpoints(ctx, gateway)
  const origin = gateway.replace(/\/+$/, '')
  const verifier = b64url(crypto.randomBytes(32))
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest())
  const state = b64url(crypto.randomBytes(16))
  const pickState = b64url(crypto.randomBytes(24))
  const clientId = origin + CLIENT_DOCUMENT
  const resourceOf = (id) => origin + '/api/v1/tenants/' + encodeURIComponent(id) + '/devyonq/mcp'
  const limitMs = ctx.test && Number.isInteger(ctx.test.signInDeadlineMs) ? ctx.test.signInDeadlineMs : SIGN_IN_DEADLINE_MS
  let chosen = tenant
  let name = null
  const code = await new Promise((resolve, reject) => {
    let timer = null
    const close = () => { clearTimeout(timer); server.close(); if (typeof server.closeAllConnections === 'function') server.closeAllConnections() }
    const authorizeUrl = () => ends.authorize + '?' + form({ response_type: 'code', client_id: clientId, redirect_uri: ctx.redirect, code_challenge: challenge, code_challenge_method: 'S256', state, resource: resourceOf(chosen) })
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1')
      if (u.pathname === TENANT_PATH && tenant === null && chosen === null) {
        const id = u.searchParams.get('tenant') || ''
        const sameState = u.searchParams.get('state') === pickState
        if (!sameState || !TENANT_ID.test(id)) {
          res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end('mc17 could not read the tenant this page returned.\n')
          close()
          reject(new Error('the tenant page returned ' + (sameState ? 'no tenant id' : 'a state this sign-in did not send') + ', so nothing was kept; run mc17 login again'))
          return
        }
        chosen = id.toLowerCase()
        const slug = u.searchParams.get('name')
        name = slug && /^[a-z0-9-]{1,63}$/.test(slug) ? slug : null
        ctx.err('mc17 login: tenant ' + (name ? name + ' (' + chosen + ')' : chosen) + ' chosen in the browser; sign in there to go on\n')
        res.writeHead(302, { Location: authorizeUrl(), 'Cache-Control': 'no-store' })
        res.end()
        return
      }
      if (u.pathname !== RETURN_PATH || chosen === null) { res.writeHead(404); res.end(); return }
      const ok = u.searchParams.get('state') === state && u.searchParams.get('code')
      res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(ok ? 'mc17 is signed in. You can close this tab.\n' : 'mc17 could not read this sign-in.\n')
      close()
      if (ok) resolve(u.searchParams.get('code')); else reject(new Error('the sign-in returned ' + (u.searchParams.get('error') || 'no code for this request')))
    })
    timer = setTimeout(() => { close(); reject(new Error('no sign-in came back from the browser within ' + Math.round(limitMs / 1000) + ' seconds, so the listener on the loopback is closed and nothing was kept; run mc17 login again')) }, limitMs)
    server.on('error', (e) => { clearTimeout(timer); reject(e) })
    server.listen(0, '127.0.0.1', () => {
      const loopback = 'http://127.0.0.1:' + server.address().port
      ctx.redirect = loopback + RETURN_PATH
      const url = chosen !== null
        ? authorizeUrl()
        : origin + TENANT_PAGE + '?' + form({ redirect_uri: loopback + TENANT_PATH, state: pickState })
      ctx.err((chosen !== null
        ? 'mc17 login: sign in to DevyonQ in your browser.'
        : 'mc17 login: sign in to DevyonQ in your browser and pick your tenant.') + ' Where no browser opens, open this address:\n' + url + '\n')
      if (!(ctx.test && ctx.test.openBrowser === false)) openBrowser(url)
    })
  })
  const res = await originRequest(gateway, ctx.test, ends.token, 'POST', { 'Content-Type': 'application/x-www-form-urlencoded' },
    form({ grant_type: 'authorization_code', code, redirect_uri: ctx.redirect, client_id: clientId, code_verifier: verifier, resource: resourceOf(chosen) }))
  const t = res.json || {}
  if (res.status !== 200 || typeof t.access_token !== 'string' || typeof t.refresh_token !== 'string') throw new Error('the token endpoint refused the code: ' + (t.error_description || t.error || res.status))
  return { token: t.access_token, refresh: t.refresh_token, tenant: chosen, name }
}

/*  Renews the kept key with its refresh token, keeps the new pair and prints nothing (D19). Answers whether it renewed. */
async function renewKey (ctx) {
  const s = ctx.session
  const ends = await oauthEndpoints(ctx, s.gateway)
  const res = await originRequest(s.gateway, ctx.test, ends.token, 'POST', { 'Content-Type': 'application/x-www-form-urlencoded' },
    form({ grant_type: 'refresh_token', refresh_token: s.refresh, client_id: s.gateway.replace(/\/+$/, '') + CLIENT_DOCUMENT }))
  const t = res.json || {}
  if (res.status !== 200 || typeof t.access_token !== 'string') return false
  const keep = { token: t.access_token }
  if (typeof t.refresh_token === 'string') keep.refresh = t.refresh_token
  s.store.set(keep)
  s.token = keep.token
  if (keep.refresh) s.refresh = keep.refresh
  return true
}

/*  mc17 login: answers the exit code. */
async function loginCommand (ctx, argv) {
  const say = (s) => ctx.err(s.endsWith('\n') ? s : s + '\n')
  const a = loginArgs(argv)
  if (a.refused) { say('mc17 login: ' + a.refused); return 2 }
  const gateway = (a.gateway || PRODUCTION).replace(/\/+$/, '')
  if (!admitsAddress(gateway, ctx.test)) { say('mc17 login: the gateway ' + gateway + ' is no https address of a host alone'); return 2 }
  const t = a.tenant === null ? { tenant: null } : tenantOf(a.tenant, gateway)
  if (t.refused) { say('mc17 login: ' + t.refused); return 2 }
  if (!terminalOf(ctx).stand) { say('mc17 login: login needs a terminal of your own, and none stands here; run it in a terminal, not through an AI tool'); return 1 }
  if (!(ctx.test && ctx.test.requireSystemCa === false) && process.execArgv.indexOf('--use-system-ca') < 0) { say('mc17 login: this Node was not started with --use-system-ca; run mc17 login through client/mc17 on a Node that has it'); return 1 }
  const found = ctx.test && ctx.test.programs ? { programs: ctx.test.programs, missing: [], notes: [] } : resolvePrograms(process.env.PATH)
  if (found.missing.length) { say('mc17 login: these programs stand nowhere on the PATH of this terminal, each checked by its version line: ' + found.missing.join('; ')); return 1 }
  ctx.programs = found.programs
  const store = ctx.store || openStore(ctx)
  const p = probe(store)
  if (!p.ok) { say('mc17 login: no credential store works on this computer, so the client keeps nothing and writes no file: ' + p.why); return 1 }
  // A gateway other than production receives the key and answers the checking keys of every decision, so the person
  // types its host before any key is read (the review of IP-MC-SERVER-002).
  if (gateway !== PRODUCTION) {
    const host = new URL(gateway).host
    say('mc17 login: ' + gateway + ' is not the production gateway ' + PRODUCTION + '. The gateway you sign in to receives your DevyonQ key and names the keys that check every decision the client carries out. Sign in to it only where you know it.')
    let typed = ''
    try { typed = String(await readTyped(ctx, 'Type its host, ' + host + ', to go on: ', false)).trim() } catch (e) { say('mc17 login: ' + String(e.message || e)); return 1 }
    if (typed.toLowerCase() !== host.toLowerCase()) { say('mc17 login: that is not the host ' + host + '; no key was read and nothing was kept'); return 1 }
  }
  let key
  try {
    if (a.token) {
      const v = await readHidden(ctx, 'mc17 login: paste a DevyonQ personal access token (pqpat1), it is not shown: ')
      if (!PAT_FORM.test(String(v || '').trim())) { say('mc17 login: that is no DevyonQ personal access token, which reads pqpat1.<key id>.<secret>'); return 1 }
      key = { token: String(v).trim(), refresh: null }
    } else {
      key = await browserSignIn(ctx, gateway, t.tenant)
      t.tenant = key.tenant
    }
  } catch (e) {
    if (e instanceof Unreachable) { say('mc17 login: ' + e.message); return 1 }
    say('mc17 login: ' + String(e.message || e).split('\n')[0])
    return 1
  }
  let res
  try { res = await sessionAnswer(ctx, gateway, t.tenant, key.token) } catch (e) { say('mc17 login: ' + String(e.message || e).split('\n')[0]); return 1 }
  if (res.status === 401) { say('mc17 login: the gateway ' + gateway + ' did not admit the key for the tenant ' + t.tenant + '; nothing was kept'); return 1 }
  if (res.status !== 200 || !res.json) { say('mc17 login: the gateway ' + gateway + ' answered the session check with ' + res.status + (refusalOf(res).code ? ' ' + refusalOf(res).code : '') + '; nothing was kept'); return 1 }
  const s = res.json
  if (String(s.tenant) !== String(t.tenant)) { say('mc17 login: harness-tenant-mismatch: the key belongs to the tenant ' + s.tenant + ', and you named ' + t.tenant + '; nothing was kept'); return 1 }
  const keep = {
    token: key.token,
    gateway,
    tenant: t.tenant,
    session: JSON.stringify({ person: s.person, writer: s.writer, tenant: s.tenant, instance: s.instance, contractVersion: s.contractVersion, checkingKeys: Array.isArray(s.checkingKeys) ? s.checkingKeys : [] }),
    programs: JSON.stringify(found.programs)
  }
  if (key.refresh) keep.refresh = key.refresh
  try {
    store.set(keep)
    // The store holds no path of node: an item a former login kept there goes.
    store.remove(key.refresh ? ['node'] : ['refresh', 'node'])
  } catch (e) { say('mc17 login: the credential store refused the sign-in: ' + String(e.message || e).split('\n')[0]); return 1 }
  try { writeNodeRecord(ctx, found.programs.node) } catch (e) { say('mc17 login: the record of node could not be written in ' + ctx.places.own + ': ' + String(e.message || e).split('\n')[0]); return 1 }
  ctx.out('Signed in : ' + s.person + ' (' + s.writer + '), tenant ' + s.tenant + '\n')
  ctx.out('Gateway   : ' + gateway + '\n')
  if (gateway !== PRODUCTION) ctx.out('Keys      : ' + (keep.session && JSON.parse(keep.session).checkingKeys.map((k) => k.keyId).join(', ') || 'none') + ', the checking keys of this gateway\n')
  if (s.contractVersion !== ctx.contract.version) ctx.out('Contract  : the gateway serves version ' + s.contractVersion + ' and this plugin carries ' + ctx.contract.version + '; update the plugin\n')
  for (const n of found.notes) ctx.out('Note      : ' + n + '\n')
  return 0
}

/*  mc17 logout: removes every item of the sign-in from the credential store and the record of node from the client's own
 *  folder, and prints what it removed, never a value. Answers the exit code. */
async function logoutCommand (ctx, argv) {
  const say = (s) => ctx.err(s.endsWith('\n') ? s : s + '\n')
  if (argv.length > 1) { say('mc17 logout takes no argument, and no ' + argv[1]); return 2 }
  if (!terminalOf(ctx).stand) { say('mc17 logout: logout needs a terminal of your own, and none stands here; run it in a terminal, not through an AI tool'); return 1 }
  const found = ctx.test && ctx.test.programs ? { programs: ctx.test.programs } : resolvePrograms(process.env.PATH)
  ctx.programs = found.programs
  const store = ctx.store || openStore(ctx)
  const removed = []
  let gateway = null
  if (store.none) {
    say('mc17 logout: no credential store works on this computer (' + store.none + '), so it holds no sign-in to remove')
  } else {
    let had = {}
    try { had = store.getAll(ITEMS) } catch (e) { say('mc17 logout: the credential store could not be read: ' + String(e.message || e).split('\n')[0]); return 1 }
    gateway = had.gateway || null
    try { store.remove(ITEMS.concat(['node'])) } catch (e) { say('mc17 logout: the credential store refused the removal: ' + String(e.message || e).split('\n')[0]); return 1 }
    for (const i of ITEMS) if (had[i] !== null && had[i] !== undefined) removed.push(i)
  }
  const record = path.join(ctx.places.own, 'node.json')
  try {
    if (fs.existsSync(record)) { fs.rmSync(record, { force: true }); removed.push('the record of node') }
  } catch (e) { say('mc17 logout: the record of node at ' + record + ' could not be removed: ' + String(e.message || e).split('\n')[0]); return 1 }
  ctx.out(removed.length
    ? 'Signed out : this computer keeps no DevyonQ sign-in now; removed ' + removed.join(', ') + '\n'
    : 'Signed out : this computer kept no DevyonQ sign-in, so nothing was removed\n')
  if (removed.indexOf('token') >= 0) {
    ctx.out('Note      : the key DevyonQ issued stays valid until it expires; to end it now, revoke "mc17, the client of devyonq-mc" under Connect AI agent' + (gateway ? ' on ' + gateway : '') + '\n')
  }
  return 0
}

module.exports = { PRODUCTION, CLIENT_DOCUMENT, RETURN_PATH, TENANT_PAGE, TENANT_PATH, SIGN_IN_DEADLINE_MS, PAT_FORM, loginArgs, tenantOf, loginCommand, logoutCommand, renewKey, terminalOf, readTyped, writeNodeRecord }

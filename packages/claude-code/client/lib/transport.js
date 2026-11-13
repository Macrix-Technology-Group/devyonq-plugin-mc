'use strict'
// The client's one connection: HTTPS to the gateway address kept at login (ARCH D2, D13, D19, D20). Every request
// carries the DevyonQ key and the header MC-Harness-Contract, checks the certificate whatever the environment reads, and
// goes through no proxy. Only the test build reaches a gateway on the loopback over plain HTTP.

const http = require('node:http')
const https = require('node:https')
const { contractHeader } = require('./contract.js')

/*  The codes of a connection that never reached the gateway. */
const UNREACHED = ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH', 'ENETUNREACH', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE', 'ECONNABORTED']

class Unreachable extends Error {
  constructor (gateway, why) {
    super('DevyonQ cannot be reached at ' + gateway + ': ' + why)
    this.gateway = gateway
    this.why = why
  }
}

/*  Whether the address `gateway` is one the client may send to: https anywhere, and http on the loopback for the test
 *  build alone. */
function admitsAddress (gateway, test) {
  let u
  try { u = new URL(gateway) } catch (_) { return false }
  if (u.username || u.password || u.search || u.hash || (u.pathname && u.pathname !== '/')) return false
  if (u.protocol === 'https:') return true
  return Boolean(test && test.loopback) && u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.hostname === '[::1]')
}

/*  The address of a harness route: the gateway, the tenant's base and the route's path with its values filled. */
function routeUrl (ctx, route, values, query) {
  const base = String(ctx.contract.doc.base).replace('{tenantId}', encodeURIComponent(ctx.session.tenant))
  const p = String(route.path).replace(/\{([A-Za-z]+)\}/g, (_, k) => encodeURIComponent(String(values && values[k] !== undefined ? values[k] : '')))
  const u = new URL(ctx.session.gateway.replace(/\/+$/, '') + base + p)
  for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== null) u.searchParams.set(k, String(v))
  return u
}

/*  One request to a harness route. `body` is a value sent as JSON, or undefined for a GET. Checks the body against the
 *  route's limit first and refuses above it, naming the route and the limit (D13). Answers { status, json, text } and
 *  throws Unreachable where no answer came, or where `signal` dropped the request while it was open. */
function callOnce (ctx, routeId, values, body, query, signal) {
  const route = require('./contract.js').routeOf(ctx.contract, routeId)
  const url = routeUrl(ctx, route, values, query)
  const payload = body === undefined ? null : Buffer.from(JSON.stringify(body), 'utf8')
  const limit = route.bodyLimitBytes
  if (payload !== null && Number.isInteger(limit) && payload.length > limit) {
    const e = new Error('the request to ' + route.method + ' ' + route.path + ' holds ' + payload.length + ' bytes, and the contract limits that route to ' + limit + ' bytes; nothing was sent')
    e.code = 'MC17_BODY_LIMIT'
    throw e
  }
  if (!admitsAddress(ctx.session.gateway, ctx.test)) throw new Error('the kept gateway address ' + ctx.session.gateway + ' is no https address; run mc17 login')
  const headers = { Accept: 'application/json', Authorization: 'Bearer ' + ctx.session.token, [ctx.contract.doc.header || 'MC-Harness-Contract']: contractHeader(ctx.contract) }
  if (payload !== null) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = String(payload.length) }
  // The test build alone may ask the gateway's test switch to end the job right after its first CanonQ write (the
  // contract's testBuild: its header and its value drop-after-write), on POST /commands.
  const tb = ctx.contract.doc.testBuild
  if (ctx.test && ctx.test.dropAfterWrite === true && routeId === 'commands' && tb && tb.header && tb.drop) headers[tb.header] = tb.drop
  const lib = url.protocol === 'http:' ? http : https
  const options = { method: route.method, headers, agent: false }
  if (signal) options.signal = signal
  if (url.protocol === 'https:') options.rejectUnauthorized = true
  ctx.trace && ctx.trace({ method: route.method, url: url.toString(), bytes: payload ? payload.length : 0 })
  return new Promise((resolve, reject) => {
    const req = lib.request(url, options, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('error', (e) => reject(new Unreachable(ctx.session.gateway, e.code || e.message)))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        let json = null
        try { json = text ? JSON.parse(text) : null } catch (_) { json = null }
        resolve({ status: res.statusCode, json, text, limit, route })
      })
    })
    req.on('error', (e) => reject(UNREACHED.indexOf(e.code) >= 0 || !e.code ? new Unreachable(ctx.session.gateway, e.code || e.message) : new Unreachable(ctx.session.gateway, e.code + ' ' + e.message)))
    if (payload !== null) req.write(payload)
    req.end()
  })
}

/*  One request outside the harness routes, at the gateway's own origin alone: the sign-in's metadata, its token
 *  endpoint and the session check of mc17 login. `body` is a Buffer or a string. Answers { status, json, text }. */
function originRequest (gateway, test, url, method, headers, body) {
  const u = new URL(url)
  const g = new URL(gateway)
  if (u.origin !== g.origin) return Promise.reject(new Error('the address ' + u.origin + ' is not the gateway ' + g.origin + ', and the client sends to no other address'))
  if (!admitsAddress(g.origin, test)) return Promise.reject(new Error('the gateway ' + gateway + ' is no https address'))
  const lib = u.protocol === 'http:' ? http : https
  const options = { method, headers: Object.assign({ Accept: 'application/json' }, headers || {}), agent: false }
  if (u.protocol === 'https:') options.rejectUnauthorized = true
  const payload = body === undefined || body === null ? null : Buffer.from(body)
  if (payload) options.headers['Content-Length'] = String(payload.length)
  return new Promise((resolve, reject) => {
    const req = lib.request(u, options, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => { const text = Buffer.concat(chunks).toString('utf8'); let json = null; try { json = JSON.parse(text) } catch (_) { json = null } resolve({ status: res.statusCode, json, text }) })
    })
    req.on('error', (e) => reject(new Unreachable(gateway, e.code || e.message)))
    if (payload) req.write(payload)
    req.end()
  })
}

/*  One request to a harness route, as callOnce sends it. Where the gateway answers 401 and the client keeps a refresh
 *  token, it renews the key once, prints nothing, and sends the request again (D19). */
async function call (ctx, routeId, values, body, query, signal) {
  const res = await callOnce(ctx, routeId, values, body, query, signal)
  if (res.status !== 401 || !ctx.session.refresh || ctx.renewed) return res
  ctx.renewed = true
  let renewed = false
  try { renewed = await require('./login.js').renewKey(ctx) } catch (e) { if (e instanceof Unreachable) throw e; renewed = false }
  return renewed ? callOnce(ctx, routeId, values, body, query, signal) : res
}

/*  A refusal code as the contract writes one: lower-case words joined by hyphens. */
const CODE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/

/*  The code and the sentence of a refusal answer (the contract's refusalForm): the platform's problem form sets `type` to
 *  about:blank for every refusal, and the code opens `detail` as `<code>: <sentence>`, so the client reads the code from
 *  the text before the first colon of the detail. A sentence that opens with the same code once more (a CanonQ refusal
 *  the gateway passes on carries its own, and an engine that doubles the code) is read once, however often it repeats. Where the detail opens with no code, the code is the problem's
 *  `type` where that is no about:blank, else none. Answers { code, sentence }. */
function refusalOf (res) {
  const p = res && res.json && typeof res.json === 'object' ? res.json : {}
  const detail = typeof p.detail === 'string' ? p.detail.trim() : ''
  const at = detail.indexOf(':')
  const head = at > 0 ? detail.slice(0, at).trim() : ''
  if (CODE.test(head)) {
    let sentence = detail.slice(at + 1).trim()
    while (sentence.startsWith(head + ':')) sentence = sentence.slice(head.length + 1).trim()
    return { code: head, sentence }
  }
  const type = typeof p.type === 'string' && p.type !== 'about:blank' ? p.type.replace(/^.*[/#]/, '') : null
  return { code: type && CODE.test(type) ? type : null, sentence: detail || (typeof p.title === 'string' && p.title !== type ? p.title : '') }
}

/*  The contract version a harness-contract-unserved refusal names as the one the gateway serves. Version 1 of the
 *  contract carries it in the sentence alone ("this gateway serves contract version N", "older than version N, the one
 *  this gateway serves", "this gateway serves version N alone", "the plugin's copy of contract version N differs from
 *  the one this gateway serves"); null where the sentence names none. */
function servedVersionOf (sentence) {
  const s = String(sentence || '')
  const m = /gateway serves (?:contract )?version (\d+)/.exec(s) || /version (\d+), the one this gateway serves/.exec(s) || /contract version (\d+) differs from the one this gateway serves/.exec(s)
  return m ? Number(m[1]) : null
}

/*  Whether an answer of 502 or 504 means the gateway cannot be reached: the platform's proxy or the gateway itself
 *  answered with no refusal code. A 502 or 504 that carries a refusal in the problem form (an upstream the engine could
 *  not reach, named by its code) is a refusal, and the client prints its code and sentence. */
function gatewayDown (res) {
  return Boolean(res && (res.status === 502 || res.status === 504) && !refusalOf(res).code)
}

/*  The words for an answer that is a refusal, by its status and its code (ARCH Interface Contracts, The refusal types;
 *  the contract's refusalForm), or null where the answer is no refusal. */
function refusalWords (ctx, res) {
  if (res.status >= 200 && res.status < 300) return null
  const { code, sentence } = refusalOf(res)
  const said = sentence ? ': ' + sentence : ''
  if (res.status === 401) return 'the gateway ' + ctx.session.gateway + ' did not admit the DevyonQ key: it was missing, expired, revoked or meant for another tenant or product. Run mc17 login in a terminal of your own.'
  if (res.status === 413 || code === 'body-too-large') return 'the gateway refused the body as too large; the contract limits ' + res.route.method + ' ' + res.route.path + ' to ' + res.limit + ' bytes' + (sentence ? ' (' + sentence + ')' : '')
  if (code === 'harness-contract-unserved') {
    const served = servedVersionOf(sentence)
    return 'harness-contract-unserved: the gateway serves contract version ' + (served === null ? '(the gateway named none)' : served) + ', and this plugin carries version ' + ctx.contract.version + ' (sha256 ' + ctx.contract.sha256.slice(0, 12) + '). Update the plugin devyonq-mc.' + (sentence ? ' (' + sentence + ')' : '')
  }
  if (code === 'harness-connection-unresolved') return 'harness-connection-unresolved: the gateway found no CanonQ connection of the tenant for you' + said + ' A Mission collection made under your own CanonQ token stays on the old plugin of Macrix-Technology-Group/devyonq until free groups land.'
  if (code === 'harness-job-abandoned') return 'harness-job-abandoned: the engine abandoned the job before it ended, so the act stands unfinished; run the same command again to finish it once' + said
  if (code === 'harness-plan-unruled') return 'harness-plan-unruled: the engine runs a test command only from a ruled Wave Plan whose binding is the one its lock took at the ruling' + said
  if (code === 'harness-request-refused') return 'harness-request-refused: the engine refused the request as malformed, which is a fault of this plugin or of the call as written' + said
  return 'the gateway refused the call' + (code ? ' with ' + code : '') + ' (' + res.status + ')' + said
}

module.exports = { Unreachable, admitsAddress, routeUrl, call, originRequest, gatewayDown, refusalOf, refusalWords, servedVersionOf, UNREACHED }

'use strict'
// The model call at a decision point (ARCH D16; AC-18): the release's one plain call to OpenRouter's chat completions
// interface, made from the person's computer with the person's own key. The engine runs the release's callModel up to
// its two reaches outside, and each comes to the client as an ask:
//   model-key  reads the key file openrouter-key in the keys folder at this call, as the release's readKey reads it, and
//              answers { ready: true } or { fault } in the release's words. The key never travels.
//   model      composes the body as the release's requestBody composes it, with a system message the plugin ships
//              itself and the packet as the user message, plus any correction messages; refuses where the body's sha256
//              differs from the engine's; sends one HTTPS request with the key read from its file; and answers
//              { status, text } with every place the key stands written [key]. The plugin ships two system texts: its
//              own policy.md, for a decision point, and the probe's fixed text (probe.js), for mc17 converge probe. The
//              client composes the body with each and takes the one whose digest is the engine's; a body of any other
//              system text is refused.
// The shipped client sends to OpenRouter alone. Only the client's test build carries the release's stub transport
// stub:{file}, which its options name; no variable of the environment chooses a transport.

const fs = require('node:fs')
const path = require('node:path')
const https = require('node:https')
const crypto = require('node:crypto')

/*  The address of every call (the release's OPENROUTER_URL). */
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
/*  The longest a call waits for its answer, and the most completion tokens an answer may spend: the release's figures. */
const CALL_TIME_LIMIT_MS = 120000
const CALL_TOKEN_CAP = 8000
/*  The codes of a connection that broke before any answer, which the release tries once more after RETRY_WAIT_MS. */
const BROKEN_CONNECTION = ['EPIPE', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN', 'ENETUNREACH', 'EHOSTUNREACH']
const RETRY_WAIT_MS = 3000
/*  The bounds of what an ask model may spend on the person's key (the review of IP-MC-SERVER-002): the release's
 *  correction adds two messages after the packet, the model's answer and one line naming the faults, so `more` carries
 *  two messages at most, of the roles assistant and user, with 64 KiB of text in all, counted in UTF-8 bytes as the
 *  engine counts them. The contract's asks.model states the same bounds (tokenCap, more); boundsOf reads them, and a
 *  contract may narrow the client's own figures, never widen them. */
const MORE_MESSAGES = 2
const MORE_BYTES = 64 * 1024
const MORE_ROLES = ['assistant', 'user']

/*  The bounds in force: the contract's asks.model where it states them, within the client's own figures. */
function boundsOf (ctx) {
  const m = (ctx && ctx.contract && ctx.contract.doc && ctx.contract.doc.asks && ctx.contract.doc.asks.model) || {}
  const cap = m.tokenCap || {}
  const more = m.more || {}
  const within = (v, own) => (Number.isInteger(v) && v >= 0 ? Math.min(v, own) : own)
  return {
    tokenMin: Number.isInteger(cap.minimum) ? Math.max(1, cap.minimum) : 1,
    tokenMax: within(cap.maximum, CALL_TOKEN_CAP),
    moreItems: within(more.maxItems, MORE_MESSAGES),
    moreBytes: within(more.maxBytes, MORE_BYTES),
    roles: Array.isArray(more.roles) ? more.roles.filter((r) => MORE_ROLES.indexOf(r) >= 0) : MORE_ROLES
  }
}
/*  The form of an OpenRouter model id, as the engine's setting wave.model.converge admits one (params.js MODEL_ID_RE). */
const MODEL_ID = /^[a-z0-9][a-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._:-]*$/

/*  The key file: openrouter-key in the client's keys folder. */
function keyPath (ctx) {
  return path.join(ctx.places.keys, 'openrouter-key')
}

/*  The key, read from its file at this call: { key, path, fault }, as the release reads it. */
function readKey (ctx) {
  const file = keyPath(ctx)
  if (!fs.existsSync(file)) return { key: null, path: file, fault: 'no key file at ' + file }
  const key = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').trim()
  if (!key) return { key: null, path: file, fault: 'the key file at ' + file + ' is empty' }
  return { key, path: file, fault: null }
}

/*  `text` with every place the key's text stands written `[key]`. */
function redact (text, key) {
  if (text === null || text === undefined) return text
  const s = String(text)
  return key ? s.split(key).join('[key]') : s
}

/*  The policy text the call sends as its system message: the plugin's harness/converge/policy.md, its byte-order mark
 *  dropped and each line ending read as one line feed, as the release's policyText reads it. */
function policyText (ctx) {
  const file = path.join(ctx.places.root, 'harness', 'converge', 'policy.md')
  return fs.readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n')
}

/*  The two system texts the client composes a call with, by name: the plugin's own policy.md, and the probe's fixed text. */
function systemTexts (policy) {
  return [['policy.md', policy], ['the probe\'s text', require('./probe.js').PROBE_SYSTEM]]
}

/*  The body of a call, as the release's requestBody composes it, with `more` after the two messages. */
function requestBody (input) {
  const { model, system, user, tokenCap, more } = input
  const body = { model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_tokens: tokenCap, usage: { include: true } }
  if (Array.isArray(more)) body.messages = body.messages.concat(more)
  return body
}

/*  One answer of the test build's stub transport, as the release's stubSend answers it: the entry of the file's list at
 *  this request's position, each body appended as one line to {file}.requests.jsonl. */
function stubSend (file, data) {
  const log = file + '.requests.jsonl'
  const n = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).length : 0
  fs.appendFileSync(log, data.toString('utf8') + '\n')
  let list = null
  try { list = JSON.parse(fs.readFileSync(file, 'utf8')) } catch (e) { return { status: null, error: 'the stub\'s file of answers cannot be read: ' + e.message } }
  const a = Array.isArray(list) ? list[n] : undefined
  if (a === undefined || a === null) return { status: null, error: 'the stub holds no answer ' + (n + 1) }
  if (a.late) return { late: true }
  if (a.broken) return { broken: true, error: 'the stub closed the connection' }
  return { status: Number(a.status || 200), text: typeof a.body === 'string' ? a.body : JSON.stringify(a.body) }
}

/*  One POST of `data` to OpenRouter with the key in the authorization header, as the release's httpSend sends it, over
 *  https with the certificate checked and through no proxy. */
function httpSend (data, key, limitMs) {
  return new Promise((resolve) => {
    let late = false
    let done = false
    let timer = null
    const finish = (r) => { if (done) return; done = true; clearTimeout(timer); resolve(late ? { late: true } : r) }
    const req = https.request(new URL(OPENROUTER_URL), { method: 'POST', agent: false, rejectUnauthorized: true,
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'Content-Length': data.length } }, (res) => {
      const chunks = []
      res.on('data', (d) => chunks.push(d))
      res.on('end', () => finish({ status: res.statusCode, text: Buffer.concat(chunks).toString('utf8') }))
      res.on('error', (e) => finish({ broken: false, error: e.message }))
    })
    timer = setTimeout(() => { late = true; req.destroy(new Error('late')) }, limitMs)
    req.on('error', (e) => finish({ broken: BROKEN_CONNECTION.indexOf(e.code) >= 0, error: e.message }))
    req.end(data)
  })
}

/*  The transport of this client: the test build's stub where its options name one, OpenRouter otherwise. */
function transportOf (ctx) {
  const t = ctx.test && typeof ctx.test.modelTransport === 'string' ? ctx.test.modelTransport : null
  if (t && t.indexOf('stub:') === 0) return { kind: 'stub', file: t.slice('stub:'.length) }
  return { kind: 'openrouter' }
}

/*  The most a call may carry as its packet, the user message, in UTF-8 bytes, and the most model asks one command may
 *  make (the second review of IP-MC-SERVER-002, N7). A decision point's packet holds the point's facts and its prior
 *  judgments, well below the bound; a command asks the model once per point and once more for a correction. */
const PACKET_BYTES = 256 * 1024
const ASKS_PER_COMMAND = 8

/*  The bounds of the packet and of the model asks of one command in force: the contract's asks.model.packet.maxBytes and
 *  asksPerCommand where it states them (devyonq-saas f3aa4004 on), within the client's own figures. */
function askBoundsOf (ctx) {
  const m = (ctx && ctx.contract && ctx.contract.doc && ctx.contract.doc.asks && ctx.contract.doc.asks.model) || {}
  const within = (v, own) => (Number.isInteger(v) && v > 0 ? Math.min(v, own) : own)
  return { packetBytes: within(m.packet && m.packet.maxBytes, PACKET_BYTES), asksPerCommand: within(m.asksPerCommand, ASKS_PER_COMMAND) }
}

/*  The models a call may spend on: the one the person set on this computer with mc17 config model, kept in the client's
 *  own folder, and no other (the second review of IP-MC-SERVER-002, N7, made strict by the final check, item 4). The
 *  rule has two keys: the engine names the model in the ask, from the Wave Plan's wave.model.converge, and the client
 *  calls only where it equals the person's own setting. The --model of a command line is no source, since the AI tool
 *  writes the command lines; nor are the checkout's lock and a file the command sent, which the engine writes. `none`
 *  names no model. */
function allowedModels (ctx) {
  const out = new Set()
  const add = (v) => { const s = String(v === undefined || v === null ? '' : v).trim(); if (s && s !== 'none' && MODEL_ID.test(s)) out.add(s) }
  let kept = {}
  try { kept = require('./config.js').readConfig(ctx) } catch (_) { kept = {} }
  add(kept.model)
  return out
}

/*  Why the ask model may not spend on the person's key, or null: a token cap that is no whole number within the bounds
 *  of boundsOf, a model outside the form or outside allowedModels, and a `more` beyond its bounds. */
function spendRefusal (ctx, ask) {
  const b = boundsOf(ctx)
  if (ask.tokenCap !== undefined && ask.tokenCap !== null && !(Number.isInteger(ask.tokenCap) && ask.tokenCap >= b.tokenMin && ask.tokenCap <= b.tokenMax)) return 'the ask model sets the token cap ' + JSON.stringify(ask.tokenCap) + ', and a call spends ' + b.tokenMax + ' completion tokens at most'
  if (!MODEL_ID.test(ask.model)) return 'the ask model names ' + JSON.stringify(ask.model) + ', which is no OpenRouter model id of the form {provider}/{model}'
  const allowed = allowedModels(ctx)
  if (!allowed.has(ask.model)) return 'the ask model names ' + ask.model + ', and the person set ' + (allowed.size ? [...allowed].join(', ') : 'no model') + ' (mc17 config model, in a terminal of their own); the client spends the key on no other: not on a model a command line\'s --model, the lock of the checkout or a plan file names'
  const packetBytes = askBoundsOf(ctx).packetBytes
  if (typeof ask.user === 'string' && Buffer.byteLength(ask.user, 'utf8') > packetBytes) return 'the ask model carries a packet of ' + Buffer.byteLength(ask.user, 'utf8') + ' bytes, above the ' + packetBytes + ' a call carries'
  if (ask.more !== undefined && ask.more !== null) {
    if (!Array.isArray(ask.more) || ask.more.length > b.moreItems) return 'the ask model carries more messages than the ' + b.moreItems + ' of a correction'
    let bytes = 0
    for (const m of ask.more) {
      if (!m || typeof m !== 'object' || Array.isArray(m) || Object.keys(m).some((k) => k !== 'role' && k !== 'content') || b.roles.indexOf(m.role) < 0 || typeof m.content !== 'string') return 'the ask model carries a message after the packet that is no { role: ' + b.roles.join(' or ') + ', content: text }'
      bytes += Buffer.byteLength(m.content, 'utf8')
    }
    if (bytes > b.moreBytes) return 'the ask model carries ' + bytes + ' bytes after the packet, above the ' + b.moreBytes + ' of a correction'
  }
  return null
}

/*  The answer to the ask model-key: { ready: true } or { fault }. */
function answerModelKey (ctx) {
  if (transportOf(ctx).kind === 'stub') return { ready: true }
  const k = readKey(ctx)
  return k.fault ? { fault: k.fault } : { ready: true }
}

/*  The answer to the ask model { model, user, more, tokenCap, sha256 }: { status, text, sha256 }, { status: null, late }
 *  or { status: null, error }, every text with the key written [key]; or { refused } where the body the client composed
 *  differs from the engine's. */
async function answerModel (ctx, ask) {
  if (typeof ask.model !== 'string' || !ask.model || ask.model === 'none') return { refused: 'the ask model names no model' }
  if (typeof ask.user !== 'string') return { refused: 'the ask model carries no packet' }
  // Each model ask of the command counts, a refused one among them, so a command spends ASKS_PER_COMMAND calls at most.
  ctx.modelAsks = (ctx.modelAsks || 0) + 1
  const asksPerCommand = askBoundsOf(ctx).asksPerCommand
  if (ctx.modelAsks > asksPerCommand) return { refused: 'the ask model is the ' + ctx.modelAsks + 'th of this command, and one command asks the model ' + asksPerCommand + ' times at most' }
  const spend = spendRefusal(ctx, ask)
  if (spend) return { refused: spend }
  let policy
  try { policy = policyText(ctx) } catch (e) { return { refused: 'the plugin\'s policy.md cannot be read: ' + String(e.message || e).split('\n')[0] } }
  const tokenCap = Number.isInteger(ask.tokenCap) ? ask.tokenCap : boundsOf(ctx).tokenMax
  const wanted = String(ask.sha256 || '').replace(/^sha256:/i, '').toLowerCase()
  let data = null
  let sha256 = null
  const tried = []
  for (const [name, system] of systemTexts(policy)) {
    const body = requestBody({ model: ask.model, system, user: ask.user, tokenCap, more: Array.isArray(ask.more) ? ask.more : null })
    const bytes = Buffer.from(JSON.stringify(body), 'utf8')
    const digest = 'sha256:' + crypto.createHash('sha256').update(bytes).digest('hex')
    tried.push(name + ' ' + digest)
    if (digest.slice(7) === wanted) { data = bytes; sha256 = digest; break }
  }
  if (data === null) {
    return { refused: 'the bodies the client composed with the two system texts it ships (' + tried.join(', ') + ') differ from the one the engine composed, ' + String(ask.sha256) + '; the client sends no body it did not compose' }
  }
  const transport = transportOf(ctx)
  let key = ''
  if (transport.kind !== 'stub') {
    const k = readKey(ctx)
    if (k.fault) return { status: null, error: k.fault, sha256 }
    key = k.key
  }
  let got = null
  for (let attempt = 1; ; attempt += 1) {
    got = transport.kind === 'stub' ? stubSend(transport.file, data) : await httpSend(data, key, CALL_TIME_LIMIT_MS)
    if (got.broken !== true || attempt >= 2) break
    await new Promise((wake) => setTimeout(wake, RETRY_WAIT_MS))
  }
  if (got.late) return { status: null, late: true, sha256 }
  if (got.broken) return { status: null, error: 'broken connection', sha256 }
  if (got.status === null || got.status === undefined) return { status: null, error: redact(got.error, key), sha256 }
  return { status: got.status, text: redact(got.text, key), sha256 }
}

module.exports = { PACKET_BYTES, ASKS_PER_COMMAND, OPENROUTER_URL, CALL_TIME_LIMIT_MS, CALL_TOKEN_CAP, MORE_MESSAGES, MORE_BYTES, MODEL_ID, boundsOf, askBoundsOf, allowedModels, spendRefusal, keyPath, readKey, redact, policyText, systemTexts, requestBody, transportOf, answerModelKey, answerModel }

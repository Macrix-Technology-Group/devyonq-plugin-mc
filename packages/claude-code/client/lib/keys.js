'use strict'
// The checking keys and the signature of a decision (ARCH D14, D15; AC-17, AC-28). The production gateway's keys ship in
// keys/production.json and no login changes them; another gateway's keys are the ones its session route answered at
// mc17 login. The client refuses a decision signed by a key the gateway in use does not hold, a staging key on a
// production login among them. Only the test build reads its keys from a keys file of its own, for TC-23.

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { canonicalJson } = require('./canonical.js')

const PRODUCTION_FILE = path.join(__dirname, '..', 'keys', 'production.json')
const PRODUCTION = 'https://app.devyonq.ai'
/*  The form of a signed decision's payload (D14). */
const DECISION_FORM = 'mc-harness-decision/1'
/*  The fields the engine signs, in the payload's canonical JSON (D14): the contract's decision.signed, which names the
 *  Mission's scope after the wave from devyonq-saas f3aa4004 on (the final check of IP-MC-SERVER-002, item 1b). */
const SIGNED_FIELDS = ['form', 'decisionId', 'keyId', 'issuedAt', 'point', 'action', 'command', 'wave', 'scope', 'plan', 'checkout', 'facts']

/*  The keys of a keys file: [{ keyId, publicKey }]; a file that does not read answers { refused }. */
function keysFile (file) {
  let doc
  try { doc = JSON.parse(fs.readFileSync(file, 'utf8')) } catch (e) { return { refused: 'the keys file ' + file + ' does not read: ' + String(e.message || e).split('\n')[0] } }
  const list = Array.isArray(doc) ? doc : (doc && Array.isArray(doc.keys) ? doc.keys : null)
  if (!list) return { refused: 'the keys file ' + file + ' holds no list of keys' }
  return { keys: list.filter((k) => k && typeof k.keyId === 'string' && typeof k.publicKey === 'string') }
}

/*  The checking keys of the gateway in use: { keys, source } or { refused }. The test build's keysFile alone, where it
 *  names one; the shipped production file for the production gateway; the session's keys for any other gateway. */
function checkingKeys (ctx) {
  const gateway = ctx.session ? String(ctx.session.gateway).replace(/\/+$/, '') : null
  if (ctx.test && ctx.test.keysFile) {
    const k = keysFile(ctx.test.keysFile)
    return k.refused ? k : { keys: k.keys, source: 'the test build\'s keys file ' + ctx.test.keysFile }
  }
  if (gateway === PRODUCTION) {
    const k = keysFile(PRODUCTION_FILE)
    return k.refused ? k : { keys: k.keys, source: 'the plugin\'s production keys ' + PRODUCTION_FILE }
  }
  return { keys: ctx.session && Array.isArray(ctx.session.checkingKeys) ? ctx.session.checkingKeys : [], source: 'the keys the gateway ' + gateway + ' answered at mc17 login' }
}

/*  The Ed25519 public key of base64url `raw`, its 32 raw bytes, or null where it is none. */
function publicKeyOf (raw) {
  const b = Buffer.from(String(raw), 'base64url')
  if (b.length !== 32) return null
  try { return crypto.createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: b.toString('base64url') }, format: 'jwk' }) } catch (_) { return null }
}

/*  The signed bytes of a decision's payload: the canonical JSON of its signed fields. */
function signedBytes (decision) {
  const p = {}
  for (const f of SIGNED_FIELDS) p[f] = decision[f] === undefined ? null : decision[f]
  return Buffer.from(canonicalJson(p), 'utf8')
}

/*  Checks the signature of `signed`, { decision, signature }, against the checking keys of the gateway in use:
 *  { ok: true, keyId } or { ok: false, field, why }. */
function checkSignature (ctx, signed) {
  const d = signed && signed.decision
  if (!d || typeof d !== 'object') return { ok: false, field: 'decision', why: 'the entry carries no signed decision' }
  if (d.form !== DECISION_FORM) return { ok: false, field: 'form', why: 'the decision is of the form ' + JSON.stringify(d.form) + ', and the client checks ' + DECISION_FORM + ' alone' }
  if (typeof signed.signature !== 'string' || !signed.signature) return { ok: false, field: 'signature', why: 'the decision carries no signature' }
  const k = checkingKeys(ctx)
  if (k.refused) return { ok: false, field: 'keyId', why: k.refused }
  const key = k.keys.find((x) => x.keyId === d.keyId)
  if (!key) return { ok: false, field: 'keyId', why: 'the decision is signed by the key ' + JSON.stringify(d.keyId) + ', which ' + k.source + ' do not hold (' + (k.keys.map((x) => x.keyId).join(', ') || 'no key at all') + ')' }
  const pub = publicKeyOf(key.publicKey)
  if (!pub) return { ok: false, field: 'keyId', why: 'the checking key ' + key.keyId + ' is no Ed25519 public key of 32 bytes' }
  let ok = false
  try { ok = crypto.verify(null, signedBytes(d), pub, Buffer.from(signed.signature, 'base64url')) } catch (_) { ok = false }
  if (!ok) return { ok: false, field: 'signature', why: 'the signature does not verify under the key ' + key.keyId }
  return { ok: true, keyId: key.keyId }
}

module.exports = { PRODUCTION, PRODUCTION_FILE, DECISION_FORM, SIGNED_FIELDS, keysFile, checkingKeys, publicKeyOf, signedBytes, checkSignature }

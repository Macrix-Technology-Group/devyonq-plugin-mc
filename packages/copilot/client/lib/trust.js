'use strict'
// mc17 trust <digest> (ARCH D10; AC-13; record 117 F-11): the person's own yes to a test command the first time it
// appears in a Mission. The client reads the yes from a terminal of the person's own and keeps it as an item of the
// service devyonq-mc in the credential store, by Mission and digest. No file holds a yes, so a write tool of the AI
// cannot forge one. It refuses where no terminal stands.
//
// Limit (record 49): a terminal test passes inside a pseudo-terminal, which an AI can open; lint-secret.py refuses the
// command by its name, which a variable or a decoded string passes. The Technical Owner accepted this limit.

const { openStore } = require('./store.js')

/*  The longest name of an item of the store (os-store.js safe). */
const ITEM_LIMIT = 100

/*  The item of the store that keeps a yes: trust.<Mission scope>.<sha256 hex of the command>. A scope too long for that
 *  name within ITEM_LIMIT, one above 29 characters, stands as h<the first 24 hex of its sha256>, which no scope reads as,
 *  since a scope is upper case (the review of IP-MC-SERVER-002); the yes itself still names the scope in full. */
function trustItem (scope, digest) {
  const plain = 'trust.' + scope + '.' + digest
  if (plain.length <= ITEM_LIMIT) return plain
  return 'trust.h' + require('node:crypto').createHash('sha256').update(String(scope), 'utf8').digest('hex').slice(0, 24) + '.' + digest
}

/*  The command the person runs for a yes, as the client names it. */
function trustLine (digest, scope) {
  return 'mc17 trust ' + digest + (scope ? ' --mission ' + scope : '')
}

const SCOPE_RE = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/
const DIGEST_RE = /^[0-9a-f]{64}$/

/*  Whether the person said yes to `digest` in the Mission `scope`: { ok } or { refused }. Only an item of the store
 *  counts; a file anywhere counts for nothing. */
function trusted (ctx, scope, digest) {
  if (!scope || !SCOPE_RE.test(scope)) return { refused: 'the checkout names no Mission (its .mc17/wave.json names no Wave Plan WAVE-PLAN-{SCOPE}-{NNN}), so no yes to a test command can be read' }
  if (!DIGEST_RE.test(digest)) return { refused: 'the test command has no digest the client can look up' }
  const store = ctx.store || openStore(ctx)
  if (store.none) return { refused: 'the client cannot open a credential store: ' + store.none }
  const item = trustItem(scope, digest)
  let kept
  try { kept = store.getAll([item])[item] } catch (e) { return { refused: 'the credential store could not be read: ' + String(e.message || e).split('\n')[0] } }
  if (!kept) return { ok: false }
  let v = null
  try { v = JSON.parse(kept) } catch (_) { v = null }
  return { ok: Boolean(v && v.yes === true && v.digest === digest && v.mission === scope) }
}

/*  Reads one line from the terminal, shown as typed. */
function readLine (ctx, prompt) {
  return new Promise((resolve) => {
    ctx.err(prompt)
    const input = process.stdin
    let got = ''
    input.resume()
    input.setEncoding('utf8')
    const done = (v) => { input.removeListener('data', onData); input.pause(); resolve(v) }
    const onData = (chunk) => {
      for (const ch of String(chunk)) {
        if (ch === '\r' || ch === '\n') return done(got)
        got += ch
      }
    }
    input.on('data', onData)
    input.on('end', () => done(got))
  })
}

/*  mc17 trust <digest> [--mission <SCOPE>]: keeps the person's yes, or records nothing on any other answer. The Mission is
 *  the one the checkout's lock names where --mission is not given. Exits 0 on a yes kept, 1 on a no or a refusal. */
async function trustCommand (ctx, argv) {
  const say = (s) => ctx.err(s.endsWith('\n') ? s : s + '\n')
  const digest = String(argv[1] || '').replace(/^sha256:/i, '').toLowerCase()
  if (!DIGEST_RE.test(digest)) { say('mc17 trust: name the digest the refusal named, a sha256 in hex: mc17 trust <digest> [--mission <SCOPE>]'); return 2 }
  const i = argv.indexOf('--mission')
  let scope = i >= 0 ? String(argv[i + 1] || '') : null
  if (!scope) {
    const { lockOf, scopeOfLock } = require('./decision.js')
    let checkout = null
    try {
      const { readSession } = require('./session.js')
      ctx.store = ctx.store || openStore(ctx)
      const s = ctx.store.none ? null : readSession(ctx)
      const git = (ctx.test && ctx.test.programs && ctx.test.programs.git) || (s && s.programs && s.programs.git)
      if (git) checkout = require('./checkout.js').readCheckout(git, ctx.cwd)
    } catch (_) { checkout = null }
    scope = scopeOfLock(lockOf({ checkout }))
  }
  if (!scope || !SCOPE_RE.test(scope)) { say('mc17 trust: no Mission is named: run it in the checkout of the wave, or name it with --mission <SCOPE>'); return 2 }
  const { terminalOf } = require('./login.js')
  if (!terminalOf(ctx).stand) { say('mc17 trust: a yes is read from a terminal of your own, and none stands here; run it in a terminal, not through an AI tool'); return 1 }
  const store = ctx.store || openStore(ctx)
  if (store.none) { say('mc17 trust: the client cannot open a credential store: ' + store.none); return 1 }
  say('mc17 trust: the Mission ' + scope + ' asks to run the test command whose sha256 is')
  say('  ' + digest)
  say('The client printed that command when it refused it. A yes lets the engine run it in this Mission under a signed decision.')
  const answer = String(await readLine(ctx, 'Type yes to trust it, anything else to refuse: ')).trim()
  if (answer !== 'yes') { say('mc17 trust: no yes was given; nothing was kept, and the command stays refused'); return 1 }
  try {
    store.set({ [trustItem(scope, digest)]: JSON.stringify({ yes: true, mission: scope, digest, at: new Date().toISOString() }) })
  } catch (e) { say('mc17 trust: the credential store refused the yes: ' + String(e.message || e).split('\n')[0]); return 1 }
  ctx.out('Trusted   : ' + digest + ' in the Mission ' + scope + ', kept in the credential store\n')
  return 0
}

module.exports = { ITEM_LIMIT, trustItem, trustLine, trusted, trustCommand }

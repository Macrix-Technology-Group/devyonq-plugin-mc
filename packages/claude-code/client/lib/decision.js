'use strict'
// Decisions on the computer (ARCH D10, D14, D15; AC-13, AC-17, AC-28): mc17 decision admit, which the heavy-run gate
// calls for each start it admits, and the ask run-test, the one way a test command runs. Both check the signature with
// the checking keys of the gateway in use (keys.js) and recompute the signed fields from the computer, refusing a field
// that differs and naming it. Admit then reports the start to the engine, which admits each decision to one start, once.

const path = require('node:path')
const { spawn } = require('node:child_process')
const { hexOf } = require('./canonical.js')
const { checkoutDigest } = require('./checkout.js')
const { checkSignature } = require('./keys.js')
const { within, readOrNull } = require('./places.js')

/*  The longest a test command runs, the suites' limit of the release's integration stage (45 minutes). */
const TEST_TIME_LIMIT_MS = 45 * 60 * 1000

/*  A digest as bare lower-case hex: `sha256:<hex>` and `<hex>` read alike. */
const bare = (v) => String(v === undefined || v === null ? '' : v).replace(/^sha256:/i, '').toLowerCase()

/*  The lock of the checkout at its working tree, or null. */
function lockOf (ctx) {
  if (!ctx.checkout) return null
  const b = readOrNull(path.join(ctx.checkout.top, '.mc17', 'wave.json'))
  if (b === null) return null
  try { return JSON.parse(b.toString('utf8').replace(/^﻿/, '')) } catch (_) { return null }
}

/*  The digest of a lock's wave as a decision binds it (D14): the sha256 of its plan id and its ruling record, so no
 *  asset id stands in the signed payload. */
function waveDigest (lock) {
  const plan = lock && lock.wavePlan ? String(lock.wavePlan) : null
  const ruling = lock && lock.rulingRecord !== undefined && lock.rulingRecord !== null ? lock.rulingRecord : null
  return hexOf(JSON.stringify([plan, ruling]))
}

/*  The Mission's scope a lock names, from its Wave Plan's name WAVE-PLAN-{SCOPE}-{NNN}, or null. */
function scopeOfLock (lock) {
  const m = /^WAVE-PLAN-([A-Z0-9]+(?:-[A-Z0-9]+)*)-\d{3}$/.exec(String((lock && lock.wavePlanName) || ''))
  return m ? m[1] : null
}

/*  The characters no test command may hold (the final check of IP-MC-SERVER-002, item 2): the C0 controls, DEL and the C1
 *  controls, which a terminal reads as moves, colours or titles, and the bidirectional controls U+202A-202E, U+2066-2069,
 *  U+200E, U+200F and U+061C, which show a command in another order than the shell runs it. The client prints a new test
 *  command for the person's yes, so a command holding one could read as another than the one the yes admits. */
const UNSHOWN = /[\x00-\x1f\x7f-\x9f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/

/*  Why the test command `command` may be neither shown nor run, naming the first such character by its code point and
 *  its place, or null. */
function unshownIn (command) {
  const m = UNSHOWN.exec(command)
  if (!m) return null
  return 'the test command holds the character U+' + m[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, '0') + ' at ' + m.index + ', a control or bidirectional character that the client neither shows nor runs, since it can make the command read as another'
}

/*  Recomputes the signed fields of `d` from the computer (D15): `command` against `commandDigest`, `checkout` against the
 *  present checkout, `wave`, `scope` and `plan` against the present lock, and `facts` against `inputDigest` where one is
 *  given. The scope is the one the engine signs from devyonq-saas f3aa4004 on (the final check of IP-MC-SERVER-002, item
 *  1b): {SCOPE} of the lock's wavePlanName, or null where none is read. Answers null or { field, why }. */
function fieldThatDiffers (ctx, d, commandDigest, inputDigest) {
  if (bare(d.command) !== bare(commandDigest)) return { field: 'command', why: 'the decision signs the command ' + bare(d.command).slice(0, 12) + ', and the call carries ' + bare(commandDigest).slice(0, 12) }
  if (!ctx.checkout) return { field: 'checkout', why: 'the start runs in no checkout, and the decision signs one' }
  if (bare(d.checkout) !== checkoutDigest(ctx.checkout)) return { field: 'checkout', why: 'the decision signs another checkout than this one: its remote, its root or its branch differs' }
  const lock = lockOf(ctx)
  if (!lock) return { field: 'wave', why: 'the checkout holds no .mc17/wave.json, and the decision signs a wave' }
  if (bare(d.wave) !== waveDigest(lock)) return { field: 'wave', why: 'the decision signs another wave than the lock of this checkout names: its plan or its ruling record differs' }
  const scope = d.scope === undefined || d.scope === null ? null : d.scope
  if (scope !== scopeOfLock(lock)) return { field: 'scope', why: 'the decision signs the scope ' + (scope === null ? 'none' : JSON.stringify(String(scope)).slice(0, 80)) + ', and the lock of this checkout names the Mission ' + (scopeOfLock(lock) || 'none') }
  if (bare(d.plan) !== bare(lock.planBinding)) return { field: 'plan', why: 'the decision signs the plan binding ' + bare(d.plan).slice(0, 12) + ', and the lock names ' + bare(lock.planBinding).slice(0, 12) }
  if (inputDigest !== undefined && bare(d.facts) !== bare(inputDigest)) return { field: 'facts', why: 'the decision signs the input digest ' + bare(d.facts).slice(0, 12) + ', and the entry carries ' + bare(inputDigest).slice(0, 12) }
  return null
}

/*  The lines of a JSON-lines file, each read, the lines that do not read passed over. */
function jsonl (file) {
  const b = readOrNull(file)
  if (b === null) return []
  const out = []
  for (const l of b.toString('utf8').split('\n')) {
    if (!l.trim()) continue
    try { out.push(JSON.parse(l)) } catch (_) { /* a torn line */ }
  }
  return out
}

/*  The start entry `id` of the store folder `dir`, folded from its lines: its first line's fields, with `decision` and
 *  `signature` from the line that carries them, and `inputDigest` from the entry or from its operation's saved line. */
function entryOf (dir, id) {
  let e = null
  for (const l of jsonl(path.join(dir, 'starts.jsonl'))) {
    if (!l || l.id !== id) continue
    if (!e) e = Object.assign({}, l)
    if (l.decision && l.signature) { e.decision = l.decision; e.signature = l.signature }
    if (l.state) e.state = l.state
  }
  if (e && e.inputDigest === undefined && e.operation) {
    const saved = jsonl(path.join(dir, 'ops.jsonl')).find((l) => l && l.id === e.operation && l.inputDigest)
    if (saved) e.inputDigest = saved.inputDigest
  }
  return e
}

/*  The word after `flag` in `argv`, or null. */
const flagValue = (argv, flag) => { const i = argv.indexOf(flag); return i >= 0 && argv[i + 1] !== undefined ? String(argv[i + 1]) : null }

/*  mc17 decision admit --store <dir> --entry <id> --command-digest <hex> [--prompt-digest <hex>] (Interface Contracts):
 *  exits 0 with { admitted: true, decisionId }, 2 with { admitted: false, field, why }, and 1 where DevyonQ cannot be
 *  reached or the client holds no sign-in, naming the gateway. One JSON line on stdout, whatever the exit. */
async function admitCommand (ctx, argv) {
  const line = (j) => ctx.out(JSON.stringify(j) + '\n')
  const refuse = (field, why) => { line({ admitted: false, field, why }); return 2 }
  const unreached = (field, why) => { line({ admitted: false, field, why }); return 1 }
  const store = flagValue(argv, '--store')
  const id = flagValue(argv, '--entry')
  const commandDigest = flagValue(argv, '--command-digest')
  const promptDigest = flagValue(argv, '--prompt-digest')
  if (!store || !id || !commandDigest) return refuse('arguments', 'mc17 decision admit takes --store <dir> --entry <id> --command-digest <hex> [--prompt-digest <hex>]')
  if (!/^[0-9a-f]{64}$/.test(bare(commandDigest))) return refuse('arguments', '--command-digest takes a sha256 in hex')
  if (promptDigest !== null && !/^[0-9a-f]{64}$/.test(bare(promptDigest))) return refuse('arguments', '--prompt-digest takes a sha256 in hex')
  const dir = path.resolve(ctx.cwd, store)
  if (!within(dir, ctx.places.store) || path.resolve(dir) === path.resolve(ctx.places.store)) return refuse('store', 'the store ' + dir + ' stands outside the converge store ' + ctx.places.store + ', and the client reads a decision from a store of that folder alone')
  const entry = entryOf(dir, id)
  if (!entry) return refuse('entry', 'the store ' + dir + ' holds no start entry ' + id)
  if (promptDigest !== null && bare(entry.promptDigest) !== bare(promptDigest)) return refuse('prompt', 'the entry ' + id + ' was made for the prompt ' + bare(entry.promptDigest).slice(0, 12) + ', and the call carries ' + bare(promptDigest).slice(0, 12))
  const { openStore } = require('./store.js')
  const { readSession, tenantMismatch, NoSession } = require('./session.js')
  try {
    ctx.store = ctx.store || openStore(ctx)
    ctx.session = readSession(ctx)
  } catch (e) {
    if (e instanceof NoSession) return unreached('session', e.message)
    throw e
  }
  const mismatch = tenantMismatch(ctx.session)
  if (mismatch) return refuse('tenant', mismatch)
  const sig = checkSignature(ctx, { decision: entry.decision, signature: entry.signature })
  if (!sig.ok) return refuse(sig.field, sig.why)
  ctx.programs = (ctx.test && ctx.test.programs) || ctx.session.programs
  if (!ctx.programs || !ctx.programs.git) return unreached('session', 'the client keeps no path of git. Run mc17 login in a terminal of your own.')
  ctx.checkout = require('./checkout.js').readCheckout(ctx.programs.git, ctx.cwd)
  const differs = fieldThatDiffers(ctx, entry.decision, commandDigest, entry.inputDigest === undefined ? null : entry.inputDigest)
  if (differs) return refuse(differs.field, differs.why)
  const decisionId = String(entry.decision.decisionId || '')
  if (!/^[A-Za-z0-9._:-]{1,200}$/.test(decisionId)) return refuse('decisionId', 'the decision names no id the start report can carry')
  const { call, refusalWords, Unreachable } = require('./transport.js')
  let res
  try {
    res = await call(ctx, 'decision-start', { decisionId }, { entry: id, command: bare(commandDigest) })
  } catch (e) {
    if (e instanceof Unreachable) return unreached('gateway', e.message)
    if (e.code === 'MC17_BODY_LIMIT') return refuse('body', e.message)
    throw e
  }
  if (res.status === 502 || res.status === 504) return unreached('gateway', 'DevyonQ cannot be reached at ' + ctx.session.gateway + ': the gateway answered ' + res.status)
  const refused = refusalWords(ctx, res)
  if (refused) return refuse('start', refused)
  line({ admitted: true, decisionId, keyId: sig.keyId })
  return 0
}

/*  The answer to the ask run-test { command, decision } (D10; AC-13): the signed decision checked as admit checks it, its
 *  command digest against the command, the person's yes for the command in this Mission read from the credential store,
 *  and then the command run through the system's shell at the top of the checkout. Answers a promise of { exit, output }
 *  or { refused }: the command runs beside the client's event loop, so the client polls its job while a long test runs
 *  (the contract's route jobs, pollWithinSeconds). */
async function answerRunTest (ctx, ask) {
  const command = typeof ask.command === 'string' ? ask.command : null
  if (!command) return { refused: 'the ask run-test carries no command' }
  const unshown = unshownIn(command)
  if (unshown) return { refused: unshown + '; the command was neither shown nor run' }
  const signed = ask.decision && typeof ask.decision === 'object' ? ask.decision : null
  const sig = checkSignature(ctx, signed)
  if (!sig.ok) return { refused: 'the decision of the test command does not check (' + sig.field + '): ' + sig.why }
  const digest = hexOf(command)
  const differs = fieldThatDiffers(ctx, signed.decision, digest)
  if (differs) return { refused: 'the decision of the test command differs in its field ' + differs.field + ': ' + differs.why }
  // The yes is read under the scope the decision signs (contract trust.note), which fieldThatDiffers found equal to the
  // Mission the lock names: a working tree that renames the Wave Plan changes no signed scope, so it borrows no yes.
  const scope = typeof signed.decision.scope === 'string' ? signed.decision.scope : null
  if (scope === null) return { refused: 'the decision of the test command signs no Mission scope, so no yes to a test command can be read for it' }
  const { trusted, trustLine } = require('./trust.js')
  const yes = trusted(ctx, scope, digest)
  if (yes.refused) return { refused: yes.refused }
  if (!yes.ok) {
    ctx.err('mc17: the engine asks to run a test command the Mission ' + scope + ' has not run before:\n  ' + command + '\n')
    return { refused: 'the test command ' + digest + ' is new in the Mission ' + scope + ', and the client runs it only after your own yes: run ' + trustLine(digest, scope) + ' in a terminal of your own, then run the same command again' }
  }
  const env = Object.assign({}, process.env)
  if (ctx.programs && ctx.programs.node) env.PATH = path.dirname(ctx.programs.node) + path.delimiter + (env.PATH || '')
  const r = await runShell(command, { cwd: ctx.checkout.top, env, timeoutMs: TEST_TIME_LIMIT_MS, maxBytes: TEST_OUTPUT_BYTES, signal: ctx.askSignal })
  const stopped = r.error ? r.error : (r.signal ? 'killed by ' + r.signal : null)
  const text = r.stdout + r.stderr + (stopped ? '\nmc17: the test command did not finish: ' + stopped + '\n' : '')
  return { exit: r.status === null ? 1 : r.status, output: Buffer.from(text, 'utf8').toString('base64'), stageOutput: {} }
}

/*  The most a test command may print on each of its two streams before the client stops it (64 MiB, as before). */
const TEST_OUTPUT_BYTES = 64 * 1024 * 1024

/*  Runs `command` through the system's shell, as spawnSync did, without holding the event loop: { status, signal,
 *  stdout, stderr, error }. The command is stopped past `timeoutMs`, once a stream passes `maxBytes`, or where `signal`
 *  aborts, as it does once the engine abandoned the job the test runs for (runner.js whilePolling). */
function runShell (command, o) {
  return new Promise((resolve) => {
    let child
    // On Linux and macOS the shell runs in a process group of its own, so the client can end the group: the programs the
    // shell started, which hold the streams open, end with it (the final check's Linux run: a test command stopped at
    // the ask's wall ran on to its own end, and the client waited for it).
    const posix = process.platform !== 'win32'
    try { child = spawn(command, { shell: true, cwd: o.cwd, env: o.env, windowsHide: true, detached: posix, stdio: ['ignore', 'pipe', 'pipe'] }) } catch (e) {
      resolve({ status: null, signal: null, stdout: '', stderr: '', error: String(e.message || e) })
      return
    }
    const streams = { stdout: [], stderr: [] }
    const sizes = { stdout: 0, stderr: 0 }
    let error = null
    let ended = false
    // The shell's own children hold the streams open, so the whole tree is ended: on Windows with taskkill /T, elsewhere
    // by the process group, with SIGTERM and, where it still stands a second later, SIGKILL.
    const stop = (why) => {
      if (!error) error = why
      if (!posix && child.pid) {
        try { require('node:child_process').spawnSync(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe'), ['/F', '/T', '/PID', String(child.pid)], { windowsHide: true, timeout: 10000 }) } catch (_) { /* gone */ }
      }
      if (posix && child.pid) {
        try { process.kill(-child.pid, 'SIGTERM') } catch (_) { /* gone */ }
        setTimeout(() => { if (!ended) { try { process.kill(-child.pid, 'SIGKILL') } catch (_) { /* gone */ } } }, 1000).unref()
      }
      try { child.kill() } catch (_) { /* gone */ }
    }
    // A group of its own takes no Ctrl+C or hang-up of the person's terminal, so where the client ends on one, or exits,
    // while the command runs, it ends the group first and then ends as the signal would have ended it.
    const SIGNALS = posix ? ['SIGINT', 'SIGTERM', 'SIGHUP'] : []
    const endGroup = () => { if (posix && child.pid && !ended) { try { process.kill(-child.pid, 'SIGKILL') } catch (_) { /* gone */ } } }
    const onSignal = (sig) => { endGroup(); release(); process.kill(process.pid, sig) }
    const release = () => { for (const s of SIGNALS) process.removeListener(s, onSignal); process.removeListener('exit', endGroup) }
    for (const s of SIGNALS) process.on(s, onSignal)
    if (posix) process.on('exit', endGroup)
    const timer = setTimeout(() => stop('it ran past ' + o.timeoutMs + ' ms (ETIMEDOUT)'), o.timeoutMs)
    const gone = () => stop('the engine abandoned the job it ran for')
    if (o.signal) { if (o.signal.aborted) gone(); else o.signal.addEventListener('abort', gone, { once: true }) }
    for (const name of ['stdout', 'stderr']) {
      child[name].on('data', (c) => {
        if (sizes[name] + c.length > o.maxBytes) { stop('it printed more than ' + o.maxBytes + ' bytes on ' + name + ' (ENOBUFS)'); return }
        sizes[name] += c.length
        streams[name].push(c)
      })
    }
    const end = (status, signal, why) => {
      if (ended) return
      ended = true
      release()
      clearTimeout(timer)
      if (o.signal) o.signal.removeEventListener('abort', gone)
      if (why && !error) error = why
      resolve({ status, signal, stdout: Buffer.concat(streams.stdout).toString('utf8'), stderr: Buffer.concat(streams.stderr).toString('utf8'), error })
    }
    child.on('error', (e) => end(null, null, String(e.message || e)))
    child.on('close', (status, signal) => end(error ? null : status, signal, null))
  })
}

module.exports = { TEST_TIME_LIMIT_MS, UNSHOWN, bare, lockOf, waveDigest, scopeOfLock, unshownIn, fieldThatDiffers, entryOf, admitCommand, answerRunTest }

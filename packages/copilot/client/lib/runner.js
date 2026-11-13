'use strict'
// A command the engine answers (ARCH D8, D10, D11, D12, D13, D20): the client reads the facts the contract names, sends
// the command, follows its job until it ends, answers each ask, carries out the steps of `done`, and prints the output
// with its exit code. It carries out no step before the gateway has answered, so a DevyonQ it cannot reach changes
// nothing.

const { call, gatewayDown, refusalOf, refusalWords, Unreachable } = require('./transport.js')
const { kindOf, writes, factsOf } = require('./contract.js')
const { requestKey } = require('./canonical.js')
const { upFront, answerFacts, refusalIn, namedFiles, sentArguments, standingHooks } = require('./facts.js')
const { checkStep, fileStep, gitStep, StepRefused } = require('./steps.js')

/*  The exit where DevyonQ cannot be reached at the first call (D20): the command's own `unreachedExit` where its contract
 *  entry names one, as mc17 lintdoc's 3 that the document gate reads apart from its 1 for violations, and 1 otherwise. */
const unreachedExit = (cmd) => (Number.isInteger(cmd.entry.unreachedExit) ? cmd.entry.unreachedExit : 1)

/*  The words for a command left unfinished, with the command to run again (D11, D12). */
const unfinished = (line) => 'mc17: the act was cut off before it ended and stands unfinished. Run the same command again to finish it once: mc17 ' + line

/*  `text` with the terminal's control sequences taken out (the second review of IP-MC-SERVER-002, N15): the engine's
 *  output and its refusal words reach the person's terminal, where an escape sequence could move the cursor, rewrite a
 *  line the client printed, set the window's title or hide a link. Taken out: OSC, DCS, PM and APC strings, CSI
 *  sequences in their 7-bit and 8-bit forms, every other escape, and each control character but tab and line feed, a
 *  carriage return before a line feed kept; and the bidirectional controls U+202A-202E, U+2066-2069, U+200E, U+200F and
 *  U+061C, which show a text in another order than it reads (the final check of IP-MC-SERVER-002, item 2). */
function plainText (text) {
  return String(text === undefined || text === null ? '' : text)
    .replace(/\x1b[\]P^_][\s\S]*?(?:\x07|\x1b\\|$)/g, '')
    .replace(/\x9d[\s\S]*?(?:\x07|\x9c|$)/g, '')
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\x9b[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b[ -/]*[0-~]?/g, '')
    .replace(/\r(?!\n)/g, '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, '')
    .replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
}

/*  Answers one ask (D8, D10), or { id, refused } for a kind outside the contract's list. */
async function answerAsk (ctx, ask) {
  const kinds = Object.keys(ctx.contract.doc.asks || {})
  if (!ask || kinds.indexOf(ask.kind) < 0) return { id: ask && ask.id, refused: 'the ask ' + JSON.stringify(ask && ask.kind) + ' stands outside the closed list of the contract' }
  if (ask.kind === 'facts') return answerFacts(ctx, ask)
  if (ask.kind === 'step') return Object.assign({ id: ask.id }, gitStep(ctx, ask.step))
  if (ask.kind === 'suite-changes' || ask.kind === 'reading') {
    let readings = null
    try { readings = require('./readings/index.js') } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e }
    if (!readings) return { id: ask.id, refused: 'this build of the client carries no readings' }
    return Object.assign({ id: ask.id }, ask.kind === 'reading' ? readings.answerReading(ctx, ask) : readings.answerSuiteChanges(ctx, ask))
  }
  const handler = ctx.askHandlers && ctx.askHandlers[ask.kind]
  if (handler) return Object.assign({ id: ask.id }, await handler(ctx, ask))
  if (ask.kind === 'model-key') return Object.assign({ id: ask.id }, require('./model.js').answerModelKey(ctx, ask))
  if (ask.kind === 'model') return Object.assign({ id: ask.id }, await require('./model.js').answerModel(ctx, ask))
  if (ask.kind === 'run-test') return Object.assign({ id: ask.id }, await require('./decision.js').answerRunTest(ctx, ask))
  return { id: ask.id, refused: 'this build of the client carries no answer to the ask ' + ask.kind }
}

/*  How often the client polls a job while it carries out its asks: half the route jobs' pollWithinSeconds (30 s in
 *  contract version 1), counted from the end of the poll before, so the engine, which abandons a job 120 s after the
 *  client's last contact, keeps the job of a long ask such as a run-test. The test build may set it shorter. */
function pollEveryMs (ctx) {
  if (ctx.test && Number.isInteger(ctx.test.pollEveryMs) && ctx.test.pollEveryMs > 0) return ctx.test.pollEveryMs
  let within = null
  try { within = require('./contract.js').routeOf(ctx.contract, 'jobs').pollWithinSeconds } catch (_) { within = null }
  return (Number.isInteger(within) && within > 0 ? within : 30) * 500
}

/*  The walls of the route jobs (contract version 1 from devyonq-saas cdf5f032): the engine abandons a job still running
 *  commandWallSeconds after it started, and one whose ask the client has not answered askWallSeconds after it was made,
 *  whatever the client's polls. { command, ask } in seconds, null where the contract names none. The test build may set
 *  them shorter. */
function wallsOf (ctx) {
  let route = {}
  try { route = require('./contract.js').routeOf(ctx.contract, 'jobs') || {} } catch (_) { route = {} }
  const t = (ctx.test && ctx.test.walls) || {}
  const pick = (k) => (typeof t[k] === 'number' && t[k] > 0 ? t[k] : (Number.isInteger(route[k]) && route[k] > 0 ? route[k] : null))
  return { command: pick('commandWallSeconds'), ask: pick('askWallSeconds') }
}

/*  The words for a job the engine abandoned, by the wall it met: the command's wall where the command has run that long,
 *  the ask's wall where the asks have waited that long, and the act left unfinished otherwise (D11). `startedAt` is when
 *  the command was sent, `askedAt` when the asks the client was carrying out came, or null; `wall` reads 'ask' where
 *  the client saw the ask's wall pass itself. */
function abandonedWords (ctx, line, startedAt, askedAt, wall) {
  const walls = wallsOf(ctx)
  const now = Date.now()
  const askWords = () => 'the client did not answer the engine\'s ask within the wall of ' + walls.ask + ' s the route jobs sets for an ask (askWallSeconds)'
  let why = null
  if (wall === 'ask' && walls.ask !== null) why = askWords()
  else if (walls.command !== null && now - startedAt >= walls.command * 1000) why = 'the command ran past the wall of ' + walls.command + ' s the route jobs sets for a command (commandWallSeconds)'
  else if (walls.ask !== null && askedAt !== null && now - askedAt >= walls.ask * 1000) why = askWords()
  if (why === null) return unfinished(line)
  return 'mc17: the engine abandoned the job: ' + why + '. The client stopped waiting for it and carried out nothing more of it; the act stands unfinished. Run the same command again to finish it once: mc17 ' + line
}

/*  Carries out `work` (an async function) while polling the job `jobId` with no answers every pollEveryMs, so the job
 *  stays alive while the client works on a long ask (the contract's route jobs, pollWithinSeconds). A poll still open
 *  when the work ends is dropped, so the answers go at once. The client stops waiting where the job is gone: a poll that
 *  answers the job abandoned or interrupted, or a 404, or the ask's wall passing (askWallSeconds), ends the work at once
 *  through the signal ctx.askSignal, which a run-test's command is stopped by, and leaves ctx.jobEnded naming why.
 *  Answers what `work` answers. */
async function whilePolling (ctx, jobId, work) {
  const every = pollEveryMs(ctx)
  const walls = wallsOf(ctx)
  const stop = new AbortController()
  ctx.askSignal = stop.signal
  ctx.jobEnded = null
  const end = (why) => { if (!ctx.jobEnded) { ctx.jobEnded = why; stop.abort() } }
  let over = false
  let timer = null
  let open = null
  const beat = () => {
    timer = null
    if (over) return
    const mine = new AbortController()
    open = mine
    follow(ctx, jobId, [], mine.signal).catch(() => null).then((res) => {
      if (open === mine) open = null
      if (!over && res && (res.status === 404 || (res.json && (res.json.state === 'abandoned' || res.json.state === 'interrupted')))) end({ state: res.status === 404 ? 'gone' : res.json.state })
      if (!over && !ctx.jobEnded) timer = setTimeout(beat, every)
    })
  }
  timer = setTimeout(beat, every)
  const wall = walls.ask !== null ? setTimeout(() => end({ state: 'abandoned', wall: 'ask' }), walls.ask * 1000) : null
  try {
    return await work()
  } finally {
    over = true
    if (timer) clearTimeout(timer)
    if (wall) clearTimeout(wall)
    if (open) open.abort()
  }
}

/*  Whether an answer is the engine's refusal of a command its queue has no room for (D5; finding 37 of the DVQ-018
 *  Copilot run): harness-request-refused whose sentence reads that the queue of N is full and nothing of the command ran
 *  (devyonq-saas engine/jobs.ts, admit), or a refusal coded harness-busy. No other refusal is one. */
function queueFull (res) {
  if (!res || res.status < 400) return false
  const { code, sentence } = refusalOf(res)
  if (code === 'harness-busy') return true
  return code === 'harness-request-refused' && /\bqueue of \d+ is full\b/.test(String(sentence))
}

/*  The waits before each send again of a command the engine's queue had no room for: four at most, doubling from 2 s,
 *  all within the command's own time limit, the route jobs' commandWallSeconds (900 s in contract version 1). The test
 *  build may set the first wait shorter. */
function busyWaits (ctx) {
  const first = ctx.test && Number.isInteger(ctx.test.busyFirstWaitMs) && ctx.test.busyFirstWaitMs > 0 ? ctx.test.busyFirstWaitMs : 2000
  const wall = wallsOf(ctx).command
  const limit = (wall === null ? 900 : wall) * 1000
  const out = []
  let total = 0
  for (let i = 0, w = first; i < 4; i += 1, w *= 2) {
    if (total + w > limit) break
    out.push(w)
    total += w
  }
  return out
}

/*  Sends the command, and where the engine answers that its queue is full, waits and sends it again with the same body
 *  and request key, as busyWaits allows, saying so on stderr once: a refusal of the full queue ran nothing of the
 *  command, so a send again lands it once. Any other answer, every other refusal among them, is answered at once.
 *  Answers the last answer. */
async function sendWhileBusy (ctx, routeId, body, say) {
  const waits = busyWaits(ctx)
  let res = await call(ctx, routeId, {}, body)
  for (let i = 0; i < waits.length && queueFull(res); i += 1) {
    if (i === 0) say('mc17: the engine\'s queue of commands is full and nothing of this command ran; the client waits and sends it again, at most ' + waits.length + ' times within ' + Math.ceil(waits.reduce((a, b) => a + b, 0) / 1000) + ' s')
    await new Promise((resolve) => setTimeout(resolve, waits[i]))
    res = await call(ctx, routeId, {}, body)
  }
  return res
}

/*  Runs the command `argv` (the words after mc17) whose contract entry is `cmd`: answers the exit code. */
async function runRemote (ctx, cmd, argv) {
  const say = (s) => { const t = plainText(s); ctx.err(t.endsWith('\n') ? t : t + '\n') }
  const kind = kindOf(cmd, argv)
  const line = argv.join(' ')
  const args = argv.slice()
  let files = {}
  try {
    // The files first, read from the words as given; then the paths a command writes, past the words that sent a file.
    const done = new Set()
    files = namedFiles(ctx, cmd.entry, args, cmd.words, done)
    sentArguments(ctx, cmd.entry, args, done)
    // A rerun of mc17 wave hooks sends the hooks standing where core.hooksPath already points (contract ask 2).
    if (cmd.name === 'wave hooks') Object.assign(files, standingHooks(ctx))
  } catch (e) {
    say('mc17: ' + String(e.message || e) + '; nothing was sent')
    return 1
  }
  ctx.namedFiles = files
  // The words as the client sends them, which name the paths the engine may write in the checkout (steps.js, D30).
  ctx.sentArgs = args.slice()
  const facts = upFront(ctx, factsOf(cmd, argv), argv)
  // The session's instance as the sign-in answered it, null where the person has no CanonQ connection yet.
  const body = { command: cmd.name, args: args.slice(cmd.words), instance: ctx.session.instance === undefined ? null : ctx.session.instance, files, facts }
  if (writes(ctx.contract, kind)) {
    body.requestKey = requestKey({ contractVersion: ctx.contract.version, tenant: ctx.session.tenant, person: ctx.session.person, command: cmd.name, args: body.args, files, remote: ctx.checkout ? ctx.checkout.remote : null, branch: ctx.checkout ? ctx.checkout.branch : null })
  }
  const routeId = cmd.entry.route === 'uploads' ? 'uploads' : 'commands'
  let res
  try {
    res = await sendWhileBusy(ctx, routeId, body, say)
  } catch (e) {
    if (e instanceof Unreachable) { say('mc17: ' + e.message + '. The command stopped before it changed anything.'); return unreachedExit(cmd) }
    if (e.code === 'MC17_BODY_LIMIT') { say('mc17: ' + e.message); return 1 }
    throw e
  }
  if (gatewayDown(res)) { say('mc17: DevyonQ cannot be reached at ' + ctx.session.gateway + ': the gateway answered ' + res.status + '. The command stopped before it changed anything.'); return unreachedExit(cmd) }
  const refused = refusalWords(ctx, res)
  if (refused) { say('mc17: ' + refused); return 1 }
  let job = res.json
  let seenRunning = false
  const startedAt = Date.now()
  let askedAt = null
  for (;;) {
    if (!job || typeof job !== 'object' || typeof job.state !== 'string') { say('mc17: the gateway answered no job the client can read; nothing was carried out'); return 1 }
    const state = job.state
    if (state === 'done' || state === 'failed') break
    if (state === 'interrupted') { say(unfinished(line)); return 1 }
    if (state === 'abandoned') { say(abandonedWords(ctx, line, startedAt, askedAt)); return 1 }
    let answers
    if (state === 'asks') {
      answers = []
      let refusedAsk = null
      askedAt = Date.now()
      await whilePolling(ctx, job.job, async () => {
        for (const ask of job.asks || []) {
          if (ctx.jobEnded) return
          const a = await answerAsk(ctx, ask)
          if (ctx.jobEnded) return
          if (a.refused || refusalIn(a)) { refusedAsk = a; return }
          answers.push(a)
        }
      })
      // The job is gone or passed its wall while the client worked on its asks: the client stops waiting and says so.
      if (ctx.jobEnded) {
        say(ctx.jobEnded.state === 'interrupted' ? unfinished(line) : ctx.jobEnded.state === 'gone' ? unfinished(line) + ' (the engine no longer knows the job)' : abandonedWords(ctx, line, startedAt, askedAt, ctx.jobEnded.wall))
        return 1
      }
      if (refusedAsk) {
        say('mc17: the client refused an ask of the engine: ' + (refusedAsk.refused || refusalIn(refusedAsk)) + '. The command fails.')
        await follow(ctx, job.job, [refusedAsk]).catch(() => null)
        return 1
      }
    } else if (state === 'running') {
      seenRunning = true
    } else { say('mc17: the gateway answered the job state ' + JSON.stringify(state) + ', which the contract does not name'); return 1 }
    let next
    try {
      next = await follow(ctx, job.job, answers)
    } catch (e) {
      if (e instanceof Unreachable) { say(unfinished(line) + ' (the connection to ' + ctx.session.gateway + ' dropped: ' + e.why + ')'); return 1 }
      throw e
    }
    if (next.status === 404 && (seenRunning || state === 'asks')) { say(unfinished(line)); return 1 }
    if (next.status === 502 || next.status === 504) { say(unfinished(line) + ' (the gateway answered ' + next.status + ')'); return 1 }
    const r2 = refusalWords(ctx, next)
    if (r2) { say('mc17: ' + r2); return 1 }
    job = next.json
  }
  const output = job.output || {}
  const steps = Array.isArray(job.steps) ? job.steps : []
  if (job.state === 'done' && steps.length) {
    try {
      for (const s of steps) checkStep(ctx, s)
      for (const s of steps) { const l = fileStep(ctx, s); if (ctx.verbose) say(l) }
    } catch (e) {
      if (e instanceof StepRefused) { writeOutput(ctx, output); say('mc17: the client refused a step: ' + e.message); return 1 }
      throw e
    }
  }
  writeOutput(ctx, output)
  return Number.isInteger(output.exit) ? output.exit : (job.state === 'done' ? 0 : 1)
}

/*  One follow of a job, carrying `answers` where there are any; `signal` drops it while it is open. */
function follow (ctx, jobId, answers, signal) {
  return call(ctx, 'jobs', { jobId }, answers && answers.length ? { answers } : {}, undefined, signal)
}

function writeOutput (ctx, output) {
  if (typeof output.stdout === 'string' && output.stdout) ctx.out(plainText(Buffer.from(output.stdout, 'base64').toString('utf8')))
  if (typeof output.stderr === 'string' && output.stderr) ctx.err(plainText(Buffer.from(output.stderr, 'base64').toString('utf8')))
}

/*  A read of kind `kind` (AC-20): GET .../reads/:kind with the values the contract's readKinds name, from the flags of the
 *  same names. Prints the content as JSON. */
async function runRead (ctx, argv) {
  const say = (s) => { const t = plainText(s); ctx.err(t.endsWith('\n') ? t : t + '\n') }
  const kind = argv[1]
  const kinds = ctx.contract.doc.readKinds || {}
  if (!kind || !Object.prototype.hasOwnProperty.call(kinds, kind)) { say('mc17 read: name one kind of ' + Object.keys(kinds).join(', ')); return 2 }
  const query = {}
  for (const k of kinds[kind]) {
    const i = argv.indexOf('--' + k)
    if (i < 0 || argv[i + 1] === undefined) { say('mc17 read ' + kind + ': --' + k + ' is needed'); return 2 }
    query[k] = argv[i + 1]
  }
  let res
  try { res = await call(ctx, 'reads', { kind }, undefined, query) } catch (e) {
    if (e instanceof Unreachable) { say('mc17: ' + e.message + '. Nothing was read.'); return 1 }
    throw e
  }
  if (gatewayDown(res)) { say('mc17: DevyonQ cannot be reached at ' + ctx.session.gateway + ': the gateway answered ' + res.status + '. Nothing was read.'); return 1 }
  const refused = refusalWords(ctx, res)
  if (refused) { say('mc17: ' + refused); return 1 }
  const content = res.json ? res.json.content : null
  ctx.out(plainText(typeof content === 'string' ? content : JSON.stringify(content, null, 2)) + '\n')
  return 0
}

module.exports = { plainText, wallsOf, abandonedWords, runRemote, runRead, answerAsk, unfinished, pollEveryMs, whilePolling, queueFull, busyWaits }

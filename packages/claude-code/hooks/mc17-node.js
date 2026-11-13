'use strict'
// The session-start settings hook (ARCH D19, D20, D23; AC-21). Each host's hook file starts it
// through the launcher, as `client/mc17 settings --hook {value}` (client/mc17.cmd on Windows), and the client answers
// that form itself by calling main() below in its own process: so the hook runs on the Node kept at mc17 login, in the
// environment the launcher built, and reads the person's settings through DevyonQ with the client's own transport.
//
// For `settings --hook {value}`, main() runs the hook's part harness/mc17/settings/hook.js in this process with the event
// read on standard input; for `settings --measure`, the measure of the same file; for other arguments, the client's own
// frame with them, in this process. Exits 0; where the command delivered nothing, prints one line naming why, with the
// hold where the command is the head, `all` or a slot of MANDATE.
//
// With `--as additional-context`, which main() takes out of the arguments it hands on, it alone writes, for a host that
// takes a start's context only from a JSON field: it gathers the whole text the command delivers, its own line included
// where it prints one, and as the process ends writes one JSON object that carries that text at the top level as
// `additionalContext` and inside `hookSpecificOutput` beside `hookEventName` SessionStart.
//
// No host's hook file starts this file with a bare node: each starts the launcher (tests/fake-gateway/settings.test.js
// checks every host's file). Started so all the same, by hand or by a script, the file meets the guard of the client's
// own run first (main.js refusalOfRun): it refuses, exit 1, under a Node started without --use-system-ca or in an
// environment holding a variable the client refuses, and otherwise runs main() itself, which reads the client's session
// from the credential store in this process.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

/*  The hold of the hook's lines, where no title of the person's MANDATE is known. */
const HOLD = 'Until it has read the person\'s MANDATE whole, with mc17 settings or through its CanonQ connector, the session sends nothing to production or to other people and gives no approval in the person\'s name; a word of the person in the chat lifts this hold for the one act it names.'

/*  Standard input read to its end, or the empty string where it is a terminal or cannot be read. */
function readInput () {
  if (process.stdin.isTTY) return ''
  const chunks = []
  const buf = Buffer.alloc(65536)
  for (;;) {
    let n = 0
    try {
      n = fs.readSync(0, buf, 0, buf.length, null)
    } catch (e) {
      if (e && e.code === 'EAGAIN') { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10); continue }
      break
    }
    if (n === 0) break
    chunks.push(Buffer.from(buf.subarray(0, n)))
  }
  return Buffer.concat(chunks).toString('utf8')
}

/*  Writes the whole of `text` to standard output. A pipe the host opened non-blocking takes a write no larger than its
 *  buffer, 64 KiB on Linux, and answers EAGAIN while it is full, so each write takes what the pipe holds and the rest
 *  waits for the host to read it. */
function writeAll (text) {
  const bytes = Buffer.from(text, 'utf8')
  let off = 0
  while (off < bytes.length) {
    try {
      off += fs.writeSync(1, bytes, off, bytes.length - off)
    } catch (e) {
      if (e && e.code === 'EAGAIN') { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5); continue }
      return
    }
  }
}

/*  Runs the hook for the words `given` (after mc17), with `client` the client's context where the client calls it, and
 *  answers 0 once the command has written; the process's exit writes what is owed. */
async function main (given, client) {
  const input = readInput()
  let sessionId = ''
  try {
    const e = JSON.parse(input)
    if (e && typeof e.session_id === 'string') sessionId = e.session_id
  } catch (e) {}
  const mark = crypto.createHash('sha256').update(sessionId).digest('hex').slice(0, 8)
  const asAt = given.indexOf('--as')
  const json = asAt >= 0 && given[asAt + 1] === 'additional-context'
  const args = json ? given.slice(0, asAt).concat(given.slice(asAt + 2)) : given
  const at = args.indexOf('--hook')
  const named = at >= 0 && args[at + 1] !== undefined ? args[at + 1] : (args.find((a) => a.startsWith('--hook=')) || '--hook=mc17 settings').slice(7)
  /*  Each control character, line break and backtick of a value, read as a space. */
  const UNSAFE = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f' + String.fromCharCode(0x2028, 0x2029) + '`]', 'g')
  const what = String(named).replace(UNSAFE, ' ').slice(0, 40)
  const holds = what === 'head' || what === 'all' || what.startsWith('MANDATE:')
  /*  The command's one line where it delivered nothing, naming why. */
  const line = (cause) => '[MC settings] #' + mark + ' ' + what + ': the hook\'s program ' + cause + ', and this command delivered nothing.' + (holds ? ' ' + HOLD : '') + '\n'
  /*  Under `--as additional-context`, the text gathered for the one JSON object: every write of this process goes into it. */
  let gathered = ''
  if (json) {
    process.stdout.write = function (chunk, enc, cb) {
      gathered += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk)
      const done = typeof enc === 'function' ? enc : cb
      if (typeof done === 'function') process.nextTick(done)
      return true
    }
  }
  let wrote = false
  process.on('exit', () => {
    if (!wrote && json) {
      wrote = true
      process.stdout.write(line('ended before its answer'))
    }
    if (!wrote) {
      wrote = true
      writeAll(line('ended before its answer'))
    }
    if (json) {
      writeAll(JSON.stringify({ additionalContext: gathered, hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: gathered } }) + '\n')
    }
    process.exitCode = 0
  })
  let part = null
  try {
    part = require(path.join(__dirname, '..', 'harness', 'mc17', 'settings', 'hook.js'))
  } catch (e) {
    process.stdout.write(line('could not load'))
    wrote = true
    return 0
  }
  if (args[0] === 'settings' && args.indexOf('--measure') < 0) {
    // A settings form with a part the hook knows runs that part; any other form of --hook is answered by the hook as a
    // form it does not take, so the client never runs this file again for it.
    const value = args.length === 3 && args[1] === '--hook' && !args[2].startsWith('--') ? args[2] : named
    try {
      const r = await part.hookAction({ _: [], json: false, hook: value, input, client, written: () => { wrote = true } })
      if (!r || typeof r.stdout !== 'string') { process.stdout.write(line('met an error')); wrote = true; return 0 }
      wrote = true
      // A read the gateway never answered keeps its connection open after the hook's deadline has ended it, so the
      // command ends once its string is written, within the host's timeout, whatever still waits for an answer.
      process.stdout.write(r.stdout, () => process.exit(0))
    } catch (e) {
      process.stdout.write(line('met an error'))
      wrote = true
    }
    return 0
  }
  if (args[0] === 'settings' && args.indexOf('--measure') >= 0) {
    try {
      const r = await part.measureAction({ client })
      process.stdout.write((args.indexOf('--json') >= 0 ? JSON.stringify(r.json, null, 2) : r.human.join('\n')) + '\n')
      wrote = true
      return r.exit
    } catch (e) {
      process.stdout.write(line('met an error'))
      wrote = true
      return 0
    }
  }
  // Any other words run the client's own frame in this process, as the launcher would have run them.
  let status
  try {
    status = await require(path.join(__dirname, '..', 'client', 'lib', 'main.js')).run(args, {})
  } catch (e) {
    status = 'none, since it could not start'
  }
  if (status !== 0 && gathered !== '' && !gathered.endsWith('\n')) gathered += '\n'
  if (status !== 0) process.stdout.write(line('ended with exit ' + status))
  wrote = true
  return 0
}

module.exports = { HOLD, main }

if (require.main === module) {
  const refused = require(path.join(__dirname, '..', 'client', 'lib', 'main.js')).refusalOfRun({})
  if (refused) {
    process.stderr.write(refused + '\n')
    process.exitCode = 1
  } else main(process.argv.slice(2), null).then((code) => { process.exitCode = Number.isInteger(code) ? code : 0 }, () => { process.exitCode = 0 })
}

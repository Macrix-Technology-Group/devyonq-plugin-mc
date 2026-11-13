'use strict'
// The contract the client and the engine share (ARCH D3): the routes, the commands, the steps, the asks, the git forms,
// the process patterns and the refusals. The client reads it from one place, contract/harness-contract.json beside its
// own folder, and sends its version and the sha256 of its bytes with every call.

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const CONTRACT_FILE = path.join(__dirname, '..', 'contract', 'harness-contract.json')
/*  The pin of the copy (ARCH Interface Contracts, The contract copy): the version, the sha256, the source path and the
 *  devyonq-saas commit the copy was taken from, and `interim` while that commit is no merge of mission/mc-server. */
const COPY_FILE = path.join(__dirname, '..', 'contract', 'copy.json')

/*  The contract at `file` (the client's own copy where none is given): { doc, bytes, sha256, version }. `version` is
 *  the version the client sends, which the test build may set to another whole number (TC-37). */
function loadContract (file, versionOverride) {
  const bytes = fs.readFileSync(file || CONTRACT_FILE)
  const doc = JSON.parse(bytes.toString('utf8'))
  if (!doc || doc.form !== 'mc-harness-contract/1' || !Number.isInteger(doc.version)) throw new Error('the contract copy ' + (file || CONTRACT_FILE) + ' is no mc-harness-contract/1 file with a whole version')
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex')
  const asked = testVersionOf(doc, versionOverride)
  const version = asked === null ? doc.version : asked
  return { doc, bytes, sha256, version, file: file || CONTRACT_FILE }
}

/*  The pin beside the client's copy, or null where it does not read. */
function pinOf (file) {
  try { return JSON.parse(fs.readFileSync(file || COPY_FILE, 'utf8')) } catch (_) { return null }
}

/*  The version the client's test build sends where its options name one: a whole number, or 'older' or 'newer' for the
 *  versions of the contract's testBuild section, which the gateway's test build always refuses (TC-7, TC-37). */
function testVersionOf (doc, wanted) {
  if (Number.isInteger(wanted)) return wanted
  const v = doc && doc.testBuild && doc.testBuild.versions
  if ((wanted === 'older' || wanted === 'newer') && v && Number.isInteger(v[wanted])) return v[wanted]
  return null
}

/*  The value of the header the client sends on every call (ARCH Interface Contracts). */
function contractHeader (c) {
  return c.version + '; sha256=' + c.sha256
}

/*  The route of the contract with id `id`. */
function routeOf (c, id) {
  const r = (c.doc.routes || []).find((x) => x.id === id)
  if (!r) throw new Error('the contract names no route ' + id)
  return r
}

/*  The command entry the words of `argv` name: the first word is the command, and where its entry has forms, the second
 *  word names the form. Answers { name, entry, words } or null where the contract names no such command. Flags of the
 *  entry the form does not restate are inherited. */
function commandOf (c, argv) {
  const cmds = c.doc.commands || {}
  const first = argv[0]
  if (!first || !Object.prototype.hasOwnProperty.call(cmds, first)) return null
  const top = cmds[first]
  const second = argv[1]
  if (top.forms && second && Object.prototype.hasOwnProperty.call(top.forms, second)) {
    const form = top.forms[second]
    const entry = Object.assign({}, top, form)
    delete entry.forms
    return { name: first + ' ' + second, entry, words: 2 }
  }
  const entry = Object.assign({}, top)
  delete entry.forms
  return { name: first, entry, words: 1 }
}

/*  The kind a command runs as with its arguments: `local` where a flag of its `localFlags` stands, `write` where a flag of
 *  its `writeFlags` stands, and its entry's kind otherwise. */
function kindOf (cmd, argv) {
  const e = cmd.entry
  if ((e.localFlags || []).some((f) => argv.indexOf(f) >= 0)) return 'local'
  if ((e.writeFlags || []).some((f) => argv.indexOf(f) >= 0)) return 'write'
  return e.kind
}

/*  Whether a kind writes, so its request carries a request key (D12). */
function writes (c, kind) {
  return (c.doc.writingKinds || ['write', 'approval', 'decision']).indexOf(kind) >= 0
}

/*  The facts the command sends up front with its arguments: its entry's list, and the lists of `flagFacts` for each flag
 *  that stands. */
function factsOf (cmd, argv) {
  const out = (cmd.entry.facts || []).slice()
  for (const [flag, list] of Object.entries(cmd.entry.flagFacts || {})) if (argv.indexOf(flag) >= 0) for (const f of list) if (out.indexOf(f) < 0) out.push(f)
  return out
}

/*  The git form named `name` of the contract's census (D31), or null. */
function gitFormOf (c, name) {
  return (c.doc.gitForms || []).find((f) => f.form === name) || null
}

module.exports = { CONTRACT_FILE, COPY_FILE, pinOf, testVersionOf, loadContract, contractHeader, routeOf, commandOf, kindOf, writes, factsOf, gitFormOf }

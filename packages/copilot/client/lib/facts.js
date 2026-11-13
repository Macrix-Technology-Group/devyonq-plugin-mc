'use strict'
// The facts the client sends (ARCH D8, D9, D31, D32; AC-12): up front, the facts the contract lists for the command, and
// mid-run, the answers to the ask `facts`, item by item from the closed list of kinds. An item outside the list is
// answered { refused }, which fails the command. No diff, no patch and no source file leaves the computer.

const fs = require('node:fs')
const path = require('node:path')
const { runGit, formArgv, LITERAL } = require('./git.js')
const { localPath } = require('./checkout.js')
const { hostState, osKind, loadSamples } = require('./host.js')
const { pluginFacts, runnerBlockHash } = require('./plugin.js')
const { readOrNull, within } = require('./places.js')

const LOCK_PATH = '.mc17/wave.json'

/*  The lock file of the checkout at the working tree, base64, or null where none stands. */
function lockAtTree (ctx) {
  if (!ctx.checkout) return null
  const b = readOrNull(path.join(ctx.checkout.top, '.mc17', 'wave.json'))
  return b === null ? null : b.toString('base64')
}

/*  The up-front facts of a command, by the names of its contract entry (D8): `git`, `locks`, `plugin`, `processes`,
 *  `host.cores`, `host.load`, `host.os`, `host.samples` and `runnerBlockHash`. */
function upFront (ctx, names, argv) {
  const facts = {}
  const co = ctx.checkout
  for (const n of names) {
    if (n === 'git') facts.git = co ? { root: co.root, remote: co.remote, branch: co.branch, head: co.head, cwd: co.cwd } : null
    else if (n === 'locks') facts.locks = { [LOCK_PATH]: lockAtTree(ctx) }
    else if (n === 'plugin') facts.plugin = co ? pluginFacts(ctx.programs.git, co) : null
    else if (n === 'processes') facts.processes = require('./readings/processes.js').processEntries(ctx).entries
    else if (n === 'runnerBlockHash') { const h = runnerBlockHash(ctx.places.root); if (h !== null) facts.runnerBlockHash = h } else if (n === 'host.cores' || n === 'host.load') {
      if (!facts.host || facts.host.cores === undefined) { const s = (ctx.hostState || hostState)({}); facts.host = Object.assign(facts.host || {}, { cores: s.cores, load: s.load }) }
    } else if (n === 'host.os') facts.host = Object.assign(facts.host || {}, { os: osKind() })
    else if (n === 'host.samples') {
      const i = argv.indexOf('--seconds')
      const seconds = i >= 0 && /^\d+$/.test(String(argv[i + 1])) ? Number(argv[i + 1]) : 60
      facts.host = Object.assign(facts.host || {}, { samples: (ctx.loadSamples || loadSamples)(seconds, {}) })
    }
  }
  return facts
}

/*  The form of a remote path the client sends to a remote shell (the review of IP-MC-SERVER-002), which the contract's
 *  type remotePath states too: an absolute path of letters, digits, dot, dash, underscore and slash, with no . or ..
 *  part, so the remote shell reads no other word in it. The client holds a word to both. */
const REMOTE_PATH = /^\/[A-Za-z0-9._/-]{1,1000}$/

/*  The ssh host of the checkout's remote, lower-cased, as host and as user@host where its address names a user: the
 *  remote whose address facts.git.remote carries (origin, else the first remote), in the ssh:// form or the form
 *  [user@]host:path. The engine asks the ssh form only for the host it reads from facts.git.remote (contract ask 1), so
 *  the client reaches that host alone, and no host of another remote. Empty where the remote names no ssh host, or its
 *  address no longer reads as the one the command sent. */
function remoteHosts (ctx) {
  const out = new Set()
  if (!ctx.checkout || !ctx.checkout.remoteName) return out
  const { withoutUserInfo } = require('./checkout.js')
  const r = runGit(ctx.programs.git, ctx.checkout.top, ['remote', 'get-url', ctx.checkout.remoteName])
  const url = r.error || r.status !== 0 ? '' : String(r.stdout || '').trim()
  if (!url || withoutUserInfo(url) !== ctx.checkout.remote) return out
  let m = /^(?:ssh|git\+ssh|ssh\+git):\/\/(?:([^@/]+)@)?(\[[^\]]+\]|[^:/]+)/i.exec(url)
  if (!m && !/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(url) && !/^[A-Za-z]:[\\/]/.test(url)) m = /^(?:([^@/:]+)@)?([^:/]+):(?!\/\/)/.exec(url)
  if (!m) return out
  const host = m[2].toLowerCase()
  out.add(host)
  if (m[1]) out.add(m[1].replace(/:.*$/, '').toLowerCase() + '@' + host)
  return out
}

/*  The hooks a run of mc17 wave hooks sends where core.hooksPath already reads .mc17/hooks (contract ask 2): the engine
 *  sends the step set-hooks-path alone and writes no hook, and its release finds the folder core.hooksPath names only
 *  among the files the request carries, so a rerun sends each hook the contract's steps["set-hooks-path"].hooks names
 *  that stands there as a plain file, read byte for byte. Nothing where core.hooksPath reads anything else; a file there
 *  of another name stays on the computer. { [sent path]: { sha256, base64 } }. */
function standingHooks (ctx) {
  const out = {}
  if (!ctx.checkout) return out
  const r = runGit(ctx.programs.git, ctx.checkout.top, ['config', '--get', 'core.hooksPath'])
  if (r.error || r.status !== 0 || String(r.stdout).trim().split('\\').join('/').replace(/\/+$/, '') !== '.mc17/hooks') return out
  const crypto = require('node:crypto')
  for (const name of Object.keys(((ctx.contract.doc.steps || {})['set-hooks-path'] || {}).hooks || {})) {
    if (!/^[a-z][a-z-]*$/.test(name)) continue
    const sent = '.mc17/hooks/' + name
    const lp = localPath(ctx, sent, ctx.contract)
    if (lp.refused || lp.place !== 'checkout') continue
    let st = null
    try { st = fs.lstatSync(lp.absolute) } catch (_) { st = null }
    if (!st || !st.isFile()) continue
    const bytes = fs.readFileSync(lp.absolute)
    out[sent] = { sha256: crypto.createHash('sha256').update(bytes).digest('hex'), base64: bytes.toString('base64') }
  }
  return out
}

/*  The answer to one git item of a `facts` ask: { exit, stdout } for a form whose output carries names and states,
 *  { fetched, error } for the fetch, { lines } for the ssh form, or { refused }. */
function gitItem (ctx, item) {
  const built = formArgv(ctx.contract, item, ctx.checkout)
  if (built.refused) return { refused: built.refused }
  if (!ctx.checkout) return { refused: 'the command runs in no checkout, so no git form reads' }
  if (built.program === 'ssh') {
    if (!ctx.programs.ssh) return { refused: 'no ssh was kept at mc17 login, so the remote checkout cannot be read' }
    // The remote shell reads the words after the host as one command line, so the remote path is checked against
    // REMOTE_PATH and the contract's type and quoted, the host is the one of the checkout's remote, and ssh never asks
    // for a password.
    const args = item.args || {}
    const form = (ctx.contract.doc.gitForms || []).find((f) => f.form === item.form)
    const host = String(args.host || '')
    const remotePath = String(args.remotePath || '')
    const typed = (ctx.contract.doc.argumentTypes || {}).remotePath
    if (!REMOTE_PATH.test(remotePath) || (typeof typed === 'string' && !new RegExp(typed).test(remotePath)) || remotePath.split('/').some((p) => p === '.' || p === '..')) return { refused: 'the remote path ' + JSON.stringify(remotePath) + ' is no absolute path of letters, digits, dot, dash, underscore and slash alone, so the client sends it to no remote shell' }
    const hosts = remoteHosts(ctx)
    if (!hosts.has(host.toLowerCase())) return { refused: 'the host ' + JSON.stringify(host) + ' is not the ssh host of the checkout\'s remote, the one facts.git.remote names (' + ([...hosts].join(', ') || 'none') + '), so the client reaches no other host' }
    const argv = ['-o', 'BatchMode=yes'].concat(built.argv.map((w, i) => (form && form.argv[i] === '{remotePath}' ? '\'' + remotePath + '\'' : w)))
    const { spawnSync } = require('node:child_process')
    const r = spawnSync(ctx.programs.ssh, argv, { encoding: 'utf8', timeout: 30000, windowsHide: true })
    if (r.error) return { exit: null, lines: [], error: String(r.error.message || r.error).split('\n')[0] }
    return { exit: r.status, lines: String(r.stdout || '').split(/\r?\n/).map((l) => l.trim()).slice(0, 2), error: r.status === 0 ? null : String(r.stderr || '').trim().split('\n')[0].slice(0, 200) }
  }
  // Every path of the form reaches git as a literal path, never as a pattern or a magic word (N8).
  const r = runGit(ctx.programs.git, ctx.checkout.top, LITERAL.concat(built.argv))
  if (built.answer === 'fetched') return { fetched: !r.error && r.status === 0, error: !r.error && r.status === 0 ? null : (r.error || r.stderr.trim().split('\n')[0] || ('git exited ' + r.status)) }
  return { exit: r.error ? null : r.status, stdout: r.stdout }
}

/*  The answer to a `facts` ask (D8): one value per item of each list, in the order asked. */
function answerFacts (ctx, ask) {
  const out = { id: ask.id }
  const known = ['id', 'kind', 'git', 'files', 'locks', 'store', 'processes', 'host']
  for (const k of Object.keys(ask)) if (known.indexOf(k) < 0) out[k] = { refused: 'the facts ask names the kind ' + k + ', which stands outside the closed list of AC-12' }
  if (Array.isArray(ask.git)) out.git = ask.git.map((item) => gitItem(ctx, item))
  if (Array.isArray(ask.files)) {
    out.files = ask.files.map((p) => {
      const f = ctx.namedFiles[String(p)]
      return f ? { sha256: f.sha256, base64: f.base64 } : { refused: 'the file ' + JSON.stringify(p) + ' is no file the command\'s arguments name, and the client sends no other file' }
    })
  }
  if (Array.isArray(ask.locks)) {
    out.locks = ask.locks.map((ref) => {
      if (ref === 'worktree') return { base64: lockAtTree(ctx) }
      const built = formArgv(ctx.contract, { form: 'show-lock', args: { rev: String(ref) } }, ctx.checkout)
      if (built.refused) return { refused: built.refused }
      if (!ctx.checkout) return { refused: 'the command runs in no checkout' }
      const r = runGit(ctx.programs.git, ctx.checkout.top, LITERAL.concat(built.argv))
      return { base64: !r.error && r.status === 0 ? Buffer.from(r.stdout, 'utf8').toString('base64') : null }
    })
  }
  if (Array.isArray(ask.store)) {
    out.store = ask.store.map((sel) => {
      // A folder of the store, { list }, answered with the names of its entries, or null where it stands not (the
      // contract's storeItems): mc17 converge finds the one store of the computer by listing the store's root.
      if (sel && typeof sel === 'object' && typeof sel.list === 'string') {
        const lp = localPath(ctx, sel.list, ctx.contract)
        if (lp.refused) return { refused: lp.refused }
        if (lp.place !== 'converge store') return { refused: 'the store item ' + JSON.stringify(sel.list) + ' names no folder of the converge store' }
        let names = null
        try { if (fs.statSync(lp.absolute).isDirectory()) names = fs.readdirSync(lp.absolute).sort() } catch (_) { names = null }
        return { names }
      }
      const file = typeof sel === 'string' ? sel : (sel && sel.file)
      const lp = localPath(ctx, file, ctx.contract)
      if (lp.refused) return { refused: lp.refused }
      if (lp.place !== 'converge store') return { refused: 'the store item ' + JSON.stringify(file) + ' names no file of the converge store' }
      const b = readOrNull(lp.absolute)
      return { base64: b === null ? null : b.toString('base64') }
    })
  }
  if (Array.isArray(ask.processes)) {
    const allowed = ctx.contract.doc.patterns || []
    const bad = ask.processes.find((p) => allowed.indexOf(p) < 0)
    if (bad !== undefined) out.processes = ask.processes.map((p) => allowed.indexOf(p) < 0 ? { refused: 'the pattern ' + JSON.stringify(p) + ' stands in no entry of the contract\'s patterns' } : null)
    else {
      const read = require('./readings/processes.js').processEntries(ctx)
      out.processes = ask.processes.map((p) => read.ok ? { entries: read.entries.filter((e) => e.pattern === p || (p === 'drill' && /^drill:/.test(e.pattern))) } : { error: read.why })
    }
  }
  if (Array.isArray(ask.host)) {
    let sample = null
    out.host = ask.host.map((f) => {
      if (f === 'os') return { os: osKind() }
      if (f === 'cores' || f === 'load') { sample = sample || (ctx.hostState || hostState)({}); return f === 'cores' ? { cores: sample.cores } : { load: sample.load } }
      return { refused: 'the host fact ' + JSON.stringify(f) + ' stands outside the host facts of D32' }
    })
  }
  return out
}

/*  The refusal a `facts` answer carries, the first item answered { refused }, or null. */
function refusalIn (answer) {
  for (const [k, v] of Object.entries(answer)) {
    if (k === 'id') continue
    if (v && !Array.isArray(v) && v.refused) return v.refused
    if (Array.isArray(v)) for (const item of v) if (item && item.refused) return item.refused
  }
  return null
}

/*  The flags the release's parsing (engine/core/harness/mc17.js parseArgs) reads as taking no value. */
const NO_VALUE = ['--json', '--print', '--audit']

/*  The words of `args` from `skip` on that the release's parsing reads as a value, each { at, flag, inline }: the word
 *  after -f or --file always; the word after a --flag unless it opens with --; the part after = of --flag=value; and,
 *  with flag null, a word it leaves positional. */
function valueWords (args, skip) {
  const out = []
  for (let i = skip || 0; i < args.length; i += 1) {
    const a = String(args[i])
    if (NO_VALUE.indexOf(a) >= 0) continue
    if (a === '-f' || a === '--file') {
      if (i + 1 < args.length) { out.push({ at: i + 1, flag: a, inline: false }); i += 1 }
      continue
    }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=')
      if (eq > 0) { out.push({ at: i, flag: a.slice(0, eq), inline: true }); continue }
      if (i + 1 >= args.length || String(args[i + 1]).startsWith('--')) continue
      out.push({ at: i + 1, flag: a, inline: false })
      i += 1
      continue
    }
    out.push({ at: i, flag: null, inline: false })
  }
  return out
}

/*  The file table of the contract that reads the word of `flag` (null for a positional word): `files`, `dirs`, `lists`
 *  or `either` (the contract's fileArguments), or null where none does. */
function tableOf (entry, flag) {
  if (flag === null) return entry.positional === 'either' ? 'either' : null
  for (const t of ['files', 'dirs', 'lists', 'either']) if ((entry[t] || []).indexOf(flag) >= 0) return t
  return null
}

/*  What stands at `abs`: 'file', 'dir' or null. */
function standing (abs) {
  try { const s = fs.statSync(abs); return s.isFile() ? 'file' : s.isDirectory() ? 'dir' : null } catch (_) { return null }
}

/*  The work folder a `work` flag names, taken first, since the other paths are read against it. The engine writes into
 *  it, so it must stand, by its real form, in the checkout or in the client's temporary folder ~/.mc17/tmp, and nowhere
 *  else on the computer (the review of IP-MC-SERVER-002); throws, naming the word, otherwise. */
function takeWork (ctx, entry, args) {
  const { realOf } = require('./places.js')
  for (const f of entry.work || []) {
    const i = args.indexOf(f)
    if (i < 0 || args[i + 1] === undefined) continue
    const w = path.resolve(ctx.cwd, String(args[i + 1]))
    const real = realOf(w)
    const inside = (folder) => { const r = realOf(folder); return real !== null && r !== null && within(real, r) }
    if (!((ctx.checkout && inside(ctx.checkout.top)) || inside(ctx.places.temp))) throw new Error('the work folder ' + args[i + 1] + ' that ' + f + ' names stands outside the checkout and the client\'s temporary folder ~/.mc17/tmp, the two places a work folder may stand')
    ctx.work = w
  }
}

/*  The files the command's arguments name, read byte for byte (D8), by the file tables of its contract entry (the
 *  contract's fileArguments): { [sent path]: { sha256, base64 } }, with each word that sent a file or a folder rewritten
 *  to its sent path in `args`, and its index added to `done`. A word of `files` must name a file that can be read; a
 *  word of `either`, of each part of `lists`, or a positional word under `positional: "either"`, sends the file that
 *  stands at it and is sent as given otherwise; a word of `dirs` sends every file under the folder that stands at it, is
 *  read as an `either` word where a file stands there, and is sent as given otherwise. `skip` is the count of the
 *  command's own words. Throws, naming the word, where a file cannot be read or stands outside the four places. */
function namedFiles (ctx, entry, args, skip, done) {
  const crypto = require('node:crypto')
  const { sentPath } = require('./checkout.js')
  takeWork(ctx, entry, args)
  const files = {}
  const sendAt = (given, flag) => {
    const sent = sentPath(ctx, given, ctx.contract)
    if (sent.refused) throw new Error(sent.refused)
    return sent.sent
  }
  // The path is checked by its real form before any byte of it is read (N5): a link in a place that reaches outside it
  // is refused, and nothing it reaches is read.
  const sendFile = (given, flag) => {
    const to = sendAt(given, flag)
    let bytes
    try { bytes = fs.readFileSync(path.resolve(ctx.cwd, given)) } catch (e) { throw new Error('the file ' + given + ' that ' + (flag || 'the command') + ' names cannot be read: ' + String(e.message || e).split('\n')[0]) }
    files[to] = { sha256: crypto.createHash('sha256').update(bytes).digest('hex'), base64: bytes.toString('base64') }
    return to
  }
  const either = (given, flag) => (given !== '' && standing(path.resolve(ctx.cwd, given)) === 'file' ? sendFile(given, flag) : null)
  const sendDir = (given, flag) => {
    const to = sendAt(given, flag)
    // A link under the folder is no file and no folder of the walk, so it is passed over and nothing it reaches is read.
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) { if (e.name !== '.git') walk(p) } else if (e.isFile()) sendFile(p, flag)
      }
    }
    walk(path.resolve(ctx.cwd, given))
    return to
  }
  for (const w of valueWords(args, skip)) {
    const table = tableOf(entry, w.flag)
    if (!table) continue
    const word = String(args[w.at])
    const given = w.inline ? word.slice(word.indexOf('=') + 1) : word
    let to = null
    if (table === 'files') to = sendFile(given, w.flag)
    else if (table === 'either') to = either(given, w.flag)
    else if (table === 'lists') {
      const parts = given.split(',').map((p) => { const s = either(p, w.flag); return s === null ? p : s })
      if (parts.join(',') !== given) to = parts.join(',')
    } else if (table === 'dirs') {
      const at = standing(path.resolve(ctx.cwd, given))
      to = at === 'dir' ? sendDir(given, w.flag) : at === 'file' ? sendFile(given, w.flag) : null
    }
    if (to === null) continue
    args[w.at] = w.inline ? w.flag + '=' + to : to
    if (done) done.add(w.at)
  }
  // A --plain proof names its draft, which the engine reads and compares again; the client sends that draft beside the
  // proof, from the place its path names, so the engine can read it.
  const plainAt = args.indexOf('--plain')
  const sentProof = plainAt >= 0 ? files[String(args[plainAt + 1])] : undefined
  if (sentProof) {
    let draft = null
    try { draft = JSON.parse(Buffer.from(sentProof.base64, 'base64').toString('utf8')).draftFile } catch (e) { draft = null }
    if (typeof draft === 'string' && draft !== '' && !files[draft]) {
      const lp = localPath(ctx, draft, ctx.contract)
      if (!lp.refused) {
        try {
          const bytes = fs.readFileSync(lp.absolute)
          files[draft] = { sha256: crypto.createHash('sha256').update(bytes).digest('hex'), base64: bytes.toString('base64') }
        } catch (e) { /* the engine names the draft it cannot read */ }
      }
    }
  }
  return files
}

/*  The path arguments of a command rewritten to their sent form (D32), refusing a path outside the four places, past the
 *  words of `done`, which sent a file or a folder and stand rewritten already. */
function sentArguments (ctx, entry, args, done) {
  takeWork(ctx, entry, args)
  const flags = (entry.paths || []).concat(entry.work || [])
  for (let i = 0; i < args.length; i += 1) {
    if (flags.indexOf(args[i]) < 0 || args[i + 1] === undefined) continue
    if (!(done && done.has(i + 1))) {
      const sent = require('./checkout.js').sentPath(ctx, args[i + 1], ctx.contract)
      if (sent.refused) throw new Error(sent.refused)
      args[i + 1] = sent.sent
    }
    i += 1
  }
  return args
}

module.exports = { LOCK_PATH, REMOTE_PATH, remoteHosts, standingHooks, gitItem, upFront, answerFacts, refusalIn, namedFiles, sentArguments, within }

'use strict'
// The steps the client carries out (ARCH D10, D30, D31, D34; AC-13): the fixed set of the Interface Contracts and
// nothing else. A file step comes with the answer `done`; a git write comes as the ask `step` while the command runs.
// Each path is checked against the four places, each file is written through a file of another name renamed over it,
// and each step finds its work done on a second run and does nothing.

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { localPath } = require('./checkout.js')
const { runGit, LITERAL } = require('./git.js')
const { writeAtomic, readOrNull, within, realOf } = require('./places.js')

/*  The kinds of the fixed set that come with `done`, and the two that come only as the ask `step`. */
const FILE_STEPS = ['write-lock', 'write-file', 'restore-file', 'set-hooks-path', 'store-decision', 'write-brief', 'clear']
const GIT_STEPS = ['commit-wave', 'git-write']

class StepRefused extends Error {}

const refuse = (why) => { throw new StepRefused(why) }

/*  The local path of a step's path, refused unless it stands in one of `places` (all four where none is given). A write
 *  in the checkout is refused besides unless the command names it (namedWrite), with the drill's proofs file admitted
 *  where `proofs` is set. */
function placed (ctx, sent, places, what, proofs) {
  const lp = localPath(ctx, sent, ctx.contract)
  if (lp.refused) refuse('the step ' + what + ' names ' + lp.refused)
  if (places && places.indexOf(lp.place) < 0) refuse('the step ' + what + ' names the path ' + JSON.stringify(sent) + ' in the ' + lp.place + ', and this step writes only in the ' + places.join(' or the '))
  const unnamed = unnamedWrite(ctx, sent, lp, what, proofs)
  if (unnamed) refuse(unnamed)
  return lp.absolute
}

/*  The flags whose word names a path the command writes, as the command's own words carry it to the engine: the --out
 *  file or folder, the prefix of --save-suites, and the fingerprint file of --record-fingerprint (ARCH D30 step 3). */
const OUTPUT_FLAGS = ['--out', '--save-suites', '--record-fingerprint']
/*  The drill's proofs file, which step 5 writes back and git-write checkout-file restores after the drill (ARCH D30
 *  steps 4 and 5), at any folder of the checkout. */
const DRILL_PROOFS = /(^|\/)harness\/BREAK-PROOFS\.json$/
/*  The record of a write, {title}.written.json, which the engine writes in the command's own folder (ARCH D30 step 3). */
const WRITTEN_RECORD = /^[A-Za-z0-9._-]+\.written\.json$/

/*  The paths the command's own words name for a write, as the client sent them: [{ flag, sent }]. */
function outputsOf (ctx) {
  const args = Array.isArray(ctx.sentArgs) ? ctx.sentArgs : []
  const out = []
  for (let i = 0; i < args.length; i += 1) {
    if (OUTPUT_FLAGS.indexOf(String(args[i])) >= 0 && args[i + 1] !== undefined) { out.push({ flag: String(args[i]), sent: String(args[i + 1]) }); i += 1 }
  }
  return out
}

/*  The two files of the command's title the engine writes (the engine's checkout-writes.ts TITLE_FILES). */
const TITLE_FILES = ['.md', '.written.json']

/*  A checkout path in the one form the engine's rule compares (its checkout-writes.ts checkoutForm): POSIX, normalized,
 *  with no leading ./ and no closing slash, '.' for the top. */
function checkoutForm (p) {
  const s = path.posix.normalize(String(p === undefined || p === null ? '.' : p).split('\\').join('/')).replace(/^\.\//, '').replace(/\/+$/, '')
  return s === '' ? '.' : s
}

/*  The title the command's own words name with --title, as the client sent them: the value of the last `--title` word
 *  pair, or null where they name none or an empty one (the engine's namedTitle, word for word). */
function namedTitle (ctx) {
  const words = Array.isArray(ctx.sentArgs) ? ctx.sentArgs.map(String) : []
  let t = null
  for (let i = 0; i + 1 < words.length; i += 1) if (words[i] === '--title') t = words[i + 1]
  return t === null || t === '' ? null : t
}

/*  Whether the checkout path `sent`, as the engine sent it, is a file of the command's title (the final check of
 *  IP-MC-SERVER-002, item 1a, and the landing's follow-up of N4, the same rule as the engine's checkout-writes.ts
 *  unnamedWrite at devyonq-saas 55eca1e6): where the words name --title T, T.md or T.written.json in the command's folder
 *  (facts.git.cwd, the folder the client sent) or in the folder of each --out path the words name in the checkout. The
 *  paths are compared in the engine's checkout form, so the client admits what the engine sends and no other; the place
 *  of the path, its links and its real form are checked by localPath before. */
function titledWrite (ctx, sent) {
  const title = namedTitle(ctx)
  if (title === null) return false
  const q = checkoutForm(sent)
  const beside = outputsOf(ctx).filter((o) => o.flag === '--out' && !o.sent.startsWith('/')).map((o) => path.posix.dirname(checkoutForm(o.sent)))
  for (const d of [checkoutForm(ctx.checkout && ctx.checkout.cwd)].concat(beside)) {
    for (const ext of TITLE_FILES) if (q === checkoutForm(path.posix.join(d, title + ext))) return true
  }
  return false
}

const realOrSelf = (p) => realOf(p) || path.resolve(p)
const folded = (s) => (process.platform === 'win32' || process.platform === 'darwin' ? String(s).toLowerCase() : String(s))

/*  Why the engine may not write the checkout path `sent`, placed at `lp`, or null (ARCH D30 as written, "a file the
 *  command names"; the second review of IP-MC-SERVER-002, N4). In the checkout the client admits a write, a removal or a
 *  clear only under the checkout's .mc17 folder; at a path that a --out, --save-suites or --record-fingerprint of the
 *  command's own words names, as the client sent them, or under it, or for --save-suites a file whose name opens with
 *  the prefix and a dot; at the record {title}.written.json in the command's own folder; where the words name --title T,
 *  at T.md and T.written.json in that folder and beside each --out path (titledWrite); and, where `proofs` is set, at
 *  the drill's proofs file. Each path is compared by its real form, the title's files in the engine's checkout form. The
 *  work folder, the converge store and the
 *  temporary folder stand open by their places, so .claude/settings.json, package.json or any other file of the
 *  checkout the command does not name is refused. */
function unnamedWrite (ctx, sent, lp, what, proofs) {
  if (lp.place !== 'checkout' || !ctx.checkout) return null
  const real = realOrSelf(lp.absolute)
  if (within(real, path.join(realOrSelf(ctx.checkout.top), '.mc17'))) return null
  for (const o of outputsOf(ctx)) {
    const named = localPath(ctx, o.sent, ctx.contract)
    if (named.refused || named.place !== 'checkout') continue
    const at = realOrSelf(named.absolute)
    if (within(real, at)) return null
    if (o.flag === '--save-suites' && folded(path.dirname(real)) === folded(path.dirname(at)) && folded(path.basename(real)).startsWith(folded(path.basename(at)) + '.')) return null
  }
  if (WRITTEN_RECORD.test(path.basename(real)) && folded(path.dirname(real)) === folded(realOrSelf(ctx.cwd))) return null
  if (titledWrite(ctx, sent)) return null
  if (proofs && DRILL_PROOFS.test(String(sent))) return null
  return 'the step ' + what + ' writes ' + JSON.stringify(String(sent)) + ' in the checkout, which the command does not name: the engine writes in the checkout only under .mc17/, at a path the command\'s own words name with ' + OUTPUT_FLAGS.join(', ') + ', the record {title}.written.json in the command\'s folder, or, where the words name --title T, T.md and T.written.json in the command\'s folder and beside its --out path (ARCH D30)'
}

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex')

/*  The sha256 the contract names for each git hook (steps["set-hooks-path"].hooks), as bare hex by the hook's name. */
function hookDigests (ctx) {
  const named = ((ctx.contract.doc.steps || {})['set-hooks-path'] || {}).hooks || {}
  const out = {}
  for (const [k, v] of Object.entries(named)) out[k] = String(v).replace(/^sha256:/i, '').toLowerCase()
  return out
}

/*  The checkout's hooks folder, <top>/.mc17/hooks, where core.hooksPath points once set-hooks-path ran. */
const hooksDir = (ctx) => path.join(ctx.checkout.top, '.mc17', 'hooks')

/*  The path of `abs` below the checkout's hooks folder, by its words or by its real form, with / between its parts ('' for
 *  the folder itself), or null where it stands outside the folder. */
function underHooks (ctx, abs) {
  if (!ctx.checkout) return null
  const dir = hooksDir(ctx)
  for (const [a, d] of [[abs, dir], [realOf(abs), realOf(dir)]]) {
    if (a !== null && d !== null && within(a, d)) return path.relative(d, a).split(path.sep).join('/')
  }
  return null
}

/*  The guard of every write the engine asks for (the review of IP-MC-SERVER-002): git runs what stands in .mc17/hooks
 *  once core.hooksPath points there, so the step set-hooks-path alone writes there, each hook by the sha256 the contract
 *  names. A write there of other bytes, a removal and an append are refused, naming the step; a write of the very bytes
 *  of a hook the contract names is left to set-hooks-path and answers true, so the caller writes nothing. Answers false
 *  for a path outside the folder. `bytes` is null for a removal or an append. */
function hookWrite (ctx, abs, bytes, what) {
  const rel = underHooks(ctx, abs)
  if (rel === null) return false
  const want = hookDigests(ctx)[rel]
  if (bytes && want && sha256(bytes) === want) return true
  refuse('the step ' + what + ' writes .mc17/hooks/' + rel + (bytes ? ', bytes of sha256:' + sha256(bytes) + ',' : ' as a removal or an append,') + ' and git runs what stands in that folder: the step set-hooks-path alone installs the plugin\'s own hooks there, each by the sha256 the contract names (' + (Object.keys(hookDigests(ctx)).join(', ') || 'none') + ')')
}

/*  The checkout's hooks folder, checked just before a git write runs: every entry that stands there is a plain file that
 *  is one of the hooks the contract names and carries its sha256. Answers the folder, which the git write then names as
 *  core.hooksPath, so git runs hooks from that checked folder alone, whatever the checkout's configuration names. */
function checkedHooks (ctx, what) {
  const dir = hooksDir(ctx)
  const lp = localPath(ctx, '.mc17/hooks', ctx.contract)
  if (lp.refused) refuse('the step ' + what + ' runs git with the hooks of .mc17/hooks, and ' + lp.refused)
  const want = hookDigests(ctx)
  let names = []
  try { names = fs.readdirSync(dir) } catch (_) { names = [] }
  for (const n of names) {
    const f = path.join(dir, n)
    let st = null
    try { st = fs.lstatSync(f) } catch (_) { st = null }
    if (!st || !st.isFile()) refuse('the step ' + what + ' runs git with the hooks of .mc17/hooks, and .mc17/hooks/' + n + ' is no plain file; git ran nothing')
    if (!want[n]) refuse('the step ' + what + ' runs git with the hooks of .mc17/hooks, and .mc17/hooks/' + n + ' is none of the hooks the contract names (' + (Object.keys(want).join(', ') || 'none') + '); git ran nothing')
    const have = sha256(fs.readFileSync(f))
    if (have !== want[n]) refuse('the step ' + what + ' runs git with the hooks of .mc17/hooks, and .mc17/hooks/' + n + ' reads sha256:' + have + ' where the contract names sha256:' + want[n] + '; git ran nothing. Run mc17 wave hooks to put the plugin\'s own hooks back')
  }
  return dir
}

/*  The bytes a step writes at its path, or null for a removal. */
const bytesOrNull = (step) => (step.remove === true || typeof step.base64 !== 'string' ? null : Buffer.from(step.base64, 'base64'))

const bytesOf = (step, what) => {
  if (typeof step.base64 !== 'string') refuse('the step ' + what + ' carries no base64')
  return Buffer.from(step.base64, 'base64')
}

/*  Writes `bytes` at `file` unless the file already holds them: { changed }. */
function writeOnce (file, bytes) {
  const now = readOrNull(file)
  if (now !== null && now.equals(bytes)) return { changed: false }
  writeAtomic(file, bytes)
  return { changed: true }
}

/*  Removes `file` where it stands: { changed }. */
function removeOnce (file) {
  if (!fs.existsSync(file)) return { changed: false }
  fs.rmSync(file, { force: true })
  return { changed: true }
}

/*  Checks one step of an answer's `steps` before any runs: a known kind of the fixed set that comes with `done`, its
 *  paths in their places. Throws StepRefused naming it. */
function checkStep (ctx, step) {
  const kind = step && step.kind
  if (GIT_STEPS.indexOf(kind) >= 0) refuse('the step ' + kind + ' is a git write, which comes only as the ask step while the command runs, and the answer carried it among its steps')
  if (FILE_STEPS.indexOf(kind) < 0) refuse('the step ' + JSON.stringify(kind) + ' stands outside the fixed set of the contract, so the client carries out none of the steps')
  if (kind === 'write-lock') { if (step.path !== '.mc17/wave.json') refuse('the step write-lock names ' + JSON.stringify(step.path) + ', and a lock file stands at .mc17/wave.json'); hookWrite(ctx, placed(ctx, step.path, ['checkout'], kind), bytesOrNull(step), kind) }
  // The engine sends the drill's proofs file back as restore-file alone, and git-write checkout-file puts it back; never as
  // write-file, even where the words would admit one there (--out ., --out harness; devyonq-saas 55eca1e6, the landing's
  // follow-up of N4). So a write-file of it in the checkout is refused.
  if (kind === 'write-file' && !String(step.path).startsWith('/') && DRILL_PROOFS.test(checkoutForm(step.path))) refuse('the step write-file names the drill\'s proofs file ' + JSON.stringify(String(step.path)) + ', which the engine sends back as restore-file alone')
  if (kind === 'write-file' || kind === 'restore-file') hookWrite(ctx, placed(ctx, step.path, kind === 'write-file' ? ['checkout', 'work folder', 'temporary folder'] : ['checkout', 'work folder'], kind, kind === 'restore-file'), bytesOrNull(step), kind)
  if (kind === 'write-brief') hookWrite(ctx, placed(ctx, step.path, ['work folder'], kind), bytesOrNull(step), kind)
  if (kind === 'store-decision') for (const l of step.lines || []) hookWrite(ctx, placed(ctx, l && l.file, ['converge store'], kind), l && typeof l.whole === 'string' && l.remove !== true ? Buffer.from(l.whole, 'base64') : null, kind)
  if (kind === 'clear') {
    const what = (ctx.contract.doc.steps.clear || {}).what || ['registry', 'hand', 'clone-lock']
    if (what.indexOf(step.what) < 0) refuse('the step clear names ' + JSON.stringify(step.what) + ', which is none of ' + what.join(', '))
    hookWrite(ctx, placed(ctx, step.path, step.what === 'clone-lock' ? ['checkout'] : ['converge store'], kind), bytesOrNull(step), kind)
  }
}

/*  Carries out one file step, checked by checkStep first: answers the line the client prints for it. */
function fileStep (ctx, step) {
  checkStep(ctx, step)
  const kind = step.kind
  const left = ' (left to set-hooks-path, which installs the plugin\'s own copy)'
  if (kind === 'write-lock' || kind === 'write-brief' || kind === 'restore-file') {
    const file = placed(ctx, step.path, null, kind, kind === 'restore-file')
    if (hookWrite(ctx, file, bytesOf(step, kind), kind)) return kind + ' ' + step.path + left
    return kind + ' ' + step.path + (writeOnce(file, bytesOf(step, kind)).changed ? '' : ' (already so)')
  }
  if (kind === 'write-file') {
    const file = placed(ctx, step.path, null, kind, kind === 'restore-file')
    if (step.remove === true) { hookWrite(ctx, file, null, kind); return kind + ' ' + step.path + ' removed' + (removeOnce(file).changed ? '' : ' (already absent)') }
    if (hookWrite(ctx, file, bytesOf(step, kind), kind)) return kind + ' ' + step.path + left
    return kind + ' ' + step.path + (writeOnce(file, bytesOf(step, kind)).changed ? '' : ' (already so)')
  }
  if (kind === 'clear') {
    const file = placed(ctx, step.path, null, kind, kind === 'restore-file')
    hookWrite(ctx, file, bytesOrNull(step), kind)
    if (typeof step.base64 === 'string') return 'clear ' + step.what + ' ' + step.path + (writeOnce(file, bytesOf(step, kind)).changed ? '' : ' (already so)')
    return 'clear ' + step.what + ' ' + step.path + (removeOnce(file).changed ? '' : ' (already clear)')
  }
  if (kind === 'store-decision') {
    let changed = false
    for (const l of step.lines || []) {
      const file = placed(ctx, l.file, null, kind)
      hookWrite(ctx, file, typeof l.whole === 'string' && l.remove !== true ? Buffer.from(l.whole, 'base64') : null, kind)
      if (l.remove === true) changed = removeOnce(file).changed || changed
      else if (typeof l.whole === 'string') changed = writeOnce(file, Buffer.from(l.whole, 'base64')).changed || changed
      else if (typeof l.append === 'string') {
        const line = l.append.replace(/\n+$/, '')
        const now = (readOrNull(file) || Buffer.alloc(0)).toString('utf8')
        if (now.split('\n').indexOf(line) < 0) {
          fs.mkdirSync(path.dirname(file), { recursive: true })
          const fd = fs.openSync(file, 'a')
          try { fs.writeSync(fd, (now !== '' && !now.endsWith('\n') ? '\n' : '') + line + '\n'); fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
          changed = true
        }
      } else refuse('a line of the step store-decision names neither append, whole nor remove')
    }
    return 'store-decision ' + (step.decision && step.decision.decisionId ? step.decision.decisionId : '') + (changed ? '' : ' (already stored)')
  }
  if (kind === 'set-hooks-path') {
    if (!ctx.checkout) refuse('the step set-hooks-path needs a checkout')
    const src = path.join(ctx.places.root, 'hooks', 'git')
    const dir = hooksDir(ctx)
    // The step names the sha256 of the engine's copy of each hook (contract steps["set-hooks-path"].hooks): the client
    // installs its own copy only where its bytes carry that sha256, and sets core.hooksPath only once every hook does, so
    // the hooks the engine's release wrote in its command thread and the client's are the same bytes. mc17 wave hooks
    // sends this step alone, with no write-file of the hooks (contract ask 2); where core.hooksPath already reads
    // .mc17/hooks, the step finds the hooks and the path in place and changes nothing. A step with no hooks names the two.
    const named = step.hooks && typeof step.hooks === 'object' ? step.hooks : null
    if (named && !Object.keys(named).length) refuse('the step set-hooks-path names no hook')
    const names = named ? Object.keys(named) : ['pre-commit', 'pre-merge-commit']
    const own = {}
    for (const name of names) {
      if (!/^[a-z][a-z-]*$/.test(name)) refuse('the step set-hooks-path names the hook ' + JSON.stringify(name) + ', which is no git hook name')
      const bytes = readOrNull(path.join(src, name))
      if (bytes === null) refuse('the plugin holds no git hook ' + name + ' at ' + path.join(src, name))
      if (named) {
        const want = String(named[name]).replace(/^sha256:/i, '').toLowerCase()
        const have = require('node:crypto').createHash('sha256').update(bytes).digest('hex')
        if (want !== have) refuse('the step set-hooks-path names the hook ' + name + ' at sha256:' + want + ', and the plugin\'s copy at ' + path.join(src, name) + ' reads sha256:' + have + '; core.hooksPath is left as it stands. Update the plugin devyonq-mc')
      }
      own[name] = bytes
    }
    let changed = false
    // Each hook's path by the checkout's rules, so a link the AI made at .mc17/hooks carries no write out of the checkout.
    for (const name of names) placed(ctx, '.mc17/hooks/' + name, ['checkout'], kind)
    for (const name of names) {
      const bytes = own[name]
      if (writeOnce(path.join(dir, name), bytes).changed) changed = true
      try { fs.chmodSync(path.join(dir, name), 0o755) } catch (_) { /* a file system with no modes */ }
    }
    const now = runGit(ctx.programs.git, ctx.checkout.top, ['config', '--get', 'core.hooksPath'])
    if (now.stdout.trim() !== '.mc17/hooks') {
      const set = runGit(ctx.programs.git, ctx.checkout.top, ['config', 'core.hooksPath', '.mc17/hooks'])
      if (set.error || set.status !== 0) refuse('git config core.hooksPath .mc17/hooks failed: ' + (set.error || set.stderr.trim()))
      changed = true
    }
    return 'set-hooks-path .mc17/hooks' + (changed ? '' : ' (already so)')
  }
  refuse('the step ' + kind + ' has no carrying-out in this client')
}

/*  Carries out a git write that the ask `step` carries (D10, D31, D34): { exit, output } or { refused }. */
function gitStep (ctx, step) {
  try {
    const kind = step && step.kind
    if (GIT_STEPS.indexOf(kind) < 0) refuse('the ask step carries ' + JSON.stringify(kind) + ', and it carries only commit-wave and git-write')
    if (!ctx.checkout) refuse('the step ' + kind + ' needs a checkout')
    // Every path the engine names reaches git as a literal path, never as a pattern or a magic word (N8): a path such as
    // * or :(glob)** stages, commits or restores that one name alone.
    const git = (argv, env) => runGit(ctx.programs.git, ctx.checkout.top, LITERAL.concat(argv), env)
    // A git write that can run a hook runs with core.hooksPath set to the checkout's hooks folder, checked just before,
    // so git runs no hook from another folder the checkout's configuration names, and none the client has not checked.
    const hooked = (argv, env) => git(['-c', 'core.hooksPath=' + checkedHooks(ctx, kind + (step.form ? ' ' + step.form : ''))].concat(argv), env)
    const said = (r) => (r.stdout + r.stderr).trim()
    if (kind === 'commit-wave') {
      const paths = Array.isArray(step.paths) ? step.paths : []
      if (!paths.length) refuse('the step commit-wave names no path')
      for (const p of paths) {
        if (!p || typeof p !== 'object') refuse('the step commit-wave names a path that is no object')
        if (['add', 'remove'].indexOf(p.change) < 0) refuse('the step commit-wave names the change ' + JSON.stringify(p.change))
        if (p.base64 !== undefined && typeof p.base64 !== 'string') refuse('the step commit-wave carries a base64 of ' + JSON.stringify(p.path) + ' that is no string')
        const abs = placed(ctx, p.path, ['checkout'], kind)
        // A hook under .mc17/hooks is committed only as the bytes set-hooks-path installed, which stand there already.
        if (underHooks(ctx, abs) !== null) {
          const bytes = p.change === 'add' ? (typeof p.base64 === 'string' ? Buffer.from(p.base64, 'base64') : readOrNull(abs)) : null
          hookWrite(ctx, abs, bytes, kind)
          const there = readOrNull(abs)
          if (there === null || !there.equals(bytes)) refuse('the step commit-wave commits .mc17/hooks/' + underHooks(ctx, abs) + ', and the plugin\'s own copy does not stand there yet; run mc17 wave hooks first')
        }
      }
      if (typeof step.message !== 'string' || !step.message) refuse('the step commit-wave carries no message')
      if (typeof step.token !== 'string' || !/^[0-9a-f]{64}$/.test(step.token)) refuse('the step commit-wave carries no wave token of 64 hex')
      checkedHooks(ctx, kind)
      for (const p of paths) {
        // An added path carries the bytes the call wrote there (the contract's pathFields), since a file the engine writes
        // reaches the computer only with done: they stand at the path, through a renamed file, before git add reads it.
        const abs = placed(ctx, p.path, ['checkout'], kind)
        if (p.change === 'add' && typeof p.base64 === 'string' && underHooks(ctx, abs) === null) writeOnce(abs, Buffer.from(p.base64, 'base64'))
        const r = p.change === 'add' ? git(['add', '--', p.path]) : git(['rm', '--cached', '--quiet', '--ignore-unmatch', '--', p.path])
        if (r.error || r.status !== 0) return { exit: r.status === null ? 1 : r.status, output: said(r) }
      }
      // A second run finds the paths committed already: nothing staged for them and nothing to commit.
      const staged = git(['diff', '--cached', '--quiet', '--'].concat(paths.map((p) => p.path)))
      if (staged.status === 0) return { exit: 0, output: 'commit-wave: the commit already holds ' + paths.map((p) => p.path).join(', ') }
      // The commit holds the named paths as they stand staged, and nothing else of the index, so work staged beside them
      // stays staged (finding 43b of the DVQ-018 Copilot run). `git commit -- <paths>` takes each path from the working
      // tree, and mc17 wave unlock stages the removal of .mc17/wave.json with git rm --cached while the lock file still
      // stands in the working tree, since the engine removes it only with the done that follows: git then found nothing to
      // commit and left the removal staged, on Windows and on Linux alike. So the commit is made from an index of its own,
      // HEAD with the named paths staged as above; the checkout's index already holds the same changes.
      const idx = git(['rev-parse', '--git-path', 'mc17-commit-wave.index'])
      if (idx.error || idx.status !== 0) return { exit: idx.status === null ? 1 : idx.status, output: said(idx) }
      const index = path.resolve(ctx.checkout.top, idx.stdout.trim())
      const own = { GIT_INDEX_FILE: index }
      try {
        const head = git(['rev-parse', '--verify', '--quiet', 'HEAD'])
        const read = git(head.status === 0 ? ['read-tree', 'HEAD'] : ['read-tree', '--empty'], own)
        if (read.error || read.status !== 0) return { exit: read.status === null ? 1 : read.status, output: said(read) }
        for (const p of paths) {
          const r = p.change === 'add' ? git(['add', '--', p.path], own) : git(['rm', '--cached', '--quiet', '--ignore-unmatch', '--', p.path], own)
          if (r.error || r.status !== 0) return { exit: r.status === null ? 1 : r.status, output: said(r) }
        }
        // The token stands in this one commit's environment and nowhere else (D34).
        const c = hooked(['commit', '--quiet', '-m', step.message], Object.assign({ MC17_WAVE_TOKEN: step.token }, own))
        return { exit: c.error ? 1 : c.status, output: said(c) }
      } finally {
        fs.rmSync(index, { force: true })
      }
    }
    const forms = (ctx.contract.doc.steps['git-write'] || {}).forms || ['worktree-add', 'worktree-remove', 'checkout-file']
    if (forms.indexOf(step.form) < 0) refuse('the step git-write names the form ' + JSON.stringify(step.form) + ', which stands outside the fixed list ' + forms.join(', '))
    if (step.form === 'worktree-add' || step.form === 'worktree-remove') {
      const dir = placed(ctx, step.path, ['temporary folder'], 'git-write ' + step.form)
      if (step.form === 'worktree-add') {
        if (typeof step.commit !== 'string' || !/^[0-9a-f]{7,64}$/.test(step.commit)) refuse('the step git-write worktree-add names no commit')
        if (fs.existsSync(path.join(dir, '.git'))) {
          const at = runGit(ctx.programs.git, dir, ['rev-parse', 'HEAD'])
          if (at.status === 0 && at.stdout.trim().startsWith(step.commit)) return { exit: 0, output: 'the worktree already stands at ' + step.commit }
        }
        fs.mkdirSync(path.dirname(dir), { recursive: true })
        const r = hooked(['worktree', 'add', '--detach', dir, step.commit])
        return { exit: r.error ? 1 : r.status, output: said(r), path: dir }
      }
      git(['worktree', 'prune'])
      if (!fs.existsSync(dir)) return { exit: 0, output: 'the worktree stands no longer' }
      const r = hooked(['worktree', 'remove', '--force', dir])
      return { exit: r.error ? 1 : r.status, output: said(r) }
    }
    hookWrite(ctx, placed(ctx, step.path, ['checkout'], 'git-write checkout-file', true), null, 'git-write checkout-file')
    // The commit stands before -- in git's words, where a word opening with a dash reads as an option: it must read as
    // the contract's type rev, which no dash opens (the review of IP-MC-SERVER-002).
    const rev = (ctx.contract.doc.argumentTypes || {}).rev || '^(?!-)[A-Za-z0-9._/@{}^~+-]{1,200}$'
    if (step.commit !== undefined && step.commit !== null && (typeof step.commit !== 'string' || !new RegExp(rev).test(step.commit) || step.commit.startsWith('-'))) refuse('the step git-write checkout-file names the commit ' + JSON.stringify(step.commit) + ', which does not read as the contract\'s type rev')
    const r = step.commit ? hooked(['checkout', step.commit, '--', step.path]) : hooked(['checkout', '--', step.path])
    return { exit: r.error ? 1 : r.status, output: said(r) }
  } catch (e) {
    if (e instanceof StepRefused) return { refused: e.message }
    throw e
  }
}

module.exports = { FILE_STEPS, GIT_STEPS, StepRefused, checkStep, fileStep, gitStep }

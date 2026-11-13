'use strict'
// The suite-change reading (ARCH D24; record 49, F-4): it compares each test file of a suite between a base and a head, by
// their diff and their text at both commits, on the computer, and the client sends only its result, changes and moves
// by file, check and count. Every function the release's suiteChangesAcross reaches is taken from the release with no
// change to its logic; the one change is the program pairedLines runs, git at the path the client kept at login.

const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { proseLines } = require('./prose.js')

/*  The git the reading runs, set by the client to its kept path before a reading. */
const GIT = { bin: 'git' }
function setGit (bin) { GIT.bin = bin || 'git' }

/*  A check's name from a suite's ok or FAIL line, with the detail after ` :: ` or a `: wanted X, got Y` tail
 *  cut, so a failing check and a passing one read under one name. */
function suiteCheckName (line) {
  // A trailing carriage return is dropped first, since a Python suite on Windows writes CRLF line ends.
  let s = String(line).replace(/\r$/, '').replace(/^(?:ok|FAIL) +/, '')
  const sep = s.indexOf(' :: ')
  if (sep >= 0) s = s.slice(0, sep)
  return s.replace(/: wanted \S+, got \S+.*$/, '').trim()
}

/*  A check declaration: its indentation, the quote it opens with and the name, with or without an `await` before
 *  it, since a suite that awaits its checks writes `await checkAsync('name'`. One pattern, read by the reader that
 *  names the check a line stands in and by the reader that finds the line a check opens on. */
const CHECK_DECL = /^(\s*)(?:await\s+)?check(?:Async)?\((['"`])((?:\\.|(?!\2)[^\\])*)\2/

/*  The name of the check a line of a suite stands in: the nearest `check('name', ...)` declaration above it,
 *  unless a line closing that declaration stands between them. Returns null where no declaration names the
 *  line or the name is built from a template. */
function enclosingCheck (headLines, line) {
  // A declaration is read at any indentation and with or without an `await` before it, since a suite that awaits
  // its checks writes `await checkAsync('name'`; a `})` closer at the declaration's own indentation, standing
  // between it and the line, means the check closed above the line.
  const closed = []
  for (let i = Math.min(line, headLines.length) - 1; i >= 0; i -= 1) {
    const l = headLines[i]
    const m = CHECK_DECL.exec(l)
    if (m) {
      if (closed.indexOf(m[1].length) >= 0) return null
      return m[2] === '`' && m[3].indexOf('${') >= 0 ? null : m[3].replace(/\\(.)/g, '$1')
    }
    const c = /^(\s*)\}\)/.exec(l)
    if (c && i < line - 1) closed.push(c[1].length)
  }
  return null
}

function suiteChanges (diff, baseText, headText, file) {
  const base = String(baseText || '').split(/\r?\n/)
  const head = headText === undefined ? null : String(headText).split(/\r?\n/)
  // A hunk that changes only comment or docstring lines changes no check and is skipped. With no file named
  // the kind of suite is unknown, and every hunk is read as a change.
  const skipProse = head !== null && Boolean(file)
  const baseProse = skipProse ? proseLines(baseText, file) : null
  const headProse = skipProse ? proseLines(headText, file) : null
  const prose = (set, text, from, count) => {
    for (let k = from; k < from + count; k += 1) if (!set.has(k) && String(text[k - 1] || '').trim() !== '') return false
    return true
  }
  const named = (b) => head ? enclosingCheck(head, Math.max(1, b)) : null
  const out = []
  const lines = String(diff || '').split(/\r?\n/)
  for (let i = 0; i < lines.length; i += 1) {
    const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(lines[i])
    if (!m) continue
    const a = Number(m[1])
    const removed = m[2] === undefined ? 1 : Number(m[2])
    const inserted = m[4] === undefined ? 1 : Number(m[4])
    const b = Number(m[3])
    if (skipProse && prose(baseProse, base, a, removed) && prose(headProse, head, b, inserted)) continue
    // The assert lines the hunk takes out and puts in: a hunk that takes out more than it puts in fails,
    // however red the check reads.
    let lost = 0
    let added = 0
    for (let j = i + 1; j < lines.length && !/^@@ |^diff --git /.test(lines[j]); j += 1) {
      if (/^-(?!--)/.test(lines[j]) && /\bassert\b/.test(lines[j])) lost += 1
      if (/^\+(?!\+\+)/.test(lines[j]) && /\bassert\b/.test(lines[j])) added += 1
    }
    if (removed > 0) { out.push({ where: 'base lines ' + a + '-' + (a + removed - 1), name: named(b), assertionsRemoved: lost, assertionsAdded: added, why: removed + ' line(s) standing at the base are changed or removed, so a check there changed and no name reads it' }); continue }
    const before = a > 0 ? (base[a - 1] || '') : ''
    const after = base[a] === undefined ? '' : base[a]
    const openBefore = before.trim() !== '' && (/^\s/.test(before) || /(?:[{(\[,\\+]|=>)\s*$/.test(before))
    const openAfter = after.trim() !== '' && (/^\s/.test(after) || /^[)}\].+]/.test(after))
    if (openBefore || openAfter) out.push({ where: 'after base line ' + a, name: named(b), assertionsRemoved: lost, assertionsAdded: added, why: inserted + ' line(s) inserted inside a statement standing at the base, so a check there changed and no name reads it' })
  }
  return out
}

/*  Whether a line does nothing but load a part of the suite whose entry file is `entryFile`: one require of a part,
 *  and around it nothing but `await`, one call of what was loaded with plain names as its arguments, and a `const`
 *  or `let` that gives names to what the part hands back. */
function loadsPart (line, entryFile) {
  const stem = path.basename(String(entryFile)).replace(/\.js$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const names = '(?:\\{[\\w$,:\\s]*\\}|[A-Za-z_$][\\w$]*)'
  return new RegExp('^(?:(?:const|let)\\s+' + names + '\\s*=\\s*)?(?:await\\s+)?require\\(\'\\./' + stem + '/[A-Za-z0-9._-]+\\.js\'\\)(?:\\([\\w$,\\s]*\\))?;?$').test(String(line).trim())
}

/*  The pairs of equal lines two lists share, in their order, as [index in `a`, index in `b`]. git compares the two
 *  lists as two files of a scratch folder, so the pairing keeps the order of both. Returns none where git fails. */
function pairedLines (a, b) {
  if (a.length === 0 || b.length === 0) return []
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc17-moves-'))
  try {
    fs.writeFileSync(path.join(dir, 'a'), a.map((l) => l + '\n').join(''))
    fs.writeFileSync(path.join(dir, 'b'), b.map((l) => l + '\n').join(''))
    const r = require('child_process').spawnSync(GIT.bin, ['diff', '--no-index', '--no-color', '--no-ext-diff', '-U0', '--', 'a', 'b'], { cwd: dir, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
    if (r.status !== 0 && r.status !== 1) return []
    const pairs = []
    let i = 0
    let j = 0
    const hunks = String(r.stdout || '').split(/\r?\n/).map((l) => /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(l)).filter(Boolean)
    for (const m of hunks) {
      const out = m[2] === undefined ? 1 : Number(m[2])
      const put = m[4] === undefined ? 1 : Number(m[4])
      const upTo = out === 0 ? Number(m[1]) : Number(m[1]) - 1
      while (i < upTo) { pairs.push([i, j]); i += 1; j += 1 }
      i += out
      j += put
    }
    while (i < a.length && j < b.length) { pairs.push([i, j]); i += 1; j += 1 }
    return pairs
  } finally {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
}

/*  Every file of a suite with its difference between two commits, in the form suiteChangesAcross reads: the entry
 *  file `file` first, then the parts it loads at the base, then the parts it loads at the head alone. `git` runs
 *  git in the repository and returns what it printed. A file that stands at one commit alone reads as empty at
 *  the other. git compares by the patience algorithm, which keeps a line that stands once in both texts in its place,
 *  so the line that opens a function reads as unchanged where its body left and new lines stand above it. */
function suiteDiffs (git, base, sha, file, headFile) {
  const show = (at, f) => { try { return git(['show', at + ':' + f]) } catch (_) { return '' } }
  const diffArgs = ['diff', '--no-color', '--no-ext-diff', '--diff-algorithm=patience', '-U0']
  if (headFile === undefined || headFile === file) {
    const files = suiteFiles(file, (f) => show(base, f))
    for (const f of suiteFiles(file, (f) => show(sha, f))) if (files.indexOf(f) < 0) files.push(f)
    return files.map((f) => ({ file: f, diff: git(diffArgs.concat([base, sha, '--', f])), base: show(base, f), head: show(sha, f) }))
  }
  // The suite stands at one path at the base and at another at the head: each file is paired by its path under the entry
  // file's folder, and a file both sides hold is compared blob to blob.
  const dirOf = (f) => String(f).replace(/[^\\/]*$/, '')
  const under = (entry, list) => list.map((f) => f.slice(dirOf(entry).length))
  const rels = under(file, suiteFiles(file, (f) => show(base, f)))
  for (const r of under(headFile, suiteFiles(headFile, (f) => show(sha, f)))) if (rels.indexOf(r) < 0) rels.push(r)
  return rels.map((r) => {
    const fb = dirOf(file) + r
    const fh = dirOf(headFile) + r
    const b = show(base, fb)
    const h = show(sha, fh)
    const diff = b !== '' && h !== '' ? git(diffArgs.concat([base + ':' + fb, sha + ':' + fh])) : git(diffArgs.concat(['-M', base, sha, '--', fb, fh]))
    return { file: fh, diff, base: b, head: h }
  })
}

/*  The changes of a suite read over all its files together. `files` is the entry file first and then its parts,
 *  each as { file, diff, base, head }: the file's -U0 difference and its text at the base and at the head. A run of
 *  at least three lines, blank lines not counted, that a wave took out of one file and put into another reads as
 *  moved and is no change; `moves` names each pair of files with its number of lines. A line taken out of a moved
 *  check reads as a change to the check that held it at the base. A line put inside a statement is no change where
 *  it does nothing but load a part. Every other hunk reads as suiteChanges reads it. Returns { changes, moves }. */
function suiteChangesAcross (files) {
  const list = (files || []).map((f) => {
    const base = String(f.base || '').split(/\r?\n/)
    const head = String(f.head || '').split(/\r?\n/)
    const prose = (text, set, from, count) => { for (let k = from; k < from + count; k += 1) if (!set.has(k) && String(text[k - 1] || '').trim() !== '') return false; return true }
    const baseProse = proseLines(f.base || '', f.file)
    const headProse = proseLines(f.head || '', f.file)
    const hunks = []
    const lines = String(f.diff || '').split(/\r?\n/)
    for (let i = 0; i < lines.length; i += 1) {
      const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(lines[i])
      if (!m) continue
      const a = Number(m[1])
      const removed = m[2] === undefined ? 1 : Number(m[2])
      const b = Number(m[3])
      const inserted = m[4] === undefined ? 1 : Number(m[4])
      if (prose(base, baseProse, a, removed) && prose(head, headProse, b, inserted)) continue
      const out = []
      const put = []
      for (let k = 0; k < removed; k += 1) out.push({ line: a + k, text: String(base[a + k - 1] || ''), moved: false })
      for (let k = 0; k < inserted; k += 1) put.push({ line: b + k, text: String(head[b + k - 1] || ''), moved: false })
      hunks.push({ a, removed, b, inserted, out, put })
    }
    return { file: f.file, base, head, hunks, src: f }
  })
  // The lines taken out of any file and the lines put into any file, blank lines left out, each in the files' order.
  const taken = []
  const given = []
  for (const f of list) for (const h of f.hunks) {
    for (const x of h.out) if (x.text.trim() !== '') taken.push({ f, x })
    for (const x of h.put) if (x.text.trim() !== '') given.push({ f, x })
  }
  const pairs = pairedLines(taken.map((t) => t.x.text), given.map((g) => g.x.text))
  // A line moved where the test that holds it at the head is the test that held it at the base, or where no test held it and
  // none holds it. A line that left its test for another place was taken out of that test, wherever it stands now.
  const sameTest = (p) => enclosingCheck(taken[p[0]].f.base, taken[p[0]].x.line) === enclosingCheck(given[p[1]].f.head, given[p[1]].x.line)
  const moves = []
  let run = []
  const close = () => {
    if (run.length >= 3) {
      const from = taken[run[0][0]].f.file
      const to = given[run[0][1]].f.file
      for (const [i, j] of run) { taken[i].x.moved = true; given[j].x.moved = true }
      const row = moves.find((m) => m.from === from && m.to === to)
      if (row) row.lines += run.length
      else moves.push({ from, to, lines: run.length })
    }
    run = []
  }
  for (const p of pairs) {
    const last = run[run.length - 1]
    const follows = last && p[0] === last[0] + 1 && p[1] === last[1] + 1 && taken[p[0]].f === taken[last[0]].f && given[p[1]].f === given[last[1]].f
    if (!follows) close()
    if (taken[p[0]].f !== given[p[1]].f && sameTest(p)) run.push(p)
  }
  close()
  const changes = []
  const entry = list.length ? list[0].file : ''
  // The checks a row already names, because a line of theirs was taken out.
  const named = new Set()
  // The assertions each check gained: the lines put into any file that moved from nowhere, by the check around them.
  const gained = new Map()
  for (const f of list) for (const h of f.hunks) for (const x of h.put) {
    if (x.moved || !/\bassert\b/.test(x.text)) continue
    const n = enclosingCheck(f.head, x.line)
    gained.set(n, (gained.get(n) || 0) + 1)
  }
  for (const f of list) {
    const where = list.length === 1 ? '' : f.file + ', '
    // The head lines of this file that moved in, its comment lines, and the line each check opens on.
    f.movedIn = new Set()
    for (const h of f.hunks) for (const x of h.put) if (x.moved) f.movedIn.add(x.line)
    f.prose = proseLines(f.src.head || '', f.file)
    f.opens = new Map()
    f.head.forEach((l, i) => { const n = CHECK_DECL.test(l) ? enclosingCheck(f.head, i + 1) : null; if (n !== null && !f.opens.has(n)) f.opens.set(n, i + 1) })
    // A file no line moved out of or into, and that gained no line loading a part, reads as suiteChanges reads it.
    if (!f.hunks.some((h) => h.out.some((x) => x.moved) || h.put.some((x) => x.moved || loadsPart(x.text, entry)))) {
      for (const c of suiteChanges(f.src.diff, f.src.base, f.src.head, f.file)) changes.push(Object.assign({}, c, { where: where + c.where }))
      continue
    }
    for (const h of f.hunks) {
      const gone = h.out.filter((x) => !x.moved && x.text.trim() !== '')
      const left = h.out.some((x) => x.moved)
      // A line that loads a part changes no check where it stands in the entry file, outside every check.
      const came = h.put.filter((x) => x.text.trim() !== '' && !(f === list[0] && loadsPart(x.text, entry) && !heldByCheck(f.head, x.line)))
      // A part that loads a file hands the command a file it does not read.
      for (const x of h.put) if (f !== list[0] && loadsPart(x.text, entry)) changes.push({ where: where + 'head line ' + x.line, name: null, assertionsRemoved: 0, assertionsAdded: 0, why: 'a part loads a file, which this reader does not read, so a check may stand where no name reads it' })
      const lost = gone.filter((x) => /\bassert\b/.test(x.text)).length
      const added = h.put.filter((x) => !x.moved && /\bassert\b/.test(x.text)).length
      if (gone.length > 0 && !left) {
        changes.push({ where: where + 'base lines ' + h.a + '-' + (h.a + h.removed - 1), name: enclosingCheck(f.head, Math.max(1, h.b)), assertionsRemoved: lost, assertionsAdded: added, why: gone.length + ' line(s) standing at the base are changed or removed, so a check there changed and no name reads it' })
        continue
      }
      if (gone.length > 0) {
        // Lines moved out of this hunk, so it may span many checks: each line taken out is named by the check that held it
        // at the base, one row a check, with the assertions that check gained wherever it stands now.
        const held = new Map()
        for (const x of gone) { const n = enclosingCheck(f.base, x.line); if (!held.has(n)) held.set(n, []); held.get(n).push(x) }
        for (const [name, xs] of held) {
          named.add(name)
          changes.push({ where: where + 'base lines ' + xs[0].line + '-' + xs[xs.length - 1].line, name, assertionsRemoved: xs.filter((x) => /\bassert\b/.test(x.text)).length, assertionsAdded: name === null ? 0 : (gained.get(name) || 0), why: xs.length + ' line(s) standing at the base are changed or removed, so a check there changed and no name reads it' })
        }
        continue
      }
      if (came.length === 0) continue
      // A line put into a check whose opening line moved in stands inside a statement that moved: it is a change to that check.
      const into = new Map()
      for (const x of came) {
        if (x.moved || f.prose.has(x.line)) continue
        const n = enclosingCheck(f.head, x.line)
        if (n === null || named.has(n) || !f.movedIn.has(f.opens.get(n))) continue
        if (!into.has(n)) into.set(n, [])
        into.get(n).push(x)
      }
      for (const [name, xs] of into) changes.push({ where: where + 'head lines ' + xs[0].line + '-' + xs[xs.length - 1].line, name, assertionsRemoved: 0, assertionsAdded: xs.filter((x) => /\bassert\b/.test(x.text)).length, why: xs.length + ' line(s) inserted inside a statement that moved, so a check there changed and no name reads it' })
      const at = h.removed === 0 ? h.a : h.a - 1
      const before = at > 0 ? (f.base[at - 1] || '') : ''
      const after = f.base[at + h.removed] === undefined ? '' : f.base[at + h.removed]
      const openBefore = before.trim() !== '' && (/^\s/.test(before) || /(?:[{(\[,\\+]|=>)\s*$/.test(before))
      const openAfter = after.trim() !== '' && (/^\s/.test(after) || /^[)}\].+]/.test(after))
      if (openBefore || openAfter) changes.push({ where: where + 'after base line ' + at, name: enclosingCheck(f.head, Math.max(1, h.b)), assertionsRemoved: 0, assertionsAdded: added, why: came.length + ' line(s) inserted inside a statement standing at the base, so a check there changed and no name reads it' })
    }
  }
  return { changes, moves }
}

/*  Whether line number `line` of `lines` stands inside a check: a check's declaration stands above it, no line closes that
 *  declaration between the two, and the line is indented deeper than the declaration. The declaration is read through
 *  CHECK_DECL, so a check written `await checkAsync('name'` holds its lines as one written `check('name'` does. */
function heldByCheck (lines, line) {
  if (enclosingCheck(lines, line) === null) return false
  const own = /^(\s*)/.exec(String(lines[line - 1] || ''))[1].length
  for (let i = line - 2; i >= 0; i -= 1) {
    const m = CHECK_DECL.exec(lines[i])
    if (m) return own > m[1].length
  }
  return false
}

/*  The parts an entry file loads, in the order its lines name them. A part is loaded by a line that does nothing
 *  but load it, the shape loadsPart accepts: `require('./<folder>/<part>.js')`, where the folder carries the entry
 *  file's name without `.js`. A comment loads nothing, and neither does a require written inside a string or a line
 *  that stands inside a check. Returns
 *  each part once, as a path beside the entry file. A file that loads no part returns none. */
function partsOf (entryFile, entryText) {
  const stem = path.basename(String(entryFile)).replace(/\.js$/, '')
  const out = []
  const lines = String(entryText || '').split(/\r?\n/)
  lines.forEach((line, i) => {
    if (!loadsPart(line, entryFile) || heldByCheck(lines, i + 1)) return
    const m = /require\('\.\/[^/']+\/([A-Za-z0-9._-]+\.js)'\)/.exec(line)
    if (m && out.indexOf(stem + '/' + m[1]) < 0) out.push(stem + '/' + m[1])
  })
  return out
}

/*  An entry file with the parts it loads, as paths in the form the entry file's own path has. `read` takes a path
 *  and returns that file's text. An entry file that cannot be read answers itself alone. */
function suiteFiles (entryPath, read) {
  let text = ''
  try { text = read(entryPath) } catch (_) { return [entryPath] }
  const dir = String(entryPath).replace(/[^\\/]*$/, '')
  return [entryPath].concat(partsOf(entryPath, text).map((rel) => dir + rel))
}

module.exports = { CHECK_DECL, setGit, suiteCheckName, enclosingCheck, suiteChanges, loadsPart, pairedLines, suiteDiffs, suiteChangesAcross, heldByCheck, partsOf, suiteFiles }

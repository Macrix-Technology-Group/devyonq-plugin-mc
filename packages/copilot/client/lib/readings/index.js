'use strict'
// The client-side readings (ARCH D24, D31, D33; AC-12): the asks `suite-changes` and `reading`. Each runs on the
// person's checkout, whose plugin is the one under test, through git at the path kept at login, and answers the readers'
// results alone: changes and moves by file, check and count; paths and versions; the map of each changed file to its
// test program; the version and figures of a base. No file text and no diff leaves the computer.

const { gitReader, runGit } = require('../git.js')
const { checkoutPath } = require('../checkout.js')
const { setGit, suiteDiffs, suiteChangesAcross } = require('./suite-changes.js')
const { layoutReader } = require('./layout.js')
const { narrowKinds } = require('./narrow.js')
const { baseFigures } = require('./figures.js')

/*  Whether `v` reads as a commit or ref of the contract's type. */
function isRev (ctx, v) {
  const t = (ctx.contract.doc.argumentTypes || {}).rev
  return typeof v === 'string' && Boolean(t) && new RegExp(t).test(v)
}

/*  A checkout path the engine names, '' or '.' for the top: the path, or throws naming it. */
function relOrTop (ctx, v, what) {
  if (v === '' || v === '.' || v === undefined || v === null) return ''
  const p = checkoutPath(ctx.checkout, String(v).replace(/\/+$/, ''))
  if (p.refused) throw new Error('the ' + what + ' ' + JSON.stringify(v) + ': ' + p.refused)
  return p.relative
}

/*  The answer to the ask `reading` (D31): { result } of the reader it names, or { refused }. */
function answerReading (ctx, ask) {
  try {
    if (!ctx.checkout) return { refused: 'the reading needs a checkout, and the command runs in none' }
    const a = ask.args && typeof ask.args === 'object' ? ask.args : {}
    const top = ctx.checkout.top
    if (ask.reader === 'layout') {
      const git = gitReader(ctx.programs.git, top)
      const reader = layoutReader(git, relOrTop(ctx, a.before, 'folder before the move') || '.')
      const results = (Array.isArray(a.calls) ? a.calls : []).map((c) => {
        if (!c || !isRev(ctx, c.commit)) return { refused: 'a layout call names no commit' }
        if (c.call === 'moved') return { moved: reader.moved(c.commit) }
        if (c.call === 'versionAt') return { versionAt: reader.versionAt(c.commit) }
        if (c.call === 'pluginAt') { if (typeof c.file !== 'string' || /(^|\/)\.\.(\/|$)/.test(c.file)) return { refused: 'a pluginAt call names no plugin path' }; return { pluginAt: reader.pluginAt(c.commit, c.file) } }
        if (c.call === 'filesAt') { const ps = Array.isArray(c.prefixes) ? c.prefixes : ['']; if (ps.some((p) => typeof p !== 'string' || /(^|\/)\.\.(\/|$)/.test(p))) return { refused: 'a filesAt call names a prefix that is no plugin path' }; return { filesAt: reader.filesAt(c.commit, ps) } }
        return { refused: 'the layout reader answers moved, pluginAt, filesAt and versionAt, and no ' + JSON.stringify(c.call) }
      })
      return { result: { results } }
    }
    if (ask.reader === 'narrow-kinds') {
      if (!isRev(ctx, a.commit)) return { refused: 'the narrowing reader names no commit' }
      const prefix = relOrTop(ctx, a.prefix, 'plugin folder')
      const pre = prefix ? prefix + '/' : ''
      const read = (rel) => { const r = runGit(ctx.programs.git, top, ['show', a.commit + ':' + pre + rel]); if (r.error || r.status !== 0) throw new Error('no ' + rel + ' at ' + a.commit); return r.stdout }
      return { result: { owners: narrowKinds(read) } }
    }
    if (ask.reader === 'base-figures') {
      if (!isRev(ctx, a.base)) return { refused: 'the reading of a base\'s figures names no base' }
      const folder = relOrTop(ctx, a.folder, 'plugin folder')
      const files = (Array.isArray(a.files) ? a.files : []).map((f) => relOrTop(ctx, f, 'file'))
      const git = (argv) => { const r = runGit(ctx.programs.git, top, argv); return r.error || r.status !== 0 ? null : r.stdout }
      return { result: baseFigures(git, { base: a.base, folder, files, figures: Array.isArray(a.figures) ? a.figures : [], source: a.source }) }
    }
    return { refused: 'the reading ' + JSON.stringify(ask.reader) + ' is none of the client\'s readers layout, narrow-kinds and base-figures' }
  } catch (e) {
    return { refused: String(e.message || e).split('\n')[0] }
  }
}

/*  The answer to the ask `suite-changes` (D24): { changes, moves }, each keyed by the suite's entry file, as the release's
 *  suiteChangesAcross answers them for that suite. A suite is a file at both commits, or { file, headFile } where its
 *  entry file stands at another path at the head. */
function answerSuiteChanges (ctx, ask) {
  try {
    if (!ctx.checkout) return { refused: 'the suite-change reading needs a checkout, and the command runs in none' }
    if (!isRev(ctx, ask.base) || !isRev(ctx, ask.head)) return { refused: 'the suite-change reading names no base and head commit' }
    setGit(ctx.programs.git)
    const git = gitReader(ctx.programs.git, ctx.checkout.top)
    const changes = {}
    const moves = {}
    for (const s of Array.isArray(ask.suites) ? ask.suites : []) {
      const file = relOrTop(ctx, typeof s === 'string' ? s : s && s.file, 'suite file')
      const headFile = typeof s === 'string' || !s.headFile ? undefined : relOrTop(ctx, s.headFile, 'suite file at the head')
      if (!file) return { refused: 'a suite of the reading names no file' }
      const across = suiteChangesAcross(suiteDiffs(git, ask.base, ask.head, file, headFile))
      changes[file] = across.changes
      moves[file] = across.moves
    }
    return { changes, moves }
  } catch (e) {
    return { refused: String(e.message || e).split('\n')[0] }
  }
}

module.exports = { answerReading, answerSuiteChanges }

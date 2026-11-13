'use strict'
// The reading part of the figures of a wave's base (ARCH D31): what the release's figuresAt reads with git show at the
// base commit of a repository that holds the plugin, run on the computer, so that only figures leave it: the commit, the
// version, the digests of the policy and of the judged cases, the count lines and the length of each file named.
//
// The count lines are read by the figures' patterns, which the engine sends in the ask, since the patterns are the
// engine's (its release checks). The block's hash and its content lines are not read here: the release reads them with
// the runner's normalizeBlock and sha256Of, which only the engine's copy of the runner exports, and the block's text
// stays on the computer. The answer names that part as unread.

const crypto = require('node:crypto')

/*  The files under the plugin's folder that the figures of a base are read from, and the three texts whose count lines
 *  the slot counts reads, as the release names them. */
const BASE_FILES = ['.claude-plugin/plugin.json', 'harness/orchestration-harness.js', 'harness/converge/policy.md', 'harness/converge/cases.json',
  'README.md', 'GUIDE.html', 'harness/NOT-SHIPPED.md']
const COUNT_TEXTS = ['README.md', 'GUIDE.html', 'harness/NOT-SHIPPED.md']
const BLOCK_BEGIN = '// [SANCTIONED-BLOCK BEGIN v1]'
const BLOCK_END = '// [SANCTIONED-BLOCK END v1]'

const sha256Hex = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex')
/*  The release's text helpers the count lines read with, taken with no change to their logic. */
const docLines = (body) => String(body).split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l))
const stripComments = (body) => String(body).replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
const stripMarkup = (line) => String(line).replace(/<[^>]*>/g, ' ')

/*  A pattern the engine sent, [source, flags], as a RegExp. */
const patternOf = (p) => (Array.isArray(p) ? new RegExp(String(p[0]), String(p[1] || '')) : new RegExp(String(p)))

/*  The count lines of the plugin's three texts, by the figures `figures` sent in the ask, each { in, line, re }: the
 *  release's countLines, with each matched text cut to its counts (the second review of IP-MC-SERVER-002, N11). A line
 *  reads `README.md:12` 292, or 292 on Windows, 290 on Linux where the text names a host after a count: the digits of
 *  the match and the host's fixed name alone, so no other word of a text leaves the computer whatever pattern the engine
 *  sends. */
function countLines (texts, figures) {
  const out = []
  const counts = (s) => (String(s).match(/\d+/g) || []).join(' ')
  const list = (figures || []).map((f) => ({ in: f.in || [], line: patternOf(f.line), re: patternOf(f.re) }))
  for (const t of texts) {
    const lines = docLines(stripComments(t.body)).map(stripMarkup)
    const byLine = new Map()
    for (const f of list) {
      if (f.in.indexOf(t.name) < 0) continue
      for (let i = 0; i < lines.length; i += 1) {
        if (!f.line.test(lines[i])) continue
        const m = f.re.exec(lines[i])
        if (m === null) continue
        const hosts = Array.from(lines[i].matchAll(new RegExp(f.re.source + '\\s+on\\s+(Windows|macOS|Linux)\\b', 'ig')))
        const said = hosts.length ? hosts.map((x) => counts(x[0].slice(0, x[0].length - x[x.length - 1].length)) + ' on ' + x[x.length - 1]).join(', ') : counts(m[0])
        byLine.set(i + 1, (byLine.get(i + 1) || []).concat([said]))
        break
      }
    }
    for (const n of Array.from(byLine.keys()).sort((x, y) => x - y)) out.push('`' + t.name + ':' + n + '` ' + byLine.get(n).join(' and '))
  }
  return out.join('; ')
}

/*  The longest the count patterns may run over the three texts, the most patterns an ask may send, and the longest
 *  pattern (N11): the engine's patterns run in a context of their own whose run stops at the bound, so a pattern that
 *  backtracks without end costs the client a second at most. */
const COUNT_TIME_MS = 1000
const COUNT_PATTERNS = 64
const PATTERN_CHARS = 1000

/*  countLines run within COUNT_TIME_MS: { counts } or { problem }. */
function boundedCountLines (texts, figures) {
  const list = Array.isArray(figures) ? figures : []
  if (list.length > COUNT_PATTERNS) return { problem: 'the ask sends ' + list.length + ' count figures, above the ' + COUNT_PATTERNS + ' the client runs' }
  const long = list.find((f) => [f && f.line, f && f.re].some((p) => String(Array.isArray(p) ? p[0] : p).length > PATTERN_CHARS))
  if (long) return { problem: 'the ask sends a count pattern longer than the ' + PATTERN_CHARS + ' characters the client runs' }
  const vm = require('node:vm')
  const sandbox = { texts: JSON.parse(JSON.stringify(texts)), figures: JSON.parse(JSON.stringify(list)), out: null }
  const code = [['docLines', docLines], ['stripComments', stripComments], ['stripMarkup', stripMarkup], ['patternOf', patternOf], ['countLines', countLines]].map(([n, f]) => 'var ' + n + ' = ' + f.toString()).join('\n') + '\nout = countLines(texts, figures)'
  try {
    vm.runInNewContext(code, sandbox, { timeout: COUNT_TIME_MS })
  } catch (e) {
    if (e && e.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') return { problem: 'the count patterns the ask sent ran past the ' + COUNT_TIME_MS + ' ms the client gives them, and were stopped' }
    return { problem: 'the count patterns the ask sent do not run: ' + String(e && e.message ? e.message : e).split('\n')[0].slice(0, 200) }
  }
  return { counts: String(sandbox.out) }
}

/*  The figures of the base `base` under the plugin folder `folder`, read with `git` (git(argv) answers what git printed,
 *  or null where it exits other than 0). Answers { problem } as the release words it, or the figures. */
function baseFigures (git, input) {
  const x = input || {}
  const folder = !x.folder || x.folder === '.' ? '' : String(x.folder).replace(/\/+$/, '') + '/'
  const full = git(['rev-parse', '--verify', '--quiet', String(x.base) + '^{commit}'])
  if (full === null) return { problem: 'the base ' + x.base + ' names no commit of the checkout' }
  const sha = full.trim()
  const short = sha.slice(0, 8)
  const show = (rel) => git(['show', sha + ':' + folder + rel])
  const texts = {}
  for (const rel of BASE_FILES) texts[rel] = show(rel)
  const missing = BASE_FILES.find((rel) => texts[rel] === null)
  if (missing) return { problem: 'the base ' + short + ' holds no ' + folder + missing + ', which the prompt template reads a figure from; the template is written for a Mission whose repository holds the plugin, and this Mission\'s wave.prompts reads template, source ' + x.source }
  let version = null
  try { version = JSON.parse(texts['.claude-plugin/plugin.json'] || '{}').version || null } catch (_) { version = null }
  if (!version) return { problem: 'the base ' + short + ' holds a ' + folder + '.claude-plugin/plugin.json that names no version' }
  const runner = String(texts['harness/orchestration-harness.js'] || '').replace(/\r/g, '')
  const count = (t) => String(t).replace(/\r/g, '').replace(/\n$/, '').split('\n').length
  const sizes = []
  for (const f of x.files || []) {
    const text = show(f)
    if (text !== null) sizes.push({ file: f, lines: count(text), blockMarkers: text.indexOf(BLOCK_BEGIN) >= 0 && text.indexOf(BLOCK_END) >= 0 })
  }
  const counted = boundedCountLines(COUNT_TEXTS.map((name) => ({ name, body: String(texts[name] || '') })), x.figures)
  if (counted.problem) return { problem: counted.problem }
  return {
    sha, short, version,
    blockStands: runner.indexOf(BLOCK_BEGIN) >= 0 && runner.indexOf(BLOCK_END) > runner.indexOf(BLOCK_BEGIN),
    blockHash: null, blockLines: null,
    unread: 'the block\'s hash and content lines, and the lines a copy of the block takes from a file\'s length, need the runner\'s normalizeBlock, which the plugin does not hold',
    policySha: sha256Hex(String(texts['harness/converge/policy.md'] || '')), casesSha: sha256Hex(String(texts['harness/converge/cases.json'] || '')),
    counts: counted.counts, sizes
  }
}

module.exports = { BASE_FILES, COUNT_TEXTS, COUNT_TIME_MS, countLines, boundedCountLines, baseFigures }

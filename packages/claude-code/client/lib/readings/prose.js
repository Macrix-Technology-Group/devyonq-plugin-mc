'use strict'
// The prose lines of a source file, which the suite-change reading skips (ARCH D24): taken from the release with no
// change to their logic.

/*  Whether the triple quote on line `at` opens a docstring: the first statement of a module, class or function. */
function opensDocstring (lines, at) {
  for (let i = at - 1; i >= 0; i -= 1) {
    const t = lines[i].trim()
    if (t === '') continue
    if (/^#/.test(t)) continue
    return /^(?:async\s+)?(?:def|class)\b.*:\s*$/.test(t)
  }
  return true
}

/*  The prose lines of one source file, as a set of line numbers counted from 1: comment lines and Python
 *  docstring lines. A comment line opens with two slashes, or in a JavaScript file with slash-star or a star,
 *  or in a Python or shell file with #; a shebang is none, and a comment after code on its line is not read.
 *  Inside a sanctioned block every line but a two-slash line is skipped. */
function proseLines (text, file, fence) {
  const js = /\.(?:js|mjs|cjs)$/i.test(String(file || ''))
  const opener = js ? /^\s*(\/\/|\/\*|\*)/ : /^\s*(#)(?!!)/
  const DOC = /^\s*[ruRUbB]{0,2}("""|''')/
  const out = new Set()
  let inFence = false
  let quote = null
  const lines = String(text || '').split(/\r?\n/)
  for (let i = 0; i < lines.length; i += 1) {
    const l = lines[i]
    // A sanctioned-block marker counts only where it opens a comment line of its own.
    if (fence && /^\s*(?:\/\/|#|\*)?\s*\[SANCTIONED-BLOCK /.test(l)) {
      if (l.indexOf(fence.begin) >= 0) { inFence = true; continue }
      if (l.indexOf(fence.end) >= 0) { inFence = false; continue }
    }
    // A Python docstring is prose. Only the first statement of a module, class or function opens one; a triple
    // quote that closes an assigned string opens none.
    if (!js) {
      if (quote) {
        if (l.indexOf(quote) >= 0) quote = null
        out.add(i + 1)
        continue
      }
      const d = DOC.exec(l)
      if (d && opensDocstring(lines, i)) {
        const rest = l.slice(l.indexOf(d[1]) + 3)
        if (rest.indexOf(d[1]) < 0) quote = d[1]
        out.add(i + 1)
        continue
      }
    }
    const m = opener.exec(l)
    if (!m) continue
    if (inFence && m[1] !== '//') continue
    out.add(i + 1)
  }
  return out
}

module.exports = { opensDocstring, proseLines }

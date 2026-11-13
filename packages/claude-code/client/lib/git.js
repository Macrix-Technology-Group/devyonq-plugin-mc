'use strict'
// Git on the computer (ARCH D8, D31): the client runs git at the absolute path kept at login, never through PATH, in the
// environment the launcher built, and answers the engine only the forms of the contract's census `gitForms`.

const { spawnSync } = require('node:child_process')
const { checkoutPath } = require('./checkout.js')

/*  The global option every git run with a path the engine names opens with (the second review of IP-MC-SERVER-002, N8):
 *  git reads each pathspec as a literal path, so a word such as *, a bracket or :(glob) names that one file alone. */
const LITERAL = ['--literal-pathspecs']

/*  Runs git at `bin` in the folder `cwd` with `argv`: { status, stdout, stderr, error }. `env` adds variables to the
 *  client's own environment for this one process. */
function runGit (bin, cwd, argv, env, input) {
  const r = spawnSync(bin, argv, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, windowsHide: true, input, env: env ? Object.assign({}, process.env, env) : process.env })
  return { status: r.status, stdout: String(r.stdout || ''), stderr: String(r.stderr || ''), error: r.error ? String(r.error.message || r.error) : null }
}

/*  A reader of git in the checkout `top`: git(argv) answers what git printed and throws where it exits other than 0. */
function gitReader (bin, top) {
  return (argv) => {
    const r = runGit(bin, top, argv)
    if (r.error || r.status !== 0) throw new Error('git ' + argv.join(' ') + ' failed: ' + (r.error || r.stderr.trim().split('\n')[0]))
    return r.stdout
  }
}

/*  The argv of one item of a `facts` ask, `{ form, args }`, built from the census form of the contract and checked: every
 *  placeholder of the form takes one value of the item's `args` (an object by placeholder name), each value matching its
 *  type, a path a checkout path. Answers { argv, program } or { refused } naming why. */
function formArgv (contract, item, checkout) {
  const doc = contract.doc
  const form = (doc.gitForms || []).find((f) => f.form === (item && item.form))
  if (!form) return { refused: 'the git form ' + JSON.stringify(item && item.form) + ' stands in no entry of the contract\'s gitForms' }
  const args = (item && item.args && typeof item.args === 'object' && !Array.isArray(item.args)) ? item.args : {}
  const types = doc.argumentTypes || {}
  const used = new Set()
  const argv = []
  for (const part of form.argv) {
    const whole = /^\{([A-Za-z0-9]+(?:\.\.\.)?)\}$/.exec(part)
    if (whole && whole[1].endsWith('...')) {
      const name = whole[1]
      used.add(name)
      const list = Array.isArray(args[name]) ? args[name] : []
      for (const v of list) {
        const p = checkoutPath(checkout, v)
        if (p.refused) return { refused: 'the git form ' + form.form + ' names the path ' + JSON.stringify(v) + ': ' + p.refused }
        argv.push(p.relative)
      }
      continue
    }
    let bad = null
    // A name in braces is a placeholder only where the contract's argumentTypes names it, as the engine reads a form
    // (git-forms.js partPattern): ^{commit}, ^{tree} and @{upstream} are git's own syntax and stand as they are written.
    const filled = part.replace(/\{([A-Za-z0-9]+)\}/g, (whole, name) => {
      if (!Object.prototype.hasOwnProperty.call(types, name)) return whole
      used.add(name)
      const v = args[name]
      if (typeof v !== 'string') { bad = bad || 'the git form ' + form.form + ' needs the value ' + name; return '' }
      if (types[name] === 'checkout') {
        const p = checkoutPath(checkout, v)
        if (p.refused) { bad = bad || 'the git form ' + form.form + ' names the path ' + JSON.stringify(v) + ': ' + p.refused; return '' }
        return p.relative
      }
      if (!types[name] || !new RegExp(types[name]).test(v)) { bad = bad || 'the value ' + JSON.stringify(v) + ' of ' + name + ' does not read as the contract\'s type of ' + name; return '' }
      return v
    })
    if (bad) return { refused: bad }
    argv.push(filled)
  }
  for (const k of Object.keys(args)) if (!used.has(k)) return { refused: 'the git form ' + form.form + ' takes no value ' + k }
  return { argv, program: form.program || 'git', answer: form.answer || 'output' }
}

module.exports = { LITERAL, runGit, gitReader, formArgv }

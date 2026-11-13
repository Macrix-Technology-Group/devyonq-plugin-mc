'use strict'
// The narrowing reader (ARCH D31): the kind each file of the plugin at a commit has for a narrow proof, read through
// git show on the computer. The client answers the map of each file to its test program. Taken from the release with no
// change to its logic.

const path = require('node:path')
const { partsOf } = require('./suite-changes.js')

/*  The three test programs a narrow proof may change, by their path in the plugin, each with its suite's key in the drill
 *  table. */
const NARROW_PROGRAMS = { 'harness/mc17.test.js': 'mc17', 'harness/harness.test.js': 'harness', 'hooks/hooks.test.py': 'hooks' }

/*  The drill table, the third kind of file a narrow proof may change. */
const NARROW_TABLE = 'harness/mc17.mutants.json'

/*  A line of hooks/hooks.test.py that runs a file beside it by exec, in the shape the suite's own lines have. */
const EXEC_PART_RE = /^exec\(compile\(open\(os\.path\.join\(ROOT, "hooks", "([A-Za-z0-9._-]+)"\)/

/*  The files hooks/hooks.test.py runs by exec, by their names in hooks/. */
function execParts (text) {
  return String(text || '').split(/\r?\n/).map((l) => EXEC_PART_RE.exec(l.trim())).filter(Boolean).map((m) => m[1])
}

/*  The kind each file of the plugin at a commit has for a narrow proof, through `read`: a test program and each part it
 *  loads map to the test program, and the drill table maps to null. A file of another kind is absent. */
function narrowKinds (read) {
  const owners = { [NARROW_TABLE]: null }
  for (const prog of Object.keys(NARROW_PROGRAMS)) {
    let text = null
    try { text = read(prog) } catch (e) { continue }
    owners[prog] = prog
    if (prog === 'hooks/hooks.test.py') for (const f of execParts(text)) owners['hooks/' + f] = prog
    else for (const rel of partsOf(prog, text)) owners[path.posix.join(path.posix.dirname(prog), rel)] = prog
  }
  return owners
}

module.exports = { NARROW_PROGRAMS, NARROW_TABLE, EXEC_PART_RE, execParts, narrowKinds }

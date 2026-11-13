'use strict'
// The programs the client runs, by absolute path (ARCH D19; record 117): at login the client resolves node, git, ps or
// powershell.exe, ssh, the credential tool and Python 3 in any folder of the PATH of the person's terminal, checks each by
// its version line, and keeps the paths in the credential store. Every later run uses the kept paths, so a shim the AI
// puts earlier on its own PATH after login is never run.
//
// Limit, named at record 117: an AI that can write to a folder on the search path at login can place a program there,
// and login keeps its path.

const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

/*  The candidate paths of `name` in each folder of `searchPath`, in its order, with the extensions of PATHEXT on Windows. */
function candidates (name, searchPath, platform) {
  const win = (platform || process.platform) === 'win32'
  const exts = win ? ['.exe', '.cmd', '.bat', '.com'] : ['']
  const out = []
  for (const dir of String(searchPath || '').split(win ? ';' : ':').filter(Boolean)) {
    for (const ext of exts) {
      const p = path.join(dir.replace(/^"|"$/g, ''), name + ext)
      try { if (fs.statSync(p).isFile()) out.push(p) } catch (_) { /* not here */ }
    }
  }
  return out
}

const runOf = (bin, argv) => {
  const shell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(bin)
  if (shell) return { status: null, stdout: '', stderr: 'a batch file stands where a program was looked for' }
  const r = spawnSync(bin, argv, { encoding: 'utf8', timeout: 20000, windowsHide: true })
  return { status: r.status, stdout: String(r.stdout || ''), stderr: String(r.stderr || ''), error: r.error }
}

/*  The checks of each program: the arguments that make it print its version line and the form that line takes. */
const CHECKS = {
  node: { argv: ['--version'], ok: (r) => r.status === 0 && /^v\d+\.\d+\.\d+/.test(r.stdout.trim()) },
  git: { argv: ['--version'], ok: (r) => r.status === 0 && /^git version \d/.test(r.stdout.trim()) },
  ps: { argv: ['-o', 'pid=', '-p', String(process.pid)], ok: (r) => r.status === 0 && /^\s*\d+\s*$/.test(r.stdout) },
  powershell: { argv: ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.Major'], ok: (r) => r.status === 0 && /^\d+\s*$/.test(r.stdout.trim()) },
  ssh: { argv: ['-V'], ok: (r) => /OpenSSH/i.test(r.stderr + r.stdout) },
  'secret-tool': { argv: [], ok: (r) => /usage: *secret-tool/i.test(r.stderr + r.stdout) },
  security: { argv: ['-h'], ok: (r) => /security|find-generic-password/i.test(r.stderr + r.stdout) },
  python: { argv: ['--version'], ok: (r) => r.status === 0 && /^Python 3\.\d+/.test((r.stdout + r.stderr).trim()) }
}

/*  The first candidate of `name` on `searchPath` whose version line reads as `check` asks: { path, tried }. */
function resolveOne (name, searchPath, check) {
  const tried = []
  for (const p of candidates(name, searchPath)) {
    const r = runOf(p, check.argv)
    if (check.ok(r)) return { path: p, tried }
    tried.push(p)
  }
  return { path: null, tried }
}

/*  The programs of this computer on `searchPath`: { programs, missing, notes }, `programs` holding node, git, ps or
 *  powershell, ssh, the credential tool and python as { bin, prefix }, `missing` the names login cannot do without. */
function resolvePrograms (searchPath, platform) {
  const p = platform || process.platform
  const programs = {}
  const missing = []
  const notes = []
  const take = (key, name, check, needed) => {
    const r = resolveOne(name, searchPath, check)
    if (r.path) programs[key] = r.path
    else if (needed) missing.push(name + (r.tried.length ? ' (tried ' + r.tried.join(', ') + ')' : ''))
    else notes.push('no ' + name + ' stands on the PATH of this terminal')
    return r.path
  }
  take('node', 'node', CHECKS.node, true)
  take('git', 'git', CHECKS.git, true)
  if (p === 'win32') {
    const ps = require('./os-store.js').windowsPowerShell()
    if (fs.existsSync(ps) && CHECKS.powershell.ok(runOf(ps, CHECKS.powershell.argv))) programs.powershell = ps
    else take('powershell', 'powershell', CHECKS.powershell, true)
    programs.credential = programs.powershell
  } else {
    take('ps', 'ps', CHECKS.ps, true)
    if (p === 'darwin') take('credential', 'security', CHECKS.security, true)
    else take('credential', 'secret-tool', CHECKS['secret-tool'], true)
  }
  take('ssh', 'ssh', CHECKS.ssh, false)
  let py = null
  for (const name of ['python3', 'python']) { py = resolveOne(name, searchPath, CHECKS.python).path; if (py) break }
  if (!py && p === 'win32') {
    const launcher = resolveOne('py', searchPath, { argv: ['-3', '--version'], ok: CHECKS.python.ok }).path
    if (launcher) programs.python = { bin: launcher, prefix: ['-3'] }
  } else if (py) programs.python = { bin: py, prefix: [] }
  if (!programs.python) notes.push('no Python 3 stands on the PATH of this terminal, so the client cannot key the running processes with lint-heavy.py --key')
  return { programs, missing, notes }
}

module.exports = { candidates, resolveOne, resolvePrograms, CHECKS }

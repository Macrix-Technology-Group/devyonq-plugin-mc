'use strict'
// The process entries (ARCH D9; AC-12): the client reads the process listing, keys each command line with the hook's own
// reader, lint-heavy.py --key, and sends for each match only the process id, the start time and the name of the pattern
// it matched. A drill process goes under drill:run, drill:helper:<8 hex> or drill:shell. No command line leaves the
// computer. The listing, its parsing and the drill's two rules are taken from the release with no change to their logic;
// the programs they run are the ones the client kept at login.

const path = require('node:path')
const crypto = require('node:crypto')
const { execFileSync, spawnSync } = require('node:child_process')

/*  The programs the listing runs, set by the client to its kept paths before a reading. */
const PROGRAMS = { ps: 'ps', powershell: 'powershell.exe' }
/*  The options every Python gate runs under, as the launchers hooks/mc17-gate and mc17-gate.cmd give them. */
const PYTHON_ISOLATED = ['-I', '-S', '-B', '-X', 'utf8']

/*  The text of the host's process listing: through PowerShell's Get-CimInstance on Windows and through ps elsewhere, each
 *  within 10 seconds. */
function listingText (platform) {
  if (platform === 'win32') {
    // The script opens with PSModulePath set to PowerShell's own modules, and names each cmdlet with its module (N1).
    const { PS_FIRST, PS_OPTIONS } = require('../os-store.js')
    return execFileSync(PROGRAMS.powershell, PS_OPTIONS.concat(['-Command', PS_FIRST + '; CimCmdlets\\Get-CimInstance Win32_Process | Microsoft.PowerShell.Utility\\Select-Object ProcessId,CreationDate,CommandLine | Microsoft.PowerShell.Utility\\ConvertTo-Json -Compress']),
      { encoding: 'utf8', timeout: 10000, windowsHide: true, maxBuffer: 64 * 1024 * 1024 })
  }
  return execFileSync(PROGRAMS.ps, ['-axo', 'pid=,lstart=,command='], { encoding: 'utf8', timeout: 10000, maxBuffer: 64 * 1024 * 1024 })
}

/*  The time of a process's start as the Windows listing writes it: /Date({ms})/, or a date text. */
function cimDate (v) {
  const m = /^\/Date\((-?\d+)\)\/$/.exec(String(v === undefined || v === null ? '' : v))
  const t = m ? Number(m[1]) : Date.parse(String(v))
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

/*  The host's processes with their start times and command lines: { ok, processes, why }, each process { pid, startedAt,
 *  command }. `text` is a listing already read, in the form of `platform`'s listing; where none is given, the listing is
 *  read. A listing that fails or cannot be read answers ok false and the reason. */
function processListing (input) {
  const x = input || {}
  const platform = x.platform || process.platform
  let text = x.text
  if (text === undefined) {
    try { text = listingText(platform) } catch (e) { return { ok: false, processes: [], why: 'the process listing failed: ' + e.message } }
  }
  if (platform === 'win32') {
    let list = null
    try { list = JSON.parse(text) } catch (e) { return { ok: false, processes: [], why: 'the Windows listing is no JSON: ' + e.message } }
    const items = Array.isArray(list) ? list : [list]
    return { ok: true, processes: items.filter((p) => p && typeof p === 'object').map((p) => ({ pid: Number(p.ProcessId), startedAt: cimDate(p.CreationDate), command: p.CommandLine === null || p.CommandLine === undefined ? '' : String(p.CommandLine) })), why: null }
  }
  const processes = []
  for (const line of String(text).split('\n')) {
    const m = /^\s*(\d+)\s+(\w{3}\s+\w{3}\s+\d+\s+\d\d:\d\d:\d\d\s+\d{4})\s+(.*)$/.exec(line)
    if (!m) continue
    const t = Date.parse(m[2])
    processes.push({ pid: Number(m[1]), startedAt: Number.isNaN(t) ? null : new Date(t).toISOString(), command: m[3].trim() })
  }
  return { ok: true, processes, why: null }
}

/*  The segment of a command line that names a tree the drill made, the one that opens mc17-drill-w-, read with the line
 *  split at both kinds of slash and cut at its first character outside a name. Answers null where the line names none. */
function drillTreePart (command) {
  const part = String(command || '').split(/[\\/]/).find((s) => s.startsWith('mc17-drill-w-'))
  return part === undefined ? null : part.replace(/[^A-Za-z0-9_-][\s\S]*$/, '')
}

/*  Whether `command` is the line of a drill run's own process: the first word after its program and the program's options, a
 *  word with no white space in it, names the drill's file. A shell that carries the run's command names that file only
 *  inside the text it runs, so its line answers false. */
function drillRunLine (command) {
  const m = /^\s*(?:"[^"]*"|\S+)(?:\s+-\S+)*\s+(?:"([^"\s]*)"|([^\s"]+))/.exec(String(command || ''))
  return Boolean(m) && String(m[1] !== undefined ? m[1] : m[2]).split(/[\\/]/).pop() === 'mc17.mutations.js'
}

/*  The run of the hook file with --key over the command lines, at the plugin's hooks/lint-heavy.py, under the Python 3 the
 *  client kept: { ok, starts, why }, starts one list per command of { tableId, host, key }. */
function keyRun (ctx, commands) {
  const py = ctx.programs && ctx.programs.python
  if (!py || !py.bin) return { ok: false, starts: [], why: 'the client keeps no Python 3, so it cannot key the running processes with lint-heavy.py --key' }
  const hook = path.join(ctx.places.root, 'hooks', 'lint-heavy.py')
  // Isolated, as every Python gate runs (the second review of IP-MC-SERVER-002, N2): -I keeps the user site, the script's
  // folder and the PYTHON variables off the path, -S loads no site, so no .pth file runs; -B writes no bytecode beside the hook; -X utf8 reads the JSON as UTF-8.
  const r = spawnSync(py.bin, (py.prefix || []).concat(PYTHON_ISOLATED, [hook, '--key']), { input: JSON.stringify({ commands }), encoding: 'utf8', timeout: 60000, windowsHide: true, maxBuffer: 64 * 1024 * 1024 })
  if (r.error || r.status !== 0) return { ok: false, starts: [], why: 'lint-heavy.py --key ' + (r.error ? 'did not run: ' + r.error.message : 'exited ' + r.status + ': ' + String(r.stdout || r.stderr || '').trim().slice(0, 300)) }
  let parsed = null
  try { parsed = JSON.parse(String(r.stdout || '').trim()) } catch (e) { return { ok: false, starts: [], why: 'lint-heavy.py --key printed no JSON: ' + e.message } }
  if (!parsed || !Array.isArray(parsed.starts)) return { ok: false, starts: [], why: 'lint-heavy.py --key printed no starts' }
  return { ok: true, starts: parsed.starts, why: null }
}

/*  The name a matched process goes under: its pattern, and for the drill one of the three names the release's two rules
 *  give, drill:run for the drill's own process, drill:helper:<the first eight hex of the sha256 of its tree part> for a
 *  helper of a drill tree, drill:shell for a shell that carries the drill's command. */
function entryName (tableId, command) {
  if (tableId !== 'drill') return tableId
  const part = drillTreePart(command)
  if (part !== null) return 'drill:helper:' + crypto.createHash('sha256').update(part, 'utf8').digest('hex').slice(0, 8)
  return drillRunLine(command) ? 'drill:run' : 'drill:shell'
}

/*  The process entries of the computer (D9): { ok, entries, why }, each entry { pid, startedAt, pattern } for a process
 *  whose command line starts a heavy run of a pattern of the contract. agent is a tool matcher and matches no process. */
function processEntries (ctx, input) {
  const x = input || {}
  if (ctx.programs) { if (ctx.programs.ps) PROGRAMS.ps = ctx.programs.ps; if (ctx.programs.powershell) PROGRAMS.powershell = ctx.programs.powershell }
  const listed = processListing(x.listing === undefined ? {} : x.listing)
  if (!listed.ok) return { ok: false, entries: [], why: listed.why }
  const patterns = (ctx.contract && ctx.contract.doc.patterns) || []
  const keyed = keyRun(ctx, listed.processes.map((p) => p.command))
  if (!keyed.ok) return { ok: false, entries: [], why: keyed.why }
  const entries = []
  listed.processes.forEach((p, i) => {
    const first = (keyed.starts[i] || [])[0]
    if (!first || first.tableId === 'agent' || patterns.indexOf(first.tableId) < 0) return
    entries.push({ pid: p.pid, startedAt: p.startedAt, pattern: entryName(first.tableId, p.command) })
  })
  return { ok: true, entries, why: null }
}

module.exports = { PROGRAMS, PYTHON_ISOLATED, listingText, cimDate, processListing, drillTreePart, drillRunLine, keyRun, entryName, processEntries }

'use strict'
// The flags each command reads, and its usage (findings 38 and 43a of the DVQ-018 Copilot run): `mc17 amend --dry-run`
// sent the amend for real, since the engine's parsing takes any --name and the command reads --dry alone, and
// `mc17 wave unlock --help` started the unlock. The client refuses, before it sends anything, a flag the entry of its
// command does not list, naming the flag and the command's usage, and prints the usage under --help or -h for every
// command, sending nothing.
//
// The contract names only the flags whose word is a file or a path (its fileArguments); every other flag stands in the
// engine's code alone. So the list is contract/flags.json, which scripts/command-flags.js writes from the engine's own
// code at the commit it names, joined with the flags of the contract's tables.

const fs = require('node:fs')
const path = require('node:path')

const FLAGS_FILE = path.join(__dirname, '..', 'contract', 'flags.json')

/*  The usage of each command the client answers itself, which flags.json, written from the engine, does not hold. */
const LOCAL_USAGE = {
  version: ['version [--json]  names the plugin, the contract and the gateway'],
  login: ['login [--tenant <tenant id or DevyonQ MCP address>] [--gateway <address>] [--token]  signs in at DevyonQ, in a terminal of your own; with no --tenant you pick the tenant in the browser'],
  logout: ['logout  removes this computer\'s DevyonQ sign-in, in a terminal of your own'],
  config: ['config model [<provider/model> | --clear]  the model this computer keeps for a decision point\'s call; alone it prints the model kept'],
  'converge host': ['converge host [--scope <SCOPE>] [--json]  the reading of this host that the judgment module reads']
}

/*  The table at `file` (the client's own where none is given), or null where it does not read. */
function loadFlags (file) {
  try {
    const t = JSON.parse(fs.readFileSync(file || FLAGS_FILE, 'utf8'))
    return t && typeof t.commands === 'object' ? t : null
  } catch (_) { return null }
}

/*  The flags of `argv` from `skip` on, read as the engine's parsing reads them (engine/core/harness/mc17.js parseArgs):
 *  -f and --file take the next word whatever it is; a --name takes the next word as its value unless that word opens
 *  with --, and --name=value carries its value; every other word is positional. Each { flag, at } for a flag, by its name
 *  before any =, and { word, at } for a positional word. */
function wordsOf (argv, skip) {
  const out = []
  for (let i = skip || 0; i < argv.length; i += 1) {
    const a = String(argv[i])
    if (a === '-f' || a === '--file') { out.push({ flag: a, at: i }); i += 1; continue }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=')
      if (eq > 0) { out.push({ flag: a.slice(0, eq), at: i }); continue }
      out.push({ flag: a, at: i })
      if (i + 1 < argv.length && !String(argv[i + 1]).startsWith('--')) i += 1
      continue
    }
    out.push({ word: a, at: i })
  }
  return out
}

/*  Whether `argv` asks for the usage of the command whose words are its first `skip`: a flag --help, or a positional -h. */
function asksHelp (argv, skip) {
  return wordsOf(argv, skip).some((w) => w.flag === '--help' || w.word === '-h')
}

/*  The usage lines of the command `cmd` (from contract.commandOf): its entry's in flags.json, else the usage the client
 *  keeps for a command it answers itself, else the contract entry's own usage. */
function usageOf (table, cmd) {
  const e = table && table.commands && table.commands[cmd.name]
  if (e && Array.isArray(e.usage) && e.usage.length) return e.usage
  if (LOCAL_USAGE[cmd.name]) return LOCAL_USAGE[cmd.name]
  if (typeof cmd.entry.usage === 'string') return [cmd.entry.usage]
  if (cmd.name === 'settings' && table && table.commands && table.commands.settings) return table.commands.settings.usage
  return [cmd.name]
}

/*  The words of the usage, one line per form: 'Usage: mc17 ...'. */
function usageText (table, cmd) {
  return usageOf(table, cmd).map((l) => 'Usage: mc17 ' + l).join('\n') + '\n'
}

/*  The flags the command `cmd` reads: its entry's in flags.json, the flags every command reads, and the flags of its
 *  contract entry's tables. Null where flags.json holds no entry of the command, which then is not checked. */
function knownFlags (table, cmd) {
  const e = table && table.commands && table.commands[cmd.name]
  if (!e || !Array.isArray(e.flags)) return null
  const out = new Set(e.flags.concat(Array.isArray(table.global) ? table.global : []))
  for (const t of ['files', 'either', 'lists', 'dirs', 'paths', 'work', 'localFlags', 'writeFlags']) for (const f of (cmd.entry[t] || [])) out.add(f)
  for (const f of Object.keys(cmd.entry.flagFacts || {})) out.add(f)
  if (out.has('-f') || out.has('--file')) { out.add('-f'); out.add('--file') }
  return out
}

/*  The first flag of `argv` the command `cmd` does not read, or null. */
function unknownFlag (table, cmd, argv) {
  const known = knownFlags(table, cmd)
  if (known === null) return null
  const w = wordsOf(argv, cmd.words).find((x) => x.flag !== undefined && !known.has(x.flag))
  return w ? w.flag : null
}

module.exports = { FLAGS_FILE, LOCAL_USAGE, loadFlags, wordsOf, asksHelp, usageOf, usageText, knownFlags, unknownFlag }

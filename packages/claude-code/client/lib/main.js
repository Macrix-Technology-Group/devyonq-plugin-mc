'use strict'
// The client's frame (ARCH D3, D8, D10 to D13, D19, D20, D32): it reads the contract, answers the commands of kind
// `local` itself, and sends every other command to the gateway it signed in at, as runner.js carries it.

const fs = require('node:fs')
const path = require('node:path')
const { loadContract, commandOf, kindOf } = require('./contract.js')
const { placesOf } = require('./places.js')
const { readSession, tenantMismatch, NoSession } = require('./session.js')
const { readCheckout } = require('./checkout.js')
const { versionReport } = require('./version.js')
const { openStore } = require('./store.js')
const { refusedVariable, refusalText } = require('./guard.js')
const { loadFlags, asksHelp, usageText, unknownFlag } = require('./flags.js')

/*  The context of one run, from `options`: { test } for the client's test build, and the readers a suite replaces. */
function contextOf (options) {
  const o = options || {}
  const test = o.test || null
  const contract = loadContract(test && test.contractFile, test && test.contractVersion)
  const places = placesOf(o.home, o.clientDir)
  // The test build alone may name the converge store, the keys folder and the client's own folder of its scratch computer.
  if (test && test.convergeStore) places.store = test.convergeStore
  if (test && test.keysFolder) places.keys = test.keysFolder
  if (test && test.ownFolder) places.own = test.ownFolder
  return {
    test,
    contract,
    places,
    cwd: o.cwd || process.cwd(),
    out: o.out || ((s) => process.stdout.write(s)),
    err: o.err || ((s) => process.stderr.write(s)),
    verbose: Boolean(o.verbose),
    trace: o.trace || null,
    hostState: o.hostState || null,
    loadSamples: o.loadSamples || null,
    askHandlers: o.askHandlers || {},
    work: null,
    programs: null,
    checkout: null,
    session: null,
    store: null
  }
}

/*  The programs the client runs: the paths kept at login, or for the test build the ones its options name. */
function programsOf (ctx) {
  if (ctx.test && ctx.test.programs) return ctx.test.programs
  return (ctx.session && ctx.session.programs) || null
}

/*  The local commands this client answers itself (D3). Each answers an exit code. */
const LOCAL = {
  version: (ctx, argv) => {
    let gateway = null
    let tenant = null
    try { const s = (ctx.store || openStore(ctx)); if (!s.none) { const k = s.getAll(['gateway', 'tenant']); gateway = k.gateway; tenant = k.tenant } } catch (_) { gateway = null }
    const r = versionReport(ctx, gateway, tenant)
    ctx.out((argv.indexOf('--json') >= 0 ? JSON.stringify(r.json, null, 2) : r.human.join('\n')) + '\n')
    return 0
  },
  login: (ctx, argv) => {
    let login = null
    try { login = require('./login.js') } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e }
    if (!login) { ctx.err('mc17 login: this build of the client carries no sign-in\n'); return 1 }
    return login.loginCommand(ctx, argv)
  },
  logout: (ctx, argv) => {
    let login = null
    try { login = require('./login.js') } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e }
    if (!login) { ctx.err('mc17 logout: this build of the client carries no sign-in\n'); return 1 }
    return login.logoutCommand(ctx, argv)
  },
  'decision admit': (ctx, argv) => require('./decision.js').admitCommand(ctx, argv),
  trust: (ctx, argv) => require('./trust.js').trustCommand(ctx, argv),
  'converge host': (ctx, argv) => require('./converge-host.js').hostCommand(ctx, argv),
  // The --hook and --measure forms of mc17 settings: the session-start hook, which each host's hook file starts through
  // the launcher and the client runs in its own process from the plugin's own settings modules (Step 10; D19, D23).
  settings: (ctx, argv) => {
    const file = path.join(ctx.places.root, 'hooks', 'mc17-node.js')
    let hook = null
    try { hook = require(file) } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e }
    if (!hook || typeof hook.main !== 'function') return notCarried(ctx, 'settings ' + argv.filter((a) => a === '--hook' || a === '--measure').join(' '))
    return hook.main(argv, ctx)
  }
}

/*  The words for a local command this build does not carry yet. */
const notCarried = (ctx, name) => { ctx.err('mc17 ' + name + ': the client answers this command itself, and this build of the client does not carry it\n'); return 1 }

/*  The guard of every run (ARCH D19; the review of IP-MC-SERVER-002): the client refuses an environment that holds a
 *  variable guard.js names, and a Node started without --use-system-ca, whatever file started it: mc17.js, the hooks'
 *  mc17-node.js, or a script of the AI that requires this file. The client's test build alone, whose options name
 *  `test`, runs without the flag. Answers the refusal's words, or null. */
function refusalOfRun (options) {
  const o = options || {}
  const name = refusedVariable(process.env)
  if (name) return refusalText(name)
  if (!o.test && process.execArgv.indexOf('--use-system-ca') < 0) return 'mc17: the client runs only under Node started with --use-system-ca, so it trusts the roots of the operating system alone. Run mc17 through its launcher client/mc17 (client/mc17.cmd on Windows).'
  return null
}

/*  The folder the words of `argv` name with --repo <path> or --repo=<path>, the last such word, resolved against the
 *  working folder, or null. */
function repoNamed (ctx, argv) {
  let named = null
  for (let i = 1; i < argv.length; i += 1) {
    const a = String(argv[i])
    if (a === '--repo' && argv[i + 1] !== undefined && !String(argv[i + 1]).startsWith('--')) named = String(argv[i + 1])
    else if (a.startsWith('--repo=')) named = a.slice('--repo='.length)
  }
  return named === null || named === '' ? null : path.resolve(ctx.cwd, named)
}

/*  The checkout the command acts on (finding 39 of the DVQ-018 Copilot run): the one its words name with --repo, where
 *  that folder stands in a checkout other than the working folder's, and the working folder's otherwise. A checkout in
 *  the client's temporary folder ~/.mc17/tmp, such as a worktree of git-write worktree-add, is then the checkout of the
 *  call, and its paths go in the checkout form. */
function checkoutOf (ctx, argv) {
  const here = readCheckout(ctx.programs.git, ctx.cwd)
  const repo = repoNamed(ctx, argv)
  if (repo === null) return here
  let dir = false
  try { dir = fs.statSync(repo).isDirectory() } catch (_) { dir = false }
  if (!dir) return here
  const named = readCheckout(ctx.programs.git, repo)
  if (named === null || (here !== null && here.top === named.top)) return here
  // The working folder's place in the named checkout, '.' where it stands outside it.
  const rel = path.relative(named.top, realCwd(ctx.cwd)).split(path.sep).join('/') || '.'
  return Object.assign({}, named, { cwd: rel.startsWith('..') || path.isAbsolute(rel) ? '.' : rel })
}

/*  The real form of the working folder, or the folder as given where it cannot be read. */
function realCwd (cwd) {
  try { return fs.realpathSync.native(cwd) } catch (_) { return cwd }
}

/*  Runs `argv`, the words after mc17: answers the exit code. */
async function run (argv, options) {
  const refused = refusalOfRun(options)
  if (refused) { ((options && options.err) || ((s) => process.stderr.write(s)))(refused + '\n'); return 1 }
  const ctx = contextOf(options)
  if (!argv.length || argv[0] === '-h' || argv[0] === '--help') {
    ctx.out('Usage: mc17 <command> [arguments]. mc17 version names the plugin, the contract and the gateway; mc17 help lists the commands the engine serves.\n')
    return argv.length ? 0 : 2
  }
  // mc17 config, the person's own settings on this computer (N7), is the client's alone: no engine serves it, so the
  // contract names no such command, and it never reaches a gateway.
  const flags = loadFlags(ctx.test && ctx.test.flagsFile)
  if (argv[0] === 'config') {
    if (asksHelp(argv, 1)) { ctx.out(usageText(flags, { name: 'config', entry: {} })); return 0 }
    return require('./config.js').configCommand(ctx, argv)
  }
  // mc17 logout is the client's alone too: it removes this computer's sign-in and calls no gateway, so the contract names
  // no such command.
  if (argv[0] === 'logout') {
    if (asksHelp(argv, 1)) { ctx.out(usageText(flags, { name: 'logout', entry: {} })); return 0 }
    return LOCAL.logout(ctx, argv)
  }
  const cmd = commandOf(ctx.contract, argv)
  if (!cmd) { ctx.err('mc17: the contract of this plugin names no command ' + JSON.stringify(argv[0]) + '\n'); return 2 }
  // A command the contract marks testBuild is served by a gateway whose test switch is set alone; only the client's test
  // build sends it (the contract's testBuild section), and the shipped client refuses it before any call.
  if (cmd.entry.testBuild === true && !ctx.test) { ctx.err('mc17 ' + cmd.name + ': a command of the client\'s test build alone; this client sends it to no gateway\n'); return 2 }
  // --help or -h prints the command's usage and sends nothing, for every command (finding 43a: mc17 wave unlock --help
  // started the unlock, since the engine's parsing takes any --name and wave unlock reads no --help).
  if (asksHelp(argv, cmd.words)) { ctx.out(usageText(flags, cmd)); return 0 }
  const kind = kindOf(cmd, argv)
  // A flag the command does not read is refused before anything is sent (finding 38: mc17 amend --dry-run sent the
  // amend for real, since amend reads --dry alone), naming the flag and the command's usage.
  if (kind !== 'local') {
    const bad = unknownFlag(flags, cmd, argv)
    if (bad) { ctx.err('mc17 ' + cmd.name + ': the command reads no flag ' + bad + ', so nothing was sent.\n' + usageText(flags, cmd)); return 2 }
  }
  if (kind === 'local') {
    if (LOCAL[cmd.name]) return LOCAL[cmd.name](ctx, argv)
    return notCarried(ctx, cmd.name + (cmd.name === 'settings' ? ' ' + argv.filter((a) => a === '--hook' || a === '--measure').join(' ') : ''))
  }
  try {
    ctx.store = openStore(ctx)
    ctx.session = readSession(ctx)
  } catch (e) {
    if (e instanceof NoSession) { ctx.err('mc17: ' + e.message + '\n'); return 1 }
    throw e
  }
  const mismatch = tenantMismatch(ctx.session)
  if (mismatch) { ctx.err('mc17: ' + mismatch + '\n'); return 1 }
  ctx.programs = programsOf(ctx)
  if (!ctx.programs || !ctx.programs.git) { ctx.err('mc17: the client keeps no path of git. Run mc17 login in a terminal of your own.\n'); return 1 }
  ctx.checkout = checkoutOf(ctx, argv)
  const runner = require('./runner.js')
  if (cmd.name === 'read') return runner.runRead(ctx, argv)
  return runner.runRemote(ctx, cmd, argv)
}

module.exports = { run, contextOf, refusalOfRun }

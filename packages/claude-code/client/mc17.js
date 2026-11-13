#!/usr/bin/env node
'use strict'
// mc17 - the client of the Mission Control harness. Skills and hooks call it through its launcher, client/mc17 from a
// POSIX shell and client/mc17.cmd from PowerShell or cmd, which starts it with an environment built from nothing. It
// signs the person in to DevyonQ, reads facts on the computer, sends each command to the harness gateway, and carries
// out the steps the engine answers with (ARCH D8, D10 to D13, D19, D20).
//
// Usage: mc17 <command> [arguments]. mc17 version prints the plugin, the contract and the gateway.

// The guard of the environment and of --use-system-ca stands in main.run itself, so it holds for every file that runs
// the client, this one, the hooks' mc17-node.js and any other (lib/main.js refusalOfRun).
require('./lib/main.js').run(process.argv.slice(2), {}).then((code) => {
  process.exitCode = Number.isInteger(code) ? code : 1
}, (e) => {
  process.stderr.write('mc17: ' + String((e && e.message) || e).split('\n')[0] + '\n')
  process.exitCode = 1
})

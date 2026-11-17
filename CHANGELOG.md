# Changelog

## 0.2.8 - 2026-11-17

- **A new Mission is recorded in DevyonQ.** `mc-cre-mission-v17` asks for the DevyonQ project with the authorities,
  offers each role the project members who may hold it, asks for the Factory where the project links several, and at
  its end runs `mc17 mission register`: the Mission stands in the project with its four authorities, its ledger and its
  status, and its CanonQ collection is shared with the Mission's group. A refusal leaves the CanonQ Mission as created,
  and the report names the command to run again.
- **Two new commands.** `mc17 mission projects` lists the projects where you may record a Mission, and
  `mc17 mission register` records a Mission made earlier; run again, it brings the DevyonQ owners in line with the
  Manifest. Both need the DevyonQ release of 2026-11-17, which serves the client's contract copy.

## 0.2.7 - 2026-11-16

- **The plugin works when installed on Windows.** The plugin's repository now tells git to convert no line ending, so
  an install on Windows keeps every file as published. With 0.2.6 installed from `devyonq-plugin-mc` on Windows, every
  `mc17` command was refused with "a copy edited by hand is no copy", because the client's copy of the contract no
  longer matched. Install 0.2.7 afresh: remove the plugin and install it again.

## 0.2.6 - 2026-11-13

- **The plugin installs from its own repository.** Each release is published to
  `Macrix-Technology-Group/devyonq-plugin-mc`, which holds the Claude Code and GitHub Copilot packages and their
  marketplace files. Install from there: `/plugin marketplace add Macrix-Technology-Group/devyonq-plugin-mc` in Claude
  Code, `copilot plugin marketplace add Macrix-Technology-Group/devyonq-plugin-mc` in the Copilot CLI, or that name in
  VS Code's `chat.plugins.marketplaces`. The `repository` field of both packages names it.
- **The Copilot package describes the plugin as it works.** Its README and description tell the client `mc17`, its
  sign-in to DevyonQ and the harness in DevyonQ, and `node scripts/build.js --check` now reads the Copilot package's
  texts as it reads the Claude Code package's.

## 0.2.5 - 2026-11-13

- **Git forms with git's own braces run again.** The client filled every `{name}` in a git form of the contract, so
  `^{commit}`, `^{tree}` and `@{upstream}` read as values to fill: the form `cat-file-exists` refused with "needs the
  value commit", and `rev-parse-tree` and `rev-parse-upstream` could not run. The client now fills only the names the
  contract's `argumentTypes` holds, as the engine reads a form. This blocked the execution acceptance records of a
  Mission landed through the hosted engine. It works with the DevyonQ release of 2026-11-13, which also fixes
  `mc17 settings` in the engine and `mc17 stage` with no plugin folder.

## 0.2.4 - 2026-11-12

- **A session on a computer that is not signed in says so at its start.** The start hook prints that the computer is
  not signed in to DevyonQ, with the exact command to sign in for that computer, and tells the AI to run no Mission
  skill or `mc17` command until then. On Windows and macOS it also opens a window that runs `mc17 login`, at most once
  in ten minutes; `~/.mc17/client/no-sign-in-window` keeps it closed. The other start-hook steps print nothing then,
  and every refusal names the command.
- **`mc17 logout` signs the computer out.** Run in your own terminal, it removes the sign-in the client keeps and the
  record of node, prints what it removed, and names the DevyonQ connection to revoke to end the key itself.
- **The plugin's keyed CI job runs green.** The hook comments carry no history, the README's sign-in sentence passes
  the writing lint, and `client/contract/copy.json` pins the devyonq-saas commit whose engine suite reads the thin
  plugin as it ships.

## 0.2.3 - 2026-11-12

- **The tenant page is `/choose-tenant`.** `mc17 login` with no `--tenant` opens DevyonQ's tenant page at
  `/choose-tenant`, the address app.devyonq.ai serves. The first tag of 0.2.2 opened `/cli/tenant`, which DevyonQ never
  served under that name; take 0.2.3 to sign in without a tenant id.
- **The plugin's CI runs its long checks once.** The suites and the keyed job run on a pull request into `main` and on
  no push. The keyed job fetches devyonq-saas with its sparse-checkout patterns on standard input and with
  `core.autocrlf=false`, so the Windows runner fetches the files and keeps their bytes.

## 0.2.2 - 2026-11-12

- **`mc17 login` needs no tenant id.** Run with no `--tenant`, it opens the browser at DevyonQ's tenant page
  `/choose-tenant`: the person signs in, picks one of their tenants, and the same tab goes on to the usual consent. The
  client checks the state it sent and that the tenant is a tenant id before it signs in. `--tenant <id or MCP address>`
  works as before, and `--token` still needs `--tenant`. Opened by hand, the page lists the person's tenants with their
  ids to copy. It needs the DevyonQ release that serves `/choose-tenant`.
- **Rendering a document works in Windows PowerShell.** The skills `mc-cre-mission-v17` and `mc-cre-repair-v17` render
  with `--out <file>` instead of a shell redirect. Windows PowerShell 5.1 writes a redirected `>` as UTF-16, so a
  Manifest rendered under GitHub Copilot in VS Code came out at twice its size and every later hash check would fail.

## 0.2.1 - 2026-11-11

- **Every mc17 call runs again in GitHub Copilot in VS Code.** VS Code runs the hooks of two copies of one release: the
  Copilot CLI's install and VS Code's own copy of it. Each copy's secret gate refused the other copy's launcher, so every
  `mc17` call stood refused. The gate now runs a file of another copy as its own only where that copy proves it by its
  content: its `FILES.lock` is byte for byte the gate's own, the file is a line of it, and every file of the copy carries
  the sha256 its line gives. A copy whose content differs is refused as before, and every copy whose `FILES.lock` is the
  gate's own is kept from a write as the gate's own folder is.

## 0.2.0 - 2026-11-08

This release lets a DevyonQ Worker fetch a release of `devyonq-mc`.

- **The texts describe the plugin as it works.** The README, the guide `GUIDE.html` and the manifest's description of the
  Claude Code package describe the client `mc17`, `mc17 login` and the harness in DevyonQ. `node scripts/build.js --check`
  fails where a `.md` or `.html` file of the Claude Code or the mc-run package, or the description of their manifests or
  marketplace entry, tells a reader of the old plugin's setup: its two CanonQ variables or its local harness program.
- **`mc-run run` takes two limits from its caller.** `--allowed-tools <file>` refuses every call outside the allow-list
  the file names, answers the model the refusal, and writes one line in `transcript.jsonl` for each denied call, naming
  the tool, the reason and the call's id. `--max-tokens <n>` halts the session once the token figures the endpoint reports
  reach `n`, and sends no request after the answer that reached it. A session started with neither runs as before. The
  runner's sanctioned block, its hash and the three pinned siblings are unchanged.
- **The contract pin is final.** `client/contract/copy.json` names the commit of `devyonq-saas` it was copied from with no
  `interim` field, and `mc17 version` no longer prints "interim pin".

## 0.1.0 - 2026-11-05

The first release of `devyonq-mc`, the thin plugin. Its skills, hooks and
host packages are code of this repository; the harness logic runs in the engine of DevyonQ, which the plugin's client
`mc17` reaches through the harness gateway.

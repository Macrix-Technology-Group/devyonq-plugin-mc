# Changelog

## 0.2.9 - 2026-11-17

- **Each CanonQ instance holds its own ledger schema.** `mc-vf-manifest-v17` no longer names macrix's schema id.
  `mc17 upload --ledger-schema` finds the one document titled `ledger-hybrid-v1.schema` on the instance and uploads
  nothing; the instance's admin uploads `ledger-hybrid-v1.schema.json`, pins it in `QAPP_LEDGER_SCHEMAS`, and keeps
  it where the DevyonQ connection reads. It needs the engine of devyonq-saas that finds the schema by its title.
- **mc-run admits a saved output.** Under an allow-list, mc-run now runs one `mc17` command that is no `append` with
  its output sent by `>` to one file inside a write folder, which the 0.2.9 skills hand to `mc17 append --evidence`.
  An append stays unredirected, so its record lines stay in the session; `>>`, a stream number, a second command and
  a file outside the write folders are refused.
- **The published READMEs are written for a client.** The Claude Code and Copilot package READMEs say how to
  install from devyonq-plugin-mc and name no source repository and no internal reference; the Claude Code one drops
  the developer notes. `scripts/publish.test.js` checks the install commands of both.
- **The Manifest takes the plain-language pass before its create.** `mc-cre-mission-v17` Step 6 now runs
  `mc-plain-v17` over the rendered Manifest and creates it from the rewrite with `--plain`, which `mc17 create` asks
  for. The step gave the create without the proof before, and the create refused it.
- **The Scope bullets wait for the ledger.** The link pass of Step 10 sends live-state edits alone. A scope tag the
  platform stored and the Manifest lacks is written at the first declarative amend after `mc-vf-manifest-v17` has
  created the ledger, because that amend needs a Change Log row and a ledger, and Step 11 names it as owed.
- **`mc-plain-v17` checks sections only for a class with a field table.** A Manifest has none, and the plain check
  already confirms its headings.
- **The plain-language pass retries on every host.** When `mc17 plain` finds that a rewrite dropped something, the
  skill `mc-plain-v17` now starts the rewriting agent once more in a fresh context, with the draft, the first rewrite
  and the dropped things in one prompt. It asked the first agent for a second answer before, which Copilot does not
  allow: a Copilot subagent returns once and takes no further message, so the retry never ran there.
- **Mission creation accepts the Move type the template writes.** `mc-cre-mission-v17` said the SPEC's Move type starts
  as `[TBD]`, while the template writes `User Move` for a Standard Mission that produces no Published Language, so a
  session following the skill strictly stopped at Step 7. The skill now says the Move type is created as rendered.
- **The pin is read in one call.** `mc17 pin` reads the Guide, the Definition and the Profile v1.7 and the Governance
  Process from the methodology the DevyonQ harness ships, by asset id, and prints each with its version line, Status and
  hash; `mc17 pin --json` prints them as the Manifest's answer-set keys. `mc-cre-mission-v17` Step 0 uses it in place of
  a search, and Step 6 starts the answer set from it, so no session copies a hash or an id by hand. Needs the DevyonQ
  release of 2026-11-17 that serves `mc17 pin`.
- **The Manifest renders in one round.** `mc17 render` names every key the answer set lacks in one refusal, with the
  step that answers each, where it named one key per run before, and fills the keys that follow from the others (the
  date, the derived Mission ID, the collapse of authorities, the SPEC and Test Plan AO, the pin state).
  `mc17 render manifest --skeleton --out answers.json` writes the answer set to fill, every key `null` with a guide.
  Step 6 of `mc-cre-mission-v17` builds the answer set from the skeleton and `mc17 pin --json`. Needs the DevyonQ release
  of 2026-11-17 that carries the renderer change.
- **Fixes from a full Copilot run.** `mc17 amend --body <file>` sends a plain-language rewrite whole, in place of
  edits built by hand. The plain-language check keeps a field written as not applicable word for word, which a rewrite
  had reworded so the Manifest failed its verification. A write outside a checkout no longer exits 1 after it landed.
  A read past the ledger's end says so. The gate stops reading a script's comment marks and regular expressions as
  paths, reads `Select-String` and a PowerShell read into a variable as reads, and lets a script run the launcher. The
  creation skill says where the work files stand. Needs the DevyonQ release of 2026-11-17 that carries these.
- **The SPEC and the Test Plan are created as scaffolds.** Both hold only the template's text and `[TBD]` at creation,
  so a plain-language pass had nothing to rewrite and `mc17 create` refused them. Steps 7 and 8 now create them with
  `mc17 create --render … --scaffold`, and the first fill takes the pass. Needs the DevyonQ release of 2026-11-17 that
  accepts a SPEC and a Test Plan as scaffolds.
- **A ledger's records are numbered on every tenant.** CanonQ numbers a ledger's records from the schema its `$schema`
  names, and a tenant whose corpus did not hold that schema numbered every record 1. `mc17 upload --ledger-schema`
  finds a schema the corpus numbers records with, or uploads one, and prints the `$schema` line;
  `mc-vf-manifest-v17` binds a new ledger with it. `mc17 upload` refuses a ledger whose schema numbers nothing, and
  `mc17 append` refuses a ledger that already holds two records numbered 1.
- **A record's evidence comes from files.** `mc17 append --evidence fields.txt,binding.txt` puts each command's output
  into the record from the file it was saved in, read in UTF-8 or UTF-16, and fills in the time. It refuses a record
  holding a NUL or U+FFFD, which a script reading a UTF-16 file as UTF-8 puts there. Every skill that writes a record
  says how, in its section *Writing a ledger record*: one JSON file, the outputs through `--evidence`, the number from
  `--json`, and each `mc17` output read whole.
- **One command per shell call.** The skills run each `mc17` command as a shell call of its own, so a host's
  approval rule can match it. The Copilot package's README says how to allow `mc17` for a session.
- **Smaller fixes from the same Copilot run.** A skill that writes a runtime version checks it against the session's
  machine and asks where they differ. A Change Log cell refused for holding more than names says why and shows one
  that passes. `mc17 fields` given a file name says the file goes under `-f`. `mc-vf-ip-v17` gives the radius gate's
  full usage, and says `NO EVIDENCE` is the expected answer in a repository with no code yet. `mc17 render ir` says
  what each key takes and refuses a whole plan id under `ip`. Needs the DevyonQ release that carries these.

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

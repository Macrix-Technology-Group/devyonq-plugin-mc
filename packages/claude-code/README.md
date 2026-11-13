# devyonq-mc for Claude Code

**Reader:** a person who runs Missions under Mission Control v1.7 from Claude Code. This page says what the plugin holds,
how its client signs in to DevyonQ, how the skills reach the harness, and how a person's settings reach every session.

## What this plugin is

The plugin holds three things: the skills, the gate hooks and the client `mc17`. The harness itself runs in DevyonQ.
Every skill and every hook calls the client, and the client sends each command to the harness gateway of your DevyonQ
tenant, under the sign-in it keeps on your computer. The harness reads and writes the Mission's documents in CanonQ,
computes every figure a machine can compute, and answers the client.

**A check resolves a declared value by running the subject's own implementation, wherever the subject publishes one.**
A recipe copied into a document drifts from the code it describes, and a check that reads the copy then certifies the
drift. That is why a skill asks the harness for every hash, binding and field check, and computes none of them itself.

A Mission belongs to one line of Mission Control for its lifetime. The plugin of the old repository,
`Macrix-Technology-Group/devyonq`, stays installable beside this one; switch one of the two on at a time.

## What is here

| | |
|---|---|
| `skills/` | twenty-two skills, each suffixed `-v17`: creation (`mc-cre-mission-v17`, `mc-cre-arch-v17`, `mc-cre-ip-v17`, `mc-cre-wave-v17`, `mc-cre-repair-v17`), verification (`mc-vf-manifest-v17`, `mc-vf-spec-v17`, `mc-vf-arch-v17`, `mc-vf-ip-v17`, `mc-vf-tp-v17`, `mc-vf-wave-v17`, `mc-vf-move-v17`), approval (`mc-apr-spec-v17`, `mc-apr-arch-v17`, `mc-apr-ip-v17`, `mc-apr-tp-v17`), the independent act (`mc-adv-review-v17`), the plain-language pass (`mc-plain-v17`), the decision points (`mc-converge-v17`), a person's settings (`mc-cre-settings-v17`, `mc-adv-settings-v17`) and closure (`mc-close-mission-v17`) |
| `client/mc17` | the client: `mc17 login` once per computer, then every harness command a skill or a hook runs; `client/mc17.cmd` runs it from PowerShell or cmd on Windows |
| `client/contract/copy.json` | the commit of `devyonq-saas` whose harness contract the client carries, beside the contract itself; `mc17 version` prints it |
| `client/keys/` | the checking keys of the decisions the harness signs |
| `hooks/hooks.json` | the hook configuration: the secret gate, the document gate, the branch gate, the fleet gate, the heavy-run hook, the chat lint and the settings hook |
| `hooks/lint-secret.py` | refuses a call that reaches what the client keeps: its credential store, its folders, `mc17 login` and `mc17 trust` |
| `hooks/lint-document.py` | sends the file a harness write names to `mc17 lintdoc`, and refuses a write whose body breaks the writing rules |
| `hooks/lint-branch.py` | refuses a commit, merge or push on a locked Mission branch without the wave token, and an agent prompt that names one |
| `hooks/lint-workflow.py` | refuses a fleet script that reaches an agent outside a verified sanctioned block, or that differs from the lock committed on its branch |
| `hooks/lint-heavy.py` | refuses the start of a heavy run in a wave run by hand that no decision of `mc17 converge evaluate --point heavy-run` names |
| `hooks/lint-chat.py` | reports the writing rules over what the assistant just said, as a `Stop` hook, and blocks nothing |
| `hooks/git/` | the wave lock's `pre-commit` and `pre-merge-commit` hooks, which `mc17 wave hooks` installs |
| `harness/orchestration-harness.js` | the sanctioned runner a fleet script carries; `mc17 machinery` compares the hash of its block with the hash DevyonQ holds |
| `harness/examples/sanctioned-wave.js` | a fleet script that passes the fleet gate |
| `harness/converge/policy.md` | the judging policy a decision point sends its model |
| `GUIDE.html` | the developer guide; open it in a browser |

## What you need

- **Node 22 or later** for the client.
- **Python 3** for the gate hooks.
- **git**, which the client reads a checkout with.
- **A DevyonQ seat.** Any active person of the tenant who holds a seat may run Missions with this plugin. The tenant's
  reach covers a Mission collection only where the collection was made through the harness.

## Sign in

The client signs you in to DevyonQ once per computer. Run it yourself, in a terminal outside the AI tool, from
the folder Claude Code installed the plugin into, `~/.claude/plugins/cache/devyonq-mc/devyonq-mc/<version>/`:

```
client/mc17 login
```

On Windows, from PowerShell or cmd, run `client\mc17.cmd login`. Your browser opens: sign in to DevyonQ, pick your tenant,
and approve the sign-in. To skip the pick, add `--tenant <tenant>`, where `<tenant>` is your tenant's id or your DevyonQ
MCP address; `https://app.devyonq.ai/choose-tenant` lists your tenants with their ids to copy. The client keeps what the sign-in answers in the credential store of your operating system, and
refuses where none stands. No token goes into an environment variable or a file a tool may read back.

A session started on a computer that is not signed in yet says so at its start, with the exact command for that 
computer, and on Windows and macOS opens a window that runs the sign-in for you; Mission skills and `mc17` commands 
wait until you are signed in. To keep that window from opening, create the empty file 
`~/.mc17/client/no-sign-in-window`.

To sign this computer out, run `mc17 logout` the same way, in your own terminal. It removes the sign-in the client 
keeps; the key DevyonQ issued stays valid until it expires, or until you revoke "mc17, the client of devyonq-mc" 
under Connect AI agent in DevyonQ.

`client/mc17 version` prints the plugin's version, the contract the client carries and the DevyonQ it is signed in to,
and sends nothing.

## How the skills reach the harness

Each skill names the client as the launcher `client/mc17` two levels above its own folder, so nothing depends on where
the plugin is installed. A command such as `mc17 check <manifest> --ledger <id>` goes to the harness in DevyonQ, which
answers it; `mc17 help` lists the commands the client carries. Where `mc17` reports no sign-in, the skill stops and tells
the person to run `mc17 login` themself.

A decision point's call spends your own OpenRouter key on the model you set on this computer, in a terminal of your own,
with `client/mc17 config model <provider/model>`. `mc17 config model` alone prints it, and `--clear` clears it. With no
model set, the client spends nothing.

## A person's settings

**Each person a Claude Code session acts for can keep standing orders in four CanonQ documents of their own, which every session reads whole before its first act.** They stand in one restricted collection the person's account owns, titled `MC Settings {Full Name}` and filed under the category `DevyonQ Settings`, on the one CanonQ instance that holds the person's settings. Each title ends with the person's initials:

- `ORDERS-{XX}`: how the person wants sessions to work with them;
- `MANDATE-{XX}`: what a session may decide or do on the person's behalf, and what needs the person's word;
- `SETUP-{XX}`: the person's machines, accounts and local hazards;
- `MISSIONS-{XX}`: one row for each Mission the person takes part in, which the plugin's skills and commands write when a Mission is created, hands over and closes.

**The skill.** `mc-cre-settings-v17 {Full Name}` creates the collection and the four documents once, in the person's own session and on the person's word, from the four templates the harness holds. Where a collection of the person's stands, it adds only what is missing; it names each near miss, a collection the account owns that fails part of the test, and creates no collection while one stands.

**The command and its check.** `mc17 settings` finds the person's collection by the login of the sign-in, reads the four documents, and makes every change the plugin makes to them. `mc17 settings --check` compares the `MISSIONS` table with every Manifest that names the person, prints each difference with the command line that settles it, and changes nothing.

**What the settings hold, and how an entry lands.** `ORDERS`, `MANDATE` and `SETUP` hold only what is about the person and holds in every Mission; a project's or a Mission's facts, such as its paths, repositories, names, figures and record numbers, stay in that Mission's own documents, which the `MISSIONS` table links. Every new entry is shown to the person whole, as it will land, before it is written, and the command writes it only on the person's confirmation of that text. An entry without the person's own words lands only after an adversarial check by an agent in a separate context. The command refuses an entry whose text around the person's words carries a path, a repository, an id, a record number, a URL, a host name or another kind of fact a program can read as a project's. A review by a panel of independent agents runs when the person asks for it, in their own words such as "review my settings" or by naming `mc-adv-settings-v17 review`, and in each closure act; the session publishes it in the person's own collection and gives the person its link.

**The hook.** At every session start, the plugin's session-start hook delivers the four documents whole, in labelled parts, and names the machine, the plugin version, the host, the login and the account's name. Every line the hook writes itself opens `[MC settings]`. An agent a session starts gets no settings from the hook; it gets what the session's brief gives it.

**The hold.** At a start where the hook does not deliver the person's `MANDATE` whole, a session sends nothing to production or to other people, and gives no approval in the person's name, until it has read it. The same hold stands while another editor's version of `MANDATE` waits for the person's confirmation, which the session records with `mc17 settings --confirm-version`.

**Sharing.** Sharing the collection in the app lets a colleague with ordinary rights edit its documents. CanonQ keeps every version of each, and a colleague's edit reaches every session at its next start, which names it to the person.

**Each machine.** A machine needs no pointer to the documents in `~/.claude/CLAUDE.md`, and no other setting, once the hook is installed and the client is signed in. It keeps this one line there, for a session in which no plugin hook runs:

```
Where no line opening [MC settings] stands in this session's context, the session reads the person's settings with mc17 settings before its first act, or, where the plugin is not loaded, through its CanonQ connector from the one restricted MC Settings collection the person names, and, until it has read MANDATE, sends nothing to production or to other people and gives no approval in the person's name, unless the person's word in the chat names that one act.
```

## The rule worth reading before anything else

**A check nobody has watched fail proves nothing.** Every check of this plugin's suites, in its repository, was watched failing before it was trusted: break the thing, see it go red, restore, see it go green. This project has already shipped a lint that could not fail at all, and a hash check that agreed with a copy of itself.

## Handoff

The developer guide is `GUIDE.html` in this directory. Open it in a browser.

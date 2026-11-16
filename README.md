# devyonq-mc for Claude Code

**Reader:** a person who runs Missions under Mission Control v1.7 from Claude Code. This page says how to install the
plugin, how its client signs in to DevyonQ, how the skills reach the harness, and how a person's settings reach every
session.

## What this plugin is

The plugin holds three things: the skills, the gate hooks and the client `mc17`. The harness itself runs in DevyonQ.
Every skill and every hook calls the client, and the client sends each command to the harness gateway of your DevyonQ
tenant, under the sign-in it keeps on your computer. The harness reads and writes the Mission's documents in CanonQ,
computes every hash, binding and field check, and answers the client.

A Mission belongs to one line of Mission Control for its lifetime.

## What you need

- **Node 22 or later** for the client.
- **Python 3** for the gate hooks.
- **git**, which the client reads a checkout with.
- **A DevyonQ seat.** Any active person of the tenant who holds a seat may run Missions with this plugin. The tenant's
  reach covers a Mission collection only where the collection was made through the harness.

## Install

In Claude Code:

```
/plugin marketplace add Macrix-Technology-Group/devyonq-plugin-mc
/plugin install devyonq-mc@devyonq-mc
```

Start a new session afterwards, so it loads the skills and the hooks. Claude Code installs the plugin into
`~/.claude/plugins/cache/devyonq-mc/devyonq-mc/<version>/`. `FILES.lock` at the package's root lists every file of the
package with its SHA-256, so you can compare an installed copy with the package of a release.

## Sign in

The client signs you in to DevyonQ once per computer. Run it yourself, in a terminal outside the AI tool, from the
folder Claude Code installed the plugin into:

```
client/mc17 login
```

On Windows, from PowerShell or cmd, run `client\mc17.cmd login`. Your browser opens: sign in to DevyonQ, pick your
tenant, and approve the sign-in. To skip the pick, add `--tenant <tenant>`, where `<tenant>` is your tenant's id or your
DevyonQ MCP address; `https://app.devyonq.ai/choose-tenant` lists your tenants with their ids to copy. The client keeps
what the sign-in answers in the credential store of your operating system, and refuses where none stands. No token goes
into an environment variable or a file a tool may read back.

A session started on a computer that is not signed in yet says so at its start, with the exact command for that
computer, and on Windows and macOS opens a window that runs the sign-in for you; Mission skills and `mc17` commands wait
until you are signed in. To keep that window from opening, create the empty file `~/.mc17/client/no-sign-in-window`.

To sign this computer out, run `client/mc17 logout` the same way, in your own terminal. It removes the sign-in the client
keeps; the key DevyonQ issued stays valid until it expires, or until you revoke "mc17, the client of devyonq-mc" under
Connect AI agent in DevyonQ.

`client/mc17 version` prints the plugin's version, the contract the client carries and the DevyonQ it is signed in to,
and sends nothing.

## How the skills reach the harness

Each skill names the client as the launcher `client/mc17` two levels above its own folder, so nothing depends on where
the plugin is installed. A command such as `mc17 check <manifest> --ledger <id>` goes to the harness in DevyonQ, which
answers it; `mc17 help` lists the commands the client carries. Where `mc17` reports no sign-in, the skill stops and tells
you to run `mc17 login` yourself.

A decision point's call spends your own OpenRouter key on the model you set on this computer, in a terminal of your own,
with `client/mc17 config model <provider/model>`. `mc17 config model` alone prints it, and `--clear` clears it. With no
model set, the client spends nothing.

## What is here

| | |
|---|---|
| `skills/` | twenty-two skills, each suffixed `-v17`: creation (`mc-cre-mission-v17`, `mc-cre-arch-v17`, `mc-cre-ip-v17`, `mc-cre-wave-v17`, `mc-cre-repair-v17`), verification (`mc-vf-manifest-v17`, `mc-vf-spec-v17`, `mc-vf-arch-v17`, `mc-vf-ip-v17`, `mc-vf-tp-v17`, `mc-vf-wave-v17`, `mc-vf-move-v17`), approval (`mc-apr-spec-v17`, `mc-apr-arch-v17`, `mc-apr-ip-v17`, `mc-apr-tp-v17`), the independent act (`mc-adv-review-v17`), the plain-language pass (`mc-plain-v17`), the decision points (`mc-converge-v17`), a person's settings (`mc-cre-settings-v17`, `mc-adv-settings-v17`) and closure (`mc-close-mission-v17`) |
| `client/mc17` | the client: `mc17 login` once per computer, then every harness command a skill or a hook runs; `client/mc17.cmd` runs it from PowerShell or cmd on Windows |
| `client/contract/` | the harness contract the client carries; `mc17 version` prints which one |
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
| `GUIDE.html` | the guide to the skills and the method; open it in a browser |
| `CHANGELOG.md` | what each release changed |

## Your settings

**Each person a Claude Code session acts for can keep standing orders in four CanonQ documents of their own, which every session reads whole before its first act.** They stand in one restricted collection the person's account owns, titled `MC Settings {Full Name}` and filed under the category `DevyonQ Settings`. Each title ends with the person's initials:

- `ORDERS-{XX}`: how the person wants sessions to work with them;
- `MANDATE-{XX}`: what a session may decide or do on the person's behalf, and what needs the person's word;
- `SETUP-{XX}`: the person's machines, accounts and local hazards;
- `MISSIONS-{XX}`: one row for each Mission the person takes part in, which the plugin's skills and commands write when a Mission is created, hands over and closes.

**Create them once.** Run the skill `mc-cre-settings-v17 {Full Name}` in your own session. It creates the collection and the four documents from the templates the harness holds; where your collection already stands, it adds only what is missing.

**Change them through the plugin.** `mc17 settings` reads the four documents and makes every change the plugin makes to them. Every new entry is shown to you whole, as it will land, and is written only once you confirm that text. `ORDERS`, `MANDATE` and `SETUP` hold only what is about you and holds in every Mission; a project's facts, such as its paths, repositories and names, stay in that Mission's own documents. `mc17 settings --check` compares the `MISSIONS` table with every Manifest that names you, and changes nothing. Ask for "review my settings", or run `mc-adv-settings-v17 review`, for a review by independent agents.

**At every session start**, the plugin's hook delivers the four documents whole, in labelled parts. Every line the hook writes itself opens `[MC settings]`. Where the hook does not deliver your `MANDATE` whole, a session sends nothing to production or to other people, and gives no approval in your name, until it has read it.

**Sharing.** Sharing the collection in CanonQ lets a colleague edit its documents. CanonQ keeps every version of each, and a colleague's edit reaches every session at its next start, which names it to you.

**Each machine** needs no other setting once the plugin is installed and the client is signed in. For a session in which no plugin hook runs, keep this one line in `~/.claude/CLAUDE.md`:

```
Where no line opening [MC settings] stands in this session's context, the session reads the person's settings with mc17 settings before its first act, or, where the plugin is not loaded, through its CanonQ connector from the one restricted MC Settings collection the person names, and, until it has read MANDATE, sends nothing to production or to other people and gives no approval in the person's name, unless the person's word in the chat names that one act.
```

## Where to read more

The guide to the skills and the method is `GUIDE.html` in this folder. Open it in a browser.

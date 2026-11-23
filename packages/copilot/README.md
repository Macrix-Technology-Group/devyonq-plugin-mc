# devyonq-mc for GitHub Copilot

**Reader:** a person who runs Missions under Mission Control v1.7 with GitHub Copilot, in the Copilot CLI or in VS Code.
This page says how to install the plugin in each client, how its client signs in to DevyonQ, what the hooks do, and what
runs differently from Claude Code.

## What this plugin is

This is the GitHub Copilot package of `devyonq-mc`, one Agent Plugins 1.0 package that both clients read. It holds the
same skills, the same gate hooks and the same client `mc17` as the Claude Code package, and one
custom agent of its own. The harness itself runs in DevyonQ. Every skill and every hook calls the client, and the client
sends each command to the harness gateway of your DevyonQ tenant, under the sign-in it keeps on your computer. The
harness reads and writes the Mission's documents in CanonQ and answers the client.

A Mission belongs to one line of Mission Control for its lifetime, on whichever host you run it.

## What you need

- **The Copilot CLI, or VS Code** with GitHub Copilot, signed in to an account with Copilot.
- **Node 22 or later**, for the client.
- **Python 3**, for the gate hooks. With no Python 3, the gates refuse a corpus write and a commit on a locked branch,
  naming the missing Python, and the chat lint lets the reply through.
- **git**, which the client reads a checkout with.
- **A DevyonQ seat.** Any active person of the tenant who holds a seat may run Missions with this plugin.

## Install in the Copilot CLI

```
copilot plugin marketplace add Macrix-Technology-Group/devyonq-plugin-mc
copilot plugin install devyonq-mc@devyonq-mc
```

The first command adds the marketplace, `.github/plugin/marketplace.json`, which serves this package from
`packages/copilot/`. The second installs it. Start a new session afterwards so it loads the skills, the hooks and the
agent. `FILES.lock` at the package's root lists every file of the package with its SHA-256, so you can compare an
installed copy with the package of a release.

## Install in VS Code

Agent plugins are a preview feature of VS Code. Turn them on with the setting `chat.plugins.enabled`, and add the
marketplace to the setting `chat.plugins.marketplaces`:

```json
"chat.plugins.marketplaces": ["Macrix-Technology-Group/devyonq-plugin-mc"]
```

Then search the Extensions view for `@agentPlugins` and install `devyonq-mc`.

Run the skills in a chat whose session target is **Local**. The hooks of this package are written for VS Code's Local
agent; a session that runs on another harness reads its hooks in a form of its own.

The two agent skills start a subagent through the tool `runSubagent`. Where it is off, open **Configure Tools** in the
chat and turn on **Run Subagent**.

## Sign in

The client signs you in to DevyonQ once per computer. Run it yourself, in a terminal outside the AI tool, from the
folder Copilot installed the plugin into, such as `~/.copilot/installed-plugins/devyonq-mc/devyonq-mc/`:

```
client/mc17 login
```

On Windows, from PowerShell or cmd, run `client\mc17.cmd login`. Your browser opens: sign in to DevyonQ, pick your
tenant, and approve the sign-in. To skip the pick, add `--tenant <tenant>`, where `<tenant>` is your tenant's id;
`https://app.devyonq.ai/choose-tenant` lists your tenants with their ids to copy. The client keeps the sign-in in the
credential store of your operating system. No token goes into an environment variable or a file a tool may read back.

A session started on a computer that is not signed in yet says so at its start, with the exact command for that
computer; Mission skills and `mc17` commands wait until you are signed in.

`client/mc17 version` prints the plugin's version, the contract the client carries and the DevyonQ it is signed in to,
and sends nothing. `client/mc17 logout`, run the same way in your own terminal, signs the computer out.

## The hooks

Both clients read the one hook file `com.github.copilot/hooks/hooks.json`. Each entry carries each client's own command
keys: the Copilot CLI runs `bash` and `powershell`, and VS Code runs `command`, `windows`, `linux` and `osx`. Each
client's commands name that client's dialect file, `com.github.copilot/hooks/dialect-cli.json` or
`dialect-vscode.json`, which `hooks/dialect.py` reads to hand each gate the payload it reads.

| Event | Gate | What it does |
|---|---|---|
| `PreToolUse` on a file or shell tool | the secret gate | refuses a call that reaches what the client keeps: its credential store, its folders, `mc17 login` and `mc17 trust` |
| `PreToolUse` on a CanonQ write tool or the shell tool | the document gate | refuses a corpus write whose body breaks the writing rules |
| `PreToolUse` on the shell tool or a subagent start | the branch gate | refuses a commit or merge on a locked Mission branch without the wave token |
| `PreToolUse`, `PostToolUse` and `SubagentStop` | the heavy-run hook | refuses the start of a heavy run in a wave run by hand that no decision of `mc17 converge evaluate --point heavy-run` names, and marks the ends it sees |
| `Stop` | the chat lint | reports each writing rule the reply breaks, once, and blocks nothing |
| `SessionStart` | the settings hook | hands the session your settings, below |

Each hook runs `hooks/mc17-gate`, and on Windows `hooks/mc17-gate.cmd` through `cmd.exe`, which finds a Python 3 and
runs `hooks/dialect.py`.

VS Code marks its hooks as a preview. With the hooks off, the writing rules still hold for every governed document:
`mc17 create` and `mc17 amend` lint the whole body and refuse a text that fails, naming the finding.

## Your settings at the start of a session

At the start of each session the plugin hands the session your settings, the four documents of your settings
collection in CanonQ, in nineteen parts: a head, then the parts of `ORDERS`, `MANDATE`, `SETUP` and `MISSIONS`. One
`SessionStart` entry delivers them all in one process, as one JSON object whose `additionalContext` carries the text.
The Claude Code package delivers the same parts through nineteen entries; this package uses one because the Copilot CLI
starts a hook file's entries one after another.

Each part keeps its own lines and its own hook record, and a part whose read fails names that in its own record while
the others arrive. The entry's time limit is 15 seconds. `node <the plugin's folder>/hooks/mc17-node.js settings
--measure` runs the entry as each client runs it and prints the record of each part.

## Fewer approval prompts

Copilot asks you to approve each shell command it runs, unless a rule you gave allows it. The skills run each `mc17`
command as a shell call of its own, with nothing chained to it, so one rule can cover them all:

1. Put the plugin's `client` folder on your PATH, so the commands read `mc17 ...`. In PowerShell, for the current user:

   ```
   $user = [Environment]::GetEnvironmentVariable('Path', 'User')
   [Environment]::SetEnvironmentVariable('Path', "$user;$HOME\.copilot\installed-plugins\devyonq-mc\devyonq-mc\client", 'User')
   ```

   Open a new terminal afterwards, and check with `Get-Command mc17`.
2. Start Copilot with a rule that allows `mc17` and nothing else:

   ```
   copilot --allow-tool='shell(mc17:*)'
   ```

   The rule holds for that session only. Do not put it into a shell alias: an alias grants it at every start.

Where a prompt still appears, read the program name it shows. A line that chains commands, or that calls the launcher
through a variable or behind `&`, carries no single program name, and no rule matches it; tell the agent to run the
`mc17` command on its own.

## Waves run by hand

This package carries no fleet runner. A Wave Plan on Copilot runs by hand: you, or the agent at your request, run each
stage's commands in turn, and the heavy-run hook asks for a decision of the judgment module before each heavy run. A
Mission whose waves run on Copilot declares that in its Manifest, which `mc-cre-mission-v17` writes and
`mc-vf-manifest-v17` checks.

## The two agent skills

`mc-adv-review-v17` and `mc-plain-v17` each start this package's custom agent, `mc-independent`
(`com.github.copilot/agents/mc-independent.agent.md`), as a subagent that carries nothing of your conversation, hand it
the brief, and wait for its return. Where your client cannot start it so, each skill writes the brief to a file and
hands it to you to run in a new session, and publishes nothing until you bring that session's return.

## Where to read more

The skills and the method are the same on every host. The guide to them, `GUIDE.html`, ships in the Claude Code
package; this package does not carry it.

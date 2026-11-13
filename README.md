# devyonq-mc, the Mission Control plugin of DevyonQ

**Reader:** a person who installs the Mission Control plugin in Claude Code or GitHub Copilot. This page says how to
install it, what it needs, and how to sign in to DevyonQ.

This repository holds release 0.2.6 of the plugin `devyonq-mc`: the packages each host installs, and the
marketplace files that point the host at them. The plugin carries the Mission Control skills, the gate hooks and the
client `mc17`. The harness the skills call runs in [DevyonQ](https://app.devyonq.ai), so you need a DevyonQ seat to run
Missions with it.

The plugin's source is kept in a repository of its own. This one holds what an install reads, and each release
replaces it whole.

## Install in Claude Code

```
/plugin marketplace add Macrix-Technology-Group/devyonq-plugin-mc
/plugin install devyonq-mc@devyonq-mc
```

Start a new session afterwards, so it loads the skills and the hooks. Claude Code installs the plugin into
`~/.claude/plugins/cache/devyonq-mc/devyonq-mc/<version>/`.

## Install in the GitHub Copilot CLI

```
copilot plugin marketplace add Macrix-Technology-Group/devyonq-plugin-mc
copilot plugin install devyonq-mc@devyonq-mc
```

Start a new session afterwards. The Copilot CLI installs the plugin into
`~/.copilot/installed-plugins/devyonq-mc/devyonq-mc/`.

## Install in VS Code with GitHub Copilot

Agent plugins are a preview feature of VS Code. Turn them on with the setting `chat.plugins.enabled`, and add this
repository to the setting `chat.plugins.marketplaces`:

```json
"chat.plugins.marketplaces": ["Macrix-Technology-Group/devyonq-plugin-mc"]
```

Then search the Extensions view for `@agentPlugins` and install `devyonq-mc`. Run the skills in a chat whose session
target is **Local**.

## What you need

- **Node 22 or later**, for the client.
- **Python 3**, for the gate hooks.
- **git**, which the client reads a checkout with.
- **A DevyonQ seat.** Any active person of a DevyonQ tenant who holds a seat may run Missions with this plugin.

## Sign in

The client signs you in to DevyonQ once per computer. Run it yourself, in a terminal outside the AI tool, from the
folder the host installed the plugin into:

```
client/mc17 login
```

On Windows, from PowerShell or cmd, run `client\mc17.cmd login`. Your browser opens: sign in to DevyonQ, pick your
tenant, and approve the sign-in. To skip the pick, add `--tenant <tenant>`, where `<tenant>` is your tenant's id;
`https://app.devyonq.ai/choose-tenant` lists your tenants with their ids to copy. The client keeps the sign-in in the
credential store of your operating system.

`client/mc17 version` prints the plugin's version and the DevyonQ the client is signed in to. `client/mc17 logout`, run
the same way in your own terminal, signs the computer out.

## What is here

| Path | What it holds |
|---|---|
| `.claude-plugin/marketplace.json` | the marketplace Claude Code reads |
| `.github/plugin/marketplace.json` | the marketplace GitHub Copilot reads |
| `packages/claude-code/` | the Claude Code package |
| `packages/copilot/` | the GitHub Copilot package |
| `CHANGELOG.md` | what each release changed |

Each package's `FILES.lock` lists every file of the package with its SHA-256, so you can compare an installed copy with
the release.

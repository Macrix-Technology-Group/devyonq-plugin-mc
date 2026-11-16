# devyonq-mc

The Mission Control plugin of DevyonQ for Claude Code and GitHub Copilot. It holds the Mission Control skills, the gate hooks and the client `mc17`, which sends each command to the harness in [DevyonQ](https://app.devyonq.ai).

## What you need

- **Node 22 or later**
- **Python 3**
- **git**
- **A DevyonQ seat**

## Install in Claude Code

```
/plugin marketplace add https://github.com/Macrix-Technology-Group/devyonq-plugin-mc
/plugin install devyonq-mc@devyonq-mc
```

Start a new session afterwards. The plugin's folder is `~/.claude/plugins/cache/devyonq-mc/devyonq-mc/<version>/`.

## Install in the GitHub Copilot CLI

```
copilot plugin marketplace add https://github.com/Macrix-Technology-Group/devyonq-plugin-mc
copilot plugin install devyonq-mc@devyonq-mc
```

Start a new session afterwards. The plugin's folder is `~/.copilot/installed-plugins/devyonq-mc/devyonq-mc/`.

## Install in VS Code with GitHub Copilot

In the Copilot chat:

```
/plugin marketplace add https://github.com/Macrix-Technology-Group/devyonq-plugin-mc
/plugin install devyonq-mc@devyonq-mc
```

Start a new chat afterwards. Run the skills in a chat whose session target is **Local**. If a review skill can't start its subagent, open **Configure Tools** in the chat and turn on **Run Subagent**.

## Sign in

The first time you start a session after installing, the plugin asks you to sign in to DevyonQ. On Windows and macOS a window opens and starts the sign-in for you: your browser opens, you sign in to DevyonQ, pick your tenant, and approve. On Linux, the session shows the command to run.

To sign in by hand, run this in a terminal outside the AI tool, from the plugin's folder:

```
client/mc17 login
```

On Windows, run `client\mc17.cmd login` from PowerShell or cmd.

To check the sign-in, run `client/mc17 version`. To sign out, run `client/mc17 logout`.

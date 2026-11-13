---
name: mc-cre-settings-v17
description: "Create a person's settings in CanonQ once, in that person's own session and on their word: the restricted collection `MC Settings {Full Name}`, filed under `DevyonQ Settings`, with the four documents `ORDERS`, `MANDATE`, `SETUP` and `MISSIONS`, or the documents a standing collection lacks. One program does the work, `mc17 settings --create`, and the skill passes each of its three flags only on the person's word: the full name kept as given, a near miss filed, and a new collection once the person has checked the app. The report ends with the one line each machine keeps in `~/.copilot/copilot-instructions.md` for the Copilot CLI and `~/.copilot/instructions/mc-settings.instructions.md` for VS Code. Triggers on \"create my settings\", \"set up my settings\", \"mc-cre-settings-v17\". Argument: the person's full name."
---

# mc-cre-settings-v17

Read this file to the end before acting. The settings belong to the person whose credentials the session holds, and this skill writes them only through one program, which holds every refusal itself. `mc17` is the launcher `client/mc17` two levels above this skill's folder, from a POSIX shell, Git Bash included, and `client/mc17.cmd` from PowerShell or cmd.

```
mc-cre-settings-v17 v0.1.0 (MC 1.7 - CanonQ-native)
Parameters: ?  |  Full Name (required: the person's full name, as their four documents will carry it)
Mechanical half: mc17 settings --create, with --name-as-given, --adopt and --checked added on the person's word.
```

Run with `?`, the skill prints the block above and runs nothing.

## The command line

**One line runs the program.** The session fills in the full name and runs:

`mc17 settings --create "{Full Name}"`

**The shell.** Each line of this skill is a POSIX shell line. The session runs it with its Bash tool: Git Bash on Windows, zsh on the Mac. The parentheses keep the credentials the dot loads inside the one line.

**A machine with no sign-in.** Where `mc17` reports that it holds no sign-in, the line stops before anything is sent. The session tells the person to run `mc17 login` in a terminal of their own, and stops.

**Where the permission mode stops the line.** Where the session's permission mode refuses a line of `mc17 settings`, the session shows the person that one line and what it does, and runs it only once the person has run it or sent it back. The sign-in stays the person's own: the session never runs `mc17 login` or `mc17 trust`.

**The full name.** It stands in double quotation marks as one word of the line. Where the name holds a double quotation mark, a `$`, a backtick or a backslash, the session asks the person to give the name without that character.

**The three flags, each on the person's word.** The session adds a flag before the closing parenthesis only after the person's word for it, and where the person gave two words, both flags stand on the one line:

- `--name-as-given`, on the person's word that the full name stands as given (Step 1);
- `--adopt {collection_id}`, with the id of the one near miss the program named, on the person's word to file it (Step 5);
- `--checked`, on the person's word given after the question to check the app (Step 7).

## Step 1 - Whose settings

The program takes the login from the corpus, the `user.id` of the account answer, and from no argument and no memory of this session. Where the full name differs from the account's name, it prints both names and writes nothing, and the session shows the person both and passes `--name-as-given` only on the person's word that the full name stands as given.

## Step 2 - The refusals before any write

Where the session holds no credentials, or the account's rights lack `create-collection` or `upload`, the program refuses before any write and names what is missing, and the session reports the refusal and stops.

## Step 3 - A collection that passes

Where one collection passes the test, the program adds only the documents missing from it, leaves every standing document as it is, and names what it added; where two or more collections pass, it writes nothing and names each one.

## Step 4 - The near misses

The program names each near miss, a collection the account owns that is titled `MC Settings ...` or filed under `DevyonQ Settings` and fails a part of the test, with each part it fails and the person's remedy in the app for that part, and creates no collection while one stands.

## Step 5 - Filing a near miss

The session files a near miss under `DevyonQ Settings` only on the person's word, with `--adopt` and the id the program named; where that collection stands open to others, the program says that an administrator restricts it, and it adds the missing documents only once the collection passes the test.

## Step 6 - Other initials

Where the collection holds a settings document whose initials differ from those of the full name, such as `ORDERS-AE` beside the name `Ben Carter`, the program adds nothing and names that document.

## Step 7 - A new collection

Where no collection passes and no near miss stands, the program first says that a collection an administrator moved to another owner or to the confidential tier does not show, and writes nothing; the session then asks the person to check their collections in the app, and passes `--checked` only on the person's word given after that question.

## Step 8 - The report

The report gives the person the one line to keep in `~/.copilot/copilot-instructions.md` for the Copilot CLI and `~/.copilot/instructions/mc-settings.instructions.md` for VS Code on each machine where their sessions run, word for word:

```
Where no line opening [MC settings] stands in this session's context, the session reads the person's settings with mc17 settings before its first act, or, where the plugin is not loaded, through its CanonQ connector from the one restricted MC Settings collection the person names, and, until it has read MANDATE, sends nothing to production or to other people and gives no approval in the person's name, unless the person's word in the chat names that one act.
```

**The rest of the report.** It names, each as the program printed it:

- the collection's title, its id and its link, `https://{host}/collections?collection={collectionId}`, with the host the program printed;
- each document's title and asset id, marked `Added` or `Standing`;
- the login and the account's name;
- the host;
- each near miss, with the parts it fails and the remedy for each;
- where the machine named no settings instance before, that the program wrote `~/.canonq/settings-instance`, which now names the CanonQ instance that holds the person's settings.

## Rules this skill cannot check

- Whether the full name is the person's own: the person's alone to say.
- Whether the person checked their collections in the app before giving the word for `--checked`.
- Whether each machine keeps the one line in `~/.copilot/copilot-instructions.md` for the Copilot CLI and `~/.copilot/instructions/mc-settings.instructions.md` for VS Code.
- Whether the person shares the collection with anyone: sharing happens in the app, and a colleague's edit reaches every session at its next start.

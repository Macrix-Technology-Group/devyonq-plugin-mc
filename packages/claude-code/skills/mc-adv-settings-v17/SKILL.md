---
name: mc-adv-settings-v17
description: "The two acts on a person's settings in CanonQ, each in that person's own session. Mode `entry` writes each new entry of `ORDERS`, `MANDATE` or `SETUP` only after the person confirms its whole text, as it will land, and an entry without the person's own words first passes an adversarial check by an independent agent, whose result stays as a document in the person's collection; a retirement lands on the person's own words of retirement. Mode `review` runs two reviewers and a verifier for each, all independent agents, publishes the review in the person's own collection and gives the person its link. Every write runs `mc17 settings`. Triggers on \"write this into my orders\", \"add this to my mandate\", \"add this to my setup\", \"retire this rule\", \"review my settings\", \"mc-adv-settings-v17\". Arguments: the mode, `entry` or `review`; for `review`, the person's ask in their own words or a closure record `VF-{SCOPE}-001 record {n}`."
---

# mc-adv-settings-v17

Read this file to the end before acting. A person's settings change only on that person's word, and every write goes through one program, `mc17 settings`, which proves what it wrote. `mc17` is the launcher `client/mc17` two levels above this skill's folder, from a POSIX shell, Git Bash included, and `client/mc17.cmd` from PowerShell or cmd.

```
mc-adv-settings-v17 v0.1.0 (MC 1.7 - CanonQ-native)
Parameters: ?  |  mode (entry | review, no default: the person's ask decides it)  |  order (mode review: the person's ask in their own words, or a closure record VF-{SCOPE}-001 record {n})
Mechanical half: mc17 settings with --show, --show --out, --keep, --entry and --retire in mode entry, and --export and --review in mode review.
```

Run with `?`, the skill prints the block above and runs nothing.

**How the person asks.** In their own words, which the triggers above carry, such as "write this into my orders" or "review my settings", or by naming `mc-adv-settings-v17` with the mode. The ask decides the mode, and the skill has no default.

## Mode entry

**What this mode writes.** One new entry of `ORDERS`, `MANDATE` or `SETUP`, or the retirement of one entry. The session writes the entry file with its Write tool, so every letter, quotation mark and backslash of the person's words arrives as given. Its fields:

- `document`, `section`, `title`, `rule`, `why` and `how`;
- `confirmed`, with `date` and `shown`;
- either `words`, a list of `{ dates, text }` with the person's own words, or `source`, where the entry comes from in plain words, and `check`, the title of the kept result;
- `seen`, where another editor's version stands (below).

**The lines of this mode.** The session fills in the files and the folder and runs:

- `mc17 settings --show {entry_file}`
- `mc17 settings --show {entry_file} --out {folder}`
- `mc17 settings --keep {folder}`
- `mc17 settings --entry {entry_file}`
- `mc17 settings --retire {retire_file}`

**The shell.** Each line runs `mc17` through its launcher with the session's Bash tool: Git Bash on Windows, zsh on the Mac, or `client/mc17.cmd` from PowerShell. The client holds the sign-in, so no credentials travel on the line. Where `mc17` reports that it holds no sign-in, the session tells the person to run `mc17 login` in a terminal of their own and stops; it signs in for nobody.

**When the permission mode stops an entry's line.** Where the session's permission mode refuses a line of `mc17 settings`, the session shows the person that one line and what it does, and runs it only once the person has run it or sent it back. The sign-in stays the person's own: the session never runs `mc17 login` or `mc17 trust`.

### Step 1 - The first showing

Every entry, one that carries the person's words included, is shown to the person whole, as it will land, before it is written.

The session sets `confirmed.date` to the day it asks and runs the `--show` line. The command lints the entry, and first applies the guard, the check that refuses a project's facts in the text around the person's words.

- **On a refusal of the guard,** the session rewords the text around the person's words, or moves the fact into the person's own words where the person wants it there.
- **Where `--show` reads no scope** from the person's `MISSIONS` table, the session tells the person that the guard knows none of their Missions' scopes yet.

### Step 2 - The adversarial check

For an entry without the person's words, before the person is asked to confirm, an agent in a separate context, which wrote none of the entry, checks the entry less its words line against the rule of what the settings hold, the truth of its claims, every other entry of the person's documents, and the document it goes into.

The session takes these acts in this order:

1. It writes an evidence file for each claim of the entry under `{folder}/evidence/`, where `{folder}` is a new, empty folder in its scratchpad, and runs the `--show --out` line.
2. It starts the agent with the brief below and writes the agent's return into `{folder}/return.json`.
3. It runs the `--keep` line, which keeps the agent's result as a document in the person's collection: the kept result.
4. It writes the title `--keep` printed into the entry file as `check`, and runs the `--show` line again.

**The evidence of an entry's claims.** An evidence file is a text the session writes itself; it copies no file from `~/.canonq`, `~/.mc17` or `~/.claude` and no file that holds a key or a credential, and it states a key file's presence by its size alone, in its own words.

**The agent's start.** The session starts the agent in a context of its own, the way `mc-adv-review-v17` starts its reviewer: a fresh subagent with this brief, its two placeholders filled:

```
Brief: the agent of the adversarial check

1. The folder. You read one folder, {folder}, and nothing outside it. You are independent: you wrote none of the entry and none of the documents in the folder.
2. The text you check. read.json names the hash of entry.md as entry, and it reads {entry_hash}. Return that hash as checked.
3. The task. Judge the entry in entry.md against four things, and mark each claim of it that you found no evidence for:
   - the rule of what the settings hold, quoted whole: "ORDERS, MANDATE and SETUP hold only what is about the person and holds in every Mission; a project's or a Mission's facts, such as its paths, repositories, names, figures and record numbers, stay in that Mission's own documents, which the MISSIONS table links. This rule binds ORDERS, MANDATE and SETUP. A kept result of an adversarial check and a settings review are records about those three, and either may quote the project's fact an entry was refused for, or name the Mission whose closure ordered it."
   - the truth of its claims, read from the four documents and the evidence files under {folder}/evidence/;
   - every other entry of the four documents;
   - the document it goes into.
4. Read only. You call Read, Grep and Glob on the folder alone, and no other tool: no Write, Edit or NotebookEdit, no Bash or PowerShell, no Agent, and no tool of any CanonQ connector.
5. The return. Your last message holds one JSON object: checked, the hash above; result, one plain clause; and findings, each with against, what you judged the entry against, finding and evidence.
```

**Where this host starts no agent in a context of its own.** The session writes the brief, its placeholders filled, to a file in its scratchpad outside `{folder}`, hands the person the brief to run in a new session of the host over `{folder}`, and stops. It writes the return that session brings back into `{folder}/return.json` and runs the `--keep` line only once the person has brought it.

**A clause the lint refuses.** `--keep` names it. The session starts the agent afresh over the same folder and asks it to restate the clause.

**A finding of the check the lint refuses.** The session transcribes it with every claim kept, as `mc-adv-review-v17` transcribes a reviewer's return, and sets `transcribed: true` on that finding in `return.json` before it runs `--keep`, which then records in the kept result's transcription line that the session transcribed it. The check of an entry runs no verifier, so its clause and its findings are all of its return that the lint reads.

**The folder after an entry's check.** Where the check ends without a kept result, or the panel stops, the session deletes by name the files the command and the session wrote into the folder: the four copies, `entry.md` or `check.txt`, `read.json`, `ordered.json`, each return and each evidence file it wrote; then it removes the folder where it stands empty. It runs no recursive delete and removes nothing outside its scratchpad.

`--keep` removes the files it knows once the kept result is proven, then the folder where it stands empty.

**Where the hook refuses the agent of an entry.** Where the heavy-run hook refuses an agent start of this skill, the session names the refusal to the person, runs the agent steps from a session whose folder lies outside every checkout of a wave run by hand and every agent's path that an active `hand.json` lists, and records no settings act on any Mission's ledger.

A settings act is no act of a Mission, so it leaves no record on a Mission's ledger. The person opens a session in another folder, such as the home folder, and asks again.

### Step 3 - The showing beside the check

The session shows the person the entry's whole text, its document and its section as `--show` printed them, with that check's result beside it where the entry had one.

### Step 4 - A changed text

Where the person changes the text of such an entry, the changed text is checked again before the confirmation: the session writes the change into the file and goes back to the first step.

### Step 5 - The write

The session writes the entry only on the person's confirmation of that text, the checked text with its words line added, through the command, naming the confirmation with its date, and the check's result where the entry had one.

It sets `confirmed.shown` to the hash `--show` printed and runs the `--entry` line, which writes the entry and proves it.

- **A refusal of `--entry`** names what it found. The session shows the person the refusal, and starts again at the first step where the text must change.
- **A confirmation on a later day:** the session sets that day as `confirmed.date`, runs `--show` again and shows the text again before it runs `--entry`. The kept result still stands, since the agent read the entry without its words line.

### Step 6 - Several entries

One message of the person's confirms several entries only where each was shown whole, beside its own check where it has one.

### Step 7 - The agent's reach

The agent reads only the documents the session hands it and writes nothing to the corpus, while the session keeps its result as a document in the person's collection with `--keep`.

**Another editor's version.** Where the command refuses because another editor last edited the document, the session names that editor and that version to the person. Only then does it set `seen` to that version in the file. A write into `MANDATE` waits until the person's confirmation of that version has landed; the session records that confirmation as the line the hook prints at the session start says, and this skill gives no line for it.

**A retirement.** The session writes the retirement file with `document`, `entry`, `date`, the person's words of retirement verbatim with their dates as `words`, and `seen` where the step above asks for it, and runs the `--retire` line. A retirement carries no `confirmed` and starts no agent.

## Mode review

**What this mode writes.** One settings review, published once in the person's own collection. The session writes `{folder}/ordered.json` with its Write tool, in the fields `--review` reads: `ask` and `date`, the person's ask verbatim with its date, or `record`, the closure record in the form `VF-{SCOPE}-001 record {n}`. `{folder}` is a new, empty folder in the session's scratchpad.

**The lines of this mode.** The session fills in the folder and runs:

- `mc17 settings --export {folder}`
- `mc17 settings --review {folder}`

**The shell.** Both run `mc17` through its launcher with the session's Bash tool: Git Bash on Windows, zsh on the Mac, or `client/mc17.cmd` from PowerShell. The client holds the sign-in, so no credentials travel on the line. Where `mc17` reports that it holds no sign-in, the session tells the person to run `mc17 login` in a terminal of their own and stops; it signs in for nobody.

**When the permission mode stops a review's line.** Where the session's permission mode refuses a line of `mc17 settings`, the session shows the person that one line and what it does, and runs it only once the person has run it or sent it back. The sign-in stays the person's own: the session never runs `mc17 login` or `mc17 trust`.

### Step 1 - The ask

The person asks for the review in their own words, which this skill's triggers carry, or by naming `mc-adv-settings-v17 review`, and a closure act asks for it with its closure record, as in `mc-adv-settings-v17 review VF-{SCOPE}-001 record {n}`.

The ask goes into `ordered.json` as given.

### Step 2 - The panel

Two reviewers in separate contexts, none of which wrote a word of the documents under review, each read the folder alone.

### Step 3 - The verifiers

A verifier for each reviewer, in a separate context of its own, tries to refute each finding of that reviewer against its evidence and keeps what the evidence bears out.

### Step 4 - What the panel judges

Every entry of `ORDERS`, `MANDATE` and `SETUP` is held against the rule of what the settings hold, the truth of its claims and the other entries, and the `MISSIONS` table against its form and the output of `mc17 settings --check`.

### Step 5 - Whose settings

The review reads only the settings of the person whose session runs it: `--export` reads no settings collection but the one that passes the test for these credentials.

### Step 6 - The publication

The session publishes the review whole as a document in the person's collection, which only the person, and whoever the person shares it with, can open, with a provenance header that names who ordered it, each document it read by asset id and version, and the independence it stands on, and gives the person its link.

`--review` prints the review's title, its asset id and its link, `https://{host}/collections?doc={assetId}`, and the session gives the person that link.

### Step 7 - After the review

No document changes without the person's word: each change a finding proposes is written through the command on the person's word, a new or changed entry through mode `entry` and a retirement through `--retire` with the person's words of retirement.

**The order of the acts.** The session takes them in this order:

1. It writes the evidence files under `{folder}/evidence/` and runs the `--export` line, which writes the four documents, `check.txt` and `read.json` into the folder.
2. It starts the two reviewers, side by side where it can. Once both have returned, it writes their returns as `reviewer-1.json` and `reviewer-2.json`.
3. It starts the two verifiers, each with its own reviewer's findings, side by side where it can. Once both have returned, it writes their returns as `verifier-1.json` and `verifier-2.json`.
4. It runs the `--review` line, which publishes the review, removes the files it knows once the review is proven, then the folder where it stands empty.

**The returns of a round.** The session writes the returns of a round into the shared folder only once every agent of that round has returned, so no agent reads the return of another agent of its own round. A verifier reads its reviewer's findings, which the round before wrote.

**The evidence the panel reads.** An evidence file is a text the session writes itself; it copies no file from `~/.canonq`, `~/.mc17` or `~/.claude` and no file that holds a key or a credential, and it states a key file's presence by its size alone, in its own words.

**The briefs.** The session starts each agent in a context of its own: a fresh subagent with one of these briefs, its placeholders filled:

```
Brief: reviewer one of the settings review

1. The folder. You read one folder, {folder}, and nothing outside it. You are independent: you wrote none of the documents in the folder.
2. The task. Judge each entry of ORDERS, MANDATE and SETUP against the rule of what the settings hold, quoted whole: "ORDERS, MANDATE and SETUP hold only what is about the person and holds in every Mission; a project's or a Mission's facts, such as its paths, repositories, names, figures and record numbers, stay in that Mission's own documents, which the MISSIONS table links. This rule binds ORDERS, MANDATE and SETUP. A kept result of an adversarial check and a settings review are records about those three, and either may quote the project's fact an entry was refused for, or name the Mission whose closure ordered it." Judge the MISSIONS table against its form, one row per Mission with seven cells, and against the check's output in {folder}/check.txt.
3. Read only. You call Read, Grep and Glob on the folder alone, and no other tool: no Write, Edit or NotebookEdit, no Bash or PowerShell, no Agent, and no tool of any CanonQ connector.
4. The return. Your last message holds one JSON object with findings, each with id, names (the entry or the row), against, finding, evidence, and unevidenced set to true where you found no evidence for a claim.
```

```
Brief: reviewer two of the settings review

1. The folder. You read one folder, {folder}, and nothing outside it. You are independent: you wrote none of the documents in the folder.
2. The task. Judge each entry's claims of ORDERS, MANDATE and SETUP against their evidence, read from the four documents and the evidence files under {folder}/evidence/, and judge each entry against every other entry. Mark each claim you found no evidence for.
3. Read only. You call Read, Grep and Glob on the folder alone, and no other tool: no Write, Edit or NotebookEdit, no Bash or PowerShell, no Agent, and no tool of any CanonQ connector.
4. The return. Your last message holds one JSON object with findings, each with id, names (the entry or the row), against, finding, evidence, and unevidenced set to true where you found no evidence for a claim.
```

```
Brief: the verifier of reviewer {n} of the settings review

1. The folder. You read one folder, {folder}, and nothing outside it. You are independent: you wrote none of the documents and none of the findings in the folder.
2. The task. Read the findings of reviewer {n} in {folder}/reviewer-{n}.json. Try to refute each finding against its evidence in the folder, and keep what the evidence bears out.
3. Read only. You call Read, Grep and Glob on the folder alone, and no other tool: no Write, Edit or NotebookEdit, no Bash or PowerShell, no Agent, and no tool of any CanonQ connector.
4. The return. Your last message holds one JSON object with verdicts, one for each finding id, each with id, verdict set to kept or refuted, and reason.
```

**Where this host starts no agent in a context of its own.** The session writes each brief of the round, its placeholders filled, to a file in its scratchpad outside `{folder}`, hands the person each brief to run in a new session of the host, one session for each agent, and stops. It writes the returns those sessions bring back as the returns of the round, and runs the next step only once the person has brought every return of that round.

**A finding the lint refuses.** The session transcribes it with every claim kept, as `mc-adv-review-v17` transcribes a reviewer's return, and sets `transcribed: true` on that finding in `reviewer-{n}.json` before it runs `--review`, which names it in the review's transcription line.

**A verifier's reason the lint refuses.** The session transcribes the reason in `verifier-{n}.json` with every claim kept, and sets `transcribed: true` on the finding of `reviewer-{n}.json` that the verdict answers, so `--review` names that finding in the review's transcription line.

**The folder after a stopped panel.** Where the check ends without a kept result, or the panel stops, the session deletes by name the files the command and the session wrote into the folder: the four copies, `entry.md` or `check.txt`, `read.json`, `ordered.json`, each return and each evidence file it wrote; then it removes the folder where it stands empty. It runs no recursive delete and removes nothing outside its scratchpad.

A panel stops where an agent fails or the publication is refused, and the session then tells the person what was not published.

**Where the hook refuses the panel.** Where the heavy-run hook refuses an agent start of this skill, the session names the refusal to the person, runs the agent steps from a session whose folder lies outside every checkout of a wave run by hand and every agent's path that an active `hand.json` lists, and records no settings act on any Mission's ledger.

A settings review is no act of a Mission, so it leaves no record on a Mission's ledger.

**The cost of a review.** `--export` runs `mc17 settings --check`, which reads one document list for each collection the credentials can read.

## Rules this skill cannot check

- Whether the words in an entry are the person's own: only the person can tell, in the app.
- Whether a finding is right: the person triages the findings, and no finding changes a document by itself.
- Whether each agent stayed in its folder and called only the tools its brief names: the brief says so, and the kept result and the review record what each agent read.

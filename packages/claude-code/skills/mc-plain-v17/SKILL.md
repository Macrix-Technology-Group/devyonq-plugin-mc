---
name: mc-plain-v17
description: "Rewrite a draft in plain language for the person who reads it, before a governed document is created or its declared text is amended in a CANONQ-NATIVE v1.7 Mission (SPEC AC-24, ARCH D22, IP-MC171-016). Takes the draft as a file and the document's Reader line; spawns ONE agent in a SEPARATE context that wrote none of the draft; that agent rewrites the parts the author wrote, under editorial rules taken from the Werner Vogels persona and reasoning rules taken from the Simon Willison persona, reads harness/TERMS.json for what the plugin's words refer to, and may read the code within a stated limit; then runs `mc17 plain`, which confirms that the rewrite kept everything a program reads and writes the proof that `mc17 create` and an `mc17 amend` under `--jargon` ask for. One retry on a refusal, then the skill refuses. Triggers on \"plain language\", \"mc-plain-v17\", \"jargon2human\", \"rewrite for the reader\". Arguments: the draft file; optional the document's title."
---

# mc-plain-v17

Read this file to the end before acting. A person approves every governed document, and a person cannot approve what they cannot follow. The author of a draft has just read a thousand lines of code and writes in the code's words. Asked to translate the same text as a task of its own, in a context that did not write it, the same model produces a text a person can read. This skill is that task, and `mc17 plain` is the program that confirms nothing a program reads was lost on the way.

```
mc-plain-v17 v0.1.0 (MC 1.7 - CanonQ-native)
Parameters: draft (a file holding the whole draft)  |  title (the document's name, where the draft does not open with it)
Returns:    the rewrite as a file beside the draft, the proof file, and the agent's list of words it looked up and words it still doubts
```

`mc17` is the launcher `client/mc17` two levels above this skill's folder, from a POSIX shell, Git Bash included, and `client/mc17.cmd` from PowerShell or cmd.

## When this skill runs

This skill runs once per governed document, over the whole document, before its first independent review, and again only on the reader's word jargon, through `mc17 amend --jargon`. A scaffold that `mc17 create --scaffold` sent, an ARCH, a plan or the register of rulings, takes this pass at the first amend that moves its binding, over the whole filled document, through `mc17 amend --jargon`, and again at each such amend while a section still holds the template's placeholder; a name given with `--written-by` and `--manifest {manifest_asset_id}` does not stand in for it. The calling skill runs it between writing the draft and sending it, and `mc17 create` refuses a governed title without the proof. Every other change to what a document declares is sent by `mc17 amend` with no rewrite: the command runs the writing lint over the whole composed body and, for a document of the six classes (MANIFEST, SPEC, ARCH, IP, TP and WAVE-PLAN), finds the record of the one rewrite in the ledger. Three things need no pass:

- **A live-state edit.** A status line, a verification stamp, an approval entry and a row of a tracked table are sent with `--expect-binding unmoved` and no proof.
- **A text a person wrote.** It is sent with `--written-by <name> --manifest {manifest_asset_id}`. The command passes only a name the Manifest's Authorities section lists, and prints that name, so the exemption is visible.
- **A ledger record.** Records go through no create.

## Step 1 - Read the draft and its reader

Read the draft whole. Find its `**Reader:**` line; the first person that line names is the person the rewrite is for. Where the draft has no Reader line, stop and name that: a document that names no reader cannot be written for one.

Say what the rewrite may touch. It may touch every sentence the author wrote. It must leave alone the template's own text: the guidance paragraphs a template ships under its headings, the field tables, the Reader line, the AO line, the VF Stamp and the Approvals section.

**The Change Log row, which the calling skill writes before the pass.** Before the pass, the calling skill writes the Change Log row of this write: the draft, the CanonQ version the write creates, the parts the write changes by name, and the ledger records. The version is 1 for a create; for an amend it is the current version `mc17 versions <asset id>` prints, plus one. The calling skill then runs `mc17 lintdoc -f <draft.md>`, deletes each line the lint names under `history-prose`, and corrects the row where the lint names a cell.

## Step 2 - The rewriting agent, in a separate context

Spawn one agent in a context that wrote none of the draft: a fresh subagent with no memory of the author's session. The author never rewrites its own text through this skill. Hand the agent the draft file, the Reader line, the path of `harness/TERMS.json`, the path of the plugin's folder, the template the document was rendered from where one exists, which `mc17 render <kind>` reads in the engine, and the brief below, whole. For an amend under `--jargon`, the draft is the whole composed body, which `mc17 amend --dry --out <body.md>` writes from the edits.

Where this host starts no agent in a context of its own, write the brief to a file beside the draft, naming every path this step hands the agent, hand the developer the brief to run in a new session of the host, and stop. Publish nothing and append nothing until the developer brings back that session's return, the rewrite and the agent's list; then continue at Step 3 with it.

Every path in the agent's prompt must stand outside a worktree that is checked out on a locked mission branch: the branch hook, `hooks/lint-branch.py`, refuses a prompt that names one. Give the agent the installed copy of the plugin, the one this skill runs from, or an export of the draft's folder.

**The task.** Rewrite this draft for the first person its Reader line names. That person is busy, knows the business and may never have seen the code. Test each sentence: would it make sense to someone who never saw the code? Say who does what, when, and what for. Keep every name a builder needs to find a file, a command or a test. Write the rewrite to the file named, and change nothing else.

**What you leave alone.** The template's own text: the guidance paragraphs a template ships under its headings, the field tables, the Reader line, the AO line, the Change Log, the VF Stamp and the Approvals section. The template file you were given shows which text is the template's; where you were given none, a sentence that speaks to the author about what to write here is the template's. For an amend, the whole body is your text: the reader asked for it again, so rewrite it as you would a new document.

**The history of the document.** Delete each sentence that tells what an earlier text of this document said, how it changed, or what a review made it say, and write nothing in its place. Keep such a sentence as it stands where it carries an identifier, a record number or a figure, and name it in your list: the check that follows refuses a rewrite that drops one, and the author deletes the sentence. The Change Log row of this write refers to the earlier version by its CanonQ version number and names the parts the write changed. The author wrote that row before the pass; where it is missing, or a cell of the log holds a sentence, name it in your list for the author.

**What you must keep, exactly.** A program checks these after you, and refuses your rewrite where one is missing:

- every span in backticks: a file and line, an identifier such as `AC-24` or `T-61`, a command;
- every identifier outside backticks, such as AC-8, T-5, TC-R1, IA-3, D21 or IP-MC171-016, and every record number and every number written in digits;
- every heading, with its words and in the same order, and no heading added;
- every fenced block, whole, whether fenced with backticks or with tildes;
- every row of a table; every Test Plan entry, a list line that opens with a case id such as `- **T-61**`, `- TC-R1` or a backticked id, with the indented lines under it; the line `**Radius claimed:**`; the line `Cases assigned to the integration stage:`; and the lines `**Status:**`, `**Reader:**`, `**AO:**` and `**Move type:**`, each word for word;
- in a Wave Plan's section Stage prompts, every part label line, such as `- **Rules:**`, `- **Build:**`, `- **Review:**`, ``- **Lens `plan`:**`` or `- **Rereview:**`, and the line that opens `Rendered:`, each word for word;
- every paragraph that carries `**Stopped` or `**Started`, with that word and the names in backticks inside it. You may reword the rest of such a paragraph.

**The shape of the rewrite.** Give the rewrite this shape for its reader:

- a bold line for each decision or rule, stating it in plain words;
- one idea per paragraph;
- a list where the text enumerates;
- the mechanism, the why and the limit, each under its own lead-in;
- every command, file, field and value in a code span, which the viewer sets apart from the prose.

**Editorial rules, from Werner Vogels.**

1. One sentence says one thing. A sentence the reader must read twice has failed: split it or cut it.
2. No wasted words. "In order to" is "to". "It is important to note that" is deleted.
3. The exact word, never the impressive one. "Broke" beats "experienced a failure event".
4. Active voice, with the person or the program as the subject. "It was decided" becomes "the Technical Owner decided".
5. The reader is busy. The conclusion comes before the reasoning.
6. No contradictions, and one name for one thing from the first page to the last.
7. Before you hand it back, ask the seven questions: Can the reader understand the document from its headings alone? Does every section earn its place? Does every sentence say something new? Is every claim consistent with every other claim? Is the same thing called by the same name everywhere? Would the reader know what to do after reading it? Is it shorter than it could be?

**Reasoning rules, from Simon Willison.**

1. Every decision has a why, in the sentence beside it.
2. The alternatives the author weighed and set aside are shown, each with the reason.
3. What worries the author is said plainly, and so is what a rule does not keep.
4. Figures are concrete: seconds, counts, record numbers, never "faster" or "many". The reader of a figure wants to know what was measured and whether it got better or worse; a figure that leaves him without that answer is noise to him, however exact it is. Where a passage carries figures, ask what the reader would need to understand them, say that first, and let the figures serve it.
5. Add no claim the draft does not make. Where a decision lacks a why, an alternative or a worry, invent none: list that decision in your return as a gap for the author.

Take the rules and leave the two personas' document structures: the Mission's template holds the structure. Write no dashes longer than a hyphen, no metaphors and no slogans.

**The plugin's words.** `TERMS.json` says what each word of this plugin refers to and where it stands in the code: gate, verb, stand-in, binding, pin, break, drill, red run, ledger, stage and others. A word with several meanings carries each one. The file gives you no replacement words. Which words fit depends on the sentence and on the reader, and you choose them there. Write your own words first and the plugin's word after them where the reader must be able to find the thing.

**Reading the code, within a limit.** Where `TERMS.json` is silent on a word, or you are unsure and a wrong meaning would change what the sentence tells the reader, read the code. Read the copy of the plugin in the folder you were given. Start from the file and line the draft cites, or from the place the entry names. Read that function and never a whole file; `mc17` alone is about 110,000 tokens. Look up five words at most in one document. Guess no meaning: a word you still doubt after that goes into your list, and the sentence keeps the plugin's word in backticks.

**What you hand back.** The rewrite in the file named. Then a short list: each word you looked up and where you read, each word you still doubt, and each decision the draft states with no why.

## Step 3 - The check

**The history sentences the agent kept.** Where the agent's list names a history sentence it kept for its identifier, record number or figure, the calling skill deletes from the draft and from the rewrite each history sentence the agent's list names, before the check, so the two texts still hold the same identifiers, records and figures.

```
mc17 plain --draft <draft.md> --pass <rewrite.md> --out <proof.json>
```

Exit 0 means the rewrite kept everything a program reads, and the proof file names the draft and the rewrite by their hashes. Exit 1 names each thing the rewrite dropped, with the line of the draft it stood on, and each heading that moved; no proof is written. A rewrite that is its draft word for word is refused too, because no rewrite happened. The command judges no sentence. Whether the rewrite reads well is the reader's judgment.

**The passes.** The calling skill runs as many passes as `documents.plain-passes` asks, one by default: one rewrite per pass, each over the rewrite before it. The calling skill runs `mc17 plain` once per pass, and from the second pass on adds `--prior <proof.json>`, the proof of the pass before:

```
mc17 plain --draft <rewrite-1.md> --pass <rewrite-2.md> --prior <proof-1.json> --out <proof-2.json>
```

Where the wave's ruled plan sets `documents.plain-passes`, the calling skill adds `--plan {plan_asset_id}` to each run, and the command prints the count it read and `pass {k} of {n}`. The proof of the last pass is the one the send names.

## Step 4 - One retry, then refuse

On exit 1, hand the agent the command's output once, with the dropped things named, and ask for the same rewrite with those things restored. Run the check again. On a second exit 1 this skill refuses: report the output, send nothing, and leave the draft as it was. A third try would be the author and the agent wearing the check down.

A line reading `CHANGED` names a figure the rewrite changed: a number, a record, a version, a date or a hash. The command exits 0 and lists it in the proof, and `mc17 create` and `mc17 amend --jargon` refuse that proof. The calling skill hands each `CHANGED` line back to the agent, as it hands back a dropped thing, and asks for the draft's figure; the same one retry holds.

## Step 5 - Hand back

Return to the calling skill: the path of the rewrite, the path of the proof, and the agent's list, the decisions without a why included, which the author reads before the send. The caller then sends the rewrite and no other text:

```
mc17 create --title {TITLE} --collection {id} --file <rewrite.md> --plain <proof.json> --manifest {manifest_asset_id} --ledger {ledger_asset_id} ...
mc17 amend {asset_id} --edits <edits.json> --class artifact --expect-binding moved --jargon --plain <proof.json> --manifest {manifest_asset_id} --ledger {ledger_asset_id}
```

Where the wave's ruled plan sets `documents.plain-passes`, both send lines add `--plan {plan_asset_id}`, so the command compares the passes the proof records with the plan's row; without it the command reads the Manifest's row, or the default of one pass. Both commands refuse a send that names `--ledger` and no `--manifest`, because the Manifest's rows bind only where the call names both.

Before the send, run the same `amend` with `--dry`: it composes the edits, runs the writing lint over the whole composed body, the stored text included, names every hit by line and rule, and sends nothing. A hit on a line the edits did not touch stands in the stored text; repair it in the same edits file.

For an amend under `--jargon`, the draft and the rewrite are the whole body as it will stand after the edits, and the edits must compose exactly the rewrite: the command compares the hash of the composed body with the hash the proof names, and refuses where they differ. A proof taken over the body before the edit proves nothing about the body after it.

**The verification owed.** Where `mc17 amend` printed `VERIFICATION OWED NOW: {skill}` as its last line, run that skill over the document before this skill reports, and the calling skill reports after it; a line `NO VERIFIER: {class}` owes nothing.

Show the agent's list to the person running the session. Each word the agent looked up, and each word it doubted, marks an entry `TERMS.json` lacks or explains badly. Add or correct that entry in the next change to the plugin. Nobody keeps the file by duty; it grows from these lists.

## What stays the reader's

The reader's word "jargon" on any sentence sends the document back through this skill, however clean the check was. The check reads what a rewrite dropped. It cannot read a claim the rewrite added, so the independent review reads the document against the code, as before.

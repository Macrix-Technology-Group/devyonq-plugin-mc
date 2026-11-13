---
name: mc-cre-arch-v17
description: "Scaffold an ARCH (software architecture) document in a CANONQ-NATIVE v1.7 Mission, per Mission Definition v1.7 Section 4. Renders the engine's template arch (mc17 render arch) and creates it in one guarded act (mc17 create: render, lint, POST, hash proof), notes it beside the Manifest's tracked table with a guarded live-state amend, and appends a note record to the VF ledger where one exists. Every substantive section ships [TBD]: the architecture is the Technical Owner's to decide. Refuses on an Interface Mission and on a Mission whose Manifest declares it ships no code. Triggers on \"create arch v17\", \"mc-cre-arch-v17\", \"new arch under 1.7\". Optional argument = archnum (default 001)."
---

# mc-cre-arch-v17

Read this file to the end before acting. It is short on purpose: the mechanics it once would have narrated are single commands of `mc17`, and the file holds the judgment, the gates and the order. Every record this skill appends carries `recordedBy`, the name of the person or session that writes it down, on a ledger of either version.

`mc17` is the launcher `client/mc17` two levels above this skill's folder, from a POSIX shell, Git Bash included, and `client/mc17.cmd` from PowerShell or cmd. **A runner that hand-executes what a subcommand does has produced a figure nobody can check; where a command will not run, name the figure it owed and stop.**

## Parameters

- **?** - display the block below and stop.
- **archnum** (optional) - the ARCH sequence number, default `001`.

```
mc-cre-arch-v17 v0.1.0 (MC 1.7 - CanonQ-native)
Parameters: ?  |  archnum (default 001)
Mechanical half: mc17 (version, create, amend, fields, hash, status).
Siblings in this line: mc-vf-arch-v17 verifies what this creates; mc-apr-arch-v17 approves it.
Notion or v1.6 Missions: use mc-cre-arch (v1) or mc-cre-arch-v2.
```

## Step 0 - Which copy runs, which Mission, which line

1. `mc17 version`. The cache directory's name is evidence of nothing; the manifest beside the harness is what runs.
2. Resolve the Mission by exact title: `mc17 read search --q "MANIFEST-{SCOPE}-001"`. **The search is a candidate generator; the exact title comparison is the decision**, and a hit count equal to the cap the search answered at is inconclusive: narrow and re-run.
3. Read the Manifest's Methodology Reference. A v1.7 pin proceeds. A v1.6 pin routes to `mc-cre-arch-v2` and stops. No readable pin stops: a pin is declared, never reconstructed. Every call of this run goes against the corpus the Manifest names.

## Step 1 - The gates, before any question

- **Shape.** An Interface Mission has no ARCH. Refuse, quoting the Manifest's shape field.
- **A no-code Mission.** Where the Manifest's Work Modes omission note or Modules field says this Mission ships no code, refuse and quote the Manifest's own sentence. An ARCH for a Mission that builds nothing is a decision nobody made.
- **The number, read from both sources.** Where **archnum** was not given, run `mc17 nextnum ARCH --scope {SCOPE} --collection {collection_id} --repo <the repository the Manifest names>`. On exit 0 the sequence part of its answer is `{archnum}` from here on. On exit 1 the verb has refused, because the highest figure it found stands in a document's body and no filename and no document title holds it, so it is either a forward name announcing the very document you are about to create or a reference left behind by one that was deleted. The verb cannot tell those apart and does not guess. It prints both candidates and the file and line of the mention. Open that line and put both candidates to the author with what it says. Where no author is reachable, read the line yourself: where it plainly announces the document you are about to create, take candidate 1; otherwise stop and name the block. Where the mention is set aside, run again with `--accept-mention`, which takes the HIGHER figure and prints the acceptance on the answer so the record carries the deliberate act. A number chosen past a refusal without asking is how a document gets a number another document already announced (IP-MC17-022, DEFECT-MC17-009).
- **Collision.** `mc17 read search --q "ARCH-{SCOPE}-{archnum}"` as resolved above, exact title comparison. On a hit, stop and ask: next number, or abort.

## Step 2 - The interview, three questions

Ask one at a time; each is answerable in one line.

1. **The number:** the derivation gives `ARCH-{SCOPE}-{archnum}`. Does it stand?
2. **The AO:** default is the Manifest's default AO, offered. An AI-AO is refused here: the ARCH is an internal artifact of an Active Mission, and the law bars an AI steward for it.
3. **The Summary:** offer one drafted sentence from the Mission's own SPEC reference, or `defer`. A deferral takes the template's declared default, `[TBD]`, and the report names the gap and the owner.

The work mode is read from the Manifest's Work Modes table and never asked: the ARCH row where one stands, gated otherwise, by the undeclared-class rule.

## Step 3 - Create, in one guarded act

Build the answer set `{SCOPE, seq, ao_string, spec_asset_id, summary}` beside the run, `spec_asset_id` read from the Manifest's tracked table. Then:

**The scaffold goes out with no rewrite, and the filled document takes the plain-language pass.** `mc17 create` refuses a governed title without proof of the plain-language pass (`AC-24`), and a scaffold holds no sentence a rewriter may change, so the skill creates it with `--scaffold`: the command renders the body from the engine's template arch itself, sends it with no proof and records the write as a scaffold. Once the Technical Owner's sections are written, run the skill `mc-plain-v17` over the whole filled document, which `mc17 amend --dry --out <body.md>` writes, and send it with `mc17 amend --jargon --plain <proof.json>` before the ARCH's first review. Until that rewrite is on record, and while any section still holds the template's placeholder, `mc17 amend` refuses an edit of the declared text sent without `--jargon`, under `--written-by` with `--manifest {manifest_asset_id}` too, and names the scaffold record.

```bash
mc17 create --title ARCH-{SCOPE}-{archnum} --collection {collection_id} \
  --render arch --answers answers.json --scaffold --manifest {manifest_asset_id} --ledger {ledger_asset_id} --type ARCH --authority A1 --lifecycle draft \
  --scope-tags "{the Manifest's scope tags, comma-joined}" --domains "{the Manifest's domains}"
```

The command renders, lints, posts and proves the stored hash in one act; a non-zero exit is a refusal to read, never to work around. Record the asset id.

## Step 4 - The note beside the tracked table

The ARCH is not root-SPEC-spawned: it is tracked through the VF ledger and noted beside the Manifest's tracked table, and it holds no row in the declared table. One guarded live-state edit writes the note. The anchor on the first note of a Mission is the tracked table's LAST row line, whole (find = that line; replace = the line, a blank line, the note), and the standing note line afterwards; a legacy Manifest still carrying the HTML table anchors on its `</table>` line the same way (IP-MC17-014):

```bash
mc17 amend {manifest_asset_id} --edits note.json --class manifest --expect-binding unmoved
```

Before the send, run the same `amend` with `--dry`: it composes the edits, runs the writing lint over the whole composed body, the stored text included, names every hit by line and rule, and sends nothing. A hit on a line the edits did not touch stands in the stored text; repair it in the same edits file.

`note.json` appends, inside the tracked section: `**Ledger-tracked beside this table:** ARCH-{SCOPE}-{archnum} - asset {id} - AO {ao_string} - created {date}.` The AO rides in the note because `mc-vf-arch-v17` compares the ARCH's own AO line against it, and Seventeen-15 met a note with nothing to compare. The guard refuses before the write if the edit would move the binding, which is the machine catching a mis-anchored edit.

**The verification owed.** Where `mc17 amend` printed `VERIFICATION OWED NOW: {skill}` as its last line, run that skill over the document before this skill reports: the note is a live-state write and owes none; a line `NO VERIFIER: {class}` owes nothing.

## Step 5 - The ledger note, where a ledger exists

Where `VF-{SCOPE}-001` exists, append one `note` record with `mc17 append {ledger_asset_id} --record <record.json>`, the record written to a file first: kind `note`, verdict `NA`, `refs` leading with the ARCH, evidence carrying the `create` output verbatim. **Where no ledger exists**, the Mission has not had its first Manifest verification; say so, write nothing, and name the note as owed on the ledger's first existence. Never create the ledger: `mc-vf-manifest-v17` owns it.

## Step 6 - Report

Ids and hashes as the commands printed them; every `[TBD]` section named with its owner, the Technical Owner; the work mode recorded and its source; the owed next steps: the TO decides the architecture, `mc-vf-arch-v17` verifies it, `mc-apr-arch-v17` approves it, and the Modules adoption into the Manifest happens at approval, never here.

## Rules this skill cannot check

- Whether the architecture is right, adequate or complete: the TO's, at writing and approval.
- Whether the Ordering Constraints section names every real constraint: the TO's; the wave skills read what stands there and cannot see what does not.

---
name: mc-vf-manifest-v17
description: "Verify a Manifest pinned to Mission Control v1.7 against the Mission Definition. Reads MANIFEST-{SCOPE}-001 with mc17 read document, stamps it with mc17 amend, and keeps the VF ledger, a JSON asset bound to ledger-hybrid-v1.schema (created with mc17 upload, appended with mc17 append). The mechanical half is mc17: content hash, binding projection, field checklist, scope-tag and naming checks; the skill judges. A v1.7 Living or trial pin verifies, a v1.6 pin routes to the v2 family without a record, and a Manifest with no readable pin stops without one. Triggers on \"verify manifest v17\", \"mc-vf-manifest-v17\", \"verify v1.7 manifest\", or any request to verify a Manifest pinned to Mission Control v1.7."
---

# MC VF Manifest v17 - Manifest-Mission Definition Alignment Verification (Mission Control v1.7)

Read this file to the end before acting. One read returns a fraction of it, and a runner acting on the first page verifies against a checklist it has read and then writes a ledger to rules it has not. Page the remainder with `sed -n` before Step 1, and take the file's length from `wc -l` at the moment of reading. Every record this skill appends carries `recordedBy`, the name of the person or session that writes it down, on a ledger of either version.

## The mechanical half of this skill is a program

**Every pure function this skill once carried as prose lives in `mc17`, and this skill calls it. The program is the authority on what it computes.** A runner that hand-executes what the program does has produced a figure nobody can check.

A recipe transcribed into a document drifts from the code it describes, and when it drifts the declaration and the check drift together, so the check certifies the drift and the verification passes. The sanctioned-block hash did exactly that: a transcribed `grep -v '^#'` pipeline drops shell comments and therefore drops nothing from a JavaScript runner, and 325 lines of difference went unseen.

**The tool reports. This skill judges.** Nothing in `mc17` decides a Pass or a Fail. It answers presence, placeholder state, hashes, counts and conformance. Every disposition, every fail rule and every question put to a human stands in this file.

The program is the launcher at `../../client/mc17` relative to this file (`client/mc17.cmd` from PowerShell or cmd). There are no credentials to load: the person signs in once with `mc17 login` in a terminal of their own, and every command uses that session. A machine where `mc17` reports no sign-in stops and tells the person to run `mc17 login` themself. `--json` works on every subcommand, and `-f <file>` reads a local body in place of an asset id.

Each subcommand exits non-zero when its own self-check fails, and `mc17 check` also exits 1 on any row it prints as `FAIL` or `READ FAILURE`, which the checklist below judges. Read the exit code beside the output.

**Where the tool cannot run** - `bash_tool` unavailable, node absent, the file missing, or a sign-in that reaches no corpus - **report that the figure could not be computed, name which figure, and stop.** A hand-computed substitute is never offered as equivalent to it. The binding has one lawful substitute and one only, the stated fallback binding of 5b, which the record names as such.

**Two traps the program closes, kept here as warnings because a runner who works around the program meets them again.** Over REST, `content` comes back as the JSON object `{"markdown": "..."}` for every markdown asset `mc17 create` writes; hashing the response, or hashing that object as JSON text, yields 64 hex characters of the wrong bytes, and nothing downstream catches it. The MCP return carries the mirror trap: a metadata block whose `lastEdited` moves on a read that changed nothing, so a binding taken over it stales every approval while the corpus stands still. `mc17` extracts the body and runs the `head -c 80` self-check on every read. A figure produced by any other route is not this skill's figure.

## Parameters

- **?** - Display skill version, Mission Control version, and parameter list. Example: `mc-vf-manifest-v17 ?`
- **manifest** (optional) - Asset title (`MANIFEST-{SCOPE}-001`), asset id, or Mission/collection name of the Manifest to verify. If omitted, resolved from selected documents or conversation context.

When invoked with `?`, respond with:

```
mc-vf-manifest-v17 v0.3.0 (MC 1.7 - CanonQ-native)
Parameters:
  ?          Show this info
  manifest   Manifest asset (title / id / Mission name). Optional; resolved from context if omitted.
Mechanical half: mc17 (hash, binding, check, status, machinery, linkpass, rights, identity, rulings).
Sibling family: mc-vf-manifest-v2 (MC 1.6, CanonQ-native), mc-vf-manifest (MC 1.6, Notion).
Installed siblings in this line: mc-cre-mission-v17.
```

Do not run verification. Stop after displaying the info.

## Purpose

This skill implements the first verification edge in the Mission Control v1.7 verification chain: **Manifest against Mission Definition**. It checks that a Mission's Manifest is well-formed, complete, and compliant with the v1.7 Mission Definition before any declared spawned document may be verified.

**Coexistence.** Mission Control v1.6 with its v1 and v2 skill families is a complete, valid, running system, and it stays installed. This skill is a member of a second complete family beside it. A Mission belongs to one line for its lifetime. This skill never touches a v1.6 Mission and never resolves to a v1.6 pin: it routes such a Mission to the family built for it and writes nothing.

**Reader.** This skill's output has two readers. The Business Owner and the Technical Owner read the run summary to learn whether the Manifest holds, what is owed, and what is theirs to decide. The VF ledger, a later fleet, and an audit read the record for the evidence: the binding, the findings, the judgments the skill declined to make. Both readings are produced. The summary comes first and is written in human language.

## Prerequisites

The run uses these `mc17` commands, each under the session the person opened with `mc17 login`:

- `mc17 read search`, `mc17 read collections`, `mc17 read collection` (target resolution, the collection census and the corpus-wide APR search)
- `mc17 read document` (the Manifest, every governed artifact of the collection, the three pinned documents and the ledger schema), and `mc17 read record` and `mc17 read tail` (the ledger's records)
- `mc17 upload` (VF ledger creation, first run - the ledger is a JSON asset, and `mc17 create` writes markdown only)
- `mc17 amend` (the Manifest stamp by an edits file, which always versions the prior state; a ledger append goes through `mc17 append` and never through this command)
- `mc17 read search` (the Domain check at 5a field 9)
- `mc17 hash` (the ledger's stored-byte proof), `mc17 identity` and `mc17 rights` (the two checks below)
- `bash_tool` (every `mc17` subcommand, and reading a declared filesystem path)

**Rights.** `mc17 rights` reports the grants this run needs: `upload` for ledger creation on a first run, and `edit-own` on its own assets or `classify-any` for stamping. Where a needed right is absent, report which one and stop. Never write the ledger into a different collection to get around it.

**Corpus identity.** Prove the store `mc17` reaches is the store that holds the Manifest before any figure is trusted: `mc17 identity <assetId> --expect-title "<the title Step 1 matched for that id>"`. Not equal means the session reaches another store: stop, and create nothing.

**Which corpus.** Every read and write goes through `mc17`, so the corpus is the CanonQ connection of the signed-in tenant, which DevyonQ resolves, and `mc17 version` prints the gateway and the tenant. **That corpus is the one the Manifest's Methodology Reference names as its corpus.** That is where the pinned documents were resolved from and where the collection, the artifacts and the ledger live. Where the Manifest names a corpus the tenant does not reach, say so and stop: a Mission collection made under a person's own CanonQ token stays on the old plugin (record 106). Where the Manifest names no corpus, run against the corpus the tenant reaches and record a finding that the corpus line is owed.

**Reading and writing through `mc17`.** Each act names its `mc17` command, and the engine in DevyonQ reads and writes CanonQ for it. The markdown-body read is `mc17`'s own and appears in no row here.

| Act | `mc17` command |
|---|---|
| raw source, and the ledger's stored bytes | `mc17 read document --id <id>`, and `mc17 hash <id>` for the stored text's sha256 |
| one ledger record, or the last k | `mc17 read record --ledger <id> --n <n>`, or `mc17 read tail --ledger <id> --count <k>` |
| collection census | `mc17 read collection --id <collectionId>` |
| append a ledger record | `mc17 append {ledger} --record <file>`, which sends the patch |
| replace an asset's body | `mc17 amend <id> --edits <f.json>` |

The census read Step 2c needs takes the collection id. **It takes an id and never a title**: an unknown string is tested against the caller's accessible collection ids, finds no match, and comes back `403 Access denied to this database`, which is a bad-identifier error wearing a rights error's clothes.

**Both writes take their body off disk.** This run's two large writes are the ledger record at Step 6d and the Manifest stamp at Step 7; each is tens of thousands of characters, and `mc17` reads each from a file, so none of it passes through the model's own output, and the steps that order them point back here.

## Declarations, live state, and what the binding covers

**Declarations** are what the Mission has committed to. **Live state** is the record of what has happened since: the status line, the tracked-documents table, the merge list, the VF Stamp block, and the Approvals section.

**The binding is taken over the body with those six parts removed, and over nothing less.** Everything else in the body is inside it, the field values and the prose around them alike. A field list is how this skill *checks* a Manifest, and it binds one in no respect: the binding is taken over text, so no declarative sentence falls outside it by being unparsed.

A row appended to the tracked table, a merge recorded, a status advanced from Draft to Verified: none of these moves the binding, whatever line ending the corpus stored the body with, because the projection reads a CRLF body as its LF twin since 0.1.51 (M-MC171-13), so the SPEC verified against this Manifest stays verified and every artifact beneath it stays where it was. **A change to a declaration is a different act:** it moves the binding, stales the Manifest's own approvals, and the verifications linking the Manifest to its dependents are re-run.

## Flow
**Which copy of this plugin is running, before anything rests on it.** `mc17 version` names the plugin, its version and the root it resolved, and on Claude Code the value of `CLAUDE_PLUGIN_ROOT`, which that host sets to the installed plugin's own directory. **The cache directory's name is evidence of nothing**: Claude Code names it from the version present at first install and never renames it on update, so a directory reading `0.1.0` routinely holds a later version. The manifest beside the harness is what is running. Mission Seventeen-13 spent the longest part of its Step 0 on that question with no command that answered it.


### Step 1 - Identify the target Manifest

Determine which Manifest to verify. Sources, in priority order:

1. User names a Manifest (asset title `MANIFEST-{SCOPE}-001`, asset id) or a Mission.
2. A document the person has selected and names in the conversation (a `MANIFEST-*` title).
3. Conversation context.

**Resolve to a collection id, never to a name.** For a Mission name, resolve by targeted search: `mc17 read search --q "MANIFEST-{SCOPE}-001"` for the exact title `MANIFEST-{SCOPE}-001` reaches the collection that holds it in one call, at any corpus size.

**The search is a candidate generator. The exact title comparison is the decision.** `mc17 read search` is full text and scores on token overlap, so a query for one id-shaped title may answer with a sibling's beside it at the same relevance, and on another day may return neither. Relevance orders the candidates and settles nothing. Read the title of every hit and compare it to the wanted title character for character; the hit that is equal is the Manifest, and no other hit is. Where no hit is equal, this corpus holds no Manifest under that title: stop and say so, and never fall back to the top-ranked hit.

**`mc17 read collections` is not the resolution route.** On a real corpus it returns every collection the caller can reach, which on the estate today is 376 collections and about 85,000 characters, and that exceeds the tool output limit outright. Where a name must still be matched against collection titles, take the search result first and confirm the one candidate. Where exactly one collection matches, take it. **Where more than one matches, stop and ask.** List each candidate with its collection id, its Manifest's title, and the methodology version that Manifest pins, so the operator picks the line as well as the Mission.

Duplicate collections with the same Mission name can legitimately exist, and a v1.6 and a v1.7 Mission of one name is exactly the case coexistence produces. Then `mc17 read collection --id {collectionId}` and take the asset titled `MANIFEST-{SCOPE}-001`. The title IS the doc name; exact match, deterministic. **Two Manifests inside one collection** is a defect: each Mission has exactly one. Flag it and ask which is the Mission's.

Record the Manifest's **collection id** - the ledger lives in the same collection.

### Step 2 - Fetch and parse

`mc17 read document --id <assetId>` for the Manifest, and `mc17 check <assetId> --ledger <ledgerAssetId>` for the mechanical read of its fields, the ledger given so the operational parameter rows read against their records.

**The Change Log against the versions CanonQ holds.** `mc17 versions <manifest_asset_id> --log` reads the document's Change Log against the versions CanonQ holds of it: each row that names a version CanonQ does not hold is a fail naming the row and the version, and an older document with no Change Log passes with the note the command prints, which the record carries.

**The approvals of an earlier text.** `mc17 check <manifest_asset_id> --ledger <ledger_asset_id> --approvals --doc <manifest_asset_id>` reads the document's Approvals section alone and leaves out the verification join, since this run is the verification the document owes. Each stale entry it prints is a FAIL of this verification, naming the entry and the live-state write that removes it, which the command prints beside the entry; an entry marked in place as superseded passes with the note the command prints.

**Platform gate:** if the metadata shows a Notion-platform document in place of a canonq asset, STOP before any write. `mc17 amend` refuses Notion documents by design. Route to `mc-vf-manifest` (v1).

The body this run reads is the one `mc17` reads, and no reformatting of it happens anywhere. Read it yourself for the parts the program does not parse: the Methodology Reference's pin lines and resolution note, the field values the checklist rows judge, the tracked-documents table's cells, the merge list, the VF Stamp block, and the Approvals section.

### Step 2b - The pin gate

This is where the v1.7 family parts from the v1.6 family. **A version mismatch is a category error and no Fail: the Manifest is sound, and this skill is the wrong reader for it.** The v2 skill had no sibling to hand such a Mission to and asked a human to choose. This skill has one, and coexistence is a ruling, so it names the sibling and stops. No record is written on a mismatch, and the Manifest is never marked failed.

Read the Methodology Reference. A v1.7 Manifest carries **three pin lines** - the Guide, the Definition, and the Agent-Fleet Execution Profile - plus a **resolution note** naming which documents resolved as Living, which older pair was rejected, and which in-place amendments the pinned version carries.

Each pinned document's status is read with `mc17 status <assetId>`, and the run records the source the tool names beside the value.

Resolve the pinned version and the pin's kind:

- **v1.7, Living pin.** All three pin lines resolve to v1.7 documents whose status is Living (or `not applicable` with a one-line reason on the Profile). Proceed to Step 2c. Record `Pin: Mission Control v1.7 (living)`.

- **v1.7, trial pin.** The Manifest declares itself a trial of drafts. Mission Definition v1.7 Section 1 admits this: *"A Mission may pin a methodology version whose documents are still drafts, where it declares itself a trial of those drafts."* Proceed to Step 2c, and carry the trial through everything that follows. Check the trial record per Step 5a field 1. Record `Pin: Mission Control v1.7 (trial, on drafts)` in the VF record, together with the sentence the law attaches to it: **a trial Mission's conclusions carry no force outside itself while its pin stands on drafts.**

- **v1.6 or earlier.** STOP. Write no VF record, write no stamp, and do not mark the Manifest failed. Report: this Manifest is pinned to Mission Control {version}, this skill implements v1.7, and the family built for that pin is `mc-vf-manifest-v2` for a CanonQ-native Manifest or `mc-vf-manifest` for a Notion-platform one. Name the skill the runner should call and stop there. Moving the Mission to v1.7 is an explicit BO/TO migration decision recorded as a Manifest change, which re-verifies the chain top-down; it is never this skill's act, and it is never a side effect of running it.

- **Newer than v1.7.** STOP without a record. The installed skill suite predates the Mission's methodology. Upgrade the suite first.

- **No readable pin line.** **STOP. Write no record, write no stamp, and derive nothing.** The pin is a declaration the Mission made about itself at creation, and the law has it read after creation and never re-resolved. A skill that reconstructs a missing pin from a linked document can put a v1.6 Mission whose Methodology Reference happens to link a v1.7 asset onto the v1.7 line with no human act anywhere in the path. Report that the Methodology Reference carries no readable pin line, that its AO repairs it as a Manifest change, and that until then no verification runs. Name both families, and say that the repair is a declaration of the line and no discovery of it.

- **Fewer than three pin lines, where at least one is readable and names v1.7.** Proceed, and fail field 1 in Step 5a. This is a defect in the Manifest and no wrong-reader case: the version is established, so the checklist applies.

- **A v1.6-era ledger in the collection.** A v1.6 ledger is a **markdown** asset with `### Record N` headings, and a record read against it is the signal that the collection carries the older form. Where `VF-{SCOPE}-001` holds records written against Mission Definition v1.6, do not infer a migration from the pin. **Look for the record of the decision:** a ledger record naming the BO/TO migration decision, or an approval against the Manifest that names it. Where none is found, STOP with no record and report that a Mission carrying v1.6-era records verifies under v1.7 only after the migration is recorded as a Manifest change. Where the record is found, proceed, and state in this run's record that the migration re-verifies the chain top-down: name every downstream artifact whose verification is now stale, and the `mc-*-v17` skills that must re-run against them. Top-down is discharged by naming the owed runs, and never by asserting the phrase. **A markdown ledger is never appended to by this skill**: `patch` refuses a non-JSON asset, and converting the ledger is a recorded act with its own authority.

### Step 2c - Read the collection census

Run `mc17 read collection --id {collectionId}`, and `mc17 read document --id <assetId>` on every governed artifact of the collection: the root SPEC, the Test Plan, each specialty document, any ARCH, any Implementation Plan, any PL, and the VF ledger. Keep each body and each asset id.

Three checks read from this census and from nothing else, so it is performed before Step 5:

- **The AO gate** in 5c compares each artifact's own declared AO line against the tracked table's cell for it.
- **The declared-documents existence check** in 5a field 24 resolves each declared name against the census.
- **The shape-coherence scan** in 5c looks for an ARCH or an Implementation Plan inside an Interface Mission.

Where the census cannot be read, record an **unresolved determination** naming the three checks it blocks, and never pass them silently.

### Step 3 - Check for existing verification

Look for a `## VF Stamp` section in the Manifest and **read its `Status` value**. The branch is on the value, and never on the section's presence: `mc-cre-mission-v17` writes the section into every Manifest it scaffolds, reading `Not yet verified`, so branching on presence would route every first-time verification into the staleness check, which then hunts a ledger that cannot exist yet.

**No section, or `Status` reading `Not yet verified`** -> Step 5 (first-time verification).
**`Status` naming a completed verification** -> Step 4 (staleness check).

### Step 4 - Staleness check

Read `Last verified` from the VF stamp. Locate the ledger: the asset titled `VF-{SCOPE}-001` in the Manifest's collection.

**Read the ledger by record, never whole.** It is a JSON asset, and a reader takes one record, or the last few records, without loading the file. This is what keeps the read constant-cost at a thousand records.

```
mc17 read tail --ledger {ledger_asset_id} --count {k}
```

The command prints the last k records as CanonQ answered them. Take the **last record whose `refs[0].doc` reads `MANIFEST-{SCOPE}-001`** - that is the most recent Manifest record. Where none of the k does, read again with a larger k.

**The Manifest reference stands at `refs[0]` of every record this line writes**, the bootstrap record included. The reader matches on that one position, so it is a contract: compose every record with the Manifest first, as Step 6c and the record template below both do. A record leading with another document is invisible here.

**Where no record of the ledger names the Manifest at `refs[0]`, read the VF Stamp before concluding anything.** Step 3 routes a run here only on a stamp naming a completed verification, and that stamp carries the record's own number, so finding no such record contradicts the evidence that brought the run here. Read the record the stamp names with `mc17 read record --ledger {ledger_asset_id} --n {n}`. Where it exists, the `refs[0]` contract was broken by whoever wrote it: the run **stops and reports that**, and rebuilds no baseline over a history it cannot see. Only where the stamp names no record is this a first-time verification; go to Step 5.

From the matched record read: `at` as `prior_verified_at`, and the `body`'s **Binding** line for `prior_binding` and `prior_projection_id`.

Compute the **current binding** with `mc17 binding <manifest_asset_id>` (5b).

Apply the staleness rules in order:

1. **A pinned document changed.** For a Living pin: any of the three pinned documents has a `lastEdited` after `prior_verified_at`. Where the Profile line reads `not applicable`, there is no third document to watch and the rule reads the other two. For a trial pin: `mc17 hash <assetId>` on each of the three answers something other than the hash the Methodology Reference recorded. Re-verify, and name which document moved.
2. **Declarative content changed.** `prior_binding` exists, the projection ids match, and the current binding differs. Re-verify, and report "Manifest declarative content changed since last verification (binding moved)."
3. **Projection changed.** `prior_projection_id` differs from the projection id `mc17 binding` prints. Bindings under different projections are incomparable. Re-verify and establish a new baseline; report the projection change.
4. **Migration case.** `prior_binding` is absent. Re-verify; the new record establishes the baseline.
5. **Still valid.** None of the above. Report and stop. Write nothing.

**The Manifest's own `lastEdited` is no re-verification trigger when a binding is available.** This is what suppresses the cascade from live-state writes: a tracked-table append, a merge recorded, a status advanced. The binding is the authoritative change signal.

**Before writing anything that would move a standing.** If the recomputed binding differs from the binding named by a recorded approval in the Manifest's Approvals section, that approval is of a text that has since changed: the check of Step 2 prints it as a stale entry, which fails this verification, with the live-state write that takes it off the page. Mission Definition v1.7 Section 10: *"No act moves an artifact's standing without the authority being told before the act."* Tell the named authority what the act will do, then perform it. The announcement is part of the run summary and is repeated in the record's findings.

**A moved binding owes downstream re-runs, and this skill names them.** This skill verifies one edge and runs none of the others, so it discharges the rule by naming the owed runs:

- List every dependent edge of this Manifest: the root SPEC at minimum, and each declared document whose prior verification named this Manifest as its upstream anchor.
- Record each as a finding of the form "owed re-run: {edge}, by {skill}", addressed to the Manifest's AO.
- Where the named skill is not installed in this line, say so in the same finding, so the AO knows the re-run is a manual act against the pinned Definition.
- **Whether the orchestration actually performs the owed re-runs is outside this skill**, and it is listed as a judgment directed to the Technical Owner.

### Step 5 - Run verification

#### 5a - Field checklist

**Run `mc17 check <manifest_asset_id>` first.** Give it `--ledger <ledger_asset_id>`, so the operational parameter rows read against their records. It reports the state of each of the 24 declarative fields of Mission Definition v1.7 Section 1, the reader line, the scope tags, the naming checks of 5d and, under `Operational parameters`, each row of the live table as in force or absent with its reason. **It decides nothing.** The dispositions and the rows below are this skill's. It exits 1 where any row it prints reads `FAIL` or `READ FAILURE`, and 0 where none does (since 0.1.49, D4 of ARCH-MC171-001): the exit counts those rows and settles no disposition, so a flagged Type the Mission declares open still passes here, and passing that declaration with `--open-types` makes the exit agree.

**The dispositions.** Read the artifact's work mode, then map the tool's own words:

| The tool reports | Gated | Iterative |
|---|---|---|
| `ABSENT` or `EMPTY` | Fail | a finding naming the declared gap |
| `whole value [TBD]` | the row's `[TBD]` column | the row's `[TBD]` column, a Fail there softened to a finding |
| `[TBD] inside an otherwise complete field` | warning naming the ruling and the authority who owes it | the same warning |
| `bare N/A` where the field requires a reason | Fail | Fail |
| present with no placeholder | the row decides | the row decides |

Mission Definition v1.7, quoted word for word:

```
A verification of an iterative artifact checks the content present against its
upstream anchor and records each declared gap as a finding rather than a failure.
```

A `[TBD]` is how an artifact declares a gap.

**The softening reaches four things never.**

1. A value present and **wrong**. The mode covers absence alone.
2. Any check in 5c.
3. **Fields 1, 3, 4, 5, 6 and 15**, which the tool marks `never softened`: the pin, Identity, the shape, the Authorities, the Work modes, Supersedes. A document that will not say what the Mission is cannot be read at any stage of its growth. **A `[TBD]` anywhere inside these six fails as well**, whatever else the field carries: a declared collapse of authorities whose compensating control or end condition stands `[TBD]` is a field 5 fail, which is the disposition `mc-cre-mission-v17` reports at its Step 11.
4. **A field whose own text says it blocks verification.** The scaffold writes `Blocks verification until filled` into Branch policy, CI/CD, Release target and Technology context, and the tool reports the phrase where it stands. An artifact's own word about itself outranks its work mode. Without this an iterative Manifest would pass carrying all four empty, which makes the mode a bypass.

**The rows.** Presence, placeholder state and bare-`N/A` come from the tool. Each row carries what the field means and what makes it a fail.

| # | Field | What this skill judges | `[TBD]` |
| --- | --- | --- | --- |
| 1 | Methodology Reference | Three pin lines (Guide, Definition, Profile), each naming a version and resolving via `mc17 read document`. The Profile line may read `not applicable` with a one-line reason. A line naming one version while linking another is a **fail**. A **resolution note** names which documents resolved as Living, which older pair was rejected, and which in-place amendments the pinned version carries; a missing note is a **fail**. **The note is read here, and never re-derived:** the rejected pair is a fact of the creation-time resolution, frozen into the Manifest by `mc-cre-mission-v17`, and the rule that has the pin read once covers the note beside it. A rejected title that no longer resolves is a finding, because a rejected document can be retired after the pin was taken. A missing **corpus line** is a finding. **Trial pin:** each of the three documents is recorded by asset, by content hash, by read date, by status as the document states it with the source named beside it, and by the means of recomputation; any missing element is a **fail** naming the document and the element. **The means of recomputation is a named implementation with the command that runs it.** A transcribed recipe in its place is a finding: a transcription is a second description of one function, free to drift from the code every run uses. Recompute each hash now with `mc17 hash <assetId>`; a figure that no longer matches is a finding naming the document, the recorded hash, the hash now and the command - the drafts moved under the trial. | Fail |
| 2 | Reader line and Summary | The Manifest opens by saying who it is for, before the first declarative section; the tool reports the `**Reader:**` line, and its absence is a **fail**. Where the named reader is a human authority, a `## Summary` section stands beneath it and carries text; a human reader with no Summary is a **fail**, and a Summary whose whole content is a placeholder is a **fail**, because the summary is the part that reader acts on. Whether the text can be acted on is his judgment and is never failed here. | Fail |
| 3 | Identity | Mission name, Mission ID, parent Project present. Optional Product reference(s). A Mission ID departing from the creation skill's deterministic derivation carries a deviation record beside Identity naming the authority that outranks the derivation; a departure with no such record is a **fail**. | Fail |
| 4 | Mission shape | One of Standard, Interface, Revision, Platform. A fifth value is a **fail**. | Fail |
| 5 | Authorities | BO, TO, MO, the **default AO** and the **Verifier** present with named persons (AI-AO permitted per the bifurcation rules in 5c), plus every other authority the Mission uses, the Security Owner and the Data Owner included wherever SEC or DAT is activated. `TBD` for an unassigned person is a pass with a finding. **The v1.6 name `AI-Watcher` is not the v1.7 name:** v1.7 names the role **Verifier**, and `AI-Verifier` where an AI fills it and the contrast matters. A Manifest carrying `AI-Watcher` **fails** this field, and the finding states the rename. The `AI-` prefix marks an instance where an AI fills a role a human could fill; it is never part of the role's name. **Collapsed authorities:** where one person holds two or more roles, the Manifest declares the collapse on its face, names the compensating control, and states the condition under which the collapse ends. A detected collapse with no such declaration is a **fail** naming the roles and the person. Whether the control is adequate is a judgment, surfaced and never failed. | Field absent: fail. A role at `TBD`: pass with a finding. |
| 6 | Work modes | `gated` or `iterative` per artifact class, and per module where the Mission wants finer grain. The vocabulary is closed at two, and a third value is a **fail** with one admitted exception stated here so no reader has to weigh it. **A class an artifact of this Mission can never hold takes `N/A` with its reason, and that is a pass.** A Mission that ships no code holds no ARCH and no Implementation Plan, so `N/A, this Mission ships no code` in those two cells is lawful, as is `N/A, Interface Mission` on an Interface Mission. The reason is required; a bare `N/A` is a **fail**. A class the Manifest omits altogether runs as gated, is recorded in the findings, and is never failed. **This exception is written because the same Manifest shape drew opposite verdicts from different readers**: three cold verifications failed a no-code Mission on this row and a fourth passed it, on a row whose two halves each supported one of them. The value is settled here, and `mc17 check --json` reports the cell values so the reading is a comparison and never a judgment. A tracked row whose work mode contradicts its class declaration is a **fail** naming the row. **Direction:** an artifact changes mode once, from iterative to gated, at the moment its authority states the document is finished. A row that moved gated -> iterative since the prior record is a **fail**; a row that moved iterative -> gated with no ledger record of the authority's statement is a **fail**. The direction check runs only where a prior VF record exists; on a first run, record that it did not run. | Fail |
| 7 | Modules | Roster present, each entry declaring `module_id`, `name`, `owner`. **The roster may read `N/A, {reason}` wherever the Mission has no Implementation Plans**: an Interface Mission, and any Mission whose Manifest states that it produces no ARCH and no Implementation Plans. What admits an empty roster is the absence of Implementation Plans, and the shape word alone settles nothing: the Definition writes the roster's origin as an adoption from the ARCH at that ARCH's approval and gives no roster to a Mission that will have no ARCH, so a stated `N/A` fills a field the law requires be present and overrides no rule of it. **Where an approved ARCH exists in the collection, the roster's origin is stated in all three elements: the ARCH section, the asset id, and the approval**, and any missing element is a **fail**. Where no approved ARCH exists yet, the roster is provisional and a missing origin statement is a finding. | Roster `[TBD]` with no approved ARCH: warning. With an approved ARCH: fail. |
| 8 | Specialty declarations | Which of SEC/DAT/OPS/CMP are active. May be empty. | Pass with a finding. |
| 9 | Domains | `primary` present (single domain_id), optional `secondary`. **Validate the `primary` with `mc17 read search --q "{value}"` and read the `Domain` property of each hit.** **The comparison is exact, character for character**: the search matches substrings, so `engineer` answers with documents carrying `product-engineering`, and a hit taken without the exact comparison lets a bogus value validate itself. A hit whose `Domain` equals the value proves the value is in the curated vocabulary, in one call. **A read of the whole property vocabulary is no route on a real corpus**, at about 460,000 characters on the estate today, over the tool output limit. A `primary` proven outside the vocabulary is a **fail** naming the value and the closest admitted values, because facet #3 is curated and admin-approved. Where no read can answer, the output carrying no `Domain` property included, record an **unresolved determination**, and never a silent pass. | Warning. |
| 10 | Scope | The tool checks every tag against the closed prefix set and reports a malformed tag or an unknown prefix, either of which is a **fail**. **Never fail on an unrecognised tag *value***: the vocabulary is open behind the prefix. An `initiative:` tag for the parent programme is expected, and its absence is a warning. **A Mission carrying neither a `product:` nor a `customer:` tag** is a **warning** where the Manifest states why it extends no Product, and a **fail** where it states no reason, because the law requires one of the two prefixes and admits the absence of `product:` only against a stated reason. Where the tool reports drift between the tags declared in `## Scope` and the tags stored on the asset, record it: the platform rewrites some tags on the way in. | Warning. |
| 11 | SPEC reference | Exactly one root SPEC. No dependencies and no other document types in this field. | Fail |
| 12 | Consumes | Each entry `{owning_mission_id}.{PL_id}@{version}` with a stance from `{Conformist, Customer-Supplier, Anti-Corruption Layer}`. **Fail** on a malformed reference or an unknown stance. May be empty. An entry whose PL cannot be resolved is a warning: the producing Mission's PL may sit outside this verifier's reach. Whether the stance matches how the consuming code integrates is the Consumes-PL edge, owned by `mc-vf-pl-v17`. | Pass with a finding. |
| 13 | Produces | Each entry `{PL_id}@{version}` with a tier from `{experimental, stable, frozen}`. **Each entry names the tier at registration and the event that promotes the PL; an entry with no promotion event is a fail**, on every entry, because the law attaches no condition to the naming of the event. Where the Move's acceptance grammar names a consumer-supplied proof, the promotion event is that proof's recording, and an entry whose event says something else is a **fail** naming the carry. Each entry names any admitted candidate that cannot satisfy the promotion criterion alone. Required for Capability Moves and for Interface and Platform shapes; may be empty for a Standard User Move Mission. | Fail on Interface, Platform or a Capability Move; pass on a Standard User Move. |
| 14 | Advances | Each entry `{PROD-id} § {element}`. **Required when the Mission's Move extends a Product that has a Product Vision** - see the Advances gate in 5c. Each reference resolves, or the field **fails**. Whether the Move actually advances the cited element is a BO-approval judgment; surface it and never fail on it. | Fail where a Product Vision resolved; pass otherwise. |
| 15 | Supersedes | Revision Missions only: the closed Mission ID whose artifacts are inherited. Required when the shape is Revision, absent or empty for every other shape. | Fail on a Revision Mission. |
| 16, 17, 19, 20 | Branch policy, CI/CD configuration, Release target, Technology context | Each present with its own content, or an explicit `N/A` with its reason; the tool reports a bare `N/A`, which is a **fail** in all four. Branch policy states how IPs map to branches; CI/CD states the pipeline for this Mission's code changes; Release target states what closure produces, a version tag, a deployable build or a release candidate; Technology context states language, framework, platform, constraints. All four carry the scaffold's `Blocks verification until filled`, which is the field's own word that no work mode softens it. | Fail |
| 18 | Execution machinery | See 5c, *The execution machinery gate*. Required of a Mission that runs agent fleets; `not applicable, this Mission's waves run by hand` beside a pinned Profile where the Mission's agents run its waves by hand; `not applicable` with a reason otherwise. | Fail on a fleet-run Mission, and on a pinned Profile beside any other `not applicable` reading or an empty or `[TBD]` field. |
| 21 | Governance Process | Names the Mission Default Governance Process, or declares a shape-specific override (Interface / Revision / Platform). **The process is referenced, and no pin of it is taken:** the Methodology Reference pins the Guide, the Definition and the Profile, and this field carries its own reference. Where the field names an asset id, it resolves, or this is a **fail**; where it names the process with no asset id, that is a finding naming the missing reference. | Fail |
| 22 | APR naming scheme | In its own field after the tracked-documents table, and one of exactly two values: **authority-keyed** `APR-{SCOPE}-{AUTHORITY}-{ARTIFACT}`, or **sequence-keyed** `APR-{SCOPE}-{ARTIFACT}-{SEQ}`. A third value is a **fail**. An absent field is a **warning**: the Definition rules that a Manifest declaring no scheme runs authority-keyed, and `mc17 check` defaults the same way and says so in its output. Pass a declared value with `--apr-scheme`. Every APR id in the tracked table conforms to the scheme in force; the tool reports each id, and a mixed set is a **fail** naming each non-conforming id. | Warning. |
| 23 | Closure conditions | See 5c, *The closure-conditions gate*. | Content `[TBD]` under a condition whose precedence and branches are written: warning. An unidentified, absent or contentless condition: fail. |
| 24 | Declared-documents table | Columns Doc name, Type and Description. Each declared document resolves against the Step 2c census; one that does not is a **fail** naming it. Where the Mission declares its Type column open, each additional type is named with its id form; an unlisted type with no such declaration is a **fail**. | Fail |

#### 5b - The binding

```bash
mc17 binding <manifest_asset_id>
```

Projection id: **`mc-v17-manifest-text-projection/2`**, which the tool prints beside the figure. **Bindings carrying different projection ids are incomparable and are never compared.** The id exists so a recipe change cannot be mistaken for a content change. The id `/1` named the recipe before the operational parameters table was cut out, five parts; `/2` cuts six.

**A prior record under another projection id.** Where the last verification record of this Manifest names `mc-v17-manifest-text-projection/1`, recompute its figure with `mc17 binding <manifest_asset_id> --projection 1`, which cuts the five parts that recipe named. Where the figure equals what the record holds, the content has not moved: record the binding under `/2` and say the record is carried on, re-baselined under the new id, as the Definition's rule on a changed recipe says. Where it differs, the ordinary staling rule applies. **The order of the two acts is fixed.** A Manifest verified under `/1` is verified once under `/2` before it gains the `## Operational Parameters` section, because the `/1` recipe keeps that section as declarative text and the recompute over a body that holds it cannot equal the record. The act that writes the section reads the last verification record first and runs only where it names `/2`; where it names `/1`, this verification runs first. A Manifest that carries no section has the same figure under both ids, because the sixth cut finds nothing to cut. **Where the ledger holds no record publishing `/2`,** this run appends the recipe note before its verification record: a note naming `mc-v17-manifest-text-projection/2` and the six parts it cuts, because the Definition says a changed recipe's id is published in the ledger before any binding is recorded under it. A ledger created by 6c carries the id in its bootstrap record and owes no note.

The projection is over text, and no field parse. **Every byte of the body outside the six excluded parts is inside the binding**, so a declarative sentence no field name covers still binds. The tool prints which line each exclusion was matched at and by what means.

**What the output is read for, beyond the figure.**

- **A heading matched by the fallback.** The tool prints `UNRESOLVED DETERMINATION` naming the heading it found and the exclusion it matched it to. Record it as an unresolved determination, and say in the record that the Manifest's headings are owed a repair by its AO. Judgment is never exercised inside a hash: the tool applies the one documented fallback, and the run reports it.
- **A live-state section matched by neither the literal nor the fallback.** Use the fallback binding below. A binding that silently includes live state stales the chain on every bookkeeping write.
- **A failing self-check.** The tool exits non-zero and the figure is discarded. Nothing else in the run rests on it.

**Each exclusion runs to the next `## ` heading or to the end of the document**, so everything beneath a live-state heading that stands last is outside the binding. **The projection is never amended for that.** Whether the next version narrows the exclusions is a question for the Business Owner, and it is settled inside no hash.

**The fallback binding, and when it is used.** Where the binding cannot be computed - the Manifest's storage path returns text the projection cannot read, a live-state section cannot be identified, or the tool cannot run - the binding is **the platform's immutable version snapshot plus the content length in characters**, and the record states plainly that a hash is deliberately not recorded. The record carries the version identifier, the character count, and the instant the asset was last edited. This is the Definition's stated fallback and it is a lawful binding, in no way a degraded one. It is never used silently: the record names it and says why.

#### 5c - Internal consistency checks

No work mode softens anything in 5c.

**The AO gate.** Every governed artifact resolves to exactly one AO, read from the Step 2c census.

- The tracked-documents table carries an **AO column**. A table with no AO column is a **fail**: the column is where the whole artifact-to-steward mapping reads in one place.
- Each governed row's AO cell names the artifact's own declared owner, or the Mission's default AO where the artifact declares none. An empty AO cell on a governed row is a **fail** naming the row.
- For each governed artifact in the census, compare its own `**AO:**` line against the table's cell. A disagreement is a **fail** naming the artifact, the body value and the cell value. An artifact resolving to two AOs, a body value and a differing cell or two AO lines in one body, is a **fail**. Exactly one, always.
- **The Manifest is the one artifact whose AO is read from Authorities.** It carries no AO line of its own, and the default AO named in its Authorities field is what its tracked row must carry; a MANIFEST row naming anyone else is a **fail**. **Compare the cell against the AO string alone:** the Authorities line carries the string with its kind marker beside it, in the form `{string} - human AO`, while the cell carries the string, so a cell holding the string with no kind marker is the passing form.
- **The VF ledger is a governed artifact of this Mission and carries a row.** The tracked table holds every declared document plus every verification and approval artifact that arises, and the ledger is the first of those. A ledger with no row, or with an empty AO cell, is a **fail**; on the run that creates the ledger, Step 7 writes the row in the same act. **The ledger is a JSON asset and carries no `**AO:**` markdown line**, so its AO is read from the `AO:` line in its bootstrap record (Step 6c part 2): `mc17 read record --ledger {ledgerAssetId} --n 1`, the record whose `kind` is `bootstrap` on a ledger 6b created; on a ledger whose bootstrap 6c appended later, `mc17 read tail --ledger {ledgerAssetId} --count {k}` finds it. A bootstrap record with no AO line is a **fail**, and the absence of a markdown AO line in a JSON ledger is no fail at all.
- **A Mission that names no default AO while holding an artifact that declares none fails this check**, and the finding names each such artifact. Where every artifact declares its own, that is lawful for the spawned artifacts and still a fail for the Manifest, whose own AO is the default AO; record both readings.
- **AO bifurcation:** an artifact on a PL at `frozen` requires a human AO, and an AI-AO there is a **fail**. An artifact on a PL at `stable` requires a human AO at first promotion to `stable`. An AI-AO on an internal artifact (SPEC, ARCH, IP, TP) of an Active Mission is a **fail**. An AI-AO is declared with its named human escalation contact; one without is a **fail**.

**The execution machinery gate.** The discriminator is the Profile pin line, read beside the Execution machinery field.

**Profile `not applicable`:** the Execution machinery field reads `not applicable` with a reason. A Mission that pins the Profile `not applicable` while declaring execution machinery is a **fail** on the contradiction, and the finding names both.

**Profile pinned, and the field reads `not applicable, this Mission's waves run by hand`:** the Mission's agents run its waves by hand, under the Profile and with no fleet. The field passes and owes no part, and the record names the Mission as run by hand. The reading is matched on its words: `not applicable` and the reason `this Mission's waves run by hand`, whatever the case of the first letter, the punctuation between them and a closing period, so the template's `Not applicable: this Mission's waves run by hand.` is that reading.

**Profile pinned, and the field is empty or `[TBD]`, or reads `not applicable` with no reason or with any other reason:** a **fail**. The finding names the element, the Execution machinery field, and the reading the gate expects: `not applicable, this Mission's waves run by hand` where the Mission's agents run its waves by hand, or the four parts below where it runs its waves with the fleet. A pinned Profile beside the reason of a Mission whose work people perform states two things, and the finding names both.

**Profile pinned, and the field declares machinery, so the Mission runs agent fleets:** the field is required with all four parts.

- **Sanctioned runner** - the canonical normalized hash of its sanctioned block, the block version, and the date that hash was read. Any of the three missing is a **fail**.
- **Writing lint** - the path. The launch-holding half is claimed only where a recorded non-zero lint exit actually held a launch; a claim with no such record cited is a **fail**. Until such a record exists the declaration states that the half is not claimed, and that statement's absence alongside an unclaimed half is a **fail**.
- **Launch fingerprinting** - where the Mission adopts it, three elements: where the fingerprint records live, who may delete them, and **that a missing record for a run in flight is a refusal to resume**. Adopted with any of the three missing is a **fail**. Not adopted is lawful and is recorded.
- **The merge bar** - the named gates and the head-pinned tally. Where the platform offers a branch-protection ruleset, the ruleset is named; where it offers none, the declaration says so in place of a ruleset name. **Where this Mission merges nothing, the whole bar reads `N/A, {reason}`** and no gates, no tally and no ruleset are owed: a fleet-run Mission whose fleets author documents and land no code is that shape, the Definition names it in the sanctioned-runner bullet of this same field, and the other three parts stand as written. A bare `N/A`, or a bar carrying none of a ruleset name, the no-ruleset statement and `N/A` with its reason, is a **fail**.
- **The declared path resolves.** `mc17 machinery` prints the writing-lint path it found and whether the file is present. A path that resolves to nothing is a **fail**. Where the path cannot be reached from this runner, record an **unresolved determination** naming it, and never a silent pass. A path that resolves is half the answer, and the bullet below carries the other half.
- **The declared hash resolves, at the path the Manifest declares.** Run it against the harness standing beside the declared runner, so the figure is computed by the copy the declaration points at:

  ```bash
  node "{the harness directory the Manifest declares}/mc17" machinery --expect "{the hash the Manifest declares}"
  ```

  A **MISMATCH** is a **fail** naming the declared hash, the computed hash and the runner file read. A **RECOGNISED** answer is a finding and never a fail: the declared hash is the digest of a block this plugin shipped in an earlier version than the block the runner computes, the verb names both versions, and the record carries the finding while the Manifest brings its declaration current at its next declarative change (D14 of `ARCH-MC171-001`, since 0.1.52); a hash matching no shipped block is the MISMATCH above. The command names all three, and its `Sanctioned runner:` line is the path the figure came from; where that line names a path other than the declared one, another copy answered, and that is an **unresolved determination** naming both paths. **A declaration whose path resolves and whose hash has moved to a digest no shipped block carries is a fail on the same footing as a path that resolves to nothing**, and the finding names the declared hash, the computed hash and the path. This is the state the resolve-only rule was blind to: fifteen plugin copies stood in one cache on 2026-08-24, every one of them resolvable, so a declaration pointing at a copy the estate had upgraded away from passed a check that only asks whether the path resolves. Where the runner is out of reach, or the Manifest names no source of record, record an **unresolved determination** naming the declared hash and what was missing. This check answers whether the declared hash resolves; whether the runner a launch actually used carries that hash needs the run records and stays in the judgment list.

**The doctrine read** (IP-MC17-020, Profile L16). The three documents the Manifest pins state figures about the harness: the Profile its sanctioned-block digest and content-line count (8.11), the Guide and the Definition the skill roster, the Guide the template count, and the Definition its type roster, which the verb reads against the classes the document gate governs and reads `old` where the roster names a class the gate does not govern, saying nothing of a class the gate governs beyond it (since 0.1.50). Read them against the plugin running this verification:

  ```bash
  mc17 doctrine --guide "{the pinned Guide's asset id}" --definition "{the pinned Definition's asset id}" --profile "{the pinned Profile's asset id}"
  ```

  The verb answers one of five states per figure, and each has one disposition here. **`current`**: one line in the verification record's evidence. **`old` or `unrecognised`**: a **finding, never a fail**, naming the document, the figure, the verb's detail line and the methodology's Technical Owner, because where the running code and any prose about it disagree, the code is the fact and the prose is the defect (Definition, *Law and the code that enforces it*); the repair is an amendment under Section 12 carried by an Implementation Plan in the methodology's own Mission, and this skill names the finding in its report to the operator so it reaches him. The Mission's verdict is unaffected. **`ahead`**, the passage reading at a version newer than the plugin running this verification: an **unresolved determination** naming this plugin copy (the verb's `shipped.pluginDir`) and the remedy, upgrade the plugin and read again; the law is ahead, and no finding stands against it. **`unreadable`**: an **unresolved determination** naming the passage and the form the check reads (its help line states the three forms), because that is the check's own uncertainty and never the law's defect. Where the runner cannot reach the corpus, record an **unresolved determination** naming the three assets, and never a silent pass.

**The closure-conditions gate.** Conditions name **this Mission's own artifacts and acts**.

- **Every condition is identified.** A condition in the ordered list carries an ordinal (`1.` to `7.`, with sub-conditions such as `6.2`). A condition outside the order carries an identifier of its own under a heading that states it holds no precedence position. An unidentified condition is a **fail**, and **a condition outside the order is never failed for carrying no ordinal**, which is what the Produces condition needs: the law places it outside the closure order, so it is identified (for example `P1.`) and stays out of the sequence.
- The ordered conditions stand in the order they are satisfied: increments landed, verification sweep, reference freeze, acceptance test, deferred audits each named with the authority that deferred it, the approval set, the closure record. An order that departs from this without a stated authority is a **fail**, and a missing member of that set is a **fail** naming it.
- **Each condition names the authority behind its own precedence**, or it is a **fail**. `[Precedence carried from the pinned Definition.]` is that name for a condition taken from the Definition's own closure order, because the Definition is the authority that fixed the order; a condition an authority added carries that person's name.
- **A fleet-authored construction is labelled as one.** Where the Manifest states that its conditions were scaffolded by an agent fleet, that statement is the label and it satisfies this check. Nothing in the ledger records the authorship of a condition, so **where a condition carries no authorship statement this skill infers none**: it surfaces the question to the BO as a judgment, naming the condition.
- **A condition that blocks on a proof another Mission's process must supply is invalid, and this skill refuses it.** The detection, with the tier exemption inside it:
  - A condition that **names an act a party outside this Mission performs** is a **fail**: a downstream Mission's design informed, a downstream Mission built against the contract, a consumer integration verified, a derivative that passed its own verification.
  - A condition that **names a foreign Mission ID** is a **fail** where what it waits on is an act.
  - **Exemption, inside this branch:** a condition that names a Published Language reaching a declared stability tier is lawful, **the qualified form `{owning_mission_id}.{PL_id}@{version}` of a consumed PL included**. A consumed PL is always qualified with another Mission's id, so a qualified foreign reference is by itself evidence of nothing. What separates the two is whether the condition waits on a **tier** or on an **act**.
  - The repair, stated in the law's own terms in every such finding: **the proof is carried on the produced Published Language as that PL's promotion criterion**, where it survives as a real recorded condition while this Mission's closure conditions stay clear of it.
  - Whether a condition that names no foreign Mission nonetheless waits on another Mission's process is a judgment, surfaced to the BO and never failed here.
- **The commissioned-measurement exemption.** A commissioned measurement is lawful as a closure condition only where all four hold, each stated in the condition's own text: the measuring Mission is named in no Manifest field of this Mission; this Mission's Business Owner commissions it over this Mission's artifacts; the condition binds the run and the report **at either verdict**; and a fail is repaired inside this collection. A condition missing any of the four is a **fail** naming which, and a measuring Mission that appears in any Manifest field is a **fail**. **The gate bites on a condition that states a measurement is commissioned.** A condition written conditionally, binding only if the Business Owner later commissions one, has commissioned nothing yet: check that it writes both branches, record as a finding which of the four elements become owed the moment one is commissioned, and never fail a scaffold for a decision its authority has not made.
- Where `Produces` is non-empty, a condition names the Produced PLs standing at their declared tier. It carries **no precedence position**, because it names the Mission's own registration act; a precedence position on it is a finding, and its absence from the conditions altogether is a **fail**.
- **Each active specialty's sign-off carries its own numbered closure condition** and its place in the order. A declared specialty with no such condition is a **fail** naming the specialty.
- The reference-freeze condition carries the freeze in full where a measurement is commissioned: the scope over every asset in the collection including one an agent judges unrelated, the void consequence of a revision or an addition, the BO's ruling at the report of a voided run, the lift of the freeze at the report, and the rule that an amendment to the closure order lands and is verified before the freeze it changes. A commissioned freeze missing any of the five is a **fail** naming which.

**Shape coherence.**

- Interface: `Produces` required, and no ARCH and no IPs. **An ARCH or an Implementation Plan present in an Interface Mission's collection is a fail of this run**, and the finding names the stray artifact and the two lawful repairs: remove the artifact, or change the Manifest's shape to the one the Mission actually has. The finding states plainly that **the Manifest's shape declaration may be the correct half of the pair**, and that the law attaches its refusals to the creation and the verification of the ARCH or the IP. The Test Plan survives the Interface override, which removes the IP phase and the ARCH.
- Revision: `Supersedes` required. Platform: `Produces` required, and a Registry is the primary deliverable.
- Standard: lawful with a Capability Move whose deliverable is a single PL, and it owes no deviation paragraph for it. Multiple PLs forming a coherent foundation belong to a Platform Mission; flag the discriminator as a finding, and as no failure.

**Specialty chain.** For each declared specialty: the specialist authority appears in Authorities, the specialty document appears in the declared-documents table, and its sign-off appears as its own numbered closure condition. Any missing link is a **fail**.

**Spawning obligations.** The declared-documents table covers the root SPEC, **at least one Test Plan for every Mission shape**, and every declared specialty document; the root SPEC's three spawning obligations carry no shape condition. **The ARCH is not root-SPEC-spawned:** it is tracked through the VF ledger and noted beside the table. An ARCH inside the declared table is a **finding** naming the note the law asks for, and no failure, because the law states where the ARCH is tracked and attaches no verdict to its appearance in the declared list. An ARCH in the collection with no note beside the table is a finding.

**Modules-IP coherence.** A Module with no IP is a finding, and no failure: the Definition permits declaring a Module whose MO participates in cross-module review.

**Produces-Closure coherence.** `Produces` non-empty and no closure condition naming the declared tiers is a **fail**.

**The Advances gate.** Determine whether the Mission extends a Product (Identity Product references non-empty) and whether that Product has a Product Vision (a `PROD-{product}-{seq}` artifact resolves - `mc17 read search`). If both hold, `Advances` is required and its absence is a **fail**, and each `{PROD-id} § {element}` reference resolves or the field **fails**. If the Vision exists but carries a human title in place of a formal id, `Advances` is still required: cite the Vision by its current title and record a **warning** that it needs a formal identifier. Do not hard-fail the Manifest for a defect on the Product axis. If the determination cannot be made within reach, record an **unresolved determination** and put the question to the BO, and never a silent pass or fail.

**Supersedes exclusivity.** `Supersedes` is non-empty only on a Revision Mission.

**Methodology pin consistency.** The version each pin line names matches the version of the document it links, or this is a **fail**. Where the pinned version has since been superseded by a newer Living version, note the available migration for the BO; do not fail, and do not re-pin. A trial Mission whose drafts have since gone Living gets the same note: the re-pin is a governed Manifest change with the ordinary staling consequence.

**Tracked-table completeness.** The tracked table is live state, sits outside the binding, and is still checked. `mc17 linkpass <manifest_asset_id>` reports the rows, which carry a resolved asset id, which still carry the creation skill's placeholder, and which carry neither.

- Every declared document has a row, and so does every verification and approval artifact that has arisen, the VF ledger included.
- **Each Doc name cell carries the document name and its platform asset id, in one canonical form.** Every row the tool lists as carrying neither an id nor the placeholder is a **fail** naming the row, because the graph edge and the later reader both run off the id. A row still carrying the placeholder is a **fail** on the same ground, and the finding names the creation skill's link pass as the repair.
- **Every approval entry carries four elements: its authority, its APR reference, its datetime, and its binding.** An entry missing any of the four is a **fail** naming the row and the missing element.
- **An approval whose record landed outside this Mission's collection is a fail**, because the tracked table is complete only when every approval the Mission granted is inside the Mission. Detection: `mc17 read search --q "APR-{SCOPE}-"` over the corpus and read the collection id of every hit; a hit whose collection id is not this Mission's is a **fail** naming the APR and the collection it landed in. Where the search cannot run, record an **unresolved determination**.
- **Every tracked IP row whose state word reads `Landed` or `Landed-on-branch` has a tracked IR row naming it** (`IR-{SCOPE}-{IP}-{SEQ}`), and a landed IP with no such row is a **fail** naming the IP. `mc17 check` reports the join under "Landed IPs and their Implementation Reports" and prints how many rows it compared. **A join that compared zero rows while the tool lists IP rows naming a wave or a tip sha is a fail** naming each such row: the row is landed work wearing no state word, and a join with no subjects proves nothing (Definition closure condition 1; Mission KnowledgeDomain's five reports stood owed behind a passing join, VF-KDOM-001 record 34). Seventeen-16 landed a merge whose report nobody wrote and nothing asked: the apparatus validated the form of a present IR and was blind to an absent one, so this check exists.
- **The Rulings register** (Definition Section 1, *The Rulings register*; IP-MC17-004). Resolve `RULINGS-{SCOPE}-001` in the census and run `mc17 rulings <register_asset_id> --ledger <ledger_asset_id>`. Each entry the tool marks `FAIL` carries an empty Implemented-in or Verified-by field, a deferred act past its date, or a deferred line reading `UNREAD`, and is a **finding** of this verification naming the entry and what it lacks; the Move sweep is where it fails. A row the tool marks `UNFENCED` is a **finding**: the words stand where the lint can rewrite them. **A Mission with no register is recorded as owing one and passes this check**, so a Mission created before the rule stands; the register row, where it exists, is tracked beside the table like the Wave Plan's.
- **The APR scheme as declared.** `mc17 check` now reads field 22 itself, keyword and id form both, and prints which it read. A `FAIL` line saying the keyword and the id form disagree is a **fail** naming field 22: a Manifest that says one word and shows the other form has declared nothing the gate can honour (VF-KDOM-001 record 16).
- **The Operational parameters table** (Definition Section 1 as amended at `VF-MC171-001` record 480; `IP-MC171-022` D-3). `mc17 check` prints each row of the table under `Operational parameters` as in force or absent with its reason, where the run gave it `--ledger`. Each absent row is a **finding** naming the row and the reason the tool printed: the row names no record, the ledger holds no such record, the record is of another kind than ruling, or it carries no authority words; two rows of one name in force are one finding naming both, because neither binds. A row printed `unread` is a read failure of the run, because the command ran without the ledger; run it again with `--ledger` before anything is judged. The reader of an absent row takes the default the plugin ships and says so, so an absent row moves no standing, and the finding is what gets the row repaired. A Manifest with no section has no rows and passes this check.
- A row is never deleted: a deleted row is a **fail** where the ledger shows the row existed, and the Approvals cell of a document whose binding moved reads `none current; earlier records {a}, {b}`.
- A Status cell states the state word first, then the ledger record, the APR ids, the merge sha and check count where they apply, and the date; a cell that leads with anything else is a finding.
- **A finding on the tracked table never moves the binding**, so it never stales the Manifest's approvals or the chain beneath it. Report it and leave the binding where it stands.

#### 5d - Naming checks

`mc17 check` runs the naming checks and prints each as `ok` or `FAIL` with the wanted form beside the found one: the asset title, the VF ledger id, every APR id against the scheme in force (field 22), every IR id, and the Type of every tracked row against the closed type set. **Every `FAIL` here is a fail of the verification**, with one exception the tool cannot read and this skill judges: a flagged Type passes where the Mission declares its Type column open and names that type with its id form.

- **The status line** stands directly under the H1, on the first non-blank line beneath the title heading. The position is what lets the binding lift the line out by reading alone, and `mc17 binding` reports the line it matched.

#### 5e - Compile the result

Result is **Pass** or **Fail**.

- Pass: every field present, every consistency check passed, naming correct. Warnings and unresolved determinations may stand on a Pass, and each is listed.
- Fail: every failing check listed with its explanation and the repair.

The binding is computed regardless of the result, so a failed verification still records the content state that was verified.

**Judgments are listed separately and decide the result in no case.** A judgment this skill declines to make is recorded under its own heading in the record, naming the rule it belongs to and the person it goes to.

### Step 6 - The VF ledger

**The ledger is a JSON asset.** It is a markdown document in no sense, it holds no headings, and `appendSection` is never called on it. Its content is one object bound to the typed ledger schema through its own `$schema` key; records are appended by `mc17 append` and read by record.

| | |
|---|---|
| Schema asset | `{schema_asset_id}`, the asset `mc17 upload --ledger-schema` prints at 6a: the one document titled `ledger-hybrid-v1.schema` that this CanonQ instance holds. Its id differs on every instance |
| Binding form | `"$schema": "canonq:asset:{schema_asset_id}"` as the object's first key |
| Worked example | asset `61165f30-fed1-4b53-84f9-2e3805173c85`, titled `VF-DEMO-ledger` |
| Write | `mc17 append`, which sends the one-operation patch the platform applies atomically under a row lock |
| Read | `mc17 read record --ledger <ledger id> --n <n>` for one record, or `mc17 read tail --ledger <ledger id> --count <k>` for the last k records |

Locate the ledger: `mc17 read collection --id {collectionId}`, exact title `VF-{SCOPE}-001`.

#### 6a - The schema resolves before anything is written

```
mc17 upload --collection "{the Manifest's collection id}" --ledger-schema
```

It runs against **this Mission's corpus**, the one the signed-in tenant reaches. CanonQ numbers a ledger's records from the schema the ledger's `$schema` names, so that schema has to stand in this corpus. **Each CanonQ instance holds its own copy of the schema**: its admin uploads `ledger-hybrid-v1.schema.json` under the title `ledger-hybrid-v1.schema`, pins it in `QAPP_LEDGER_SCHEMAS`, and keeps it where the DevyonQ connection reads. The command finds the one document of that exact title, reads CanonQ itself to confirm the schema numbers records, and uploads nothing. It prints the asset as `Schema: {schema_asset_id}` and the line `Bind a new ledger with: "$schema": "canonq:asset:{schema_asset_id}"`. Take `{schema_asset_id}` from that output into 6b and 6c. **Never write a schema id from anywhere else into a ledger**: the id differs on every instance, and under an id this corpus does not hold every record lands as number 1. `mc17 upload` refuses such a ledger before the send.

**This read proves the schema is reachable, and proves nothing about writing against it.** The platform compiles the bound schema on the write path, and a schema that reads back perfectly can still refuse every write on that instance. That failure has its own error shape and surfaces at the first append; it is handled at 6f. A clean 6a is no green light for the write half.

**Where the command fails, STOP and write nothing.** The `$schema` key a ledger carries has to resolve in the corpus the ledger lives in, for the reader who opens it. Report the command's output whole, and that no schema that numbers records stands in reach of this corpus under this sign-in. **Never create a ledger with an unresolvable `$schema`, and never inline the schema into the ledger to work around a missing grant** - an inlined copy is a second schema that drifts, and the platform validates against the bound asset.

#### 6b - Creating the ledger, first run

`mc17 create` writes markdown and cannot produce a JSON asset. The ledger is created with `mc17 upload`, which carries the file's bytes.

**Build the file with `bash_tool`.** Write the object to a file named `VF-{SCOPE}-001.json` and validate it parses. Hand-encoding is never done, because a malformed body would reach the store as an unparsable asset.

```bash
# $L is the file VF-{SCOPE}-001.json, holding the ledger object written from the template below
python3 -c "import json,sys; json.load(open('$L'))"
```

Then:

```
mc17 upload --collection "{the Manifest's collection id}" -f "$L"
```

The upload carries content type `VF`, authority `A3`, lifecycle `current`, the Manifest's scope tags (which already carry `mission:{scope-lower}`), the Manifest's primary Domain, no AI description, and the description "The verification ledger of Mission {mission_name}. One record per verification edge, appended by mc17 append under ledger-hybrid-v1.schema.", each by the flag `mc17 help` prints for `upload`.

**The filename carries the doc name.** CanonQ strips the extension to form the title, so `VF-{SCOPE}-001.json` gives an asset titled `VF-{SCOPE}-001`, which is the ledger id the naming scheme fixes. **Read the title back** with `mc17 read collection --id {collectionId}` before writing the tracked row: the title is this line's only exact lookup, and a title that came back as anything else is repaired by re-uploading under the right filename, and never by writing a row that names a title the collection does not hold.

**Then prove the stored bytes, because a title readback proves nothing about them.** This is the write that brings an append-only ledger into existence: one flipped character lands a bootstrap body that differs from what it claims, and nothing downstream reads it. Hash the stored text and the local file:

```bash
mc17 hash {ledger_asset_id}
mc17 hash -f "$L"
```

`mc17 hash` reads the stored text as the engine reads it, so equal figures mean the store holds what was built. Unequal figures are repaired by re-uploading, and never by patching over the difference, and the check goes into the run's findings either way. Where `mc17 hash` cannot run, say in the findings that the ledger's bytes stand unproven.

**Two things `mc17 upload` does not carry, stated here and never hidden.**

- It has no `classifiedBy` parameter, so the ledger is created with the platform's default in place of `classifiedBy: human`. Record this in the run's findings. **Do not reclassify the asset to repair it** - facet promotion is the authority's own act, and this skill reclassifies an asset never.
- It has no `title` parameter. The filename is the only place the doc name is set.

#### 6c - The ledger object, and its bootstrap record

The created object is exactly this shape. `mission` carries the Mission name, `ledger` is the constant `VF`, and `records` holds one record: the bootstrap.

```json
{
  "$schema": "canonq:asset:{schema_asset_id}",
  "mission": "{mission_name}",
  "ledger": "VF",
  "records": [
    {
      "n": 1,
      "at": "{ISO 8601, second-accurate, read from the clock at this moment}",
      "kind": "bootstrap",
      "verdict": "NA",
      "refs": [
        { "doc": "MANIFEST-{SCOPE}-001", "asset": "{manifest_asset_id}" },
        { "doc": "ledger-hybrid-v1.schema", "asset": "{schema_asset_id}" }
      ],
      "evidence": [
        {
          "command": "mc17 upload --collection {the Manifest's collection id} --ledger-schema",
          "output": "{the two lines it printed, verbatim}"
        },
        {
          "command": "mc17 binding {manifest_asset_id}",
          "output": "{the raw output of the binding computation this run performed}"
        }
      ],
      "body": "{the bootstrap body, per the five parts below}"
    }
  ]
}
```

**The bootstrap record's `body` is where the ledger's own apparatus lives**, because a JSON ledger has no headings to put it under. The law asks that a later reader recompute a hash and test a binding without asking the agent that wrote it. Five parts, in this order, as plain text with newlines:

1. **The reader line.** Who this ledger is for and what they get from it.
2. **The AO line**, in the form `AO: {name} ({human | AI, with its named human escalation contact})`, carrying the Manifest's default AO. **This is where the AO gate in 5c reads the ledger's AO from** - the JSON ledger has no `**AO:**` markdown line, and the gate is satisfied by this line. A ledger with no AO would be the one artifact of the Mission escaping the AO gate.
3. **The summary.** Two sentences: what this ledger holds, and how a reader uses it - by record, one record at a time.
4. **The binding recipe, by citation.** The projection id `mc-v17-manifest-text-projection/2`; the six excluded parts, each as the literal heading string that identifies it; the implementation that computes it, `devyonq-mc/mc17`, subcommand `binding`, with the file's `shasum -a 256` figure read at this moment; and the stated fallback binding with the rule that its use is always named. **The recipe is cited and never transcribed**, so the reader runs the code every run of this line runs.
5. **The pinned-document hash, by the same citation.** `devyonq-mc/mc17`, subcommand `hash`, with the known figure for `DRAFT-GUIDE-V17` beside it as the reader's own self-test, because this ledger records comparisons run under it. **The self-test target is Archived on purpose and that is lawful here**: archived means frozen, a self-test needs a figure that never moves, and the pin rules govern pins alone, which a self-test is never. Seventeen-15 read the archive mark as a contradiction and substituted the Living document, whose hash moves with every edit; this sentence is what was missing.

**Where the ledger exists and holds no bootstrap record,** append one before appending this run's record. Check with `mc17 read record --ledger {ledgerAssetId} --n 1`, and where record 1 is of another kind, with `mc17 read tail --ledger {ledgerAssetId} --count {k}` over the rest; no record whose `kind` is `bootstrap` is the case. An append adds and edits nothing, so the append-only rule holds. This is no Fail on the Manifest.

#### 6d - Appending a record

One record, one command. Write the record to a file with `n` left out, as *Writing a ledger record* says, and run `mc17 append {ledger_asset_id} --record <record.json>`. The command refuses, before any send, a record that carries a number or lacks a required field; sends one patch that adds the record at the end of the ledger; and looks for its own record by its mark before it ever sends again, so a write sent twice lands once. It is the only thing that writes to a ledger, and a correction is a new record naming what it corrects.

#### 6e - The platform assigns `n`. There is no numbering step

**This skill computes no record number, and sends none.** `n` carries `x-canonq-sequence` in the bound schema, so the platform assigns it on the append. `mc17 append` composes the patch from a record written with no `n` and refuses, before any send, a record that carries one; the number is read back by pointer after the send, as 6d says.

The law: *"The sequence number is assigned by the platform on append. An agent that sends one has it overwritten, so numbering is a property of the write and never a count of headings."* The former step, which read the highest record number present and added one, is **deleted**: it counted markdown headings and raced any concurrent append, and the platform's row lock settles both. Do not reintroduce it in any form, including as a check on the number the platform returned.

**The bootstrap record is the one record the platform does not sequence**, because it is bytes inside the file `mc17 upload` carries and no array append. The `1` written at 6c is therefore the number that record keeps, and `mc17 read record` confirms it.

**The command reads the assigned number back and prints it; name that number and no other.** The stamp in Step 7 names the record, so the append happens first.

The command found its own record by its mark, and the number it printed is the number the stamp carries. Where another writer appended between the send and the read, the mark still finds the right record: re-read by selector on this run's `at` value.

#### 6f - A refused write, and what is done with it

A patch whose result violates the bound schema answers **422**, names the failing pointer and the constraint it broke, and **stores nothing**. Two shapes, as the platform returns them:

```
Patch refused, nothing changed - schema violation at /records/2/verdict:
enum: must be equal to one of the allowed values {"allowedValues":["PASS","FAIL","BLOCKED","NA"]}
(schema: canonq:asset:{schema_asset_id})
```

```
Patch refused, nothing changed - schema violation at /records/2:
required: must have required property 'authorityWords' {"missingProperty":"authorityWords"}
(schema: canonq:asset:{schema_asset_id})
```

**What the agent does with it, in order:**

1. **Read the pointer.** `/records/2` is the index the record would have taken, so the trailing segment names the field: `/records/2/verdict` is the verdict of the record just sent, and a bare `/records/2` is a rule about the record as a whole. The pointer is the repair address.
2. **Read the constraint.** `enum` names a closed vocabulary and lists the allowed values. `required` names a missing property and, for `authorityWords`, names the conditional rule: an `approval`, a `ruling` or a `closure` carries the authority's own words or it is not written.
3. **Repair the value, then send one corrected patch.** The repair is a change to the record, made once, from the constraint the platform named.
4. **Nothing landed.** No readback is owed after a 422, because the refusal is the response and it is explicit that nothing changed. Readback-before-retry covers a lost or timed-out response, which is a different case.

**Never retry a schema violation blindly.** Re-sending the same patch gets the same 422, and re-sending it with the constraint smoothed over - a verdict bent to `NA` to clear an `enum`, empty `authorityWords` to clear a `required` - writes a false record to satisfy a validator. Where the correct value is not available to the agent, the record is not written: report the refusal with its pointer and constraint, name what is missing and who holds it, and stop. **An authority's words are never invented to make an approval record land.**

**A third refusal shape, about the platform and no record.** The platform also answers 422 when the bound schema itself will not compile:

```
Patch refused, nothing changed - the bound schema
(canonq:asset:{schema_asset_id}) is unusable: The bound schema does not compile.
```

**It carries no pointer, so step 1 has nothing to read and no repair to the record clears it.** Every JSON asset bound to that schema is refused the same way until the platform is fixed. Confirm it in one call, by patching another ledger bound to the same schema and seeing the identical refusal, then **stop, write nothing, stamp nothing**, and report the schema asset id, the refusal verbatim, and that the ledger cannot be written until the platform's Technical Owner clears it. Never rebind the ledger to another schema asset or inline a copy; the binding is the Mission's, and changing it is a recorded act with its own authority.

**Where the same patch is refused for a reason this skill cannot place** - a pointer naming a field the run did not send, or a constraint absent from the schema read at 6a - stop after the first refusal and report it verbatim. Two refusals in a row on one record is the point at which the run stops and asks, and never the point at which it tries a third shape.

#### 6g - Readback before retry

Where a write **errors or times out** without a 422, read the object back before any retry: a write whose response was lost may have landed, and the append is atomic, so a re-read settles it.

- **An append:** `mc17 append` does this itself: it looks for its own record by its mark before any second send, and sends again only where the mark is absent.
- **A creation:** `mc17 read collection --id {collectionId}` for the exact title `VF-{SCOPE}-001`. Retry only where it is absent.

Where a retry lands a duplicate, the first occurrence is authoritative and an erratum record leaves both in place. No record is ever deleted to tidy this.

#### The VF record this run appends

```json
{
  "at": "{ISO 8601, second-accurate, read from the clock at the moment of the act}",
  "kind": "verification",
  "verdict": "PASS | FAIL | BLOCKED",
  "refs": [
    { "doc": "MANIFEST-{SCOPE}-001", "asset": "{manifest_asset_id}" },
    { "doc": "Mission - Definition v1.7", "asset": "{definition_document_id}" },
    { "doc": "Mission Control Guide v1.7", "asset": "{guide_asset_id}" },
    { "doc": "Agent-Fleet Execution Profile v1.7", "asset": "{profile_asset_id}" }
  ],
  "evidence": [
    { "command": "mc17 binding {manifest_asset_id}", "output": "{its raw output}" },
    { "command": "mc17 hash {each pinned asset id}",  "output": "{its raw output}" },
    { "command": "mc17 check {manifest_asset_id} --ledger {ledger_asset_id}",    "output": "{its raw output}" },
    { "command": "{any other command a finding rests on}",    "output": "{its raw output}" }
  ],
  "body": "{the record body, per the parts below}"
}
```

`kind` is `verification` for this edge. `verdict` is `PASS` or `FAIL` from 5e, or `BLOCKED` where the run stopped against something outside the Manifest, such as an unreadable census. **`n` is sent as `1`, and the platform overwrites it with the real number** (6e). `authorityWords` is not sent, and is not this skill's to write: it belongs to the `approval`, `ruling` and `closure` kinds the approval and closure skills own.

**What goes in `refs`, and what goes in `evidence`.** Every artifact the record refers to is a `refs` entry with its doc name and, where it has one, its asset id. **The template above carries the four this edge always names, which is a minimum and no closed list**, and only `refs[0]` is fixed. Every claim the record makes that a command established carries that command and its raw output in `evidence`. A claim with no command beside it has nowhere in the record to sit, which is the schema enforcing what the law asks for. **The commands are the tool's own**, so a later reader reproduces a figure by running the line the record carries.

**The `body` carries, as plain text with newlines, in this order:**

- **Corpus:** the CanonQ instance this run read and wrote, with the gateway and the tenant `mc17 version` prints.
- **Pin:** `Mission Control v1.7 (living)` or `Mission Control v1.7 (trial, on drafts)`.
- **Pinned documents:** Guide, Definition and Profile, each with its hash, its read date and its status, or `not applicable: {reason}` for the Profile.
- **Result:** Pass or Fail, and the sentence that says which.
- **Binding:** `sha256:{hex} (projection mc-v17-manifest-text-projection/2)`, or the stated fallback binding with the reason it was used.
- **The Verified line**, on a line of its own with nothing before it. The record's body carries the line `Verified: {document id} version {n}, binding sha256:{hex} (projection {id})`: the document id `MANIFEST-{SCOPE}-001`, `{n}` the current version `mc17 versions` printed, and `{hex}` and `{id}` the figure and the projection `mc17 binding` printed. `mc17 published` reads it when an authority reads the document.
- **Findings:** itemized, each naming what was checked and the result.
- **Owed runs:** on a moved binding, each dependent edge with the skill that runs it; on a Fail, the artifacts that wait on this gate, because no declared spawned document is verified before its Manifest is. Either way name the skill, or say `not installed in this line, a manual act`. Where neither case applies, the part reads `none`.
- **Judgments surfaced:** each rule this verification could not check, its question, and the authority it goes to.
- **Unresolved determinations:** only where present - what could not be reached, and why.
- **Issues found and resolved:** only where applicable.

**On a trial pin the body carries one further line, verbatim:** *This Mission's conclusions carry no force outside itself while its pin stands on drafts.*

Every datetime is read from the clock at the moment of the act it records. An estimated timestamp is never written.

### Step 7 - Stamp the Manifest

**The append runs before the stamp, and the record number comes back from it.** The platform assigns `n` (Step 6e), so there is no number to write until the record is written. Append with `mc17 append`, take the number it prints, then stamp.

**On a Fail, write nothing to the Manifest, with one exception stated below.** Mission Definition v1.7 Section 10: *"A verification that returns FAIL stamps nothing and directs no edit to the status line."* Append the record and stop. Do not set the status line to Draft, and do not write a `Failed` stamp. Where a later run passes, writing the stamp is a separate versioned update.

**The exception: the ledger's tracked row is written on every run that created the ledger, whatever the verdict.** The row is live state, so writing it moves no binding and stamps nothing. Without the exception the skill deadlocks: the AO gate fails a ledger with no row, a creating run that returned FAIL would write no row, and no later run could ever write it. That is the ordinary path, and no corner case, because a newly scaffolded Manifest carries `[TBD]` in four blocking fields and so fails its first verification by construction. On a Fail the write is one `mc17 amend` carrying item 4's ledger row alone: the VF Stamp block, the status line and the Approvals section are left exactly as they stand.

**On a Pass,** update the Manifest with **one amend** that changes exactly these things and leaves every other byte untouched. **Compose the edits into a file and send them with `mc17 amend <manifest_asset_id> --edits <f.json>`**, the route in the prerequisites table, which takes the edits off disk, so none of the Manifest passes through the model's own output, where one silent slip inside a declaration moves the binding this act promises to leave alone. **All four writes land inside the six excluded parts, so this act moves no binding**, which is what makes it lawful to stamp an artifact the run has just bound. **Prove it:** run `mc17 binding <manifest_asset_id>` again after the write, and the figure is the one the record carries. A moved figure means the replacement touched a declaration; the repair is a corrected amend plus a finding, and never a rewritten record.

1. **The VF Stamp block**, in its existing position:

```
## VF Stamp

- **Status:** Verified
- **Last verified:** {ISO 8601, second-accurate}
- **Record:** VF-{SCOPE}-001, record {n} - asset {ledger_asset_id}, pointer /records/{n-1}
- **Binding:** sha256:{hex} (projection mc-v17-manifest-text-projection/2)
```

2. **The status line under the H1, which carries the header status word.** The verification act writes it, and the approval act never does:

   - Read the current binding, then read the Approvals section for an approval record naming that binding. An approval record stands in the form the Manifest's tracked table declares: `{authority role} {name} - {decision} - {APR id} - {datetime} - binding sha256:{hex} - ledger record {N}`. A record in another form is read as best it can be and a finding names the malformed entry.
   - **Where an approval bound to the current binding is found, write that approval's decision into the header.**
   - Where the newest approval names a **prior** binding, the header reads `Verified`.
   - Where **no approval exists**, the header reads `Verified`.

3. **The Approvals section.** This run writes nothing into the Approvals section, and an approval that names a prior binding is a finding the record names: the write that changed the text removes the approvals of the old text and names their records in its Change Log row, so an entry standing at a prior binding is one that write did not remove.

4. **The tracked-documents table**, brought current in the same call: the Manifest's own row and the rows brought current with the cells the amend wrote, marking no row `Stale`, and, on the run that created the ledger, a new row for `VF-{SCOPE}-001`. That row fills all seven columns the table carries: **Doc name** the ledger's title with its asset id in the canonical form, **Type** `VF`, **AO** the default AO read from the bootstrap record's `AO:` line, **Work mode** `gated`, by field 6's rule that a class the Work modes field does not name runs as gated, **Status** `Created, {date}` on the run that created the ledger, which is the state word 5c reads for, and the state this run leaves it in with the date on any later run, **Verification** `N/A`, because the ledger is where verifications are recorded and is itself no verified artifact, and **Approvals** `None`. The row names the ledger by the title `mc17 read collection` returned at 6b, and never by the filename it was uploaded under.

Nothing else in the body is touched. The Manifest's declarative content is edited by this skill under no circumstance - a defect in a declaration is reported and repaired by its AO.

**Lifecycle facet.** The Lifecycle facet stays `draft` through verification. `Verified` lives in the status line and the VF stamp. Promotion of the facet is the Business Owner's own act in the application. Never reclassify the asset here.

**The verification owed.** Where `mc17 amend` printed `VERIFICATION OWED NOW: {skill}` as its last line, run that skill over the document before this skill reports: the stamp, the status line and the tracked rows are live-state writes and owe none; a line `NO VERIFIER: {class}` owes nothing.

## Important rules

- **This skill is the gate for the whole Mission.** No declared spawned document is verified before its Manifest is.
- **One `mc17 amend` per artifact per run.** The stamp, the header status word and the tracked rows go in a single amend; the ledger record goes in a single `patch`.
- **Do not fabricate a verification result.** Check each field and each consistency rule. Where a determination cannot be reached, record it as unresolved and name the question, and never a silent pass.
- **Return FAIL when uncertain.** A FAIL that leaves an owner with no verified text to sign is the correct output.
- **Never touch the Manifest's facets.** `classifiedBy: human` protects them, and lifecycle promotion belongs to the authority.
- **State the disagreement before complying.** Where a correction to this skill's finding arrives, give the verdict and the argument first, then execute.

## Communication

The run summary is written for the Business Owner and the Technical Owner, in human language, and it leads. The dense material sits beneath it.

**On a v1.6 pin:** "This Manifest is pinned to Mission Control {version}. This skill implements v1.7. Run `mc-vf-manifest-v2` for a CanonQ-native Manifest, or `mc-vf-manifest` for a Notion-platform one. Nothing was written, and the Manifest is not marked failed. Moving this Mission to v1.7 is a BO/TO migration decision recorded as a Manifest change."

**On no readable pin line:** "This Manifest's Methodology Reference carries no readable pin line, so I cannot tell which line this Mission belongs to, and I will not derive it: a pin is declared and never discovered. Its AO repairs the Methodology Reference as a Manifest change, naming Mission Control v1.6 or v1.7. Nothing was written."

**On a trial pin:** "This Mission declares itself a trial of the v1.7 drafts. Verifying under the trial pin. Its conclusions carry no force outside itself while its pin stands on drafts. {n} of 3 pinned documents still hash to what the Methodology Reference recorded."

**Verification result:** the field checklist as a table (field, Pass/Fail, note). The consistency checks as a list. The overall result, **Pass** or **Fail**, with each issue and its repair. The new binding and its projection id. Then the judgments surfaced, each with the person it goes to, and any unresolved determinations.

**On a Fail:** "Verification **failed**. {count} issue(s). Record {n} documents them, verdict FAIL. The Manifest was not stamped and its status line was not edited. Fix and re-run."

**On a figure the program could not compute:** "{The figure} could not be computed: {what stopped it}. Nothing was written that would rest on it, and I have not substituted a hand-computed figure for it."

**On a refused ledger write:** "The ledger refused the record: schema violation at {pointer}, {constraint}. Nothing was written. {What the value has to be, or what is missing and who holds it.}" Where the correct value is not the runner's to supply, the run stops and nothing is stamped.

**On an unusable ledger schema:** "The ledger refused the record: the bound schema {binding} is unusable - {the refusal verbatim}. This is a platform fault, and no pointer was named. Every asset bound to that schema is refused. Nothing was written and nothing was stamped. It clears when the platform's Technical Owner clears it."

**On an unresolvable ledger schema:** "`mc17 upload --ledger-schema` found no single document titled `ledger-hybrid-v1.schema` that numbers records in {instance} under this sign-in: {its output verbatim}. No ledger can be created, because CanonQ would number none of its records. Nothing was written. The instance's admin uploads `ledger-hybrid-v1.schema.json`, pins it in `QAPP_LEDGER_SCHEMAS`, and keeps it where the DevyonQ connection reads."

## The harness binding

Mission Definition v1.7, *The Orchestration Harness*: a rule a machine can check names its check; a check names its rule; a rule with no check says it is a judgment.

**That binding is one document for this family, and it is `TRACE.md`, which stands in the plugin's source repository at `core/TRACE.md` and in no installed package.** It carries every Definition rule these two skills enforce with the step that enforces it, every check these two skills run with the rule it enforces, and every rule the law states that these skills declare a judgment. TRACE.md in the source repository is written for a human reader and is kept current with the skills. A change to a check in this file that TRACE.md in the source repository does not carry is a defect in whichever of the two was not updated.

**Every check has a case it must be seen to fail on.** For the checks that live in code, the cases are `core/harness/mc17.test.js` in the plugin's source repository, and `node mc17.mutations.js`, the drill at `core/harness/mc17.mutations.js` in the same repository and in no installed package, breaks each check, watches it go red, restores it and watches it go green, printing how many were proven. For the checks that live in this file, the cases live in `fixtures/failing-cases.md` beside it, one case per check, each stating the defect it plants and the check that must catch it. A check whose case has never been run proves nothing about the rule it claims to enforce.

### Writing a ledger record

**Write the record file with the file tool, and let `mc17 append` put each output into it.** Save each command's output in a file of its own, as `mc17 fields ip {asset id} > fields.txt`. In the record, give that output as an evidence entry naming the file, `{"command": "mc17 fields ip {asset id}", "outputFile": "fields.txt"}`, and name every such file in the append:

```bash
mc17 append {ledger_asset_id} --record record.json --evidence fields.txt,binding.txt --json
```

- **Why:** a script that reads a file Windows PowerShell 5.1 wrote, which is UTF-16, as UTF-8 puts NUL characters into the record, and the ledger keeps them. `mc17 append` reads each `--evidence` file in UTF-8 or UTF-16 and puts its text in word for word, and it refuses, before the send, a record that holds a NUL or the character U+FFFD.
- **The time:** leave `at` out of the record; the command writes the time of the append.
- **The number:** take the record's number from the field `n` of the `--json` answer, never from a pattern matched over the output.
- **No script builds the record.** The record is one JSON file written with the file tool, its body a string with `\n` between its lines.

**Read each `mc17` output whole.** A filter such as `Select-String -NotMatch` or `grep -v` over the output hides the lines written for you, and a `Changed:` line of `mc17 plain` is the line most often lost that way.

**One `mc17` command per shell call**, with nothing chained before or after it and no variable holding the launcher's path, so the person reads each command whole at its approval. A redirection of its output into a file, `> fields.txt`, belongs to the command. Write every other file with the file tool.

### Rules this skill cannot check, stated as judgments

Each of these is a rule of the law that no check here enforces. The skill surfaces the question and names the person it goes to. None of them decides a Pass or a Fail.

- Whether the Move actually advances the cited Product Vision element. The Definition names this a BO-approval judgment. Goes to the BO.
- Whether a compensating control named for a collapse of authorities is adequate to the collapse. Goes to the BO.
- Whether the Manifest's Summary can be acted on by the human reader it names. The Definition puts this with the named reader. Goes to that reader.
- Whether a closure condition that names no foreign Mission nonetheless waits on another Mission's process. Goes to the BO.
- Who authored a given closure condition, where the Manifest carries no authorship statement. Nothing in the ledger records the authorship of a condition, so the labelling rule has no evidence source here. Goes to the BO.
- Whether the sanctioned runner's declared block hash is the hash of the runner a launch actually used. The declared hash's **resolution** is checked in 5c by running the runner's own normalizer; this entry is the launch-time question alone, which needs the run records. Goes to the TO.
- Whether the writing lint's launch-holding claim rests on a real recorded non-zero exit that held a real launch. The check reads the citation; whether the cited record says what it is claimed to say is read by the TO.
- Whether a declared merge bar's named gates are the gates that actually run. Needs the enforcing system. Goes to the TO.
- Whether a Mission ID deviation's named authority in fact outranks the derivation. Goes to the BO.
- Whether the Standard-versus-Platform discriminator was drawn correctly for a Mission producing more than one PL. Goes to the TO.
- Whether the execution machinery declaration is current against the machinery in use. Goes to the TO.
- Whether the orchestration performs the downstream re-runs a moved binding owes. This skill names them and runs none. Goes to the TO.

### Rules checked by another member of this line, and no gap here

These are neither this skill's checks nor its judgments. They are edges another skill owns, named so the reader reads their absence correctly.

- **Whether a declared Consumes stance matches how the consuming code actually integrates.** The Consumes-PL edge. `mc-vf-pl-v17`, which is not yet installed in this line; until it is, the edge is verified by hand against the pinned Definition.
- **Whether the root SPEC's content aligns with this Manifest.** The SPEC-Manifest edge. `mc-vf-spec-v17`, installed in this line since 0.1.18, owns it.

### The one passage where two readings are open

Section 10 gives the VF Stamp block a `Status` field valued `Verified` or `Failed`, and the same section rules that *"a verification that returns FAIL stamps nothing and directs no edit to the status line."* Read together, a FAIL can never write the `Failed` value through this act.

This skill takes the second passage as governing its own conduct: on a FAIL it writes the ledger record and performs no write against the Manifest. The `Failed` value stands in the block's vocabulary for stamps written by other means. The reading is recorded here and resolved silently in no way, because the Definition rules that where the law and the harness disagree neither wins by default, and which one carries the defect is a decision recorded against the rule. **This one goes to the Technical Owner of the methodology.**

### The writing rules, over every governed file the Move produced

Profile rule 7.9 says the lint reads each governed file, and rule 132 names returns and briefings.
An implementation report is a governed file, written by a fleet agent, and it lands in the corpus
as an asset id. Run the lint over each one by id:

```bash
mc17 lintdoc {asset id}
```

It fetches the stored body, runs the writing lint over it, and exits non-zero naming each line and
rule. It calls the same lint the creation skill calls, so there is one check set and one
implementation. A hit is a finding on the artifact and its author, and it is repaired in the
artifact.

Run it over every IR, handoff, wave plan and coherence contract the Move produced. Measured on
Mission SaaS_VRI on 2026-08-19, its twenty-one implementation reports carried 284 violations
between them, and the count per report ranged from 0 to 33. Nothing had ever read them.

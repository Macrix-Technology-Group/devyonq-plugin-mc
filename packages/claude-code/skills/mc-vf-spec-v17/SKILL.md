---
name: mc-vf-spec-v17
description: "Verify a CANONQ-NATIVE v1.7 root SPEC against its Manifest. Upstream gate: the Manifest carries a PASS verification in the VF ledger. Mechanical reads via mc17 (fields spec, binding --class artifact); judges the Move declaration, the acceptance criteria's identifier discipline (AC-n, which mc-vf-tp-v17's traceability join reads), and the ARCH references against the Mission's shape. Appends a verification record; on PASS stamps by guarded amend, on FAIL stamps nothing. Triggers on \"verify spec v17\", \"mc-vf-spec-v17\". Optional argument = specnum (default 001)."
---

# mc-vf-spec-v17

Read this file to the end before acting. The tool reports; this skill judges. `mc17` is the launcher `client/mc17` two levels above this skill's folder, from a POSIX shell, Git Bash included, and `client/mc17.cmd` from PowerShell or cmd; where a command will not run, name the figure it owed and stop. Every record this skill appends carries `recordedBy`, the name of the person or session that writes it down, on a ledger of either version.

## Parameters

- **?** - display the block below and stop.
- **specnum** (optional) - default `001`, the root SPEC.

```
mc-vf-spec-v17 v0.1.0 (MC 1.7 - CanonQ-native)
Parameters: ?  |  specnum (default 001)
Mechanical half: mc17 (version, fields spec, binding --class artifact, status, amend).
Upstream gate: the Manifest verified PASS in VF-{SCOPE}-001.
Notion or v1.6 SPECs: mc-vf-spec (v1) or mc-vf-spec-v2.
```

## Step 0 - Which copy, which Mission, which line

`mc17 version`, exact-title resolution of `SPEC-{SCOPE}-{specnum}` and `MANIFEST-{SCOPE}-001`, limit 50, the candidate-generator rule. Pin gate: v1.7 proceeds, v1.6 routes to `mc-vf-spec-v2` without a record, no readable pin stops.

## Step 1 - The upstream gate

```
mc17 read tail --ledger {ledger_asset_id} --count 50   # the records whose refs[0].doc is MANIFEST-{SCOPE}-001; read more where none is
```

The last `verification` record at verdict PASS opens the gate. Where none exists, or the last is FAIL, the verdict here is BLOCKED: the SPEC is verified against a Manifest somebody verified, and the chain starts at `mc-vf-manifest-v17`. Append the BLOCKED record and stop.

## Step 2 - The mechanical reads

```bash
mc17 fields spec {spec_asset_id}
mc17 binding {spec_asset_id} --class artifact
mc17 status {spec_asset_id}
mc17 versions {spec_asset_id} --log
mc17 check {manifest_asset_id} --ledger {ledger_asset_id} --approvals --doc {spec_asset_id}
```

**The Change Log against the versions CanonQ holds.** `versions --log` reads the document's Change Log against the versions CanonQ holds of it: each row that names a version CanonQ does not hold is a fail naming the row and the version, and an older document with no Change Log passes with the note the command prints, which the record carries.

**The approvals of an earlier text.** `check --approvals --doc` reads the document's Approvals section alone and leaves out the verification join, since this run is the verification the document owes. Each stale entry it prints is a FAIL of this verification, naming the entry and the live-state write that removes it, which the command prints beside the entry; an entry marked in place as superseded passes with the note the command prints.

## Step 3 - The checklist

The SPEC's work mode from the Manifest; the family dispositions over the `fields` states (absent or whole-`[TBD]` fails gated work and is a declared-gap finding in iterative work; inline `[TBD]` warns; present is judged below). The rows no mode softens:

1. **Reader, AO and Status lines**, the AO equal to the tracked cell character for character.
2. **The Move declaration declares one Move** and the Move type is one of the Definition's own; a Capability Move names its subtype.
3. **Acceptance criteria carry identifiers in the `AC-n` form**, each criterion one identified item. This is load-bearing beyond style: `mc-vf-tp-v17`'s traceability join reads the identifiers and nothing else, so a criterion with no id is invisible to the Test Plan's verification. Prose criteria with no ids fail this row. A figure beside a bound word in a criterion carries its mark, (bound: the reason; measured host, commit, date) or (bound: the reason; ruled record n); a bare figure, a target or an estimate there fails this row, and the lint of Profile 7.12, rule `figure-unmarked`, refuses it before any send.
4. **ARCH references match the shape**: a Mission that ships code names its ARCH by id here, a no-code Mission carries the stated reason the Manifest carries.
5. **Business stakeholders name at least the Business Owner's context** or carry the declared gap.

**Judgments surfaced, never failed here**: whether each criterion is objectively testable and whether the set covers the Move, the BO's at approval; whether the business process is honest, the BO's.

## Step 4 - The record, then the stamp

Append one `verification` record with `mc17 append {ledger_asset_id} --record <record.json>`, the record written to a file first as *Writing a ledger record* says: `refs` leading with the SPEC, then the Manifest; evidence carrying the command outputs verbatim; take the number the command prints. Where the change names a landed plan, the record's `refs` carry the plan's id after the SPEC and the Manifest, one ref for each plan the change names. The record's body carries the line `Verified: {document id} version {n}, binding sha256:{hex} (projection {id})`, on a line of its own: the document id `SPEC-{SCOPE}-{specnum}`, `{n}` the current version `versions` printed, and `{hex}` and `{id}` the figure and the projection `binding --class artifact` printed. `mc17 published` reads it when an authority reads the document. **On PASS**, one guarded amend writes the SPEC's status word and the VF Stamp block, writing the block where the scaffold shipped none, its lines carrying `**Binding:** sha256:{hex} (projection mc-v17-artifact-text-projection/1)` beside Status, Last verified and Record, `--expect-binding unmoved`; and one guarded amend updates the Manifest's SPEC row Verification cell. **After a PASS**, run `mc17 rework {manifest_asset_id} --ledger {ledger_asset_id} --record {n}`, `{n}` the number of this record: it sets the Status cell of each landed plan the record's `refs` name to `Rework, record {n}, {date}` in one live-state amend on the Manifest, and writes nothing where the record names no landed plan. **A status word is never demoted by a stamp**: where the SPEC already reads a word DOWNSTREAM of `Verified` (`Approved` carrying current approvals is the live case), the word stands, and this record says the verification ran at that status. A re-verification writing `Verified` over `Approved` unwrites two approvals with a stamp, which Seventeen-16's closure runner caught only by reading twice (its closure log's critique). **On FAIL, stamp nothing.**

## Writing a ledger record

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

## Rules this skill cannot check

- Whether the Move is worth making: the BO's, at approval.
- Whether the criteria cover the Move: the BO's, surfaced with the criterion list.

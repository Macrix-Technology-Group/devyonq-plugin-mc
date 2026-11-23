---
name: mc-vf-tp-v17
description: "Verify a CANONQ-NATIVE v1.7 Test Plan against its parent SPEC. Upstream gate: the SPEC carries a PASS verification. The AC traceability join is mechanical (mc17 tptrace): every acceptance criterion of the SPEC covered by at least one test case, every test case tracing to at least one criterion, identifiers only, both directions failing loudly. Structural completeness via mc17 fields tp. Appends a verification record; on PASS stamps by guarded amend, on FAIL stamps nothing. Triggers on \"verify tp v17\", \"mc-vf-tp-v17\". Optional argument = tpnum (default 001)."
---

# mc-vf-tp-v17

Read this file to the end before acting. The tool reports; this skill judges. `mc17` is the launcher `client/mc17` two levels above this skill's folder, from a POSIX shell, Git Bash included, and `client/mc17.cmd` from PowerShell or cmd. Every record this skill appends carries `recordedBy`, the name of the person or session that writes it down, on a ledger of either version.

## Parameters

- **?** - display the block below and stop.
- **tpnum** (optional) - default `001`.

```
mc-vf-tp-v17 v0.1.0 (MC 1.7 - CanonQ-native)
Parameters: ?  |  tpnum (default 001)
Mechanical half: mc17 (version, fields tp, tptrace, binding --class artifact, amend).
Upstream gate: the parent SPEC verified PASS.
Notion or v1.6 TPs: mc-vf-tp (v1) or mc-vf-tp-v2.
```

## Step 0 - Which copy, which Mission, which line

`mc17 version`, exact-title resolution of the TP, its parent SPEC and the Manifest, limit 50. Pin gate as everywhere in this line.

## Step 1 - The upstream gate

The SPEC's last `verification` record at PASS opens the gate; anything else is BLOCKED, recorded, and stopped, naming `mc-vf-spec-v17`.

## Step 2 - The mechanical reads

```bash
mc17 fields tp {tp_asset_id}
mc17 tptrace --spec {spec_asset_id} --tp {tp_asset_id}
mc17 binding {tp_asset_id} --class artifact
mc17 versions {tp_asset_id} --log
mc17 check {manifest_asset_id} --ledger {ledger_asset_id} --approvals --doc {tp_asset_id}
```

**The Change Log against the versions CanonQ holds.** `versions --log` reads the document's Change Log against the versions CanonQ holds of it: each row that names a version CanonQ does not hold is a fail naming the row and the version, and an older document with no Change Log passes with the note the command prints, which the record carries.

**The approvals of an earlier text.** `check --approvals --doc` reads the document's Approvals section alone and leaves out the verification join, since this run is the verification the document owes. Each stale entry it prints is a FAIL of this verification, naming the entry and the live-state write that removes it, which the command prints beside the entry; an entry marked in place as superseded passes with the note the command prints.

## Step 3 - The checklist

The TP's work mode from the Manifest; the family dispositions over `fields`. The rows no mode softens:

1. **Reader, AO, Status and Parent SPEC lines**; the parent named is the SPEC this run verified against.
2. **The traceability join holds both ways.** Every `FAIL` line `tptrace` prints is a fail here naming what it names: a criterion no case covers is unproven, and a case tracing to no criterion tests something the Move never asked for. Zero criteria found is a fail of the SPEC's identifier discipline surfacing here, and the finding routes the repair to the SPEC.
A traceability that holds on names is necessary and short of sufficient: it proves a case is cited per criterion, never that the case ran and asserted the criterion (IP-MC17-017, Definition Section 10, *The proven criterion*). The run state is read at acceptance by `mc17 accept --spec {spec} --tp {tp} --results {manifest}`, which fails a criterion whose covering tests have not all run green. A case marked `red-resolved:{n}` counts where defect record `{n}` names it and a later record that opens `RESOLVED {n}` carries the own words of the Business Owner or the Technical Owner, and its criterion then reads accepted with resolved defect {n}; `mc17 accept` reads the mark only where it is given both `--manifest` and `--ledger`, as the Move sweep and closure give them, and reads it red without them.
3. **The strategy names its method per criterion**, manual, automated, or mixed, or carries the declared gap.
3b. **A case marked `post-landing` names the closure act that runs it.** The marking is lawful ownership under Definition Section 3 (*Every test case carries an owner*), and a case so marked with no act named is a finding naming the case: a post-landing case nobody schedules is an orphan wearing a label. Ownership by plans and by the integration stage is the IP verification's join (`mc17 orphans`), and it is not repeated here.
3c. **A figure beside a bound word in a case carries its mark**, (bound: the reason; measured host, commit, date) or (bound: the reason; ruled record n); a bare figure, a target or an estimate in a pass condition fails this row, and the lint of Profile 7.12, rule `figure-unmarked`, refuses it before any send.

**A runtime version the document states.** Where the document states the version of a runtime or a tool the build runs on, such as Node.js, Python or .NET, run that program's version command on the session's machine, as `node --version`, and compare. Where the two differ, ask the person which one holds before the document is written or passed, even where a ruling named the version: a ruling names what was true when it was given, and a document that states another version than the machine runs leads every later act astray. The answer goes into the record.

**Judgments surfaced, never failed**: whether the cases would actually prove the criteria, the TO's at approval; whether coverage depth fits the Move's risk, the TO's.

## Step 4 - The record, then the stamp

Append one `verification` record with `mc17 append {ledger_asset_id} --record <record.json>`, the record written to a file first as *Writing a ledger record* says: `refs` leading with the TP, then the SPEC; evidence carrying the three outputs verbatim, the tptrace output above all, because the join is the record a later reader recomputes. The record's body carries the line `Verified: {document id} version {n}, binding sha256:{hex} (projection {id})`, on a line of its own: the document id `TP-{SCOPE}-{tpnum}`, `{n}` the current version `versions` printed, and `{hex}` and `{id}` the figure and the projection `binding --class artifact` printed. `mc17 published` reads it when an authority reads the document. **On PASS**, guarded amends: the TP's status word and its VF Stamp block, with the line `**Binding:** sha256:{hex} (projection mc-v17-artifact-text-projection/1)` beside Status, Last verified and Record, and the Manifest's TP row Verification cell. **On FAIL, stamp nothing.**

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

- Whether a passing test proves the criterion it traces to: the TO's, then the Move-level verification's evidence.

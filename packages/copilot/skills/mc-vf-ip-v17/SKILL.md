---
name: mc-vf-ip-v17
description: "Verify a CANONQ-NATIVE v1.7 Implementation Plan against its ARCH, per Mission Definition v1.7 Section 5. Upstream gate: the parent ARCH carries a PASS verification record AND a PASS approval record in the VF ledger; returns BLOCKED where either is missing. Mechanical reads via mc17 (fields ip, binding --class artifact); judges the Module against the roster, the Cross-IP Assumptions table's fixed ordering vocabulary, and the Blast Radius claim. Appends a verification record; on PASS stamps the IP and its tracked row by guarded amend, on FAIL stamps nothing. Triggers on \"verify ip v17\", \"mc-vf-ip-v17\". Optional argument = ipnum (default 001)."
---

# mc-vf-ip-v17

Read this file to the end before acting. The tool reports; this skill judges. `mc17` is the launcher `client/mc17` two levels above this skill's folder, from a POSIX shell, Git Bash included, and `client/mc17.cmd` from PowerShell or cmd. The one lawful substitute for an uncomputable binding is the Definition's stated fallback, named as such in the record. Every record this skill appends carries `recordedBy`, the name of the person or session that writes it down, on a ledger of either version.

## Parameters

- **?** - display the block below and stop.
- **ipnum** (optional) - default `001`.

```
mc-vf-ip-v17 v0.1.0 (MC 1.7 - CanonQ-native)
Parameters: ?  |  ipnum (default 001)
Mechanical half: mc17 (version, fields ip, binding --class artifact, status, amend, radius, orphans).
Upstream gate: the parent ARCH Verified AND TO-Approved, both read from the ledger.
Notion or v1.6 IPs: mc-vf-ip (v1) or mc-vf-ip-v2.
```

## Step 0 - Which copy, which Mission, which line

`mc17 version`, exact-title resolution of the IP and the Manifest, limit 50. Pin gate: v1.7 proceeds, v1.6 routes to `mc-vf-ip-v2` without a record, no pin stops.

## Step 1 - The upstream gate

The IP designs within the ARCH's constraints, so the ARCH stands verified and approved first. Read the ledger by selector for records leading with the parent ARCH the IP's Design Decisions section names:

```
mc17 read tail --ledger {ledger_asset_id} --count 50   # the records whose refs[0].doc is ARCH-{SCOPE}-{arch_seq}; read more where none is
```

The gate wants two records: a `verification` at verdict `PASS`, and an `approval` at verdict `PASS` whose binding equals the verification's, hand-recorded or skill-recorded alike. **Where either is missing, the verdict is BLOCKED**: append the record with `mc17 append`, naming the missing edge and the skill that runs it, stamp nothing, stop. Where the ledger is absent, stop with no record; the chain starts at `mc-vf-manifest-v17`.

## Step 2 - The mechanical reads

```bash
mc17 fields ip {ip_asset_id}
mc17 binding {ip_asset_id} --class artifact
mc17 status {ip_asset_id}
mc17 versions {ip_asset_id} --log
mc17 check {manifest_asset_id} --ledger {ledger_asset_id} --approvals --doc {ip_asset_id}
mc17 radius --claimed {the IP's radius claim, as its Radius claimed line reads it} --authority BO
```

**The radius read.** `mc17 radius` takes the claim as written in the plan and an authority; with `--authority BO`, the highest, it refuses only a claim outside the vocabulary, which is what row 6 reads. Its output goes into the record with the others.

**The Change Log against the versions CanonQ holds.** `versions --log` reads the document's Change Log against the versions CanonQ holds of it: each row that names a version CanonQ does not hold is a fail naming the row and the version, and an older document with no Change Log passes with the note the command prints, which the record carries.

**The approvals of an earlier text.** `check --approvals --doc` reads the document's Approvals section alone and leaves out the verification join, since this run is the verification the document owes. Each stale entry it prints is a FAIL of this verification, naming the entry and the live-state write that removes it, which the command prints beside the entry; an entry marked in place as superseded passes with the note the command prints.

## Step 3 - The checklist and its dispositions

The IP's work mode from the Manifest, gated where undeclared. The dispositions over the `fields` states are the family's: absent or whole-`[TBD]` fails gated work and is a declared-gap finding in iterative work, except the `What Stays Refused` field, whose disposition is row 9; an inline `[TBD]` is a warning naming the owner; a present value is judged by the rows below, which no mode softens.

1. **Reader, AO and Status lines**, the AO equal to the tracked cell character for character.
2. **The Module** is a single value from the Manifest's declared roster. A value outside the roster fails naming both; `[TBD]` with a provisional roster is a finding naming the ARCH-approval dependency.
3. **The parent ARCH line resolves** to an asset in this collection.
4. **The Cross-IP Assumptions table** carries the fixed columns, and every Ordering claim cell reads exactly `merges after the sibling` or `no ordering`. Any other wording fails naming the row: the wave skills read this table as edges, and a claim they cannot parse is an ordering nobody will honour. A sibling named that does not resolve in this collection is a fail. `None.` beneath the table is lawful for an IP with no sibling assumptions.
5. **Acceptance criteria** are implementation-axis and each is stated testably; whether each truly is testable is the approving authority's judgment, surfaced. A figure beside a bound word in an item carries its mark, (bound: the reason; measured host, commit, date) or (bound: the reason; ruled record n); a bare figure, a target or an estimate there fails this row, and the lint of Profile 7.12, rule `figure-unmarked`, refuses it before any send.
6. **The Blast Radius claim** is exactly one of `module-confined`, `cross-module`, `customer-facing`, as the `mc17 radius` read of Step 2 says. Outside the vocabulary fails: the approval floor cannot be computed from a claim the gate cannot read.
6b. **A Repair Move's plan** (the `fields ip` output reads `Move type: Repair`): the Test Cases section carries the reproduction (a case line with the word `reproduction`) and one regression case, the tool reports both; either ABSENT fails naming it, because the reproduction is the repair's only acceptance criterion and the regression case its only test plan. The parent ARCH is named by reference (`ARCH-{SCOPE}-{seq}`), and a Design Decisions section that changes a decision in it fails: a repair that needs one is no repair, and the defect's disposition becomes `repair in {Mission}`. A Blast Radius that reaches a Published Language at `stable` or `frozen` fails for the same reason. Where the tool reports no Move type line, the plan belongs to the SPEC's Move and none of this applies.
7. **Every test case carries an owner** (Definition Section 3, as amended 2026-08-23; L5/F3). Run `mc17 orphans --tp <TP asset> --ips <every IP of the Mission, this one included, comma-separated> [--wave <the ruled Wave Plan asset>]`. The tool computes the union of the cases every plan cites by identifier, the cases the Wave Plan assigns to its integration stage, and the cases the Test Plan marks `post-landing`, against the Test Plan's list. **Each orphan it names fails this verification**, naming the case. The fail is the Mission's and lands on this record because this is the act that added a plan to the union; it passes again once every case has an owner, and a case only the integrated whole can prove is assigned to the wave's integration stage. Mission KnowledgeDomain's TC-12, the whole-toolset case, was cited by no plan and ran only because the Business Owner asked (VF-KDOM-001 record 36).
8. **A claim about existing code shows its proof** (the rule `mc-vf-arch-v17` row 6 applies to an ARCH decision, IP-MC17-012 L10-A, applied to the plan by IP-MC17-026). `fields ip` reports a row named *Evidence for claims about existing code*. It reads every section among `## Design Decisions`, `## The incident`, `## The change` and `## Rejected Alternatives` that the plan carries, matched on the heading's opening words, and answers `present` where each carries a fenced block of at least two lines or a `file:line`-shaped token, `NO EVIDENCE` naming each section that carries neither, `ABSENT` where the plan has none of the four. The tool reads only that a fence or a token stands; it cannot tell a measurement from a fixture. **Where a section marked `NO EVIDENCE` states what existing code does today, this verification FAILS, naming the section.** A section that states only what will be built, such as a greenfield decision, is surfaced and passes. `ABSENT` is surfaced naming the four headings, so the author knows where the row looks, and passes. Whether the proof is TRUE is the reviewer's, who opens the file. The incidents this row carries: IP-MC17-024 wrote under *Rejected alternatives* that node is always reachable, and on a minimal PATH it is not; IP-MC17-025 wrote that two readers shared a guard, and one did not. Both were built green and discarded the same day.

   **A repository with no code yet.** Where the plan builds in a repository that holds no code, every section states what will be built, so `NO EVIDENCE` on each is the expected answer and the row passes; the record says the repository holds no code yet.

9. **A repair that changes what is reported says so** (MC17.1 AC-16, ruled by the Technical Owner at `VF-MC171-001`: the field is reported, and it never fails by itself). `fields ip` reports a field named *What Stays Refused*. `ABSENT`, a whole `[TBD]` and an inline `[TBD]` are each surfaced naming the field, and pass. **Where the plan changes what a checker, a gate or a verb reports, and the section does not name what stopped being reported and what started, with the case that pins each direction, this verification FAILS, naming the change.** Whether a plan changes a reader's output is this row's judgment, read from its Scope and Design Decisions. A plan that changes no reader's output passes with the gap named, whenever it was written, so a plan verified before the field existed verifies as it did. The incident this row carries: `VF-MC171-001` record 81, where two landed plans changed what four gates, the drill and `selftext` report and neither said so.

**Checks that carry no break.** A plan may carry a section of that name. Each check it names there has no break in the drill, and the integration stage passes that check on the plan's word alone. Read each name and its reason, and say where a named check guards a refusal, a lock, a digest or a gate, since such a check owes a break. A plan with no such section, or with `None.` in it, is read as naming none.

**Judgments surfaced, never failed here:** whether the delta is the right slice, whether the radius claimed is the radius the change actually has (the approver's, and the gate refuses only an authority below the CLAIM), whether the assumptions are complete.

## Step 4 - The record, then the stamp

Append one `verification` record with `mc17 append {ledger_asset_id} --record <record.json>`, the record written to a file first as *Writing a ledger record* says: `refs` leading with the IP, then the ARCH, then the Manifest, evidence carrying the command outputs verbatim. Take the number the command prints. The record's body carries the line `Verified: {document id} version {n}, binding sha256:{hex} (projection {id})`, on a line of its own: the document id `IP-{SCOPE}-{ipnum}`, `{n}` the current version `versions` printed, and `{hex}` and `{id}` the figure and the projection `binding --class artifact` printed. `mc17 published` reads it when an authority reads the document. **On PASS**, one guarded amend on the IP writes the VF Stamp block, with the line `**Binding:** sha256:{hex} (projection mc-v17-artifact-text-projection/1)` beside Status, Last verified and Record, and the header word, and one guarded amend on the Manifest updates the IP row's Verification cell to `record {n}, PASS, {date}`; both `--expect-binding unmoved`. **On FAIL, stamp nothing and edit no status line.**

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

**One `mc17` command per shell call.** Run the launcher with its command and flags and nothing else on the line: no `;`, `&&` or pipe joining it to another command, a change of folder, `Set-Location`, in a call of its own, and no variable holding the launcher's path. Where `Get-Command mc17` finds the launcher on the PATH, call it as `mc17`; otherwise call it by its full path, without quotes and without `&` where the path holds no space. A redirection of its output into a file, `> fields.txt`, belongs to the command. Copilot asks the person to approve each shell call it cannot match to one program, and a chained line, a launcher in a variable or a path behind `&` is such a call every time. Write every file with the file tool, never with `Out-File`, `Set-Content` or `Tee-Object`.

## Rules this skill cannot check

- Whether the plan will build: the builders and the review gates at execution.
- Whether the radius claim is honest: the approving authority, reading the diff of the plan.
- Whether the ARCH's approval was sound: that edge's own acts.

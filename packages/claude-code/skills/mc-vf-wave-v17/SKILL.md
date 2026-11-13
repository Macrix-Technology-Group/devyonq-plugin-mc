---
name: mc-vf-wave-v17
description: "Verify a CANONQ-NATIVE v1.7 Wave Plan against the Definition's *The Wave Plan* section: members resolve and their approval states are read, the order is total and respects every edge the ARCH and the members' Cross-IP Assumptions declare (mc17 wavecheck), the Wave Settings section states every setting with its source and a reason beside each override, the ruling sections carry what the wave's size owes, the ruling record named in the status line exists with the words the wave's size owes, and supersession is coherent both ways. An unruled plan verifies structurally and is recorded as binding nothing. Appends a verification record; on PASS stamps the plan's VF Stamp, with its binding line, by guarded amend, on FAIL stamps nothing. Triggers on \"verify wave v17\", \"mc-vf-wave-v17\". Optional argument = wavenum (default 001)."
---

# mc-vf-wave-v17

Read this file to the end before acting. The tool reports; this skill judges. `mc17` is the launcher `client/mc17` two levels above this skill's folder, from a POSIX shell, Git Bash included, and `client/mc17.cmd` from PowerShell or cmd. Every record this skill appends carries `recordedBy`, the name of the person or session that writes it down, on a ledger of either version.

## Parameters

- **?** - display the block below and stop.
- **wavenum** (optional) - default `001`.

```
mc-vf-wave-v17 v0.1.0 (MC 1.7 - CanonQ-native)
Parameters: ?  |  wavenum (default 001)
Mechanical half: mc17 (version, fields wave-plan, binding --class artifact, wavecheck, status, amend).
The plan's force is its ruling record; an unruled plan is verified as binding nothing.
```

## Step 0 - Which copy, which Mission, which line

`mc17 version`, exact-title resolution of the plan and the Manifest, limit 50, the pin gate as everywhere in this line.

## Step 1 - The mechanical reads

```bash
mc17 fields wave-plan {plan_asset_id}
mc17 binding {plan_asset_id} --class artifact
mc17 wavecheck {plan_asset_id} --arch {arch_asset_id} --map map.json --manifest {manifest_asset_id} --ledger {ledger_asset_id}
mc17 status {plan_asset_id}
mc17 versions {plan_asset_id} --log
mc17 check {manifest_asset_id} --ledger {ledger_asset_id} --approvals --doc {plan_asset_id}
```

**The Change Log against the versions CanonQ holds.** `versions --log` reads the document's Change Log against the versions CanonQ holds of it: each row that names a version CanonQ does not hold is a fail naming the row and the version, and an older document with no Change Log passes with the note the command prints, which the record carries.

**The approvals of an earlier text.** `check --approvals --doc` reads the document's Approvals section alone and leaves out the verification join, since this run is the verification the document owes. Each stale entry it prints is a FAIL of this verification, naming the entry and the live-state write that removes it, which the command prints beside the entry; an entry marked in place as superseded passes with the note the command prints.

The map comes from every IP row of the Manifest's tracked table; the ARCH id from the note beside that table. **A wavecheck line saying a member's body or the ARCH was read by nobody is an unresolved determination**, recorded as such and never a silent pass. A line the check names as **unread** stands outside a bullet in the ARCH's Ordering Constraints and binds nothing; the record names each one, and one written as a constraint is a finding against the ARCH, because it orders no wave (M-MC171-19); an edge written below the line `**Constraints with no edge form.**` is refused by name, and the order stands unverified until the ARCH moves it above that line.

## Step 2 - The checklist

- **Currency of any base or landing claim** the plan or its records carry: evidenced with `mc17 currency`, fetch-first against the branch of record, and a claim resting on a local ref alone is a finding naming the claim (Profile 8.15, IP-MC17-016).

A Wave Plan is gated by design, one plan per ruling, so nothing here is softened by a work mode.

1. **Every `fields` row present**; the Reader, AO and Status lines in place, the AO equal to the AO its Manifest-side note carries, character for character. Where the note predates the AO field (written before 0.1.14), compare against the Manifest's default AO and record the gap as a finding naming the note.
2. **The wavecheck is clean:** members resolve in this collection, the positions are a total order, and no declared edge is violated. Each problem the tool prints is a fail naming what it names.
2a. **The prompts the plan rules.** `mc17 wavecheck` names any member of the members table carrying no prompt block, any block naming a member no row carries, and any prompt carrying a form the writing rules bar, which the document lint leaves unread inside a fence. Each is a fail naming the member. **A plan whose `wave.mode` row reads `hand`** is run by a person and carries no prompts: the check names it in one line, and a prompt block or a fence in its stage-prompts section is a fail naming it. **A fleet plan carrying no stage-prompts section at all** was ruled before the prompts stood in a wave plan: the check names it in one line and passes it, and a body edit that added the section would move the binding its ruling names. Where a fleet script was written from this plan, `mc17 wave script --plan {plan_asset_id} --check {script}` says whether that script names this plan, its ruling record and its binding, and whether it carries the prompts this plan rules; each difference is a fail in its own line, and `mc17 lint -f {script}` is what names the first prompt that moved. **Where the plan's row `wave.prompts` reads `template`,** or the Manifest's row does for a plan with no such row, a hand plan carries the prompts of its agents as a fleet plan does, and the check reads them the same way; a hand plan whose section reads `Run by hand: this wave carries no fleet prompts` is a fail that names the line where its status line names no ruling record, and was ruled before release 0.1.98 where it names one, so it passes with its note. **Where the plan's row reads `template`,** `mc17 wave prompts --check --plan {plan_asset_id} --manifest {manifest_asset_id} --ledger {ledger_asset_id} --members <the members' asset ids> --repo {repo}` says whether the prompts are the template's rendering over the inputs the plan's line `Rendered:` names. Each prompt that moved, and each member whose binding moved, is a fail on its own line. A ruled plan with no such line passes, with the note the command prints.
2b. **The Wave Settings.** `mc17 wavecheck` prints each setting in force with its value, its source and the reason beside an override, and fails a row with no value, a value outside the allowed values, an override with no reason, the word `offered` in any cell, a row missing from the section, and an `Integration run:` line that is missing, holds no command in backticks or reads `none stated`. It refuses a plan that rules the review off where the Manifest declares collapsed authorities, and a fleet plan that rules the review off or sets fewer than two lenses. Each is a fail naming the row, the line or the declaration. A section with no row of `wave.model.converge` passes with a note, and the setting reads `none`. **A plan carrying no Wave Settings section** is an older plan, told by its form: the check prints `this plan carries no Wave Settings section, so it predates the new fields and passes as it stands`, and passes it, because a body edit that added the section would move the binding its ruling names.
3. **Approval states.** Every member's last approval record is read. A member with no PASS approval is a **finding, never a fail**: the plan may lawfully name it, and the wave cannot open until every member is approved, which the status line says where it holds. That the plan says so where it applies IS checked, and its absence fails.
3a. **A member in `Rework` names its ordering record.** Where a member's Manifest row reads `Rework`, the plan's row for it cites the record that ordered the rework, and that record exists in the ledger as one of the five kinds the Definition admits (an integration record at FAIL, a Move Acceptance record naming the plan, a standing defect record, a blocking review record read against landed code, the verification record of a SPEC amendment naming the increment). A `Rework` member citing no record, or a record of another kind, fails naming it.
3b. **The integration stage stands in the plan** (Definition Section 5, *A wave's final stage is a verification at the merging tip*; L3/F4). The *Integration stage* section names the cases it owns by identifier, or reads `none` with the reason; a plan with no such section fails naming it, because a wave with no final verification stage is complete when its last member lands and the integrated tip is never tested. Run `mc17 orphans --tp <TP> --ips <every member> --wave <this plan>`: an orphan the tool names is a finding routed to the plan's author, who assigns it here or to a member.
4. **The ruling sections, by the wave's size.** Read the result `mc17 wavecheck` printed. For a wave of one plan, each section carries the template's fixed sentence, and nobody rules a grouping or an order. For a wave of two or more plans, a grouping section holding only the template's fixed prose is an empty ruling and fails; the same for the order. An older plan keeps its sections as they stand.
5. **The ruling record, where the status line names one:** read the ruling-record lines `mc17 wavecheck --ledger` printed. The record exists at that number, kind `ruling`, `refs` leading with this plan, and its `authorityWords` carry `Choices (TO):` in every wave and `Grouping (BO):` and `Order (TO):` where the wave holds two or more plans. An older plan's record is read in the old form, the two labelled passages `Grouping (BO):` and `Order (TO):`, and the check says so in one line. Any element missing fails naming it. **Where the status line names none**, the plan is unruled: verify the structure, and the record and the report both say the plan binds nothing yet.
6. **Supersession, both ways:** where this plan declares it supersedes another, that plan's status line carries the mark; where a later plan exists naming this one, this plan's own status line carries it. A missing mark fails naming the side only where the superseding plan is ruled, and the repair is one live-state amend. A supersession that an unruled plan declares is a finding on either side, because the prior plan keeps its force and its lock until a ruled plan supersedes it.

**Judgments surfaced, never failed:** whether the grouping serves the programme (the BO's), whether the order is wise beyond its edges (the TO's), whether an undeclared edge exists in the code (the IP authors').

## Step 3 - The record, then the stamp

Append one `verification` record with `mc17 append {ledger_asset_id} --record <record.json>`, the record written to a file first: `refs` leading with the plan, evidence carrying the four command outputs verbatim; on a trial-pinned Mission the trial sentence rides along as everywhere. Take the number the command prints. The record's body carries the line `Verified: {document id} version {n}, binding sha256:{hex} (projection {id})`, on a line of its own: the document id `WAVE-PLAN-{SCOPE}-{seq}`, `{n}` the current version `versions` printed, and `{hex}` and `{id}` the figure and the projection `binding --class artifact` printed. `mc17 published` reads it when an authority reads the document. **On PASS**, one guarded amend writes the plan's VF Stamp block, `--expect-binding unmoved`, with the line `**Binding:** sha256:{hex} (projection mc-v17-artifact-text-projection/1)` beside Status, Last verified and Record, the figure the `binding --class artifact` read of Step 1 printed. **On FAIL, stamp nothing.**

## Rules this skill cannot check

- Whether the wave should exist at all: the BO ruled it, and this skill reads the ruling.
- Whether execution honours the ruled order: the launch names the plan it executes, and the acceptance record per wave is where that is read.

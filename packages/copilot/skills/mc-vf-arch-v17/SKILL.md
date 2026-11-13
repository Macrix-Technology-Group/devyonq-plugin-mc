---
name: mc-vf-arch-v17
description: "Verify a CANONQ-NATIVE v1.7 ARCH against its SPEC and Mission Definition v1.7 Section 4. The mechanical half is mc17: fields reports the section states, binding --class artifact computes the approval binding under mc-v17-artifact-text-projection/1, and amend writes the stamp as a guarded live-state edit. Requires a verification record for the parent SPEC in the VF ledger; returns BLOCKED where none exists. Appends a verification record to the ledger; on PASS stamps the ARCH, on FAIL stamps nothing. Checklist row 6 fails a design decision that asserts a property of existing code with no file and line citation on its line (IP-MC17-012 L10-A). Triggers on \"verify arch v17\", \"mc-vf-arch-v17\". Optional argument = archnum (default 001)."
---

# mc-vf-arch-v17

Read this file to the end before acting. The tool reports; this skill judges: every disposition and every fail rule stands here, and nothing in `mc17` decides a verdict. `mc17` is the launcher `client/mc17` two levels above this skill's folder, from a POSIX shell, Git Bash included, and `client/mc17.cmd` from PowerShell or cmd. Where a command will not run, name the figure it owed and stop; the one lawful substitute for the binding is the Definition's stated fallback, the platform version snapshot plus the content length, named as such in the record. Every record this skill appends carries `recordedBy`, the name of the person or session that writes it down, on a ledger of either version.

## Parameters

- **?** - display the block below and stop.
- **archnum** (optional) - default `001`.

```
mc-vf-arch-v17 v0.1.0 (MC 1.7 - CanonQ-native)
Parameters: ?  |  archnum (default 001)
Mechanical half: mc17 (version, fields, binding --class artifact, hash, status, amend).
Upstream gate: the parent SPEC carries a verification record in VF-{SCOPE}-001.
Notion or v1.6 ARCHs: mc-vf-arch (v1) or mc-vf-arch-v2.
```

## Step 0 - Which copy, which Mission, which line

`mc17 version` first. Resolve `ARCH-{SCOPE}-{archnum}` and `MANIFEST-{SCOPE}-001` by exact-title search, limit 50, the candidate-generator rule as everywhere in this line. The Manifest's pin gates the family: v1.7 proceeds, v1.6 routes to `mc-vf-arch-v2` without a record, no readable pin stops. Every call runs against the corpus the Manifest names.

## Step 1 - The upstream gate

The ARCH is verified against its SPEC, so the SPEC's own verification stands first. Read the ledger by selector:

```
mc17 read tail --ledger {ledger_asset_id} --count 50   # the records whose refs[0].doc is SPEC-{SCOPE}-001; read more where none is
```

A record with `kind` `verification` and verdict `PASS` opens the gate; this line has no `mc-vf-spec-v17` yet, so that record may be a hand act, which is lawful and reads the same. **Where none exists, the verdict is BLOCKED**: append the BLOCKED record with `mc17 append`, naming the missing upstream edge, stamp nothing, and stop. Where the ledger itself is absent, the Mission has never verified its Manifest; stop with no record and say the chain starts at `mc-vf-manifest-v17`.

## Step 2 - The mechanical reads

```bash
mc17 fields arch {arch_asset_id}
mc17 binding {arch_asset_id} --class artifact
mc17 status {arch_asset_id}
mc17 versions {arch_asset_id} --log
mc17 check {manifest_asset_id} --ledger {ledger_asset_id} --approvals --doc {arch_asset_id}
```

**The Change Log against the versions CanonQ holds.** `versions --log` reads the document's Change Log against the versions CanonQ holds of it: each row that names a version CanonQ does not hold is a fail naming the row and the version, and an older document with no Change Log passes with the note the command prints, which the record carries.

**The approvals of an earlier text.** `check --approvals --doc` reads the document's Approvals section alone and leaves out the verification join, since this run is the verification the document owes. Each stale entry it prints is a FAIL of this verification, naming the entry and the live-state write that removes it, which the command prints beside the entry; an entry marked in place as superseded passes with the note the command prints.

The binding's projection id is `mc-v17-artifact-text-projection/1`, printed beside the figure, and bindings under different projections are never compared.

## Step 3 - The checklist and its dispositions

Read the ARCH's work mode from the Manifest's Work Modes table; an undeclared class runs gated. The dispositions map the `fields` states:

| The tool reports | Gated | Iterative |
|---|---|---|
| `ABSENT` or `EMPTY` | Fail | a finding naming the declared gap |
| `whole value [TBD]` | Fail | a finding naming the declared gap |
| `[TBD] inside an otherwise complete field` | warning naming the owner | the same warning |
| `present` | the rows below decide | the rows below decide |

The rows this skill judges, none softened by any mode:

1. **Reader, AO and Status lines present.** An absent line fails; the AO line must equal the AO the Manifest-side note carries, character for character, the AO-gate rule. Where the note predates the AO field (written before 0.1.14), compare against the Manifest's default AO and record the gap as a finding naming the note.
2. **The References section names the parent SPEC** by id, and the id resolves in this collection. A SPEC reference that resolves elsewhere fails.
3. **Modules.** Each entry carries `module_id`, `name`, `owner`, or the section is a declared gap under the iterative mode. This roster is provisional until the ARCH is approved; adoption into the Manifest is the approval act's, and this skill only reports whether the two agree where both exist.
4. **Ordering Constraints.** Each constraint is one bullet in the declared form, what merges only after what, with its reason. A constraint in another shape is a fail naming the bullet, because the wave skills parse this section and an unparseable constraint is invisible to them, which is worse than absent. Prose that binds nothing stands below a line opening `**Constraints with no edge form.**`; `mc17 wavecheck` names every line outside a bullet as unread, the first paragraph and a bullet's indented lines apart, and refuses an edge written below that line (M-MC171-19).
5. **Interface contracts on a Capability or Platform Mission** name the shipped PLs by id and tier, or carry the declared gap.
6. **The decision cites its code.** A decision in the Key Design Decisions section that asserts a property of EXISTING code carries a file and line citation on its own line, or the row fails naming the decision (the Definition, Section 4, *ARCH*, as amended by IP-MC17-012 L10-A on 2026-08-28). "The services already gate it", "the audit rows already carry a channel", "the interface already supports it" are claims about a repository, and a claim about a repository is checked by opening it, which the citation lets a reader do in seconds. The incident the row carries: ARCH-ASSISTANT-001 decision D3 read "every act executes through the services that already gate it, so AC-3 is true by construction", and assetService.ts:655 takes an actor and trusts it while the rights check lives at each route, so the claim was wrong and the same sentence had excused the test that would have caught it. A decision that cites resolves nothing further here: whether the citation is TRUE is the reviewer's, who opens the file, and this row reads only that it stands.

**Judgments, surfaced and never failed:** whether the decisions are sound, the alternatives honestly priced, the quality attributes sufficient: the TO's. Whether a citation row 6 accepts is TRUE, the cited line doing what the decision says it does: the TO's, who opens the repository, with the adversarial review beside him (IP-MC17-012 L10-A); row 6 reads that the citation stands and reads nothing else. Whether the component structure carries the Move: the BO's at approval.

## Step 4 - The record, then the stamp

Verdict PASS or FAIL from the dispositions; BLOCKED was settled at Step 1. Append one `verification` record with `mc17 append {ledger_asset_id} --record <record.json>`, the record written to a file first: `refs` leading with the ARCH, then the SPEC, then the Manifest; `evidence` carrying the three command outputs verbatim; the body naming corpus, binding with projection id, findings, owed runs on a FAIL, judgments. The record's body carries the line `Verified: {document id} version {n}, binding sha256:{hex} (projection {id})`, on a line of its own: the document id `ARCH-{SCOPE}-{archnum}`, `{n}` the current version `versions` printed, and `{hex}` and `{id}` the figure and the projection `binding --class artifact` printed. `mc17 published` reads it when an authority reads the document. The command sends the record without a number, reads it back once by its mark and prints the number the platform gave; name that number and no other.

**On PASS**, one guarded edit writes the stamp and the header word, both live state:

```bash
mc17 amend {arch_asset_id} --edits stamp.json --class artifact --expect-binding unmoved
```

Before the send, run the same `amend` with `--dry`: it composes the edits, runs the writing lint over the whole composed body, the stored text included, names every hit by line and rule, and sends nothing. A hit on a line the edits did not touch stands in the stored text; repair it in the same edits file.

The edits replace the VF Stamp block's lines, which carry `**Binding:** sha256:{hex} (projection mc-v17-artifact-text-projection/1)` beside Status, Last verified and Record, and the status line's word; the guard proves the write moved nothing, which is what makes stamping a just-bound artifact lawful. **On FAIL, stamp nothing and edit no status line**; the record is the whole act.

**The verification owed.** Where `mc17 amend` printed `VERIFICATION OWED NOW: {skill}` as its last line, run that skill over the document before this skill reports: the stamp is a live-state write and owes none; a line `NO VERIFIER: {class}` owes nothing.

## Rules this skill cannot check

- Whether the architecture is adequate to the SPEC's Move: the TO's judgment, then the BO's at approval.
- Whether the Ordering Constraints name every real constraint: the TO's; absence is invisible here.
- Whether the SPEC's own verification was sound: that edge's verifier, or the hand that recorded it.
- Whether a cited file and line says what the decision claims of it: the TO's, opening the repository, and the adversarial review's; row 6 reads presence alone.

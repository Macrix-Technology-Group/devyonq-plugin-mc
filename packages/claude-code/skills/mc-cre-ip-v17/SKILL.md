---
name: mc-cre-ip-v17
description: "Scaffold an Implementation Plan in a CANONQ-NATIVE v1.7 Mission, per Mission Definition v1.7 Section 5. Renders the engine's template ip (mc17 render ip) and creates it in one guarded act (mc17 create), then writes the IP's row into the Manifest's tracked table with a guarded live-state amend. Substantive sections ship [TBD]: the plan is its author's to write within the ARCH's constraints. The Cross-IP Assumptions table and the Blast Radius claim are the fields the wave and approval skills parse. Refuses on an Interface Mission and on a Mission whose Manifest declares it ships no code. Triggers on \"create ip v17\", \"mc-cre-ip-v17\". Optional argument = ipnum (default 001)."
---

# mc-cre-ip-v17

Read this file to the end before acting. It is short on purpose: the mechanics are single commands of `mc17`, the launcher `client/mc17` two levels above this skill's folder (`client/mc17.cmd` from PowerShell or cmd), and this file holds the judgment, the gates and the order. **Where a command will not run, name the figure it owed and stop.**

## Parameters

- **?** - display the block below and stop.
- **ipnum** (optional) - default `001`.

```
mc-cre-ip-v17 v0.1.0 (MC 1.7 - CanonQ-native)
Parameters: ?  |  ipnum (default 001)
Mechanical half: mc17 (version, create, amend, fields, hash).
Siblings: mc-vf-ip-v17 verifies against the ARCH; mc-apr-ip-v17 approves under the blast-radius gate.
Notion or v1.6 Missions: mc-cre-ip (v1) or mc-cre-ip-v2.
```

## Step 0 - Which copy, which Mission, which line

`mc17 version` first. Resolve `MANIFEST-{SCOPE}-001` by exact-title search, limit 50, the candidate-generator rule. Pin gate: v1.7 proceeds, v1.6 routes to `mc-cre-ip-v2`, no readable pin stops. Every call runs against the corpus the Manifest names.

## Step 1 - The gates, before any question

- **Shape.** An Interface Mission has no Implementation Plans. Refuse, quoting the shape field.
- **A no-code Mission.** Where the Manifest says this Mission ships no code, refuse and quote its sentence.
- **The number, read from both sources.** Where **ipnum** was not given, run `mc17 nextnum IP --scope {SCOPE} --collection {collection_id} --repo <the repository the Manifest names>`. On exit 0 the sequence part of its answer is `{ipnum}` from here on. On exit 1 the verb has refused, because the highest figure it found stands in a document's body and no filename and no document title holds it, so it is either a forward name announcing the very plan you are about to create or a reference left behind by one that was deleted. The verb cannot tell those apart and does not guess. It prints both candidates and the file and line of the mention. Open that line and put both candidates to the author with what it says. Where no author is reachable, read the line yourself: where it plainly announces the plan you are about to create, take candidate 1; otherwise stop and name the block. Where the mention is set aside, run again with `--accept-mention`, which takes the HIGHER figure and prints the acceptance on the answer so the record carries the deliberate act. A number chosen past a refusal without asking is how a plan gets a number another document already announced (IP-MC17-022, DEFECT-MC17-009).
- **Collision.** `mc17 read search --q "IP-{SCOPE}-{ipnum}"` as resolved above, exact title comparison; a count at the cap the search answered at is inconclusive.
- **The parent ARCH is named, never gated here.** Creation scaffolds against `ARCH-{SCOPE}-001` by default; verification is what requires that ARCH Verified and TO-Approved. A Mission may lawfully draft IPs while its ARCH is still in approval.

## Step 2 - The interview, four questions

1. **The number:** `IP-{SCOPE}-{ipnum}` stands?
2. **The Module:** offer the values from the Manifest's Modules roster. Where the roster is provisional or `[TBD]`, take `[TBD]` and say verification will record the dependency.
3. **The AO:** default the Manifest's default AO. An AI-AO is refused: an IP is an internal artifact of an Active Mission.
4. **The Summary:** one drafted line, or `defer` to the template's declared `[TBD]`.

The work mode comes from the Manifest's Work Modes table, gated where undeclared, and is never asked.

## Step 3 - Create, in one guarded act

Answers `{SCOPE, seq, ao_string, module, arch_seq, arch_asset_id, summary}`; the ARCH id from the Manifest's note beside the tracked table. Then:

**The scaffold goes out with no rewrite, and the filled document takes the plain-language pass.** `mc17 create` refuses a governed title without proof of the plain-language pass (`AC-24`), and a scaffold holds no sentence a rewriter may change, so the skill creates it with `--scaffold`: the command renders the body from the engine's template ip itself, sends it with no proof and records the write as a scaffold. Once the author of the plan has written its sections, run the skill `mc-plain-v17` over the whole filled document, which `mc17 amend --dry --out <body.md>` writes, and send it with `mc17 amend --jargon --plain <proof.json>` before the plan's first review. Until that rewrite is on record, and while any section still holds the template's placeholder, `mc17 amend` refuses an edit of the declared text sent without `--jargon`, under `--written-by` with `--manifest {manifest_asset_id}` too, and names the scaffold record.

```bash
mc17 create --title IP-{SCOPE}-{ipnum} --collection {collection_id} \
  --render ip --answers answers.json --scaffold --manifest {manifest_asset_id} --ledger {ledger_asset_id} --type IP --authority A2 --lifecycle draft \
  --scope-tags "{the Manifest's scope tags}" --domains "{the Manifest's domains}"
```

## Step 4 - The tracked-table row

An Implementation Plan holds a row, because the Manifest's own table says an IP row records its execution as landed evidence. One guarded live-state edit inserts it, anchored on the table's LAST row line, whole: the edit's `find` is that line, its `replace` is the same line, a newline, and the new row, so a mis-read table refuses before the write. A Manifest still carrying the legacy HTML table takes the same append behind its `</table>` line in the pipe form, and the FIRST such append carries the header line and the divider above the row, so the block reads as the viewer reads it; a bare orphan row still parses, and the lawful form is the block (IP-MC17-014, REVIEW-MC17-005 finding 3); its AO converts the whole table with `mc17 check {manifest_asset_id} --convert` when they choose:

```bash
mc17 amend {manifest_asset_id} --edits row.json --class manifest --expect-binding unmoved
```

Before the send, run the same `amend` with `--dry`: it composes the edits, runs the writing lint over the whole composed body, the stored text included, names every hit by line and rule, and sends nothing. A hit on a line the edits did not touch stands in the stored text; repair it in the same edits file.

The row: `| IP-{SCOPE}-{ipnum} - asset {id} | IP | {AO} | {mode} | Draft, {date} | None | None |`, a literal pipe in any value written `\|`. The guard refuses a mis-anchored edit before the write.

**The verification owed.** Where `mc17 amend` printed `VERIFICATION OWED NOW: {skill}` as its last line, run that skill over the document before this skill reports: the row is a live-state write and owes none; a line `NO VERIFIER: {class}` owes nothing.

## Step 5 - Report

Ids and hashes as printed; the section *Checks that carry no break* ships `None.`, and the author names there, one to a line, each added or changed check that guards no refusal, lock, digest or gate, which the integration stage then passes on that list alone; every `[TBD]` named with its owner; the three fields other skills parse called out to the author: the Cross-IP Assumptions table takes the two ordering claims exactly, the Blast Radius claim takes one of three values and sets who may approve, and the Test Cases section cites by identifier every Test Plan case this plan proves, because `mc-vf-ip-v17` fails the Mission on a case no plan, no integration stage and no post-landing marking owns. Next: the author writes the plan, `mc-vf-ip-v17`, `mc-apr-ip-v17`.

## Rules this skill cannot check

- Whether the delta is the right slice of the Move: the authority's, at approval.
- Whether the claimed radius is honest: `mc-vf-ip-v17` checks the vocabulary, the approver checks the claim.

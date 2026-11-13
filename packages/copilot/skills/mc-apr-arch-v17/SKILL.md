---
name: mc-apr-arch-v17
description: "Conduct the Technical Owner's approval of a CANONQ-NATIVE v1.7 ARCH. Checks currency (the binding now against the binding the last verification recorded, mc17 binding --class artifact), refuses where stale or unverified and names the re-run. Runs the review gate before the interview (mc17 reviewed): where no review record names the ARCH the authority is told and mc-adv-review-v17 named, and where a review's work-order item stands open the approval refuses (IP-MC17-012 L10-B). Captures the decision and the authority's own words verbatim, appends an approval ledger record (authorityWords required by the schema), writes the Approvals entry with mc17 aprentry through a guarded amend, and performs the Modules adoption into the Manifest as a declared declarative change with the staling consequence announced first. Promotes to a standalone APR document (mc17 create --render apr) where conditions carry substantive weight. Triggers on \"approve arch v17\", \"mc-apr-arch-v17\". Optional argument = archnum (default 001)."
---

# mc-apr-arch-v17

Read this file to the end before acting. An approval is an authority's act: this skill carries his words and invents none. **An authority's words are never invented to make an approval record land**; where they are missing, the record is not written. Every record this skill appends carries `recordedBy`, the name of the person or session that writes it down, on a ledger of either version.

`mc17` is the launcher `client/mc17` two levels above this skill's folder, from a POSIX shell, Git Bash included, and `client/mc17.cmd` from PowerShell or cmd. The tool reports; this skill judges.

## Parameters

- **?** - display the block below and stop.
- **archnum** (optional) - default `001`.

```
mc-apr-arch-v17 v0.1.0 (MC 1.7 - CanonQ-native)
Parameters: ?  |  archnum (default 001)
Mechanical half: mc17 (version, binding --class artifact, reviewed, aprid, aprentry, amend, create).
Gates: a current PASS verification record, named by ledger record number; the review gate, no open work-order item on any review naming the ARCH.
Notion or v1.6 ARCHs: mc-apr-arch (v1) or mc-apr-arch-v2.
```

## Step 0 - Which copy, which Mission, which authority

`mc17 version`, then resolve the ARCH and the Manifest by exact-title search, limit 50. Pin gate as everywhere: v1.7 proceeds, v1.6 routes to the v2 family, no pin stops. **The authority gate:** the Manifest's Authorities field names the TO, and an approval for a role the Manifest leaves empty is refused, the refusal naming the empty field; it is cleared by a Manifest change and never by this skill choosing a name.

## Step 1 - Currency

```bash
mc17 binding {arch_asset_id} --class artifact
mc17 read tail --ledger {ledger_asset_id} --count 50   # the records whose refs[0].doc is ARCH-{SCOPE}-{archnum}; read more where none is
```

Take the last `verification` record. Three states:

- **No verification record, or last verdict FAIL or BLOCKED:** refuse. The approval rests on a positive verification and names its record; the named re-run is `mc-vf-arch-v17`.
- **A PASS record whose binding differs from the binding now:** the content moved since verification. Refuse, name both figures, name the re-run. Never approve a document nobody has verified as it stands.
- **A PASS record at the current binding:** proceed, holding that record's number.

## Step 1b - The review gate

```bash
mc17 reviewed {ledger_asset_id} --artifact ARCH-{SCOPE}-{archnum} --asset {arch_asset_id} --manifest {manifest_asset_id}
```

The `advisory` lines the command prints, open entries whose severity stands below the Manifest's `review.blocking-severity-floor`, block nothing and go to the authority at the interview's opening, as the `note` lines do, each with its item and its severity beside the floor the command read, because the Definition says an advisory entry is named at the gate.

The law is Definition Section 12, *Approvals and Change Governance*, as amended by IP-MC17-012 L10-B on 2026-08-28: "an approval is not put to an authority before the adversarial review of that artifact has run and its work order stands dispatched". The incident: four approvals were offered to the Business Owner on a SPEC, a Test Plan and an ARCH on the author's confidence alone, before any review had run, and the review ordered afterwards returned 22 findings, three of them critical. An approval is the moment a document stops being the author's, so the gate runs before the interview and never after it.

The verb reads the ledger. A review OF the ARCH is a record of kind `review` whose refs name it (`doc` equal to the title, or `asset` equal to the id given with `--asset`), or the pre-kind note form from before kind `review` existed, a record of kind `note` whose refs carry a `REVIEW-*` titled doc AND name the ARCH. A review whose refs carry the ARCH is a review of it, because `mc-adv-review-v17` writes every artifact it read into the refs. Its work-order items are the record's `workOrder` entries, and an item stands open where its `disposition` is anything but `applied`, `argued` or `ruled-away`: `open` itself, a word outside the vocabulary, or no disposition at all. Since 0.1.49 the verb refuses a dispatched entry too, and names the record it names, where the ledger does not hold that record, where the record carries verdict FAIL, or where the record names the entry's review in neither its refs nor its body. A record of kind `review` carrying no `workOrder` array at all, which the ledger schema forbids and an unvalidated door can still land, reads as one open item, because a finding nobody can read is a finding nobody dispatched. The verb answers ONE of five states, printed on its face and carried in `--json` as `{state, reviews, openItems, ok}`, and this skill acts on each as written:

- **`unknown`**, exit 1: no record of ANY kind names the ARCH, so this is a title nobody verified or a misspelling, and the verb REFUSES naming it. Step 1 read the verification record by this title a moment ago, so the title in this command is the one that is wrong; correct it and run again. Nothing is recorded.

- **`none`**, exit 0: no review record names the ARCH. The interview opens by telling the authority, before the first question, that no review has read this artifact and that `mc-adv-review-v17 review ARCH-{SCOPE}-{archnum}` is how one is ordered. Ordering a review is the authority's call; this skill never orders one itself. The authority's answer is recorded verbatim in the approval record's body.
- **`open`**, exit 1: a review names the ARCH and at least one work-order item stands open. REFUSE before any interview: print the verb's output whole, name every open item by its id and severity, and name the repair, which is the dispatch step of `mc-adv-review-v17` (its Step 6: the dispatching record is appended, then `mc17 dispatch` composes the one lawful in-place write and the item lands `applied`, `argued` or `ruled-away` naming that record). Then STOP, with no record and no stamp. Ignoring a review already returned is nobody's call.
- **`prose`**, exit 0: every review naming the ARCH is the note form with no structured work order. Proceed; the approval record's body names those review records and says their dispositions are the reader's.
- **`dispatched`**, exit 0: every review naming the ARCH has every item applied, argued or ruled-away. Proceed; the record's evidence carries the verb's output verbatim.

Exit 1 is `open` and `unknown`, and those two alone refuse.

**Currency of the review is the authority's to judge.** The verb carries no binding, so it cannot know whether the text a review read still stands; what it reads is order, and it prints a `note` line for every review older than the artifact's last verification record. Put that note to the authority in the interview's opening, in those words: the artifact was verified again after the review read it, and whether the review still stands is the authority's call. A gate that refuses on a binding is owed a plan of its own (REVIEW-MC17-003 H3).

## Step 1c - The version the authority reads

```bash
mc17 published {arch_asset_id} --ledger {ledger_asset_id} --manifest {manifest_asset_id}
```

The command fetches the ARCH by its asset id and proves that the version on the page is the version its verifier passed: the binding it computes, the `**Binding:**` line of the VF Stamp and the `Verified:` line of the last verification record agree, and that record reads PASS. It prints every record of a write that names the ARCH, the one whose binding the version carries marked. Put the version it proved before the authority by asset id and version number. **On a refusal, stop before the interview** and name the verifier run the refusal names. The approval record's body carries the line the command printed last, `Read: {asset id} version {n}, binding {hex}, verified at record {m}`.

## Step 2 - The interview

One question at a time, the answers verbatim.

1. **The verdict:** `Approved`, `Approved with conditions`, or `Rejected`. The vocabulary is closed at three.
2. **Conditions**, where the verdict carries them: each condition in the authority's own words.
3. **The authority's words:** the sentence or sentences that ARE the approval, as given. They go into the ledger record's `authorityWords` untouched, the schema requires them, and the ruling-record law applies: the verbatim block is the authority's, and every sentence the recorder adds is marked as the recorder's.
4. **Promotion:** a standalone APR document is owed where the approval carries substantive conditions, several rounds, or audit weight; the ledger stamp alone is the default. Ask only where conditions exist or the authority asks for the document.
5. **The speaker.** Where the session has announced no speaker for the words, ask who speaks them, in which role and under which name, before the record is written. The record carries `spokenBy`, one entry `{role} {name}` for each passage of `authorityWords`, in the order the passages stand.

## Step 3 - The record, the id, the stamps

1. **The ledger record first**, appended with `mc17 append {ledger_asset_id} --record <record.json>`, the record written to a file first: kind `approval`, verdict mapped (`Approved` and `Approved with conditions` are PASS, `Rejected` is FAIL), `refs` leading with the ARCH, `authorityWords` verbatim, evidence carrying the Step 1 binding output, the verification record's pointer, the Step 1b `reviewed` output and the Step 1c `published` output; the body carrying the `Read:` line Step 1c printed, and the authority's answer verbatim where Step 1b answered `none`, and the review records named where it answered `prose`. Read the assigned `n` back before naming it anywhere.
2. **The id**: `mc17 aprid --scheme {the Manifest's declared scheme} --scope {SCOPE} --authority TO --artifact ARCH-{archnum}` (sequence-keyed adds `--seq`). The creation act refuses an id outside the declared scheme, which is why the id comes from the tool.
3. **The Approvals entry**, composed by the tool so the load-bearing form cannot drift, then written as one guarded live-state edit:

```bash
mc17 aprentry --role TO --name "{name}" --decision "{verdict}" \
  --aprid {APR id} --datetime {now, second-accurate} --binding {the current binding} --record {n}
mc17 amend {arch_asset_id} --edits approvals.json --class artifact --expect-binding unmoved
```

Before the send, run the same `amend` with `--dry`: it composes the edits, runs the writing lint over the whole composed body, the stored text included, names every hit by line and rule, and sends nothing. A hit on a line the edits did not touch stands in the stored text; repair it in the same edits file.

The same live-state write removes every entry at a binding other than the one this approval names, and adds their records to the line `Earlier approvals: ledger records {a}, {b}.`, which stands in the section in their place: the edits in `approvals.json` remove those entries beside adding this one, and `mc17 check` names each such entry as stale.

The approval act writes no status line and nothing declarative: the header word is the verification act's, and the guard enforces the boundary mechanically.

4. **Promotion, where ruled:** `mc17 create --title {APR id} --collection {id} --render apr --answers apr.answers.json --type APR --authority A1 --lifecycle current`. The APR document cites the ledger record; the words stay in the ledger. `mc17 create` refuses a governed title without proof of the plain-language pass (`AC-24`). So render the APR to a file first (`mc17 render apr --answers apr.answers.json`), run the skill `mc-plain-v17` over it, and put `--file <rewrite.md> --plain <proof.json>` in the place of `--render apr --answers apr.answers.json`.

## Step 4 - The Modules adoption, announced first

Where the verdict is `Approved` or `Approved with conditions` and the ARCH's Modules section carries a roster, the Manifest's Modules field is adopted from it, with the origin stated in all three elements the law requires: the ARCH section, the asset id, and this approval. **This is a declarative Manifest change: it moves the Manifest's binding and stales every approval bound to the prior figure.** The edits in `modules.json` add the Manifest's Change Log row of the version this write creates, the current version `mc17 versions {manifest_asset_id}` prints plus one, with `Modules` in its what-changed cell and the record of this approval in its ledger-records cell; `mc17 amend` refuses the write without that row. Where the Manifest's Approvals section carries entries, the edits in `modules.json` also remove them: the section keeps the line `Earlier approvals: ledger records {a}, {b}; none current.`, the row's ledger-records cell names those records too, and the status line reads `Verified`. `mc17 amend` refuses a write that keeps an approval of the old text, and then sets the Manifest's own Approvals cell in its tracked table to `none current; earlier records {a}, {b}`. Section 10's rule holds: tell the named authority what the act will do, then perform it,

```bash
# This amend moves the Manifest's binding. It runs the writing lint over the whole Manifest and the record check, and asks no rewrite:
# the Manifest's one rewrite is on record in the ledger, or the Mission creation act made it, and the write goes on record.
mc17 amend {manifest_asset_id} --edits modules.json --class manifest --expect-binding moved --manifest {manifest_asset_id} --ledger {ledger_asset_id}
```

and the report names the staled approvals and the re-runs owed. **The verification owed.** Where `mc17 amend` printed `VERIFICATION OWED NOW: {skill}` as its last line, run that skill over the document before this skill reports: here `mc-vf-manifest-v17` over the Manifest, whose binding the adoption moved, and the report names that verification's record; a line `NO VERIFIER: {class}` owes nothing. Where the Mission's Manifest carries no approvals yet, the announcement says so and the cost is one re-verification.

## Rules this skill cannot check

- Whether the architecture deserves approval: the whole point of the interview, and the TO's alone.
- Whether the conditions are discharged later: the artifact's AO and the closure sweep.
- Whether the adopted roster's owners are the right people: the BO's at the next Manifest reading.

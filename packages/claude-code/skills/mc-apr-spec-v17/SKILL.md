---
name: mc-apr-spec-v17
description: "Conduct one authority's approval of a CANONQ-NATIVE v1.7 root SPEC: the Business Owner's, or the Technical Owner's whose currency closure condition 6 requires beside it. Currency gate against the last PASS verification's binding (mc17 binding --class artifact), the review gate before the interview (mc17 reviewed: the authority told where no review names the SPEC, the approval refused where a review's work-order item stands open, IP-MC17-012 L10-B), authorityWords verbatim into the approval ledger record, the entry from mc17 aprentry written by guarded amend, promotion to a rendered APR where conditions carry weight. Runs once per authority. Triggers on \"approve spec v17\", \"mc-apr-spec-v17\". Arguments: the acting role (BO or TO), optional specnum (default 001)."
---

# mc-apr-spec-v17

Read this file to the end before acting. An approval is an authority's act: this skill carries the words given and invents none, and **an authority's words are never invented to make an approval record land**. Under DECISION-TRIAL-DELEGATION-MC17-001 a delegate's own words are attributed to the delegate. `mc17` is the launcher `client/mc17` two levels above this skill's folder, from a POSIX shell, Git Bash included, and `client/mc17.cmd` from PowerShell or cmd. Every record this skill appends carries `recordedBy`, the name of the person or session that writes it down, on a ledger of either version.

## Parameters

- **role** (required) - `BO` or `TO`. Closure condition 6 wants the SPEC Approved by the BO carrying a current TO approval, so a Mission runs this twice.
- **specnum** (optional) - default `001`.

```
mc-apr-spec-v17 v0.1.0 (MC 1.7 - CanonQ-native)
Parameters: role (BO | TO)  |  specnum (default 001)
Mechanical half: mc17 (version, binding --class artifact, reviewed, aprid, aprentry, amend, create).
Gates: a current PASS verification, named by record; the review gate, no open work-order item on any review naming the SPEC.
```

## Step 0 - Which copy, which Mission, which authority

`mc17 version`, exact-title resolution, pin gate as everywhere. The Manifest's Authorities field names the acting role's person, and an approval for an empty role is refused naming the field. A delegation clause beside the name covers a delegate acting.

## Step 1 - Currency

```bash
mc17 binding {spec_asset_id} --class artifact
mc17 read tail --ledger {ledger_asset_id} --count 50   # the records whose refs[0].doc is SPEC-{SCOPE}-{specnum}; read more where none is
```

The last `verification` must be PASS at the binding computed now. Anything else refuses, naming both figures and `mc-vf-spec-v17` as the re-run. Never approve what nobody verified as it stands.

## Step 1b - The review gate

```bash
mc17 reviewed {ledger_asset_id} --artifact SPEC-{SCOPE}-{specnum} --asset {spec_asset_id} --manifest {manifest_asset_id}
```

The `advisory` lines the command prints, open entries whose severity stands below the Manifest's `review.blocking-severity-floor`, block nothing and go to the authority at the interview's opening, as the `note` lines do, each with its item and its severity beside the floor the command read, because the Definition says an advisory entry is named at the gate.

The law is Definition Section 12, *Approvals and Change Governance*, as amended by IP-MC17-012 L10-B on 2026-08-28: "an approval is not put to an authority before the adversarial review of that artifact has run and its work order stands dispatched". The incident: four approvals were offered to the Business Owner on a SPEC, a Test Plan and an ARCH on the author's confidence alone, before any review had run, and the review ordered afterwards returned 22 findings, three of them critical. An approval is the moment a document stops being the author's, so the gate runs before the interview and never after it. The gate runs on every run of this skill, the BO's and the TO's alike.

The verb reads the ledger. A review OF the SPEC is a record of kind `review` whose refs name it (`doc` equal to the title, or `asset` equal to the id given with `--asset`), or the pre-kind note form from before kind `review` existed, a record of kind `note` whose refs carry a `REVIEW-*` titled doc AND name the SPEC. A review whose refs carry the SPEC is a review of it, because `mc-adv-review-v17` writes every artifact it read into the refs. Its work-order items are the record's `workOrder` entries, and an item stands open where its `disposition` is anything but `applied`, `argued` or `ruled-away`: `open` itself, a word outside the vocabulary, or no disposition at all. Since 0.1.49 the verb refuses a dispatched entry too, and names the record it names, where the ledger does not hold that record, where the record carries verdict FAIL, or where the record names the entry's review in neither its refs nor its body. A record of kind `review` carrying no `workOrder` array at all, which the ledger schema forbids and an unvalidated door can still land, reads as one open item, because a finding nobody can read is a finding nobody dispatched. The verb answers ONE of five states, printed on its face and carried in `--json` as `{state, reviews, openItems, ok}`, and this skill acts on each as written:

- **`unknown`**, exit 1: no record of ANY kind names the SPEC, so this is a title nobody verified or a misspelling, and the verb REFUSES naming it. Step 1 read the verification record by this title a moment ago, so the title in this command is the one that is wrong; correct it and run again. Nothing is recorded.

- **`none`**, exit 0: no review record names the SPEC. The interview opens by telling the authority, before the first question, that no review has read this artifact and that `mc-adv-review-v17 review SPEC-{SCOPE}-{specnum}` is how one is ordered. Ordering a review is the authority's call; this skill never orders one itself. The authority's answer is recorded verbatim in the approval record's body.
- **`open`**, exit 1: a review names the SPEC and at least one work-order item stands open. REFUSE before any interview: print the verb's output whole, name every open item by its id and severity, and name the repair, which is the dispatch step of `mc-adv-review-v17` (its Step 6: the dispatching record is appended, then `mc17 dispatch` composes the one lawful in-place write and the item lands `applied`, `argued` or `ruled-away` naming that record). Then STOP, with no record and no stamp. Ignoring a review already returned is nobody's call.
- **`prose`**, exit 0: every review naming the SPEC is the note form with no structured work order. Proceed; the approval record's body names those review records and says their dispositions are the reader's.
- **`dispatched`**, exit 0: every review naming the SPEC has every item applied, argued or ruled-away. Proceed; the record's evidence carries the verb's output verbatim.

Exit 1 is `open` and `unknown`, and those two alone refuse.

**Currency of the review is the authority's to judge.** The verb carries no binding, so it cannot know whether the text a review read still stands; what it reads is order, and it prints a `note` line for every review older than the artifact's last verification record. Put that note to the authority in the interview's opening, in those words: the artifact was verified again after the review read it, and whether the review still stands is the authority's call. A gate that refuses on a binding is owed a plan of its own (REVIEW-MC17-003 H3).

## Step 1c - The version the authority reads

```bash
mc17 published {spec_asset_id} --ledger {ledger_asset_id} --manifest {manifest_asset_id}
```

The command fetches the SPEC by its asset id and proves that the version on the page is the version its verifier passed: the binding it computes, the `**Binding:**` line of the VF Stamp and the `Verified:` line of the last verification record agree, and that record reads PASS. It prints every record of a write that names the SPEC, the one whose binding the version carries marked. Put the version it proved before the authority by asset id and version number. **On a refusal, stop before the interview** and name the verifier run the refusal names. The approval record's body carries the line the command printed last, `Read: {asset id} version {n}, binding {hex}, verified at record {m}`.

## Step 2 - The interview

1. **The verdict**: `Approved`, `Approved with conditions`, or `Rejected`; the vocabulary is closed.
2. **Conditions**, where carried, in the authority's own words.
3. **The authority's words**, verbatim, into `authorityWords`.
4. **Promotion** to a rendered APR document where conditions carry substantive weight; the ledger stamp is the default. The APR is rendered to a file, goes through the skill `mc-plain-v17`, and is created with `--file <rewrite.md> --plain <proof.json>`, because `mc17 create` refuses a governed title without that proof.
5. **The speaker.** Where the session has announced no speaker for the words, ask who speaks them, in which role and under which name, before the record is written. The record carries `spokenBy`, one entry `{role} {name}` for each passage of `authorityWords`, in the order the passages stand.

## Step 3 - The record, the id, the stamps

The ledger `approval` record first, appended with `mc17 append {ledger_asset_id} --record <record.json>`, the record written to a file first (`refs` leading with the SPEC, `authorityWords` verbatim, the verification record cited, the evidence carrying the Step 1b `reviewed` output and the Step 1c `published` output, the body carrying the `Read:` line Step 1c printed and the authority's answer verbatim where Step 1b answered `none` and the review records named where it answered `prose`), `n` read back. Then `mc17 aprid --scheme {declared} --scope {SCOPE} --authority {role} --artifact SPEC-{specnum}`. Then one guarded amend on the SPEC's Approvals section with the `aprentry` line, and one on the Manifest's SPEC row Approvals cell, both `--expect-binding unmoved`. The same live-state write removes every entry at a binding other than the one this approval names, and adds their records to the line `Earlier approvals: ledger records {a}, {b}.`, which stands in the section in their place; `mc17 check` names each such entry as stale. The approval writes no status line: the header word is the verification act's.

## Rules this skill cannot check

- Whether the SPEC deserves approval: the whole point of the interview.
- Whether conditions are discharged later: the AO and the closure sweep.

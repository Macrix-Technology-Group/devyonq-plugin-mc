---
name: mc-apr-ip-v17
description: "Conduct the approval of a CANONQ-NATIVE v1.7 Implementation Plan under the blast-radius gate: module-confined is the Module Owner's approval, cross-module the Technical Owner's, customer-facing the Business Owner's, and the act refuses an authority below the radius the IP claims (mc17 radius). Checks currency against the last PASS verification's binding, runs the review gate before the interview (mc17 reviewed: the authority told where no review names the IP, the approval refused where a review's work-order item stands open, IP-MC17-012 L10-B), captures the authority's own words verbatim into the approval ledger record, writes the Approvals entry and the tracked-row cells by guarded amend, and promotes to a rendered APR document where conditions carry weight. Triggers on \"approve ip v17\", \"mc-apr-ip-v17\". Optional argument = ipnum (default 001)."
---

# mc-apr-ip-v17

Read this file to the end before acting. An approval is an authority's act: this skill carries his words and invents none, and **an authority's words are never invented to make an approval record land**. `mc17` is the launcher `client/mc17` two levels above this skill's folder, from a POSIX shell, Git Bash included, and `client/mc17.cmd` from PowerShell or cmd. Every record this skill appends carries `recordedBy`, the name of the person or session that writes it down, on a ledger of either version.

## Parameters

- **?** - display the block below and stop.
- **ipnum** (optional) - default `001`.

```
mc-apr-ip-v17 v0.1.0 (MC 1.7 - CanonQ-native)
Parameters: ?  |  ipnum (default 001)
Mechanical half: mc17 (version, binding --class artifact, radius, reviewed, aprid, aprentry, amend, create).
Gates: a current PASS verification, the blast-radius floor on the acting authority, and the review gate (no open work-order item on any review naming the IP).
Notion or v1.6 IPs: mc-apr-ip (v1) or mc-apr-ip-v2.
```

## Step 0 - Which copy, which Mission, which authority

`mc17 version`, exact-title resolution, pin gate as everywhere. Read the IP's **Radius claimed** value and the Manifest's Authorities field, then run the gate the law names:

```bash
mc17 radius --claimed {the IP's claim} --authority {the acting role: MO, TO or BO}
```

A refusal is final for this act and names the floor; the recovery is the right authority acting, never a softer reading of the claim. An approval for a role the Manifest leaves empty is refused naming the empty field, cleared by a Manifest change alone. **The acting person must be the person the Manifest names for that role**, and where one person holds several roles the collapse declaration covers it.

## Step 1 - Currency

```bash
mc17 binding {ip_asset_id} --class artifact
mc17 read tail --ledger {ledger_asset_id} --count 50   # the records whose refs[0].doc is IP-{SCOPE}-{ipnum}; read more where none is
```

The last `verification` record must be PASS at the binding computed now. No record, a FAIL, a BLOCKED, or a moved binding: refuse, name the figures, name `mc-vf-ip-v17` as the re-run. Never approve what nobody verified as it stands.

## Step 1b - The review gate

```bash
mc17 reviewed {ledger_asset_id} --artifact IP-{SCOPE}-{ipnum} --asset {ip_asset_id} --manifest {manifest_asset_id}
```

The `advisory` lines the command prints, open entries whose severity stands below the Manifest's `review.blocking-severity-floor`, block nothing and go to the authority at the interview's opening, as the `note` lines do, each with its item and its severity beside the floor the command read, because the Definition says an advisory entry is named at the gate.

The law is Definition Section 12, *Approvals and Change Governance*, as amended by IP-MC17-012 L10-B on 2026-08-28: "an approval is not put to an authority before the adversarial review of that artifact has run and its work order stands dispatched". The incident: four approvals were offered to the Business Owner on a SPEC, a Test Plan and an ARCH on the author's confidence alone, before any review had run, and the review ordered afterwards returned 22 findings, three of them critical. An approval is the moment a document stops being the author's, so the gate runs before the interview and never after it.

The verb reads the ledger. A review OF the IP is a record of kind `review` whose refs name it (`doc` equal to the title, or `asset` equal to the id given with `--asset`), or the pre-kind note form from before kind `review` existed, a record of kind `note` whose refs carry a `REVIEW-*` titled doc AND name the IP. A review whose refs carry the IP is a review of it, because `mc-adv-review-v17` writes every artifact it read into the refs. Its work-order items are the record's `workOrder` entries, and an item stands open where its `disposition` is anything but `applied`, `argued` or `ruled-away`: `open` itself, a word outside the vocabulary, or no disposition at all. Since 0.1.49 the verb refuses a dispatched entry too, and names the record it names, where the ledger does not hold that record, where the record carries verdict FAIL, or where the record names the entry's review in neither its refs nor its body. A record of kind `review` carrying no `workOrder` array at all, which the ledger schema forbids and an unvalidated door can still land, reads as one open item, because a finding nobody can read is a finding nobody dispatched. The verb answers ONE of five states, printed on its face and carried in `--json` as `{state, reviews, openItems, ok}`, and this skill acts on each as written:

- **`unknown`**, exit 1: no record of ANY kind names the IP, so this is a title nobody verified or a misspelling, and the verb REFUSES naming it. Step 1 read the verification record by this title a moment ago, so the title in this command is the one that is wrong; correct it and run again. Nothing is recorded.

- **`none`**, exit 0: no review record names the IP. The interview opens by telling the authority, before the first question, that no review has read this artifact and that `mc-adv-review-v17 review IP-{SCOPE}-{ipnum}` is how one is ordered. Ordering a review is the authority's call; this skill never orders one itself. The authority's answer is recorded verbatim in the approval record's body.
- **`open`**, exit 1: a review names the IP and at least one work-order item stands open. REFUSE before any interview: print the verb's output whole, name every open item by its id and severity, and name the repair, which is the dispatch step of `mc-adv-review-v17` (its Step 6: the dispatching record is appended, then `mc17 dispatch` composes the one lawful in-place write and the item lands `applied`, `argued` or `ruled-away` naming that record). Then STOP, with no record and no stamp. Ignoring a review already returned is nobody's call.
- **`prose`**, exit 0: every review naming the IP is the note form with no structured work order. Proceed; the approval record's body names those review records and says their dispositions are the reader's.
- **`dispatched`**, exit 0: every review naming the IP has every item applied, argued or ruled-away. Proceed; the record's evidence carries the verb's output verbatim.

Exit 1 is `open` and `unknown`, and those two alone refuse.

**Currency of the review is the authority's to judge.** The verb carries no binding, so it cannot know whether the text a review read still stands; what it reads is order, and it prints a `note` line for every review older than the artifact's last verification record. Put that note to the authority in the interview's opening, in those words: the artifact was verified again after the review read it, and whether the review still stands is the authority's call. A gate that refuses on a binding is owed a plan of its own (REVIEW-MC17-003 H3).

## Step 1c - The version the authority reads

```bash
mc17 published {ip_asset_id} --ledger {ledger_asset_id} --manifest {manifest_asset_id}
```

The command fetches the IP by its asset id and proves that the version on the page is the version its verifier passed: the binding it computes, the `**Binding:**` line of the VF Stamp and the `Verified:` line of the last verification record agree, and that record reads PASS. It prints every record of a write that names the IP, the one whose binding the version carries marked. Put the version it proved before the authority by asset id and version number. **On a refusal, stop before the interview** and name the verifier run the refusal names. The approval record's body carries the line the command printed last, `Read: {asset id} version {n}, binding {hex}, verified at record {m}`.

## Step 2 - The interview

1. **The verdict:** `Approved`, `Approved with conditions`, or `Rejected`; the vocabulary is closed.
2. **Conditions**, where carried, each in the authority's own words.
3. **The authority's words**, verbatim, into `authorityWords`; the ruling-record law applies.
3b. **The repair ruling, where the IP's face reads `Move type: Repair`** (Profile 5.2, *A repair ruling states what is deferred, and by when*; Definition Section 5, *The Repair Move's chain*). Ask the authority what the repair lands ahead of, and by when: each act and its date go into the words verbatim as a `deferred:` list, one `act, YYYY-MM-DD` per line, and the list ends at the first blank line followed by a line that is no item, where the words may go on; the record that later performs an act carries in its body a line reading `Discharges: {act}`, the act in the list's own words, and the list's line then gains `, done record {n}`, which `mc17 rulings --ledger` reads as done only where that record carries the line and no FAIL verdict; a ruling that defers nothing says so in as many words, and that sentence is recorded too. **Refuse an approval whose deferred list names a never-deferrable act**, naming it: the review gate, the reproduction passing at the landed sha, the defect record, the resolved record, or the ruling itself. Deferrable, with a date: the Implementation Report to the next working day, the renewal of a stale approval the repair touched, a regression case beyond the one carried, a documentation change, the parent's Move sweep re-run. The same words are written into the Mission's Rulings register in the same act (Profile 1.5), by an amend that names the authority with `--written-by` and the Manifest with `--manifest {manifest_asset_id}`, since the section carries that person's own words, as one `### R{n}` section placed at the end of `## Rulings`, before `## Change Log`, because `mc17 rulings` reads no ruling outside that section, the words in a fence, then the three field lines: Given `{role}, {date}`, Implemented in `IP-{SCOPE}-{ipnum} - asset {id}`, Verified by `mc17 rulings (the dates) and mc17 ledger --repair (the sweep)` (Definition Section 1 as amended by IP-MC17-013). `mc17 rulings` then names any deferred act past its date, and the Move sweep and the closure act fail on it.
4. **Promotion** to a standalone APR document where conditions carry substantive weight, several rounds, or audit weight; the ledger stamp is the default.
5. **The speaker.** Where the session has announced no speaker for the words, ask who speaks them, in which role and under which name, before the record is written. The record carries `spokenBy`, one entry `{role} {name}` for each passage of `authorityWords`, in the order the passages stand.

## Step 3 - The record, the id, the stamps

1. **The ledger record**, appended with `mc17 append {ledger_asset_id} --record <record.json>`, the record written to a file first as *Writing a ledger record* says: kind `approval`, verdict mapped (`Rejected` is FAIL, both others PASS), `refs` leading with the IP, `authorityWords` verbatim, evidence carrying the radius-gate output, the binding, the Step 1b `reviewed` output and the Step 1c `published` output; the body carrying the `Read:` line Step 1c printed, and the authority's answer verbatim where Step 1b answered `none`, and the review records named where it answered `prose`. Take the number the command prints.
2. **The id**: `mc17 aprid --scheme {declared} --scope {SCOPE} --authority {role} --artifact IP-{ipnum}` (sequence-keyed adds `--seq`).
3. **The stamps, all live state, all guarded `--expect-binding unmoved`**: the Approvals entry on the IP from `mc17 aprentry`, and the Manifest row's Status and Approvals cells (`Approved, {date}, record {n}` and the entry). The same live-state write removes every entry at a binding other than the one this approval names, and adds their records to the line `Earlier approvals: ledger records {a}, {b}.`, which stands in the section in their place; `mc17 check` names each such entry as stale. The approval act writes no status line and nothing declarative; the guard enforces the boundary.
4. **Promotion, where ruled**: `mc17 create --render apr` with `--type APR --authority A1 --lifecycle current`; the words stay in the ledger, the document cites the record. `mc17 create` refuses a governed title without proof of the plain-language pass (`AC-24`). So render the APR to a file first, run the skill `mc-plain-v17` over it, and create with `--file <rewrite.md> --plain <proof.json>` in the place of `--render apr`.

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

- Whether the plan deserves approval: the authority's alone.
- Whether the claimed radius matches the change's real reach: the authority's, reading the plan; the gate holds the floor to the claim as written.
- Whether conditions are discharged: the AO and the closure sweep.

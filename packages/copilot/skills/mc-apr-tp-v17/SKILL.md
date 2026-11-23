---
name: mc-apr-tp-v17
description: "Conduct the Technical Owner's approval of a CANONQ-NATIVE v1.7 Test Plan (the Business Owner may act where the Mission's rules route it to him). Currency gate against the last PASS verification's binding, the review gate before the interview (mc17 reviewed: the authority told where no review names the TP, the approval refused where a review's work-order item stands open, IP-MC17-012 L10-B), authorityWords verbatim, the entry from mc17 aprentry by guarded amend, promotion to a rendered APR where conditions carry weight. Triggers on \"approve tp v17\", \"mc-apr-tp-v17\". Arguments: optional role (default TO), optional tpnum (default 001)."
---

# mc-apr-tp-v17

Read this file to the end before acting. An authority's words are never invented; a delegate's words are attributed to the delegate under DECISION-TRIAL-DELEGATION-MC17-001. `mc17` is the launcher `client/mc17` two levels above this skill's folder, from a POSIX shell, Git Bash included, and `client/mc17.cmd` from PowerShell or cmd. Every record this skill appends carries `recordedBy`, the name of the person or session that writes it down, on a ledger of either version.

## Parameters

- **role** (optional) - default `TO`.
- **tpnum** (optional) - default `001`.

```
mc-apr-tp-v17 v0.1.0 (MC 1.7 - CanonQ-native)
Parameters: role (default TO)  |  tpnum (default 001)
Mechanical half: mc17 (version, binding --class artifact, reviewed, aprid, aprentry, amend, create).
Gates: a current PASS verification, named by record; the review gate, no open work-order item on any review naming the TP.
```

## The act

**The speaker.** Step 2 asks for the speaker as `mc-apr-spec-v17` does. Where the session has announced no speaker for the words, ask who speaks them, in which role and under which name, before the record is written. The record carries `spokenBy`, one entry `{role} {name}` for each passage of `authorityWords`, in the order the passages stand.

The same procedure as `mc-apr-spec-v17`, on the TP: Step 0's authority gate against the Manifest's named person, Step 1's currency against the last PASS verification's binding with a refusal naming both figures and `mc-vf-tp-v17`, Step 1b's review gate under Definition Section 12 as amended by IP-MC17-012 L10-B (below), Step 1c's proof of the version the authority reads, `mc17 published {tp_asset_id} --ledger {ledger_asset_id} --manifest {manifest_asset_id}`, which stops the act before the interview on a refusal and names the verifier run owed, Step 2's closed three-verdict interview with `authorityWords` verbatim, Step 3's ledger record first, appended with `mc17 append`, its body carrying the line `Read: {asset id} version {n}, binding {hex}, verified at record {m}` that `mc17 published` printed, then `aprid`, then the guarded amends on the TP's Approvals section and the Manifest's TP row, never the status line. The same live-state write removes every entry at a binding other than the one this approval names, and adds their records to the line `Earlier approvals: ledger records {a}, {b}.`, which stands in the section in their place; `mc17 check` names each such entry as stale. One procedure lives once; this file carries what differs, which is the artifact and the default role. The promotion to an APR document, where ruled, goes through the skill `mc-plain-v17` the way `mc-apr-spec-v17` states.

## Step 1b - The review gate

```bash
mc17 reviewed {ledger_asset_id} --artifact TP-{SCOPE}-{tpnum} --asset {tp_asset_id} --manifest {manifest_asset_id}
```

The `advisory` lines the command prints, open entries whose severity stands below the Manifest's `review.blocking-severity-floor`, block nothing and go to the authority at the interview's opening, as the `note` lines do, each with its item and its severity beside the floor the command read, because the Definition says an advisory entry is named at the gate.

Run before the interview, under Definition Section 12 as amended by IP-MC17-012 L10-B. Its five states are acted on exactly as `mc-apr-spec-v17` writes them: where no record of any kind names the TP (`unknown`, exit 1), the title in the command is wrong, because Step 1 read the verification record a moment ago, so correct it and run again; where no review names the TP (`none`, exit 0), the authority is told at the interview's opening that `mc-adv-review-v17 review TP-{SCOPE}-{tpnum}` is how one is ordered and the answer is recorded verbatim in the record's body; where a review names it and a work-order item stands open, which is any disposition outside `applied`, `argued` and `ruled-away`, a dispatched entry naming a record the ledger does not hold, one carrying verdict FAIL, or one naming the entry's review in neither its refs nor its body, or one naming a record that does not follow the review record, except a `ruled-away` entry citing the approving authority's triage record where the Manifest's `review.triage-before-obligation` reads on as it stood at the review record's number, or a kind `review` record carrying no work order at all (`open`, exit 1), the approval REFUSES before any interview, prints the verb's output, names every open item and the dispatch step of `mc-adv-review-v17` as the repair, and stops with no record and no stamp; the `prose` and `dispatched` states (exit 0) proceed with the body and evidence that skill names; and a `note` line naming a review older than the TP's last verification goes to the authority in the interview's opening, because the verb carries no binding and the review's currency is the authority's to judge.

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

- Whether the verification strategy fits the Move's risk: the whole point of the interview.

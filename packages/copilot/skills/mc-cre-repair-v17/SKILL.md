---
name: mc-cre-repair-v17
description: "Create a Repair Move in a CANONQ-NATIVE v1.7 Mission in one act, per Mission Definition v1.7 Move Types and Section 5 *The Repair Move's chain* (IP-MC17-006, CONCEPT-MC17-REPAIR-001). Resolves the parent Mission and whether it is closed; writes the DEFECT record where none stands (the authority's words verbatim); creates the repair collection and its ledger where the parent is closed; renders the one Implementation Plan with `Move type: Repair` and the reproduction in its Test Cases (mc17 render repair-ip); notes it beside the parent's tracked table. The repair ruling lands at approval (mc-apr-ip-v17). Triggers on \"create repair v17\", \"mc-cre-repair-v17\", \"repair move\". Arguments: the parent Mission name or Manifest id, and the defect record number where one stands."
---

# mc-cre-repair-v17

Read this file to the end before acting. A repair is a fix that lands with explicit debt, and this skill creates the smallest chain that still verifies; it approves nothing, and it runs no stage. `mc17` is the launcher `client/mc17` two levels above this skill's folder, from a POSIX shell, Git Bash included, and `client/mc17.cmd` from PowerShell or cmd. Every record this skill appends carries `recordedBy`, the name of the person or session that writes it down, on a ledger of either version.

```
mc-cre-repair-v17 v0.1.0 (MC 1.7 - CanonQ-native)
Parameters: ?  |  parent (Mission name or MANIFEST asset id)  |  defect (record n in the parent's ledger, optional)
Mechanical half: mc17 (version, status, hash, render repair-ip, render defect, create, amend, ledger, fields ip).
Product: one Repair Move ready for mc-vf-ip-v17 and mc-apr-ip-v17.
```

## Step 0 - Which copy, which parent, which state

`mc17 version`. Resolve the parent's `MANIFEST-{SCOPE}-001` by exact title, pin gate as everywhere (v1.6 parents take no Repair Move: their line has none). Read the parent's status line: `Closed` routes to Step 3b, anything else to Step 3a. Read the parent's ARCH from the note beside its tracked table; a parent with no ARCH carries the repair under its SPEC alone and the plan says so.

## Step 1 - The defect record

A repair begins with a standing DEFECT record and never without one.

- **Where one stands** (the argument names it): read it by pointer, `/records/*[/n={defect}]`, and hold its text; the record opens with the line `DEFECT` or it is no defect record, and the skill stops naming the record.
- **Where none stands**: take the defect from the authority who raised it, in his words verbatim, and render the body with `mc17 render defect --answers defect.answers.json` (`against`, `against_asset`, `statement`, `authority`, `authority_words`, `disposition`, `reproduction`). The disposition vocabulary is `repair here | repair in {Mission} | accept`, and for a repair this skill creates it reads `repair here` by construction. Append it as a `note` record to the parent's ledger with `mc17 append {ledger} --record <record.json>`, the parent's closed state included, because the closed ledger admits exactly this append (Definition Section 10, *Immutability enforcement* as amended). Take the number the command prints.

## Step 2 - The reproduction

The reproduction is the repair's whole acceptance criterion, `AC-R`: state it so someone who did not write it can run it and see it fail at the parent's landed sha. Take it from the defect record where the record carries one; take it from the authority otherwise, and write it back into the defect record's text where the record is being written now.

## Step 3a - An open parent

The repair lives in the parent's collection as one more Implementation Plan. The sequence number is the parent's next, taken from `mc17 nextnum IP --scope {SCOPE} --collection {collection_id} --repo <the repository the parent Mission names>`, which reads the repository and the corpus together. On exit 0 the sequence part of its answer is `{seq}` from here on. On exit 1 the verb has refused, because the highest figure it found is a mention in a document's body that no filename and no document title holds, which is either a forward name announcing this very plan or a reference left behind by a deleted one. It prints both candidates and the mention's file and line. Read that line and put both candidates to the author. Where no author is reachable, take candidate 1 where the line plainly announces this plan, and otherwise stop and name the block. `--accept-mention` takes the HIGHER figure and prints the acceptance on the answer (IP-MC17-022). `Move type: Repair` on its face is what tells it from the parent's own plans. That face is the shape the landing audit reads back: when the repair reaches the trunk, `mc17 landing` reads its plan and passes the fix as a declared Repair Move; a fix landing under a plan carrying neither `Move type: Repair` nor a Revision Mission's `Supersedes` is named an undeclared repair (Profile, L14; IP-MC17-018).

## Step 3b - A closed parent

The parent reopens for nothing. Create the collection `Mission {parent name} / Repair {n}`, `{n}` the next in the parent's repair series (search the corpus for `Mission {parent name} / Repair`; `{n}` numbers a COLLECTION, which `nextnum` does not read, so this one search is the whole of its evidence and a partial listing gives a wrong `{n}`), with the parent's scope tags and domains and `mission:{parent-scope-lowercase}`. Create its ledger `VF-{SCOPE}-R{n}-001` as the Manifest-creation skill creates one (the JSON asset bound to the ledger schema, the bootstrap record naming the repair collection, the parent's closed ledger and the defect record by number), and note the parent's closed ledger record number in the bootstrap body.

On this path `{seq}` is read the same way as on the open-parent path above, from `mc17 nextnum IP --scope {SCOPE} --collection <the new repair collection> --repo <the repository the parent Mission names>`, with the same handling of its two answers. A fresh collection holds no plans, so the repository half is what answers, and a refusal there means a plan is named in the tree that no document holds.

## Step 4 - The plan

```bash
mc17 render repair-ip --answers repair.answers.json --audit --out IP-{SCOPE}-{seq}.md
# mc17 create refuses a governed title without proof of the plain-language pass (AC-24). The skill mc-plain-v17 over IP-{SCOPE}-{seq}.md hands back the rewrite and the proof named below.
mc17 create --title IP-{SCOPE}-{seq} --collection {collection_id} --file IP-{SCOPE}-{seq}.plain.md --plain IP-{SCOPE}-{seq}.proof.json --manifest {manifest_asset_id} --ledger {ledger_asset_id} --type IP --authority A2 --lifecycle draft --scope-tags {tags} --domains {domains}
mc17 fields ip {ip_asset_id}
```

Answers: `{SCOPE, seq, ao_string, parent_mission, parent_state, parent_arch, summary, module, defect_record, defect_ledger, defect_against, defect_statement, scope, repository, design, rejected, cross_module, cross_ip, reproduction, regression, radius}`. The `fields ip` output reads `Move type: Repair` with the reproduction and the regression case present, or the skill stops naming what is absent. The Module is one of the parent's roster; a closed parent's roster stands as its Manifest froze it.

## Step 5 - The notes, live state

- An open parent: one guarded amend on the parent's Manifest, `--expect-binding unmoved`, adding the plan's row to the tracked table with Status `Draft, Repair Move against DEFECT record {n}, {date}`.
- A closed parent: the parent's Manifest is frozen and takes no row. The repair collection carries a `REPAIR-{SCOPE}-R{n}-001` note document instead: the parent by name and id, the defect record, the plan, the ledger, and the landed sha and RESOLVED record once they exist. `mc17 check` on the parent is never run again; the repair sweep is `mc17 ledger --repair` over the repair ledger and the parent's closed ledger both.

## Step 6 - Report

Ids and hashes as printed; the defect record number; the reproduction in full; the state of the parent; what comes next in order: `mc-vf-ip-v17` on the plan, `mc-apr-ip-v17` with the repair ruling (what is deferred, and by when, into the register), one sanctioned stage with the review gate whole (`mc-cre-wave-v17` where the repair needs more than one stage), the reproduction's PASS record at the landed sha, then the `RESOLVED {n}` record, which closes the Repair Move.

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

- Whether the defect is a defect: the authority who raised it, and the disposition is his.
- Whether the repair is small enough to be a repair: the approving authority, reading the plan against the parent's ARCH; this skill refuses only a plan that names no parent ARCH where the parent has one.
- Whether the reproduction reproduces: the stage that runs it, at the parent's landed sha, before the repair.

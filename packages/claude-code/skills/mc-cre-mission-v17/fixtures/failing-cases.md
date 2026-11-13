# mc-cre-mission-v17 - the case each check must be seen to fail on

Mission Definition v1.7, *The Orchestration Harness*: a harness check is trusted after it has been seen to fail on the case it exists to catch, and that failing case is kept and re-run whenever the check changes.

A creation skill's checks run against a corpus and against an operator's answers, so a case here is a **scripted run**: a corpus state, an answer script, and the outcome the run must produce. Nothing is created on a case whose expected outcome is a stop.

`TRACE.md`, which stands in the plugin's source repository at `core/TRACE.md` and in no installed package, names the case id in the row of each check.

## How a case is run

1. Put the corpus into the state the case names, or point the run at a fixture corpus in that state.
2. Run `mc-cre-mission-v17 "Fixture Mission"` and answer with the case's script.
3. Assert the expected outcome, and assert that the report names the planted condition.
4. On a stop case, assert that `list_collections` shows no `Mission Fixture Mission` and that no asset was created.
5. On a create case, assert the named text is present in the created asset, then discard the collection.

## The cases

| Case | Corpus state or answer script | Expected outcome |
|---|---|---|
| CRE-F01 | Newest resolvable methodology set is v1.6 | Stop, routed to `mc-cre-mission-v2` with the condition stated, nothing created |
| CRE-F02 | Guide at v1.7 Living, Definition at v1.6 Living | Stop, version drift named, nothing created |
| CRE-F03 | Guide and Definition v1.7 Draft, Profile v1.7 Living | Stop, mixed-status set named document by document |
| CRE-F04 | All three v1.8 Living | Stop, newer methodology named |
| CRE-F05 | Guide and Definition v1.7, Profile absent, operator answers `no` at 4f | Created; third pin line reads not applicable with the reason and the not-found note |
| CRE-F06 | Guide and Definition v1.7, Profile absent, operator answers `yes` and then `yes` at 4f | Stop at 4f, nothing created |
| CRE-F07 | Two v1.7 drafts of the Definition, versions 1.7 and 1.7.1 | The higher version is pinned, the tiebreaker stated, no judgment asked |
| CRE-F08 | `bash_tool` unavailable, trial path | Stop at 0.3, nothing created |
| CRE-F09 | Trial path, operator answers `no` at 4.0 | Stop, nothing created |
| CRE-F11 | Operator overrides the SCOPE at Step 2 and names no authority | Derived SCOPE stands, no deviation recorded |
| CRE-F12 | Operator overrides the SCOPE and names an authority | `{chosen ID}` used, deviation recorded beside Identity with the authority |
| CRE-F13 | Operator answers `Contained` at 4a | Re-asked from the four, nothing created until one is chosen |
| CRE-F14 | SEC and DAT activated at 4b | 4e enumerates SEC and DAT among the classes; the Manifest carries the specialist authorities, the stubs, and the sign-off conditions |
| CRE-F15 | Default AO answered as an automated process | Escalation contact asked; SPEC and TP given a human AO; the two refusals stated at the prompt |
| CRE-F16 | Same person answered for BO, TO and default AO | Collapse question fires unprompted, control and end condition recorded |
| CRE-F17 | Operator names `AI-Watcher` as the Verifier | The role is written as Verifier, the v1.6 name refused with the rename stated |
| CRE-F18 | Fleet-run Mission, operator gives a runner path where a hash is required | The hash is computed under the Profile normalization and written with its source |
| CRE-F19 | Fleet-run Mission, merge bar with no ruleset available | The no-ruleset statement is written in place of a ruleset name |
| CRE-F20 | Fleet-run Mission adopting launch fingerprinting | The refusal-to-resume sentence stands in the Execution machinery field |
| CRE-F21 | Operator leaves an execution-machinery part unanswered | `[TBD]` written and the verification consequence stated at the prompt |
| CRE-F22 | Operator accepts the default APR scheme | `Authority-keyed` written explicitly on its own line |
| CRE-F23 | Revision shape | Supersedes asked and required; every other shape writes `N/A` |
| CRE-F24 | `list_properties` returns facet #3 | The primary Domain is offered from the returned values |
| CRE-F25 | `list_properties` refused | The prompt says the value cannot be validated; the Step 11 report carries the warning |
| CRE-F26 | Mission extends no Product and is not customer-specific | The `product:`/`customer:` follow-up fires; a stated reason is written beside Scope |
| CRE-F27 | Product Vision resolves for the named Product | Advances asked against its elements, entries written `{PROD-id} § {element}` |
| CRE-F28 | No Product Vision found for a named Product | `N/A` written and the miss reported so the reference can be corrected |
| CRE-F29 | Any successful run | Every created asset carries a reader line and a `## Summary` section |
| CRE-F30 | Any successful run | The Manifest's five live-state headings match the sibling's literal exclusion strings, character for character |
| CRE-F31 | Any successful run | Closure conditions 1 to 7 each carry a precedence bracket, conditions 3 and 4 included |
| CRE-F32 | A run with a non-empty Produces | The Produces condition is written as `P1.` under the no-precedence-position heading |
| CRE-F33 | A run where the BO commissions a measurement | Condition 3 carries all five freeze rules and the unrelated-asset scope clause |
| CRE-F34 | Any successful run | The declared-documents note carries the closed TYPE list and the `IR-{SCOPE}-{IP}-{SEQ}` form |
| CRE-F35 | Any successful run | The SPEC, TP and specialty templates each name the three parts the artifact projection removes, the two parts of the Definition's approval binding they carry none of, and the verification-before-approval rule |
| CRE-F36 | Any successful run | The Manifest declares the approval-record form the sibling parses at Step 7 |
| CRE-F37 | Any successful run | No asset carries `Approved` or `Verified`; the Manifest carries no VF ledger |
| CRE-F38 | Any successful run | Every `create_asset` id is captured; the tracked table's Doc name cells carry them after Step 10 |
| CRE-F39 | Any successful run | The Step 11 `[TBD]` list matches the disposition table, with no judgment exercised |
| CRE-F40 | Any successful run | The Step 11 next-steps name only `mc-vf-manifest-v17`, and say which family members are not installed |
| CRE-F41 | A `create_asset` whose response is lost | The object is read back by title before any retry, and no duplicate is created |
| CRE-F42 | Any successful run | The pin statement, the Manifest and the report all name the same CanonQ instance |
| CRE-F43 | A document titled `MANIFEST-FIXTURE-MISSION-001` already exists in the corpus | Stop at Step 3, before any interview question including 4.0 |
| CRE-F44 | Operator answers at 4e that ARCH and IP produce no artifact | The Work Modes table carries no ARCH row and no IP row, the omission and its reason stand beneath the table, and no cell carries a third value |
| CRE-F45 | An answer set carrying `status_provenance`, rendered through the Manifest template | The rendered Methodology Reference carries the Status source beside the pin lines, so `mc-vf-manifest-v17` field 1 passes on a trial pin. Watched failing against 0.1.5, where the template named no such key and dropped it in silence. |
| CRE-F46 | The platform stores a scope tag the Manifest never declared | Step 10 act 2 appends a bullet for it, and `mc17 check` afterwards reports every stored tag `ok` with no drift. Watched against 0.1.5, where the act was written only for a rewrite and named no edit for this shape. |
| CRE-F47 | A Manifest rendered with a Governance Process that resolves | The field names the process document once. Watched failing against 0.1.5, which hard-coded the name and substituted `{{governance_title}}` beside it. |
| CRE-F48 | A host whose multiple-choice prompt caps at four options, on the 4b specialty question | Both questions are asked, all four specialty values reach the operator, and CMP is never dropped to fit a cap. Watched against 0.1.5, where the question offered five values in one prompt and two cold runs dropped CMP. |
| CRE-F49 | `mc17 amend` handed an edit whose anchor lands twice | Refused before anything is composed, naming the edit and both counts. Watched failing with the count guard disabled. |
| CRE-F50 | A live-state amend whose edits move the binding | Refused BEFORE the write with both figures and the lawful declaration named. Smoked live on macrix 2026-08-19 (ARCH-SMOKE-001). |
| CRE-F51 | Operator answers `yes` and then `no` at 4f | No machinery part is asked; the answer set carries `fleets` false and `waves_by_hand` `yes`; the Profile pin line stays pinned and Execution machinery reads `Not applicable: this Mission's waves run by hand.` |
| CRE-F52 | The Profile unresolved at 0.2, operator answers `yes` and then `no` at 4f | Stop at 4f, the Profile named as unresolved; nothing created |
| CRE-F53 | A package with no runner, operator answers `yes` and then `yes` at 4f | `machinery --json` refuses naming the missing runner; the skill stops before anything is created, shows that message and says a fleet runs on Claude Code alone |

## Retired

**CRE-F10** planted a collection already titled `Mission Fixture Mission`. The Business Owner dropped the collection-title probe on 2026-08-18: Mission names are not unique, so the probe refused a state the sibling skill declares lawful. CRE-F43 keeps the Manifest-id half of the same collision check.

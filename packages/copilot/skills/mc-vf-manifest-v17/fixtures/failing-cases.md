# mc-vf-manifest-v17 - the case each check must be seen to fail on

Mission Definition v1.7, *The Orchestration Harness*: a harness check is trusted after it has been seen to fail on the case it exists to catch, and that failing case is kept and re-run whenever the check changes.

Each case below is a Manifest carrying exactly one planted defect and lawful everywhere else. The fixture is built by taking the Manifest `mc-cre-mission-v17` scaffolds for a Mission named `Fixture Mission` (SCOPE `FIXTURE-MISSION`), filling every `[TBD]`, and then planting the one defect the case names. **Expected verdict** is what the run must produce; a run that passes the case locates the defect in the check itself.

`TRACE.md`, which stands in the plugin's source repository at `core/TRACE.md` and in no installed package, names the case id in the row of each check.

## How a case is run

1. Create the fixture collection and Manifest from the scaffold, in a corpus the runner can write to.
2. Plant the single defect.
3. Run `mc-vf-manifest-v17` against it.
4. Assert the expected verdict, and assert that the finding names the planted defect.
5. Restore the Manifest, or discard the fixture collection.

A case whose expected verdict is `stop, no record` also asserts that the ledger gained no record and the Manifest gained no stamp.

## The cases

| Case | Defect planted | Expected verdict |
|---|---|---|
| VF-F01 | Methodology Reference pins Mission Control v1.6 | Stop, no record, routed to `mc-vf-manifest-v2` |
| VF-F02 | Methodology Reference emptied of every pin line | Stop, no record, repair directed to the AO |
| VF-F03 | Pin reads v1.7, ledger carries a v1.6-era record, no migration record anywhere | Stop, no record |
| VF-F04 | Pin reads v1.8 | Stop, no record, suite upgrade named |
| VF-F05 | The collection's SPEC asset deleted, its declared row left standing | Fail, field 24 names the unresolved document |
| VF-F06 | Definition asset edited after the last verification (Living pin) | Re-verification triggered, the moved document named |
| VF-F07 | A pinned draft's body edited after the pin (trial pin) | Re-verification triggered, finding names recorded hash and hash now |
| VF-F08 | One declarative sentence added under Mission Shape | Binding differs, re-verification, prior approval announced as about to stale |
| VF-F09 | One row appended to the tracked table, nothing else changed | Binding unchanged, "still valid", nothing written |
| VF-F10 | Prior ledger record carries projection id `mc-v17-manifest-projection/1` | New baseline, projection change reported, no comparison across projections |
| VF-F11 | Profile pin line reads a bare `not applicable` with no reason | Fail, field 1 |
| VF-F12 | Trial pin recording the Guide with no content hash | Fail, field 1, names Guide and the missing element |
| VF-F13 | Resolution note removed | Fail, field 1 |
| VF-F14 | `## Summary` section removed, reader line left standing | Fail, field 2 |
| VF-F15 | `## Summary` left as `[TBD]` | Fail, field 2 |
| VF-F16 | Reader line removed | Fail, field 2 |
| VF-F17 | Mission ID changed to `FM` with no deviation record | Fail, field 3 |
| VF-F18 | Mission shape reads `Contained` | Fail, field 4 |
| VF-F19 | Authorities carries `AI-Watcher` in place of Verifier | Fail, field 5, finding states the rename |
| VF-F20 | One person named BO, TO and default AO, no collapse declaration | Fail, field 5, names the roles and the person |
| VF-F21 | Work mode `provisional` on the SPEC row | Fail, field 6 |
| VF-F22 | Tracked row moved gated to iterative since the prior record | Fail, field 6, direction |
| VF-F23 | Approved ARCH in the collection, Modules origin statement missing the asset id | Fail, field 7 |
| VF-F23a | Modules roster reading a bare `N/A` with no reason, on a Mission with no Implementation Plans | Fail, field 7, the missing reason named |
| VF-F24 | Primary Domain set to a value absent from facet #3 | Fail, field 9, names the value |
| VF-F25 | `list_properties` unavailable, primary Domain unverifiable | Unresolved determination, no silent pass |
| VF-F26 | Scope tag `owner:marek` | Fail, field 10, unknown prefix |
| VF-F27 | Neither a `product:` nor a `customer:` tag, and no stated reason | Fail, field 10 |
| VF-F28 | Neither prefix, with the reason stated beside Scope | Warning; the run continues |
| VF-F29 | Two root SPECs listed in the SPEC reference field | Fail, field 11 |
| VF-F30 | Consumes entry `PL-AUTH-001@v1.2 stance: Conformist`, unqualified | Fail, field 12 |
| VF-F31 | Consumes stance `Partner` | Fail, field 12 |
| VF-F32 | Produces entry with tier and no promotion event, on a Standard Capability Move | Fail, field 13 |
| VF-F33 | Product Vision resolves, Advances left `[TBD]` | Fail, field 14 and the Advances gate |
| VF-F34 | Advances cites `PROD-WES-009 § x`, which does not resolve | Fail, field 14 |
| VF-F35 | Revision shape, Supersedes empty | Fail, field 15 |
| VF-F36 | Standard shape, Supersedes naming a closed Mission | Fail, Supersedes exclusivity |
| VF-F37 | Branch policy left `[TBD]` | Fail, field 16 |
| VF-F38 | CI/CD configuration removed | Fail, field 17 |
| VF-F39 | Release target left `[TBD]` | Fail, field 19 |
| VF-F40 | Technology context left `[TBD]` | Fail, field 20 |
| VF-F41 | Governance Process names an asset id that does not resolve | Fail, field 21 |
| VF-F42 | APR naming scheme reads `date-keyed` | Fail, field 22 |
| VF-F43 | APR scheme authority-keyed, tracked table carries `APR-FIXTURE-MISSION-SPEC-002` | Fail, field 22, id conformance |
| VF-F44 | APR naming scheme field removed | Warning, authority-keyed assumed, id check runs against it |
| VF-F45 | Declared-documents table carries a row of Type `RFC` with no open-column declaration | Fail, field 24 |
| VF-F46 | `## Merges Outside an Implementation Plan` retitled `## Merge Log` | Unresolved determination, fallback exclusion recorded, repair owed |
| VF-F47 | `## VF Stamp` and `## Approvals` both retitled beyond the fallback | Fallback binding used, record says a hash is deliberately not recorded |
| VF-F48 | Tracked table's AO column removed | Fail, AO gate |
| VF-F49 | SPEC body declares AO `Anna`, its tracked cell reads `Marek` | Fail, AO gate, names artifact, body value, cell value |
| VF-F50 | MANIFEST row AO cell names someone other than the declared default AO | Fail, AO gate |
| VF-F51 | Ledger exists with no tracked row | Fail, AO gate |
| VF-F52 | Default AO declared as an automated process with no human escalation contact | Fail, AO bifurcation |
| VF-F53 | AI-AO named as the SPEC's AO on an Active Mission | Fail, AO bifurcation |
| VF-F54 | Fleet-run Mission, Execution machinery emptied | Fail, gate names the Execution machinery field, the four parts and the reading by hand it expects |
| VF-F55 | Sanctioned runner declared with a hash and no block version | Fail, gate |
| VF-F56 | Sanctioned runner hash altered by one character, source of record reachable | Fail, gate, declared and computed hashes named |
| VF-F57 | Sanctioned runner hash declared, no source of record named | Unresolved determination |
| VF-F58 | Writing lint claims the launch-holding half with no record cited | Fail, gate |
| VF-F59 | Writing lint path points at a file that does not exist | Fail, gate |
| VF-F60 | Writing lint path on a filesystem this runner cannot reach | Unresolved determination |
| VF-F61 | Launch fingerprinting adopted, refusal-to-resume statement removed | Fail, gate |
| VF-F62 | Merge bar with neither a ruleset name nor the no-ruleset statement | Fail, gate |
| VF-F62a | Merge bar reading a bare `N/A` with no reason | Fail, gate, the missing reason named |
| VF-F63 | Profile pinned `not applicable` while Execution machinery declares a runner | Fail, contradiction named on both sides |
| VF-F64 | Closure condition 4 stripped of its precedence bracket | Fail, closure gate |
| VF-F65 | Closure conditions reordered, sweep before increments, no stated authority | Fail, closure gate |
| VF-F66 | A closure condition reading "the downstream Mission has built against the contract" | Fail, closure gate, repair stated as the PL promotion criterion |
| VF-F67 | A closure condition reading "`MISSION-PLATFORM-001.PL-AUTH-001@v1.2` stands at `stable`" | Pass, tier exemption, never failed |
| VF-F68 | Commissioned measurement condition that does not bind the report at either verdict | Fail, closure gate, names which of the four is absent |
| VF-F69 | Commissioned measurement whose measuring Mission also appears under Consumes | Fail, cross-check |
| VF-F70 | Produces non-empty, the Produces condition removed altogether | Fail, closure gate and Produces-Closure coherence |
| VF-F71 | Produces condition numbered `8.` inside the order | Finding, precedence position on a condition that holds none |
| VF-F72 | SEC declared, no SEC sign-off condition | Fail, closure gate and specialty chain |
| VF-F73 | Commissioned freeze condition missing the amendment-before-freeze rule | Fail, closure gate, names which of the five |
| VF-F74 | Closure condition 5 removed | Fail, the seven members |
| VF-F75 | A closure condition with no authorship statement anywhere in the Manifest | Judgment to the BO; the run continues |
| VF-F76 | Interface shape with an `IP-FIXTURE-MISSION-001` in the collection | Fail, names the stray artifact and both repairs |
| VF-F77 | Interface shape, TP removed from the declared table | Fail, spawning obligations |
| VF-F78 | ARCH listed in the declared-documents table | Finding naming the note; the run continues |
| VF-F79 | Approved ARCH in the collection with no note beside the tracked table | Finding |
| VF-F80 | Tracked Doc name cell carrying a bare name with no asset id | Fail, tracked-table completeness |
| VF-F81 | Approval entry missing its binding | Fail, tracked-table completeness |
| VF-F82 | `APR-FIXTURE-MISSION-BO-SPEC` created in a different collection | Fail, named with the collection it landed in |
| VF-F83 | A tracked row present in the prior ledger record deleted from the table | Fail |
| VF-F84 | Asset title `MANIFEST-FIXTURE-002` | Fail, 5d |
| VF-F86 | Status line moved below the reader line | Fail, 5d, and exclusion 1 recorded as unmatched |
| VF-F87 | An `IR` row written as Type `REPORT` with no open-column declaration | Fail, 5d |
| VF-F88 | Ledger exists with no record of kind `bootstrap` | One bootstrap record appended, carrying the reader line, the AO, the summary, the binding recipe and the projection schema, then this run's record appended |
| VF-F89 | A patch sending `"n": 1` into a ledger already holding seven records | The record lands as `n` 8; the sent value is overwritten by the platform and the skill computes nothing |
| VF-F89a | A patch sending `"verdict": "MAYBE"` | 422 naming `/records/{i}/verdict` and the `enum` constraint with its four allowed values; nothing written; one corrected patch sent |
| VF-F89b | A patch sending `kind` `ruling` with no `authorityWords` | 422 naming `/records/{i}` and the `required` constraint; nothing written; the run stops and reports, and the authority's words stay the authority's |
| VF-F89c | The ledger schema asset unreadable in this corpus under this PAT | STOP with no write; the unreachable asset id and the grant that repairs it reported; no ledger created and no schema inlined |
| VF-F89d | An append whose response is lost | Tail read by pointer settles it; retry only where the record is absent; a duplicate leaves both records in place with an erratum |
| VF-F89e | A v1.7 collection whose `VF-{SCOPE}-001` is a markdown asset | STOP with no write; reported as a ledger predating the typed schema, converting it a recorded act with its own authority |
| VF-F90 | A run that fails any check | No stamp, no status-line edit, ledger record written |
| VF-F91 | A run that passes with an approval bound to a prior binding | Header reads Verified, that approval marked Stale in the Approvals section and in the tracked table |
| VF-F92 | A run that passes with an approval bound to the current binding | Header carries that approval's decision |
| VF-F93 | Two collections titled `Mission Fixture Mission`, one pinned v1.6 | Stop and ask, both candidates listed with id and pin |
| VF-F94 | `bash_tool` unavailable | Fallback binding, record says a hash is deliberately not recorded |
| VF-F95 | The collection census unreadable | Unresolved determination naming the three checks it blocks |
| VF-F96 | A trial-pinned Manifest rendered from a template that names no `status_provenance` key | Fail, field 1, naming each pinned document and the missing element. This is the shape `mc-cre-mission-v17` shipped through 0.1.5, and `core/harness/mc17.test.js`, which stands in the plugin's source repository and in no installed package, carries it as three `round trip:` cases so the template and this checklist cannot drift apart again. |
| VF-F97 | A tracked row of Type `WAVE-PLAN` in a Manifest that declares no open Type column | Passes the naming check: WAVE-PLAN stands in the Definition's TYPE list since DECISION-WAVE-PLAN-MC17-001 (2026-08-19). Watched against the pre-ruling code, where the same row failed as an unlisted type. |
| VF-F98 | An ARCH verified with no SPEC verification record in the ledger | mc-vf-arch-v17 returns BLOCKED, records it, stamps nothing. |
| VF-F99 | An approval attempted on an ARCH whose binding moved since its last PASS verification | mc-apr-arch-v17 refuses, names both figures and the re-run. |
| VF-F100 | An IP approval attempted by the TO on an IP claiming customer-facing | mc-apr-ip-v17 Step 0 refuses via mc17 radius, naming the BO floor. Watched failing in code with the floor comparison inverted. |
| VF-F101 | An IP whose Ordering claim cell reads "should probably merge first" | mc-vf-ip-v17 fails the row: the wave skills parse two claims exactly, and any other wording is an ordering nobody will honour. |
| VF-F102 | A wave plan whose order puts a dependent IP ahead of the sibling it declares it merges after | mc-vf-wave-v17 fails on the wavecheck problem, which names the edge, its source and both positions. Watched failing in code with the comparison inverted. |
| VF-F103 | A wave plan whose status line names a ruling record that is absent, another kind, or missing a labelled ruling | Fail naming the element; an unruled plan instead verifies structurally and is recorded as binding nothing. |
| VF-F104 | A wave script whose openWave names no wavePlanAsset | Refused at launch, before any agent runs, with Profile 4.5 cited; the literal `none` is the lawful declaration for a single IP landing with no plan. Watched failing with the requirement dropped from the runner. |
| VF-F105 | An ARCH or IP whose author filled every section, checked with mc17 fields | Every filled row reads present; no row warns on the template's own guidance prose. Found live by Seventeen-15, watched failing against the 0.1.12 templates. |
| VF-F106 | A governed body carrying one em dash, posted on any gated route | Refused, with the dash named. Before 0.1.14 the hook allowed it unread (the rule label's space never parsed) and the fail-open note reached nobody; both watched failing against 0.1.13. |
| VF-F107 | An ARCH ordering constraint written in module vocabulary over a wave of IP ids | Binds: the endpoints join through each member IP's Module field, and a violating order fails naming the join. Before 0.1.14 the edge fell out of the wave and bound nothing. |
| VF-F108 | A tracked IP row at Status Landed with no tracked IR row naming it | Fail naming the IP and the wanted id prefix; mc17 check reports the join. Seventeen-16's D-16-8: failure forced its records, success produced no prompt, and the report fell through on exactly the successful path. Watched failing with the state-word filter inverted. |
| VF-F109 | A Manifest naming a GitHub repository whose merge bar declares no-ruleset without the gh read as evidence | The creation interview reads the ruleset, never asks it; a declaration with no read behind it is Seventeen-16's D-16-7. |
| VF-F110 | A land returning a bypass authorization whose words name the wave, or name no pull request | The runner refuses it at the land citing Profile 5.2, and the refused land is no landed merge. Watched failing with the hook disabled. IP-MC17-001. |
| VF-F111 | A SPEC whose acceptance criteria carry no AC-n identifiers | mc-vf-spec-v17 fails row 3, and mc-vf-tp-v17 routes the same finding back to the SPEC, because the traceability join reads identifiers and nothing else. |
| VF-F112 | A TP with a criterion no case covers, or a case tracing to no criterion | mc17 tptrace names both directions; watched failing with uncovered-detection dropped and with the vacuous-pass guard removed. |
| VF-F113 | A closure attempted with no Move Acceptance record, a failed one, or one at a stale binding | mc-close-mission-v17 refuses naming mc-vf-move-v17 as the way back. |
| VF-F114 | A lawful IR id, IR-{SCOPE}-IP-{n}-{seq}, run through the naming check | Passes; the two-segment regex that failed every real IR id is gone, and the pin is the law's own example IR-KL-INB-IP-017-002. Found live by Seventeen-16's closure run against five ledger records. |
| VF-F115 | Profile pinned, Execution machinery reading `Not applicable: this Mission's waves run by hand.` | Pass, the gate owes no part, and the record names the Mission as run by hand |
| VF-F116 | A Manifest that pins the Profile and never declared machinery, its Execution machinery field empty | Fail, gate names the Execution machinery field and the reading it expects: `not applicable, this Mission's waves run by hand` for waves run by hand, or the four parts for the fleet |
| VF-F117 | Profile pinned, Execution machinery reading a whole-value `[TBD]` | Fail, the finding of VF-F116 |
| VF-F118 | Profile pinned, Execution machinery reading a bare `not applicable` | Fail, gate names the Execution machinery field and the reading it expects, by hand or the four parts |
| VF-F119 | Profile pinned, Execution machinery reading `not applicable, this Mission's work is performed by people` | Fail, gate names the pinned Profile and the people's reason, the two things the Manifest states, and the reading it expects, by hand or the four parts |


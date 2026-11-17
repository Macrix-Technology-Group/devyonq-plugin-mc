---
name: mc-cre-mission-v17
description: "Bootstrap a new Mission natively in CanonQ under Mission Control v1.7: the Mission collection (mc17 collection create) and its artifacts (mc17 create): the v1.7 Manifest with its three-line Methodology Reference and resolution note, authorities, work modes, modules, domains, scope, tracked tables and numbered closure conditions; the root SPEC, the TP stub and any activated specialty stubs, each naming its reader with a Summary. Step 0 pins Mission Control v1.7 as three documents at one version, Living or a declared trial, each by asset, content hash and read date, and refuses a v1.6 document. Triggers on \"create mission v17\", \"mc-cre-mission-v17\", \"v1.7 mission\", \"new mission under 1.7\". Input: {mission_name}."
---

# mc-cre-mission-v17

Read this file to the end before acting. One read returns a fraction of it and can stop mid-file with nothing saying so, and a runner acting on the first page begins an interview whose later questions it has yet to read. Take the length from `wc -l` and page the remainder with `sed -n` before Step 0.

Bootstrap a Mission under Mission Control v1.7, natively in CanonQ. This is the entry point of the verify-and-approve chain: after this runs, the authorities decide the fields the interview deferred, and `mc-vf-manifest-v17` begins verification.

## Parameters

- **?** - Display skill version, Mission Control version, and the parameter list. Example: `mc-cre-mission-v17 ?`
- **mission_name** (required) - The human-readable Mission name, for example `Kaufland ERP`. There is no parent page: CanonQ collections are flat.

When invoked with `?`, respond with:

```
mc-cre-mission-v17 v0.2.0 (MC 1.7 · CanonQ-native)
Parameters:
  ?              Show this info
  mission_name   Mission name. Required.
Installed siblings in this line: mc-vf-manifest-v17, at
  devyonq-mc/skills/mc-vf-manifest-v17/SKILL.md. Where the host exposes no
  skill by that name, invoke it by that path, the way this skill was invoked.
```

Stop after displaying it. Run no creation.

**Requirements:** the client `mc17` named below, signed in once with `mc17 login` in a terminal of the person's own, plus `bash_tool` and `node`, which the mechanical half named below runs on. `mc-vf-manifest-v17`'s first run needs `mc17 upload` besides, which this skill never runs and the `upload` right gates. The `system` identity cannot own collections. The runner needs the `create-collection` and `upload` rights. **Step 0.2's searches prove the session reaches the corpus, and they prove nothing about writing.** The `create-collection` right surfaces at Step 5 and the `upload` right at Step 6, one call after the collection exists, at `mc17 create`, so a run holding neither one loses the whole interview it has already conducted. Step 0.5 names both rights in the pin statement, ahead of the first question.

**Which corpus.** Every read and write of this skill goes through `mc17`, and the engine reaches CanonQ through the connection DevyonQ resolves for the signed-in tenant. **The Mission's corpus is the one the signed-in tenant reaches, and the pinned methodology documents are resolved from it at Step 0.** The collection, every artifact, the ledger and every later `mc-*-v17` call run against that one corpus. Name the corpus in the Step 0 pin statement, write it into the Manifest's Methodology Reference, and repeat it in the Step 11 report. A Mission whose pin and whose artifacts live in different corpora cannot be verified, because the verifier re-reads the pinned documents.

Three rules settle which corpus that is.

- **The sign-in settles it.** The person signs in once with `mc17 login` in a terminal of their own, and every command uses that session. Where `mc17` reports no sign-in, stop and tell the person to run `mc17 login` themself. Where 0.2's searches find no complete v1.7 set in the corpus the tenant reaches, say so and stop.
- **A Mission collection made under a person's own CanonQ token stays on the old plugin** (Mission MC-SERVER, record 106), and no act of this line runs against it.
- **One canonical form.** Write the corpus as `{gateway} ({tenant})`, the gateway and the tenant of the session `mc17 login` keeps, as `mc17 version` prints them, both parts, every time it is written. `mc-vf-manifest-v17` reads the corpus line back in that form. That two-part form names the Mission's corpus.

## The mechanical half of this skill is a program

**Every pure function this skill once wrote out as a recipe now lives in code, and the code is the authority on what it computes.** That code is one program:

```
mc17
```

`mc17` is the launcher `client/mc17` two levels above this skill's folder, from a POSIX shell, Git Bash included, and `client/mc17.cmd` from PowerShell or cmd. `client/` is the folder this plugin ships beside its `skills/` folder. Resolve it from this file's own location and never from the runner's working directory. The path resolves on every host and wherever the plugin was installed, and it rests on no variable the host sets in the agent's shell.

**A runner that hand-executes what the program does has produced a figure nobody can check.** That is the Business Owner's ruling of 2026-08-18, and it was earned: the sanctioned-block hash was once verified against a recipe transcribed into prose, the transcription used `grep -v '^#'` which drops nothing from a JavaScript runner, and the declaration and the check drifted together, so the check certified the drift and the verification passed. No recipe for any of these acts is written in this file, and none is to be reconstructed.

**Where the program will not run**, say which figure could not be computed and stop. Report the failure plainly, name the act that was owed it, and write no hand-computed substitute. A substitute presented as equivalent is the exact fault the ruling closed.

**The program reports; this skill judges.** Nothing in `mc17` decides a Pass, a Fail or a Warning. What makes a state a failure is written in this file, at the step that owns it, and stays written there.

## Which line a Mission belongs to

Mission Control v1.6 and Mission Control v1.7 are two complete systems running side by side. A Mission belongs to one line for its lifetime.

- A Mission created by this skill pins v1.7 and is served by the `mc-*-v17` family.
- A Mission pinned to v1.6 is served by the `mc-*-v2` family. This skill never touches it, never verifies it, and never re-pins it.
- Moving a Mission from v1.6 to v1.7 is a BO and TO migration decision recorded as a Manifest change, which re-verifies the chain top-down. It is not an act of this skill.
- A line closes to new Missions only when the Business Owner retires it, moving its documents to Superseded. Until then both creation routes stand open, side by side (DECISION-COEXISTENCE-MC17-001).

**What the v1.6 creation route does.** `mc-cre-mission-v2` pins Mission Control v1.6 by name and creates a v1.6 Mission while the v1.6 documents stand Living, whatever newer Living lines stand beside them: methodology lines coexist by the Business Owner's ruling (DECISION-COEXISTENCE-MC17-001), and a new Mission's line is the operator's declaration, made by invoking that line's creation route. It refuses where the v1.6 documents are retired, Superseded or Archived, because a retired line takes no new Missions. The verification-side route was always line-safe: `mc-vf-manifest-v2` gates on the Manifest's own pin, wherever the corpus stands.

---

## Step 0 - Resolve and pin Mission Control v1.7
**Which copy of this plugin is running, before anything rests on it.** `mc17 version` names the plugin, its version and the root it resolved, and on Claude Code the value of `CLAUDE_PLUGIN_ROOT`, which that host sets to the installed plugin's own directory. **The cache directory's name is evidence of nothing**: Claude Code names it from the version present at first install and never renames it on update, so a directory reading `0.1.0` routinely holds a later version. The manifest beside the harness is what is running. Mission Seventeen-13 spent the longest part of its Step 0 on that question with no command that answered it.


This step runs before everything else: before parsing the argument, before the collision check, before any prompt. **It asks nothing.** It resolves, hashes, and states the pin. The one question the pin needs, the trial declaration, is asked at Step 4.0, after the collision check, so a Mission that collides costs the operator nothing.

### 0.1 What is pinned

Mission Control v1.7 is four things: the Guide, the Definition, the Agent-Fleet Execution Profile, and the orchestration harness. A Mission pins the three documents and declares the harness in its Execution machinery field.

The Methodology Reference therefore carries **three pin lines**:

1. Mission Control Guide v1.7
2. Mission - Definition v1.7
3. Agent-Fleet Execution Profile v1.7

The three carry one version number and are adopted in one act. A Mission pinned to v1.7 is pinned to all three at v1.7.

A Mission whose work people perform writes `not applicable` on the third line with a one-line reason. A Mission whose AI agents perform its work pins the Profile, whether it runs its waves with the fleet or by hand. Step 0 resolves all three regardless, so the reason is a declaration and not a failure to find the document. Which of the three the Mission is settles at Step 4f, and the third line is written at Step 6.

The Mission Default Governance Process is **not** one of the pinned three. It is a separate process definition, referenced by the Governance Process field. Resolve it here as well, by title, and record its asset id for Step 6. Where it does not resolve, write the field with the process named and the note that no asset for it was found in this corpus, and carry the miss into the Step 11 warnings. **Record the resolved asset's Status beside its title and its id.** Where that Status reads anything other than `Living`, write it into the Governance Process field and carry it to Step 11 as a warning that this Mission references a governance process which is itself unpublished. It resolves today as a Draft, so this is the ordinary outcome and not an exotic one.

**What a Status means, for a pin line and for the Governance Process field alike.** `mc17 status {asset id}` returns the value and its source; this step judges the value. **Where that source is the lifecycle facet, the value is in another vocabulary.** That set is the platform's own, `draft`, `in-review`, `current`, `superseded` and `archived`, and it holds no `Living` at all, so it bars a candidate and never confirms one. `superseded` or `archived` bars the candidate under 0.2; `draft` is a Draft for 0.3's trial path; `current` or `in-review` settles nothing about publication, so it is written as the document gives it and carried to Step 11 as a Status read from the facet alone. Write the value in the document's own casing, and record beside it which of the three sources it came from.

### 0.2 Resolve, the Living path

Search the CanonQ corpus (`mc17 read search --q "<text>"`, then a second search in other words if the first returns nothing) for the Mission Definition, the Mission Control Guide, and the Agent-Fleet Execution Profile.

**What counts as a pin candidate.** A pin candidate is a document that IS the versioned document: its own title and its version line name the document and its version, and it stands as the whole document. A change proposal, an amendment, an update package or a patch written against a base version is no pin candidate, however precisely it targets v1.7. Record such a document as a rejected candidate with the reason `change proposal against v{base}`. **Another Mission's Manifest is no pin candidate either, and its snippet is not evidence.** A search for these documents answers today with the Manifests of earlier Missions, whose snippets print the pin asset ids, the content hashes, the read dates and the rejected candidates in full; that is each Mission's record of its own resolution and it is 0.4's forbidden source arriving first. **The snippet is already on your screen when you read the result, so the rule is about what you carry out of it, never about what you saw.** Carry no id, no hash, no read date and no rejected title from a snippet into this Mission's record. Every hash this step records is computed at 0.3 over bytes this run fetched, and a figure that arrives any other way is discarded even where it would have been right. This follows the reading recorded below under *A reading this skill records*: v1.7 ships an amendment as a superseding version, so a document written against a base version is a proposal for the next version and is never the pinned one.

- Judge each candidate by the Status the tool returns. A document whose Status reads `Deprecated`, the legacy spelling `Depreciated`, `Superseded`, or `Archived` is not a valid pin target. **The Status written onto the pin line is the value the tool returned, in the document's own casing, with its source named beside it.**
- Follow `Supersedes` references to the newest version.
- Where several candidates carry the same document identity at the same status, take the highest version number. That is a tiebreaker, and it resolves. **The tiebreaker applies on the trial path too**, so two drafts of one document resolve to the higher version by the same arithmetic.
- All three documents must resolve to **the same version number**. A Guide at one version beside a Definition at another is version drift, and this skill stops there. A straddle is never pinned.

Outcomes:

- **All three resolve Living at v1.7:** pin them as Living. The trial-pin language of 0.3 is not written, and Step 4.0 is not asked. Proceed to 0.5.
- **All three resolve at v1.7 but their statuses are mixed, some Living and some Draft:** STOP. A trial pin stands on drafts, and a set that is part Living is a straddle of the same kind this step already refuses across version numbers. Name which document is Living and which are drafts, and say that the set is pinnable once the remainder is published Living, or once the Living one is not the pin target.
- **All three resolve Draft at v1.7:** proceed to 0.3.
- **A Living set at a version higher than 1.7 stands in the corpus:** that is another line, running beside this one. Methodology lines coexist and the operator declared this Mission's line by invoking this skill (DECISION-COEXISTENCE-MC17-001), so note the newer line in the resolution note and pin v1.7 the way every outcome above does. STOP only where the v1.7 documents themselves read Superseded or Archived: that is this line retired, and a retired line takes no new Missions.
- **The newest resolvable set is v1.6 or lower:** proceed to 0.4.

- **A Living document at a lower version stands beside the set:** reject it by version and record it in the resolution note. **The pin resolves by version first, and by status only among candidates at that version.** A predecessor left Living is a predecessor, and it makes no straddle: a straddle is the three pinned documents standing at versions that differ from each other. **The rejection rests on the version, so the candidate's body is not read.** Record it in the resolution note by title, version and asset id, and name it there as a predecessor left standing in the corpus, which is the open question for the Business Owner. **Its status is not recorded**, because it lives in the body this rule does not read.
- **The Guide and the Definition resolve at one version and only the Profile is missing:** do not stop here. State plainly that the Profile could not be found in this corpus, carry the miss to Step 4f, and take the answer there. On a people-run Mission, write the third pin line as `not applicable` with the reason plus the note that the document was not found in this corpus. On a Mission whose AI agents perform its work, fleet-run or run by hand, STOP: a Mission that works under the Profile cannot pin a Profile that does not resolve, and nothing has been created.

**Record every rejected candidate as it is rejected**, with its title, its version, and its asset id where the search returned one. Where the id is out of reach, the title and the version are the admitted minimum. This step is the one place that fact is established: 0.5's pin statement and the Manifest's resolution note both read from this record, `mc-vf-manifest-v17` check 1 reads the note and points back here, and the note is written once and read afterwards.

**Two assets answering to one pin line.** Where two assets both answer to one pin line at the pinned version, whatever their titles read, record both by title and asset id and put the choice to the operator. Never settle it by reading which one calls itself a copy of the other: that is a body read, and the pin resolves without one. Below the pinned version the question does not arise, because both are rejected by version.

### 0.3 Resolve, the trial path

The v1.7 documents read Living. The Definition admits a trial of drafts: a Mission may pin a methodology version whose documents are still drafts, where it declares itself a trial of those drafts. This path stands for a line whose documents are drafts, and a Mission under v1.7 does not take it.

1. **Find the drafts.** Search the corpus for the v1.7 documents by title and by content. At the time of writing they live in the `Mission Control` collection, beside their v1.6 predecessors, as `Mission Control Guide v1.7`, `Mission - Definition v1.7` and `Agent-Fleet Execution Profile v1.7`. Resolve each by search, never from a remembered id, and report the ids actually found. **A drafting copy of each also stands in the `Mission MC17` collection under a `DRAFT-` title, archived and kept for provenance.** Those are no pin target: 0.2 rejects an archived candidate, and each says so in its own status line and names the document of record. Where a search answers with both, the one in `Mission Control` is the document.
2. **Confirm each is v1.7 and is a draft.** Read each document's version line and Status line with `mc17 read document --id {asset id}`. **The only admitted status on this path is `Draft`.** A Living document is not a trial-pin target: 0.2 has already stopped on a mixed set, and a status that is neither Draft nor Living is not a pin target at all.
3. **Hash each document.** The hash is the tool's, and it is the same figure `mc-vf-manifest-v17` recomputes, because both skills call the one implementation:

   ```bash
   mc17 hash {asset id}
   ```

   **The envelope trap, which is why a hand-run hash is worthless here.** For every asset born through the creation route, CanonQ returns `content` as the JSON object `{"markdown": "..."}`. A figure taken over that envelope is 64 hex characters, it looks exactly like a correct hash, and nothing downstream catches it: every later verification computes the body's real hash, disagrees, and shows a reader no reason why. The tool unwraps the envelope, and a self-check reading `FAILED` means the bytes were the envelope.

   **Where the tool will not run**, the hash cannot be computed: STOP, and say which asset the figure was owed for. A trial pin whose documents are identified by a figure nobody can reproduce records nothing a later reader can test.

   **The corpus-identity act, run on the first pinned asset before any hash is trusted.** The search found the asset by its title, and a title in a search result says nothing about which store the engine's read of that id reaches:

   ```bash
   mc17 identity {asset id} --expect-title "{the title the search returned for that id}"
   ```

   `EQUAL` means one corpus. `NOT EQUAL`, a 404 or a 403 means the read reaches another store: STOP, create nothing, and say the pin resolved in one store while the read answers in another. Carry the proof into the 0.5 pin statement, naming the asset id, the matched title, and the gateway and tenant `mc17 version` prints.

   **Read the Status** with `mc17 status {asset id}` and record both the value and the source it names. `NOT FOUND in any of the three sources` is a Status this step could not read, and 0.1 and 0.2 say what that costs a candidate.
4. **Read the date.** Record the date each document was read, from the clock at the moment of reading. Never estimate it.
5. **Hold the trial declaration for Step 4.0.** Nothing is asked here.

### 0.4 Refusals

- **This skill refuses to pin a v1.6 document, by name or by resolution.** A Mission pinned to v1.6 belongs to the `mc-*-v2` family, which implements v1.6 correctly and stays installed. Route to `mc-cre-mission-v2` **with the condition stated**: that skill creates a v1.6 Mission while the newest Living methodology set in this corpus is v1.6, and refuses once v1.7 is Living. Where v1.7 is already Living, say that no installed skill creates a v1.6 Mission.
- **A Living pin never resolves to a draft.** Where the three documents resolve Living at v1.7, the drafts in the corpus are ignored entirely.
- **The three documents are pinned at one version or not at all.** A partial set stops the run, with the one branch 0.2 names for a missing Profile on a people-run Mission.
- **A mixed-status set is not pinnable.** 0.2 states the stop.
- **Never derive the pin from an example Mission, a test Mission, or another Mission's Manifest.**
- **Never insert a placeholder pin.** Where Step 0 cannot resolve, the skill has already stopped and has created nothing.

### 0.5 State the pin, then hold it

Before any scaffolding, state the resolution in full:

```
Pinning this Mission to Mission Control v1.7.
Corpus: {gateway} ({tenant}), as mc17 version prints them.
The engine's read reaches that same corpus, proven at 0.3: asset {asset id} came back
titled {title}, the title the search returned for it.

- Guide:      {title} ({asset id}) - Status {as the document states it} - {hash} - read {date}
- Definition: {title} ({asset id}) - Status {as the document states it} - {hash} - read {date}
- Profile:    {title} ({asset id}) - Status {as the document states it} - {hash} - read {date}
- Governance Process (referenced, not pinned): {title} ({asset id} | not found in this corpus) - Status {as the document states it}

Rights, read from GET /api/me by the probe below and printed here: create-collection
{true|false}, upload {true|false}. Step 5 needs the first; Step 6 and the verifier's first run
need the second. {Where the probe cannot run: unconfirmed.}

{On the trial path:} These three are drafts. The trial declaration is put to you after the
collision check, and nothing is created before you make it.

Resolution note:
- Resolved as {Living|drafts}: the three documents above, all at v1.7.
- Rejected: {the older pair or set, by title and version, with the reason: superseded by v1.7}.
- In-place amendments carried by this version: those the Amendments table at the end of each pinned document lists up to the read date above; each row names the date its amendment binds from, and a later verification re-reads the pin lines and this note.
```

**The rights probe, run before the block above is printed**, so the Rights line is filled by one call and asks the operator nothing:

```bash
mc17 rights
```

Where the probe cannot run, there is no substitute for it: print the unconfirmed variant of the line, name the act that surfaces each right, which is Step 5 for `create-collection` and Step 6 for `upload`, and carry the unconfirmed state to Step 11. Never write a rights value the probe did not return.

The pin holds for the lifetime of the Mission. It is read afterwards and never re-resolved.

---

## Procedure

### Step 1 - Parse the argument

The whole argument is the Mission name, taken as given, spaces and punctuation included.

- Empty argument: ask for the name and stop.
- The argument contains a `/` (the v1 habit `parent_page/mission_name`): ask whether everything after the slash is the intended name. Do not guess.

### Step 2 - Derive the SCOPE code

This step asks nothing. The operator's say on the Mission ID comes at Step 3, once the collision check has cleared, so a Mission that already exists costs the operator no time.

```bash
mc17 scope "{mission_name}"
```

The tool's answer is the SCOPE, and no second reading of the name is taken. Hold it and say nothing about it yet.
### Step 3 - Collision check, then put the ID to the operator

**The check comes first, and it is silent.** Run `mc17 read search --q "MANIFEST-{SCOPE}-001"` and look for an exact title match. The search answers at a cap, and a check that reads a capped answer as a clear result has checked nothing.

**The search is a candidate generator. The exact title comparison is the decision.** `mc17 read search` is full text and scores on token overlap, so a query for one id-shaped title may answer with a sibling's beside it at the same relevance, and on another day may return neither. The tokenizer's behaviour on these titles is not a thing to plan around. Relevance orders the candidates and settles nothing, and a return holding no sibling is no more a clear check than a return holding several. Read the title of every hit and compare it to the wanted title character for character; the hit that is equal is the collision, and no other hit is. The top-ranked hit is never a fallback. **Where the returned hit count equals the cap the search answered at, the check is inconclusive**, because a real collision ranked below the cap reads exactly like a clear check and two Missions then share every artifact id: narrow the query, re-run it, and say in the Step 11 report that the check was narrowed and on what. **`mc17 read collections` is no fallback here.** On a real corpus it returns every collection the caller can reach, which on the estate today is 376 collections and about 85,000 characters, over the tool output limit.

On a hit, stop and report the collision before any side effect and before the first question. Ask whether to pick a different name or abort.

A collection already titled `Mission {mission_name}` is lawful and passes here. Mission names are not unique, because methodology versions coexist, and the sibling skill resolves a duplicate collection by id.

**With the check clear, state the derived SCOPE and ask, in one line, because the override is otherwise unreachable:**

> **Mission ID:** the derivation gives `{SCOPE}`, and every artifact id is built on it. Does it stand? (Enter to accept, or give the ID you want.)

Wait. On acceptance, the derived SCOPE stands and nothing is recorded. On a departure, ask one further line:

> **Which authority outranks the derivation for `{chosen ID}`?** (A name. A deviation with no authority behind it is not recorded, and the derived SCOPE stands.)

Wait. Record the chosen ID and the named authority beside Identity in the Manifest.

**A chosen ID gets its own collision check.** Re-run `mc17 read search --q "MANIFEST-{chosen ID}-001"`, apply the same inconclusive test, and stop on a hit the same way. The check that cleared covers the derived SCOPE alone.

### Step 4 - The interview

Ask each question on its own, and wait. Each question is answerable in one line.

Nothing here is copied from another Mission. Identity, shape, Scope tags, Consumes, Produces, Advances, specialty declarations and closure conditions are derived fresh for this Mission.

#### 4.0 The trial declaration

Ask this only where Step 0 took the trial path. It is the first question of the interview, because the collision check has now cleared and the pin is the first thing the Mission declares about itself.

> This Mission would pin Mission Control v1.7, whose three documents are still **drafts**:
> - {Guide title} ({asset id}), Status Draft, {hash}
> - {Definition title} ({asset id}), Status Draft, {hash}
> - {Profile title} ({asset id}), Status Draft, {hash}
>
> Pinning drafts makes this Mission a **trial** of them: its conclusions carry no force outside itself while the pin stands on drafts, and it leaves that state either by re-pinning to the adopted version once the documents are Living, or by closing as a trial whose findings feed the adoption act.
>
> Declare this Mission a trial of the v1.7 drafts? (yes / no)

Wait. On `no`, STOP without creating anything, and say that a Mission that will not declare itself a trial cannot pin drafts.

#### 4a. Mission shape

> **Mission shape for {mission_name}:** which of the four?
>
> - **Standard** - the default. A User Move, or a Capability Move shipping a single Published Language.
> - **Interface** - ships one or more Published Languages and nothing else. No ARCH, no Implementation Plans.
> - **Revision** - inherits and revises a closed Mission's artifacts.
> - **Platform** - ships several Published Languages forming one foundation; its Registry is the primary deliverable.
>
> (Default: Standard)

Wait. Record the answer.

The vocabulary is closed at four. v1.7 names Standard, Interface, Revision and Platform, and no other shape. **Contained is not offered, because v1.7 does not define it.** Where the operator names a shape outside the four, say that plainly and ask again from the four.

Consequences to record:

- **Interface:** Modules, ARCH and Implementation Plans are not applicable. The Manifest states that creation and verification of an ARCH or an IP inside this Mission are refused. `Produces` is required. The Test Plan is still owed: the Interface override removes the IP phase and the ARCH, and nothing else.
- **Revision:** Supersedes is asked at 4h and is required.
- **Platform:** `Produces` is required, and the Registry is the primary deliverable.

#### 4b. Specialties and specialist authorities

This runs before the work-mode question, because the work-mode question enumerates the artifact classes and the specialties are part of that list.

> **Specialty documents.** Does this Mission activate any? (yes / no)

Wait. On `no`, record none and go to 4c. On `yes`, ask the second question:

> **Which ones?** Any combination of **SEC** (Security Spec), **DAT** (Data Spec), **OPS** (Operations Spec), **CMP** (Compliance Spec).

**Two questions on purpose, and this is the reason.** The vocabulary here is five wide: four specialties and `none`. A host offering a multiple-choice prompt commonly caps it at four, and a runner that meets that cap drops one option to fit. Two runs dropped **CMP**, Seventeen-13 and Seventeen-14, each recording it as an instruction it could not carry, and each time the answer happened to be `none` so nothing was lost. A Mission needing a Compliance Spec could not have said so. Splitting the question puts four values under each prompt and needs no cap-dependent judgment from the runner.

Where the host imposes no such cap, asking it as one question is lawful and the vocabulary is unchanged. What is never lawful is narrowing the vocabulary to fit a prompt.

Wait. For each activated specialty, ask its authority. Where several are activated, ask them in one message.

> **Specialist authorities:** {SO for SEC} / {DO for DAT} / {OO for OPS} / {CO for CMP}: who? (or `TBD`)

Wait. Record them. Each activated specialty produces three things downstream, and the scaffold writes all three: a stub spawned by the root SPEC, the specialist authority in the Authorities field, and that document's sign-off as a numbered closure condition.

#### 4c. Authorities

**First, the DevyonQ project.** DevyonQ records each Mission on one of its projects, and its team says who may hold each role. List the projects on which the person may record this Mission:

```bash
mc17 mission projects
```

Put the list to the person and ask which project this Mission belongs to. Offer no default, since the project is the person's choice. Record the answer as `project_id`. Then read who on that project's team may hold each role, and the Factories the project links:

```bash
mc17 mission projects --project {project_id} --json
```

The answer holds `roles`, each member with the `manifestForm` the Manifest's Authorities line takes, `Display Name (address)`; `caller`, which says whether the person is the project's Project Manager; and `factories`. Where the project links more than one Factory, ask the person at which one the Mission stands, and record it as `factory_id`.

**Each authority question below offers that project's people for its role**, each with the name and email address the command prints. Where one person alone may hold the role, offer that person as the default. Where several may, list them and offer none as the default. Where the person answers with a name off the list, or `TBD`, record it as given and say that `mc17 mission register` will refuse the Mission in DevyonQ until that role is held by someone on the project's team. Write the authority into the Manifest in its `manifestForm`, since `mc17 mission register` matches that form: an email address exactly, else the display name. Where the command says the person is not the project's Project Manager, DevyonQ records the Mission only with the person as its Business Owner: offer the person as the BO, and where they name someone else, say that the project's Project Manager must then run `mc17 mission register`.

Where the list of projects is empty, or the person names no project, say that this Mission will be created in CanonQ alone, record no `project_id`, and ask the authority questions with no defaults.


Ask one at a time.

> **Authorities (1 of 5) - BO (Business Owner):** who? (A name, or `TBD` to defer.)

> **Authorities (2 of 5) - TO (Technical Owner):** who?

> **Authorities (3 of 5) - MO (Module Owner):** who? (Optional. `TBD` defers it. A Mission that produces no ARCH adopts no module roster, so on such a Mission the deferral is permanent and Manifest verification passes it with a finding.)

> **Authorities (4 of 5) - default AO (Artifact Owner):** who stewards an artifact that names no owner of its own? (Default: the TO, "{TO}".) **Is that a named person, or an automated stewardship process?** An artifact whose steward differs names its own AO, and the tracked table carries it.

Wait. Where the answer is an automated stewardship process, that is an **AI-AO**, and two things follow. Ask the first and state the second:

> **The AI-AO's named human escalation contact:** who? (An AI-AO is declared with one, and a Manifest that declares an AI-AO without it fails verification.)
>
> Note before you answer: an AI-AO may not steward an internal artifact of an Active Mission, which is the SPEC, the ARCH, an IP and the TP, and may not steward an artifact on a Published Language at `frozen`. This run creates a SPEC and a TP. If the default AO is an AI, those two need a human AO of their own, and the cleaner answer is usually a human default AO.

Wait. Where the operator keeps the AI-AO as the default, ask for the human AO the SPEC and the TP will carry, and record it in the answer set as `human_ao`, `spec_ao` and `tp_ao`.

**Capture the default AO as one string, and write that one string in both places.** Take the operator's answer verbatim, echo it back as the AO string, and write it unchanged into the Manifest's Authorities field and into every AO cell of the tracked documents table. The AO gate compares those two as text, so one steward written two ways fails it: Mission Seventeen-1 carried `the mc-*-v17 skill suite acting as steward` in Authorities and `the mc-*-v17 skill suite (AI-AO)` in the table, which a reader passes and the gate refuses. The kind, a human AO or an AI-AO with its escalation contact, is recorded beside the string and stays out of the string itself.

> **Authorities (5 of 5) - the Verifier:** which verification process attests for this Mission? (Default: the `mc-vf-*-v17` skill suite, an AI-Verifier.)

Wait. On the Verifier question, use the role name **Verifier**. The role is named for what it does. The prefix `AI-` marks an instance an AI fills where the contrast matters, which is why an automated verification process is an AI-Verifier and a human filling the same role is not. Through v1.6 this role was called AI-Watcher; a v1.7 Manifest does not carry that name.

An answer left `TBD` is written verbatim. The Authorities field binds at the point of action: an approval for a role the Manifest names no authority for is refused, and the refusal names the empty field. Say so when the operator defers one.

Echo the authorities back before moving on.

#### 4d. Collapsed authorities

Run this only where the same name appears in two or more of BO, TO, MO and the default AO. The trigger is structural, so read it off the answers.

> **{Name} holds {roles}.** The Manifest declares that collapse as a ruling on its face. Two things are needed:
>
> - the **compensating control** that stands in for the approval chain's second pair of eyes. Where this Mission runs agent fleets, the adversarial review gate is one candidate to pick or refuse;
> - the **condition under which the collapse ends**. Candidates to pick or refuse: a second named authority joins the Mission; the Mission closes; an external reviewer is appointed for the artifact class.
>
> Neither has a default and neither is mine to write. Either one you leave empty is written `[TBD]`, and a declared collapse carrying `[TBD]` in either place fails Manifest verification on field 5.

**Neither answer is derived**, and the candidates are offered as choices to pick or refuse. Where the operator gives one or neither, write `[TBD]` for what he did not give and name that field in the Step 11 report.

Wait. Record both. A collapse ruled as a time-saving simplification is recorded as one, so it is never read later as the Mission's permanent shape.

#### 4e. Work mode per artifact class

**One line first, because four later fields read from it.** 4e, the Modules field, closure condition 1 and the root SPEC's ARCH References all write the same answer, and no other question asks for it.

> **Does this Mission ship code?** (yes / no)

Wait. Do not ask it on an Interface Mission: that shape has answered it already and ships none. On `no`, ARCH and IP produce no artifact, and `this Mission ships no code` is the reason written into the Work Modes omission note, the Modules field, closure condition 1 and the SPEC's ARCH References, in those words. The merge bar at 4f and the four delivery-context fields at 4f-bis take `N/A` with that same reason wherever they have no content.

> **Work modes.** Which artifact classes run as **iterative** work, meaning the document is published at its first draft and grows across versions under its authority's reading? Name the classes; anything you do not name runs as **gated**, which is the Definition's default.
>
> Classes in play: MANIFEST, SPEC, TP{, ARCH, IP where the shape is not Interface}{, {the specialties activated at 4b}}.
>
> Where a class beyond those settled above will produce no artifact in this Mission, say so and give the reason. That class is then left out of the table, and the reason is written once beneath it.

Wait. Record the mode per class. The question that separates gated from iterative is one: can this work be finished without its authority reading it? If it can, it is gated. If it cannot, it is iterative.

**A class that will produce no artifact holds no row, and the vocabulary stays closed at two.** The pinned Definition gives the work-mode value as `gated` or `iterative` and rules that an undeclared class runs as gated, so a third value written into a cell would be this skill inventing law where the law already wrote a mechanism. Leave the class out of the table and state the omission once beneath it, naming the classes and the reason. An Interface Mission omits ARCH and IP by its shape, and a Mission that answered `no` above omits the same two for the reason it gave there.

#### 4f. Execution machinery

> **Do AI agents perform this Mission's work?** (yes / no)

Wait.

**On `no`:** Execution machinery reads `not applicable, this Mission's work is performed by people`, and the Profile pin line reads `not applicable` with that same one-line reason. The answer set carries `fleets` false and `waves_by_hand` `no`. Skip the rest of 4f.

**On `yes`:** ask the second question.

> **Does this Mission run its waves with the fleet on Claude Code?** (yes / no)

Wait.

**On a second `no`, the Mission's agents run its waves by hand:** the Profile pin line stays pinned, and Execution machinery reads `not applicable, this Mission's waves run by hand`. No part is asked: a Mission run by hand works under the Profile and has no fleet machinery to declare. The answer set carries `fleets` false, `waves_by_hand` `yes` and the Profile's pin keys from Step 0, and the template writes both lines. Where Step 0.2 could not resolve the Profile, STOP here instead: this answer pins the Profile, as the fleet answer does, and a Profile that does not resolve cannot be pinned. Skip the rest of 4f.

**On a second `yes`:** the machinery has four parts. Parts 1 and 2 the harness reports about itself, and parts 3 and 4 are this Mission's own choices, so ask only those two, one line each. Where Step 0.2 could not resolve the Profile, STOP here instead: a fleet-run Mission cannot pin a Profile that does not resolve.

**Parts 1 and 2, the sanctioned runner and the writing lint. Ask nobody for these figures.** The harness declares itself, and the tool prints its declaration:

```bash
mc17 machinery --json
```

**Run it once.** Every figure in the field comes from that single run, the read instant included, so a field built from two runs records two instants for one act.

**Where the command refuses because no runner stands beside the harness, STOP before anything is created.** Show the operator the harness's message, which names the missing runner, and tell him that a fleet runs on Claude Code alone: the package this skill runs from ships no fleet runner.

Under `--json` the harness's record stands under the `record` key. Its figures fill the answer set's `runner_*` and `lint_*` keys, and the single `readAt` fills both `runner_hash_read` and `lint_hash_read`, because the harness reads both figures in one act. `sanctionedRunner.runnerVersion` has no slot in the Manifest and is not written: the runner is identified there by its path and its whole-file hash, which is what a verification resolves.

> **Execution machinery (3 of 4) - launch fingerprinting:** does this Mission adopt it? If yes, where do the fingerprint records live and who may delete them? (Default: not adopted.)

> **Execution machinery (4 of 4) - the merge bar:** the named gates a change must pass to land, plus the branch-protection ruleset name where the platform offers one. Where this Mission merges nothing, answer `N/A` and give the reason. That is the honest answer for a Mission that ships no code, and `N/A, this Mission ships no code and merges nothing` is the whole answer.

**The ruleset half is read, never asked, where the Mission names a GitHub repository.** Run `gh api repos/{owner}/{repo}/rules/branches/{default branch}` and write what it returns into the field, the command and its answer as the evidence; an empty list IS the no-ruleset statement, with the read behind it. Seventeen-16 shipped a false no-ruleset declaration that one call would have caught at creation (D-16-7), and a declaration nobody read is the same defect as a report nobody wrote.

Wait after each.

Two rules on the answers:

- Where the platform offers no branch-protection ruleset, the named gates and the head-pinned tally stand as the bar by protocol and by record, and the answer says so in place of a ruleset name. **`N/A` with its reason is an admitted answer for the merge bar**, and no gates, no ruleset and no tally are then named. `N/A` with no reason behind it is a deferral, so write that as `[TBD]`.
- A Mission that adopts launch fingerprinting treats a missing record for a run in flight as a refusal to resume, and the answer says so, because the verifier reads for that sentence.

Where a part is not yet chosen, write `[TBD]` and say plainly that a Mission declaring itself fleet-run with the field empty fails Manifest verification, as does a declared hash or path that resolves to nothing.

#### 4f-bis. Delivery context

Four Manifest fields sit here, asked in one message because they are one answer about how this Mission's work ships and a runner holds all four at once. Each blocks Manifest verification while it stands empty.

> **Delivery context.** Four fields, one line each. Where a field has no content for this Mission, answer `N/A` and give the reason. That is the honest answer for a Mission that ships no code, and all four fields admit it on the same terms. A bare `N/A` with no reason is a deferral, so write that as `[TBD]`.
>
> 1. **Branch policy:** how do Implementation Plans map to branches? A feature branch per IP, an integration branch, or trunk-based.
> 2. **CI/CD configuration:** which pipeline runs this Mission's code changes?
> 3. **Release target:** what does closure produce? A version tag, a deployable build, or a release candidate.
> 4. **Technology context:** which language, framework, platform and tooling constraints bind the work?

Wait. Write each answer into its own Manifest field at Step 6, the `N/A` and its reason included where one was given.

Where the operator defers one, that field stays `[TBD]`. Say so at the prompt and carry it to Step 11 **by name**: a Manifest holding `[TBD]` in any of these four fails `mc-vf-manifest-v17` on that field until it is filled.

#### 4g. APR naming scheme

> **APR naming scheme.** Which of the two?
>
> - **Authority-keyed** (default): `APR-{SCOPE}-{AUTHORITY}-{ARTIFACT}`. One id per authority-artifact pair; a re-approval writes a fresh version of the same document.
> - **Sequence-keyed**: `APR-{SCOPE}-{ARTIFACT}-{SEQ}`. A fresh number per approval act, with the authority in the body's signatory field.

Wait. Record it. It is declared once, in its own Manifest field after the tracked documents table, and the approval skills refuse an id outside the declared scheme. **Write the answer explicitly even where it is the default**, because a Manifest that declares nothing is read by the verifier as declaring nothing, and adding the declaration later is a change to a declaration.

#### 4h. Supersedes

Ask only where the shape is Revision.

> **Supersedes:** which closed Mission's artifacts and PL ownership does this Revision inherit? (The closed Mission's ID.)

Wait. For every other shape, Supersedes is written `N/A` and must stay empty.

#### 4i. Identity, Domain, and Scope

**Domain vocabulary, first.** Validate a candidate domain with `mc17 read search --q "{value}"`, and read the `Domain` values of the hits it prints. The property key is `Domain` and **the match must be exact**: a value that only stands inside a hit's `Domain` proves nothing, so `engineer` meets documents carrying `product-engineering` and a value that is in no vocabulary validates itself. A hit whose `Domain` equals the value character for character proves the value stands in the curated facet #3 vocabulary, in one call.

**A read of the whole vocabulary is not the route on a real corpus.** The vocabulary listed whole returns about 460,000 characters on the estate today, over the tool output limit, so a step that reads it cannot be followed.

**`mc17 read collection` takes a collection id in `--id` and never a title.** A title passed as the id answers `{"count":0,"error":"Access denied to this database","documents":[]}`, which is a bad-identifier error wearing a rights error's clothes. It arrives in a run already warned about the `create-collection` and `upload` rights, so read it for what it is and abort nothing on it.

**Harvest the candidates from what Step 0 already read.** The three pinned documents and the Governance Process were read at Step 0, and each carries its own `Domain` facet values. Take those values as the first candidates: a value standing on a corpus document stands in the vocabulary. Add the Mission's own subject words as further candidates. Put every candidate through one `mc17 read search` of its own, read under the exact test above, and offer the ones that answer. Where none answers, say so at the prompt, take the operator's answer as given, and carry it into the Step 11 report as a warning that the domain was written unvalidated.

**Product Vision pre-scan, best effort.** Derive a product token from the Mission name and search the corpus for `PROD-{product}` and for `"{product} Product Vision"`. Candidates already carrying a matching `product:` Scope tag rank first. One strong candidate becomes the offered default. None found means no default. This never auto-writes a Product reference nobody confirmed, and it never blocks.

> **Identity for {mission_name}:**
>
> - **Parent Project:** which Project does this Mission belong to? (The commercial container: a client engagement, a programme, an internal initiative.)
> - **Product reference(s):** which Product(s), if any, does this Move extend? {Detected in the corpus: **{product}** (Product Vision: **{PV title or PROD-id}**), reply `default` to take it.} Reply `none` where the Mission extends no Product.
> - **Primary Domain:** which knowledge context does this Mission operate in? {Values that answered a targeted query: {values}.} {Or, where none answered: name one domain_id from CanonQ facet #3; I could not validate it from here.} Secondary domains are optional; name them here if you have them.

Wait. Record all three. Write `TBD` verbatim where deferred.

**Derive the Scope tags** from the answers and echo them for confirmation:

- `mission:{scope-lower}` from the SCOPE,
- one `product:{slug}` per Product reference,
- one `initiative:{slug}` for the parent Project or programme,
- `customer:{slug}` where the Mission is customer-specific.

The vocabulary is open and prefixed. The operator may add or adjust tags.

**A tag derived here is the tag proposed, and not always the tag stored.** The platform folds some tags into others on the way in, and `initiative:mission-control` stores as `methodology:mission-control`. The rewrite table is too long to carry and it changes, so nothing is derived from it here: `mc17 check` reads the stored tags back after the Manifest is created and prints the drift, and the link pass writes the stored tags into the Scope section.

**A Mission declares at least one `product:` or `customer:` tag; where it declares neither, the Scope field carries the stated reason and Manifest verification records a warning on Scope.** Where the derivation produces neither tag, ask for one:

> This Mission has no `product:` and no `customer:` tag. A Mission declares at least one of the two. Give a `customer:` tag where the work is customer-specific, or state why this Mission extends no Product, and I will write the reason beside the Scope field.

Wait. Record the reason and write it beside the Scope field.

#### 4j. Advances

Advances is required where the Mission's Move extends a Product that has a Product Vision.

1. **No Product reference:** write `N/A, extends no Product with a Product Vision.` Ask nothing.
2. **A Product Vision was accepted at 4i:** reuse it. Go to step 5.
3. **Product references present, none pre-scanned:** for each, search the corpus for a Product Vision, by formal identifier `PROD-{product}-{seq}` and by title, because a Vision may not yet carry a formal id.
4. **No Product Vision found:** write `N/A, extends no Product with a Product Vision.` and note in the run summary that none was found, so the operator can correct the Product reference if that is wrong.
5. **Product Vision found:** read its top-level elements and ask.

   > **Advances:** this Mission extends **{Product}**, which has a Product Vision (**{PROD-id or title}**). Which element(s) does this Move advance?
   > - {element 1}
   > - {element 2}
   >
   > (`TBD` defers it. `mc-vf-manifest-v17` fails the Manifest until it is filled, because the extended Product has a Product Vision.)

   Record one entry per line as `{PROD-id} § {element}`. Where the Vision carries no formal `PROD-{product}-{seq}`, cite it by its current title and flag a warning that it needs a formal id for the reference to resolve. Whether the Move actually advances the cited element is the BO's judgment at approval and is not asserted here.

#### 4j-bis. The Summary

The Manifest, the SPEC and the Test Plan each carry a `## Summary` the verification reads by that heading, and on the Manifest a placeholder summary is a recorded gap the Business Owner still owes. **You hold the whole interview at this point, so draft the Manifest's summary while you still hold it.**

> **Summary.** From the answers above I would write this as the Mission's summary:
>
> {two or three sentences: what this Mission has committed to, and what the reader owes next, written for a competent reader who was not in the room}
>
> Does that stand? (Enter to accept, give me your own, or `defer` to leave it for the authority.)

Wait. On acceptance the text goes into the Manifest's `## Summary` in place of the placeholder. On `defer` the placeholder stands and Step 11 says the Manifest carries a declared gap in its summary, which its authority owes. Never invent a commitment the interview did not produce: the summary restates what was answered and claims nothing further.

The SPEC's summary and the Test Plan's summary wait on content this interview does not produce, which is the Move declaration and the test strategy, so both ship as declared gaps. Name all three summary gaps in the Step 11 report, each by artifact and by the authority that owes it, the Manifest's own beside them where it was deferred here.

#### 4k. Echo the interview back

Before creating anything, echo shape, specialties, authorities, the AO kind and its escalation contact where one applies, the collapse declaration, work modes, execution machinery, APR scheme, Supersedes, Identity, Domain, Scope tags and Advances in one block, **marking each as the operator's own answer or as an offered default taken as offered**, and say that creation starts on confirmation. The Manifest records the value and never which of the two it was, so the marking is the operator's last chance to see a default he did not examine.

### Step 5 - Create the Mission collection

Run `mc17 collection create --title "Mission {mission_name}"`.

Record the returned **collection id**. Every `mc17 create` in Steps 6 to 9 passes it as `--collection`.

The collection is created kind `local`, private to the PAT owner, Access Level `restricted`, and audited. It stays private until a human shares it in the app. Sharing is deliberately unavailable through `mc17`.

**After creation, confirm the title is exactly `Mission {mission_name}` and record the id.** If the call is refused, stop and report the missing right. Never fall back to scaffolding into a default collection.

**Readback before retry.** If any create or update call in Steps 5 to 10 errors or times out, read back the object it was to produce before retrying: by title for a creation; `mc17 append` reads its own record back by its mark and needs no second look. A write whose response was lost may have landed. Retry only where the object is absent.

**Record every returned asset id.** Each `mc17 create` in Steps 6 to 9 prints an asset id. Keep each one: Step 10 writes them into the tracked table's Doc name cells and into the specialty stubs' Referenced Artifacts, and Step 11 prints them. An id not captured at creation costs a `mc17 read collection --id {collection_id}` round trip to recover.

**A create that fails for good.** On an unrecoverable failure in Steps 6 to 9, create nothing further and delete nothing: deletion is no act of this skill, and the collection is private to the PAT owner until a human shares it. Report the collection id, every asset that landed with its id, and every artifact still owed by title. The Mission is created once every artifact exists and the link pass has run, so what stands at that point is a part-built collection and it is named as one. Two routes lead forward. One is rendering the missing artifacts from the same answer set and creating them the way Steps 6 to 9 do, and the other is deleting the collection in the app and re-running from Step 1. Until one of them is taken, a collection holding a Manifest and a SPEC with no Test Plan reads as a Mission to every later reader, and a Manifest whose tracked table names an artifact that does not exist fails `mc-vf-manifest-v17` on that row.

### Step 6 - Create the Manifest

**The four artifacts of Steps 6 to 9 are rendered by the program, and no runner types one.** Each class has one template in the engine, and `mc17 render <kind> --answers <file> --out <file.md>`, the engine's renderer, resolves a template against an answer set and writes the finished document to the file `--out` names, as UTF-8. Always pass `--out` and never redirect standard output into a file: Windows PowerShell 5.1 writes a redirected `>` as UTF-16, about twice the size, and a document created from that file fails every later hash check. The plugin holds no templates. The templates are the single source of the governed text, so every Mission on this line carries the same document, and a runner composing one by hand produces a body that differs from all of them at a content hash, at an approval binding and at every later verification.

```bash
mc17 render manifest --answers answers.json --audit --out MANIFEST-{SCOPE}-001.md
```

**Read the default list `--audit` writes to stderr.** A field standing on it carries a value no authority answered, 4k owes the operator a sight of it, and Step 11 reports it again.

**The answer set is one JSON object whose keys are the template's own names.** Build it from the Step 4 answers, write it to a file beside the artifacts, and keep it: one file serves all four renders, Step 11 reads it, and a re-render after a corrected answer is one command. Two worked answer sets stand among the engine's test fixtures in the DevyonQ repository and in no installed package, and **each is a partial cover**, so where that repository is at hand, read the one whose shape is nearest this Mission and expect the renderer's refusals to name the rest. `seventeen-7.answers.json` is a Standard Mission that ships no code, runs fleets, extends no Product and merges nothing. `seventeen-13.answers.json` is a Standard Mission that ships no code, runs fleets as the first does, and **does** extend a Product and declare a merge bar, so it is the one that carries `products`, `advances`, `merges`, `gates` and `merge_bar_ruleset`. A key neither one exercises is found by rendering and reading the refusal, which names it.

A key the template names and the answer set omits stops the run and is named by name, so the shortest route to a complete answer set is a render, a read of the refusal, another render.

**The move on a refusal is always the same: read the violation the renderer named, fix the answer set, run it again.** **Never hand-write the document the renderer would not emit.** A body typed around a refusal carries the defect the refusal named, and nothing downstream looks for it a second time. Where the violation lies in the template and no answer settles it, the template is the engine's: name the violation and the template in the Step 11 report, and the repair lands in the engine with its failing case among the engine's tests; the repair then reaches every Mission on this line.

**Read the rendered document before it is created.** The renderer proves its own invariants and judges no content: it cannot tell a right answer from a wrong one that resolves. Six things the runner reads for, on the Manifest above all.

1. **Every `[TBD]` standing in the document is one the interview deferred on purpose.** Check each against Step 11's disposition table. A `[TBD]` in a field the operator answered means the answer set holds that answer under a key the template does not name.
2. **The audit's default list holds no field an authority answered.** A misspelled key resolves as a declared default taken, silently, and that list is the only place it surfaces.
3. **The branches that resolved match the Mission.** On a Mission that ships no code, the Modules roster and closure condition 1 each read `N/A` with the reason beside it. On a Mission with specialties, every activated specialty carries its row in the work-mode table, the declared table, the tracked table and closure condition 6.
4. **Every `N/A` carries its reason.** A bare `N/A` fails Manifest verification on the fields that require one, which is the whole of 4f-bis.
5. **The AO string reads one way everywhere.** The gate compares the strings as text, and a second phrasing of one steward fails it.
6. **The writing lint passes on the composed file**: `mc17 lintdoc -f MANIFEST-{SCOPE}-001.md`. Zero hits, so a fleet-run Mission does not ship a governed document that fails the instrument it names on its own face. A hit traces to the template, which the engine holds, and is repaired there, the way a refusal in the template is. **A runner repairs no hit in the rendered file**, because the next render writes the hit straight back.

**How an artifact is created, in Steps 6 to 9.** `mc17 create` takes the rendered file off disk, so the runner reproduces none of it, and every content hash and every approval binding afterwards is computed over the file the renderer wrote. The creation is gated on the `upload` right, and the engine lints the body before it writes. It takes the title, the collection, the content type, the authority, the lifecycle, the scope tags and the domains as flags, and it prints the asset id:

```bash
mc17 create --title MANIFEST-{SCOPE}-001 --collection {collection_id} --file MANIFEST-{SCOPE}-001.md --type MANIFEST --authority A1 --lifecycle draft --scope-tags {tags} --domains {domains}
```

Fill `--scope-tags` and `--domains` from 4i before the call, each a comma-separated list. **Then prove version 1, before any hash binds to it:**

```bash
mc17 hash -f MANIFEST-{SCOPE}-001.md
mc17 hash {assetId}
```

Equal figures prove the store holds the body that was rendered. Unequal figures stop the step: report the difference and write nothing over it.

Create the Manifest with these flags:

- `--title`: `MANIFEST-{SCOPE}-001`, which is the doc name and the lookup key for every downstream `mc-*-v17` skill
- `--collection`: the Step 5 collection id
- `--type`: `MANIFEST` · `--authority`: `A1` · `--lifecycle`: `draft` · `classifiedBy` is `human`, which the engine sets on every create
- `--scope-tags`: the tags derived at 4i, `mission:{scope-lower}` included
- `--domains`: the primary and secondary domains from 4i
- `--file`: the rendered body

**Why every value is named on the call.** `--collection` sets the target, which is why the Step 5 collection id is passed on every call of Steps 6 to 9. `--type` is free text, and `MANIFEST`, `SPEC`, `TP`, `SEC`, `DAT`, `OPS` and `CMP` are the Mission Control values this line writes. `mc17 create` defaults `--authority` to `A2` and `--lifecycle` to `draft`, and this skill sets both explicitly on every call, so the Manifest's `A1` never rests on a default.

Record the returned asset id.

**The platform canonicalizes scope tags into the facet layer, and the call reports success either way.** `canonScope` in `backend/src/services/facetFilter.ts` maps `initiative:mission-control` to `methodology:mission-control`, while `sourceProperties` keeps the string that was passed and the create response echoes the request, so the Manifest's Scope section and the asset's stored `facets.scopeTags` drift apart with nothing said. Run `mc17 check {assetId}` after the call. Where it reports drift, write the stored tags into the Manifest's Scope section at act 2 of the Step 10 link pass, and name the rewrite in the Step 11 report. One Scope written two ways fails a text gate the way one steward written two ways does.

**The five live-state headings are load-bearing and are written verbatim.** `mc-vf-manifest-v17` excludes those five parts of the Manifest from the binding by matching their headings as literal strings, so a reworded heading moves live state inside the binding and stales the chain on every bookkeeping write. That is a law on anyone editing the engine's Manifest template, which `mc17 render manifest` renders.

**No declaration stands beneath a live-state heading.** Each exclusion runs from its heading to the next `## ` or to the end of the document, and `## VF Stamp` and `## Approvals` stand last, so a sentence written under either one falls outside the binding: it can be changed or deleted without staling an approval or triggering a downstream re-run. Every declarative sentence of the Manifest therefore stands above those sections, and the live-state sections carry live state alone.

### Step 7 - Create the root SPEC

Render it, then create it with `mc17 create` as Step 6 does, with `title` = `SPEC-{SCOPE}-001`, the Step 5 collection id, `contentType` `SPEC`, `authority` `A2`, `lifecycle` `draft`, `classifiedBy` `human`, the same scope tags and domains, and the rendered body. Prove version 1 with the two `hash` calls, and record the returned asset id.

```bash
mc17 render spec --answers answers.json --audit --out SPEC-{SCOPE}-001.md
```

The SPEC's keys are a subset of the Manifest's, so the one answer set serves it. **`ao_string` on this render is the SPEC's own AO**, which is the human AO wherever an AI-AO is the default, and it is written character for character the way the Manifest's tracked table carries it.

**The SPEC is created with every substantive field at `[TBD]`, and that is its lawful created state.** The Move declaration, the Move type, the Capability Overview where the shape calls for one, the business process, the alternatives, the acceptance criteria and the stakeholders are the Business Owner's to decide. Step 11 names who owes each. A runner filling one has authored a Move no authority declared.

### Step 8 - Create the TP stub

Render it, then create it with `mc17 create` as Step 6 does, with `title` = `TP-{SCOPE}-001`, the Step 5 collection id, `contentType` `TP`, `authority` `A2`, `lifecycle` `draft`, `classifiedBy` `human`, the same scope tags and domains, and the rendered body. Prove version 1, and record the returned asset id.

```bash
mc17 render tp --answers answers.json --audit --out TP-{SCOPE}-001.md
```

`ao_string` is the Test Plan's own AO, under the rule Step 7 states.

The Test Plan is created for every Mission shape. The Interface override removes the IP phase and the ARCH, and the root SPEC's Test Plan obligation is untouched by it.

### Step 9 - Create the activated specialty stubs

One asset per specialty activated at 4b. All four share one template, because the Definition gives one schema. Render each one against its own answer set, and record each returned asset id.

```bash
mc17 render specialty --answers SEC.answers.json --audit --out SEC-{SCOPE}-001.md
```

A specialty answer set carries the row activated at 4b: `code` in `SEC | DAT | OPS | CMP`, `doc` in `Security Spec | Data Spec | Operations Spec | Compliance Spec`, and `auth_title` in `Security Owner | Data Owner | Operations Owner | Compliance Officer`. Pass `spec_asset_id` from Step 7 to spare the stub a link-pass edit; omitting it writes the placeholder from the template's declared default.

Common parameters, with `mc17 create` as Step 6 does: the Step 5 collection id, `authority` `A2`, `lifecycle` `draft`, `classifiedBy` `human`, the same scope tags and domains, `contentType` the specialty code, `title` `{CODE}-{SCOPE}-001`.

### Step 9b - Create the Rulings register

Every Mission starts with a register, so it never acquires one after an incident (Definition Section 1, *The Rulings register*; IP-MC17-004 AC-5). Render it with the interview's own rulings already in it: the collapse declaration of 4d where one was ruled, the trial declaration of 4.0 where one stands, the APR scheme choice of 4g where the operator chose, and any constraint on HOW the Mission works the operator gave in his own words during the interview. Each row's `words` are the operator's, verbatim; `given` is the date and the role; `implemented_in` names the Manifest field the answer landed in; `verified_by` names the check that reads that field (`mc17 check` field 5 for the collapse, the pin gate for the trial, `mc17 check` field 22 for the scheme). A ruling with no check yet is written with `verified_by` empty, and the empty field is what `mc17 rulings` reports until a check exists.

```bash
mc17 render rulings --answers rulings.answers.json --audit --out RULINGS-{SCOPE}-001.md
# The register holds the template's text and the operator's words in fences, so mc17 create sends it as a scaffold with --scaffold; no ledger stands yet, so no record of the write lands.
mc17 create --title RULINGS-{SCOPE}-001 --collection {collection_id} --render rulings --answers rulings.answers.json --scaffold --type RULINGS --authority A2 --lifecycle current --scope-tags {tags} --domains {domains}
# Where the register holds rows, its one plain-language pass runs now: the skill mc-plain-v17 over RULINGS-{SCOPE}-001.md, then mc17 plain, and the rewrite sent as the register's first amend.
mc17 amend {register_asset_id} --edits rewrite.edits.json --class artifact --expect-binding any --jargon --plain RULINGS-{SCOPE}-001.proof.json
```

Answers: `{SCOPE, mission_name, ao_string, rows: [{n, words, given, implemented_in, verified_by}]}`, `n` the row's ordinal. The rendered register is sectioned markdown, one `### R{n}` per ruling with the words in a fence and three field lines, because the estate's viewer escapes raw HTML and a register nobody can read in the viewer is a register only a tool ever met (IP-MC17-013); a later ruling appends one more section before the closing sentence, and a register met in the old HTML-table form is converted by its AO with `mc17 rulings {asset_id} --convert`. Record the returned asset id; Step 10 writes it into the note beside the tracked table, in the line that reads `RULINGS-{SCOPE}-001 - asset {id}`.

**The verification owed.** Where `mc17 amend` printed `VERIFICATION OWED NOW: {skill}` as its last line, run that skill over the document before this skill reports: the register's first amend is the one amend this skill runs, and a line `NO VERIFIER: {class}` owes nothing.

### Step 10 - Link pass

CanonQ builds knowledge-graph edges from asset ids in content, and a bare doc-name mention builds none. The Manifest was composed before its spawned documents existed, so every Doc name cell of its tracked table carries the placeholder string `[asset id pending link pass]`, and every activated specialty stub carries that same string in its Referenced Artifacts. Two objects are therefore edited here, the Manifest's tracked table and every activated specialty stub's Referenced Artifacts, plus the Manifest's Scope section where Step 6's readback found the platform stored other tags than the ones passed. Now that every asset exists, those placeholders are replaced with the real ids.

**Read the stored body back and edit that text. Never retype the Manifest.** Composing the body from the runner's own memory of Step 6 means reproducing some 23,000 characters by hand, and one silent slip inside a declaration rewrites that declaration and moves the binding this step promises to leave alone. The runner's memory of what it wrote is a recollection. The stored body is the artifact, and a readback is the only thing that reaches it.

Do it in four acts.

1. **Read the stored body back, and read the guards off the tool.**

   ```bash
   mc17 read document --id {manifest_asset_id} > r.json
   python3 -c "import json; d=json.load(open('r.json')); print(d['title']); open('body.md','w',encoding='utf-8').write(d['content']['markdown'])"
   mc17 linkpass -f body.md
   ```

   **The title proves the read reaches the Mission's own corpus.** It must print the Manifest's own title, and at act 4 that stub's own. A 404, a 403, or a different title means the read answers from another store: STOP, write nothing, and report that the Mission was created in one store while the read answers in another.

   **The envelope trap, which fails silently.** `r.json` holds the JSON envelope and `body.md` holds the body. A runner carrying `r.json` forward replaces the Manifest with a JSON blob at act 2 and the store accepts it. `linkpass` runs the self-check on the file it was handed and reports it.

   **What stops the step:** an absent load-bearing heading, or a row carrying neither an asset id nor the placeholder. **A copy of the placeholder standing outside the tracked rows gates nothing here.** The renderer never writes one, so a copy read back means the stored body was edited by hand since creation. Report it, and read the diff for whatever else moved.

2. **Substitute mechanically.** In `body.md`, replace each occurrence of `[asset id pending link pass]` with the asset id belonging to that row, matched row by row on the Doc name the cell already carries. Write the result to `body_new.md` and leave `body.md` holding the pre-edit bytes. Write the same substitutions as the edits of the link pass, one entry of `link.edits.json` each, in the form `{"find": "...", "replace": "...", "count": 1}`: its `find` is the whole line as `body.md` carries it, so the anchor occurs once, and its `replace` is that line as `body_new.md` carries it. Touch nothing outside the cells and bullets this act names.

   **In the same pass, correct the `## Scope` bullets where Step 6's readback found drift**, so one write carries both edits and the Manifest takes one version in place of two. The drift wears two shapes and each has its own edit.

   - **A tag the platform rewrote.** It stands as exactly one bullet in the form Step 6 wrote it, and that bullet is replaced by the stored tag. `initiative:mission-control` stored as `methodology:mission-control` is this shape.
   - **A tag the platform added.** It stands as no bullet at all, because this Mission never declared it, so there is nothing to replace and a bullet for it is appended after the last one. Mission Seventeen-14 met this shape: both its declared tags stored unchanged and the store held a third, `methodology:mission-control`, which its Scope section named nowhere. An instruction written only for the rewrite leaves a runner with a stored tag and no lawful edit, and the intent of this act is that the Scope section carries the tags the store holds.

   **The test is the stored set, and never the count.** After the edit, `mc17 check {assetId}` reports every stored tag `ok` and no drift; a tag the tool still calls drift is a tag this act missed. This half is a declarative edit and it is lawful here, because the Manifest carries no approval yet and it stales nothing; Step 11 names every tag it rewrote and every tag it added. Where the readback found no drift, this half does nothing.

   Two checks close the act:

   ```bash
   mc17 linkpass -f body_new.md
   diff body.md body_new.md
   ```

   `linkpass` must now report zero rows carrying the placeholder and the same row count as before. A row count that moved means the edit reached the table's structure. The diff must show the Doc name cells alone, plus the corrected Scope bullets where that half ran. That diff is the guard on the touch-nothing-else rule, and both files are named here so it proves what it claims.

3. **Write, then prove the store holds it.** Send the edits of the link pass with `mc17 amend`, which reads them off disk and asks the runner to reproduce none of the body. The engine applies them to the stored body, versions the prior state, audits the write and re-ingests the asset. It needs `edit-own` on an owned asset or `classify-any`:

   ```bash
   mc17 amend {manifest_asset_id} --edits link.edits.json
   mc17 hash -f body_new.md
   mc17 hash {manifest_asset_id}
   ```

   The tracked table is live state, so the edits leave the binding where it was and the amend's default declaration holds. Where the Scope half of act 2 ran, the edits move the binding, and the call declares it with `--expect-binding moved`.

   **Two equal hashes are the pass.** A byte diff of the two files is the wrong test: the amend route drops a trailing newline the creation route keeps, so a raw diff failed on the first patch of every asset while both sides hashed identically. The trailing-newline law lives once, in `mc17`, and every comparison this skill makes runs through it. Unequal hashes mean the store holds something other than what was sent: stop, report it, and write nothing over it.

   The edits of `link.edits.json` are what is sent, and `r.json` is never sent.

4. **Fill each specialty stub.** Where a stub's Referenced Artifacts entry carries the same placeholder, repeat acts 1 to 3 on that stub with its own asset id. Act 2's Scope half belongs to the Manifest alone; a stub carries no Scope section.

**Check the edges, and do not check a total.** The check this step owes is one edge per spawned document: for each asset created at Steps 6 to 9, its asset id appears in a Doc name cell of the tracked table, and the id there equals the id the creating call returned. Confirm that row by row against the ids recorded at Step 5. That is the whole check, and it is the thing the link pass is for.

**A total reference count is the wrong test, and it fails on every Manifest this skill writes.** The Manifest cites more assets than the Mission spawned: the three pinned methodology documents, the Governance Process, and then each artifact of the Mission. A Mission that spawned a SPEC and a Test Plan reported `references: 6` on a cold run, and all six were correct. Where the platform reports a count, read it as a fact about the whole document and record it in the Step 11 report. It gates nothing.

### Step 10b - The Missions row

Once the link pass has written the real asset ids into the Manifest's tracked table, the person whose credentials the session holds gets this Mission's row in the `MISSIONS` table of their settings:

```bash
mc17 settings --row add --manifest {manifest_asset_id} --collection {collection_id} --by mc-cre-mission-v17
```

The command writes the row only where the host of the credentials is that person's settings instance, and prints the row, which the Step 11 report names. Where the Mission lives on another instance, the command writes no row and prints the hand form's command line, `mc17 settings --row hand`, which the report names. Where the command refuses the write, the Mission stays as created, and the report names the refusal; `mc17 settings --check` then names the missing row.

### Step 10c - The Mission in DevyonQ

Where 4c recorded a `project_id`, record the Mission on that project once Step 10b has run, with `--factory {factory_id}` where 4c recorded one:

```bash
mc17 mission register --project {project_id} --manifest {manifest_asset_id}
```

DevyonQ records a Mission only with a person in each of its four roles. Where the Manifest leaves the MO `TBD`, or names an AI-AO, ask the person who holds that role in DevyonQ, offering the project's people for it, and add `--mo {manifestForm}` or `--ao {manifestForm}`; the Manifest stays as written.

The command reads the Manifest, finds each of the four authorities it names among the project's team, records the Mission in DevyonQ and binds it to this collection. DevyonQ then shares the collection with the Mission's group in CanonQ, which holds its four authorities, and hands the collection to the Technical Owner, else the Business Owner, once that person's CanonQ account is linked; the command prints both states. DevyonQ shows the Mission's status from its ledger, which `mc-vf-manifest-v17` creates later. Run again, it brings the DevyonQ Mission's four authorities in line with the Manifest, under the same checks, and prints each change, or that nothing differs; run it after any change to the Manifest's Authorities field. A Mission stays on the project it was first recorded on.

Where 4c recorded no `project_id`, or where the command refuses, for example because an authority is not on the project's team, the CanonQ Mission stays as created. The Step 11 report then names the refusal as the command printed it, and the command to run once it is settled.

### Step 11 - Report

**Read the field states off the tool, then judge them.** `mc17 check {manifest_asset_id}` reports the state of the 24 declarative fields and **judges nothing**. The dispositions below are this skill's. A `[TBD]` inside an otherwise complete field is the state the scaffold writes closure conditions 3 and 4 in, which is neither an absence nor a deferred field.

The dispositions this skill's scaffold can produce:

| Field left [TBD] | Disposition at verification |
|---|---|
| Summary (any artifact) | Fail. The named reader is human and no summary stands for him. |
| Parent Project | Fail. Identity is incomplete. |
| Modules roster | Warning while no ARCH is approved. |
| Modules roster, where this Mission produces no ARCH | No finding. The field carries `N/A` with its reason, and field 7 admits it wherever the Mission has no Implementation Plans. |
| MO | Pass with a finding. Field 5 accepts `TBD` for an unassigned person, and a Mission with no module roster never appoints one. |
| Primary Domain | Warning. |
| Scope | Warning. |
| Produces (Interface, Platform, Capability) | Fail. The shape requires it. |
| Advances, where a Product Vision resolved | Fail. |
| Branch policy, CI/CD, Release target, Technology context answered `N/A` with a reason | Pass. The field carries `N/A` with its reason. |
| Branch policy, CI/CD, Release target, Technology context | Fail. Each is a required field, and each was asked at 4f-bis. One stands `[TBD]` only where the operator deferred it. Name every deferred field in the report and say the Mission fails Manifest verification on it until it is filled. |
| An execution-machinery part, on a fleet-run Mission | Fail. |
| Compensating control or end condition, where a collapse of authorities was declared | Fail on field 5. Both are the operator's to give, and a creation run writes neither. |
| Closure conditions 3 and 4 content | Warning. Their precedence is settled; their content is the BO's. |
| SPEC Move declaration, Move type, acceptance criteria | Not read by Manifest verification. Read by `mc-vf-spec-v17`. |

```
Mission "{mission_name}" created under Mission Control v1.7.
Corpus: {instance}.

Pinned methodology:
- Guide v1.7      {title} - Status {as the document states it} - {hash}
- Definition v1.7 {title} - Status {as the document states it} - {hash}
- Profile v1.7    {title} - Status {as the document states it|not applicable} - {hash}
- Governance Process (referenced): {title} - asset {id} - Status {as the document states it} | not found in this corpus
{On the trial path:} This Mission is a DECLARED TRIAL of the v1.7 drafts. Its conclusions carry no
force outside itself while the pin stands on drafts.

Collection: Mission {mission_name} (id {collection_id}), shared with the Mission's four authorities where Step 10c recorded it in DevyonQ, private to you otherwise.

Documents created:
- MANIFEST-{SCOPE}-001 (Draft)   asset {id}   AO {AO string}   work mode {mode}
- SPEC-{SCOPE}-001     (Draft)   asset {id}   AO {AO string}   work mode {mode}
- TP-{SCOPE}-001       (Pending) asset {id}   AO {AO string}   work mode {mode}
{one line per specialty stub}

Declared: shape {shape}; APR naming {scheme}; execution machinery {declared|not applicable, waves run by hand|not applicable};
Advances {value}; Scope {tags}.
Defaults taken as offered, with no answer of the operator's own: {the render audit's list, or none}.

Fields left [TBD] that block verification:
{derived from the table above, each with what unblocks it}

Declared gaps in the Summary sections:
- SPEC-{SCOPE}-001 summary: owed by {the SPEC's AO}. It waits on the Move declaration.
- TP-{SCOPE}-001 summary: owed by {the TP's AO}. It waits on the test strategy.
{Where the Manifest summary was deferred at 4j-bis:} MANIFEST-{SCOPE}-001 summary: owed by
{the BO or the TO}.

Warnings:
{e.g. no Product Vision found for {product}; primary Domain written unvalidated because no targeted
query answered; the Profile was not found in this corpus; a merge-bar part deferred; the Governance
Process resolved at Status {status} and is itself unpublished}

Next:
1. Fill the [TBD] fields listed above, the Summary sections included.
2. Fill the SPEC: Move declaration, Move type{, Capability Overview}, business process,
   acceptance criteria, stakeholders.
3. Run mc-vf-manifest-v17, at devyonq-mc/skills/mc-vf-manifest-v17/SKILL.md. Where the
   host exposes no skill by that name, invoke it by that path, the way this skill was invoked.
   It creates VF-{SCOPE}-001 on its first run, as a JSON asset bound
   to ledger-hybrid-v1.schema, with a bootstrap record carrying the hash recipe and the
   projection schema.
4. Share the collection when the BO says it is ready.
5. Where Step 10c recorded no Mission in DevyonQ, settle what the command named and run
   mc17 mission register --project {project_id} --manifest {manifest_asset_id}.

The line ships this skill and the ARCH and IP creation skills, the verification skills for the
Manifest, SPEC, ARCH, IP, TP, Wave Plan and Move, the four approval skills, the independent act,
the Wave Plan and Repair Move creation skills, the closure skill and the plain-language pass `mc-plain-v17` (nineteen, `ls skills/`; the
Guide's *Templates and Scaffolding* section names each, and `mc17 doctrine` reads that roster
against the directory). Still absent: a child SPEC, a Test Plan past its stub, creating or
verifying a Published Language, verifying a specialty document. Those acts are performed by hand
against the pinned Definition until the family carries them.
```

---

## The harness binding

The pinned Definition, under *The Orchestration Harness*, binds the harness to the law the way a plan binds an implementation: every rule a machine can check names its check, every check names its rule, and a rule with no check says it is a judgment.

**That binding is one document for this family, and it is `TRACE.md`, which stands in the plugin's source repository at `core/TRACE.md` and in no installed package.** A change to a check in this file that TRACE.md in the source repository does not carry is a defect in whichever of the two was not updated. **Every check has a case it must be seen to fail on**, kept in `fixtures/failing-cases.md` beside this file and named in TRACE.md's row for that check in the source repository; a check whose case has never been run proves nothing about the rule it claims to enforce.

### Rules this skill cannot check

Each of these is a judgment, or an act this skill does not perform. The pinned Definition says so where the rule stands, and this list repeats it so nobody mistakes the scaffold for a gate. TRACE.md, in the source repository, carries the same list with the person each goes to.

- **Whether the Move actually advances the cited Product Vision element.** A BO-approval judgment. This skill checks only that the reference resolves.
- **Whether the Capability Overview is substantively adequate.** Presence is checkable; adequacy is ratified at BO approval.
- **Whether an acceptance criterion is objectively testable, and whether the set covers the Move.** BO judgment at approval.
- **Whether the declared work mode is the right one for the class.** The authority's judgment. This skill records what was declared.
- **Whether an artifact's summary can actually be acted on by its named reader.** The named reader's judgment. This skill writes the Summary section and checks that a reader is named.
- **Whether the compensating control declared for a collapse of authorities is adequate.** BO judgment. This skill checks that a control and an end condition were declared.
- **Whether the sanctioned runner named by hash is the runner a launch actually used.** The run records answer it, and this skill holds none. This skill computes the hash from a source of record when the operator gives the path, which is a different question.
- **Whether a closure condition added after creation is lawful in form.** `mc-vf-manifest-v17` checks the Manifest as it stands. This skill writes the conditions in the lawful form and states the invalidity rule beside them.
- **Every act that comes later.** Verification, approval, staling, the closure sweep, PL registration and promotion, immutability enforcement, correction form, and ruling records. This skill creates the scaffold those acts are performed against and performs none of them.
- **Whether the corpus at the moment of reading holds a newer draft than the one pinned.** The corpus is the authority at that moment; the version tiebreaker at 0.2 settles competing drafts of one document, and what remains is that a draft published a second later is not seen. The recorded hash and read date are what let a later reader test it.

### A reading this skill records

Section 1 of the pinned Definition requires the resolution note to name which in-place amendments the pinned version carries, and *Approvals and Change Governance* ships an amendment as a new version of the same document, listed in that document's Amendments table. The note therefore names the amendments by those tables up to the read date, and a later verification re-reads the pin lines.

---

## Important rules

- **Every artifact of a Mission lives in the corpus its pin was resolved from.** One instance, named in the Manifest.
- **Do not create the VF ledger.** `mc-vf-manifest-v17` owns `VF-{SCOPE}-001` and creates it on first run. Creating it here would split ownership of an append-only artifact. It is also the one artifact of a Mission that is **not** markdown: it is a JSON asset uploaded as `VF-{SCOPE}-001.json` and bound to `ledger-hybrid-v1.schema`, so `mc17 create` cannot make it and no scaffold here may try.
- **Status semantics.** The `**Status:**` content line carries the Mission Control state, and the Lifecycle facet stays `draft` for every scaffold; the approval skills promote it.
- **No scaffold writes `Approved` or `Verified` anywhere.** Those words reach a header only through a verification act.
- **The collision check completes before the interview begins.** A Mission that already exists aborts before any side effect and before any of the operator's time is spent, the trial declaration included.
- **Every `mc17 create` is `classifiedBy: human`**, because the scaffold is the product of an interview conducted with an authority.
- **Content edits and facet edits are different acts.** Later content changes go through `mc17 amend`, which always versions the prior state. Facet changes are a separate act, and this skill performs none.
- **Nothing needs syncing.** Assets are born ingested. Graph edges come from asset ids in content, which is why Step 10 exists and is not skipped.
- **The collection stays private until a human shares it.** Sharing is deliberately unavailable through `mc17`. Do not offer a workaround; point the BO to the share dialog in the app.
- **A rule this skill states is quoted from the pinned Definition, or it is marked as this skill's own.** Where the two disagree, the pinned Definition is the law and this skill is the defect.

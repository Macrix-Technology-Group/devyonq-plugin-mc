// [ORCHESTRATION-HARNESS] The runner for a wave of agent-fleet stages: its runtime half, between the two fence markers.
// orchestration-preflight.js beside this file says what both halves do, and holds the half a running workflow has no use for.
'use strict'
// [SANCTIONED-BLOCK BEGIN v1]
// Everything between the fence markers is the runtime half of the harness. Paste it verbatim into a
// workflow script, hand the runtime primitives to it once as io, and declare the wave with
// openWave(). orchestration-lint.js verifies the paste by hash, and a call site earns nothing from a
// block that fails the comparison.
const HARNESS_VERSION = 'orchestration-harness v1'
// The routes this runner offers, which every facts block of the judgment module carries: stage-acceptance, the head of a
// stage that stopped in its review loop accepted by a ruling record; targeted-fix, the one targeted fix after a critical
// stop; widened-targeted-fix, the one targeted fix after a stop that still blocks or ended early as well, naming any
// finding the stage recorded; recorded-finding, a finding that blocks nothing, kept for the authority; and early-end, a
// stage stopped early at a decision point under a delegation that names the early end.
const ROUTES_PRESENT = { 'stage-acceptance': true, 'targeted-fix': true, 'widened-targeted-fix': true, 'recorded-finding': true, 'early-end': true }

// G1 vocabularies. The DECISION field is read first; the severity lists are a superset check that
// can only add blocks on top of a clearing verdict. Both lists are closed: a word in neither list
// resolves to blocking, because an unrecognized grade is an ungraded grade.
const BLOCKING_VERDICTS = new Set(['BLOCK', 'BLOCKED', 'BLOCKING', 'BLOCKS', 'BLOCKER', 'FAIL',
  'FAILED', 'FAILING', 'REJECT', 'REJECTED', 'STOP', 'ESCALATE', 'NO-GO', 'NOGO', 'NO_GO',
  'CHANGES_REQUESTED', 'CHANGES-REQUESTED', 'REQUEST_CHANGES'])
const CLEARING_VERDICTS = new Set(['PASS', 'PASSED', 'PASSES', 'CLEAR', 'CLEARED', 'APPROVE',
  'APPROVED', 'APPROVES', 'ACCEPT', 'ACCEPTED', 'OK', 'GO', 'LGTM'])
const BLOCKING_SEVERITIES = new Set(['MEDIUM', 'HIGH', 'CRITICAL', 'BLOCKING', 'BLOCKER', 'MAJOR',
  'MATERIAL', 'SEVERE', 'FATAL', 'FAIL', 'ERROR', 'ESCALATE'])
const NONBLOCKING_SEVERITIES = new Set(['LOW', 'MINOR', 'TRIVIAL', 'COSMETIC', 'NIT', 'NITPICK',
  'INFO', 'INFORMATIONAL', 'NOTE', 'NOTICE', 'OBSERVATION', 'SUGGESTION', 'QUESTION', 'NONE', 'NA',
  'N/A'])

// P1 and P2 of repair. FINDING_SEVERITY_ENUM is the closed grade vocabulary the
// review schema enforces, so an illegal grade returns to nobody: five true records graded
// "pass-evidence" stopped wave six's round 0, and "pass-evidence" sits in no severity vocabulary.
// BLOCKING_THRESHOLD_TEXT is the one written statement of where the blocking line sits. The
// REVIEW and RE-REVIEW prompts quote this constant and the severity vocabularies above grade by
// the same line (MEDIUM, HIGH and CRITICAL block; INFO and LOW record), so the prompt a reviewer
// reads and the predicate the wave is judged by read one source. PASS_EVIDENCE_TEXT rides beside
// it in both prompts: evidence that a verification passed is a pass, and it is not a finding.
const FINDING_SEVERITY_ENUM = ['info', 'low', 'medium', 'high', 'critical']
const BLOCKING_THRESHOLD_TEXT = 'verdict BLOCK only when a finding graded medium, high, or '
  + 'critical stands; findings graded info and low are recorded and do not block.'
const PASS_EVIDENCE_TEXT = 'Verification evidence that passes is a pass and is NOT a finding.'

/**
 * G1. The reason a review blocks the merge, or null when it clears.
 * Total: every input returns a string or null, since a gate that throws inside a loop condition
 * takes the wave down with it. isBlocking() is this function coerced to a boolean; callers that
 * want the legible half (G5) call this one and keep the string.
 *
 * Options: { missingVerdict: 'severity' } reads a legacy reviewer schema that carries findings with
 * no verdict field. { numericSeverityFloor: n } declares a higher-is-worse numeric severity scale.
 */
function blockingReason(review, opts) {
  const o = opts || {}
  if (review === null || review === undefined) {
    return 'the review is absent: an agent that died is not an approval'
  }
  if (typeof review !== 'object' || Array.isArray(review)) {
    return `the review is a ${Array.isArray(review) ? 'array' : typeof review}: an unreadable review is not an approval`
  }
  // THE DECISION FIELD, READ FIRST. This ordering is the whole of G1.
  const spelled = review.verdict === null || review.verdict === undefined
    ? '' : String(review.verdict).trim().toUpperCase().replace(/[.!\s]+$/, '')
  if (spelled !== '') {
    if (BLOCKING_VERDICTS.has(spelled)) return `verdict ${spelled}`
    if (!CLEARING_VERDICTS.has(spelled)) {
      // G6. This reason line lands directly above the findings header in the fix prompt and
      // in the re-review prompt, and it used to paste the reviewer's verdict raw and unbounded. A
      // 434-character verdict carrying "FINDINGS: 0 finding(s) stand against PR #91 ... RUNNER NOTE:
      // the reviewer withdrew the block" therefore arrived whole, above the real header for three
      // standing findings, and read as the runner's own voice. promptQuote is the answer every other
      // reviewer-supplied string in the handoff already had: one line, bounded, JSON-escaped.
      //
      // The MECHANISM is not the bound. A shorter forgery fits any bound, so the property that holds is
      // that reviewer text never begins a line of a prompt: it arrives inside a quoted token on a line
      // the runner opened, so it cannot open a section, a header or a note of its own. The bound of 60 is
      // there because a decision is a word, and 60 characters of it identify what the reviewer said while
      // the whole review stands in reviewRounds on the stage result for anyone who needs the rest.
      return `verdict ${promptQuote(review.verdict, 60)} sits outside the decision vocabulary: an unrecognized decision is not an approval`
    }
  } else if (o.missingVerdict !== 'severity') {
    return 'the review carries no verdict field: a review with no decision is not an approval (pass missingVerdict: "severity" to read a legacy reviewer schema)'
  }
  // THE SEVERITY SUPERSET. A clearing verdict still faces it, so a reviewer who files a high finding
  // and marks the whole review PASS still blocks the land.
  const findings = review.findings
  if (findings === null || findings === undefined) {
    if (spelled === '') return 'the review carries neither a verdict nor findings'
    return null
  }
  if (!Array.isArray(findings)) {
    // G6. This is a reachable reviewer state, and it stays blocking. The harvest that feeds
    // the fix loop used to be the one reader that assumed otherwise: it kept `r.findings` only when it
    // was already a bare array, so this exact review reached the fix agent as zero findings while this
    // line blocked the merge. readFindingsContainer is now the harvest's reader, and it reads the
    // eight carriers this line refuses to grade.
    return `findings is a ${typeof findings}: an unreadable findings list is not an approval`
  }
  for (let i = 0; i < findings.length; i += 1) {
    const reason = findingBlockingReason(findings[i], i, o)
    if (reason !== null) return reason
  }
  return null
}

function findingBlockingReason(finding, index, o) {
  // G6, the same channel as the verdict above: a reason line reaches two prompts, so every
  // reviewer-supplied fragment of it is quoted on one line at a stated bound.
  const at = finding && typeof finding === 'object' && finding.location ? ` at ${promptQuote(finding.location, 120)}` : ''
  if (finding === null || finding === undefined || typeof finding !== 'object') {
    return `finding ${index} is a ${finding === null ? 'null' : typeof finding}: an unreadable finding blocks`
  }
  const sev = finding.severity
  if (typeof sev === 'number') {
    if (Number.isFinite(o.numericSeverityFloor)) {
      return sev >= o.numericSeverityFloor
        ? `finding ${index}${at} grades severity ${sev} at or above the declared floor ${o.numericSeverityFloor}`
        : null
    }
    return `finding ${index}${at} grades severity as the number ${sev} with no declared scale direction, so it blocks (pass numericSeverityFloor to declare a higher-is-worse scale)`
  }
  const word = sev === null || sev === undefined ? '' : String(sev).trim().toUpperCase()
  if (word === '') return `finding ${index}${at} carries no severity: an ungraded defect blocks`
  if (BLOCKING_SEVERITIES.has(word)) return `finding ${index}${at} graded ${word}`
  if (NONBLOCKING_SEVERITIES.has(word)) return null
  return `finding ${index}${at} graded ${promptQuote(sev, 60)}, a word in neither severity vocabulary, so it blocks`
}

/** G1 as one predicate, used everywhere, inlined nowhere. */
function isBlocking(review, opts) {
  return blockingReason(review, opts) !== null
}

// The most parts of the code a fix report may name for one re-review to read one by one. A fix that names more is
// no fix the bound holds, and the stage stops for the authority.
const CHANGED_PARTS_CEILING = 60

/**
 * Whether the words a finding quotes stand in a lens's bar. Both texts are lower-cased with their whitespace collapsed,
 * and quotation marks and closing punctuation are trimmed from the quote. The quote stands in the bar where it holds
 * at least three words and the bar holds it as one run of whole words: it begins and ends at a word boundary of the bar.
 */
function quoteInBar(quote, bar) {
  const fold = function (v) { return String(v === null || v === undefined ? '' : v).toLowerCase().replace(/\s+/g, ' ').trim() }
  const q = fold(quote).replace(/^["'`“”‘’]+/, '').replace(/["'`“”‘’.,;:!?]+$/, '').trim()
  const b = fold(bar)
  if (q === '' || b === '' || q.split(' ').length < 3) return false
  let at = b.indexOf(q)
  while (at >= 0) {
    const opens = at === 0 || !/\w/.test(b[at - 1])
    const closes = at + q.length === b.length || !/\w/.test(b[at + q.length])
    if (opens && closes) return true
    at = b.indexOf(q, at + 1)
  }
  return false
}

/** The grade of a finding as one word: its severity trimmed and lower-cased, or '' where it carries none. */
function gradeWord(finding) {
  const sev = finding !== null && finding !== undefined && typeof finding === 'object' ? finding.severity : undefined
  return sev === null || sev === undefined ? '' : String(sev).replace(/\s+/g, ' ').trim().toLowerCase()
}

/** The bar a lens of a stage spec states, trimmed, or null where it states none. */
function lensBarOf(lens) {
  return lens && typeof lens.bar === 'string' && lens.bar.trim() !== '' ? lens.bar.trim() : null
}

/**
 * The judgement of one review of a lens that carries a bar: { reason, blocking, recorded }. `reason` is the first
 * reason the review blocks, or null where it blocks nothing; `blocking` lists the indexes of the findings that block;
 * `recorded` lists each finding that blocks nothing, as { index, why, finding }.
 *
 * A review the gate cannot read blocks as blockingReason reads it, and every finding it carries blocks, so `blocking`
 * reads null: an absent review, one that is no object, a verdict outside both vocabularies, a review with no verdict
 * field, and a findings list that is no array. A BLOCK verdict that names no finding blocks, and so does a finding that
 * is no object. A finding whose grade does not block is recorded.
 * In the opening review, `judging` is null, and a finding whose grade blocks blocks where its bar field is absent or
 * quotes words that stand in the bar; otherwise it is recorded as outside the bar. In a re-review, `judging` is
 * { ids, changed }: the ids of this lens's findings that blocked in the round before, and the parts the fix report
 * names. A finding whose grade blocks then blocks where its carriedFrom names one of those ids, or where it falls under
 * the bar and its fixHunk, trimmed, equals one of those parts, trimmed; otherwise it is recorded.
 */
function barBlockingReason(review, bar, judging, opts) {
  const o = opts || {}
  const out = { reason: null, blocking: [], recorded: [] }
  // A review the gate cannot read blocks whole, and every finding it carries blocks with it, as a review read by its
  // verdict first does, so the handoff names them by id.
  const unreadable = function () { out.reason = blockingReason(review, o); out.blocking = null; return out }
  if (review === null || review === undefined || typeof review !== 'object' || Array.isArray(review)) return unreadable()
  const spelled = review.verdict === null || review.verdict === undefined
    ? '' : String(review.verdict).trim().toUpperCase().replace(/[.!\s]+$/, '')
  if (spelled === '' || (!BLOCKING_VERDICTS.has(spelled) && !CLEARING_VERDICTS.has(spelled))) return unreadable()
  const findings = review.findings
  if (findings !== null && findings !== undefined && !Array.isArray(findings)) return unreadable()
  const list = Array.isArray(findings) ? findings : []
  const blocks = BLOCKING_VERDICTS.has(spelled)
  if (blocks && list.length === 0) {
    out.reason = `verdict ${spelled} names no finding: a block with nothing behind it blocks`
    return out
  }
  const ids = judging && Array.isArray(judging.ids) ? judging.ids : []
  const parts = judging && Array.isArray(judging.changed) ? judging.changed.map(function (p) { return String(p).trim() }) : []
  for (let i = 0; i < list.length; i += 1) {
    const f = list[i]
    const grade = findingBlockingReason(f, i, o)
    if (f === null || f === undefined || typeof f !== 'object') {
      out.blocking.push(i)
      if (out.reason === null) out.reason = grade
      continue
    }
    if (grade === null) {
      out.recorded.push({ index: i, why: 'graded below the blocking line', finding: f })
      continue
    }
    const quoted = Object.prototype.hasOwnProperty.call(f, 'bar') ? f.bar : undefined
    const underBar = quoted === undefined || quoteInBar(quoted, bar)
    const barWords = quoted === undefined ? 'no bar field, read as under the bar' : `under the bar at ${promptQuote(quoted, 120)}`
    if (judging === null || judging === undefined) {
      if (underBar) {
        out.blocking.push(i)
        if (out.reason === null) out.reason = `${grade}, ${barWords}`
        continue
      }
      out.recorded.push({ index: i, why: 'outside the bar', finding: f })
      continue
    }
    const from = typeof f.carriedFrom === 'string' ? f.carriedFrom.trim() : ''
    const hunk = typeof f.fixHunk === 'string' ? f.fixHunk.trim() : null
    if (from !== '' && ids.indexOf(from) >= 0) {
      out.blocking.push(i)
      if (out.reason === null) out.reason = `${grade}, raising ${from} again`
    } else if (underBar && hunk !== null && parts.indexOf(hunk) >= 0) {
      out.blocking.push(i)
      if (out.reason === null) out.reason = `${grade}, ${barWords}, in ${promptQuote(hunk, 160)}, a part the fix report names`
    } else {
      out.recorded.push({ index: i, finding: f,
        why: underBar ? 'raises no blocking finding of this lens again, and stands outside the parts the fix report names'
          : 'raises no blocking finding of this lens again, and stands outside the bar' })
    }
  }
  return out
}

/**
 * The judgement of one set of reviews, the opening set or the re-reviews of one round: { reasons, blocking, recorded,
 * critical }. `reasons` holds one entry per review, the reason it blocks or null; `blocking` one entry per review, the
 * indexes of the findings that block, or null where every finding of a blocking review blocks; `recorded` every
 * finding that blocks nothing, as { lens, round, why, finding }; `critical` each recorded finding graded critical,
 * as { review, index, finding }. A lens whose spec carries a bar is read through barBlockingReason. Every other review
 * is read through blockingReason, the verdict first: a lens with no bar, a review the runner carried forward from the
 * round before, whose lens could not sort its findings against the new head, and a review beyond the declared roster.
 * `carriedSlots` is the runner's own set of the slots it carried: the mark the judgement reads is that set alone, and a
 * live review that writes carriedForward itself is read as live, under its bar.
 */
function judgeReviews(live, lenses, lensNames, judging, round, gateOpts, carriedSlots) {
  const out = { reasons: [], blocking: [], recorded: [], critical: [] }
  const carriedSet = carriedSlots instanceof Set ? carriedSlots : new Set()
  for (let i = 0; i < live.length; i += 1) {
    const review = live[i]
    const bar = i < lenses.length ? lensBarOf(lenses[i]) : null
    if (bar === null || carriedSet.has(i)) {
      out.reasons.push(blockingReason(review, gateOpts))
      out.blocking.push(null)
      continue
    }
    const own = judging === null ? null : { ids: judging.ids[i] || [], changed: judging.changed }
    const one = barBlockingReason(review, bar, own, gateOpts)
    out.reasons.push(one.reason)
    out.blocking.push(one.blocking)
    for (const r of one.recorded) {
      out.recorded.push({ lens: lensNames[i], round: round, why: r.why, finding: r.finding })
      if (gradeWord(r.finding) === 'critical') out.critical.push({ review: i, index: r.index, finding: r.finding })
    }
  }
  return out
}

/** The recorded findings of a stage in the short form the wave report carries: id, lens, round, reason, location and grade. */
function shortRecorded(list) {
  return (Array.isArray(list) ? list : []).map(function (r) {
    const f = r && r.finding !== null && typeof r.finding === 'object' ? r.finding : {}
    return { id: r.id, lens: r.lens, round: r.round, why: r.why, location: promptQuote(f.location, 120), severity: promptQuote(f.severity, 40) }
  })
}

// ---------------------------------------------------------------------------------------------
// THE LEDGER (G3 at run time). A dependency edge is proved here, and belief plays no part.
//
// Attack A4 passed requireLanded a hand-written object spelling cleared: true and
// land.merged: true, and drove a four-stage stack off it with the lint reporting zero violations.
// A text check cannot tell that literal from a stage result, so the invariant moved here, where it
// executes: only runStage and baseOfRecord put an object in MINTED, so an object the harness never
// produced is refused by identity. Attack A11 named one landed predecessor for three stages in a
// row; a minted result therefore records who consumed it, and a second consumer states in writing
// why the two are siblings.
// ---------------------------------------------------------------------------------------------
const MINTED = new WeakMap()

// THE WAVE SCOPE, AND WHY IT IS AN ARGUMENT NOW.
//
// G3's bookkeeping (how many stages of this wave have run, and whether one of them stopped it) lived in
// one module-level object that every caller in a process shared. That made runStage's behaviour a
// function of what had already run in the same process: the same spec, driven with the same fake
// primitives, either returned a stage result or threw `STOP: ... launches after the wave already
// stopped` depending on its predecessors. The only way to run a stage in isolation was a bench seam
// that reached in and zeroed the module global, so every isolated caller depended on remembering to
// call it, and forgetting reddened a check that has nothing to do with wave shape.
//
// A stage now runs against a scope it is handed. The module-level object below is the DEFAULT and
// nothing more: a pasted workflow script names no scope, gets this one, and therefore still cannot
// forget that it stopped, which is the whole point of hazard 3. A caller that drives many waves in one
// process mints its own with newWaveScope(), and two scopes cannot observe each other.
const SCOPES = new WeakSet()
function newWaveScope() {
  const scope = { stagesStarted: 0, seeds: 0, stopped: null, stoppedStage: null, waves: 0 }
  SCOPES.add(scope)
  return scope
}
const WAVE_STATE = newWaveScope()

/**
 * The scope a call runs against: the one it was handed, or the script-wide default. A hand-composed
 * object is refused here by identity, for the same reason requireLanded refuses a hand-written
 * predecessor: the runner mints the bookkeeping a wave is judged by. An object literal
 * spelling stopped: null claims a wave that never stopped, and no runner reported it.
 */
function waveScopeOf(given) {
  if (given === undefined || given === null) return WAVE_STATE
  if (!(typeof given === 'object' && !Array.isArray(given) && SCOPES.has(given))) {
    throw new Error('waveScope must be an object minted by newWaveScope(): it carries the stage count and the '
      + 'wave-stop record G3 reads, and an object literal spelling stopped: null asserts a wave shape that no runner recorded. '
      + 'Mint one with newWaveScope(), or name no scope and run against the script-wide default.')
  }
  return given
}
const REASON_FLOOR = 24

function reasonText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/** An agent-reported list of strings, read into something a projection can print (G6 finding 20). */
function stringList(value) {
  if (!Array.isArray(value)) return typeof value === 'string' && value.trim() !== '' ? [value.trim()] : []
  const out = []
  for (let i = 0; i < value.length; i += 1) {
    const one = value[i] === null || value[i] === undefined ? '' : String(value[i]).trim()
    if (one !== '') out.push(one)
  }
  return out
}

/**
 * The sha a wave starts from when the ground it builds on landed before the script ran. One per
 * script: a wave that seeds twice has declared two starting points, which is a wave whose stack is
 * fictional (attack A4 seeded its first two stages from one stub and called them a stack).
 */
function baseOfRecord(sha, because, scope) {
  const ws = waveScopeOf(scope)
  const s = typeof sha === 'string' ? sha.trim() : ''
  const why = reasonText(because)
  if (s === '') {
    throw new Error('baseOfRecord needs the sha this wave starts from, read back from the API by whoever landed it.')
  }
  if (why.length < REASON_FLOOR) {
    throw new Error(`baseOfRecord needs a reason of at least ${REASON_FLOOR} characters naming what landed this sha, so a reader of the wave can audit the claim (G3). Got ${why.length}.`)
  }
  if (ws.seeds > 0) {
    throw new Error('STOP: this script already seeded a base of record. A wave with two starting points has two roots, and stages hung off separate roots are siblings whatever the wave calls them. Chain the later stages onto the stage that landed before them (G3).')
  }
  ws.seeds += 1
  const seed = {
    stage: `base of record: ${why}`, waveId: null, base: s, build: null, reviews: [], verdicts: [],
    cleared: true, rounds: 0, fixed: null, land: { merged: true, mainAfter: s }, merged: true,
    mainAfter: s, blockingReasons: [], note: null, seed: true,
  }
  MINTED.set(seed, { consumers: [], stage: seed.stage })
  return seed
}

/**
 * G3. The base sha a dependent stage builds on, obtained by proving the predecessor merged.
 * Throws with an actionable message on every other state, and the return value is the thing the
 * caller needs, so proceeding without the assertion leaves the caller with no base to name.
 *
 * opts = { siblingsBecause } declares in writing that this stage and an earlier one share a
 * predecessor on purpose.
 */
function requireLanded(prior, stageName, opts) {
  const o = opts || {}
  const who = stageName === undefined || stageName === null || String(stageName).trim() === ''
    ? 'this stage' : `"${String(stageName)}"`
  const remedy = 'Land the predecessor, or re-scope the wave. A stage that builds on an unmerged base produces siblings where the wave declared a stack.'
  if (prior === null || prior === undefined || typeof prior !== 'object' || Array.isArray(prior)) {
    throw new Error(`STOP: ${who} depends on a stage that returned ${prior === undefined ? 'undefined' : JSON.stringify(prior)}. A stage with no result produced no merge. ${remedy}`)
  }
  const record = MINTED.get(prior)
  if (record === undefined) {
    throw new Error(`STOP: ${who} names a predecessor the harness never produced. `
      + 'runStage mints every stage result and baseOfRecord(sha, why) mints a starting point; an object literal spelling cleared: true and land.merged: true asserts a merge that no lander reported and no reviewer cleared. '
      + `Pass the prior stage's own result, or seed the wave with baseOfRecord (G3). Got keys: ${Object.keys(prior).slice(0, 8).join(', ') || 'none'}.`)
  }
  const merged = prior.land && typeof prior.land === 'object' ? prior.land.merged : undefined
  // The stage's pull request number: the result's own, or the build's on a result minted before the field stood.
  const pr = prior.prNumber !== undefined && prior.prNumber !== null ? prior.prNumber : (prior.build && prior.build.prNumber)
  // A predecessor lands by the reviews clearing it, or by an authority's recorded acceptance of its head.
  const accepted = prior.accepted !== null && typeof prior.accepted === 'object' && Number.isInteger(prior.accepted.record)
  if ((prior.cleared !== true && !accepted) || merged !== true) {
    throw new Error(`STOP: ${who} depends on a merge that did not happen. `
      + `cleared=${String(prior.cleared)} merged=${String(merged)} accepted=${accepted ? `record ${prior.accepted.record}` : 'none'} `
      + `stage=${String(prior.stage)} pr=${String(pr)} `
      + `note=${prior.note ? String(prior.note) : 'none'}. ${remedy}`)
  }
  const base = typeof prior.land.mainAfter === 'string' ? prior.land.mainAfter.trim() : ''
  if (base === '') {
    throw new Error(`STOP: ${who} depends on a merge that reported no mainAfter sha (pr=${String(pr)}). `
      + 'The lander reads the merge back from the API and reports mainAfter, so the dependent stage knows its ground. Re-read the merge and supply it.')
  }
  const siblings = reasonText(o.siblingsBecause)
  if (record.consumers.length > 0 && siblings.length < REASON_FLOOR) {
    throw new Error(`STOP: ${who} builds on "${record.stage}", which ${record.consumers.map(function (n) { return `"${n}"` }).join(' and ')} already builds on. `
      + 'Two stages on one predecessor are siblings, and a wave that meant a stack chains the second onto the first. '
      + `Chain them, or declare the branch with siblingsBecause: "<why these two stand side by side>" of at least ${REASON_FLOOR} characters (G3).`)
  }
  record.consumers.push(stageName === undefined || stageName === null ? 'an unnamed stage' : String(stageName))
  return base
}

/**
 * Whether two shas name one commit: equal, or one opens with the other, the shorter holding at least seven hexadecimal
 * characters. A fix agent may return a short sha, and the lander reads the full one from the hosting service.
 */
function sameCommit(a, b) {
  const x = String(a === null || a === undefined ? '' : a).trim().toLowerCase()
  const y = String(b === null || b === undefined ? '' : b).trim().toLowerCase()
  if (!/^[0-9a-f]{7,64}$/.test(x) || !/^[0-9a-f]{7,64}$/.test(y)) return false
  return x === y || x.indexOf(y) === 0 || y.indexOf(x) === 0
}

/**
 * The route a stopped wave goes on by, named by the stage that stopped it: the remainder from that stage is taken into
 * the lock from the wave's report and written by mc17 wave script --resume; where that stage's merge stands although the
 * runner recorded it unmerged, the remainder starts at the stage after it, on that merge.
 */
function remainderRoute(stoppedStage) {
  const stage = stoppedStage === null || stoppedStage === undefined ? '<the stage that stopped the wave>' : stoppedStage
  return `The remainder runs through mc17 wave lock --resume ${stage} --runner-return <the wave's report>, then mc17 wave script --resume; `
    + `where the merge of "${stage}" stands although the runner recorded it unmerged, the remainder starts at the stage after it, with --base at that merge.`
}

/**
 * G2. The stamp every prompt in a stage carries. The resume cache keys on (prompt, options), so a
 * wave that changes its shared code changes its waveId, and every call under the new waveId misses
 * the cache deliberately and visibly. A completed call under the old waveId stays keyed to the old
 * prompt, so it is never replayed against merged pull requests with deleted branches.
 */
function stampPrompt(waveId, stageName, base, scriptFingerprint, declaration) {
  const head = `WAVE ${waveId} | STAGE ${stageName} | BASE ${base}`
  const tail = typeof scriptFingerprint === 'string' && scriptFingerprint.trim() !== ''
    ? ` | SCRIPT ${scriptFingerprint.trim().slice(0, 16)}` : ''
  // A wave that declared something a reader should audit carries the declaration to every agent it
  // launches, so the claim is visible to the people doing the work as well as to the record.
  const declared = typeof declaration === 'string' && declaration.trim() !== ''
    ? `\nWAVE DECLARATION: ${declaration.trim()}` : ''
  return function stamped(role, body) {
    return `${head} | ROLE ${role}${tail}\n${HARNESS_VERSION}${declared}\n\n${body}`
  }
}

// Options the harness owns on every agent call it makes. The review schema carries the verdict
// field the gate reads, and the label and the phase carry the wave stamp. Attack A12
// replaced the review schema through lens.options with a legacy schema holding findings alone, then
// passed gateOpts.missingVerdict to tell the gate to accept a review with no decision: hazard 1
// reached through the sanctioned path, with the fence unmodified and the lint silent. Both keys are
// refused here, where they execute.
const HARNESS_OWNED_OPTION_KEYS = ['schema', 'label', 'phase']

function optionProblems(where, options) {
  const out = []
  if (options === null || options === undefined) return out
  if (typeof options !== 'object' || Array.isArray(options)) {
    out.push(`${where}.options must be an object`)
    return out
  }
  for (let i = 0; i < HARNESS_OWNED_OPTION_KEYS.length; i += 1) {
    const k = HARNESS_OWNED_OPTION_KEYS[i]
    if (Object.prototype.hasOwnProperty.call(options, k)) {
      out.push(`${where}.options sets "${k}", which the harness owns: the review schema carries the verdict field the gate reads (G1) and the label and phase carry the wave stamp (G2)`)
    }
  }
  return out
}

// prNumber is the number of the pull request the build opened, or null where it opened none; the stage stops on null.
const HARNESS_BUILD_SCHEMA = { type: 'object', properties: {
  prNumber: { type: ['number', 'null'] }, headSha: { type: 'string' }, gateTally: { type: 'string' },
  criteriaDischarged: { type: 'array', items: { type: 'string' } },
  controlProofs: { type: 'array', items: { type: 'string' } },
  deviations: { type: 'array', items: { type: 'string' } } }, required: ['prNumber'] }

// P1: severity is closed to FINDING_SEVERITY_ENUM, so an illegal grade cannot return through the
// schema at all. H2a: carriedFrom classifies every re-review finding against the prior round (the
// prior finding id it re-raises, or null when first raised at this head); the field stays off the
// required list because the OPENING round has no prior round to name. bar holds the words of the
// lens's bar that the finding falls under, quoted, or null; fixHunk holds the entry of the fix
// report's changed list that the finding stands in, or null, and null in the opening review.
const HARNESS_REVIEW_SCHEMA = { type: 'object', properties: {
  verdict: { type: 'string', enum: ['PASS', 'BLOCK'] },
  findings: { type: 'array', items: { type: 'object', properties: {
    location: { type: 'string' }, claimed: { type: 'string' }, actual: { type: 'string' },
    evidence: { type: 'string' },
    severity: { type: 'string', enum: FINDING_SEVERITY_ENUM },
    carriedFrom: { type: ['string', 'null'] },
    bar: { type: ['string', 'null'] }, fixHunk: { type: ['string', 'null'] } },
    required: ['location', 'actual', 'evidence', 'severity', 'bar', 'fixHunk'] } } }, required: ['verdict', 'findings'] }

// dispositions is the fix agent's answer to the handoff below, one entry per finding id the runner
// handed it. runStage asserts the coverage after the call, so a fix agent that answers eight of
// thirteen findings stops the stage where the old handoff dropped five of them in silence. changed
// lists the parts of the code the fix's commit changed, each as {file}:{first line}-{last line}, read
// from the commit's own diff against the head the round started from; a re-review of a lens with a
// bar blocks on a new finding only in a part this list names.
const HARNESS_FIX_SCHEMA = { type: 'object', properties: {
  commitSha: { type: 'string' }, applied: { type: 'array', items: { type: 'string' } },
  argued: { type: 'array', items: { type: 'string' } }, gateTally: { type: 'string' },
  changed: { type: 'array', items: { type: 'string' } },
  dispositions: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' },
    disposition: { type: 'string', enum: ['applied', 'argued'] },
    note: { type: 'string' } },
    required: ['id', 'disposition', 'note'] } } },
  required: ['commitSha', 'dispositions', 'changed'] }

const HARNESS_LAND_SCHEMA = { type: 'object', properties: {
  // headSha, declared on the line below, is the head the lander merged: the accepted path reads it against the head the authority accepted, and no other path reads it.
  prNumber: { type: 'number' }, headSha: { type: 'string' }, gateTally: { type: 'string' },
  // mergeSha, declared on the line below, is reserved and unread: the runner compares no sha against it.
  merged: { type: 'boolean' }, mergeSha: { type: 'string' }, mainAfter: { type: 'string' },
  deviations: { type: 'array', items: { type: 'string' } },
  // bypassUsed states whether the merge bypassed a required check, and bypassAuthorization carries the words of the
  // authority that allowed the bypass where it did. A land that states false claims no bypass, whatever the words hold.
  bypassUsed: { type: 'boolean' }, bypassAuthorization: { type: 'string' },
  // blockedBy, declared on the line below, is reserved and unread: a merge check built later must not assume it is populated.
  blockedBy: { type: 'array', items: { type: 'string' } } }, required: ['merged', 'bypassUsed'] }

// Profile 8.13 /. The publisher's return is what `mc17 create` printed: the asset
// id, the title, the local hash and the stored-hash proof, or a failure in the publisher's own
// words. assetId, proven and failure are required, so a publisher that answers with a bare object
// answers with nothing the stage can read as a report, and the stage records that by name.
const HARNESS_PUBLISH_SCHEMA = { type: 'object', properties: {
  assetId: { type: ['string', 'null'] }, title: { type: ['string', 'null'] },
  hash: { type: ['string', 'null'] }, proven: { type: 'boolean' },
  draftHash: { type: ['string', 'null'] },
  failure: { type: ['string', 'null'] } }, required: ['assetId', 'proven', 'failure'] }

// The publisher's return: the answers it wrote, the draft it rendered from them and that draft's hash, or a failure in
// its own words. All three are required, so a publisher that answers with a bare object answers with nothing the rewriter
// below can be measured against.
const HARNESS_DRAFT_SCHEMA = { type: 'object', properties: {
  answersFile: { type: ['string', 'null'] }, draftFile: { type: ['string', 'null'] },
  draftHash: { type: ['string', 'null'] },
  failure: { type: ['string', 'null'] } }, required: ['answersFile', 'draftFile', 'draftHash', 'failure'] }

// The clerk's return at a decision point of the review loop: the operation the command recorded, whether its decision
// record landed, whether the proposal is sealed and the seal's hash, the action where the proposal is open, the kind of the
// point, the executor's validation where a delegation of the stage names the point and none otherwise, the decision
// record's number, and whether the executor lets the stage end early there. Every field is required, so a clerk that
// answers a bare object answers nothing the runner reads as a decision.
const HARNESS_CONVERGE_SCHEMA = { type: 'object', properties: {
  operationId: { type: ['string', 'null'] }, state: { type: 'string', enum: ['recorded', 'failed'] },
  sealed: { type: 'boolean' }, sealHash: { type: ['string', 'null'] },
  action: { type: ['string', 'null'], enum: ['accept', 'targeted-correction', 'gather-evidence', 'change-strategy', 'challenge-threshold', 'defer-improvement', 'escalate-or-stop', null] },
  pointKind: { type: 'string', enum: ['loop-opening', 'loop-rereview', 'loop-before-still-blocking', 'loop-before-landing'] },
  validation: { type: 'string', enum: ['authorized', 'denied', 'stale', 'pending', 'none'] },
  decisionRecord: { type: ['integer', 'null'] }, endEarly: { type: 'boolean' } },
  required: ['operationId', 'state', 'sealed', 'sealHash', 'action', 'pointKind', 'validation', 'decisionRecord', 'endEarly'] }

// The check figure of a facts block: the 32-bit FNV-1a sum of every character of its text, as eight hexadecimal digits.
// The command computes it again over the copy the clerk wrote, so a copy that changed on the way is refused. It is no
// hash of any record.
function factsSum(text) {
  const s = String(text)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return ('0000000' + h.toString(16)).slice(-8)
}

// The rewriter composes its own command line, so it chooses the answers the command renders the draft from. It
// returns the hash it put after --draft-hash, and the stage refuses a publish where that is not the hash the
// publisher read. A rewriter that reports one hash and passes another is not caught here; the stage's result
// carries the publisher's draft, its hash and its answers, so a reader of the record can see what was owed.

function renderPrompt(prompt, ctx) {
  return typeof prompt === 'function' ? String(prompt(ctx)) : String(prompt)
}

// ---------------------------------------------------------------------------------------------
// THE HANDOFF. A gate's output is consumed whole.
//
// The fix prompt used to carry `JSON.stringify(findings, null, 1).slice(0, 9000)`. A review that
// returned thirteen findings reached the fix agent as eight: the string ended mid-finding at nine
// thousand characters and five findings arrived as nothing, with no error, no count, and no trace in
// the record. Two lenses on a real change pass nine thousand characters routinely, and the review
// that blocked VERT stage A returned five findings whose evidence fields alone run to several
// thousand characters each. The runner that exists to hold a review's output therefore reproduced
// the hazard it was built to prevent.
//
// Four properties answer it. Every finding carries an id the runner assigns, so a disposition names
// one finding. Every finding carries its own CONTENT into the prompt. An index of every finding (id,
// severity, location) goes in beside it, so the ids a prompt names are the ids the reviewers
// returned. And the handoff states its own arithmetic, so a fix agent reads how many findings exist
// beside how many arrived whole and how many arrived with a long field clipped.
//
// G6, THE CEILING. The first repair spent the budget first-come-first-served: it cut at a finding
// boundary, kept the first finding whole whatever its size, and let every later finding fall back to
// its id, its severity word and its location. That is a carrier that identifies a finding and states
// nothing about it, and two lenses measured what it costs. One 400000-character evidence field pushed
// 12 of 13 findings to index-only, because the pathological field the ceiling exists to contain was
// the one thing guaranteed to survive it. Two hundred ordinary findings lost the content of 117. A
// finding with no location field arrived as the complete line "[R1F2] severity high at location
// unstated", and an honest fix agent that answered "the prompt gave me a severity word and no text,
// so I never saw the defect and I changed nothing" cleared the coverage assertion and landed the
// stage. The first repair also broke its own two stated bounds: keeping the first finding whole put
// 130631 characters of handoff text under a declared 120000-character ceiling, and the index it
// called one that "always fits" had no aggregate bound of any kind.
//
// So the ceiling is now a PER-FINDING BUDGET, and the bounds are real:
//   * every finding gets FINDINGS_TEXT_CEILING / total, and never less than HANDOFF_MIN_BODY;
//   * a finding over its budget is clipped FIELD BY FIELD by max-min fair allocation, so the short
//     fields (location, severity, claimed) stay whole and the one fat field pays for itself, and each
//     clip is disclosed in place with the characters shown and the characters withheld;
//   * the index carries every id and is bounded in aggregate, with the bound stated where it bites;
//   * past the point where even HANDOFF_MIN_BODY per finding overruns the ceiling, the handoff reports
//     overflow and runStage STOPS THE STAGE. The arithmetic of a set too large to carry is answered by
//     refusing to land it, and never by dropping the tail of it into an index.
// ---------------------------------------------------------------------------------------------
const FINDINGS_TEXT_CEILING = 120000
const FIX_REPORT_CEILING = 20000
const HANDOFF_LINE_CEILING = 300
// The least content a finding travels with. Below this a finding is a label, which is the carrier
// G6 measured, so the runner refuses the whole set at that point and carries no finding that way.
const HANDOFF_MIN_BODY = 600
// The aggregate bound on the index. The overflow stop above trips first on every set the index could
// overrun (200 findings of 300 index characters is 60000), so this bound is a floor under a claim the
// file makes, and a sanctioned wave reaches it never; it exists because "always fits" was
// asserted in a comment and carried by nothing.
const HANDOFF_INDEX_CEILING = 80000

function clipLine(text, ceiling) {
  const s = String(text).replace(/\s+/g, ' ').trim()
  const max = Number.isInteger(ceiling) && ceiling > 16 ? ceiling : HANDOFF_LINE_CEILING
  return s.length <= max ? s : `${s.slice(0, max - 14)} [line clipped]`
}

/**
 * G6 finding 5. Reviewer-supplied text on its way into a reason line or a prompt line: one line,
 * bounded, and JSON-escaped, so it arrives as a quoted token. A raw paste of this text forged a
 * complete findings block above the real one, and every carrier of reviewer text in the handoff
 * except this one was already escaped or collapsed.
 */
function promptQuote(value, ceiling) {
  const one = String(value === null || value === undefined ? '' : value).replace(/[\s\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, ' ').trim()
  const max = Number.isInteger(ceiling) && ceiling > 24 ? ceiling : HANDOFF_LINE_CEILING
  return JSON.stringify(one.length <= max ? one : `${one.slice(0, max - 14)} [clipped]`)
}

/**
 * G6 finding 6. JSON.stringify over reviewer data with no guard took the stage down three ways: a
 * BigInt field threw "Do not know how to serialize a BigInt", an own toJSON returning undefined threw
 * on `body.length`, and a throwing enumerable getter propagated. All three were fail-closed for the
 * merge and left WAVE_STATE.stopped null, because stopWave never ran, so the wave-stop bookkeeping
 * recorded nothing about the stage that died.
 *
 * This serializer reads own enumerable keys itself, so no toJSON of a reviewer's choosing runs, every
 * property read sits inside a guard, and every value resolves to something printable. It returns a
 * string for every input.
 */
function safeStringify(value, indent) {
  const seen = []
  const render = function (v, depth) {
    if (v === null) return 'null'
    const t = typeof v
    if (t === 'string') return JSON.stringify(v)
    if (t === 'number') return Number.isFinite(v) ? String(v) : JSON.stringify(`the reviewer sent the number ${String(v)}`)
    if (t === 'boolean') return v ? 'true' : 'false'
    if (t === 'undefined') return 'null'
    if (t === 'bigint') return JSON.stringify(`${String(v)} (the reviewer sent a BigInt)`)
    if (t === 'function') return JSON.stringify('the reviewer sent a function')
    if (t === 'symbol') { try { return JSON.stringify(`the reviewer sent the symbol ${String(v)}`) } catch (e) { return JSON.stringify('the reviewer sent a symbol') } }
    if (t !== 'object') return JSON.stringify(`the reviewer sent a ${t}`)
    if (seen.indexOf(v) >= 0) return JSON.stringify('a cycle back to a value already printed above')
    if (depth > 8) return JSON.stringify('nested past the depth this handoff prints')
    seen.push(v)
    const pad = indent > 0 ? '\n'.padEnd(1 + indent * (depth + 1), ' ') : ''
    const close = indent > 0 ? '\n'.padEnd(1 + indent * depth, ' ') : ''
    let out
    if (Array.isArray(v)) {
      const parts = []
      for (let i = 0; i < v.length; i += 1) {
        let item
        try { item = v[i] } catch (e) { item = `a getter that threw: ${e && e.message ? e.message : 'no message'}` }
        parts.push(render(item, depth + 1))
      }
      out = parts.length === 0 ? '[]' : `[${pad}${parts.join(`,${pad}`)}${close}]`
    } else {
      let keys
      try { keys = Object.keys(v) } catch (e) { keys = [] }
      const parts = []
      for (let i = 0; i < keys.length; i += 1) {
        let item
        try { item = v[keys[i]] } catch (e) { item = `a getter that threw: ${e && e.message ? e.message : 'no message'}` }
        parts.push(`${JSON.stringify(keys[i])}: ${render(item, depth + 1)}`)
      }
      out = parts.length === 0 ? '{}' : `{${pad}${parts.join(`,${pad}`)}${close}}`
    }
    seen.pop()
    return out
  }
  try { return render(value, 0) } catch (e) {
    return JSON.stringify(`this finding could not be printed at all (${e && e.message ? e.message : 'no message'}), and it stands against the change whatever it holds`)
  }
}

// The field names a reviewer files a finding under. A plain object carrying any of them is one
// finding, which is how readFindingsContainer tells a single finding from a container of findings.
const FINDING_FIELD_NAMES = ['location', 'claimed', 'actual', 'evidence', 'severity', 'title',
  'summary', 'description', 'detail', 'file', 'line', 'category', 'verdict_impact', 'reproduction']

/**
 * G6 finding 1, the harvest's reader. A findings set arrives in whatever container the reviewer chose,
 * and the old harvest kept exactly one of them: `Array.isArray(r.findings) ? r.findings : []`. Six
 * container shapes were driven against that line and all six merged with the set dropped and nothing
 * recorded: an object keyed by finding id, a JSON string, an array-like object, a Set, one level of
 * nesting, and the whole review returned as an array of findings. The gate on the same file grades a
 * non-array findings list as blocking, so this was the one reader in the runner that treated the state
 * as impossible.
 *
 * Returns { findings, how }, where `how` states the carriage in words the prompt and the record both
 * print. A container this function cannot read yields findings: [] with `how` naming what arrived, and
 * the caller mints a finding out of that fact, so the outcome of an unreadable container is a finding
 * the fix agent must answer for and never an empty set.
 */
function readFindingsContainer(container, depth) {
  const d = Number.isInteger(depth) ? depth : 0
  if (container === null || container === undefined) {
    return { findings: [], how: container === null ? 'the findings field was null' : 'the findings field was absent' }
  }
  if (Array.isArray(container)) {
    // One level of nesting: a reviewer that grouped its findings per file returns an array of arrays.
    let nested = 0
    const flat = []
    for (let i = 0; i < container.length; i += 1) {
      if (Array.isArray(container[i]) && d < 2) {
        nested += 1
        Array.prototype.push.apply(flat, readFindingsContainer(container[i], d + 1).findings)
        continue
      }
      flat.push(container[i])
    }
    return { findings: flat, how: nested > 0 ? `an array holding ${nested} nested array(s) of findings, flattened` : 'an array' }
  }
  if (typeof container === 'string') {
    const text = container.trim()
    if (text === '') return { findings: [], how: 'the findings field was an empty string' }
    let parsed = null
    let ok = false
    try { parsed = JSON.parse(text); ok = true } catch (e) { ok = false }
    if (ok && parsed !== null && typeof parsed === 'object' && d < 2) {
      const inner = readFindingsContainer(parsed, d + 1)
      return { findings: inner.findings, how: `a JSON string that parsed to ${inner.how}` }
    }
    return { findings: [{ actual: text, severity: 'ungraded', location: 'the reviewer sent prose where a findings list belongs' }],
      how: 'a string that is no JSON, carried as one finding holding the whole text' }
  }
  if (typeof container !== 'object') {
    return { findings: [], how: `the findings field was a ${typeof container}` }
  }
  // A Set, a Map's values, a generator's result: anything the reviewer's runtime iterates.
  let iterable = false
  try { iterable = typeof container[Symbol.iterator] === 'function' } catch (e) { iterable = false }
  if (iterable) {
    let items = null
    try { items = Array.from(container) } catch (e) { items = null }
    if (items !== null) {
      const inner = d < 2 ? readFindingsContainer(items, d + 1) : { findings: items, how: 'an array' }
      return { findings: inner.findings, how: `an iterable of ${items.length} item(s), read in order` }
    }
  }
  // An array-like: { 0: f, 1: f, length: 2 }, which JSON round trips out of some runtimes.
  let len = null
  try { len = container.length } catch (e) { len = null }
  if (Number.isInteger(len) && len >= 0 && len < 100000) {
    const items = []
    for (let i = 0; i < len; i += 1) {
      try { items.push(container[i]) } catch (e) { items.push(null) }
    }
    return { findings: items, how: `an array-like object of length ${len}` }
  }
  let keys = null
  try { keys = Object.keys(container) } catch (e) { keys = null }
  if (keys === null) return { findings: [], how: 'an object whose keys could not be read' }
  // A plain object carrying finding fields is ONE finding, not a container of them.
  const looksLikeOne = keys.some(function (k) { return FINDING_FIELD_NAMES.indexOf(k) >= 0 })
  if (looksLikeOne) return { findings: [container], how: 'a single finding object, carried as a set of one' }
  const values = []
  for (let i = 0; i < keys.length; i += 1) {
    try { values.push(container[keys[i]]) } catch (e) { values.push(null) }
  }
  const allObjects = values.length > 0 && values.every(function (v) { return v !== null && typeof v === 'object' })
  if (allObjects) {
    return { findings: values, how: `an object keyed by finding id (${keys.length} key(s)), read as its values` }
  }
  return { findings: [], how: `an object of ${keys.length} key(s) that carries neither findings nor finding fields` }
}

/**
 * G6 findings 1, 9 and 14. Every finding EVERY live review returned, and a minted finding for every
 * blocking review that named none the runner could read.
 *
 * Three defects met here. The harvest ran over `blockers` alone, so three findings a lens filed on a
 * clearing verdict reached nobody and appeared in no count while the runner's own rule reads "a gate's
 * output is consumed whole". The container reader above was `Array.isArray` alone. And when the two
 * combined to produce an empty list, dispositionGap returned null on its first line, so a blocking
 * review reached a merge with the fix agent told "0 finding(s) stand against PR #91": hazard 1's
 * outcome through the repaired handoff, more complete than hazard 4 itself.
 *
 * The minted finding is the mechanism that closes the vacuous pass. A gate that blocked always yields
 * at least one finding for the fix agent to answer, and it carries the gate's own reason as its text.
 *
 * `reasons`, where given, holds the judged reason of each review, null where it blocks nothing, and the
 * harvest reads it in place of the verdict-first gate; so a BLOCK whose findings all fall outside its
 * lens's bar gets no finding minted for it.
 */
function harvestFindings(reviews, gateOpts, lensNames, reasons) {
  const list = Array.isArray(reviews) ? reviews : [reviews]
  const findings = []
  const carriage = []
  for (let i = 0; i < list.length; i += 1) {
    const review = list[i]
    const who = lensNames && typeof lensNames[i] === 'string' && lensNames[i] !== '' ? lensNames[i] : `lens ${i + 1}`
    const reason = Array.isArray(reasons) && i < reasons.length ? reasons[i] : blockingReason(review, gateOpts)
    // The whole review returned as an array is an array of findings: the gate blocks it as an
    // unreadable review, and its contents are still the reviewer's output.
    const container = Array.isArray(review) ? review
      : (review !== null && typeof review === 'object' ? review.findings : undefined)
    const read = readFindingsContainer(container, 0)
    const before = findings.length
    Array.prototype.push.apply(findings, read.findings)
    const got = findings.length - before
    if (reason !== null && got === 0) {
      findings.push({
        location: `the ${who} review of this stage, which the gate blocked`,
        claimed: 'the reviewer named a defect the runner could read',
        actual: `THE GATE BLOCKED ON THIS REVIEW AND NO READABLE FINDING CAME WITH IT. ${reason}`,
        evidence: `The runner read this review's findings as ${read.how}, and took ${got} finding(s) out of it. `
          + 'This finding is the runner\'s own, minted so that a blocking review reaches the fix agent as at least one '
          + 'thing to answer for. Read the review again at its source: either the defect it blocked on is real and unstated, '
          + 'or the reviewer returned a shape the gate reads as unreadable, and both are yours to resolve before this lands.',
        severity: 'high',
        mintedByTheRunner: true,
      })
    }
    carriage.push({ lens: who, blocked: reason !== null, reason, carriedAs: read.how, findings: got,
      minted: reason !== null && got === 0 })
  }
  return { findings, carriage }
}

/**
 * H2 (Record 104). The cross-round finding ledger's partition. Wave six re-verified every prior
 * finding under a fresh number each round, so the standing count grew 14, 17, 20, 23 across four
 * rounds while PERSISTENT stayed zero, and a growing count reads as a repair that keeps failing.
 * The re-review classifies every finding it returns: carriedFrom names the prior finding id it
 * re-raises, or null when it is first raised at this head. A finding whose carriedFrom names an
 * id a prior fix round answered for is PERSISTENT (a repair that was claimed closed and did not
 * close); everything else is NEW, presented with the grades it arrived under. The partition
 * changes what the record says and nothing about the gate: G1 reads the verdict first either way.
 */
function partitionLedger(findings, priorIds, round) {
  const list = Array.isArray(findings) ? findings : []
  const grades = []
  let persistent = 0
  let firstRaised = 0
  for (let i = 0; i < list.length; i += 1) {
    const f = list[i]
    const from = f !== null && f !== undefined && typeof f === 'object' && typeof f.carriedFrom === 'string'
      ? f.carriedFrom.trim() : ''
    if (from !== '' && priorIds !== null && priorIds !== undefined && priorIds.has(from)) { persistent += 1; continue }
    firstRaised += 1
    const sev = f !== null && f !== undefined && typeof f === 'object' && f.severity !== null && f.severity !== undefined
      ? String(f.severity).replace(/\s+/g, ' ').trim().toLowerCase() : ''
    const word = sev === '' ? 'ungraded' : clipLine(sev, 40)
    if (grades.indexOf(word) < 0) grades.push(word)
  }
  return { persistent, new: firstRaised,
    presented: `round ${round}: ${persistent} persistent, ${firstRaised} new${firstRaised > 0 ? ` (grade ${grades.join(', ')})` : ''}` }
}

/**
 * The id a disposition names. Round-scoped, so a round-2 report carries round-2 ids and a
 * disposition copied from an earlier round arrives as an id this round never handed out.
 */
function findingsWithIds(findings, round) {
  const out = []
  const list = Array.isArray(findings) ? findings : []
  for (let i = 0; i < list.length; i += 1) {
    const f = list[i]
    const id = `R${round}F${i + 1}`
    if (f === null || typeof f !== 'object' || Array.isArray(f)) {
      // G6. A string finding used to be clipped here at 300 characters, losing 3700 of a
      // 4000-character one before the ceiling ever saw it. The whole value travels now, and the
      // per-finding budget in findingsHandoff is the one place a length decision is taken.
      out.push({ id, unreadableFinding: `the review returned ${f === null ? 'null' : (Array.isArray(f) ? 'an array' : typeof f)} in its findings array`,
        value: String(f) })
      continue
    }
    const copy = { id }
    let keys = []
    try { keys = Object.keys(f) } catch (e) { keys = [] }
    for (let k = 0; k < keys.length; k += 1) {
      let value
      try { value = f[keys[k]] } catch (e) { value = `a getter that threw: ${e && e.message ? e.message : 'no message'}` }
      if (keys[k] !== 'id') { copy[keys[k]] = value; continue }
      // G6. The runner's id wins the `id` key and the reviewer's own id keeps a name of its
      // own. The rename used to land on `reviewerId` unconditionally, so a finding carrying both keys
      // lost the reviewer's id with nothing said: {id: 'R1F9', reviewerId: 'spoof'} arrived as
      // {"id":"R1F1","reviewerId":"spoof"} and R1F9 was gone.
      let target = 'reviewerId'
      let n = 2
      while (Object.prototype.hasOwnProperty.call(copy, target) || keys.indexOf(target) >= 0) {
        target = `reviewerId${n}`
        n += 1
      }
      copy[target] = value
    }
    out.push(copy)
  }
  return out
}

/**
 * One line per finding, whatever the budget did to the full text. This list names every id, and its
 * aggregate length is bounded and states the bound where it bites (G6 finding 15: the file used to
 * claim an index that "always fits" and carried no aggregate bound at all).
 */
function findingIndexLines(indexed) {
  const lines = []
  let used = 0
  let dropped = 0
  for (let i = 0; i < indexed.length; i += 1) {
    const f = indexed[i]
    const sev = f.severity === null || f.severity === undefined || String(f.severity).trim() === ''
      ? 'severity ungraded' : `severity ${clipLine(f.severity, 40)}`
    const loc = f.location === null || f.location === undefined || String(f.location).trim() === ''
      ? 'location unstated' : clipLine(f.location, 160)
    const line = clipLine(`  [${f.id}] ${sev} at ${loc}`, HANDOFF_LINE_CEILING)
    if (used + line.length > HANDOFF_INDEX_CEILING) { dropped += 1; continue }
    lines.push(line)
    used += line.length + 1
  }
  if (dropped > 0) {
    lines.push(`  [index bounded] ${dropped} further id(s) of ${indexed.length} run past this index's `
      + `${HANDOFF_INDEX_CEILING}-character bound. A set this large stops the stage at the overflow check, so no `
      + 'wave lands on an index this line has cut.')
  }
  return lines
}

/**
 * G6 finding 2. One finding clipped to its share of the ceiling, field by field, by max-min fair
 * allocation: the fields shorter than an equal share stay whole and give their remainder back, so the
 * one pathological field pays for its own size and every other field of the finding survives. Each
 * clip is disclosed in place with the characters shown and the characters withheld.
 *
 * Returns { body, clippedFields }. `body` is at or under `budget` wherever a representation of the
 * finding fits at all.
 */
// The disclosure a clipped field carries, and its cost in characters. The cost is charged only against
// the allocation of a field that is actually clipped, so a finding of five short fields and one fat one
// pays for one disclosure and not six. Charging it against every field is what drove a 600-character
// budget into the carrier of last resort on an ordinary finding during this repair.
const CLIP_DISCLOSURE_COST = 48
const MIN_CLIPPED_FIELD = 24

function clipFindingToBudget(finding, budget, indent) {
  const whole = safeStringify(finding, indent)
  if (whole.length <= budget) return { body: whole, clippedFields: [] }
  let keys = []
  try { keys = Object.keys(finding) } catch (e) { keys = [] }
  const clippable = []
  const skeleton = {}
  for (let i = 0; i < keys.length; i += 1) {
    const k = keys[i]
    let v
    try { v = finding[k] } catch (e) { v = null }
    // The id is the identity a disposition names, so it is never a candidate for clipping.
    if (k !== 'id' && typeof v === 'string' && v.length > MIN_CLIPPED_FIELD) {
      clippable.push({ key: k, len: v.length })
      skeleton[k] = ''
    } else {
      skeleton[k] = v
    }
  }
  const overhead = safeStringify(skeleton, indent).length
  let available = budget - overhead
  if (clippable.length === 0 || available < CLIP_DISCLOSURE_COST + MIN_CLIPPED_FIELD) {
    // No allocation of the string fields brings this finding under its budget, so the finding travels as
    // its identity plus a statement of what it holds and where to read it. This is the carrier of last
    // resort, it is reported in clippedFields, and it is reachable only on a finding whose own field
    // NAMES run past the budget.
    const reduced = { id: finding.id, severity: finding.severity, location: finding.location,
      theRunnerCouldNotFitThisFinding: `this finding serializes to ${whole.length} characters against a per-finding budget of `
        + `${budget}, and its ${keys.length} field name(s) alone take ${overhead} of it, so no field content fits. `
        + 'Read it at its source. It stands against the change.' }
    return { body: safeStringify(reduced, indent), clippedFields: keys.slice() }
  }
  // MAX-MIN FAIR ALLOCATION. Shortest field first: a field under its equal share takes what it needs and
  // hands the remainder back, so the long field pays for its own size and the short fields stay whole.
  const order = clippable.slice().sort(function (a, b) { return a.len - b.len })
  const share = {}
  let remaining = order.length
  for (let i = 0; i < order.length; i += 1) {
    const fair = Math.floor(available / remaining)
    const take = Math.min(order[i].len, fair)
    share[order[i].key] = take
    available -= take
    remaining -= 1
  }
  const clipped = {}
  const clippedFields = []
  for (let i = 0; i < keys.length; i += 1) {
    const k = keys[i]
    let v
    try { v = finding[k] } catch (e) { v = null }
    if (share[k] === undefined || share[k] >= v.length) { clipped[k] = v; continue }
    const show = Math.max(0, share[k] - CLIP_DISCLOSURE_COST)
    clipped[k] = `${v.slice(0, show)} [field clipped: ${show} of ${v.length} characters shown]`
    clippedFields.push(k)
  }
  return { body: safeStringify(clipped, indent), clippedFields }
}

/**
 * The findings block both the fix agent and the re-reviewer read. Returns
 * { text, ids, total, passedInFull, clippedIds, indexedOnly, overflow, overflowNote, budget }.
 */
function findingsHandoff(indexed, prNumber) {
  const list = Array.isArray(indexed) ? indexed : []
  const total = list.length
  const ids = list.map(function (f) { return f.id })
  const index = findingIndexLines(list).join('\n')
  // THE PER-FINDING BUDGET. Every finding gets an equal share and never less than the floor, so the
  // arithmetic is settled before any finding is read and no finding's size decides another's fate.
  const budget = total === 0 ? FINDINGS_TEXT_CEILING : Math.max(HANDOFF_MIN_BODY, Math.floor(FINDINGS_TEXT_CEILING / total))
  const overflow = total > 0 && total * HANDOFF_MIN_BODY > FINDINGS_TEXT_CEILING
  const overflowNote = overflow
    ? `${total} finding(s) stand, and carrying each of them with the floor of ${HANDOFF_MIN_BODY} characters of its own text `
      + `needs ${total * HANDOFF_MIN_BODY} characters against a findings ceiling of ${FINDINGS_TEXT_CEILING}. `
      + 'The runner will not resolve that by dropping the tail of the set into an index, so it stops the stage: '
      + 'split the change, or have the reviewers file against the parts separately.'
    : null
  const bodies = []
  const clippedIds = []
  let passedInFull = 0
  if (!overflow) {
    for (let i = 0; i < total; i += 1) {
      const one = clipFindingToBudget(list[i], budget, 1)
      bodies.push(one.body)
      if (one.clippedFields.length === 0) passedInFull += 1
      else clippedIds.push(list[i].id)
    }
  }
  // indexedOnly stays in the return shape and stays empty on every set the runner carries: a finding
  // whose content never travelled is the carrier G6 measured, and the overflow stop above is
  // what replaced it. The field is here so a reader of a stage result sees the count is zero.
  const indexedOnly = overflow ? ids.slice() : []
  const head = `FINDINGS: ${total} finding(s) stand against PR #${prNumber}. `
    + `${passedInFull} of ${total} appear below in their whole text, and ${clippedIds.length} of ${total} appear below with `
    + `long field(s) clipped to this handoff's per-finding budget of ${budget} characters, each clip disclosed in place. `
    + `${indexedOnly.length} of ${total} appear in the index alone. `
    + 'The index that follows carries every one of them.'
  const clipNote = clippedIds.length === 0 ? '' : `THE ${clippedIds.length} FINDING(S) WHOSE LONG FIELDS WERE CLIPPED: ${clippedIds.join(', ')}. `
    + 'Each clip names the characters shown and the characters withheld, in place, inside the field. '
    + 'Every one of those findings carries its location and its own text, so you read the rest at the location it names, '
    + 'and you treat it exactly as you treat a finding that arrived whole.\n'
  const tail = overflow
    ? `NO FINDING TEXT APPEARS BELOW, AND THIS STAGE STOPS. ${overflowNote}`
    : `${clipNote}FULL TEXT OF ALL ${total} FINDING(S), ${passedInFull} whole and ${clippedIds.length} clipped:`
  return {
    text: `${head}\nEVERY FINDING, INDEXED BY ID:\n${index}\n${tail}\n${bodies.join('\n')}\n`,
    ids,
    total,
    passedInFull,
    clippedIds,
    indexedOnly,
    overflow,
    overflowNote,
    budget,
  }
}

/**
 * The coverage assertion over the fix agent's report. Returns null when every id the runner handed
 * out comes back with a disposition of "applied" or "argued" and a note, else the message runStage
 * stops the stage with, naming the ids that came back with nothing said about them.
 */
function dispositionGap(ids, fixed) {
  // G6. This early return is the vacuous pass that let a blocking review reach a
  // merge: with the harvest dropping the set, `ids` arrived empty and the coverage assertion cleared
  // with nothing checked. It stays, because a stage that took no round hands out no ids, and the thing
  // that closed the hazard sits upstream in harvestFindings, which mints a finding for any blocking
  // review that named none. runStage asserts that pairing directly (an empty id list inside a round is
  // a runner defect and stops the stage), so this line can no longer be reached with a block standing.
  if (ids.length === 0) return null
  const report = fixed !== null && typeof fixed === 'object' && !Array.isArray(fixed) ? fixed : {}
  if (!Array.isArray(report.dispositions)) {
    return `the fix agent returned ${report.dispositions === undefined ? 'no dispositions field' : `a dispositions field of type ${typeof report.dispositions}`}, `
      + `so all ${ids.length} finding(s) it was handed come back with nothing said about them: ${ids.join(', ')}`
  }
  const covered = new Set()
  const seen = new Set()
  const malformed = []
  const unknown = []
  const repeated = []
  for (let i = 0; i < report.dispositions.length; i += 1) {
    const d = report.dispositions[i] !== null && typeof report.dispositions[i] === 'object' && !Array.isArray(report.dispositions[i])
      ? report.dispositions[i] : {}
    const id = typeof d.id === 'string' ? d.id.trim() : ''
    const word = typeof d.disposition === 'string' ? d.disposition.trim().toLowerCase() : ''
    if (ids.indexOf(id) < 0) { unknown.push(id === '' ? `entry ${i + 1} with no id` : promptQuote(id, 60)); continue }
    // G6. One decision object had two readers that disagreed: this loop credited an id if
    // ANY entry for it was well formed, so the last entry decided, while dispositionLines showed the
    // re-reviewer the FIRST entry for that id. A report filing "deferred" first and "applied" second
    // therefore cleared the gate on the second entry while the re-reviewer read the first. A repeated
    // id is now the report's own defect, credited to nobody, so the two readers have nothing left to
    // disagree about.
    if (seen.has(id)) { repeated.push(id); covered.delete(id); continue }
    seen.add(id)
    if (word !== 'applied' && word !== 'argued') {
      malformed.push(`${id} (disposition ${promptQuote(d.disposition === undefined ? 'absent' : d.disposition, 60)}, and the words are "applied" and "argued")`)
      continue
    }
    // G6. The note used to be a presence check, so a one-character note or "see
    // above" cleared the assertion. That leniency is what let a fix agent answer a finding it had
    // never read: paired with a carrier that passed a severity word and no text, an honest "I never
    // saw this one" cleared the gate and landed the stage. A note carries evidence, and evidence has
    // a floor, the same floor every other written reason in this runner answers to.
    const note = reasonText(d.note)
    if (note === '') { malformed.push(`${id} (disposition ${word} with an empty note)`); continue }
    if (note.length < REASON_FLOOR) {
      malformed.push(`${id} (disposition ${word} with a note of ${note.length} characters, and a note carries the evidence, so it runs to at least ${REASON_FLOOR})`)
      continue
    }
    covered.add(id)
  }
  const missing = ids.filter(function (id) { return !covered.has(id) })
  if (missing.length === 0 && repeated.length === 0) return null
  return `the fix agent dispositioned ${covered.size} of ${ids.length} finding(s) it was handed. `
    + `MISSING: ${missing.length === 0 ? 'none' : missing.join(', ')}.`
    + `${malformed.length > 0 ? ` MALFORMED: ${malformed.join('; ')}.` : ''}`
    + `${repeated.length > 0 ? ` NAMED AN ID MORE THAN ONCE, so two entries claim one finding and no reader can say which one stands: ${repeated.join(', ')}.` : ''}`
    + `${unknown.length > 0 ? ` NAMED AN ID THIS ROUND NEVER HANDED OUT: ${unknown.join(', ')}.` : ''}`
}

/**
 * G6 finding 2, the residual the runner cannot close by itself. A fix agent can file "argued" on a finding
 * and change nothing, and no runner can grade the prose of the argument: judging a note by its words would
 * be a denylist over natural language, which is the layer error this whole file was rewritten to stop
 * making. What a runner CAN do is make the argued set impossible to skim past. So the ids the fix agent
 * argued, as against the ones it applied, are counted and named in the re-review prompt above the per-id claims, and the
 * re-reviewer is told that an argued id needs a reproduction it performs itself. The reader for the claim is
 * the re-reviewer, and this is the runner handing it the list.
 */
function arguedIds(ids, fixed) {
  const list = fixed !== null && typeof fixed === 'object' && !Array.isArray(fixed) && Array.isArray(fixed.dispositions)
    ? fixed.dispositions : []
  const out = []
  for (let i = 0; i < list.length; i += 1) {
    const d = list[i] !== null && typeof list[i] === 'object' && !Array.isArray(list[i]) ? list[i] : {}
    const id = typeof d.id === 'string' ? d.id.trim() : ''
    const word = typeof d.disposition === 'string' ? d.disposition.trim().toLowerCase() : ''
    if (word === 'argued' && ids.indexOf(id) >= 0 && out.indexOf(id) < 0) out.push(id)
  }
  return out
}

/**
 * What the fix agent claimed, per id, for the re-reviewer to reproduce. Always complete.
 *
 * G6 finding 19: this reader keeps the FIRST entry for an id and dispositionGap credited the LAST, so
 * the gate and the re-reviewer could read two different claims about one finding. dispositionGap now
 * refuses a repeated id outright, which stops the stage before this function is ever asked to choose,
 * and the first-entry rule below stands as the answer for the one caller that reads a report the gate
 * has not passed.
 */
function dispositionLines(ids, fixed) {
  const list = fixed !== null && typeof fixed === 'object' && !Array.isArray(fixed) && Array.isArray(fixed.dispositions)
    ? fixed.dispositions : []
  const byId = {}
  const repeats = {}
  for (let i = 0; i < list.length; i += 1) {
    const d = list[i] !== null && typeof list[i] === 'object' && !Array.isArray(list[i]) ? list[i] : {}
    const id = typeof d.id === 'string' ? d.id.trim() : ''
    if (id === '') continue
    if (byId[id] === undefined) { byId[id] = d; continue }
    repeats[id] = (repeats[id] || 1) + 1
  }
  return ids.map(function (id) {
    const d = byId[id]
    if (d === undefined) return `  [${id}] the fix agent said nothing about this finding`
    const more = repeats[id] === undefined ? ''
      : ` [the report filed ${repeats[id]} entries for this id, and this is the first; the stage stops on a repeated id]`
    return clipLine(`  [${id}] ${clipLine(d.disposition === undefined ? 'no disposition word' : d.disposition, 40)}: `
      + `${d.note === undefined ? '' : String(d.note)}${more}`, HANDOFF_LINE_CEILING)
  })
}

/**
 * The fix agent's own report, bounded, with the bound stated where it applies. G6 finding 6: this ran
 * JSON.stringify over agent data too, so the same BigInt that took the handoff down took this line
 * with it.
 */
function boundedFixReport(fixed) {
  const text = safeStringify(fixed === undefined ? null : fixed, 0)
  if (text.length <= FIX_REPORT_CEILING) {
    return `THE FIX AGENT'S OWN REPORT, ${text.length} characters, whole (this one field is bounded at ${FIX_REPORT_CEILING} characters):\n${text}`
  }
  return `THE FIX AGENT'S OWN REPORT, ${text.length} characters, of which the first ${FIX_REPORT_CEILING} appear here: `
    + 'that bound applies to this field alone, and the per-finding claims above carry every id whatever this bound did.\n'
    + text.slice(0, FIX_REPORT_CEILING)
}

// H1, THE IDENTITY OF A REVIEW RETURN. The first shape of
// the dead-slot repair padded a short parallel() return with nulls AT THE END and retried by index,
// which assumes the runtime lost the TRAILING calls. The compacting primitive G6 names
// ("settles all calls and keeps the ones that returned") keeps survivors in call order but at
// compacted positions, so a death of any non-trailing lens was misattributed: the survivor's review
// slid into the dead lens's slot, the SURVIVOR was retried and reviewed twice, the dead lens was
// never re-asked, the harness log named the wrong lens, and a returned verdict the runtime dropped
// was silently replaced by the other lens's (a returned BLOCK became the survivor's PASS, merged
// with rounds=0). So the runner carries each review's identity through parallel() itself: every
// roster call resolves to a slot-marked envelope minted here, and the roster is rebuilt BY SLOT,
// not by position. A slot no envelope came back for IS the lens that died, whatever position the
// survivors came back at.
//
// H3, THE CLONE (the first live wave on the repaired runner, wf_8c6036f6-4a9). The mark used to be
// a module-private frozen object compared by identity, chosen so no agent return (JSON by schema)
// could forge an envelope. The LIVE parallel() primitive JSON-clones every settled value, and a
// clone keeps the mark's shape while losing its identity: rosterFromParallel recognized nothing,
// its unmarked fallback filled every slot with an envelope CLONE, the gate read objects carrying
// no verdict field, the harvest minted findings for three rounds, and the wave stopped at
// maxRounds with six PASS re-reviews standing unread in the journal. The re-review lens had named
// exactly this bound as RR2-info-clone-strips-mark-fails-closed. So the mark is a STRING, which
// survives any JSON round trip, and rosterFromParallel recognizes an envelope by SHAPE: a plain
// object whose mark equals this string, whose slot is an integer inside the roster, and which
// carries a review property. A string mark is forgeable where an object mark was not, and the
// price is stated: a forged envelope claims only an UNCLAIMED slot (a slot already claimed keeps
// its first envelope and the forgery's review goes to the surplus the gate still reads), and a
// forged review faces the same gate every review faces, where anything without a readable
// clearing verdict blocks (G1, fail-closed). The F1 protection survives structurally: the slot
// index rides inside the envelope, so a compacted return still attributes each review to the lens
// that produced it, cloned or not.
const LENS_SLOT_MARK = 'LENS-SLOT-ENVELOPE minted by runStage through envelopedLensCalls (H1/H3: a string mark survives the JSON clone the live parallel() applies)'

function envelopedLensCalls(calls) {
  return calls.map(function (call, slot) {
    return function () {
      return Promise.resolve(call()).then(function (review) {
        return { mark: LENS_SLOT_MARK, slot, review: review === undefined ? null : review }
      })
    }
  })
}

/**
 * The clone-proof envelope test (H3). An envelope is recognized by SHAPE, never by identity: a
 * plain object whose mark equals the string constant above, whose slot is an integer inside the
 * roster, and which carries a review property. Every one of those properties survives
 * JSON.parse(JSON.stringify(v)), which is what the live parallel() applies to settled values, so a
 * cloned envelope reads exactly as the envelope it was cloned from. An object that carries the
 * mark string with a slot outside the roster or no review property was minted by nobody here
 * (envelopedLensCalls always writes an in-range slot and a review), so it falls to the unmarked
 * fallback below and the gate judges it as what it is, which blocks (G1, fail-closed).
 */
function isLensEnvelope(entry, size) {
  return entry !== null && entry !== undefined && typeof entry === 'object' && !Array.isArray(entry)
    && entry.mark === LENS_SLOT_MARK
    && Number.isInteger(entry.slot) && entry.slot >= 0 && entry.slot < size
    && 'review' in entry
}

/**
 * Rebuild the length-`size` lens roster out of whatever the injected primitive handed back.
 *   roster:   one entry per declared lens, by slot; a slot nothing came back for is null (dead).
 *   extras:   entries that fit no slot (a duplicate of a claimed slot, or beyond the roster). They
 *             stay in the working set the gate reads, exactly as the positional read kept them, so
 *             an extra BLOCK still blocks (G1): dropping them here would weaken the gate.
 *   returned: how many entries the primitive handed back.
 *   filled:   how many slots nothing came back for (each one reads as a dead lens).
 *   surplus:  how many entries fit no slot.
 * Two envelopes claiming one slot keep the first and the second's review goes to extras, so a
 * fabricated envelope is attributed to its claimed slot only while that slot is unclaimed.
 */
function rosterFromParallel(returned, size) {
  const raw = Array.isArray(returned) ? returned : [returned]
  const roster = new Array(size).fill(null)
  const claimed = new Array(size).fill(false)
  const extras = []
  const unmarked = []
  for (let k = 0; k < raw.length; k += 1) {
    const entry = raw[k]
    if (isLensEnvelope(entry, size)) {
      if (!claimed[entry.slot]) {
        claimed[entry.slot] = true
        roster[entry.slot] = entry.review === undefined ? null : entry.review
      } else {
        extras.push(entry.review === undefined ? null : entry.review)
      }
      continue
    }
    unmarked.push(entry)
  }
  // A primitive that unwraps, clones or fabricates returns hands back entries with no envelope.
  // Order is the only identity such a primitive left standing, so unmarked entries fill the
  // unclaimed slots left to right — the pre-envelope reading, no weaker than what it replaces —
  // and the arity check still counts every slot that stays empty.
  let u = 0
  for (let slot = 0; slot < size && u < unmarked.length; slot += 1) {
    if (claimed[slot]) continue
    claimed[slot] = true
    roster[slot] = unmarked[u] === undefined ? null : unmarked[u]
    u += 1
  }
  for (; u < unmarked.length; u += 1) extras.push(unmarked[u] === undefined ? null : unmarked[u])
  let filled = 0
  for (let slot = 0; slot < size; slot += 1) if (!claimed[slot]) filled += 1
  return { roster, extras, returned: raw.length, filled, surplus: extras.length }
}

/**
 * The whole stage loop: build, two parallel adversarial lenses, a bounded fix-and-re-review loop
 * where a FRESH reviewer clears, then land. Runtime primitives arrive by injection through io, so
 * this function is testable with fakes.
 *
 * spec = {
 *   name, waveId,
 *   dependsOn,            // REQUIRED: a prior stage result, or null with independentBecause
 *   independentBecause,   // required when dependsOn is null
 *   base,                 // optional starting base when dependsOn is null (default 'main')
 *   rules,                // shared brief prefixed to every role prompt
 *   build: { prompt, options }, lenses: [{ name, prompt, options }, ...],
 *   fix: { prompt, options }, rereview: { prompt, options }, land: { prompt, options },
 *   maxRounds,            // default 3
 *   converge,             // optional: { harness, scope, wave, ledger, manifest, run, clerk, delegations }, which the lock writes
 *   io: { agent, parallel, phase, log },
 *   gateOpts,             // options forwarded to blockingReason
 * }
 * Returns { stage, waveId, base, build, reviews, verdicts, cleared, rounds, fixed, land, merged,
 *           mainAfter, ir, publishFailure, blockingReasons, note, convergence, endedEarly } (G5: the shape states its own
 *           failure mode); convergence lists each call of the judgment module, and endedEarly names the early end or
 *           is null. ir is null where nothing landed; where the stage landed it carries the
 *           published Implementation Report's asset id, or the publish failure by name
 *           (Profile 8.13 / IP-MC17-003 F1). spec.ir = { scope, ipNum, seq, collectionId, aoString,
 *           ipAssetId, wavePlanRef, harnessPath } tells the publisher where the report goes; where
 *           it is absent the publisher reads the Mission's Manifest to find out.
 */
async function runStage(spec) {
  const s = spec || {}
  const io = s.io || {}
  const wave = s.__wave || null
  // The G3 bookkeeping this stage is judged against. A stage that names no scope runs against the
  // script-wide default, so a pasted workflow script behaves exactly as it did. A caller that runs
  // stages in isolation hands each one its own, and no stage's behaviour depends on its predecessors.
  const ws = waveScopeOf(s.waveScope)
  const named = typeof s.name === 'string' && s.name.trim() !== '' ? s.name.trim() : '(unnamed stage)'
  const problems = []
  if (typeof s.name !== 'string' || s.name.trim() === '') problems.push('name must be a non-empty string')
  if (typeof s.waveId !== 'string' || s.waveId.trim() === '') {
    problems.push('waveId must be a non-empty string: it stamps every prompt so an edited wave gets fresh resume-cache keys (G2)')
  }
  if (typeof io.agent !== 'function') problems.push('io.agent must be the runtime agent function')
  if (typeof io.parallel !== 'function') problems.push('io.parallel must be the runtime parallel function')
  if (!s.build || (typeof s.build.prompt !== 'string' && typeof s.build.prompt !== 'function')) {
    problems.push('build.prompt must be a string or a function of the stage context')
  }
  if (!Array.isArray(s.lenses) || s.lenses.length < 2) {
    problems.push('lenses must hold at least two adversarial review lenses (the mission runs two per change)')
  } else {
    // Two entries pointing at one lens satisfy a length test while one reviewer does all the
    // reviewing (attack A12 passed `lenses: [LENS, LENS]`). Two lenses are two lenses.
    const seenNames = []
    const seenPrompts = []
    for (let i = 0; i < s.lenses.length; i += 1) {
      const lens = s.lenses[i] || {}
      const lensName = typeof lens.name === 'string' ? lens.name.trim().toUpperCase() : ''
      const lensPrompt = typeof lens.prompt === 'string' ? lens.prompt.trim().replace(/\s+/g, ' ') : ''
      if (lensName === '') { problems.push(`lens ${i + 1} must carry a name: the name is the role a reviewer reads and the label the record keys on`); continue }
      if (seenNames.indexOf(lensName) >= 0) problems.push(`lens ${i + 1} repeats the lens name "${lens.name}": two lenses under one name are one lens counted twice`)
      if (lensPrompt !== '' && seenPrompts.indexOf(lensPrompt) >= 0) problems.push(`lens ${i + 1} ("${lens.name}") repeats an earlier lens brief verbatim, so the two lenses read the change the same way`)
      // A bar is the words a lens blocks on: present, it is a string with text in it, and a lens with none is read by its verdict first.
      if (lens.bar !== undefined && (typeof lens.bar !== 'string' || lens.bar.trim() === '')) problems.push(`lens ${i + 1} ("${lens.name}") carries a bar that is no string with text in it: a bar names the defects the lens blocks on, or it is left out`)
      seenNames.push(lensName)
      if (lensPrompt !== '') seenPrompts.push(lensPrompt)
    }
  }
  if (!s.land || (typeof s.land.prompt !== 'string' && typeof s.land.prompt !== 'function')) {
    problems.push('land.prompt must be a string or a function of the stage context')
  }
  if (!('dependsOn' in s) || s.dependsOn === undefined) {
    problems.push('dependsOn is required: pass the prior stage result, or pass dependsOn: null together with independentBecause: "<why this stage needs no predecessor>" (G3)')
  }
  // The gate the wave is judged by is the harness's. gateOpts reaches straight into blockingReason,
  // where missingVerdict retires the decision field and numericSeverityFloor moves the grade that
  // blocks, so the sanctioned path carries no gate options at all.
  if (s.gateOpts !== undefined && s.gateOpts !== null) {
    const gateKeys = Object.keys(s.gateOpts)
    if (gateKeys.length > 0) {
      problems.push(`gateOpts is closed on the sanctioned path (given: ${gateKeys.join(', ')}). `
        + 'missingVerdict tells the gate to accept a review carrying no decision and numericSeverityFloor moves the grade that blocks, so either one edits the gate this wave is judged by (G1). '
        + 'A reviewer schema that carries no verdict is a reviewer to fix.')
    }
  }
  // The acceptance or the targeted fix a remainder's first stage carries: an object naming a ruling record and a pull
  // request number, each a whole number of 1 or more, and a head of 7 to 64 hexadecimal characters; a targeted fix names
  // at least one finding by id, each under a lens of this stage; a stage carries one of the two.
  const rulingSpec = function (key) {
    const r = s[key]
    if (r === null || typeof r !== 'object' || Array.isArray(r)) { problems.push(`${key} must be an object naming the ruling record, the head and the pull request`); return }
    for (const k of ['record', 'prNumber']) if (!(Number.isInteger(r[k]) && r[k] >= 1)) problems.push(`${key}.${k} must be a whole number of 1 or more (got ${JSON.stringify(r[k] === undefined ? null : r[k])})`)
    if (typeof r.head !== 'string' || !/^[0-9a-fA-F]{7,64}$/.test(r.head.trim())) problems.push(`${key}.head must be a run of 7 to 64 hexadecimal characters (got ${JSON.stringify(r.head === undefined ? null : r.head)})`)
    if (key !== 'targetedFix') return
    if (!Array.isArray(r.findings) || r.findings.length === 0) { problems.push('targetedFix.findings must name at least one finding to fix'); return }
    const names = Array.isArray(s.lenses) ? s.lenses.map(function (l, k) { return l && typeof l.name === 'string' && l.name.trim() !== '' ? l.name.trim() : `lens${k + 1}` }) : []
    for (let i = 0; i < r.findings.length; i += 1) {
      const f = r.findings[i]
      if (!f || typeof f !== 'object' || typeof f.id !== 'string' || f.id.trim() === '') { problems.push(`targetedFix.findings entry ${i + 1} names no id`); continue }
      if (names.indexOf(String(f.lens).trim()) < 0) problems.push(`targetedFix.findings entry ${i + 1} names the lens ${JSON.stringify(f.lens === undefined ? null : f.lens)}, which is no lens of this stage (${names.join(', ')})`)
    }
  }
  // The field converge a fleet stage carries: an object naming the harness folder, the ledger and the Manifest, each a string
  // with text in it, a Mission's scope, a Wave Plan, the run, a whole number of 0 or more, the clerk switch, true or false,
  // and a list of delegations, each naming its record, a whole number of 1 or more, its early end, true or false, and its
  // kinds, each {action} at {loop kind} with one of the seven actions and one of the four loop kinds.
  const convergeSpec = function () {
    const c = s.converge
    if (c === null || typeof c !== 'object' || Array.isArray(c)) { problems.push('converge must be an object naming the harness, the scope, the wave, the ledger, the Manifest, the run, the clerk and the delegations'); return }
    for (const k of ['harness', 'ledger', 'manifest']) if (typeof c[k] !== 'string' || c[k].trim() === '') problems.push(`converge.${k} must be a string with text in it (got ${JSON.stringify(c[k] === undefined ? null : c[k])})`)
    if (typeof c.scope !== 'string' || !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(c.scope)) problems.push(`converge.scope must be a Mission's scope, as MC173 (got ${JSON.stringify(c.scope === undefined ? null : c.scope)})`)
    if (typeof c.wave !== 'string' || !/^WAVE-PLAN-[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3}$/.test(c.wave)) problems.push(`converge.wave must name a Wave Plan, WAVE-PLAN-{SCOPE}-{NNN} (got ${JSON.stringify(c.wave === undefined ? null : c.wave)})`)
    if (!(Number.isInteger(c.run) && c.run >= 0)) problems.push(`converge.run must be a whole number of 0 or more (got ${JSON.stringify(c.run === undefined ? null : c.run)})`)
    if (typeof c.clerk !== 'boolean') problems.push(`converge.clerk must be true or false (got ${JSON.stringify(c.clerk === undefined ? null : c.clerk)})`)
    if (!Array.isArray(c.delegations)) { problems.push('converge.delegations must be a list of the delegations that cover this stage'); return }
    const kindForm = function (k) {
      const m = /^(\S+) at (\S+)$/.exec(String(k))
      return typeof k === 'string' && m !== null && HARNESS_CONVERGE_SCHEMA.properties.action.enum.indexOf(m[1]) >= 0 && HARNESS_CONVERGE_SCHEMA.properties.pointKind.enum.indexOf(m[2]) >= 0
    }
    for (let i = 0; i < c.delegations.length; i += 1) {
      const d = c.delegations[i]
      if (d === null || typeof d !== 'object' || Array.isArray(d)) { problems.push(`converge.delegations entry ${i + 1} must be an object naming its record, its early end and its kinds`); continue }
      if (!(Number.isInteger(d.record) && d.record >= 1)) problems.push(`converge.delegations entry ${i + 1} names the record ${JSON.stringify(d.record === undefined ? null : d.record)}, and a record is a whole number of 1 or more`)
      if (typeof d.earlyEnd !== 'boolean') problems.push(`converge.delegations entry ${i + 1} reads earlyEnd ${JSON.stringify(d.earlyEnd === undefined ? null : d.earlyEnd)}, and it reads true or false`)
      if (!Array.isArray(d.kinds)) problems.push(`converge.delegations entry ${i + 1} carries no list of kinds`)
      else for (const k of d.kinds) if (!kindForm(k)) problems.push(`converge.delegations entry ${i + 1} names the kind ${JSON.stringify(k)}, which reads no {action} at {loop kind}`)
    }
  }
  if (s.accepted !== undefined) rulingSpec('accepted')
  if (s.targetedFix !== undefined) rulingSpec('targetedFix')
  if (s.converge !== undefined) convergeSpec()
  if (s.accepted !== undefined && s.targetedFix !== undefined) problems.push('a stage carries accepted or targetedFix, and this one carries both')
  const roleOptions = [['build', s.build], ['fix', s.fix], ['rereview', s.rereview], ['land', s.land]]
  for (let i = 0; i < roleOptions.length; i += 1) {
    const role = roleOptions[i]
    if (role[1]) Array.prototype.push.apply(problems, optionProblems(role[0], role[1].options))
  }
  if (Array.isArray(s.lenses)) {
    for (let i = 0; i < s.lenses.length; i += 1) {
      if (s.lenses[i]) Array.prototype.push.apply(problems, optionProblems(`lens ${i + 1}`, s.lenses[i].options))
    }
  }
  if (problems.length > 0) {
    throw new Error(`runStage refuses to launch ${named}:\n  - ${problems.join('\n  - ')}`)
  }

  // A failed land stops the wave. Hazard 3 is exactly the absence of this line: three
  // stages each built off the same base after a land failed, and a suite asserting a plane became
  // its sibling. Continuing past a stop is available and is a written act.
  if (ws.stopped !== null) {
    const excuse = reasonText(s.continueAfterStop)
    if (excuse.length < REASON_FLOOR) {
      throw new Error(`STOP: stage "${named}" launches after the wave already stopped. ${ws.stopped} `
        + `${remainderRoute(ws.stoppedStage)} Or state continueAfterStop: "<why this stage stands apart from what failed>" of at least ${REASON_FLOOR} characters (G3).`)
    }
  }

  let base
  if (s.dependsOn === null) {
    const why = reasonText(s.independentBecause)
    if (why.length < REASON_FLOOR) {
      throw new Error(`STOP: stage "${named}" declares dependsOn: null with a reason of ${why.length} characters. Supply independentBecause: "<why this stage needs no predecessor>" of at least ${REASON_FLOOR} characters so a reader of the wave can audit the claim (G3).`)
    }
    // Attack A3 declared four stages of one stack independent, each with a plausible sentence, and
    // built all four off main. A second independent stage in one script is a wave shape, so it is
    // declared once up front through openWave where a reader sees the whole shape at once.
    if (wave === null && ws.stagesStarted > 0) {
      throw new Error(`STOP: stage "${named}" declares dependsOn: null while ${ws.stagesStarted} stage(s) of this script already ran. `
        + 'The second independent stage of a script is a claim about the wave\'s shape, so it is declared up front: '
        + 'openWave({ waveId, scriptFingerprint, shape, plan: [...] }) states every stage and every edge in one place, derives each base from the stage that landed before it, and refuses to launch until the count of independent stages is written down (G3).')
    }
    base = typeof s.base === 'string' && s.base.trim() !== '' ? s.base.trim() : 'main'
  } else {
    base = requireLanded(s.dependsOn, named, { siblingsBecause: s.siblingsBecause })
  }

  const agent = io.agent
  const parallel = io.parallel
  const log = typeof io.log === 'function' ? io.log : function () {}
  ws.stagesStarted += 1
  if (typeof io.phase === 'function') io.phase(named)
  const stamp = stampPrompt(s.waveId, named, base, s.scriptFingerprint, s.declaration)
  const rules = typeof s.rules === 'string' ? s.rules : ''
  const gateOpts = s.gateOpts || {}
  const ctx = { stage: named, waveId: s.waveId, base, prNumber: null, round: 0, findings: [] }
  const skeleton = {
    stage: named, waveId: s.waveId, base, build: null, reviews: [], verdicts: [],
    cleared: false, rounds: 0, fixed: null, land: null, merged: false, mainAfter: null, ir: null,
    // Profile 8.13 /: the publish failure by name, null where the publish succeeded
    // and null where nothing landed, so the field exists on every path a reader can open.
    publishFailure: null,
    blockingReasons: [], note: null,
    // G5, and G6: the shape states what the runner read as well as what it
    // decided, so a stage that stops carries the same fields as a stage that lands.
    roundLog: [], reviewRounds: [], reviewArity: { declared: Array.isArray(s.lenses) ? s.lenses.length : 0, returned: 0, filled: 0, surplus: 0, retried: 0, carried: 0 },
    reported: { landBlockedBy: [], landDeviations: [], buildDeviations: [], buildCriteriaDischarged: [], buildControlProofs: [] },
    // The pull request number of the stage; the findings that blocked nothing, recorded for the authority; what an
    // authority needs to accept the head of a stage that stopped in its review loop or to order a targeted fix; and the
    // acceptance or the targeted fix the stage ran under. Every path leaves each of the five on the result.
    prNumber: null, recorded: [], acceptable: null, accepted: null, targetedFix: null, convergence: [], endedEarly: null,
  }
  // The result is minted here, so a dependent stage's edge can be proved by identity (G3).
  MINTED.set(skeleton, { consumers: [], stage: named })
  const stopWave = function (why) {
    if (ws.stopped === null) { ws.stopped = `Stage "${named}" stopped the wave: ${why}`; ws.stoppedStage = named }
    return skeleton
  }

  // Part 1 (Profile 8.1): wave work reaches the branch only through this stage call.
  // A ruled wave's branch carries .mc17/wave.json, and its pre-commit hook refuses any commit whose
  // process lacks the token that hashes to the lock. The token is handed to the build and fix
  // agents here, in their prompts, on one line of fixed form that the session gate (Part 2) also
  // reads as the mark of a sanctioned prompt. The lander and the publisher commit nothing on the
  // branch and get no token. The token in the journal is the accepted price: forgetting becomes
  // impossible and bypassing becomes loud; sabotage was never the claim.
  const tokenLine = typeof s.waveToken === 'string' && /^[0-9a-f]{64}$/.test(s.waveToken.trim())
    ? `WAVE TOKEN: MC17_WAVE_TOKEN=${s.waveToken.trim()} (export it before every git commit; IP-MC17-003 Part 1)\n`
    : ''
  // The acceptance or the targeted fix this stage runs under, where the remainder script carries one on it. On either
  // path no build runs: the pull request is the record's, and the stage lands the accepted head or fixes it as ordered.
  const accepted = s.accepted === undefined ? null : s.accepted
  const targeted = s.targetedFix === undefined ? null : s.targetedFix
  if (accepted !== null) skeleton.accepted = { record: accepted.record, head: accepted.head.trim().toLowerCase(), prNumber: accepted.prNumber }
  if (targeted !== null) skeleton.targetedFix = { record: targeted.record, head: targeted.head.trim().toLowerCase(), prNumber: targeted.prNumber }
  let build = null
  if (accepted === null && targeted === null) {
    build = await agent(
      stamp('BUILD', `${rules}\n${tokenLine}${renderPrompt(s.build.prompt, ctx)}\n`
        + 'Return the number of the pull request you opened as prNumber, or null where you opened none: the stage stops on null, and no lens reviews it.'),
      Object.assign({ model: 'opus', isolation: 'worktree', schema: HARNESS_BUILD_SCHEMA },
        s.build.options, { label: `build:${named}`, phase: named }))
    skeleton.build = build || null
    skeleton.reported.buildDeviations = stringList(build && build.deviations)
    skeleton.reported.buildCriteriaDischarged = stringList(build && build.criteriaDischarged)
    skeleton.reported.buildControlProofs = stringList(build && build.controlProofs)
    // A pull request exists where the build returned a whole number of 1 or more; any other answer, 0 among them, is a
    // build that opened none, and the stage stops before any lens runs.
    const prOpened = !!build && Number.isInteger(build.prNumber) && build.prNumber >= 1
    if (!prOpened) {
      const dev = skeleton.reported.buildDeviations
      skeleton.note = `the build opened no pull request: it returned no prNumber of 1 or more (${build ? String(build.prNumber) : 'no build result'}), so there is nothing to review and nothing to land`
        + `${dev.length > 0 ? `. The build named ${dev.length} deviation(s): ${dev.map(function (d) { return clipLine(d, HANDOFF_LINE_CEILING) }).join(' | ')}` : ''}`
      skeleton.blockingReasons = ['build produced no pull request'].concat(dev.map(function (d) {
        return `the build reported this deviation: ${clipLine(d, HANDOFF_LINE_CEILING)}`
      }))
      return stopWave('the build produced no pull request.')
    }
    ctx.prNumber = build.prNumber
    skeleton.prNumber = build.prNumber
  } else {
    skeleton.prNumber = (accepted !== null ? accepted : targeted).prNumber
    ctx.prNumber = skeleton.prNumber
  }

  const lensCalls = s.lenses.map(function (lens, i) {
    const lensName = lens && typeof lens.name === 'string' && lens.name.trim() !== '' ? lens.name.trim() : `lens${i + 1}`
    const lensBar = lensBarOf(lens)
    const barBrief = lensBar === null ? '' : `YOUR BAR: ${lensBar}\n`
      + 'Quote in bar the words of your bar that each finding falls under, as one clause of whole words, or write null; write null in fixHunk. '
      + 'A finding outside your bar is recorded for the authority and blocks nothing, and a recorded finding graded critical stops the stage for the authority. '
      + 'Return BLOCK only where a finding under your bar stands at a blocking grade.\n'
    return function () {
      return agent(
        stamp(`REVIEW ${lensName}`, `${rules}\nADVERSARIAL REVIEW of PR #${skeleton.prNumber}, ${lensName} lens. `
          + `You wrote none of it and you fix nothing. ${renderPrompt(lens.prompt, ctx)}\n${barBrief}`
          + 'Every finding carries evidence you produced yourself: a file and line you opened, or a command and its raw output. '
          + 'Run every touched control in BOTH states and diff. Return verdict PASS or BLOCK with findings.\n'
          + `THE BLOCKING THRESHOLD: ${BLOCKING_THRESHOLD_TEXT} `
          + `${PASS_EVIDENCE_TEXT} Grade every finding severity as one of: ${FINDING_SEVERITY_ENUM.join(', ')}.`),
        Object.assign({ model: 'opus', schema: HARNESS_REVIEW_SCHEMA },
          lens.options, { label: `review:${named}:${lensName}`, phase: named }))
    }
  })
  const lensNames = s.lenses.map(function (lens, i) {
    return lens && typeof lens.name === 'string' && lens.name.trim() !== '' ? lens.name.trim() : `lens${i + 1}`
  })
  // A review sharpened this. runStage validated
  // `lenses.length >= 2` at launch and then believed whatever the injected `parallel` handed back.
  // A runtime primitive that settles all calls and keeps the ones that returned turns two declared
  // lenses into one PASS: the stage cleared with rounds=0, no fix agent, no round and no trace that
  // a lens was missing. The first repair counted the shortfall but padded nulls AT THE END, which
  // misread any non-trailing death: the survivor's review slid into the dead lens's slot, the
  // survivor was retried and reviewed twice, and the dead lens was never re-asked. So the roster is
  // rebuilt by the slot mark every roster call carries through parallel() (envelopedLensCalls
  // above): a slot nothing came back for IS the lens that died, whatever position the survivors
  // came back at, the H1 retry below asks THAT lens again before anything is graded, and the arity
  // is recorded either way.
  const reviewArity = { declared: s.lenses.length, returned: 0, filled: 0, surplus: 0, retried: 0, carried: 0 }
  // No lens reviews a stage that lands an accepted head, and the targeted fix stands in place of the opening review.
  let live = []
  if (accepted === null && targeted === null) {
    const opening = rosterFromParallel(await parallel(envelopedLensCalls(lensCalls)), s.lenses.length)
    live = opening.roster.concat(opening.extras)
    reviewArity.returned = opening.returned
    reviewArity.filled = opening.filled
    reviewArity.surplus = opening.surplus
    if (opening.filled > 0) {
      log(`${named}: the runtime returned ${reviewArity.returned} review(s) for ${reviewArity.declared} declared lens(es), `
        + `so ${reviewArity.filled} slot(s) nothing came back for read as a dead lens, each identified by its slot mark and retried once (H1)`)
    }

    // H1. A dead reviewing lens is an infrastructure event, not a review. Every dead
    // slot in the roster gets ONE retry of that single lens with the identical prompt; a retry costs
    // one review, and that is the point. A lens that dies twice in the OPENING round stops the stage
    // as infrastructure: no fix round is spent and no finding is minted, because a finding minted
    // out of a death is an instruction to invent work, and wave six paid for that twice (the minted
    // L15 and L18 produced the speculative widenings behind all three NEW-SURFACE findings).
    const deadLenses = []
    for (let i = 0; i < live.length && i < s.lenses.length; i += 1) {
      if (live[i] !== null && live[i] !== undefined) continue
      reviewArity.retried += 1
      log(`${named}: the ${lensNames[i]} lens returned nothing in the opening review, so it is retried once with the identical prompt (H1)`)
      live[i] = await lensCalls[i]()
      if (live[i] === null || live[i] === undefined) deadLenses.push(lensNames[i])
    }
    if (deadLenses.length > 0) {
      skeleton.reviews = live
      skeleton.verdicts = live.map(function (r) { return r && r.verdict !== undefined ? r.verdict : null })
      skeleton.reviewRounds = [{ round: 0, role: 'the opening review of the change', reviews: live.slice() }]
      skeleton.reviewArity = reviewArity
      skeleton.blockingReasons = deadLenses.map(function (n) {
        return `the ${n} lens died twice in the opening review (the roster call and one retry): a dead lens is an infrastructure event, not a review (H1)`
      })
      skeleton.note = `INFRASTRUCTURE: the ${deadLenses.join(' and ')} lens(es) of PR #${skeleton.prNumber} died twice in the opening `
        + 'review, once in the roster call and once on a retry with the identical prompt. That death is infrastructure, not a '
        + 'review: no fix round was spent, no finding was minted, and nothing landed. Re-run this stage when the platform '
        + 'recovers; every dependent stage refuses through requireLanded (G3).'
      log(`${named}: ${skeleton.note}`)
      return stopWave(skeleton.note)
    }
  }

  // A targeted fix takes one round: where its re-review still blocks, only the acceptance ends the stage.
  const maxRounds = targeted !== null ? 1 : (Number.isInteger(s.maxRounds) && s.maxRounds >= 0 ? s.maxRounds : 3)
  let rounds = 0
  let fixed = null
  const roundLog = []
  // G6. `skeleton.reviews = live` overwrote the opening review set with whatever the
  // last round produced, so a stage that took one round returned verdicts ["PASS"] and the reviews that
  // blocked it were absent from its own result: three findings a lens filed on a clearing verdict, and
  // a whole findings set the harvest dropped, left no trace anywhere in the record. reviewRounds keeps
  // every review of every round, in order, so the result carries what the reviewers actually returned.
  const reviewRounds = [{ round: 0, reviews: live.slice(),
    role: accepted !== null ? 'no review: the stage lands the head the authority accepted' : (targeted !== null ? 'the findings the targeted fix names, standing in place of the opening review' : 'the opening review of the change') }]
  // The fields the caller reads about the review loop, set from one place, so a stage that stops inside
  // the loop returns the same shape as a stage that ran it to the end (G5).
  const settle = function () {
    skeleton.reviews = live
    skeleton.verdicts = live.map(function (r) { return r && r.verdict !== undefined ? r.verdict : null })
    skeleton.rounds = rounds
    skeleton.fixed = fixed
    skeleton.roundLog = roundLog
    skeleton.reviewRounds = reviewRounds
    skeleton.reviewArity = reviewArity
  }
  // Whether any lens of this stage carries a bar: the stops on a fix report that names no changed part apply then.
  const anyBar = s.lenses.some(function (lens) { return lensBarOf(lens) !== null })
  // A finding in the short form an acceptance or a targeted fix carries: its id, its lens, and its location, grade and
  // text, each quoted on one bounded line.
  const shortFinding = function (id, lens, f) {
    const o = f !== null && f !== undefined && typeof f === 'object' ? f : {}
    return { id, lens, location: promptQuote(o.location, 300), severity: promptQuote(o.severity, 300), actual: promptQuote(o.actual, 300) }
  }
  // A recorded finding in the short form an acceptable entry lists: its id, its lens, its round, and its location, grade
  // and words quoted as shortFinding quotes them, with critical, the id the critical stop names it by, where one does.
  const recordedShort = function (r) {
    const q = shortFinding(r.id, r.lens, r.finding)
    return Object.assign({ id: q.id, lens: q.lens, round: r.round, location: q.location, severity: q.severity, actual: q.actual }, r.critical ? { critical: r.critical } : {})
  }
  // The ids of a round's findings read against a judgement: the ids that block, as one list and lens by lens; the ids
  // of the critical findings the judgement recorded; and the short form of each of those findings. The ids are handed
  // out in the order of the harvest, lens by lens, so each lens's ids are the next ones of its count, the finding the
  // harvest minted for a blocking review that named none last among them.
  const roundIdsOf = function (harvest, indexed, judged) {
    const out = { blocking: [], critical: [], byLens: [], findings: [] }
    let k = 0
    for (let i = 0; i < harvest.carriage.length; i += 1) {
      const c = harvest.carriage[i]
      const ids = indexed.slice(k, k + c.findings + (c.minted ? 1 : 0))
      k += ids.length
      const own = []
      const picks = judged.blocking[i]
      if (picks === null || picks === undefined) {
        if (judged.reasons[i] !== null) for (let j = 0; j < ids.length; j += 1) own.push(ids[j].id)
      } else {
        for (let j = 0; j < picks.length; j += 1) if (picks[j] < ids.length) own.push(ids[picks[j]].id)
        if (c.minted && ids.length > 0) own.push(ids[ids.length - 1].id)
      }
      out.byLens.push(own)
      for (let j = 0; j < own.length; j += 1) {
        out.blocking.push(own[j])
        out.findings.push(shortFinding(own[j], c.lens, ids.find(function (f) { return f.id === own[j] })))
      }
      for (let j = 0; j < judged.critical.length; j += 1) {
        const cr = judged.critical[j]
        if (cr.review !== i || cr.index >= ids.length) continue
        out.critical.push(ids[cr.index].id)
        out.findings.push(shortFinding(ids[cr.index].id, c.lens, ids[cr.index]))
      }
    }
    return out
  }
  // What an authority needs to accept the head of a stage that stopped in its review loop, or to order a targeted fix:
  // the pull request, the head, the base the stage built on, the round, the ids that still block, the ids of the
  // critical findings that stopped the stage, and each of those findings in short form; the stop, other until the stop
  // names itself, and every finding the stage recorded, in short form. The head is the last fix's commit, or the build's
  // head where no fix ran, or null where neither stands.
  const acceptableEntry = function (round, standing, critical, findings) {
    const fixHead = fixed !== null && typeof fixed === 'object' && typeof fixed.commitSha === 'string' && fixed.commitSha.trim() !== '' ? fixed.commitSha.trim() : null
    const buildHead = build && typeof build.headSha === 'string' && build.headSha.trim() !== '' ? build.headSha.trim() : null
    const head = fixHead !== null ? fixHead : buildHead
    return { prNumber: skeleton.prNumber, head, base, round, standing: standing.slice(), critical: critical.slice(), findings: findings.slice(), stop: 'other', recorded: skeleton.recorded.map(recordedShort) }
  }
  // The routes a stop in the review loop leaves open, for the stop note: the acceptance of the head by a ruling
  // record, one targeted fix where the stage stopped on a critical finding, still blocking or early and no targeted fix
  // ran, and the remainder from this stage.
  const routesNote = function (acc) {
    const resume = `mc17 wave lock --resume ${named}`
    if (acc === null || acc.head === null) {
      return `No head stands to accept or to fix: the build returned no headSha and no fix named a commit. The remainder from this stage runs again through ${resume}.`
    }
    const fix = ['critical', 'still-blocking', 'ended-early'].indexOf(acc.stop) >= 0 && skeleton.targetedFix === null
      ? ` Where ${acc.stop === 'critical' ? 'a critical finding stopped the stage' : (acc.stop === 'still-blocking' ? 'the stage still blocks after its rounds' : 'the stage ended early')}, the Business Owner or the Technical Owner may instead order one targeted fix by a ruling record opening TARGETED FIX ${named} at ${acc.head}, taken into the lock by ${resume} --fix <record>, naming any finding the stop lists or the stage recorded.`
      : ''
    return `The Business Owner or the Technical Owner may accept head ${acc.head} by a ruling record opening STAGE ACCEPTED ${named} at ${acc.head}, `
      + `taken into the lock by ${resume} --accept <record>.${fix} The remainder from this stage runs again through ${resume}.`
  }
  // The stop on a recorded finding graded critical, after the judgement that recorded it: the stage spends no further
  // fix round, and its result names each critical finding by the id the next round would have given it.
  const criticalStop = function (round, judged) {
    settle()
    const harvest = harvestFindings(live, gateOpts, lensNames, judged.reasons)
    const ids = roundIdsOf(harvest, findingsWithIds(harvest.findings, round + 1), judged)
    // Each recorded finding the stop names carries in critical the id the stop names it by, as roundIdsOf gives it, so both
    // of its ids name one finding.
    for (let i = 0, k = 0; i < harvest.carriage.length; k += harvest.carriage[i].findings + (harvest.carriage[i].minted ? 1 : 0), i += 1) {
      for (const cr of judged.critical) if (cr.review === i && cr.index < harvest.carriage[i].findings + (harvest.carriage[i].minted ? 1 : 0)) for (const r of skeleton.recorded) if (r.finding === cr.finding) r.critical = `R${round + 1}F${k + cr.index + 1}`
    }
    skeleton.acceptable = acceptableEntry(round, ids.blocking, ids.critical, ids.findings)
    skeleton.acceptable.stop = 'critical'
    const where = round === 0 ? 'outside the bar' : 'outside the bar or outside the parts the fix report names'
    skeleton.blockingReasons = ids.critical.map(function (id) { return `the finding ${id} is graded critical ${where}, and a recorded finding graded critical stops the stage for the authority` })
    skeleton.note = `CRITICAL FINDING OUTSIDE THE BAR after ${round} fix round(s): ${ids.critical.join(', ')} ${where === 'outside the bar' ? 'falls' : 'fall'} ${where}, `
      + 'and a recorded finding graded critical stops the stage for the authority. No further fix round was spent, nothing landed, and every dependent stage refuses. '
      + routesNote(skeleton.acceptable)
    log(`${named} round ${round}: ${skeleton.note}`)
    return stopWave(`a recorded finding graded critical stopped the stage: ${ids.critical.join(', ')}.`)
  }
  // THE CALLS OF THE JUDGMENT MODULE. A stage that carries the field converge starts the clerk, a small agent that runs
  // mc17 converge evaluate and hands back its one line, at four points of its review loop, where a review of any round
  // holds a finding or the stage recorded one: after the opening reviews, after a re-review while rounds remain or before a
  // critical stop, before a stop that still blocks, and before a landing. Each call is an entry of skeleton.convergence.
  // The runner waits for the clerk only where a delegation of the field names the early end at the point, and otherwise
  // the answer fills the entry when it comes; a call that fails or answers nothing leaves the stage as it would stand with
  // no module. Under clerk: false no clerk starts, and each point's entry reads late, for the session to complete from the
  // runner's return.
  const field = s.converge === undefined ? null : s.converge
  // The judgement and the head each point saw, by round, so a point's facts give each finding the id the round after it
  // gives that finding; and each clerk's answer, by its entry.
  const judgedRounds = []
  const headsSeen = []
  const clerkAnswers = new Map()
  // Whether any review of any round holds a finding, or the stage recorded one.
  const anyFinding = function () {
    return skeleton.recorded.length > 0 || reviewRounds.some(function (rr) { return rr.reviews.some(function (rv) { return rv !== null && typeof rv === 'object' && Array.isArray(rv.findings) && rv.findings.length > 0 }) })
  }
  // The head a point reads: the last fix's commit, the build's head where no fix ran, or the targeted fix's head.
  const headNow = function () {
    if (fixed !== null && typeof fixed === 'object' && typeof fixed.commitSha === 'string' && fixed.commitSha.trim() !== '') return fixed.commitSha.trim()
    if (build && typeof build.headSha === 'string' && build.headSha.trim() !== '') return build.headSha.trim()
    return targeted !== null ? targeted.head.trim().toLowerCase() : null
  }
  // A value of a reviewer's as text, or null.
  const asText = function (v) { return v === null || v === undefined ? null : (typeof v === 'string' ? v : String(v)) }
  // The id of each finding of a round's reviews: the id the round after it gives the finding in its handoff, read from the
  // harvest under that round's judgement where the adapter saw it, and on the path of a targeted fix the id the authority's
  // record names; a Map from each finding to its id.
  const idsOfRound = function (rr) {
    const ids = new Map()
    if (judgedRounds[rr.round] === undefined && rr.round === 0 && targeted !== null) {
      for (const rv of rr.reviews) for (const fd of (rv && Array.isArray(rv.findings) ? rv.findings : [])) if (fd && fd.namedId) ids.set(fd, fd.namedId)
      return ids
    }
    const harvest = harvestFindings(rr.reviews, gateOpts, lensNames, judgedRounds[rr.round] ? judgedRounds[rr.round].reasons : undefined)
    const indexed = findingsWithIds(harvest.findings, rr.round + 1)
    for (let n = 0; n < harvest.findings.length; n += 1) if (harvest.findings[n] !== null && typeof harvest.findings[n] === 'object') ids.set(harvest.findings[n], indexed[n].id)
    return ids
  }
  // The ids a critical stop after the point names, each { id, recorded }: the stop's id, as roundIdsOf gives it, and the
  // finding's recorded id.
  const criticalAfter = function (round, j) {
    if (!j || j.critical.length === 0) return []
    const harvest = harvestFindings(live, gateOpts, lensNames, j.reasons)
    const out = []
    for (let i = 0, k = 0; i < harvest.carriage.length; k += harvest.carriage[i].findings + (harvest.carriage[i].minted ? 1 : 0), i += 1) {
      for (const cr of j.critical) if (cr.review === i) { const r = skeleton.recorded.find(function (x) { return x.finding === cr.finding }); out.push({ id: `R${round + 1}F${k + cr.index + 1}`, recorded: r ? r.id : null }) }
    }
    return out
  }
  // The facts block of a point, { facts, why }: the point, the Wave Plan, the stage, the round, the rounds run and allowed,
  // the run, the pull request, the head and the base, the lenses with their bars, each review of each round with each of
  // its findings under one id, the recorded findings with their ids, the last fix, the routes this runner offers, the
  // critical stop after the point, the delegations of the field, and the check figure of the block's text, written last.
  // A block of more than FINDINGS_TEXT_CEILING characters has its findings' texts clipped to HANDOFF_LINE_CEILING, then
  // its findings cut to their ids, grades and locations; where it still holds more, `why` names its size. No finding of
  // the stage is changed: the block holds copies.
  const factsAt = function (point, round, j) {
    const kOf = new Map(skeleton.recorded.map(function (r) { return [r.finding, r.id] }))
    const reviews = []
    for (const rr of reviewRounds) {
      const ids = idsOfRound(rr)
      rr.reviews.forEach(function (rv, i) {
        if (rv === null || typeof rv !== 'object' || Array.isArray(rv)) return
        const list = (Array.isArray(rv.findings) ? rv.findings : []).filter(function (fd) { return fd !== null && typeof fd === 'object' && !Array.isArray(fd) })
        reviews.push(Object.assign({ lens: i < lensNames.length ? lensNames[i] : `lens${i + 1}`, round: rr.round, verdict: asText(rv.verdict), head: rr.round === 0 ? (build && build.headSha ? asText(build.headSha) : (targeted !== null ? targeted.head : null)) : (headsSeen[rr.round] || null), tree: null },
          rv.carriedForward === true ? { carriedForward: true } : {}, { findings: list.map(function (fd) {
            return { id: kOf.get(fd) || ids.get(fd) || null, location: asText(fd.location), claimed: asText(fd.claimed), actual: asText(fd.actual), evidence: asText(fd.evidence), severity: asText(fd.severity),
              carriedFrom: asText(fd.carriedFrom), bar: asText(fd.bar), fixHunk: asText(fd.fixHunk) }
          }) }))
      })
    }
    const recorded = skeleton.recorded.map(function (r) {
      const fd = r.finding !== null && typeof r.finding === 'object' ? r.finding : {}
      return Object.assign({ id: r.id, lens: r.lens, round: r.round, why: asText(r.why), location: asText(fd.location), severity: asText(fd.severity), actual: asText(fd.actual) }, r.critical ? { critical: r.critical } : {})
    })
    const fix = fixed !== null && typeof fixed === 'object' ? { commit: asText(fixed.commitSha), changed: stringList(fixed.changed), dispositions: Array.isArray(fixed.dispositions) ? fixed.dispositions.map(function (d) { return { id: asText(d && d.id), disposition: asText(d && d.disposition) } }) : [] } : null
    const facts = { point, wave: field.wave, stage: named, round, rounds: { run: rounds, allowed: maxRounds }, run: field.run, pr: skeleton.prNumber, head: headNow(), base,
      lenses: s.lenses.map(function (lens, i) { return { lens: lensNames[i], bar: lensBarOf(lens) } }), reviews, recorded, fix, routes: ROUTES_PRESENT, critical: criticalAfter(round, j), delegations: field.delegations }
    const clip = function (cut) {
      for (const rv of facts.reviews) rv.findings = rv.findings.map(cut)
      facts.recorded = facts.recorded.map(cut)
    }
    if (JSON.stringify(facts).length > FINDINGS_TEXT_CEILING) {
      clip(function (fd) { const o = Object.assign({}, fd); for (const k of ['location', 'claimed', 'actual', 'evidence', 'bar', 'fixHunk', 'why']) if (typeof o[k] === 'string') o[k] = clipLine(o[k], HANDOFF_LINE_CEILING); return o })
      facts.clipped = 'text'
    }
    if (JSON.stringify(facts).length > FINDINGS_TEXT_CEILING) {
      clip(function (fd) { return Object.assign({ id: fd.id, severity: fd.severity, location: fd.location }, fd.lens !== undefined ? { lens: fd.lens, round: fd.round } : {}) })
      facts.clipped = 'ids'
    }
    const size = JSON.stringify(facts).length
    facts.sum = factsSum(JSON.stringify(facts))
    return { facts, why: size > FINDINGS_TEXT_CEILING ? `the facts block holds ${size} characters, more than the ${FINDINGS_TEXT_CEILING} one handoff carries, so no clerk was started; the session completes the call from the runner's return` : null }
  }
  // The clerk's prompt: what it writes, the one command it runs, and what it hands back.
  const clerkBrief = function (point, round, facts) {
    return `CLERK of the judgment module at the point ${point}, round ${round}, of PR #${skeleton.prNumber}. You decide nothing, you change no file of the change, and you commit nothing.\n`
      + '1. Write the facts block below, unchanged, to a new file in the system\'s temporary folder.\n'
      + `2. From the folder you start in, run: node "${field.harness}/mc17.js" converge evaluate --point ${point} --runner-facts "{that file}" --manifest "${field.manifest}" --ledger "${field.ledger}" --scope ${field.scope}\n`
      + '3. Return, in the schema, the object the command prints on its line "Clerk     :", unchanged.\n'
      + `Where the command prints no such line, return state failed, pointKind ${point}, operationId null, sealed false, sealHash null, action null, validation none, decisionRecord null and endEarly false.\n`
      + `THE FACTS BLOCK:\n${JSON.stringify(facts)}`
  }
  // The clerk's answer read into its entry: an answer in the schema fills the entry's fields and changes nothing else of
  // the stage; any other answer reads failed, naming why.
  const fillEntry = function (entry, answer) {
    const a = answer !== null && typeof answer === 'object' && !Array.isArray(answer) ? answer : null
    if (a === null || (a.state !== 'recorded' && a.state !== 'failed')) { entry.state = 'failed'; entry.why = 'the clerk answered nothing in its schema'; return }
    clerkAnswers.set(entry, a)
    entry.state = a.state
    entry.operationId = typeof a.operationId === 'string' ? a.operationId : null
    entry.sealed = a.sealed === true
    entry.action = typeof a.action === 'string' ? a.action : null
    entry.decisionRecord = Number.isInteger(a.decisionRecord) ? a.decisionRecord : null
    entry.validation = typeof a.validation === 'string' ? a.validation : null
    entry.why = a.state === 'failed' ? 'the clerk reported that the command printed no line of its own' : null
  }
  // The stop of the early end, once a point's answer ended the stage: the value runStage returns, or null.
  let ended = null
  // Whether the runner waits for the clerk at the point `point` after the judgement `j`: the field reads clerk: true, the
  // point is not the one before a stop that still blocks, no critical stop follows, and a delegation of the field that
  // names the early end lists a kind at the point.
  const waitsAt = function (point, j) {
    return field.clerk === true && point !== 'loop-before-still-blocking' && j.critical.length === 0 &&
      field.delegations.some(function (d) { return d.earlyEnd === true && Array.isArray(d.kinds) && d.kinds.some(function (k) { return String(k).endsWith(' at ' + point) }) })
  }
  // Whether the clerk's answer `a` at the point `point` ends the stage, as { end } or { refused }: it ends the stage where
  // it reads recorded, validation authorized and endEarly true, names the point in pointKind and a decision record, and
  // its pair of action and point is a kind of a delegation that names the early end. Any other answer ends nothing; one
  // with no decision record, or whose pair no such delegation lists, is refused, naming why.
  const earlyEndOf = function (point, a) {
    if (a === null || typeof a !== 'object' || a.state !== 'recorded') return { end: false }
    if (a.validation !== 'authorized') return { end: false }
    if (a.endEarly !== true) return { end: false }
    if (a.pointKind !== point) return { end: false }
    if (!Number.isInteger(a.decisionRecord)) return { end: false, refused: `the clerk's return at ${point} names no decision record, so the stage goes on` }
    const pair = `${a.action} at ${a.pointKind}`
    if (!field.delegations.some(function (d) { return d.earlyEnd === true && Array.isArray(d.kinds) && d.kinds.indexOf(pair) >= 0 })) {
      return { end: false, refused: `no delegation of the field that names the early end lists ${pair}, so the stage goes on` }
    }
    return { end: true }
  }
  // The early end at the point `point` of round `round`, after the judgement `j`, on the clerk's answer `a`: the steps of
  // the stop that still blocks, with the stop ended-early, endedEarly naming the point, the decision record and the
  // operation, and a note that opens ENDED EARLY at the point and names the record, the operation, the delegation record
  // and the routes.
  const endEarly = function (point, round, a, j) {
    settle()
    const pair = `${a.action} at ${a.pointKind}`
    const by = field.delegations.find(function (d) { return d.earlyEnd === true && Array.isArray(d.kinds) && d.kinds.indexOf(pair) >= 0 })
    const harvest = harvestFindings(live, gateOpts, lensNames, j.reasons)
    const left = roundIdsOf(harvest, findingsWithIds(harvest.findings, round + 1), j)
    skeleton.blockingReasons = j.reasons.filter(function (r) { return r !== null })
    skeleton.acceptable = acceptableEntry(round, left.blocking, left.critical, left.findings)
    skeleton.acceptable.stop = 'ended-early'
    skeleton.endedEarly = { point, record: a.decisionRecord, operation: a.operationId }
    skeleton.note = `ENDED EARLY at ${point} after ${round} fix round(s): the decision record ${a.decisionRecord} of the operation ${a.operationId} decides ${pair} under the delegation record ${by.record}, which names the early end. `
      + `Nothing landed; each dependent stage refuses. ${routesNote(skeleton.acceptable)}`
    return stopWave(`the stage ended early at ${point}, by the decision record ${a.decisionRecord} under the delegation record ${by.record}.`)
  }
  // One call of the module at a point, after the judgement `j` of round `round`: the entry it writes, or null where the
  // stage carries no field or no review of any round holds a finding.
  const atPoint = async function (point, round, j) {
    if (field === null) return null
    if (!anyFinding()) return null
    judgedRounds[round] = j
    headsSeen[round] = headNow()
    const entry = { point, round, operationId: null, state: 'running', facts: null, sealed: null, action: null, decisionRecord: null, validation: null, why: null }
    skeleton.convergence.push(entry)
    let made
    try { made = factsAt(point, round, j) } catch (e) { made = { facts: null, why: `the runner could not compose the facts block: ${clipLine(e && e.message ? e.message : String(e), HANDOFF_LINE_CEILING)}` } }
    entry.facts = made.facts
    if (made.why !== null) { entry.state = 'failed'; entry.why = made.why; return entry }
    if (field.clerk === false) {
      entry.state = 'late'; entry.why = 'the field reads clerk: false, so no clerk was started; the session completes the call from the runner\'s return'
      return entry
    }
    const options = { model: 'sonnet', schema: HARNESS_CONVERGE_SCHEMA, label: `converge:${named}:${point}:r${round}`, phase: named }
    let call
    try { call = Promise.resolve(agent(stamp(`CONVERGE ${point}`, `${rules}\n${clerkBrief(point, round, made.facts)}`), options)) } catch (e) { call = Promise.reject(e) }
    call.then(function (answer) { fillEntry(entry, answer) }, function (e) { entry.state = 'failed'; entry.why = `the clerk's call failed: ${clipLine(e && e.message ? e.message : String(e), HANDOFF_LINE_CEILING)}` })
    log(`${named} round ${round}: the clerk of the judgment module started at ${point}`)
    if (waitsAt(point, j)) {
      const answer = await call.then(function (x) { return x }, function () { return null })
      const verdict = earlyEndOf(point, answer)
      if (verdict.refused) { entry.earlyEnd = { refused: verdict.refused }; log(`${named} round ${round}: ${verdict.refused}`) }
      if (verdict.end === true) ended = endEarly(point, round, answer, j)
    }
    return entry
  }
  // H2. The cross-round finding ledger: every id a completed fix round handed out and
  // the fix agent answered for. A re-review finding whose carriedFrom names one of these ids is
  // PERSISTENT (a repair that was claimed closed and did not close); a finding whose carriedFrom is
  // null or absent is NEW at this head. The partition changes what the record says, never what the
  // gate decides: a lens with no bar stays verdict-first, and a lens with a bar is judged as judgeReviews reads it.
  const priorIds = new Set()
  // One judgement per set of reviews: the opening set here, and each round's re-reviews at the end of the round.
  let judged
  // The ids the authority's record names, in the order the handoff hands them out, on the targeted-fix path alone.
  const namedIds = []
  // The reviews the runner wrote itself in place of an opening review, on the targeted-fix path alone: no lens gave them,
  // so a lens that dies twice in the re-review has no verdict of its own to carry forward.
  const placeholders = new Set()
  if (accepted !== null) {
    // Nothing to judge: no lens ran, and the authority's acceptance stands in place of a clearing review.
    judged = { reasons: [], blocking: [], recorded: [], critical: [] }
  } else if (targeted !== null) {
    // The findings the authority named stand in place of the opening review, each under the lens that raised it, so the
    // one fix round reads them through the handoff and each lens's re-review is bound to its own.
    const unquote = function (v) { try { const q = JSON.parse(String(v)); return typeof q === 'string' ? q : String(v) } catch (e) { return String(v === null || v === undefined ? '' : v) } }
    const byLens = lensNames.map(function () { return [] })
    for (let i = 0; i < targeted.findings.length; i += 1) {
      const f = targeted.findings[i]
      // The lens that raised the finding, one of this stage's: the launch check above refused any other.
      const at = lensNames.indexOf(String(f.lens).trim())
      byLens[at].push({ location: unquote(f.location), actual: unquote(f.actual), severity: unquote(f.severity),
        evidence: `named by ruling record ${targeted.record} as a finding this targeted fix answers for`, bar: null, fixHunk: null, namedId: String(f.id).trim() })
    }
    live = byLens.map(function (list) { return list.length > 0 ? { verdict: 'BLOCK', findings: list } : { verdict: 'PASS', findings: [] } })
    for (let i = 0; i < live.length; i += 1) placeholders.add(live[i])
    for (let i = 0; i < byLens.length; i += 1) for (let j = 0; j < byLens[i].length; j += 1) namedIds.push(byLens[i][j].namedId)
    reviewRounds[0].reviews = live.slice()
    judged = { reasons: byLens.map(function (list) { return list.length > 0 ? `the targeted fix of ruling record ${targeted.record} names ${list.map(function (f) { return f.namedId }).join(', ')}` : null }),
      blocking: byLens.map(function (list) { return list.map(function (f, j) { return j }) }), recorded: [], critical: [] }
  } else {
    judged = judgeReviews(live, s.lenses, lensNames, null, 0, gateOpts)
    for (let i = 0; i < judged.recorded.length; i += 1) skeleton.recorded.push(Object.assign({ id: 'R0K' + (i + 1) }, judged.recorded[i]))
    await atPoint('loop-opening', 0, judged)
    if (judged.critical.length > 0) return criticalStop(0, judged)
    if (ended !== null) return ended
  }
  const blocking = function (j) { return j.reasons.some(function (r) { return r !== null }) }
  while (blocking(judged) && rounds < maxRounds) {
    rounds += 1
    const reasons = judged.reasons.filter(function (r) { return r !== null })
    // G6. The harvest reads EVERY live review, not the blockers alone, and it reads
    // whatever container each one used. A finding graded low beside a blocking lens is still a finding
    // the reviewers produced, and the runner's own rule is that a gate's output is consumed whole.
    let harvest
    let indexed
    let handoff
    let roundIds
    try {
      harvest = harvestFindings(live, gateOpts, lensNames, judged.reasons)
      indexed = findingsWithIds(harvest.findings, rounds)
      // On the targeted-fix path the findings keep the ids the authority's record names them by.
      for (let k = 0; k < indexed.length && k < namedIds.length; k += 1) indexed[k].id = namedIds[k]
      handoff = findingsHandoff(indexed, skeleton.prNumber)
      roundIds = roundIdsOf(harvest, indexed, judged)
    } catch (e) {
      // G6. Three reviewer-controlled field values used to crash the stage from inside this
      // construction (a BigInt, an own toJSON returning undefined, a throwing getter). All three were
      // fail-closed for the merge and left WAVE_STATE.stopped null, so the wave-stop bookkeeping recorded
      // nothing about the stage that died and the next stage refused for the wrong reason. safeStringify
      // removed the three causes; this guard is what records any fourth.
      settle()
      skeleton.acceptable = acceptableEntry(rounds, [], [], [])
      skeleton.blockingReasons = [`the runner could not build the round ${rounds} handoff: ${e && e.message ? e.message : String(e)}`]
      skeleton.note = `THE RUNNER COULD NOT BUILD THE ROUND ${rounds} HANDOFF out of what the reviewers returned `
        + `(${e && e.message ? e.message : String(e)}). No fix agent ran, nothing landed, and every dependent stage refuses `
        + `through requireLanded (G3). The reviews stand in reviewRounds on this result: read them there. ${routesNote(skeleton.acceptable)}`
      log(`${named} round ${rounds}: ${skeleton.note}`)
      return stopWave(`the runner could not build the round ${rounds} handoff: ${e && e.message ? e.message : String(e)}`)
    }
    // H2. The round's standing findings, partitioned against every id a prior fix round answered
    // for, and the row keeps the lenses whose verdicts this round's re-review carries forward (H1).
    const ledger = partitionLedger(harvest.findings, priorIds, rounds)
    const row = { round: rounds, reasons, findings: harvest.findings.length,
      ids: handoff.ids, blockingIds: roundIds.blocking, passedInFull: handoff.passedInFull, clippedIds: handoff.clippedIds,
      indexedOnly: handoff.indexedOnly, budget: handoff.budget, carriage: harvest.carriage,
      minted: harvest.carriage.filter(function (c) { return c.minted }).length,
      ledger, carriedForwardLenses: [] }
    roundLog.push(row)
    log(`${named} round ${rounds}: ${reasons.join(' | ')} (${handoff.total} finding(s), `
      + `${handoff.passedInFull} whole, ${handoff.clippedIds.length} clipped, ids ${handoff.ids.join(', ')}; ${ledger.presented})`)
    // G6. The gate blocked, so the fix agent is handed something to answer for. An empty
    // id list here is a defect in the runner's own harvest, and the only correct answer to it is a stop:
    // a round that hands over nothing clears the coverage assertion vacuously, which is how a blocking
    // review reached a merge with the fix prompt reading "0 finding(s) stand against PR #91".
    //
    // THIS IS THE SECOND LOCK ON THAT DOOR, AND IT HAS NO MUTATION OF ITS OWN. harvestFindings mints a
    // finding for every blocking review that named none, so no reachable state arrives here with a block
    // standing: replacing this line with `if (false)` leaves the suite at 174 checks, 0 failures, and
    // proofs/run-mutations.js reports the mutation as survived. It stays because it is free and it is
    // fail-closed, and the property it guards is asserted directly by the check 'G6 harvest: a blocking
    // round never hands out zero ids', which drives every blocking review shape in its table through
    // runStage. The dead-review shapes left that table: H1 routes a dead lens to the
    // retry and the infrastructure stop above, so no dead slot reaches this gate or the mint.
    if (handoff.ids.length === 0) {
      settle()
      skeleton.acceptable = acceptableEntry(rounds, [], [], [])
      skeleton.blockingReasons = [`the gate blocked and the round ${rounds} handoff named no finding: ${reasons.join(' | ')}`]
      skeleton.note = `THE GATE BLOCKED AND THE ROUND ${rounds} HANDOFF NAMED NO FINDING. Blocked for: ${reasons.join(' | ')}. `
        + 'A round that hands a fix agent no id asserts nothing about what came back, so the stage stops here. '
        + `The runner read the reviews as: ${harvest.carriage.map(function (c) { return `${c.lens} ${c.blocked ? 'blocked' : 'cleared'}, carried as ${c.carriedAs}` }).join('; ')}. `
        + `Nothing landed, and every dependent stage refuses through requireLanded (G3). ${routesNote(skeleton.acceptable)}`
      log(`${named} round ${rounds}: ${skeleton.note}`)
      return stopWave(`the gate blocked and the round ${rounds} handoff named no finding: ${reasons.join(' | ')}`)
    }
    // G6. Past the point where every finding cannot carry a floor of its own text, the
    // runner refuses the set. The alternative it replaced was to spend the whole budget on the first
    // finding and pass the rest as a severity word and a location, which is a carrier that hands a fix
    // agent a label and takes a disposition for it.
    if (handoff.overflow) {
      settle()
      skeleton.acceptable = acceptableEntry(rounds, roundIds.blocking, [], roundIds.findings)
      skeleton.blockingReasons = [`the round ${rounds} findings set is larger than this handoff can carry whole: ${handoff.overflowNote}`]
      skeleton.note = `THE ROUND ${rounds} FINDINGS SET IS LARGER THAN THIS HANDOFF CAN CARRY WHOLE. ${handoff.overflowNote} `
        + `All ${handoff.total} id(s) stand in this result's roundLog and every finding stands in reviewRounds. `
        + `Nothing landed, and every dependent stage refuses through requireLanded (G3). ${routesNote(skeleton.acceptable)}`
      log(`${named} round ${rounds}: ${skeleton.note}`)
      return stopWave(`the round ${rounds} findings set of ${handoff.total} is larger than the handoff can carry whole.`)
    }
    ctx.round = rounds
    ctx.findings = indexed
    // The head this round starts from, for the fix agent's diff: the build's head in the first round, the last fix's
    // commit after it, and the head of the pull request where neither is known.
    const roundHead = rounds === 1
      ? (build && typeof build.headSha === 'string' && build.headSha.trim() !== '' ? promptQuote(build.headSha, 64) : (targeted !== null ? promptQuote(targeted.head, 64) : null))
      : (fixed !== null && typeof fixed === 'object' && typeof fixed.commitSha === 'string' && fixed.commitSha.trim() !== '' ? promptQuote(fixed.commitSha, 64) : null)
    fixed = await agent(
      stamp(`FIX r${rounds}`, `${rules}\n${tokenLine}FIX AGENT on PR #${skeleton.prNumber}, round ${rounds}. You wrote none of the original `
        + `and you reviewed none of it. ${s.fix && s.fix.prompt ? renderPrompt(s.fix.prompt, ctx) : ''}\n`
        + `${targeted === null ? '' : `THE AUTHORITY'S TARGETED FIX: ruling record ${targeted.record} orders one fix of the findings named below at head ${targeted.head}, and this fix answers for those findings alone.\n`}`
        + `THE GATE BLOCKED FOR: ${reasons.join(' | ')}\n`
        + `THE FINDINGS THAT BLOCK: ${roundIds.blocking.length > 0 ? roundIds.blocking.join(', ') : 'none by id'}. `
        + 'Every other finding below is recorded for the authority and blocks nothing: apply it where the fix is cheap, or argue it.\n'
        + `${handoff.text}`
        + 'Apply every finding, or argue it wrong in the commit message with evidence and a reproduction. '
        + 'Push, wait for the gates. You never merge.\n'
        + `THE HEAD THIS ROUND STARTED FROM: ${roundHead === null ? `the head of PR #${skeleton.prNumber} before your commit` : roundHead}. `
        + 'Return in changed each part of the code your commit changed, as {file}:{first line}-{last line}, read from the commit\'s own diff against that head.\n'
        + `Return commitSha, applied, argued, gateTally, changed, and dispositions: one entry { id, disposition, note } for `
        + `each of these ${handoff.total} id(s), where disposition is "applied" or "argued" and the note carries the evidence `
        + `in at least ${REASON_FLOOR} characters: ${handoff.ids.join(', ')}. `
        + 'The stage stops on any id that comes back without one, on any id named twice, and on a note too short to carry evidence.'),
      Object.assign({ model: 'opus', isolation: 'worktree', schema: HARNESS_FIX_SCHEMA },
        s.fix && s.fix.options, { label: `fix:${named}:r${rounds}`, phase: named }))
    // THE COVERAGE ASSERTION. The handoff carries every finding, so the report answers for every
    // finding. A fix agent that silently skips one stops the stage here, which is the half of hazard
    // 4 no prompt can buy: the old loop asked for a fix to thirteen findings, passed eight, and read
    // any answer at all as a round completed.
    const gap = dispositionGap(handoff.ids, fixed)
    if (gap !== null) {
      settle()
      skeleton.acceptable = acceptableEntry(rounds, roundIds.blocking, [], roundIds.findings)
      skeleton.blockingReasons = [`the fix round ${rounds} report left findings unanswered: ${gap}`]
      skeleton.note = `FIX ROUND ${rounds} LEFT FINDINGS UNANSWERED. ${gap} `
        + `The runner handed this fix agent all ${handoff.total} finding(s) by id with the text of every one of them `
        + `(${handoff.passedInFull} whole, ${handoff.clippedIds.length} with a long field clipped and the clip disclosed in place), `
        + 'so every id above is a finding the fix agent read. '
        + `Nothing landed, and every dependent stage refuses through requireLanded (G3). ${routesNote(skeleton.acceptable)}`
      log(`${named} round ${rounds}: ${skeleton.note}`)
      return stopWave(`the fix round ${rounds} report left findings unanswered: ${gap}`)
    }
    // The parts the fix report names, read as the re-review of a lens with a bar reads them: a list of one to
    // CHANGED_PARTS_CEILING entries. Where a lens carries a bar, a report that names none, or more than the bound, stops
    // the stage: a re-review bound to the parts the fix report names can judge no fix that names none.
    const changed = fixed !== null && typeof fixed === 'object' && Array.isArray(fixed.changed) && fixed.changed.length > 0
      ? fixed.changed.map(function (p) { return String(p) }) : null
    if (anyBar && changed === null) {
      settle()
      skeleton.acceptable = acceptableEntry(rounds, roundIds.blocking, [], roundIds.findings)
      skeleton.blockingReasons = [`the fix round ${rounds} report names no changed part, and a re-review bound to the parts the fix report names can judge none`]
      skeleton.note = `FIX ROUND ${rounds} NAMED NO CHANGED PART. The fix report's changed list is ${fixed !== null && typeof fixed === 'object' && 'changed' in fixed ? (Array.isArray(fixed.changed) ? 'empty' : 'no list') : 'absent'}, `
        + 'and a lens of this stage carries a bar, so its re-review would be bound to no part. No re-review ran, nothing landed, and every dependent stage refuses through requireLanded (G3). '
        + routesNote(skeleton.acceptable)
      log(`${named} round ${rounds}: ${skeleton.note}`)
      return stopWave(`the fix round ${rounds} report names no changed part.`)
    }
    if (anyBar && changed.length > CHANGED_PARTS_CEILING) {
      settle()
      skeleton.acceptable = acceptableEntry(rounds, roundIds.blocking, [], roundIds.findings)
      skeleton.blockingReasons = [`the fix round ${rounds} report names ${changed.length} changed parts, more than the ${CHANGED_PARTS_CEILING} a re-review carries`]
      skeleton.note = `FIX ROUND ${rounds} NAMED MORE CHANGED PARTS THAN THE RE-REVIEW CARRIES: ${changed.length}, against a bound of ${CHANGED_PARTS_CEILING}. `
        + 'A fix that changes more parts than a re-review can read one by one is no fix this bound holds, so the authority reads it. No re-review ran, nothing landed, and every dependent stage refuses through requireLanded (G3). '
        + routesNote(skeleton.acceptable)
      log(`${named} round ${rounds}: ${skeleton.note}`)
      return stopWave(`the fix round ${rounds} report names ${changed.length} changed parts, more than the re-review carries.`)
    }
    // H2. The coverage assertion passed, so every id of this round is a finding a fix round claimed
    // closed, and the next round's partition reads a re-raise of one of them as PERSISTENT.
    for (let i = 0; i < handoff.ids.length; i += 1) priorIds.add(handoff.ids[i])
    // G6. This used to be one agent call and `live = [fresh]`, and that single line degraded
    // the two-lens discipline to one lens for every round after the first: a stage that took a fix was
    // cleared by ONE reviewer, and the lens whose perspective raised the block never looked at the fix.
    // Where a lens had died in round zero it never ran at all, and the test named for that case asserted
    // r.rounds and the prompt text while the stage merged behind it. The re-review now re-runs the WHOLE
    // roster: every declared perspective reads the fix, the dead lens is asked again, and the arity check
    // above applies to this array exactly as it applies to the opening one.
    const argued = arguedIds(handoff.ids, fixed)
    // Each part the fix report names, quoted on a line the runner opens, so no entry begins a line of the prompt as text
    // of its own.
    const partLines = changed === null ? [] : changed.map(function (p) { return `  ${promptQuote(p, 160)}` })
    const freshCalls = s.lenses.map(function (lens, i) {
      const lensName = lensNames[i]
      const lensBar = lensBarOf(lens)
      const barBrief = lensBar === null ? '' : `YOUR BAR: ${lensBar}\n`
        + `THE FINDINGS YOU RAISED THAT BLOCKED IN THE ROUND BEFORE: ${roundIds.byLens[i] && roundIds.byLens[i].length > 0 ? roundIds.byLens[i].join(', ') : 'none'}\n`
        + `THE PARTS THE FIX REPORT NAMES:\n${partLines.join('\n')}\n`
        + 'Judge each of your listed findings at the new head, and set carriedFrom to its id where it still stands. Read the fix commit, and judge the listed parts against your bar. '
        + 'For a finding in a listed part, copy that entry word for word into fixHunk; for every other finding, write null in fixHunk. '
        + 'A finding outside your bar or outside the listed parts is recorded for the authority and blocks nothing, and a recorded finding graded critical stops the stage for the authority.\n'
      return function () {
        return agent(
          stamp(`RE-REVIEW r${rounds} ${lensName}`, `${rules}\nRE-REVIEW of PR #${skeleton.prNumber} after fix round ${rounds}, `
            + `${lensName} lens. You wrote nothing and you fixed nothing. `
            + `${s.rereview && s.rereview.prompt ? renderPrompt(s.rereview.prompt, ctx) : ''}\n`
            + `YOUR LENS: ${renderPrompt(lens.prompt, ctx)}\n${barBrief}`
            + `THE PRIOR ROUND BLOCKED FOR: ${reasons.join(' | ')}\n${handoff.text}`
            + `${argued.length === 0
              ? `THE FIX AGENT APPLIED A FIX FOR ALL ${handoff.total} FINDING(S) AND ARGUED NONE OF THEM AWAY.\n`
              : `THE FIX AGENT ARGUED ${argued.length} OF ${handoff.total} FINDING(S) AWAY AND CHANGED NOTHING FOR THEM: ${argued.join(', ')}. `
                + 'For each of those, reproduce the original defect yourself at the location the finding names and judge the argument against '
                + 'what you find. An argument you cannot reproduce is a finding that still stands, and it is a BLOCK.\n'}`
            + `WHAT THE FIX AGENT CLAIMS, PER FINDING ID (each line clipped at ${HANDOFF_LINE_CEILING} characters):\n`
            + `${dispositionLines(handoff.ids, fixed).join('\n')}\n`
            + `${boundedFixReport(fixed)}\n`
            + `Reproduce all ${handoff.total} original defect(s) against the CURRENT head yourself, by id, and confirm each one is gone. `
            + 'verdict BLOCK if any survives, is relabelled, is argued away on evidence you cannot reproduce, or a fix introduced a new one, '
            + `subject to THE BLOCKING THRESHOLD: ${BLOCKING_THRESHOLD_TEXT}\n`
            + `${PASS_EVIDENCE_TEXT} Grade every finding severity as one of: ${FINDING_SEVERITY_ENUM.join(', ')}.\n`
            + 'CLASSIFY EVERY FINDING YOU RETURN: set carriedFrom to the id of the prior finding it re-raises '
            + `(the ids above, e.g. ${handoff.ids[0]}), or null when it is first raised at this head. `
            + 'The record partitions PERSISTENT findings (a prior fix round claimed them closed) from NEW ones by that field.\n'
            + 'Return verdict and findings.'),
          Object.assign({ model: 'opus', schema: HARNESS_REVIEW_SCHEMA },
            s.rereview && s.rereview.options, { label: `rereview:${named}:r${rounds}:${lensName}`, phase: named }))
      }
    })
    // The re-review roster is rebuilt by slot mark exactly as the opening one is, so
    // a compacted return no longer slides the survivor into the dead
    // lens's slot, so the retry below re-asks the lens that actually died and the carry, when the
    // retry dies too, carries THAT lens's prior verdict.
    const rebuilt = rosterFromParallel(await parallel(envelopedLensCalls(freshCalls)), s.lenses.length)
    let fresh = rebuilt.roster.concat(rebuilt.extras)
    reviewArity.returned = rebuilt.returned
    reviewArity.surplus = rebuilt.surplus
    reviewArity.filled += rebuilt.filled
    if (rebuilt.filled > 0) {
      log(`${named} round ${rounds}: the runtime returned ${reviewArity.returned} re-review(s) for ${reviewArity.declared} `
        + 'declared lens(es), so the slot(s) nothing came back for read as a dead lens, each identified by its slot mark and retried once (H1)')
    }
    // H1, the re-review arm. A dead slot gets the same single retry with the identical
    // prompt. When the retry dies too, the runner holds a verdict this lens already gave at the
    // prior head, so the death carries that verdict forward, marked carriedForward with the round
    // it died at, instead of minting work or stopping the wave: a carried BLOCK still blocks, and
    // a carried PASS passes for that lens. The gate reads the carried verdict by its verdict first, whatever bar the
    // lens carries: the slots the runner carried are the set it hands the judgement, and the carry is on the record in
    // the review object, the round row and the arity bookkeeping.
    const carriedSlots = new Set()
    // On the targeted-fix path the review that stands before the re-review is the runner's own placeholder, so a lens
    // that dies twice there has reviewed nothing at this run: the stage stops as infrastructure, as the opening review's
    // double death does, with no acceptable entry.
    const deadInRereview = []
    for (let i = 0; i < fresh.length && i < s.lenses.length; i += 1) {
      if (fresh[i] !== null && fresh[i] !== undefined) continue
      reviewArity.retried += 1
      log(`${named} round ${rounds}: the ${lensNames[i]} lens returned nothing in the re-review, so it is retried once with the identical prompt (H1)`)
      fresh[i] = await freshCalls[i]()
      if (fresh[i] !== null && fresh[i] !== undefined) continue
      if (placeholders.has(live[i])) { deadInRereview.push(lensNames[i]); continue }
      reviewArity.carried += 1
      carriedSlots.add(i)
      const prior = live[i]
      const carried = prior !== null && prior !== undefined && typeof prior === 'object' && !Array.isArray(prior)
        ? Object.assign({}, prior, { carriedForward: true, diedAtRound: rounds })
        : { carriedForward: true, diedAtRound: rounds,
          unreadablePriorReview: `the prior round's ${lensNames[i]} review was ${prior === null || prior === undefined ? 'null' : `a ${Array.isArray(prior) ? 'array' : typeof prior}`}, carried forward as it stood` }
      fresh[i] = carried
      row.carriedForwardLenses.push(lensNames[i])
      log(`${named} round ${rounds}: the ${lensNames[i]} lens died twice in the re-review, so its prior verdict `
        + `${carried.verdict === undefined ? '(none readable, which blocks)' : promptQuote(carried.verdict, 40)} is carried forward, marked carriedForward (H1)`)
    }
    live = fresh
    reviewRounds.push({ round: rounds, role: `the re-review after fix round ${rounds}`, reviews: live.slice() })
    if (deadInRereview.length > 0) {
      settle()
      skeleton.blockingReasons = deadInRereview.map(function (n) {
        return `the ${n} lens died twice in the re-review of the targeted fix (the roster call and one retry): a dead lens is an infrastructure event, not a review, and no review of this run stands to carry forward (H1)`
      })
      skeleton.note = `INFRASTRUCTURE: the ${deadInRereview.join(' and ')} lens(es) of PR #${skeleton.prNumber} died twice in the re-review of the targeted fix of ruling record ${targeted.record}, `
        + 'once in the roster call and once on a retry with the identical prompt. That death is infrastructure, not a review: no lens reviewed the fix at this run in its place, '
        + 'no finding was minted, and nothing landed. Re-run this stage when the platform recovers; every dependent stage refuses through requireLanded (G3).'
      log(`${named} round ${rounds}: ${skeleton.note}`)
      return stopWave(skeleton.note)
    }
    // The judgement of this round's re-reviews: each lens with a bar against its own blocking ids of the round before
    // and the parts the fix report names, and every other review, the slots the runner carried among them, by its
    // verdict first.
    judged = judgeReviews(live, s.lenses, lensNames, { ids: roundIds.byLens, changed: changed === null ? [] : changed }, rounds, gateOpts, carriedSlots)
    for (let i = 0; i < judged.recorded.length; i += 1) skeleton.recorded.push(Object.assign({ id: 'R' + rounds + 'K' + (i + 1) }, judged.recorded[i]))
    if (judged.critical.length > 0 || (blocking(judged) && rounds < maxRounds)) await atPoint('loop-rereview', rounds, judged)
    if (judged.critical.length > 0) return criticalStop(rounds, judged)
    if (ended !== null) return ended
  }

  settle()
  if (blocking(judged)) {
    skeleton.blockingReasons = judged.reasons.filter(function (r) { return r !== null })
    // H2b. The stop note presents the cross-round partition, so what stands after maxRounds reads
    // as what it is: repairs that failed to close, separated from findings first raised at this
    // head. Wave six's round 3 presents here as zero persistent defects and one new documentation
    // item at grade low, instead of a count that grew every round.
    const finalHarvest = harvestFindings(live, gateOpts, lensNames, judged.reasons)
    const finalLedger = partitionLedger(finalHarvest.findings, priorIds, rounds)
    // The standing findings carry the ids the next round would have given them, so an acceptance names them as the
    // handoff of that round would.
    const next = roundIdsOf(finalHarvest, findingsWithIds(finalHarvest.findings, rounds + 1), judged)
    skeleton.acceptable = acceptableEntry(rounds, next.blocking, next.critical, next.findings)
    skeleton.acceptable.stop = 'still-blocking'
    atPoint('loop-before-still-blocking', rounds, judged)
    skeleton.note = `STILL BLOCKING after ${rounds} round(s) of ${maxRounds}: ${skeleton.blockingReasons.join(' | ')}. `
      + `THE CROSS-ROUND LEDGER: ${finalLedger.presented}. Nothing landed, and every dependent stage refuses. ${routesNote(skeleton.acceptable)}`
    return stopWave(`the reviews still blocked after ${rounds} round(s): ${skeleton.blockingReasons.join(' | ')}.`)
  }
  // No review clears an accepted head: the authority's record stands in its place, and cleared stays false.
  skeleton.cleared = accepted === null
  if (accepted === null) await atPoint('loop-before-landing', rounds, judged)
  if (ended !== null) return ended

  const landBrief = accepted !== null
    ? `LANDER for PR #${skeleton.prNumber}. You wrote, reviewed and fixed nothing. The reviews did not clear this pull request: the Business Owner or the Technical Owner `
      + `accepted its head ${accepted.head} by ruling record ${accepted.record}. Merge that head alone, with no rebase, and return it in headSha. `
      + 'Where the head of the pull request is another commit, merge nothing, return merged: false, and name the head you found in headSha. '
    : `LANDER for PR #${skeleton.prNumber}. You wrote, reviewed and fixed nothing. Every reviewing lens `
      + 'has CLEARED this pull request: no blocking verdict and no blocking finding standing. '
  const land = await agent(
    stamp('LAND', `${rules}\n${landBrief}`
      + `${s.land && s.land.prompt ? renderPrompt(s.land.prompt, ctx) : ''}\n`
      + `This stage builds on base ${base}.${accepted !== null ? '' : ' If main has moved, rebase and re-verify before merging.'}\n`
      + 'Return bypassUsed: false where the merge bypassed no required check, and bypassUsed: true where it did, with the words of the authority naming the pull request by number in bypassAuthorization.\n'
      + 'Return the land fields, mainAfter included: the dependent stage reads mainAfter as its base.'),
    Object.assign({ model: 'opus', schema: HARNESS_LAND_SCHEMA },
      s.land.options, { label: `land:${named}`, phase: named }))
  skeleton.land = land || null
  skeleton.merged = !!(land && land.merged === true)
  skeleton.mainAfter = land && typeof land.mainAfter === 'string' ? land.mainAfter : null
  // G6. Five fields the harness ASKS agents for had no read site anywhere: the lander's
  // blockedBy, its deviations, and the build's deviations, criteriaDischarged and controlProofs. A
  // failed land therefore left blockingReasons empty and openWave().report(), which projects
  // blockingReasons and note, named neither gate that held the merge, while the lander had listed them.
  // Asking an agent for a field and reading none of it is a schema that describes a report nobody
  // opened, so the five are collected here and the wave's projection carries them.
  // Profile 5.2, the bypass-scope rule: a bypass
  // authorization names the single pull request it covers, by number, in its own words. Words
  // that name the wave are refused outright, and words that name no pull request are refused the
  // same way, both before the authorization reaches any record a reader would have to disbelieve.
  const bypassAuth = land && typeof land.bypassAuthorization === 'string' ? land.bypassAuthorization.trim() : ''
  // The lander's own statement: true or false where it made one, and null where the land return carries none.
  const bypassUsed = land && typeof land.bypassUsed === 'boolean' ? land.bypassUsed : null
  const refuseBypass = (why) => {
    // A refused authorization refuses the land that carried it: the merge the lander reported is
    // not taken into the record as landed, because the record would then carry a merge whose
    // authorization the law refuses, and a dependent stage would build on it.
    skeleton.merged = false
    skeleton.mainAfter = null
    skeleton.blockingReasons = [why]
    skeleton.note = why
    return stopWave(why)
  }
  skeleton.reported = {
    bypassUsed,
    bypassAuthorization: bypassAuth === '' ? null : bypassAuth,
    landBlockedBy: stringList(land && land.blockedBy),
    landDeviations: stringList(land && land.deviations),
    buildDeviations: stringList(build && build.deviations),
    buildCriteriaDischarged: stringList(build && build.criteriaDischarged),
    buildControlProofs: stringList(build && build.controlProofs),
  }
  // The head check of the accepted path: the lander's headSha names the head the authority accepted, or the land is
  // refused as a bypass is, with both shas named, and nothing is taken as landed.
  if (accepted !== null) {
    const landedHead = land && typeof land.headSha === 'string' ? land.headSha.trim() : ''
    if (landedHead === '' || !sameCommit(landedHead, accepted.head)) {
      return refuseBypass(`the land ${landedHead === '' ? 'returned no headSha' : `returned the head ${landedHead}`}, and the Business Owner or the Technical Owner accepted the head ${accepted.head} `
        + `by ruling record ${accepted.record}: the lander merges that head alone, so this land is refused, nothing is taken as landed, and the wave stops.`)
    }
  }
  // A bypass is claimed where the lander states it, and where the lander states nothing and the field holds words. A
  // lander that states false claims none, and its words stay on the record as words.
  const bypassClaimed = bypassUsed === true || (bypassUsed === null && bypassAuth !== '')
  if (bypassClaimed) {
    if (s.waveId !== undefined && s.waveId !== null && String(s.waveId).trim() !== '' && bypassAuth.indexOf(String(s.waveId).trim()) >= 0) {
      return refuseBypass(`the land returned a bypass authorization whose words name the wave ("${String(s.waveId).trim()}"). `
        + 'Profile 5.2: a bypass authorization names the single pull request it covers, and words that scope a wave are refused outright (IP-MC17-001).')
    }
    if (bypassAuth.indexOf('#' + String(skeleton.prNumber)) < 0) {
      return refuseBypass(`the land ${bypassAuth === '' ? 'states bypassUsed true with no bypass authorization, which' : 'returned a bypass authorization that'} names no pull request. `
        + `Profile 5.2: it names #${String(skeleton.prNumber)} by number in its own words, or it is refused (IP-MC17-001).`)
    }
  }
  // A merge advances main. A lander reporting the base it started from reported the world before
  // its own merge, so the sha a dependent stage would build on is the sha this stage built on.
  if (skeleton.merged && skeleton.mainAfter !== null && skeleton.mainAfter.trim() === base) {
    skeleton.merged = false
    skeleton.land = Object.assign({}, land, { merged: false })
    skeleton.blockingReasons = [`the land reported merged=true with mainAfter ${skeleton.mainAfter.trim()}, the same sha this stage built on`]
    skeleton.note = `the land reported a merge that left main where it was (mainAfter ${skeleton.mainAfter.trim()} equals base ${base}). `
      + 'A merge advances main, so this is a lander reading the world before its own merge. Re-read the merge from the API and report the sha it produced (G3).'
    log(`${named}: cleared=${skeleton.cleared} merged=false rounds=${rounds} base=${base} mainAfter=${skeleton.mainAfter}`)
    return stopWave(skeleton.note)
  }
  if (!skeleton.merged) {
    const blockedBy = skeleton.reported.landBlockedBy
    skeleton.blockingReasons = blockedBy.length > 0
      ? blockedBy.map(function (b) { return `the lander reported this held the merge: ${clipLine(b, HANDOFF_LINE_CEILING)}` })
      : ['the lander reported merged=false and named nothing that held it']
    skeleton.note = `the reviews cleared and the land reported merged=${String(land && land.merged)}. `
      + `${blockedBy.length > 0
        ? `The lander named ${blockedBy.length} thing(s) that held the merge: ${blockedBy.map(function (b) { return clipLine(b, HANDOFF_LINE_CEILING) }).join(' | ')}. `
        : 'The lander named nothing that held the merge, so read the land report itself before re-running. '}`
      + 'The wave stops here: every dependent stage refuses through requireLanded (G3).'
    log(`${named}: cleared=${skeleton.cleared} merged=false rounds=${rounds} base=${base} mainAfter=${skeleton.mainAfter}`)
    return stopWave(`the reviews cleared and the land reported merged=${String(land && land.merged)}. `
      + `${blockedBy.length > 0 ? `The lander named: ${blockedBy.join(' | ')}.` : 'The lander named nothing that held it.'}`)
  }
  if (skeleton.mainAfter === null) {
    skeleton.note = 'merged with no mainAfter sha reported, so a dependent stage has no base to build on and requireLanded refuses (G3).'
    log(`${named}: cleared=${skeleton.cleared} merged=true rounds=${rounds} base=${base} mainAfter=null`)
    return stopWave('it merged with no mainAfter sha, so no dependent stage has ground to build on.')
  }

  // THE PUBLISH STEP. Profile 8.13 /: "A landing stage publishes its own
  // Implementation Report before it returns, from the material the stage already holds: the gate
  // tally, the lander's verbatim return, the round count and the merge sha. The stage result
  // carries the published asset id, and a stage whose publish failed returns the failure by name.
  // No stage returns a report as a debt."
  //
  // An earlier cut composed these same materials here and returned them as
  // `ir: { owed: true, published: 'NO...' }`, a debt for whoever read the field. Nobody did:
  // Mission KnowledgeDomain finished five stages with five reports owed, and the Move Acceptance
  // sweep was what caught it. The runner is the only party that holds the evidence complete, and it
  // holds it exactly here, on the genuinely landed path (merged, mainAfter read back, the
  // equals-base and bypass-scope guards above passed), so the stage publishes through one more
  // agent under the same stamp and returns what came back. A publish that fails stops nothing: the
  // merge happened and a dependent stage may still build on it, so the failure is recorded by name
  // in ir.published, in publishFailure and in the note, and blockingReasons stays what it is, the
  // list of what held a merge.
  const irSpec = s.ir && typeof s.ir === 'object' && !Array.isArray(s.ir) ? s.ir : null
  const irField = function (k) {
    return irSpec && typeof irSpec[k] === 'string' && irSpec[k].trim() !== '' ? irSpec[k].trim() : null
  }
  const material = {
    stage: named,
    prNumber: skeleton.prNumber,
    mergeSha: skeleton.mainAfter,
    gateTally: (land && typeof land.gateTally === 'string' ? land.gateTally : null)
      || (fixed && typeof fixed.gateTally === 'string' ? fixed.gateTally : null)
      || (build && typeof build.gateTally === 'string' ? build.gateTally : null),
    rounds,
    verbatimFinalReturn: JSON.stringify(land),
  }
  const listOrNone = function (items) { return items.length > 0 ? items.map(function (d) { return clipLine(d, HANDOFF_LINE_CEILING) }).join(' | ') : '(none reported)' }
  const harnessDir = irField('harnessPath') || '<harness>'
  const scopeWord = irField('scope') || '<SCOPE>'
  const ipNum = irField('ipNum') || '<NNN>'
  const seqWord = irField('seq') || '<SEQ>'
  const whereItGoes = irSpec !== null
    ? `WHERE THE REPORT GOES, AS THE STAGE WAS TOLD: title IR-${scopeWord}-IP-${ipNum}-${seqWord}; collection ${irField('collectionId') || '(unstated: read it from the Manifest as described below)'}; `
      + `AO ${irField('aoString') || '(unstated: read it from the Manifest\'s Authorities section)'}; Implementation Plan IP-${scopeWord}-${ipNum}, asset ${irField('ipAssetId') || '(unstated: read it from the Manifest\'s tracked table)'}; `
      + `Wave Plan ${irField('wavePlanRef') || '(unstated: the WAVE DECLARATION line above names the ruled Wave Plan asset where one exists; write none where it names none)'}.\n`
    : 'WHERE THE REPORT GOES: this stage was handed no ir block, so you read the Mission\'s Manifest to find it. '
      + 'The WAVE DECLARATION line above names the ruled Wave Plan asset where one exists, and the Mission collection is the collection that asset belongs to; '
      + 'where the wave runs under no plan, the Mission collection is the one the Implementation Plan this stage built against lives in. '
      + 'Open MANIFEST-<SCOPE>-001 in that collection: its title carries the SCOPE, its Authorities section carries the AO, '
      + 'and its tracked document table carries this Implementation Plan\'s number and asset id; seq is one more than the IR rows that table already carries for this plan, 001 where it carries none. '
      + 'Where any of these cannot be read, publish nothing and return failure naming what you could not find.\n'
  // THE DRAFT. The publisher writes the answers and renders the report from them, and returns the draft and its hash.
  // It stores nothing. A document an AI wrote reaches the corpus through the rewriter below, whose context wrote none of
  // it, and through a command that measures the rewrite against this draft.
  let drafted = null
  try {
    drafted = await agent(
      stamp('DRAFT', `${rules}\nPUBLISHER of the Implementation Report for PR #${skeleton.prNumber}, stage "${named}" of wave ${s.waveId}. `
        + `You wrote, reviewed, fixed and landed nothing. ${accepted !== null
          ? `The reviews did not clear this pull request: the Business Owner or the Technical Owner accepted its head ${accepted.head} by ruling record ${accepted.record}, and the lander merged that head; the findings that stood at the acceptance are the Standing line of that record. `
          : (targeted !== null
            ? `One targeted fix, ordered by ruling record ${targeted.record}, answered the findings that record names at head ${targeted.head}; every lens re-reviewed once and cleared the pull request, and the lander merged it. `
            : 'Every reviewing lens cleared this pull request and the lander merged it. ')}`
        + 'Profile 8.13: a landing stage publishes its own Implementation Report before it returns, from the material the stage already holds, '
        + 'so you write it now. You do not store it: a second agent rewrites it for its reader and stores the rewrite.\n'
        + 'THE MATERIAL, VERBATIM FROM THE STAGE (the report is written from this and from the Mission documents it names; invent nothing beyond them):\n'
        + `  stage: ${named}\n`
        + `  wave: ${s.waveId}\n`
        + `  pull request: #${skeleton.prNumber}\n`
        + `${accepted !== null ? `  acceptance: ruling record ${accepted.record} accepted head ${accepted.head}; the standing findings are the Standing line of that record\n` : ''}`
        + `${targeted !== null ? `  targeted fix: ruling record ${targeted.record} ordered one fix of ${targeted.findings.map(function (f) { return String(f.id) }).join(', ')} at head ${targeted.head}\n` : ''}`
        + `  merge sha (mainAfter): ${skeleton.mainAfter}\n`
        + `  gate tally: ${material.gateTally === null ? '(the lander and the build reported none)' : material.gateTally}\n`
        + `  review rounds: ${rounds}\n`
        + `  the build's criteria discharged: ${listOrNone(skeleton.reported.buildCriteriaDischarged)}\n`
        + `  the build's deviations: ${listOrNone(skeleton.reported.buildDeviations)}\n`
        + `  the lander's deviations: ${listOrNone(skeleton.reported.landDeviations)}\n`
        + `  THE LANDER'S VERBATIM FINAL RETURN, AS JSON:\n  ${material.verbatimFinalReturn}\n`
        + `  THE FINDINGS RECORDED FOR THE AUTHORITY, which blocked nothing (${skeleton.recorded.length}; list each of them in the account, so the authority reads them):\n`
        + `${skeleton.recorded.length === 0 ? '    (none)\n' : skeleton.recorded.map(function (r) {
          const f = r.finding !== null && typeof r.finding === 'object' ? r.finding : {}
          return `    ${promptQuote(r.lens, 120)} round ${r.round} at ${promptQuote(f.location, 120)}: ${promptQuote(r.why, 120)}\n`
        }).join('')}`
        + whereItGoes
        + 'HOW: write an answers file carrying exactly these keys (harness/fixtures/ir.answers.json shows the shape): '
        + 'SCOPE; ip (IP-NNN); ip_num (NNN); seq; date (today, ISO); ao_string; '
        + 'summary (one paragraph for the human authority: what landed, what it cost, what is his to decide); '
        + 'account (what was built against which plan, what the gates found, what was applied and what was argued down, what deviated and why, and what the reader is asked to decide, if anything); '
        + 'verbatim_return (the lander\'s return above, untouched); check_roster (the gate tally above, one check per line); '
        + 'ip_asset_id; wave_plan_id; acceptance_record (the number of the execution acceptance record in VF-<SCOPE>-001 where one exists; write pending where none exists yet, and say so in the account). Then run\n'
        + `  node ${harnessDir}/mc17.js render ir --answers <answers.json> --out <draft.md>\n`
        + `  node ${harnessDir}/mc17.js hash -f <draft.md> --json\n`
        + `${irField('harnessPath') === null ? '  where <harness> is the harness directory of the plugin that ships this runner (harness/ in its package).\n' : ''}`
        + 'The first command renders the report and writes it, with the line endings the create hashes; the second prints the hash of what it wrote. '
        + 'Do not write the draft with a shell redirection: on a host whose shell writes CRLF the hash would not be the one the create computes. '
        + 'A refusal naming a barred construction is the writing lint reading YOUR prose: reword the summary or the account and render it again; the verbatim parts ride in fenced blocks the lint exempts.\n'
        + 'RETURN answersFile, draftFile and draftHash exactly as you wrote and read them, with failure null. '
        + 'Where a command refused or died, return the three null and failure naming what happened in its own words: the refusal line, the exit code, the field you could not find.'),
      { model: 'sonnet', schema: HARNESS_DRAFT_SCHEMA, label: `draft:${named}`, phase: named })
  } catch (e) {
    drafted = { answersFile: null, draftFile: null, draftHash: null,
      failure: `the publisher threw: ${e && e.message ? e.message : String(e)}` }
  }
  const draftReady = drafted !== null && typeof drafted === 'object' && !Array.isArray(drafted)
    && typeof drafted.answersFile === 'string' && drafted.answersFile.trim() !== ''
    && typeof drafted.draftFile === 'string' && drafted.draftFile.trim() !== ''
    && typeof drafted.draftHash === 'string' && drafted.draftHash.trim() !== ''
    && !(typeof drafted.failure === 'string' && drafted.failure.trim() !== '')
  let published = null
  if (!draftReady) {
    // No draft, no rewrite: the rewriter is not started, and the report is owed with the publisher's own words on it.
    const said = drafted && typeof drafted === 'object' && typeof drafted.failure === 'string' && drafted.failure.trim() !== ''
      ? clipLine(drafted.failure, HANDOFF_LINE_CEILING)
      : 'the publisher returned no draft and named no failure'
    published = { assetId: null, title: null, hash: null, proven: false, failure: said }
  } else {
  // THE REWRITE. A second agent, which wrote none of the draft, rewrites it for the person the report is written for and
  // stores the rewrite through one command. That command renders the draft again from the same answers, refuses a draft of
  // another hash, and refuses a rewrite that lost anything a program reads, so this agent reaches neither the draft it is
  // measured against nor the comparison.
  try {
    published = await agent(
      stamp('PUBLISH', `${rules}\nREWRITER of the Implementation Report for PR #${skeleton.prNumber}, stage "${named}" of wave ${s.waveId}. `
        + 'You wrote none of the draft, and you rewrite it for the person who reads it. You add nothing and you drop nothing.\n'
        + whereItGoes
        + `THE DRAFT: ${drafted.draftFile}, rendered from ${drafted.answersFile}. Its hash is ${drafted.draftHash}.\n`
        + `READ FIRST: ${harnessDir}/../skills/mc-plain-v17/SKILL.md, which says how to rewrite and under whose rules, and `
        + `${harnessDir}/TERMS.json, which says what the words of this plugin refer to.\n`
        + 'THE READER, from the report itself: the human authority first, who learns what happened, what it cost, what deviated from the plan, '
        + 'and what is his to decide; then the ledger, a later fleet and an audit, who read the evidence exactly as the fleet returned it. '
        + 'That authority knows the business and may never have seen the code: a person or a program is the subject of each sentence, '
        + 'one sentence says one thing, the plain word comes first, and a word of this plugin is explained once where it first stands.\n'
        + 'WHAT YOU MUST KEEP. A program compares your rewrite with the draft and refuses it where one of these is missing: '
        + 'every span in backticks; every identifier outside backticks, every record number and every number written in digits; '
        + 'every heading, with its words and in the same order, and no heading added; every fenced block, whole; every row of a table; '
        + 'and every line the template supplies, among them the Status, Reader and AO lines.\n'
        + 'THEN RUN, with your rewrite written beside the draft:\n'
        + `  node ${harnessDir}/mc17.js create --title IR-${scopeWord}-IP-${ipNum}-${seqWord} --collection <collectionId> `
        + `--render ir --answers ${drafted.answersFile} --pass <rewrite.md> --draft-hash ${drafted.draftHash} --json\n`
        + 'The command renders the draft again itself, compares your rewrite with it, creates the document and proves the stored hash in one act, '
        + 'and prints assetId, title, hash and proven. Where it names things your rewrite lost, repair your rewrite and run the command once more. '
        + 'A second refusal is a failure, and you return it.\n'
        + 'A refusal naming a barred construction is the writing lint reading YOUR prose, since the body sent is your rewrite: reword it and run the command again; '
        + 'the verbatim parts ride in fenced blocks the lint exempts, and they are among the things you must keep.\n'
        + 'RETURN assetId, title, hash and proven exactly as the command printed them, with failure null, and draftHash exactly as you passed it. '
        + 'Where the command refused twice or died, return assetId null, proven false and failure naming what happened in its own words. '
        + 'A report whose stored hash you did not see proven is a failure.'),
      { model: 'sonnet', schema: HARNESS_PUBLISH_SCHEMA, label: `publish:${named}`, phase: named })
  } catch (e) {
    // A rewriter that throws is a publish that failed, and the merge above still stands, so the
    // throw is named here and the stage returns its landed result with the failure on it.
    published = { assetId: null, title: null, hash: null, proven: false,
      failure: `the rewriter threw: ${e && e.message ? e.message : String(e)}` }
  }
  }
  const assetId = published && typeof published.assetId === 'string' && published.assetId.trim() !== ''
    ? published.assetId.trim() : null
  let publishFailure = null
  if (published === null || published === undefined || typeof published !== 'object') {
    publishFailure = 'the publisher returned nothing'
  } else if (typeof published.failure === 'string' && published.failure.trim() !== '') {
    publishFailure = clipLine(published.failure, HANDOFF_LINE_CEILING)
  } else if (assetId === null) {
    publishFailure = 'the publisher returned no asset id and named no failure'
  } else if (published.proven !== true) {
    publishFailure = `the publisher returned asset ${assetId} with proven=${String(published.proven)} and named no failure`
  } else if (draftReady && typeof published.draftHash === 'string' && published.draftHash.trim() !== ''
    && published.draftHash.trim() !== drafted.draftHash.trim()) {
    publishFailure = `the rewriter reports it measured its rewrite against ${published.draftHash.trim()} and the publisher rendered ${drafted.draftHash.trim()}`
  }
  skeleton.publishFailure = publishFailure
  skeleton.ir = Object.assign({
    owed: publishFailure !== null,
    published: publishFailure === null ? assetId : `FAILED: ${publishFailure}`,
    title: published && typeof published.title === 'string' ? published.title : null,
    hash: published && typeof published.hash === 'string' ? published.hash : null,
    draftFile: draftReady ? drafted.draftFile : null,
    draftHash: draftReady ? drafted.draftHash : null,
    answersFile: draftReady ? drafted.answersFile : null,
  }, material)
  if (publishFailure !== null) {
    skeleton.note = `the stage landed at ${skeleton.mainAfter} and the publish of its Implementation Report FAILED: ${publishFailure}. `
      + 'The merge stands and a dependent stage may build on it; the report is owed until a publish of it succeeds, and the Move Acceptance sweep fails the Mission while it is (Profile 8.13 / IP-MC17-003 F1).'
  }
  log(`${named}: cleared=${skeleton.cleared} merged=${skeleton.merged} rounds=${rounds} base=${base} mainAfter=${skeleton.mainAfter} `
    + `ir=${publishFailure === null ? `published ${assetId}` : `publish FAILED: ${publishFailure}`}`)
  return skeleton
}

/**
 * THE SANCTIONED ENTRY POINT FOR A WAVE OF MORE THAN ONE STAGE.
 *
 * The three hazards of 2026-08-12 and 2026-08-13 were all authored one stage at a time, and the
 * wave's shape lived in prose above the code. Here the shape is the argument: every stage and every
 * edge is declared once, up front, where a reader sees the whole of it, and the runner derives each
 * stage's base from the ledger. An author of a stack states no dependency at all, so the wave-six
 * failure (four stages of one stack each passing dependsOn: null with a sentence) has no key left
 * to write it in.
 *
 * plan = {
 *   waveId,               // stamps every prompt (G2)
 *   scriptFingerprint,    // the sha recorded at launch (G2); openWave refuses without it
 *   shape,                // 'stack' (default): the chain is derived, and no edge is authored
 *                         // 'graph': each planned stage names an earlier stage or null
 *   plan: [{ name, dependsOn, independentBecause, siblingsBecause, continueAfterStop }, ...],
 *   from,                 // optional baseOfRecord(sha, why) seed for the first stage
 *   independentStages,    // required when a graph declares more than one independent stage
 *   independenceBecause,  // required with it, and stamped into every prompt of the wave
 *   io, rules, maxRounds,
 * }
 * Returns { waveId, shape, runStage, results, report, stoppedBy }.
 */
function openWave(plan) {
  const p = plan || {}
  const problems = []
  const waveId = typeof p.waveId === 'string' ? p.waveId.trim() : ''
  const fingerprint = typeof p.scriptFingerprint === 'string' ? p.scriptFingerprint.trim() : ''
  const shape = p.shape === undefined || p.shape === null ? 'stack' : String(p.shape)
  const entries = Array.isArray(p.plan) ? p.plan : null
  if (waveId === '') problems.push('waveId must be a non-empty string: it stamps every prompt so an edited wave gets fresh resume-cache keys (G2)')
  if (fingerprint === '') {
    problems.push('scriptFingerprint is required: record it at launch with `node orchestration-lint.js --record-fingerprint <script> --run-id <id>` and pass the sha it prints, '
      + 'so every prompt of this wave names the script text it was composed from and a resume of an edited script is visible in the record (G2)')
  }
  // The wave script names the Wave Plan it executes:
  // the ruled plan is what makes the landing order an authority's act, and a run record naming no
  // plan leaves a later reader joining the two by asking the fleet. The literal 'none' is the
  // explicit declaration for a wave with no plan, a single IP landing alone, so silence is never
  // read as either answer.
  const wavePlanAsset = typeof p.wavePlanAsset === 'string' ? p.wavePlanAsset.trim() : ''
  if (wavePlanAsset === '') {
    problems.push("wavePlanAsset is required: the ruled Wave Plan's asset id this wave executes, or the literal 'none' where a single IP lands with no plan, so the run record ties the execution to its ruling (Profile 4.5)")
  }
  if (shape !== 'stack' && shape !== 'graph') problems.push(`shape must be "stack" or "graph" (got ${JSON.stringify(p.shape)})`)
  if (entries === null || entries.length === 0) {
    problems.push('plan must list every stage of this wave up front, in the order they run: the shape of a wave is the thing that failed, so it is declared in one place a reader can audit')
  }
  const names = []
  const independent = []
  if (entries !== null) {
    for (let i = 0; i < entries.length; i += 1) {
      const e = entries[i] || {}
      const name = typeof e.name === 'string' ? e.name.trim() : ''
      if (name === '') { problems.push(`plan entry ${i + 1} must carry a name`); continue }
      if (names.indexOf(name) >= 0) { problems.push(`plan entry ${i + 1} repeats the stage name "${name}"`); continue }
      if (shape === 'stack') {
        if ('dependsOn' in e || 'independentBecause' in e) {
          problems.push(`plan entry "${name}" states an edge, and a stack derives every edge from the stage before it. `
            + 'Drop the key, or declare shape: "graph" and state every edge of the wave')
        }
        if (i === 0) independent.push(name)
        names.push(name)
        continue
      }
      const dep = e.dependsOn === undefined ? null : e.dependsOn
      if (dep === null) {
        const why = reasonText(e.independentBecause)
        if (why.length < REASON_FLOOR) {
          problems.push(`plan entry "${name}" declares no predecessor with a reason of ${why.length} characters; state independentBecause of at least ${REASON_FLOOR} characters (G3)`)
        }
        independent.push(name)
      } else if (typeof dep !== 'string' || names.indexOf(dep.trim()) < 0) {
        problems.push(`plan entry "${name}" depends on ${JSON.stringify(dep)}, which no earlier entry of this plan names. `
          + `A stage depends on a stage this wave runs before it${names.length > 0 ? ` (so far: ${names.join(', ')})` : ''} (G3)`)
      }
      names.push(name)
    }
  }
  // A wave with one independent stage starts somewhere. A wave with several has branches, and the
  // count is the thing attack A3 hid behind four separate sentences, so it is written once and
  // carried into every prompt the wave launches.
  if (independent.length > 1) {
    if (p.independentStages !== independent.length) {
      problems.push(`this plan declares ${independent.length} stages with no predecessor (${independent.join(', ')}) and states independentStages: ${JSON.stringify(p.independentStages)}. `
        + 'Write the count down so the branch count is a number a reader checks against the wave, or chain the stages that belong to one stack (G3)')
    }
    if (reasonText(p.independenceBecause).length < REASON_FLOOR) {
      problems.push(`a wave with ${independent.length} independent stages states independenceBecause of at least ${REASON_FLOOR} characters, which every agent of the wave then reads in its prompt (G3)`)
    }
  }
  if (p.from !== undefined && p.from !== null && MINTED.get(p.from) === undefined) {
    problems.push('from must be a baseOfRecord(sha, why) seed: a starting sha the harness minted, and never an object literal asserting a merge (G3)')
  }
  if (problems.length > 0) {
    throw new Error(`openWave refuses to open ${waveId === '' ? 'this wave' : `"${waveId}"`}:\n  - ${problems.join('\n  - ')}`)
  }

  // One wave, one scope. A wave that names none runs against the script-wide default, so two waves in
  // one pasted script still see each other's stop, which is the state hazard 3 is about.
  const ws = waveScopeOf(p.waveScope)
  ws.waves += 1
  const planLine = wavePlanAsset === 'none'
    ? `wave ${waveId} executes under no Wave Plan (declared: a single IP lands alone)`
    : `wave ${waveId} executes WAVE-PLAN asset ${wavePlanAsset}, whose ruling record fixes the landing order`
  const declaration = independent.length > 1
    ? `${independent.length} of ${entries.length} stages of wave ${waveId} run with no predecessor (${independent.join(', ')}): ${reasonText(p.independenceBecause)}. ${planLine}`
    : planLine
  const results = {}
  const order = entries.map(function (e) { return String(e.name).trim() })
  let next = 0

  async function runPlannedStage(spec) {
    const s = spec || {}
    const name = typeof s.name === 'string' ? s.name.trim() : ''
    const owned = ['dependsOn', 'independentBecause', 'waveId', 'scriptFingerprint', 'base', 'io', 'rules', 'declaration', 'waveScope']
    const stated = owned.filter(function (k) { return k in s })
    if (stated.length > 0) {
      throw new Error(`STOP: stage "${name}" states ${stated.join(', ')}, which wave "${waveId}" owns. `
        + 'The wave derives every base from the stage that landed before it, which is the whole reason the shape is declared up front (G3).')
    }
    if (next >= order.length) {
      throw new Error(`STOP: wave "${waveId}" planned ${order.length} stage(s) and "${name}" is one more. Plan it, or run it as its own wave.`)
    }
    if (name !== order[next]) {
      throw new Error(`STOP: wave "${waveId}" plans "${order[next]}" next and this call names "${name}". `
        + 'A wave runs the stages it declared, in the order it declared them, so the shape a reader audits is the shape that executes (G3).')
    }
    const entry = entries[next]
    next += 1
    let dependsOn = null
    let independentBecause
    let siblingsBecause
    if (shape === 'stack') {
      if (next === 1) {
        dependsOn = p.from === undefined || p.from === null ? null : p.from
        independentBecause = dependsOn === null
          ? `the first stage of wave ${waveId} builds on landed main`
          : undefined
      } else {
        dependsOn = results[order[next - 2]]
        if (dependsOn === undefined) {
          throw new Error(`STOP: wave "${waveId}" reached "${name}" with no result for "${order[next - 2]}". A stage runs after the stage it depends on has run (G3).`)
        }
      }
    } else if (entry.dependsOn === undefined || entry.dependsOn === null) {
      dependsOn = next === 1 && p.from !== undefined && p.from !== null ? p.from : null
      independentBecause = dependsOn === null ? reasonText(entry.independentBecause) : undefined
    } else {
      dependsOn = results[String(entry.dependsOn).trim()]
      siblingsBecause = entry.siblingsBecause
      if (dependsOn === undefined) {
        throw new Error(`STOP: wave "${waveId}" reached "${name}" with no result for its declared predecessor "${entry.dependsOn}" (G3).`)
      }
    }
    const forwarded = Object.assign({}, s, {
      waveId,
      scriptFingerprint: fingerprint,
      rules: typeof s.rules === 'string' ? s.rules : (typeof p.rules === 'string' ? p.rules : ''),
      io: p.io,
      dependsOn,
      declaration,
      waveScope: ws,
      __wave: waveId,
    })
    if (independentBecause !== undefined) forwarded.independentBecause = independentBecause
    if (siblingsBecause !== undefined) forwarded.siblingsBecause = siblingsBecause
    if (entry.continueAfterStop !== undefined) forwarded.continueAfterStop = entry.continueAfterStop
    if (forwarded.maxRounds === undefined && p.maxRounds !== undefined) forwarded.maxRounds = p.maxRounds
    const result = await runStage(forwarded)
    results[name] = result
    return result
  }

  return {
    waveId,
    shape,
    plan: order,
    wavePlanAsset,
    declaration,
    independentStages: independent.length,
    results,
    runStage: runPlannedStage,
    waveScope: ws,
    get stoppedBy() { return ws.stopped },
    // G5 for the wave: the projection that states each stage's failure mode.
    report: function () {
      return order.map(function (n) {
        const r = results[n]
        if (r === undefined) return { stage: n, ran: false, cleared: null, merged: null, note: `this stage never ran${ws.stopped === null ? '' : `: stage "${ws.stoppedStage}" stopped the wave. ${remainderRoute(ws.stoppedStage)}`}` }
        return {
          stage: r.stage, ran: true, base: r.base, cleared: r.cleared, merged: r.merged,
          rounds: r.rounds, verdicts: r.verdicts, mainAfter: r.mainAfter,
          blockingReasons: r.blockingReasons, note: r.note,
          // Profile 8.13 /: a merged stage carries its published Implementation Report's
          // asset id, or the publish failure by name, and the wave report shows which in `published`
          // and in `publishFailure`. A merged result carrying no report field at all came from no
          // runner at this version, and the projection says so by name in the same place.
          ir: r.ir || (r.merged ? { owed: true, published: 'FAILED: the stage result carries no report field, so no publish step ran for it' } : null),
          publishFailure: r.publishFailure === undefined ? null : r.publishFailure,
          // G6. The projection used to carry cleared, merged and the verdicts of
          // the LAST round alone, so a lens the runtime lost, a findings set the harvest dropped and the
          // gates a lander named as holding the merge were all invisible to the only reader a wave has.
          lensesDeclared: r.reviewArity ? r.reviewArity.declared : null,
          lensSlotsUnfilled: r.reviewArity ? r.reviewArity.filled : null,
          findingsPerRound: Array.isArray(r.roundLog) ? r.roundLog.map(function (x) { return x.findings }) : [],
          mintedFindings: Array.isArray(r.roundLog) ? r.roundLog.reduce(function (a, x) { return a + (x.minted || 0) }, 0) : 0,
          reported: r.reported || null,
          // The findings that blocked nothing, in short form and by count, for the authority; what an authority may
          // accept or fix where the stage stopped in its review loop; and the acceptance or the targeted fix it ran under.
          recorded: shortRecorded(r.recorded),
          recordedCount: Array.isArray(r.recorded) ? r.recorded.length : 0,
          acceptable: r.acceptable === undefined ? null : r.acceptable,
          accepted: r.accepted === undefined ? null : r.accepted,
          targetedFix: r.targetedFix === undefined ? null : r.targetedFix,
          // Each call of the judgment module, a call the clerk had not answered when the report was written read as late,
          // for the session to complete; and the early end, or null.
          convergence: (Array.isArray(r.convergence) ? r.convergence : []).map(function (e) { return e.state === 'running' ? Object.assign({}, e, { state: 'late', why: 'the clerk had not answered when the wave report was written; the session completes the call from this report' }) : Object.assign({}, e) }),
          endedEarly: r.endedEarly === undefined ? null : r.endedEarly,
        }
      })
    },
  }
}

// [SANCTIONED-BLOCK END v1]

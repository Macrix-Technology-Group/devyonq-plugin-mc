'use strict'
// mc17 converge host --scope {SCOPE} [--json] (ARCH D9, D32; IP-MC-SERVER-002 Steps 5 and 9): the host's reading as the
// heavy-run hook reads it at an admitted start, answered on the computer and sent nowhere. It is the release's
// hostCommand with no change to its logic: the load over two samples, the flag busy against the policy's figure
// host-busy-load for this host's kind, the running set read from the process listing through the hook's own reader with
// the used entries and the agent entries of the store, and the host's part over them. The reading reads ok false, and
// the command exits 1, where the process listing or the hook's reader failed; it refuses at exit 2 a call with no scope
// and a store that does not stand on this computer.

const fs = require('node:fs')
const path = require('node:path')
const { hostState, osKind } = require('./host.js')
const { canonicalJson } = require('./canonical.js')

const SCOPE_RE = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/
const BUSY_FIGURE = 'host-busy-load'
const FIGURE_VALUE_RE = /^\d+(?:\.\d+)?$/

/*  The figure `id` of the policy's ## Figures table for `hostKind`, its own row first and the row of all after it, or null. */
function policyFigure (text, id, hostKind) {
  const lines = String(text || '').split('\n')
  const at = lines.findIndex((l) => l.trim() === '## Figures')
  if (at < 0) return null
  let columns = null
  const rows = []
  for (let i = at + 1; i < lines.length; i += 1) {
    const l = lines[i].trim()
    if (/^#{1,2}\s/.test(l)) break
    if (!l.startsWith('|')) continue
    const cells = l.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim().replace(/^`|`$/g, ''))
    if (columns === null) { columns = cells; continue }
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue
    const cell = (name) => (columns.indexOf(name) >= 0 ? cells[columns.indexOf(name)] || '' : '')
    rows.push({ figure: cell('Figure'), host: cell('Host'), value: cell('Value') })
  }
  const fit = rows.filter((r) => r.figure === id && FIGURE_VALUE_RE.test(r.value))
  const row = fit.find((r) => r.host === hostKind) || fit.find((r) => r.host === 'all')
  return row ? Number(row.value) : null
}

/*  The start entries of a store folder, folded from their lines as the release's startsOf folds them. */
function startsOf (dir) {
  const byId = new Map()
  const order = []
  let text = ''
  try { text = fs.readFileSync(path.join(dir, 'starts.jsonl'), 'utf8') } catch (_) { text = '' }
  for (const raw of text.split('\n')) {
    if (!raw.trim()) continue
    let l = null
    try { l = JSON.parse(raw) } catch (_) { continue }
    if (!l || !l.id) continue
    if (!byId.has(l.id)) { byId.set(l.id, Object.assign({}, l, { used: null, startedAt: null, agentId: null, endedAt: null })); order.push(l.id) }
    const e = byId.get(l.id)
    for (const k of ['delegation', 'hostPart', 'wait', 'held']) if (l[k] !== undefined) e[k] = l[k]
    if (l.state === 'used') { e.used = l; e.startedAt = l.at || null; e.state = 'used' } else if (l.state === 'launched') e.agentId = l.agentId || null
    else if (l.state === 'ended') { e.endedAt = l.at || null; e.state = 'ended' } else if (l.state) e.state = l.state
  }
  return order.map((id) => byId.get(id))
}

/*  The helpers of drill runs among `processes`, as the release's drillHelpers pairs them. */
function drillHelpers (processes, keyOf, readers) {
  const groups = new Map()
  const runs = []
  const shells = []
  for (const p of processes.filter((q) => keyOf(q.command) === 'drill')) {
    const part = readers.drillTreePart(p.command)
    if (part === null) (readers.drillRunLine(p.command) ? runs : shells).push(p)
    else groups.set(part, (groups.get(part) || []).concat([p]))
  }
  const time = (p) => (p.startedAt ? Date.parse(p.startedAt) : NaN)
  const earliest = (g) => Math.min(...g.map((p) => (Number.isNaN(time(p)) ? Infinity : time(p))))
  const order = Array.from(groups.values()).sort((a, b) => (earliest(a) === earliest(b) ? 0 : (earliest(a) < earliest(b) ? -1 : 1)))
  const paired = new Set()
  const out = new Set()
  for (const g of order) {
    const first = earliest(g)
    const run = runs.find((r) => !paired.has(r) && (Number.isNaN(time(r)) || first === Infinity || time(r) <= first))
    if (run === undefined) continue
    paired.add(run)
    for (const p of g) out.add(p)
  }
  for (const s of shells) if (runs.some((r) => Number.isNaN(time(r)) || Number.isNaN(time(s)) || time(r) >= time(s))) out.add(s)
  return out
}

/*  The running work with each run counted once, as the release's runningOnce and runningWork read it. */
function runningOnce (x, readers) {
  const host = x.host || 'local'
  const listing = x.listing
  let processes = listing && listing.ok ? listing.processes.slice() : []
  if (listing && listing.ok && typeof x.keyOf === 'function') {
    const helpers = drillHelpers(processes, x.keyOf, readers)
    processes = processes.filter((p) => !helpers.has(p))
    for (const s of (x.starts || []).filter((e) => e && e.used && !e.endedAt && (e.host || host) === host)) {
      const at = Date.parse(s.startedAt || '')
      const k = processes.findIndex((p) => x.keyOf(p.command) === s.tableId && (Number.isNaN(at) || !p.startedAt || Date.parse(p.startedAt) >= at))
      if (k >= 0) processes.splice(k, 1)
    }
  }
  const running = []
  let state = null
  if (typeof x.keyOf !== 'function') state = { state: 'unavailable', why: x.why || 'the reader of the heavy-run table could not be run' }
  else if (!listing || !listing.ok) state = { state: 'unavailable', why: listing && listing.why ? listing.why : 'no process listing was read' }
  else {
    state = { state: 'present', why: null }
    for (const p of processes) {
      const id = x.keyOf(p.command)
      if (id) running.push({ entry: p.command, tableId: id, host, startedAt: p.startedAt, seenAs: 'process', wave: null, plan: null, sameWave: null })
    }
  }
  for (const s of x.starts || []) if (s && s.used && !s.endedAt) running.push({ entry: s.id, tableId: s.tableId, host: s.host || host, startedAt: s.startedAt, seenAs: 'entry', wave: s.wave || null, plan: s.plan || null, sameWave: null })
  for (const a of x.agents || []) if (a && !a.endedAt) running.push({ entry: a.id, tableId: 'agent', host: a.host || host, startedAt: a.startedAt, seenAs: 'agent', wave: a.wave || null, plan: a.plan || null, sameWave: null })
  return { running, processes: state }
}

/*  The reading: { human, json, exit }. `deps` replaces the samplers and the listing in a check. */
function hostReading (ctx, argv, deps) {
  const d = deps || {}
  const i = argv.indexOf('--scope')
  const scope = i >= 0 ? String(argv[i + 1] || '') : ''
  const refused = (why) => ({ human: ['REFUSED: ' + why], json: { refused: why }, exit: 2 })
  if (!SCOPE_RE.test(scope)) return refused('mc17 converge host takes --scope {SCOPE}, the letters and digits of a Mission\'s ids')
  const dir = path.join(ctx.places.store, scope)
  if (!fs.existsSync(path.join(dir, 'store.json'))) return refused('no store of ' + scope + ' stands on this computer at ' + dir)
  let policy = ''
  try { policy = fs.readFileSync(path.join(ctx.places.root, 'harness', 'converge', 'policy.md'), 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n') } catch (_) { policy = '' }
  const kind = osKind()
  const sample = (ctx.hostState || hostState)({ wait: d.wait, sampler: d.sampler, figure: policyFigure(policy, BUSY_FIGURE, kind) })
  const readers = require('./readings/processes.js')
  const listed = d.listing !== undefined ? d.listing : readers.processListing({})
  let keyOf = null
  let why = null
  if (listed.ok) {
    const keyed = readers.keyRun(ctx, listed.processes.map((p) => p.command))
    if (keyed.ok) {
      const byCommand = new Map()
      listed.processes.forEach((p, k) => { const s = keyed.starts[k] || []; if (!byCommand.has(p.command)) byCommand.set(p.command, s.length ? s[0].tableId : null) })
      keyOf = (c) => (byCommand.has(c) ? byCommand.get(c) : null)
    } else why = keyed.why
  }
  const entries = startsOf(dir)
  const heavy = entries.filter((e) => e.tableId !== 'agent')
  const agents = entries.filter((e) => e.used && e.tableId === 'agent')
  const work = runningOnce({ listing: listed, keyOf, why, starts: heavy, agents, host: 'local' }, readers)
  const hostPart = { busy: sample.busy === undefined ? null : sample.busy, running: work.running.map((x) => ({ tableId: x.tableId, host: x.host })) }
  const read = work.processes.state === 'present'
  const human = ['Scope     : ' + scope, 'Load      : ' + sample.load + ' percent over ' + sample.cores + ' processors', 'Busy      : ' + sample.busy + ', against the figure ' + (sample.figure === null ? 'none' : sample.figure),
    'Running   : ' + (work.running.length ? work.running.map((r) => r.tableId + ' on ' + r.host + ' as ' + r.seenAs).join(', ') : 'none'), 'Processes : ' + work.processes.state + (work.processes.why ? ', ' + work.processes.why : ''), 'Host part : ' + canonicalJson(hostPart)]
  return { human, json: { ok: read, scope, load: sample.load, busy: sample.busy, figure: sample.figure, cores: sample.cores, sampledAt: sample.sampledAt, os: kind, running: work.running, processes: work.processes, hostPart }, exit: read ? 0 : 1 }
}

/*  The local command: prints the reading and answers its exit. The programs are the ones kept at login. */
function hostCommand (ctx, argv) {
  if (!ctx.programs) {
    try {
      const { openStore } = require('./store.js')
      const s = openStore(ctx)
      const kept = s.none ? null : s.getAll(['programs']).programs
      ctx.programs = (ctx.test && ctx.test.programs) || (kept ? JSON.parse(kept) : null)
    } catch (_) { ctx.programs = (ctx.test && ctx.test.programs) || null }
  }
  const r = hostReading(ctx, argv)
  ctx.out((argv.indexOf('--json') >= 0 ? JSON.stringify(r.json) : r.human.join('\n')) + '\n')
  return r.exit
}

module.exports = { policyFigure, startsOf, runningOnce, hostReading, hostCommand }

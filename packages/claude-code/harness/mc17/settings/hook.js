'use strict'
// The session-start hook of `mc17 settings`. `--hook head` prints the machine line, the account and the documents of the
// person's settings collection; `--hook {KIND}:{i}/{m}` prints part i of one document between two labels; `--hook all`
// prints every part of PARTS in its order in one process, each with its own lines and record, the parts reading together
// and sharing each read they make alike; each command writes its lines opening `[MC settings]` and the start's mark, ends
// with its hook record and exits 0, its corpus reads ending 8 seconds after its process started. `--measure` starts the
// hook's commands as the package's host starts them and prints their records. The cut of a body into parts and the forms of
// the lines stand here too.

const crypto = require('node:crypto')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const cp = require('node:child_process')
const { performance } = require('node:perf_hooks')
// The shipped copy reads through DevyonQ: source.js resolves the client's session, and every GET goes through the client's
// gateway transport (IP-MC-SERVER-002 Step 10). It imports no network module of its own and no file of the engine.
const source = require('./source.js')
const collections = require('./collections.js')
const titles = require('./titles.js')
const read = require('./read.js')

/*  The most UTF-16 code units a part holds: the cap of a hook's string less a reserve of 1,000 for the labels, the added
 *  newline and the hook record. */
const PART_UNITS = 9000
/*  The longest string Claude Code passes into the session whole, in UTF-16 code units. */
const STRING_CAP = 10000

/*  The hold, which keeps the session from production, other people and approvals until it has read the person's MANDATE;
 *  `title` is that document's title in a code span, or nothing where no title is known. */
function holdSentence (title) {
  return 'Until it has read ' + (title || 'the person\'s MANDATE') + ' whole, with mc17 settings or through its CanonQ connector, the session sends nothing to production or to other people and gives no approval in the person\'s name; a word of the person in the chat lifts this hold for the one act it names.'
}

/*  The start's mark: the first eight hex characters of the sha256 of the event's session_id, or of the empty string. */
const markOf = (sessionId) => crypto.createHash('sha256').update(String(sessionId === undefined || sessionId === null ? '' : sessionId)).digest('hex').slice(0, 8)

/*  The event a command read on its standard input: { ok, event, sessionId }. ok is false where standard input is a
 *  terminal, holds no JSON object, or names an event other than SessionStart; the session id is the input's own where it
 *  holds one, and the empty string otherwise. */
function eventOf (text, terminal) {
  let e = null
  try { e = terminal ? null : JSON.parse(text) } catch (x) { e = null }
  const object = e !== null && typeof e === 'object' && !Array.isArray(e)
  const sessionId = object && typeof e.session_id === 'string' ? e.session_id : ''
  const ok = object && e.hook_event_name === 'SessionStart'
  return { ok, event: object ? e : {}, sessionId }
}

/*  The opening of every line the hook writes itself. */
const opening = (mark) => '[MC settings] #' + mark + ' '

/*  A value from the corpus as a line of the hook prints it: cleaned and cut at 120 UTF-16 code units by the command's own
 *  cut, cut again at `max` where that is less, and set in a code span. */
function corpusValue (value, max) {
  const cut = read.corpusValue(value, 120)
  return '`' + (max && max < 120 ? read.corpusValue(cut, max) : cut) + '`'
}

/*  The machine's name: the host name the system reports, each control character and backtick read as a space, cut at 63. */
const machineName = () => read.corpusValue(os.hostname(), 63)

/*  A last editor as a label names it: in a code span, or `not reported` where the value is empty. */
const editorName = (value) => (String(value === undefined || value === null ? '' : value).trim() === '' ? 'not reported' : corpusValue(value))

/*  A body's lines, each with its line end. */
const linesOf = (body) => String(body).match(/[^\n]*\n|[^\n]+$/g) || []

/*  The most code points the cut moves back over combining marks; past them it cuts at the figure. */
const MARK_STEPS = 32

/*  Where a line longer than a part is cut: at `max` units, moved back off the high half of a surrogate pair, then back by
 *  one code point while the code point after the cut is a combining mark, at most MARK_STEPS times; where a mark still
 *  follows, at the figure moved off the surrogate pair alone. */
function cutPoint (text, max) {
  let at = max
  if (/[\uD800-\uDBFF]/.test(text[at - 1])) at -= 1
  const figure = at
  for (let steps = 0; at > 1 && /\p{M}/u.test(String.fromCodePoint(text.codePointAt(at))); steps += 1) {
    if (steps === MARK_STEPS) return figure
    at -= (/[\uDC00-\uDFFF]/.test(text[at - 1]) && /[\uD800-\uDBFF]/.test(text[at - 2])) ? 2 : 1
  }
  return at > 0 ? at : max
}

/*  A body cut into parts of whole lines, each at most PART_UNITS UTF-16 code units, a longer line cut at a code point; the
 *  parts joined equal the body, and an empty body is one empty part. The cut reads the body alone. */
function cutParts (body) {
  const parts = []
  let current = ''
  for (const line of linesOf(body)) {
    if (current.length + line.length <= PART_UNITS) { current += line; continue }
    if (current !== '') parts.push(current)
    current = line
    while (current.length > PART_UNITS) {
      const at = cutPoint(current, PART_UNITS)
      parts.push(current.slice(0, at))
      current = current.slice(at)
    }
  }
  if (current !== '' || parts.length === 0) parts.push(current)
  return parts
}

/*  A part's opening or closing label: its title cut at 40 and its asset id, each in a code span, its version, its place,
 *  and its last editor where `p.editor` is not null, before its last word. */
function label (mark, p, word) {
  return opening(mark) + corpusValue(p.title, 40) + ', asset ' + corpusValue(p.id) + ', version ' + p.version + ', part ' + p.i + ' of ' + p.n +
    (p.editor === null || p.editor === undefined ? '' : ', last edited by ' + editorName(p.editor)) + ', ' + word + '.'
}

/*  The places of the parts from `from` to `to` as a line names them. */
function places (from, to) {
  const list = []
  for (let k = from; k <= to; k += 1) list.push(String(k))
  if (list.length === 1) return 'part ' + list[0] + ' was'
  return 'parts ' + list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] + ' were'
}

/*  The line of the last slot of a document with more parts than slots: the parts from `from` on were left out, the session
 *  reads the document whole before its first act, and for MANDATE the hold. */
function overflowLine (mark, p, from) {
  const title = corpusValue(p.title)
  const holds = p.kind === 'MANDATE' ? ' ' + holdSentence(title) : ''
  return opening(mark) + title + ' holds ' + p.n + ' parts and this start has ' + p.m + ' slots for it, so ' + places(from, p.n) + ' left out; the session reads ' + title + ' whole with mc17 settings --text ' + title + ' before its first act.' + holds
}

/*  The line after a part of MANDATE whose last editor is another than the account: the session holds until the person
 *  confirms that version in the chat. */
function mandateEditorLine (mark, p) {
  return opening(mark) + corpusValue(p.title) + ' version ' + p.version + ' was last edited by ' + editorName(p.editor) + ': until the person confirms that version in the chat, the session sends nothing to production or to other people and gives no approval in the person\'s name.'
}

/*  `text` with its hook record as its last line: what the command delivered, the size of the whole string in UTF-16 code
 *  units with the record's own digits counted, the milliseconds the record states, the kind of start, the machine, the
 *  plugin version and the date. */
function withRecord (text, mark, r) {
  const line = (size) => opening(mark) + 'Hook record: ' + r.what + ', ' + size + ' characters, ' + r.ms + ' ms to this line, start ' + r.source + ', machine ' + r.machine + ', devyonq-mc ' + r.version + ', ' + r.date + '.\n'
  let size = text.length
  for (let k = 0; k < 6; k += 1) {
    const next = text.length + line(size).length
    if (next === size) break
    size = next
  }
  return text + line(size)
}

/*  A slot's string for its part: the part between its two labels and the added newline, the line on another editor's
 *  MANDATE and the line on the parts left out where they apply, then the hook record. `p` holds the title, asset id,
 *  version, place `i` of `n`, the slot count `m`, the kind, the last editor (null for the account), the part and the
 *  record's fields. Where that string would pass the cap, those lines and the record stand in place of the part and its
 *  labels, and the slot names its own place among the parts it left out. */
function slotString (mark, p) {
  const editorLine = p.kind === 'MANDATE' && p.editor !== null && p.editor !== undefined
  const last = p.n > p.m && p.i === p.m
  const lines = (editorLine ? [mandateEditorLine(mark, p)] : []).concat(last ? [overflowLine(mark, p, p.m + 1)] : [])
  const whole = label(mark, p, 'begins') + '\n' + p.part + '\n' + label(mark, p, 'ends') + '\n' + lines.map((l) => l + '\n').join('')
  const full = withRecord(whole, mark, Object.assign({}, p.record, { what: corpusValue(p.title, 40) + ' part ' + p.i + ' of ' + p.n }))
  if (full.length <= STRING_CAP) return full
  const left = (editorLine ? [mandateEditorLine(mark, p) + ' This slot left out part ' + p.i + ' of ' + p.n + '; the session reads ' + corpusValue(p.title) + ' whole with mc17 settings --text ' + corpusValue(p.title) + '.'] : [])
    .concat(last ? [overflowLine(mark, p, p.i)] : [])
  return withRecord(left.map((l) => l + '\n').join(''), mark, Object.assign({}, p.record, { what: p.kind + ' slot ' + p.i + ' of ' + p.m + ', no part' }))
}

/*  The milliseconds after the start of the process at which the hook's corpus reads end. */
const DEADLINE_MS = 8000
/*  The plugin's folder, three folders up from this file. */
const PLUGIN_DIR = path.join(__dirname, '..', '..', '..')
/*  A slot's value: its kind, its place and its document's slot count. */
const SLOT_RE = /^(ORDERS|MANDATE|SETUP|MISSIONS):([1-9][0-9]?)\/([1-9][0-9]?)$/
/*  The value of --hook that prints every part in one process. */
const ALL = 'all'
/*  The parts of the hook in the order each host's hook file starts them: the head, then the slots of ORDERS, MANDATE,
 *  SETUP and MISSIONS, five, three, three and seven. */
const PARTS = ['head'].concat(...[['ORDERS', 5], ['MANDATE', 3], ['SETUP', 3], ['MISSIONS', 7]].map(([kind, m]) => Array.from({ length: m }, (x, i) => kind + ':' + (i + 1) + '/' + m)))
/*  The words of a read that met the deadline. */
const NO_ANSWER = 'no answer within 8 seconds'

/*  The connector rule: how the session reads the four documents through its CanonQ connector where the hook could not,
 *  with `instance` the settings instance the hook read, or nothing where it read none. */
function connectorRule (instance) {
  const on = instance || 'the person\'s settings instance'
  return 'Before its first act, the session reads the four documents through its CanonQ connector by one rule: it lists the restricted collections titled MC Settings that its connector reads on ' + on + ', and shows the person each one\'s title, id and document count; it says that the connector does not show a collection\'s owner; once the person names one, it lists that collection\'s documents alone, shows the person each one\'s title and last editor, and reads their text only after the person confirms that the collection is theirs; it names to the person each of those documents whose last editor is another name than the account\'s, with that editor and the version, and for MANDATE holds until the person confirms that version in the chat; it reads only the collection the person names; it creates and writes no settings through the connector; where it does not know which of its connectors serves ' + on + ', it reads through none of them and asks the person; and where the connector reads no document either, it tells the person.'
}

/*  A line of the head that holds the session: `line` with the hold after it. */
const held = (line, title) => line + ' ' + holdSentence(title)

/*  The hold where an undelivered document is MANDATE, as the end of its line; nothing for another kind. */
const holdFor = (kind, title) => (kind === 'MANDATE' ? ' ' + holdSentence(title) : '')

/*  The client's context, where the client runs the hook in its own process, and the gateway read of the session the
 *  resolver found: the hook's reads go through DevyonQ alone (IP-MC-SERVER-002 Step 10; ARCH D23; AC-21). */
let CLIENT = null
let GATEWAY_GET = null

/*  The resolver of the parts, which keeps the gateway read of the session it found for the hook's GET. */
function resolved () {
  const r = source.resolve({ hook: true, client: CLIENT })
  if (r.ok) { GATEWAY_GET = r.creds.get; CLIENT = r.creds.ctx }
  return r
}

/*  The hook's own GET: one read through the client's gateway transport, ended when the time left before the deadline
 *  runs out, and no request started once it has. Resolves { json, etag }; rejects with `status` set where the gateway
 *  refuses, and otherwise with the cause in its message: DevyonQ out of reach, an answer that is no JSON, or the deadline. */
function hookGet (url, pat) {
  return new Promise((resolve, reject) => {
    const left = DEADLINE_MS - performance.now()
    if (left <= 0) return reject(new Error(NO_ANSWER))
    if (typeof GATEWAY_GET !== 'function') return reject(new Error('the client holds no sign-in; run mc17 login in a terminal of your own'))
    let done = false
    const finish = (fn) => { if (!done) { done = true; clearTimeout(timer); fn() } }
    const timer = setTimeout(() => finish(() => reject(new Error(NO_ANSWER))), left)
    GATEWAY_GET(url, pat).then((r) => finish(() => resolve(r)), (e) => finish(() => reject(e)))
  })
}

/*  The GET of one part in a run of every part, called as hookGet is: the k-th request of a part to an address is made once,
 *  by the first part to ask it, and its answer or its failure is handed to every part whose k-th request goes there, so the
 *  parts read the account, the collections and the document list once, and each document's reads once for all its slots.
 *  `memo` is the run's map of the requests made. */
function sharedGet (memo) {
  const asked = new Map()
  return (url, pat) => {
    const k = (asked.get(url) || 0) + 1
    asked.set(url, k)
    const key = k + ' ' + url
    if (!memo.has(key)) memo.set(key, hookGet(url, pat))
    return memo.get(key)
  }
}

/*  The cause a failed read names: the corpus's answer, or the words of the failure. */
const causeOf = (x) => (x && typeof x.refused === 'number' ? 'answered ' + x.refused : (x && typeof x.status === 'number' ? 'answered ' + x.status : String((x && x.message) || x)))

/*  The plugin version the package's manifest names, .claude-plugin/plugin.json on Claude Code and the manifest
 *  the client finds on every other host, as mc17 version prints it, or `unknown` where it cannot be read. */
function pluginVersion () {
  try {
    const v = require(path.join(PLUGIN_DIR, 'client', 'lib', 'version.js')).pluginNameAndVersion(PLUGIN_DIR).version
    return typeof v === 'string' && /^[0-9A-Za-z.+-]{1,40}$/.test(v) ? v : 'unknown'
  } catch (e) {
    return 'unknown'
  }
}

/*  The fields of a hook record, but what it delivered: the milliseconds since the process started, the kind of start, the
 *  machine, the plugin version and the date in UTC. */
function recordFields (st) {
  return { ms: Math.round(performance.now()), source: st.source, machine: machineName(), version: pluginVersion(), date: new Date().toISOString().slice(0, 10) }
}

/*  A command's string of `lines` ended by its record, which names what the command delivered. */
const closed = (st, lines, what) => withRecord(lines.map((l) => l + '\n').join(''), st.mark, Object.assign(recordFields(st), { what }))

/*  The fields of the hook record that ends `text`, or null where its last line is no record. */
function recordOf (text) {
  const m = /Hook record: (.*), (\d+) characters, (\d+) ms to this line, start ([^,]*), machine (.*), devyonq-mc ([^,]*), (\d{4}-\d{2}-\d{2})\.\n?$/.exec(String(text))
  return m ? { what: m[1], size: Number(m[2]), ms: Number(m[3]), start: m[4], machine: m[5], version: m[6], date: m[7] } : null
}

/*  The one collection that passes the test, or null where none or two or more pass. */
const theCollection = (found) => (found.passing.length === 1 ? found.passing[0] : null)

/*  Standard input read to its end: { text, terminal }. */
function readInput () {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve({ text: '', terminal: true })
    const chunks = []
    process.stdin.on('data', (d) => chunks.push(d))
    process.stdin.on('end', () => resolve({ text: Buffer.concat(chunks).toString('utf8'), terminal: false }))
    process.stdin.on('error', () => resolve({ text: Buffer.concat(chunks).toString('utf8'), terminal: false }))
  })
}

/*  The head's machine line: the plugin version, the machine, the host, the login, the account's name and the collection,
 *  each value not read naming so, and the Owner-line comparison asked of the session. */
function machineLine (st, k) {
  return opening(st.mark) + 'devyonq-mc ' + pluginVersion() + ', machine ' + machineName() + ', host ' + (k.host || 'not read') + ', login ' + (k.login ? corpusValue(k.login) : 'not read') +
    ', account ' + (k.login ? (k.name ? corpusValue(k.name) : 'not reported') : 'not read') + ', collection ' + (k.collection ? corpusValue(k.collection.title) + ' (' + corpusValue(k.collection.id) + ')' : 'not read') +
    '. The session compares the Owner line of each delivered document with the account\'s name before its first act, and asks the person where they differ.'
}

/*  The head's line on the settings instance the hook read. */
function instanceLine (st, r) {
  if (!r || !r.ok) return opening(st.mark) + 'The settings instance is not read.'
  return opening(st.mark) + 'The settings are read through DevyonQ at ' + (r.gateway || r.instance.origin) + ', the gateway mc17 login kept.'
}

/*  The head's line where the corpus stopped a read: the host, the read, the cause, the hold and the connector rule. */
function corpusLine (st, r, what, cause) {
  return held(opening(st.mark) + 'The reads through DevyonQ at ' + (r.gateway || r.host) + ' stopped the hook at ' + what + ': ' + cause + '. The hook read nothing more.', null) + ' ' + connectorRule(r.instance.host)
}

/*  The head's line where the credentials or the settings instance stop it before any read. */
function credentialsLine (st, r) {
  if (!r.ok) return held(opening(st.mark) + 'The hook read nothing: ' + String(r.refusal).replace(/^REFUSED: /, ''), null) + ' ' + connectorRule(null)
  return held(opening(st.mark) + 'The credentials point to ' + r.host + ', and the settings instance is ' + r.instance.host + (r.instance.named ? ', named in ~/.canonq/settings-instance' : '') +
    '; the hook reads the settings on the settings instance alone, so it read nothing.', null) + ' ' + connectorRule(r.instance.host)
}

/*  The read of the document list of collection `c`, as a line names it. */
const listRead = (c) => 'the document list of the collection ' + corpusValue(c.title) + ' (' + corpusValue(c.id) + ')'

/*  The head's lines where no single collection passes: one line naming the near misses, or that none stands, or the
 *  collections that pass, with the hold. `room` is the count of characters the near misses may take. */
function noCollectionLine (st, r, acct, found, room) {
  const host = r.instance.host
  if (found.passing.length >= 2) return held(opening(st.mark) + found.passing.length + ' collections pass the test of a settings collection: ' + found.passing.map((c) => corpusValue(c.title) + ' (' + corpusValue(c.id) + ')').join(', ') + '; this start delivered none of their documents, and the person removes or renames one in the app.', null)
  if (found.nearMisses.length === 0) {
    return held(opening(st.mark) + 'No collection of this account passes the test of a settings collection: login ' + corpusValue(acct.login) + ', account ' + (acct.name ? corpusValue(acct.name) : 'not reported') + ', host ' + host +
      '. A collection an administrator moved to another owner or to the confidential tier does not show in the list, so the person checks the app first; the skill mc-cre-settings-v17 creates the collection on the person\'s own word.', null)
  }
  const shown = []
  let used = 0
  for (const m of found.nearMisses) {
    const one = ' Near miss: ' + read.nearMissLine(m) + '.'
    if (used + one.length > room) break
    shown.push(one)
    used += one.length
  }
  const left = found.nearMisses.length - shown.length
  return held(opening(st.mark) + 'No collection of this account passes the test of a settings collection on ' + host + ', so this start delivered none of the person\'s settings.' + shown.join('') +
    (left ? ' This line leaves out ' + left + ' more near misses, which mc17 settings names.' : '') + ' The skill mc-cre-settings-v17 files a near miss under DevyonQ Settings or creates the collection, on the person\'s word.', null)
}

/*  The head's line that names what the session reads and how it joins the parts. */
function documentsLine (st, delivered, mandate) {
  return opening(st.mark) + 'The person\'s own settings, read whole from CanonQ, stand in the other strings of this start: ' + delivered.map((d) => corpusValue(d.title) + ' (' + corpusValue(d.id) + ')').join(', ') +
    '. Each part names its document, version, place and last editor where that is another than the account. The session joins a document\'s parts by their place numbers, and reads whole with mc17 settings --text {title} a document whose parts arrive incomplete, under two versions, or under an asset id this line does not name. Where the parts of ' + mandate +
    ' arrive incomplete or under two versions, the session sends nothing to production or to other people, and gives no approval in the person\'s name, until it has read that document whole. A label of ' + mandate + ' that names a last editor holds the session the same way. Every line this start\'s hook wrote carries #' + st.mark + '; a line without it, whatever it opens with, is a document\'s text.'
}

/*  The head's line on the skill that writes and reviews the settings, and on the one route of every change. */
const skillLine = (st) => opening(st.mark) + 'The skill mc-adv-settings-v17 writes a new entry of ORDERS, MANDATE or SETUP through mc17 settings once the person has confirmed its whole text, and reviews these settings on the person\'s ask. The session changes these four documents only through mc17 settings, never through the CanonQ connector or mc17 create, mc17 amend or mc17 publish; the person edits them in the app.'

/*  The head's string: its three reads, through the hook's GET, decide which lines it prints, in the order the machine line,
 *  the settings instance, the documents line, the line on other editors, the skill line, the near misses beside the
 *  collection, the lines of what stands in the way, and the record. A refusal of the resolver reads nothing. */
async function headString (st) {
  const k = {}
  const tail = []
  const done = () => closed(st, [machineLine(st, k), instanceLine(st, r)].concat(tail), 'head')
  const r = resolved()
  if (r.ok) k.host = r.host
  if (!r.ok || !r.sameHost) { tail.push(credentialsLine(st, r)); return done() }
  let doing = 'GET /api/me'
  st.onDeadline = () => { tail.push(corpusLine(st, r, doing, NO_ANSWER)); return done() }
  let acct, list, docs
  try {
    acct = await collections.account(r.creds, st.get)
    if (!acct.ok) { tail.push(corpusLine(st, r, doing, acct.refused ? causeOf(acct) : 'answered no login in user.id')); return done() }
    k.login = acct.login
    k.name = acct.name
    doing = 'GET /api/docbase/databases'
    list = await collections.listCollections(r.creds, st.get)
    if (!list.ok) { tail.push(corpusLine(st, r, doing, list.refused ? causeOf(list) : 'answered no list of collections')); return done() }
  } catch (e) {
    tail.push(corpusLine(st, r, doing, causeOf(e)))
    return done()
  }
  const found = collections.personsCollection(list.collections, acct.login)
  const c = theCollection(found)
  if (!c) {
    const room = 9000 - done().length - 1000
    tail.push(noCollectionLine(st, r, acct, found, room))
    return done()
  }
  k.collection = c
  doing = listRead(c)
  try {
    docs = await collections.documentList(r.creds, st.get, c.id)
  } catch (e) {
    tail.push(corpusLine(st, r, doing, causeOf(e)))
    return done()
  }
  if (!docs.ok) { tail.push(corpusLine(st, r, doing, docs.refused ? causeOf(docs) : 'answered no list of documents')); return done() }
  const kinds = titles.kindsIn(docs.documents)
  const initials = read.initialsIn(docs.documents) || ''
  const mandate = corpusValue(kinds.byKind.MANDATE ? kinds.byKind.MANDATE.title : 'MANDATE-' + initials)
  const delivered = []
  const others = []
  const stands = []
  for (const kind of titles.KINDS) {
    const two = kinds.doubled[kind]
    const d = kinds.byKind[kind]
    if (two) {
      stands.push(opening(st.mark) + 'Two documents of the kind ' + kind + ' stand in the collection ' + corpusValue(c.title) + ': ' + two.map((x) => corpusValue(x.title) + ' (asset ' + corpusValue(x.id) + ')').join(' and ') + '; this start delivered neither, and mc17 settings names both.' + holdFor(kind, mandate))
    } else if (!d) {
      stands.push(opening(st.mark) + corpusValue(kind + '-' + initials) + ' is missing from the collection ' + corpusValue(c.title) + '; the skill mc-cre-settings-v17 creates it.' + holdFor(kind, mandate))
    } else {
      delivered.push(d)
      if (!read.isAccount(d.lastEditor, acct)) others.push({ title: d.title, editor: d.lastEditor, kind, assetId: d.id })
    }
  }
  tail.push(documentsLine(st, delivered, mandate))
  const editors = read.editorLine(opening(st.mark).trimEnd(), others, r.instance.host)
  if (editors) tail.push(editors)
  tail.push(skillLine(st))
  const near = found.nearMisses.map((m) => opening(st.mark) + 'Near miss: ' + read.nearMissLine(m) + '.')
  let kept = 0
  while (kept < near.length && done().length + near[kept].length + stands.join('\n').length + 200 <= 9000) tail.push(near[kept++])
  if (kept < near.length) tail.push(opening(st.mark) + 'This start names ' + kept + ' of ' + near.length + ' near misses; mc17 settings names them all.')
  for (const l of stands) tail.push(l)
  return done()
}

/*  A slot's line where its own reads failed after it found its document, with the hold for MANDATE. */
function failedLine (mark, kind, i, m, title, cause) {
  const line = opening(mark) + kind + ' slot ' + i + ' of ' + m + ': ' + cause + ', so this slot delivered nothing; the session reads ' + title + ' whole with mc17 settings --text ' + title + '.'
  return kind === 'MANDATE' ? line + ' ' + holdSentence(title) : line
}

/*  The first slot's line where the corpus refused the read of its document or of its version list. */
function unreadableLine (mark, kind, d, cause) {
  const title = corpusValue(d.title)
  return opening(mark) + title + ', asset ' + corpusValue(d.id) + ': the corpus ' + cause + ' to the read of the document, so this start delivered none of its parts; the session reads it with mc17 settings --text ' + title + ' once the corpus does.' + holdFor(kind, title)
}

/*  A slot's string: the account answer, the collection list and the document list find its document; its version list is
 *  read before and after the document, and once more with the document where the two differ; the body is cut and part i
 *  printed between its labels. A slot with no part to print prints its record alone, the first slot of a refused document
 *  names it, and a slot whose own reads failed after it found its document prints one line. */
async function slotStringOf (st, kind, i, m) {
  const unread = () => closed(st, [], kind + ' slot ' + i + ' of ' + m + ', unread')
  const noPart = () => closed(st, [], kind + ' slot ' + i + ' of ' + m + ', no part')
  st.onDeadline = unread
  const r = resolved()
  if (!r.ok || !r.sameHost) return noPart()
  let acct, d, c
  try {
    acct = await collections.account(r.creds, st.get)
    if (!acct.ok) return unread()
    const list = await collections.listCollections(r.creds, st.get)
    if (!list.ok) return unread()
    c = theCollection(collections.personsCollection(list.collections, acct.login))
    if (!c) return noPart()
    const docs = await collections.documentList(r.creds, st.get, c.id)
    if (!docs.ok) return unread()
    const kinds = titles.kindsIn(docs.documents)
    if (kinds.doubled[kind] || !kinds.byKind[kind]) return noPart()
    d = kinds.byKind[kind]
  } catch (e) {
    return unread()
  }
  const failed = (cause) => closed(st, [failedLine(st.mark, kind, i, m, corpusValue(d.title), cause)], kind + ' slot ' + i + ' of ' + m + ', unread')
  const refused = (x) => (i === 1 ? closed(st, [unreadableLine(st.mark, kind, d, causeOf(x))], kind + ' slot ' + i + ' of ' + m + ', unread') : unread())
  st.onDeadline = () => failed(NO_ANSWER)
  let version, rec
  try {
    const a = await read.versionCount(r.creds, st.get, d.id)
    if (typeof a !== 'number') return refused(a)
    rec = await read.documentRead(r.creds, st.get, d.id)
    if (rec.refused) return refused(rec)
    const b = await read.versionCount(r.creds, st.get, d.id)
    if (typeof b !== 'number') return refused(b)
    version = String(b)
    if (a !== b) {
      rec = await read.documentRead(r.creds, st.get, d.id)
      if (rec.refused) return refused(rec)
      const again = await read.versionCount(r.creds, st.get, d.id)
      if (typeof again !== 'number') return refused(again)
      version = again === b ? String(again) : b + ' or ' + again
    }
  } catch (e) {
    return failed(causeOf(e))
  }
  const parts = cutParts(rec.body)
  if (i > parts.length) return noPart()
  const editor = read.isAccount(d.lastEditor, acct) ? null : (d.lastEditor === undefined ? '' : d.lastEditor)
  return slotString(st.mark, { title: d.title, id: d.id, version, i, n: parts.length, m, kind, editor, part: parts[i - 1], record: recordFields(st) })
}

/*  Whether the value of --hook names a part: the head, or a slot whose place is no greater than its document's slot count. */
function isPart (value) {
  const slot = SLOT_RE.exec(value)
  return value === 'head' || Boolean(slot && Number(slot[2]) <= Number(slot[3]))
}

/*  What the record of a part `value` names where the part delivered nothing: the head, the slot with no part, or the value
 *  of no hook form in a code span. */
function whatOf (value) {
  const slot = SLOT_RE.exec(value)
  return value === 'head' ? 'head' : (isPart(value) ? slot[1] + ' slot ' + slot[2] + ' of ' + slot[3] + ', no part' : corpusValue(value, 40))
}

/*  The string of a part that read no session-start event. */
const noEventString = (st) => closed(st, [opening(st.mark) + 'mc17 settings --hook read no session-start event on its standard input, so it read nothing.'], whatOf(st.value))

/*  The string of a part `st` where the hook met the error `e` of its own, with the hold for the head and a slot of MANDATE. */
function ownErrorString (st, e) {
  const value = st.value
  const holds = value === 'head' || value.startsWith('MANDATE:')
  return closed(st, [opening(st.mark) + (isPart(value) ? value : corpusValue(value, 40)) + ': the hook met an error of its own (' + String((e && e.name) || 'Error').slice(0, 40) + '), and this command delivered nothing.' + (holds ? ' ' + holdSentence(null) : '')], whatOf(value))
}

/*  The string of the part `st` names, its event read: the head's or the slot's, or the line of an error of the hook's own. */
async function partString (st) {
  const slot = SLOT_RE.exec(st.value)
  try {
    return st.value === 'head' ? await headString(st) : await slotStringOf(st, slot[1], Number(slot[2]), Number(slot[3]))
  } catch (e) {
    return ownErrorString(st, e)
  }
}

/*  The action `--hook`: takes the event from args.input where that is a string, else reads standard input, and answers
 *  { stdout, exit: 0, json }: the head's or a slot's string, or a line saying why it delivered nothing; for `all`, the
 *  string of each part of PARTS in its order, the parts reading together through sharedGet. At the deadline a timer calls
 *  args.written where it is a function, writes what is due then, each part's own string where it has one and the line its
 *  reads leave due where it has none, and exits 0; the command writes once. */
async function hookAction (args) {
  if (args && args.client) CLIENT = args.client
  const value = String(args.hook)
  const known = value === ALL || isPart(value)
  const sts = (value === ALL ? PARTS : [value]).map((v) => ({ value: v, mark: markOf(''), source: 'unknown', onDeadline: null, get: hookGet, text: null }))
  if (value === ALL) { const memo = new Map(); for (const s of sts) s.get = sharedGet(memo) }
  const st = sts[0]
  let written = false
  /*  The string due for one part at the deadline: its own where it has one, else the line its reads leave due. */
  const due = (s) => { if (s.text !== null) return s.text; try { return s.onDeadline ? s.onDeadline() : noEventString(s) } catch (e) { return '' } }
  const deadline = () => {
    if (written) return
    written = true
    const text = sts.map(due).join('')
    if (typeof args.written === 'function') args.written()
    process.stdout.write(args.json ? JSON.stringify({ text }, null, 2) + '\n' : text, () => process.exit(0))
  }
  const timer = setTimeout(deadline, Math.max(0, DEADLINE_MS - performance.now()))
  const answer = (text) => {
    if (written) return new Promise(() => {})
    written = true
    clearTimeout(timer)
    return { stdout: text, exit: 0, json: { text, record: recordOf(text) } }
  }
  try {
    const input = typeof args.input === 'string' ? { text: args.input, terminal: false } : await readInput()
    const ev = eventOf(input.text, input.terminal)
    for (const s of sts) {
      s.mark = markOf(ev.sessionId)
      s.source = typeof ev.event.source === 'string' && /^[A-Za-z_-]{1,20}$/.test(ev.event.source) ? ev.event.source : 'unknown'
    }
    if (!known) return answer(closed(st, [opening(st.mark) + 'mc17 settings --hook ' + corpusValue(value, 40) + ': no hook command takes that form, and this command delivered nothing.'], whatOf(value)))
    if (!ev.ok) return answer(sts.map(noEventString).join(''))
    await Promise.all(sts.map(async (s) => { s.text = await partString(s) }))
    return answer(sts.map((s) => s.text).join(''))
  } catch (e) {
    return answer(sts.map((s) => (s.text !== null ? s.text : ownErrorString(s, e))).join(''))
  }
}

/*  The hook file of each host's package, beside the package's root. */
const HOOK_FILES = { 'claude-code': 'hooks/hooks.json', codex: 'hooks/hooks.json', copilot: 'com.github.copilot/hooks/hooks.json', 'openai-api': 'hooks/hooks.json' }
/*  The Windows PowerShell each Copilot client runs a Windows key through, found on the PATH, with the options the client
 *  passes. */
const POWERSHELL = () => 'powershell.exe'

/*  The settings part an entry's command names after --hook, or the command where it names none. */
const partOf = (text) => { const m = /--hook[ =]"?([^"\s]+)/.exec(String(text)); return m ? m[1] : String(text) }

/*  The runs of one SessionStart entry `e` of the package of `host` on this machine's system, each { what, key, cmd, argv,
 *  opts, limit }, the way that host starts the entry: Claude Code in exec form with the plugin's folder for
 *  ${CLAUDE_PLUGIN_ROOT}; Codex its command through sh, or its commandWindows through cmd.exe on Windows, with PLUGIN_ROOT
 *  set; Copilot the key each client picks, by the rule tests/hosts/copilot-package.test.js reads, the CLI's bash through sh or
 *  its powershell through Windows PowerShell, VS Code's linux or osx through sh with the folder in the text, or its windows
 *  through Windows PowerShell, with PLUGIN_ROOT set; mc-run its command's launcher read from the package's root. */
function entryRuns (host, e) {
  const env = Object.assign({}, process.env, { PLUGIN_ROOT: PLUGIN_DIR })
  const win = process.platform === 'win32'
  const sh = (key, text) => ({ key, cmd: 'sh', argv: ['-c', text], opts: { env } })
  const ps = (key, text, extra) => ({ key, cmd: POWERSHELL(), argv: (extra || []).concat(['-NoProfile', '-Command', text]), opts: { env } })
  let runs = []
  if (host === 'codex') {
    runs = [win ? { key: 'commandWindows', cmd: 'cmd.exe', argv: ['/Q', '/D', '/C', String(e.commandWindows || '')], opts: { env, windowsVerbatimArguments: true } } : sh('command', String(e.command || ''))]
  } else if (host === 'copilot') {
    const cli = win ? (e.powershell ? ps('powershell', e.powershell) : null) : (e.bash ? sh('bash', e.bash) : null)
    const vsKey = win ? (e.windows ? 'windows' : e.powershell ? 'powershell' : null) : process.platform === 'darwin' ? (e.osx ? 'osx' : e.bash ? 'bash' : null) : (e.linux ? 'linux' : e.bash ? 'bash' : null)
    const vsText = vsKey ? String(e[vsKey]) : null
    const vs = vsKey ? (win ? ps(vsKey, vsText, ['-ExecutionPolicy', 'Bypass', '-NoLogo']) : sh(vsKey, vsText.split('${PLUGIN_ROOT}').join(PLUGIN_DIR))) : null
    runs = [cli || (e.command ? sh('command', e.command) : null), vs || (e.command ? sh('command', e.command) : null)].map((r, i) => r && Object.assign(r, { client: i === 0 ? 'the Copilot CLI' : 'VS Code', limitS: Number(i === 0 ? e.timeoutSec : e.timeout) }))
  } else if (host === 'openai-api') {
    const m = /^node\s+"?([^"\s]+)"?\s+(.*)$/.exec(String(e.command || ''))
    runs = [m ? { key: null, cmd: process.execPath, argv: [path.join(PLUGIN_DIR, m[1])].concat(m[2].split(/\s+/).filter(Boolean)), opts: { env: process.env } } : { key: null, error: 'the command ' + JSON.stringify(e.command) + ' names no launcher' }]
  } else {
    runs = [Array.isArray(e.args) ? { key: null, cmd: e.command, argv: e.args.map((a) => String(a).split('${CLAUDE_PLUGIN_ROOT}').join(PLUGIN_DIR)), opts: { env: process.env } } : sh('command', String(e.command || '').split('${CLAUDE_PLUGIN_ROOT}').join(PLUGIN_DIR))]
  }
  return runs.filter(Boolean).map((r) => Object.assign({ what: host === 'claude-code' && Array.isArray(e.args) ? String(e.args.slice(-1)[0] || e.command) : partOf(r.argv ? r.argv.join(' ') : e.command), limit: (Number(r.limitS) || Number(e.timeout) || 60) * 1000 }, r))
}

/*  The text a command delivered: its output, or, where the output is one JSON object, its additionalContext. */
function contextOf (out) {
  let text = String(out)
  try {
    const o = JSON.parse(text)
    if (o && typeof o === 'object' && typeof o.additionalContext === 'string') text = o.additionalContext
  } catch (e) { /* a plain output */ }
  return text
}

/*  The last line of a command's output, where its hook record stands: the last line of the text it delivered. */
const lastLineOf = (out) => contextOf(out).replace(/\n+$/, '').split('\n').pop() || ''

/*  The action `--measure`: reads the entries under SessionStart in the hook file of the package it runs in, starts them
 *  together as that package's host starts them, each with the plugin's folder for the host's root, hands each a
 *  session-start event, waits for each at most its timeout, and prints each command's records, one for each part it runs, the
 *  nineteen of `all` among them, with the key it ran where the host has one, the time from the first start to the last exit
 *  and the count of parts delivered. It reads no corpus and prints no part. Exit 0 where every command exited 0 and printed
 *  the record of each part it runs. */
async function measureAction (args) {
  const host = require(path.join(PLUGIN_DIR, 'client', 'lib', 'version.js')).pluginHost(PLUGIN_DIR) || 'claude-code'
  const file = HOOK_FILES[host]
  const declared = JSON.parse(fs.readFileSync(path.join(PLUGIN_DIR, file), 'utf8'))
  const entries = [].concat(...(((declared.hooks || {}).SessionStart) || []).map((g) => (Array.isArray(g.hooks) ? g.hooks : [g])))
  const event = JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup', session_id: 'measure' })
  const planned = [].concat(...entries.map((e) => entryRuns(host, e)))
  const first = performance.now()
  const runs = await Promise.all(planned.map((p) => new Promise((resolve) => {
    const { what, key, limit } = p
    if (p.error) return resolve({ what, key, out: '', error: p.error, ended: performance.now() })
    let out = ''
    let over = false
    let child
    let settled = false
    const end = (x) => { if (!settled) { settled = true; clearTimeout(timer); resolve(Object.assign({ what, key, out, over, limit, ended: performance.now() }, x)) } }
    try {
      child = cp.spawn(p.cmd, p.argv, Object.assign({ shell: false, stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true }, p.opts))
    } catch (x) {
      return resolve({ what, key, out: '', error: String(x.code || x.message), ended: performance.now() })
    }
    const timer = setTimeout(() => { over = true; child.kill() }, limit)
    child.stdout.on('data', (d) => { out += d })
    child.on('error', (x) => end({ error: String(x.code || x.message) }))
    child.on('close', (code) => end({ code }))
    child.stdin.on('error', () => {})
    child.stdin.end(event)
  })))
  const recordRe = /^\[MC settings\] #[0-9a-f]{8} Hook record: /
  const mine = opening(markOf('measure')) + 'Hook record: '
  const one = entries.length === 1
  const how = host === 'claude-code' ? 'started together as exec form starts them' : host === 'openai-api' ? 'started together as mc-run starts them, each launcher read from the package\'s root' : (one ? 'run' : 'started together') + ' as ' + (host === 'codex' ? 'Codex' : 'each Copilot client') + (one ? ' starts it, the clients together' : ' starts them') + ', each with the key it runs on this system'
  const lines = ['mc17 settings --measure: the ' + entries.length + (one ? ' command' : ' commands') + ' under SessionStart in ' + file + ', ' + how + '.']
  let ok = entries.length > 0
  let parts = 0
  for (const run of runs) {
    const last = lastLineOf(run.out || '')
    const who = run.what + (run.key ? ' (' + run.key + ')' : '')
    if (run.error) {
      ok = false
      lines.push(who + ': could not start (' + run.error + ').')
    } else if (run.over) {
      ok = false
      lines.push(who + ': still running after ' + Math.round(run.limit / 1000) + ' s, and stopped.')
    } else if (!recordRe.test(last)) {
      ok = false
      lines.push(who + ': printed no hook record, and exited ' + run.code + '.')
    } else {
      const records = contextOf(run.out).split('\n').filter((l) => l.startsWith(mine))
      const owed = run.what === ALL ? PARTS.length : 1
      if (run.code !== 0) { ok = false; lines.push(who + ': exited ' + run.code + '.') }
      if (records.length !== owed) { ok = false; lines.push(who + ': printed ' + records.length + ' hook records for its ' + owed + ' parts.') }
      for (const rec of records) {
        if (/Hook record: `[^`]*` part \d+ of \d+, /.test(rec)) parts += 1
        lines.push(run.key ? run.key + ': ' + rec : rec)
      }
    }
  }
  const span = runs.length ? Math.round(Math.max(...runs.map((x) => x.ended)) - first) : 0
  lines.push('Span: ' + span + ' ms from the first start to the last exit.', 'Parts delivered: ' + parts + '.')
  return { human: lines, json: { ok, host, file, span, parts, lines }, exit: ok ? 0 : 1 }
}

module.exports = {
  ALL, DEADLINE_MS, PARTS, PART_UNITS, STRING_CAP, connectorRule, corpusValue, cutParts, eventOf, holdSentence, hookAction, hookGet, label, machineName,
  mandateEditorLine, markOf, measureAction, opening, overflowLine, slotString, withRecord
}

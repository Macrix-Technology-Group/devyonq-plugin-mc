'use strict'
// The read action of `mc17 settings` and `--text`, the reads of a document's record and of its version count, the last
// editor's comparison with the account, the cut of a value from the corpus, the line on documents another editor last
// edited, and the reader of the MISSIONS table.

// The three text functions this file reads, carried from the release's text.js with no change to their logic, so the
// shipped copy reaches no file of the engine (IP-MC-SERVER-002 Step 10).

/*  Splits `body` into lines and drops one trailing carriage return from each, so a CRLF body reads as its LF
 *  twin. */
function docLines (body) {
  return String(body).split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l))
}

/*  The markdown body of a fetched document. The REST API returns `content` either as a string or as the
 *  object {"markdown": "..."}; throws where it is neither. */
function extractMarkdown (doc) {
  const c = (doc || {}).content
  if (typeof c === 'string') return c
  if (c && typeof c === 'object' && typeof c.markdown === 'string') return c.markdown
  throw new Error('the document carries no readable markdown body: content is ' +
    (c === undefined ? 'absent' : typeof c))
}

/*  A fence opener: a run of three or more backticks or tildes, at most three spaces in, as CommonMark
 *  reads a fence inside a list item. FENCE_CLOSE_RE is such a run standing alone on its line; a run with
 *  text after it closes nothing. check/chat-rules.py `strip` follows the same rule. */
const FENCE_RUN_RE = /^ {0,3}(`{3,}|~{3,})/
const FENCE_CLOSE_RE = /^ {0,3}(`{3,}|~{3,})[ \t\r]*$/

/*  Which lines stand inside a fence, the fence lines included, as one boolean per line. A fence closes
 *  only on a run of the same character at least as long as its opener; one that never closes runs to the
 *  end of the text. */
function fenceMask (lines) {
  const mask = new Array(lines.length).fill(false)
  let opener = null
  for (let i = 0; i < lines.length; i += 1) {
    if (opener === null) {
      const m = FENCE_RUN_RE.exec(lines[i])
      if (m) { opener = m[1]; mask[i] = true }
      continue
    }
    mask[i] = true
    const c = FENCE_CLOSE_RE.exec(lines[i])
    if (c && c[1][0] === opener[0] && c[1].length >= opener.length) opener = null
  }
  return mask
}

const collections = require('./collections.js')
const titles = require('./titles.js')

/*  A value from the corpus as a line prints it: each control character, line break, U+2028, U+2029 and backtick read as a
 *  space, and cut at `max` UTF-16 code units, 120 by default, moved back by one where the cut falls inside a surrogate
 *  pair. */
function corpusValue (value, max) {
  let s = String(value === undefined || value === null ? '' : value).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029`]/g, ' ')
  const n = max || 120
  if (s.length > n) {
    let cut = n
    const c = s.charCodeAt(cut - 1)
    if (c >= 0xd800 && c <= 0xdbff) cut -= 1
    s = s.slice(0, cut)
  }
  return s
}

/*  A value from the corpus in a code span, cleaned and cut as corpusValue does. */
const code = (value, max) => '`' + corpusValue(value, max) + '`'

/*  Whether a last editor is the account: with white space trimmed, the value equals the login, or equals the account's name
 *  in any letter case. */
function isAccount (value, acct) {
  const v = String(value === undefined || value === null ? '' : value).trim()
  if (v === '') return false
  return v === acct.login || (acct.name !== '' && v.toLowerCase() === String(acct.name).trim().toLowerCase())
}

/*  A last editor as a line names it: the cleaned value in a code span, or `not reported` where it is empty or missing. */
function editorName (value) {
  return value === undefined || value === null || String(value).trim() === '' ? 'not reported' : code(value)
}

/*  A document's record read through `get`: { record, body, etag }, the body taken by extractMarkdown, or { refused: status }
 *  where the corpus refuses the read. */
async function documentRead (creds, get, id) {
  const r = await collections.readJson(creds, get, '/api/docbase/documents/' + encodeURIComponent(id))
  if (r.refused) return { refused: r.refused }
  return { record: r.json, body: extractMarkdown(r.json), etag: r.etag }
}

/*  A document's version read through `get`: the count of the texts CanonQ lists as replaced, plus one, or { refused: status }. */
async function versionCount (creds, get, id) {
  const r = await collections.readJson(creds, get, '/api/docbase/documents/' + encodeURIComponent(id) + '/versions')
  if (r.refused) return { refused: r.refused }
  if (!Array.isArray(r.json)) throw new Error('GET /api/docbase/documents/{id}/versions answered no list of versions')
  return r.json.length + 1
}

/*  The person's name: the collection's title after `MC Settings `, or the empty string where nothing follows it. */
function personName (collectionTitle) {
  const t = String(collectionTitle || '')
  return t.startsWith(collections.TITLE_OPENING) ? t.slice(collections.TITLE_OPENING.length).trim() : ''
}

/*  The person's name for a write: { ok, name }, or a refusal where the collection's title holds no name after
 *  `MC Settings `, which every entry, retirement and row write makes before any send. */
function personNameOf (collection) {
  const name = personName(collection.title)
  if (name === '') return { ok: false, refusal: 'REFUSED: the collection ' + code(collection.title) + ' holds no name after `MC Settings `, so no write can name the person; the person renames the collection in the app.' }
  return { ok: true, name }
}

/*  One line naming a near miss: its title and id, each part it fails and the remedy of each. */
function nearMissLine (m) {
  return code(m.collection.title) + ' (' + code(m.collection.id) + '), a collection this account owns, fails ' + m.parts.join(', ') + '; remedy in the app: ' + m.remedies.map((r) => 'for the ' + r.part + ', ' + r.remedy).join('; ')
}

/*  The refusal where two or more collections pass the test, naming each by title and id. */
function manyRefusal (many) {
  return 'REFUSED: ' + many.length + ' collections pass the test of a settings collection: ' + many.map((c) => code(c.title) + ' (' + code(c.id) + ')').join(', ') + '. mc17 settings reads none of them; the person removes or renames one in the app.'
}

/*  The line on documents another editor last edited, opening with `opening`. `docs` holds { title, editor, kind, assetId },
 *  `host` the settings instance's host. Where MANDATE is among them, the line holds the session back until the person
 *  confirms that version, names the confirmation's command line and the document's link. Returns null where `docs` is empty. */
function editorLine (opening, docs, host) {
  if (!docs || docs.length === 0) return null
  let line = opening + ' Last edited by another than the account: ' + docs.map((d) => code(d.title) + ' by ' + editorName(d.editor)).join(', ') +
    '. Before its first act, the session names each such document to the person, with that editor and the version its part labels name.'
  const mandate = docs.find((d) => d.kind === 'MANDATE')
  if (mandate) {
    line += ' Until the person confirms that version of ' + code(mandate.title) + ' in the chat, the session sends nothing to production or to other people and gives no approval in the person\'s name; it then records the confirmation with mc17 settings --confirm-version {n} --document MANDATE --date {yyyy-mm-dd} --words {file.json}, and later starts hold until that write lands.' +
      ' Before it asks for the confirmation, the session gives the person the link https://' + host + '/collections?doc=' + corpusValue(mandate.assetId) + ', where the app keeps every version.'
  }
  return line
}

/*  The header of the MISSIONS table and the names of its seven cells, in order. */
const MISSIONS_HEADER = '| Instance | Collection | Manifest | Ledger | Roles | State | Latest handoff |'
const CELLS = ['instance', 'collection', 'manifest', 'ledger', 'roles', 'state', 'handoff']

/*  The MISSIONS table of a body: { ok, lines, header, end, rows }, the header's line index, the index after the table's last
 *  row, and each row as { line, cells } with its seven cells by name. ok is false where no header stands outside a fence. */
function missionsTable (body) {
  const lines = docLines(String(body || ''))
  const fenced = fenceMask(lines)
  const header = lines.findIndex((l, i) => !fenced[i] && l.trim() === MISSIONS_HEADER)
  if (header < 0) return { ok: false, lines, rows: [] }
  const rows = []
  let i = header + 1
  if (i < lines.length && /^\s*\|[\s|:-]+\|\s*$/.test(lines[i])) i += 1
  for (; i < lines.length && /^\s*\|/.test(lines[i]); i += 1) {
    const raw = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
    const cells = {}
    CELLS.forEach((name, k) => { cells[name] = raw[k] === undefined ? '' : raw[k] })
    rows.push({ line: i, cells })
  }
  return { ok: true, lines, header, end: i, rows }
}

/*  The person's settings as every action reads them: the account answer, the collection list, the finder and the one
 *  collection that passes, with its document list and its documents by kind. Answers { ok, acct, found, collection,
 *  documents, kinds } or { ok: false, lines, exit } with the lines that say why. */
async function personsSettings (r, get) {
  const acct = await collections.account(r.creds, get)
  if (!acct.ok) return { ok: false, lines: [acct.refusal], exit: 1 }
  const list = await collections.listCollections(r.creds, get)
  if (!list.ok) return { ok: false, lines: [list.refusal || 'REFUSED: GET /api/docbase/databases answered ' + list.refused + '.'], exit: 1 }
  const found = collections.personsCollection(list.collections, acct.login)
  const one = collections.onePassing(found)
  if (one.many) return { ok: false, acct, found, lines: [manyRefusal(one.many)].concat(found.nearMisses.map((m) => 'Near miss : ' + nearMissLine(m))), exit: 1 }
  if (one.none) return { ok: false, none: true, acct, found, list: list.collections, lines: ['No collection of this account passes the test of a settings collection on ' + r.instance.host + '; the skill mc-cre-settings-v17 creates one on the person\'s word.'].concat(found.nearMisses.map((m) => 'Near miss : ' + nearMissLine(m))), exit: 1 }
  const collection = one.collection
  const docs = await collections.documentList(r.creds, get, collection.id)
  if (!docs.ok) return { ok: false, acct, found, collection, lines: ['REFUSED: the corpus refused the document list of the collection ' + code(collection.title) + ' (' + code(collection.id) + '): it answered ' + (docs.refused || 'no list') + '. mc17 settings reads nothing more.'], exit: 1 }
  return { ok: true, acct, found, list: list.collections, collection, documents: docs.documents, kinds: titles.kindsIn(docs.documents) }
}

/*  The initials of the collection's settings documents, read from the first title of a kind, or null where none stands. */
function initialsIn (documents) {
  for (const d of documents || []) { const k = titles.kindOf(d.title); if (k) return k.initials }
  return null
}

/*  The read action: the host, the login, the account's name and the collection, then each of the four documents with its
 *  asset id, version and last editor where that is another than the account, the line on such documents, and a line for each
 *  document missing, unreadable or doubled and for each near miss. Exit 0 where one collection and all four were read. */
async function readAction (args, r) {
  const get = collections.sharedGet
  const s = await personsSettings(r, get)
  const head = ['Host      : ' + r.host + ', ' + require('./source.js').instanceLine(r)]
  if (s.acct) head.push('Login     : ' + code(s.acct.login), 'Account   : ' + (s.acct.name ? code(s.acct.name) : 'not reported'))
  if (!s.ok) return { human: head.concat(s.lines), json: { ok: false, lines: s.lines }, exit: s.exit }
  const human = head.concat(['Collection: ' + code(s.collection.title) + ' (' + code(s.collection.id) + ')'])
  const others = []
  const json = { host: r.host, login: s.acct.login, collection: { id: s.collection.id, title: s.collection.title }, documents: [], missing: [], unreadable: [], doubled: [] }
  const initials = initialsIn(s.documents) || ''
  let read = 0
  for (const kind of titles.KINDS) {
    const d = s.kinds.byKind[kind]
    if (s.kinds.doubled[kind]) {
      const two = s.kinds.doubled[kind]
      human.push('Doubled   : ' + two.map((x) => code(x.title) + ', asset ' + code(x.id)).join(' and ') + '; neither is read')
      json.doubled.push(two.map((x) => x.id))
      continue
    }
    if (!d) {
      human.push('Missing   : ' + kind + '-' + initials + '; the skill mc-cre-settings-v17 creates it')
      json.missing.push(kind)
      continue
    }
    const rec = await documentRead(r.creds, get, d.id)
    const version = rec.refused ? null : await versionCount(r.creds, get, d.id)
    if (rec.refused || (version && version.refused)) {
      human.push('Unreadable: ' + code(d.title) + ', asset ' + code(d.id) + '; the corpus answered ' + (rec.refused || version.refused) + ', and mc17 settings --text reads it once the corpus does')
      json.unreadable.push(d.id)
      continue
    }
    read += 1
    const another = !isAccount(d.lastEditor, s.acct)
    human.push('Document  : ' + code(d.title) + ', asset ' + code(d.id) + ', version ' + version + (another ? ', last edited by ' + editorName(d.lastEditor) : ''))
    json.documents.push({ kind, title: d.title, assetId: d.id, version, lastEditor: d.lastEditor || null, another })
    if (another) others.push({ title: d.title, editor: d.lastEditor, kind, assetId: d.id })
  }
  const line = editorLine('[MC settings]', others, r.instance.host)
  if (line) human.push(line)
  for (const m of s.found.nearMisses) human.push('Near miss : ' + nearMissLine(m))
  return { human, json, exit: read === 4 ? 0 : 1 }
}

/*  --text {title}: the body of one of the person's four documents, byte for byte as the corpus holds it. */
async function textAction (args, r) {
  const get = collections.sharedGet
  const want = String(args.text)
  const s = await personsSettings(r, get)
  if (!s.ok) return { human: s.lines, json: { ok: false, lines: s.lines }, exit: s.exit }
  const k = titles.kindOf(want)
  const d = k && !s.kinds.doubled[k.kind] && s.kinds.byKind[k.kind] && s.kinds.byKind[k.kind].title === want ? s.kinds.byKind[k.kind] : null
  if (!d) return { human: ['REFUSED: ' + code(want) + ' names none of the four documents of the collection ' + code(s.collection.title) + ', so --text prints nothing.'], json: { ok: false }, exit: 1 }
  const rec = await documentRead(r.creds, get, d.id)
  if (rec.refused) return { human: ['REFUSED: the corpus answered ' + rec.refused + ' to the read of ' + code(d.title) + '.'], json: { ok: false }, exit: 1 }
  return { stdout: rec.body, json: { title: d.title, assetId: d.id, body: rec.body }, exit: 0 }
}

module.exports = {
  CELLS, MISSIONS_HEADER, code, corpusValue, documentRead, editorLine, editorName, initialsIn, isAccount, manyRefusal,
  missionsTable, nearMissLine, personName, personNameOf, personsSettings, readAction, textAction, versionCount
}

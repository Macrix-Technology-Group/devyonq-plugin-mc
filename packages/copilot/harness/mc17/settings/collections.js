'use strict'
// The account answer and the six calls on collections, each answering one shape whatever names CanonQ gives its fields,
// and the finder of the person's settings collection with its near misses and their remedies.
//
// The shipped copy reads through DevyonQ (IP-MC-SERVER-002 Step 10; ARCH D23; AC-21): each GET goes through the `get`
// its readJson takes, which the settings hook hands it from the client's gateway transport, and which maps each CanonQ
// path below onto a read route of the harness gateway. It requires no file of the engine. The two writes, creating and
// filing a collection, take the client's `send` as an argument too; the settings hook makes neither, and the person's
// writes go through mc17 settings, which the engine answers.

/*  The category a settings collection is filed under. */
const SETTINGS_CATEGORY = 'DevyonQ Settings'
/*  The opening of a settings collection's title, with its one space. */
const TITLE_OPENING = 'MC Settings '

/*  The shared GET of the release is the engine's corpus reader, which the shipped copy does not hold: a caller hands its
 *  own `get`, the settings hook the client's gateway read. Called, it refuses, naming that. */
function sharedGet () {
  return Promise.reject(new Error('the settings modules read through the client\'s gateway transport alone, and no get was handed to them'))
}

/*  Reads `route` through `get` with the resolved credentials: { json, etag }, or { refused: status } where the GET's
 *  rejection carries a numeric status. Any other rejection, a failed connection, an answer that is no JSON or a deadline,
 *  passes through with its own words. */
async function readJson (creds, get, route) {
  try {
    const r = await get(creds.url + route, creds.pat)
    return { json: r.json, etag: r.etag || null }
  } catch (e) {
    if (e && typeof e.status === 'number') return { refused: e.status }
    throw e
  }
}

/*  The account answer of GET /api/me: { ok, login, name, rights }, the login from user.id, the name from user.name and the
 *  rights from the top-level rights list; { refused } where the corpus refuses; a refusal where user.id is missing or empty. */
async function account (creds, get) {
  const r = await readJson(creds, get, '/api/me')
  if (r.refused) return { ok: false, refused: r.refused, refusal: 'REFUSED: GET /api/me answered ' + r.refused + ', so mc17 settings has no account to read the settings by.' }
  const user = (r.json && r.json.user) || {}
  if (typeof user.id !== 'string' || user.id === '') return { ok: false, refusal: 'REFUSED: GET /api/me answered no user.id, the login, so mc17 settings has no account to read the settings by.' }
  return { ok: true, login: user.id, name: typeof user.name === 'string' ? user.name : '', rights: new Set(Array.isArray(r.json.rights) ? r.json.rights : []) }
}

/*  One collection of the list in the adapter's shape. */
function collectionShape (c) {
  const cat = c && c.category && typeof c.category === 'object' ? c.category : {}
  return { id: c.id, title: typeof c.title === 'string' ? c.title : '', kind: c.kind, category: { label: cat.label === undefined ? null : cat.label, source: cat.source === undefined ? null : cat.source }, access: c.accessLevel, owner: c.ownerUserId }
}

/*  Every collection the credentials read: { ok, collections } from GET /api/docbase/databases, an array or the field
 *  `databases`; { refused } where the corpus refuses. */
async function listCollections (creds, get) {
  const r = await readJson(creds, get, '/api/docbase/databases')
  if (r.refused) return { ok: false, refused: r.refused }
  const items = Array.isArray(r.json) ? r.json : (r.json && Array.isArray(r.json.databases) ? r.json.databases : null)
  if (!items) return { ok: false, refusal: 'REFUSED: GET /api/docbase/databases answered no list of collections.' }
  return { ok: true, collections: items.map(collectionShape) }
}

/*  One collection from a list the adapter read, or null; the corpus answers no route for one collection alone. */
function collectionOf (list, id) {
  return (list || []).find((c) => c.id === id) || null
}

/*  Creates a collection: POST /api/collections with { title, category }. Answers { ok, id }, { refused: status },
 *  { lost } where the answer never came, or a refusal where the answer is no JSON or carries no id. */
async function createCollection (creds, title, category, send) {
  if (typeof send !== 'function') return { ok: false, refusal: 'REFUSED: a collection is created through mc17 settings, which the engine answers; the shipped settings modules write nothing of their own.' }
  let reply
  try {
    reply = await send('POST', creds.url + '/api/collections', creds.pat, { title, category })
  } catch (e) {
    if (e && typeof e.status === 'number') return { ok: false, refused: e.status }
    return { ok: false, lost: true, error: String(e && e.message) }
  }
  if (!reply || typeof reply.id !== 'string' || reply.id === '') return { ok: false, refusal: 'REFUSED: POST /api/collections answered no collection id, so the creation is unproven.' }
  return { ok: true, id: reply.id }
}

/*  Files a collection under a category: PATCH /api/collections/{id}/category with { category }. Answers { ok },
 *  { refused: status }, { lost }, or a refusal where the answer is no JSON or carries no `ok`. */
async function fileCollection (creds, id, category, send) {
  if (typeof send !== 'function') return { ok: false, refusal: 'REFUSED: a collection is filed through mc17 settings, which the engine answers; the shipped settings modules write nothing of their own.' }
  let reply
  try {
    reply = await send('PATCH', creds.url + '/api/collections/' + encodeURIComponent(id) + '/category', creds.pat, { category })
  } catch (e) {
    if (e && typeof e.status === 'number') return { ok: false, refused: e.status }
    return { ok: false, lost: true, error: String(e && e.message) }
  }
  if (!reply || reply.ok !== true) return { ok: false, refusal: 'REFUSED: PATCH /api/collections/{id}/category answered no ok, so the filing is unproven.' }
  return { ok: true }
}

/*  The documents of one collection: { ok, documents } from GET /api/docbase/databases/{id}/documents, an array or the field
 *  `documents`, each as { id, title, owner, lastEditor, lastEditedTime }; { refused } where the corpus refuses. */
async function documentList (creds, get, id) {
  const r = await readJson(creds, get, '/api/docbase/databases/' + encodeURIComponent(id) + '/documents')
  if (r.refused) return { ok: false, refused: r.refused, collection: id }
  const items = Array.isArray(r.json) ? r.json : (r.json && Array.isArray(r.json.documents) ? r.json.documents : null)
  if (!items) return { ok: false, refusal: 'REFUSED: GET /api/docbase/databases/{id}/documents answered no list of documents.' }
  return { ok: true, documents: items.map((d) => ({ id: d.id, title: typeof d.title === 'string' ? d.title : '', owner: d.ownerUserId, lastEditor: d.lastEditedBy, lastEditedTime: d.lastEditedTime })) }
}

/*  The collection a document's own record names: { known: true, id } from databaseId first and database.id second;
 *  { known: true, id: null } where the record carries either field and neither names a collection; { known: false } where
 *  it carries neither field. */
function documentCollection (record) {
  const r = record || {}
  if (typeof r.databaseId === 'string' && r.databaseId !== '') return { known: true, id: r.databaseId }
  if (r.database && typeof r.database.id === 'string' && r.database.id !== '') return { known: true, id: r.database.id }
  if (Object.prototype.hasOwnProperty.call(r, 'databaseId') || Object.prototype.hasOwnProperty.call(r, 'database')) return { known: true, id: null }
  return { known: false, id: null }
}

/*  The five parts of the test, in order, and the person's remedy in the app where a collection the account owns fails one. */
const PARTS = ['kind', 'category', 'access', 'owner', 'title']
const REMEDIES = {
  kind: 'give it a title that does not open `MC Settings ` and file it outside `DevyonQ Settings`, each where it holds it, in the source it syncs from where a sync writes them, so that it counts as no near miss',
  category: 'refile it under `DevyonQ Settings` in the app, or let the skill file it on the person\'s word',
  access: 'ask an administrator to restrict it',
  owner: 'ask an administrator to move it to this account',
  title: 'retitle it to open `MC Settings `, or refile it out of `DevyonQ Settings`',
}

/*  Whether a collection is filed under the settings category: an assigned category labelled DevyonQ Settings. */
const filedUnderSettings = (c) => c.category.source === 'assigned' && c.category.label === SETTINGS_CATEGORY

/*  The parts of the test a collection fails for `login`, in the order of PARTS. */
function failedParts (c, login) {
  const failed = []
  if (c.kind !== 'local') failed.push('kind')
  if (!filedUnderSettings(c)) failed.push('category')
  if (c.access !== 'restricted') failed.push('access')
  if (!(typeof c.owner === 'string' && c.owner !== '' && c.owner === login)) failed.push('owner')
  if (!String(c.title).startsWith(TITLE_OPENING)) failed.push('title')
  return failed
}

/*  The finder: the collections that pass all five parts for `login`, and the near misses, each a collection the account
 *  owns that fails a part and whose title opens `MC Settings ` or that is filed under the settings category, with the
 *  parts it fails and the remedy of each. A collection another account owns is named nowhere. */
function personsCollection (list, login) {
  const passing = []
  const nearMisses = []
  for (const c of list || []) {
    const failed = failedParts(c, login)
    if (failed.length === 0) { passing.push(c); continue }
    const owned = typeof login === 'string' && login !== '' && c.owner === login
    if (owned && (String(c.title).startsWith(TITLE_OPENING) || filedUnderSettings(c))) nearMisses.push({ collection: c, parts: failed, remedies: failed.map((p) => ({ part: p, remedy: REMEDIES[p] })) })
  }
  return { passing, nearMisses }
}

/*  The one collection that passes the test: { ok, collection }; { ok: false, none: true } where none passes; and
 *  { ok: false, many } with each passing collection where two or more pass, of which the caller reads none. */
function onePassing (found) {
  if (found.passing.length >= 2) return { ok: false, many: found.passing.slice() }
  if (found.passing.length === 0) return { ok: false, none: true }
  return { ok: true, collection: found.passing[0] }
}

module.exports = {
  PARTS, REMEDIES, SETTINGS_CATEGORY, TITLE_OPENING, account, collectionOf, collectionShape, createCollection, documentCollection,
  documentList, failedParts, fileCollection, filedUnderSettings, listCollections, onePassing, personsCollection, readJson, sharedGet
}

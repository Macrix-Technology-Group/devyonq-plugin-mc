'use strict'
// A settings document's kind by its title, the handoff title, and the refusal of a settings title that mc17 create,
// mc17 amend and mc17 publish make before any write.

const collections = require('./collections.js')

/*  The four kinds of a person's settings documents, in their order. */
const KINDS = ['ORDERS', 'MANDATE', 'SETUP', 'MISSIONS']
const KIND_RE = /^(ORDERS|MANDATE|SETUP|MISSIONS)-(\p{Lu}+)$/u
/*  A title that opens with one of the four prefixes, whatever follows. */
const PREFIX_RE = /^(ORDERS|MANDATE|SETUP|MISSIONS)-/
/*  The handoff title: HANDOFF-{SCOPE}-{NNN}, the scope of capital letters, digits, dots and hyphens that opens and ends with
 *  a letter or a digit. */
const HANDOFF_RE = /^HANDOFF-([A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?)-(\d{3})$/

/*  The kind of a document by its title, ORDERS, MANDATE, SETUP or MISSIONS followed by a hyphen and upper-case letters, with
 *  its initials: { kind, initials }, or null for any other title. */
function kindOf (title) {
  const m = KIND_RE.exec(String(title || ''))
  return m ? { kind: m[1], initials: m[2] } : null
}

/*  The documents of a collection by kind: { byKind, doubled }, where byKind maps a kind to the first document of it and
 *  doubled maps a kind to every document of it where two or more stand, so a reader tests doubled first. A document of any
 *  other title has no kind. */
function kindsIn (documents) {
  const all = {}
  for (const d of documents || []) {
    const k = kindOf(d.title)
    if (k) (all[k.kind] = all[k.kind] || []).push(d)
  }
  const byKind = {}
  const doubled = {}
  for (const k of KINDS) {
    if (!all[k]) continue
    byKind[k] = all[k][0]
    if (all[k].length >= 2) doubled[k] = all[k]
  }
  return { byKind, doubled }
}

/*  The scope and number of a handoff title, or null for any other title. */
function handoffTitle (title) {
  const m = HANDOFF_RE.exec(String(title || ''))
  return m ? { scope: m[1], number: Number(m[2]) } : null
}

/*  Whether a title, with a trailing `.md` taken off, opens with one of the four prefixes. */
function prefixed (title) {
  return PREFIX_RE.test(String(title || '').replace(/\.md$/i, ''))
}

/*  The refusal of a settings title outside mc17 settings, or null. The title is tested first, and only a title with one of
 *  the four prefixes reads the collection list. `collection` names the target collection of mc17 create and mc17 publish;
 *  `record` is the document's own record that mc17 amend read, whose databaseId, or database.id, names it. A collection
 *  filed under DevyonQ Settings is refused, and so is one this command cannot identify; a document that stands in no
 *  collection passes. */
async function settingsTitleRefusal ({ creds, title, collection, record, get }) {
  const bare = String(title || '').replace(/\.md$/i, '')
  if (!prefixed(bare)) return null
  const opening = PREFIX_RE.exec(bare)[0]
  const unknown = 'the title ' + bare + ' opens ' + opening + ', and this command could not identify the collection it stands in or goes into, so it writes nothing: a person\'s settings change only through mc17 settings.'
  let id = collection
  if (record !== undefined) {
    const named = collections.documentCollection(record)
    if (!named.known) return unknown
    if (named.id === null) return null
    id = named.id
  }
  if (!id || id === true) return unknown
  let list
  try {
    list = await collections.listCollections(creds, get || collections.sharedGet)
  } catch (e) {
    return unknown
  }
  const c = list.ok ? collections.collectionOf(list.collections, String(id)) : null
  if (!c) return unknown
  if (collections.filedUnderSettings(c)) return 'the title ' + bare + ' opens ' + opening + ', and its collection ' + c.id + ' is filed under DevyonQ Settings: a person\'s settings change only through mc17 settings.'
  return null
}

module.exports = { HANDOFF_RE, KINDS, KIND_RE, PREFIX_RE, handoffTitle, kindOf, kindsIn, prefixed, settingsTitleRefusal }

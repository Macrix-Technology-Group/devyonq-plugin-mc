'use strict'
// The credential store (ARCH D19): one service, devyonq-mc, with one item per value. The values the client keeps are
// the DevyonQ key and its refresh token, the gateway address, the tenant, the session the gateway answered at login and
// the program paths. The launchers read no value of it: the node they start comes from the record of mc17 login in
// ~/.mc17/client/node.json, checked by its sha256 (the review of IP-MC-SERVER-002). Each value is kept as base64 of its UTF-8 text, so
// no backend has to quote it.

const fs = require('node:fs')
const path = require('node:path')

const SERVICE = 'devyonq-mc'
/*  The items of the service. */
const ITEMS = ['token', 'refresh', 'gateway', 'tenant', 'session', 'programs']

const enc = (s) => Buffer.from(String(s), 'utf8').toString('base64')
const dec = (s) => Buffer.from(String(s), 'base64').toString('utf8')

/*  A store kept in one JSON file, which only the test build opens (Step 5, the client's test build). */
function fileStore (file) {
  const read = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch (_) { return {} } }
  const write = (m) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(m)) }
  return {
    name: 'the test build\'s store file',
    getAll (items) { const m = read(); const out = {}; for (const i of items || ITEMS) out[i] = m[i] === undefined ? null : dec(m[i]); return out },
    set (entries) { const m = read(); for (const [k, v] of Object.entries(entries)) m[k] = enc(v); write(m) },
    remove (items) { const m = read(); for (const i of items) delete m[i]; write(m) }
  }
}

/*  The store of this computer's operating system for `service`, or { none: why } where the client knows no store for it. */
function osStore (service, programs) {
  let os = null
  try { os = require('./os-store.js') } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e }
  if (!os) return { none: 'this build of the client carries no store of the operating system' }
  return os.osStore(service || SERVICE, programs)
}

/*  The store the client opens: the test build's file or the operating system's store. */
function openStore (ctx) {
  const t = ctx.test && ctx.test.store
  if (t && t.kind === 'file') return fileStore(t.file)
  if (t && t.kind === 'none') return { none: 'the test build names a computer with no credential store' }
  return osStore(t && t.kind === 'os' && t.service ? t.service : SERVICE, ctx.programs || null)
}

module.exports = { SERVICE, ITEMS, enc, dec, fileStore, osStore, openStore }

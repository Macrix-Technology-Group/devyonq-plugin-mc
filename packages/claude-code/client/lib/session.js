'use strict'
// The session the client keeps from mc17 login (ARCH D2, D15, D19): the gateway address, the tenant the person named,
// the DevyonQ key and the session route's answer, all read from the credential store, and the tenant check made before
// any call.

const { openStore } = require('./store.js')

class NoSession extends Error {}

/*  The kept session: { gateway, tenant, token, refresh, person, writer, instance, contractVersion, checkingKeys,
 *  programs }. Throws NoSession, naming mc17 login, where the store holds none or cannot be opened. */
function readSession (ctx) {
  const store = ctx.store || openStore(ctx)
  if (store.none) throw new NoSession('the client cannot open a credential store: ' + store.none + '. Run mc17 login in a terminal of your own.')
  let kept
  try { kept = store.getAll(['token', 'refresh', 'gateway', 'tenant', 'session', 'programs']) } catch (e) { throw new NoSession('the client could not read its credential store (' + String(e.message || e).split('\n')[0] + '). Run mc17 login in a terminal of your own.') }
  if (!kept.token || !kept.gateway || !kept.tenant || !kept.session) throw new NoSession('the client holds no sign-in. Run mc17 login in a terminal of your own.')
  let s = null
  let programs = null
  try { s = JSON.parse(kept.session) } catch (_) { s = null }
  try { programs = kept.programs ? JSON.parse(kept.programs) : null } catch (_) { programs = null }
  if (!s || typeof s !== 'object') throw new NoSession('the kept session does not read. Run mc17 login in a terminal of your own.')
  return {
    gateway: kept.gateway,
    tenant: kept.tenant,
    token: kept.token,
    refresh: kept.refresh || null,
    person: s.person,
    writer: s.writer,
    keyTenant: s.tenant,
    instance: s.instance,
    contractVersion: s.contractVersion,
    checkingKeys: Array.isArray(s.checkingKeys) ? s.checkingKeys : [],
    programs,
    store
  }
}

/*  The refusal of a session whose kept tenant differs from its key's (D2 point 2), or null. */
function tenantMismatch (session) {
  if (session.keyTenant === undefined || session.keyTenant === null || String(session.keyTenant) === String(session.tenant)) return null
  return 'harness-tenant-mismatch: the Mission names the tenant ' + session.tenant + ' and the DevyonQ key belongs to the tenant ' + session.keyTenant + '; nothing was sent. Run mc17 login --tenant <tenant> for the tenant of this Mission.'
}

module.exports = { NoSession, readSession, tenantMismatch }

'use strict'
// The canonical JSON of a value and the digests the client derives from it: the request key of a writing command (ARCH
// D12) and the digest of a checkout (D15).

const crypto = require('node:crypto')

/*  The canonical JSON of `value`: object keys in byte order, no white space, arrays in their order. */
function canonicalJson (value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value === undefined ? null : value)
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']'
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort((a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8')))
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJson(value[k])).join(',') + '}'
}

/*  The sha256 of a string or a buffer, as bare hex. */
function hexOf (data) {
  return crypto.createHash('sha256').update(data).digest('hex')
}

/*  The request key of a writing command (D12): the sha256 of the canonical JSON of the contract version, the tenant, the
 *  signed-in person, the command and its arguments, the sha256 of each file its arguments name, and the checkout's
 *  remote and branch. */
function requestKey (input) {
  const x = input || {}
  const files = {}
  for (const [name, f] of Object.entries(x.files || {})) files[name] = f.sha256
  return 'sha256:' + hexOf(canonicalJson({
    contract: x.contractVersion,
    tenant: x.tenant,
    person: x.person,
    command: x.command,
    args: x.args || [],
    files,
    remote: x.remote === undefined ? null : x.remote,
    branch: x.branch === undefined ? null : x.branch
  }))
}

module.exports = { canonicalJson, hexOf, requestKey }

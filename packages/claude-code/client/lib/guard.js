'use strict'
// The second floor of the launcher (ARCH D19): the client refuses to run where its own environment holds a variable that
// would shape what Node loads, which certificates it trusts, where it sends, or how git reads. The launcher starts Node
// with an environment built from nothing, so these stand only where someone started the client another way.

/*  The variables the client refuses by name. NODE_TLS_REJECT_UNAUTHORIZED joins the list of the plan, because the
 *  client sets rejectUnauthorized itself and a value there could only mean an attempt to switch the check off (TC-20).
 *  OpenSSL's own variables join it (the second review of IP-MC-SERVER-002, N14): OPENSSL_CONF names a configuration Node
 *  reads at its start, which can load a provider or an engine, OPENSSL_MODULES and OPENSSL_ENGINES the folders a module
 *  is loaded from, and SSL_CERT_FILE and SSL_CERT_DIR the roots it would trust; NODE_PATH and NODE_ICU_DATA name files
 *  Node loads. A run that skips the launcher meets them here. */
const REFUSED = ['NODE_OPTIONS', 'NODE_EXTRA_CA_CERTS', 'NODE_USE_ENV_PROXY', 'NODE_TLS_REJECT_UNAUTHORIZED', 'NODE_PATH', 'NODE_ICU_DATA',
  'OPENSSL_CONF', 'OPENSSL_MODULES', 'OPENSSL_ENGINES', 'SSL_CERT_FILE', 'SSL_CERT_DIR']
/*  The proxy variables, matched in either case. */
const PROXIES = ['http_proxy', 'https_proxy', 'all_proxy', 'no_proxy', 'ftp_proxy', 'grpc_proxy']

/*  The name of the first variable of `env` the client refuses, or null where none stands. */
function refusedVariable (env) {
  for (const name of Object.keys(env || {})) {
    if (REFUSED.indexOf(name.toUpperCase()) >= 0) return name
    if (PROXIES.indexOf(name.toLowerCase()) >= 0) return name
    if (/^GIT_/i.test(name)) return name
  }
  return null
}

/*  The message the client prints where it refuses its environment. */
function refusalText (name) {
  return 'mc17: the variable ' + name + ' stands in the environment of the client, and the client refuses to run with it. ' +
    'Run mc17 through its launcher client/mc17 (client/mc17.cmd on Windows), which starts the client with an environment built from nothing.'
}

module.exports = { REFUSED, PROXIES, refusedVariable, refusalText }

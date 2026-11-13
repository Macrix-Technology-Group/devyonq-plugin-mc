'use strict'
// mc17 version (ARCH D28; AC-15): the plugin's name and version, the contract version and the gateway address in use.
// The client answers it itself and sends nothing.

const fs = require('node:fs')
const path = require('node:path')

/*  The plugin's name and version: from the manifest of the package the client stands in, the first that reads of
 *  .claude-plugin/plugin.json, .codex-plugin/plugin.json, plugin.json and package.json at the package's root, and from
 *  VERSION at that root in a checkout of the source, where no manifest stands. */
function pluginNameAndVersion (root) {
  for (const rel of [path.join('.claude-plugin', 'plugin.json'), path.join('.codex-plugin', 'plugin.json'), 'plugin.json', 'package.json']) {
    let m = null
    try { m = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')) } catch (_) { continue }
    if (m && typeof m.version === 'string') return { name: typeof m.name === 'string' ? m.name : 'devyonq-mc', version: m.version.trim() }
  }
  try { return { name: 'devyonq-mc', version: fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim() } } catch (_) { return { name: 'devyonq-mc', version: null } }
}

/*  The host the package at `root` is built for, by the manifest it holds, as the release's packageHost reads it:
 *  claude-code, codex, copilot or openai-api, or null in a checkout of the source, which holds no manifest. */
function pluginHost (root) {
  const has = (rel) => fs.existsSync(path.join(root, rel))
  if (has(path.join('.claude-plugin', 'plugin.json'))) return 'claude-code'
  if (has(path.join('.codex-plugin', 'plugin.json'))) return 'codex'
  if (has('plugin.json')) return has('com.github.copilot') ? 'copilot' : 'codex'
  if (has('package.json')) return 'openai-api'
  return null
}

/*  The lines and the JSON of mc17 version, for the gateway `gateway` (null where the client holds no sign-in). */
function versionReport (ctx, gateway, tenant) {
  const p = pluginNameAndVersion(ctx.places.root)
  const pin = require('./contract.js').pinOf()
  const json = { name: p.name, version: p.version, host: pluginHost(ctx.places.root), contract: ctx.contract.version, contractSha256: ctx.contract.sha256, contractCommit: pin ? pin.commit : null, interimPin: Boolean(pin && pin.interim), gateway, tenant: tenant || null }
  const human = [
    'Plugin   : ' + p.name + ' ' + (p.version || '(no version read)'),
    'Contract : version ' + ctx.contract.version + ', sha256:' + ctx.contract.sha256 + (pin ? ', copied from devyonq-saas ' + String(pin.commit).slice(0, 12) + (pin.interim ? ' (interim pin, ' + pin.interim.branch + ')' : '') : ''),
    'Gateway  : ' + (gateway || 'none; run mc17 login in a terminal of your own'),
    'Tenant   : ' + (tenant || 'none')
  ]
  return { human, json }
}

module.exports = { pluginNameAndVersion, pluginHost, versionReport }

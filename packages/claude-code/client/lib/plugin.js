'use strict'
// The plugin under test and the runner's block (ARCH D33; record 101 point 1, record 124). The client finds the plugin
// folder of the person's checkout by one rule and sends it with the folder the plugin stood in before its layout moved and
// the checkout's commit. In mc-run's package it also computes the hash of its runner's sanctioned block.

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { runGit } = require('./git.js')

/*  The plugin folder of the checkout `co`, read with git at `gitBin`: { folder, before, commit }, or null where the
 *  checkout holds no plugin. In a checkout of this repository the folder holds client/mc17.js and its history holds no
 *  earlier layout, so the folder before the move is '.'. In a checkout of the old plugin's repository the folder holds
 *  harness/mc17.js, and the folder before the move is the one folder under skills/ that held harness/mc17.js at the parent
 *  of the commit that added core/build.json. */
function pluginFacts (gitBin, co) {
  if (!co || !co.head) return null
  const git = (argv) => { const r = runGit(gitBin, co.top, argv); return !r.error && r.status === 0 ? r.stdout : null }
  const tracked = (git(['ls-files']) || '').split(/\r?\n/).filter(Boolean)
  const own = tracked.filter((p) => /(^|\/)client\/mc17\.js$/.test(p)).map((p) => p.slice(0, p.length - 'client/mc17.js'.length).replace(/\/$/, ''))
  if (own.length === 1) return { folder: own[0] || '.', before: '.', commit: co.head }
  const old = tracked.filter((p) => /(^|\/)harness\/mc17\.js$/.test(p)).map((p) => p.slice(0, p.length - 'harness/mc17.js'.length).replace(/\/$/, ''))
  if (old.length !== 1) return null
  const folder = old[0] || '.'
  const added = (git(['log', '--diff-filter=A', '--format=%H', '--', 'core/build.json']) || '').split(/\r?\n/).filter(Boolean)
  let before = folder
  if (added.length) {
    const first = added[added.length - 1]
    const at = (git(['ls-tree', '-r', '--name-only', first + '^']) || '').split(/\r?\n/).filter((p) => /^skills\/[^/]+\/harness\/mc17\.js$/.test(p))
    if (at.length === 1) before = at[0].slice(0, at[0].length - '/harness/mc17.js'.length)
  }
  return { folder, before, commit: co.head }
}

/*  The hash of the sanctioned block of mc-run's runner in the package at `root`, in the form declare.js prints,
 *  sha256:<hex>, or null where the package is not mc-run's. The runner starts nothing when it is required; its own
 *  exports give the block and its normalization (record 124). */
function runnerBlockHash (root) {
  const runner = path.join(root, 'harness', 'orchestration-harness.js')
  if (!fs.existsSync(path.join(root, 'bin', 'mc-run')) || !fs.existsSync(runner)) return null
  const r = require(runner)
  if (typeof r.sanctionedBlock !== 'function' || typeof r.normalizeBlock !== 'function') throw new Error('the runner ' + runner + ' exports no sanctionedBlock and normalizeBlock, so the client cannot hash its block')
  const normalized = r.normalizeBlock(r.sanctionedBlock().text)
  return 'sha256:' + crypto.createHash('sha256').update(normalized, 'utf8').digest('hex')
}

module.exports = { pluginFacts, runnerBlockHash }

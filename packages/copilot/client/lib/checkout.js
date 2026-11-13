'use strict'
// The person's checkout and the paths the client sends and takes (ARCH D10, D30, D32). The client sends each path
// relative to the top of the checkout, with / between its parts; a path in the work folder a command names, in the
// converge store or in the client's temporary folder takes the form the contract's pathForms give it. Every other path
// is refused, naming it.

const fs = require('node:fs')
const path = require('node:path')
const { hexOf } = require('./canonical.js')
const { within, realOf, containment } = require('./places.js')

const DEFAULT_FORMS = { work: '/~work', store: '/~/.mc17/converge', temp: '/~tmp' }

/*  The three path forms the client maps onto a place of the computer, from the contract's pathForms: work, store and temp,
 *  each a prefix opening /~. The contract's other entries, engine and scratch, are no prefixes but rules of what the
 *  engine prints: a path of the engine's own copy prints as its package path, which the plugin's own folder holds at the
 *  same place (harness/orchestration-harness.js), and a path of the engine's scratch folder prints under the temp form,
 *  /~tmp, which names the client's temporary folder in a step. The client prints both as the engine printed them and maps
 *  neither onto the server's disk. */
function formsOf (contract) {
  const given = (contract && contract.doc && contract.doc.pathForms) || {}
  const out = Object.assign({}, DEFAULT_FORMS)
  for (const k of Object.keys(DEFAULT_FORMS)) if (typeof given[k] === 'string' && given[k].startsWith('/~')) out[k] = given[k]
  return out
}

/*  A remote's address with the user-info of the form scheme://user[:password]@host/... taken out (the review of
 *  IP-MC-SERVER-002), so a token a person put in a remote's address never leaves the computer: not in facts.git.remote,
 *  not in the checkout digest of a decision (D15), not in a request key (D12). The form [user@]host:path, which holds no
 *  password, stands as it is. */
function withoutUserInfo (url) {
  if (url === null || url === undefined) return url
  return String(url).replace(/^([A-Za-z][A-Za-z0-9+.-]*:\/\/)[^/?#]*@/, '$1')
}

/*  The checkout the folder `cwd` stands in, read with git at `gitBin`: { top, remote, remoteName, branch, head, cwd, root },
 *  `cwd` the folder relative to the top ('.' at the top) and `root` the sha256 of the top's path, so the path itself never
 *  leaves the computer. `remote` is the address of origin, else of the first remote, without its user-info, and
 *  `remoteName` the name of that remote, which stays on the computer. Null where `cwd` stands in no checkout. */
function readCheckout (gitBin, cwd) {
  const { runGit } = require('./git.js')
  const top0 = runGit(gitBin, cwd, ['rev-parse', '--show-toplevel'])
  if (top0.error || top0.status !== 0) return null
  const top = fs.realpathSync.native(top0.stdout.trim())
  const one = (argv) => { const r = runGit(gitBin, top, argv); return !r.error && r.status === 0 ? r.stdout.trim() || null : null }
  let remoteName = 'origin'
  let remote = one(['remote', 'get-url', 'origin'])
  if (remote === null) {
    remoteName = (one(['remote']) || '').split(/\r?\n/).filter(Boolean)[0] || null
    remote = remoteName ? one(['remote', 'get-url', remoteName]) : null
  }
  const here = fs.realpathSync.native(cwd)
  const rel = path.relative(top, here).split(path.sep).join('/') || '.'
  return {
    top,
    remote: withoutUserInfo(remote),
    remoteName: remote === null ? null : remoteName,
    branch: one(['symbolic-ref', '--short', 'HEAD']),
    head: one(['rev-parse', 'HEAD']),
    cwd: rel.startsWith('..') ? '.' : rel,
    root: hexOf(top.split(path.sep).join('/'))
  }
}

/*  The digest of a checkout as a decision binds it (D15): the sha256 of its remote, its root and its branch. */
function checkoutDigest (co) {
  return hexOf(JSON.stringify([co.remote || null, co.root, co.branch || null]))
}

/*  Why one part of a path the engine names is refused on `platform` (process.platform where none is given), or null
 *  (ARCH D30; the review of IP-MC-SERVER-002): an empty, . or .. part; .git in any letter case, at any depth; a colon,
 *  which names a stream or a drive on Windows; a closing dot or space, which Windows drops, so .git. reads as .git there;
 *  and, on Windows, a ~, which can name a short name such as GIT~1 for .git. */
/*  The names Windows reserves for a device, in any letter case and with any extension, such as nul, CON.txt or COM1.md,
 *  refused on every platform (the second review of IP-MC-SERVER-002, N10): a checkout made on Linux may be opened on
 *  Windows, where a write to such a name reaches the device. The superscript digits one to three count as Windows
 *  reads them. */
const RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9\u00b9\u00b2\u00b3]|LPT[1-9\u00b9\u00b2\u00b3]|CONIN\$|CONOUT\$) *(\..*)?$/i

function partFault (part, platform) {
  const p = String(part)
  if (p === '' || p === '.' || p === '..') return 'it holds an empty, . or .. part'
  if (p.toLowerCase() === '.git') return 'it stands inside .git'
  if (p.indexOf(':') >= 0) return 'its part ' + JSON.stringify(p) + ' holds a colon'
  if (/[. ]$/.test(p)) return 'its part ' + JSON.stringify(p) + ' ends in a dot or a space'
  if ((platform || process.platform) === 'win32' && p.indexOf('~') >= 0) return 'its part ' + JSON.stringify(p) + ' holds ~, which Windows can read as a short name'
  if (RESERVED.test(p)) return 'its part ' + JSON.stringify(p) + ' is a name Windows reserves for a device'
  return null
}

/*  A checkout-relative path the engine names, checked: no leading slash, no drive, no part that partFault refuses on
 *  `platform`. Answers { relative, absolute } or { refused }. */
function checkoutPath (co, v, platform) {
  const s = String(v === undefined || v === null ? '' : v)
  if (s === '.' ) return { relative: '.', absolute: co ? co.top : null }
  if (s === '' || /^[\\/]/.test(s) || /^[A-Za-z]:/.test(s) || /\\/.test(s) || s.indexOf('\u0000') >= 0) return { refused: 'it is no path relative to the top of the checkout with / between its parts' }
  const parts = s.split('/')
  for (const p of parts) { const f = partFault(p, platform); if (f) return { refused: f } }
  return { relative: s, absolute: co ? path.join(co.top, ...parts) : null }
}

/*  The local path a path the engine sends stands for, checked against the four places (D30): the checkout, the work
 *  folder `places.work` of the command, the converge store and the client's temporary folder. Answers { absolute, place }
 *  or { refused } naming why. */
function localPath (ctx, sent, contract) {
  const forms = formsOf(contract)
  const s = String(sent === undefined || sent === null ? '' : sent)
  const under = (prefix) => s === prefix ? '' : (s.startsWith(prefix + '/') ? s.slice(prefix.length + 1) : null)
  // Each path is checked by its real form too (the review of IP-MC-SERVER-002): the real path of its nearest ancestor
  // that stands lies inside the real form of its place, and its last part is no link, a junction and a reparse point
  // among them, so a link the AI made in a place never carries a write or a read out of it.
  // A place may stand inside the checkout, as a work folder may, so each is checked against the checkout's git folder by
  // its real form too: a short name such as GIT~1, or a link, that reaches <top>/.git in any letter case.
  const contained = (abs, folder, place) => {
    const why = containment(abs, folder, place)
    if (why) return { refused: 'the path ' + JSON.stringify(s) + ' names the ' + place + ', and ' + why }
    const real = realOf(abs)
    if (ctx.checkout && real !== null && within(real, path.join(realOf(ctx.checkout.top) || ctx.checkout.top, '.git'))) return { refused: 'the path ' + JSON.stringify(s) + ' resolves through a link or a short name to a place inside .git' }
    return { absolute: abs, place }
  }
  const rest = (folder, tail, place) => {
    if (folder === null || folder === undefined) return { refused: 'the path ' + JSON.stringify(s) + ' names the ' + place + ', and this command names none' }
    if (tail === '') return contained(folder, folder, place)
    if (/\\/.test(tail) || tail.indexOf('\u0000') >= 0) return { refused: 'the path ' + JSON.stringify(s) + ' holds a backslash' }
    const parts = tail.split('/')
    for (const p of parts) { const f = partFault(p); if (f) return { refused: 'the path ' + JSON.stringify(s) + ': ' + f } }
    return contained(path.join(folder, ...parts), folder, place)
  }
  let t = under(forms.work)
  if (t !== null) return rest(ctx.work, t, 'work folder')
  t = under(forms.store)
  if (t !== null) return rest(ctx.places.store, t, 'converge store')
  t = under(forms.temp)
  if (t !== null) {
    if (t === '') return { refused: 'the path ' + JSON.stringify(s) + ' names no one folder of the client\'s temporary folder' }
    return rest(ctx.places.temp, t, 'temporary folder')
  }
  if (!ctx.checkout) return { refused: 'the path ' + JSON.stringify(s) + ' names a place in the checkout, and the command runs in no checkout' }
  const p = checkoutPath(ctx.checkout, s)
  if (p.refused) return { refused: 'the path ' + JSON.stringify(s) + ' stands outside the checkout, the work folder, the converge store and the client\'s temporary folder: ' + p.refused }
  return contained(p.absolute, ctx.checkout.top, 'checkout')
}

/*  The form the client sends for a path argument the person gave, relative to the working folder or absolute (D32):
 *  a path in the work folder, the converge store or the client's temporary folder takes its form, a path in the checkout
 *  goes relative to its top with /. Answers { sent } or { refused }. */
function sentPath (ctx, given, contract) {
  const forms = formsOf(contract)
  const abs = path.resolve(ctx.cwd, String(given))
  // A path in the work folder, the converge store or the client's temporary folder is read by its real form, as
  // localPath reads a path the engine sends (the second review of IP-MC-SERVER-002, N5): its real form stands inside
  // the real form of its place, and its last part is no link, a junction among them, so a link put there carries no
  // read of a file outside the place, ~/.mc17/client among them, to the engine.
  const placed = (folder, form, what) => {
    const why = containment(abs, folder, what)
    if (why) return { refused: 'the path ' + given + ' names the ' + what + ', and ' + why }
    const r = path.relative(folder, abs).split(path.sep).join('/')
    return { sent: r ? form + '/' + r : form }
  }
  if (ctx.work && within(abs, ctx.work)) return placed(ctx.work, forms.work, 'work folder')
  // The checkout, by the real form, through the real path of the nearest folder that stands, so a short name of Windows
  // and a link read as the place they reach.
  const top = ctx.checkout ? (realOf(ctx.checkout.top) || ctx.checkout.top) : null
  const real = top === null ? null : realOf(abs)
  const inCheckout = real !== null && within(real, top)
  // A checkout may stand inside the converge store or the client's temporary folder, as a worktree of git-write
  // worktree-add stands in ~/.mc17/tmp: a path inside it is the checkout's, sent relative to its top, and never the
  // temporary folder's /~tmp form, which the engine reads as no path of the repository (finding 39 of the DVQ-018
  // Copilot run). A place that stands inside the checkout keeps its own form.
  const holdsCheckout = (folder) => inCheckout && within(top, realOf(folder) || folder)
  if (within(abs, ctx.places.store) && !holdsCheckout(ctx.places.store)) return placed(ctx.places.store, forms.store, 'converge store')
  if (within(abs, ctx.places.temp) && !holdsCheckout(ctx.places.temp)) return placed(ctx.places.temp, forms.temp, 'temporary folder')
  // A path that reaches outside the checkout is refused.
  if (inCheckout) return { sent: path.relative(top, real).split(path.sep).join('/') || '.' }
  return { refused: 'the path ' + given + ' stands outside the checkout, the work folder, the converge store and the client\'s temporary folder' }
}

module.exports = { formsOf, withoutUserInfo, readCheckout, checkoutDigest, partFault, checkoutPath, localPath, sentPath }

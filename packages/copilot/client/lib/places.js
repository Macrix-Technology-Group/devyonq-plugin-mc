'use strict'
// The client's places on the computer: its own folder and the plugin's, the converge store, the client's temporary
// folder for worktrees (~/.mc17/tmp, outside the folder the secret gate refuses), and the folder of the person's
// OpenRouter key (ARCH Interface Contracts, The client's local files).

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

/*  The client's folder, `client/` in a package and `core/client/` in a checkout of this repository. */
const CLIENT_DIR = path.join(__dirname, '..')

/*  The places for the home folder `home` (the person's, from the environment the launcher built). */
function placesOf (home, clientDir) {
  const h = home || os.homedir()
  const client = clientDir || CLIENT_DIR
  return {
    client,
    root: path.join(client, '..'),
    home: h,
    store: path.join(h, '.mc17', 'converge'),
    own: path.join(h, '.mc17', 'client'),
    // The temporary folder stands beside the client's own folder, not inside it: the secret gate (lint-secret.py) refuses
    // every call that names ~/.mc17/client, and the AI works in the worktrees git-write puts here (D30).
    temp: path.join(h, '.mc17', 'tmp'),
    keys: path.join(h, '.canonq', 'mc17-converge')
  }
}

/*  Whether `p` is `folder` or stands under it, by their resolved forms, without regard to case on Windows and macOS. */
function within (p, folder) {
  const norm = (x) => { const r = path.resolve(String(x)); return process.platform === 'win32' || process.platform === 'darwin' ? r.toLowerCase() : r }
  const a = norm(p)
  const b = norm(folder)
  return a === b || a.startsWith(b.endsWith(path.sep) ? b : b + path.sep)
}

/*  Whether two paths name the same place, without regard to case on Windows and macOS. */
function samePath (a, b) {
  const norm = (x) => { const r = path.resolve(String(x)); return process.platform === 'win32' || process.platform === 'darwin' ? r.toLowerCase() : r }
  return norm(a) === norm(b)
}

/*  The real form of `p`: the real path of its nearest ancestor that stands (fs.realpathSync.native, which resolves
 *  symbolic links, junctions and the short names of Windows), joined with the parts below it that stand not yet. Null
 *  where a part that stands cannot be resolved, as a link that leads nowhere. */
function realOf (p) {
  let cur = path.resolve(String(p))
  const below = []
  for (;;) {
    let stands = true
    try { fs.lstatSync(cur) } catch (_) { stands = false }
    if (stands) break
    const up = path.dirname(cur)
    if (up === cur) return path.join(cur, ...below.reverse())
    below.push(path.basename(cur))
    cur = up
  }
  let real
  try { real = fs.realpathSync.native(cur) } catch (_) { return null }
  return path.join(real, ...below.reverse())
}

/*  Why `abs` may not be written or read as a path of the place `folder` (ARCH D30; the review of IP-MC-SERVER-002): its
 *  real form, read through the real path of its nearest ancestor that stands, lies outside the real form of `folder`; or
 *  its last part is a symbolic link, a junction or another reparse point, whose real path differs from the path through
 *  its folder. Null where it stands inside. `what` names the place in the words, which name no path of the computer,
 *  since a refusal goes back to the engine. */
function containment (abs, folder, what) {
  const base = realOf(folder)
  const real = realOf(abs)
  if (base === null || real === null) return 'it passes through a link that leads nowhere'
  if (!within(real, base)) return 'it resolves through a link to a place outside the ' + what
  let st = null
  try { st = fs.lstatSync(abs) } catch (_) { st = null }
  if (st && st.isSymbolicLink()) return 'its last part is a symbolic link or a junction'
  if (st) {
    const parent = realOf(path.dirname(abs))
    if (parent === null || !samePath(real, path.join(parent, path.basename(abs)))) return 'its last part is a link or a short name that resolves elsewhere'
  }
  return null
}

/*  Writes `bytes` to `file` through a file of another name beside it, flushed and then renamed over the target (ARCH
 *  D30), making the folder first. */
function writeAtomic (file, bytes) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = path.join(path.dirname(file), '.' + path.basename(file) + '.mc17-' + process.pid + '-' + Date.now())
  const fd = fs.openSync(tmp, 'w')
  try {
    fs.writeSync(fd, bytes)
    fs.fsyncSync(fd)
  } finally {
    fs.closeSync(fd)
  }
  fs.renameSync(tmp, file)
}

/*  The bytes of `file`, or null where it does not stand. */
function readOrNull (file) {
  try { return fs.readFileSync(file) } catch (_) { return null }
}

module.exports = { CLIENT_DIR, placesOf, within, samePath, realOf, containment, writeAtomic, readOrNull }

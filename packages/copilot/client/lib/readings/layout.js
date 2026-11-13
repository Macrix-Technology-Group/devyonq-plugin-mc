'use strict'
// The reader of the plugin's layout in a repository (ARCH D31, D33): the client carries it and answers its moved,
// pluginAt, filesAt and versionAt results, which are paths and versions, for the plugin under test in the person's
// checkout. It is taken from the release with no change to its logic. It takes git and the folder before the move as
// its arguments, so this copy carries no folder constant.

const path = require('node:path')

/*  The declarations that give each file of the source its plugin path, the skills' source folder and the version's
 *  file, as the release names them. */
const DECLARATIONS = ['core/build.json', 'platforms/claude-code/build.json']
const SKILLS_SOURCE = 'core/skills/'
const VERSION_FILE = 'core/VERSION'

/*  A reader of the plugin's layout in a repository. `git(argv)` runs git in the repository and answers what it printed,
 *  throwing where git fails; `old` is the plugin folder's path at a commit before the move, '.' at the root. Answers
 *  { moved, pluginAt, filesAt, versionAt }, each reading one commit, and keeps what it read of each commit. */
function layoutReader (git, old) {
  const prefix = !old || old === '.' ? '' : String(old).replace(/\/+$/, '') + '/'
  const movedAt = new Map()
  const maps = new Map()
  // Whether `commit` holds the file `file`, read by a listing that prints nothing where it holds none.
  const holds = (commit, file) => { try { return String(git(['ls-tree', '--name-only', commit, '--', file])).trim() !== '' } catch (_) { return false } }
  const moved = (commit) => {
    if (!movedAt.has(commit)) movedAt.set(commit, holds(commit, DECLARATIONS[0]))
    return movedAt.get(commit)
  }
  /*  Every file of the plugin at a commit after the move, plugin path to repository path, by the rule of the skills and the
   *  declarations' entries. */
  const mapAt = (commit) => {
    if (maps.has(commit)) return maps.get(commit)
    const map = new Map()
    for (const f of String(git(['ls-tree', '-r', '--name-only', '-z', commit, '--', SKILLS_SOURCE])).split('\0').filter(Boolean)) {
      const rest = f.slice(SKILLS_SOURCE.length)
      if (rest.indexOf('/') > 0) map.set('skills/' + rest, f)
    }
    for (const d of DECLARATIONS) {
      let doc = null
      try { doc = holds(commit, d) ? JSON.parse(git(['show', commit + ':' + d])) : null } catch (_) { doc = null }
      for (const e of (doc && Array.isArray(doc.files) ? doc.files : [])) if (e && typeof e.source === 'string' && typeof e.path === 'string') map.set(e.path, e.source)
    }
    maps.set(commit, map)
    return map
  }
  /*  The repository path of the plugin file `file` at `commit`: under the old plugin folder before the move, and the source
   *  path the commit's declarations give after it, or null where they give none. */
  const pluginAt = (commit, file) => {
    const f = String(file).split(path.sep).join('/').replace(/^\.\//, '')
    if (!moved(commit)) return prefix + f
    return mapAt(commit).get(f) || null
  }
  /*  The plugin's files at `commit` whose plugin path starts with one of `prefixes`, each { path, repoPath }, sorted by
   *  plugin path. */
  const filesAt = (commit, prefixes) => {
    const want = [].concat(prefixes || [''])
    let rows
    if (!moved(commit)) {
      const names = String(git(['ls-tree', '-r', '--name-only', '-z', commit, '--'].concat(want.map((p) => prefix + p)))).split('\0').filter(Boolean)
      rows = names.map((n) => ({ path: n.slice(prefix.length), repoPath: n }))
    } else {
      rows = Array.from(mapAt(commit).entries()).map(([p, r]) => ({ path: p, repoPath: r })).filter((x) => want.some((w) => x.path === w || x.path.startsWith(w)))
    }
    return rows.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  }
  /*  The version of the plugin at `commit`: the manifest of the plugin folder before the move; after it the commit's
   *  core/VERSION, or the Claude Code folder's manifest where no core/VERSION stands. Null where none reads. */
  const versionAt = (commit) => {
    if (moved(commit) && holds(commit, VERSION_FILE)) {
      try {
        const v = String(git(['show', commit + ':' + VERSION_FILE])).trim()
        if (/^\d+\.\d+\.\d+\S*$/.test(v)) return v
      } catch (_) { /* an unreadable core/VERSION: the manifest below answers */ }
    }
    const at = pluginAt(commit, '.claude-plugin/plugin.json')
    if (!at) return null
    try { return JSON.parse(git(['show', commit + ':' + at])).version || null } catch (_) { return null }
  }
  return { moved, pluginAt, filesAt, versionAt, prefix }
}

module.exports = { DECLARATIONS, SKILLS_SOURCE, VERSION_FILE, layoutReader }

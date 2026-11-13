'use strict'
// The operating system's credential store (ARCH D19; AC-10, AC-32): Windows Credential Manager through Windows
// PowerShell's PasswordVault, the macOS Keychain through /usr/bin/security in its interactive mode with the commands on
// standard input, and Linux Secret Service through secret-tool with the secret on standard input. No secret travels in a
// command line: each value goes in on standard input, and each value is base64 of its text (store.js).

const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { enc, dec } = require('./store.js')

/*  The system folders the client looks in for a credential tool where no path was kept yet. */
const SYSTEM_FOLDERS = ['/usr/bin', '/bin', '/usr/local/bin']

const firstLine = (r) => String((r.error && r.error.message) || r.stderr || r.stdout || '').trim().split('\n')[0].slice(0, 200)

/*  The path of Windows PowerShell under the system root the launcher set. */
function windowsPowerShell () {
  const root = process.env.SystemRoot || process.env.SYSTEMROOT || 'C:\\Windows'
  return path.join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
}

/*  The first statement of every PowerShell script the client runs (the second review of IP-MC-SERVER-002, N1), which
 *  calls no command: PSModulePath set to the modules of PowerShell's own folder alone, so a module planted in a folder of
 *  the default PSModulePath, the person's own Documents folder among them, stands in for no cmdlet the script calls. The
 *  scripts call no other cmdlet by a bare name: the store's script builds its objects through .NET, and the process
 *  listing names each cmdlet with its module. */
const PS_FIRST = "$env:PSModulePath = $PSHOME + '\\Modules'"
/*  The options every Windows PowerShell run of the client opens with. */
const PS_OPTIONS = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass']

/*  A name of the service and the items, which the scripts below quote: letters, digits, dot, dash and underscore. */
const safe = (s) => { if (!/^[A-Za-z0-9._-]{1,100}$/.test(String(s))) throw new Error('the name ' + JSON.stringify(s) + ' is no name of the store'); return String(s) }

/*  The Windows store, through PasswordVault in Windows PowerShell: each call one PowerShell run. The script, which holds
 *  names alone, goes as -EncodedCommand; each value it stores goes on standard input as data, one line each, which the
 *  script reads with [Console]::In.ReadLine(), so no value stands in a script text or on a command line (the review of
 *  IP-MC-SERVER-002). */
function windowsStore (service, tool) {
  const ps = tool || windowsPowerShell()
  // The whole script stands inside one try: a refusal anywhere exits 1, naming it, and nothing else does.
  const run = (lines, data) => {
    const body = ['$ErrorActionPreference = \'Stop\'', '[void][Windows.Security.Credentials.PasswordVault, Windows.Security.Credentials, ContentType = WindowsRuntime]', '$v = [Windows.Security.Credentials.PasswordVault]::new()'].concat(lines).join('; ')
    const script = PS_FIRST + '; try { ' + body + '; exit 0 } catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }'
    return spawnSync(ps, PS_OPTIONS.concat(['-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')]), { input: data || '', encoding: 'utf8', windowsHide: true, timeout: 60000 })
  }
  const svc = safe(service)
  return {
    name: 'Windows Credential Manager (PasswordVault), service ' + svc,
    tool: ps,
    getAll (items) {
      const r = run(items.map((i) => 'try { $c = $v.Retrieve(\'' + svc + '\', \'' + safe(i) + '\'); $c.RetrievePassword(); [Console]::Out.WriteLine(\'' + i + '=\' + $c.Password) } catch { [Console]::Out.WriteLine(\'' + i + '=\') }'))
      if (r.error || r.status !== 0) throw new Error('PasswordVault could not be read: ' + firstLine(r))
      const out = {}
      for (const i of items) out[i] = null
      for (const l of String(r.stdout).split(/\r?\n/)) { const m = /^([A-Za-z0-9._-]+)=([A-Za-z0-9+/=]*)$/.exec(l); if (m && m[2]) out[m[1]] = dec(m[2]) }
      return out
    },
    set (entries) {
      const lines = []
      const data = []
      for (const [k, val] of Object.entries(entries)) {
        lines.push('try { $v.Remove($v.Retrieve(\'' + svc + '\', \'' + safe(k) + '\')) } catch {}')
        lines.push('$p = [Console]::In.ReadLine()')
        lines.push('if ($p -notmatch \'^[A-Za-z0-9+/=]*$\') { throw \'the value of ' + k + ' did not come on standard input\' }')
        lines.push('$v.Add([Windows.Security.Credentials.PasswordCredential]::new(\'' + svc + '\', \'' + k + '\', $p))')
        data.push(enc(val))
      }
      const r = run(lines, data.join('\n') + '\n')
      if (r.error || r.status !== 0) throw new Error('PasswordVault could not be written: ' + firstLine(r))
    },
    remove (items) {
      const r = run(items.map((i) => 'try { $v.Remove($v.Retrieve(\'' + svc + '\', \'' + safe(i) + '\')) } catch {}'))
      if (r.error || r.status !== 0) throw new Error('PasswordVault could not be changed: ' + firstLine(r))
    }
  }
}

/*  The macOS Keychain, through /usr/bin/security -i, its commands on standard input. */
function macStore (service, tool) {
  const sec = tool || '/usr/bin/security'
  const svc = safe(service)
  const run = (lines) => spawnSync(sec, ['-i'], { input: lines.join('\n') + '\n', encoding: 'utf8', timeout: 60000 })
  return {
    name: 'the macOS Keychain, service ' + svc,
    tool: sec,
    getAll (items) {
      const out = {}
      for (const i of items) {
        const r = run(['find-generic-password -s ' + svc + ' -a ' + safe(i) + ' -w'])
        if (r.error) throw new Error('the Keychain could not be read: ' + firstLine(r))
        const line = String(r.stdout || '').split(/\r?\n/).map((l) => l.trim()).find((l) => /^[A-Za-z0-9+/=]{4,}$/.test(l))
        out[i] = line ? dec(line) : null
      }
      return out
    },
    set (entries) {
      const r = run(Object.entries(entries).map(([k, v]) => 'add-generic-password -U -s ' + svc + ' -a ' + safe(k) + ' -l ' + svc + ' -w ' + enc(v)))
      if (r.error || r.status !== 0 || /error|could not/i.test(String(r.stderr || ''))) throw new Error('the Keychain could not be written: ' + firstLine(r))
    },
    remove (items) {
      const r = run(items.map((i) => 'delete-generic-password -s ' + svc + ' -a ' + safe(i)))
      if (r.error) throw new Error('the Keychain could not be changed: ' + firstLine(r))
    }
  }
}

/*  Linux Secret Service, through secret-tool on the session bus the launcher names. */
function linuxStore (service, tool) {
  const st = tool || SYSTEM_FOLDERS.map((d) => path.join(d, 'secret-tool')).find((p) => fs.existsSync(p)) || null
  const svc = safe(service)
  if (!st) return { none: 'no secret-tool stands in ' + SYSTEM_FOLDERS.join(', ') + ', so Secret Service cannot be reached' }
  return {
    name: 'Secret Service (secret-tool), service ' + svc,
    tool: st,
    getAll (items) {
      const out = {}
      for (const i of items) {
        const r = spawnSync(st, ['lookup', 'service', svc, 'item', safe(i)], { encoding: 'utf8', timeout: 60000 })
        if (r.error) throw new Error('Secret Service could not be read: ' + firstLine(r))
        const v = String(r.stdout || '').trim()
        out[i] = r.status === 0 && /^[A-Za-z0-9+/=]+$/.test(v) ? dec(v) : null
      }
      return out
    },
    set (entries) {
      for (const [k, v] of Object.entries(entries)) {
        const r = spawnSync(st, ['store', '--label', svc + ' ' + safe(k), 'service', svc, 'item', k], { input: enc(v), encoding: 'utf8', timeout: 60000 })
        if (r.error || r.status !== 0) throw new Error('Secret Service could not be written: ' + firstLine(r))
      }
    },
    remove (items) {
      for (const i of items) spawnSync(st, ['clear', 'service', svc, 'item', safe(i)], { encoding: 'utf8', timeout: 60000 })
    }
  }
}

/*  The store of this computer for `service`: the kept credential tool where login kept one. */
function osStore (service, programs) {
  const tool = programs && programs.credential ? programs.credential : null
  if (process.platform === 'win32') return windowsStore(service, tool)
  if (process.platform === 'darwin') return macStore(service, tool)
  return linuxStore(service, tool)
}

/*  Writes, reads and deletes a probe item in `store` (AC-32): { ok } or { ok: false, why }. */
function probe (store) {
  if (store.none) return { ok: false, why: store.none }
  const value = 'probe-' + require('node:crypto').randomBytes(8).toString('hex')
  try {
    store.set({ probe: value })
    const back = store.getAll(['probe']).probe
    store.remove(['probe'])
    if (back !== value) return { ok: false, why: store.name + ' kept a probe item and gave back ' + (back === null ? 'nothing' : 'another value') }
    if (store.getAll(['probe']).probe !== null) return { ok: false, why: store.name + ' kept the probe item after its deletion' }
    return { ok: true }
  } catch (e) {
    return { ok: false, why: String(e.message || e).split('\n')[0] }
  }
}

module.exports = { PS_FIRST, PS_OPTIONS, SYSTEM_FOLDERS, windowsPowerShell, windowsStore, macStore, linuxStore, osStore, probe }

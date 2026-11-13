# The Windows half of the launcher (ARCH D19; record 117). client\mc17.cmd, client/mc17 under Git Bash, and the gate
# hooks (core/hooks/mc17_client.py) run this script in Windows PowerShell, from its path in the variable mc_script. It
# reads the user folders from the registry, reads the record of node mc17 login wrote, ~/.mc17/client/node.json with the
# path of node and the sha256 of its bytes, checks that the file at that path still carries that sha256, and starts it
# with --use-system-ca on client\mc17.js in an environment built from nothing: the system root, the user folders, the
# temporary folder and a PATH of the system folders. Nothing of the caller's environment reaches node, and no program
# path comes from the credential store (the review of IP-MC-SERVER-002). Where no record stands, or the node at its path
# changed, it starts only mc17 login, with the node and the PATH of the terminal it runs in, and refuses every other
# command, naming mc17 login. Its exit code is the client's.
#
# The arguments come in one of two forms: mc_args holds the command line as cmd passed it, which reaches node as it
# stands; or mc_argc holds their count and mc_arg_1 to mc_arg_<n> each one, which this script quotes for node. The hooks
# use the second form alone, so no shell reads an argument on its way.
#
# The statement below opens every PowerShell script the client runs, and calls no command: Windows PowerShell autoloads
# a module from the folders of PSModulePath, the person's own Documents folder among them, so a module planted there
# could stand in for any cmdlet the script calls (the second review of IP-MC-SERVER-002, N1). The path is set to the
# modules of PowerShell's own folder alone before anything else runs, and this script calls no cmdlet at all: it reads
# the registry, the record and the node through .NET, and starts node through Process.
$env:PSModulePath = $PSHOME + '\Modules'
$ErrorActionPreference = 'Stop'
$service = 'devyonq-mc'
# The store root of the client's test build alone (tests/ci/test-client.js writes it there): where it names a folder, the
# launcher gives the client the home folder home\ in it, and reads the record of node from home\.mc17\client\node.json
# there, so a run of the suites or the CI touches neither the person's PasswordVault nor the person's profile. The
# shipped launcher holds the empty value and reads no variable for it: the registry stays its one source.
$storeRoot = ''
$client = [IO.Path]::GetDirectoryName([IO.Path]::GetDirectoryName($env:mc_script))
$windows = [Environment]::GetFolderPath('Windows')
if ($env:SystemRoot -and ($env:SystemRoot.TrimEnd('\') -ne $windows.TrimEnd('\'))) {
  [Console]::Error.WriteLine('mc17: the variable SystemRoot names ' + $env:SystemRoot + ', and Windows stands in ' + $windows + '; the launcher refuses to run.')
  exit 1
}
function Quote([string]$a) {
  if ($a -ne '' -and $a -notmatch '[\s"]') { return $a }
  $o = '"'; $bs = 0
  foreach ($ch in $a.ToCharArray()) {
    if ($ch -eq '\') { $bs++ }
    elseif ($ch -eq '"') { $o += ('\' * ($bs * 2 + 1)) + '"'; $bs = 0 }
    else { $o += ('\' * $bs) + $ch; $bs = 0 }
  }
  return $o + ('\' * ($bs * 2)) + '"'
}
$first = ''
$line = ''
if ($env:mc_argc) {
  $parts = @()
  for ($i = 1; $i -le [int]$env:mc_argc; $i++) { $parts += (Quote ([Environment]::GetEnvironmentVariable('mc_arg_' + $i))) }
  if ($parts.Count -gt 0) { $first = [Environment]::GetEnvironmentVariable('mc_arg_1') }
  $line = $parts -join ' '
} elseif ($env:mc_args) {
  $line = $env:mc_args
  $first = (($line.Trim() -split '\s+')[0]).Trim('"')
}
$path = "$windows\System32;$windows;$windows\System32\Wbem;$windows\System32\WindowsPowerShell\v1.0"
# The user folders, from the profile list and the user's shell folders in the registry, so no variable of the caller's
# environment changes them: the known-folder API expands %USERPROFILE% from the caller's environment.
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$userProfile = [string][Microsoft.Win32.Registry]::GetValue('HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList\' + $sid, 'ProfileImagePath', '')
if ($storeRoot -ne '') { $userProfile = [IO.Path]::Combine($storeRoot, 'home') }
function Folder([string]$name, [string]$default) {
  if ($storeRoot -ne '') { return [IO.Path]::Combine($userProfile, $default) }
  $key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders')
  $v = $null
  if ($key) { $v = $key.GetValue($name, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames); $key.Close() }
  if (-not $v) { return [IO.Path]::Combine($userProfile, $default) }
  return ($v -replace '%USERPROFILE%', $userProfile)
}
$appData = Folder 'AppData' 'AppData\Roaming'
$local = Folder 'Local AppData' 'AppData\Local'
# The node the client runs on: the file the record of mc17 login names, run only while its bytes carry the sha256 the
# record holds. The record stands in the client's own folder, which the secret gate keeps from every AI tool. It is read
# by its two fields as JSON writes them, path as a JSON string and sha256, with no cmdlet.
$node = ''
$why = 'the client keeps no path of node yet'
$record = [IO.Path]::Combine($userProfile, '.mc17\client\node.json')
if ([IO.File]::Exists($record)) {
  $why = 'the record of node at ' + $record + ' does not read'
  try {
    $text = [IO.File]::ReadAllText($record)
    $mp = [regex]::Match($text, '"path"\s*:\s*"((?:[^"\\]|\\.)*)"')
    $ms = [regex]::Match($text, '"sha256"\s*:\s*"([0-9A-Fa-f]{64})"')
    $p = ''
    if ($mp.Success) { $p = [regex]::Unescape($mp.Groups[1].Value) }
    $want = ''
    if ($ms.Success) { $want = $ms.Groups[1].Value.ToLowerInvariant() }
    if ($p -ne '' -and [IO.Path]::IsPathRooted($p) -and [IO.File]::Exists($p) -and $want -match '^[0-9a-f]{64}$') {
      $sha = [Security.Cryptography.SHA256]::Create()
      $fs = [IO.File]::OpenRead($p)
      try { $have = ([BitConverter]::ToString($sha.ComputeHash($fs)) -replace '-', '').ToLowerInvariant() } finally { $fs.Dispose(); $sha.Dispose() }
      if ($have -eq $want) { $node = $p } else { $why = 'the node at ' + $p + ' no longer carries the sha256 mc17 login recorded for it' }
    }
  } catch { $node = '' }
}
if ($node -eq '') {
  # The command that signs this computer in, in the form a person types it into PowerShell.
  $loginCommand = '& "' + [IO.Path]::Combine($client, 'mc17.cmd') + '" login'
  # The session-start hook's forms, settings --hook <value> [--as additional-context], on a computer with no sign-in: the
  # head tells the person and the AI, and opens one window that runs mc17 login; every other value prints nothing, so a
  # session start shows one notice and no error per hook.
  $argv = @()
  if ($env:mc_argc) { for ($i = 1; $i -le [int]$env:mc_argc; $i++) { $argv += [Environment]::GetEnvironmentVariable('mc_arg_' + $i) } }
  elseif ($line -ne '') { foreach ($word in ($line.Trim() -split '\s+')) { $argv += $word.Trim('"') } }
  $hookAt = [Array]::IndexOf($argv, '--hook')
  if ($first -eq 'settings' -and $hookAt -ge 1 -and $hookAt + 1 -lt $argv.Count) {
    if ($argv[$hookAt + 1] -ne 'head') { exit 0 }
    $asContext = ([Array]::IndexOf($argv, 'additional-context') -gt [Array]::IndexOf($argv, '--as')) -and ([Array]::IndexOf($argv, '--as') -ge 0)
    $own = [IO.Path]::Combine($userProfile, '.mc17\client')
    $mark = [IO.Path]::Combine($own, 'sign-in-window.txt')
    $off = [IO.File]::Exists([IO.Path]::Combine($own, 'no-sign-in-window'))
    $recent = $false
    if ([IO.File]::Exists($mark)) { $recent = ([DateTime]::UtcNow - [IO.File]::GetLastWriteTimeUtc($mark)).TotalMinutes -lt 10 }
    $opened = $false
    if (-not $off -and -not $recent -and [Environment]::UserInteractive) {
      try {
        $w = [Diagnostics.ProcessStartInfo]::new()
        $w.FileName = "$windows\System32\cmd.exe"
        $w.Arguments = '/k title DevyonQ sign-in & "' + [IO.Path]::Combine($client, 'mc17.cmd') + '" login'
        $w.UseShellExecute = $true
        [void][Diagnostics.Process]::Start($w)
        $opened = $true
        [void][IO.Directory]::CreateDirectory($own)
        [IO.File]::WriteAllText($mark, [DateTime]::UtcNow.ToString('o'))
      } catch { $opened = $false }
    }
    $lines = @('[devyonq-mc] This computer is not signed in to DevyonQ.')
    if ($opened) {
      $lines += 'A new window has opened to sign you in: your browser opens, pick your tenant and approve.'
      $lines += 'If no window opened, or the sign-in failed, run this in your own terminal:'
    } else {
      $lines += 'Run this in your own terminal to sign in:'
    }
    $lines += '  ' + $loginCommand
    $lines += 'Mission skills and mc17 commands wait until you are signed in. The AI runs no mc17 command and no Mission skill before then, and tells the person to sign in.'
    $text = ($lines -join "`n") + "`n"
    if ($asContext) {
      $esc = $text.Replace('\', '\\').Replace('"', '\"').Replace("`n", '\n')
      [Console]::Out.Write('{"additionalContext":"' + $esc + '","hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"' + $esc + '"}}' + "`n")
    } else {
      [Console]::Out.Write($text)
    }
    exit 0
  }
  if ($first -ne 'login' -and $first -ne 'logout') {
    [Console]::Error.WriteLine('mc17: ' + $why + '. Run mc17 login in your own terminal first: ' + $loginCommand)
    exit 1
  }
  # The node of the terminal's PATH, looked for in each of its folders through .NET, as Windows finds node.exe there.
  foreach ($dir in ([string]$env:PATH).Split(';')) {
    $d = $dir.Trim().Trim('"')
    if ($d -eq '') { continue }
    $cand = ''
    try { $cand = [IO.Path]::Combine($d, 'node.exe') } catch { continue }
    if ([IO.File]::Exists($cand)) { $node = $cand; break }
  }
  if ($node -eq '') { [Console]::Error.WriteLine('mc17 login: no node stands on the PATH of this terminal.'); exit 1 }
}
if ($first -eq 'login' -or $first -eq 'logout') { $path = $env:PATH }
$psi = [Diagnostics.ProcessStartInfo]::new()
$psi.FileName = $node
$psi.Arguments = '--use-system-ca ' + (Quote ([IO.Path]::Combine($client, 'mc17.js'))) + $(if ($line -ne '') { ' ' + $line } else { '' })
$psi.UseShellExecute = $false
$envs = $psi.EnvironmentVariables
if ($psi.PSObject.Properties.Name -contains 'Environment') { $envs = $psi.Environment }
$envs.Clear()
$envs['SystemRoot'] = $windows
$envs['windir'] = $windows
$envs['ComSpec'] = "$windows\System32\cmd.exe"
$envs['PATHEXT'] = '.COM;.EXE;.BAT;.CMD'
$envs['PATH'] = $path
$envs['USERPROFILE'] = $userProfile
$envs['APPDATA'] = $appData
$envs['LOCALAPPDATA'] = $local
$envs['TEMP'] = [IO.Path]::Combine($local, 'Temp')
$envs['TMP'] = [IO.Path]::Combine($local, 'Temp')
$p = [Diagnostics.Process]::Start($psi)
$p.WaitForExit()
exit $p.ExitCode

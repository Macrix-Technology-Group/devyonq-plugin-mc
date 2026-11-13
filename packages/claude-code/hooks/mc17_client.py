"""mc17_client.py - how a gate hook calls the mc17 client (ARCH D15, D20, D23; Interface Contracts, The hook-to-client
check interface).

Every hook finds the launcher from its own file alone, two levels above it: client/mc17 on macOS and Linux, and
client/lib/launch.ps1 in Windows PowerShell on Windows, never through cmd.exe. It never looks the launcher up on the PATH
or under CLAUDE_PLUGIN_ROOT, so a fake mc17 an AI puts first on its path is never run. A hook reads only the client's
exit code and its JSON line.

A client that has not answered within the bound is a refusal, as is any exit but the one the hook admits and a line
the hook cannot read: some hosts treat a hook they stop for its time as an allow, and a gate that fails open would let
the act through unchecked (D20).
"""
import json, os, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# The longest a hook waits for the client, below the smaller of the host's own two hook limits on every host: the
# gates' 30 s and the session-start settings hooks' 15 s (platforms/claude-code/hooks/hooks.json, platforms/codex/hooks/
# hooks.json). The figure is owed a measurement: the round trip of the start report from a person's computer to
# devyonq-staging, and again to production before mission/mc-server of devyonq-mc merges into main. It stands unset
# until that measurement, as MEASURED_BOUND = None below, and the hooks wait UNMEASURED_BOUND meanwhile.
MEASURED_BOUND = None  # (bound: the measured round trip of the start report with its margin; owed, record 104 Point 3, not measured yet)
UNMEASURED_BOUND = 12  # (bound: stands below the smallest host limit, the 15 s of the session-start hooks, until the measurement of record 104 Point 3 sets MEASURED_BOUND; ruled record 104)


def bound():
    """The seconds a hook waits for the client: the measured figure where one is set, else the interim bound."""
    return MEASURED_BOUND if MEASURED_BOUND is not None else UNMEASURED_BOUND


def launcher():
    """The launcher of the plugin this hook stands in, two levels above the hook file: client/mc17 on macOS and Linux, and
    on Windows client/lib/launch.ps1, the script client/mc17.cmd hands to. A hook on Windows never goes through cmd.exe,
    which reads &, |, ^ and %VAR% in a word as its own, so a file the AI names a&x&.md would run x: it starts
    Windows PowerShell on launch.ps1 itself, each argument in a variable of its own."""
    if os.name == "nt":
        return os.path.join(ROOT, "client", "lib", "launch.ps1")
    return os.path.join(ROOT, "client", "mc17")


def client_home():
    """The home folder the client reads, as the system names it and not as HOME or USERPROFILE say: the client's launcher
    reads it so (client/mc17, lib/launch.ps1), and a Worker step runs the hooks with a home of its own. On Windows the
    known folder FOLDERID_Profile, which no variable of the caller's environment changes; elsewhere the user's entry of the
    password database. Where neither reads, the home the environment names."""
    if os.name == "nt":
        try:
            import ctypes, uuid
            from ctypes import wintypes

            class GUID(ctypes.Structure):
                _fields_ = [("d1", wintypes.DWORD), ("d2", wintypes.WORD), ("d3", wintypes.WORD), ("d4", ctypes.c_ubyte * 8)]

            u = uuid.UUID("{5E6C858F-0E22-4760-9AFE-EA3317B67173}")  # FOLDERID_Profile
            g = GUID(u.fields[0], u.fields[1], u.fields[2], (ctypes.c_ubyte * 8)(*u.bytes[8:]))
            p = ctypes.c_wchar_p()
            if ctypes.windll.shell32.SHGetKnownFolderPath(ctypes.byref(g), 0, None, ctypes.byref(p)) == 0 and p.value:
                value = p.value
                ctypes.windll.ole32.CoTaskMemFree(p)
                return value
        except Exception:
            pass
        return os.path.expanduser("~")
    try:
        import pwd
        return pwd.getpwuid(os.getuid()).pw_dir
    except Exception:
        return os.path.expanduser("~")


def windows_powershell():
    """Windows PowerShell under the system root, as client/mc17.cmd names it; launch.ps1 refuses a SystemRoot that differs
    from the folder Windows stands in."""
    return os.path.join(os.environ.get("SystemRoot") or "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe")


# What Windows PowerShell runs: PSModulePath set to PowerShell's own modules before anything else, then launch.ps1 as a
# script block, with no command called, so a module planted in a folder of the hook's PSModulePath, which the person's
# Documents folder joins, stands in for no cmdlet.
PS_RUN = "$env:PSModulePath = $PSHOME + '\\Modules';& ([ScriptBlock]::Create([IO.File]::ReadAllText($env:mc_script)))"


def command_of(path, args):
    """The argv and the environment that run the launcher at `path` with `args`. On Windows: Windows PowerShell running
    the script whose path stands in mc_script, with the count of the arguments in mc_argc and each in mc_arg_<n>, the
    form launch.ps1 quotes for node itself; no shell reads an argument on the way. Elsewhere: the launcher with the
    arguments, which the system starts with no shell."""
    if os.name != "nt":
        return [path] + list(args), None
    env = {k: v for k, v in os.environ.items() if not (k.lower() == "mc_args" or k.lower().startswith("mc_arg_"))}
    env["mc_script"] = path
    env["mc_argc"] = str(len(args))
    for i, a in enumerate(args, 1):
        env["mc_arg_%d" % i] = str(a)
    argv = [windows_powershell(), "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", PS_RUN]
    return argv, env


def end_tree(proc):
    """Ends a client that ran past the bound, its whole process tree on Windows, and reads its pipes to their end."""
    if os.name == "nt":
        killer = os.path.join(os.environ.get("SystemRoot") or "C:\\Windows", "System32", "taskkill.exe")
        try:
            subprocess.run([killer, "/F", "/T", "/PID", str(proc.pid)], capture_output=True, timeout=5)
        except Exception:
            pass
    try:
        proc.kill()
    except Exception:
        pass
    try:
        proc.communicate(timeout=5)
    except Exception:
        pass


def call(args, cwd=None, input_text=None):
    """Runs the client with `args` in `cwd`: { exit, stdout, stderr, late, failed, line }. `late` reads true where the
    client did not answer within the bound, `failed` names why it did not run, and `line` is the last line of its
    stdout read as JSON, or None where that line does not read."""
    out = {"exit": None, "stdout": "", "stderr": "", "late": False, "failed": None, "line": None, "launcher": launcher()}
    path = launcher()
    if not os.path.isfile(path):
        out["failed"] = "the plugin holds no client at %s" % path
        return out
    argv, env = command_of(path, [str(a) for a in args])
    try:
        proc = subprocess.Popen(argv, cwd=cwd or None, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                text=True, encoding="utf-8", errors="surrogateescape")
    except Exception as e:
        out["failed"] = "the client did not start (%s: %s)" % (type(e).__name__, str(e)[:160])
        return out
    try:
        so, se = proc.communicate(input=input_text, timeout=bound())
    except subprocess.TimeoutExpired:
        end_tree(proc)
        out["late"] = True
        return out
    out.update(exit=proc.returncode, stdout=so or "", stderr=se or "")
    lines = [l for l in (so or "").splitlines() if l.strip()]
    if lines:
        try:
            v = json.loads(lines[-1])
            out["line"] = v if isinstance(v, dict) else None
        except Exception:
            out["line"] = None
    return out


def why_refused(r, what):
    """The words a hook gives where the client's answer admits nothing: a client past its bound, one that did not run,
    an exit but 0, or a line that does not read. None where the client answered 0 with a line that reads."""
    if r["late"]:
        return "the client %s did not answer %s within its bound of %d seconds, and a client that hangs is a refusal" % (r["launcher"], what, bound())
    if r["failed"]:
        return r["failed"]
    if r["exit"] != 0:
        said = (r["line"] or {}).get("why") if r["line"] else None
        if not said:
            tail = (r["stderr"] or r["stdout"]).strip().splitlines()
            said = tail[-1] if tail else None
        return "the client answered %s with exit %s: %s" % (what, r["exit"], said or "no words")
    if r["line"] is None:
        return "the client answered %s with no line the hook can read" % what
    return None

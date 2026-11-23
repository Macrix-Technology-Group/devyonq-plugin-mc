#!/usr/bin/env python3
"""Refuses a command, a file read, a file write or a file edit that reaches what the mc17 client keeps (ARCH D19, D23;
AC-10).

A PreToolUse hook. It reads one call as JSON on stdin, in the payload Claude Code sends; on the other hosts the dialect
maps their payload onto it. It refuses, with a message naming what it found, a call that names any of:

  - a credential tool: security, secret-tool, cmdkey, keyring, vaultcmd, kwallet-query, kwalletcli and the D-Bus
    tools gdbus, busctl and dbus-send (which reach Secret Service as secret-tool does) in program position, which is
    the first word of a command or of a part after |, ;, &, &&, ||, $(, a backtick, a parenthesis or a brace, and after
    the words env, sudo, exec, xargs, command, nohup, time, nice or timeout, as a bare name or a path that ends in it;
    PasswordVault, CredRead and CredEnumerate as a type or a call, as PowerShell writes them, the vault cmdlets
    Get-StoredCredential, New-StoredCredential, Remove-StoredCredential, Get-Secret, Set-Secret, Get-SecretInfo,
    Get-SecretVault and Unlock-SecretStore, and win32cred; keyring and secretstorage also as import, from or -m in
    Python;
  - the client's folders: .mc17/client, which every path form of ~/.mc17/client holds ($HOME, %USERPROFILE%,
    $env:USERPROFILE or the home folder's absolute path), and client/lib, with either slash, in any letter case on
    Windows and macOS; and the folder of the judgment module's key, ~/.canonq/mc17-converge, which holds
    openrouter-key (AC-10), in the same forms, and any shell call whose folder stands inside it;
  - a write by a file tool, and any shell call but a read, of the plugin's own files: every file of the plugin this gate
    stands in, each file build/contents.json ships (client/, hooks/, harness/, check/, the hosts' hook files and
    manifests, mc-run's bin/ among them), and every file in the folder of the node the client runs on, the one
    ~/.mc17/client/node.json names, since Windows loads a library planted beside a program. A shell call that names
    such a file by its real form, as a word, a path inside a word such as
    a script's text, or the folder the call runs in, does so through a reader of a short list alone (cat, head, tail,
    less, grep, rg, sed -n, wc, ls, Get-Content, and git show, diff and log), naming it as a whole word; running a file
    of the plugin as a program or an interpreter's script passes; git checkout, restore, reset, apply, stash, clean,
    switch and their kin are refused where they touch those files, as in a work tree that tracks them; rm, mv and their
    kin are refused on a folder that holds them; and a redirection to them is refused, since a list of writers would
    miss one such as node -e, python -c, git checkout, perl -pi or curl -o. A copy
    of the plugin, a folder whose FILES.lock is byte for byte the plugin's own, counts as the plugin's own: its files are
    kept from a write alike, and a file of it runs as the plugin's own where the whole copy verifies against that lock
    by sha256 (copy_file; GitHub Copilot in VS Code runs the hooks of two installs of one release);
  - the service devyonq-mc, only in a command or a script that also names a credential tool by its name;
  - mc17 login, mc17 logout or mc17 trust, as literals, also after client/mc17 or mc17.cmd;
  - launchctl setenv and systemctl --user set-environment, the two forms that change what the launcher reads.

For a shell call, which is any call whose input carries a command (Bash, PowerShell, Monitor and the like), it reads
the command and each script file the command runs (an interpreter's script, a sourced file or a program given by a
path), for the same names. For any other tool it reads every text of the tool's input that names a path. The host
starts it for every tool (Claude Code's matcher .*), and a call that names none of these passes at once.

A bare word never refuses: SECURITY.md, git log --grep security, a path under server/security/, git clone of
devyonq-mc and node scripts/build.js pass.

Limit: a name a variable carries or a string decodes passes this hook, and a pseudo-terminal answers a
prompt that asks for one. The Technical Owner accepted it.

Exits 0 in every case; a refusal is the deny form on stdout. On an error of its own it refuses, since a reader of the
store that passed unread would leave no mark.
"""
import json, os, re, shlex, sys

PLUGIN = "devyonq-mc"
# The credential tools that count in program position, by their last path part with a closing .exe taken off.
PROGRAMS = ("security", "secret-tool", "cmdkey", "keyring", "vaultcmd", "kwallet-query", "kwalletcli", "gdbus", "busctl", "dbus-send")
# The words that hand the program position to the word after their own options.
WRAPPERS = ("env", "sudo", "exec", "xargs", "command", "nohup", "time", "nice", "timeout", "doas", "&")
# The names of the credential tools as words, which make the service count.
TOOL_WORDS = re.compile(r"(?<![A-Za-z0-9_-])(security|secret-tool|cmdkey|keyring|secretstorage|vaultcmd|kwallet-query|kwalletcli|gdbus|busctl|dbus-send|PasswordVault|CredRead|CredEnumerate|win32cred|Get-StoredCredential|Get-Secret)(?![A-Za-z0-9_-])", re.I)
SERVICE = re.compile(r"(?<![A-Za-z0-9_.-])devyonq-mc(?![A-Za-z0-9_-])", re.I)
# PasswordVault and CredRead as a type or a call: [..PasswordVault], New-Object ..PasswordVault, PasswordVault]::,
# CredRead( and ::CredRead.
POWERSHELL = re.compile(r"\[[\w.\s]*PasswordVault\b|New-Object\s+[\w.]*PasswordVault\b|PasswordVault\s*[\]\)(]|\bCred(?:Read|Enumerate)W?\s*\(|::\s*Cred(?:Read|Enumerate)W?\b|\.Cred(?:Read|Enumerate)W?\b"
                        r"|\[[\w.\s]*Credentials?\.PasswordVault", re.I)
# The vault cmdlets of PowerShell's CredentialManager and SecretManagement modules, and pywin32's credential module.
VAULT_CMDLETS = re.compile(r"(?<![\w-])(?:(?:Get|New|Remove)-StoredCredential|(?:Get|Set|Remove)-Secret(?:Info)?|Get-SecretVault|Unlock-SecretStore|win32cred)(?![\w-])", re.I)
PYTHON_KEYRING = re.compile(r"(?:^|[\s;(\"'])(?:import\s+(?:keyring|secretstorage)\b|from\s+(?:keyring|secretstorage)\b|-m\s+(?:keyring|secretstorage)\b)", re.M)
# The folders, as a pair of path parts with either slash, standing where a path part may start and end.
CASE = re.I if os.name == "nt" or sys.platform == "darwin" else 0
FOLDERS = (
    ("the client's folder ~/.mc17/client", re.compile(r"(?:^|[\s'\"=:/\\(`])\.mc17[/\\]+client(?=$|[/\\\s'\"`);&|])", re.M | CASE)),
    ("the client's folder client/lib", re.compile(r"(?:^|[\s'\"=:/\\(`])client[/\\]+lib(?=$|[/\\\s'\"`);&|])", re.M | CASE)),
    ("the folder of the judgment module's key ~/.canonq/mc17-converge", re.compile(r"(?:^|[\s'\"=:/\\(`])\.canonq[/\\]+mc17-converge(?=$|[/\\\s'\"`);&|])", re.M | CASE)),
)
# The plugin this gate stands in, two levels above it. Every file of it is guarded from a write: the client, the gates,
# the git hooks, the harness's settings modules, the chat rules, the hosts' hook files and manifests and mc-run's
# launcher run on the computer, and the skills and texts steer the AI tool (N3).
PLUGIN_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GUARDED = (PLUGIN_ROOT,)


HOMES = None


def homes():
    """The home folders whose ~/.mc17 and ~/.canonq the gate keeps: the one the client reads, as the system names it
    (client_home of hooks/mc17_client.py), since a Worker step runs the hooks with a home of its own, and the one HOME
    or USERPROFILE names where it differs. The gate keeps both: a folder kept too many refuses nothing it should pass."""
    global HOMES
    if HOMES is not None:
        return list(HOMES)
    out = []
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("mc17_client_secret", os.path.join(os.path.dirname(os.path.abspath(__file__)), "mc17_client.py"))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        out.append(module.client_home())
    except Exception:
        pass
    h = os.path.expanduser("~")
    if not any(os.path.normcase(os.path.normpath(x)) == os.path.normcase(os.path.normpath(h)) for x in out):
        out.append(h)
    HOMES = tuple(out)
    return out


def node_folders():
    """The folders of the node the client runs on, as the record mc17 login wrote names it, ~/.mc17/client/node.json of
    each home of homes(), by their real form; none where no record reads. Windows loads a library from a program's own
    folder first, so a file an AI tool put beside a node that stands in a folder the person can write would run inside
    the client (N3, N9)."""
    out = []
    for h in homes():
        try:
            with open(os.path.join(h, ".mc17", "client", "node.json"), encoding="utf-8") as fh:
                p = json.load(fh).get("path")
            if isinstance(p, str) and os.path.isabs(p):
                out.append(os.path.realpath(os.path.dirname(p)))
        except Exception:
            pass
    return out
# The variables a host or a shell names the plugin's folder by, which the gate reads as that folder.
ROOT_VARIABLES = re.compile(r"\$\{(?:CLAUDE_PLUGIN_ROOT|PLUGIN_ROOT)\}|\$(?:CLAUDE_PLUGIN_ROOT|PLUGIN_ROOT)\b|\$env:(?:CLAUDE_PLUGIN_ROOT|PLUGIN_ROOT)\b|%(?:CLAUDE_PLUGIN_ROOT|PLUGIN_ROOT)%", re.I)
# The tools that read a file and write none, by the names of every host's dialect; every other tool that names a path
# counts as one that can write it.
READ_TOOLS = ("Read", "Grep", "Glob", "LS", "NotebookRead", "WebFetch", "WebSearch", "view", "read_file", "grep_search", "file_search", "list_dir")
# The programs of a shell that read the files their words name and write none, by their last path part, lower-cased: a
# shell call names a file of the plugin or of the folder of the client's node through one of them alone, or prints its
# path with echo or printf. sed counts with -n and no -i or -f, git with
# show, diff or log, each with the options that write a file refused (reader_refusal).
READERS = ("cat", "head", "tail", "less", "grep", "egrep", "fgrep", "rg", "sed", "wc", "ls", "get-content", "gc", "git", "echo", "printf",
           "select-string", "sls", "findstr")
GIT_READS = ("show", "diff", "log")
# The git commands that change files of the work tree, which are refused where they touch the plugin's files.
GIT_WRITES = ("checkout", "restore", "reset", "apply", "am", "stash", "clean", "switch", "merge", "pull", "rebase", "cherry-pick",
              "revert", "read-tree", "checkout-index", "rm", "mv")
# The programs that remove or move a folder whole, refused on a folder that holds a file of the plugin.
REMOVERS = ("rm", "rmdir", "rd", "mv", "move", "del", "erase", "remove-item", "ri", "move-item", "mi", "rename-item", "ren", "rename",
            "robocopy", "rsync")
# The words that change the folder the parts after them run in.
CHANGE_DIR = ("cd", "pushd", "chdir", "set-location", "sl")
LITERALS = re.compile(r"(?<![A-Za-z0-9_-])(?:[^\s'\"]*[/\\])?mc17(?:\.cmd|\.js)?['\"]?\s+(login|logout|trust|config)(?![A-Za-z0-9_-])")
ENVIRONMENT = (
    ("launchctl setenv", re.compile(r"(?<![A-Za-z0-9_-])launchctl\s+setenv\b")),
    ("systemctl --user set-environment", re.compile(r"(?<![A-Za-z0-9_-])systemctl\b[^;|&\n]*\bset-environment\b")),
)
# The separators after which a word stands in program position.
SEPARATORS = re.compile(r"\|\||&&|\$\(|[|;&\n`(){}]")
# The interpreters whose first word that is no option names the script they run, and the words that run a file.
INTERPRETERS = ("node", "python", "python3", "py", "bash", "sh", "zsh", "dash", "ksh", "pwsh", "powershell", "deno", "bun", "ruby", "perl", "osascript", "cscript", "wscript")
SOURCING = ("source", ".")
SCRIPT_CAP = 1024 * 1024
SCRIPT_DEPTH = 2
TOOL = None


def deny(message):
    print(json.dumps({
        "hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "[%s reason] %s" % (PLUGIN, message)},
        "additionalContext": "[%s context] the secret gate refused this %s call, and nothing ran.\n\n%s" % (PLUGIN, TOOL or "tool", message),
        "systemMessage": "[%s] the secret gate refused this %s call: %s" % (PLUGIN, TOOL or "tool", message.split("\n")[0]),
    }))
    print("[%s] %s" % (PLUGIN, message), file=sys.stderr)
    sys.exit(0)


def words_of(part):
    """The shell words of one part of a command, by POSIX rules where they read, else split at white space. A part that
    holds a backslash is read as Windows writes paths, with its backslashes kept and its quotes taken off."""
    if "\\" in part:
        try:
            return [w.strip("'\"") for w in shlex.split(part, posix=False)]
        except ValueError:
            return part.split()
    try:
        return shlex.split(part, posix=True)
    except ValueError:
        return part.split()


def last_part(word):
    """A program word by its last path part, lower-cased, a closing .exe taken off."""
    w = re.split(r"[/\\]", word.strip("'\""))[-1].lower()
    return w[:-4] if w.endswith(".exe") else w


def program_words(text):
    """Each word of `text` in program position, with the words after it in its part: [(word, rest)]."""
    out = []
    for part in SEPARATORS.split(text):
        words = words_of(part)
        i = 0
        while i < len(words):
            w = words[i]
            if re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", w):
                i += 1
                continue
            if last_part(w) in WRAPPERS:
                i += 1
                while i < len(words) and (words[i].startswith("-") or re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", words[i]) or re.match(r"^\d+[smhd]?$", words[i])):
                    i += 1
                continue
            break
        if i < len(words):
            out.append((words[i], words[i + 1:]))
    return out


def named_in(text):
    """What `text` names of the counted forms, as a list of words, the first the one a refusal leads with."""
    found = []
    for word, rest in program_words(text):
        if last_part(word) in PROGRAMS:
            found.append("the credential tool %s in program position" % last_part(word))
    if POWERSHELL.search(text):
        found.append("the credential store's type %s as PowerShell writes it" % ("PasswordVault" if re.search("PasswordVault", text, re.I) else "CredRead"))
    if VAULT_CMDLETS.search(text):
        found.append("the credential store's command %s" % VAULT_CMDLETS.search(text).group(0))
    if PYTHON_KEYRING.search(text):
        found.append("the credential tool %s in Python" % ("secretstorage" if re.search(r"secretstorage", text) else "keyring"))
    for label, rx in FOLDERS:
        if rx.search(text):
            found.append(label)
    if SERVICE.search(text) and TOOL_WORDS.search(text):
        found.append("the service devyonq-mc beside the credential tool %s" % TOOL_WORDS.search(text).group(1))
    m = LITERALS.search(text)
    if m:
        found.append("the command mc17 %s, which runs only in a terminal of your own" % m.group(1))
    for label, rx in ENVIRONMENT:
        if rx.search(text):
            found.append("the form %s, which changes the environment the mc17 launcher reads" % label)
    return found


def script_paths(text, cwd):
    """The files a command runs: the script after an interpreter's options, a sourced file, and a program given by a
    path, each that stands as a file, resolved against `cwd`."""
    out = []
    for word, rest in program_words(text):
        name = last_part(word)
        cands = []
        if name in INTERPRETERS:
            j = 0
            while j < len(rest):
                r = rest[j]
                if r in ("-c", "-e", "--eval", "-Command", "-command", "-EncodedCommand"):
                    break
                if r in ("-m",):
                    break
                if r.lower() in ("-file", "-f") and j + 1 < len(rest):
                    cands.append(rest[j + 1])
                    break
                if r.startswith("-"):
                    j += 1
                    continue
                cands.append(r)
                break
        elif name in SOURCING and rest:
            cands.append(rest[0])
        elif re.search(r"[/\\]", word):
            cands.append(word)
        for c in cands:
            p = os.path.expanduser(c.strip("'\""))
            if not os.path.isabs(p):
                p = os.path.join(cwd or os.getcwd(), p)
            if os.path.isfile(p):
                out.append(p)
    return out


def read_script(p):
    try:
        if os.path.getsize(p) > SCRIPT_CAP:
            return None
        with open(p, encoding="utf-8", errors="replace") as fh:
            return fh.read()
    except Exception:
        return None


PATCH_FILE = re.compile(r"^\*\*\* (?:Add|Update|Delete) File: (.+)$|^\*\*\* Move to: (.+)$", re.M)


def paths_of(value, key=""):
    """The paths a file tool's input names: every string under a key that names a path (path, file_path, filePath,
    notebook_path, paths and the like), and each file a patch's header lines name, depth first."""
    if isinstance(value, str):
        if re.search(r"path|file|dir|folder", key, re.I) and not re.search(r"content|text|body|old|new", key, re.I):
            yield value
        for m in PATCH_FILE.finditer(value):
            yield m.group(1) or m.group(2)
    elif isinstance(value, dict):
        for k, v in value.items():
            yield from paths_of(v, str(k))
    elif isinstance(value, list):
        for v in value:
            yield from paths_of(v, key)


def env_value(name, kept):
    """The value of the variable `name` for a path: the environment's, or for USERPROFILE and HOME the home folder where
    the environment holds none, as on Linux and macOS, where a Windows form such as %USERPROFILE% or $env:USERPROFILE
    still names the home folder to the gate; `kept` for any other variable the environment does not hold."""
    v = os.environ.get(name)
    if v is None and name.upper() in ("USERPROFILE", "HOME"):
        v = os.path.expanduser("~")
    return kept if v is None else v


def expanded(word, cwd):
    """The absolute path `word` names: the plugin's root variables, $env:NAME, %NAME%, ~ and the variables of the
    environment read, relative to `cwd`. On Linux and macOS a backslash reads as a slash too, so a path written in the
    form of Windows names the same folder there. None for an empty word."""
    w = word.strip("'\"")
    if not w:
        return None
    w = ROOT_VARIABLES.sub(lambda m: PLUGIN_ROOT, w)
    w = re.sub(r"\$env:([A-Za-z_][A-Za-z0-9_]*)", lambda m: env_value(m.group(1), m.group(0)), w, flags=re.I)
    w = re.sub(r"%([A-Za-z_][A-Za-z0-9_]*)%", lambda m: env_value(m.group(1), m.group(0)), w)
    w = os.path.expandvars(os.path.expanduser(w))
    if os.sep == "/":
        w = w.replace("\\", "/")
    if not os.path.isabs(w):
        w = os.path.join(cwd or os.getcwd(), w)
    return w


def real_of(p):
    try:
        return os.path.realpath(p)
    except Exception:
        return os.path.abspath(p)


def inside(real, folder):
    """Whether the real path `real` is the folder `folder`, read by its real form, or stands under it."""
    f = os.path.normcase(real_of(folder)).rstrip("\\/")
    r = os.path.normcase(real)
    return r == f or r.startswith(f + os.sep)


def guarded_folders():
    """The folders no AI tool writes in, by their real form: the plugin's own, and the folder of the client's node."""
    out = list(GUARDED)
    out.extend(n for n in node_folders() if n not in out)
    return out


def guarded_path(word, cwd, folders=None, copies=True):
    """The file of the plugin, or of the folder of the client's node, that `word` names, by its real form, or None: the
    word read by expanded(), relative to `cwd`. Where `copies` holds, a path in a copy of this plugin counts too: a folder
    that holds a FILES.lock byte for byte equal to the plugin's own (copy_root), since the gate runs that copy's files as
    its own (plugin_file) and keeps them as it keeps its own."""
    w = expanded(word, cwd)
    if w is None:
        return None
    folders = guarded_folders() if folders is None else folders
    if GLOB.search(w):
        # A glob that could match a file of a guarded folder counts as naming it (N6).
        pat = resolved_glob(w)
        for folder in folders:
            if could_match(parts_of(pat), parts_of(real_of(folder)), False):
                return pat
        if copies and copy_root(glob_head(pat)):
            return pat
    real = real_of(w)
    for folder in folders:
        if inside(real, folder):
            return real
    if copies and copy_root(real):
        return real
    return None


def plugin_file(word, cwd):
    """The file of the plugin itself that `word` names, by its real form, or None: a file of the plugin this gate stands
    in, or a file of a verified copy of it (copy_file)."""
    return guarded_path(word, cwd, GUARDED, copies=False) or copy_file(word, cwd)


# --- a copy of this plugin (two installs of one release in GitHub Copilot in VS Code) ------------------------------------
# The Copilot CLI installs the plugin in ~/.copilot/installed-plugins/devyonq-mc/devyonq-mc, and VS Code copies that
# folder into its own agentPlugins folder and runs the hooks of both. Each gate ran its own launcher and read the other's,
# which names ~/.mc17/client, so each refused the other's and every mc17 call stood refused. A file outside the plugin's
# own folder runs as the plugin's own only where its content proves it one: it stands, by its real form and named by no
# link of its own, in a folder R that holds a FILES.lock byte for byte equal to the plugin's own, its path relative to R
# is a line of that lock, and every file the lock names stands in R, by its real form inside R, with the sha256 its line
# gives. A folder's name or place proves nothing. Every read that fails refuses: the file is then read as any other
# script. The same folder R is kept from a write as the plugin's own folder is, so a copy the gate runs stays as the gate
# verified it.
LOCK_NAME = "FILES.lock"
LOCK_LINE = re.compile(r"^([0-9a-f]{64}) ([0-7]{6}) ([^\n\\]+)$")
LOCK_CAP = 1024 * 1024
COPY_CAP = 64 * 1024 * 1024
# The folders walked up from a path to find R: a lock names files at most four parts deep.
COPY_DEPTH = 8
OWN_LOCK = None
COPY_LOCKS = {}
COPY_VERIFIED = {}


def read_capped(p, cap):
    """The bytes of the file `p`, refused (an exception) over `cap` bytes."""
    with open(p, "rb") as fh:
        data = fh.read(cap + 1)
    if len(data) > cap:
        raise ValueError("%s holds over %d bytes" % (p, cap))
    return data


def own_lock():
    """The plugin's own FILES.lock as (bytes, {path: sha256}), or None where it does not stand or a line does not read as
    `<sha256> <mode> <path>`, with LF, a path of plain parts, each named once."""
    global OWN_LOCK
    if OWN_LOCK is None:
        OWN_LOCK = False
        try:
            data = read_capped(os.path.join(PLUGIN_ROOT, LOCK_NAME), LOCK_CAP)
            text = data.decode("utf-8")
            if not text.endswith("\n"):
                raise ValueError("no closing LF")
            entries = {}
            for line in text[:-1].split("\n"):
                m = LOCK_LINE.match(line)
                if not m:
                    raise ValueError("a line that does not read")
                rel = m.group(3)
                if rel in entries or rel == LOCK_NAME or any(x in ("", ".", "..") for x in rel.split("/")):
                    raise ValueError("a path that does not read")
                entries[rel] = m.group(1)
            if entries:
                OWN_LOCK = (data, entries)
        except Exception:
            OWN_LOCK = False
    return OWN_LOCK or None


def copy_root(real):
    """The folder R at or above the real path `real`, COPY_DEPTH folders up at most, whose FILES.lock is byte for byte
    the plugin's own, or None. The first FILES.lock found on the way up decides: another one is no copy."""
    lock = own_lock()
    if lock is None or not real:
        return None
    d = real
    for _ in range(COPY_DEPTH + 1):
        cand = os.path.join(d, LOCK_NAME)
        if d in COPY_LOCKS:
            same = COPY_LOCKS[d]
        elif os.path.lexists(cand):
            try:
                same = os.path.isfile(cand) and read_capped(cand, LOCK_CAP) == lock[0]
            except Exception:
                same = False
            COPY_LOCKS[d] = same
        else:
            same = None
        if same is not None:
            return d if same else None
        up = os.path.dirname(d)
        if up == d:
            return None
        d = up
    return None


def copy_verified(root, lock):
    """Whether every file the plugin's lock names stands in the folder `root`, by its real form inside it, with the sha256
    its line gives; COPY_CAP bytes read at most. Any read that fails answers no."""
    if root in COPY_VERIFIED:
        return COPY_VERIFIED[root]
    import hashlib
    ok = False
    try:
        total = 0
        for rel, want in lock[1].items():
            p = os.path.join(root, *rel.split("/"))
            if not os.path.isfile(p) or not inside(real_of(p), root):
                raise ValueError("%s does not stand in %s" % (rel, root))
            h = hashlib.sha256()
            with open(p, "rb") as fh:
                while True:
                    chunk = fh.read(1024 * 1024)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > COPY_CAP:
                        raise ValueError("over %d bytes" % COPY_CAP)
                    h.update(chunk)
            if h.hexdigest() != want:
                raise ValueError("%s changed" % rel)
        ok = True
    except Exception:
        ok = False
    COPY_VERIFIED[root] = ok
    return ok


def copy_file(word, cwd):
    """The file of a verified copy of the plugin that `word` names, by its real form, or None: the word names no link
    itself, since a program's own folder is the one it is named in (the launcher runs $here/mc17.js); its real form
    stands in a folder R of copy_root; its path relative to R, letter for letter, is a line of the plugin's lock; and the
    whole of R verifies (copy_verified). A word that holds a glob names no such file."""
    try:
        lock = own_lock()
        w = expanded(word, cwd)
        if lock is None or w is None or GLOB.search(w) or os.path.islink(w):
            return None
        real = real_of(w)
        root = copy_root(os.path.dirname(real))
        if root is None or not inside(real, root):
            return None
        rel = os.path.relpath(real, root).replace(os.sep, "/")
        if rel not in lock[1] or not copy_verified(root, lock):
            return None
        return real
    except Exception:
        return None


def glob_head(pat):
    """The part of the glob `pat` before its first part that holds a glob, as resolved_glob wrote it."""
    parts = re.split(r"[\\/]+", pat)
    i = next((n for n, x in enumerate(parts) if GLOB.search(x)), len(parts))
    head = os.sep.join(parts[:i]) or os.sep
    if re.match(r"^[A-Za-z]:$", head):
        head += os.sep
    return head


# --- the real form of a path ----------------------------------------------------------------------------------------------
# A text rule reads the words a call writes; a path reaches a folder by what it resolves to. Each word of a shell call and
# each path of a file tool is read with ~, $HOME, %USERPROFILE%, $env:USERPROFILE and the plugin's root variables
# expanded, relative to the call's folder, and judged by its real form, which resolves links, junctions and the short
# names of Windows. A word that holds a glob is judged by every path it could match: its part before the first glob is
# resolved, and the rest is matched part by part against each kept folder.
GLOB = re.compile(r"[*?\[]")
WORD_CAP = 4000


def kept_folders():
    """The folders no call reaches, by label and path: the client's folder and the folder of the key, in each home of
    homes()."""
    return tuple(x for h in homes() for x in (
        ("the client's folder ~/.mc17/client", os.path.join(h, ".mc17", "client")),
        ("the folder of the judgment module's key ~/.canonq/mc17-converge", os.path.join(h, ".canonq", "mc17-converge"))))


def kept_parents():
    """The folders whose whole tree holds a kept folder: a call that names one of them itself reaches the folder in it."""
    return tuple(x for h in homes() for x in (
        ("the folder ~/.mc17, which holds the client's folder ~/.mc17/client", os.path.join(h, ".mc17")),
        ("the folder ~/.canonq, which holds the folder of the judgment module's key", os.path.join(h, ".canonq"))))


def parts_of(p):
    """The parts of the absolute path `p`, its drive first, folded to lower case on Windows and macOS."""
    p = os.path.normpath(p)
    if CASE:
        p = p.lower()
    drive, rest = os.path.splitdrive(p)
    return [drive] + [x for x in re.split(r"[\\/]+", rest) if x]


def could_match(pattern_parts, folder_parts, exact):
    """Whether the glob of `pattern_parts` could name the folder of `folder_parts` (exact) or a path in it."""
    import fnmatch
    for i, f in enumerate(folder_parts):
        if i >= len(pattern_parts):
            return False
        q = pattern_parts[i]
        if q == "**":
            return True
        if not fnmatch.fnmatchcase(f, q):
            return False
    return len(pattern_parts) == len(folder_parts) if exact else True


def resolved_glob(w):
    """The glob `w` with its part before the first glob resolved to its real form."""
    parts = re.split(r"[\\/]+", w)
    i = next((n for n, x in enumerate(parts) if GLOB.search(x)), len(parts))
    head = os.sep.join(parts[:i]) or os.sep
    if re.match(r"^[A-Za-z]:$", head):
        head += os.sep
    return os.path.join(real_of(head), *parts[i:])


def reached(word, cwd, folders=None, parents=None):
    """The label of the kept folder `word` reaches by its real form, or None: a word whose real form stands in a kept
    folder, or names a kept parent itself, and a glob that could match either."""
    folders = kept_folders() if folders is None else folders
    parents = kept_parents() if parents is None else parents
    w = expanded(word, cwd)
    if w is None:
        return None
    if GLOB.search(w):
        pat = resolved_glob(w)
        pp = parts_of(pat)
        for label, f in folders:
            if could_match(pp, parts_of(real_of(f)), False):
                return label
        for label, f in parents:
            if could_match(pp, parts_of(real_of(f)), True):
                return label
        try:
            import glob, itertools
            for m in itertools.islice(glob.iglob(pat, include_hidden=True), 256):
                hit = reached(m, cwd, folders, parents) if not GLOB.search(m) else None
                if hit:
                    return hit
        except Exception:
            pass
        return None
    real = real_of(w)
    for label, f in folders:
        if inside(real, f):
            return label
    for label, f in parents:
        if os.path.normcase(real) == os.path.normcase(real_of(f)):
            return label
    return None


def call_words(command):
    """Every word of a shell `command` that could name a path: each word of each part, a redirection's target, the value
    after = of a word, and the value of a PowerShell -Name:value, with the plugin's root variables and ${NAME} read first,
    since the parts are split at braces. At most WORD_CAP words."""
    command = ROOT_VARIABLES.sub(lambda m: PLUGIN_ROOT, command)
    command = re.sub(r"\$\{([A-Za-z_][A-Za-z0-9_]*)\}", lambda m: os.environ.get(m.group(1), m.group(0)), command)
    out = []
    for part in SEPARATORS.split(command):
        for w in words_of(part):
            w = re.sub(r"^\d*[<>]+[&|]?", "", w)
            if w:
                out.append(w)
            if "=" in w:
                out.append(w.split("=", 1)[1])
            m = re.match(r"^-\w+:(.+)$", w)
            if m:
                out.append(m.group(1))
            if len(out) >= WORD_CAP:
                return out
    return out


def makes_link(command):
    """Whether a shell `command` makes a link: ln, mklink (also through cmd), New-Item of a link type, fsutil hardlink."""
    for word, rest in program_words(command):
        n = last_part(word)
        low = [r.strip("'\"").lower() for r in rest]
        if n in ("ln", "mklink", "linkd", "junction"):
            return True
        if n in ("new-item", "ni") and any(r in ("symboliclink", "junction", "hardlink") for r in low):
            return True
        if n == "fsutil" and "hardlink" in low:
            return True
        if n == "cmd" and "mklink" in low:
            return True
    return bool(re.search(r"(?i)-ItemType\s*:?\s*['\"]?(SymbolicLink|Junction|HardLink)\b|\bmklink\b|os\.symlink|fs\.symlink", command))


def judge_paths(command, cwd):
    """Refuses a shell `command` whose words reach a kept folder by their real form, or that makes a link into or out of
    ~/.mc17 (N6)."""
    words = call_words(command)
    # In a call that runs code its words carry, a comment mark or a regular expression's literal is no path.
    inline = EVAL_CALL.search(command) is not None
    for w in words:
        if inline and script_mark(w):
            continue
        label = reached(w, cwd)
        if label:
            deny("This command names %s, which reaches %s by its real form, which the mc17 client keeps from every AI tool.\n\nCommand: %s\n\n%s" % (w[:200], label, command.strip()[:400], remedy()))
    if makes_link(command):
        mcs = [os.path.join(h, ".mc17") for h in homes()]
        for w in words:
            p = expanded(w, cwd)
            if p is None:
                continue
            if any(inside(real_of(p), mc) or inside(os.path.abspath(p), mc) or (GLOB.search(p) and could_match(parts_of(resolved_glob(p)), parts_of(real_of(mc)), False)) for mc in mcs):
                deny("This command makes a link, and names %s in the folder ~/.mc17: no AI tool makes a link into or out of the client's folders, since a link carries a read or a write past the folder's name.\n\nCommand: %s\n\n%s" % (w[:200], command.strip()[:400], remedy()))


# --- what a shell call does to the plugin's files ---------------------------------------------------------------------------
# A list of writers cannot name every program that writes: node -e, python -c, git checkout, perl -pi and curl -o each
# rewrote hooks/lint-secret.py past it. So the rule reads the other way round: a shell call that names a file of the
# plugin, or of the folder of the client's node, does so through a reader of READERS, or it is refused.
TOKEN_CAP = 2000
EVAL_OPTION = re.compile(r"^--?(?:eval|print|command|encodedcommand|ec|c|e|p|input-type)(?:=|$)", re.I)
POWERSHELL_VALUED = ("-executionpolicy", "-ep", "-workingdirectory", "-wd", "-configurationname", "-outputformat", "-of",
                     "-inputformat", "-if", "-settingsfile", "-windowstyle", "-w")


def shell_parts(command):
    """The parts of a shell `command`, split at |, ||, &&, ;, &, a line end, $(, a backtick, a parenthesis or a brace that
    stands outside quotes, so a script's text inside quotes stays one word of its part."""
    parts, cur, quote, i, n = [], [], None, 0, len(command)
    while i < n:
        c = command[i]
        if quote:
            cur.append(c)
            if c == quote:
                quote = None
            elif c == "\\" and quote == '"' and i + 1 < n:
                cur.append(command[i + 1])
                i += 1
            i += 1
            continue
        if c in "'\"":
            quote = c
            cur.append(c)
        elif c == "\\" and i + 1 < n:
            cur.append(c)
            cur.append(command[i + 1])
            i += 1
        elif command[i:i + 2] in ("||", "&&", "$("):
            parts.append("".join(cur))
            cur = []
            i += 1
        elif c in "|;&\n`(){}":
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(c)
        i += 1
    parts.append("".join(cur))
    return [p for p in parts if p.strip()]


def program_index(words):
    """The index of the word in program position among `words`, past assignments and the wrappers, or None."""
    i = 0
    while i < len(words):
        w = words[i]
        if re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", w):
            i += 1
            continue
        # A PowerShell assignment, `$t = Get-Content x` or `$t=Get-Content x`: the program follows it.
        if re.match(r"^\$[A-Za-z_][A-Za-z0-9_:]*$", w) and i + 1 < len(words) and words[i + 1] == "=":
            i += 2
            continue
        if re.match(r"^\$[A-Za-z_][A-Za-z0-9_:]*=$", w):
            i += 1
            continue
        if last_part(w) in WRAPPERS:
            i += 1
            while i < len(words) and (words[i].startswith("-") or re.match(r"^[A-Za-z_][A-Za-z0-9_]*=", words[i]) or re.match(r"^\d+[smhd]?$", words[i])):
                i += 1
            continue
        return i
    return None


def script_index(name, rest):
    """The index in `rest` of the file an interpreter `name` runs as its script, or None where an option evaluates code
    the words carry (-e, -c, -p, --eval, -Command and their kin), names a module (-m), or no file stands."""
    j = 0
    powershell = name in ("pwsh", "powershell")
    while j < len(rest):
        r = rest[j]
        low = r.lower()
        if powershell and low in ("-file", "-f"):
            return j + 1 if j + 1 < len(rest) else None
        if r == "-m" or low.startswith("--module") or EVAL_OPTION.match(r):
            return None
        if powershell and low in POWERSHELL_VALUED:
            j += 2
            continue
        if not powershell and re.match(r"^-[A-Za-z]{2,}$", r) and re.search(r"[ceEp]", r[1:]):
            return None
        if r == "-" or not r.startswith("-"):
            return None if r == "-" else j
        j += 1
    return None


def whole_forms(word):
    """The forms of `word` that name a path as a whole: the word, its value after =, a PowerShell -Name:value, an option's
    value written onto it (-o/path), and its pieces apart by commas."""
    out = [word]
    if "=" in word:
        out.append(word.split("=", 1)[1])
    m = re.match(r"^-\w+:(.+)$", word)
    if m:
        out.append(m.group(1))
    m = re.match(r"^-[A-Za-z]{1,3}(.+)$", word)
    if m and re.search(r"[/\\~]", m.group(1)):
        out.append(m.group(1))
    if "," in word:
        out.extend(x for x in word.split(",") if x)
    return out


LAUNCHERS = ("mc17", "mc17.cmd")
# The pieces of a script's text that only look like a path: the marks that open and close a comment, and a regular
# expression's literal that opens with /^. The gate read `/**` as every file of the drive, and `/^\*\*` likewise.
SCRIPT_MARKS = ("/*", "/**", "*/", "**/")
# A call that runs code its words carry: node -e, python -c, pwsh -Command and their kin.
EVAL_CALL = re.compile(r"(?:^|[\s;|&(])(?:node|deno|bun|python3?|py|ruby|perl)(?:\.exe)?\s+(?:-\S+\s+)*?(?:-e|-p|-c|--eval|--print)(?:\s|=|$)"
                       r"|(?:^|[\s;|&(])(?:pwsh|powershell)(?:\.exe)?\s+(?:-\S+\s+)*?-(?:c|command|encodedcommand|ec)(?:\s|$)", re.I)


def script_mark(piece):
    """Whether a piece of a script's text is a comment mark or a regular expression's literal, which names no path."""
    p = piece.strip("'\"`")
    return p in SCRIPT_MARKS or p.startswith("/^")


def script_piece_names_nothing(piece, cwd):
    """Whether a piece of a script's text, read as a path, names no file a call could change: a comment mark or a regular
    expression's literal (script_mark), and the plugin's own launcher, which a script runs as any other call runs it. A
    path to any other file of the plugin, a glob among them, is still judged."""
    if script_mark(piece):
        return True
    w = expanded(piece, cwd)
    if w is None:
        return True
    if GLOB.search(w):
        return False
    real = real_of(w)
    return os.path.basename(real).lower() in LAUNCHERS and os.path.normcase(os.path.dirname(real)) == os.path.normcase(os.path.join(real_of(PLUGIN_ROOT), "client"))


def embedded_forms(word, every):
    """The paths inside `word`, such as the paths a script's text names: its pieces apart by quotes, brackets, commas,
    spaces and the like. Where `every` is false, only the pieces that read as a path (a slash, a backslash, or ~, $ or %
    first) count. A piece that is one of the word's whole forms (whole_forms), such as the value after =, is judged there."""
    out = []
    whole = set(whole_forms(word))
    for t in re.split(r"[\s'\"`(),;{}<>|&+=\[\]]+", word):
        if t and t not in whole and (every or re.search(r"[/\\]", t) or t[:1] in "~$%"):
            out.append(t)
    return out


def holds_guarded(word, cwd, folders):
    """The guarded folder the path `word` holds, by their real forms, or None: a folder above a file of the plugin."""
    w = expanded(word, cwd)
    if w is None or GLOB.search(w):
        return None
    real = real_of(w)
    for f in folders:
        if inside(real_of(f), real):
            return f
    return None


def git_top(folder):
    """The top of the git work tree `folder` stands in, by its real form, or None."""
    d = real_of(folder)
    while True:
        if os.path.exists(os.path.join(d, ".git")):
            return d
        up = os.path.dirname(d)
        if up == d:
            return None
        d = up


def tracks(top, folder):
    """Whether the work tree at `top` tracks a file under `folder`; True where git cannot say, so the call is refused."""
    import shutil, subprocess
    git = shutil.which("git")
    if not git:
        return True
    try:
        rel = os.path.relpath(real_of(folder), top)
        r = subprocess.run([git, "-C", top, "ls-files", "-z", "--", rel], capture_output=True, timeout=10)
        return r.returncode != 0 or bool(r.stdout)
    except Exception:
        return True


def git_refusal(words, cwd, folders):
    """Why the git command of `words` (git first) changes the plugin's files, or None: a write of GIT_WRITES whose work
    tree tracks a guarded folder, with no path named or a path named that holds or stands in a guarded folder. A git
    command run in a guarded folder, or naming a file of one, is judged as any other call."""
    i, wd = 1, cwd
    while i < len(words) and words[i].startswith("-"):
        w = words[i]
        if w in ("-C", "-c", "--git-dir", "--work-tree", "--namespace") and i + 1 < len(words):
            if w == "-C":
                wd = expanded(words[i + 1], wd) or wd
            if w == "--work-tree":
                wd = expanded(words[i + 1], cwd) or wd
            i += 2
            continue
        if w.startswith("--work-tree="):
            wd = expanded(w.split("=", 1)[1], cwd) or wd
        i += 1
    if i >= len(words) or words[i] not in GIT_WRITES:
        return None
    sub = words[i]
    top = git_top(wd or cwd or os.getcwd())
    if not top:
        return None
    held = [f for f in folders if inside(real_of(f), top) and (sub == "clean" or tracks(top, f))]
    if not held:
        return None
    rest = words[i + 1:]
    if sub in ("apply", "am"):
        return "git %s writes what its patch names in the work tree %s, which tracks %s" % (sub, top, held[0])
    if "--" in rest:
        named = rest[rest.index("--") + 1:]
    else:
        named = [r for r in rest if not r.startswith("-") and os.path.lexists(expanded(r, wd) or "")]
    if not named:
        return "git %s changes the whole work tree %s, which tracks %s" % (sub, top, held[0])
    for r in named:
        if holds_guarded(r, wd, folders) or guarded_path(r, wd, folders):
            return "git %s names %s, which holds or stands in %s" % (sub, r, held[0])
    return None


def reader_refusal(name, words):
    """Why the reader `name` with its `words` is no read, or None: sed without -n or with -i or -f, rg --pre, less -o or
    --log-file, and git other than show, diff and log or with --output."""
    if name == "sed":
        short = [w[1:] for w in words if re.match(r"^-[A-Za-z]+$", w)]
        quiet = any("n" in s for s in short) or any(w in ("--quiet", "--silent") for w in words)
        if not quiet or any(("i" in s or "f" in s) for s in short) or any(w.startswith(("--in-place", "--file")) for w in words):
            return "sed that is no sed -n, or that writes in place or reads a script file"
    if name == "rg" and any(w.startswith("--pre") and not w.startswith("--pre-glob") for w in words):
        return "rg --pre, which runs a program"
    if name == "less" and any(w.startswith(("-o", "-O", "--log-file", "--LOG-FILE")) for w in words):
        return "less with a log file, which it writes"
    if name == "git":
        sub = next((w for w in words if not w.startswith("-")), None)
        if sub not in GIT_READS:
            return "git %s, which is none of git show, diff and log" % (sub or "")
        if any(w.startswith("--output") for w in words):
            return "git %s --output, which writes a file" % sub
    return None


def guarded_reach(command, cwd):
    """Why the shell `command` reaches a file of the plugin or of the folder of the client's node other than by a read, as
    (path, words), or None. Each part is judged on its own, in the folder the parts before it changed to: a redirection to
    such a file; a part whose program is no reader of READERS and that names such a file by its real form, as a word,
    inside a word, or as its folder; a reader that names one inside a word, or in a form that writes; a remover on a folder
    that holds one; and a git write that touches them. The program a part runs, and an interpreter's script, are no write
    of it."""
    command = ROOT_VARIABLES.sub(lambda m: PLUGIN_ROOT, command)
    folders = guarded_folders()
    for part in SEPARATORS.split(command):
        for m in re.finditer(r"(?:^|[^<>&|])\d*>>?\|?\s*(\"[^\"]*\"|'[^']*'|[^\s;&|()<>]+)", part):
            hit = guarded_path(m.group(1), cwd)
            if hit:
                return hit, "a redirection writes it"
    here = cwd
    budget = [TOKEN_CAP]

    def hit_of(form):
        if budget[0] <= 0 and not (re.search(r"[/\\]", form) or form[:1] in "~$%"):
            return None
        budget[0] -= 1
        return guarded_path(form, here, folders)

    for part in shell_parts(command):
        for m in re.finditer(r"(?:^|[^<>&|])\d*>>?\|?\s*(\"[^\"]*\"|'[^']*'|[^\s;&|()<>]+)", part):
            hit = guarded_path(m.group(1), here, folders)
            if hit:
                return hit, "a redirection writes it"
        words = [re.sub(r"^\d*[<>]+[&|]?", "", w) for w in words_of(part)]
        words = [w for w in words if w]
        p = program_index(words)
        if p is None:
            continue
        prog, rest = words[p], words[p + 1:]
        name = last_part(prog)
        inside_guarded = any(inside(real_of(here or os.getcwd()), f) for f in folders)
        skip = set()
        if name in INTERPRETERS:
            s = script_index(name, rest)
            if s is not None:
                skip.add(s)
        if name == "cmd":
            k = next((j for j, r in enumerate(rest) if r.lower() in ("/c", "/k")), None)
            if k is not None and k + 1 < len(rest) and plugin_file(rest[k + 1], here):
                skip.add(k + 1)
        reader = name in READERS and reader_refusal(name, rest) is None
        if name == "git":
            why = git_refusal(words[p:], here, folders)
            if why:
                return (here or os.getcwd()), why
        for j, w in enumerate(rest):
            if j in skip:
                continue
            for form in whole_forms(w):
                hit = hit_of(form)
                if hit and not reader:
                    return hit, "%s names it, and %s is no reader of the short list" % (w[:200], name)
                if name in REMOVERS or (name == "find" and any(r in ("-delete", "-exec", "-execdir", "-ok") for r in rest)):
                    held = holds_guarded(form, here, folders)
                    if held:
                        return held, "%s %s removes or moves the folder that holds it" % (name, w[:200])
            for form in embedded_forms(w, not reader or inside_guarded):
                if script_piece_names_nothing(form, here):
                    continue
                hit = hit_of(form)
                if hit:
                    return hit, "%s names it inside the word %s" % (name, w[:200])
        if name in CHANGE_DIR and rest:
            here = expanded(rest[-1], here) or here
    return None


def judge_command(command, cwd):
    """Refuses `command` where it, or a script it runs to SCRIPT_DEPTH, names a counted form."""
    reach = guarded_reach(command, cwd)
    if reach:
        deny("This command reaches %s, a file of the plugin's own code or of the folder of the node the client runs on, which run on every call of the AI tool and which no AI tool changes: %s. A shell call names those files through a reader alone (cat, head, tail, less, grep, rg, sed -n, wc, ls, Get-Content, git show, diff or log), naming each as a whole word.\n\nCommand: %s\n\n%s" % (reach[0], reach[1], command.strip()[:400], remedy()))
    here = real_of(cwd or os.getcwd())
    for label, folder in kept_folders():
        if inside(here, folder):
            deny("This command runs in %s, which the mc17 client keeps from every AI tool.\n\n%s" % (label, remedy()))
    found = named_in(command)
    if found:
        deny("This command names %s, which the mc17 client keeps from every AI tool.\n\nCommand: %s\n\n%s" % (found[0], command.strip()[:400], remedy()))
    judge_paths(command, cwd)
    seen = set()
    todo = [(p, 1) for p in script_paths(command, cwd)]
    while todo:
        p, depth = todo.pop(0)
        if p in seen:
            continue
        seen.add(p)
        # The plugin's own files run as the plugin wrote them, since no AI tool writes them (guarded_reach and the file
        # tools' guard): the launchers name ~/.mc17/client, where the record of node stands, and run as they are.
        if plugin_file(p, cwd):
            continue
        text = read_script(p)
        if text is None:
            continue
        found = named_in(text)
        if found:
            deny("This command runs the script %s, which names %s, which the mc17 client keeps from every AI tool.\n\n%s" % (p, found[0], remedy()))
        if depth < SCRIPT_DEPTH:
            for line in text.splitlines():
                for q in script_paths(line, os.path.dirname(p)):
                    todo.append((q, depth + 1))


def remedy():
    return ("The credential store, the client's own folders and its sign-in belong to you, in a terminal of your own: run mc17 login or "
            "mc17 trust there yourself. Every other act of the harness goes through mc17 <command>, which never shows a key.")


def main():
    global TOOL
    try:
        data = json.load(sys.stdin)
    except Exception:
        deny("the secret gate could not read the call it was handed, so it refuses it")
    if not isinstance(data, dict):
        deny("the secret gate was handed no call it can read, so it refuses it")
    TOOL = data.get("tool_name") if isinstance(data.get("tool_name"), str) else None
    ti = data.get("tool_input") if isinstance(data.get("tool_input"), dict) else {}
    cwd = data.get("cwd") if isinstance(data.get("cwd"), str) else None
    try:
        # A shell call: any tool whose input carries a command (Bash, PowerShell, Monitor and the like).
        cmd = ti.get("command") if isinstance(ti.get("command"), str) else (ti.get("cmd") if isinstance(ti.get("cmd"), str) else None)
        if TOOL in ("Bash", "PowerShell") or cmd is not None:
            if isinstance(cmd, str):
                judge_command(cmd, cwd)
            sys.exit(0)
        for text in paths_of(ti):
            found = [label for label, rx in FOLDERS if rx.search(text)]
            if found:
                deny("This %s call names %s in the path %s, which the mc17 client keeps from every AI tool.\n\n%s" % (TOOL or "tool", found[0], text[:300], remedy()))
            label = reached(text, cwd)
            if label:
                deny("This %s call names the path %s, which reaches %s by its real form, which the mc17 client keeps from every AI tool.\n\n%s" % (TOOL or "tool", text[:300], label, remedy()))
            if TOOL not in READ_TOOLS:
                hit = guarded_path(text, cwd)
                if hit:
                    deny("This %s call writes %s, a file of the plugin's own code or of the folder of the node the client runs on, which run on every call of the AI tool and which no AI tool changes.\n\n%s" % (TOOL or "tool", hit, remedy()))
    except SystemExit:
        raise
    except Exception as e:
        deny("the secret gate failed on this call (%s: %s), so it refuses it" % (type(e).__name__, str(e)[:160]))
    sys.exit(0)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Refuses Agent and Bash calls that would put wave work on a locked branch outside the sanctioned runner.

A Claude Code PreToolUse hook. It reads one tool call as JSON on stdin and prints its verdict as JSON on stdout.

A branch is locked where .mc17/wave.json stands on it and the branch either is the branch the lock names or opens
mission/. The same rule holds in the git hooks the plugin installs.

On an Agent call it reads the prompt. A prompt that names a locked branch, by a name the repository lists or by the
mission/* pattern, or an absolute path to a worktree checked out on a locked branch, is refused unless it carries a
wave token line
  WAVE TOKEN: MC17_WAVE_TOKEN=<64 hex> (export it before every git commit)
whose token hashes to the lock's tokenHash. The token proves where the prompt came from; its wording is unread. A
listed name with no slash counts only where the prompt marks it as a branch, so an everyday word that is also a
branch's name names no branch.

On a Bash call it reads the command as shell words. In each simple command it finds the word git and the subcommand
after git's own options, and acts where that subcommand is commit, merge or push, in the directory that command runs
in, followed through cd, pushd and popd; a merge that only ends a merge in progress is no act. A word after git's
options that is no git command sends the reader to the command's words for the act. A word in quotes that holds a space
is read again as a command line of its own. Where the reader cannot follow the directory an act runs in, it reads
every absolute path of the whole call. An act aimed at a worktree checked out on a locked branch is refused unless the
command carries such a token or MC17_WAVE_OVERRIDE.

A repository without a lock passes, and so does every other tool. Both readers are textual: a prompt that
describes the branch without naming it, or a command that reaches git through a script or an alias, passes
unread; the git hooks on the branch itself still refuse the commit. On an error of its own the hook
allows the call and writes a line to the journal file saying so.
"""
import hashlib, json, os, re, shlex, subprocess, sys

PLUGIN = "devyonq-mc"
LOCK_IN_TREE = ".mc17/wave.json"     # forward slashes: this is the form `git show <ref>:<path>` takes
GIT_TIMEOUT = 8                      # seconds per git call; a hung git is a broken gate, and fails open

JOURNAL = os.environ.get("MC17_GATE_JOURNAL") or os.path.expanduser("~/.mc17/gate-journal.log")

# The name of the tool being judged, set once in main() so a refusal or an allow note can name it.
TOOL = None

def journal(line):
    """Appends `line` to the journal file behind a UTC timestamp and this file's path; creates the directory.

    Every error is swallowed, so a journal that cannot be written never stops the gate."""
    try:
        import datetime
        os.makedirs(os.path.dirname(JOURNAL), exist_ok=True)
        with open(JOURNAL, "a", encoding="utf-8") as fh:
            fh.write(datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                     + " [" + os.path.abspath(__file__) + "] " + line + "\n")
    except Exception:
        pass

def channel_copy(tag, message, refused=True):
    """`message` under a first line naming the channel `tag`, the tool and whether the call was refused.

    Each channel (reason, context, system message) gets its own tagged copy, so a reader who sees only one
    can tell which channel delivered it.
    """
    head = ("the branch gate refused this %s call, and nothing reached the branch."
            if refused else "the branch gate let this %s call through unread.") % (TOOL or "tool")
    return "[%s %s] %s\n\n%s" % (PLUGIN, tag, head, message)

def allow(note=None):
    """Prints an allow verdict and exits 0.

    With `note`, the note is journaled and printed on stdout (systemMessage and additionalContext) and on
    stderr, saying the call passed unread. The output carries no permission decision, so the call still takes
    whatever approval it would take with no hook installed.
    """
    if note:
        line = ("[%s] the branch gate allowed this %s call WITHOUT READING IT: %s"
                % (PLUGIN, TOOL or "tool", note))
        journal(line)
        # systemMessage reaches the operator, additionalContext reaches the model, stderr reaches the debug log.
        print(json.dumps({"systemMessage": line,
                          "additionalContext": channel_copy("context", line, refused=False)}))
        print(line, file=sys.stderr)
    sys.exit(0)

def deny(message):
    """Prints a deny verdict carrying `message` as the decision reason, the additional context and the system
    message, then exits 0."""
    print(json.dumps({
        "hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
                               "permissionDecisionReason": channel_copy("reason", message)},
        "additionalContext": channel_copy("context", message),
        "systemMessage": message,
    }))
    sys.exit(0)

def snip(text, cap):
    """`text` cut to `cap` characters, backed up to a word boundary past the midpoint, with the cut marked."""
    if len(text) <= cap:
        return text
    head = text[:cap]
    space = head.rfind(" ")
    if space > cap // 2:
        head = head[:space]
    return head.rstrip() + " [...cut]"

# --- discovery ---------------------------------------------------------------------------------

BRANCH_RE = re.compile(r"\bmission/[A-Za-z0-9._/-]+")
# An absolute path: POSIX, standing alone so the `/x` in `mission/x` does not match, or Windows with a drive
# letter. A path with spaces in it does not match.
ABS_PATH_RE = re.compile(r"(?<![\w.~/-])(?:/[A-Za-z0-9._-]+)+/?|\b[A-Za-z]:[\\/][^\s'\"`:;|&]+")
TOKEN_RE = re.compile(r"MC17_WAVE_TOKEN=([0-9a-f]{64})\b")
OVERRIDE_RE = re.compile(r"\bMC17_WAVE_OVERRIDE=")
# The reader of a line the Bash door cannot split into shell words: `git` and a commit, merge or push verb inside
# one simple command (no `|`, `;`, `&` or newline between), so `git -C /repo commit -m x` matches and
# `git log | grep commit` does not.
GIT_ACT_RE = re.compile(r"\bgit\b[^|;&\n]*?\b(commit|merge|push)\b")
GIT_C_RE = re.compile(r"\bgit\s+-C\s*(?:\"([^\"]+)\"|'([^']+)'|(\S+))")
CD_RE = re.compile(r"^\s*(?:\w+=\S*\s+)*cd\s+(?:\"([^\"]+)\"|'([^']+)'|(\S+))\s*(?:&&|;)", re.M)
# An unexpanded shell variable in a path, POSIX (`$x`, `${x}`) or Windows (`%X%`).
UNKNOWN_VAR = re.compile(r"\$\w|\$\{|%[A-Za-z_][A-Za-z0-9_]*%")
# A shell here-document, from `<<WORD` through the line holding the closing WORD. Its body is data the command
# writes, so it is stripped before the command is read for a git act.
HEREDOC = re.compile(r"<<-?\s*(['\"]?)([A-Za-z_][A-Za-z0-9_]*)\1[^\n]*\n.*?\n\2", re.S)
CANDIDATE_CAP = 40                   # branches or paths read per call; a prompt is not a directory listing

def git(args):
    """stdout of `git <args>` where it exited 0, else None. Raises where git cannot start or exceeds GIT_TIMEOUT."""
    # git writes paths and branch names as UTF-8 bytes. Read in the machine's code page, a folder whose name carries a
    # letter past ASCII names no folder, and the gate finds no lock there. surrogateescape keeps a byte that is no UTF-8,
    # which a POSIX file name may hold, as it stands, so the path still names the folder it came from.
    r = subprocess.run(["git"] + list(args), capture_output=True, text=True, encoding="utf-8", errors="surrogateescape", timeout=GIT_TIMEOUT)
    return r.stdout if r.returncode == 0 else None

def repo_root(d):
    """The top-level directory of the repository holding directory `d`, or None where `d` is in no repository."""
    out = git(["-C", d, "rev-parse", "--show-toplevel"])
    return out.strip() or None if out else None

def checked_out_branch(root):
    out = git(["-C", root, "symbolic-ref", "--short", "HEAD"])
    return out.strip() if out else None

def parse_lock(raw):
    """`raw` parsed as a lock, a JSON object with a string tokenHash, as a dict; None for anything else."""
    try:
        d = json.loads(raw)
    except Exception:
        return None
    if not isinstance(d, dict) or not isinstance(d.get("tokenHash"), str):
        return None
    return d

def listed_branches(root):
    """The local branches and the remote-tracking branches under origin of the repository at `root`, each by its own
    name and once; none where `root` is None."""
    out = git(["-C", root, "for-each-ref", "--format=%(refname:short)", "refs/heads", "refs/remotes/origin"]) if root else None
    names = []
    for n in (out or "").split():
        n = n[len("origin/"):] if n.startswith("origin/") else n
        if n and n not in ("HEAD", "origin") and n not in names:
            names.append(n)
    return names

def names_branch(text, name):
    """True where `text` names the branch `name`. A name holding a slash counts as a whole word anywhere. A name with no
    slash is also an everyday word, so it counts only where the text marks it as a branch: in backticks, right after or
    right before the word branch, or as a ref of origin or of refs/heads, as in origin/dev."""
    word = re.escape(name)
    end = r"(?![\w/-]|\.\w)"
    if "/" in name:
        return re.search(r"(?<![\w./-])" + word + end, text) is not None
    return any(re.search(p, text) for p in (
        r"`" + word + r"`",
        r"\b(?i:branch)\s+[`'\"]?" + word + end,
        r"(?<![\w./-])" + word + r"[`'\"]?\s+(?i:branch)\b",
        r"(?<![\w./-])(?:origin|refs/heads|refs/remotes/origin)/" + word + end))

def branch_names(text, root=None):
    """The branch names `text` names: each branch the repository at `root` lists that names_branch finds in the text,
    then each name of the form mission/... the text carries."""
    out = []
    for name in listed_branches(root):
        if names_branch(text, name) and name not in out:
            out.append(name)
    for m in BRANCH_RE.finditer(text):
        # A sentence ending on the name puts its full stop in the match; drop it.
        name = m.group(0).rstrip("./")
        if name != "mission/" and name not in out:
            out.append(name)
    return out[:CANDIDATE_CAP]

def dir_paths(text):
    out = []
    for m in ABS_PATH_RE.finditer(text):
        raw = m.group(0)
        for p in (raw, raw.rstrip("./")):
            if p and p not in out and os.path.isdir(p):
                out.append(p)
                break
    return out[:CANDIDATE_CAP]

def lock_on_branch(root, name):
    """Rule 1: the lock committed at .mc17/wave.json on branch `name` of the repository at `root`, or None.

    Reads the branch under its local name, then as origin/<name>, so a checkout that only tracks it answers too.
    """
    for ref in (name, "origin/" + name):
        raw = git(["-C", root, "show", "%s:%s" % (ref, LOCK_IN_TREE)])
        if raw:
            lock = parse_lock(raw)
            if lock:
                return lock
    return None

def lock_in_worktree(d):
    """Rules 2 and 3: the lock in force at directory `d`, as (lock, description), or (None, None).

    In force means .mc17/wave.json stands at the repository root and the checkout there is on the branch the lock
    names or on a branch whose name opens mission/. A lock file under a checkout on any other branch, or under a
    detached head, does not count.
    """
    root = repo_root(d)
    if not root:
        return None, None
    f = os.path.join(root, ".mc17", "wave.json")
    if not os.path.isfile(f):
        return None, None
    branch = checked_out_branch(root)
    with open(f, encoding="utf-8") as fh:
        lock = parse_lock(fh.read())
    if not lock:
        return None, None
    if not branch or not (branch.startswith("mission/") or branch == lock.get("branch")):
        return None, None
    return lock, "the worktree %s on branch %s" % (root, branch)

def find_lock(text, cwd, rules=(1, 2, 3)):
    """The first wave lock `text` or `cwd` leads to, as (lock, where), or (None, None).

    Rule 1 reads every branch the text names off the cwd's repository, and keeps a lock committed on a mission/*
    branch or on the branch the lock names. Rule 2 reads every absolute directory path the text names. Rule 3
    reads the cwd's own repository. Raises NotADirectoryError where a cwd is handed and does not exist.
    """
    text = text or ""
    root = None
    if cwd is not None and (1 in rules or 3 in rules):
        if not os.path.isdir(cwd):
            raise NotADirectoryError("the handed cwd does not exist: %s" % cwd)
        root = repo_root(cwd)
    if 1 in rules and root:
        for name in branch_names(text, root):
            lock = lock_on_branch(root, name)
            if lock and (name.startswith("mission/") or lock.get("branch") == name):
                return lock, "branch %s of %s" % (name, root)
    if 2 in rules:
        for p in dir_paths(text):
            lock, where = lock_in_worktree(p)
            if lock:
                return lock, where
    if 3 in rules and root:
        lock, where = lock_in_worktree(root)
        if lock:
            return lock, where
    return None, None

def token_ok(lock, text, env_token=None):
    """True where an MC17_WAVE_TOKEN in `text`, or `env_token`, hashes (sha256) to the lock's tokenHash.
    False where that tokenHash, with or without a `sha256:` prefix, is not 64 hex characters."""
    want = str(lock.get("tokenHash") or "")
    if want.startswith("sha256:"):
        want = want[len("sha256:"):]
    if not re.fullmatch(r"[0-9a-f]{64}", want or ""):
        return False
    found = TOKEN_RE.findall(text or "")
    if env_token and re.fullmatch(r"[0-9a-f]{64}", env_token.strip()):
        found.append(env_token.strip())
    return any(hashlib.sha256(t.encode("ascii")).hexdigest() == want for t in found)

def target_worktree(command, cwd):
    """The directory a git command acts in: `git -C <path>`, else a leading `cd <path> &&`, else `cwd`.

    A path holding an unexpanded variable, a path that is no directory and a relative path with no cwd answer
    None. Raises NotADirectoryError where no path is named and the handed cwd does not exist.
    """
    for rx in (GIT_C_RE, CD_RE):
        m = rx.search(command)
        if m:
            p = next(g for g in m.groups() if g is not None)
            p = os.path.expanduser(p)
            if UNKNOWN_VAR.search(p):
                return None
            if not os.path.isabs(p):
                if not cwd:
                    return None
                p = os.path.join(cwd, p)
            return p if os.path.isdir(p) else None
    if cwd is None:
        return None
    if not os.path.isdir(cwd):
        raise NotADirectoryError("the handed cwd does not exist: %s" % cwd)
    return cwd

# --- the Bash door's reader ---------------------------------------------------------------------

# A word made only of these characters separates one simple command from the next: a pipe, a list operator, the
# parentheses of a subshell or of `$(...)`, and a backtick.
SEPARATORS = set(";|&()`")
GIT_ACTS = ("commit", "merge", "push")
# git's own options that take the next word as their value.
GIT_VALUE_OPTIONS = ("-C", "-c", "--git-dir", "--work-tree", "--namespace", "--config-env", "--attr-source")
# The options of git merge that end a merge in progress, which make no commit.
MERGE_ENDS = ("--abort", "--quit")
# git's own commands. Where the word after git's options is none of them, the value of an option this file does not list
# among them, the reader looks for the act among the command's words with GIT_ACT_RE.
GIT_COMMANDS = frozenset("""add am annotate apply archive bisect blame branch bugreport bundle cat-file check-attr
check-ignore check-mailmap check-ref-format checkout checkout-index cherry cherry-pick citool clean clone column commit
commit-graph commit-tree config count-objects credential describe diagnose diff diff-files diff-index diff-tree difftool
fast-export fast-import fetch fetch-pack filter-branch fmt-merge-msg for-each-ref for-each-repo format-patch fsck gc
get-tar-commit-id grep gui hash-object help hook index-pack init instaweb interpret-trailers lfs log ls-files ls-remote
ls-tree mailinfo mailsplit maintenance merge merge-base merge-file merge-index merge-tree mergetool mktag mktree
multi-pack-index mv name-rev notes pack-objects pack-redundant pack-refs prune prune-packed pull push range-diff read-tree
rebase reflog remote repack replace rerere reset restore rev-list rev-parse revert rm send-email shortlog show show-branch
show-index show-ref sparse-checkout stash status stripspace submodule switch symbolic-ref tag unpack-file unpack-objects
update-index update-ref update-server-info var verify-commit verify-pack verify-tag version whatchanged worktree
write-tree""".split())
ASSIGNMENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
# A word that sets the git directory or the work tree through the environment, so git no longer acts where the reader
# follows the directory.
GIT_DIR_ENV_RE = re.compile(r"^(?:GIT_DIR|GIT_WORK_TREE)=")
# The words that run the command after them as it stands.
COMMAND_PREFIXES = ("builtin", "command")
# The options of cd that take no value.
CD_OPTIONS = ("-P", "-L", "-e", "-@")

def shell_words(line):
    """`line` split into shell words in POSIX mode: quotes taken off, no escape character, so a Windows path keeps its
    backslashes, `#` read as part of a word, and each run of `;`, `|`, `&`, `(`, `)`, `<`, `>` or a backtick a word
    of its own. Raises ValueError where the line cannot be split, an unclosed quote among the causes."""
    lex = shlex.shlex(line, posix=True, punctuation_chars="();<>|&`")
    lex.whitespace_split = True
    lex.escape = ""
    lex.commenters = ""
    return list(lex)

def simple_commands(words):
    """The simple commands among shell words, each a list of words, split at every word made only of separators."""
    out, cur = [], []
    for w in words:
        if w and all(c in SEPARATORS for c in w):
            if cur:
                out.append(cur)
            cur = []
        else:
            cur.append(w)
    if cur:
        out.append(cur)
    return out

def resolve_dir(p, base):
    """The directory `p` names, resolved against `base` where it is relative, or None where it holds an unexpanded
    variable, is relative with no base, or names no directory."""
    if p is None:
        return None
    p = os.path.expanduser(p)
    if UNKNOWN_VAR.search(p):
        return None
    if not os.path.isabs(p):
        if not base:
            return None
        p = os.path.join(base, p)
    return p if os.path.isdir(p) else None

def git_act(cmd):
    """(act, the values of its -C options in order, followed) where a word of the simple command `cmd` is git, or a
    path whose last part is git or git.exe, and the word after git's own options is commit, merge or push; None
    otherwise. Where that word is no git command, the act is the first commit, merge or push GIT_ACT_RE finds among the
    command's words. `followed` is False where the command names its git directory or work tree by an option, or where
    GIT_ACT_RE found the act, because the directory the act runs in is then not the one the reader follows. A merge
    with --abort or --quit ends a merge in progress and is no act. A word that holds git inside a longer word, such as
    hooks/git/pre-commit, is no command word."""
    for i, w in enumerate(cmd):
        if w.replace("\\", "/").rsplit("/", 1)[-1] not in ("git", "git.exe"):
            continue
        j, dirs, followed = i + 1, [], True
        while j < len(cmd) and cmd[j].startswith("-"):
            if cmd[j].split("=", 1)[0] in ("--git-dir", "--work-tree"):
                followed = False
            if cmd[j] in GIT_VALUE_OPTIONS and j + 1 < len(cmd):
                if cmd[j] == "-C":
                    dirs.append(cmd[j + 1])
                j += 2
            else:
                j += 1
        if j >= len(cmd):
            continue
        if cmd[j] in GIT_ACTS:
            if cmd[j] == "merge" and any(x in MERGE_ENDS for x in cmd[j + 1:]):
                continue
            return cmd[j], dirs, followed
        if cmd[j] not in GIT_COMMANDS:
            m = GIT_ACT_RE.search(" ".join(cmd[i:]))
            if m:
                return m.group(1), dirs, False
    return None

def change_dir(cmd, here, stack):
    """The directory the cd, pushd or popd that opens the words `cmd` moves to from `here`, or None where the reader
    cannot tell. `stack` holds the directories pushd saved. cd reads its options -P, -L, -e and -@ and the end of options
    `--`, and with no path it moves home; cd - moves to a directory the reader does not track. pushd saves `here` and
    moves as cd does; with no path, with -n, or with a +N or -N rotation it is not followed. popd moves to the last saved
    directory, and past the first one to a directory the reader does not track."""
    verb, args = cmd[0], cmd[1:]
    if verb == "popd":
        return stack.pop() if stack and not args else None
    i = 0
    while i < len(args) and args[i] in CD_OPTIONS:
        i += 1
    if i < len(args) and args[i] == "--":
        i += 1
    rest = args[i:]
    if verb == "pushd":
        if not rest or rest[0] == "-n" or re.match(r"^[+-]\d+$", rest[0]):
            return None
        stack.append(here)
    if not rest:
        home = os.path.expanduser("~")
        return home if os.path.isdir(home) else None
    return None if rest[0] == "-" else resolve_dir(rest[0], here)

def git_acts(text, cwd, depth=0, env_moved=False):
    """Every git act of the Bash text `text`, run from `cwd`, as (act, directory, own words, followed): the directory is
    the act's own -C resolved against the directory before it, else where the last cd, pushd or popd before it in the
    text moved, else `cwd`, and None where none of those names a directory; `own words` is the text of the act's own
    simple command; `followed` is False where the directory is None, where GIT_DIR or GIT_WORK_TREE was set in the text
    before the act or in its own command, and where git_act says so. `env_moved` says the text that holds this one set
    GIT_DIR or GIT_WORK_TREE. A word that holds white space is read again as a command line of its own, starting in
    the directory of the command that holds it. A line that cannot be split into words is read with GIT_ACT_RE, its
    act's words are the whole line, and its act is not followed."""
    acts = []
    here, stack = cwd, []
    for line in text.split("\n"):
        try:
            words = shell_words(line)
        except ValueError:
            m = GIT_ACT_RE.search(line)
            if m:
                acts.append((m.group(1), target_worktree(line, cwd), line, False))
            continue
        for cmd in simple_commands(words):
            if any(GIT_DIR_ENV_RE.match(w) for w in cmd):
                env_moved = True
            k = 0
            while k < len(cmd) and (ASSIGNMENT_RE.match(cmd[k]) or cmd[k] in COMMAND_PREFIXES):
                k += 1
            if k < len(cmd) and cmd[k] in ("cd", "pushd", "popd"):
                here = change_dir(cmd[k:], here, stack)
                continue
            act = git_act(cmd)
            if act:
                where = here
                for d in act[1]:
                    where = resolve_dir(d, where)
                acts.append((act[0], where, " ".join(cmd), act[2] and where is not None and not env_moved))
            for w in cmd:
                if depth < 4 and any(ch.isspace() for ch in w):
                    acts.extend(git_acts(w, here, depth + 1, env_moved))
    return acts

# --- the refusals ------------------------------------------------------------------------------

def lock_line(lock):
    record = lock.get("rulingRecord")
    return ("Lock: %s on branch %s   wave plan %s (%s)   ruling record %s   locked %s by %s"
            % (LOCK_IN_TREE, lock.get("branch") or "?", lock.get("wavePlanName") or "?",
               lock.get("wavePlan") or "?", record if record is not None else "none recorded",
               lock.get("lockedAt") or "?", lock.get("lockedBy") or "?"))

def mc17_path():
    """The launcher of the plugin's own client, two levels above this file: client/mc17, or client/mc17.cmd on Windows."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(root, "client", "mc17.cmd" if os.name == "nt" else "mc17")

def agent_refusal(lock, where, prompt):
    wave = lock.get("wavePlanName") or lock.get("wavePlan") or "?"
    carried = ("carries a wave token line that does not hash to the lock"
               if TOKEN_RE.search(prompt) else "carries no wave token line")
    return "\n".join([
        "This subagent prompt names %s, which is locked to wave %s, and it %s, so the work it "
        "launches would reach the branch outside the sanctioned runner." % (where, wave, carried),
        "",
        lock_line(lock),
        "",
        "Wave work reaches a mission branch only through the sanctioned runner's stage call; the "
        "build stage is the harness's, never a bare agent's (Profile 8.1; IP-MC17-003 Part 2, with "
        "Part 1 the pre-commit hook on the branch itself). On 2026-08-22 a bare Agent-tool subagent "
        "committed wave work on mission/kdom before any sanctioned wave existed, and this is the "
        "door it came through.",
        "",
        "The same prompt issued by a sanctioned `runStage` carries the line",
        "  WAVE TOKEN: MC17_WAVE_TOKEN=<64 hex> (export it before every git commit; IP-MC17-003 Part 1)",
        "and passes this gate: the token hashes to the lock, so the line proves where the prompt "
        "came from. To run the stage, declare it in a sanctioned block (`%s block --print`) and "
        "let runStage spawn the agent; the worked example is harness/examples/sanctioned-wave.js. A "
        "prompt that names the branch for a read or a review may carry the same line; `mc17 wave script` "
        "writes the token into the wave script." % mc17_path(),
    ])

def bash_refusal(lock, where, command, act):
    wave = lock.get("wavePlanName") or lock.get("wavePlan") or "?"
    carried = ("carries an MC17_WAVE_TOKEN that does not hash to the lock"
               if TOKEN_RE.search(command) else "carries no MC17_WAVE_TOKEN")
    return "\n".join([
        "This command runs a git %s against %s, which is locked to wave %s, and it %s, so the act "
        "would reach the branch outside the sanctioned runner." % (act, where, wave, carried),
        "",
        "Command: " + snip(command.strip(), 400),
        lock_line(lock),
        "",
        "Part 1's law: the branch's own pre-commit and pre-merge-commit hooks refuse any commit on a "
        "branch the lock names, or on a mission/* branch, while .mc17/wave.json is committed there, "
        "unless the committing process carries MC17_WAVE_TOKEN hashing to the lock, which only a "
        "sanctioned runStage hands to the build and fix agents it spawns (Profile 8.1; IP-MC17-003 "
        "Part 1, and this gate is Part 2 of the same IP).",
        "",
        "Two ways forward. Inside a sanctioned stage, prefix the act with the token the stage "
        "prompt carries:",
        "  MC17_WAVE_TOKEN=<64 hex> git %s ..." % act,
        "Outside the wave, on purpose:",
        "  MC17_WAVE_OVERRIDE=<your reason> git %s ..." % act,
        "The override is journaled by the pre-commit hook, and the closure history check names "
        "every sha no stage record accounts for (Part 3). This gate lets it through so the act is "
        "deliberate and recorded.",
    ])

# --- the doors ---------------------------------------------------------------------------------

def main():
    """Reads one PreToolUse call as JSON on stdin, prints the verdict as JSON on stdout and exits 0.

    Agent calls are judged by their prompt under rules 1 and 2, Bash calls by their command; every other tool
    is allowed. On an error of its own the gate allows the call and journals that it did.
    """
    try:
        data = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    except Exception as e:
        allow("the hook input could not be parsed (%s), so nothing was read" % type(e).__name__)

    global TOOL
    name = data.get("tool_name") or ""
    TOOL = name or None
    ti = data.get("tool_input") or {}
    cwd = data.get("cwd")

    if name == "Agent":
        prompt = ti.get("prompt")
        if not isinstance(prompt, str) or not prompt:
            allow()
        try:
            # Only the branches and paths the prompt names count; the session's own repository (rule 3) does not.
            lock, where = find_lock(prompt, cwd, rules=(1, 2))
            if not lock:
                allow()
            if token_ok(lock, prompt):
                allow()
            deny(agent_refusal(lock, where, prompt))
        except Exception as e:
            allow("the gate raised %s (%s) while looking for a wave lock, so this prompt was judged "
                  "by nothing" % (type(e).__name__, str(e)[:120]))

    elif name == "Bash":
        command = ti.get("command")
        if not isinstance(command, str) or not command:
            allow()
        try:
            if cwd is not None and not os.path.isdir(cwd):
                raise NotADirectoryError("the handed cwd does not exist: %s" % cwd)
            for act, target, own, followed in git_acts(HEREDOC.sub("", command), cwd):
                lock = where = None
                if target:
                    lock, where = lock_in_worktree(target)
                if not lock:
                    # Where the reader followed the act's directory, only the absolute paths among the act's own words,
                    # so a path named elsewhere in the call is never read as the place this act goes; where it lost
                    # that directory, every absolute path of the whole call.
                    lock, where = find_lock(own if followed else command, None, rules=(2,))
                if not lock:
                    continue
                if OVERRIDE_RE.search(command) or os.environ.get("MC17_WAVE_OVERRIDE"):
                    allow()             # deliberate, and the pre-commit hook journals it (Part 1)
                if token_ok(lock, command, os.environ.get("MC17_WAVE_TOKEN")):
                    allow()
                deny(bash_refusal(lock, where, command, act))
            allow()
        except Exception as e:
            allow("the gate raised %s (%s) while looking for a wave lock, so this command was "
                  "judged by nothing" % (type(e).__name__, str(e)[:120]))

    allow()

if __name__ == "__main__":
    main()

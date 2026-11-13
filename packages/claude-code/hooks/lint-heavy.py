#!/usr/bin/env python3
"""Refuses the start of a heavy run in a wave run by hand that no decision of the judgment module names, and marks the ends
it sees.

Before any of that, at PreToolUse, it refuses an agent's Bash or PowerShell call, one whose input carries agent_id, whose
text holds mc17 with --hook or --measure anywhere or names the folder .canonq, each in any letter case and also once its
quote marks, backslashes and backticks are taken out. That folder holds the person's token, and the session runs the
hook's read itself. The refusal holds in every folder, whether a wave run by hand stands there or none.

A Claude Code hook for three events. At PreToolUse it reads one Agent, Bash or PowerShell call as JSON on stdin and prints
its verdict as JSON on stdout. At PostToolUse and SubagentStop it marks the end of a start it admitted and prints nothing.

A heavy run is one the table hooks/heavy-runs.json names: a whole test suite, the drill, a release check, an integration
stage or an agent start. A suite whose file has a word after it that names checks is a run of one check by name, and is
light. The hook is on where the call's directory lies in a checkout whose .mc17/wave.json reads mode hand, whatever its
branch or its head, or under a checkout or an agent's path that the hand.json of a store under the store root lists for
a wave whose lock still stands in its checkout and reads mode hand. Anywhere else it allows the call.

Where it is on, each heavy run of the call needs a start entry under its key, {table id}@{host}, in the store of the
wave's scope, {store root}/{SCOPE}/starts.jsonl. The host is local, or the target of the ssh whose quoted command holds the
start. The newest entry under the key decides, passing over an entry a start used, one that ended with no field held, and,
at an agent start, every entry whose prompt digest differs from the call's, open, admitted or held: an open entry may admit the
start; an entry that ended with a field held refuses it, naming the decision that holds it; an entry the executor admitted
under a delegation may admit it only where the call holds no other heavy run and a reading of the host through the plugin's
own client, client/mc17 converge host, answered within the client's bound, shows the entry's host's part and an idle host,
and otherwise the hook ends the entry and refuses the start. An entry admits a start only through mc17 decision admit (ARCH
D15): the client checks the entry's signed decision with the checking keys of the gateway in use, recomputes its fields
from the computer and reports the start to the engine, which admits each decision to one start; the hook refuses on any
exit but 0, on a line it cannot read and on a client that has not answered within its bound (D20). With every entry
admitted, the hook marks each entry used, writes a deciding entry into decided.jsonl and allows the call. Without one it refuses the call and names the command owed, mc17 converge evaluate --point heavy-run. Where no
store of the scope stands on this host it refuses and names two ways on. The store root is MC17_CONVERGE_STORE, or
~/.mc17/converge.

Where the lock of the wave, as the checkout's last commit holds it, carries handPrompts, the digests of the start texts the
Wave Plan rules, an agent start the hook places in the wave passes only where its prompt is the one line that names a
brief, with its newline, the brief's text before the line THE FACTS OF THIS START digests to the sha of one entry, and each
line after it is a fact under one of the seven labels, in its form, each label once. The hook refuses such a start before
it reads the entries, so its entry stays open, and it refuses a start where the working tree's lock differs from the
committed one in handPrompts; it writes what it read of the brief into the used and the deciding entries. A lock with no
handPrompts leaves agent starts as before.

A command is read with the branch hook's own reader, loaded from hooks/lint-branch.py by its path: shell words, simple
commands, the directory followed through cd, pushd and popd, and a word that holds white space read again as a command
line of its own. On Windows a Git Bash path, a slash and one drive letter and a slash or the end, is read as the root of
that drive before the reader follows it, so /c/Users reads as C:/Users. A cd, pushd or popd whose folder the reader cannot
place is written to the journal, with the command, where a wave run by hand stands on this host. An agent start takes its
folder from the newest agent entry of every store whose prompt digest equals the digest of the call's prompt, in any
state, and the call's folder where none does. A program word is compared by its last path part, with backslashes read as
slashes and a closing .exe taken off; an interpreter word (node, python, python3 or py) hands the role to the first word
after its options, and so does a wrapper word (timeout with its duration, nohup, time, nice, or env with its
assignments). A simple command that runs mc17 converge passes whole, and its quoted words are not read again. The body of
a here-document is data, and is stripped first.

With --key, the hook reads { "commands": [...] } on stdin and prints, for each command, its starts with their table ids,
hosts and keys; it reads no store, no lock and no directory. On an error of its own the hook allows the call with a note
and writes a line to its journal, MC17_HEAVY_JOURNAL or ~/.mc17/heavy-journal.log.
"""
import datetime, hashlib, importlib.util, json, os, posixpath, re, subprocess, sys

PLUGIN = "devyonq-mc"
HERE = os.path.dirname(os.path.abspath(__file__))
TABLE_FILE = os.path.join(HERE, "heavy-runs.json")
LOCK_FILE = os.path.join(".mc17", "wave.json")
JOURNAL = os.environ.get("MC17_HEAVY_JOURNAL") or os.path.expanduser("~/.mc17/heavy-journal.log")
STORE_ROOT = os.environ.get("MC17_CONVERGE_STORE") or os.path.expanduser("~/.mc17/converge")
# The words that hand the program's role to the first word after their options.
INTERPRETERS = ("node", "python", "python3", "py")
# The words that wrap a program and hand its role to the word after their own options: timeout, whose duration follows its
# options; nohup; time; nice; and env, whose assignments are passed over too.
WRAPPERS = ("timeout", "nohup", "time", "nice", "env")
# The options of the wrapper words that take the next word as their value.
WRAPPER_VALUE_OPTIONS = {"timeout": ("-s", "--signal", "-k", "--kill-after"), "nice": ("-n", "--adjustment"), "env": ("-u", "--unset", "-C", "--chdir"),
                         "time": ("-f", "--format", "-o", "--output")}
# How deep a word that holds white space is read again as a command line of its own.
READ_DEPTH = 4
# The options of ssh that take the next word as their value.
SSH_VALUE_OPTIONS = ("-B", "-b", "-c", "-D", "-E", "-e", "-F", "-I", "-i", "-J", "-L", "-l", "-m", "-O", "-o", "-P", "-p", "-R", "-S", "-W", "-w")
# The subcommand of mc17 whose simple command passes whole.
CONVERGE = "converge"
# A Git Bash path: a slash, one drive letter, and a slash or the end of the word.
GIT_BASH_DRIVE = re.compile(r"^/([A-Za-z])(?:/(.*))?$", re.S)
# The end events, at which the hook prints nothing.
END_EVENTS = ("PostToolUse", "SubagentStop")
OWED = "mc17 converge evaluate --point heavy-run"

# The name of the tool being judged, set once in main() so a refusal or an allow note can name it.
TOOL = None
# The branch hook's reader, loaded by its path in main().
BR = None


def load_branch_hook():
    """The module hooks/lint-branch.py beside this file, loaded by its path; its main() does not run."""
    spec = importlib.util.spec_from_file_location("mc17_lint_branch", os.path.join(HERE, "lint-branch.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def now():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def journal(line):
    """Appends `line` to the journal file behind a UTC timestamp and this file's path; creates the directory. Every
    error is swallowed, so a journal that cannot be written never stops the hook."""
    try:
        os.makedirs(os.path.dirname(JOURNAL), exist_ok=True)
        with open(JOURNAL, "a", encoding="utf-8") as fh:
            fh.write(now() + " [" + os.path.abspath(__file__) + "] " + line + "\n")
    except Exception:
        pass


def context_copy(message):
    """`message` under a first line that names the channel, the tool and the refusal, for the model's context."""
    return "[%s context] the heavy-run hook refused this %s call, and nothing started.\n\n%s" % (PLUGIN, TOOL or "tool", message)


def allow(note=None):
    """Prints an allow verdict and exits 0. With `note`, the note is journaled and printed on stdout as the system
    message and the model's context, and on stderr, saying the call passed unread; the output carries no permission
    decision, so the call still takes whatever approval it would take with no hook installed."""
    if note:
        note_line = "[%s] the heavy-run hook allowed this %s call WITHOUT READING IT: %s" % (PLUGIN, TOOL or "tool", note)
        journal(note_line)
        print(json.dumps({"systemMessage": note_line,
                          "additionalContext": "[%s context] the heavy-run hook let this %s call through unread.\n\n%s" % (PLUGIN, TOOL or "tool", note_line)}))
        print(note_line, file=sys.stderr)
    sys.exit(0)


def deny(message):
    """Prints a deny verdict carrying `message` as the decision reason, the model's context and the system message,
    prints it on stderr for the debug log, and exits 0."""
    print(json.dumps({
        "hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "[%s reason] %s" % (PLUGIN, message)},
        "additionalContext": context_copy(message),
        "systemMessage": message,
    }))
    print(message, file=sys.stderr)
    sys.exit(0)


def snip(text, cap):
    """`text` cut to `cap` characters, with the cut marked."""
    return text if len(text) <= cap else text[:cap].rstrip() + " [...cut]"


def digest_of(text):
    return "sha256:" + hashlib.sha256(str(text).encode("utf-8")).hexdigest()


def read_json(file):
    with open(file, encoding="utf-8") as fh:
        return json.load(fh)


def jsonl(file):
    """Every line of `file` that is JSON, in order; none where the file does not stand."""
    if not os.path.exists(file):
        return []
    out = []
    with open(file, encoding="utf-8") as fh:
        for line in fh:
            if line.strip():
                out.append(json.loads(line))
    return out


def append_line(file, value):
    """Writes `value` as one line of JSON at the end of `file`, flushed to the disk."""
    os.makedirs(os.path.dirname(file), exist_ok=True)
    with open(file, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(value) + "\n")
        fh.flush()
        os.fsync(fh.fileno())


def table():
    """The entries of the heavy-run table."""
    return list(read_json(TABLE_FILE).get("entries") or [])


# --- the reader of a command -------------------------------------------------------------------

def base_name(word):
    """The last path part of `word`, backslashes read as slashes, with a closing .exe taken off in any case of its letters."""
    name = word.replace("\\", "/").rsplit("/", 1)[-1]
    if name.lower().endswith(".exe"):
        name = name[:-4]
    return name


def placed_path(word, platform):
    """`word` as the folder it names where `platform` is win32 and the word is a Git Bash path: a slash, one drive letter
    and a slash or the end read as the root of that drive, so /c/Users reads as C:/Users and /c as C:/. On any other
    platform, and for any other word, the word as written."""
    if platform != "win32":
        return word
    m = GIT_BASH_DRIVE.match(word)
    if not m:
        return word
    return m.group(1).upper() + ":/" + (m.group(2) or "")


def name_words(rest):
    """The words of `rest` that name checks: each that is not empty and does not open with -, leaving out a redirect
    operator, the word it sends to and a descriptor right before it."""
    out = []
    i = 0
    while i < len(rest):
        w = rest[i]
        if w and all(c in "<>&" for c in w) and ("<" in w or ">" in w):
            if out and re.fullmatch(r"\d+", out[-1]):
                out.pop()
            i += 2
            continue
        if w and not w.startswith("-"):
            out.append(w)
        i += 1
    return out


def program_of(words):
    """The index of the program word of the simple command `words`, past its interpreter words and its wrapper words with
    their options, and its base name; (None, None) where an interpreter or a wrapper has no word after it."""
    i = 0
    name = base_name(words[0])
    while name in INTERPRETERS or name in WRAPPERS:
        wrapper = name if name in WRAPPERS else None
        valued = WRAPPER_VALUE_OPTIONS.get(wrapper, ())
        i += 1
        while i < len(words) and (words[i].startswith("-") or (wrapper == "env" and BR.ASSIGNMENT_RE.match(words[i]))):
            i += 2 if words[i] in valued else 1
        if wrapper == "timeout":
            i += 1
        if i >= len(words):
            return None, None
        name = base_name(words[i])
    return i, name


def matches(entry, name, after):
    """The id of `entry` where its matcher names the program `name` with the words `after` it, CONVERGE where the
    program is mc17 and its subcommand is converge, and None otherwise."""
    m = entry.get("matcher") or {}
    kind = m.get("kind")
    if kind == "program" and name == m.get("file"):
        if m.get("lightWithName") and name_words(after):
            return None
        return entry["id"]
    if kind == "subcommand" and name in (m.get("programs") or []):
        sub = after[0] if after else None
        if sub == CONVERGE:
            return CONVERGE
        if sub != m.get("word"):
            return None
        if m.get("with") and m["with"] not in after:
            return None
        if m.get("without") and m["without"] in after:
            return None
        return entry["id"]
    return None


def run_of(words, entries):
    """The table id of the heavy run the simple command `words` starts, CONVERGE where it runs mc17 converge, or None."""
    i, name = program_of(words)
    if name is None:
        return None
    after = words[i + 1:]
    for e in entries:
        hit = matches(e, name, after)
        if hit:
            return hit
    return None


def ssh_target(words):
    """The destination of the ssh command `words`, past the options that take a value, and the index of the first word
    after it; (None, the length) where the command names none."""
    i = 1
    while i < len(words):
        w = words[i]
        if w == "--":
            i += 1
            break
        if w.startswith("-"):
            i += 2 if w in SSH_VALUE_OPTIONS else 1
            continue
        return w, i + 1
    return (words[i], i + 1) if i < len(words) else (None, len(words))


def starts_in(text, cwd, entries, depth=0, host="local", follow=True, unplaced=None):
    """Every heavy run the shell text `text` starts, run from `cwd`, each { tableId, host, key, dir, text }: `dir` is
    where the last cd, pushd or popd before it moved, else `cwd`, and None where none of those names a directory; `text`
    is the start's own simple command. The words of a cd, pushd or popd are read through placed_path first, and the
    simple command of each one that names no folder the reader can place is added to the list `unplaced` where one is
    handed. A word that holds white space is read again as a command line of its own, to READ_DEPTH. The remote command
    of an ssh is read under the target's host: each start there carries the directory of the ssh command itself as `dir`,
    and as `remoteDir` the folder on that host its own cd, pushd and popd name, read as text by remote_dir, which carries
    into a quoted part the remote shell reads again. With `follow` false, no directory is followed."""
    starts = []
    here, stack = cwd, []
    text = BR.HEREDOC.sub("", text)
    for line in text.split("\n"):
        try:
            words = BR.shell_words(line)
        except ValueError:
            words = line.split()
        for cmd in BR.simple_commands(words):
            k = 0
            while k < len(cmd) and (BR.ASSIGNMENT_RE.match(cmd[k]) or cmd[k] in BR.COMMAND_PREFIXES):
                k += 1
            rest = cmd[k:]
            if not rest:
                continue
            if rest[0] in ("cd", "pushd", "popd"):
                if follow and host == "local":
                    here = BR.change_dir([rest[0]] + [placed_path(w, sys.platform) for w in rest[1:]], here, stack)
                    if here is None and unplaced is not None:
                        unplaced.append(" ".join(cmd))
                elif follow:
                    here = remote_dir(rest, here, stack)
                continue
            hit = run_of(rest, entries)
            if hit == CONVERGE:
                continue
            if hit:
                start = {"tableId": hit, "host": host, "key": hit + "@" + host, "dir": here, "text": " ".join(cmd)}
                if host != "local":
                    start["remoteDir"] = here
                starts.append(start)
            if base_name(rest[0]) == "ssh":
                target, j = ssh_target(rest)
                if target and depth < READ_DEPTH:
                    for s in starts_in(" ".join(rest[j:]), None, entries, depth + 1, target, follow):
                        s["dir"] = here
                        starts.append(s)
                continue
            for w in rest:
                if depth < READ_DEPTH and any(c.isspace() for c in w):
                    starts.extend(starts_in(w, here, entries, depth + 1, host, follow, unplaced))
    return starts


def remote_dir(words, here, stack):
    """The folder on another host that the cd, pushd or popd opening `words` moves to from `here`, read as text in POSIX
    form, or None where it names no folder the hook can compare: a path through a variable or the home folder, a relative
    path from a folder the hook does not know, cd -, and a popd past the saved folders."""
    verb, args = words[0], words[1:]
    if verb == "popd":
        return stack.pop() if stack and not args else None
    i = 0
    while i < len(args) and args[i] in ("-P", "-L", "-e", "-@"):
        i += 1
    if i < len(args) and args[i] == "--":
        i += 1
    rest = args[i:]
    if not rest or rest[0] == "-" or "$" in rest[0] or rest[0].startswith("~"):
        return None
    if verb == "pushd":
        stack.append(here)
    if rest[0].startswith("/"):
        return posixpath.normpath(rest[0])
    return posixpath.normpath(posixpath.join(here, rest[0])) if here else None


def tool_starts(tool, entries, prompt, cwd):
    """The starts of a call of `tool` that the table names as a tool: one start each, under the host local."""
    out = []
    for e in entries:
        m = e.get("matcher") or {}
        if m.get("kind") == "tool" and m.get("tool") == tool:
            out.append({"tableId": e["id"], "host": "local", "key": e["id"] + "@local", "dir": cwd, "text": prompt if isinstance(prompt, str) else "", "agent": True})
    return out


# --- where the hook is on ---------------------------------------------------------------------

def checkout_root(d):
    """The nearest folder at or above `d` that holds .git, as a folder or a file, or None."""
    d = os.path.abspath(d)
    while True:
        if os.path.exists(os.path.join(d, ".git")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent


def lock_at(root):
    """The lock .mc17/wave.json under `root` as a dict, or None where none stands or it is no JSON object."""
    f = os.path.join(root, LOCK_FILE)
    if not os.path.isfile(f):
        return None
    try:
        lock = read_json(f)
    except Exception:
        return None
    return lock if isinstance(lock, dict) else None


def hand_lock(root):
    """The lock under `root` where it reads mode hand, whatever its branch or its head, or None."""
    hand = lock_at(root)
    if hand is None or str(hand.get("mode")) != "hand":
        return None
    return hand


# --- the brief of an agent start in a wave whose lock rules start texts ---------------------------------------------

# The line of a brief after which each line is a fact of that one start.
FACTS_LINE = "THE FACTS OF THIS START"
# The one line that names a brief, the prompt of an agent start where the lock rules start texts, with its newline.
POINTER_RE = re.compile(r"\AYour brief stands whole in the file (.+); read it to its end before you act, and follow it\.\n\Z")
# The fixed form of each fact of a start, by its label: a test of the value, given the lenses the lock's start texts name.
FACT_FORMS = {
    "Branch tip:": lambda v, lenses: re.fullmatch(r"[0-9a-f]{7,40}", v) is not None,
    "Fixed tip:": lambda v, lenses: re.fullmatch(r"[0-9a-f]{7,40}", v) is not None,
    "Start entries:": lambda v, lenses: v == "none" or all(re.fullmatch(r"[A-Z0-9]+(?:-[A-Z0-9]+)*-[0-9a-f]{16}\.s[1-9][0-9]*", x) for x in v.split(", ")),
    "Review record:": lambda v, lenses: re.fullmatch(r"[1-9][0-9]*", v) is not None,
    "Returns:": lambda v, lenses: len(v.split(", ")) <= 2 and all(re.fullmatch(r"[A-Za-z0-9/._:-]+\.md", x) for x in v.split(", ")),
    "Pen items:": lambda v, lenses: all(m is not None and m.group(1) in lenses for m in (re.fullmatch(r"(\S+) ([1-9][0-9]*)", x) for x in v.split(", "))),
    "Held by the session:": lambda v, lenses: all(m is not None and m.group(1) in lenses for m in (re.fullmatch(r"(\S+) ([1-9][0-9]*) record ([1-9][0-9]*)", x) for x in v.split(", "))),
}
# The words of a ruled start text that name the folder the paths of the fact Returns: stand under, in its rule on the
# facts of a start.
RETURNS_FOLDER_RE = re.compile(r"`Returns:` one or two paths of files under `([^`\n]+)`")
# The reason of the refusal where the working tree's lock and the committed lock differ in handPrompts.
LOCK_DIFFERS ="the working tree's lock differs from the committed lock in handPrompts; restore it with git checkout -- .mc17/wave.json"


def committed_lock(root):
    """The lock as the last commit of the checkout `root` holds it, read with git show HEAD:.mc17/wave.json, as a dict, or
    None where no commit holds it or it is no JSON object."""
    try:
        r = subprocess.run(["git", "-C", root, "show", "HEAD:.mc17/wave.json"], capture_output=True, text=True, encoding="utf-8", timeout=10)
    except Exception:
        return None
    if r.returncode != 0:
        return None
    try:
        lock = json.loads(r.stdout)
    except Exception:
        return None
    return lock if isinstance(lock, dict) else None


def returns_under(value, work):
    """Whether each path of the fact Returns: `value` stands under the folder `work`: it opens with the folder and a slash,
    and no segment after the folder reads ..; False where `work` is None."""
    if not work:
        return False
    for p in value.split(", "):
        if not p.startswith(work + "/") or ".." in p[len(work) + 1:].split("/"):
            return False
    return True


def brief_text(path):
    """The text of the brief file `path`, read as bytes and decoded as UTF-8, or None where it does not stand or does not
    decode."""
    try:
        with open(path, "rb") as fh:
            return fh.read().decode("utf-8")
    except Exception:
        return None


def ruled_brief(root, prompt):
    """The reading of the brief of an agent start in the checkout `root` of a wave run by hand: None where neither the
    committed lock nor the working tree's carries handPrompts; else (reason, reading): the reason the start is refused, or
    None, and what the entries record of it, the brief's path, the digests of its whole file and of its ruled part, the
    member, the role, the lens and the facts lines."""
    tree = lock_at(root)
    committed = committed_lock(root)
    tree_has = isinstance(tree, dict) and "handPrompts" in tree
    com_has = isinstance(committed, dict) and "handPrompts" in committed
    if not tree_has and not com_has:
        return None
    reading = {"brief": None, "briefSha": None, "ruledSha": None, "member": None, "role": None, "lens": None, "facts": []}
    if committed is None or (tree or {}).get("handPrompts") != committed.get("handPrompts"):
        return LOCK_DIFFERS, reading
    entries = [e for e in (committed.get("handPrompts") or []) if isinstance(e, dict)]
    m = POINTER_RE.match(prompt or "")
    if not m:
        return "the prompt is not the one line that names a brief", reading
    path = m.group(1)
    reading["brief"] = path
    text = brief_text(path)
    if text is None:
        return "the file %s does not stand or does not read as UTF-8" % path, reading
    reading["briefSha"] = digest_of(text)
    at = text.find("\n" + FACTS_LINE + "\n")
    head = text if at < 0 else text[:at + 1]
    facts = [] if at < 0 else [l for l in text[at + len(FACTS_LINE) + 2:].split("\n") if l.strip()]
    reading["ruledSha"] = digest_of(head)
    shas = [e.get("sha") for e in entries]
    if digest_of(head) not in shas:
        return "the text of %s before its facts is no start text of the lock" % path, reading
    entry = entries[shas.index(digest_of(head))]
    reading.update({"member": entry.get("member"), "role": entry.get("role"), "lens": entry.get("lens")})
    lenses = [e.get("lens") for e in entries if e.get("lens")]
    found = RETURNS_FOLDER_RE.search(head)
    work = found.group(1) if found else None
    seen = []
    for k, line in enumerate(facts, 1):
        label = next((x for x in FACT_FORMS if line.startswith(x + " ")), None)
        if label is None:
            return "the facts line %d, %s, stands under no label" % (k, line), reading
        elif label in seen:
            return "the facts line %d names %s a second time" % (k, label), reading
        elif not FACT_FORMS[label](line[len(label) + 1:], lenses):
            return "the facts line %d carries a value outside the form of %s" % (k, label), reading
        elif label == "Returns:" and not returns_under(line[len(label) + 1:], work):
            return "the facts line %d carries a value outside the form of %s" % (k, label), reading
        seen.append(label)
    reading["facts"] = facts
    return None, reading


def brief_refusal(on, ruled):
    """The refusal of an agent start whose brief is no start text the lock rules, naming the reason, the brief, the wave and
    the steps owed."""
    reason, reading = ruled
    return "\n".join([
        "This Agent call starts an agent in the wave %s, which runs by hand, and its brief is no start text the lock rules: %s." % (on.get("wave") or "?", reason),
        "",
        "Brief : %s" % (reading.get("brief") or "none"),
        "Wave  : %s, read from %s" % (on.get("wave") or "?", on.get("how") or "?"),
        "",
        "The steps owed, each as a command of its own before the start:",
        "  mc17 wave prompts --start {IP id} --role {build | review | fix | rereview} [--lens {name}] --plan {the ruled Wave Plan} [--facts {file}] --out {file}",
        "  mc17 converge evaluate --point heavy-run --agent-prompt {file}.start --workdir {the agent's folder} --manifest {the Manifest} --ledger {the ledger}",
        "Then start the agent with the whole text that {file}.start holds, its last newline included.",
    ])


def scope_of(wave):
    """The scope of a Wave Plan's name, WAVE-PLAN-{SCOPE}-{NNN}, or None."""
    m = re.match(r"^WAVE-PLAN-([A-Z0-9]+(?:-[A-Z0-9]+)*)-\d{3}$", str(wave or ""))
    return m.group(1) if m else None


def stores():
    """Each store under the store root, as (scope, folder), where store.json stands."""
    out = []
    if not os.path.isdir(STORE_ROOT):
        return out
    for scope in sorted(os.listdir(STORE_ROOT)):
        d = os.path.join(STORE_ROOT, scope)
        if os.path.isfile(os.path.join(d, "store.json")):
            out.append((scope, d))
    return out


def registry_of(store_dir):
    """The wave entries of the store's hand.json, in their order; none where the file does not stand."""
    f = os.path.join(store_dir, "hand.json")
    if not os.path.exists(f):
        return []
    reg = read_json(f)
    return list(reg.get("waves") or []) if isinstance(reg, dict) else []


def entry_of(store_dir, wave):
    """The registry entry of `wave` in the store, or None."""
    for e in registry_of(store_dir):
        if e.get("wave") == wave:
            return e
    return None


def same_or_under(d, folder):
    a = os.path.normcase(os.path.normpath(os.path.abspath(d)))
    b = os.path.normcase(os.path.normpath(os.path.abspath(folder)))
    return a == b or a.startswith(b + os.sep)


def entry_active(entry):
    """Whether a registry entry is active: the lock in its checkout stands, reads mode hand and names its wave."""
    checkout = entry.get("checkout")
    if not checkout:
        return False
    lock = hand_lock(checkout)
    return lock is not None and lock.get("wavePlanName") == entry.get("wave")


def posix_under(d, folder):
    """Whether the POSIX folder `d` is `folder` or stands under it, compared as text after normalisation."""
    a, b = posixpath.normpath(d), posixpath.normpath(folder)
    return a == b or a.startswith(b.rstrip("/") + "/")


def wave_for_remote(host, d, command):
    """The wave run by hand that a start on the host `host` in the folder `d` there belongs to, as wave_for answers it: the
    active registry entry of a store under the store root whose remote checkouts list that host, written as the target is
    written, with a path at or above `d`; else None. Where an active entry lists the host and no path of it holds the
    folder, the start is written, with its command, to the journal."""
    listed = False
    for scope, folder in stores():
        for wave_entry in registry_of(folder):
            if not entry_active(wave_entry):
                continue
            for r in wave_entry.get("remotes") or []:
                if not isinstance(r, dict) or r.get("host") != host:
                    continue
                listed = True
                if d and r.get("path") and posix_under(d, r.get("path")):
                    return {"wave": wave_entry.get("wave"), "scope": scope, "checkout": wave_entry.get("checkout"), "manifest": wave_entry.get("manifest"),
                            "ledger": wave_entry.get("ledger"), "how": "the remote checkout %s:%s that the registry %s lists" % (host, r.get("path"), os.path.join(folder, "hand.json"))}
    if listed:
        journal("[%s] the heavy-run hook read a start on %s, a host a wave run by hand lists, in the folder %s, which no listed path holds: %s"
                % (PLUGIN, host, d or "it could not place", snip(command or "", 400)))
    return None


def hand_wave_here(cwd):
    """Whether a wave run by hand stands on this host: the folder `cwd` lies in one, or the registry of a store under the
    store root lists an active wave."""
    if cwd and wave_for(cwd):
        return True
    return any(entry_active(e) for scope, store_dir in stores() for e in registry_of(store_dir))


def wave_for(d):
    """The wave run by hand the directory `d` belongs to, as { wave, scope, checkout, manifest, ledger, how }, or None:
    the lock of the checkout that holds `d` where it reads mode hand, else the active registry entry of a store under
    the store root whose checkout or agent's path holds `d`."""
    if not d:
        return None
    root = checkout_root(d)
    if root:
        lock = hand_lock(root)
        if lock:
            wave = lock.get("wavePlanName") or lock.get("wavePlan")
            scope = scope_of(wave)
            entry = entry_of(os.path.join(STORE_ROOT, scope), wave) if scope else None
            return {"wave": wave, "scope": scope, "checkout": root, "manifest": (entry or {}).get("manifest"), "ledger": (entry or {}).get("ledger"), "how": "the lock in " + root}
    for scope, store_dir in stores():
        for entry in registry_of(store_dir):
            if not entry_active(entry):
                continue
            paths = [entry.get("checkout")] + [a.get("path") for a in (entry.get("agents") or []) if isinstance(a, dict)]
            if any(p and same_or_under(d, p) for p in paths):
                return {"wave": entry.get("wave"), "scope": scope, "checkout": entry.get("checkout"), "manifest": entry.get("manifest"), "ledger": entry.get("ledger"), "how": "the registry " + os.path.join(store_dir, "hand.json")}
    return None


# --- the entries ---------------------------------------------------------------------------------

def starts_file(store_dir):
    return os.path.join(store_dir, "starts.jsonl")


def decided_file(store_dir):
    return os.path.join(store_dir, "decided.jsonl")


def ends_file(store_dir):
    return os.path.join(store_dir, "ends.jsonl")


def entries_of(store_dir):
    """The start entries of the store, in the order of their first lines, each folded from its lines: the fields of its
    first line, `used` (its used line or None), `agentId`, `endedAt`, `state`, the state its lines leave it in, and the
    fields delegation, hostPart, wait and held of the latest line that carries each."""
    by_id = {}
    order = []
    for l in jsonl(starts_file(store_dir)):
        eid = l.get("id")
        if not eid:
            continue
        if eid not in by_id:
            by_id[eid] = dict(l)
            by_id[eid].update({"used": None, "agentId": None, "endedAt": None})
            order.append(eid)
        e = by_id[eid]
        state = l.get("state")
        if state == "used":
            e["used"] = l
            e["state"] = "used"
        elif state == "launched":
            e["agentId"] = l.get("agentId")
        elif state == "ended":
            e["endedAt"] = l.get("at")
            e["state"] = "ended"
        elif state:
            e["state"] = state
        for k in ("delegation", "hostPart", "wait", "held"):
            if k in l:
                e[k] = l[k]
    return [by_id[i] for i in order]


def deciding_entry(entries, key, taken, digest=None):
    """The entry that decides a start under `key`: the newest entry under the key whose id is not in `taken`, passing over
    each entry a start used, each that ended with no field held, and, for an agent start whose prompt digest is `digest`,
    each entry whose prompt digest differs, open, admitted or held; an open entry, an admitted one or a held one, else None."""
    for e in reversed(entries):
        if e.get("key") != key or e.get("id") in taken:
            continue
        if e.get("used") or (e.get("state") == "ended" and not e.get("held")):
            continue
        if digest is not None and e.get("state") in ("admitted", "ended") and e.get("promptDigest") != digest:
            continue
        if digest is not None and e.get("state") == "open" and e.get("promptDigest") != digest:
            continue
        if e.get("state") in ("open", "admitted") or e.get("held"):
            return e
    return None


def agent_entries():
    """Every agent entry of every store under the store root, in any state, the oldest first by the time of its first
    line, as entries_of folds them."""
    out = []
    for scope, store_dir in stores():
        for e in entries_of(store_dir):
            if e.get("tableId") == "agent":
                out.append(e)
    return sorted(out, key=lambda e: str(e.get("at") or ""))


def agent_entry(prompt):
    """The newest agent entry of every store whose prompt digest equals the digest of `prompt`, in any state, or None."""
    want = digest_of(prompt)
    found = [e for e in agent_entries() if e.get("promptDigest") == want]
    return found[-1] if found else None


def ended_agents(store_dir):
    return {l.get("agentId") for l in jsonl(ends_file(store_dir))}


def ended(store_dir, eid):
    append_line(starts_file(store_dir), {"id": eid, "state": "ended", "at": now()})


def end_refused(store_dir, entry, why):
    """Writes the line ended on an admitted entry the hook refused, with a field held naming the refusal, so no later start
    runs on it."""
    append_line(starts_file(store_dir), {"id": entry["id"], "state": "ended", "at": now(),
                                         "held": {"operation": entry.get("operation"), "refusal": "the heavy-run hook", "reason": why[1], "owed": OWED}})


def operation_action(store_dir, operation):
    """The action the proposal file of `operation` names in the store, or None where none can be read."""
    try:
        kept = read_json(os.path.join(store_dir, "proposals", str(operation) + ".json"))
        return (kept.get("proposal") or {}).get("action")
    except Exception:
        return None


# --- the reading of the host at an admitted start ----------------------------------------------------------------------

def load_client():
    """hooks/mc17_client.py beside this file, loaded by its path: how a hook calls the plugin's own client."""
    spec = importlib.util.spec_from_file_location("mc17_client_heavy", os.path.join(HERE, "mc17_client.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CLIENT = None


def client():
    global CLIENT
    if CLIENT is None:
        CLIENT = load_client()
    return CLIENT


def host_reading(scope):
    """The host's reading at an admitted start, as { reading, failed, late }: what client/mc17 converge host --scope
    {scope} --json prints, which the client answers on the computer and sends nowhere, within the client's bound. `failed`
    names what failed where no reading stands, and `late` reads true where the client did not answer within its bound."""
    r = client().call(["converge", "host", "--scope", str(scope), "--json"])
    if r["late"]:
        return {"reading": None, "failed": None, "late": True}
    if r["failed"]:
        return {"reading": None, "failed": r["failed"], "late": False}
    reading = r["line"]
    if reading is None:
        return {"reading": None, "failed": "mc17 converge host exited %s and printed no reading: %s" % (r["exit"], snip((r["stdout"] or r["stderr"] or "").strip(), 200)), "late": False}
    if reading.get("ok") is not True:
        return {"reading": None, "failed": "mc17 converge host read the host only in part: %s" % snip(json.dumps(reading), 200), "late": False}
    return {"reading": reading, "failed": None, "late": False}


def admitted_by_client(s, entry, store_dir, command, on):
    """None where client/mc17 decision admit admits the entry's signed decision for this start, else the words of the
    refusal (ARCH D15, D20): any exit but 0, a line that does not read or reads no admission, and a client that has not
    answered within its bound. The command digest is the sha256 of the whole command line, or of the agent's prompt."""
    text = s["text"] if s.get("agent") else (command or s["text"])
    digest = hashlib.sha256(str(text).encode("utf-8")).hexdigest()
    args = ["decision", "admit", "--store", store_dir, "--entry", entry["id"], "--command-digest", digest]
    if s.get("agent"):
        args += ["--prompt-digest", digest]
    r = client().call(args, cwd=on.get("checkout") or None)
    why = client().why_refused(r, "mc17 decision admit")
    if why:
        return why
    if r["line"].get("admitted") is not True:
        return "the client did not admit the decision: " + str(r["line"].get("why") or "no reason given")
    return None


def client_refusal(s, on, store_dir, entry, why, command):
    return "\n".join([
        "This %s call starts a heavy run, %s under the key %s, in a checkout of the wave %s, and its start entry %s was not admitted by the plugin's client: %s."
        % (TOOL or "tool", s["tableId"], s["key"], on.get("wave") or "?", entry.get("id"), why),
        "",
        "Store : " + store_dir,
        "",
        "A start runs only under a decision the engine signed, which the client checks against this computer and reports to DevyonQ once (D15). "
        "Where DevyonQ cannot be reached, the start waits until it can. Where the decision does not fit this start, the step owed, as a command of its own before the run:",
        "  " + owed_line(s, on, command),
    ])


def delegated_refusal(on, entry):
    """Why an admitted start may not run now, as (kind, words), or None where the reading of the host shows the entry's
    host's part and its wait condition holds: the running set empty and the flag busy false."""
    got = host_reading(on.get("scope"))
    if got["late"]:
        return ("late", "the reading of the host through client/mc17 converge host ran past the client's bound of %d seconds" % client().bound())
    if got["failed"]:
        return ("failed", "the reading of the host failed: " + got["failed"])
    reading = got["reading"]
    if reading.get("hostPart") != entry.get("hostPart"):
        return ("moved", "the reading of mc17 converge host shows the host's part moved from %s to %s" % (json.dumps(entry.get("hostPart"), sort_keys=True), json.dumps(reading.get("hostPart"), sort_keys=True)))
    if reading.get("running"):
        return ("wait", "the wait condition fails: the running set holds " + ", ".join("%s on %s" % (r.get("tableId"), r.get("host")) for r in reading.get("running") if isinstance(r, dict)))
    if reading.get("busy") is not False:
        return ("wait", "the wait condition fails: the flag busy reads " + json.dumps(reading.get("busy")))
    return None


def launched(store_dir, e, agent_id):
    """Writes the agent's id on the used entry `e`; where an end line already names that id, the entry ends too."""
    append_line(starts_file(store_dir), {"id": e["id"], "state": "launched", "at": now(), "agentId": agent_id})
    if agent_id in ended_agents(store_dir):
        ended(store_dir, e["id"])


# --- the refusals ---------------------------------------------------------------------------------

def owed_line(s, on, command):
    manifest = on.get("manifest") or "{the Manifest}"
    ledger = on.get("ledger") or "{the ledger}"
    if s.get("agent"):
        return OWED + " --agent-prompt {the file that holds the prompt} --workdir {the folder the agent works in} --manifest %s --ledger %s" % (manifest, ledger)
    return OWED + ' --bash "%s" --manifest %s --ledger %s' % (str(command or s["text"]).replace('"', '\\"'), manifest, ledger)


def agent_refusal(s, on, store_dir, command):
    """The refusal of an agent start for whose prompt no open start entry was made: the start, its wave and store, the call
    owed, and the two causes that give a prompt another digest than the file the call read."""
    return "\n".join([
        "This %s call starts a heavy run, %s under the key %s, in a checkout of the wave %s, which runs by hand, and no open start entry of the module's store was made for its prompt."
        % (TOOL or "tool", s["tableId"], s["key"], on.get("wave") or "?"),
        "",
        "Start : an agent start, prompt " + digest_of(s["text"]),
        "Wave  : %s, read from %s" % (on.get("wave") or "?", on.get("how")),
        "Store : " + store_dir,
        "",
        "The step owed, as a command of its own before the start:",
        "  " + owed_line(s, on, command),
        "The call and the start carry the same text byte for byte: the hook compares the digest of the prompt it sees with the digest of the file the call read, "
        "so a byte order mark or a carriage return that the file keeps and the start lacks gives another digest. Where the wave's lock carries handPrompts, "
        "make the entry over {brief}.start, which mc17 wave prompts --start writes, and start the agent with the whole text that file holds, its last newline included.",
    ])


def refusal(s, on, store_dir, command):
    if s.get("agent"):
        return agent_refusal(s, on, store_dir, command)
    return "\n".join([
        "This %s call starts a heavy run, %s under the key %s, in a checkout of the wave %s, which runs by hand, and no open start entry of the module's store admits it."
        % (TOOL or "tool", s["tableId"], s["key"], on.get("wave") or "?"),
        "",
        "Start : " + ("an agent start, prompt " + digest_of(s["text"]) if s.get("agent") else snip(s["text"], 400)),
        "Wave  : %s, read from %s" % (on.get("wave") or "?", on.get("how")),
        "Store : " + store_dir,
        "",
        "The step owed, as a command of its own before the run:",
        "  " + owed_line(s, on, command),
        "Read the proposal, decide, and then run the start as written. A command line that holds the call and the start together meets this refusal, "
        "because the entry does not stand when the hook reads the line. The call records the module's proposal; the session decides.",
    ])


def held_refusal(s, on, store_dir, entry, command):
    held = entry.get("held") or {}
    return "\n".join([
        "This %s call starts a heavy run, %s under the key %s, in a checkout of the wave %s, and its start entry %s stands held by the decision %s: its action %s takes the route %s, and %s."
        % (TOOL or "tool", s["tableId"], s["key"], on.get("wave") or "?", entry.get("id"), held.get("operation") or entry.get("operation") or "?", held.get("action") or "?", held.get("route") or "?", held.get("reason") or "no reason is written"),
        "",
        "Store : " + store_dir,
        "",
        "The step owed, as a command of its own before the run:",
        "  " + owed_line(s, on, command),
    ])


def admitted_refusal(s, on, store_dir, entry, why, command):
    return "\n".join([
        "This %s call starts a heavy run, %s under the key %s, in a checkout of the wave %s, whose start entry %s the executor admitted under the delegation record %s, and the hook refused the start: %s. The hook ended the entry, so no later start runs on it."
        % (TOOL or "tool", s["tableId"], s["key"], on.get("wave") or "?", entry.get("id"), entry.get("delegation"), why[1]),
        "",
        "Store : " + store_dir,
        "",
        "The step owed, as a command of its own before the run:",
        "  " + owed_line(s, on, command),
    ])


def two_refusal(s, entry, count):
    return ("This %s call holds %d heavy runs, and the start entry %s of %s stands admitted under the delegation record %s; one delegated start runs per command, "
            "so no second run can start beside it before a reading of the host counts the first. Run the start of %s as a command of its own."
            % (TOOL or "tool", count, entry.get("id"), s["key"], entry.get("delegation"), s["key"]))


def no_store_refusal(s, on, store_dir):
    scope = on.get("scope") or "?"
    return "\n".join([
        "This %s call starts a heavy run, %s under the key %s, in a checkout of the wave %s, which runs by hand, and no store of %s stands on this host at %s."
        % (TOOL or "tool", s["tableId"], s["key"], on.get("wave") or "?", scope, store_dir or "no folder"),
        "",
        "Two ways on: run the start from the home host, the host that holds the store of %s; or make the store once with" % scope,
        "  mc17 converge init --scope %s" % scope,
        "where this host is to be the home host. The hook admits a start only through an entry of that store.",
    ])


# --- the events ---------------------------------------------------------------------------------

def admit(data, starts, command):
    """Admits every start of the call, or denies the call: the entry deciding_entry finds under each start's key in the
    store of its wave decides it, an admitted entry only after delegated_refusal reads the host, and the entries are marked
    used, with a deciding entry each, only once every start has one. An admitted entry the hook refuses ends first; a call
    that holds two or more heavy runs and meets an admitted entry is refused whole."""
    plan = []
    for s in starts:
        on = wave_for_remote(s["host"], s.get("remoteDir"), command) if s.get("host") != "local" else None
        on = on or wave_for(s.get("dir") or data.get("cwd"))
        if on:
            plan.append((s, on))
    if not plan:
        allow()
    taken = set()
    writes = []
    for s, on in plan:
        scope = on.get("scope")
        store_dir = os.path.join(STORE_ROOT, scope) if scope else None
        if not store_dir or not os.path.isfile(os.path.join(store_dir, "store.json")):
            deny(no_store_refusal(s, on, store_dir))
        if s.get("agent"):
            ruled = ruled_brief(on.get("checkout"), s.get("text"))
            if ruled is not None and ruled[0]:
                deny(brief_refusal(on, ruled))
            s["brief"] = ruled[1] if ruled is not None else None
        entry = deciding_entry(entries_of(store_dir), s["key"], taken, digest_of(s["text"]) if s.get("agent") else None)
        if entry is None:
            deny(refusal(s, on, store_dir, command))
        if entry.get("held") and entry.get("state") == "ended":
            deny(held_refusal(s, on, store_dir, entry, command))
        if entry.get("state") == "admitted":
            if len(starts) > 1:
                deny(two_refusal(s, entry, len(starts)))
            why = delegated_refusal(on, entry)
            if why:
                end_refused(store_dir, entry, why)
                if why[0] in ("failed", "late"):
                    journal("[%s] %s" % (PLUGIN, why[1]))
                deny(admitted_refusal(s, on, store_dir, entry, why, command))
        taken.add(entry["id"])
        writes.append((s, store_dir, entry))
    # Every entry admits its start only through the client, which checks the signed decision and reports the start (D15).
    for s, store_dir, entry in writes:
        on = next(o for x, o in plan if x is s)
        why = admitted_by_client(s, entry, store_dir, command, on)
        if why:
            deny(client_refusal(s, on, store_dir, entry, why, command))
    agent_id = data.get("agent_id")
    agent = {"id": agent_id, "type": data.get("agent_type")} if agent_id else None
    for s, store_dir, entry in writes:
        delegated = entry.get("state") == "admitted"
        by = "executor" if delegated else ("agent" if agent_id else "session")
        saw = digest_of(s["text"])
        at = now()
        used = {"id": entry["id"], "state": "used", "at": at, "saw": saw, "text": None if s.get("agent") else snip(s["text"], 400),
                "toolUseId": data.get("tool_use_id"), "background": (data.get("tool_input") or {}).get("run_in_background") is True, "by": by}
        used.update({"brief": s["brief"]} if s.get("brief") else {})
        if delegated:
            used["delegation"] = entry.get("delegation")
        append_line(starts_file(store_dir), used)
        decided = {"entry": entry["id"], "key": s["key"], "by": by, "at": at, "saw": saw, "session": data.get("session_id"), "agent": agent}
        decided.update({"brief": s["brief"]} if s.get("brief") else {})
        if delegated:
            decided.update({"delegation": entry.get("delegation"), "action": operation_action(store_dir, entry.get("operation"))})
        append_line(decided_file(store_dir), decided)


def end_of_call(data):
    """At PostToolUse: the used entry that carries the call's tool_use_id ends, unless the command ran in the background;
    for an Agent call the agent's id is written on the entry, which ends only through its SubagentStop. An input with no
    tool_use_id ends nothing. The agent's id is read only from a tool response that is an object; a response that is text,
    as a host may hand the result of its subagent tool, marks nothing."""
    tool_use_id = data.get("tool_use_id")
    if not tool_use_id:
        return
    tool = data.get("tool_name")
    for scope, store_dir in stores():
        for e in entries_of(store_dir):
            used = e.get("used")
            if not used or used.get("toolUseId") != tool_use_id or e.get("endedAt"):
                continue
            if tool == "Agent":
                response = data.get("tool_response")
                agent_id = response.get("agentId") if isinstance(response, dict) else None
                if agent_id:
                    launched(store_dir, e, agent_id)
            elif used.get("background") is True:
                continue
            else:
                ended(store_dir, e["id"])


def end_of_agent(data):
    """At SubagentStop: an end line for the agent, and the end of the used entry that carries its id, in either order
    of the two events."""
    agent_id = data.get("agent_id")
    if not agent_id:
        return
    for scope, store_dir in stores():
        append_line(ends_file(store_dir), {"agentId": agent_id, "at": now(), "session": data.get("session_id")})
        for e in entries_of(store_dir):
            if e.get("agentId") == agent_id and not e.get("endedAt"):
                ended(store_dir, e["id"])


def key_form():
    """Reads { "commands": [...] } on stdin and prints { "starts": [[{ tableId, host, key }, ...], ...] }, one list per
    command, in order; exits 1 with { "error" } on stdout where the input is no such object."""
    global BR
    try:
        data = json.loads(sys.stdin.buffer.read().decode("utf-8"))
        commands = data.get("commands") if isinstance(data, dict) else None
        if not isinstance(commands, list):
            raise ValueError('--key reads { "commands": [...] } on stdin')
        BR = load_branch_hook()
        entries = table()
        out = []
        for c in commands:
            starts = starts_in(str(c), None, entries, follow=False)
            out.append([{"tableId": s["tableId"], "host": s["host"], "key": s["key"]} for s in starts])
        print(json.dumps({"starts": out}))
        sys.exit(0)
    except SystemExit:
        raise
    except Exception as e:
        print(json.dumps({"error": "%s: %s" % (type(e).__name__, str(e)[:200])}))
        sys.exit(1)


def main():
    """Reads one hook input as JSON on stdin and acts by its event: at PreToolUse prints the verdict as JSON on stdout and
    exits 0; at the end events marks the ends and prints nothing. On an error of its own it allows the call and journals
    that it did; at an end event it journals alone."""
    global TOOL, BR
    if "--key" in sys.argv[1:]:
        key_form()
    try:
        data = json.loads(sys.stdin.buffer.read().decode("utf-8"))
        if not isinstance(data, dict):
            raise ValueError("the input is no JSON object")
    except Exception as e:
        allow("the heavy-run hook could not parse its input (%s), so it read nothing" % type(e).__name__)
    TOOL = data.get("tool_name") or None
    event = data.get("hook_event_name") or "PreToolUse"
    try:
        refused = agent_credentials_named(data)
        if refused:
            deny(refused)
        refused = agent_settings_read(data)
        if refused:
            deny(refused)
        BR = load_branch_hook()
        entries = table()
        if event == "PostToolUse":
            end_of_call(data)
            sys.exit(0)
        if event == "SubagentStop":
            end_of_agent(data)
            sys.exit(0)
        tool = data.get("tool_name") or ""
        ti = data.get("tool_input") or {}
        starts = []
        command = None
        if tool in ("Bash", "PowerShell"):
            command = ti.get("command")
            if isinstance(command, str) and command:
                unplaced = []
                starts = starts_in(command, data.get("cwd"), entries, unplaced=unplaced)
                if unplaced and hand_wave_here(data.get("cwd")):
                    for words in unplaced:
                        journal("[%s] the heavy-run hook could not place the folder of `%s`, so a start after it in this %s call is judged in the call's folder %s: %s"
                                % (PLUGIN, words, tool, data.get("cwd"), snip(command, 400)))
        else:
            starts = tool_starts(tool, entries, ti.get("prompt"), data.get("cwd"))
            for s in starts:
                found = agent_entry(s["text"])
                if found is None:
                    continue
                s["dir"] = found.get("workdir") or s["dir"]
        if not starts:
            allow()
        admit(data, starts, command)
        allow()
    except SystemExit:
        raise
    except Exception as e:
        note = "the heavy-run hook raised %s (%s) while reading this call, so it judged the call by nothing" % (type(e).__name__, str(e)[:120])
        if event in END_EVENTS:
            journal("[%s] %s" % (PLUGIN, note))
            sys.exit(0)
        allow(note)


# The words that together, anywhere in an agent's call and in any letter case, run the hook's read: mc17, and --hook or
# --measure.
SETTINGS_PROGRAM_RE = re.compile(r"mc17", re.I)
SETTINGS_READ_FLAG_RE = re.compile(r"--(?:hook|measure)", re.I)
# The marks a shell takes out of a word: the quote marks, the backslash and the backtick.
SHELL_MARKS_RE = re.compile(r"[\"'\\`]")
# The folder of the person's credentials, named in any letter case.
CREDENTIALS_FOLDER_RE = re.compile(r"\.canonq", re.I)
# The words of the refusal of an agent's read of the person's settings.
SETTINGS_REFUSAL = ("The heavy-run hook refused this agent's call: its text holds mc17 with --hook or --measure, or names the folder .canonq, "
                    "which holds the person's token. The session runs that read itself; an agent reads the folder its brief hands it.")


def agent_credentials_named(data):
    """The refusal where an agent's Bash or PowerShell call at PreToolUse names the folder .canonq in any letter case; None
    for a call with no agent_id, another tool, another event or an empty command. It searches the text with the shell's
    marks taken out, as agent_settings_read does. It reads no other file."""
    if not data.get("agent_id") or data.get("tool_name") not in ("Bash", "PowerShell"):
        return None
    if (data.get("hook_event_name") or "PreToolUse") != "PreToolUse":
        return None
    command = (data.get("tool_input") or {}).get("command")
    if not isinstance(command, str) or not command:
        return None
    command = SHELL_MARKS_RE.sub("", command)
    return SETTINGS_REFUSAL if CREDENTIALS_FOLDER_RE.search(command) else None


def agent_settings_read(data):
    """The refusal where an agent's Bash or PowerShell call holds mc17, and --hook or --measure, anywhere in its whole text and
    in any letter case: inside a script, a quoted word or a continued line too; None at another event than PreToolUse, and
    for a call with no agent_id, another tool or an empty command. It searches the text with the shell's marks taken out: a
    word with no mark in it stands there as in the text, and a word the marks split stands joined. It reads no other file."""
    if (data.get("hook_event_name") or "PreToolUse") != "PreToolUse":
        return None
    if not data.get("agent_id") or data.get("tool_name") not in ("Bash", "PowerShell"):
        return None
    command = (data.get("tool_input") or {}).get("command")
    if not isinstance(command, str) or not command:
        return None
    command = SHELL_MARKS_RE.sub("", command)
    return SETTINGS_REFUSAL if SETTINGS_PROGRAM_RE.search(command) and SETTINGS_READ_FLAG_RE.search(command) else None


if __name__ == "__main__":
    main()

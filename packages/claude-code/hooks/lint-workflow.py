#!/usr/bin/env python3
"""Refuse a Workflow tool call whose script reaches an agent outside a verified sanctioned block, or that does not
match the ruled Wave Plan and the lock committed on its branch.

A PreToolUse hook for the Workflow tool. It reads the call from stdin, reads the lock committed at HEAD of the
repository that holds the call's working directory, runs `mc17 lint` over the script against that lock through the plugin's own client, and denies the
call on a violation, naming each one. For a script that carries the sanctioned block or runs stages, it denies a
working tree whose lock differs from the committed copy; it denies a script that runs stages where no lock is
committed. Where the script carries the sanctioned block's begin marker, it denies a launch it cannot judge (a missing
client, a DevyonQ it cannot reach, a client past its bound, lint output it cannot parse, its own error) and names the cause; a script without the marker is
allowed in those cases, with a line saying the script was not read. A named workflow or a resume carries no script
and is allowed.
"""
import json, os, subprocess, sys, tempfile

PLUGIN = "devyonq-mc"

# The sanctioned block's begin marker. A script that carries it is a fleet script, which this hook never lets through
# unread.
MARK = "[SANCTIONED-BLOCK " + "BEGIN v1]"
LOCK_PATH = ".mc17/wave.json"      # forward slashes: the form `git show <ref>:<path>` takes
GIT_SECONDS = 3                    # each git call's own limit; the three calls take at most nine seconds

def load_client():
    """hooks/mc17_client.py beside this file, as every package holds it, loaded by its path: how a hook calls the
    plugin's own client at client/mc17, two levels above the hook (ARCH D20, D23)."""
    import importlib.util
    spec = importlib.util.spec_from_file_location("mc17_client_workflow", os.path.join(os.path.dirname(os.path.abspath(__file__)), "mc17_client.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def allow(note=None, judged=False):
    """Allows the call and exits 0. A note, where given, is printed on stdout as a systemMessage and on
    stderr, and appended to the gate journal (MC17_GATE_JOURNAL, or ~/.mc17/gate-journal.log).

    `judged` says the lint read the script, and the line says so; otherwise the line says the script
    was not read. A note carries no permission decision, so the call still takes whatever approval it
    would take with no hook installed.
    """
    if note:
        line = (("[%s] the workflow gate READ this script and allowed the launch: %s"
                 % (PLUGIN, note)) if judged else
                ("[%s] the workflow gate allowed this launch WITHOUT READING IT: %s"
                 % (PLUGIN, note)))
        try:
            import datetime
            j = os.environ.get("MC17_GATE_JOURNAL") or os.path.expanduser("~/.mc17/gate-journal.log")
            os.makedirs(os.path.dirname(j), exist_ok=True)
            with open(j, "a", encoding="utf-8") as fh:
                fh.write(datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                         + " [" + os.path.abspath(__file__) + "] " + line + "\n")
        except Exception:
            pass
        # Printed on both streams because a client may surface only one of them.
        print(json.dumps({"systemMessage": line, "additionalContext": allow_copy("context", line)}))
        print(line, file=sys.stderr)
    sys.exit(0)

def allow_copy(tag, message):
    """The allow note as channel `tag` carries it: an opening line saying the agent was spawned, then `message`."""
    return ("[%s %s] the workflow gate allowed this Workflow call, and the agent was spawned.\n\n%s"
            % (PLUGIN, tag, message))

def channel_copy(tag, message):
    """The refusal as channel `tag` carries it: an opening line saying the call was refused and no agent
    was spawned, then `message`. Each channel carries its own tag so a reader can tell which one delivered.
    """
    return ("[%s %s] the workflow gate refused this Workflow call, and no agent was spawned.\n\n%s"
            % (PLUGIN, tag, message))

def block_note(stdout):
    """The note the lint returns beside a clean exit, or None.

    Reads `blockNote` as a string, or `notes` as a list of strings or of objects with a `detail`, and
    joins every readable one with " | ". No shape raises: unreadable output answers None.
    """
    try:
        d = json.loads(stdout)
    except Exception:
        return None
    if not isinstance(d, dict):
        return None
    one = d.get("blockNote")
    if isinstance(one, str) and one.strip():
        return one.strip()
    notes = d.get("notes")
    read = []
    if isinstance(notes, list):
        for n in notes:
            if isinstance(n, str) and n.strip():
                read.append(n.strip())
            elif isinstance(n, dict):
                detail = n.get("detail")
                if isinstance(detail, str) and detail.strip():
                    read.append(detail.strip())
    return " | ".join(read) if read else None

def snip(text, cap):
    """`text` cut to `cap` characters on a word boundary, with a marker appended; `text` itself when it fits."""
    if len(text) <= cap:
        return text
    head = text[:cap]
    space = head.rfind(" ")
    if space > cap // 2:
        head = head[:space]
    return head.rstrip() + " [...cut, run the command below for the whole finding]"

def deny(message):
    """Refuses the call: prints the deny decision with `message` on the reason, context and system
    channels, and exits 0.

    The reason and context fields both carry the message because the agent otherwise sees only the
    one line "Hook PreToolUse:Workflow denied this tool".
    """
    print(json.dumps({
        "hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
                               "permissionDecisionReason": channel_copy("reason", message)},
        "additionalContext": channel_copy("context", message),
        "systemMessage": message,
    }))
    sys.exit(0)

def unjudged(marked, cause):
    """A launch this hook cannot judge: denied where the script carries the block's begin marker, naming the cause,
    and allowed with a line saying the script was not read where it does not."""
    if marked:
        deny("The workflow gate cannot judge this launch: %s. The script carries the sanctioned block, so it is a "
             "fleet script, and a fleet script the gate cannot read against the lock on its branch does not launch."
             % cause)
    allow(cause + ", so this script was judged by nothing")

def git_out(args):
    """stdout of `git <args>` where it exited 0, else None. Raises where git cannot start or passes GIT_SECONDS."""
    r = subprocess.run(["git"] + list(args), capture_output=True, text=True, encoding="utf-8", timeout=GIT_SECONDS)
    return r.stdout if r.returncode == 0 else None

def read_file(path):
    """The text of the file at `path` with its line endings as they stand, or None where no file stands there."""
    if not path or not os.path.isfile(path):
        return None
    with open(path, "rb") as fh:
        return fh.read().decode("utf-8", errors="replace")

def lock_on_branch(cwd):
    """(root, branch, committed, tree, where) for the repository holding `cwd`: its top directory, its checked-out
    branch or None on a checkout of no branch, the lock committed at HEAD and the working tree's copy, each None where it
    does not stand, and a sentence saying where no repository holds `cwd`, or None."""
    if not cwd or not os.path.isdir(cwd):
        return None, None, None, None, "the call names no working directory that stands, so no repository holds it"
    top = git_out(["-C", cwd, "rev-parse", "--show-toplevel"])
    if not top:
        return None, None, None, None, "the working directory %s stands in no repository" % cwd
    root = top.strip()
    tree = read_file(os.path.join(root, ".mc17", "wave.json"))
    ref = git_out(["-C", root, "symbolic-ref", "--short", "HEAD"])
    committed = git_out(["-C", root, "show", "HEAD:%s" % LOCK_PATH])
    return root, ref.strip() if ref else None, committed, tree, None

def mismatch_refusal(differs, branch, repo):
    """The refusal of a working tree whose lock is not the lock committed at HEAD, naming how they differ and both
    places."""
    return ("The lock in the working tree does not match the lock committed on the branch: %s.\n\n"
            "Committed: %s:%s in %s\nWorking tree: %s\n\n"
            "The lock in force is the copy committed on the branch, which `mc17 wave lock` writes and `mc17 wave unlock` "
            "removes, each in a commit of its own. Restore the working tree's copy with `git checkout -- %s`."
            % (differs, branch or "HEAD", LOCK_PATH, repo, os.path.join(repo, ".mc17", "wave.json"), LOCK_PATH))

def lock_difference(committed, tree):
    """None where the committed lock and the working tree's copy are one lock, read as parsed JSON so that line endings
    and spacing make no difference, or where neither stands; otherwise a sentence saying how they differ."""
    if committed is None and tree is None:
        return None
    if committed is None:
        return "the working tree holds a lock that no commit on the branch holds"
    if tree is None:
        return "the branch holds a committed lock, and the working tree holds none"
    try:
        a, b = json.loads(committed), json.loads(tree)
        same = json.loads(committed) == json.loads(tree)
    except Exception as e:
        return "the two copies do not both read as JSON (%s)" % str(e)[:120]
    if same:
        return None
    fields = sorted(k for k in set(a) | set(b) if a.get(k) != b.get(k)) if isinstance(a, dict) and isinstance(b, dict) else []
    return "the working tree's copy differs from the committed copy in %s" % (", ".join(fields) or "its form")

def main():
    """Reads a PreToolUse call from stdin; for a Workflow call with a script, reads the lock committed at HEAD of the
    checkout the call's working directory stands in, runs `mc17 lint` on a temporary copy against that lock, and denies
    the call on a violation, printing each finding and how to sanction the script. Always exits 0.
    """
    try:
        data = json.load(sys.stdin)
    except Exception as e:
        allow("the hook input could not be parsed (%s), so nothing was read" % type(e).__name__)

    if data.get("tool_name") != "Workflow":
        allow()
    ti = data.get("tool_input") or {}
    script, origin = ti.get("script"), "the inline script"
    if not script:
        path = ti.get("scriptPath")
        if not path or not os.path.exists(path):
            allow()                  # a named workflow or a resume carries no script to read
        try:
            # Read as bytes and decoded with replacement, so a file in another encoding still yields text to read.
            with open(path, "rb") as fh:
                script, origin = fh.read().decode("utf-8", errors="replace"), path
        except Exception as e:
            deny("The workflow gate cannot open the script at %s (%s: %s), so it cannot tell whether the script "
                 "carries the sanctioned block, and it does not launch it." % (path, type(e).__name__, str(e)[:120]))
    marked = MARK in script

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    try:
        client = load_client()
    except Exception as e:
        unjudged(marked, "the plugin's client could not be loaded (%s), so the orchestration lint could not run" % type(e).__name__)
    mc17 = client.launcher()
    if not os.path.isfile(mc17):
        unjudged(marked, "the plugin holds no client at " + mc17 + ", so the orchestration lint could not run")
    # The script and the lock travel to the engine as files the client sends, so they stand in the client's temporary
    # folder, one of the places a file a command names may stand (D32), under the home the client reads.
    scratch = os.path.join(client.client_home(), ".mc17", "tmp")
    os.makedirs(scratch, exist_ok=True)

    tmp = copy = None
    try:
        try:
            repo, branch, committed, tree, where = lock_on_branch(data.get("cwd"))
        except Exception as e:
            # A fleet script is never read without its lock; any other script is linted as if no lock stood.
            if marked:
                raise
            repo = branch = committed = tree = None
            where = "the lock on the branch could not be read (%s)" % type(e).__name__
        # The working tree's lock is held to the committed one for a script that carries the block or runs stages: the
        # marked script here, the other once the lint has counted its stages.
        differs = lock_difference(committed, tree) if repo else None
        if differs and marked:
            deny(mismatch_refusal(differs, branch, repo))
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8", dir=scratch) as fh:
            fh.write(script); tmp = fh.name
        cmd = ["lint", "-f", tmp, "--json"]
        if committed is not None:
            with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8", dir=scratch) as fh:
                fh.write(committed); copy = fh.name
            cmd += ["--lock", copy]
        got = client.call(cmd, cwd=data.get("cwd"))
        if got["late"] or got["failed"]:
            # A client that hangs or does not run judges nothing, and a fleet script is never let through unread.
            unjudged(marked, client.why_refused(got, "mc17 lint"))
        r = subprocess.CompletedProcess(cmd, got["exit"], got["stdout"], got["stderr"])
        try:
            said = json.loads(r.stdout) or {}
        except Exception:
            said = None
        if not isinstance(said, dict):
            if r.returncode == 0 and not marked:
                allow(block_note(r.stdout), judged=True)
            unjudged(marked, "the orchestration lint answered output this hook cannot parse (exit %s), or DevyonQ could not be reached" % r.returncode)
        stages = said.get("stages") if isinstance(said.get("stages"), int) else 0
        if differs and stages > 0:
            deny(mismatch_refusal(differs, branch, repo))
        unlocked = None
        if committed is None and stages > 0:
            unlocked = ("This workflow script runs %d stage(s), and %s, so no ruled Wave Plan holds it. A fleet script "
                        "launches from a branch whose lock `mc17 wave lock` committed, and the gate reads the script "
                        "against that lock." % (stages, ("no lock is committed on the branch %s of %s" % (branch, repo)) if branch
                                                 else ("no lock is committed at HEAD of %s, a checkout of no branch" % repo) if repo else where))
        if r.returncode == 0:
            if unlocked:
                deny(unlocked)
            # A clean exit allows the launch; a note beside it, where the lint returns one, is journalled.
            allow(block_note(r.stdout), judged=True)
        findings = said.get("violations") or []
        if not findings:
            unjudged(marked, "the orchestration lint exited non-zero and named nothing this hook could parse")
        # The opening line names what the findings are about: the lock and the ruled plan where every one of them is a
        # finding of the wave's own guard, and the agent outside the block otherwise.
        wave = all(str(f.get("code", "")).startswith("G5-") for f in findings)
        lines = [
            ("This workflow script does not match the ruled Wave Plan and the lock committed on its branch, so a "
             "launch would run what no authority ruled." if wave else
             "This workflow script reaches an agent outside a verified sanctioned block, so it carries "
             "whichever guards its author remembered rather than the guards the runner holds."),
            "",
            "Source: " + origin,
        ]
        if unlocked:
            lines.insert(1, unlocked)
        for f in findings[:8]:
            lines.append("  line %s  %s  %s" % (f.get("line", "?"), f.get("code", ""),
                                                snip(str(f.get("detail", "")), 520)))
        if len(findings) > 8:
            lines.append("  ... and %d more" % (len(findings) - 8))
        # The refusal names the plugin copy and version whose canonical block judged the script, since a
        # tree whose block has moved past the installed copy is refused for pasting its own block.
        version = "unknown"
        try:
            with open(os.path.join(root, ".claude-plugin", "plugin.json"), encoding="utf-8") as fh:
                version = (json.load(fh) or {}).get("version") or "unknown"
        except Exception:
            pass
        lines += [
            "",
            "Judged by the canonical block of this plugin copy: %s (version %s). A tree whose own "
            "block has moved past that copy is refused until the plugin is updated, and the block "
            "re-pasted from the copy this gate reads." % (root, version),
            "",
            # `mc17` is absolute so the command runs from any working directory.
            "To sanction it: `%s block --print` and paste the block whole and unedited, then hand"
            % mc17,
            "the runtime primitives to the harness once as `io` and declare the wave with `openWave`.",
            "The worked example is harness/examples/sanctioned-wave.js.",
        ]
        deny("\n".join(lines))
    except Exception as e:
        # An error of the gate's own, a git call past its limit among them.
        unjudged(marked, "the gate raised %s (%s)" % (type(e).__name__, str(e)[:120]))
    finally:
        for f in (tmp, copy):
            if f:
                try: os.unlink(f)
                except Exception: pass

# Guarded so the helpers above can be imported without running main(), which reads stdin.
if __name__ == "__main__":
    main()

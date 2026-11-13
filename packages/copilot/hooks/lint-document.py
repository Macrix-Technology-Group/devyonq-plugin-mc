"""Refuse a CanonQ write that goes past the client, and a governed write whose body the engine finds against the writing
rules (ARCH D20, D23; AC-16, AC-20).

Runs as a PreToolUse hook. It reads the tool call from stdin. An MCP call to a CanonQ tool, known by its name in
hooks/canonq-tools.json whatever the server is called, passes where the tool stands on the list's read tools and is
refused otherwise: the skills write through mc17 alone. For a shell command, it sends the file a mc17 create, amend,
append or upload call names, and the body a corpus write over REST posts, to mc17 lintdoc through the plugin's own
client, and refuses on violations, where DevyonQ cannot be reached, and where the client fails or hangs.

It holds no writing rule of its own: the engine judges the body. A Bash corpus write naming no file this gate can read
is refused, since a silent allow and a clean document would look the same afterwards.
"""
import json, os, re, sys

PLUGIN = "devyonq-mc"

# The file where every write this gate allowed without reading it is recorded, one line per write.
JOURNAL = os.environ.get("MC17_GATE_JOURNAL") or os.path.expanduser("~/.mc17/gate-journal.log")

def journal(line):
    """Appends one timestamped line to the journal file, creating its directory as needed. Never raises."""
    try:
        import datetime
        os.makedirs(os.path.dirname(JOURNAL), exist_ok=True)
        with open(JOURNAL, "a", encoding="utf-8") as fh:
            # The entry carries this file's own path, so a reader can tell which copy of the gate wrote it.
            fh.write(datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                     + " [" + os.path.abspath(__file__) + "] " + line + "\n")
    except Exception:
        pass

def allow(note=None):
    """Lets the call through and exits 0. Where `note` is given, journals it and prints it on every
    channel the hook has. It sets no permission decision, so the call still takes whatever approval
    it would have taken with no hook installed.
    """
    if note:
        line = ("[%s] the document gate allowed this write WITHOUT READING IT: %s"
                % (PLUGIN, note))
        journal(line)
        # systemMessage reaches the operator, additionalContext reaches the model and stderr reaches the
        # debug log, so a reader who sees only one channel still sees the message.
        print(json.dumps({"systemMessage": line,
                          "additionalContext": channel_copy("context", "document gate", line)}))
        print(line, file=sys.stderr)
    sys.exit(0)

def snip(text, cap):
    """`text` cut to at most `cap` characters, on a word boundary where one falls past the middle,
    with the cut marked. Text within the cap is returned unchanged."""
    if len(text) <= cap:
        return text
    head = text[:cap]
    space = head.rfind(" ")
    if space > cap // 2:
        head = head[:space]
    return head.rstrip() + " [...cut, run the command below for the whole line]"

# The tool whose call is being judged, held so a refusal can name it. Set once in main().
TOOL = None

def channel_copy(tag, gate, message):
    """The message prefixed with a line that names the channel (`tag`), the gate and the refused
    tool. Every channel carries its own tag, so a reader can tell which field delivered the text."""
    return ("[%s %s] the %s refused this %s call, and nothing was written.\n\n%s"
            % (PLUGIN, tag, gate, TOOL or "tool", message))

def deny(message):
    """Refuses the call and exits 0. Prints the deny decision with the reason as
    permissionDecisionReason, which the operator sees, as additionalContext, which the model sees,
    and as systemMessage."""
    print(json.dumps({
        "hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
                               "permissionDecisionReason": channel_copy("reason", "document gate",
                                                                       message)},
        "additionalContext": channel_copy("context", "document gate", message),
        "systemMessage": message,
    }))
    sys.exit(0)

def unjudged_governed(title, origin, reason):
    """Refuses a governed body this gate read and could not judge, naming the document, its route and
    what failed. With MC17_GATE_ALLOW_UNJUDGED set, it allows the write and journals it as unjudged
    instead. Exits 0 either way."""
    if os.environ.get("MC17_GATE_ALLOW_UNJUDGED"):
        allow("MC17_GATE_ALLOW_UNJUDGED is set, so this GOVERNED document was written UNJUDGED: "
              + snip(str(reason or "no reason given"), 300))
    deny("\n".join([
        "This gate could not judge a governed write, and a governed write it has not read is "
        "refused. Seventeen-17 ledger record 31 is what the older answer cost: allowed unread, "
        "recorded in a journal nobody read until the repair was already owed.",
        "",
        "Document: " + str(title or "(untitled)") + "   via " + str(origin),
        "What failed: " + snip(str(reason or "no reason given"), 300),
        "",
        "Two ways forward. Repair the gate, which is usually a broken or partial plugin install.",
        "Or write anyway and have it recorded as an unjudged write:",
        "  MC17_GATE_ALLOW_UNJUDGED=1",
        "The override allows the write and journals it as unjudged, which puts a name on the "
        "decision. Nothing about the writing rules themselves changes here.",
    ]))

# The document classes the writing rules govern, matched against a contentType or a title prefix.
# A note or a scratch upload is not among them and passes unread.
GOVERNED = ("MANIFEST", "SPEC", "TP", "IR", "IP", "ARCH", "PL", "APR", "VF", "SEC", "DAT", "OPS",
            "CMP", "HANDOFF", "MOR", "WAVE-PLAN", "PROD", "RULINGS", "REVIEW", "VERIFICATION", "FRICTION-LOG", "DEFECT")

def governed(title, content_type):
    t = (title or "").upper()
    ct = (content_type or "").upper()
    if ct in GOVERNED:
        return True
    return any(t.startswith(g + "-") for g in GOVERNED)

# The two endpoints that store a document in the corpus: the JSON create-and-update route, and the
# multipart upload route. A Bash command is judged a corpus write by these and never by a filename.
CORPUS_WRITE_PATTERNS = (
    re.compile(r"/api/docbase/assets"),
    re.compile(r"/api/collections/[^\s'\"]+/documents"),
)

# Substrings that mark a command as a write, by naming a method or carrying a body, in curl's and
# wget's spelling. An endpoint named alone is no write: a grep or a read-back carries the same string.
# A command that runs a script of the runner's own carries neither, so no list here can see it.
WRITE_HINTS = ("POST", "PATCH", "PUT", "--data", "-d ", "-d@", "--upload-file", "--form",
               "--post-file", "--post-data", "--body-file", "--body-data", "--method=")

# curl's multipart form flag with a file, `-F name=@path`, which makes a POST with no method named.
# The `=@` separates it from `grep -F`.
MULTIPART_FILE = re.compile(r"(?:^|\s)-F\s*['\"]?[^\s'\"]*=@")

def announces_write(text):
    return any(h in text for h in WRITE_HINTS) or bool(MULTIPART_FILE.search(text))

# A here-document, from its opener to its closing delimiter. Its body is data a command writes, so an
# endpoint named inside one is no request. `[^\n]*` lets the opener carry a redirect after the
# delimiter, as in `python3 - <<'PY' > out.json`.
HEREDOC = re.compile(r"<<-?\s*(['\"]?)([A-Za-z_][A-Za-z0-9_]*)\1[^\n]*\n.*?\n\2", re.S)

def command_arguments_only(cmd):
    """The command with every here-document body removed."""
    return HEREDOC.sub("", cmd)

def is_corpus_write(cmd):
    text = command_arguments_only(cmd)
    return any(r.search(text) for r in CORPUS_WRITE_PATTERNS) and announces_write(text)

# A shell or Windows variable this process cannot expand: `$W`, `${W}` or `%W%`. A path carrying one
# names no file.
UNKNOWN_VAR = re.compile(r"\$\w|\$\{|%[A-Za-z_][A-Za-z0-9_]*%")

def path_candidates(raw, cwd, pathmod=os.path, getcwd=None):
    """Every file the path string `raw` might name, in the order they are tried. A path with a drive
    stands as is; any other is joined to `cwd` first, because on Windows a driveless path takes the
    drive of what it is joined to. Pure: `pathmod` and `getcwd` are injectable for tests.
    """
    getcwd = getcwd or os.getcwd
    here = cwd or getcwd()
    out = []
    for p in (pathmod.expandvars(os.path.expanduser(raw)), raw):
        if UNKNOWN_VAR.search(p):
            continue
        if pathmod.isabs(p) and pathmod.splitdrive(p)[0]:
            out.append(p)                              # a real absolute path, drive and all
        else:
            out.append(pathmod.join(here, p))          # the runner's directory decides the drive
            if pathmod.isabs(p):
                out.append(p)                          # driveless absolute, on this process's drive
    return out

def resolve_md(path, cwd):
    """The first existing file the path string can name, or None."""
    seen = set()
    for c in path_candidates(path, cwd):
        if c not in seen:
            seen.add(c)
            if os.path.isfile(c):
                return c
    return None

def governed_text_from_json(raw):
    """Every `body`, `authorityWords` and `content` string in the JSON text `raw`, at any depth, joined
    for the lint: a whole ledger, a patch array or a request body wrapping either. None where the
    text is no JSON or carries no such string.
    """
    try:
        d = json.loads(raw)
    except Exception:
        return None
    out = []
    def take(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in ("body", "authorityWords", "content") and isinstance(v, str):
                    out.append(v)
                else:
                    take(v)
        elif isinstance(o, list):
            for v in o:
                take(v)
    take(d)
    return "\n\n".join(out) if out else None

# The label of a passage of an authority's words: a word, then `({role}):`, the role one or more upper-case codes joined by
# a slash, as `Choices (TO):`. A label is found anywhere in the words, as mc17.js finds it.
PASSAGE_MARK = re.compile(r"[A-Za-z][A-Za-z0-9_-]*\s+\(([A-Z][A-Z0-9]*(?:/[A-Z][A-Z0-9]*)*)\):")
# One entry of spokenBy: `{role} {name}`.
SPEAKER_ENTRY = re.compile(r"([A-Z][A-Z0-9]*(?:/[A-Z][A-Z0-9]*)*) \S")
# The pointer of a record a patch operation adds or replaces.
RECORD_PATH = re.compile(r"^/records/(?:-|\d+)$")
# The two top-level fields of a ledger's declaration, which only `mc17 ledger --declare 2` writes.
DECLARATION_PATHS = ("/$schema", "/version2From")

def word_passages(words):
    """The roles of the passages of an authority's words, in their order: one per label; words with no label are one
    passage with the role None; blank or missing words hold none."""
    if not isinstance(words, str) or not words.strip():
        return []
    marks = [m.group(1) for m in PASSAGE_MARK.finditer(words)]
    return marks if marks else [None]

def speaker_faults(rec, version2):
    """What is wrong with one record under the speaker rule, as a list of {field, reason}, in the words mc17.js uses. The
    rule binds where `version2` is true and on any record that carries recordedBy."""
    if not isinstance(rec, dict):
        return []
    if not version2 and rec.get("recordedBy") is None:
        return []
    faults = []
    by = rec.get("recordedBy")
    if not isinstance(by, str) or not by.strip():
        faults.append({"field": "recordedBy", "reason": "names no recorder"})
    passages = word_passages(rec.get("authorityWords"))
    if not passages:
        return faults
    said = "%d passage(s) of an authority's words" % len(passages)
    spoken = rec.get("spokenBy")
    if not isinstance(spoken, list):
        faults.append({"field": "spokenBy", "reason": "carries %s and no speaker" % said})
        return faults
    if len(spoken) != len(passages):
        faults.append({"field": "spokenBy", "reason": "carries %s and %d speaker %s"
                       % (said, len(spoken), "entry" if len(spoken) == 1 else "entries")})
        return faults
    for i, entry in enumerate(spoken):
        form = SPEAKER_ENTRY.match(entry) if isinstance(entry, str) else None
        if form is None:
            faults.append({"field": "spokenBy", "reason": "names the speaker %s, which is not of the form {role} {name}"
                           % json.dumps(entry)})
            continue
        if passages[i] is not None and form.group(1) != passages[i]:
            faults.append({"field": "spokenBy", "reason": "names the speaker %s for passage %d, which is labelled (%s)"
                           % (json.dumps(entry), i + 1, passages[i])})
    return faults

def patch_ops(obj):
    """The operations of a patch: the list under `patch`, or the JSON itself where it is a list; each one an object."""
    ops = obj.get("patch") if isinstance(obj, dict) else obj
    return [op for op in ops if isinstance(op, dict)] if isinstance(ops, list) else []

def records_in(obj):
    """Each ledger record the JSON `obj` carries, as (where, record, version2): every record of a whole ledger, an object
    holding a `records` list, with version2 true from its version2From on; and every record a patch operation adds or
    replaces, with version2 false, because a patch of one record carries no declaration. A record that is no object is
    skipped and a version2From that is no whole number reads as absent, so no shape of JSON makes the reading fail."""
    out = []
    if isinstance(obj, dict) and isinstance(obj.get("records"), list):
        start = obj.get("version2From")
        start = start if isinstance(start, int) and not isinstance(start, bool) and start >= 2 else None
        for i, rec in enumerate(obj["records"]):
            if not isinstance(rec, dict):
                continue
            n = rec.get("n") if isinstance(rec.get("n"), int) and not isinstance(rec.get("n"), bool) else i + 1
            out.append(("record %d" % n, rec, start is not None and n >= start))
    for op in patch_ops(obj):
        if op.get("op") in ("add", "replace") and isinstance(op.get("path"), str) and RECORD_PATH.match(op["path"]) \
                and isinstance(op.get("value"), dict):
            out.append(("the record in the patch", op["value"], False))
    return out

def ledger_rules(parsed, title, origin):
    """Refuses a write whose JSON patches the ledger's declaration, or carries a ledger record that breaks the speaker
    rule, naming the record and the field. A JSON this reading fails on is a governed write the gate could not judge."""
    if parsed is None:
        return
    try:
        declared = [op for op in patch_ops(parsed) if op.get("path") in DECLARATION_PATHS]
        lines = []
        for where, rec, version2 in records_in(parsed):
            for f in speaker_faults(rec, version2):
                lines.append("  " + where + ": " + f["reason"] + " (field " + f["field"] + ")")
    except Exception as e:
        unjudged_governed(title, origin, "the ledger records the write carries could not be read (%s: %s)"
                          % (type(e).__name__, str(e)[:160]))
    if declared:
        deny("This patch writes the ledger's declaration, which mc17 ledger --declare 2 writes after testing what it "
             "read; a patch of $schema or version2From through a tool is refused")
    if lines:
        deny("\n".join(["This write carries a ledger record that names no recorder or no speaker:"] + lines))

def json_or_none(raw):
    """The JSON value of the text `raw`, or None where it is no JSON."""
    try:
        return json.loads(raw)
    except Exception:
        return None

def json_file_or_none(path):
    """The JSON value of the .json file at `path`, or None where it names no such file or the file holds no JSON."""
    if not path or not str(path).endswith(".json"):
        return None
    try:
        with open(path, encoding="utf-8") as fh:
            return json.loads(fh.read())
    except Exception:
        return None

# A quoted .md or .json path in a command, with curl's optional `name=@` form prefix stripped, as in
# 'file=@/abs/path.md'. Both the body search and the refusal read it, so they name the same paths.
QUOTED_PATH = re.compile(r"""['\"](?:[A-Za-z_][A-Za-z0-9_]*=@)?([^'\"]*\.(?:md|json))['\"]""")

def quoted_path_candidates(cmd):
    """Every quoted .md or .json path in the command, in the order they appear."""
    return [m.group(1) for m in QUOTED_PATH.finditer(cmd)]

def body_from_bash(cmd, cwd):
    """Reads the document a Bash command is about to store. Returns (body, origin, is_corpus_write):
    the text, the file it came from, and whether the command is a corpus write at all, so the caller
    can tell an unreadable write from a command that was never one. Where no file gives a text, the
    origin is the first .json file this gate opened that holds JSON and no governed text, a ledger
    patch of the declaration among them, so the caller can read it for the ledger rules.
    """
    if not is_corpus_write(cmd):
        return None, None, False
    found = None
    # `.json` is included because the ledger is a JSON asset and its append is a JSON patch.
    for m in QUOTED_PATH.finditer(cmd):
        path = resolve_md(m.group(1), cwd)
        if not path:
            continue
        try:
            raw = open(path, encoding="utf-8").read()
        except Exception:
            continue
        if path.endswith(".json"):
            text = governed_text_from_json(raw)
            if text is None:
                if found is None and json_or_none(raw) is not None:
                    found = path
                continue
            return text, path, True
        return raw, path, True
    return None, found, True

# --- the CanonQ tools, the harness writes and the engine's verdict ----------------------------------------------------

HERE = os.path.dirname(os.path.abspath(__file__))


def load_client():
    """hooks/mc17_client.py beside this file, loaded by its path."""
    import importlib.util
    spec = importlib.util.spec_from_file_location("mc17_client_document", os.path.join(HERE, "mc17_client.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_tools():
    """The CanonQ tool set of hooks/canonq-tools.json: { tools, readTools }. A list that does not read refuses every
    MCP tool whose name ends like a CanonQ write, as the list stood when the builders read it."""
    try:
        with open(os.path.join(HERE, "canonq-tools.json"), encoding="utf-8") as fh:
            d = json.load(fh)
        return {"tools": set(d["tools"]), "readTools": set(d["readTools"])}
    except Exception:
        return {"tools": {"create_asset", "update_asset", "upload_asset", "create_collection"}, "readTools": set()}


CANONQ = read_tools()


def canonq_tool(name):
    """The CanonQ tool an MCP call names, whatever the server's name: mcp__<server>__<tool>, and the forms mcp_<server>_<tool>
    and <server>-<tool> that VS Code and the Copilot CLI give, matched by the longest tool name the name ends with. None
    for any other tool."""
    n = str(name or "")
    m = re.match(r"^mcp__.+?__(.+)$", n)
    if m:
        return m.group(1) if m.group(1) in CANONQ["tools"] else None
    for t in sorted(CANONQ["tools"], key=len, reverse=True):
        if n.endswith("_" + t) or n.endswith("-" + t) or n == t:
            return t if n.startswith("mcp_") or "-" in n else None
    return None


# A harness write through the client: mc17, client/mc17 or mc17.cmd, then create, amend, append or upload; call_words
# reads the arguments after it, and the file they name.
HARNESS_WRITE = re.compile(r"(?:^|[\s;&|(`'\"])(?:[^\s;&|'\"]*[/\\])?mc17(?:\.cmd)?['\"]?\s+(create|amend|append|upload)\b")
FILE_FLAGS = ("-f", "--file", "--record", "--edits")
# What ends a call's arguments where it stands outside quotes: a command separator, a pipe, a background & and a newline.
CALL_END = ";&|\n"


def call_words(text, at, posix=None):
    """The words of the call whose arguments open at `at` in `text`, as the shell reads them: a word in single quotes as it
    stands, a word in double quotes with \\", \\\\, \\$ and \\` read as the character after the backslash, and ;, &, | or a
    newline outside quotes ending the call, so a quoted name that holds one of them stays one word. A backslash outside
    quotes takes the next character as it stands on POSIX, and stands as itself on Windows, where it parts a path. An
    unclosed quote reads to the end of the text."""
    posix = os.name != "nt" if posix is None else posix
    words, cur, have = [], [], False
    i, n = at, len(text)
    while i < n:
        ch = text[i]
        if ch == "'":
            j = text.find("'", i + 1)
            j = n if j < 0 else j
            cur.append(text[i + 1:j])
            have, i = True, j + 1
        elif ch == '"':
            have, i = True, i + 1
            while i < n and text[i] != '"':
                if text[i] == "\\" and i + 1 < n and text[i + 1] in '"\\$`':
                    cur.append(text[i + 1])
                    i += 2
                else:
                    cur.append(text[i])
                    i += 1
            i += 1
        elif ch == "\\" and posix and i + 1 < n:
            if text[i + 1] != "\n":
                cur.append(text[i + 1])
                have = True
            i += 2
        elif ch in CALL_END:
            break
        elif ch.isspace():
            if have:
                words.append("".join(cur))
                cur, have = [], False
            i += 1
        else:
            cur.append(ch)
            have, i = True, i + 1
    if have:
        words.append("".join(cur))
    return words


def judge_harness_writes(command, cwd):
    """Sends each file a mc17 create, amend, append or upload call names to mc17 lintdoc (D23), and refuses the command
    on any answer but clean."""
    text = command_arguments_only(command)
    for m in HARNESS_WRITE.finditer(text):
        words = call_words(text, m.end())
        for i, w in enumerate(words):
            if w in FILE_FLAGS and i + 1 < len(words):
                f = words[i + 1]
                p = resolve_md(f, cwd) if f.endswith(".md") else None
                if p is None:
                    p = f if os.path.isabs(f) else os.path.join(cwd or os.getcwd(), f)
                if not os.path.isfile(p):
                    continue
                try:
                    raw = open(p, encoding="utf-8").read()
                except Exception:
                    continue
                if p.endswith(".json"):
                    ledger_rules(json_or_none(raw), os.path.basename(p), "the file of mc17 " + m.group(1))
                    text = governed_text_from_json(raw)
                    if text:
                        judge_body(text, os.path.basename(p), "the file of mc17 " + m.group(1), cwd)
                else:
                    judge_body(raw, os.path.basename(p), "the file of mc17 " + m.group(1), cwd, file=p)


def judge_body(body, title, origin, cwd, file=None):
    """The engine's verdict on `body` through mc17 lintdoc -f, run by the plugin's own client within its bound: returns on
    clean, and refuses on violations, where DevyonQ cannot be reached, and where the client fails or hangs (D20)."""
    client = load_client()
    made = None
    if file is None:
        folder = os.path.join(client.client_home(), ".mc17", "tmp")
        os.makedirs(folder, exist_ok=True)
        made = os.path.join(folder, "lintdoc-%d.md" % os.getpid())
        with open(made, "w", encoding="utf-8", newline="") as fh:
            fh.write(body)
        file = made
    try:
        r = client.call(["lintdoc", "-f", file], cwd=cwd)
    finally:
        if made:
            try:
                os.remove(made)
            except Exception:
                pass
    if not r["late"] and not r["failed"] and r["exit"] == 0:
        return
    if r["exit"] == 1 and not r["late"]:
        said = (r["stdout"] + ("\n" + r["stderr"] if r["stderr"].strip() else "")).strip().splitlines()
        deny("\n".join([
            "This write carries text the methodology bars on its own face, and it is a governed "
            "file, so the record would ship reading worse than the rules it is filed under.",
            "",
            "Document: " + str(title or "(untitled)") + "   via " + str(origin),
        ] + ["  " + snip(l, 300) for l in said[:10]] + ([("  ... and %d more lines" % (len(said) - 10))] if len(said) > 10 else []) + [
            "",
            "The engine judged the body through mc17 lintdoc. This gate reads the file as it stands BEFORE the command "
            "runs, so repair in one call and write in the next. To see the whole list: mc17 lintdoc -f <file.md>",
        ]))
    why = client.why_refused(r, "mc17 lintdoc") or "the client answered mc17 lintdoc with exit %s" % r["exit"]
    deny("\n".join([
        "This write stores a governed document, and the engine could not judge its body, so the gate refuses it (D20).",
        "",
        "Document: " + str(title or "(untitled)") + "   via " + str(origin),
        "Why: " + snip(why, 400),
        "",
        "Where DevyonQ cannot be reached, a write the engine has not judged waits until it can. Run the write again once "
        "mc17 version names a gateway that answers.",
    ]))


def main():
    """Reads the hook input from stdin. Refuses a CanonQ MCP tool that writes, under any server's name, and lets the read
    tools through (AC-20). For a shell command, sends the file a mc17 create, amend, append or upload names, and the body
    a corpus write over REST posts, to mc17 lintdoc, and refuses where the engine finds violations or cannot be reached.
    Exits 0 on allow and on deny alike.
    """
    try:
        data = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    except Exception as e:
        allow("the hook input could not be parsed (%s), so nothing was read" % type(e).__name__)

    global TOOL
    name = data.get("tool_name") or ""
    TOOL = name or None
    ti = data.get("tool_input") or {}
    body = title = ctype = origin = None
    parsed = None                   # the JSON the write carries, where it carries any

    if name != "Bash" and name != "PowerShell":
        # An MCP tool (AC-20): a CanonQ tool passes where it stands on the read list and is refused otherwise,
        # whatever the server's name; any other tool passes.
        tool = canonq_tool(name)
        if tool is None:
            allow()
        if tool in CANONQ["readTools"]:
            allow()
        deny("\n".join([
            "This call reaches CanonQ through the MCP tool %s, which writes or changes the corpus, and the skills of "
            "this plugin write to CanonQ only through the mc17 client (AC-20)." % tool,
            "",
            "Tool: " + name,
            "",
            "Each write goes through an mc17 command, which the engine judges before it writes: mc17 create, mc17 amend, "
            "mc17 append, mc17 upload or mc17 collection create. The read tools of hooks/canonq-tools.json pass.",
        ]))
    else:
        command = ti.get("command") or ""
        judge_harness_writes(command, data.get("cwd"))
        body, origin, corpus_write = body_from_bash(command, data.get("cwd"))
        if corpus_write and not body:
            # A posted JSON file with no governed text, a patch of the declaration among them, is read for the two
            # ledger rules before the older refusal, so a declaration patch meets its own refusal on this route too.
            ledger_rules(json_file_or_none(origin), os.path.basename(origin) if origin else None, origin)
            deny("\n".join([
                "This command stores a document in the corpus, on one of the two corpus-write "
                "routes, and names no file this gate can read, so the text would be stored with "
                "nothing having checked it.",
                "",
                "Command: " + snip(command.strip(), 400),
                "",
                (("The quoted paths in it, and this gate could open none of them: "
                  + ", ".join(quoted_path_candidates(command)))
                 if quoted_path_candidates(command) else
                 "It quotes no .md and no .json path at all, so this gate had nothing to open."),
                "",
                "A path is unreadable here three ways, and this run's history has met all three: it "
                "carries an unexpanded variable, because the gate reads the command before any shell "
                "expands it; the file does not exist yet, because this same command was going to "
                "create it, and the gate reads BEFORE the command runs, so write the file in one "
                "command and send it in the next; or the quoted string carries a prefix the gate "
                "could not strip. Ways forward: write the path out in full in a file that already "
                "exists, or write it through mc17 create or mc17 amend, which name the file.",
            ]))
        if body:
            parsed = json_file_or_none(origin)
            title = os.path.basename(origin)
            # A post to a corpus-write endpoint is a governed act whatever the file is called, so the
            # class is fixed here and the filename never decides it.
            ctype = "MANIFEST"

    if (not body or not isinstance(body, str)) and parsed is None:
        allow()                     # a write this hook cannot read is not a violation
    if not governed(title, ctype):
        allow()                     # not a governed file

    # The ledger records the write carries, and a patch of the ledger's declaration, are read before the writing rules.
    ledger_rules(parsed, title, origin)
    if not body or not isinstance(body, str):
        allow()                     # no governed text to judge

    judge_body(body, title, origin, data.get("cwd"))
    allow()

# Guarded so the helpers above can be imported by the tests without running the gate, which would
# block on stdin.
if __name__ == "__main__":
    main()

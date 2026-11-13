#!/usr/bin/env python3
"""Stands between a host's hook and the gates beside this file, which read Claude Code's payload.

Usage: dialect.py --dialect <dialect file> <gate>, with the host's hook payload on stdin. `mc17-gate dialect --dialect
<file> <gate>` runs it under a Python 3.

It reads the dialect file, which describes one client's payload, maps the host's event and tool onto Claude Code's, writes
the payload the gate reads, runs the gate with this Python as a child process, and writes the gate's answer in the
dialect's form. A gate is never imported: each one ends with sys.exit, and its output stays apart from this file's.

The dialect file is JSON:
  fields   the payload's path, dotted or a list of keys, of: event, tool, input, command, prompt, cwd, session, call,
           response, agent, stopActive (the event name, the tool name, the tool's input, the shell command, the
           subagent prompt, the working folder, the session, the call's id, the tool's response, the agent's id, and
           whether the turn already goes on because a Stop hook kept it going); a field left out reads as absent.
  events   each event name the host sends, mapped onto the Claude Code event it stands for: PreToolUse, PostToolUse,
           SubagentStop or Stop.
  tools    a list; each entry names a tool by "name", its exact name, or by "pattern", a regular expression over its
           whole name, and gives "as", the Claude Code tool it stands for (left out: the tool keeps the name the host
           sent), and "kinds", any of document, branch, heavy and pass. The first entry that matches is the tool's.
  reply    where the reply stands at the end of a turn: {"field": <path>}, or {"transcript": <path of the file>,
           "row": {<path in a row>: <value>, ...}, "text": <path of the text in that row>} for a JSONL transcript whose
           last row matching every pair of "row" holds the reply.
  deny     {"template": <JSON value holding "<reason>">, "exit": <code>, "stream": "stdout" or "stderr"}: the denial.
  note     the payload field that carries a note on an allowed call, or null where the host shows none.

The gates and the events they answer, as Claude Code's hook configuration wires them: the document gate and the branch
gate at PreToolUse, the heavy-run hook at PreToolUse, PostToolUse and SubagentStop, the chat lint at Stop, and the secret gate at
PreToolUse for the shell tools and the file tools, whose entries carry the kind secret. A tool the
dialect does not name, a tool that carries no kind of the gate named, and an event the gate does not answer pass with no
gate run and no output. For the chat lint the reply is written as one assistant row of the transcript the chat lint reads.
"""
import json
import os
import re
import shlex
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
# Each gate this file reaches, with the kind a dialect's tool entry names it by and the Claude Code events it answers.
GATES = {
    "lint-document": ("document", ("PreToolUse",)),
    "lint-branch": ("branch", ("PreToolUse",)),
    "lint-heavy": ("heavy", ("PreToolUse", "PostToolUse", "SubagentStop")),
    "lint-chat": ("chat", ("Stop",)),
    "lint-secret": ("secret", ("PreToolUse",)),
}
TOOL_EVENTS = ("PreToolUse", "PostToolUse")
SHELL_TOOLS = ("Bash", "PowerShell")
NOTHING_JUDGED = "nothing was judged: the host handed no reply"


class Refused(Exception):
    """A call this file cannot carry out: a dialect it cannot read, or a gate it does not reach."""


def path_of(spec):
    """A field's path as a list of keys: a dotted string split on its dots, a list kept, anything else none."""
    if isinstance(spec, list):
        return [str(k) for k in spec]
    if isinstance(spec, str) and spec:
        return spec.split(".")
    return None


def get(data, spec):
    """The value at the path `spec` in `data`, or None where any key on the way is absent."""
    keys = path_of(spec)
    if keys is None:
        return None
    cur = data
    for k in keys:
        if isinstance(cur, dict) and k in cur:
            cur = cur[k]
        elif isinstance(cur, list) and re.fullmatch(r"-?\d+", k) and -len(cur) <= int(k) < len(cur):
            cur = cur[int(k)]
        else:
            return None
    return cur


def text_of(value):
    """The text of a reply: a string as it stands, the text parts of a list joined by blank lines, else None."""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        parts = []
        for p in value:
            if isinstance(p, str):
                parts.append(p)
            elif isinstance(p, dict) and isinstance(p.get("text"), str) and p.get("type", "text") in ("text", "output_text"):
                parts.append(p["text"])
        return "\n\n".join(parts) if parts else None
    return None


def read_dialect(file):
    """The dialect at `file`, checked for the shape this file reads; raises Refused naming what is wrong."""
    try:
        with open(file, encoding="utf-8") as fh:
            d = json.load(fh)
    except Exception as e:
        raise Refused("the dialect file %s could not be read as JSON (%s)" % (file, type(e).__name__))
    if not isinstance(d, dict):
        raise Refused("the dialect file %s holds no JSON object" % file)
    for key, kind in (("fields", dict), ("events", dict), ("tools", list)):
        if not isinstance(d.get(key), kind):
            raise Refused("the dialect file %s carries no %s %s" % (file, key, "object" if kind is dict else "list"))
    deny = d.get("deny")
    if not isinstance(deny, dict) or "template" not in deny or not isinstance(deny.get("exit"), int):
        raise Refused("the dialect file %s carries no deny form with a template and an exit code" % file)
    for t in d["tools"]:
        if not isinstance(t, dict) or not (isinstance(t.get("name"), str) or isinstance(t.get("pattern"), str)):
            raise Refused("the dialect file %s holds a tool entry with no name and no pattern: %s" % (file, json.dumps(t)[:120]))
        if not isinstance(t.get("kinds"), list):
            raise Refused("the dialect file %s holds a tool entry with no kinds: %s" % (file, json.dumps(t)[:120]))
    return d


def tool_entry(dialect, name):
    """The first tool entry of the dialect that names `name` exactly or whose pattern matches all of it, or None."""
    for t in dialect["tools"]:
        if isinstance(t.get("name"), str) and t["name"] == name:
            return t
        if isinstance(t.get("pattern"), str) and re.fullmatch(t["pattern"], name or ""):
            return t
    return None


def shell_text(value):
    """A shell command as one text: a string as it stands, an argument list quoted as a POSIX shell reads it."""
    if isinstance(value, list) and all(isinstance(x, str) for x in value):
        return shlex.join(value)
    return value if isinstance(value, str) else None


def claude_payload(dialect, payload, event, gate):
    """The payload the gate reads for this call, or None where the call passes with no gate run."""
    fields = dialect["fields"]
    kind, answers = GATES[gate]
    if event not in answers:
        return None
    out = {"hook_event_name": event}
    for key, field in (("session_id", "session"), ("cwd", "cwd"), ("agent_id", "agent")):
        v = get(payload, fields.get(field))
        if v is not None:
            out[key] = v
    if event not in TOOL_EVENTS:
        return out
    name = get(payload, fields.get("tool"))
    name = name if isinstance(name, str) else ""
    entry = tool_entry(dialect, name)
    if entry is None or kind not in entry["kinds"]:
        return None
    tool = entry.get("as") or name
    ti = get(payload, fields.get("input"))
    ti = dict(ti) if isinstance(ti, dict) else {}
    if tool in SHELL_TOOLS:
        command = shell_text(get(payload, fields.get("command")))
        if command is not None:
            ti["command"] = command
    elif tool == "Agent":
        prompt = get(payload, fields.get("prompt"))
        if isinstance(prompt, str):
            ti["prompt"] = prompt
    out["tool_name"] = tool
    out["tool_input"] = ti
    for key, field in (("tool_use_id", "call"), ("tool_response", "response")):
        v = get(payload, fields.get(field))
        if v is not None:
            out[key] = v
    return out


def reply_text(dialect, payload):
    """The reply the host handed at the end of a turn, as the dialect's reply place holds it, or None."""
    reply = dialect.get("reply")
    if not isinstance(reply, dict):
        return None
    if "field" in reply:
        return text_of(get(payload, reply["field"]))
    file = get(payload, reply.get("transcript"))
    if not isinstance(file, str) or not os.path.isfile(file):
        return None
    try:
        with open(file, encoding="utf-8", errors="replace") as fh:
            raw = fh.read()
    except Exception:
        return None
    rows = []
    try:
        whole = json.loads(raw)
        rows = whole if isinstance(whole, list) else [whole]
    except Exception:
        for line in raw.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except Exception:
                continue
    want = reply.get("row") if isinstance(reply.get("row"), dict) else {}
    for row in reversed(rows):
        if not isinstance(row, dict):
            continue
        if all(get(row, k) == v for k, v in want.items()):
            return text_of(get(row, reply.get("text")))
    return None


def chat_payload(text, payload, dialect, folder):
    """The Stop payload the chat lint reads, its transcript one assistant row holding `text`, written into `folder`."""
    file = os.path.join(folder, "transcript.jsonl")
    with open(file, "w", encoding="utf-8") as fh:
        fh.write(json.dumps({"type": "assistant", "message": {"role": "assistant",
                                                             "content": [{"type": "text", "text": text}]}}) + "\n")
    out = {"hook_event_name": "Stop", "transcript_path": file}
    # The chat lint judges nothing in a turn a Stop hook already kept going, as on Claude Code.
    for key, field in (("session_id", "session"), ("cwd", "cwd"), ("stop_hook_active", "stopActive")):
        v = get(payload, dialect["fields"].get(field))
        if v is not None:
            out[key] = v
    return out


def filled(template, reason):
    """The template with every "<reason>" in its strings replaced by `reason`."""
    if isinstance(template, str):
        return template.replace("<reason>", reason)
    if isinstance(template, list):
        return [filled(x, reason) for x in template]
    if isinstance(template, dict):
        return {k: filled(v, reason) for k, v in template.items()}
    return template


def write_note(dialect, note):
    """Writes a note on an allowed call in the field the dialect names, or nothing where it names none."""
    field = dialect.get("note")
    if isinstance(field, str) and field and note:
        print(json.dumps({field: note}))


def answer(dialect, run):
    """Writes the gate's answer in the dialect's form and returns the exit code: the dialect's denial with its code, a
    note in the note field, or nothing; a gate that exits other than 0 has its output passed on and its code kept."""
    if run.returncode != 0:
        sys.stdout.write(run.stdout)
        sys.stderr.write(run.stderr)
        return run.returncode
    out = run.stdout.strip()
    verdict = None
    for line in [out] + list(reversed(out.splitlines())):
        try:
            verdict = json.loads(line)
            break
        except Exception:
            continue
    if not isinstance(verdict, dict):
        if out:
            sys.stdout.write(run.stdout)
        return 0
    hso = verdict.get("hookSpecificOutput") or {}
    if hso.get("permissionDecision") == "deny":
        deny = dialect["deny"]
        reason = hso.get("permissionDecisionReason") or verdict.get("systemMessage") or "refused"
        body = filled(deny["template"], reason)
        text = body if isinstance(body, str) else json.dumps(body)
        print(text, file=sys.stderr if deny.get("stream") == "stderr" else sys.stdout)
        return deny["exit"]
    write_note(dialect, verdict.get("systemMessage"))
    return 0


def main(argv):
    if len(argv) != 3 or argv[0] != "--dialect":
        print("dialect: usage: dialect.py --dialect <dialect file> <gate>", file=sys.stderr)
        return 2
    file, gate = argv[1], argv[2]
    refused = 1 if gate == "lint-chat" else 2
    try:
        if gate not in GATES:
            raise Refused("no gate this file reaches is named %s; it reaches %s" % (gate, ", ".join(sorted(GATES))))
        dialect = read_dialect(file)
    except Refused as e:
        print("dialect: %s" % e, file=sys.stderr)
        return refused
    try:
        # A host writes its payload as UTF-8 bytes; read in the machine's code page, as sys.stdin reads on Windows, a
        # character past ASCII would reach the gate misread.
        payload = json.loads(sys.stdin.buffer.read().decode("utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("no JSON object")
    except Exception as e:
        write_note(dialect, "the hook input could not be parsed (%s), so nothing was read" % type(e).__name__)
        return 0
    event = dialect["events"].get(get(payload, dialect["fields"].get("event")))
    folder = None
    try:
        if gate == "lint-chat":
            if event != "Stop":
                return 0
            text = reply_text(dialect, payload)
            if text is None or not text.strip():
                # In a turn a Stop hook already kept going the chat lint says nothing, as on Claude Code; elsewhere the
                # developer is told that no reply was judged.
                if not get(payload, dialect["fields"].get("stopActive")):
                    write_note(dialect, NOTHING_JUDGED)
                return 0
            folder = tempfile.mkdtemp(prefix="mc17-dialect-")
            gate_payload = chat_payload(text, payload, dialect, folder)
        else:
            gate_payload = claude_payload(dialect, payload, event, gate)
            if gate_payload is None:
                return 0
        run = subprocess.run([sys.executable, "-I", "-S", "-B", "-X", "utf8", os.path.join(HERE, gate + ".py")], input=json.dumps(gate_payload),
                             capture_output=True, text=True, encoding="utf-8", errors="replace")
        return answer(dialect, run)
    finally:
        if folder is not None:
            try:
                os.remove(os.path.join(folder, "transcript.jsonl"))
                os.rmdir(folder)
            except Exception:
                pass


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

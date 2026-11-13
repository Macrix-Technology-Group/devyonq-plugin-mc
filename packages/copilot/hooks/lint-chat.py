#!/usr/bin/env python3
"""lint-chat.py - runs the writing rules over the last assistant turn of a session.

A `Stop` hook. Reads the `Stop` payload from stdin, opens the transcript it names, takes the text of
the final assistant turn and scans it with `scan` from `check/chat-rules.py`. Fenced blocks and backtick
spans are exempt inside `scan`; text in plain double quotes is read as prose.

Reports a rule only where its `REACH` entry in `check/chat-rules.py` is other than `document`; a rule with
no entry is reported. Names each rule once per session, tracked by a marker file in the temp
directory. The report goes out as a `systemMessage` on stdout and as a line on stderr.

Exits 0 in every case. A payload that is no object, a missing transcript, a turn without prose and an
empty result all allow silently; rules that cannot be loaded allow with a note that nothing was judged.
"""
import json
import os
import sys


def allow(note=None):
    """Exits 0. A `note`, where given, is printed first as a `systemMessage` JSON line on stdout and as
    plain text on stderr. The note is for the operator, so no `additionalContext` is sent to the model.
    """
    if note:
        try:
            print(json.dumps({"systemMessage": note}))
            print(note, file=sys.stderr)
        except Exception:
            pass
    sys.exit(0)


def last_assistant_text(path):
    """The text of the last assistant turn in the JSONL transcript at `path`, or None.

    Returns None where the file cannot be read, where no assistant row exists, or where the last
    assistant row carries no text part. Rows marked `isSidechain` are skipped.
    """
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            lines = fh.readlines()
    except Exception:
        return None
    for raw in reversed(lines):
        raw = raw.strip()
        if not raw:
            continue
        try:
            row = json.loads(raw)
        except Exception:
            continue
        if not isinstance(row, dict):
            continue
        # `isSidechain` marks a subagent's row.
        if row.get("isSidechain"):
            continue
        msg = row.get("message") if isinstance(row.get("message"), dict) else {}
        if row.get("type") != "assistant" and msg.get("role") != "assistant":
            continue
        content = msg.get("content")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts = [c.get("text", "") for c in content
                     if isinstance(c, dict) and c.get("type") == "text"]
            joined = "\n".join(p for p in parts if p)
            # A last row with no text part ends the search with None; earlier rows are never read.
            return joined if joined.strip() else None
    return None


def reaches_chat(wlint, rule):
    """Whether `rule` is reported in chat: True unless `check/chat-rules.py` declares its reach as "document".
    A rule with no reach entry, or a wlint without `rule_reach`, counts as reaching."""
    reach = getattr(wlint, "rule_reach", None)
    return (reach(rule) if callable(reach) else None) != "document"


def spoken_already(session, rules):
    """The rules in `rules` this session has not been shown yet, after marking them shown.

    The record is a file in the temp directory named after `session`, appended to on every call
    that returns something. With no session id, every rule is returned and nothing is written.
    """
    if not session:
        return list(rules)
    import tempfile
    mark = os.path.join(tempfile.gettempdir(), "mc17-chat-lint-" + "".join(
        c for c in str(session) if c.isalnum() or c in "-_")[:64])
    try:
        told = set(open(mark, encoding="utf-8").read().split("\n")) if os.path.exists(mark) else set()
    except Exception:
        told = set()
    fresh = [r for r in rules if r not in told]
    if fresh:
        try:
            with open(mark, "a", encoding="utf-8") as fh:
                fh.write("\n".join(fresh) + "\n")
        except Exception:
            pass
    return fresh


def report(violations):
    """One line naming each rule in `violations` once, with the first detail seen for it cut to 70 characters."""
    seen = []
    for v in violations:
        rule = v.get("rule", "?")
        if rule not in [s[0] for s in seen]:
            seen.append((rule, v.get("detail", "")))
    parts = []
    for rule, detail in seen:
        detail = " ".join(str(detail).split())
        parts.append(rule + (" (" + detail[:70] + ")" if detail else ""))
    return ("writing rules, in what I just said: " + "; ".join(parts)
            + ". The corpus gate never sees a message, so this is the only reader it has"
            + " (IP-MC17-023 AC-4). Nothing is blocked.")


def main():
    try:
        data = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    except Exception:
        allow()
    # `[]`, `null` and `42` are valid JSON and no object.
    if not isinstance(data, dict):
        allow()

    # `stop_hook_active` is set when the session is already continuing because of a stop hook.
    if data.get("stop_hook_active"):
        allow()

    path = data.get("transcript_path")
    if not isinstance(path, str) or not os.path.isfile(path):
        allow()

    text = last_assistant_text(path)
    if not text or not text.strip():
        allow()

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    rules = os.path.join(root, "check", "chat-rules.py")

    # Loads `check/chat-rules.py` from the plugin root, two levels above this file: the rules whose reach is other than the
    # stored document, written once from the release's wlint.py (ARCH D23). The document rules stay in the engine.
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("mc17_wlint_chat", rules)
        if spec is None or spec.loader is None:
            raise ImportError("no loader for " + rules)
        wlint = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(wlint)
        violations = wlint.scan(text)
    except Exception as exc:
        # The rules could not be loaded or run: allow, with a note that nothing was judged.
        allow("the conversation lint could not read its rules (" + type(exc).__name__
              + "), so nothing was judged. This is no verdict on what I said.")

    violations = [v for v in (violations or [])
                  if reaches_chat(wlint, v.get("rule", ""))]
    if not violations:
        allow()
    fresh = spoken_already(data.get("session_id"), [v.get("rule") for v in violations])
    violations = [v for v in violations if v.get("rule") in fresh]
    if not violations:
        allow()
    allow(report(violations))


if __name__ == "__main__":
    main()

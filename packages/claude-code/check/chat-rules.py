"""chat-rules.py - the writing rules of the conversation lint, hooks/lint-chat.py.

Written once from check/wlint.py of the source release (ARCH D23), keeping the rules whose
reach is other than the stored document alone: the dash and the four negation frames. The rules that judge a stored
document stay in the engine, where mc17 lintdoc runs them, so this file holds none of them. The functions below are
the release's own, with no change to their logic: strip, frames and detail, and scan cut to the rules this file holds.

The chat lint runs at every reply with no server, as AC-16 names no chat gate among the hooks that need DevyonQ.
"""
import re, sys

EM = chr(0x2014)
DASHES = [chr(0x2014), chr(0x2013), chr(0x2015)]

# A fence opens on a run of three or more backticks or tildes at the start of a line, indented at most
# three spaces, and closes on a bare run of the same character at least as long, also at the start of a
# line. A fence that never closes runs to the end of the text.
FENCE_RUN = re.compile(r"^ {0,3}(`{3,}|~{3,})")
FENCE_CLOSE = re.compile(r"^ {0,3}(`{3,}|~{3,})[ \t\r]*$")

def strip(text):
    lines = text.split("\n")
    out = []
    opener = None
    for ln in lines:
        if opener is None:
            m = FENCE_RUN.match(ln)
            if m:
                opener = m.group(1)
                out.append("")
                continue
            out.append(re.sub(r"`[^`]*`", " ", ln))
            continue
        c = FENCE_CLOSE.match(ln)
        if c and c.group(1)[0] == opener[0] and len(c.group(1)) >= len(opener):
            opener = None
        out.append("")
    return out

def frames(line):
    """Each barred negation frame in `line`, as (rule, match); the match carries the offsets of the phrase."""
    hits = []
    n = "n" + "ot"
    r = "r" + "ather"
    i = "i" + "nstead"
    b = "b" + "ut"
    # The four frames: neg-foil-A is "not X but Y" with or without the comma, neg-foil-D is a comma
    # followed by "not", neg-foil-B is "rather" followed by "than", neg-foil-C is "instead" followed by "of".
    for rule, pattern in (("neg-foil-A", r"\b" + n + r"\b[^.;:]{1,120}?,?\s+" + b + r"\b"),
                          ("neg-foil-D", r",\s*" + n + r"\s+"),
                          ("neg-foil-B", r"\b" + r + r"\s+than\b"),
                          ("neg-foil-C", r"\b" + i + r"\s+of\b")):
        m = re.search(pattern, line, re.I)
        if m:
            hits.append((rule, m))
    return hits


# Characters of context kept on each side of a match in `detail`.
WINDOW = 55

def detail(line, start, end):
    """The matched text of `line`, then the text around it with WINDOW characters either side, as one string.

    The match leads because every consumer truncates this string.
    """
    lo, hi = max(0, start - WINDOW), min(len(line), end + WINDOW)
    around = ("..." if lo > 0 else "") + line[lo:hi].strip() + ("..." if hi < len(line) else "")
    return 'matched "%s" in: %s' % (line[start:end], around)


# --- where each rule reaches ----------------------------------------------------------
#
# Each rule of this file reaches the conversation lint. A rule with no entry here is reported there too.
REACH = {
    "DASH": "chat",
    "neg-foil-A": "chat",
    "neg-foil-B": "chat",
    "neg-foil-C": "chat",
    "neg-foil-D": "chat",
}


def rule_reach(rule):
    """Where `rule` reaches, by its first word: "chat", or None for a rule REACH does not name."""
    return REACH.get(str(rule).split(" ")[0])


def scan(text):
    """Every barred construction of the chat rules in `text`, as a list of dicts with "line", "rule" and "detail"."""
    text = text.replace("\r\n", "\n")
    out = []
    for i, ln in enumerate(strip(text), 1):
        for d in DASHES:
            at = ln.find(d)
            if at >= 0:
                out.append({"line": i, "rule": "DASH U+%04X" % ord(d),
                            "detail": detail(ln, at, at + 1)})
        for rule, m in frames(ln):
            out.append({"line": i, "rule": rule, "detail": detail(ln, m.start(), m.end())})
    return out


def main(argv):
    """Reads each file named in `argv`, prints one `path:line: rule: detail` line per hit and a count to stderr, and
    returns 1 where any hit stands, else 0."""
    hits = 0
    for path in argv:
        txt = open(path, encoding="utf-8").read()
        for v in scan(txt):
            print("%s:%d: %s: %s" % (path, v["line"], v["rule"], v["detail"]))
            hits += 1
    if hits:
        print("chat-rules: %d barred construction(s)" % hits, file=sys.stderr)
    return 1 if hits else 0


if __name__ == "__main__":
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    sys.exit(main(sys.argv[1:]))

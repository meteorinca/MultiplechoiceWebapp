import random
import sys
from collections import defaultdict

# Usage:
#   python make_exam.py input.txt > exam.txt
#
# Input line patterns this handles:
#   circa around preposition acc
#   circiter about preposition acc
#   cis on this side preposition acc
#   coram in presence of preposition abl
#   corripio, corripere, corripui, correptum to seize, snatch verb 3-io
#
# Parse rules:
# - Find the last POS token: one of the POS list below.
# - Everything after POS is tags (case, declension, etc.).
# - Everything before POS is "latin + gloss".
# - If the segment contains "to", split latin vs gloss at the first "to".
#   Example: "... correptum to seize, snatch"
# - Else, latin is the first token, gloss is the rest.
#
# Distractors:
# - Sample glosses from other entries with the same POS.
# - If not enough, backfill from other POS entries.
# - Avoid duplicates and the exact correct gloss string.
#
# Output format:
# Title: My Custom Exam
#
# Question N: <latin>
# a. <choice>
# b. <choice>
# c. <choice>
# d. <choice>
# Answer: <letter>

POS_SET = {
    "noun", "verb", "adjective", "adverb", "preposition",
    "conjunction", "pronoun", "interjection", "numeral", "participle"
}

def parse_line(line):
    """Return dict with latin, gloss, pos. Skip lines that cannot be parsed."""
    s = line.strip()
    if not s:
        return None
    tokens = s.split()
    # Find POS index scanning from end to start to pick the last POS mention
    pos_idx = None
    for i in range(len(tokens)-1, -1, -1):
        if tokens[i].lower() in POS_SET:
            pos_idx = i
            break
    if pos_idx is None or pos_idx == 0:
        return None  # not parseable

    before = tokens[:pos_idx]          # latin + gloss
    pos = tokens[pos_idx].lower()
    # Heuristic split:
    # If "to" appears, treat from "to" onward as the gloss
    if "to" in before:
        t = before.index("to")
        latin_tokens = before[:t]
        gloss_tokens = before[t:]  # keep the "to" to preserve natural gloss
    else:
        # Latin is the first token, gloss is the rest
        latin_tokens = [before[0]]
        gloss_tokens = before[1:]
        if not gloss_tokens:
            return None

    latin = " ".join(latin_tokens).strip().rstrip(",")
    gloss = " ".join(gloss_tokens).strip().strip(",")
    # Clean punctuation spacing
    gloss = gloss.replace(" ,", ",").replace("  ", " ").strip()
    latin = latin.replace("  ", " ").strip()

    # Basic sanity
    if not latin or not gloss:
        return None

    return {"latin": latin, "gloss": gloss, "pos": pos}

def read_entries(path):
    entries = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            rec = parse_line(line)
            if rec:
                entries.append(rec)
    return entries

def build_index(entries):
    by_pos = defaultdict(list)
    for e in entries:
        by_pos[e["pos"]].append(e)
    return by_pos

def pick_distractors(entries, by_pos, target_pos, correct_gloss, k=3, rng=None):
    rng = rng or random
    # First try same POS
    pool_same = [e["gloss"] for e in by_pos.get(target_pos, []) if e["gloss"] != correct_gloss]
    rng.shuffle(pool_same)
    distractors = []
    for g in pool_same:
        if g not in distractors and g != correct_gloss:
            distractors.append(g)
        if len(distractors) == k:
            return distractors

    # Backfill from all others
    pool_other = [e["gloss"] for e in entries if e["gloss"] != correct_gloss and e["gloss"] not in distractors]
    rng.shuffle(pool_other)
    for g in pool_other:
        distractors.append(g)
        if len(distractors) == k:
            break
    # If still short, duplicate-safe padding (rare)
    while len(distractors) < k:
        distractors.append("no answer")

    return distractors[:k]

def format_question(n, latin, choices, correct_idx):
    letters = ["a", "b", "c", "d"]
    lines = []
    lines.append(f"Question {n}: {latin}")
    for i, c in enumerate(choices):
        lines.append(f"{letters[i]}. {c}")
    lines.append(f"Answer: {letters[correct_idx]}")
    return "\n".join(lines)

def main():
    if len(sys.argv) < 2:
        print("Usage: python make_exam.py input.txt > exam.txt", file=sys.stderr)
        sys.exit(1)

    rng = random.Random(42)  # set seed for repeatable output
    entries = read_entries(sys.argv[1])
    if not entries:
        print("No valid entries parsed.", file=sys.stderr)
        sys.exit(1)

    by_pos = build_index(entries)

    out_lines = []
    out_lines.append("Title: My Custom Exam\n")

    qnum = 1
    for e in entries:
        latin = e["latin"]
        correct = e["gloss"]
        pos = e["pos"]
        distractors = pick_distractors(entries, by_pos, pos, correct, k=3, rng=rng)

        # Build and shuffle choices
        choices = distractors + [correct]
        rng.shuffle(choices)
        correct_idx = choices.index(correct)

        out_lines.append(format_question(qnum, latin, choices, correct_idx))
        out_lines.append("")  # blank line between questions
        qnum += 1

    print("\n".join(out_lines).strip())

if __name__ == "__main__":
    main()


#!/usr/bin/env python3
"""
Generate multiple-choice Latin->English questions from a simple vocab file.

Input file format:
Each line: <latin><sep><english>
Accepted separators (first occurrence on a line is used):
    - tab
    - " : " or ":"
    - " - " or "-"
    - two or more spaces
If none of the above found, splits on first single space.

Output format matches:
Question 1: puella, puellae, f.
a. girl
b. boy
c. child
d. pull
Answer: a
"""

import argparse
import random
import re
from pathlib import Path

SEPARATORS = [
    r"\t",
    r"\s*:\s*",
    r"\s*-\s*",
    r"\s{2,}",
]

FALLBACK_DISTRACTORS = [
    "stone","road","bird","forest","spear","island","army",
    "table","window","river","cloud","field","gate","wall",
    "friend","enemy","ship","harbor","mountain","city",
]

def split_line(line: str):
    s = line.strip()
    if not s or s.startswith("#"):
        return None
    for sep in SEPARATORS:
        parts = re.split(sep, s, maxsplit=1)
        if len(parts) == 2:
            left, right = parts[0].strip(), parts[1].strip()
            if left and right:
                return left, right
    # fallback: split on first single space
    parts = s.split(" ", 1)
    if len(parts) == 2:
        return parts[0].strip(), parts[1].strip()
    return None

def load_vocab(path: Path):
    pairs = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            parsed = split_line(line)
            if parsed:
                pairs.append(parsed)
    # dedupe by latin headword keeping first meaning
    seen = set()
    uniq = []
    for lat, eng in pairs:
        if lat not in seen:
            seen.add(lat)
            uniq.append((lat, eng))
    return uniq

def choose_distractors(correct_eng: str, all_eng: list, k=3, rng=None):
    rng = rng or random
    pool = [e for e in set(all_eng) if e.lower() != correct_eng.lower()]
    chosen = []
    if len(pool) >= k:
        chosen = rng.sample(pool, k)
    else:
        chosen = pool[:]
        # top up from fallback words not equal to correct or existing
        fb = [w for w in FALLBACK_DISTRACTORS if w.lower() != correct_eng.lower() and w not in chosen]
        while len(chosen) < k and fb:
            chosen.append(fb.pop(0))
        # if still short, duplicate harmlessly with indexes
        i = 1
        while len(chosen) < k:
            chosen.append(f"word{i}")
            i += 1
    return chosen

def format_question(idx: int, latin: str, correct: str, options: list, correct_letter: str):
    letters = ["a","b","c","d"]
    lines = [f"Question {idx}: {latin}"]
    for i, opt in enumerate(options):
        lines.append(f"{letters[i]}. {opt}")
    lines.append(f"Answer: {correct_letter}")
    return "\n".join(lines)

def build_exam(pairs, rng, shuffle_options=True, start_index=1):
    all_eng = [eng for _, eng in pairs]
    out_lines = []
    qnum = start_index
    for latin, correct in pairs:
        distractors = choose_distractors(correct, all_eng, k=3, rng=rng)
        options = [correct] + distractors
        if shuffle_options:
            rng.shuffle(options)
        letters = ["a","b","c","d"]
        correct_letter = letters[options.index(correct)]
        block = format_question(qnum, latin, correct, options, correct_letter)
        out_lines.append(block)
        out_lines.append("")  # blank line between questions
        qnum += 1
    return "\n".join(out_lines).rstrip() + "\n"

def main():
    ap = argparse.ArgumentParser(description="Latin MCQ generator")
    ap.add_argument("input", type=Path, help="Input vocab file path")
    ap.add_argument("-o", "--output", type=Path, default=Path("latin_exam.txt"), help="Output txt file")
    ap.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    ap.add_argument("--no-shuffle", action="store_true", default=False, help="Do not shuffle options")
    args = ap.parse_args()

    rng = random.Random(args.seed)

    pairs = load_vocab(args.input)
    if not pairs:
        raise SystemExit("No valid vocab lines found in input.")

    exam = build_exam(pairs, rng, shuffle_options=not args.no_shuffle)

    args.output.write_text(exam, encoding="utf-8")
    print(f"Wrote {args.output} with {len(pairs)} questions.")

if __name__ == "__main__":
    main()

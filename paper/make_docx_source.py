"""
Preprocess main.tex into a pandoc-friendly .tex file for high-fidelity
conversion to a native, editable Word (.docx) document:

  1. Expand custom argument-free macros (\\PP, \\Yw, \\vol, ...) inline,
     since pandoc's math-to-OMML converter does not reliably expand
     user-defined LaTeX macros inside math mode.
  2. Resolve \\cref{...}/\\Cref{...}/\\cref{a,b} cross-references to their
     literal numbers/names, using the numbering pandoc/LaTeX itself
     assigned (extracted from main.aux after a full pdflatex run), since
     pandoc does not understand the `cleveref` package.
"""
import re

SRC = "main.tex"
DST = "main.pandoc.tex"
AUX = "main.aux"

MACROS = [
    (r"\\vol(?![a-zA-Z])", r"\\operatorname{vol}"),
    (r"\\Barc(?![a-zA-Z])", r"\\operatorname{Bary}"),
    (r"\\Cone(?![a-zA-Z])", r"\\operatorname{Cone}"),
    (r"\\conv(?![a-zA-Z])", r"\\operatorname{conv}"),
    (r"\\Aut(?![a-zA-Z])", r"\\operatorname{Aut}"),
    (r"\\ord(?![a-zA-Z])", r"\\operatorname{ord}"),
    (r"\\PP(?![a-zA-Z])", r"\\mathbb{P}"),
    (r"\\QQ(?![a-zA-Z])", r"\\mathbb{Q}"),
    (r"\\RR(?![a-zA-Z])", r"\\mathbb{R}"),
    (r"\\ZZ(?![a-zA-Z])", r"\\mathbb{Z}"),
    (r"\\CC(?![a-zA-Z])", r"\\mathbb{C}"),
    (r"\\Gm(?![a-zA-Z])", r"\\mathbb{G}_m"),
    (r"\\Yw(?![a-zA-Z])", r"Y_{\\mathbf w}"),
    (r"\\Pw(?![a-zA-Z])", r"P_{\\mathbf w}"),
]

TYPE_NAME = {
    "thm": "Theorem", "theorem": "Theorem",
    "lemma": "Lemma",
    "fact": "Fact",
    "construction": "Construction",
    "corollary": "Corollary",
    "section": "Section",
    "table": "Table",
    "equation": "eq.",
}


def parse_aux(path):
    """Return dict label -> (None, number), reading only the number field of
    \\newlabel{label}{{num}{page}...} entries (robust to nested braces later
    in the line, e.g. inside table/figure captions)."""
    text = open(path).read()
    labels = {}
    for m in re.finditer(r"\\newlabel\{([^@}]+)\}\{\{([^}]*)\}", text):
        label, num = m.group(1), m.group(2)
        if label not in labels:
            labels[label] = (None, num)
    return labels


def kind_from_label_prefix(label):
    prefix = label.split(":", 1)[0]
    return {
        "thm": "theorem", "fact": "fact", "constr": "construction",
        "lem": "lemma", "eq": "equation", "sec": "section", "tab": "table",
    }.get(prefix, prefix)


def format_ref(label, numbers, capitalize):
    anchor_kind, num = numbers[label]
    kind = kind_from_label_prefix(label)
    name = TYPE_NAME.get(kind, kind.capitalize())
    if not capitalize:
        name = name[0].lower() + name[1:]
    if kind == "equation":
        return f"{name} ({num})"
    return f"{name} {num}"


def parse_bibitems(text):
    """Return dict citekey -> 1-based number, in \\bibitem source order
    (matches the numbering LaTeX's thebibliography assigns)."""
    keys = re.findall(r"\\bibitem\{([^}]+)\}", text)
    return {key: i + 1 for i, key in enumerate(keys)}


def replace_cites(text, bibnums):
    def repl(m):
        keys = [s.strip() for s in m.group(1).split(",")]
        nums = [str(bibnums[k]) for k in keys]
        return "[" + ", ".join(nums) + "]"

    return re.sub(r"\\cite\{([^}]+)\}", repl, text)


def replace_crefs(text, numbers):
    def repl(m):
        cmd, arg = m.group(1), m.group(2)
        capitalize = cmd == "Cref"
        labels = [s.strip() for s in arg.split(",")]
        parts = [format_ref(lab, numbers, capitalize) for lab in labels]
        if len(parts) == 1:
            return parts[0]
        if len(parts) == 2:
            return f"{parts[0]} and {parts[1]}"
        return ", ".join(parts[:-1]) + f", and {parts[-1]}"

    return re.sub(r"\\(cref|Cref)\{([^}]+)\}", repl, text)


def main():
    text = open(SRC).read()
    numbers = parse_aux(AUX)

    text = replace_crefs(text, numbers)
    text = replace_cites(text, parse_bibitems(text))

    for pattern, repl in MACROS:
        text = re.sub(pattern, repl, text)

    # \mathrm{multiletter} tends to render with spurious inter-letter spacing
    # once converted to OMML by some renderers; \operatorname is handled as a
    # single upright "function name" run and renders correctly in Word.
    text = re.sub(r"\\mathrm\{([A-Za-z]{2,})\}", r"\\operatorname{\1}", text)

    # Drop the now-unused \newcommand/\DeclareMathOperator lines and the
    # cleveref/hyperref packages (irrelevant for docx, and hyperref color
    # options can confuse pandoc's colour parsing in some versions).
    text = re.sub(r"^\\DeclareMathOperator.*$\n?", "", text, flags=re.M)
    text = re.sub(r"^\\newcommand.*$\n?", "", text, flags=re.M)
    text = re.sub(r"^\\usepackage\{cleveref\}\n?", "", text, flags=re.M)

    with open(DST, "w") as f:
        f.write(text)
    print(f"Wrote {DST} ({len(numbers)} labels resolved)")


if __name__ == "__main__":
    main()

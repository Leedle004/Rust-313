# Weighted blow-ups of $\mathbb{P}^n$ at a torus-fixed point are never K-semistable

This directory contains a short original note in toric algebraic geometry /
K-stability theory, motivated by the recent literature on explicit
K-stability computations for Fano varieties (weighted hypersurfaces,
Newton–Okounkov bodies via cluster algebras, etc.).

## Contents

- `main.tex` / `main.pdf`: the paper.
- `main.docx`: a native, editable Word version of the paper (equations as
  real OMML Word equations, resolved cross-references and citations),
  generated from `main.tex` via `make_docx_source.py` + `pandoc`.
- `make_docx_source.py`: preprocesses `main.tex` (expanding custom macros
  and resolving `\cref`/`\Cref`/`\cite` against the numbering assigned by a
  `pdflatex` run) into a form `pandoc` can convert faithfully to `.docx`.
- `verify.py`: independent numerical verification of the combinatorial claims
  in the paper (the Fano criterion and the closed-form barycenter formula),
  using an exact half-space-intersection / triangulation computation of the
  anticanonical polytope, cross-checked against the closed form derived in
  the paper.

## Building the paper

```bash
pdflatex main.tex
pdflatex main.tex   # second pass to resolve cross-references
```

Requires a standard TeX Live installation (`amsart`, `amsmath`, `amssymb`,
`mathtools`, `enumitem`, `booktabs`, `xcolor`, `hyperref`, `cleveref`).

## Regenerating the Word (.docx) version

```bash
pdflatex main.tex   # needed so main.aux has resolved section/theorem numbers
python3 make_docx_source.py    # writes main.pandoc.tex
pandoc main.pandoc.tex -o main.docx --standalone -f latex
```

## Running the verification script

```bash
pip install numpy scipy sympy
python3 verify.py
```

This cross-checks the closed-form barycenter formula (Theorem 4.2 in the
paper) against an independent numerical computation of the polytope for
several explicit examples in dimensions $n=2,\dots,5$, and performs an
exhaustive search over small weight vectors confirming that every Fano
member of the family has strictly positive barycenter (hence is never
K-semistable).

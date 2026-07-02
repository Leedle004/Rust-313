# Roots of Unity on a Conic Plus One Point Never Support Unexpected Curves

An original short research note in algebraic geometry, motivated by the active
"unexpected curves/hypersurfaces" literature (Cook II–Harbourne–Migliore–Nagel,
Harbourne–Migliore–Nagel–Teitler, and the very recent 2025 preprint of
Janasz–Malara–Tutaj-Gaśińska on unexpected hypersurfaces of type $(d+k,d)$).

## Contents

- `unexpected_curves_roots_of_unity.tex` / `.pdf` — the paper.
- `unexpected_curves_explore.py` — the exact (rational, symbolic) `sympy` script
  used to verify the Hilbert function formula and the non-existence of
  unexpected curves in the boundary degree range $d \le \mu+1$. Run with
  `python3 unexpected_curves_explore.py`.
- `computation_log.txt` — full output of the verification script, referenced
  in Table 1 and Section 5 of the paper.

## Summary of results

For the point configuration $Z_n \subset \mathbb{P}^2(\mathbb{C})$ consisting
of the $n$-th roots of unity on the conic $uv=w^2$ together with the point
$[0:0:1]$ (equivalently, after a linear change of coordinates, the vertices of
a regular $n$-gon together with its center), we show:

1. $Z_n$ is a complete intersection of the conic with a degree-$n/2$ curve,
   plus one extra point (Proposition 2.3).
2. A closed formula for the Hilbert function of $I_{Z_n}$ (Proposition 2.5),
   verified computationally against the exact symbolic data.
3. $Z_n$ never admits an unexpected curve of degree $d$ and multiplicity $\mu$
   whenever $d \ge \mu + 2$ (Theorem 4.1), proved via a clean lemma about
   multiplication by units in truncated jet rings.
4. Exact symbolic verification that the same holds for all smaller degrees in
   every case tested ($n \le 12$, $\mu \le 4$), recorded as Conjecture 5.1.

## Building the PDF

```
pdflatex unexpected_curves_roots_of_unity.tex
pdflatex unexpected_curves_roots_of_unity.tex
```

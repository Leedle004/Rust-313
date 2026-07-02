# Rust-313

## Paper: Stability thresholds of log pairs on fake weighted projective spaces

This repository contains an original research-style paper in algebraic
geometry, written in the context of the recent literature on K-stability
and K-moduli of Fano varieties (Blum–Jonsson, Zhuang, Liu–Xu–Zhuang,
Sano–Tasin, Campo–Fujita–Sano–Tasin, Kim–Liu–Wang, Blum–Liu–Xu–Zhuang).

**Main result.** For a fake weighted projective space `X` of dimension `n`
with weights `(a_0, ..., a_n)` and any torus-invariant boundary
`Δ = Σ c_i D_i` (with `β_i = 1 - c_i`), the stability threshold is

```
δ(X, Δ) = (n+1) · min_i(a_i β_i) / Σ_i(a_i β_i)  ≤ 1,
```

computed by the boundary divisor minimizing `a_i β_i`. Consequences
include: a K-semistability criterion (`a_i β_i` all equal), a canonical
one-parameter family of Kähler–Einstein "calibrating" boundaries on every
fake weighted projective space, lattice-independence of the threshold,
saturation of the Blum–Jonsson inequality `α = δ/(n+1)`, and an explicit
chamber decomposition of the coefficient cube by optimal destabilizing
divisors.

### Contents

- `paper/main.tex` — LaTeX source (self-contained, amsart)
- `paper/main.pdf` — compiled paper (12 pages)
- `scripts/verify_results.py` — exact rational-arithmetic verification of
  every numerical claim in the paper (S-invariant limits from monomial
  bases, δ and α values on families of examples, barycenter formulas,
  random sampling of toric valuations, fake/quotient examples)

### Build and verify

```bash
# verify all formulas (pure Python, no dependencies beyond stdlib)
python3 scripts/verify_results.py

# compile the paper
cd paper && pdflatex main.tex && pdflatex main.tex
```

### Provenance

This manuscript was produced by an AI agent. All formulas were verified by
the included independent exact-arithmetic script, and bibliographic
entries were checked against the cited sources. The mathematical
statements should nevertheless be reviewed by a human expert before any
further use.

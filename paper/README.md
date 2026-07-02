# Higher Du Bois singularities of affine cones over K3 surfaces

An original research-expository note in algebraic geometry, written in the style of an
arXiv preprint and grounded in the recent literature on higher Du Bois / higher rational
singularities (Shen–Venkatesh–Vo, Popa–Shen, Friedman–Laza, Mustață–Popa, …) and on
Bott vanishing for K3 surfaces (Totaro).

## Main results

For a polarized K3 surface `(X, B)` and its affine cone `Z = C(X, B)`:

- **Theorem A.** If `Pic(X) = Z·B` with `d = B²`, then `Z` is 1-Du Bois iff `d = 20` or
  `d ≥ 24` (and `Z` is always Du Bois, never rational).
- **Theorem B.** For any Picard number, `Z` is 1-Du Bois whenever `B² ≥ 74` and `X` has
  no elliptic curve of `B`-degree ≤ 4.
- **Theorem C.** The 1-Du Bois property of K3 cones is **not** determined by the
  polarized Picard lattice (it can depend on the Kodaira type of a singular fiber of an
  elliptic fibration), so its failure locus in moduli is not a Noether–Lefschetz locus.
- **Theorem D.** `K_{-ℓ}(Z) = 0` for all `ℓ ≥ 1`, and
  `K₀(Z) ≅ Z ⊕ ⊕_{m≥1} H¹(X, Ω¹_X ⊗ B^m)`, a finite-dimensional augmentation; hence
  `Z` is 1-Du Bois iff `K₀(Z) ≅ Z`.

## Building

```sh
cd paper
pdflatex k3-cones-higher-du-bois.tex
pdflatex k3-cones-higher-du-bois.tex   # second pass for cross-references
```

Requires a TeX Live installation with `amsart`, `hyperref`, `microtype`, and the Latin
Modern fonts (`texlive-latex-recommended` + `lmodern` on Debian/Ubuntu).

## Provenance note

This note was drafted with AI assistance. All theorems are proved by combining published
results (cited in the text) with self-contained arguments; the statements labelled as new
(Theorems A–D and Example 6.1(2)) are new *combinations* of those results, and should be
independently verified before any formal use.

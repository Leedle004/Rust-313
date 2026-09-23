# Rust-313

## Gage's isoperimetric inequality on surfaces of constant curvature

`paper/gage-space-forms.pdf` (source `paper/gage-space-forms.tex`) is a research paper in differential geometry. It asks whether Gage's inequality `∫κ² ds ≥ πL/A` for convex plane curves has an analogue on the sphere and in the hyperbolic plane.

On the surface `M_c` of constant curvature `c`, the isoperimetric ratio `L²/(A(4π − cA))` decreases along the curve shortening flow of every convex curve if and only if the Gage deficit

```
G_c(γ) = ∫κ² ds − (2π − cA)² L / (A(4π − cA))
```

is nonnegative for every convex curve. The deficit vanishes on geodesic circles. The paper proves:

- **Second variation (all `c`).** At the geodesic circle of radius `r`, perturbed by `ε cos kθ`, the coefficient of `ε²` in `G_c` is `π(k²−1)(k²−2+c·sn_c(r)²)/sn_c(r)³`.
- **Sphere and plane (`c ≥ 0`).** Every circle is a strict local minimizer of `G_c`.
- **Hyperbolic plane (`c = −1`).** Circles with `sinh² r > 2`, that is of length `L > 2π√2`, are unstable. The hyperbolic analogue of Gage's inequality fails, even for horocyclically convex curves close to circles, and the isoperimetric ratio can increase along the curve shortening flow.
- **Universal constant.** Near a circle of length `L`, an inequality `∫κ² ds ≥ K²/L + μ(L² − 4πA + cA²)` can hold only if `μ ≤ 12π²/L³`, for every `c`.
- **Sphere, reformulations.**
  - Polarity turns the spherical inequality into the reverse inequality `∫ds/κ ≥ L²(2π − A)/(4π² − L²)`.
  - The inequality follows from the `L¹` bound `∫|1 − λκ| ds ≥ √(L² − 4πA + cA²)`.
  - That bound holds in the plane, which gives a short proof of Gage's inequality. It fails in the hyperbolic plane and holds near every spherical circle.

The global spherical inequality is stated as a conjecture, supported by the numerical experiments in Section 6.

### Reproducing the computations

The scripts in `paper/code` need Python 3 with the packages in `paper/code/requirements.txt`. Run them from `paper/code`:

| Script | What it does |
| --- | --- |
| `verify_second_variation.py` | Symbolic check, for arbitrary `c`, of the expansions (Lemma 3.1), the second variation (Theorems 3.2 and 3.5) and the explicit `sin`/`id`/`sinh` cases, plus a spectral cross-check (Table 2). |
| `numerical_experiments.py` | Random and extreme curves on `S²`, `R²` and `H²` (Tables 1 and 3, Section 6); writes `results.json`. |
| `csf_flow.py` | Curve shortening flow of polar graphs on `S²` and `H²`; writes `csf_data.npz`. |
| `make_figures.py` | Regenerates the figures in `paper/figures`. |

Build the PDF with `latexmk -pdf gage-space-forms.tex` in `paper/`.

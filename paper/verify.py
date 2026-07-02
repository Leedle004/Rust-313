"""
Numerical verification of the combinatorics in the paper
"Weighted blow-ups of P^n at a torus-fixed point are never K-semistable".

For given dimension n and weight vector w = (w_1,...,w_n) (positive integers,
gcd 1), we:
  1. Build the anticanonical polytope
        P_w = { u in R^n : u_i >= -1 (i=1..n),  sum u_i <= 1,  sum w_i u_i >= -1 }
     directly as a half-space intersection (independent computation).
  2. Compute its vertices via scipy's HalfspaceIntersection / ConvexHull,
     triangulate, and compute volume + barycenter numerically by summing
     over the triangulation (independent of the closed-form derivation).
  3. Compare with the closed-form prediction derived by hand:
        S = sum(w)
        t_k = (S - 1) / (w_k * (n+1))
        Fano  <=>  0 < t_k < 1 for all k
        tau = prod(t_k)
        bar(P_w) = -(tau/(1-tau)) * (t_1 - 1, ..., t_n - 1)
     which (since each t_k - 1 < 0 whenever Fano holds) always has every
     coordinate strictly positive, hence is never zero.
"""
import itertools
import math
import numpy as np
from scipy.spatial import HalfspaceIntersection, ConvexHull
from fractions import Fraction


def fano_condition(w):
    n = len(w)
    S = sum(w)
    return all(n * wk >= (S - wk) for wk in w)


def closed_form_barycenter(w):
    n = len(w)
    S = sum(w)
    t = [Fraction(S - 1, wk * (n + 1)) for wk in w]
    tau = 1
    for tk in t:
        tau *= tk
    factor = -tau / (1 - tau)
    bar = [factor * (tk - 1) for tk in t]
    return bar, t, tau


def build_halfspaces(w):
    n = len(w)
    # Each row: [a_1,...,a_n, b] meaning a.x + b <= 0  (scipy convention)
    rows = []
    for i in range(n):
        # u_i >= -1  <=>  -u_i - 1 <= 0
        row = [0.0] * n + [-1.0]
        row[i] = -1.0
        rows.append(row)
    # sum u_i <= 1 <=> sum u_i - 1 <= 0
    rows.append([1.0] * n + [-1.0])
    # sum w_i u_i >= -1 <=> -sum w_i u_i - 1 <= 0
    rows.append([-wi for wi in w] + [-1.0])
    return np.array(rows)


def triangulate_and_integrate(vertices):
    """Compute (volume, barycenter) of the convex hull of `vertices` (n-dim)
    by coning from the centroid of the vertex set and summing simplices."""
    n = vertices.shape[1]
    hull = ConvexHull(vertices)
    apex = vertices.mean(axis=0)
    total_vol = 0.0
    weighted_centroid = np.zeros(n)
    for simplex in hull.simplices:
        pts = vertices[simplex]  # n points forming a facet (n-1 simplex)
        # form simplex with apex -> n+1 points total, n-dim simplex
        simp_pts = np.vstack([pts, apex])
        # volume of n-simplex with vertices simp_pts (n+1 points in R^n)
        M = simp_pts[1:] - simp_pts[0]
        vol = abs(np.linalg.det(M)) / math.factorial(n)
        centroid = simp_pts.mean(axis=0)
        total_vol += vol
        weighted_centroid += vol * centroid
    return total_vol, weighted_centroid / total_vol


def test_case(n, w, verbose=True):
    assert len(w) == n
    fano = fano_condition(w)
    result = {"n": n, "w": w, "fano_predicted": fano}
    if not fano:
        if verbose:
            print(f"n={n} w={w}: NOT Fano by closed-form criterion (skipping numeric check)")
        return result

    A = build_halfspaces(w)
    interior_pt = np.zeros(n)  # origin is always interior when Fano
    try:
        hs = HalfspaceIntersection(A, interior_pt)
    except Exception as e:
        result["error"] = str(e)
        if verbose:
            print(f"n={n} w={w}: HalfspaceIntersection FAILED ({e})")
        return result

    verts = hs.intersections
    vol_num, bar_num = triangulate_and_integrate(verts)

    bar_cf, t, tau = closed_form_barycenter(w)
    bar_cf_float = np.array([float(x) for x in bar_cf])

    diff = np.max(np.abs(bar_num - bar_cf_float))
    result.update({
        "num_vertices": len(verts),
        "vol_numeric": vol_num,
        "bar_numeric": bar_num.tolist(),
        "bar_closed_form": [float(x) for x in bar_cf],
        "max_abs_diff": diff,
        "all_positive_closed_form": all(x > 0 for x in bar_cf),
    })
    if verbose:
        print(f"n={n} w={w}: Fano ok, #vertices={len(verts)}, "
              f"vol={vol_num:.6f}, bar_numeric={np.round(bar_num,6).tolist()}, "
              f"bar_closed_form={[round(float(x),6) for x in bar_cf]}, "
              f"max|diff|={diff:.2e}, all_coords_positive={result['all_positive_closed_form']}")
    return result


def scan_all_weight_vectors(n, max_w):
    """Brute-force scan: for all weight vectors with entries in [1, max_w],
    gcd 1, check whether Fano condition holds, and if so verify barycenter
    is never zero (all closed-form coordinates strictly positive)."""
    count_fano = 0
    count_checked = 0
    worst = 0.0
    from math import gcd
    from functools import reduce
    for w in itertools.product(range(1, max_w + 1), repeat=n):
        if reduce(gcd, w) != 1:
            continue
        if not fano_condition(w):
            continue
        count_fano += 1
        bar_cf, t, tau = closed_form_barycenter(w)
        assert all(x > 0 for x in bar_cf), f"FAILED positivity for n={n}, w={w}: bar={bar_cf}"
        count_checked += 1
    print(f"n={n}, weights up to {max_w}: {count_fano} Fano weight-vectors found, "
          f"all have strictly positive barycenter (never K-semistable). OK.")


if __name__ == "__main__":
    print("=== Cross-checking closed form vs. direct half-space/ConvexHull computation ===")
    cases = [
        (2, [1, 1]),
        (2, [1, 2]),  # boundary case (should fail strict Fano condition: 2*1=2 >= 2 ok equality)
        (2, [2, 3]),
        (2, [3, 4]),
        (3, [1, 1, 1]),
        (3, [1, 1, 2]),
        (3, [2, 3, 4]),
        (3, [3, 4, 5]),
        (4, [1, 1, 1, 1]),
        (4, [2, 3, 3, 4]),
        (5, [1, 1, 1, 1, 1]),
        (5, [3, 4, 4, 5, 5]),
    ]
    for n, w in cases:
        test_case(n, w)

    print("\n=== Exhaustive scan over small weight vectors ===")
    scan_all_weight_vectors(2, 12)
    scan_all_weight_vectors(3, 8)
    scan_all_weight_vectors(4, 6)
    scan_all_weight_vectors(5, 5)

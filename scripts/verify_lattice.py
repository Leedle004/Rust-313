"""Fully independent verification of the barycenter computations by pure
lattice-point counting (Ehrhart interpolation). No calculus is used.

For a lattice polytope P in R^n, the counting functions
    N(r)   = #(rP cap Z^n)              (Ehrhart polynomial, degree n)
    M_j(r) = sum_{x in rP cap Z^n} x_j  (polynomial of degree n+1)
are polynomials in r. Their leading coefficients are vol(P) and
int_P x_j dx respectively, so
    barycenter_j = (leading coeff of M_j) / (leading coeff of N).
We recover both polynomials exactly by interpolation at r = 1..deg+1
with rational arithmetic, then compare delta = 1/(1 + max_v <b, v>)
against the closed formulas of Theorems A and B.
"""

from fractions import Fraction
from itertools import product
import sys

sys.path.insert(0, '.')
from derive_formula import delta_family1_closed, delta_family2
import sympy as sp


def leading_coeff(values, degree):
    """Exact leading coefficient of the degree-`degree` polynomial p with
    p(r) = values[r-1] for r = 1..degree+1, via finite differences."""
    diffs = [Fraction(v) for v in values]
    for _ in range(degree):
        diffs = [diffs[i + 1] - diffs[i] for i in range(len(diffs) - 1)]
    assert len(diffs) == 1
    import math
    return diffs[0] / math.factorial(degree)


def polytope_data_family1(n, m):
    """Facets of P(-K) for Bl_{P^m}P^n and the ray list."""
    k = n - m
    e = [[1 if i == j else 0 for j in range(n)] for i in range(n)]
    e0 = [-1] * n
    u = [1 if j >= m else 0 for j in range(n)]  # e_{m+1}+...+e_n
    rays = e + [e0, u]

    def inside(x):  # x integer tuple, dilation r
        return True

    def member(x, r):
        if any(xi < -r for xi in x):
            return False
        if sum(x) > r:
            return False
        if sum(x[m:]) < -r:
            return False
        return True

    box = lambda r: product(*[range(-r, r * (n + 1) + 1) for _ in range(n)])
    return rays, member, box


def polytope_data_family2(n, a):
    """Facets of P(-K) for Bl_{P^a + P^b} P^n, b = n-1-a."""
    e = [[1 if i == j else 0 for j in range(n)] for i in range(n)]
    e0 = [-1] * n
    u1 = [1 if j >= a else 0 for j in range(n)]
    u2 = [-v for v in u1]
    rays = e + [e0, u1, u2]

    def member(x, r):
        if any(xi < -r for xi in x):
            return False
        if sum(x) > r:
            return False
        t = sum(x[a:])
        if t < -r or t > r:
            return False
        return True

    box = lambda r: product(*[range(-r, r * (n + 1) + 1) for _ in range(n)])
    return rays, member, box


def barycenter_by_counting(n, rays, member, box):
    deg_vol, deg_mom = n, n + 1
    Ns, Ms = [], []
    for r in range(1, deg_mom + 2):
        cnt = 0
        mom = [0] * n
        for x in box(r):
            if member(x, r):
                cnt += 1
                for j in range(n):
                    mom[j] += x[j]
        Ns.append(cnt)
        Ms.append(mom)
    volP = leading_coeff(Ns[:deg_vol + 1], deg_vol)
    bary = [leading_coeff([Ms[i][j] for i in range(deg_mom + 1)], deg_mom) / volP
            for j in range(n)]
    pairings = [sum(Fraction(v[j]) * bary[j] for j in range(n)) for v in rays]
    mx = max(pairings)
    return Fraction(1, 1) / (1 + mx), bary


if __name__ == '__main__':
    print("Independent lattice-point verification (no calculus involved)")
    print()
    print("Family 1: X_{n,m} = Bl_(P^m) P^n")
    for (n, m) in [(2, 0), (3, 0), (3, 1), (4, 0), (4, 1), (4, 2)]:
        rays, member, box = polytope_data_family1(n, m)
        d, _ = barycenter_by_counting(n, rays, member, box)
        d_closed = delta_family1_closed(m, n)
        ok = sp.nsimplify(sp.Rational(d.numerator, d.denominator)) == d_closed
        print(f"  (n,m)=({n},{m}): lattice delta = {d}  closed = {d_closed}  match={ok}")
        assert ok

    print()
    print("Family 2: Y_{a,b} = Bl_(P^a + P^b) P^n, b = n-1-a")
    for (n, a) in [(3, 1), (4, 1), (4, 2)]:
        rays, member, box = polytope_data_family2(n, a)
        d, _ = barycenter_by_counting(n, rays, member, box)
        b = n - 1 - a
        d_closed = delta_family2(a, b)[1]
        ok = sp.nsimplify(sp.Rational(d.numerator, d.denominator)) == sp.nsimplify(d_closed)
        print(f"  (n,a,b)=({n},{a},{b}): lattice delta = {d}  closed = {d_closed}  match={ok}")
        assert ok

    print()
    print("All lattice-count verifications passed.")

#!/usr/bin/env python3
"""Numerical verification of the main formulas in the paper
"Stability thresholds of fake weighted projective spaces and log pairs".

We verify, with exact rational arithmetic:

  (V1) For weighted projective space X = P(a_0,...,a_n), the expected
       vanishing order of -K_X along the toric boundary divisor D_i is
           S(ord_{D_i}) = h / ((n+1) a_i),   h = a_0 + ... + a_n,
       by computing the finite-level approximations S_m via monomial
       bases of H^0(X, -mK_X) and checking convergence.

  (V2) delta(X) = (n+1) a_min / h agrees with the infimum of
       A(w)/S(w) over toric valuations w in N_R, computed exactly via
       the polytope formula  S(w) = <b, w> + phi(w),  A(w) = phi(w),
       where phi(w) = -min_{u in P} <u, w> and b = barycenter of P.
       We sample many random rational w and check the min is attained
       at the rays of the fan.

  (V3) The same limit holds for the fake weighted projective space
       P^2 / mu_3  (invariant monomials), giving delta = 1.

  (V4) For the log pair (P(1,1,2), c D_z):
       barycenter of P_c is ((1-2c)/3, (2c-1)/3), so b = 0 iff c = 1/2;
       delta_T(c) = min( 3/(4-2c), 3(1-c)/(2-c) );
       finite-level S_m for ord_{D_z} and ord_{D_x} converge to
       (2-c)/3 and (4-2c)/3 respectively.

  (V5) (n+1) a_min <= h with equality iff all a_i equal (AM-min check
       on many random weight vectors).
"""

from fractions import Fraction
from itertools import product
import random

random.seed(20260702)

OK = True


def check(name, cond, detail=""):
    global OK
    status = "PASS" if cond else "FAIL"
    if not cond:
        OK = False
    print(f"[{status}] {name} {detail}")


# ----------------------------------------------------------------------
# (V1) S_m for weighted projective spaces
# ----------------------------------------------------------------------

def wps_S_m(weights, m):
    """Exact S_m(ord_{D_i}) for all i on P(weights), sections of -mK.

    H^0(-mK) has a monomial basis {x^alpha : sum a_i alpha_i = m*h};
    ord_{D_i}(x^alpha) = alpha_i, and the sup over bases is attained
    by any monomial basis since ord_{D_i} is a toric valuation.
    S_m(ord_{D_i}) = (1/(m N_m)) * sum_alpha alpha_i.
    """
    h = sum(weights)
    deg = m * h
    n1 = len(weights)
    total = [0] * n1
    count = 0

    def rec(idx, rem, expo):
        nonlocal count
        if idx == n1 - 1:
            if rem % weights[idx] == 0:
                e = rem // weights[idx]
                count += 1
                for j in range(n1 - 1):
                    total[j] += expo[j]
                total[n1 - 1] += e
            return
        a = weights[idx]
        for e in range(rem // a + 1):
            expo.append(e)
            rec(idx + 1, rem - a * e, expo)
            expo.pop()

    rec(0, deg, [])
    return [Fraction(t, m * count) for t in total], count


print("== (V1) S(ord_D_i) = h/((n+1)a_i) for weighted projective spaces ==")
for weights in [(1, 1, 2), (1, 2, 3), (2, 3, 5), (1, 1, 2, 3)]:
    n = len(weights) - 1
    h = sum(weights)
    target = [Fraction(h, (n + 1) * a) for a in weights]
    m_hi = 60 if n == 2 else 24
    m_lo = m_hi // 2
    S_hi, _ = wps_S_m(weights, m_hi)
    S_lo, _ = wps_S_m(weights, m_lo)
    for i, a in enumerate(weights):
        err_hi = abs(S_hi[i] - target[i])
        err_lo = abs(S_lo[i] - target[i])
        # S_m -> S with error O(1/m); check error at m_hi is smaller and tiny
        check(
            f"P{weights}: S_m(ord_D_{i}) -> {target[i]}",
            err_hi < Fraction(1, m_hi) and err_hi <= err_lo,
            f"(S_{m_hi}={S_hi[i]}, err={float(err_hi):.2e})",
        )

# ----------------------------------------------------------------------
# (V2) delta via exact polytope formula and random sampling
# ----------------------------------------------------------------------

def simplex_data(weights):
    """Return rays v_i in N=Z^n, vertices u_j of P(-K), barycenter b.

    Rays: v_i = e_i for i=1..n, v_0 = -(1/a_0) * sum_{i>=1} a_i e_i
    (choose weights so that a_0 = 1 to stay integral, or clear
    denominators -- we instead pick v_1..v_n = e_i and solve v_0 from
    sum a_i v_i = 0; primitivity of v_0 holds for the weight systems
    used below).
    Vertices u_j of P = {u : <u,v_i> >= -1}: <u_j, v_i> = -1 (i != j),
    <u_j, v_j> = h/a_j - 1.
    """
    n = len(weights) - 1
    rays = []
    # v_1..v_n = standard basis, v_0 determined
    v0 = [Fraction(-weights[i + 1], weights[0]) for i in range(n)]
    rays.append(v0)
    for i in range(n):
        e = [Fraction(0)] * n
        e[i] = Fraction(1)
        rays.append(e)

    # solve vertices: u_j satisfies <u_j, v_i> = -1 for i != j
    # with rays v_1..v_n = e_i: coordinates read off directly.
    verts = []
    h = sum(weights)
    for j in range(n + 1):
        if j == 0:
            u = [Fraction(-1)] * n
        else:
            u = [Fraction(-1)] * n
            u[j - 1] = Fraction(h, weights[j]) - 1
        # check <u, v_0>
        val = sum(u[k] * v0[k] for k in range(n))
        expect = Fraction(h, weights[0]) - 1 if j == 0 else Fraction(-1)
        assert val == expect, (j, val, expect)
        verts.append(u)
    b = [sum(v[k] for v in verts) / (n + 1) for k in range(n)]
    return rays, verts, b


def phi_and_S(w, verts, b):
    """phi(w) = max_vert <-u, w>;  S(w) = <b,w> + phi(w)."""
    phi = max(-sum(u[k] * w[k] for k in range(len(w))) for u in verts)
    Sw = sum(b[k] * w[k] for k in range(len(w))) + phi
    return phi, Sw


print("== (V2) delta = (n+1) a_min / h; infimum attained at a ray ==")
for weights in [(1, 1, 2), (1, 2, 3), (2, 3, 5), (1, 1, 2, 3), (1, 2, 3, 5)]:
    n = len(weights) - 1
    h = sum(weights)
    delta_formula = Fraction((n + 1) * min(weights), h)
    rays, verts, b = simplex_data(weights)
    ray_vals = []
    for v in rays:
        phi, Sv = phi_and_S(v, verts, b)
        ray_vals.append(phi / Sv)  # A(w)/S(w) with A = phi
    check(
        f"P{weights}: min over rays of A/S = {delta_formula}",
        min(ray_vals) == delta_formula,
        f"(ray values {sorted(set(ray_vals))})",
    )
    # random sampling of toric valuations
    worst = None
    for _ in range(4000):
        w = [Fraction(random.randint(-30, 30), random.randint(1, 7))
             for _ in range(n)]
        if all(x == 0 for x in w):
            continue
        phi, Sw = phi_and_S(w, verts, b)
        assert phi > 0 and Sw > 0
        r = phi / Sw
        if worst is None or r < worst:
            worst = r
    check(
        f"P{weights}: sampled inf over N_R >= {delta_formula}",
        worst >= delta_formula,
        f"(sampled min {worst})",
    )

# ----------------------------------------------------------------------
# (V3) fake weighted projective space P^2/mu_3
# ----------------------------------------------------------------------

def fake_p2_mu3_S_m(m):
    """S_m(ord_{D_i}) on X = P^2/mu_3, action (x,y,z)->(x, w y, w^2 z).

    H^0(X, -mK_X) = invariant monomials of degree 3m:
    alpha+beta+gamma = 3m, beta + 2*gamma = 0 mod 3.
    """
    deg = 3 * m
    tot = [0, 0, 0]
    cnt = 0
    for beta in range(deg + 1):
        for gamma in range(deg - beta + 1):
            if (beta + 2 * gamma) % 3 == 0:
                alpha = deg - beta - gamma
                cnt += 1
                tot[0] += alpha
                tot[1] += beta
                tot[2] += gamma
    return [Fraction(t, m * cnt) for t in tot], cnt


print("== (V3) fake WPS P^2/mu_3: S(ord_D_i) -> 1, delta -> 1 ==")
S48, c48 = fake_p2_mu3_S_m(48)
S24, c24 = fake_p2_mu3_S_m(24)
for i in range(3):
    err_hi = abs(S48[i] - 1)
    err_lo = abs(S24[i] - 1)
    check(
        f"P^2/mu_3: S_m(ord_D_{i}) -> 1",
        err_hi < Fraction(1, 40) and err_hi <= err_lo,
        f"(S_48={S48[i]}, err={float(err_hi):.2e})",
    )
# dimension count sanity: h^0(-mK_X) ~ (1/3) h^0(-mK_{P^2})
full = (3 * 48 + 1) * (3 * 48 + 2) // 2
check("P^2/mu_3: h^0(-48K) ~ (1/3) h^0_{P^2}", abs(c48 - full / 3) < 2,
      f"(inv count {c48}, full/3 = {full/3:.1f})")

# ----------------------------------------------------------------------
# (V4) log pair (P(1,1,2), c D_z)
# ----------------------------------------------------------------------

def log_pair_S_m(c, m):
    """S_m(ord_{D_z}), S_m(ord_{D_x}) for -m(K + c D_z) on P(1,1,2).

    Sections: monomials x^a y^b z^e with a + b + 2e = m(4-2c).
    """
    deg = m * (4 - 2 * c)
    assert deg == int(deg)
    deg = int(deg)
    tot_e = 0
    tot_a = 0
    cnt = 0
    for e in range(deg // 2 + 1):
        for a in range(deg - 2 * e + 1):
            cnt += 1
            tot_e += e
            tot_a += a
    return Fraction(tot_e, m * cnt), Fraction(tot_a, m * cnt)


print("== (V4) log pair (P(1,1,2), c D_z) ==")
for c in [Fraction(0), Fraction(1, 4), Fraction(1, 2), Fraction(3, 4)]:
    tz = (2 - c) / 3
    tx = (4 - 2 * c) / 3
    m = 64  # even, and m*(4-2c) integral for c in quarters
    Sz, Sx = log_pair_S_m(c, m)
    Sz2, Sx2 = log_pair_S_m(c, m // 2)
    check(f"c={c}: S_m(ord_z) -> (2-c)/3 = {tz}",
          abs(Sz - tz) < Fraction(1, m) and abs(Sz - tz) <= abs(Sz2 - tz),
          f"(S_{m}={Sz})")
    check(f"c={c}: S_m(ord_x) -> (4-2c)/3 = {tx}",
          abs(Sx - tx) < Fraction(1, m) and abs(Sx - tx) <= abs(Sx2 - tx),
          f"(S_{m}={Sx})")

# barycenter and delta_T(c), sampled over toric valuations
print("-- barycenter / delta_T of the pair --")
v1 = [Fraction(1), Fraction(0)]   # weight 1 (x)
v2 = [Fraction(0), Fraction(1)]   # weight 2 (z)
v0 = [Fraction(-1), Fraction(-2)]  # weight 1 (y)
for c in [Fraction(0), Fraction(1, 4), Fraction(1, 2), Fraction(3, 4),
          Fraction(9, 10)]:
    # P_c vertices computed by hand in the paper:
    A_v = [Fraction(-1), c - 1]
    B_v = [Fraction(-1), Fraction(1)]
    C_v = [3 - 2 * c, c - 1]
    verts = [A_v, B_v, C_v]
    b = [(A_v[k] + B_v[k] + C_v[k]) / 3 for k in range(2)]
    check(f"c={c}: barycenter = ((1-2c)/3,(2c-1)/3)",
          b == [(1 - 2 * c) / 3, (2 * c - 1) / 3], f"(b={b})")
    # A_Delta(w) = phi(w) for the log polytope; coefficient c on D_z
    def A_S(w):
        phi = max(-sum(u[k] * w[k] for k in range(2)) for u in verts)
        Sw = sum(b[k] * w[k] for k in range(2)) + phi
        return phi, Sw
    vals = []
    for v in (v0, v1, v2):
        phi, Sw = A_S(v)
        vals.append(phi / Sw)
    delta_T = min(vals)
    formula = min(Fraction(3, 4 - 2 * c), 3 * (1 - c) / (2 - c))
    check(f"c={c}: delta_T = min(3/(4-2c), 3(1-c)/(2-c)) = {formula}",
          delta_T == formula, f"(rays give {vals})")
    worst = None
    for _ in range(4000):
        w = [Fraction(random.randint(-30, 30), random.randint(1, 7))
             for _ in range(2)]
        if w == [0, 0]:
            continue
        phi, Sw = A_S(w)
        r = phi / Sw
        if worst is None or r < worst:
            worst = r
    check(f"c={c}: sampled inf over N_R >= {formula}", worst >= formula,
          f"(sampled min {worst})")

# consistency of A_Delta(v_i) = phi(v_i) with 1 - coefficient reading:
c = Fraction(1, 4)
verts = [[Fraction(-1), c - 1], [Fraction(-1), Fraction(1)],
         [3 - 2 * c, c - 1]]
phi_v2 = max(-u[1] for u in verts)
check("A_Delta(v_z) = 1 - c", phi_v2 == 1 - c, f"(phi={phi_v2})")
phi_v1 = max(-u[0] for u in verts)
check("A_Delta(v_x) = 1", phi_v1 == 1, f"(phi={phi_v1})")

# ----------------------------------------------------------------------
# (V6) general pair formula: delta(X, sum c_i D_i)
#       = (n+1) min_i a_i(1-c_i) / sum_i a_i(1-c_i)
#      tested on random weights and coefficients (real polytope data)
# ----------------------------------------------------------------------

def pair_polytope(weights, betas):
    """Simplex P = {u : <u,v_i> >= -beta_i} with v_i = e_i (i>=1) and
    v_0 = -(1/a_0) sum_{i>=1} a_i e_i.  Returns rays, vertices, barycenter.
    Only the real geometry matters for the delta computation."""
    n = len(weights) - 1
    B = sum(a * b for a, b in zip(weights, betas))
    v0 = [Fraction(-weights[i + 1], weights[0]) for i in range(n)]
    rays = [v0]
    for i in range(n):
        e = [Fraction(0)] * n
        e[i] = Fraction(1)
        rays.append(e)
    verts = []
    for j in range(n + 1):
        u = [-betas[k + 1] for k in range(n)]
        if j > 0:
            u[j - 1] = (B - weights[j] * betas[j]) / weights[j]
        val = sum(u[k] * v0[k] for k in range(n))
        expect = (B - weights[0] * betas[0]) / weights[0] if j == 0 \
            else -betas[0]
        assert val == expect, (j, val, expect)
        verts.append(u)
    b = [sum(v[k] for v in verts) / (n + 1) for k in range(n)]
    return rays, verts, b


print("== (V6) random log pairs on (fake) WPS: delta formula ==")
fails = 0
for trial in range(60):
    n = random.randint(1, 4)
    weights = [random.randint(1, 9) for _ in range(n + 1)]
    betas = [Fraction(random.randint(1, 8), 8) for _ in range(n + 1)]
    B = sum(a * b for a, b in zip(weights, betas))
    formula = Fraction(n + 1) * min(
        a * b for a, b in zip(weights, betas)) / B
    rays, verts, b = pair_polytope(weights, betas)
    ray_vals = [phi_and_S(v, verts, b) for v in rays]
    ray_min = min(phi / S for phi, S in ray_vals)
    ok = (ray_min == formula)
    worst = None
    for _ in range(600):
        w = [Fraction(random.randint(-20, 20), random.randint(1, 5))
             for _ in range(n)]
        if all(x == 0 for x in w):
            continue
        phi, Sw = phi_and_S(w, verts, b)
        r = phi / Sw
        if worst is None or r < worst:
            worst = r
    ok = ok and worst >= formula
    if not ok:
        fails += 1
        print(f"  counterexample: a={weights}, beta={betas}, "
              f"formula={formula}, ray_min={ray_min}, sampled={worst}")
check("60 random (weights, coefficients): ray min == formula, inf >= formula",
      fails == 0)

# ----------------------------------------------------------------------
# (V7) fake P(1,1,2) = P(1,1,2)/mu_2: same delta as P(1,1,2)
#      rays (-1,2), (-1,-2), (1,0) in N = Z^2 (index-2 ray lattice)
# ----------------------------------------------------------------------
print("== (V7) fake P(1,1,2)/mu_2: lattice-independence of delta ==")
rays_f = [[Fraction(-1), Fraction(2)], [Fraction(-1), Fraction(-2)],
          [Fraction(1), Fraction(0)]]
# weights: w0 + w1 + 2*w2 = 0  -> weights (1,1,2), h = 4
assert all(rays_f[0][k] + rays_f[1][k] + 2 * rays_f[2][k] == 0
           for k in range(2))
verts_f = [[Fraction(1), Fraction(0)], [Fraction(-1), Fraction(-1)],
           [Fraction(-1), Fraction(1)]]
for u in verts_f:  # each vertex saturates exactly two facets
    sat = sum(1 for v in rays_f
              if sum(u[k] * v[k] for k in range(2)) == -1)
    assert sat == 2
b_f = [sum(u[k] for u in verts_f) / 3 for k in range(2)]
ray_vals = []
for v in rays_f:
    phi = max(-sum(u[k] * v[k] for k in range(2)) for u in verts_f)
    Sw = sum(b_f[k] * v[k] for k in range(2)) + phi
    ray_vals.append(phi / Sw)
check("delta(P(1,1,2)/mu_2) = 3/4 = delta(P(1,1,2))",
      min(ray_vals) == Fraction(3, 4), f"(ray values {ray_vals})")

# finite-level S_m on the finer lattice: sections of -mK are the lattice
# points of mP in M = Z^2 (dual of N = Z^2), an index-2 subspace of the
# sections of the cover P(1,1,2)
m = 48
tot = [Fraction(0), Fraction(0), Fraction(0)]
cnt = 0
for x in range(-m, 3 * m + 1):
    for y in range(-2 * m, 2 * m + 1):
        if (-x + 2 * y >= -m and -x - 2 * y >= -m and x >= -m):
            cnt += 1
            for i, v in enumerate(rays_f):
                tot[i] += x * v[0] + y * v[1] + m
S_m_f = [t / (m * cnt) for t in tot]
targets = [Fraction(4, 3), Fraction(4, 3), Fraction(2, 3)]
for i in range(3):
    check(f"P(1,1,2)/mu_2: S_m(ord_D_{i}) -> {targets[i]}",
          abs(S_m_f[i] - targets[i]) < Fraction(1, m),
          f"(S_{m}={S_m_f[i]})")
# volume check: (-K)^2 = 2*Area(P) = 4 = half of P(1,1,2)'s 8
check("P(1,1,2)/mu_2: number of lattice points ~ Area * m^2",
      abs(cnt - 2 * m * m) <= 3 * m + 3, f"(count {cnt}, 2m^2 = {2*m*m})")

# ----------------------------------------------------------------------
# (V8) alpha invariant: alpha(X,Delta) = min_i a_i beta_i / B = delta/(n+1)
#      via alpha = inf_w A(w)/T(w), T(w) = width of P in direction w
# ----------------------------------------------------------------------
print("== (V8) alpha = delta/(n+1) (saturation of BJ upper bound) ==")
fails = 0
for trial in range(40):
    n = random.randint(1, 4)
    weights = [random.randint(1, 9) for _ in range(n + 1)]
    betas = [Fraction(random.randint(1, 8), 8) for _ in range(n + 1)]
    B = sum(a * b for a, b in zip(weights, betas))
    alpha_formula = min(a * b for a, b in zip(weights, betas)) / B
    rays, verts, b = pair_polytope(weights, betas)

    def A_T(w):
        lo = min(sum(u[k] * w[k] for k in range(n)) for u in verts)
        hi = max(sum(u[k] * w[k] for k in range(n)) for u in verts)
        return -lo, hi - lo  # A(w) = phi(w) = -min, T(w) = width

    ray_min = min(Fraction(A) / T for A, T in (A_T(v) for v in rays))
    ok = (ray_min == alpha_formula)
    worst = None
    for _ in range(600):
        w = [Fraction(random.randint(-20, 20), random.randint(1, 5))
             for _ in range(n)]
        if all(x == 0 for x in w):
            continue
        A, T = A_T(w)
        r = Fraction(A) / T
        if worst is None or r < worst:
            worst = r
    ok = ok and worst >= alpha_formula
    if not ok:
        fails += 1
        print(f"  counterexample: a={weights}, beta={betas}, "
              f"formula={alpha_formula}, ray_min={ray_min}, inf={worst}")
check("40 random pairs: alpha = min_i a_i beta_i / B = delta/(n+1)",
      fails == 0)

# ----------------------------------------------------------------------
# (V5) AM-min inequality
# ----------------------------------------------------------------------
print("== (V5) (n+1) a_min <= h, equality iff all equal ==")
bad = 0
for _ in range(20000):
    n = random.randint(1, 6)
    a = [random.randint(1, 40) for _ in range(n + 1)]
    lhs = (n + 1) * min(a)
    h = sum(a)
    if lhs > h or (lhs == h and len(set(a)) != 1):
        bad += 1
check("random check over 20000 weight vectors", bad == 0)

print()
print("ALL CHECKS PASSED" if OK else "SOME CHECKS FAILED")
raise SystemExit(0 if OK else 1)

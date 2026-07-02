r"""Derivation + first verification pass for the closed formulas in the paper.

Family 1:  X_{n,m} = Bl_{P^m} P^n,  0 <= m <= n-2,  k = n-m >= 2.
Toric data: rays e_1,...,e_n, e_0 = -(e_1+...+e_n), u = e_{m+1}+...+e_n.
Anticanonical polytope
    P = { x : x_i >= -1, sum_i x_i <= 1, sum_{j>m} x_j >= -1 }.
Blum-Jonsson:  delta(-K_X) = min_{rays v} 1/(<b,v>+1),  b = barycenter of P.

Reduction: w = x+1 >= 0, s = sum_{i<=m} w_i, t = sum_{j>m} w_j.
Pushforward density: s^{m-1} t^{k-1} on {s>=0, t>=k-1, s+t<=n+1}.

Closed formula proved in the paper:
    delta = (n+1) F / ( (n+1) F + (k-1)^k (m+2)^{m+1} ),
    F = F(n,m) = int_{k-1}^{n+1} t^{k-1} (n+1-t)^m dt.

Family 2:  Y_{a,b} = Bl_{P^a \sqcup P^b} P^n,  a+b = n-1,  1 <= a,b <= n-2.
Rays: e_1..e_n, e_0, u1 = e_{a+1}+...+e_n, u2 = -u1.
    delta = 1/(1+|beta|),
    beta = [ b^{b+1}(a+2)^{a+1} - (b+2)^{b+1} a^{a+1} ] / ( (n+1) F2 ),
    F2 = int_b^{b+2} t^b (n+1-t)^a dt.
"""

import sympy as sp

v = sp.symbols('v', positive=True)


# ---------------------------------------------------------------- Family 1

def barycenter_family1(m, n):
    """Exact barycenter (a, c) via the 1D reduction (method A)."""
    k = n - m
    W, tau = n + 1, k - 1
    if m >= 1:
        I0 = sp.integrate(v**(k - 1) * (W - v)**m / m, (v, tau, W))
        Iu = sp.integrate(v**(k - 1) * (W - v)**(m + 1) / (m + 1), (v, tau, W))
        Iv = sp.integrate(v**k * (W - v)**m / m, (v, tau, W))
        a = sp.nsimplify(Iu / (m * I0) - 1)
        c = sp.nsimplify(Iv / (k * I0) - 1)
    else:
        I0 = sp.integrate(v**(n - 1), (v, tau, W))
        Iv = sp.integrate(v**n, (v, tau, W))
        a, c = None, sp.nsimplify(Iv / (n * I0) - 1)
    return a, c


def delta_family1_bj(m, n):
    """delta via Blum-Jonsson: min over all rays (method A)."""
    k = n - m
    a, c = barycenter_family1(m, n)
    pairs = {'e_j': c, 'E': k * c}
    if m >= 1:
        pairs['e_i'] = a
        pairs['e_0'] = -(m * a + k * c)
    else:
        pairs['e_0'] = -k * c
    ray = max(pairs, key=pairs.get)
    return sp.nsimplify(1 / (1 + pairs[ray])), ray


def delta_family1_closed(m, n):
    """Closed formula of Theorem A."""
    k = n - m
    F = sp.integrate(v**(k - 1) * (n + 1 - v)**m, (v, k - 1, n + 1))
    return sp.nsimplify((n + 1) * F / ((n + 1) * F + (k - 1)**k * (m + 2)**(m + 1)))


def beta0_zhang_zhou(dimV, r):
    """Zhang-Zhou (Math. Z. 2021) Theorem 1.1: beta_0 for P_V(L^{-1}+O),
    V of dimension dimV, -K_V ~ rL.  Here n in their notation = dimV."""
    num = (r + 1)**(dimV + 2) - (r - 1)**(dimV + 2)
    den = (r + 1)**(dimV + 1) - (r - 1)**(dimV + 1)
    return sp.nsimplify(1 / (sp.Rational(dimV + 1, dimV + 2) * sp.Rational(num, den) - (r - 1)))


# ---------------------------------------------------------------- Family 2

def delta_family2(a, b):
    """Bl_{P^a + P^b} P^n, a+b=n-1; barycenter method + closed formula."""
    n = a + b + 1
    # reduction: s = sum of first a shifted coords (density s^{a-1}),
    #            t = sum of last b+1 shifted coords (density t^b),
    #            region: t in [b, b+2], s in [0, n+1-t].
    I0 = sp.integrate(v**b * (n + 1 - v)**a / a, (v, b, b + 2))
    Iu = sp.integrate(v**b * (n + 1 - v)**(a + 1) / (a + 1), (v, b, b + 2))
    It = sp.integrate(v**(b + 1) * (n + 1 - v)**a / a, (v, b, b + 2))
    alpha = sp.nsimplify(Iu / (a * I0) - 1)      # coord of first group
    gamma = sp.nsimplify(It / ((b + 1) * I0) - 1)  # coord of second group
    pairs = {
        'e_i': alpha,
        'e_j': gamma,
        'u1': (b + 1) * gamma,
        'u2': -(b + 1) * gamma,
        'e_0': -(a * alpha + (b + 1) * gamma),
    }
    ray = max(pairs, key=pairs.get)
    d_bj = sp.nsimplify(1 / (1 + pairs[ray]))
    # closed formula
    F2 = sp.integrate(v**b * (n + 1 - v)**a, (v, b, b + 2))
    D = b**(b + 1) * (a + 2)**(a + 1) - (b + 2)**(b + 1) * a**(a + 1)
    d_closed = sp.nsimplify(1 / (1 + sp.Abs(sp.Rational(D) / ((n + 1) * F2))))
    return d_bj, d_closed, ray


if __name__ == '__main__':
    print("=== Family 1: barycenter method vs closed formula ===")
    for n in range(2, 11):
        for m in range(0, n - 1):
            d1, ray = delta_family1_bj(m, n)
            d2 = delta_family1_closed(m, n)
            assert sp.simplify(d1 - d2) == 0, (n, m, d1, d2)
            assert ray == 'E', (n, m, ray)
            assert d1 < 1
            if n <= 6:
                print(f"  delta(Bl_(P^{m}) P^{n}) = {d1} ~ {float(d1):.6f}  [computed by E]")
    print("  agreement + minimizer=E + delta<1 verified for all 2<=n<=10.")

    print()
    print("=== Special cases against the literature ===")
    d, _ = delta_family1_bj(0, 2)
    print(f"  Bl_pt P^2: {d} (Szekelyhidi 2011: 6/7)")
    assert d == sp.Rational(6, 7)
    for n in range(2, 9):
        d, _ = delta_family1_bj(0, n)
        b0 = beta0_zhang_zhou(n - 1, n)
        assert sp.simplify(d - b0) == 0, (n, d, b0)
    print("  m=0 agrees with Zhang-Zhou beta_0 (P^1-bundle case) for 2<=n<=8.")
    # codimension-two closed form delta = (2n+2)/(3n+1)
    for n in range(3, 12):
        d, _ = delta_family1_bj(n - 2, n)
        assert d == sp.Rational(2 * n + 2, 3 * n + 1), (n, d)
    print("  m=n-2 gives delta=(2n+2)/(3n+1) for 3<=n<=11; e.g. MM 2.33: "
          f"{delta_family1_bj(1,3)[0]}")

    print()
    print("=== Family 2: barycenter method vs closed formula ===")
    for n in range(3, 11):
        for a in range(1, n - 1):
            b = n - 1 - a
            if b < 1 or b > n - 2:
                continue
            d1, d2, ray = delta_family2(a, b)
            assert sp.simplify(d1 - d2) == 0, (a, b, d1, d2)
            if a == b:
                assert d1 == 1, (a, b, d1)
            else:
                assert d1 < 1
                expect = 'u1' if a < b else 'u2'
                assert ray == expect, (a, b, ray)
            if n <= 7:
                print(f"  delta(Bl_(P^{a}+P^{b}) P^{n}) = {d1} ~ {float(d1):.6f}"
                      f"  [minimizing ray {ray}]")
    print("  agreement + (delta=1 iff a=b) + smaller-center rule verified, n<=10.")
    d_futaki = delta_family2(1, 2)[0]
    print(f"  Futaki's example Bl_(P^1+P^2) P^4: delta = {d_futaki}")
    assert d_futaki == sp.Rational(125, 131)

    print()
    print("All derivation checks passed.")

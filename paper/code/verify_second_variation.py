"""Symbolic and numerical verification of Lemma 3.1 and Theorem 3.2.

Part 1 expands L, A and the bending energy m of the polar graph
rho = r + eps*u(theta) to second order in eps, for a space form of arbitrary
curvature c, treating S0 = sn_c(r) and C0 = cs_c(r) as symbols with
C0^2 + c S0^2 = 1.  Periodic integrals are reduced with
int u' = int u'' = int u u' = int u' u'' = 0 and int u u'' = -int u'^2.

Part 2 checks the resulting second variation of the Gage deficit against
    pi (k^2 - 1)(k^2 - 2 + c S0^2) / S0^3
and against the explicit functions sin, id, sinh for c = 1, 0, -1.

Part 3 compares the predicted coefficient with the spectral numerics:
G(eps)/eps^2 for small eps.
"""

import sys

import numpy as np
import sympy as sp

sys.path.insert(0, __file__.rsplit("/", 1)[0])
import curves  # noqa: E402

eps = sp.Symbol("epsilon", real=True)
c = sp.Symbol("c", real=True)
S0 = sp.Symbol("S0", positive=True)
C0 = sp.Symbol("C0", positive=True)
U, U1, U2 = sp.symbols("U U1 U2", real=True)
I0, I2, J1, J2 = sp.symbols("I0 I2 J1 J2", real=True)
k = sp.Symbol("k", positive=True)


def periodic_integral(expr):
    """Integrate a polynomial of degree <= 2 in (u, u', u'') over one period."""
    rules = {(0, 0, 0): 2 * sp.pi, (1, 0, 0): I0, (0, 1, 0): 0, (0, 0, 1): 0,
             (2, 0, 0): I2, (0, 2, 0): J1, (0, 0, 2): J2,
             (1, 0, 1): -J1, (1, 1, 0): 0, (0, 1, 1): 0}
    poly = sp.Poly(sp.expand(expr), U, U1, U2)
    return sp.expand(sum(coef * rules[mono] for mono, coef in poly.terms()))


def order(expr, n):
    expanded = sp.expand(sp.series(expr, eps, 0, 3).removeO())
    return sp.expand(expanded.coeff(eps, n).subs(C0 ** 2, 1 - c * S0 ** 2))


def expansions():
    x = eps * U
    S = S0 + C0 * x - c * S0 * x ** 2 / 2          # sn_c(r + x) to second order
    C = C0 - c * S0 * x - c * C0 * x ** 2 / 2      # cs_c(r + x) to second order
    R1, R2 = eps * U1, eps * U2
    M = R1 ** 2 + S ** 2
    ds = sp.sqrt(M)
    bending = (S ** 2 * C + 2 * C * R1 ** 2 - S * R2) ** 2 / M ** sp.Rational(5, 2)
    area = S0 * x + C0 * x ** 2 / 2                # int_r^{r+x} sn_c, to second order
    out = {}
    for name, dens in (("L", ds), ("A", area), ("m", bending)):
        out[name] = [periodic_integral(order(dens, j)) for j in (0, 1, 2)]
    return out


def pointwise_checks():
    """The intermediate expansions displayed in the proof of Lemma 3.1 and in Proposition 5.6."""
    x = eps * U
    S = S0 + C0 * x - c * S0 * x ** 2 / 2
    C = C0 - c * S0 * x - c * C0 * x ** 2 / 2
    R1, R2 = eps * U1, eps * U2
    M = R1 ** 2 + S ** 2
    red = lambda e: sp.simplify(sp.expand(e).subs(C0 ** 2, 1 - c * S0 ** 2))
    trunc = lambda e, n: sp.expand(sp.series(e, eps, 0, n + 1).removeO())
    checks = {
        "sqrt(R'^2+S^2)": (trunc(sp.sqrt(M), 2),
                           S0 + eps * C0 * U + eps ** 2 * (U1 ** 2 - c * S0 ** 2 * U ** 2) / (2 * S0)),
        "numerator N": (trunc(S ** 2 * C + 2 * C * R1 ** 2 - S * R2, 2),
                        S0 ** 2 * C0 + eps * (S0 * (2 * C0 ** 2 - c * S0 ** 2) * U - S0 * U2)
                        + eps ** 2 * (C0 * (2 * C0 ** 2 - 7 * c * S0 ** 2) * U ** 2 / 2 - C0 * U * U2 + 2 * C0 * U1 ** 2)),
        "(R'^2+S^2)^(-5/2)": (trunc(M ** sp.Rational(-5, 2), 2),
                              S0 ** -5 * (1 - 5 * eps * C0 * U / S0
                                          + eps ** 2 * (sp.Rational(35, 2) * C0 ** 2 * U ** 2
                                                        - sp.Rational(5, 2) * ((C0 ** 2 - c * S0 ** 2) * U ** 2 + U1 ** 2)) / S0 ** 2)),
        "kappa, first order": (trunc((S ** 2 * C + 2 * C * R1 ** 2 - S * R2) / M ** sp.Rational(3, 2), 1),
                               C0 / S0 - eps * (U + U2) / S0 ** 2),
    }
    ok = True
    for name, (lhs, rhs) in checks.items():
        diff = red(lhs - rhs)
        diff = sp.simplify(diff.subs(C0, sp.sqrt(1 - c * S0 ** 2)))
        ok &= diff == 0
        print(f"  {name}: {'ok' if diff == 0 else 'MISMATCH ' + str(diff)}")
    return ok


def main():
    ok = True
    print("Part 0: pointwise expansions used in the text")
    ok &= pointwise_checks()
    ex = expansions()
    L1, L2 = ex["L"][1], ex["L"][2]
    A1, A2 = ex["A"][1], ex["A"][2]
    m0, m1, m2 = ex["m"]
    claimed = {
        "L1": C0 * I0,
        "L2": (J1 - c * S0 ** 2 * I2) / (2 * S0),
        "A1": S0 * I0,
        "A2": C0 * I2 / 2,
        "m0": 2 * sp.pi * (1 - c * S0 ** 2) / S0,
        "m1": -C0 * (1 + c * S0 ** 2) * I0 / S0 ** 2,
        "m2": (2 * J2 + (c * S0 ** 2 - 5) * J1 + (2 - c * S0 ** 2 + c ** 2 * S0 ** 4) * I2) / (2 * S0 ** 3),
    }
    computed = {"L1": L1, "L2": L2, "A1": A1, "A2": A2, "m0": m0, "m1": m1, "m2": m2}
    print("Part 1: second-order expansions of the polar graph r + eps*u")
    for key in claimed:
        diff = sp.simplify((computed[key] - claimed[key]).subs(C0, sp.sqrt(1 - c * S0 ** 2)))
        status = "ok" if diff == 0 else f"MISMATCH ({diff})"
        ok &= diff == 0
        print(f"  {key}: {sp.factor(claimed[key])}   [{status}]")

    Ls, As = sp.symbols("Ls As", positive=True)
    F = (2 * sp.pi - c * As) ** 2 * Ls / (As * (4 * sp.pi - c * As))
    at_circle = {Ls: 2 * sp.pi * S0, As: 2 * sp.pi * (1 - C0) / c}
    d = {name: sp.diff(F, *vars_).subs(at_circle) for name, vars_ in
         (("L", (Ls,)), ("A", (As,)), ("LL", (Ls, Ls)), ("LA", (Ls, As)), ("AA", (As, As)))}

    def reduce(e):
        return sp.factor(sp.simplify(e.subs(c, (1 - C0 ** 2) / S0 ** 2)))

    print("\nPart 2: derivatives of F(L,A) at the circle and the second variation")
    print("  F_L =", reduce(d["L"]), "   F_A =", reduce(d["A"]))
    first = reduce(m1 - d["L"] * L1 - d["A"] * A1)
    print("  first variation:", first)
    ok &= first == 0
    Q = m2 - d["L"] * L2 - d["A"] * A2 - (d["LL"] * L1 ** 2 + 2 * d["LA"] * L1 * A1 + d["AA"] * A1 ** 2) / 2
    a0 = sp.Symbol("a0")
    mean_mode = reduce(Q.subs({I0: 2 * sp.pi * a0, I2: 2 * sp.pi * a0 ** 2, J1: 0, J2: 0}))
    print("  mean mode (u = a0):", mean_mode)
    ok &= mean_mode == 0
    zero_mean = reduce(Q.subs(I0, 0))
    quad = (J2 + (c * S0 ** 2 - 3) * J1 + (2 - c * S0 ** 2) * I2) / S0 ** 3
    ok &= reduce(zero_mean - quad) == 0
    print("  zero-mean part equals S0^-3 * int(u''^2 + (c S0^2 - 3) u'^2 + (2 - c S0^2) u^2):",
          reduce(zero_mean - quad) == 0)
    qk = reduce(Q.subs({I0: 0, I2: sp.pi, J1: sp.pi * k ** 2, J2: sp.pi * k ** 4}))
    target = sp.pi * (k ** 2 - 1) * (k ** 2 - 2 + c * S0 ** 2) / S0 ** 3
    ok &= reduce(qk - target) == 0
    print("  mode k (u = cos k theta):", sp.factor(sp.simplify(target)), "  matches:", reduce(qk - target) == 0)

    # optimal local constant: m - K^2/L - mu*Delta has mode-k coefficient pi(k^2-1)((k^2-1) - 2 pi mu S0^3)/S0^3
    mu = sp.Symbol("mu")
    K0, L0 = 2 * sp.pi * C0, 2 * sp.pi * S0
    FCS = (2 * sp.pi - c * As) ** 2 / Ls + mu * (Ls ** 2 - 4 * sp.pi * As + c * As ** 2)
    dCS = {name: sp.diff(FCS, *vars_).subs(at_circle) for name, vars_ in
           (("L", (Ls,)), ("A", (As,)))}
    QCS = reduce((m2 - dCS["L"] * L2 - dCS["A"] * A2).subs({I0: 0, I2: sp.pi, J1: sp.pi * k ** 2, J2: sp.pi * k ** 4}))
    targetCS = sp.pi * (k ** 2 - 1) * ((k ** 2 - 1) - 2 * sp.pi * mu * S0 ** 3) / S0 ** 3
    ok &= reduce(QCS - targetCS) == 0
    print("  K^2/L + mu*Delta: mode-k coefficient pi(k^2-1)((k^2-1) - 2 pi mu S0^3)/S0^3:", reduce(QCS - targetCS) == 0)

    # explicit space forms, direct series in r
    r, th = sp.symbols("r theta", positive=True)
    print("\n  explicit check with sn = sin, id, sinh:")
    for cval, sn in ((1, sp.sin), (0, lambda t: t), (-1, sp.sinh)):
        for kv in (2, 3):
            u = sp.cos(kv * th)
            rho = r + eps * u
            rp, rpp = sp.diff(rho, th), sp.diff(rho, th, 2)
            Sx = sn(rho)
            Cx = {1: sp.cos(rho), 0: sp.Integer(1), -1: sp.cosh(rho)}[cval]
            Mx = rp ** 2 + Sx ** 2
            bend = (Sx ** 2 * Cx + 2 * Cx * rp ** 2 - Sx * rpp) ** 2 / Mx ** sp.Rational(5, 2)
            area = (1 - Cx) / cval if cval != 0 else rho ** 2 / 2
            ser = lambda e: sp.expand(sp.series(e, eps, 0, 3).removeO())

            def integ(e):
                val = sp.integrate(e, (th, 0, 2 * sp.pi))
                # sqrt(sin(r)^2) is returned piecewise; the branch r <= pi is the relevant one
                return val.args[0][0] if isinstance(val, sp.Piecewise) else val
            Lx = integ(ser(sp.sqrt(Mx))); Ax = integ(ser(area)); mx = integ(ser(bend))
            Fx = sp.pi * Lx / Ax if cval == 0 else (2 * sp.pi - cval * Ax) ** 2 * Lx / (Ax * (4 * sp.pi - cval * Ax))
            G = sp.series(mx - Fx, eps, 0, 3).removeO()
            coeffs = [sp.simplify(G.coeff(eps, j)) for j in (0, 1, 2)]
            pred = sp.pi * (kv ** 2 - 1) * (kv ** 2 - 2 + cval * sn(r) ** 2) / sn(r) ** 3
            good = sp.simplify(coeffs[0]) == 0 and sp.simplify(coeffs[1]) == 0 and sp.simplify(coeffs[2] - pred) == 0
            ok &= good
            print(f"    c={cval:+d}, k={kv}: eps^2-coefficient = {sp.factor(coeffs[2])}   [{'ok' if good else 'MISMATCH'}]")

    print("\nPart 3: spectral numerics, G(eps)/eps^2 versus the predicted coefficient")
    n = 1024
    theta = 2 * np.pi * np.arange(n) / n
    for cval, radii in ((1, (0.3, 0.8, 1.3)), (0, (1.0,)), (-1, (0.5, 1.0, 1.5, 2.5))):
        for rv in radii:
            for kv in (2, 3, 4):
                vals = []
                for e in (1e-3, 5e-4):
                    data = curves.curve_from_polar_graph(rv + e * np.cos(kv * theta), cval)
                    if cval == 0:
                        G = data.m - np.pi * data.L / data.A
                    else:
                        G = curves.gage_deficit(data)
                    vals.append(G / e ** 2)
                Richardson = (4 * vals[1] - vals[0]) / 3  # removes the O(eps) term
                s = {1: np.sin, 0: (lambda t: t), -1: np.sinh}[cval](rv)
                pred = np.pi * (kv ** 2 - 1) * (kv ** 2 - 2 + cval * s ** 2) / s ** 3
                rel = abs(Richardson - pred) / abs(pred)
                ok &= rel < 1e-4
                print(f"  c={cval:+d} r={rv:4.2f} k={kv}: numeric {Richardson: .8f}  predicted {pred: .8f}  rel.err {rel:.1e}")
    print("\nALL CHECKS PASSED" if ok else "\nSOME CHECK FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())

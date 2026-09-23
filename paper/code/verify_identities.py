#!/usr/bin/env python3
"""Reproduce the numerical checks in harmonic-first-moment.tex.

The expensive Petersson-norm integral is optional (``--norm``).  The default
run checks Ramanujan's tau values, the Gaussian weight V_k(1), the central
value of the discriminant via its Mellin transform, the approximate functional
equation, the Kloosterman--Bessel series for omega_Delta, and the central
derivative of the weight-18 eigenform.
"""

from __future__ import annotations

import argparse
import math

import mpmath as mp


def tau_up_to(N: int) -> list[int]:
    """Coefficients of Delta = q * prod_n (1-q^n)^24, via truncated multiplication."""
    coeff = [0] * (N + 1)
    coeff[0] = 1
    binom = [1]
    for j in range(1, 25):
        binom.append(binom[-1] * (25 - j) // j)
    for n in range(1, N + 1):
        new = [0] * (N + 1)
        for j in range(25):
            shift = n * j
            if shift > N:
                break
            c = binom[j] * (1 if j % 2 == 0 else -1)
            for m in range(N + 1 - shift):
                if coeff[m]:
                    new[m + shift] += coeff[m] * c
        coeff = new
    tau = [0] * (N + 1)
    for n in range(1, N + 1):
        tau[n] = coeff[n - 1]
    return tau


def sigma(n: int, power: int) -> int:
    s = 0
    d = 1
    while d * d <= n:
        if n % d == 0:
            s += d**power
            if d * d != n:
                s += (n // d) ** power
        d += 1
    return s


def weight18_coefficients(tau: list[int]) -> list[int]:
    N = len(tau) - 1
    a = [0] * (N + 1)
    for n in range(1, N + 1):
        s = tau[n]  # e_0 = 1
        for m in range(1, n):
            s += tau[m] * (-504 * sigma(n - m, 5))
        a[n] = s
    return a


def mellin_weight(k: int, y: mp.mpf, power: int, T: int = 20, sigma: int = 2):
    """V_k if power==1, W_k if power==2, evaluated by a vertical integral."""
    ell = mp.mpf(k) / 2

    def real_integrand(t):
        s = sigma + 1j * mp.mpf(t)
        log_val = (
            mp.loggamma(ell + s)
            - mp.loggamma(ell)
            - s * mp.log(2 * mp.pi * y)
            + s * s
            - power * mp.log(s)
        )
        return mp.re(mp.e**log_val) / (2 * mp.pi)

    return mp.quad(real_integrand, [-T, T])


def kloosterman_11(c: int) -> mp.mpc:
    if c == 1:
        return mp.mpc(1)
    acc = mp.mpc(0)
    for d in range(1, c):
        if math.gcd(d, c) != 1:
            continue
        inv = pow(d, -1, c)
        acc += mp.e ** (2j * mp.pi * (inv + d) / c)
    return acc


def petersson_diagonal(k: int, cmax: int) -> mp.mpc:
    """1 + 2*pi*(-i)^k * sum_{c<=cmax} S(1,1;c)/c * J_{k-1}(4*pi/c)."""
    nu = k - 1
    acc = mp.mpc(0)
    phase = (mp.mpc(0, -1)) ** k
    for c in range(1, cmax + 1):
        acc += kloosterman_11(c) / c * mp.besselj(nu, 4 * mp.pi / c)
    return 1 + 2 * mp.pi * phase * acc


def central_value_delta(tau: list[int]) -> mp.mpf:
    """L(1/2, Delta) from the split Mellin transform at weight 12."""
    N = len(tau) - 1

    def f_iy(y):
        s = mp.mpf(0)
        for n in range(1, N + 1):
            s += tau[n] * mp.e ** (-2 * mp.pi * n * y)
        return s

    # Root number +1 collapses I(1/2) to 2 * int_1^inf f(iy) y^5 dy.
    integral = 2 * mp.quad(lambda y: f_iy(y) * y**5, [1, mp.inf])
    return integral * (2 * mp.pi) ** 6 / mp.gamma(6)


def central_derivative_weight18(a: list[int]) -> mp.mpf:
    N = len(a) - 1
    ell = 9

    def f_iy(y):
        s = mp.mpf(0)
        for n in range(1, N + 1):
            s += a[n] * mp.e ** (-2 * mp.pi * n * y)
        return s

    # I'(1/2) = 2 int_1^inf f(iy) y^{ell-1} log y dy, then divide by the gamma factor.
    ip = 2 * mp.quad(lambda y: f_iy(y) * mp.log(y) * y ** (ell - 1), [1, mp.inf])
    return ip * (2 * mp.pi) ** ell / mp.gamma(ell)


def petersson_norm_delta(tau: list[int]) -> mp.mpf:
    """Integrate |Delta|^2 y^{10} over the standard fundamental domain."""
    N = len(tau) - 1

    def delta(x, y):
        s = mp.mpc(0)
        for n in range(1, N + 1):
            s += tau[n] * mp.e ** (2j * mp.pi * n * (x + 1j * y))
        return s

    def inner(x):
        y0 = mp.sqrt(1 - x * x)

        def f(y):
            d = delta(x, y)
            return (abs(d) ** 2) * y**10

        return mp.quad(f, [y0, mp.inf])

    return mp.quad(inner, [mp.mpf("-0.5"), mp.mpf("0.5")])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dps", type=int, default=20)
    parser.add_argument("--norm", action="store_true", help="also integrate the Petersson norm")
    parser.add_argument("--N", type=int, default=180, help="Fourier truncation")
    args = parser.parse_args()
    mp.mp.dps = args.dps

    tau = tau_up_to(args.N)
    known = {1: 1, 2: -24, 3: 252, 4: -1472, 5: 4830, 6: -6048, 7: -16744}
    for n, value in known.items():
        if tau[n] != value:
            raise SystemExit(f"tau({n})={tau[n]} != {value}")
    print("tau coefficients: ok")

    print("V_k(1) approaching 1:")
    for k in (12, 24, 48, 120, 400, 1600):
        v = mellin_weight(k, mp.mpf(1), power=1, T=16)
        print(f"  k={k:5d}  V={mp.nstr(v, 8)}  k(1-V)={mp.nstr(k * (1 - v), 6)}")

    series = petersson_diagonal(12, cmax=40)
    print("Petersson diagonal at (1,1), weight 12:", mp.nstr(series, 12))

    L = central_value_delta(tau)
    print("L(1/2, Delta) =", mp.nstr(L, 12))
    afe = mp.mpf(0)
    for n in range(1, min(args.N, 80) + 1):
        lam = tau[n] / mp.power(n, mp.mpf("5.5"))
        afe += lam / mp.sqrt(n) * mellin_weight(12, n, power=1, T=12)
    print("AFE partial sum (n<=80) =", mp.nstr(2 * afe, 8))

    a = weight18_coefficients(tau)
    if a[1] != 1 or a[2] != -528:
        raise SystemExit(f"unexpected weight-18 coefficients {a[1]}, {a[2]}")
    print("weight-18 coefficients a1=1, a2=-528: ok")
    Lp = central_derivative_weight18(a)
    print("L'(1/2, f_18) =", mp.nstr(Lp, 10))

    if args.norm:
        norm = petersson_norm_delta(tau_up_to(max(args.N, 60)))
        omega = mp.gamma(11) / ((4 * mp.pi) ** 11 * norm)
        print("norm =", mp.nstr(norm, 12))
        print("omega =", mp.nstr(omega, 12))
        print("omega * L =", mp.nstr(omega * L, 8))
        print("L(1, sym^2 Delta) =", mp.nstr(2 * mp.pi**2 / (11 * omega), 10))
        print("omega - Petersson series =", mp.nstr(omega - series, 6))


if __name__ == "__main__":
    main()

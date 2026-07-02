"""Numerical verification of the asymptotic statements (Theorem C).

(i)   m fixed, n -> infinity:
        delta(X_{n,m}) -> delta_inf(m) = e^c g / (e^c g + c^{m+1}),
      where c = m+2 and g = lower incomplete gamma(m+1, c).
      In particular delta_inf(0) = tanh(1).

(ii)  k = n-m fixed, m -> infinity:
        delta(X_{n,m}) -> H_k / (H_k + k - 1),
      where H_k = e^{k-1} (k-1)^{1-k} Gamma(k, k-1) (upper incomplete).
      In particular k=2 gives 2/3, consistent with the exact value
      (2n+2)/(3n+1).

(iii) m = round(theta*n), n -> infinity:
        sqrt(n) * delta(X_{n,m}) -> sqrt(pi / (2 theta (1-theta))).
"""

import mpmath as mp
import sympy as sp
import sys
sys.path.insert(0, '.')
from derive_formula import delta_family1_bj

mp.mp.dps = 40


def delta_numeric(m, n):
    """High-precision delta via the closed formula."""
    k = n - m
    F = mp.quad(lambda t: t**(k - 1) * (n + 1 - t)**m, [k - 1, n + 1])
    return (n + 1) * F / ((n + 1) * F + (k - 1)**k * (m + 2)**(m + 1))


def delta_inf_fixed_m(m):
    c = m + 2
    g = mp.gammainc(m + 1, 0, c)     # lower incomplete gamma
    return mp.e**c * g / (mp.e**c * g + mp.mpf(c)**(m + 1))


def delta_inf_fixed_k(k):
    H = mp.e**(k - 1) * mp.mpf(k - 1)**(1 - k) * mp.gammainc(k, k - 1)  # upper
    return H / (H + k - 1)


print("(i) fixed m, n -> infinity")
for m in [0, 1, 2, 3]:
    lim = delta_inf_fixed_m(m)
    vals = [(n, delta_numeric(m, n)) for n in [20, 100, 400, 1600]]
    errs = [abs(v - lim) for _, v in vals]
    print(f"  m={m}: limit={mp.nstr(lim, 10)}  "
          f"errors at n=20,100,400,1600: {[mp.nstr(e, 3) for e in errs]}")
    assert errs[-1] < errs[0] / 10 and errs[-1] < 1e-3
print(f"  delta_inf(0) = {mp.nstr(delta_inf_fixed_m(0), 15)}  "
      f"tanh(1) = {mp.nstr(mp.tanh(1), 15)}")
assert abs(delta_inf_fixed_m(0) - mp.tanh(1)) < mp.mpf(10)**-30

print()
print("(ii) fixed k, m -> infinity")
for k in [2, 3, 5, 10]:
    lim = delta_inf_fixed_k(k)
    vals = [delta_numeric(n - k, n) for n in [k + 20, k + 100, k + 400, k + 1600]]
    errs = [abs(v - lim) for v in vals]
    print(f"  k={k}: limit={mp.nstr(lim, 10)}  "
          f"errors: {[mp.nstr(e, 3) for e in errs]}")
    assert errs[-1] < errs[0] / 10 and errs[-1] < 1e-2
print(f"  k=2 limit = {mp.nstr(delta_inf_fixed_k(2), 10)} (should be 2/3);"
      f" exact value (2n+2)/(3n+1) -> 2/3")
assert abs(delta_inf_fixed_k(2) - mp.mpf(2) / 3) < mp.mpf(10)**-30

print()
print("(iii) proportional regime m ~ theta n")
for theta in [mp.mpf('0.25'), mp.mpf('0.5'), mp.mpf('0.75')]:
    target = mp.sqrt(mp.pi / (2 * theta * (1 - theta)))
    print(f"  theta={float(theta)}: predicted sqrt(n)*delta -> {mp.nstr(target, 8)}")
    prev_err = None
    for n in [100, 400, 1600, 6400]:
        m = int(mp.nint(theta * n))
        val = mp.sqrt(n) * delta_numeric(m, n)
        err = abs(val - target)
        print(f"    n={n}: sqrt(n)*delta = {mp.nstr(val, 8)}  |diff| = {mp.nstr(err, 3)}")
        if prev_err is not None:
            assert err < prev_err
        prev_err = err

print()
print("Cross-check numeric formula against exact sympy values (small n):")
for (m, n) in [(0, 5), (1, 5), (2, 6), (3, 7)]:
    exact, _ = delta_family1_bj(m, n)
    num = delta_numeric(m, n)
    assert abs(mp.mpf(str(sp.nsimplify(exact).evalf(35))) - num) < mp.mpf(10)**-25
    print(f"  (m,n)=({m},{n}): exact {exact} matches numeric.")

print()
print("All asymptotic verifications passed.")

"""Cross-checks of our closed formulas against results in the literature,
plus verification of the remaining asymptotic claims used in the paper.

1. m = 0 (Bl_pt P^n = P_{P^{n-1}}(O + O(-1))): our closed form equals the
   beta_0 of Zhang-Zhou (Math. Z. 298 (2021), Theorem 1.1), and simplifies to
        delta = ((n+1)^{n+1} - (n+1)(n-1)^n) / ((n+1)^{n+1} + (n-1)^{n+1}).

2. m = n-2 (P^{n-1}-bundle over P^1 with E = O^{n-1} + O(1)): our value
   (2n+2)/(3n+1) equals the upper bound s_1 of Benammar Ammar-Massonnet-Yin
   (arXiv:2411.05976, Theorem 1.7) at the anticanonical polarization,
   proving that their upper bound is attained for this family.

3. Binomial-sum form of Theorem A:
   beta = (k-1)^k (m+2)^{m+1} n! / ( (n+1) (k-1)! m! * sum_{j<k} C(n,j)(k-1)^j (m+2)^{n-j} ).

4. Family 2, a fixed, b -> infinity:
   delta -> C_a / (C_a + e^{-2}((a+2)^{a+1} - e^2 a^{a+1})),
   C_a = int_0^2 e^{-s} (a+s)^a ds.
"""

import sympy as sp
import mpmath as mp
import sys
sys.path.insert(0, '.')
from derive_formula import delta_family1_bj, delta_family1_closed, delta_family2

mp.mp.dps = 30

print("1) m=0 closed form and Zhang-Zhou beta_0")
for n in range(2, 15):
    ours, _ = delta_family1_bj(0, n)
    simple = sp.Rational((n + 1)**(n + 1) - (n + 1) * (n - 1)**n,
                         (n + 1)**(n + 1) + (n - 1)**(n + 1))
    num = n * ((n + 1)**(n + 1) - (n - 1)**(n + 1))
    den = (n + 1) * ((n + 1)**n - (n - 1)**n)
    beta0 = sp.Rational(1) / (sp.Rational(num, den) - (n - 1))
    assert ours == simple == beta0, (n, ours, simple, beta0)
print("   verified for 2 <= n <= 14")

print()
print("2) m=n-2 equals the BMY upper bound s1 at -K")
for n in range(3, 30):
    ours, _ = delta_family1_bj(n - 2, n) if n <= 8 else (None, None)
    closed = delta_family1_closed(n - 2, n)
    # BMY: rank n bundle E = O^{n-1} + O(1) on P^1, mu=1/n, r=1, mumax=1,
    # mumin=0, L = -K = n xi + f  (a=n, b=1)
    a_, b_ = n, 1
    mu, mumax, mumin, r = sp.Rational(1, n), 1, 0, 1
    s1 = sp.Rational(n * (n + 1) * (a_ * mu + b_),
                     a_ * ((r + 1) * (a_ * mumax + b_) + (n - r) * (a_ * mumin + b_)))
    Sf = (sp.Rational(n * (a_ * mumin + b_) * (a_ * (2 * mu - mumin) + b_), 2)
          + sp.Rational(a_**2, 1) * (mumax - mumin)**2 * sp.Rational(r * (r + 1), 2 * (n + 1))) \
        / (n * (a_ * mu + b_))
    upper = min(1 / Sf, s1)
    assert closed == sp.Rational(2 * n + 2, 3 * n + 1) == s1 == upper
    if ours is not None:
        assert ours == closed
print("   delta(X_{n,n-2}) = (2n+2)/(3n+1) = BMY s1 = BMY upper bound, 3<=n<=29")

print()
print("3) binomial-sum form of beta")
for (m, n) in [(0, 2), (1, 3), (2, 5), (3, 8), (0, 7)]:
    k = n - m
    S = sum(sp.binomial(n, j) * (k - 1)**j * (m + 2)**(n - j) for j in range(k))
    beta = sp.Rational((k - 1)**k * (m + 2)**(m + 1) * sp.factorial(n),
                       (n + 1) * sp.factorial(k - 1) * sp.factorial(m) * S)
    d = sp.Rational(1) / (1 + beta)
    assert d == delta_family1_closed(m, n), (m, n)
    print(f"   (m,n)=({m},{n}): delta = {d}  OK")

print()
print("4) family 2, fixed a, b -> infinity")
s = sp.symbols('s', positive=True)
for a in [1, 2, 3]:
    Ca = mp.quad(lambda x: mp.e**(-x) * (a + x)**a, [0, 2])
    lim = Ca / (Ca + mp.e**-2 * ((a + 2)**(a + 1) - mp.e**2 * a**(a + 1)))
    errs = []
    for b in [50, 200, 800]:
        d = delta_family2(a, b)[1]
        errs.append(abs(mp.mpf(str(sp.N(d, 25))) - lim))
    print(f"   a={a}: limit={mp.nstr(lim, 10)}  errors at b=50,200,800: "
          f"{[mp.nstr(e, 3) for e in errs]}")
    assert errs[2] < errs[1] < errs[0] and errs[2] < 5e-3

print()
print("   Futaki fourfold Bl_(P^1+P^2)P^4: delta =", delta_family2(1, 2)[1])
print()
print("All literature cross-checks passed.")

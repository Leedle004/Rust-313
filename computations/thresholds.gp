rhs(n, x) = 2^(n*(n-1)) * (1 + (2*x)^(1/(n-1)))^(n*(n-1)/2);
\\ smallest integer A with  x^(n-1) > rhs(n,x) for all x >= A (checked on a fine grid beyond the crossing)
thrA(n) = { my(x = 2); while (x^(n-1) <= rhs(n, x), x = ceil(x * 1.001) + 1); my(lo = x \ 2, hi = x);
  while (hi - lo > 1, my(m = (lo + hi) \ 2); if (m^(n-1) > rhs(n, m), hi = m, lo = m)); hi; }
thrB(n) = { my(c = (n-1)^(n-1), N = n^n, f(x) = x^(n-1) * (c*x - N) - rhs(n, x), x = N);
  while (f(x) <= 0, x = ceil(x * 1.001) + 1); my(lo = 1, hi = x);
  while (hi - lo > 1, my(m = (lo + hi) \ 2); if (f(m) > 0, hi = m, lo = m)); hi; }
for (n = 3, 8, print("n=", n, "  A_n=", thrA(n), "  B_n=", thrB(n)));
\\ sanity: monotonicity beyond thresholds on a sample grid
for (n = 3, 8, my(A = thrA(n), ok = 1); for (k = 0, 2000, my(x = A + k*(A\100 + 1)); if (x^(n-1) <= rhs(n, x), ok = 0)); print("n=", n, " monotone check A: ", ok));

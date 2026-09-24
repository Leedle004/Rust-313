\\ Complex cubic members n = 3, a = -b <= -2 squarefree.
\\ Claim: eta = 1/(theta_r + 1) is a fundamental unit.
\\ Unconditional check: if |d_K| > 4((8b)^(3/8)+1)^4 the claim follows from Theorem 5.3;
\\ otherwise we verify directly (nfroots, no GRH) that +-(theta+1) is not a p-th power
\\ for every prime p <= k_max, where k_max comes from the lower bound for units.
default(parisize, 2*10^9);
{
my(B = 10000, nsq = 0, nbound = 0, ncert = 0, fails = List());
for (b = 2, B,
  if (!issquarefree(b), next);
  nsq++;
  my(a = -b, f = x^3 - a*x - a, dK = abs(nfdisc(f)));
  if (dK > 4*((8*b)^(3/8) + 1)^4, nbound++; next);
  \\ direct certification (number field in the variable y, lower priority than x)
  my(fy = subst(f, x, y), nf = nfinit(fy), eta = Mod(y + 1, fy));
  my(emin = ((dK/4)^(1/4) - 1)^(4/3));
  my(kmax = if (emin > 1, floor(log(8*b)/log(emin)), 200));
  my(ok = 1);
  forprime (p = 2, kmax,
    if (#nfroots(nf, x^p - eta) > 0 || #nfroots(nf, x^p + eta) > 0, ok = 0; listput(fails, [a, p])));
  if (ok, ncert++));
print("squarefree b in [2,", B, "]: ", nsq, "; covered by the inequality: ", nbound,
      "; certified directly: ", ncert, "; failures: ", Vec(fails));
}

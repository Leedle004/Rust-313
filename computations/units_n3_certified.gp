\\ n = 3, squarefree a with 2 <= |a| <= 33535: theta+1 is not +-(k-th power), k >= 2.
\\ Unconditional: uses nfdisc, nfroots and (for tiny discriminants) bnfcertify.
rhs(n, x) = 2^(n*(n-1)) * (1 + (2*x)^(1/(n-1)))^(n*(n-1)/2);
{
my(B = 33535, cov = 0, direct = 0, cert = 0, fails = List(), tot = 0);
for (A = 2, B, if (!issquarefree(A), next);
  foreach([A, -A], a,
    tot++;
    my(f = x^3 - a*x - a, dK = abs(nfdisc(f)));
    if (dK > rhs(3, abs(a)), cov++; next);
    my(fy = subst(f, x, y), R = sqrt(2*abs(a)));
    if (dK > 64,
      my(kmax = floor(6*log(1 + R)/log(dK/64)), nf = nfinit(fy), eta = Mod(y + 1, fy), ok = 1);
      forprime (p = 2, max(kmax, 2),
        if (#nfroots(nf, x^p - eta) || #nfroots(nf, x^p + eta), ok = 0; listput(fails, [a, p])));
      direct++,
      my(bnf = bnfinit(fy, 1));
      if (bnfcertify(bnf) != 1, error("certification failed at a=", a));
      my(e = bnfisunit(bnf, Mod(y + 1, fy)), gg = 0);
      for (i = 1, #e - 1, gg = gcd(gg, e[i]));
      if (gg != 1, listput(fails, [a, gg]));
      cert++)));
print("squarefree a, 2<=|a|<=", B, ": ", tot, " fields; by inequality: ", cov,
      "; nfroots checks: ", direct, "; bnfcertify: ", cert, "; failures: ", Vec(fails));
}

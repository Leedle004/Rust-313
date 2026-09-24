\\ Verification of the local theorems for f = x^n - a x - a.
\\  (1) index valuations  v_p([O_K:Z[theta]])
\\  (2) splitting type of every prime dividing disc(f)
Dn(n, a) = n^n + (-1)^n * (n-1)^(n-1) * a;

\\ Predicted v_p(index); returns -1 if p is "irregular" (p | gcd(v_p(a), n)).
predind(n, a, p) =
{
  my(k, g);
  if (a % p == 0,
    k = valuation(a, p); g = gcd(k, n);
    if (g % p == 0, return(-1));
    return(((k-1)*(n-1) + g - 1)/2));
  k = valuation(Dn(n, a), p);
  return(k \ 2);
}

\\ Predicted splitting type as sorted list of [e,f]; returns 0 if not predicted.
predsplit(n, a, p) =
{
  my(k, g, u, fa, res = List(), c, gg, D1, chi);
  if (a % p == 0,
    k = valuation(a, p); g = gcd(k, n);
    if (g % p == 0, return(0));
    u = Mod(a / p^k, p);
    fa = factormod(y^g - lift(u), p);
    for (i = 1, #fa~, for (j = 1, fa[i,2], listput(res, [n/g, poldegree(fa[i,1])])));
    return(vecsort(Vec(res))));
  k = valuation(Dn(n, a), p);
  if (k == 0,
    fa = factormod(x^n - a*x - a, p);
    for (i = 1, #fa~, listput(res, [fa[i,2], poldegree(fa[i,1])]));
    return(vecsort(Vec(res))));
  \\ p does not divide a, p | D : double root c = -n/(n-1) mod p
  c = lift(Mod(-n, p) / Mod(n-1, p));
  gg = lift((Mod(1,p)*(x^n - a*x - a)) / (Mod(1,p)*(x - c)^2));
  fa = factormod(gg, p);
  for (i = 1, #fa~, if (fa[i,2] != 1, error("cofactor not squarefree")); listput(res, [1, poldegree(fa[i,1])]));
  if (k % 2 == 1, listput(res, [2, 1]),
    D1 = Dn(n, a) / p^k;
    chi = kronecker(-2 * (n-1) * n^(n-1) * D1, p);
    if (chi == 1, listput(res, [1,1]); listput(res, [1,1]), listput(res, [1,2])));
  return(vecsort(Vec(res)));
}

actualsplit(nf, p) =
{
  my(dec = idealprimedec(nf, p), res = vector(#dec));
  for (i = 1, #dec, res[i] = [dec[i].e, dec[i].f]);
  vecsort(res);
}

nbad = 0; nchecked = 0; nirr = 0; nprimes = 0;
{
for (n = 2, 9,
  for (a = -400, 400,
    if (a == 0, next);
    my(f = x^n - a*x - a);
    if (!polisirreducible(f), next);
    my(nf = nfinit(f), dK = nf.disc, df = poldisc(f), ind = sqrtint(df / dK));
    if (ind^2 * dK != df, error("index not integral"));
    my(P = factor(abs(df))[,1]);
    for (i = 1, #P,
      my(p = P[i], pi = predind(n, a, p), ps = predsplit(n, a, p));
      nprimes++;
      if (pi == -1, nirr++; next);
      if (pi != valuation(ind, p),
        nbad++; print("INDEX MISMATCH n=", n, " a=", a, " p=", p, " pred=", pi, " actual=", valuation(ind, p)));
      if (ps != 0 && ps != actualsplit(nf, p),
        nbad++; print("SPLIT MISMATCH n=", n, " a=", a, " p=", p, " pred=", ps, " actual=", actualsplit(nf, p))));
    nchecked++));
}
print("fields checked: ", nchecked, "; prime/field pairs: ", nprimes, "; irregular pairs skipped: ", nirr, "; mismatches: ", nbad);

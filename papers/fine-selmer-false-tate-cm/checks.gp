default(parisize, 80000000);
default(parisizemax, "1G");
\\ Residual and local checks for the running hypotheses.
\\ Curve E1: y^2 = x^3 - x, CM by Z[i], conductor 32.
\\ Curve E3: y^2 = x^3 + 1, CM by Z[omega], conductor 36.
\\
\\ For each odd prime p of good reduction that splits in the CM field:
\\   ap, whether ap ≡ 1 mod p (anomalous), v_p(alpha - 1) for the unit root,
\\   degrees of the irreducible factors of the p-division polynomial,
\\   and, for sample Kummer radicals m,
\\   the local criterion m^(p-1) != 1 mod p^2,
\\   and whether p divides #E(F_{q^d}) for q|m, d = ord_p(q).

trace_power(ap, q, n) =
{
  my(a0 = 2, a1 = ap, a);
  if (n == 0, return (2));
  if (n == 1, return (ap));
  for (i = 2, n,
    a = ap*a1 - q*a0;
    a0 = a1;
    a1 = a
  );
  a1;
}

checkE(name, E, discK, Mlist, pmax) =
{
  print("========================================");
  print("Curve: ", name);
  print("Conductor: ", ellglobalred(E)[1]);
  print("Torsion invariants: ", elltors(E)[2]);
  print("j-invariant: ", E.j);
  forprime(p = 3, pmax,
    if (kronecker(discK, p) != 1, next());
    if (ellglobalred(E)[1] % p == 0, next());
    my(ap = ellap(E, p));
    my(pol = x^2 - ap*x + p);
    my(rts = polrootspadic(pol, p, 8));
    my(alpha = rts[1]);
    if (valuation(rts[2], p) < valuation(alpha, p), alpha = rts[2]);
    my(f = elldivpol(E, p));
    my(fac = factor(f));
    my(degs = vector(#fac~, i, poldegree(fac[i, 1])));
    printf("p=%d ap=%d ap_mod_p=%d v_p(alpha-1)=%d divpol_degs=%s\n",
           p, ap, lift(Mod(ap, p)), valuation(alpha - 1, p), degs);
    for (mi = 1, #Mlist,
      my(m = Mlist[mi]);
      if (gcd(m, p) != 1, next());
      my(nt = (Mod(m, p^2)^(p - 1) != 1));
      printf("  m=%d NT_p=%d\n", m, nt);
      my(qs = factor(abs(m))[, 1]);
      for (qi = 1, #qs,
        my(q = qs[qi]);
        if (q == p, next());
        my(dq = znorder(Mod(q, p)));
        my(aq = ellap(E, q));
        my(tr = trace_power(aq, q, dq));
        my(Npts = q^dq + 1 - tr);
        printf("    q=%d ord=%d card=%d p_divides=%d\n",
               q, dq, Npts, Npts % p == 0)
      )
    )
  );
}

E1 = ellinit([0, 0, 0, -1, 0]);
checkE("y^2 = x^3 - x, CM by Z[i]", E1, -4, [3, 6, 15, 21], 80);

E3 = ellinit([0, 0, 0, 0, 1]);
checkE("y^2 = x^3 + 1, CM by Z[omega]", E3, -3, [2, 5, 10], 60);

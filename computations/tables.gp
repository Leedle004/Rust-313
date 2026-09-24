\\ Data for the tables of the paper (PARI/GP 2.15.4; bnfinit assumes GRH).
default(parisize, 10^9);
read("check_classgroups.gp_lib");

\\ ---------- Table: selected cubic fields ----------
cubicrow(a) =
{
  my(n = 3, f = x^3 - a*x - a, bnf = bnfinit(f, 1), G, gd, S, V, Cw, t, g, fa);
  G = if (issquare(4*a - 27), "C_3", "S_3");
  gd = genusdata(3, a);
  S = gd[1];
  V = matrix(#bnf.cyc, #S);
  for (j = 1, #S, my(P = idealprimedec(bnf, S[j])[1], v = bnfisprincipal(bnf, P, 0));
    for (i = 1, #bnf.cyc, V[i,j] = v[i]));
  Cw = subgrouporder(V, bnf.cyc);
  t = #gd[2];
  g = if (G == "C_3", 3^(t-1), 3^t);
  printf("%d & %s & %d & %s & %s & %d & %d & %d & %d & %.4f\\\\\n",
    a, Str(factor(a)), bnf.disc, G, Str(bnf.cyc), t, g, gd[7], Cw, bnf.reg);
}
print("---- cubic table rows ----");
{
foreach([7, 13, 19, 37, 217, 1729, 31, -7, -13, 14, 35, 70, 91, -91, 133, -133, 247, -247, 259, -1729, 2821, -2821, 10, 55], a,
  cubicrow(a));
}

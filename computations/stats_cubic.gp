\\ Statistics for n = 3, squarefree a, 3 does not divide a, 2 <= |a| <= X, S_3 fields.

read("check_classgroups.gp_lib");
rk3(cyc) = sum(i = 1, #cyc, cyc[i] % 3 == 0);
{
my(X = 5000, T = matrix(5, 4), red = 0, redsharp = 0, cnt = 0, cyc3 = 0, cycok = 0);
\\ T[t+1, j]: j=1 count, j=2 rk3 = t, j=3 rk3 = t+1, j=4 rk3 >= t+2
forstep (a = -X, X, 1,
  if (abs(a) < 2 || !issquarefree(a) || a % 3 == 0, next);
  my(f = x^3 - a*x - a, bnf = bnfinit(f, 1), gd = genusdata(3, a), t = #gd[2], r = rk3(bnf.cyc));
  if (issquare(4*a - 27),
    cyc3++; if (r >= t - 1, cycok++); next);
  cnt++;
  if (t > 4, error("t too large"));
  T[t+1, 1]++;
  if (r < t, error("genus bound violated at a=", a));
  if (r == t, T[t+1, 2]++, if (r == t + 1, T[t+1, 3]++, T[t+1, 4]++));
  \\ Redei-type subgroup
  my(S = gd[1], V = matrix(#bnf.cyc, #S));
  for (j = 1, #S, my(v = bnfisprincipal(bnf, idealprimedec(bnf, S[j])[1], 0));
    for (i = 1, #bnf.cyc, V[i,j] = v[i]));
  my(C = subgrouporder(V, bnf.cyc));
  if (C < gd[7], error("Redei bound violated at a=", a));
  if (gd[7] > 1, red++; if (C == gd[7], redsharp++)));
print("S_3 fields: ", cnt, "; cyclic fields: ", cyc3, " (all satisfy rk3 >= t-1: ", cyc3 == cycok, ")");
for (t = 0, 4, if (T[t+1,1], print("t=", t, ": fields=", T[t+1,1], " rk3=t: ", T[t+1,2], " rk3=t+1: ", T[t+1,3], " rk3>=t+2: ", T[t+1,4])));
print("fields with nontrivial power-residue bound: ", red, "; bound attained: ", redsharp);
}

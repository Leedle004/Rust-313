P = z^6 - 8*z^5 + 40*z^4 - 160*z^3 + 400*z^2 - 512*z + 256;
print(factor(P));
print(subst(P, z, 2));
\\ (z-2)^4 * something?
print(P / (z-2)^2);
{
my(bad = 0, nsol = 0);
for (a = -400, 400,
  if (a == 0, next);
  my(f = x^5 - a*x - a);
  if (!polisirreducible(f), next);
  my(A = -a, B = -a);
  my(g = t^6 + 8*A*t^5 + 40*A^2*t^4 + 160*A^3*t^3 + 400*A^4*t^2 + (512*A^5 - 3125*B^4)*t + (256*A^6 - 9375*A*B^4));
  my(fac = factor(g), has = 0);
  for (i = 1, #fac~, if (poldegree(fac[i,1]) == 1, has = 1));
  my(G = polgalois(f));
  if (has != (G[1] != 120), bad++; print("mismatch a=", a, " has=", has, " G=", G));
  if (has, nsol++));
print("mismatches: ", bad, "; solvable count: ", nsol);
}
\\ Is disc ever square? 3125 - 256 a = square, |a| big search is finite mod something
print("squares mod check 53 mod 256 is square? candidates");
{
my(ok = 0);
for (m = 0, 255, if (m^2 % 256 == 53, ok++; print("  ", m)));
print("solutions: ", ok);
}

\\ (1) Dummit's resolvent sextic for x^5 + A x + B, tested against polgalois in both directions.
dummit(A, B) = t^6 + 8*A*t^5 + 40*A^2*t^4 + 160*A^3*t^3 + 400*A^4*t^2 + (512*A^5 - 3125*B^4)*t + (256*A^6 - 9375*A*B^4);
hasratroot(g) = { my(F = factor(g)); for (i = 1, #F~, if (poldegree(F[i,1]) == 1, return(1))); 0; }
{
my(bad = 0, nsolv = 0, ntot = 0);
for (A = -60, 60, for (B = -60, 60,
  if (B == 0, next);
  my(f = x^5 + A*x + B);
  if (!polisirreducible(f), next);
  ntot++;
  my(G = polgalois(f), solv = (G[1] <= 20), r = hasratroot(dummit(A, B)));
  if (solv, nsolv++);
  if (solv != r, bad++; print("MISMATCH A=", A, " B=", B, " G=", G[4]))));
print("Dummit sextic test: ", ntot, " irreducible quintics, ", nsolv, " solvable, mismatches: ", bad);
}
\\ (2) Specialisation to A = B = -a and the substitution t = a z.
Rs = dummit(-s, -s);
print("R(a z) / a^5 = ", simplify(subst(Rs, t, s*z) / s^5));
print("factor of z-part: ", factor(z^6 - 8*z^5 + 40*z^4 - 160*z^3 + 400*z^2 - 512*z + 256));
\\ (3) Integral points: z = u/v, v >= 1, gcd(u,v)=1, |u-2v| in {1,5}, u^2+16 v^2 | 5^7.
{
my(sols = List());
for (v = 1, 200, foreach([1, -1, 5, -5], e,
  my(u = 2*v + e, N = u^2 + 16*v^2);
  if (gcd(u, v) != 1, next);
  if (5^7 % N != 0, next);
  my(a = 3125 * (u - 3*v) * v^5 / ((u - 2*v)^4 * N));
  listput(sols, [u, v, a])));
print("candidate (u,v,a) with u^2+16v^2 | 5^7: ", Vec(sols));
}
\\ (4) brute force over rational z = u/v with |u|,v <= 400
{
my(ints = List());
for (v = 1, 400, for (u = -400, 400,
  if (gcd(u, v) != 1 || u == 2*v, next);
  my(a = 3125 * (u - 3*v) * v^5 / ((u - 2*v)^4 * (u^2 + 16*v^2)));
  if (denominator(a) == 1, listput(ints, [u, v, a]))));
print("integral values of a(z) for |u|,v<=400: ", Vec(ints));
}

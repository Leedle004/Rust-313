\\ Quartic Galois structure for f = x^4 - a*x - a.
\\ Resolvent R = y^3 + 4*a*y - a^2.
\\ Classify reducibility of R and the Galois group.
default(parisize, 10^9);

classify(a) =
{
  my(R = y^3 + 4*a*y - a^2, fac = factor(R), degs, f = x^4 - a*x - a);
  degs = vecsort(vector(#fac~, i, poldegree(fac[i,1])));
  [degs, if(polisirreducible(f), polgalois(f)[4], "reducible")];
}

\\ When is r^2*(r+4) a square?  search integer roots of the resolvent.
{
my(sol = List());
for (r = -5000, 5000,
  my(w = r^2 * (r + 4));
  if (w >= 0 && issquare(w),
    my(s = sqrtint(w), a1 = 2*r + s, a2 = 2*r - s);
    foreach([a1, a2], aa, if (aa != 0 && subst(y^3 + 4*aa*y - aa^2, y, r) == 0, listput(sol, [aa, r])))));
print("integer roots of the resolvent with |r|<=5000: ", #sol);
\\ group by shape of a
my(shapes = Map());
for (i = 1, #sol,
  my(a = sol[i][1], g = polgalois(x^4 - a*x - a));
  if (mapisdefined(shapes, g[4]), mapput(shapes, g[4], mapget(shapes, g[4]) + 1), mapput(shapes, g[4], 1)));
print("Galois groups among them: ", shapes);
}

\\ reducible members of the family, |a| <= 20000
{
my(red = List());
for (a = -20000, 20000,
  if (a == 0, next);
  if (!polisirreducible(x^4 - a*x - a), listput(red, [a, factor(x^4 - a*x - a)])));
print("reducible |a|<=20000: ", Vec(red));
}

\\ Is disc(f) ever a square for a != 0, |a| <= 10^5 ?
{
my(sq = List());
for (a = -100000, 100000,
  if (a == 0, next);
  my(d = -a^3 * (27*a + 256));
  if (d > 0 && issquare(d), listput(sq, a)));
print("square discriminants |a|<=10^5: ", Vec(sq));
}

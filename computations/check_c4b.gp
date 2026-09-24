\\ Degree of the Galois closure for both quartic families.
{
print("family a = -(s-2)^2(s+2)");
for (s = 0, 60,
  if (s == 2, next);
  my(a = -(s-2)^2*(s+2), f = x^4 - a*x - a);
  if (!polisirreducible(f), print("  reducible s=", s, " a=", a); next);
  my(d = poldegree(nfsplitting(f)));
  if (d != 8, print("  s=", s, " a=", a, " galois degree=", d)));
print("family a = (s-2)(s+2)^2");
for (s = 3, 60,
  my(a = (s-2)*(s+2)^2, f = x^4 - a*x - a);
  if (!polisirreducible(f), print("  reducible s=", s, " a=", a); next);
  my(d = poldegree(nfsplitting(f)));
  if (d != 8, print("  s=", s, " a=", a, " galois degree=", d)));
print("done");
}
\\ reducibility of the whole family: factor when possible
{
print("reducible search |a|<=50000");
for (a = -50000, 50000,
  if (a == 0, next);
  my(f = x^4 - a*x - a, g = gcd(f, deriv(f, x)));
  if (poldegree(g) > 0, print("  multiple root a=", a));
  my(fac = factor(f));
  if (#fac~ > 1, print("  a=", a, " ", fac)));
}

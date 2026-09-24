\\ K_{3,t^2+3t+9} versus Shanks' simplest cubic fields.
g = x^3 - t*x^2 - (t+3)*x - 1;
a3 = t^2 + 3*t + 9;
th = Mod(-x - 1/(1+x), g);
print("charpoly(rho' - rho) = ", charpoly(th, y));
print("norm(theta+1) = ", norm(th + 1));
\\ express theta + 1 via rho and rho' = -1/(1+rho):  try  (theta+1) = +- rho^i rho'^j
rp = Mod(-1/(1+x), g); r = Mod(x, g);
{
for (i = -3, 3, for (j = -3, 3,
  foreach([1, -1], e, if (e * r^i * rp^j == th + 1, print("theta+1 = ", e, " * rho^", i, " * rho'^", j)))));
}
bad = 0;
{
for (tt = -60, 60,
  my(aa = tt^2 + 3*tt + 9, gt = subst(g, t, tt));
  if (!nfisisom(x^3 - aa*x - aa, gt), bad++; print("not isomorphic at t=", tt)));
}
print("simplest cubic isomorphism failures for |t|<=60: ", bad);
\\ index of Z[theta] in O_K for a few t
{
for (tt = -3, 8,
  my(aa = tt^2 + 3*tt + 9, f = x^3 - aa*x - aa);
  print("t=", tt, " a=", aa, " disc(f)=", factor(poldisc(f)), " d_K=", factor(nfdisc(f))));
}

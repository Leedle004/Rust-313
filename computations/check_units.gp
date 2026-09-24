\\ Is eta = theta + 1 primitive in O_K^*/torsion ?  (bnfinit is GRH-conditional)
default(parisize, 10^9);

unitdata(n, a) =
{
  my(f = x^n - a*x - a, bnf = bnfinit(f, 1), e, r, g);
  e = bnfisunit(bnf, Mod(x + 1, f));
  r = #e - 1;                       \\ number of fundamental units
  g = 0; for (i = 1, r, g = gcd(g, e[i]));
  [g, r, bnf.reg, bnf];
}

run(n, amin, amax) =
{
  my(cnt = 0, exc = List());
  for (a = amin, amax,
    if (a == 0, next);
    my(f = x^n - a*x - a);
    if (!polisirreducible(f), next);
    my(u = unitdata(n, a));
    cnt++;
    if (u[1] != 1, listput(exc, [a, u[1], nfdisc(f)])));
  print("n=", n, " a in [", amin, ",", amax, "]: ", cnt, " fields; non-primitive theta+1 for [a, k, d_K]: ", Vec(exc));
}

\\ complex cubic case: compare regulator with log(1/(theta_real+1))
cubicneg(B) =
{
  my(bad = List());
  for (b = 1, B,
    my(a = -b, f = x^3 - a*x - a);
    if (!polisirreducible(f), next);
    my(u = unitdata(3, a), rt = polroots(f), re = 0);
    for (i = 1, 3, if (abs(imag(rt[i])) < 1e-20, re = real(rt[i])));
    my(L = abs(log(abs(re + 1))));
    if (u[1] != 1 || abs(L - u[3]) > 1e-10, listput(bad, [a, u[1], u[3], L])));
  print("n=3, -", B, " <= a <= -1: exceptions to 'fundamental unit = 1/(theta+1)': ", Vec(bad));
}

run(3, -3000, 3000);
cubicneg(3000);
run(4, -600, 600);
run(5, -200, 200);
run(6, -60, 60);
run(7, -25, 25);

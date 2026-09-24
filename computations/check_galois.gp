\\ Galois groups of f = x^n - a x - a: list the non-S_n members.
Dn(n, a) = n^n + (-1)^n * (n-1)^(n-1) * a;
{
my(B = [0, 0, 20000, 20000, 20000, 3000, 1500]);
for (n = 3, 7,
  my(cnt = 0, red = List(), exc = List());
  for (a = -B[n], B[n],
    if (a == 0, next);
    my(f = x^n - a*x - a);
    if (!polisirreducible(f), listput(red, a); next);
    cnt++;
    my(G = polgalois(f));
    if (G[1] != n! ,
      listput(exc, [a, G[4], factor(a), factor(Dn(n, a))])));
  print("n=", n, ": irreducible members with |a|<=", B[n], ": ", cnt, "; reducible a: ", Vec(red));
  for (i = 1, #exc, print("   a=", exc[i][1], "  G=", exc[i][2], "  a=", exc[i][3], "  D=", exc[i][4])));
}

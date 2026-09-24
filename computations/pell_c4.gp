\\ Integer m for which the C4 square condition holds.
{
my(A = List(), B = List());
for (q = 0, 4000,
  for (p = 0, 4000,
    if (q == 0 && p == 0, next);
    if (q > 0 && p > 0 && gcd(p, q) != 1, next);
    my(d = 3*p^2 - 4*q^2);
    if (d != 0 && (4*p^2) % d == 0,
      my(m = 4*p^2 / d);
      if (m != 0, listput(A, m)));
    my(d2 = 3*p^2 - q^2);
    if (d2 != 0 && (4*(p^2 + q^2)) % d2 == 0,
      my(m = 4*(p^2 + q^2) / d2);
      if (m != 0, listput(B, m)))));
A = Set(Vec(A)); B = Set(Vec(B));
print("case A m's: ", A);
print("case B m's: ", B);
}

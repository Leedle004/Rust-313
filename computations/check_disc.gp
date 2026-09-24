\\ Discriminant of f = x^n - a*x - a versus (-1)^{(n-1)(n-2)/2} a^{n-1} D_n(a)
\\ where D_n(a) = n^n + (-1)^n (n-1)^{n-1} a.
Dn(n, a) = n^n + (-1)^n * (n-1)^(n-1) * a;
ok = 1;
{
for (n = 2, 12,
  for (a = -60, 60,
    if (a == 0, next);
    my(f = x^n - a*x - a, lhs = poldisc(f));
    my(rhs = (-1)^((n-1)*(n-2)/2) * a^(n-1) * Dn(n, a));
    if (lhs != rhs, ok = 0; print("MISMATCH n=", n, " a=", a, " ", lhs, " vs ", rhs))));
}
print("discriminant formula check: ", if(ok, "OK", "FAILED"));

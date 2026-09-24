\\ Understand the C4 criterion on a = -5 and a = -24.
analyze(a) =
{
  my(R = y^3 + 4*a*y - a^2, r = polroots(R));
  my(rr = 0);
  for (i = 1, 3, if (abs(imag(r[i])) < 1e-9 && abs(real(r[i]) - round(real(r[i]))) < 1e-9, rr = round(real(r[i]))));
  print("a=", a, " rational resolvent root r=", rr);
  my(L = nfinit(u^2 - rr));
  my(disc1 = -rr - 2*a/u);
  my(z = Mod(subst(lift(disc1), u, -u), u^2 - rr) / Mod(disc1, u^2 - rr));
  z = lift(z);
  \\ clear: represent z = A + B u
  my(A = polcoef(z, 0), B = polcoef(z, 1));
  print("  sigma(disc1)/disc1 = ", A, " + (", B, ") u");
  \\ Is A+Bu a square? Search small: (x+y*u)^2 = A+B u => x^2+rr y^2 = A, 2xy = B
  my(found = 0);
  for (den = 1, 20,
    for (x = -40*den, 40*den,
      if (x % den != 0, next);
      my(xx = x/den);
      if (xx == 0, next);
      my(yy = B / (2*xx));
      if (xx^2 + rr*yy^2 == A, found = 1; print("  square root: ", xx, " + (", yy, ") u"); break));
    if (found, break));
  if (!found, print("  no small square root"));
  print("  galois degree: ", poldegree(nfsplitting(x^4 - a*x - a)));
}
analyze(-5);
analyze(-24);
analyze(25);

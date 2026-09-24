\\ Symbolic identities used in the paper.

\\ (1) Simplest cubic fields: rho root of g_t = x^3 - t x^2 - (t+3) x - 1,
\\     rho' = -1/(1+rho).  Characteristic polynomial of rho - rho'.
g = x^3 - t*x^2 - (t+3)*x - 1;
cp = charpoly(Mod(x + 1/(1+x), g), y);
print("charpoly(rho - rho') = ", factor(cp));
a3 = t^2 + 3*t + 9;
print("equals y^3 - a y - a with a = t^2+3t+9 ?  ", cp == y^3 - a3*y - a3);
\\ theta + 1 as a unit in terms of rho: (rho - rho') + 1
print("norm of 1 + rho - rho' : ", norm(Mod(1 + x + 1/(1+x), g)));

\\ (2) Quartic case: resolvent y^3 + 4 a y - a^2, a = (s-2)(s+2)^2, root r = s^2 - 4
a4 = (s-2)*(s+2)^2;
R = y^3 + 4*a4*y - a4^2;
print("R(s^2-4) = ", subst(R, y, s^2 - 4));
print("27a+256 = ", factor(27*a4 + 256));
print("disc f_{4,a} = ", factor(poldisc(x^4 - a4*x - a4)));
print("R/(y - r) = ", factor(R / (y - (s^2 - 4))));

\\ (3) square discriminants for n = 4: (27a+128)^2 + 27 m^2 = 2^14
sol = List();
for (m = 0, 25, my(X2 = 2^14 - 27*m^2); if (X2 >= 0 && issquare(X2), my(X = sqrtint(X2)); foreach([X, -X], XX, if ((XX - 128) % 27 == 0, listput(sol, [m, (XX - 128)/27])))));
print("n=4 square-discriminant solutions [m,a]: ", Vec(sol));

\\ (4) n=4: C_4 criterion  (3u+2)^2 + 3 m^2 = 4
print("check -(s+2)(3s+10) at s=-3: ", -(-3+2)*(3*(-3)+10));

\\ (5) Discriminant of f_{3,a} at a = t^2+3t+9
print("disc f_{3,t^2+3t+9} = ", factor(poldisc(x^3 - a3*x - a3)));

\\ (6) Numerical check that K_{3,t^2+3t+9} = simplest cubic field for t in [-50,50]
bad = 0;
for (tt = -50, 50, my(aa = tt^2 + 3*tt + 9, gt = subst(g, t, tt));
  if (!nfisisom(x^3 - aa*x - aa, gt), bad++; print("not isomorphic at t=", tt)));
print("simplest cubic isomorphism failures: ", bad);

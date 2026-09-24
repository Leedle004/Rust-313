\\ For which s is the resolvent-root case cyclic?
\\ ratio rho = -(u + c)/(u - c) with u^2 = r should be a square in Q(u).
issq(r, c) =
{
  my(L = nfinit(u^2 - r), z = Mod(-(u + c)/(u - c), u^2 - r));
  \\ z is a square in L iff z is a square in the multiplicative group; use nfeltissquare? not available.
  \\ Solve (x + y u)^2 = -(u+c)/(u-c), i.e. (x+yu)^2 (u-c) + (u+c) = 0 in Q(u).
  my(P = (x + y*u)^2 * (u - c) + (u + c));
  P = lift(Mod(P, u^2 - r));
  my(eqs = [polcoef(P, 0), polcoef(P, 1)]);
  \\ clear denominators: work projectively over Q. Use resultant / thue.
  \\ (x^2 + y^2 r + 2 x y u)(u - c) + u + c = 0
  \\ (x^2 + r y^2)(-c) + (2 x y)*r  + c   +  u * [ (x^2+r y^2) + 2 x y (-c) + 1 ] = 0
  my(A = -c*(x^2 + r*y^2) + 2*x*y*r + c, B = (x^2 + r*y^2) - 2*c*x*y + 1);
  \\ integer solutions via bounding: set y=1, vary x rational X/Y.
  0;
}
\\ brute: z square iff the conic x^2 - r y^2 = N has a point and matches.
\\ Use bnfissunit? Simpler: polroots and check square in the number field via ideal.
check(r, c) =
{
  if (r <= 0, return(-1));
  my(T = u^2 - r);
  my(z = Mod(-(u + c), T) / Mod(u - c, T));
  \\ element is square iff valuation even at all primes and it is a square mod some prime, use nfissquare
  my(nf = nfinit(T));
  nfissquare(nf, z)[1];
}
{
print("family a=-(s-2)^2(s+2):");
for (s = 0, 40,
  if (s == 2, next);
  my(r = s^2 - 4, c = 2*(s-2), a = -(s-2)^2*(s+2));
  if (r == 0, next);
  my(sq = if(r > 0, check(r, c), -1));
  if (sq == 1, print("  SQUARE s=", s, " a=", a, " r=", r)));
print("family a=(s-2)(s+2)^2:");
for (s = 0, 40,
  if (s == 2, next);
  my(r = s^2 - 4, c = -2*(s+2), a = (s-2)*(s+2)^2);
  if (r <= 0, next);
  if (check(r, -c) == 1, print("  SQUARE s=", s, " a=", a)));
}
\\ confirm a=-5 directly with polgalois and the unique C4
print("a=-5 group: ", polgalois(x^4 + 5*x + 5));

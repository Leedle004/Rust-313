\\ Verification script for the Stark--Dirichlet index.
\\ Run: gp -q examples/verify-index.gp
\\
\\ Identity under test:
\\   prod_{chi != 1} L'(0, chi) = (h_F/h_k)*(w_k/w_F)*R_F.
\\ PARI lfun(,0,r) returns the r-th derivative. The Taylor leading
\\ coefficient is that derivative divided by r!.

default(parisizemax, "512M");
default(realprecision, 30);

check(name, kpol, Fpol, ordF) =
{
  my(k = bnfinit(kpol));
  my(F = bnfinit(Fpol));
  my(hk = k.clgp.no);
  my(hF = F.clgp.no);
  my(wk = k.tu[1]);
  my(wF = F.tu[1]);
  my(RF = F.reg);
  my(arith = (hF/hk) * (wk/wF));
  my(Lk = lfun(k, 0));
  my(zderiv = lfun(F, 0, ordF));
  my(zlead = zderiv / factorial(ordF));
  my(prodL = zlead / Lk);
  my(predicted = arith * RF);
  print("=== ", name, " ===");
  print("  r1=", F.r1, " r2=", F.r2, " ord=", ordF);
  print("  h_k=", hk, " w_k=", wk, " h_F=", hF, " w_F=", wF);
  print("  arithmetic factor = ", arith);
  print("  zeta_k(0) = ", Lk, "   expected ", -hk/wk);
  print("  zeta_F^*(0) = ", zlead, "   expected ", -hF*RF/wF);
  print("  ratio analytic/arithmetic = ", prodL/predicted);
  print("");
};

check("Hilbert class field of Q(sqrt(-5))", x^2+5, x^4+12*x^2+16, 1);
check("Q(i)(sqrt(1+i))", x^2+1, x^4-2*x^2+2, 1);
check("Q(sqrt(-23), sqrt(2))", x^2+23, x^4+42*x^2+625, 1);

quit;

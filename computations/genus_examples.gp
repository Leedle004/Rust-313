\\ Genus numbers versus class groups for n = 4, 5, 6 (bnfinit assumes GRH).
read("check_classgroups.gp_lib");
row(n, a) =
{
  my(f = x^n - a*x - a, bnf = bnfinit(f, 1), G = polgalois(f), gd = genusdata(n, a));
  my(r1 = bnf.sign[1], bnr = bnrinit(bnf, [1, vector(r1, i, 1)]));
  my(gplus = gd[8], gwide = if (r1 == 0 || gd[9], gd[8], gd[8] / 2));
  printf("%d & %d & %s & (%d,%d) & %s & %s & %d & %d & %s\\\\\n", n, a, G[4], r1, bnf.sign[2],
    Str(bnf.cyc), Str(bnr.cyc), gplus, gwide,
    if (bnr.no % gplus == 0 && bnf.no % gwide == 0, "yes", "NO"));
}
{
foreach([13, -13, 17, 29, 65, -65, 5*17], a, row(4, a));
foreach([11, -11, 31, 22, 341, -341], a, row(5, a));
foreach([7, -7, 13, 35, 91, -91], a, row(6, a));
}

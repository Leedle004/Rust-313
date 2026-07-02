# Explicit stability thresholds of blow-ups of projective space along linear subspaces

一篇原创代数几何论文（英文撰写，附完整证明与独立计算验证），选题源自 2024–2026 年
K-稳定性 / K-模空间方向的最新顶级文献。

**⚠️ 声明：本论文由 AI（Cursor Cloud Agent）撰写。所有命题均附有完整证明，且全部封闭
公式已通过三套相互独立的计算方法交叉验证，但在投稿或引用之前仍应由专业数学家人工
审核。**

## 论文内容（`paper/delta-blowups.pdf`）

计算两族经典 Fano 流形的稳定性阈值（Fujita–Odaka δ-不变量）的**封闭公式**：

1. **定理 A**：沿线性子空间的爆破 $X_{n,m}=\mathrm{Bl}_{\mathbb P^m}\mathbb P^n$
   （$0\le m\le n-2$，$k=n-m$）：
   $$\delta(X_{n,m})=\frac{(n+1)F_{n,m}}{(n+1)F_{n,m}+(k-1)^k(m+2)^{m+1}},\qquad
   F_{n,m}=\int_{k-1}^{n+1}t^{k-1}(n+1-t)^m\,dt,$$
   恒由例外除子的赋值计算，且恒 $<1$（即全族 K-不稳定，给出精确最大 Ricci 下界
   $R=\delta$）。$m=0$ 时恢复 Zhang–Zhou 的 $\mathbb P^1$-丛公式；$m=n-2$ 时
   坍缩为 $\delta=\tfrac{2n+2}{3n+1}$，证明 Benammar Ammar–Massonnet–Yin (2024)
   的上界在反典范极化处取到。
2. **定理 B**：沿互补线性子空间对的爆破
   $Y_{a,b}=\mathrm{Bl}_{\mathbb P^a\sqcup\mathbb P^b}\mathbb P^n$（$a+b=n-1$，
   含 Futaki 1983 经典例子 $Y_{1,2}$，其 $\delta=125/131$）：显式公式 +
   「$\delta=1\iff a=b$」+ 最优失稳除子是**低维中心**上的例外除子。
3. **定理 C**（渐近）：固定 $m$ 时 $\delta\to$ 不完全 Gamma 表达式（特别地
   $\delta(\mathrm{Bl}_{\rm pt}\mathbb P^n)\to\tanh 1$）；固定余维 $k$ 时
   $\delta\to H_k/(H_k+k-1)$；比例区间 $m\sim\theta n$ 时
   $\sqrt n\,\delta\to\sqrt{\pi/(2\theta(1-\theta))}$，给出 δ→0 的最简单光滑
   Fano 流形族及其精确速率。

核心技巧：Blum–Jonsson 环面公式 + Dirichlet 型降维 + 一个精确原函数恒等式
$\tfrac{d}{dt}\bigl(-t^\kappa(W-t)^{W-\kappa}/W\bigr)=t^{\kappa-1}(W-t)^{W-\kappa-1}(t-\kappa)$，
使重心积分完全封闭。

## 独立验证（`scripts/`）

| 脚本 | 方法 | 内容 |
|---|---|---|
| `derive_formula.py` | sympy 精确符号积分 | 重心法 vs 封闭公式，$n\le10$ 全部一致；与 Székelyhidi 6/7、Zhang–Zhou β₀、Mori–Mukai 3.25 等文献值吻合 |
| `verify_lattice.py` | 纯格点计数（Ehrhart 插值，零微积分） | 低维全部封闭公式独立复核 |
| `verify_asymptotics.py` | mpmath 高精度数值 | 定理 C 三个渐近区间的收敛验证 |
| `verify_literature.py` | 符号计算 | 与 BMY 上界 $s_1$、Zhang–Zhou 公式的逐项比对；族 2 渐近极限 |

运行：

```bash
pip install -r requirements.txt
cd scripts && python3 derive_formula.py && python3 verify_lattice.py \
  && python3 verify_asymptotics.py && python3 verify_literature.py
```

## 编译论文

```bash
cd paper && latexmk -pdf delta-blowups.tex
```

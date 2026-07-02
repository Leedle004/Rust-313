# 凸几何方法与射影空间上的等变 Tian 不变量：2025--2026 年代数几何前沿

本目录包含两篇中文文章：一篇综述性文章（`main.tex`），以及在此基础上撰写的一篇原创技术性注记
（`original-note.tex`）。

## 文档一：`main.tex` / `main.pdf`（综述文章）

基于四篇 2025--2026 年发表或被顶级期刊接收的代数几何前沿论文撰写的综述与观点性文章：

1. Chenzi Jin, Yanir A. Rubinstein, *Tian's stabilization problem for toric Fanos*,
   Geometry & Topology 29:5 (2025), 2609–2652.
2. Shin-ichi Matsumura, Juanyong Wang, *Structure theorem for projective klt pairs with nef
   anti-canonical divisor*, J. Eur. Math. Soc. (2025), published online first.
3. Karl Christ, Xiang He, Ilya Tyomkin, *The irreducibility of Hurwitz spaces and Severi
   varieties on toric surfaces*, Invent. Math., accepted for publication (arXiv:2501.16238).
4. Junyan Zhao, *K-moduli of Fano threefolds and genus four curves*, J. Reine Angew. Math.
   (Crelle's Journal) 2025, no. 824.

### 内容概览

文章第 2–5 节忠实转述以上四篇原始文献的背景、主要定理与证明策略核心。第 6 节在此基础上提出一个
统一的方法论观察——凸几何（多面体组合学与热带几何）在 2025 年前沿代数几何中日益核心的作用——并
给出两个开放问题；该部分明确标注为作者本人的观察，并非已被证明的新数学结果。

## 文档二：`original-note.tex` / `original-note.pdf`（原创技术性注记）

以综述文章第 2 节讨论的 Jin–Rubinstein 2025 年 *Geometry & Topology* 论文（环面 Fano 流形上
Tian 稳定化问题的完全解决，Theorem 1.4 与 Theorem 1.6）为唯一外部输入撰写的原创技术性注记。
全文内容包括：

1. 对射影空间 $\mathbb{P}^n$ 及其任意有限对称子群 $H \le S_{n+1} = \mathrm{Aut}(P)$，给出等变
   Tian 不变量 $\alpha_{k,G(H)}(\mathbb{P}^n)$ 的一个完全封闭公式：其值等于 $H$ 在齐次坐标指标集
   $\{1,\dots,n+1\}$ 上诸轨道中最小轨道的大小除以 $n+1$，与 $k$ 无关。该公式把 Jin–Rubinstein
   论文 Example 8.1 中仅针对 $\mathbb{P}^2$（$n=2$）逐个子群手算验证的结果，推广为一般维数、
   一般子群下的单一封闭公式，并在文中与原论文的全部数值逐一核对。
2. 证明对每个维数 $n \ge 1$，$\mathbb{P}^n$ 的反典范多面体都满足 Jin–Rubinstein 意义下的凸几何
   条件 $(\star)$，从而由他们的 Theorem 1.6，Tian 的 Grassmannian 型稳定化猜想（非等变情形）
   对所有维数的射影空间都不精确成立：对所有 $k \in \mathbb{N}$、$m \ge 2$，恒有
   $\alpha_{k,m,(S^1)^n}(\mathbb{P}^n) > \alpha(\mathbb{P}^n) = \tfrac{1}{n+1}$ 严格成立。
   这把该文 Example 8.7 中仅对 $n=2$ 情形给出的计算推广到一切维数。

第 3、4 节的全部命题均给出完整证明（仅使用轨道-稳定子定理、线性不等式与凸性的基本事实）；第 5 节
为明确标注的推测性展望方向，不构成已证明的结果。

## 编译

需要 `xelatex`（推荐使用 TeX Live，含 `texlive-lang-chinese` 与中文字体，例如
`WenQuanYi Micro Hei`，其在 Ubuntu 上由 `fonts-wqy-microhei` 包提供）。

```bash
make                 # 生成 main.pdf 与 original-note.pdf
make survey          # 只生成 main.pdf
make original        # 只生成 original-note.pdf
make clean           # 清理编译中间文件
```

或直接对任一文件：

```bash
xelatex -interaction=nonstopmode <文件名>.tex
xelatex -interaction=nonstopmode <文件名>.tex   # 第二次运行以解析交叉引用与参考文献
```

## 文献准确性说明

所有引用文献的标题、作者、期刊卷期页码均已通过检索原始期刊/出版社页面与 arXiv 页面核对。
Matsumura–Wang 与 Christ–He–Tyomkin 两篇论文截至撰写时仍为"网络首发/已接收待刊"状态，
尚无最终卷期页码，已在正文与参考文献中如实注明。

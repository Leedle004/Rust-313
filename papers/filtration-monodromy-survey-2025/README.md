# 滤过与单值性：四大顶级期刊 2025 年代数几何最新进展的一个统一视角

本目录包含一篇基于四篇 2025 年发表于国际数学“四大”期刊（《数学年刊》*Annals of Mathematics*、
《美国数学会杂志》*Journal of the American Mathematical Society*、《数学新进展》*Acta Mathematica*、
《数学新知》*Inventiones Mathematicae*）的代数几何前沿论文撰写的综述与观点性文章（中文）。

## 内容概览

文章第 2–5 节忠实转述以下四篇原始文献的背景、主要定理与证明策略核心：

1. Chenyang Xu, Ziquan Zhuang, *Stable degenerations of singularities*, J. Amer. Math. Soc. 38 (2025), 585–626.
2. Davesh Maulik, Junliang Shen, Qizheng Yin, *Perverse filtrations and Fourier transforms*, Acta Math. 234(1) (2025), 1–69.
3. Federico Binda, Hiroki Kato, Alberto Vezzani, *On the p-adic weight-monodromy conjecture for complete intersections in toric varieties*, Invent. Math. 241 (2025), 559–603.
4. Brian Lawrence, Will Sawin, *The Shafarevich conjecture for hypersurfaces in abelian varieties*, Ann. of Math. 202(3) (2025), 857–1000.

第 6 节在此基础上提出一个统一的结构性视角（滤过 + 单值性/对偶对称性 ⇒ 有限性/刚性结论），
并给出两个开放问题；该部分明确标注为作者本人的观察与猜测，并非已被证明的新数学结果。

## 编译

需要 `xelatex`（推荐使用 TeX Live，含 `texlive-lang-chinese` 与中文字体，例如
`WenQuanYi Micro Hei`，其在 Ubuntu 上由 `fonts-wqy-microhei` 包提供）。

```bash
make            # 生成 main.pdf
make clean      # 清理编译中间文件
```

或直接：

```bash
xelatex -interaction=nonstopmode main.tex
xelatex -interaction=nonstopmode main.tex   # 第二次运行以解析交叉引用与参考文献
```

## 文献准确性说明

所有引用文献的标题、作者、期刊卷期页码均已通过检索原始期刊/出版社页面
（Project Euclid、Springer、AMS、Princeton Annals of Mathematics 官网等）核对。

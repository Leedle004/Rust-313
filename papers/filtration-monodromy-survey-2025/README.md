# 滤过与单值性：四大顶级期刊 2025 年代数几何最新进展

本目录包含两篇中文文章：一篇综述性文章（`main.tex`），以及在此基础上撰写的一篇原创技术性注记
（`original-note.tex`）。

## 文档一：`main.tex` / `main.pdf`（综述文章）

基于四篇 2025 年发表于国际数学“四大”期刊（《数学年刊》*Annals of Mathematics*、
《美国数学会杂志》*Journal of the American Mathematical Society*、《数学新进展》*Acta Mathematica*、
《数学新知》*Inventiones Mathematicae*）的代数几何前沿论文撰写的综述与观点性文章。

### 内容概览

文章第 2–5 节忠实转述以下四篇原始文献的背景、主要定理与证明策略核心：

1. Chenyang Xu, Ziquan Zhuang, *Stable degenerations of singularities*, J. Amer. Math. Soc. 38 (2025), 585–626.
2. Davesh Maulik, Junliang Shen, Qizheng Yin, *Perverse filtrations and Fourier transforms*, Acta Math. 234(1) (2025), 1–69.
3. Federico Binda, Hiroki Kato, Alberto Vezzani, *On the p-adic weight-monodromy conjecture for complete intersections in toric varieties*, Invent. Math. 241 (2025), 559–603.
4. Brian Lawrence, Will Sawin, *The Shafarevich conjecture for hypersurfaces in abelian varieties*, Ann. of Math. 202(3) (2025), 857–1000.

第 6 节在此基础上提出一个统一的结构性视角（滤过 + 单值性/对偶对称性 ⇒ 有限性/刚性结论），
并给出两个开放问题；该部分明确标注为作者本人的观察与猜测，并非已被证明的新数学结果。

## 文档二：`original-note.tex` / `original-note.pdf`（原创技术性注记）

以综述文章第 2 节讨论的许晨阳—庄子权 2025 年 JAMS 论文（klt 奇点稳定退化定理）为出发点撰写的
原创技术性注记。全文内容包括：

1. 对该定理在**环面 (toric) 奇点**情形给出一个完全初等、自足的独立证明（不依赖极小模型纲领），
   适用于任意有理秩 $1\le r\le n$。
2. 精确指出该初等论证在正复杂度 $T$-变体情形下失效的具体原因，得到一个"复杂度-秩二分现象"，
   解释了 Li--Xu (2018) 三步策略中长期悬而未决的部分因何而起。
3. 作为推论，给出"环面 klt 奇点是自身稳定退化"这一现象的初等证明，从代数角度重新导出
   Sasaki--Einstein 几何中 Martelli--Sparks--Yau 与 Futaki--Ono--Wang 的经典结果。
4. 指出高阶秩在环面情形下是典型（满测度）而非例外现象，与一般情形下高阶秩问题的困难程度形成对照。

第 2--4 节的全部命题均给出完整证明；第 5 节为明确标注的推测性展望问题，不构成已证明的结果。
文中特别说明：引理 2.1（分次整环的最低次项赋值给出平凡伴随分级环）所依赖的基本原理是交换代数与
Newton--Okounkov 体理论中的标准知识，本文的贡献在于将其形式化并与最新文献精确衔接。

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

所有引用文献的标题、作者、期刊卷期页码均已通过检索原始期刊/出版社页面
（Project Euclid、Springer、AMS、Princeton Annals of Mathematics 官网等）核对。

"""Figures for the paper (written to ../figures)."""

import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
FIG = os.path.join(HERE, "..", "figures")
os.makedirs(FIG, exist_ok=True)

plt.rcParams.update({
    "font.family": "serif",
    "mathtext.fontset": "cm",
    "font.size": 10,
    "axes.labelsize": 10,
    "legend.fontsize": 8.5,
    "xtick.labelsize": 8.5,
    "ytick.labelsize": 8.5,
    "axes.linewidth": 0.7,
    "lines.linewidth": 1.4,
})
COLORS = ["#1f4e79", "#c0504d", "#4f8a3a", "#7f5fa0"]


def figure_second_variation():
    fig, axes = plt.subplots(1, 2, figsize=(6.6, 2.6), constrained_layout=True)
    r = np.linspace(1e-3, np.pi / 2 - 1e-3, 400)
    for i, k in enumerate((2, 3, 4)):
        axes[0].plot(r, (k ** 2 - 1) * (k ** 2 - 2 + np.sin(r) ** 2), color=COLORS[i], label=f"$k={k}$")
    axes[0].set_xlim(0, np.pi / 2)
    axes[0].set_ylim(0, 260)
    axes[0].set_xticks([0, np.pi / 4, np.pi / 2])
    axes[0].set_xticklabels(["$0$", r"$\pi/4$", r"$\pi/2$"])
    axes[0].set_xlabel("radius $r$")
    axes[0].set_ylabel(r"$(k^2-1)(k^2-2+c\,\mathrm{sn}_c(r)^2)$")
    axes[0].set_title(r"$\mathbb{S}^2$ ($c=1$)", fontsize=10)
    axes[0].legend(frameon=False, loc="upper left")

    r = np.linspace(1e-3, 3.2, 400)
    for i, k in enumerate((2, 3, 4)):
        axes[1].plot(r, (k ** 2 - 1) * (k ** 2 - 2 - np.sinh(r) ** 2), color=COLORS[i], label=f"$k={k}$")
        rk = np.arcsinh(np.sqrt(k ** 2 - 2))
        axes[1].plot([rk], [0], "o", ms=3.5, color=COLORS[i])
    axes[1].axhline(0, color="0.4", lw=0.6)
    axes[1].set_xlim(0, 3.2)
    axes[1].set_ylim(-160, 260)
    axes[1].set_xlabel("radius $r$")
    axes[1].set_title(r"$\mathbb{H}^2$ ($c=-1$): zeros at $\sinh^2 r=k^2-2$", fontsize=10)
    axes[1].legend(frameon=False, loc="lower left")
    fig.savefig(os.path.join(FIG, "second_variation.pdf"))
    plt.close(fig)


def figure_counterexample():
    fig, ax = plt.subplots(figsize=(3.0, 3.0), constrained_layout=True)
    th = np.linspace(0, 2 * np.pi, 800)
    ax.plot(np.cos(th), np.sin(th), color="0.3", lw=0.8)
    for rho, style, label in ((2.0 + 0.0 * th, dict(color="0.55", ls="--", lw=1.0), r"circle $\rho=2$"),
                              (2.0 + 0.2 * np.cos(2 * th), dict(color=COLORS[1], lw=1.5),
                               r"$\rho=2+0.2\cos 2\theta$")):
        s = np.tanh(rho / 2)
        ax.plot(s * np.cos(th), s * np.sin(th), label=label, **style)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.legend(frameon=False, loc="lower center", bbox_to_anchor=(0.5, -0.12), ncol=1)
    fig.savefig(os.path.join(FIG, "counterexample.pdf"))
    plt.close(fig)


def figure_csf():
    data = np.load(os.path.join(HERE, "csf_data.npz"))
    fig, axes = plt.subplots(1, 2, figsize=(6.6, 2.6), constrained_layout=True)
    for (name, label), col in zip((("H_r2_eps02", r"$\rho_0=2+0.2\cos2\theta$"),
                                   ("H_r16_eps005", r"$\rho_0=1.6+0.05\cos2\theta$ (h-convex)")),
                                  COLORS):
        d = data[name]
        t, I, G = d[:, 0], d[:, 4], d[:, 5]
        axes[0].semilogy(t, I - 1, color=col, label=label)
        j = np.argmax(G > 0)
        axes[0].plot([t[j]], [I[j] - 1], "o", ms=3.5, color=col)
    axes[0].set_xlabel("time $t$")
    axes[0].set_ylabel(r"$L^2/(A(4\pi+A))-1$")
    axes[0].set_title(r"curve shortening flow in $\mathbb{H}^2$", fontsize=10)
    axes[0].legend(frameon=False, loc="lower left")
    d = data["S_ellipse"]
    axes[1].semilogy(d[:, 0], d[:, 4] - 1, color=COLORS[2])
    axes[1].set_xlabel("time $t$")
    axes[1].set_ylabel(r"$L^2/(A(4\pi-A))-1$")
    axes[1].set_title(r"curve shortening flow in $\mathbb{S}^2$", fontsize=10)
    fig.savefig(os.path.join(FIG, "csf.pdf"))
    plt.close(fig)
    for name in data.files:
        d = data[name]
        print(f"{name}: min G along the recorded flow = {d[:, 5].min():+.6f}, "
              f"time of sign change of G = {d[np.argmax(d[:, 5] > 0), 0] if (d[:, 5] > 0).any() else float('nan'):.4f}")


if __name__ == "__main__":
    figure_second_variation()
    figure_counterexample()
    figure_csf()
    print("figures written to", os.path.normpath(FIG))

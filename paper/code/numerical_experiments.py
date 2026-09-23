"""Numerical experiments reported in Section 6 of the paper.

Writes results.json and prints the tables.  Every geometric quantity is
computed spectrally from an embedding (unit sphere, hyperboloid, plane); the
enclosed area is computed independently from the model (gnomonic plane,
Klein disc or polar graph), so the Gauss-Bonnet residual K - (2*pi - cA)
measures the discretisation error.
"""

import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import curves  # noqa: E402

PI = np.pi


def area_from_gnomonic(Y):
    """Spherical area enclosed by the lift of a planar curve star-shaped about 0."""
    Yp = curves.dft_derivative(Y)
    r2 = np.sum(Y ** 2, axis=0)
    dphi = (Y[0] * Yp[1] - Y[1] * Yp[0]) / r2
    h = 2 * PI / Y.shape[1]
    return float(np.sum((1.0 - 1.0 / np.sqrt(1.0 + r2)) * dphi) * h)


def area_from_klein(Y):
    Yp = curves.dft_derivative(Y)
    r2 = np.sum(Y ** 2, axis=0)
    dphi = (Y[0] * Yp[1] - Y[1] * Yp[0]) / r2
    h = 2 * PI / Y.shape[1]
    return float(np.sum((1.0 / np.sqrt(1.0 - r2) - 1.0) * dphi) * h)


def random_support(rng, n, a, max_mode=8, translate=0.0):
    """Random support function a*(1 + s*b) + translation, with rho = H + H'' > 0.

    The amplitude s is a random fraction of the largest value keeping the
    planar curve convex, so the sample ranges from near-circles to curves
    whose radius of curvature almost vanishes somewhere."""
    th = 2 * PI * np.arange(n) / n
    b = np.zeros(n)
    rho_b = np.zeros(n)
    for kk in range(2, rng.integers(3, max_mode + 1) + 1):
        amp = rng.normal() / kk ** rng.uniform(1.0, 2.5)
        ph = rng.uniform(0, 2 * PI)
        b += amp * np.cos(kk * th + ph)
        rho_b += (1 - kk ** 2) * amp * np.cos(kk * th + ph)
    smax = 1.0 / max(1e-12, -np.min(rho_b))
    s = smax * rng.uniform(0.0, 0.93)
    H = a * (1.0 + s * b)
    H = H + translate * (rng.normal() * np.cos(th) + rng.normal() * np.sin(th)) * a
    return H


def invariants_summary(data, A, c):
    Delta = curves.isoperimetric_deficit(data.L, A, c)
    rhs = curves.gage_rhs(data.L, A, c) if c != 0 else PI * data.L / A
    cs_gap = data.m - data.K ** 2 / data.L
    correction = rhs - data.K ** 2 / data.L
    D, lam = curves.l1_oscillation(data)
    return {
        "L": data.L, "A": A, "K": data.K, "m": data.m, "rhs": rhs,
        "ratio": data.m / rhs,
        "relative": cs_gap / correction if correction > 1e-14 else np.inf,
        "Delta": Delta,
        "l1_ratio": D / np.sqrt(Delta) if Delta > 1e-14 else np.inf,
        "kappa_min": data.kappa_min,
        "gb_residual": abs(data.K - (2 * PI - c * A)) if c != 0 else abs(data.K - 2 * PI),
    }


def experiment_sphere_random(rng, trials, n=2048):
    worst = {"ratio": np.inf, "relative": np.inf, "l1_ratio": np.inf}
    worst_row = {}
    count, resid = 0, 0.0
    for _ in range(trials):
        a = np.exp(rng.uniform(np.log(0.03), np.log(4.0)))
        H = random_support(rng, n, a, translate=rng.uniform(0, 1.0))
        if np.min(H) <= 0:
            continue
        Y = curves.planar_from_support(H)
        data = curves.sphere_curve(curves.gnomonic_lift(Y))
        if data.kappa_min <= 0:
            continue
        A = area_from_gnomonic(Y)
        row = invariants_summary(data, A, 1)
        count += 1
        resid = max(resid, row["gb_residual"])
        for key in worst:
            if row[key] < worst[key]:
                worst[key] = row[key]
                worst_row[key] = row
    return {"count": count, "worst": worst, "worst_rows": worst_row, "max_gb_residual": resid}


def experiment_plane_random(rng, trials, n=2048):
    worst = {"ratio": np.inf, "relative": np.inf, "l1_ratio": np.inf}
    count = 0
    for _ in range(trials):
        H = random_support(rng, n, 1.0, translate=0.0)
        if np.min(H) <= 0:
            continue
        data = curves.plane_curve(curves.planar_from_support(H))
        if data.kappa_min <= 0:
            continue
        row = invariants_summary(data, data.A, 0)
        count += 1
        for key in worst:
            worst[key] = min(worst[key], row[key])
    return {"count": count, "worst": worst}


def sphere_shape(name, n):
    th = 2 * PI * np.arange(n) / n
    kind, p = name
    if kind == "ellipse":
        al, be, sx = p
        Y = np.stack([al * np.cos(th) + sx, be * np.sin(th)])
    elif kind == "polygon":
        sides, R, eps = p
        verts = [R * np.array([np.cos(2 * PI * j / sides), np.sin(2 * PI * j / sides)]) for j in range(sides)]
        H = np.max([v[0] * np.cos(th) + v[1] * np.sin(th) for v in verts], axis=0)
        freq = np.fft.fftfreq(n, d=1.0 / n)
        H = np.real(np.fft.ifft(np.fft.fft(H) * np.exp(-(freq / 60.0) ** 2))) + eps * R
        Y = curves.planar_from_support(H)
    else:
        raise ValueError(kind)
    return Y


SPHERE_SHAPES = [
    (("ellipse", (2.0, 1.0, 0.0)), "gnomonic ellipse 2 : 1"),
    (("ellipse", (8.0, 1.0, 0.0)), "gnomonic ellipse 8 : 1"),
    (("ellipse", (20.0, 1.0, 0.0)), "gnomonic ellipse 20 : 1"),
    (("ellipse", (5.0, 0.5, 0.0)), "gnomonic ellipse 10 : 1, small"),
    (("ellipse", (1.0, 0.5, 0.8)), "off-centre ellipse"),
    (("ellipse", (0.2, 0.1, 5.0)), "small ellipse near the equator"),
    (("polygon", (3, 0.1, 0.02)), "rounded triangle, small"),
    (("polygon", (3, 1.0, 0.02)), "rounded triangle, medium"),
    (("polygon", (3, 5.0, 0.02)), "rounded triangle, large"),
    (("polygon", (4, 1.0, 0.02)), "rounded square, medium"),
    (("polygon", (5, 5.0, 0.02)), "rounded pentagon, large"),
]


def experiment_sphere_shapes():
    rows = []
    for spec, label in SPHERE_SHAPES:
        vals = []
        for n in (16384, 32768):
            Y = sphere_shape(spec, n)
            data = curves.sphere_curve(curves.gnomonic_lift(Y))
            vals.append(invariants_summary(data, area_from_gnomonic(Y), 1))
        a, b = vals
        conv = max(abs(a[key] - b[key]) / max(1.0, abs(b[key])) for key in ("L", "A", "m"))
        b["label"] = label
        b["convergence"] = conv
        rows.append(b)
    return rows


def experiment_hyperbolic_circles(n=8192):
    rows = []
    th = 2 * PI * np.arange(n) / n
    for r in (1.0, 1.2, 1.5, 2.0, 3.0):
        for kk, eps in ((2, 0.05), (2, 0.2), (3, 0.05)):
            R = r + eps * np.cos(kk * th)
            data = curves.curve_from_polar_graph(R, -1)
            _, A, _, _ = curves.polar_graph_formulas(R, -1)
            row = invariants_summary(data, A, -1)
            row.update({"r": r, "k": kk, "eps": eps,
                        "q_k": PI * (kk ** 2 - 1) * (kk ** 2 - 2 - np.sinh(r) ** 2) / np.sinh(r) ** 3})
            rows.append(row)
    return rows


def experiment_hyperbolic_random(rng, trials, n=1024):
    Lstar = 2 * PI * np.sqrt(2)
    small = {"count": 0, "min_ratio": np.inf, "violations": 0}
    large = {"count": 0, "min_ratio": np.inf, "violations": 0}
    resid = 0.0
    for _ in range(trials):
        a = rng.uniform(0.02, 0.9)
        H = random_support(rng, n, a, translate=rng.uniform(0, 0.6))
        if np.min(H) <= 0:
            continue
        Y = curves.planar_from_support(H)
        if np.max(np.sum(Y ** 2, axis=0)) >= 0.995:
            continue
        data = curves.hyperbolic_curve(curves.klein_lift(Y))
        if data.kappa_min <= 0:
            continue
        A = area_from_klein(Y)
        resid = max(resid, abs(data.K - (2 * PI + A)))
        ratio = data.m / curves.gage_rhs(data.L, A, -1)
        bucket = small if data.L < Lstar else large
        bucket["count"] += 1
        bucket["min_ratio"] = min(bucket["min_ratio"], ratio)
        bucket["violations"] += int(ratio < 1.0)
    return {"L_star": Lstar, "small": small, "large": large, "max_gb_residual": resid}


def main():
    rng = np.random.default_rng(20260923)
    results = {}
    print("Sphere, random convex curves ...")
    results["sphere_random"] = experiment_sphere_random(rng, 40000)
    print(json.dumps({k: v for k, v in results["sphere_random"].items() if k != "worst_rows"}, indent=1))
    print("Plane, random convex curves (sanity check against Gage and the planar L1 lemma) ...")
    results["plane_random"] = experiment_plane_random(rng, 10000)
    print(json.dumps(results["plane_random"], indent=1))
    print("Sphere, extreme shapes ...")
    results["sphere_shapes"] = experiment_sphere_shapes()
    for row in results["sphere_shapes"]:
        print(f"  {row['label']:32s} L={row['L']:.6f} A={row['A']:.6f} m={row['m']:.6f} rhs={row['rhs']:.6f} "
              f"ratio={row['ratio']:.4f} rel={row['relative']:.4f} L1={row['l1_ratio']:.4f} "
              f"kmin={row['kappa_min']:.2e} conv={row['convergence']:.1e}")
    print("Hyperbolic plane, perturbed circles ...")
    results["hyperbolic_circles"] = experiment_hyperbolic_circles()
    for row in results["hyperbolic_circles"]:
        print(f"  r={row['r']:.1f} k={row['k']} eps={row['eps']:.2f}: L={row['L']:.6f} A={row['A']:.6f} "
              f"m={row['m']:.6f} rhs={row['rhs']:.6f} ratio={row['ratio']:.6f} L1={row['l1_ratio']:.4f} "
              f"kmin={row['kappa_min']:.4f} q_k={row['q_k']:+.4f}")
    print("Hyperbolic plane, random convex curves ...")
    results["hyperbolic_random"] = experiment_hyperbolic_random(rng, 60000)
    print(json.dumps(results["hyperbolic_random"], indent=1))

    def clean(o):
        if isinstance(o, dict):
            return {k: clean(v) for k, v in o.items()}
        if isinstance(o, list):
            return [clean(v) for v in o]
        if isinstance(o, float) and not np.isfinite(o):
            return None
        return o

    with open(os.path.join(HERE, "results.json"), "w") as fh:
        json.dump(clean(results), fh, indent=1)
    print("wrote results.json")


if __name__ == "__main__":
    main()

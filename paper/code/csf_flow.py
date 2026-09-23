"""Curve shortening flow of polar graphs rho = R(theta, t) in S^2 and H^2.

For inward normal speed kappa the radial function evolves by
    R_t = -kappa * sqrt(R_theta^2 + sn(R)^2) / sn(R),
which is integrated with a Fourier pseudo-spectral discretisation (2/3
dealiasing) and classical RK4 with a time step below the explicit stability
limit.  Output: csf_data.npz with the isoperimetric ratio
I = L^2 / (A (4 pi - c A)) and the Gage deficit along each run.
"""

import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import curves  # noqa: E402

PI = np.pi


def radial_speed(R, c):
    L, A, m, kappa = curves.polar_graph_formulas(R, c)
    S = np.sin(R) if c == 1 else np.sinh(R)
    Rp = curves.dft_derivative(R)
    return -kappa * np.sqrt(Rp ** 2 + S ** 2) / S


def dealias(R):
    n = R.shape[0]
    F = np.fft.fft(R)
    F[np.abs(np.fft.fftfreq(n, d=1.0 / n)) > n / 3] = 0.0
    return np.real(np.fft.ifft(F))


def run(R0, c, area_stop, record_every=10):
    n = R0.shape[0]
    R, t, step = R0.copy(), 0.0, 0
    rows = []
    while True:
        L, A, m, kappa = curves.polar_graph_formulas(R, c)
        if step % record_every == 0:
            I = L ** 2 / (A * (4 * PI - c * A))
            G = m - curves.gage_rhs(L, A, c)
            rows.append((t, L, A, m, I, G, kappa.min()))
        if A < area_stop:
            break
        S = np.sin(R) if c == 1 else np.sinh(R)
        dt = 0.35 * 2.78 * np.min(S) ** 2 / (n / 2) ** 2
        k1 = radial_speed(R, c)
        k2 = radial_speed(R + 0.5 * dt * k1, c)
        k3 = radial_speed(R + 0.5 * dt * k2, c)
        k4 = radial_speed(R + dt * k3, c)
        R = dealias(R + dt * (k1 + 2 * k2 + 2 * k3 + k4) / 6)
        t += dt
        step += 1
    return np.array(rows)


def main():
    n = 128
    th = 2 * PI * np.arange(n) / n
    # gnomonic lift of the planar ellipse x^2 + 4 y^2 = 1: a convex spherical curve
    ellipse_radius = 1.0 / np.sqrt(np.cos(th) ** 2 / 1.0 ** 2 + np.sin(th) ** 2 / 0.5 ** 2)
    runs = {
        "H_r2_eps02": (2.0 + 0.2 * np.cos(2 * th), -1, 0.05),
        "H_r16_eps005": (1.6 + 0.05 * np.cos(2 * th), -1, 0.05),
        "S_ellipse": (np.arctan(ellipse_radius), 1, 0.01),
    }
    out = {}
    for name, (R0, c, stop) in runs.items():
        data = run(R0, c, stop)
        out[name] = data
        t, I, G, kmin = data[:, 0], data[:, 4], data[:, 5], data[:, 6]
        i = int(np.argmax(I))
        incr = np.max(np.diff(I))
        print(f"{name}: T_stop={t[-1]:.4f}  I(0)={I[0]:.8f}  max I={I[i]:.8f} at t={t[i]:.4f}  "
              f"I(end)={I[-1]:.8f}  G(0)={G[0]:+.6f}  min kappa(0)={kmin[0]:.4f}  "
              f"largest increase of I between records={incr:+.3e}")
    np.savez(os.path.join(HERE, "csf_data.npz"), **out)
    print("wrote csf_data.npz")


if __name__ == "__main__":
    main()

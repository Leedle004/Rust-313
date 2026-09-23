"""Spectral geometry of closed curves in the space forms S^2, R^2 and H^2.

All curves are sampled at n equispaced parameter values of a 2*pi-periodic
parameter.  Derivatives are computed with the FFT and integrals with the
trapezoidal rule, both spectrally accurate for smooth periodic data.

The sphere is the unit sphere in R^3 and the hyperbolic plane is the upper
sheet of the hyperboloid <x,x> = -1 in Minkowski space R^{2,1} with
<a,b> = a1 b1 + a2 b2 - a3 b3.  Geodesic curvature is taken with respect to
the normal pointing into the region on the left of the curve, so convex
curves traversed counterclockwise have kappa > 0.
"""

import numpy as np

TWO_PI = 2.0 * np.pi


def dft_derivative(f, order=1):
    n = f.shape[-1]
    freq = np.fft.fftfreq(n, d=1.0 / n)
    return np.real(np.fft.ifft((1j * freq) ** order * np.fft.fft(f, axis=-1), axis=-1))


def minkowski(a, b):
    return a[0] * b[0] + a[1] * b[1] - a[2] * b[2]


class CurveData:
    """Length L, total curvature K, bending energy m and the curvature samples."""

    def __init__(self, c, speed, kappa):
        n = speed.shape[0]
        self.c = c
        self.h = TWO_PI / n
        self.speed = speed
        self.kappa = kappa
        self.ds = speed * self.h
        self.L = float(np.sum(self.ds))
        self.K = float(np.sum(kappa * self.ds))
        self.m = float(np.sum(kappa ** 2 * self.ds))
        # Gauss-Bonnet: K = 2*pi - c*A
        self.A = (TWO_PI - self.K) / c if c != 0 else None

    @property
    def kappa_min(self):
        return float(np.min(self.kappa))


def sphere_curve(X):
    """X: array (3, n) of points on the unit sphere."""
    Xp = dft_derivative(X)
    Xpp = dft_derivative(X, 2)
    speed = np.linalg.norm(Xp, axis=0)
    kappa = np.einsum("ij,ij->j", X, np.cross(Xp, Xpp, axis=0)) / speed ** 3
    return CurveData(1, speed, kappa)


def hyperbolic_curve(X):
    """X: array (3, n) of points on the hyperboloid model of H^2."""
    Xp = dft_derivative(X)
    Xpp = dft_derivative(X, 2)
    speed = np.sqrt(minkowski(Xp, Xp))
    kappa = np.linalg.det(np.stack([X.T, Xp.T, Xpp.T], axis=1)) / speed ** 3
    return CurveData(-1, speed, kappa)


def plane_curve(Y):
    Yp = dft_derivative(Y)
    Ypp = dft_derivative(Y, 2)
    speed = np.linalg.norm(Yp, axis=0)
    kappa = (Yp[0] * Ypp[1] - Yp[1] * Ypp[0]) / speed ** 3
    data = CurveData(0, speed, kappa)
    data.A = 0.5 * float(np.sum(Y[0] * Yp[1] - Y[1] * Yp[0]) * data.h)
    return data


def planar_from_support(H):
    """Planar curve with support function H(theta) (outer normal at angle theta)."""
    n = H.shape[0]
    th = TWO_PI * np.arange(n) / n
    Hp = dft_derivative(H)
    u = np.stack([np.cos(th), np.sin(th)])
    up = np.stack([-np.sin(th), np.cos(th)])
    return H * u + Hp * up


def gnomonic_lift(Y):
    """Inverse gnomonic projection from the tangent plane at the north pole.

    Lines of the plane correspond to great circles, so planar convex curves
    lift to convex spherical curves in the open northern hemisphere."""
    X = np.vstack([Y, np.ones(Y.shape[1])])
    return X / np.linalg.norm(X, axis=0)


def klein_lift(Y):
    """Inverse of the Beltrami-Klein projection (geodesics are straight chords)."""
    r2 = np.sum(Y ** 2, axis=0)
    if np.max(r2) >= 1.0:
        raise ValueError("curve leaves the Klein disc")
    return np.vstack([Y, np.ones(Y.shape[1])]) / np.sqrt(1.0 - r2)


def polar_graph_points(R, c):
    """Points of the polar graph rho = R(theta) about the base point (0, 0, 1)."""
    n = R.shape[0]
    th = TWO_PI * np.arange(n) / n
    if c == 1:
        return np.stack([np.sin(R) * np.cos(th), np.sin(R) * np.sin(th), np.cos(R)])
    if c == -1:
        return np.stack([np.sinh(R) * np.cos(th), np.sinh(R) * np.sin(th), np.cosh(R)])
    return np.stack([R * np.cos(th), R * np.sin(th)])


def curve_from_polar_graph(R, c):
    P = polar_graph_points(R, c)
    if c == 1:
        return sphere_curve(P)
    if c == -1:
        return hyperbolic_curve(P)
    return plane_curve(P)


def polar_graph_formulas(R, c):
    """L, A, m of rho = R(theta) from the intrinsic polar-graph formulas (2.4)-(2.6)."""
    n = R.shape[0]
    h = TWO_PI / n
    if c == 1:
        S, C, prim = np.sin(R), np.cos(R), 1.0 - np.cos(R)
    elif c == -1:
        S, C, prim = np.sinh(R), np.cosh(R), np.cosh(R) - 1.0
    else:
        S, C, prim = R, np.ones_like(R), 0.5 * R ** 2
    Rp, Rpp = dft_derivative(R), dft_derivative(R, 2)
    M = Rp ** 2 + S ** 2
    kappa = (S ** 2 * C + 2.0 * C * Rp ** 2 - S * Rpp) / M ** 1.5
    L = float(np.sum(np.sqrt(M)) * h)
    A = float(np.sum(prim) * h)
    m = float(np.sum(kappa ** 2 * np.sqrt(M)) * h)
    return L, A, m, kappa


def gage_rhs(L, A, c):
    """Right-hand side (2*pi - cA)^2 L / (A (4*pi - cA)) of the Gage-type inequality."""
    return (TWO_PI - c * A) ** 2 * L / (A * (2.0 * TWO_PI - c * A))


def isoperimetric_deficit(L, A, c):
    return L ** 2 - 4.0 * np.pi * A + c * A ** 2


def gage_deficit(data):
    return data.m - gage_rhs(data.L, data.A, data.c)


def l1_oscillation(data):
    """min over lambda of int |1 - lambda*kappa| ds (attained at a sigma-median of 1/kappa)."""
    x = 1.0 / data.kappa
    w = data.kappa * data.ds
    order = np.argsort(x)
    cw = np.cumsum(w[order])
    lam = x[order][np.searchsorted(cw, 0.5 * cw[-1])]
    return float(np.sum(np.abs(1.0 - lam * data.kappa) * data.ds)), float(lam)

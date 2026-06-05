#!/usr/bin/env python3
"""Generate the agentic-AI emissions sensitivity heatmap.

The calculation matches the approximation used in paper.tex:

    annual emissions (t CO2e) ~= population * workdays * overhead
                                 * adoption_share * kWh_per_user_day
                                 * emissions_intensity_g_per_kWh / 1e6

With the defaults below this simplifies to approximately:

    annual emissions (t CO2e) ~= 2,460 * adoption_share * kWh_per_user_day
"""

from __future__ import annotations

import argparse

import matplotlib.pyplot as plt
import numpy as np


POPULATION = 38_000
WORKDAYS_PER_YEAR = 250
EMISSIONS_INTENSITY_G_PER_KWH = 207
TRAINING_OVERHEAD = 0.25

ADOPTION_MIN = 0.01
ADOPTION_MAX = 0.20
ADOPTION_STEPS = 20

INTENSITY_MIN_KWH = 0.1
INTENSITY_MAX_KWH = 2.4
INTENSITY_STEPS = 24


def annual_emissions_tco2e(adoption_share: np.ndarray, kwh_per_user_day: np.ndarray) -> np.ndarray:
    return (
        POPULATION
        * WORKDAYS_PER_YEAR
        * (1 + TRAINING_OVERHEAD)
        * adoption_share
        * kwh_per_user_day
        * EMISSIONS_INTENSITY_G_PER_KWH
        / 1_000_000
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        default="fig-agentic-ai.png",
        help="Path to output PNG file.",
    )
    args = parser.parse_args()

    adoption = np.linspace(ADOPTION_MIN, ADOPTION_MAX, ADOPTION_STEPS)
    intensity = np.linspace(INTENSITY_MIN_KWH, INTENSITY_MAX_KWH, INTENSITY_STEPS)
    adoption_grid, intensity_grid = np.meshgrid(adoption, intensity)
    emissions = annual_emissions_tco2e(adoption_grid, intensity_grid)

    fig, ax = plt.subplots(figsize=(7.2, 4.8), dpi=180)
    mesh = ax.pcolormesh(adoption_grid * 100, intensity_grid, emissions, shading="auto", cmap="YlOrRd")

    contour_levels = [50, 100, 250, 500, 1000]
    contours = ax.contour(
        adoption_grid * 100,
        intensity_grid,
        emissions,
        levels=contour_levels,
        colors="black",
        linewidths=0.7,
        alpha=0.65,
    )
    ax.clabel(contours, inline=True, fmt="%d t", fontsize=8)

    ax.scatter([5, 10], [1.3, 2.4], color="black", s=24, zorder=3)
    ax.text(5.4, 1.30, "5%, 1.3 kWh", fontsize=8, va="center")
    ax.text(10.4, 2.33, "10%, 2.4 kWh", fontsize=8, va="center")

    ax.set_xlabel("Share of UZH population using agents heavily on workdays (%)")
    ax.set_ylabel("Agentic AI energy per active user-day (kWh)")
    ax.set_title("Annual emissions from agentic AI workloads")

    colorbar = fig.colorbar(mesh, ax=ax)
    colorbar.set_label("t CO2e per year")

    ax.set_xlim(ADOPTION_MIN * 100, ADOPTION_MAX * 100)
    ax.set_ylim(INTENSITY_MIN_KWH, INTENSITY_MAX_KWH)
    ax.grid(color="white", linewidth=0.4, alpha=0.55)

    fig.tight_layout()
    fig.savefig(args.output)


if __name__ == "__main__":
    main()

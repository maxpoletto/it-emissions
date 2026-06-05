#!/usr/bin/env python3
"""Regenerate the figures used by paper.tex.

This script mirrors the deterministic model in app/emissions-calculator.html and
adds the bounded SaaS/CSCS scenarios described in the revised manuscript. It
produces the paper figures without relying on browser screenshots.
"""

from __future__ import annotations

import argparse
from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


BASE_YEAR = 2026

CH_GCO2_PER_KWH_BY_2H = [63, 58, 58, 52, 49, 47, 45, 45, 49, 54, 62, 63]

DEVICE_INFO_DEFAULT = {
    "Laptops": {"Lifetime": 6, "Count": 32_000, "Days per year": 250},
    "Monitors": {"Lifetime": 8, "Count": 10_440, "Days per year": 250},
    "Desktops": {"Lifetime": 8, "Count": 0, "Days per year": 250},
    "Servers": {"Lifetime": 5, "Count": 1_121, "Days per year": 365},
    "Mobile phones": {"Lifetime": 3, "Count": 35_000, "Days per year": 250},
    "A/V equipment": {"Lifetime": 8, "Count": 431, "Days per year": 250},
    "Printers": {"Lifetime": 8, "Count": 333, "Days per year": 250},
}

EMBODIED_DEFAULT = {
    "Laptops": {"Mean": 180, "Min": 104},
    "Monitors": {"Mean": 340, "Min": 150},
    "Desktops": {"Mean": 290, "Min": 209},
    "Servers": {"Mean": 1_100, "Min": 383},
    "Mobile phones": {"Mean": 50, "Min": 30},
    "A/V equipment": {"Mean": 700, "Min": 644},
    "Printers": {"Mean": 1_100, "Min": 967},
}

POWER_DEFAULT = {
    "Laptops": {"Mean": 50, "Standby": 1},
    "Monitors": {"Mean": 50, "Standby": 1},
    "Desktops": {"Mean": 100, "Standby": 1},
    "Servers": {"Mean": 400, "Standby": 1},
    "Mobile phones": {"Mean": 10, "Standby": 0},
    "A/V equipment": {"Mean": 250, "Standby": 1},
    "Printers": {"Mean": 1_000, "Standby": 90},
}

COMPUTE_DEFAULT = {
    "Campus networking overhead %": 10,
    "Campus data center PUE x100": 200,
    "Cloud PUE x100": 115,
    "Cloud % servers in cloud": 0,
    "Cloud instances per 100 local servers": 100,
    "Cloud instance embodied kg": 700,
    "Cloud instance power W": 300,
    "Cloud instance lifetime y": 4,
    "Supercomputing mean power kW": 66,
}

LLMS_DEFAULT = {
    "User population": 38_000,
    "Mean daily user queries": 15,
    "Days per year": 250,
    "Mean query Wh": 1.0,
    "Training overhead %": 25,
    "Emissions intensity g CO2e / kWh": 207,
    "Embodied emissions g CO2e / query": 0.1,
    "Annual usage growth %": 50,
    "Annual efficiency growth %": 30,
    "Annual training growth %": 50,
}

DUTY_CYCLE_6H_DEFAULT = {
    "Laptops": [0.1, 0.5, 1.0, 0.3],
    "Desktops": [0.1, 0.5, 1.0, 0.3],
    "Servers": [0.8, 0.8, 0.8, 0.8],
    "Mobile phones": [0.0, 0.0, 0.0, 0.5],
    "Monitors": [0.1, 0.5, 1.0, 0.3],
    "A/V equipment": [0.0, 0.3, 0.6, 0.1],
    "Printers": [0.0, 0.0, 0.01, 0.0],
}

BOUNDARY_DEFAULT = {
    "Productivity SaaS": {"embodied": 0.0, "usage": 114.0},
    "CSCS": {"embodied": 150.0, "usage": 216.0},
}

PLOT_CATEGORY_ORDER = [
    "Laptops",
    "Monitors",
    "Desktops",
    "Servers",
    "Mobile phones",
    "A/V equipment",
    "Printers",
    "Campus networking",
    "DC cooling",
    "Cloud",
    "Legacy supercomputing",
    "CSCS",
    "Productivity SaaS",
    "Ordinary chat AI",
]


@dataclass
class ModelState:
    device_info: dict
    embodied: dict
    power: dict
    compute: dict
    llms: dict
    duty_cycle_6h: dict
    boundary: dict


def default_state() -> ModelState:
    return ModelState(
        device_info=deepcopy(DEVICE_INFO_DEFAULT),
        embodied=deepcopy(EMBODIED_DEFAULT),
        power=deepcopy(POWER_DEFAULT),
        compute=deepcopy(COMPUTE_DEFAULT),
        llms=deepcopy(LLMS_DEFAULT),
        duty_cycle_6h=deepcopy(DUTY_CYCLE_6H_DEFAULT),
        boundary=deepcopy(BOUNDARY_DEFAULT),
    )


def mean_ch_gco2_per_kwh() -> float:
    return float(np.mean(CH_GCO2_PER_KWH_BY_2H))


def emission_at_hour(hour: int) -> float:
    return CH_GCO2_PER_KWH_BY_2H[hour // 2]


def device_emissions_intensity(state: ModelState, device: str) -> float:
    duty = state.duty_cycle_6h[device]
    total = 0.0
    for hour in range(24):
        total += duty[hour // 6] * emission_at_hour(hour)
    return total


def average_emissions_kg_per_day(power_w: float) -> float:
    return mean_ch_gco2_per_kwh() / 1000 * (power_w / 1000) * 24


def device_emissions_kg(state: ModelState, device: str) -> tuple[float, float]:
    n = state.device_info[device]["Count"]
    if device == "Servers":
        cloud_instances = int(state.compute["Cloud % servers in cloud"] * n / 100)
        n -= cloud_instances
    usage = (
        n
        * state.power[device]["Mean"]
        * device_emissions_intensity(state, device)
        * state.device_info[device]["Days per year"]
        / 1_000_000
    )
    embodied = n * state.embodied[device]["Mean"] / state.device_info[device]["Lifetime"]
    return usage, embodied


def cloud_instances(state: ModelState) -> int:
    servers = state.device_info["Servers"]["Count"]
    return int(state.compute["Cloud % servers in cloud"] * servers / 100)


def data_center_cooling_kg(state: ModelState) -> float:
    server_usage, _ = device_emissions_kg(state, "Servers")
    return server_usage * (state.compute["Campus data center PUE x100"] - 100) / 100


def cloud_emissions_kg(state: ModelState) -> tuple[float, float]:
    n = cloud_instances(state) * state.compute["Cloud instances per 100 local servers"] / 100
    usage = (
        n
        * average_emissions_kg_per_day(state.compute["Cloud instance power W"])
        * 365
        * state.compute["Cloud PUE x100"]
        / 100
    )
    embodied = n * state.compute["Cloud instance embodied kg"] / state.compute["Cloud instance lifetime y"]
    return usage, embodied


def supercomputing_emissions_kg(state: ModelState) -> float:
    return average_emissions_kg_per_day(state.compute["Supercomputing mean power kW"] * 1000) * 365


def llm_emissions_kg(state: ModelState) -> tuple[float, float]:
    nqueries = state.llms["Mean daily user queries"] * state.llms["User population"]
    usage = (
        nqueries
        * state.llms["Days per year"]
        * state.llms["Mean query Wh"]
        * state.llms["Emissions intensity g CO2e / kWh"]
        / 1_000_000
    )
    overhead = usage * state.llms["Training overhead %"] / 100
    embodied = nqueries * state.llms["Embodied emissions g CO2e / query"] / 1000
    return usage, overhead + embodied


def run_model(state: ModelState, include_boundary: bool = True) -> list[dict[str, float | str]]:
    rows = []
    total_usage = 0.0
    total_embodied = 0.0

    for device in state.device_info:
        usage, embodied = device_emissions_kg(state, device)
        rows.append({"category": device, "usage": usage / 1000, "embodied": embodied / 1000})
        total_usage += usage
        total_embodied += embodied

    networking_usage = 0.0
    networking_embodied = 0.0
    for device in ["Laptops", "Desktops", "Servers"]:
        usage, embodied = device_emissions_kg(state, device)
        networking_usage += usage * state.compute["Campus networking overhead %"] / 100
        networking_embodied += embodied * state.compute["Campus networking overhead %"] / 100
    rows.append(
        {
            "category": "Campus networking",
            "usage": networking_usage / 1000,
            "embodied": networking_embodied / 1000,
        }
    )
    total_usage += networking_usage
    total_embodied += networking_embodied

    cooling = data_center_cooling_kg(state)
    rows.append({"category": "DC cooling", "usage": cooling / 1000, "embodied": 0.0})
    total_usage += cooling

    cloud_usage, cloud_embodied = cloud_emissions_kg(state)
    rows.append({"category": "Cloud", "usage": cloud_usage / 1000, "embodied": cloud_embodied / 1000})
    total_usage += cloud_usage
    total_embodied += cloud_embodied

    if not include_boundary:
        supercomputing = supercomputing_emissions_kg(state)
        rows.append({"category": "Legacy supercomputing", "usage": supercomputing / 1000, "embodied": 0.0})
        total_usage += supercomputing

    llm_usage, llm_embodied = llm_emissions_kg(state)
    rows.append({"category": "Ordinary chat AI", "usage": llm_usage / 1000, "embodied": llm_embodied / 1000})
    total_usage += llm_usage
    total_embodied += llm_embodied

    if include_boundary:
        for category, values in state.boundary.items():
            rows.append({"category": category, "usage": values["usage"], "embodied": values["embodied"]})
            total_usage += values["usage"] * 1000
            total_embodied += values["embodied"] * 1000

    rows.append({"category": "Totals", "usage": total_usage / 1000, "embodied": total_embodied / 1000})
    return rows


def llm_projection(state: ModelState) -> list[dict[str, float]]:
    usage = state.llms["Mean daily user queries"] * state.llms["User population"]
    energy_per_query = state.llms["Mean query Wh"]
    emissions_intensity = state.llms["Emissions intensity g CO2e / kWh"]
    training_overhead = state.llms["Training overhead %"] / 100
    usage_growth = state.llms["Annual usage growth %"] / 100
    efficiency_growth = state.llms["Annual efficiency growth %"] / 100
    training_growth = state.llms["Annual training growth %"] / 100
    embodied = 0.0
    rows = []

    for offset in range(5):
        usage_emissions = (
            usage
            * state.llms["Days per year"]
            * energy_per_query
            * emissions_intensity
            / 1_000_000
            / 1000
        )
        if offset == 0:
            embodied = usage_emissions * training_overhead
        else:
            embodied *= 1 + training_growth
        rows.append(
            {
                "year": BASE_YEAR + offset,
                "usage": usage_emissions,
                "embodied": embodied,
                "total": usage_emissions + embodied,
            }
        )
        usage *= 1 + usage_growth
        energy_per_query *= 1 - efficiency_growth

    return rows


def nonzero_rows(rows: list[dict[str, float | str]]) -> list[dict[str, float | str]]:
    return [
        row
        for row in rows
        if row["category"] != "Totals" and (float(row["usage"]) + float(row["embodied"])) > 0.05
    ]


def plot_stacked_emissions(rows: list[dict[str, float | str]], title: str, output: Path) -> None:
    data = nonzero_rows(rows)
    order_index = {category: i for i, category in enumerate(PLOT_CATEGORY_ORDER)}
    data = sorted(data, key=lambda row: order_index.get(str(row["category"]), len(order_index)))
    labels = [str(row["category"]) for row in data]
    embodied = np.array([float(row["embodied"]) for row in data])
    usage = np.array([float(row["usage"]) for row in data])

    fig_width = max(8.6, 0.46 * len(labels))
    fig, ax = plt.subplots(figsize=(fig_width, 5.2), dpi=180)
    x = np.arange(len(labels))
    ax.bar(x, embodied, label="Embodied / lifecycle", color="#4472c4")
    ax.bar(x, usage, bottom=embodied, label="Operational", color="#ed7d31")
    ax.set_title(title)
    ax.set_ylabel("Annual emissions (t CO2e)")
    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=35, ha="right")
    ax.grid(axis="y", alpha=0.25)
    ax.legend(frameon=False)
    fig.tight_layout()
    fig.savefig(output)
    plt.close(fig)


def plot_llm_projection(rows: list[dict[str, float]], output: Path) -> None:
    years = [row["year"] for row in rows]
    usage = np.array([row["usage"] for row in rows])
    embodied = np.array([row["embodied"] for row in rows])

    fig, ax = plt.subplots(figsize=(7.6, 4.3), dpi=180)
    x = np.arange(len(years))
    ax.bar(x, embodied, label="Training / embodied overhead", color="#4472c4")
    ax.bar(x, usage, bottom=embodied, label="Inference operation", color="#ed7d31")
    ax.set_title("Ordinary chatbot growth projection")
    ax.set_ylabel("Annual emissions (t CO2e)")
    ax.set_xticks(x)
    ax.set_xticklabels(years)
    ax.grid(axis="y", alpha=0.25)
    ax.legend(frameon=False)
    fig.tight_layout()
    fig.savefig(output)
    plt.close(fig)


def plot_agentic_heatmap(output: Path) -> None:
    adoption = np.linspace(0.01, 0.20, 20)
    intensity = np.linspace(0.1, 2.4, 24)
    adoption_grid, intensity_grid = np.meshgrid(adoption, intensity)
    emissions = (
        LLMS_DEFAULT["User population"]
        * LLMS_DEFAULT["Days per year"]
        * (1 + LLMS_DEFAULT["Training overhead %"] / 100)
        * LLMS_DEFAULT["Emissions intensity g CO2e / kWh"]
        * adoption_grid
        * intensity_grid
        / 1_000_000
    )

    fig, ax = plt.subplots(figsize=(7.2, 4.8), dpi=180)
    mesh = ax.pcolormesh(adoption_grid * 100, intensity_grid, emissions, shading="auto", cmap="YlOrRd")
    contours = ax.contour(
        adoption_grid * 100,
        intensity_grid,
        emissions,
        levels=[50, 100, 250, 500, 1000],
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
    ax.set_xlim(1, 20)
    ax.set_ylim(0.1, 2.4)
    ax.grid(color="white", linewidth=0.4, alpha=0.55)
    fig.tight_layout()
    fig.savefig(output)
    plt.close(fig)


def generate_all(output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    baseline = default_state()
    plot_stacked_emissions(run_model(baseline), "Baseline UZH IT emissions", output_dir / "fig-baseline.png")
    plot_llm_projection(llm_projection(baseline), output_dir / "fig-llm-growth.png")

    cloud = default_state()
    cloud.compute["Cloud % servers in cloud"] = 100
    plot_stacked_emissions(run_model(cloud), "Migration of on-premise servers to cloud", output_dir / "fig-cloud.png")

    sens1 = default_state()
    sens1.device_info["Laptops"]["Count"] = 10_440
    sens1.device_info["Mobile phones"]["Count"] = 2_439
    sens1.llms["Mean query Wh"] = 3.0
    sens1.llms["Mean daily user queries"] = 40
    plot_stacked_emissions(
        run_model(sens1),
        "University-managed end-user devices and high ordinary-chat use",
        output_dir / "fig-sens1.png",
    )

    sens2 = default_state()
    for device, values in sens2.embodied.items():
        values["Mean"] = values["Min"]
    plot_stacked_emissions(
        run_model(sens2),
        "Low embodied-emissions assumptions",
        output_dir / "fig-sens2.png",
    )

    plot_agentic_heatmap(output_dir / "fig-agentic-ai.png")


def print_summary() -> None:
    for name, state in [
        ("baseline", default_state()),
        ("cloud", default_state()),
        ("sens1", default_state()),
        ("sens2", default_state()),
    ]:
        if name == "cloud":
            state.compute["Cloud % servers in cloud"] = 100
        elif name == "sens1":
            state.device_info["Laptops"]["Count"] = 10_440
            state.device_info["Mobile phones"]["Count"] = 2_439
            state.llms["Mean query Wh"] = 3.0
            state.llms["Mean daily user queries"] = 40
        elif name == "sens2":
            for values in state.embodied.values():
                values["Mean"] = values["Min"]
        rows = run_model(state)
        total = rows[-1]["usage"] + rows[-1]["embodied"]
        ordinary_ai = next(row for row in rows if row["category"] == "Ordinary chat AI")
        print(f"{name}: total={total:.0f} t CO2e, ordinary_chat={ordinary_ai['usage'] + ordinary_ai['embodied']:.0f} t")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=Path("."), help="Directory for generated figures.")
    parser.add_argument("--summary", action="store_true", help="Print scenario totals after generating figures.")
    args = parser.parse_args()
    generate_all(args.output_dir)
    if args.summary:
        print_summary()


if __name__ == "__main__":
    main()

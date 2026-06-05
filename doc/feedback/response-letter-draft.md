# Draft Response to Reviewers

We thank the reviewers for their detailed and constructive comments. The revision substantially expands methodological transparency, system-boundary coverage, sensitivity analysis, and policy recommendations. We also added a new analysis of agentic AI workloads, which became an important omission as coding and research agents gained adoption after the original draft.

## Reviewer 1

### 1. Methodological transparency and reproducibility

We added `supplement-parameters.md`, a complete parameter inventory listing defaults, units, sources or assumptions, and sensitivity ranges. The manuscript now explicitly refers to this supplementary material in the conclusion.

### 1.1 Network emissions

We replaced the unexplained 10% networking overhead with a bottom-up estimate based on approximately 4,000 access points. The revised manuscript estimates access-point electricity at roughly 526 MWh/year and treats the 10% overhead as a sensitivity parameter, varied from 0-20%, rather than as a fixed assumption.

### 1.2 AI query volume

We changed the AI treatment from a single query-volume assumption to a scenario framework. Ordinary chat is modeled with query/day and Wh/query parameters, while long/reasoning and agentic workflows are modeled separately. The revised sensitivity analysis reports thresholds for agentic AI adoption and energy intensity.

### 2.1 Application-level cloud services

We added Microsoft 365 / Google Workspace-style productivity SaaS as a preliminary boundary-completeness estimate. Because tenant-level vendor reports are not available to us, the manuscript uses a bounded per-user range and recommends replacing it with Microsoft or Google tenant carbon reports in future institutional inventories.

### 2.2 CSCS supercomputing

We replaced the previous weak CSCS treatment with the available allocation data: total CSCS compute electricity of approximately 60 GWh/year and estimated UZH allocation of approximately 3.6 GWh/year. The manuscript now includes operational emissions and bounded ranges for possible facility overhead and embodied server-equivalent emissions.

### 3. Generalizability and context specificity

We added regional sensitivity discussion for the Swiss baseline, EU-average electricity intensity, and high-carbon grids around 400 gCO2e/kWh. We also clarified that UZH's long device lifetimes make embodied emissions less dominant than under shorter refresh cycles, not more dominant.

### 4. Depth of policy recommendations

We rewrote the recommendations around concrete actions: procurement warranty and repairability requirements, repair/reuse programs, student and staff device-lifetime support, tenant-level SaaS reporting, CSCS allocation reporting, cloud-vendor due diligence, and AI procurement questions.

### 5. Cleaner Production framing

We now frame device lifetime extension as a cleaner IT consumption and circular-economy strategy, with supporting European Environment Agency references. We also added a short discussion of indirect AI effects and rebound risks while keeping the accounting boundary focused on direct electricity and lifecycle emissions.

### 6. Abstract

The abstract has been shortened and now states the paper's contribution and revised findings more directly.

### 7. Figures

The manuscript references the existing figures and now adds `fig-agentic-ai.png`, a heatmap of agentic-AI emissions by adoption share and kWh per active user-day. The final submission package should include all figure files.

### 8. Mobile phone charging

We replaced the earlier wording that phones draw no power when unplugged with a battery-capacity and charger-efficiency estimate. The model represents this as a 15 W charging load during an evening charging window.

### 9. Units

We added a `kt CO2e` macro and corrected the introduction's mistaken wording around kilotons/megatons. We also normalized several expressions such as `t CO2e/year`.

## Reviewer 2

### 1. Single-university generalizability

We cannot turn a single-university study into a multi-university empirical survey in this revision. Instead, the revised paper is clearer that UZH is the calibration case and adds regional/grid and refresh-cycle sensitivity analyses to show how conclusions change in other contexts.

### 2. Empirical support for assumptions

The revision adds a supplementary parameter table and expands source justification for network, SaaS, CSCS, phone charging, and AI assumptions. For AI, where campus measurement is unavailable, the paper now uses scenario ranges and adoption thresholds rather than a single point forecast.

### 3. Statistical validation and mechanistic interpretation

We expanded the sensitivity discussion to identify mechanisms: embodied emissions dominate when grid electricity is clean and device refresh cycles are short; operational emissions become more important with dirtier grids, supercomputing, SaaS, cloud, and agentic AI. The paper now distinguishes validation against the UZH sustainability report from broader uncertainty analysis.

### 4. Reference formatting

We added clearer bibliography entries for the new sources and preserved article/proceedings/report distinctions where possible. A final BibLaTeX compile should be checked in the full TeX environment.

## Author-Initiated Revision: Agentic AI

The original manuscript treated generative AI mostly as ordinary chatbot queries. This is no longer sufficient. The revision adds a separate analysis of agentic AI systems such as Codex, Claude Code, and research agents. The key revised conclusion is that ordinary chatbot use remains small in most scenarios, but agentic AI can become material if a modest fraction of users adopt high-intensity daily workflows.

# Supplementary Tables: Model Parameters and Review Scenarios

This supplement inventories the configurable defaults used by the UZH IT emissions model and the additional scenario parameters introduced for the JCP revision. Values are grouped by the model objects in `app/emissions-calculator.html`.

## Table S1. Device inventory and lifetimes

| Device | Count | Lifetime (y) | Days/year | Source / basis | Uncertainty treatment |
|---|---:|---:|---:|---|---|
| Laptops | 32,000 | 6 | 250 | UZH central IT count plus estimated student ownership | Count and lifetime varied in sensitivity scenarios |
| Monitors | 10,440 | 8 | 250 | UZH central IT inventory | Low uncertainty for centrally managed devices |
| Desktops | 0 | 8 | 250 | UZH central IT / rare campus use | Kept configurable for other campuses |
| Servers | 1,121 | 5 | 365 | UZH central IT inventory | Power and cloud-migration scenarios varied |
| Mobile phones | 35,000 | 3 | 250 | UZH central IT phones plus population estimate | Count and lifetime varied in sensitivity scenarios |
| A/V equipment | 431 | 8 | 250 | UZH central IT inventory | Proxy category for classroom/lecture equipment |
| Printers | 333 | 8 | 250 | UZH central IT inventory | Standby-power uncertainty dominates operation |

## Table S2. Embodied-emissions defaults

| Device | Mean kg CO2e | SD | Min | Max | Source / basis |
|---|---:|---:|---:|---:|---|
| Laptops | 180 | 128 | 104 | 372 | Ecoinvent, Rarecoil, Teehan and Kandlikar, UNCTAD |
| Monitors | 340 | 50 | 150 | 394 | Dell PCF, Loevehagen et al., Teehan and Kandlikar |
| Desktops | 290 | 80 | 209 | 403 | Dell PCF, Ecoinvent, Boavizta, UNCTAD |
| Servers | 1,100 | 330 | 383 | 1,582 | Davy/Teads EC2 dataset, Boavizta, Teehan and Kandlikar |
| Mobile phones | 50 | 10 | 30 | 70 | Apple, Google, UNCTAD, Loevehagen et al. |
| A/V equipment | 700 | 109 | 644 | 862 | Scaled display/monitor proxy |
| Printers | 1,100 | 200 | 967 | 1,367 | Ecoinvent printer/copier proxy |

## Table S3. Operational power defaults

| Device | Mean W | SD | Min | Max | Standby W | Source / basis |
|---|---:|---:|---:|---:|---:|---|
| Laptops | 50 | 20 | 20 | 100 | 1 | Manufacturer data sheets and conservative active-use default |
| Monitors | 50 | 10 | 30 | 90 | 1 | Manufacturer data sheets |
| Desktops | 100 | 20 | 60 | 200 | 1 | Manufacturer data sheets |
| Servers | 400 | 100 | 200 | 600 | 1 | UZH server-class proxy |
| Mobile phones | 10 | 2 | 5 | 20 | 0 | Battery-capacity and charger-efficiency charging estimate |
| A/V equipment | 250 | 50 | 150 | 350 | 1 | Lecture-room equipment proxy |
| Printers | 1,000 | 200 | 600 | 1,400 | 90 | Printer/copier active and standby estimates |

## Table S4. Six-hour duty-cycle defaults

Fractions apply to 0:00-5:59, 6:00-11:59, 12:00-17:59, and 18:00-23:59.

| Device | Night | Morning | Afternoon | Evening | Basis |
|---|---:|---:|---:|---:|---|
| Laptops | 0.1 | 0.5 | 1.0 | 0.3 | Weekday daytime use |
| Desktops | 0.1 | 0.5 | 1.0 | 0.3 | Weekday daytime use |
| Servers | 0.8 | 0.8 | 0.8 | 0.8 | Continuous operation below peak load |
| Mobile phones | 0.0 | 0.0 | 0.0 | 0.5 | Evening charging window |
| Monitors | 0.1 | 0.5 | 1.0 | 0.3 | Weekday daytime use |
| A/V equipment | 0.0 | 0.3 | 0.6 | 0.1 | Teaching-room schedule proxy |
| Printers | 0.0 | 0.0 | 0.01 | 0.0 | Short active-use window plus standby |

## Table S5. Compute, cloud, and supercomputing defaults

| Parameter | Default | Unit | Source / basis | Sensitivity range |
|---|---:|---|---|---|
| Campus networking overhead | 10 | % | Bottom-up AP estimate plus switching/router allowance | 0-20% |
| Campus data center PUE | 200 | x100 | UZH historical power estimate | 150-250 x100 |
| Cloud PUE | 115 | x100 | Microsoft/Google regional PUE disclosures | 109-156 x100 |
| Cloud servers in cloud | 0 | % | Scenario parameter | 0-100% |
| Cloud instances per 100 local servers | 100 | count | One-to-one replacement default | 50-200 |
| Cloud instance embodied emissions | 700 | kg CO2e | Boavizta Azure instance estimate, rounded | 500-1,500 kg |
| Cloud instance power | 300 | W | Boavizta/Azure instance estimate, rounded | 150-600 W |
| Cloud instance lifetime | 4 | years | Cloud server lifecycle proxy | 3-6 years |
| Supercomputing mean power | 66 | kW | Original CSCS estimate retained for legacy model compatibility | Replaced in revision by 3.6 GWh/year UZH allocation |

## Table S6. LLM and agentic-AI defaults

| Parameter | Default | Unit | Source / basis | Sensitivity range |
|---|---:|---|---|---|
| User population | 38,000 | users | UZH population | Fixed for UZH scenarios |
| Ordinary chat volume | 15 | queries/user/day | Scenario assumption | 5-40 queries/user/day |
| AI active days | 250 | days/year | Workday use | 200-365 days/year |
| Ordinary query energy | 1.0 | Wh/query | Conservative value above recent 0.3 Wh estimates | 0.3-3 Wh/query |
| Training overhead | 25 | % | Conservative inference/training allocation | 0-100% |
| AI electricity intensity | 207 | g CO2e/kWh | EU electricity generation intensity | 50-400 g CO2e/kWh |
| Embodied emissions | 0.1 | g CO2e/query | Conservative GPU/server allocation default | 0.01-0.1 g/query |
| Annual usage growth | 50 | % | Aggressive growth scenario | 0-100% |
| Annual efficiency growth | 30 | % | Hardware/software improvement scenario | 0-50% |
| Annual training growth | 50 | % | Frontier-model training growth scenario | 0-100% |
| Long/reasoning task energy | 10-50 | Wh/task | Jegham et al., IEA/Ritchie synthesis | Scenario range |
| Agentic AI adoption | 1-20 | % of users | No campus survey; threshold scenario | Scenario range |
| Agentic AI intensity | 0.1-2.4 | kWh/active user-day | IEA/Ritchie and Claude Code case study | Scenario range |

## Table S7. Added boundary-completeness scenarios

| Category | Central value | Range | Basis | Notes |
|---|---:|---:|---|---|
| Productivity SaaS | 114 t CO2e/year | 38-380 t CO2e/year | 38,000 users times 3 kg CO2e/user/year, varied 1-10 | Replace with Microsoft 365 or Google Workspace tenant report when available |
| CSCS operational electricity | 180 t CO2e/year | Depends on grid factor | 3.6 GWh/year UZH allocation at ~50 g CO2e/kWh | Based on CSCS contact data |
| CSCS facility overhead | 18-54 t CO2e/year | PUE 1.1-1.3 if allocation excludes overhead | Conservative PUE sensitivity | Avoid if allocation already includes facility electricity |
| CSCS embodied emissions | 50-250 t CO2e/year | Broad server-equivalent range | Allocated-power estimate with uncertain node mix | Replace with node/accelerator inventory when available |
| Agentic AI example A | 160 t CO2e/year | 5% users, 1.3 kWh/day | Claude Code heavy-use case study | Includes 25% training overhead |
| Agentic AI example B | 590 t CO2e/year | 10% users, 2.4 kWh/day | IEA/Ritchie heavy-agent example | Includes 25% training overhead |

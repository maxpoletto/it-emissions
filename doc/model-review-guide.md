# Review guide for the shared emissions model

All four implementation stages are on branch `v2`, following `2a07073`.
The calculator and all six paper figures now use the same JavaScript model and
Chart.js definitions. The distributed HTML works offline from disk. No push or
publication is part of this change.

## Commit order

Use `git log --reverse --oneline 2a07073..v2` for the complete sequence. Commit
`3fac775` adds this guide and the implementation status in the plan; the final
packaging commit preserves the repository's original ignore patterns.

| Stage | Commit | Review focus |
| --- | --- | --- |
| 1 | `9b3edd3` | Extract the original model and charts, preserve numerical fixtures, bundle the offline app, add Node PNG/JSON export |
| 2 | `980af2d` | Deterministic input bounds and coherent whole-model envelopes |
| 2 | `4b44aed` | Shared whiskers, asymmetric ranges, axis limits and saved range inputs |
| 3 SaaS | `816bfec` | Separate per-user service factor and input region; preserve old configuration scope |
| 3 Cloud | `a10b375` | Independent serving-region intensity, PUE, instance conversion and hardware inputs |
| 3 Local | `963bfa2` | Campus electricity profile, server energy boundary and local PUE |
| 3 Networking | `67a1ef1` | Inventory/power calculation, replacing the percentage allowance in new defaults |
| 3 CSCS | `ff13076` | Electricity allocation, PUE and calculated server-equivalent hardware |
| 3 AI | `d17f44e` | Separate chat/agent activity, energy boundaries, training and hardware components |
| 4 Baseline | `b5271de` | Saved full paper configuration, shared rendering and assumption whiskers |
| 4 Cloud | `2dbee22` | Cloud figure and paired intervention savings |
| 4 Chat growth | `c85b030` | Five-year chat-only scenario with separate training/hardware stacks |
| 4 Managed devices | `6ac7778` | University device counts plus high chat activity |
| 4 Low footprints | `4f4fc54` | Explicit minimum device-footprint scenario |
| 4 Agents | `13ddb40` | Adoption curves with cloud and device-lifetime savings benchmarks |
| Integration | `dd73d20` | Remove both Python generators; generate TeX numbers, preserve provenance and check PNG integrity |
| Interface | `3b56a49` | Keep summaries after selector changes; remove unused standby input; compare browser/paper scenarios |
| Manuscript | `1c052ca` | Reconcile numerical claims, PUE boundaries, NVIDIA wording and appendix; qualify unreproduced validation |
| Coverage | `9560fe9` | Prevent plotting order from discarding a nonzero category |
| Layout | `b677919` | Keep figures in Results, improve line/URL wrapping and current-default tables |
| Build | `2d2068f` | Mark a successful PDF check current when latexmk skips identical regenerated figures |
| Packaging | after `3fac775` | Preserve ignored local files and older build artifacts |

The manuscript reconciliation is isolated in `1c052ca`; individual figure
captions are in their figure commits. The model commits can be reviewed before
the prose changes.

## Numerical changes

These are central scenarios, not measurements of current AI adoption. Compared
with the former Python paper generator at `2a07073`:

| Quantity | Previous generator, t CO₂e/year | Shared model, t CO₂e/year | Reason |
| --- | ---: | ---: | --- |
| Networking | 115.0 | 114.8 | Calculate the inventory without rounding components first |
| CSCS | 366.0 | 291.3 | Hardware is now calculated: 75.3 instead of a fixed 150; operation remains 216 |
| Agents, 10% at 1.3 IT kWh/day | 443.1 | 507.0 | PUE 1.2 now applies to compute-only inference and its training allocation |
| Ordinary chat | 51.1 | 51.1 | Energy and 0.1 g/query hardware defaults retained |
| Broad total | 4,164.8 | 4,153.9 | CSCS reduction and agent increase partly offset |

The CSCS central server-equivalent power is **1.2 kW**, the midpoint of the
declared 0.4–2.0 kW input range. Annual hardware emissions vary inversely with
power, so the output at 1.2 kW is not the midpoint of the hardware-emissions
range. This central assumption deserves review; it is not new CSCS evidence.
The 3.6 GWh allocation is still treated as compute-only under the author's
working assumption.

The previous *app* had a narrower default scope than the previous paper
generator. Its 3,223.2 t/year becomes 4,153.9 t/year with SaaS (+209.0), the
revised CSCS allocation and hardware (+260.3), illustrative agents (+507.0), and
inventory networking replacing the percentage proxy (−45.5). Original saved
configurations retain their old scope through compatibility mode, and the four
original regression scenarios still match. That mode also retains the original
combined training/hardware allocation bucket; new configurations separate it.

The shared broad scenario has a **3,411.4–5,135.2 t/year assumption envelope**.
It covers only the declared network, SaaS, CSCS and AI bounds. Device population,
mean device footprints, CSCS allocation uncertainty and actual AI adoption are
not included in that envelope.

Other reconciled claims:

- Cloud migration saves **206.2 t/year**, from **4.15 to 3.95 kt/year**. Campus
  networking persists after migration. Uncertainty in unchanged services cancels
  in the paired comparison.
- Extending laptop/phone lives from **4/3 to 6/4 years** saves **625.8 t/year**,
  from **4.63 to 4.01 kt/year**, or **13.5%** with the broad boundary fixed.
- Laptop embodied emissions are **80.8%** of their total. End-user embodied
  emissions are **49.8%** of the broad footprint. In the low-device-footprint
  scenario, total embodied hardware is **48.9%**, so the old blanket dominance
  claim was reduced.
- Central chat emissions reach **145.3 t/year in 2030**. The initial query-energy
  bounds produce **94.1–291.7 t/year** in that year; the growth rates themselves
  are fixed, not forecast intervals.
- Agent cases at 5%/1.3, 10%/1.3 and 10%/2.4 IT kWh/day are **253.5, 507.0 and
  935.9 t/year**. The new adoption figure compares these energy cases with
  intervention savings, rather than plotting a contour of two multiplied inputs.

The NVIDIA paragraph now identifies 1,312 kg as the eight-GPU HGX baseboard
footprint and allocates the author's 2,000 kg *whole-server* estimate over eight
GPUs. The **0.1 g/query default is unchanged**. The agent hardware allowance
remains an explicit conservative scenario, rather than being described as a
measurement derived from that baseboard number.

## Inputs and generated files

Edit calculations in [src/model.js](../src/model.js), environment defaults and
field definitions in [src/environments.js](../src/environments.js), and shared
chart definitions in [src/charts.js](../src/charts.js). Browser code and the HTML
template contain presentation and interaction code. Rebuild the distributed
[calculator](../app/uzh/index.html) after changing its sources.

The [paper baseline](scenarios/baseline.json) freezes a full input configuration;
other [scenarios](scenarios/README.md) extend it with explicit overrides. Changing
app defaults alone does not change the paper. Regeneration writes PNGs and
[numerical records](figure-data/baseline.json) with resolved inputs, units,
reference year, model version, range definitions, source hashes and image hashes.
[model-results.tex](model-results.tex) provides the manuscript's generated
numerical macros; edit scenarios and regenerate rather than editing that file.

`npm run batch -- --config doc/figure-data/baseline.json --output output/check`
replays the paper's resolved configuration through the generic batch runner.
The five-year projection covers ordinary chat only. Chat and agent cohorts may
overlap, but agent-generated calls must not also enter the chat allowance.

## Checks and remaining assumptions

To reproduce the checks, use Node 22 or newer and the pinned dependencies. This
run used Node 26:

```sh
npm ci
npm run build
npm test
npm run test:browser
npm run figures -- --check
make -C doc paper.pdf
```

There are **49 passing Node tests**, plus the offline Chrome integration test.
Checks cover the original calculator fixtures, energy boundaries, PUE applied
once, separate grid factors, lifetime inversion, shared dependencies in ranges
and savings, PNG rendering/integrity, saved configuration round trips, and exact
browser/Node agreement for four paper scenarios. The paper compiles with Biber;
the final TeX log has no overfull boxes or unresolved citations. All six figures,
the updated tables, and reference wrapping were visually inspected. A repeated
`make -C doc paper.pdf` reports the target current, including the case where a
dependency changes timestamp but not content.

The [historical report comparison](scenarios/report-comparison.json) is explicitly
incomplete. The report comparator is recorded as **1,454 + 81 = 1,535 t/year**,
but the exact Ecoinvent configuration behind the historical approximately
1,600 t/year model result has not been recovered. The loader refuses to run this
preset with modern defaults substituted. The paper no longer claims reproducible
numerical validation from that result.

Separate standby draw was never used by the calculator. Its ineffective input
was removed, and the omission is now stated in the app and paper, particularly
for printers. Numerical device calculations remain unchanged. Source SD/min/max
values remain reference metadata in configurations; they are not automatically
propagated as population uncertainty. Additional parameter bounds can be declared
through `rangeInputs` in a configuration, up to 12 bounded inputs per analysis.

SaaS remains a composite per-user placeholder. CSCS hardware and agent use remain
proxies with declared assumptions. No additional institutional measurements were
introduced, and the work does not resolve those data limitations.

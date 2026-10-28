# Reproducible paper scenarios

`baseline.json` freezes the paper's central inputs. Its values currently match
the new calculator defaults. Other scenarios extend it with explicit overrides;
the resolved configuration is saved with each figure in `../figure-data/`.
Changing application defaults does not silently change the paper configuration.

Run `npm run figures` from the repository root to regenerate all six figures,
their numerical records, and `../model-results.tex`. The latter provides macros
for numerical claims in the manuscript. `npm run figures -- --check` checks
records, source hashes, PNG hashes and dimensions, and the generated TeX numbers.
Use `--figure baseline` (or another figure name) for a single figure. Run the full
command after changing inputs that also affect manuscript numbers.

Whiskers are endpoint envelopes of declared assumptions. Network electricity,
SaaS factors, CSCS PUE/server-equivalent power, and AI energy/hardware allowances
have explicit bounds. Device SD/min/max reference values do not automatically
become uncertainty in a population mean. Adoption scenarios and the low-device
footprint sensitivity are separate from these bounds. The agent figure varies
daily IT energy at fixed hardware, PUE and grid assumptions; its three curves
are not confidence bounds.

`lifecycle-before.json` and `lifecycle-after.json` define the paired device-life
intervention. `sens-combined.json` supplies the combined sensitivity discussed in
the text. Cloud and lifecycle savings use matched assumptions, so uncertainty in
unchanged services cancels.

`report-comparison.json` records the unresolved historical validation inputs and
the author's corrected report comparator (1,454 + 81 = 1,535 t/year). It is
deliberately incomplete and the loader refuses to run it. Recovering the exact
Ecoinvent configuration is necessary before presenting the approximately
1,600 t/year historical model estimate as reproducible validation. The managed
device sensitivity figure is not a substitute for that configuration.

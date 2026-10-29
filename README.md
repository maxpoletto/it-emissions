A simple model to estimate and forecast IT- and AI-related emissions at the University of Zürich (UZH).

Although many of the default parameter values are specific to UZH, the model should be applicable to other universities (and possibly large corporate campuses).

See doc/paper.tex for a detailed description of methodology and analysis of results.

Development requires Node.js 22 or newer. Install the pinned dependencies with
`npm ci`, then run `npm run build`. Edit the files in `src/` and the HTML template
in `app/`; `app/emissions-calculator.html` is the generated, standalone app and
works directly from disk without a server or network connection.

Both websites use one model and HTML template. Select their presentation with
`--deployment-environment`:

| Environment | Default output | Presentation |
| --- | --- | --- |
| `uzh` (default) | `app/emissions-calculator.html` | No duplicate page heading, zero outer vertical margin, scoped CMS table overrides |
| `maxp` | `output/maxp/emissions-calculator.html` | UZH logo and calculator title, 20 px outer vertical margin, explicit link styles |

```sh
npm run build -- --deployment-environment uzh
npm run build -- --deployment-environment maxp
npm run build -- --deployment-environment maxp --check
```

The personal-site output is ignored by Git and does not replace the tracked UZH
artifact. Both outputs embed styles, fonts and Chart.js; the personal-site logo
is embedded too. Deployment flags select presentation only: application code,
model defaults, saved configurations and calculations are identical.

Use `--output path/to/index.html` to select another output file, and repeat that
path with `--check` to verify it. For example:

```sh
npm run build -- --deployment-environment maxp --output output/maxp/index.html
```

The equivalent Make command is
`make -C app build DEPLOYMENT_ENVIRONMENT=maxp` (or `uzh`). Use
`make -C app all DEPLOYMENT_ENVIRONMENT=maxp` to also point `app/index.html` at
the personal-site output; `uzh` points it at the UZH output. The link is refreshed
on every `all` build, so switching environments needs no clean step. Edit shared markup in
`app/calculator.template.html` and site-specific styles/header markup in
`app/deployments/`. `npm test` checks the tracked UZH artifact, and the browser
tests exercise both environments offline, including simulated UZH CMS overrides.

`npm run batch -- --config scenario.json --output output/example --year 2026`
generates annual and projection charts plus the exact parameters and results.
The configuration can be a JSON export from the interactive app or a partial
configuration overriding defaults. With no configuration file, the batch runner
uses the current defaults. Its reference year is explicitly 2026 unless changed.

Run `npm test` for numerical regression, build, and Node chart-rendering checks.
Run `npm run test:browser` for an offline browser integration check. The browser
test uses Chrome on macOS, `BROWSER_EXECUTABLE` when set, or Playwright's Chromium
(`npx playwright install chromium`) on other systems. The tests capture the
original calculator's deterministic results from commit `2a07073`; those
fixtures deliberately preserve its original scope and assumptions.

Shared calculations are in `src/model.js`, device defaults in `src/defaults.js`,
environment defaults and field definitions in `src/environments.js`, chart
definitions in `src/charts.js`, and browser interactions in `src/browser.js`.
`npm run figures` generates the migrated paper figures. Each has a versioned
scenario in `doc/scenarios/` and a numerical record in `doc/figure-data/` containing
the resolved inputs, units, model version, source hashes, results and bounds.
Use `npm run figures -- --figure baseline` to regenerate one figure, or `--check`
to check numerical records, input and image hashes, image dimensions, and generated
manuscript numbers. All six paper figures now use this pipeline; the separate
Python implementations have been removed. See `doc/scenarios/README.md` for the
scenario inheritance and the incomplete historical sustainability-report comparison.

Configurations can declare `rangeInputs`, an array of objects containing a
`path` array, numerical `low` and `high` bounds, and a `source` description.
The calculator evaluates all declared endpoint combinations (up to 12 inputs),
preserving shared dependencies. Exported ranges are deterministic assumption
envelopes, not confidence intervals. Whiskers describe complete category totals;
categories without quantified bounds have no whisker. Hiding one stack component
also hides its total whisker. Default environment bounds and their source
descriptions are in `src/environments.js`; no statistical distribution is inferred
from device populations.

New configurations include productivity SaaS at 38,000 users and 5.5 kg
CO₂e/user-year (209 t/year), with a declared 1–10 kg/user-year range. Imported
version 1 configurations retain the original service scope; new components are
disabled unless explicitly enabled. Configuration exports retain that
compatibility setting so old saved scenarios do not silently acquire new services.

Hosted AI separates ordinary chat from agent workloads. The illustrative default
uses 38,000 chat users and 3,800 agent users; these are scenarios, not measured
adoption. Groups may overlap. Chat energy defaults to a facility-wide Wh/query
estimate; agent energy defaults to IT kWh/user-day, with PUE applied once. Hardware
and training allocations remain separate. The five-year projection covers ordinary
chat only. See the input labels and exported parameters for each energy boundary.

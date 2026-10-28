A simple model to estimate and forecast IT- and AI-related emissions at the University of Zürich (UZH).

Although many of the default parameter values are specific to UZH, the model should be applicable to other universities (and possibly large corporate campuses).

See doc/paper.tex for a detailed description of methodology and analysis of results.

Development requires Node.js 22 or newer. Install the pinned dependencies with
`npm ci`, then run `npm run build`. Edit the files in `src/` and the HTML template
in `app/`; `app/emissions-calculator.html` is the generated, standalone app and
works directly from disk without a server or network connection.

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

Shared calculations are in `src/model.js`, defaults in `src/defaults.js`, chart
definitions in `src/charts.js`, and browser interactions in `src/browser.js`.
The paper generation pipeline is migrated in the final stage of the development
plan in `doc/model-development-plan.md`.

Configurations can declare `rangeInputs`, an array of objects containing a
`path` array, numerical `low` and `high` bounds, and a `source` description.
The calculator evaluates all declared endpoint combinations (up to 12 inputs),
preserving shared dependencies. Exported ranges are deterministic assumption
envelopes, not confidence intervals. Whiskers describe complete category totals;
categories without quantified bounds have no whisker. Hiding one stack component
also hides its total whisker. Defaults gain ranges as their environments are
introduced; no statistical distribution is inferred from device populations.

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

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

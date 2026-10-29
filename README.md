A simple model to estimate and forecast IT- and AI-related emissions at the University of Zürich (UZH).

Although many of the default parameter values are specific to UZH, the model should be applicable to other universities (and possibly large corporate campuses).

See doc/paper.tex for a detailed description of methodology and analysis of results.

Development requires Node.js 22 or newer. Run `npm ci` to install the pinned local
dependencies, then `npm run build` to generate both websites. Esbuild is already
declared in `package.json`; no global or separate esbuild installation is needed.
The version-specific `allowScripts` entry approves its installation script for
npm versions that support this setting. Keep that entry aligned with the pinned
esbuild version when upgrading.

All source files are in `src/`: the JavaScript model, HTML template, deployment
styles, logos and other assets. `app/` contains only generated output and is
ignored by Git. Each deployment is a self-contained HTML file that opens from
disk without a server or network connection:

| Environment | Default output | Presentation |
| --- | --- | --- |
| `uzh` | `app/uzh/index.html` | No duplicate page heading, zero outer vertical margin, scoped CMS table overrides |
| `maxp` | `app/maxp/index.html` | UZH logo and calculator title, 20 px outer vertical margin, explicit link styles |

```sh
npm run build
npm run build -- --deployment-environment uzh
npm run build -- --deployment-environment maxp
npm run build -- --check
```

With no environment flag (or `--deployment-environment all`), the build produces
both directories. Selecting one environment leaves the other output intact.
Both outputs embed styles, fonts and Chart.js; the personal-site logo is embedded
too. Deployment flags select presentation only: application code, model defaults,
saved configurations and calculations are identical. Deploy either directory as
it stands; its `index.html` is an ordinary file and needs no external assets.

Each input panel has a folding toggle (▼ open, ◀ closed). All panels start open
except Device Duty Cycles. Bookmarked URLs preserve the fold states; Reset
Parameters restores the default layout. Folding does not change calculations or
exported model parameters.

`src/assets/css/main.css` contains the UZH rules used by the calculator: resets,
brand colors, typography, controls and CMS content styles. Unrelated site
navigation, carousel and gallery styles are excluded. All four original Source
Sans font faces are embedded as WOFF2, with no duplicated WOFF fallbacks or font
subsetting. Keep this CSS subset in step with new interface elements and states.

Use `--output path/to/index.html` with a single environment to select another
output file, and repeat both options with `--check` to verify it. For example:

```sh
npm run build -- --deployment-environment maxp --output output/preview/index.html
```

The equivalent Make commands are `make app` for both environments and
`make app DEPLOYMENT_ENVIRONMENT=maxp` (or `uzh`) for one. The application Makefile
lives in `src/`; `make -C src clean` removes the generated `app/` directory.
Edit shared markup in `src/calculator.template.html` and site-specific styles and
header markup in `src/deployments/`. Tests build their own outputs and work in a
fresh checkout after `npm ci`, even before a normal build. Browser tests exercise
both environments offline, including simulated UZH CMS overrides.

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

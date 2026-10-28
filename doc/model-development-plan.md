# Shared emissions model and chart generation plan

Use one JavaScript calculation model and one shared chart implementation for the interactive calculator and the paper figures. Preserve the ability to open the distributed calculator as a standalone HTML file, without a web server.

The immediate purpose is the UZH administration report, using the information already available. The later journal framework and collection of additional institutional data are separate work.

Implementation follows the stages below. On 28 October 2026 the author authorized proceeding through all four stages on branch v2 without waiting for review. Keep each stage, environment change, and paper figure in small ordered commits with relevant tests and numerical explanations. The author will review the commits afterward. Push, publication, and journal submission remain outside this request.

## Shared calculations and charts

Separate the calculation model from the browser interface. The model accepts an explicit configuration and returns calculated results without accessing the page, drawing charts, or reading the current date. Defaults, units, and model assumptions have one authoritative definition.

Use the same model in the browser and in a Node batch runner. A build step bundles the model, interface, chart library, and default configuration into the distributed HTML. The build tools are required by maintainers; readers continue to open the HTML directly. Bundle chart assets as well if the distributed file is to work without an internet connection.

Use Chart.js for both interactive charts and batch image generation. Share chart configuration functions, colors, component ordering, labels, and the range-drawing plugin. Allow explicit differences in dimensions, font sizes, and interactive controls between screen and paper output. Pin the chart-library version and use consistent fonts.

Chart.js supports Node rendering through a canvas implementation such as skia-canvas. Generate paper images at a specified size and resolution, with animation disabled. The eventual paper pipeline can therefore use JavaScript throughout.

Batch output should include the figures and a machine-readable record of the input configuration, model version, reference year, calculated components, units, and range definitions. A figure should be reproducible from its saved configuration. The sustainability-report comparison should become a named configuration once its inputs are settled.

## Central estimates and assumption ranges

Put central assumptions and defensible bounds on model inputs, then calculate the resulting emissions. A central estimate is not necessarily the arithmetic midpoint of the output range, particularly when lifetimes or other nonlinear relationships are involved.

Show central stacked bars with whiskers indicating the range of each category's combined total. Label these as assumption ranges, not confidence intervals or standard deviations. Keep operational electricity, training allocations, and embodied hardware separate in the model, even if some figures combine components.

Ranges should record which inputs vary, which remain fixed, and the basis for their bounds. A missing range means that uncertainty has not been quantified. Variation among individual device footprints does not automatically define uncertainty in the average footprint of an entire device population.

Calculate bounds using the relationships in the model. For example, a shorter lifetime increases annual embodied emissions, so setting every input to its numerical minimum does not necessarily produce the lowest output. Preserve shared dependencies when calculating totals. Evaluate baseline and intervention cases with matched assumptions when estimating savings.

Keep uncertainty at a fixed activity level distinct from scenarios about future adoption. Low, central, and high deterministic cases are sufficient for the internal report; probability distributions need not be invented.

## Parameters for compute environments

Give local data centers, supercomputing, cloud compute, and hosted AI separate environment settings. For an input measured as IT electricity:

Operational emissions = IT electricity × PUE × electricity emissions intensity.

PUE accounts for facility electricity overhead and applies once. It does not multiply embodied hardware emissions. Record whether an electricity input covers IT equipment alone or already includes facility overhead. A separate cooling row must not add overhead a second time.

| Environment | Activity or electricity input | PUE treatment | Electricity emissions intensity |
| --- | --- | --- | --- |
| Local data center | Electricity derived from local server power and duty cycle | Local PUE | Local grid profile |
| Supercomputing | Allocated compute electricity | Supercomputing PUE | Separate factor, initially Swiss |
| Cloud compute | Electricity derived from allocated cloud workloads | Cloud PUE | User-selected region or factor |
| Hosted AI | Electricity derived from chat and agent workloads | Apply when the source input excludes facility overhead | Separate AI factor |
| Productivity SaaS | Currently an emissions factor per user-year | Implicit in the composite factor | Implicit in the composite factor |

Local and supercomputing defaults can use the same Swiss electricity data while remaining separately configurable. Cloud electricity intensity must be independent of the local grid. Hosted AI and SaaS should not be forced to share a factor simply because the university has limited control over both.

Treat the CSCS allocation of 3.6 GWh/year as compute-only, following the author's assessment, and record that working assumption. With the current paper assumptions of PUE 1.2 and 50 g CO₂e/kWh, the model should calculate 216 t CO₂e/year of operational emissions. The existing PUE range is 1.1–1.3. Hardware emissions remain a separate calculation or explicit proxy. Bounds on PUE and hardware do not quantify uncertainty in the 3.6 GWh allocation itself.

For productivity SaaS, retain an explicit emissions-per-user factor while that is the available evidence. For example, the current 1–10 kg CO₂e/user-year assumption produces 38–380 t/year for 38,000 users, with 209 t/year at 5.5 kg/user-year. A separate PUE or grid control is not meaningful for this composite factor. Those controls become relevant if SaaS is later modeled from electricity consumption.

## Chat and agent workloads

Represent ordinary chat and agents as separately configurable activities.

| Activity | Main inputs |
| --- | --- |
| Ordinary chat | Active users, queries per user-day, active days per year, Wh per query |
| Agents | Active users, active days per year, kWh per active user-day |

Annual chat electricity in kWh = users × queries per user-day × active days × Wh per query ÷ 1,000.

Annual agent electricity in kWh = users × active days × kWh per active user-day.

Use “agent energy per day” for a quantity in kWh/day. Apply the appropriate environment settings, training allocation, and hardware allocation to each activity. Retain the current AI assumptions during the initial migration; changes to AI methodology require their own review.

The two user groups may overlap. Agent-generated model calls belong in the agent workload allowance and should not also be counted as ordinary chat. AI electricity already included in local-server or CSCS totals should not be added again as an external workload.

Give AI its own input region and show chat emissions, agent emissions, total AI emissions, and the resulting total IT footprint. Give SaaS, cloud compute, local data centers, and supercomputing distinct input regions as those components are introduced.

## Paper chart choices

Defer the final AI paper figure until the shared model supports the relevant comparisons. The current contour plot mainly visualizes the product of adoption and energy per user-day.

A candidate replacement is a curve of annual emissions against agent adoption, with separate low, central, and high energy assumptions. A reference line could show annual savings from device-lifetime extension or cloud migration. The curves remain linear, but the comparison answers an institutional planning question.

Another candidate is a small set of explicitly defined chat and agent scenarios shown as contribution bars with assumption ranges. Neither chart should imply measured UZH adoption.

## Implementation sequence

### Step 1 Support batch use of the current app

Extract the existing JavaScript calculations and chart definitions so the browser and a Node runner can use them. Add batch input and image export while retaining the current app's formulas, defaults, results, and user interactions.

Capture results before restructuring. Check representative configurations such as the current default, cloud migration, a device-lifetime change, and zero AI use. Check that the browser and batch runner calculate the same results for identical inputs and that the first projection year matches the annual AI calculation.

Verify that the distributed HTML still opens directly and that batch charts render with the shared styling. Record existing model issues separately from the restructuring.

The paper generator remains in service at this stage. Batch charts demonstrate the current app; they do not yet replace paper figures.

Commit this stage separately before step 2.

### Step 2 Support plotting assumption ranges

Add a common representation for central results and bounds, then implement range calculation and whisker rendering in the shared chart code.

Check asymmetric ranges, totals with multiple components, zero-width ranges, and missing ranges. Confirm that chart axes include the upper bounds. Demonstrate that whiskers describe category totals and that captions identify the assumptions varied.

This stage establishes the capability and its meaning. Environment-specific bounds are added or revised with the relevant environment in step 3.

Commit the internal range representation and graphical rendering separately before step 3.

### Step 3 Improve one environment at a time

Treat each item as a separate commit for later review:

1. Productivity SaaS: add a distinct region, population and per-user emissions inputs, and the declared range.
2. Cloud compute: separate its electricity intensity from the local grid and retain explicit workload conversion, PUE, and hardware assumptions.
3. Local data center: make server electricity, facility overhead, local grid data, and hardware accounting explicit in its region.
4. Supercomputing: add a distinct region for the CSCS allocation, compute-only energy basis, PUE, electricity intensity, and hardware assumptions.
5. Hosted AI: separate chat and agent activity, expose their relevant energy assumptions, and retain distinct operational, training, and hardware results.

Each review should show the effect on annual results and ranges. Keep changes to default assumptions visible and distinguish them from changes to formulas or interface layout.

### Step 4 Generate paper figures from the shared app model

Define saved configurations for every paper figure and the sustainability-report comparison. Generate figures and their numerical records through the shared model and chart implementation, and update the paper build dependencies.

Compare each replacement figure with the intended manuscript scenario. Explain numerical differences caused by corrected boundaries or assumptions. Check units, category coverage, colors, range captions, axis limits, and image resolution.

Remove the duplicated Python calculation and plotting pipeline once the JavaScript replacements have been checked. Reconcile figure values and claims in the paper using the saved results.

Commit each figure separately. Finish with a review guide and validation results; do not push or submit.

## Implementation status on 28 October 2026

Steps 1–4 are implemented on branch `v2`, with separate commits for the original
extraction, range representation and rendering, each environment, and each of the
six figures. The Python generators have been replaced by the shared JavaScript
pipeline. See [the review guide](model-review-guide.md) for the ordered commits,
numerical changes, test commands, and remaining assumptions.

The historical sustainability-report configuration remains incomplete because
its exact Ecoinvent inputs have not been recovered. It is recorded explicitly
and cannot silently run with replacement defaults. All current paper figures
and generated model results have saved, reproducible scenarios.

## Technical references

- [Chart.js rendering in Node](https://www.chartjs.org/docs/latest/getting-started/using-from-node-js.html)
- [Chart.js image resolution](https://www.chartjs.org/docs/latest/configuration/device-pixel-ratio.html)
- [Chart.js plugin hooks](https://www.chartjs.org/docs/latest/developers/plugins.html)
- [Browser module loading and local files](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

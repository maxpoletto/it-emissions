import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {merge, report, calculate, createConfig} from '../src/model.js';
import {environmentRanges} from '../src/environments.js';
import {compareRanges} from '../src/ranges.js';
import {emissionsChart, projectionChart} from '../src/charts.js';
import {renderChart} from './render.js';

const root = fileURLToPath(new URL('../', import.meta.url));
export const FIGURES = ['baseline', 'cloud', 'llm-growth', 'sens1'];
const TITLES = {baseline: 'UZH IT emissions — illustrative baseline', cloud: 'All local servers migrated to cloud',
    sens1: 'Managed-device counts and high ordinary-chat use'};
const ORDER = ['Mobile phones', 'Laptops', 'Monitors', 'Campus networking', 'A/V equipment',
    'Printers', 'Servers', 'DC cooling', 'Supercomputing', 'Cloud', 'Productivity SaaS', 'AI (chatbot)', 'AI (agents)'];
const LABELS = {'Campus networking': 'Networking', 'Productivity SaaS': 'SaaS', 'Supercomputing': 'CSCS'};

export async function loadScenario(name, seen = []) {
    if (!/^[a-z0-9-]+$/.test(name) || seen.includes(name)) throw new Error('Invalid or cyclic paper scenario: ' + name);
    const filename = `doc/scenarios/${name}.json`;
    const bytes = await readFile(path.join(root, filename));
    const scenario = JSON.parse(bytes);
    if (scenario.schemaVersion !== 1) throw new Error('Unsupported paper scenario schema');
    const parent = scenario.extends ? await loadScenario(scenario.extends, [...seen, name]) : {configuration: {}, sources: []};
    return {...scenario, configuration: merge(parent.configuration, scenario.configuration ?? scenario.overrides ?? {}),
        sources: [...parent.sources, {path: filename, sha256: createHash('sha256').update(bytes).digest('hex')}]};
}

// Only presentation differs from the browser: calculation, components, colors
// and range drawing all come from the shared modules.
function paperPresentation(chart) {
    const options = chart.options;
    options.font = {family: 'Arial, sans-serif', size: 28};
    options.plugins.title.font = {size: 32};
    options.plugins.legend.labels = {font: {size: 26}, padding: 18};
    if (options.plugins.subtitle) options.plugins.subtitle.font = {size: 21};
    for (const axis of Object.values(options.scales)) {
        axis.ticks = {...axis.ticks, font: {size: 25}};
        axis.title = {...axis.title, font: {size: 27}};
    }
    return chart;
}

export function interventionComparison(configuration, change) {
    const base = createConfig(configuration);
    return {baselineTotal: report(base).results.summary.totalCombined,
        savings: compareRanges(base, change, calculate, merge, [...environmentRanges(base), ...base.rangeInputs]),
        units: 'kg CO2e/year', method: 'Paired whole-model evaluations with shared assumptions'};
}

export async function prepareFigure(name) {
    if (!FIGURES.includes(name)) throw new Error('Unknown paper figure: ' + name);
    const scenario = await loadScenario(name);
    const results = report(scenario.configuration);
    const record = {figure: {name, description: scenario.description, sources: scenario.sources,
        image: `fig-${name}.png`, dimensions: {width: 1600, height: 900}}, ...results};
    if (name === 'cloud') record.comparison = interventionComparison((await loadScenario('baseline')).configuration, scenario.overrides);
    const chart = scenario.kind === 'chatProjection' ? projectionChart(results.results.projection, {divisor: 1000})
        : emissionsChart(results.results.data, {divisor: 1000, order: ORDER, labels: LABELS,
        title: TITLES[name]});
    return {record, chart: paperPresentation(chart)};
}

export async function generateFigure(name, outputDirectory = path.join(root, 'doc'), {check = false} = {}) {
    const {record, chart} = await prepareFigure(name);
    const json = JSON.stringify(record, null, 2) + '\n';
    const dataFile = path.join(outputDirectory, 'figure-data', name + '.json');
    if (check) {
        if (await readFile(dataFile, 'utf8') !== json) throw new Error('Stale figure data: ' + dataFile);
    } else {
        await mkdir(path.dirname(dataFile), {recursive: true});
        await renderChart(chart, path.join(outputDirectory, record.figure.image), record.figure.dimensions);
        await writeFile(dataFile, json);
    }
    return record;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const {values} = parseArgs({options: {figure: {type: 'string'}, output: {type: 'string'}, check: {type: 'boolean'}}});
    for (const name of values.figure ? [values.figure] : FIGURES) {
        const result = await generateFigure(name, values.output, {check: values.check});
        console.log(`${name}: ${(result.results.summary.totalCombined / 1000).toFixed(3)} t CO2e/year`);
    }
}

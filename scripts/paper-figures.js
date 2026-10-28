import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {merge, report, calculate} from '../src/model.js';
import {loadScenario, interventionComparison} from './scenarios.js';
import {generatePaperResults} from './paper-results.js';
import {emissionsChart, projectionChart, agentAdoptionChart} from '../src/charts.js';
import {rowTotal} from '../src/components.js';
import {renderChart} from './render.js';

const root = fileURLToPath(new URL('../', import.meta.url));
export const FIGURES = ['baseline', 'cloud', 'llm-growth', 'sens1', 'sens2', 'agentic-ai'];
const TITLES = {baseline: 'UZH IT emissions — illustrative baseline', cloud: 'All local servers migrated to cloud',
    sens1: 'Managed-device counts and high ordinary-chat use', sens2: 'Low local-device embodied footprints'};
const ORDER = ['Mobile phones', 'Laptops', 'Monitors', 'Campus networking', 'A/V equipment',
    'Printers', 'Servers', 'DC cooling', 'Supercomputing', 'Cloud', 'Productivity SaaS', 'AI (chatbot)', 'AI (agents)'];
const LABELS = {'Campus networking': 'Networking', 'Productivity SaaS': 'SaaS', 'Supercomputing': 'CSCS'};

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

async function agentAdoption(scenario) {
    const curves = scenario.agentEnergyKwhPerDay.map(energyKwhPerDay => ({energyKwhPerDay,
        points: scenario.adoptionPercent.map(adoptionPercent => {
            const agentUsers = Math.round(scenario.configuration.environments.ai.population * adoptionPercent / 100);
            const result = calculate(merge(scenario.configuration, {environments: {ai: {agentUsers, kwhPerAgentDay: energyKwhPerDay}}}));
            const row = result.rows.find(r => r.category === 'AI (agents)');
            return {adoptionPercent, agentUsers, ...row, total: rowTotal(row)};
        })}));
    const benchmarks = [];
    for (const item of scenario.benchmarks) {
        const before = await loadScenario(item.before), after = await loadScenario(item.after);
        if (after.extends !== item.before) throw new Error('Savings scenario must extend its paired starting point');
        benchmarks.push({...item, beforeConfiguration: before.configuration, change: after.overrides,
            comparison: interventionComparison(before.configuration, after.overrides)});
        scenario.sources.push(...before.sources, ...after.sources);
    }
    return {scope: 'External agents only; hardware, training and facility electricity included', curves, benchmarks};
}

export async function prepareFigure(name) {
    if (!FIGURES.includes(name)) throw new Error('Unknown paper figure: ' + name);
    const scenario = await loadScenario(name);
    const results = report(scenario.configuration);
    const record = {figure: {name, description: scenario.description, sources: scenario.sources,
        image: `fig-${name}.png`, dimensions: {width: 1600, height: 900}}, ...results};
    if (name === 'cloud') record.comparison = interventionComparison((await loadScenario('baseline')).configuration, scenario.overrides);
    if (scenario.kind === 'agentAdoption') {
        record.adoptionAnalysis = await agentAdoption(scenario);
        record.figure.sources = [...new Map(scenario.sources.map(source => [source.path, source])).values()];
    }
    const chart = scenario.kind === 'agentAdoption' ? agentAdoptionChart(record.adoptionAnalysis)
        : scenario.kind === 'chatProjection' ? projectionChart(results.results.projection, {divisor: 1000})
        : emissionsChart(results.results.data, {divisor: 1000, order: ORDER, labels: LABELS,
        title: TITLES[name]});
    return {record, chart: paperPresentation(chart)};
}

export async function generateFigure(name, outputDirectory = path.join(root, 'doc'), {check = false} = {}) {
    const {record, chart} = await prepareFigure(name);
    const dataFile = path.join(outputDirectory, 'figure-data', name + '.json');
    const imageFile = path.join(outputDirectory, record.figure.image);
    if (!check) {
        await mkdir(path.dirname(dataFile), {recursive: true});
        await renderChart(chart, imageFile, record.figure.dimensions);
    }
    const png = await readFile(imageFile);
    if (png.subarray(1, 4).toString() !== 'PNG' || png.readUInt32BE(16) !== record.figure.dimensions.width
        || png.readUInt32BE(20) !== record.figure.dimensions.height) throw new Error('Invalid figure PNG: ' + imageFile);
    record.figure.sha256 = createHash('sha256').update(png).digest('hex');
    const serialized = JSON.stringify(record, null, 2) + '\n';
    if (check) {
        if (await readFile(dataFile, 'utf8') !== serialized) throw new Error('Stale figure data or image: ' + dataFile);
    } else await writeFile(dataFile, serialized);
    return record;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const {values} = parseArgs({options: {figure: {type: 'string'}, output: {type: 'string'}, check: {type: 'boolean'}}});
    for (const name of values.figure ? [values.figure] : FIGURES) {
        const result = await generateFigure(name, values.output, {check: values.check});
        console.log(`${name}: ${(result.results.summary.totalCombined / 1000).toFixed(3)} t CO2e/year`);
    }
    if (!values.figure) await generatePaperResults(values.output, {check: values.check});
}

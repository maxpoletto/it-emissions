import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createConfig, calculate} from '../src/model.js';
import {ENVIRONMENT_FIELDS} from '../src/environments.js';
import {GRID_PROFILE} from '../src/defaults.js';
import {loadScenario} from '../scripts/scenarios.js';

const appendix = await readFile(new URL('../doc/supplement-parameters.tex', import.meta.url), 'utf8');
const tables = [...appendix.matchAll(/\\begin\{longtable\}[\s\S]*?\\end\{longtable\}/g)].map(m => m[0]);
const cells = (table, label) => {
    const block = tables.find(t => t.includes(`\\label{tab:param-${table}}`));
    assert.ok(block, 'Missing appendix table: ' + table);
    const row = block.split('\n').find(line => line.startsWith(label + ' & '));
    assert.ok(row, `Missing appendix row: ${table}: ${label}`);
    return row.split(' & ').map(cell => cell.replace(/\\\\.*$/, '').trim());
};
const numbers = text => (text.replaceAll(',', '').match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
const pathKey = path => JSON.stringify(path);
function leaves(value, path = []) {
    if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length)
        return Object.entries(value).flatMap(([key, child]) => leaves(child, [...path, key]));
    return [path];
}

test('every model configuration field is documented and appendix defaults match the code', () => {
    const config = createConfig(), covered = new Set();
    const valueAt = path => path.reduce((value, key) => value[key], config);
    const check = (table, label, column, path, {scale = 1, text} = {}) => {
        const cell = cells(table, label)[column], value = valueAt(path);
        if (text !== undefined) assert.equal(cell, text, label);
        else if (typeof value === 'number') {
            const expected = cell.includes('\\approx') ? Number((value * scale).toPrecision(1)) : value * scale;
            assert.ok(Math.abs(numbers(cell)[0] - expected) < 1e-10 * Math.max(1, Math.abs(expected)), label);
        } else assert.equal(cell, value, label);
        covered.add(pathKey(path));
    };
    for (const device of Object.keys(config.deviceInfo)) {
        for (const [i, key] of ['Count', 'Lifetime', 'Days per year'].entries())
            check('devices', device, i + 1, ['deviceInfo', device, key]);
        for (const [i, key] of ['Mean', 'Stdev', 'Min', 'Max'].entries())
            check('embodied', device, i + 1, ['embodiedEmissionsKgCo2e', device, key]);
        for (const [i, key] of ['Mean', 'Stdev', 'Min', 'Max', 'Standby'].entries())
            check('power', device, i + 1, ['powerW', device, key]);
        assert.deepEqual(cells('duty', device).slice(1, 5).map(Number), config.dutyCycle6h[device], device);
        covered.add(pathKey(['dutyCycle6h', device]));
    }
    const numeric = {
        services: {
            'Network access points': ['networking', 'accessPoints'],
            'Network access-point power': ['networking', 'accessPointWatts'],
            'Network access-point footprint': ['networking', 'accessPointEmbodiedKg'],
            'Switches/routers per access point': ['networking', 'switchesPerAccessPoint'],
            'Network switch power': ['networking', 'switchWatts'],
            'Network switch footprint': ['networking', 'switchEmbodiedKg'],
            'Network hardware lifetime': ['networking', 'lifetimeYears'],
            'Network electricity adjustment factor': ['networking', 'electricityScale'],
            'SaaS users': ['saas', 'users'], 'SaaS emissions factor': ['saas', 'kgPerUserYear'],
        },
        compute: {
            'Campus data center PUE': ['local', 'pue'], 'Campus electricity intensity': ['local', 'intensityGPerKwh'],
            'Cloud PUE': ['cloud', 'pue'], 'Cloud electricity intensity': ['cloud', 'intensityGPerKwh'],
            'Cloud servers in cloud': ['cloud', 'migratedPercent'],
            'Cloud instances per 100 local servers': ['cloud', 'instancesPer100Servers'],
            'Cloud instance embodied emissions': ['cloud', 'embodiedKg'], 'Cloud instance power': ['cloud', 'powerWatts'],
            'Cloud instance lifetime': ['cloud', 'lifetimeYears'], 'CSCS PUE': ['supercomputing', 'pue'],
            'CSCS electricity intensity': ['supercomputing', 'intensityGPerKwh'],
            'CSCS server-equivalent power': ['supercomputing', 'serverEquivalentKw'],
            'CSCS hardware footprint': ['supercomputing', 'embodiedKgPerServer'],
            'CSCS hardware lifetime': ['supercomputing', 'lifetimeYears'],
        },
        ai: {
            'User population': ['ai', 'population'], 'Chat users': ['ai', 'chatUsers'],
            'Ordinary chat volume': ['ai', 'queriesPerUserDay'], 'Chat active days': ['ai', 'chatDays'],
            'Agent active days': ['ai', 'agentDays'], 'Ordinary query energy': ['ai', 'whPerQuery'],
            'Training overhead': ['ai', 'trainingPercent'], 'AI electricity intensity': ['ai', 'intensityGPerKwh'],
            'Embodied emissions': ['ai', 'chatHardwareGPerQuery'],
            'Agentic hardware allocation': ['ai', 'agentHardwareGPerKwh'], 'AI PUE': ['ai', 'pue'],
            'Annual usage growth': ['ai', 'usageGrowthPercent'],
            'Annual query-energy reduction': ['ai', 'efficiencyImprovementPercent'],
            'Annual training growth': ['ai', 'trainingGrowthPercent'],
            'Agent users': ['ai', 'agentUsers'], 'Agentic AI energy': ['ai', 'kwhPerAgentDay'],
        },
    };
    for (const [table, rows] of Object.entries(numeric))
        for (const [label, path] of Object.entries(rows)) check(table, label, 1, ['environments', ...path]);
    check('compute', 'CSCS IT electricity', 1, ['environments', 'supercomputing', 'electricityKwh'], {scale: 1e-6});
    const options = {
        'Configuration version': [['modelVersion'], '2.0'], 'Reference year': [['referenceYear']],
        'Include SaaS': [['environments', 'saas', 'enabled'], 'Yes'],
        'Enable cloud migration': [['environments', 'cloud', 'enabled'], 'Yes'],
        'Include campus networking': [['environments', 'networking', 'enabled'], 'Yes'],
        'Include CSCS': [['environments', 'supercomputing', 'enabled'], 'Yes'],
        'Include hosted AI': [['environments', 'ai', 'enabled'], 'Yes'],
        'Local enabled flag': [['environments', 'local', 'enabled'], 'Yes'],
        'Networking method': [['environments', 'networking', 'mode'], 'Inventory'],
        'CSCS method': [['environments', 'supercomputing', 'mode'], 'Electricity allocation'],
        'Campus hourly profile': [['environments', 'local', 'useHourlyProfile'], 'Yes'],
        'Local server electricity basis': [['environments', 'local', 'energyBasis'], 'IT only'],
        'Cloud power basis': [['environments', 'cloud', 'energyBasis'], 'IT only'],
        'CSCS electricity basis': [['environments', 'supercomputing', 'energyBasis'], 'IT only'],
        'Legacy networking allowance': [['environments', 'networking', 'legacyPercent']],
        'Legacy CSCS power': [['environments', 'supercomputing', 'legacyPowerKw']],
        'Compatibility mode': [['compatibility'], 'None'], 'Scenario annotation': [['annotation'], 'Empty'],
        'Percentage chart': [['percentage'], 'No'], 'Custom range inputs': [['rangeInputs'], 'None'],
        'Legacy compute container': [['compute'], 'Empty'],
    };
    const rendered = value => typeof value === 'boolean' ? value ? 'Yes' : 'No'
        : value === null ? 'None' : value === '' ? 'Empty' : Array.isArray(value) ? value.length ? null : 'None'
        : typeof value === 'object' ? Object.keys(value).length ? null : 'Empty'
        : ({it: 'IT only', facility: 'Facility', inventory: 'Inventory', allocation: 'Electricity allocation'}[value] ?? value);
    for (const [label, [path, text]] of Object.entries(options)) {
        if (text !== undefined) assert.equal(rendered(valueAt(path)), text, 'Update the documented option: ' + label);
        check('options', label, 1, path, {text});
    }
    for (const [label, key] of [['Chat energy boundary', 'chatEnergyBasis'], ['Agent energy boundary', 'agentEnergyBasis'], ['Agent hardware basis', 'agentHardwareEnergyBasis']]) {
        const path = ['environments', 'ai', key];
        check('ai', label, 1, path, {text: rendered(valueAt(path))});
    }
    const bounds = [
        ['services', 'SaaS emissions factor', 3, 'saas', 'kgPerUserYear'],
        ['services', 'Network electricity adjustment factor', 3, 'networking', 'electricityScale'],
        ['compute', 'CSCS server-equivalent power', 4, 'supercomputing', 'serverEquivalentKw'],
        ['ai', 'Ordinary chat volume', 4, 'ai', 'queriesPerUserDay'],
        ['ai', 'Ordinary query energy', 4, 'ai', 'whPerQuery'],
        ['ai', 'Agent users', 4, 'ai', 'agentUsers'],
        ['ai', 'Agentic AI energy', 4, 'ai', 'kwhPerAgentDay'],
        ['ai', 'Agentic hardware allocation', 4, 'ai', 'agentHardwareGPerKwh'],
    ];
    for (const [table, label, column, env, key] of bounds) {
        assert.deepEqual(numbers(cells(table, label)[column]).slice(0, 2), config.environments[env].bounds[key], label);
        covered.add(pathKey(['environments', env, 'bounds', key]));
    }
    assert.match(cells('compute', 'CSCS PUE')[4], /Fixed in figures/);
    assert.deepEqual(config.environments.supercomputing.bounds.pue, [config.environments.supercomputing.pue, config.environments.supercomputing.pue]);
    covered.add(pathKey(['environments', 'supercomputing', 'bounds', 'pue']));
    assert.match(appendix, /Cloud and local data-center bounds are empty by default/);
    for (const env of ['cloud', 'local']) {
        assert.deepEqual(config.environments[env].bounds, {});
        covered.add(pathKey(['environments', env, 'bounds']));
    }
    assert.match(appendix, /\\texttt\{source\} strings record provenance/);
    for (const [env, values] of Object.entries(config.environments)) {
        assert.ok(values.source.trim()); covered.add(pathKey(['environments', env, 'source']));
        for (const field of ENVIRONMENT_FIELDS[env].fields)
            assert.ok(covered.has(pathKey(['environments', env, field.key])), 'Undocumented app control: ' + env + '.' + field.key);
    }
    const undocumented = leaves(config).filter(path => !covered.has(pathKey(path)));
    assert.deepEqual(undocumented, [], 'New model fields must be added to the appendix and this mapping');
    assert.equal(numbers(cells('options', 'Chat projection horizon')[1])[0], calculate().projection.length);
    for (let i = 0; i < 6; i++) {
        const hour = String(i * 2).padStart(2, '0') + '--' + String(i * 2 + 2).padStart(2, '0');
        const row = cells('grid', hour);
        assert.equal(Number(row[1]), GRID_PROFILE[i]); assert.equal(Number(row[3]), GRID_PROFILE[i + 6]);
    }
    assert.equal(GRID_PROFILE.length, 12);
});

test('saved paper baseline explicitly snapshots every calculator default apart from its annotation', async () => {
    const defaults = createConfig(), baseline = structuredClone((await loadScenario('baseline')).configuration);
    baseline.annotation = defaults.annotation;
    assert.deepEqual(baseline, defaults);
});

test('appendix scenario definitions match their saved overrides and forecast settings', async () => {
    const names = ['baseline', 'cloud', 'sens1', 'sens2', 'sens-combined', 'llm-growth', 'agentic-ai', 'lifecycle-before', 'lifecycle-after'];
    const scenarios = Object.fromEntries(await Promise.all(names.map(async name => [name, await loadScenario(name)])));
    const config = name => createConfig(scenarios[name].configuration);
    const rowNumbers = label => numbers(cells('scenarios', label)[1]);
    assert.deepEqual(rowNumbers('Cloud migration'), [config('cloud').environments.cloud.migratedPercent]);
    const managed = config('sens1');
    assert.deepEqual(rowNumbers('Managed devices / high chat'), [managed.deviceInfo.Laptops.Count,
        managed.deviceInfo['Mobile phones'].Count, managed.environments.ai.queriesPerUserDay,
        managed.environments.ai.whPerQuery, managed.deviceInfo.Laptops.Lifetime]);
    const low = config('sens2'), combined = config('sens-combined'), base = config('baseline');
    assert.match(cells('scenarios', 'Low device footprints')[1], /Min column/);
    for (const [device, footprint] of Object.entries(low.embodiedEmissionsKgCo2e)) {
        assert.equal(footprint.Mean, base.embodiedEmissionsKgCo2e[device].Min);
        assert.equal(combined.embodiedEmissionsKgCo2e[device].Mean, footprint.Mean);
    }
    assert.deepEqual(combined.deviceInfo, base.deviceInfo);
    assert.deepEqual(rowNumbers('Combined sensitivity'), [combined.environments.ai.queriesPerUserDay, combined.environments.ai.whPerQuery]);
    const growth = config('llm-growth'), years = calculate(growth).projection.map(row => row.year);
    assert.deepEqual(rowNumbers('Chat growth'), [years[0], years.at(-1), growth.environments.ai.usageGrowthPercent,
        growth.environments.ai.efficiencyImprovementPercent, growth.environments.ai.trainingGrowthPercent]);
    const agents = scenarios['agentic-ai'];
    assert.deepEqual(rowNumbers('Agent adoption'), [agents.adoptionPercent[0], agents.adoptionPercent.at(-1), ...agents.agentEnergyKwhPerDay]);
    assert.ok(agents.adoptionPercent.slice(1).every((value, i) => value - agents.adoptionPercent[i] === 1));
    const before = config('lifecycle-before'), after = config('lifecycle-after');
    assert.deepEqual(rowNumbers('Lifetime intervention'), [before.deviceInfo.Laptops.Lifetime, before.deviceInfo['Mobile phones'].Lifetime,
        after.deviceInfo.Laptops.Lifetime, after.deviceInfo['Mobile phones'].Lifetime]);
});

test('derived appendix totals and agent examples agree with the shared calculator', async () => {
    const result = calculate(), env = result.config.environments;
    const row = category => result.rows.find(r => r.category === category);
    const total = r => r.usage + (r.embodied ?? 0) + (r.training ?? 0);
    const tex = await readFile(new URL('../doc/model-results.tex', import.meta.url), 'utf8');
    const macros = Object.fromEntries([...tex.matchAll(/\\newcommand\{\\(Model\w+)\}\{([^}]+)\}/g)].map(m => [m[1], Number(m[2])]));
    const displayed = cell => {
        const macro = cell.match(/\\(Model\w+)/);
        return macro ? macros[macro[1]] : numbers(cell)[0];
    };
    const check = (table, label, tonnes) => assert.equal(displayed(cells(table, label)[1]), Number(tonnes.toFixed(1)), label);
    const network = row('Campus networking'), cscs = row('Supercomputing'), saas = row('Productivity SaaS');
    check('compute', 'Campus networking operation', network.usage / 1000);
    check('compute', 'Campus networking hardware', network.embodied / 1000);
    check('boundary', 'Campus networking', total(network) / 1000);
    check('boundary', 'Productivity SaaS', total(saas) / 1000);
    const computeOnly = cscs.itElectricityKwh * env.supercomputing.intensityGPerKwh / 1e6;
    check('boundary', 'CSCS operational electricity', computeOnly);
    check('boundary', 'CSCS facility overhead', cscs.usage / 1000 - computeOnly);
    check('boundary', 'CSCS embodied emissions', cscs.embodied / 1000);
    for (const label of ['Agentic AI example A', 'Agentic AI main-chart scenario', 'Agentic AI example B']) {
        const [adoption, kwhPerAgentDay] = numbers(cells('boundary', label)[2]);
        const agentUsers = Math.round(env.ai.population * adoption / 100);
        const agents = calculate({environments: {ai: {agentUsers, kwhPerAgentDay}}}).rows.find(r => r.category === 'AI (agents)');
        check('boundary', label, total(agents) / 1000);
    }
});

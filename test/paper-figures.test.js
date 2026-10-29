import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {prepareFigure, generateFigure, FIGURES} from '../scripts/paper-figures.js';
import {report} from '../src/model.js';

test('paper baseline is an explicit, reproducible calculator configuration', async () => {
    const {record, chart} = await prepareFigure('baseline');
    assert.deepEqual(record.results, report().results);
    assert.equal(record.parameters.referenceYear, 2026);
    assert.equal(record.parameters.environments.ai.trainingPercent, 20);
    assert.deepEqual(record.parameters.environments.ai.bounds.whPerQuery, [0.3, 3]);
    assert.deepEqual(record.parameters.environments.ai.bounds.queriesPerUserDay, [10, 30]);
    assert.equal(record.parameters.environments.ai.kwhPerAgentDay, 1.5);
    assert.equal(record.parameters.environments.ai.agentEnergyBasis, 'facility');
    assert.equal(record.parameters.environments.ai.agentHardwareEnergyBasis, 'facility');
    assert.deepEqual(record.parameters.environments.ai.bounds.agentUsers, [1900, 7600]);
    assert.equal(chart.options.scales.y.title.text, 't CO₂e/year');
    assert.equal(chart.data.datasets.length, 3, 'hardware, training and operation are separate');
    assert.ok(chart.options.plugins.assumptionRanges.bounds.filter(Boolean).length >= 5);
});

test('committed figure records match the saved inputs and current model', async () => {
    for (const name of FIGURES) await generateFigure(name, undefined, {check: true});
});

test('figure integrity check detects an altered image as well as stale numerical inputs', async () => {
    const output = await mkdtemp(path.join(tmpdir(), 'paper-figure-'));
    await generateFigure('baseline', output);
    await generateFigure('baseline', output, {check: true});
    const target = path.join(output, 'fig-baseline.png');
    const bytes = await readFile(target); bytes[bytes.length - 1] ^= 1;
    await writeFile(target, bytes);
    await assert.rejects(generateFigure('baseline', output, {check: true}), /Stale figure data or image/);
});

test('cloud paper figure preserves unaffected services and pairs its savings assumptions', async () => {
    const base = (await prepareFigure('baseline')).record;
    const cloud = (await prepareFigure('cloud')).record;
    const find = (record, category) => record.results.data.find(r => r.category === category);
    assert.equal(find(cloud, 'Servers').usage, 0);
    assert.equal(find(cloud, 'DC cooling').usage, 0);
    for (const category of ['Campus networking', 'Supercomputing', 'Productivity SaaS', 'AI (agents)'])
        assert.deepEqual(find(cloud, category), find(base, category));
    assert.ok(Math.abs(cloud.comparison.savings.central - 206152.74075) < 1e-6);
    assert.ok(Math.abs(cloud.comparison.savings.low - cloud.comparison.savings.high) < 1e-6,
        'uncertainty in unchanged services must cancel in matched savings');
});

test('chat growth figure starts with annual chat and excludes agents from its projection', async () => {
    const {record, chart} = await prepareFigure('llm-growth');
    const first = record.results.projection[0];
    const chat = record.results.data.find(r => r.category === 'AI (chatbot)');
    assert.equal(first.total, chat.usage + chat.embodied + chat.training);
    const second = record.results.projection[1];
    assert.ok(Math.abs(second.usage / first.usage - 1.05) < 1e-10);
    assert.ok(Math.abs(second.training / first.training - 1.5) < 1e-10);
    assert.ok(Math.abs(second.embodied / first.embodied - 1.5) < 1e-10);
    assert.equal(chart.data.labels.at(-1), '2030');
    assert.match(record.projectionScope, /ordinary chat only/);
});

test('managed-device sensitivity changes counts and chat without dropping broad-boundary services', async () => {
    const {record} = await prepareFigure('sens1');
    assert.equal(record.parameters.deviceInfo.Laptops.Count, 10440);
    assert.equal(record.parameters.deviceInfo['Mobile phones'].Count, 2439);
    const ai = record.parameters.environments.ai;
    assert.equal(ai.whPerQuery, 3); assert.equal(ai.queriesPerUserDay, 30);
    assert.equal(ai.agentUsers, 3800);
    const chat = record.results.data.find(r => r.category === 'AI (chatbot)');
    assert.ok(Math.abs(chat.usage - 176985) < 1e-6);
    assert.ok(record.results.data.some(r => r.category === 'Productivity SaaS'));
});

test('low-device sensitivity changes manufacturing assumptions without changing operation', async () => {
    const base = (await prepareFigure('baseline')).record;
    const low = (await prepareFigure('sens2')).record;
    for (const [device, stats] of Object.entries(low.parameters.embodiedEmissionsKgCo2e)) {
        assert.equal(stats.Mean, stats.Min);
        const before = base.results.data.find(r => r.category === device);
        const after = low.results.data.find(r => r.category === device);
        assert.equal(after.usage, before.usage);
        assert.ok(after.embodied <= before.embodied);
    }
    for (const category of ['Supercomputing', 'AI (agents)', 'Campus networking'])
        assert.deepEqual(low.results.data.find(r => r.category === category), base.results.data.find(r => r.category === category));
});

test('agent curves use the annual model and comparable, paired intervention savings', async () => {
    const {record, chart} = await prepareFigure('agentic-ai');
    const analysis = record.adoptionAnalysis;
    const central = analysis.curves.find(curve => curve.energyKwhPerDay === 1.5);
    const atTenPercent = central.points.find(point => point.adoptionPercent === 10);
    const annualAgents = record.results.data.find(row => row.category === 'AI (agents)');
    assert.equal(atTenPercent.total, annualAgents.usage + annualAgents.embodied + annualAgents.training);
    assert.equal(central.points[0].adoptionPercent, 5);
    assert.equal(central.points.at(-1).adoptionPercent, 20);
    assert.ok(Math.abs(central.points[0].total - 198360) < 1e-6);
    const high = analysis.curves.find(curve => curve.energyKwhPerDay === 3).points.find(point => point.adoptionPercent === 10);
    assert.ok(Math.abs(high.total - 793440) < 1e-6);
    assert.equal(analysis.energyBasis, 'facility');
    assert.equal(chart.options.scales.x.min, 5);
    assert.match(chart.data.datasets[1].label, /1\.5.*facility/);
    const lifetime = analysis.benchmarks.find(b => b.after === 'lifecycle-after');
    assert.ok(Math.abs(lifetime.comparison.savings.central - 625833.3333333333) < 1e-6);
    assert.equal(chart.data.datasets.length, 5);
    assert.ok(record.figure.sources.some(source => source.path.endsWith('lifecycle-before.json')));
});

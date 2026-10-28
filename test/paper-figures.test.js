import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareFigure, generateFigure, FIGURES} from '../scripts/paper-figures.js';
import {report} from '../src/model.js';

test('paper baseline is an explicit, reproducible calculator configuration', async () => {
    const {record, chart} = await prepareFigure('baseline');
    assert.deepEqual(record.results, report().results);
    assert.equal(record.parameters.referenceYear, 2026);
    assert.equal(chart.options.scales.y.title.text, 't CO₂e/year');
    assert.equal(chart.data.datasets.length, 3, 'hardware, training and operation are separate');
    assert.ok(chart.options.plugins.assumptionRanges.bounds.filter(Boolean).length >= 5);
});

test('committed figure records match the saved inputs and current model', async () => {
    for (const name of FIGURES) await generateFigure(name, undefined, {check: true});
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

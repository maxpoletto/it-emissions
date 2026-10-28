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

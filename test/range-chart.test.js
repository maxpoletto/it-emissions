import test from 'node:test';
import assert from 'node:assert/strict';
import {emissionsChart, assumptionRanges, projectionChart} from '../src/charts.js';

test('range axes include upper bounds and ranges remain in the plotted units', () => {
    const config = emissionsChart([{category: 'Example', embodied: 2000, usage: 3000, range: {low: 3500, high: 9000}}], {divisor: 1000});
    assert.deepEqual(config.options.plugins.assumptionRanges.bounds, [{low: 3.5, high: 9}]);
    assert.ok(config.options.scales.y.suggestedMax > 9);
    assert.match(config.options.plugins.subtitle.text, /assumption ranges/);
    assert.equal(emissionsChart([{category: 'Unknown', usage: 5}]).plugins, undefined);
});
test('whiskers use the complete stack, support zero width and omit missing bounds', () => {
    const lines = [];
    const ctx = {save() {}, restore() {}, beginPath() {}, stroke() {},
        moveTo: (...p) => lines.push(p), lineTo: (...p) => lines.push(p)};
    const chart = {ctx, data: {datasets: [{}, {}]}, isDatasetVisible: () => true,
        getDatasetMeta: () => ({data: [{x: 10}, {x: 20}, {x: 30}]}),
        scales: {y: {getPixelForValue: v => 100 - v}}};
    assumptionRanges.afterDatasetsDraw(chart, {}, {bounds: [{low: 4, high: 12}, null, {low: 5, high: 5}]});
    assert.deepEqual(lines.slice(0, 2), [[10, 96], [10, 88]]);
    assert.equal(lines.length, 12);
    chart.isDatasetVisible = () => false;
    assumptionRanges.afterDatasetsDraw(chart, {}, {bounds: [{low: 1, high: 99}]});
    assert.equal(lines.length, 12, 'hide total whiskers when the displayed stack is incomplete');
});
test('projection ranges are drawn at the total rather than one component', () => {
    const config = projectionChart([{year: 2026, embodied: 20, usage: 80, total: 100, range: {low: 70, high: 140}}]);
    assert.deepEqual(config.options.plugins.assumptionRanges.bounds, [{low: 70, high: 140}]);
});

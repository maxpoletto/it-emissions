import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate, calculateWithRanges, createConfig, merge} from '../src/model.js';
import {rangeCases, compareRanges} from '../src/ranges.js';

const lifetime = {path: ['deviceInfo', 'Laptops', 'Lifetime'], low: 4, high: 8, source: 'Declared lifetime sensitivity'};
test('a shorter lifetime increases the upper bound and unchanged rows have no quantified range', () => {
    const result = calculateWithRanges({modelVersion: '1.0', rangeInputs: [lifetime]});
    const laptops = result.rows.find(r => r.category === 'Laptops');
    assert.equal(laptops.range.low, calculate({deviceInfo: {Laptops: {Lifetime: 8}}}).rows[0].usage + 720000);
    assert.equal(laptops.range.high, calculate({deviceInfo: {Laptops: {Lifetime: 4}}}).rows[0].usage + 1440000);
    assert.equal(result.rows.find(r => r.category === 'Monitors').range, null);
    assert.equal(result.rangeAnalysis.caseCount, 3);
});
test('totals use coherent whole-model cases and preserve shared dependencies', () => {
    const config = createConfig({modelVersion: '1.0', rangeInputs: [lifetime,
        {path: ['compute', 'Campus networking overhead %'], low: 0, high: 20, source: 'Legacy network allowance'}]});
    const result = calculateWithRanges(config); const totals = result.rows.at(-1);
    const sums = rangeCases(config).map(c => {const r = calculate(c).rows.at(-1); return r.usage + r.embodied;});
    assert.equal(totals.range.low, Math.min(...sums)); assert.equal(totals.range.high, Math.max(...sums));
    assert.ok(totals.range.low < totals.usage + totals.embodied);
});
test('paired intervention savings do not acquire uncertainty from unchanged devices', () => {
    const config = createConfig({modelVersion: '1.0', rangeInputs: [lifetime]});
    const savings = compareRanges(config, {compute: {'Cloud PUE x100': 105, 'Cloud % servers in cloud': 100}}, calculate, merge);
    assert.ok(Math.abs(savings.high - savings.low) < 1e-8);
});
test('missing, invalid and zero-width bounds are handled explicitly', () => {
    assert.equal(calculateWithRanges({modelVersion: '1.0'}).rangeAnalysis, null);
    assert.equal(rangeCases(createConfig(), [{...lifetime, low: 6, high: 6}]).length, 1);
    for (const bound of [{...lifetime, low: 7}, {...lifetime, high: 3}, {...lifetime, source: ''}, {...lifetime, path: ['missing']}])
        assert.throws(() => rangeCases(createConfig(), [bound]));
    assert.throws(() => rangeCases(createConfig(), [lifetime, lifetime]), /Duplicate/);
});

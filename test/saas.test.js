import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate, calculateWithRanges} from '../src/model.js';

test('SaaS emissions and ranges derive from population and the per-user factor', () => {
    const result = calculateWithRanges(); const saas = result.rows.find(r => r.category === 'Productivity SaaS');
    assert.equal(saas.usage, 114000); assert.equal(saas.embodied, null);
    assert.deepEqual(saas.range, {low: 38000, high: 190000});
    assert.equal(calculate({environments: {saas: {users: 100}}}).rows.find(r => r.category === 'Productivity SaaS').usage, 300);
    assert.equal(calculate({environments: {saas: {users: 0}}}).rows.find(r => r.category === 'Productivity SaaS').usage, 0);
});
test('old URLs retain their original scope while new configurations include SaaS', () => {
    const old = calculate({modelVersion: '1.0'});
    assert.equal(old.config.compatibility, 'v1');
    assert.equal(old.rows.some(r => r.category === 'Productivity SaaS'), false);
    assert.ok(Math.abs(old.rows.at(-1).usage + old.rows.at(-1).embodied - 3223182.3860333334) < 1e-8);
});
test('SaaS rejects negative or nonfinite physical inputs', () => {
    for (const users of [-1, NaN, 1.5]) assert.throws(() => calculate({environments: {saas: {users}}}));
});

test('explicit saved SaaS factors and bounds retain their previous results', () => {
    const saved = calculateWithRanges({environments: {saas: {
        users: 38000, kgPerUserYear: 5.5, bounds: {kgPerUserYear: [1, 10]},
    }}}).rows.find(r => r.category === 'Productivity SaaS');
    assert.equal(saved.usage, 209000);
    assert.deepEqual(saved.range, {low: 38000, high: 380000});
});

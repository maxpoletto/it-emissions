import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate, calculateWithRanges} from '../src/model.js';

test('SaaS emissions and ranges derive from population and the per-user factor', () => {
    const result = calculateWithRanges(); const saas = result.rows.find(r => r.category === 'Productivity SaaS');
    assert.equal(saas.usage, 209000); assert.equal(saas.embodied, null);
    assert.deepEqual(saas.range, {low: 38000, high: 380000});
    assert.equal(calculate({environments: {saas: {users: 100}}}).rows.find(r => r.category === 'Productivity SaaS').usage, 550);
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

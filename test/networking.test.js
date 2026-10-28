import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate, calculateWithRanges} from '../src/model.js';
const row = result => result.rows.find(r => r.category === 'Campus networking');

test('network emissions derive from inventory, equipment power, lifetime and campus grid', () => {
    const n = row(calculate());
    assert.equal(n.electricityKwh, 1401600); assert.equal(n.embodied, 39500);
    assert.equal(n.usage, 75336);
    const doubled = row(calculate({environments: {networking: {accessPoints: 8000}}}));
    assert.equal(doubled.usage, n.usage * 2); assert.equal(doubled.embodied, n.embodied * 2);
});
test('inventory networking does not disappear when servers migrate to the cloud', () => {
    assert.deepEqual(row(calculate({environments: {cloud: {migratedPercent: 100}}})), row(calculate()));
});
test('operational allowance produces bounds without claiming hardware uncertainty', () => {
    const n = row(calculateWithRanges());
    assert.ok(Math.abs(n.range.low - (39500 + 75336 * 0.67)) < 1e-8);
    assert.ok(Math.abs(n.range.high - (39500 + 75336 * 1.33)) < 1e-8);
    assert.equal(row(calculate({environments: {networking: {accessPoints: 0}}})).usage, 0);
});

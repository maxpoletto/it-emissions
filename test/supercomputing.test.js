import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate, calculateWithRanges} from '../src/model.js';
const row = r => r.rows.find(r => r.category === 'Supercomputing');
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

test('CSCS operational and embodied emissions derive from physical allocation assumptions', () => {
    const r = row(calculateWithRanges());
    assert.equal(r.electricityKwh, 4320000); assert.equal(r.usage, 216000);
    close(r.embodied, 3600000 / 8760 / 1.2 * 1100 / 5);
    close(r.range.low, 3600000 * 1.1 * 50 / 1000 + 3600000 / 8760 / 2 * 1100 / 5);
    close(r.range.high, 3600000 * 1.3 * 50 / 1000 + 3600000 / 8760 / 0.4 * 1100 / 5);
    const double = row(calculate({environments: {supercomputing: {electricityKwh: 7200000}}}));
    close(double.usage, 2 * r.usage); close(double.embodied, 2 * r.embodied);
});
test('facility and compute-only allocations agree when they represent the same workload', () => {
    const it = row(calculate());
    const facility = row(calculate({environments: {supercomputing: {energyBasis: 'facility', electricityKwh: 4320000}}}));
    close(it.usage, facility.usage); close(it.embodied, facility.embodied);
});
test('campus and cloud grid edits do not affect CSCS', () => {
    const base = row(calculate());
    const changed = row(calculate({environments: {local: {intensityGPerKwh: 0}, cloud: {intensityGPerKwh: 0}}}));
    assert.deepEqual(base, changed);
});
test('CSCS rejects zero server-equivalent power and retains legacy power-only imports', () => {
    assert.throws(() => calculate({environments: {supercomputing: {serverEquivalentKw: 0}}}));
    const old = row(calculate({modelVersion: '1.0'}));
    close(old.usage, 31076.1); assert.equal(old.embodied, null);
});

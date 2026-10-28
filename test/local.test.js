import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate} from '../src/model.js';

const row = (r, name) => r.rows.find(v => v.category === name);
test('PUE changes server overhead but not device electricity or hardware', () => {
    const base = calculate(); const efficient = calculate({environments: {local: {pue: 1}}});
    assert.equal(row(efficient, 'DC cooling').usage, 0);
    assert.equal(row(efficient, 'Servers').usage, row(base, 'Servers').usage);
    assert.equal(row(efficient, 'Servers').embodied, row(base, 'Servers').embodied);
    assert.ok(Math.abs(row(base, 'Servers').electricityKwh - 1121 * 0.4 * 24 * 0.8 * 365) < 1e-8);
});
test('local grid changes do not change cloud electricity or cloud emissions', () => {
    const base = calculate({environments: {cloud: {migratedPercent: 50}}});
    const doubled = calculate({environments: {cloud: {migratedPercent: 50}, local: {intensityGPerKwh: 107.5}}});
    assert.equal(row(doubled, 'Laptops').usage, 2 * row(base, 'Laptops').usage);
    assert.equal(row(doubled, 'Cloud').usage, row(base, 'Cloud').usage);
    assert.equal(row(doubled, 'Laptops').electricityKwh, row(base, 'Laptops').electricityKwh);
});
test('facility-inclusive server input adds no further cooling', () => {
    const result = calculate({environments: {local: {energyBasis: 'facility', pue: 2}}});
    assert.equal(row(result, 'DC cooling').usage, 0);
    assert.equal(row(result, 'DC cooling').electricityKwh, 0);
});
test('invalid inventories and duty cycles fail with a useful error', () => {
    for (const input of [{deviceInfo: {Laptops: {Lifetime: 0}}}, {deviceInfo: {Servers: {Count: -1}}},
        {dutyCycle6h: {Laptops: [1, 1, 1, 2]}}, {powerW: {Servers: {Mean: -1}}}]) assert.throws(() => calculate(input));
});

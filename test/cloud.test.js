import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate} from '../src/model.js';

const input = {environments: {cloud: {migratedPercent: 100}}};
const row = (result, name) => result.rows.find(r => r.category === name);
test('cloud migration replaces local servers and uses an independent electricity factor', () => {
    const base = calculate(input);
    const doubled = calculate({environments: {cloud: {migratedPercent: 100, intensityGPerKwh: 107.5}}});
    assert.equal(row(base, 'Servers').usage, 0); assert.equal(row(base, 'DC cooling').usage, 0);
    assert.equal(row(doubled, 'Cloud').usage, 2 * row(base, 'Cloud').usage);
    assert.equal(row(doubled, 'Cloud').embodied, row(base, 'Cloud').embodied);
    assert.equal(row(doubled, 'Laptops').usage, row(base, 'Laptops').usage);
});
test('facility-wide cloud power is not multiplied by PUE again', () => {
    const facility = calculate({environments: {cloud: {migratedPercent: 100, energyBasis: 'facility', pue: 2}}});
    const it = calculate({environments: {cloud: {migratedPercent: 100, pue: 1}}});
    assert.equal(row(facility, 'Cloud').usage, row(it, 'Cloud').usage);
});
test('legacy cloud controls migrate without changing their calculation', () => {
    const input = {modelVersion: '1.0', compute: {'Cloud % servers in cloud': 100, 'Cloud PUE x100': 130}};
    const legacy = calculate(input);
    const modern = calculate({compatibility: 'v1', environments: {cloud: {migratedPercent: 100, pue: 1.3}}});
    assert.equal(row(legacy, 'Cloud').usage, row(modern, 'Cloud').usage);
    assert.equal(legacy.config.environments.cloud.pue, 1.3);
    assert.equal(Object.hasOwn(legacy.config.compute, 'Cloud PUE x100'), false);
});
test('impossible cloud inputs are rejected before allocating servers', () => {
    for (const cloud of [{migratedPercent: 101}, {pue: 0.9}, {lifetimeYears: 0}, {energyBasis: 'unknown'}])
        assert.throws(() => calculate({environments: {cloud}}));
});

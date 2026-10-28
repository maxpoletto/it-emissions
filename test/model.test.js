import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {calculate, createConfig, report} from '../src/model.js';

const cases = JSON.parse(await readFile(new URL('./fixtures/legacy-results.json', import.meta.url)));
export function close(actual, expected) {
    if (typeof expected === 'number') assert.ok(Math.abs(actual - expected) < 1e-8 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
    else if (Array.isArray(expected)) {assert.equal(actual.length, expected.length); expected.forEach((v, i) => close(actual[i], v));}
    else if (expected && typeof expected === 'object') for (const key of Object.keys(expected)) close(actual[key], expected[key]);
    else assert.equal(actual, expected);
}
for (const scenario of cases) test(`original calculator: ${scenario.name}`, () => {
    const result = calculate(scenario.input);
    close(result.rows, scenario.rows);
    close(result.projection, scenario.projection);
});
test('calculation does not mutate inputs or share mutable defaults', () => {
    const input = createConfig(); const before = structuredClone(input);
    calculate(input); assert.deepEqual(input, before);
    input.deviceInfo.Laptops.Count = 0;
    assert.equal(createConfig().deviceInfo.Laptops.Count, 32000);
});
test('exported configurations round trip and projection starts at the annual calculation', () => {
    const input = createConfig({referenceYear: 2030, annotation: 'Zürich + climate 🌍'});
    const result = calculate(input); const llm = result.rows.find(r => r.category === 'LLM');
    close(result.projection[0].usage, llm.usage); close(result.projection[0].embodied, llm.embodied);
    assert.equal(result.projection[0].year, 2030);
    close(calculate(report(input)).rows, result.rows);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {generatePaperResults} from '../scripts/paper-results.js';
import {loadScenario} from '../scripts/scenarios.js';

test('manuscript numbers reproduce paired device-lifetime savings and share denominators', async () => {
    const record = await generatePaperResults(undefined, {check: true});
    const expected = (32000 * 180 * (1 / 4 - 1 / 6) + 35000 * 50 * (1 / 3 - 1 / 4)) / 1000;
    assert.ok(Math.abs(record.metrics.LifetimeSavingT - expected) < 1e-8);
    assert.ok(record.metrics.CombinedWithoutAgentsPercent > record.metrics.CombinedChatPercent);
    assert.equal(record.metrics.EndUserEmbodiedPercent.toFixed(1), '52.7',
        'the revised service assumptions change the broad-footprint denominator');
    assert.ok(record.metrics.LowDeviceEmbodiedPercent < 50,
        'the low-device case must not be described as hardware accounting for a majority');
    assert.ok(Math.abs(record.metrics.AgentDefaultT - 396.72) < 1e-8);
    assert.equal('AgentCoefficient' in record.metrics, false);
});

test('missing historical validation inputs cannot silently fall back to modern defaults', async () => {
    await assert.rejects(loadScenario('report-comparison'), /Incomplete paper scenario/);
});

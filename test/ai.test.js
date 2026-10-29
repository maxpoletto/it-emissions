import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate, calculateWithRanges, createConfig, report} from '../src/model.js';
import {rowTotal} from '../src/components.js';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const rows = input => calculate(input).rows.filter(r => r.category.startsWith('AI'));

test('new scenarios default to 20% training and saved allocations remain explicit', () => {
    assert.equal(createConfig().environments.ai.trainingPercent, 20);
    assert.equal(createConfig({environments: {ai: {trainingPercent: 25}}}).environments.ai.trainingPercent, 25);
    assert.equal(createConfig({modelVersion: '1.0'}).environments.ai.trainingPercent, 25);
    assert.equal(createConfig({modelVersion: '1.0', llms: {'Training overhead %': 20}}).environments.ai.trainingPercent, 20);
});

test('chat and agents have independent populations, days and workload units', () => {
    const [chat, agents] = rows({environments: {ai: {population: 10, chatUsers: 10, queriesPerUserDay: 20,
        chatDays: 250, whPerQuery: 1, agentUsers: 2, agentDays: 100, kwhPerAgentDay: 1.5}}});
    close(chat.electricityKwh, 50); close(chat.usage, 10.35); close(chat.training, 2.07); close(chat.embodied, 5);
    close(agents.electricityKwh, 360); close(agents.usage, 74.52); close(agents.training, 14.904); close(agents.embodied, 30);
});
test('facility-wide agent input is not multiplied again and hardware uses IT energy', () => {
    const it = rows({environments: {ai: {agentUsers: 2, agentDays: 100, kwhPerAgentDay: 1.5}}})[1];
    const facility = rows({environments: {ai: {agentUsers: 2, agentDays: 100, kwhPerAgentDay: 1.8, agentEnergyBasis: 'facility'}}})[1];
    close(it.usage, facility.usage); close(it.embodied, facility.embodied);
});
test('zero-carbon inference retains hardware and user groups can overlap', () => {
    const result = rows({environments: {ai: {population: 100, chatUsers: 100, agentUsers: 100, intensityGPerKwh: 0}}});
    for (const row of result) {assert.equal(row.usage, 0); assert.equal(row.training, 0); assert.ok(row.embodied > 0);}
});
test('training is counted once in totals, range envelopes and JSON summaries', () => {
    const result = calculateWithRanges();
    close(rowTotal(result.rows.at(-1)), result.rows.slice(0, -1).reduce((n, r) => n + rowTotal(r), 0));
    const exported = report(); close(exported.results.summary.totalCombined, rowTotal(result.rows.at(-1)));
    assert.ok(result.rows.find(r => r.category === 'AI (agents)').range.high > 1000000);
    assert.equal(result.projection[0].total, rowTotal(result.rows.find(r => r.category === 'AI (chatbot)')));
});
test('zero activity, disabled AI and invalid populations are explicit', () => {
    for (const ai of [{chatUsers: 0, agentUsers: 0}, {enabled: false}])
        assert.equal(rows({environments: {ai}}).reduce((n, r) => n + rowTotal(r), 0), 0);
    assert.throws(() => calculate({environments: {ai: {population: 1}}}), /population/);
    assert.throws(() => calculate({environments: {ai: {efficiencyImprovementPercent: 101}}}));
});

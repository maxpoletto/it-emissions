import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate, calculateWithRanges, createConfig, report} from '../src/model.js';
import {rowTotal} from '../src/components.js';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const rows = input => calculate(input).rows.filter(r => r.category.startsWith('AI'));

test('new scenarios default to 20% training and 30% growth while saved assumptions remain explicit', () => {
    assert.equal(createConfig().environments.ai.trainingPercent, 20);
    assert.equal(createConfig().environments.ai.trainingGrowthPercent, 30);
    assert.equal(createConfig({environments: {ai: {trainingGrowthPercent: 50}}}).environments.ai.trainingGrowthPercent, 50);
    assert.equal(createConfig({modelVersion: '1.0'}).environments.ai.trainingGrowthPercent, 50);
    assert.equal(createConfig({modelVersion: '1.0', llms: {'Annual training growth %': 30}}).environments.ai.trainingGrowthPercent, 30);
    assert.equal(createConfig({environments: {ai: {trainingPercent: 25}}}).environments.ai.trainingPercent, 25);
    assert.equal(createConfig({modelVersion: '1.0'}).environments.ai.trainingPercent, 25);
    assert.equal(createConfig({modelVersion: '1.0', llms: {'Training overhead %': 20}}).environments.ai.trainingPercent, 20);
});

test('chat and agents have independent populations, days and workload units', () => {
    const [chat, agents] = rows({environments: {ai: {population: 10, chatUsers: 10, queriesPerUserDay: 20,
        chatDays: 250, whPerQuery: 1, agentUsers: 2, agentDays: 100, kwhPerAgentDay: 1.5}}});
    close(chat.electricityKwh, 50); close(chat.usage, 10.35); close(chat.training, 2.07); close(chat.embodied, 5);
    close(agents.electricityKwh, 300); close(agents.usage, 62.1); close(agents.training, 12.42); close(agents.embodied, 9);
});
test('chat sensitivity combines query volume and query energy without changing the central estimate', () => {
    const result = calculateWithRanges();
    const chat = result.rows.find(row => row.category === 'AI (chatbot)');
    assert.deepEqual(result.config.environments.ai.bounds.whPerQuery, [0.3, 3]);
    assert.deepEqual(result.config.environments.ai.bounds.queriesPerUserDay, [10, 30]);
    close(rowTotal(chat), 49647);
    // 38,000 users, 250 days, 10–30 queries/day and 0.3–3 facility Wh/query;
    // add 20% training to operation and 0.1 g hardware to each query.
    close(chat.range.low, 16579.4);
    close(chat.range.high, 240882);
    assert.deepEqual(result.projection[0].range, chat.range);
    for (const [bound, queriesPerUserDay, whPerQuery] of [['low', 10, 0.3], ['high', 30, 3]]) {
        const endpoint = calculate({environments: {ai: {queriesPerUserDay, whPerQuery}}});
        close(result.projection.at(-1).range[bound], endpoint.projection.at(-1).total);
    }
});
test('equivalent IT and facility inputs agree for either declared hardware denominator', () => {
    for (const agentHardwareEnergyBasis of ['it', 'facility']) {
        const common = {agentUsers: 2, agentDays: 100, agentHardwareGPerKwh: 30, agentHardwareEnergyBasis};
        const it = rows({environments: {ai: {...common, kwhPerAgentDay: 1.5, agentEnergyBasis: 'it'}}})[1];
        const facility = rows({environments: {ai: {...common, kwhPerAgentDay: 1.8, agentEnergyBasis: 'facility'}}})[1];
        close(it.usage, facility.usage); close(it.embodied, facility.embodied); close(it.training, facility.training);
    }
});
test('facility-based agent defaults apply training once and do not acquire extra PUE overhead', () => {
    const agents = rows()[1];
    close(agents.electricityKwh, 1425000);
    close(agents.usage, 294975); close(agents.training, 58995); close(agents.embodied, 42750);
    close(rowTotal(agents), 396720);
    const otherPue = rows({environments: {ai: {pue: 2}}})[1];
    for (const component of ['usage', 'training', 'embodied']) close(otherPue[component], agents[component]);
    const ranged = calculateWithRanges().rows.find(row => row.category === 'AI (agents)');
    close(ranged.range.low, 122740); close(ranged.range.high, 1700880);
});
test('saved agent configurations retain IT hardware allocation and their explicit bound set', () => {
    const saved = {modelVersion: '2.0', environments: {ai: {
        agentUsers: 3800, kwhPerAgentDay: 1.3, agentEnergyBasis: 'it', agentHardwareGPerKwh: 100,
        bounds: {whPerQuery: [0.3, 3], queriesPerUserDay: [10, 30], kwhPerAgentDay: [0.1, 2.4], agentHardwareGPerKwh: [50, 150]},
    }}};
    const result = calculateWithRanges(saved);
    assert.equal(result.config.environments.ai.agentHardwareEnergyBasis, 'it');
    assert.deepEqual(result.config.environments.ai.bounds, saved.environments.ai.bounds);
    close(rowTotal(result.rows.find(row => row.category === 'AI (agents)')), 491628.8);
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

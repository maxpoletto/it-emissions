import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {calculate} from '../src/model.js';
import {emissionsChart, projectionChart} from '../src/charts.js';
import {renderChart} from '../scripts/render.js';
import {buildApp} from '../scripts/build-app.js';

test('both chart configurations render real PNG files in Node', async () => {
    const result = calculate(); const dir = await mkdtemp(path.join(tmpdir(), 'emissions-charts-'));
    for (const [name, config] of [['annual', emissionsChart(result.rows)], ['projection', projectionChart(result.projection)]]) {
        const output = path.join(dir, name + '.png'); await renderChart(config, output);
        const bytes = await readFile(output);
        assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
        assert.equal(bytes.readUInt32BE(16), 1440); assert.equal(bytes.readUInt32BE(20), 800);
        assert.ok(bytes.length > 10000);
    }
});
test('distributed HTML matches its sources', () => buildApp({check: true}));

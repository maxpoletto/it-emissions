import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {report} from '../../src/model.js';
import {loadScenario} from '../../scripts/scenarios.js';

test('standalone file works offline, recalculates, restores URLs and exports the shared model', async () => {
    const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const browser = await chromium.launch({headless: true,
        executablePath: process.env.BROWSER_EXECUTABLE ?? (existsSync(macChrome) ? macChrome : undefined)});
    try {
        const page = await browser.newPage(); const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.route('http://**/*', route => route.abort());
        await page.route('https://**/*', route => route.abort());
        const url = new URL('../../app/emissions-calculator.html', import.meta.url).href;
        await page.goto(url);
        await page.waitForFunction(() => window.EmissionsApp?.getReport().results.data.length > 0);
        const initial = await page.evaluate(() => window.EmissionsApp.getReport());
        assert.deepEqual(initial, report(initial.parameters));
        assert.equal(await page.locator('#power-table th').count(), 2, 'only operationally active power inputs are editable');
        await page.locator('#cloud-energyBasis').selectOption('facility');
        assert.match(await page.locator('#ai-summary').textContent(), /Chat: .*agents: .*AI:/,
            'changing an environment selector preserves the refreshed summary');
        await page.locator('#saas-users').fill('100');
        await page.locator('#saas-users').dispatchEvent('change');
        assert.equal(await page.evaluate(() => window.EmissionsApp.getReport().results.data.find(r => r.category === 'Productivity SaaS').usage), 550);
        assert.equal(await page.locator('#model-error').textContent(), '');
        await page.locator('#supercomputing-electricityKwh').fill('0');
        await page.locator('#supercomputing-electricityKwh').dispatchEvent('change');
        const supercomputing = await page.evaluate(() => window.EmissionsApp.getReport().results.data.find(r => r.category === 'Supercomputing'));
        assert.equal(supercomputing.usage, 0); assert.equal(supercomputing.embodied, 0);
        await page.locator('#cloud-migratedPercent').fill('100');
        await page.locator('#cloud-migratedPercent').dispatchEvent('change');
        await page.locator('#cloud-intensityGPerKwh').fill('0');
        await page.locator('#cloud-intensityGPerKwh').dispatchEvent('change');
        const cloud = await page.evaluate(() => window.EmissionsApp.getReport().results.data.find(r => r.category === 'Cloud'));
        assert.equal(cloud.usage, 0); assert.ok(cloud.embodied > 0);
        for (const field of ['chatUsers', 'agentUsers']) {
            await page.locator('#ai-' + field).fill('0');
            await page.locator('#ai-' + field).dispatchEvent('change');
        }
        assert.match(await page.locator('#ai-summary').textContent(), /AI: 0 t/);
        await page.locator('#local-pue').fill('0.5');
        await page.locator('#local-pue').dispatchEvent('change');
        assert.match(await page.locator('#model-error').textContent(), /PUE/);
        await page.locator('#local-pue').fill('1');
        await page.locator('#local-pue').dispatchEvent('change');
        assert.equal(await page.locator('#model-error').textContent(), '');
        await page.evaluate(() => window.EmissionsApp.setConfig({referenceYear: 2026, annotation: 'Zürich + climate 🌍',
            compute: {'Cloud % servers in cloud': 100}, deviceInfo: {Laptops: {Lifetime: 8}},
            rangeInputs: [{path: ['deviceInfo', 'Laptops', 'Lifetime'], low: 4, high: 8,
                source: 'Browser integration lifetime scenario'}]}));
        const updated = await page.evaluate(() => window.EmissionsApp.getReport());
        assert.deepEqual(updated, report(updated.parameters));
        await page.reload();
        assert.deepEqual(await page.evaluate(() => window.EmissionsApp.getReport()), updated);
        await page.getByRole('button', {name: 'Reset Parameters', exact: true}).click();
        assert.equal(await page.evaluate(() => window.EmissionsApp.getConfig().deviceInfo.Laptops.Lifetime), 6);
        const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', {name: 'Export to JSON'}).click()]);
        assert.match(download.suggestedFilename(), /\.json$/);
        const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
        assert.deepEqual(exported, report(exported.parameters));
        for (const name of ['baseline', 'cloud', 'sens1', 'sens2']) {
            const {configuration} = await loadScenario(name);
            await page.evaluate(configuration => window.EmissionsApp.setConfig(configuration), configuration);
            assert.deepEqual(await page.evaluate(() => window.EmissionsApp.getReport()), report(configuration),
                'browser and paper scenario agree: ' + name);
        }
        await page.getByRole('button', {name: 'Reset Parameters', exact: true}).click();
        await mkdir(new URL('../../output/', import.meta.url), {recursive: true});
        await page.screenshot({path: fileURLToPath(new URL('../../output/standalone.png', import.meta.url)), fullPage: true});
        await page.locator('#environment-ai').screenshot({path: fileURLToPath(new URL('../../output/ai-controls.png', import.meta.url))});
        const old = {modelVersion: '1.0', llms: {'User population': 100, 'Mean daily user queries': 3}, annotation: 'Legacy'};
        await page.goto(url + '?' + new URLSearchParams({config: Buffer.from(JSON.stringify(old)).toString('base64')}));
        assert.equal(await page.evaluate(() => window.EmissionsApp.getConfig().compatibility), 'v1');
        assert.equal(await page.locator('#saas-enabled').isChecked(), false);
        assert.equal(await page.locator('#supercomputing-mode').inputValue(), 'legacyPower');
        assert.equal(await page.locator('#ai-agentUsers').inputValue(), '0');
        assert.deepEqual(errors, []);
    } finally {await browser.close();}
});

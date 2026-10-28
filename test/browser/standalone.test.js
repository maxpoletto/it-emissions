import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {report} from '../../src/model.js';

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
        await page.locator('#saas-users').fill('100');
        await page.locator('#saas-users').dispatchEvent('change');
        assert.equal(await page.evaluate(() => window.EmissionsApp.getReport().results.data.find(r => r.category === 'Productivity SaaS').usage), 550);
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
        await mkdir(new URL('../../output/', import.meta.url), {recursive: true});
        await page.screenshot({path: fileURLToPath(new URL('../../output/standalone.png', import.meta.url)), fullPage: true});
        assert.deepEqual(errors, []);
    } finally {await browser.close();}
});

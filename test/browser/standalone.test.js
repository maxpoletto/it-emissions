import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, readFile, mkdtemp} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import {report} from '../../src/model.js';
import {loadScenario} from '../../scripts/scenarios.js';
import {buildApp} from '../../scripts/build-app.js';

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

test('both deployments work offline, agree numerically, and preserve their site formatting', async () => {
    const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const browser = await chromium.launch({headless: true,
        executablePath: process.env.BROWSER_EXECUTABLE ?? (existsSync(macChrome) ? macChrome : undefined)});
    const directory = await mkdtemp(path.join(tmpdir(), 'calculator-sites-'));
    try {
        const reports = {};
        const {configuration} = await loadScenario('baseline');
        for (const deploymentEnvironment of ['uzh', 'maxp']) {
            const {output} = await buildApp({deploymentEnvironment, output: path.join(directory, deploymentEnvironment + '.html')});
            const page = await browser.newPage({viewport: {width: 1280, height: 900}});
            const errors = [], externalRequests = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.route(/^https?:/, route => {externalRequests.push(route.request().url()); return route.abort();});
            await page.goto(pathToFileURL(output).href);
            await page.waitForFunction(() => window.EmissionsApp?.getReport().results.data.length > 0);
            await page.evaluate(configuration => window.EmissionsApp.setConfig(configuration), configuration);
            reports[deploymentEnvironment] = await page.evaluate(() => window.EmissionsApp.getReport());
            const margin = await page.locator('.emissions-calculator').evaluate(element => getComputedStyle(element).marginTop);
            assert.equal(margin, deploymentEnvironment === 'uzh' ? '0px' : '20px');
            assert.equal(await page.locator('.header-with-logo').count(), deploymentEnvironment === 'maxp' ? 1 : 0);
            if (deploymentEnvironment === 'maxp') {
                await page.waitForFunction(() => document.querySelector('.uzh-logo').naturalWidth > 0);
                assert.equal(await page.locator('.header-title').textContent(), 'IT Emissions Calculator');
                const link = page.locator('.intro-text a');
                assert.equal(await link.evaluate(element => getComputedStyle(element).textDecorationLine), 'none');
                await link.hover();
                assert.equal(await link.evaluate(element => getComputedStyle(element).textDecorationLine), 'underline');
                await page.mouse.move(0, 0);
            } else {
                // Reproduce the CMS rules that motivated the original !important overrides.
                await page.evaluate(() => {
                    document.querySelector('main').classList.add('HTML');
                    const style = document.createElement('style');
                    style.textContent = '.HTML table th, .HTML table td {border: 0 !important; padding: 0 !important; vertical-align: top !important;}'
                        + '.HTML table th:first-child, .HTML table td:first-child {border-left: 0 !important;}'
                        + '.HTML table th:last-child, .HTML table td:last-child {border-right: 0 !important;}'
                        + '.HTML table {overflow: visible !important;}';
                    document.head.append(style);
                });
                for (const table of ['#device-table', '#results-table']) {
                    const first = await page.locator(table + ' td').first().evaluate(element => {
                        const style = getComputedStyle(element);
                        return {left: style.borderLeftWidth, padding: parseFloat(style.paddingTop)};
                    });
                    assert.equal(first.left, '1px'); assert.ok(first.padding > 0);
                    const last = await page.locator(table + ' tr').filter({has: page.locator('td')}).first().locator('td').last()
                        .evaluate(element => getComputedStyle(element).borderRightWidth);
                    assert.equal(last, '1px');
                }
            }
            await mkdir(new URL('../../output/', import.meta.url), {recursive: true});
            await page.screenshot({path: fileURLToPath(new URL(`../../output/deployment-${deploymentEnvironment}.png`, import.meta.url))});
            assert.deepEqual(externalRequests, [], 'fonts, scripts and the personal-site logo are embedded');
            assert.deepEqual(errors, []);
            await page.close();
        }
        assert.deepEqual(reports.uzh, reports.maxp);
        assert.deepEqual(reports.uzh, report(configuration));
    } finally {await browser.close();}
});

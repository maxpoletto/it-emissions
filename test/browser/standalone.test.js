import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, readFile, mkdtemp} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import {report, createConfig} from '../../src/model.js';
import {loadScenario} from '../../scripts/scenarios.js';
import {buildApp} from '../../scripts/build-app.js';

test('panel folding is accessible, survives redraws and bookmarks, and leaves the model unchanged', async () => {
    const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const browser = await chromium.launch({headless: true,
        executablePath: process.env.BROWSER_EXECUTABLE ?? (existsSync(macChrome) ? macChrome : undefined)});
    try {
        const page = await browser.newPage({viewport: {width: 1280, height: 1000}});
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route(/^https?:/, route => route.abort());
        const directory = await mkdtemp(path.join(tmpdir(), 'calculator-panels-'));
        const {output} = await buildApp({output: path.join(directory, 'index.html')});
        const url = pathToFileURL(output).href;
        await page.goto(url);
        await page.waitForFunction(() => window.EmissionsApp?.getReport().results.data.length > 0);
        const initial = await page.evaluate(() => window.EmissionsApp.getReport());
        const bookmark = () => JSON.parse(Buffer.from(new URL(page.url()).searchParams.get('config'), 'base64').toString('utf8'));
        const toggle = id => page.locator('#' + id + ' > .panel-heading > .panel-toggle');
        const assertDefaults = async () => {
            const panels = await page.locator('.input-section').evaluateAll(sections => sections.map(section => ({
                id: section.id, buttons: section.querySelectorAll('.panel-toggle').length,
                open: section.querySelector('.panel-toggle').getAttribute('aria-expanded'),
                arrow: section.querySelector('.panel-toggle').textContent,
                controls: section.querySelector('.panel-toggle').getAttribute('aria-controls'),
                contentId: section.querySelector('.panel-content').id,
                hidden: section.querySelector('.panel-content').hidden,
            })));
            assert.equal(panels.length, 12);
            for (const panel of panels) {
                const open = panel.id !== 'panel-duty-cycles';
                assert.equal(panel.buttons, 1, panel.id);
                assert.equal(panel.open, String(open), panel.id);
                assert.equal(panel.arrow, open ? '▼' : '◀', panel.id);
                assert.equal(panel.controls, panel.contentId, panel.id);
                assert.equal(panel.hidden, !open, panel.id);
            }
        };
        await assertDefaults();
        assert.equal(await page.locator('#duty-cycle-table').isVisible(), false);
        await toggle('panel-duty-cycles').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#duty-cycle-table').isVisible(), true);
        assert.match(await toggle('panel-duty-cycles').getAttribute('aria-label'), /^Collapse Device Duty Cycles/);
        for (const id of ['panel-device-population', 'panel-embodied', 'environment-saas', 'environment-ai']) {
            await toggle(id).click();
            assert.equal(await toggle(id).textContent(), '◀');
            assert.match(await toggle(id).getAttribute('aria-label'), /^Expand /);
        }
        assert.equal(await page.locator('#device-table').isVisible(), false);
        assert.equal(await page.locator('#panel-embodied .section-note').isVisible(), false);
        assert.equal(await page.locator('#power-table').isVisible(), true, 'neighboring panel remains open');
        assert.equal(await page.locator('#panel-compute').isVisible(), false, 'empty legacy panel stays hidden');
        assert.deepEqual(bookmark().closedPanels, ['environment-ai', 'environment-saas', 'panel-device-population', 'panel-embodied']);
        assert.deepEqual(await page.evaluate(() => window.EmissionsApp.getReport()), initial);
        assert.equal('closedPanels' in await page.evaluate(() => window.EmissionsApp.getConfig()), false);

        // Selectors rebuild all environment controls; folded panels must survive.
        await page.locator('#cloud-energyBasis').selectOption('facility');
        for (const id of ['environment-saas', 'environment-ai', 'panel-device-population', 'panel-embodied']) {
            assert.equal(await toggle(id).getAttribute('aria-expanded'), 'false');
        }
        const updated = await page.evaluate(() => window.EmissionsApp.getReport());
        await page.reload();
        assert.deepEqual(await page.evaluate(() => window.EmissionsApp.getReport()), updated);
        assert.equal(await page.locator('#environment-ai .parameter-table').isVisible(), false);
        assert.equal(await page.locator('#duty-cycle-table').isVisible(), true);
        assert.equal(await page.locator('.panel-toggle').count(), 12, 'redraws do not duplicate toggles');
        await toggle('environment-saas').focus();
        await page.keyboard.press('Space');
        assert.equal(await page.locator('#saas-users').isVisible(), true);
        while (await page.locator('.panel-toggle[aria-expanded="false"]').count()) {
            await page.locator('.panel-toggle[aria-expanded="false"]').first().click();
        }
        assert.deepEqual(bookmark().closedPanels, []);
        await page.reload();
        assert.equal(await page.locator('.panel-toggle[aria-expanded="false"]').count(), 0,
            'explicitly opening every panel is preserved, including duty cycles');

        const oldBookmark = bookmark();
        delete oldBookmark.closedPanels;
        await page.goto(url + '?' + new URLSearchParams({config: Buffer.from(JSON.stringify(oldBookmark)).toString('base64')}));
        await assertDefaults();
        assert.deepEqual(await page.evaluate(() => window.EmissionsApp.getReport()), updated);
        await toggle('panel-notes').click();
        await toggle('panel-duty-cycles').click();
        await page.getByRole('button', {name: 'Reset Parameters', exact: true}).click();
        await assertDefaults();
        assert.deepEqual(await page.evaluate(() => window.EmissionsApp.getReport()), initial);
        await toggle('panel-device-population').click();
        await toggle('panel-embodied').click();
        await mkdir(new URL('../../output/', import.meta.url), {recursive: true});
        await page.locator('#panel-notes').scrollIntoViewIfNeeded();
        await page.screenshot({path: fileURLToPath(new URL('../../output/panel-folding.png', import.meta.url))});
        assert.deepEqual(errors, []);
    } finally {await browser.close();}
});

test('standalone file works offline, recalculates, restores URLs and exports the shared model', async () => {
    const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const browser = await chromium.launch({headless: true,
        executablePath: process.env.BROWSER_EXECUTABLE ?? (existsSync(macChrome) ? macChrome : undefined)});
    try {
        const page = await browser.newPage(); const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.route('http://**/*', route => route.abort());
        await page.route('https://**/*', route => route.abort());
        const directory = await mkdtemp(path.join(tmpdir(), 'calculator-offline-'));
        const {output} = await buildApp({deploymentEnvironment: 'uzh', output: path.join(directory, 'index.html')});
        await page.clock.setFixedTime(new Date('2031-06-01T12:00:00Z'));
        const url = pathToFileURL(output).href;
        await page.goto(url);
        await page.waitForFunction(() => window.EmissionsApp?.getReport().results.data.length > 0);
        const initial = await page.evaluate(() => window.EmissionsApp.getReport());
        assert.deepEqual(initial, report(initial.parameters));
        assert.deepEqual(initial.parameters, createConfig(), 'all browser defaults agree with the shared model regardless of the calendar year');
        assert.equal(await page.locator('#saas-kgPerUserYear').inputValue(), '3');
        assert.equal(await page.getByRole('spinbutton', {name: 'Productivity cloud services (SaaS): Emissions per user-year (kg CO₂e) low assumption', exact: true}).inputValue(), '1');
        assert.equal(await page.getByRole('spinbutton', {name: 'Productivity cloud services (SaaS): Emissions per user-year (kg CO₂e) high assumption', exact: true}).inputValue(), '5');
        assert.equal(await page.locator('#supercomputing-pue').inputValue(), '1.2');
        assert.equal(await page.locator('#supercomputing-serverEquivalentKw').inputValue(), '1.5');
        assert.equal(await page.getByRole('spinbutton', {name: 'Supercomputing (CSCS): Supercomputing PUE low assumption', exact: true}).inputValue(), '1.2');
        assert.equal(await page.getByRole('spinbutton', {name: 'Supercomputing (CSCS): Supercomputing PUE high assumption', exact: true}).inputValue(), '1.2');
        assert.equal(await page.getByRole('spinbutton', {name: 'Supercomputing (CSCS): Average power per server equivalent (kW IT) low assumption', exact: true}).inputValue(), '1');
        assert.equal(await page.getByRole('spinbutton', {name: 'Supercomputing (CSCS): Average power per server equivalent (kW IT) high assumption', exact: true}).inputValue(), '2');
        const queryLow = page.getByRole('spinbutton', {name: 'Hosted AI: Queries per active user-day low assumption', exact: true});
        const queryHigh = page.getByRole('spinbutton', {name: 'Hosted AI: Queries per active user-day high assumption', exact: true});
        assert.equal(await queryLow.inputValue(), '10');
        assert.equal(await queryHigh.inputValue(), '30');
        assert.equal(await page.locator('#ai-trainingGrowthPercent').inputValue(), '30');
        assert.equal(await page.locator('#ai-kwhPerAgentDay').inputValue(), '1.5');
        assert.equal(await page.locator('#ai-agentEnergyBasis').inputValue(), 'facility');
        assert.equal(await page.locator('#ai-agentHardwareGPerKwh').inputValue(), '30');
        assert.equal(await page.locator('#ai-agentHardwareEnergyBasis').inputValue(), 'facility');
        assert.equal(await page.getByRole('spinbutton', {name: 'Hosted AI: People using agents low assumption', exact: true}).inputValue(), '1900');
        assert.equal(await page.getByRole('spinbutton', {name: 'Hosted AI: People using agents high assumption', exact: true}).inputValue(), '7600');
        await queryLow.fill('12'); await queryLow.dispatchEvent('change');
        await queryHigh.fill('25'); await queryHigh.dispatchEvent('change');
        const bounded = await page.evaluate(() => window.EmissionsApp.getReport());
        assert.equal(bounded.results.summary.totalCombined, initial.results.summary.totalCombined);
        const chatRange = result => result.results.data.find(row => row.category === 'AI (chatbot)').range;
        assert.ok(chatRange(bounded).low > chatRange(initial).low);
        assert.ok(chatRange(bounded).high < chatRange(initial).high);
        assert.deepEqual(bounded, report(bounded.parameters));
        await page.reload();
        assert.equal(await queryLow.inputValue(), '12');
        assert.equal(await queryHigh.inputValue(), '25');
        assert.deepEqual(await page.evaluate(() => window.EmissionsApp.getReport()), bounded);
        await page.evaluate(() => window.EmissionsApp.setConfig({...window.EmissionsApp.getConfig(), referenceYear: 2032}));
        await page.getByRole('button', {name: 'Reset Parameters', exact: true}).click();
        assert.equal(await queryLow.inputValue(), '10');
        assert.equal((await page.evaluate(() => window.EmissionsApp.getConfig())).referenceYear, createConfig().referenceYear);
        assert.equal(await queryHigh.inputValue(), '30');
        assert.equal(await page.locator('#power-table th').count(), 2, 'only operationally active power inputs are editable');
        await page.locator('#cloud-energyBasis').selectOption('facility');
        assert.ok(await page.locator('#results-tbody tr').count() > 0,
            'changing an environment selector preserves the main results table');
        await page.locator('#saas-users').fill('100');
        await page.locator('#saas-users').dispatchEvent('change');
        assert.equal(await page.evaluate(() => window.EmissionsApp.getReport().results.data.find(r => r.category === 'Productivity SaaS').usage), 300);
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
        // The no-agent counterfactual also needs its adoption bounds to include zero.
        const agentLow = page.getByRole('spinbutton', {name: 'Hosted AI: People using agents low assumption', exact: true});
        await agentLow.fill('0'); await agentLow.dispatchEvent('change');
        for (const field of ['chatUsers', 'agentUsers']) {
            await page.locator('#ai-' + field).fill('0');
            await page.locator('#ai-' + field).dispatchEvent('change');
        }
        const aiRows = page.locator('#results-tbody tr').filter({hasText: /^AI \((?:chatbot|agents)\)/});
        assert.equal(await aiRows.count(), 2);
        for (const row of await aiRows.all())
            assert.deepEqual((await row.locator('td').allTextContents()).slice(1, 4), ['0', '0', '0']);
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
            const fontFaces = await page.evaluate(async () => {
                for (const face of ['16px', 'italic 16px', '700 16px', 'italic 700 16px']) {
                    const loaded = await document.fonts.load(face + ' "Source Sans Pro"');
                    if (!loaded.length) throw new Error('Missing Source Sans face: ' + face);
                }
                return [...document.fonts].filter(face => face.family.includes('Source Sans Pro')).map(face => face.status);
            });
            assert.deepEqual(fontFaces, ['loaded', 'loaded', 'loaded', 'loaded']);
            for (const width of [1280, 500]) {
                await page.setViewportSize({width, height: 900});
                const typography = await page.locator('body').evaluate(element => {
                    const style = getComputedStyle(element);
                    return {family: style.fontFamily, size: style.fontSize};
                });
                assert.match(typography.family, /Source Sans Pro/);
                assert.equal(typography.size, width > 700 ? '18px' : '16px');
            }
            await page.setViewportSize({width: 1280, height: 900});
            await page.locator('#copy-url-button').evaluate(element => element.classList.add('copied'));
            // The existing button changes color through a 200 ms transition.
            await page.waitForFunction(() => getComputedStyle(document.getElementById('copy-url-button')).backgroundColor === 'rgb(40, 150, 12)');
            assert.equal(await page.locator('#copy-url-button').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(40, 150, 12)');
            await page.locator('#copy-url-button').evaluate(element => element.classList.remove('copied'));
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

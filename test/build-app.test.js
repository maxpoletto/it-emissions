import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {buildApp} from '../scripts/build-app.js';

test('deployment builds differ in presentation and contain identical application code', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'calculator-deployment-'));
    const pages = {};
    for (const deploymentEnvironment of ['uzh', 'maxp']) {
        const output = path.join(directory, deploymentEnvironment, 'index.html');
        await buildApp({deploymentEnvironment, output});
        await buildApp({deploymentEnvironment, output, check: true});
        pages[deploymentEnvironment] = await readFile(output, 'utf8');
        assert.ok(pages[deploymentEnvironment].includes(`data-deployment-environment="${deploymentEnvironment}"`));
        assert.ok(!/\{\{(?:UZH_LOGO_URL|DEPLOYMENT_ENVIRONMENT)\}\}|<!-- DEPLOYMENT_/.test(pages[deploymentEnvironment]),
            'all deployment placeholders are resolved');
    }
    assert.ok(!/<div class="header-with-logo">|<img src="data:image\/svg\+xml;base64/.test(pages.uzh), 'UZH embeds without a duplicate heading or logo');
    assert.ok(pages.maxp.includes('<div class="header-with-logo">'), 'personal site has its page header');
    assert.ok(pages.maxp.includes('<img src="data:image/svg+xml;base64,'), 'personal-site logo is embedded');
    const scripts = html => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
    assert.equal(scripts(pages.uzh).length, 1);
    const hash = value => createHash('sha256').update(value).digest('hex');
    assert.equal(hash(scripts(pages.uzh).join('')), hash(scripts(pages.maxp).join('')),
        'a deployment flag cannot select different model code or defaults');
    const output = path.join(directory, 'maxp/index.html');
    await writeFile(output, pages.maxp.replace('header-with-logo', 'changed-header'));
    await assert.rejects(buildApp({deploymentEnvironment: 'maxp', output, check: true}), /stale/);
});

test('both deployments have independent output directories and ordinary index files', async () => {
    const uzh = await buildApp({deploymentEnvironment: 'uzh'});
    const canonical = uzh.output;
    const before = await readFile(canonical, 'utf8');
    const built = await buildApp({deploymentEnvironment: 'maxp'});
    assert.ok(uzh.output.endsWith(path.join('app', 'uzh', 'index.html')));
    assert.ok(built.output.endsWith(path.join('app', 'maxp', 'index.html')));
    assert.ok(await readFile(canonical, 'utf8') === before, 'building maxp leaves the UZH output unchanged');
    for (const deploymentEnvironment of ['uzh', 'maxp']) await buildApp({deploymentEnvironment, check: true});
});

test('unknown deployment flags fail before producing an output file', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'calculator-invalid-deployment-'));
    const output = path.join(directory, 'index.html');
    await assert.rejects(buildApp({deploymentEnvironment: 'production', output}), /Choose uzh or maxp/);
    await assert.rejects(access(output), {code: 'ENOENT'});
    const script = fileURLToPath(new URL('../scripts/build-app.js', import.meta.url));
    const run = promisify(execFile);
    await assert.rejects(run(process.execPath, [script, '--deployment-environment', 'production', '--output', output]), /Choose uzh or maxp/);
    await assert.rejects(run(process.execPath, [script, '--deployment-enviroment', 'maxp', '--output', output]), /Unknown option/);
    await assert.rejects(run(process.execPath, [script, '--output', output]), /Select --deployment-environment/);
    await assert.rejects(access(output), {code: 'ENOENT'});
});

test('all four UZH Source Sans faces retain their original WOFF2 font data', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'calculator-fonts-'));
    const output = path.join(directory, 'index.html');
    await buildApp({output});
    const html = await readFile(output, 'utf8');
    const css = await readFile(new URL('../src/assets/css/main.css', import.meta.url));
    assert.ok(css.length < 16000, 'the standalone page uses the calculator subset, not the complete site framework');
    assert.ok(gzipSync(html, {level: 9}).length < 750000, 'retain the reduced single-file download size');
    assert.equal((html.match(/data:font\/woff2;base64,/g) ?? []).length, 4);
    const faces = [...html.matchAll(/@font-face\s*\{[^}]*\}/g)]
        .map(match => match[0]).filter(face => face.includes('Source Sans Pro'));
    assert.equal(faces.length, 4);
    for (const [index, file] of ['Regular', 'It', 'Semibold', 'SemiboldIt'].entries()) {
        const face = faces[index];
        assert.ok(!/format\(["']woff["']\)/.test(face), 'no duplicate WOFF fallback');
        const embedded = face.match(/data:font\/woff2;base64,([^"')\s]+)/)?.[1];
        assert.ok(embedded, 'each face is embedded for offline use');
        const original = await readFile(new URL(`../src/assets/fonts/WOFF2/SourceSans3-${file}.otf.woff2`, import.meta.url));
        assert.ok(Buffer.from(embedded, 'base64').equals(original), 'font outlines and characters are unchanged: ' + file);
    }
});

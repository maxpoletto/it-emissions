import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, copyFile, writeFile, readFile, realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

test('make retargets an existing index link when switching deployment environments', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'calculator-index-'));
    await mkdir(path.join(directory, 'app'));
    await copyFile(new URL('../app/Makefile', import.meta.url), path.join(directory, 'app/Makefile'));
    await writeFile(path.join(directory, 'package.json'), JSON.stringify({scripts: {build: 'node build.cjs'}}));
    // A small producer with the real builder's output contract isolates Make's
    // link routing from bundling; the browser tests cover the complete HTML.
    await writeFile(path.join(directory, 'build.cjs'), `
const fs = require('node:fs');
const path = require('node:path');
const environment = process.argv[process.argv.indexOf('--deployment-environment') + 1];
if (!['uzh', 'maxp'].includes(environment)) process.exit(1);
const output = environment === 'uzh' ? 'app/emissions-calculator.html' : 'output/maxp/emissions-calculator.html';
fs.mkdirSync(path.dirname(output), {recursive: true});
fs.writeFileSync(output, environment);
`);
    const run = promisify(execFile);
    const index = path.join(directory, 'app/index.html');
    for (const environment of ['uzh', 'maxp', 'uzh', 'maxp']) {
        await run('make', ['-C', 'app', '-j2', 'all', 'DEPLOYMENT_ENVIRONMENT=' + environment], {cwd: directory});
        const expected = path.join(directory, environment === 'uzh'
            ? 'app/emissions-calculator.html' : 'output/maxp/emissions-calculator.html');
        assert.equal(await realpath(index), await realpath(expected));
        assert.equal(await readFile(index, 'utf8'), environment);
    }
    await assert.rejects(run('make', ['-C', 'app', 'all', 'DEPLOYMENT_ENVIRONMENT=invalid'], {cwd: directory}));
    assert.equal(await readFile(index, 'utf8'), 'maxp', 'failed builds must not change the selected link');
});

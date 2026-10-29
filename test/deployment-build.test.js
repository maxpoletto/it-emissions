import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, copyFile, writeFile, readFile, lstat, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

test('make builds both deployment directories and keeps them independent', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'calculator-index-'));
    await mkdir(path.join(directory, 'src'));
    await copyFile(new URL('../src/Makefile', import.meta.url), path.join(directory, 'src/Makefile'));
    await copyFile(new URL('../Makefile', import.meta.url), path.join(directory, 'Makefile'));
    await writeFile(path.join(directory, 'package.json'), JSON.stringify({scripts: {build: 'node build.cjs'}}));
    // A small producer with the real builder's output contract isolates Make's
    // output routing from bundling; the browser tests cover the complete HTML.
    await writeFile(path.join(directory, 'build.cjs'), `
const fs = require('node:fs');
const path = require('node:path');
const environment = process.argv[process.argv.indexOf('--deployment-environment') + 1];
if (!['all', 'uzh', 'maxp'].includes(environment)) process.exit(1);
for (const selected of environment === 'all' ? ['uzh', 'maxp'] : [environment]) {
 const output = path.join('app', selected, 'index.html');
 fs.mkdirSync(path.dirname(output), {recursive: true});
 fs.writeFileSync(output, selected);
}
`);
    const run = promisify(execFile);
    await run('make', ['-j2', 'app'], {cwd: directory});
    for (const environment of ['uzh', 'maxp']) {
        const index = path.join(directory, 'app', environment, 'index.html');
        assert.ok((await lstat(index)).isFile(), 'deployments contain actual HTML files, not shared symlinks');
        assert.equal(await readFile(index, 'utf8'), environment);
    }
    const uzh = path.join(directory, 'app/uzh/index.html');
    await writeFile(uzh, 'unchanged');
    await run('make', ['app', 'DEPLOYMENT_ENVIRONMENT=maxp'], {cwd: directory});
    assert.equal(await readFile(uzh, 'utf8'), 'unchanged', 'building maxp does not overwrite uzh');
    await assert.rejects(run('make', ['app', 'DEPLOYMENT_ENVIRONMENT=invalid'], {cwd: directory}));
    assert.equal(await readFile(uzh, 'utf8'), 'unchanged');
    await run('make', ['-C', 'src', 'clean'], {cwd: directory});
    await assert.rejects(access(path.join(directory, 'app')), {code: 'ENOENT'});
    await access(path.join(directory, 'src/Makefile'));
});

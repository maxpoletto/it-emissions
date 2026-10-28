import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {merge, report, calculate, createConfig} from '../src/model.js';
import {environmentRanges} from '../src/environments.js';
import {compareRanges} from '../src/ranges.js';

const root = fileURLToPath(new URL('../', import.meta.url));

export async function loadScenario(name, seen = []) {
    if (!/^[a-z0-9-]+$/.test(name) || seen.includes(name)) throw new Error('Invalid or cyclic paper scenario: ' + name);
    const filename = `doc/scenarios/${name}.json`;
    const bytes = await readFile(path.join(root, filename));
    const scenario = JSON.parse(bytes);
    if (scenario.schemaVersion !== 1) throw new Error('Unsupported paper scenario schema');
    if (scenario.status === 'incomplete') throw new Error('Incomplete paper scenario: ' + name + '; see missingInputs');
    const parent = scenario.extends ? await loadScenario(scenario.extends, [...seen, name]) : {configuration: {}, sources: []};
    return {...scenario, configuration: merge(parent.configuration, scenario.configuration ?? scenario.overrides ?? {}),
        sources: [...parent.sources, {path: filename, sha256: createHash('sha256').update(bytes).digest('hex')}]};
}

export function interventionComparison(configuration, change) {
    const base = createConfig(configuration);
    return {baselineTotal: report(base).results.summary.totalCombined,
        savings: compareRanges(base, change, calculate, merge, [...environmentRanges(base), ...base.rangeInputs]),
        units: 'kg CO2e/year', method: 'Paired whole-model evaluations with shared assumptions'};
}

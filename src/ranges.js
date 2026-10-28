import {rowTotal} from './components.js';

// Deterministic envelopes over declared input bounds, not statistical intervals.
// Whole-model evaluations retain dependencies (e.g. one grid affects several rows).
export function rangeCases(config, definitions = config.rangeInputs ?? []) {
    if (definitions.length > 12) throw new Error('At most 12 bounded inputs per analysis (4096 corner cases)');
    const paths = new Set();
    for (const {path, low, high, source} of definitions) {
        if (!Array.isArray(path) || !path.length || path.some(k => typeof k !== 'string'
            || ['__proto__', 'constructor', 'prototype'].includes(k))) throw new Error('Invalid range path');
        const key = JSON.stringify(path);
        if (paths.has(key)) throw new Error('Duplicate range path: ' + path.join('.'));
        paths.add(key);
        const current = path.reduce((value, key) => value?.[key], config);
        if (![current, low, high].every(Number.isFinite) || low > high || current < low || current > high)
            throw new Error('Bounds must contain the current value: ' + path.join('.'));
        if (typeof source !== 'string' || !source.trim()) throw new Error('A range needs a source or assumption description');
    }
    if (!definitions.length) return [];
    let cases = [structuredClone(config)];
    for (const {path, low, high} of definitions) {
        cases = cases.flatMap(input => [...new Set([low, high])].map(value => {
            const copy = structuredClone(input);
            const object = path.slice(0, -1).reduce((v, k) => v[k], copy);
            object[path.at(-1)] = value;
            return copy;
        }));
    }
    return cases;
}

export function attachRanges(config, calculate, definitions = config.rangeInputs ?? []) {
    const central = calculate(config);
    const cases = rangeCases(config, definitions);
    if (!cases.length) return {...central, rangeAnalysis: null};
    const results = [central, ...cases.map(calculate)];
    function envelope(values) {
        const low = Math.min(...values), high = Math.max(...values);
        return low === high ? null : {low, high};
    }
    return {...central,
        rows: central.rows.map((row, i) => ({...row,
            range: envelope(results.map(r => rowTotal(r.rows[i])))})),
        projection: central.projection.map((row, i) => ({...row,
            range: envelope(results.map(r => r.projection[i].total))})),
        rangeAnalysis: {method: 'deterministic input bounds', interpretation: 'Assumption ranges; not confidence intervals',
            caseCount: results.length, inputs: structuredClone(definitions)},
    };
}

export function compareRanges(base, change, calculate, merge, definitions = base.rangeInputs ?? []) {
    const inputs = [base, ...rangeCases(base, definitions)];
    const savings = inputs.map(input => {
        const before = calculate(input).rows.at(-1), after = calculate(merge(input, change)).rows.at(-1);
        return rowTotal(before) - rowTotal(after);
    });
    return {central: savings[0], low: Math.min(...savings), high: Math.max(...savings)};
}

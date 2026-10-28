import {parseArgs} from 'node:util';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {calculateWithRanges, report} from '../src/model.js';
import {emissionsChart, projectionChart} from '../src/charts.js';
import {rowTotal} from '../src/components.js';
import {renderChart} from './render.js';

const {values} = parseArgs({options: {
    config: {type: 'string'}, output: {type: 'string', default: 'output/batch'},
    year: {type: 'string'}, help: {type: 'boolean'},
}});
if (values.help) {
    console.log('Usage: npm run batch -- [--config configuration.json] [--output directory] [--year 2026]');
} else {
    const input = values.config ? JSON.parse(await readFile(values.config, 'utf8')) : {};
    if (values.year) {
        const year = Number(values.year);
        if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new Error('Invalid reference year');
        (input.parameters ?? input).referenceYear = year;
    }
    const result = calculateWithRanges(input);
    await mkdir(values.output, {recursive: true});
    await writeFile(path.join(values.output, 'results.json'), JSON.stringify(report(input), null, 2) + '\n');
    await renderChart(emissionsChart(result.rows), path.join(values.output, 'emissions.png'));
    await renderChart(projectionChart(result.projection), path.join(values.output, 'projection.png'));
    console.log(`${rowTotal(result.rows.at(-1))} kg CO2e/year`);
}

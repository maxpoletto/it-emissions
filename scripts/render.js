import {Chart, registerables} from 'chart.js';
import {Canvas} from 'skia-canvas';
import {writeFile} from 'node:fs/promises';
Chart.register(...registerables);

export async function renderChart(configuration, output, {width = 1440, height = 800} = {}) {
    const canvas = new Canvas(width, height);
    const chart = new Chart(canvas, {...configuration, options: {...configuration.options,
        responsive: false, animation: false, devicePixelRatio: 1}});
    try { await writeFile(output, await canvas.toBuffer('png', {matte: 'white'})); }
    finally { chart.destroy(); }
}

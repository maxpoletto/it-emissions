export const COLORS = {embodied: 'rgba(0, 40, 165, 0.8)', usage: 'rgba(0, 40, 165, 0.5)', border: 'rgba(0, 40, 165, 1)', training: '#c5872d'};

// Bounds apply to the complete stack, not to either component independently.
export const assumptionRanges = {
    id: 'assumptionRanges',
    afterDatasetsDraw(chart, _args, options) {
        if (chart.data.datasets.some((_dataset, i) => !chart.isDatasetVisible(i))) return;
        const {ctx, scales} = chart;
        ctx.save();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1.5;
        options.bounds?.forEach((bound, i) => {
            if (!bound) return;
            const x = chart.getDatasetMeta(0).data[i]?.x;
            if (!Number.isFinite(x)) return;
            const low = scales.y.getPixelForValue(bound.low), high = scales.y.getPixelForValue(bound.high);
            ctx.beginPath();
            ctx.moveTo(x, low); ctx.lineTo(x, high);
            ctx.moveTo(x - 5, low); ctx.lineTo(x + 5, low);
            ctx.moveTo(x - 5, high); ctx.lineTo(x + 5, high);
            ctx.stroke();
        });
        ctx.restore();
    },
};

export function withRanges(configuration, rows, divisor = 1) {
    const bounds = rows.map(r => r.range ? {low: r.range.low / divisor, high: r.range.high / divisor} : null);
    if (!bounds.some(Boolean)) return configuration;
    configuration.plugins = [...(configuration.plugins ?? []), assumptionRanges];
    configuration.options.plugins.assumptionRanges = {bounds};
    configuration.options.plugins.subtitle = {display: true,
        text: 'Whiskers show assumption ranges; other uncertainty is not quantified', font: {size: 12}};
    const highest = Math.max(...bounds.filter(Boolean).map(b => b.high));
    configuration.options.scales.y.suggestedMax = highest * 1.08;
    configuration.options.plugins.tooltip = {callbacks: {
        footer(items) {
            const range = bounds[items[0]?.dataIndex];
            return range ? 'Assumption range: ' + range.low.toLocaleString() + '–' + range.high.toLocaleString() : '';
        },
    }};
    return configuration;
}

function stacked(labels, embodied, usage, {title, unit, embodiedLabel = 'Embodied', usageLabel = 'Operational', training = []}) {
    return {
        type: 'bar',
        data: {labels, datasets: [
            {label: embodiedLabel + ' (' + unit + ')', data: embodied, backgroundColor: COLORS.embodied,
                borderColor: COLORS.border, borderWidth: 1},
            ...(training.some(value => value !== 0) ? [{label: 'Training (' + unit + ')', data: training,
                backgroundColor: COLORS.training, borderColor: '#966323', borderWidth: 1}] : []),
            {label: usageLabel + ' (' + unit + ')', data: usage, backgroundColor: COLORS.usage,
                borderColor: COLORS.border, borderWidth: 1},
        ]},
        options: {responsive: true, animation: false, maintainAspectRatio: false,
            plugins: {title: {display: true, text: title, font: {size: 16, weight: 600}}, legend: {display: true}},
            scales: {x: {stacked: true}, y: {stacked: true, beginAtZero: true, title: {display: true, text: unit}}},
        },
    };
}

export function emissionsChart(rows, {divisor = 1, title = 'CO2e Emissions Breakdown', order, labels = {}} = {}) {
    let data = rows.filter(row => row.category !== 'Totals');
    if (order) data = order.map(category => data.find(r => r.category === category)).filter(Boolean);
    const unit = divisor === 1000 ? 't CO₂e/year' : 'kg CO₂e/year';
    const configuration = stacked(data.map(r => labels[r.category] ?? r.category),
        data.map(r => (r.embodied ?? 0) / divisor), data.map(r => (r.usage ?? 0) / divisor), {title, unit, training: data.map(r => (r.training ?? 0) / divisor),
            embodiedLabel: data.some(r => r.category === 'LLM') ? 'Embodied / legacy allocation' : 'Embodied'});
    return withRanges(configuration, data, divisor);
}

export function projectionChart(data, {divisor = 1, title = 'Ordinary chat growth scenario'} = {}) {
    const configuration = stacked(data.map(r => String(r.year)),
        data.map(r => divisor === 1 ? Math.round(r.embodied) : r.embodied / divisor),
        data.map(r => divisor === 1 ? Math.round(r.usage) : r.usage / divisor),
        {title, unit: divisor === 1000 ? 't CO₂e/year' : 'kg CO₂e/year',
            embodiedLabel: data.some(r => r.legacy) ? 'Training / hardware (legacy)' : 'Hardware', usageLabel: 'Inference',
            training: data.map(r => divisor === 1 ? Math.round(r.training ?? 0) : (r.training ?? 0) / divisor)});
    return withRanges(configuration, data, divisor);
}

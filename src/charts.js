export const COLORS = {embodied: 'rgba(0, 40, 165, 0.8)', usage: 'rgba(0, 40, 165, 0.5)', border: 'rgba(0, 40, 165, 1)'};

export function emissionsChart(rows) {
    const data = rows.filter(row => row.category !== 'Totals');
    const labels = data.map(d => d.category);
    const embodiedData = data.map(d => d.embodied || 0);
    const usageData = data.map(d => d.usage || 0);
    return {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Embodied (kg CO2e/y)',
                        data: embodiedData,
                        backgroundColor: COLORS.embodied,
                        borderColor: COLORS.border,
                        borderWidth: 1
                    }, {
                        label: 'Usage (kg CO2e)',
                        data: usageData,
                        backgroundColor: COLORS.usage,
                        borderColor: COLORS.border,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    animation: false,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'CO2e Emissions Breakdown',
                            font: {
                                size: 16,
                                weight: 600
                            }
                        },
                        legend: {
                            display: true
                        }
                    },
                    scales: {
                        x: {
                            stacked: true,
                            title: {
                                display: true,
                                text: 'Category'
                            }
                        },
                        y: {
                            stacked: true,
                            title: {
                                display: true,
                                text: 'kg CO2e'
                            }
                        }
                    }
                }
    };
}

export function projectionChart(projectionData) {
    const labels = projectionData.map(d => d.year.toString());
    const embodiedData = projectionData.map(d => Math.round(d.embodied));
    const usageData = projectionData.map(d => Math.round(d.usage));
    return {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Training/Embodied (kg CO2e/y)',
                        data: embodiedData,
                        backgroundColor: COLORS.embodied,
                        borderColor: COLORS.border,
                        borderWidth: 1
                    }, {
                        label: 'Usage (kg CO2e/y)',
                        data: usageData,
                        backgroundColor: COLORS.usage,
                        borderColor: COLORS.border,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    animation: false,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'LLM Emissions 5-Year Projection',
                            font: {
                                size: 16,
                                weight: 600
                            }
                        },
                        legend: {
                            display: true
                        }
                    },
                    scales: {
                        x: {
                            stacked: true,
                            title: {
                                display: true,
                                text: 'Year'
                            }
                        },
                        y: {
                            stacked: true,
                            title: {
                                display: true,
                                text: 'kg CO2e/year'
                            }
                        }
                    }
                }
    };
}

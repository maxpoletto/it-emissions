import Chart from 'chart.js/auto';
import {calculateWithRanges, createConfig, report, MODEL_VERSION, MODEL_DESCRIPTION} from './model.js';
import {deviceInfoDefault, embodiedEmissionsKgCo2eDefault, powerWDefault,
    computeDefault, llmsDefault, dutyCycle6hDefault} from './defaults.js';
import {emissionsChart, projectionChart} from './charts.js';
const BUTTON_TIMEOUT = 1000;
let rangeInputs = [];
let referenceYear = new Date().getFullYear();
let deviceInfo = {}, embodiedEmissionsKgCo2e = {}, powerW = {}, compute = {}, llms = {}, dutyCycle6h = {};
// Globals
        let stochastic = false;
        let percentage = false;
        let annotation = '';
        let devices = {};
        let emissionsIntensity = {};
        let cloudInstances = 0;
        let llmQueries = null;
        let deviceChart = null;
        let llmChart = null;

        let resultsEmissions = null;
        let resultsLLMGrowth = null;

        const tooltips = {
            columnHeaders: {
                'Count': 'Number of devices',
                'Lifetime': 'Average lifetime (y)',
                'Days per year': 'Days per year the device is used',
                'Mean': 'Mean value',
                'Stdev': 'Standard deviation',
                'Min': 'Minimum value',
                'Max': 'Maximum value',
                'Standby': 'Standby power (W)'
            },
            parameters: {
                'Campus networking overhead %': 'Campus networking energy use as percentage (x100) of energy used by laptop, desktops, and servers',
                'Campus data center PUE x100': 'Power usage effectiveness of campus data center (x100)',
                'Cloud PUE x100': 'Power usage effectiveness of cloud (x100)',
                'Cloud % servers in cloud': 'Percentage of campus servers that are migrated to cloud',
                'Cloud instances per 100 local servers': 'Number of cloud instances required to replace 100 campus servers',
                'Cloud instance embodied kg': 'Embodied emissions of a cloud instance (kg CO2e)',
                'Cloud instance power W': 'Power consumption of a cloud instance (W)',
                'Cloud instance lifetime y': 'Average lifetime of a cloud instance (y)',
                'Supercomputing mean power kW': 'Mean power consumption of workloads at supercomputing facility (kW)',
                'User population': 'Number of users',
                'Mean daily user queries': 'Mean number of queries per user per day',
                'Days per year': 'Days per year average user uses LLMs',
                'Mean query Wh': 'Mean energy consumption of a query (Wh)',
                'Training overhead %': 'Energy used for training as percentage of energy used for inference',
                'Emissions intensity g CO2e / kWh': 'Emissions intensity of electricity (g CO2e / kWh) for LLM facility',
                'Embodied emissions g CO2e / query': 'Embodied emissions per query (g CO2e)',
                'Annual usage growth %': 'Annual growth rate of LLM usage',
                'Annual efficiency growth %': 'Annual growth rate of LLM inference efficiency',
                'Annual training growth %': 'Annual growth rate of LLM training overhead',
            }
        };


function runModel() {
    const result = calculateWithRanges(serializeState());
    resultsEmissions = result.rows;
    resultsLLMGrowth = result.projection;
}
function renderEmissionsChart() {
    deviceChart?.destroy();
    deviceChart = new Chart(document.getElementById('emissions-chart'), emissionsChart(resultsEmissions));
}
function renderLLMChart() {
    llmChart?.destroy();
    llmChart = new Chart(document.getElementById('llm-projection-chart'), projectionChart(resultsLLMGrowth));
}
// Generate multi-column collapsible input tables
        function createCollapsibleTable(tableId, data, all_params, default_display_params, callback) {
            const table = document.getElementById(tableId);
            table.innerHTML = '';

            // Check that each row of data contains all_params
            Object.keys(data).forEach(key => {
                all_params.forEach(param => {
                    if (!data[key].hasOwnProperty(param)) {
                        throw new Error(`Data does not contain parameter ${param}`);
                    }
                });
            });

            // Headers for all_params, but only display default_display_params
            const headerRow = document.createElement('tr');
            headerRow.appendChild(document.createElement('th')); // Empty cell for row
            all_params.forEach(param => {
                const th = document.createElement('th');
                th.textContent = param;

                // Add tooltip if defined (even if empty, for visual indication)
                if (tooltips.columnHeaders.hasOwnProperty(param)) {
                    th.setAttribute('data-tooltip', tooltips.columnHeaders[param]);
                }

                headerRow.appendChild(th);
                if (!default_display_params.includes(param)) {
                    th.className = 'additional-headers';
                }
            });
            table.appendChild(headerRow);

            // Create rows
            Object.keys(data).forEach(key => {
                const row = document.createElement('tr');

                // Row name cell
                const deviceCell = document.createElement('td');
                deviceCell.textContent = key;
                row.appendChild(deviceCell);

                all_params.forEach(param => {
                    const cell = document.createElement('td');
                    if (!default_display_params.includes(param)) {
                        cell.className = 'additional-columns';
                    }
                    const input = document.createElement('input');
                    input.type = 'number';
                    input.value = data[key][param] || 0;
                    input.addEventListener('change', (e) => {
                        data[key][param] = parseFloat(e.target.value) || 0;
                        if (callback) callback();
                    });
                    cell.appendChild(input);
                    row.appendChild(cell);
                });
                table.appendChild(row);
            });
        }

        // Create key-value input tables
        function createKeyValueTable(tableId, data, callback) {
            const table = document.getElementById(tableId);
            table.innerHTML = '';

            // Create header
            const headerRow = document.createElement('tr');
            headerRow.innerHTML = '<th>Parameter</th><th>Value</th>';
            table.appendChild(headerRow);

            // Create rows for each parameter
            Object.keys(data).forEach(paramKey => {
                const row = document.createElement('tr');

                // Parameter name cell
                const keyCell = document.createElement('td');
                keyCell.textContent = paramKey;

                // Add tooltip if defined (even if empty, for visual indication)
                if (tooltips.parameters.hasOwnProperty(paramKey)) {
                    keyCell.setAttribute('data-tooltip', tooltips.parameters[paramKey]);
                }

                row.appendChild(keyCell);

                // Value input cell
                const valueCell = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'number';
                input.value = data[paramKey];
                input.addEventListener('change', (e) => {
                    data[paramKey] = parseFloat(e.target.value) || 0;
                    if (callback) callback();
                });
                valueCell.appendChild(input);
                row.appendChild(valueCell);

                table.appendChild(row);
            });
        }

        // Create duty cycle table with 4 time periods per device
        function createDutyCycleTable(tableId, data, callback) {
            const table = document.getElementById(tableId);
            table.innerHTML = '';

            const timePeriods = ['Night (0:00-5:59)', 'Morning (6:00-11:59)', 'Afternoon (12:00-17:59)', 'Evening (18:00-23:59)'];

            // Create header row
            const headerRow = document.createElement('tr');
            headerRow.appendChild(document.createElement('th')); // Empty cell for device names

            timePeriods.forEach(period => {
                const th = document.createElement('th');
                th.textContent = period;
                headerRow.appendChild(th);
            });
            table.appendChild(headerRow);

            // Create rows for each device type
            Object.keys(data).forEach(deviceType => {
                const row = document.createElement('tr');

                // Device name cell
                const deviceCell = document.createElement('td');
                deviceCell.textContent = deviceType;
                row.appendChild(deviceCell);

                // Create input for each time period
                data[deviceType].forEach((value, index) => {
                    const cell = document.createElement('td');

                    const input = document.createElement('input');
                    input.type = 'number';
                    input.step = '0.01';
                    input.min = '0';
                    input.max = '1';
                    input.value = value;
                    input.addEventListener('change', (e) => {
                        const newValue = parseFloat(e.target.value);
                        if (newValue >= 0 && newValue <= 1) {
                            data[deviceType][index] = newValue;
                            if (callback) callback();
                        } else {
                            e.target.value = value; // Reset to previous value if invalid
                        }
                    });

                    cell.appendChild(input);
                    row.appendChild(cell);
                });

                table.appendChild(row);
            });
        }

        function toggleTableExpansion(tableId) {
            const table = document.getElementById(tableId);
            const toggle = document.getElementById(tableId.replace('-table', '-toggle'));

            const additionalHeaders = table.querySelectorAll('.additional-headers');
            const additionalColumns = table.querySelectorAll('.additional-columns');

            const isExpanded = additionalHeaders.length > 0 && additionalHeaders[0].classList.contains('visible');

            if (isExpanded) {
                // Collapse
                additionalHeaders.forEach(el => el.classList.remove('visible'));
                additionalColumns.forEach(el => el.classList.remove('visible'));
                toggle.textContent = '>>';
            } else {
                // Expand
                additionalHeaders.forEach(el => el.classList.add('visible'));
                additionalColumns.forEach(el => el.classList.add('visible'));
                toggle.textContent = '<<';
            }
        }

        function toggleDutyCycleTable() {
            const table = document.getElementById('duty-cycle-table');
            const toggle = document.getElementById('duty-cycle-toggle');

            if (table.style.display === 'none') {
                // Show table
                table.style.display = '';
                toggle.textContent = '<<';
            } else {
                // Hide table
                table.style.display = 'none';
                toggle.textContent = '>>';
            }
        }

        function togglePercentage() {
            percentage = !percentage;
            renderEmissionsTable()
            updateURL();
        }

        function updateAnnotation() {
            annotation = document.getElementById('annotation-input').value;
            updateURL();
        }

        function copyToClipboard(button) {
            function fallbackCopy(text, button) {
                // For older browsers or non-secure contexts
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    const ok = document.execCommand('copy');
                    if (ok) {
                        button.classList.add('copied');
                        setTimeout(() => {
                            button.classList.remove('copied');
                        }, BUTTON_TIMEOUT);
                    } else {
                        alert('Failed to copy URL to clipboard');
                    }
                } catch (err) {
                   alert('Failed to copy URL to clipboard ' + err);
                }

                document.body.removeChild(textArea);
            }

            const currentUrl = window.location.href;

            // Use the modern Clipboard API if available
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(currentUrl).then(() => {
                    button.classList.add('copied');
                    setTimeout(() => {
                        button.classList.remove('copied');
                    }, BUTTON_TIMEOUT);
                }).catch(err => {
                    fallbackCopy(currentUrl, button);
                });
            } else {
                fallbackCopy(currentUrl, button);
            }
        }

        function exportResults() {
            // Create and download JSON file
            const jsonString = JSON.stringify(report(serializeState()), null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `it-emissions-model-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function createInputTables() {
            createCollapsibleTable('device-table', deviceInfo, ['Count', 'Lifetime', 'Days per year'], ['Count', 'Lifetime', 'Days per year'], updateModel);
            createCollapsibleTable('embodied-table', embodiedEmissionsKgCo2e, ['Mean', 'Stdev', 'Min', 'Max'], ['Mean'], updateModel);
            createCollapsibleTable('power-table', powerW, ['Mean', 'Stdev', 'Min', 'Max', 'Standby'], ['Mean', 'Standby'], updateModel);
            createDutyCycleTable('duty-cycle-table', dutyCycle6h, updateModel);
            createKeyValueTable('compute-table', compute, updateModel);
            createKeyValueTable('llm-table', llms, updateModel);
        }

        function renderEmissionsTable() {
            const data = resultsEmissions;
            const thead = document.getElementById('results-thead');
            thead.innerHTML = '';
            thead.innerHTML = `
                <tr>
                    <th>Category</th>
                    <th>Embodied<br>(${percentage ? '%' : 'kg CO2e'})</th>
                    <th>Usage<br>(${percentage ? '%' : 'kg CO2e'})</th>
                </tr>
            `;

            const totalsRow = data[data.length - 1];
            const combined = Math.round(totalsRow.embodied + totalsRow.usage);

            const tbody = document.getElementById('results-tbody');
            tbody.innerHTML = '';
            data.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.category}</td>
                    <td>${row.embodied !== null ? (percentage ? Math.round(row.embodied / combined * 100) : Math.round(row.embodied)) : ''}</td>
                    <td>${percentage ? Math.round(row.usage / combined * 100) : Math.round(row.usage)}</td>
                `;
                tbody.appendChild(tr);
            });

            const tfoot = document.getElementById('results-tfoot');
            tfoot.innerHTML = `
                <tr><td>Combined total</td><td colspan="2">${percentage ? Math.round(combined / combined * 100) : Math.round(combined)}</td></tr>
            `;
        }

        function renderOutput() {
            document.getElementById('percentage-checkbox').checked = percentage;
            renderEmissionsTable();
            renderEmissionsChart();
            renderLLMChart();
        }

        function resetParameters() {
            deviceInfo = JSON.parse(JSON.stringify(deviceInfoDefault));
            embodiedEmissionsKgCo2e = JSON.parse(JSON.stringify(embodiedEmissionsKgCo2eDefault));
            powerW = JSON.parse(JSON.stringify(powerWDefault));
            compute = JSON.parse(JSON.stringify(computeDefault));
            llms = JSON.parse(JSON.stringify(llmsDefault));
            dutyCycle6h = JSON.parse(JSON.stringify(dutyCycle6hDefault));
            percentage = false;
            rangeInputs = [];
            annotation = '';

            document.getElementById('annotation-input').value = '';
            createInputTables();
            updateModel();
        }

        function serializeState() {
            return {
                modelVersion: MODEL_VERSION, referenceYear, rangeInputs,
                deviceInfo: deviceInfo,
                embodiedEmissionsKgCo2e: embodiedEmissionsKgCo2e,
                powerW: powerW,
                dutyCycle6h: dutyCycle6h,
                compute: compute,
                llms: llms,
                percentage: percentage,
                annotation: annotation
            };
        }

        function deserializeState(stateObj) {
    const loaded = createConfig(stateObj);
    ({deviceInfo, embodiedEmissionsKgCo2e, powerW, compute, llms, dutyCycle6h,
        referenceYear, rangeInputs, percentage, annotation} = loaded);
}

function updateURL() {
            const state = serializeState();
            const stateJson = JSON.stringify(state);
            const base64State = btoa(String.fromCharCode(...new TextEncoder().encode(stateJson))); // Base64 encode to avoid quoting issues
            const newUrl = window.location.pathname + '?' + new URLSearchParams({config: base64State});

            // Update URL without triggering page reload
            window.history.replaceState(null, '', newUrl);
        }

        function parseURL() {
            const urlParams = new URLSearchParams(window.location.search);
            const configParam = urlParams.get('config');

            if (configParam) {
                try {
                    const decodedState = new TextDecoder().decode(Uint8Array.from(atob(configParam.replaceAll(' ', '+')), c => c.charCodeAt(0))); // Base64 decode
                    const stateObj = JSON.parse(decodedState);
                    deserializeState(stateObj);
                    createInputTables();
                    updateModel();
                    document.getElementById('annotation-input').value = annotation;
                    console.log('Loaded configuration from URL');
                } catch (error) {
                    console.warn('Failed to parse URL configuration:', error);
                }
            } else {
                resetParameters();
            }
        }

        function updateModel() {
            runModel();
            renderOutput();
            updateURL();
        }

        window.onload = function() {
            deserializeState({referenceYear});
            parseURL();
        };

Object.assign(window, {copyToClipboard, exportResults, resetParameters, toggleDutyCycleTable, togglePercentage, updateAnnotation, updateModel});
window.EmissionsApp = {
    getConfig: () => createConfig(serializeState()),
    getReport: () => report(serializeState()),
    setConfig: input => {deserializeState(input); createInputTables(); updateModel();
        document.getElementById('annotation-input').value = annotation;},
};

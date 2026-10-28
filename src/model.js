import {deviceInfoDefault, embodiedEmissionsKgCo2eDefault, powerWDefault,
    computeDefault, llmsDefault, dutyCycle6hDefault, GRID_PROFILE} from './defaults.js';
import {attachRanges} from './ranges.js';
import {ENVIRONMENT_DEFAULTS, validateEnvironments, environmentRanges, CLOUD_LEGACY_KEYS, facilityMultiplier} from './environments.js';

export const MODEL_VERSION = '2.0';
export const MODEL_DESCRIPTION = 'UZH IT Emissions Model';
export const clone = value => JSON.parse(JSON.stringify(value));

export function merge(base, patch) {
    const result = clone(base);
    for (const [key, value] of Object.entries(patch ?? {})) {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Invalid configuration key');
        result[key] = value && typeof value === 'object' && !Array.isArray(value)
            && result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])
            ? merge(result[key], value) : clone(value);
    }
    return result;
}

export function createConfig(input = {}) {
    const raw = input.parameters ? {...input.parameters, ...input.settings, annotation: input.metadata?.annotation ?? ''} : input;
    const legacy = raw.compatibility === 'v1' || raw.modelVersion === '1.0';
    const environments = clone(ENVIRONMENT_DEFAULTS);
    if (legacy) environments.saas.enabled = false;
    if (raw.compute?.['Campus data center PUE x100'] !== undefined)
        environments.local.pue = raw.compute['Campus data center PUE x100'] / 100;
    for (const [old, key] of Object.entries(CLOUD_LEGACY_KEYS)) {
        if (raw.compute?.[old] !== undefined) environments.cloud[key] = raw.compute[old] / (old === 'Cloud PUE x100' ? 100 : 1);
    }
    const config = merge({
        modelVersion: MODEL_VERSION, referenceYear: 2026, annotation: '', percentage: false, rangeInputs: [],
        deviceInfo: deviceInfoDefault, embodiedEmissionsKgCo2e: embodiedEmissionsKgCo2eDefault,
        powerW: powerWDefault, compute: computeDefault, llms: llmsDefault, dutyCycle6h: dutyCycle6hDefault,
        environments,
    }, raw);
    for (const key of Object.keys(CLOUD_LEGACY_KEYS)) delete config.compute[key];
    delete config.compute['Campus data center PUE x100'];
    config.modelVersion = MODEL_VERSION;
    config.compatibility = legacy ? 'v1' : null;
    return config;
}

export function calculate(input = {}) {
    const config = createConfig(input);
    validateEnvironments(config.environments);
    for (const [device, info] of Object.entries(config.deviceInfo)) {
        if (!Number.isInteger(info.Count) || info.Count < 0 || !Number.isFinite(info.Lifetime) || info.Lifetime <= 0
            || !Number.isFinite(info['Days per year']) || info['Days per year'] < 0 || info['Days per year'] > 366)
            throw new Error('Invalid count, lifetime or operating days for ' + device);
        if (!Number.isFinite(config.powerW[device]?.Mean) || config.powerW[device].Mean < 0
            || !Number.isFinite(config.embodiedEmissionsKgCo2e[device]?.Mean) || config.embodiedEmissionsKgCo2e[device].Mean < 0)
            throw new Error('Invalid power or embodied emissions for ' + device);
        if (!Array.isArray(config.dutyCycle6h[device]) || config.dutyCycle6h[device].length !== 4
            || config.dutyCycle6h[device].some(v => !Number.isFinite(v) || v < 0 || v > 1))
            throw new Error('Duty cycles must contain four fractions from 0 to 1 for ' + device);
    }
    const {deviceInfo, embodiedEmissionsKgCo2e, powerW, compute, llms, dutyCycle6h, referenceYear} = config;
    const stochastic = false;
    let devices = {}, emissionsIntensity = {}, cloudInstances = 0, resultsEmissions, resultsLLMGrowth;
    class Emissions {
                static gco2PerKwhByHours = {
                    'ch': GRID_PROFILE
                };

                static atHour(hour, country) {
                    const local = config.environments.local;
                const mean = GRID_PROFILE.reduce((a, b) => a + b, 0) / GRID_PROFILE.length;
                return local.useHourlyProfile ? GRID_PROFILE[Math.floor(hour / 2)] * local.intensityGPerKwh / mean : local.intensityGPerKwh;
                }

                static mean(country) {
                    const values = this.gco2PerKwhByHours[country];
                    return config.environments.local.intensityGPerKwh;
                }
            }
    function truncatedNormal(mu, sigma, minValue, maxValue, n) {
                if (n === 0) return [];
                if (!stochastic) return Array(1).fill(n * mu);

                const results = [];
                let value;
                for (let i = 0; i < n; i++) {
                    do {
                        // Box-Muller transform for normal distribution
                        // https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve
                        const u = 1 - Math.random(); // Tranform [0, 1) to (0, 1] to not break Math.log.
                        const v = Math.random();
                        const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
                        value = mu + sigma * z;
                    } while (value < minValue || value > maxValue);
                    results.push(Math.floor(value));
                }
                return results;
            }


    function deviceEmissionsIntensity(device) {
                const dutyCycle = dutyCycle6h[device];
                const r = Math.floor(24 / dutyCycle.length);
                const ei = [];
                for (let i = 0; i < 24; i++) {
                    const cycleIndex = Math.floor(i / r);
                    const duty = dutyCycle[cycleIndex];
                    const emission = Emissions.atHour(i, 'ch');
                    ei.push(duty * emission);
                }
                return ei;
            }

            function averageEmissionsKgCO2ePerDay(powerW) {
                return Emissions.mean('ch') / 1000 * (powerW / 1000) * 24; // (g CO2e / kWh) / 1000 * kW * 24 h = kg CO2e / day
            }

            // Generate device instances
            function generateDevices() {
                devices = {};
                emissionsIntensity = {};

                Object.keys(deviceInfo).forEach(device => {
                    devices[device] = {};

                    let n = deviceInfo[device]['Count'];
                    if (device === 'Servers') {
                        cloudInstances = Math.floor((config.environments.cloud.enabled ? config.environments.cloud.migratedPercent : 0) * n / 100);
                        n -= cloudInstances;
                    }

                    const stats = embodiedEmissionsKgCo2e[device];
                    devices[device]['annual_embodied_emissions'] = truncatedNormal(
                        stats['Mean'], stats['Stdev'], stats['Min'], stats['Max'], n
                    ).map(x => x / deviceInfo[device]['Lifetime']);

                    devices[device]['power_w'] = truncatedNormal(
                        powerW[device]['Mean'], powerW[device]['Stdev'],
                        powerW[device]['Min'], powerW[device]['Max'], n
                    );

                    // Standby was not used by the original calculation. Avoid allocating
                    // a device-sized unused array for every deterministic range case.
                    emissionsIntensity[device] = deviceEmissionsIntensity(device);
                });
            }

            function deviceElectricityKwh(device) {
            const power = devices[device].power_w.reduce((a, b) => a + b, 0) / 1000;
            const duty = dutyCycle6h[device];
            return power * duty.reduce((a, b) => a + b, 0) * (24 / duty.length) * deviceInfo[device]['Days per year'];
        }

        // Calculate device emissions
            function deviceEmissionsKgCO2e(device) {
                const intensitySum = emissionsIntensity[device].reduce((a, b) => a + b, 0); // g CO2e (for 24 h for 1 kW * duty cycle)
                const powerSum = devices[device]['power_w'].reduce((a, b) => a + b, 0); // W for all devices
                const u = powerSum * intensitySum * deviceInfo[device]['Days per year'] / (1000 * 1000); // convert to kg CO2e / year
                const m = devices[device]['annual_embodied_emissions'].reduce((a, b) => a + b, 0);
                return [u, m];
            }

            // Calculate data center cooling emissions
            function dataCenterCoolingEmissionsKgCO2e() {
                const [serverU, _] = deviceEmissionsKgCO2e('Servers');
                const dcCoolingU = serverU * (facilityMultiplier(config.environments.local) - 1);
                return dcCoolingU;
            }

            // Calculate cloud emissions
            function cloudEmissionsKgCO2e() {
            const cloud = config.environments.cloud;
            const n = cloudInstances * cloud.instancesPer100Servers / 100;
            const electricity = n * cloud.powerWatts / 1000 * 24 * 365 * facilityMultiplier(cloud);
            const u = electricity * cloud.intensityGPerKwh / 1000;
            const m = n * cloud.embodiedKg / cloud.lifetimeYears;
            return [u, m];
        }

        // Calculate supercomputing emissions
            function supercomputingEmissionsKgCO2e() {
                return averageEmissionsKgCO2ePerDay(compute['Supercomputing mean power kW'] * 1000) * 365;
            }

            // Calculate LLM emissions
            function llmEmissionsKgCO2e() {
                const emissionsIntensity = llms['Emissions intensity g CO2e / kWh'];
                const dailyQueries = llms['Mean daily user queries'] * llms['User population'];
                const annualQueries = dailyQueries * llms['Days per year'];
                // Divide by 1000 to convert Wh to kWh and by 1000 again to convert g CO2e to kg CO2e.
                const u = annualQueries * llms['Mean query Wh'] * emissionsIntensity / (1000 * 1000);
                const m = u * llms['Training overhead %'] / 100 + annualQueries * llms['Embodied emissions g CO2e / query'] / 1000;
                return [u, m];
            }

            // Calculate LLM emissions projection over 5 years
            function llmEmissionsProjection() {
                const baseDailyQueries = llms['Mean daily user queries'] * llms['User population'];
                const baseEnergyPerQuery = llms['Mean query Wh'];
                const emissionsIntensity = llms['Emissions intensity g CO2e / kWh'];
                const trainingOverhead = llms['Training overhead %'] / 100;
                const embodiedPerQuery = llms['Embodied emissions g CO2e / query'];
                const usageGrowth = llms['Annual usage growth %'] / 100;
                const efficiencyGrowth = llms['Annual efficiency growth %'] / 100;
                const trainingGrowth = llms['Annual training growth %'] / 100;

                let dailyQueries = baseDailyQueries;
                let trainingEmissions = 0;
                let energyPerQuery = baseEnergyPerQuery;
                const projection = [];
                for (let year = 0; year < 5; year++) {
                    const annualQueries = dailyQueries * llms['Days per year'];
                    const usageEmissions = annualQueries * energyPerQuery * emissionsIntensity / (1000 * 1000);
                    if (year === 0) {
                        trainingEmissions = usageEmissions * trainingOverhead;
                    } else {
                        trainingEmissions = trainingEmissions * (1 + trainingGrowth);
                    }
                    const embodiedEmissions = trainingEmissions + annualQueries * embodiedPerQuery / 1000;
                    const totalEmissions = usageEmissions + embodiedEmissions;

                    projection.push({
                        year: referenceYear + year,
                        usage: usageEmissions,
                        embodied: embodiedEmissions,
                        total: totalEmissions
                    });

                    dailyQueries *= 1 + usageGrowth;
                    energyPerQuery *= 1 - efficiencyGrowth;
                }

                return projection;
            }

            function runModel() {
                generateDevices();

                let totalU = 0, totalM = 0;
                const data = [];

                // Device emissions
                Object.keys(deviceInfo).forEach(device => {
                    const [u, m] = deviceEmissionsKgCO2e(device);
                    totalU += u;
                    totalM += m;
                    data.push({
                        category: device,
                        embodied: m,
                        usage: u,
                        electricityKwh: deviceElectricityKwh(device)
                    });
                });

                // Campus networking overhead
                let nu = 0, nm = 0;
                ['Laptops', 'Desktops', 'Servers'].forEach(device => {
                    const [u, m] = deviceEmissionsKgCO2e(device);
                    nu += u * compute['Campus networking overhead %'] / 100;
                    nm += m * compute['Campus networking overhead %'] / 100;
                });
                totalU += nu;
                totalM += nm;
                data.push({
                    category: 'Campus networking',
                    embodied: nm,
                    usage: nu
                });

                // DC cooling
                const dcCoolingU = dataCenterCoolingEmissionsKgCO2e();
                data.push({
                    category: 'DC cooling',
                    embodied: null,
                    usage: dcCoolingU,
                    electricityKwh: deviceElectricityKwh('Servers') * (facilityMultiplier(config.environments.local) - 1)
                });
                totalU += dcCoolingU;

                // Cloud
                const [cloudU, cloudM] = cloudEmissionsKgCO2e();
                data.push({
                    category: 'Cloud',
                    embodied: cloudM,
                    usage: cloudU,
                    electricityKwh: cloudInstances * config.environments.cloud.instancesPer100Servers / 100
                        * config.environments.cloud.powerWatts / 1000 * 8760 * facilityMultiplier(config.environments.cloud)
                });
                totalU += cloudU;
                totalM += cloudM;

                // Supercomputing
                const supercomputingU = supercomputingEmissionsKgCO2e();
                data.push({
                    category: 'Supercomputing',
                    embodied: null,
                    usage: supercomputingU
                });
                totalU += supercomputingU;

                // LLM
                const [llmU, llmM] = llmEmissionsKgCO2e();
                data.push({
                    category: 'LLM',
                    embodied: llmM,
                    usage: llmU
                });
                totalU += llmU;
                totalM += llmM;

                if (config.environments.saas.enabled) {
                const service = config.environments.saas;
                const usage = service.users * service.kgPerUserYear;
                data.push({category: 'Productivity SaaS', usage, embodied: null});
                totalU += usage;
            }

            // Total
                data.push({
                    category: 'Totals',
                    embodied: totalM,
                    usage: totalU
                });
                resultsEmissions = data;
                resultsLLMGrowth = llmEmissionsProjection();
            }


    runModel();
    return {modelVersion: MODEL_VERSION, units: {emissions: 'kg CO2e/year', electricity: 'kWh/year'},
        config, rows: resultsEmissions, projection: resultsLLMGrowth};
}

export function report(input = {}) {
    const result = calculateWithRanges(input);
    const totals = result.rows.at(-1);
    return {
        metadata: {modelVersion: MODEL_VERSION, description: MODEL_DESCRIPTION,
            annotation: result.config.annotation, referenceYear: result.config.referenceYear},
        parameters: result.config,
        results: {data: result.rows.slice(0, -1), projection: result.projection,
            summary: {totalEmbodied: totals.embodied, totalUsage: totals.usage,
                totalCombined: totals.embodied + totals.usage, range: totals.range ?? null}},
        units: result.units, rangeAnalysis: result.rangeAnalysis,
    };
}

export function calculateWithRanges(input = {}) {
    const config = createConfig(input);
    return attachRanges(config, calculate, [...environmentRanges(config), ...config.rangeInputs]);
}

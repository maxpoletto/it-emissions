export const ENVIRONMENT_DEFAULTS = {
    saas: {enabled: true, users: 38000, kgPerUserYear: 3,
        bounds: {kgPerUserYear: [1, 5]},
        source: 'Order-of-magnitude productivity SaaS assumption: 1–5 kg CO₂e/user-year, anchored to a cloud-storage proxy; not tenant measurements'},
    cloud: {enabled: true, migratedPercent: 0, instancesPer100Servers: 100, powerWatts: 300,
        embodiedKg: 700, lifetimeYears: 4, pue: 1.15, intensityGPerKwh: 53.75,
        energyBasis: 'it', bounds: {}, source: 'Cloud VM proxy and selected serving-region electricity factor'},
    local: {enabled: true, pue: 2, intensityGPerKwh: 53.75, useHourlyProfile: true,
        energyBasis: 'it', bounds: {}, source: 'Campus electricity profile and local data-center PUE assumption'},
    networking: {enabled: true, mode: 'inventory', accessPoints: 4000, accessPointWatts: 15,
        accessPointEmbodiedKg: 50, switchesPerAccessPoint: 0.1, switchWatts: 250,
        switchEmbodiedKg: 290, lifetimeYears: 8, electricityScale: 1, legacyPercent: 10,
        bounds: {electricityScale: [0.67, 1.33]},
        source: 'Paper network inventory proxy; ±33% operational allowance for incomplete inventory; hardware bounds unquantified'},
    supercomputing: {enabled: true, mode: 'allocation', electricityKwh: 3600000, energyBasis: 'it',
        pue: 1.2, intensityGPerKwh: 50, serverEquivalentKw: 1.5, embodiedKgPerServer: 1100,
        lifetimeYears: 5, legacyPowerKw: 66, bounds: {pue: [1.2, 1.2], serverEquivalentKw: [1, 2]},
        source: 'CSCS 3.6 GWh/year allocation treated as compute-only; PUE fixed at 1.2 by default based on the CSCS efficiency report; server-equivalent power 1.5 kW (1–2); allocation uncertainty unquantified'},
    ai: {enabled: true, population: 38000, intensityGPerKwh: 207, pue: 1.2,
        chatUsers: 38000, queriesPerUserDay: 15, chatDays: 250, whPerQuery: 1,
        chatEnergyBasis: 'facility', chatHardwareGPerQuery: 0.1,
        agentUsers: 3800, agentDays: 250, kwhPerAgentDay: 1.5, agentEnergyBasis: 'facility',
        agentHardwareGPerKwh: 30, agentHardwareEnergyBasis: 'facility',
        trainingPercent: 20, usageGrowthPercent: 50, efficiencyImprovementPercent: 30, trainingGrowthPercent: 50,
        bounds: {whPerQuery: [0.3, 3], queriesPerUserDay: [10, 30], agentUsers: [1900, 7600],
            kwhPerAgentDay: [1, 3], agentHardwareGPerKwh: [10, 50]},
        source: 'Paper chat energy/query-volume and agent facility-inference energy/hardware scenarios; agent adoption 5–20% of 38,000 people is illustrative, not measured'},
};

export const ENVIRONMENT_FIELDS = {
    saas: {title: 'Productivity cloud services (SaaS)',
        note: 'A rough emissions estimate per user. Provider overhead is already implicit; no extra cooling multiplier is applied.',
        fields: [
            {key: 'enabled', label: 'Include productivity services', type: 'boolean'},
            {key: 'users', label: 'Users', min: 0, integer: true},
            {key: 'kgPerUserYear', label: 'Emissions per user-year (kg CO₂e)', min: 0},
        ]},
    cloud: {title: 'Cloud compute',
        note: 'Migrates a share of local servers to cloud instances. Choose the electricity factor for the serving region independently of the campus grid.',
        fields: [
            {key: 'enabled', label: 'Enable cloud migration', type: 'boolean'},
            {key: 'migratedPercent', label: 'Local servers migrated (%)', min: 0, max: 100},
            {key: 'instancesPer100Servers', label: 'Cloud instances per 100 local servers', min: 0},
            {key: 'powerWatts', label: 'Allocated power per cloud instance (W)', min: 0},
            {key: 'energyBasis', label: 'Power estimate includes', type: 'select', options: {it: 'IT equipment only', facility: 'IT equipment and facility overhead'}},
            {key: 'pue', label: 'Power usage effectiveness (PUE)', min: 1},
            {key: 'intensityGPerKwh', label: 'Electricity emissions intensity (g CO₂e/kWh)', min: 0},
            {key: 'embodiedKg', label: 'Embodied emissions per instance (kg CO₂e)', min: 0},
            {key: 'lifetimeYears', label: 'Hardware lifetime (years)', min: 0.01},
        ]},
    local: {title: 'Campus electricity and local data center',
        note: 'The campus factor applies to local devices and servers. Server count, power and lifetime are in the device tables. PUE adds facility overhead to server electricity only.',
        fields: [
            {key: 'intensityGPerKwh', label: 'Mean campus electricity intensity (g CO₂e/kWh)', min: 0},
            {key: 'useHourlyProfile', label: 'Preserve the Swiss hourly profile', type: 'boolean'},
            {key: 'energyBasis', label: 'Server power estimate includes', type: 'select', options: {it: 'IT equipment only', facility: 'IT equipment and facility overhead'}},
            {key: 'pue', label: 'Local data-center PUE', min: 1},
        ]},
    networking: {title: 'Campus networking',
        note: 'The inventory estimate uses access points plus a switch/router allowance. The electricity range covers incomplete inventory; hardware uncertainty is not quantified.',
        fields: [
            {key: 'enabled', label: 'Include campus networking', type: 'boolean'},
            {key: 'mode', label: 'Estimation method', type: 'select', options: {inventory: 'Inventory and power estimate', legacy: 'Original percentage allowance'}},
            {key: 'accessPoints', label: 'Access points', min: 0, integer: true, when: {mode: 'inventory'}},
            {key: 'accessPointWatts', label: 'Power per access point (W)', min: 0, when: {mode: 'inventory'}},
            {key: 'accessPointEmbodiedKg', label: 'Embodied emissions per access point (kg CO₂e)', min: 0, when: {mode: 'inventory'}},
            {key: 'switchesPerAccessPoint', label: 'Switch/router allowance per access point', min: 0, when: {mode: 'inventory'}},
            {key: 'switchWatts', label: 'Power per switch/router (W)', min: 0, when: {mode: 'inventory'}},
            {key: 'switchEmbodiedKg', label: 'Embodied emissions per switch/router (kg CO₂e)', min: 0, when: {mode: 'inventory'}},
            {key: 'lifetimeYears', label: 'Equipment lifetime (years)', min: 0.01, when: {mode: 'inventory'}},
            {key: 'electricityScale', label: 'Electricity allowance multiplier', min: 0, when: {mode: 'inventory'}},
            {key: 'legacyPercent', label: 'Laptop, desktop and server emissions allowance (%)', min: 0, when: {mode: 'legacy'}},
        ]},
    supercomputing: {title: 'Supercomputing (CSCS)',
        note: 'The UZH allocation is an estimate based on occupied space. Compute-only electricity is the working assumption. Hardware is a server-equivalent proxy, not a measured inventory.',
        fields: [
            {key: 'enabled', label: 'Include supercomputing', type: 'boolean'},
            {key: 'mode', label: 'Estimation method', type: 'select', options: {allocation: 'Annual electricity allocation', legacyPower: 'Original power-only estimate'}},
            {key: 'electricityKwh', label: 'UZH electricity allocation (kWh/year)', min: 0, when: {mode: 'allocation'}},
            {key: 'energyBasis', label: 'Allocation includes', type: 'select', options: {it: 'IT equipment only', facility: 'IT equipment and facility overhead'}, when: {mode: 'allocation'}},
            {key: 'pue', label: 'Supercomputing PUE', min: 1, when: {mode: 'allocation'}},
            {key: 'intensityGPerKwh', label: 'Electricity emissions intensity (g CO₂e/kWh)', min: 0},
            {key: 'serverEquivalentKw', label: 'Average power per server equivalent (kW IT)', min: 0.01, when: {mode: 'allocation'}},
            {key: 'embodiedKgPerServer', label: 'Embodied emissions per server equivalent (kg CO₂e)', min: 0, when: {mode: 'allocation'}},
            {key: 'lifetimeYears', label: 'Hardware lifetime (years)', min: 0.01, when: {mode: 'allocation'}},
            {key: 'legacyPowerKw', label: 'Original average allocated power (kW)', min: 0, when: {mode: 'legacyPower'}},
        ]},
    ai: {title: 'Hosted AI',
        note: 'User counts are illustrative, not measured adoption. Chat and agent users may overlap. Count agent-generated requests only in the agent workload. AI already covered by campus or CSCS electricity is not added here.',
        fields: [
            {key: 'enabled', label: 'Include hosted AI', type: 'boolean', group: 'Environment'},
            {key: 'population', label: 'Reference campus population', min: 0, integer: true},
            {key: 'intensityGPerKwh', label: 'AI electricity intensity (g CO₂e/kWh)', min: 0},
            {key: 'pue', label: 'AI data-center PUE', min: 1},
            {key: 'trainingPercent', label: 'Training allocation (% of inference emissions)', min: 0},
            {key: 'chatUsers', label: 'People using ordinary chat', min: 0, integer: true, group: 'Ordinary chat'},
            {key: 'queriesPerUserDay', label: 'Queries per active user-day', min: 0},
            {key: 'chatDays', label: 'Active chat days per year', min: 0, max: 366},
            {key: 'whPerQuery', label: 'Energy per ordinary query (Wh)', min: 0},
            {key: 'chatEnergyBasis', label: 'Query energy includes', type: 'select', options: {it: 'IT equipment only', facility: 'IT equipment and facility overhead'}},
            {key: 'chatHardwareGPerQuery', label: 'Hardware allocation (g CO₂e/query)', min: 0},
            {key: 'agentUsers', label: 'People using agents', min: 0, integer: true, group: 'Agents'},
            {key: 'agentDays', label: 'Active agent days per year', min: 0, max: 366},
            {key: 'kwhPerAgentDay', label: 'Energy per active agent user-day (kWh)', min: 0},
            {key: 'agentEnergyBasis', label: 'Agent energy includes', type: 'select', options: {it: 'IT equipment only', facility: 'IT equipment and facility overhead'}},
            {key: 'agentHardwareGPerKwh', label: 'Hardware allocation (g CO₂e/kWh)', min: 0},
            {key: 'agentHardwareEnergyBasis', label: 'Hardware allocation electricity basis', type: 'select', options: {it: 'IT equipment electricity', facility: 'Facility electricity'}},
            {key: 'usageGrowthPercent', label: 'Annual chat workload growth (%)', min: -100, group: 'Ordinary chat growth scenario'},
            {key: 'efficiencyImprovementPercent', label: 'Annual reduction in query energy (%)', min: 0, max: 100},
            {key: 'trainingGrowthPercent', label: 'Annual growth in training emissions (%)', min: -100},
        ]},
};

export const AI_LEGACY_KEYS = {
    'User population': 'chatUsers', 'Mean daily user queries': 'queriesPerUserDay', 'Days per year': 'chatDays',
    'Mean query Wh': 'whPerQuery', 'Training overhead %': 'trainingPercent',
    'Emissions intensity g CO2e / kWh': 'intensityGPerKwh', 'Embodied emissions g CO2e / query': 'chatHardwareGPerQuery',
    'Annual usage growth %': 'usageGrowthPercent', 'Annual efficiency growth %': 'efficiencyImprovementPercent',
    'Annual training growth %': 'trainingGrowthPercent',
};

export const CLOUD_LEGACY_KEYS = {
    'Cloud % servers in cloud': 'migratedPercent', 'Cloud instances per 100 local servers': 'instancesPer100Servers',
    'Cloud instance power W': 'powerWatts', 'Cloud instance embodied kg': 'embodiedKg',
    'Cloud instance lifetime y': 'lifetimeYears', 'Cloud PUE x100': 'pue',
};

export function facilityMultiplier(environment) {
    return environment.energyBasis === 'it' ? environment.pue : 1;
}

export function validateEnvironments(environments) {
    for (const [name, schema] of Object.entries(ENVIRONMENT_FIELDS)) {
        const values = environments[name];
        if (!values) throw new Error('Missing environment: ' + name);
        for (const field of schema.fields) {
            const value = values[field.key];
            if (field.type === 'boolean') {
                if (typeof value !== 'boolean') throw new Error(field.label + ' must be true or false');
            } else if (field.type === 'select') {
                if (!Object.hasOwn(field.options, value)) throw new Error('Invalid ' + field.label);
            } else if (!Number.isFinite(value)
                || value < (field.min ?? 0) || (field.max !== undefined && value > field.max)
                || (field.integer && !Number.isInteger(value))) throw new Error('Invalid ' + field.label);
        }
        if (name === 'ai' && (values.chatUsers > values.population || values.agentUsers > values.population))
            throw new Error('Each AI user group must fit within the reference campus population; the groups may overlap');
    }
}

export function environmentRanges(config) {
    return Object.entries(config.environments ?? {}).flatMap(([name, env]) => {
        if (!env.enabled || env.mode === 'legacy' || env.mode === 'legacyPower') return [];
        return Object.entries(env.bounds ?? {}).map(([key, bounds]) => {
            if (!Array.isArray(bounds) || bounds.length !== 2) throw new Error('Invalid bounds for ' + name + '.' + key);
            return {path: ['environments', name, key], low: bounds[0], high: bounds[1], source: env.source};
        });
    });
}

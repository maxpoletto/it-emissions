export const ENVIRONMENT_DEFAULTS = {
    saas: {enabled: true, users: 38000, kgPerUserYear: 5.5,
        bounds: {kgPerUserYear: [1, 10]},
        source: 'Order-of-magnitude productivity SaaS assumption: 1–10 kg CO₂e/user-year; not tenant measurements'},
    cloud: {enabled: true, migratedPercent: 0, instancesPer100Servers: 100, powerWatts: 300,
        embodiedKg: 700, lifetimeYears: 4, pue: 1.15, intensityGPerKwh: 53.75,
        energyBasis: 'it', bounds: {}, source: 'Cloud VM proxy and selected serving-region electricity factor'},
    local: {enabled: true, pue: 2, intensityGPerKwh: 53.75, useHourlyProfile: true,
        energyBasis: 'it', bounds: {}, source: 'Campus electricity profile and local data-center PUE assumption'},
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
    }
}

export function environmentRanges(config) {
    return Object.entries(config.environments ?? {}).flatMap(([name, env]) => {
        if (!env.enabled) return [];
        return Object.entries(env.bounds ?? {}).map(([key, bounds]) => {
            if (!Array.isArray(bounds) || bounds.length !== 2) throw new Error('Invalid bounds for ' + name + '.' + key);
            return {path: ['environments', name, key], low: bounds[0], high: bounds[1], source: env.source};
        });
    });
}

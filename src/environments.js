export const ENVIRONMENT_DEFAULTS = {
    saas: {enabled: true, users: 38000, kgPerUserYear: 5.5,
        bounds: {kgPerUserYear: [1, 10]},
        source: 'Order-of-magnitude productivity SaaS assumption: 1–10 kg CO₂e/user-year; not tenant measurements'},
};

export const ENVIRONMENT_FIELDS = {
    saas: {title: 'Productivity cloud services (SaaS)',
        note: 'A rough emissions estimate per user. Provider overhead is already implicit; no extra cooling multiplier is applied.',
        fields: [
            {key: 'enabled', label: 'Include productivity services', type: 'boolean'},
            {key: 'users', label: 'Users', min: 0, integer: true},
            {key: 'kgPerUserYear', label: 'Emissions per user-year (kg CO₂e)', min: 0},
        ]},
};

export function validateEnvironments(environments) {
    for (const [name, schema] of Object.entries(ENVIRONMENT_FIELDS)) {
        const values = environments[name];
        if (!values) throw new Error('Missing environment: ' + name);
        for (const field of schema.fields) {
            const value = values[field.key];
            if (field.type === 'boolean') {
                if (typeof value !== 'boolean') throw new Error(field.label + ' must be true or false');
            } else if (field.type !== 'select' && (!Number.isFinite(value)
                || value < (field.min ?? 0) || (field.max !== undefined && value > field.max)
                || (field.integer && !Number.isInteger(value)))) throw new Error('Invalid ' + field.label);
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

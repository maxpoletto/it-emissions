import {ENVIRONMENT_FIELDS} from './environments.js';

export function renderEnvironments(environments, update) {
    const region = document.getElementById('environment-inputs');
    region.replaceChildren();
    for (const [name, schema] of Object.entries(ENVIRONMENT_FIELDS)) {
        const values = environments[name];
        const section = document.createElement('section');
        section.className = 'input-section'; section.id = 'environment-' + name;
        const title = document.createElement('h2'); title.className = 'section-title'; title.textContent = schema.title;
        const note = document.createElement('p'); note.className = 'section-note'; note.textContent = schema.note;
        const table = document.createElement('table'); table.className = 'parameter-table';
        table.innerHTML = '<thead><tr><th>Parameter</th><th>Value</th><th>Low assumption</th><th>High assumption</th></tr></thead>';
        const body = document.createElement('tbody');
        for (const field of schema.fields) {
            if (field.when && Object.entries(field.when).some(([key, value]) => values[key] !== value)) continue;
            if (field.group) {
                const group = document.createElement('tr'); const heading = document.createElement('th');
                heading.colSpan = 4; heading.textContent = field.group; heading.style.textAlign = 'left';
                group.append(heading); body.append(group);
            }
            const row = document.createElement('tr');
            const label = document.createElement('td'); label.textContent = field.label; row.append(label);
            const cell = document.createElement('td');
            const input = document.createElement(field.type === 'select' ? 'select' : 'input');
            input.id = name + '-' + field.key;
            input.setAttribute('aria-label', schema.title + ': ' + field.label);
            if (field.type === 'select') {
                for (const [value, text] of Object.entries(field.options)) {
                    const option = document.createElement('option'); option.value = value; option.textContent = text; input.append(option);
                }
                input.value = values[field.key];
            } else if (field.type === 'boolean') {input.type = 'checkbox'; input.checked = values[field.key];}
            else {
                input.type = 'number'; input.step = field.integer ? '1' : 'any';
                if (field.min !== undefined) input.min = field.min;
                if (field.max !== undefined) input.max = field.max;
                input.value = values[field.key];
            }
            input.addEventListener('change', () => {
                values[field.key] = field.type === 'boolean' ? input.checked : field.type === 'select' ? input.value : Number(input.value);
                if (field.type === 'select') renderEnvironments(environments, update);
                update();
            });
            cell.append(input); row.append(cell);
            for (let i = 0; i < 2; i++) {
                const boundCell = document.createElement('td');
                if (values.bounds?.[field.key]) {
                    const bound = document.createElement('input'); bound.type = 'number'; bound.step = 'any';
                    bound.value = values.bounds[field.key][i];
                    bound.setAttribute('aria-label', schema.title + ': ' + field.label + (i ? ' high assumption' : ' low assumption'));
                    bound.addEventListener('change', () => {values.bounds[field.key][i] = Number(bound.value); update();});
                    boundCell.append(bound);
                }
                row.append(boundCell);
            }
            body.append(row);
        }
        table.append(body); section.append(title, note, table);
        if (name === 'ai') {
            const summary = document.createElement('p'); summary.id = 'ai-summary';
            summary.className = 'section-note'; summary.setAttribute('aria-live', 'polite'); section.append(summary);
        }
        region.append(section);
    }
}

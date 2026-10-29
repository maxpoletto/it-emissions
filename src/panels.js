// Presentation state belongs in the bookmark, not in the emissions model.
const DEFAULT_CLOSED = ['panel-duty-cycles'];

export function createPanelControls(onChange) {
    let closed = new Set(DEFAULT_CLOSED);

    function attach(section) {
        let header = section.querySelector(':scope > .panel-heading');
        if (!header) {
            const title = section.querySelector(':scope > .section-title');
            header = document.createElement('div');
            header.className = 'panel-heading';
            const content = document.createElement('div');
            content.className = 'panel-content';
            content.id = section.id + '-content';
            content.append(...[...section.childNodes].filter(node => node !== title));
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'panel-toggle';
            button.setAttribute('aria-controls', content.id);
            button.addEventListener('click', () => {
                if (closed.has(section.id)) closed.delete(section.id);
                else closed.add(section.id);
                attach(section);
                onChange();
            });
            header.append(title, button);
            section.append(header, content);
        }
        const open = !closed.has(section.id);
        const button = header.querySelector('.panel-toggle');
        button.textContent = open ? '▼' : '◀';
        button.setAttribute('aria-expanded', String(open));
        button.title = (open ? 'Collapse ' : 'Expand ') + header.querySelector('.section-title').textContent.trim();
        button.setAttribute('aria-label', button.title);
        section.querySelector(':scope > .panel-content').hidden = !open;
        section.classList.toggle('panel-collapsed', !open);
    }

    return {
        attach,
        restore(value) {
            closed = new Set(Array.isArray(value) ? value.filter(id => typeof id === 'string') : DEFAULT_CLOSED);
        },
        getClosed: () => [...closed].sort(),
    };
}

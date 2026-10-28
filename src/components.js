export const rowTotal = row => (row.usage ?? 0) + (row.embodied ?? 0) + (row.training ?? 0);

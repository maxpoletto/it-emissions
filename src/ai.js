import {facilityMultiplier} from './environments.js';
import {rowTotal} from './components.js';

export function aiWorkloads(ai) {
    const queries = ai.enabled ? ai.chatUsers * ai.queriesPerUserDay * ai.chatDays : 0;
    const chatInputKwh = queries * ai.whPerQuery / 1000;
    const chatElectricity = chatInputKwh * facilityMultiplier({pue: ai.pue, energyBasis: ai.chatEnergyBasis});
    const agentInputKwh = ai.enabled ? ai.agentUsers * ai.agentDays * ai.kwhPerAgentDay : 0;
    const agentItKwh = ai.agentEnergyBasis === 'it' ? agentInputKwh : agentInputKwh / ai.pue;
    const agentElectricity = agentInputKwh * facilityMultiplier({pue: ai.pue, energyBasis: ai.agentEnergyBasis});
    const agentHardwareKwh = ai.agentHardwareEnergyBasis === 'facility' ? agentElectricity : agentItKwh;
    const component = (category, electricityKwh, embodied) => {
        const usage = electricityKwh * ai.intensityGPerKwh / 1000;
        return {category, usage, embodied, training: usage * ai.trainingPercent / 100, electricityKwh};
    };
    return {
        chat: component('AI (chatbot)', chatElectricity, queries * ai.chatHardwareGPerQuery / 1000),
        agents: {...component('AI (agents)', agentElectricity, agentHardwareKwh * ai.agentHardwareGPerKwh / 1000),
            itElectricityKwh: agentItKwh},
    };
}

// The growth scenario retains the original ordinary-chat scope. Training grows
// independently; the per-query hardware allowance remains fixed.
export function chatProjection(ai, referenceYear, legacy = false) {
    const first = aiWorkloads(ai).chat;
    return Array.from({length: 5}, (_, year) => {
        const workload = (1 + ai.usageGrowthPercent / 100) ** year;
        const row = {year: referenceYear + year,
            usage: first.usage * workload * (1 - ai.efficiencyImprovementPercent / 100) ** year,
            embodied: first.embodied * workload,
            training: first.training * (1 + ai.trainingGrowthPercent / 100) ** year};
        row.total = rowTotal(row);
        if (legacy) {row.embodied += row.training; row.training = 0; row.legacy = true;}
        return row;
    });
}

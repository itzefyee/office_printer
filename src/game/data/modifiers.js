// Day modifiers — one is picked at random when a run starts.
// startEffects are applied once to the initial state via applyEffects.
// label is shown in the HUD top strip for the full run.

export const modifiers = [
  {
    id: 'low_toner_day',
    label: 'Low Toner Advisory',
    description: 'Toner reserves reported below threshold at shift start.',
    startEffects: { toner: -50 }
  },
  {
    id: 'quarterly_audit',
    label: 'Quarterly Audit',
    description: 'Finance has scheduled a compliance review. Blame elevated from the outset.',
    startEffects: { blame: 25, dignity: -5 }
  },
  {
    id: 'paper_downgrade',
    label: 'Budget Paper Substitution',
    description: 'Procurement switched to substandard stock overnight.',
    startEffects: { paperPath: -30 }
  },
  {
    id: 'driver_update',
    label: 'Mandatory Driver Update',
    description: 'IT pushed an overnight update. Memory unstable until further notice.',
    startEffects: { memory: -25, heat: 5 }
  },
  {
    id: 'hvac_warning',
    label: 'HVAC Pre-Failure Warning',
    description: 'Temperature regulation unreliable. Thermal load elevated at shift start.',
    startEffects: { heat: 18 }
  },
  {
    id: 'skeleton_crew',
    label: 'Skeleton Crew',
    description: 'Reduced staffing today. Fewer people to generate requests — or complaints.',
    startEffects: { dignity: 15, blame: -10 }
  },
  {
    id: 'maintenance_overdue',
    label: 'Maintenance Overdue',
    description: 'Last service was 14 months ago. The printer remembers.',
    startEffects: { paperPath: -15, heat: 10 }
  }
];

export function pickModifier() {
  return modifiers[Math.floor(Math.random() * modifiers.length)];
}

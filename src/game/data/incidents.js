// Random mid-tick incidents that fire independently of the job queue.
// Each incident has: id, text (logged to the event panel), effect (resource deltas).
// Effects use the same keys as applyEffects — all values are clamped 0-100.

export const incidents = [
  {
    id: 'manager_nearby',
    text: 'Incident: Manager spotted hovering two metres away. Observation mode activated.',
    effect: { dignity: -3, blame: 3 }
  },
  {
    id: 'paper_quality_downgrade',
    text: 'Incident: New paper stock introduced. It feels like recycled doubt.',
    effect: { paperPath: -6, blame: 1 }
  },
  {
    id: 'broken_ac',
    text: 'Incident: Building HVAC has entered an unspecified fault state. Temperature unregulated.',
    effect: { heat: 6, dignity: -1 }
  },
  {
    id: 'intern_panic',
    text: 'Incident: Intern pressed Cancel fourteen times in succession. Queue integrity compromised.',
    effect: { memory: -5, blame: 2 }
  },
  {
    id: 'coffee_nearby',
    text: 'Incident: Coffee placed on your output tray. Stability currently outsourced to gravity.',
    effect: { dignity: -2, paperPath: -2, blame: 1 }
  },
  {
    id: 'it_offline',
    text: 'Incident: IT helpdesk offline until further notice. All driver requests are self-managed now.',
    effect: { memory: -4, blame: 1 }
  },
  {
    id: 'toner_spill',
    text: 'Incident: Toner cartridge improperly reseated by facilities. Internal contamination confirmed.',
    effect: { toner: -9, heat: 2 }
  },
  {
    id: 'supply_closet_lock',
    text: 'Incident: Supply closet locked for inventory. Consumables will be conceptual today.',
    effect: { toner: -4, dignity: -1 }
  },
  {
    id: 'ghost_job',
    text: 'Incident: Phantom print job detected. No sender. No recipient. No explanation.',
    effect: { memory: -6, blame: 2 }
  },
  {
    id: 'fire_drill',
    text: 'Incident: Fire drill. All non-essential operations suspended. Heat vents opportunistically.',
    effect: { heat: -5, dignity: -2, dayTime: 3 }
  },
  {
    id: 'birthday_copies',
    text: 'Incident: 40 copies of a birthday card requested. The recipient has not been informed.',
    effect: { toner: -6, paperPath: -2, dignity: -1 }
  },
  {
    id: 'paper_tray_empty',
    text: 'Incident: Paper tray detected as empty. This is, technically, a human responsibility.',
    effect: { paperPath: -5, blame: 2 }
  },
  {
    id: 'unscheduled_tour',
    text: 'Incident: Visitors are touring the office. You have been described as "temperamental".',
    effect: { dignity: -3, blame: 2 }
  },
  {
    id: 'noise_complaint',
    text: 'Incident: Employee filed a formal noise complaint. Regarding the fan.',
    effect: { dignity: -4, blame: 1 }
  },
  {
    id: 'network_reset',
    text: 'Incident: Network admin performed an unscheduled reset. All wireless jobs dropped.',
    effect: { memory: 8, blame: 3, dignity: -1 }
  },
  {
    id: 'false_jam_report',
    text: 'Incident: Employee reported a paper jam. Investigation found no jam. Confidence shaken.',
    effect: { memory: -2, dignity: -3, blame: 1 }
  }
];

// Job content library.
// Each job should stress one primary system and one secondary system.
// Effects kept modest so designers can retune without hunting through scenes.

export const jobs = [
  // --- PRINT ---------------------------------------------------------------
  {
    id: 'print_memo_single',
    title: 'Print single-page memo',
    description: 'Leadership has circulated a clarification of last week\'s clarification.',
    category: 'print',
    urgency: 1,
    risk: { toner: 2, heat: 1 },
    choices: [
      { key: 'accept',  label: 'Accept',  effect: { toner: -2, heat: 1 } },
      { key: 'reroute', label: 'Reroute', effect: { blame: 2, memory: -1 } },
      { key: 'reject',  label: 'Reject',  effect: { dignity: -3, blame: 4 } }
    ]
  },
  {
    id: 'print_color_report_200',
    title: 'Print 200-page color report',
    description: 'Leadership requires the quarterly review printed before the quarterly review.',
    category: 'print',
    urgency: 3,
    risk: { toner: 20, heat: 14 },
    choices: [
      { key: 'accept',     label: 'Accept',     effect: { toner: -18, heat: 10, paperPath: -4 } },
      { key: 'reject',     label: 'Reject',     effect: { dignity: -6, blame: 8 } },
      { key: 'fakeError',  label: 'Fake error', effect: { memory: -2, dignity: 1, heat: 1 } },
      { key: 'reroute',    label: 'Reroute',    effect: { blame: 4, memory: -3, dignity: -1 } }
    ]
  },
  {
    id: 'print_manual_duplex',
    title: 'Manual double-sided manual',
    description: 'HR insists on duplexing a document that was not designed to survive it.',
    category: 'print',
    urgency: 2,
    risk: { paperPath: 10, heat: 4 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { paperPath: -8, heat: 3, toner: -4 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -3, blame: 3 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -2, dignity: 2 } }
    ]
  },
  {
    id: 'print_sticker_misfeed',
    title: 'Sticker sheet submission',
    description: 'Marketing inserted adhesive material intended for a different machine.',
    category: 'print',
    urgency: 2,
    risk: { paperPath: 16, heat: 6 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { paperPath: -14, heat: 4 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -2, blame: 3 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -1, dignity: 2, blame: 1 } },
      { key: 'reroute',   label: 'Reroute',    effect: { blame: 3, dignity: -1 } }
    ]
  },

  // --- SCAN ----------------------------------------------------------------
  {
    id: 'scan_crumpled_receipt',
    title: 'Scan a crumpled receipt',
    description: 'Finance requires the receipt to become legible retroactively.',
    category: 'scan',
    urgency: 2,
    risk: { paperPath: 12, memory: 3 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { heat: 2, paperPath: -6, memory: -2 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -4, blame: 3 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -1, dignity: 1 } }
    ]
  },
  {
    id: 'scan_coffee_page',
    title: 'Scan coffee-stained page',
    description: 'A document has arrived marinated. It must still be searchable.',
    category: 'scan',
    urgency: 2,
    risk: { paperPath: 10, memory: 4 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { paperPath: -8, memory: -3, heat: 1 } },
      { key: 'reroute',   label: 'Reroute',    effect: { blame: 2, dignity: -1 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -1, dignity: 1 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -3, blame: 3 } }
    ]
  },
  {
    id: 'scan_contract_48',
    title: 'Scan 48-page contract',
    description: 'Legal requests the full contract scanned inside one minute.',
    category: 'scan',
    urgency: 3,
    risk: { memory: 10, heat: 6 },
    choices: [
      { key: 'accept',     label: 'Accept',     effect: { memory: -8, heat: 5, paperPath: -3 } },
      { key: 'reject',     label: 'Reject',     effect: { dignity: -5, blame: 6 } },
      { key: 'fakeError',  label: 'Fake error', effect: { memory: -2, dignity: 2, blame: 1 } },
      { key: 'purgeQueue', label: 'Purge queue', effect: { memory: 8, dignity: -6, blame: 4 } }
    ]
  },

  // --- NETWORK -------------------------------------------------------------
  {
    id: 'net_wifi_blame',
    title: 'Why is Wi-Fi slow?',
    description: 'IT has informed the office this is a printer problem.',
    category: 'network',
    urgency: 2,
    risk: { memory: 5, blame: 6 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { memory: -5, heat: 1 } },
      { key: 'reroute',   label: 'Reroute',    effect: { blame: 2, dignity: -1 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: 1, dignity: 1, blame: 2 } },
      { key: 'reboot',    label: 'Reboot',     effect: { memory: 8, heat: 2 } }
    ]
  },
  {
    id: 'net_ghost_printer',
    title: 'Ghost printer conflict',
    description: 'A printer that does not exist keeps appearing in the queue.',
    category: 'network',
    urgency: 2,
    risk: { memory: 8, dignity: 3 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { memory: -6, heat: 1 } },
      { key: 'reboot',    label: 'Reboot',     effect: { memory: 10, heat: 2, dignity: -2 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -2, dignity: 2 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -2, blame: 3 } }
    ]
  },
  {
    id: 'net_driver_update',
    title: 'Driver update request',
    description: 'IT has pushed a driver of unverified origin.',
    category: 'network',
    urgency: 1,
    risk: { memory: 6, dignity: 4 },
    choices: [
      { key: 'accept',  label: 'Accept',     effect: { memory: -5, dignity: -3 } },
      { key: 'reject',  label: 'Reject',     effect: { dignity: 1, blame: 4 } },
      { key: 'reboot',  label: 'Reboot',     effect: { memory: 6, heat: 2 } }
    ]
  },

  // --- MAINTENANCE ---------------------------------------------------------
  {
    id: 'maint_toner_refill',
    title: 'Toner refill window',
    description: 'The toner reservoir reports dignified emptiness.',
    category: 'maintenance',
    urgency: 1,
    risk: { toner: -15, dignity: -1 },
    choices: [
      { key: 'accept', label: 'Accept', effect: { toner: 20, heat: 1, dignity: 1 } },
      { key: 'reject', label: 'Reject', effect: { dignity: -2, blame: 1 } }
    ]
  },
  {
    id: 'maint_roller_clean',
    title: 'Roller cleaning',
    description: 'Rollers have developed a hum. The hum has opinions.',
    category: 'maintenance',
    urgency: 2,
    risk: { paperPath: -10, dignity: 2 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { paperPath: 12, heat: -2, dignity: 2 } },
      { key: 'reroute',   label: 'Reroute',    effect: { blame: 2, dignity: -1 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -1, dignity: 1 } }
    ]
  },
  {
    id: 'maint_firmware_reset',
    title: 'Firmware reset request',
    description: 'The firmware requests a reset and will not specify why.',
    category: 'maintenance',
    urgency: 3,
    risk: { memory: 12, heat: 3 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { memory: -8, heat: 3, dignity: -2 } },
      { key: 'reboot',    label: 'Reboot',     effect: { memory: 18, heat: -3, dignity: -1 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -3, blame: 4 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -2, dignity: 2, blame: 2 } }
    ]
  },

  // --- HUMAN ---------------------------------------------------------------
  {
    id: 'human_manager_yelling',
    title: 'Manager expresses volume',
    description: 'A manager is standing nearby and articulating concern at volume.',
    category: 'human',
    urgency: 3,
    risk: { dignity: 6, heat: 3 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { dignity: -6, heat: 2, toner: -4 } },
      { key: 'reroute',   label: 'Reroute',    effect: { blame: 3, dignity: -2 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -1, dignity: 1, blame: 2 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -4, blame: 5 } },
      { key: 'reboot',    label: 'Reboot',     effect: { memory: 8, heat: -2, dignity: 1 } }
    ]
  },
  {
    id: 'human_intern_panic',
    title: 'Intern pressing buttons',
    description: 'An intern is pressing buttons. Many of the buttons.',
    category: 'human',
    urgency: 2,
    risk: { memory: 5, paperPath: 4 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { memory: -4, paperPath: -3 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -1, dignity: 2 } },
      { key: 'reboot',    label: 'Reboot',     effect: { memory: 10, heat: 1 } }
    ]
  },
  {
    id: 'human_finance_miracle',
    title: 'Finance requests miracle',
    description: 'Finance requires the receipt to become legible retroactively. Again.',
    category: 'human',
    urgency: 3,
    risk: { memory: 6, dignity: 4 },
    choices: [
      { key: 'accept',     label: 'Accept',      effect: { memory: -6, heat: 2, paperPath: -3 } },
      { key: 'reject',     label: 'Reject',      effect: { dignity: -5, blame: 6 } },
      { key: 'fakeError',  label: 'Fake error',  effect: { memory: -2, dignity: 2, blame: 2 } },
      { key: 'purgeQueue', label: 'Purge queue', effect: { memory: 8, dignity: -6, blame: 4 } }
    ]
  }
];

// --- Job selection ---------------------------------------------------------
// A small, simple selector. We avoid repeating the same job twice in a row
// but stay stateless beyond that.

let lastPickedId = null;

export function getFirstJob() {
  const job = jobs[0];
  lastPickedId = job.id;
  return job;
}

export function getRandomJob() {
  if (jobs.length <= 1) return jobs[0];
  let attempts = 0;
  let pick = jobs[Math.floor(Math.random() * jobs.length)];
  while (pick.id === lastPickedId && attempts < 4) {
    pick = jobs[Math.floor(Math.random() * jobs.length)];
    attempts += 1;
  }
  lastPickedId = pick.id;
  return pick;
}

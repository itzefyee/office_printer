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
      { key: 'reroute', label: 'Reroute', effect: { blame: 3, memory: -2 } },
      { key: 'reject',  label: 'Reject',  effect: { dignity: -5, blame: 6 } }
    ]
  },
  {
    id: 'print_envelope_confidential',
    title: 'Confidential envelope print',
    description: 'Legal requires secrecy. They have attached it to an office tray.',
    category: 'print',
    urgency: 2,
    risk: { paperPath: 6, blame: 5 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { paperPath: -5, toner: -4, blame: 1 } },
      { key: 'fakeError', label: 'Fake error',  effect: { memory: -4, dignity: 1, blame: 2 } },
      { key: 'reroute',   label: 'Reroute',    effect: { blame: 5, dignity: -2 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -6, blame: 8 } }
    ]
  },
  {
    id: 'print_staple_request',
    title: 'Staple request',
    description: 'A stapled packet has been demanded from a machine without hands.',
    category: 'print',
    urgency: 2,
    risk: { heat: 3, dignity: 6 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { heat: 2, toner: -4, dignity: -3 } },
      { key: 'reroute',   label: 'Reroute',    effect: { blame: 2, dignity: -1 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -1, dignity: 2, blame: 1 } }
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
      { key: 'accept',     label: 'Accept',     effect: { toner: -24, heat: 14, paperPath: -6 } },
      { key: 'reject',     label: 'Reject',     effect: { dignity: -10, blame: 14 } },
      { key: 'fakeError',  label: 'Fake error', effect: { memory: -6, dignity: 1, heat: 3, blame: 2 } },
      { key: 'reroute',    label: 'Reroute',    effect: { blame: 8, memory: -4, dignity: -2 } }
    ]
  },
  {
    id: 'print_label_sheet',
    title: 'Shipping label sheet',
    description: 'Operations wants labels aligned. They have provided a sample aligned by hope.',
    category: 'print',
    urgency: 2,
    risk: { paperPath: 14, memory: 2 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { paperPath: -12, heat: 3, toner: -4 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -4, dignity: 2, blame: 1 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -5, blame: 7 } },
      { key: 'reroute',   label: 'Reroute',    effect: { blame: 4, memory: -2 } }
    ]
  },
  {
    id: 'print_mixed_media',
    title: 'Mixed media stack print',
    description: 'A stack of paper has been combined with one glossy sheet. The office calls it "efficient".',
    category: 'print',
    urgency: 3,
    risk: { paperPath: 18, heat: 5 },
    choices: [
      { key: 'accept',     label: 'Accept',     effect: { paperPath: -18, heat: 6, toner: -7 } },
      { key: 'purgeQueue', label: 'Purge queue', effect: {} },
      { key: 'fakeError',  label: 'Fake error', effect: { memory: -5, dignity: 2, blame: 3 } },
      { key: 'reject',     label: 'Reject',     effect: { dignity: -9, blame: 12 } }
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
      { key: 'accept',    label: 'Accept',     effect: { paperPath: -10, heat: 4, toner: -5 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -5, blame: 6 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -4, dignity: 2, blame: 1 } }
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
      { key: 'accept',    label: 'Accept',     effect: { paperPath: -16, heat: 5 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -5, blame: 6 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -4, dignity: 2, blame: 2 } },
      { key: 'reroute',   label: 'Reroute',    effect: { blame: 5, dignity: -2 } }
    ]
  },
  {
    id: 'print_manual_tray',
    title: 'Manual tray intervention',
    description: 'A single sheet has been inserted by hand. The sheet is damp with certainty.',
    category: 'print',
    urgency: 1,
    risk: { paperPath: 8, dignity: 2 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { paperPath: -5, heat: 1, toner: -2 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -1, dignity: 1 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -2, blame: 2 } }
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
      { key: 'accept',    label: 'Accept',     effect: { heat: 3, paperPath: -8, memory: -3 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -6, blame: 6 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -4, dignity: 1, blame: 1 } }
    ]
  },
  {
    id: 'scan_faded_document',
    title: 'Scan faded document',
    description: 'The ink has retired. The office has not.',
    category: 'scan',
    urgency: 1,
    risk: { memory: 6, dignity: 2 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { memory: -5, heat: 1, dignity: -2 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -3, dignity: 2, blame: 1 } },
      { key: 'reroute',   label: 'Reroute',    effect: { blame: 4, dignity: -2 } }
    ]
  },
  {
    id: 'scan_magazine_oversize',
    title: 'Scan oversized magazine page',
    description: 'A glossy page has arrived wider than the laws of physics.',
    category: 'scan',
    urgency: 2,
    risk: { paperPath: 14, heat: 3 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { paperPath: -12, heat: 3, memory: -3 } },
      { key: 'reroute',   label: 'Reroute',    effect: { blame: 5, dignity: -2 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -5, blame: 6 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -4, dignity: 1, blame: 1 } }
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
      { key: 'accept',    label: 'Accept',     effect: { paperPath: -10, memory: -4, heat: 2 } },
      { key: 'reroute',   label: 'Reroute',    effect: { blame: 4, dignity: -2 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -3, dignity: 1, blame: 1 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -5, blame: 6 } }
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
      { key: 'accept',     label: 'Accept',     effect: { memory: -12, heat: 7, paperPath: -4 } },
      { key: 'reject',     label: 'Reject',     effect: { dignity: -9, blame: 12 } },
      { key: 'fakeError',  label: 'Fake error', effect: { memory: -6, dignity: 2, blame: 3 } },
      { key: 'purgeQueue', label: 'Purge queue', effect: {} }
    ]
  },
  {
    id: 'scan_folded_packet',
    title: 'Scan folded packet',
    description: 'The pages have been folded into quarters for transport and ideology.',
    category: 'scan',
    urgency: 2,
    risk: { paperPath: 12, dignity: 3 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { paperPath: -10, heat: 3, memory: -3 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -4, dignity: 2, blame: 1 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -5, blame: 6 } }
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
      { key: 'accept',    label: 'Accept',     effect: { memory: -6, heat: 2 } },
      { key: 'reroute',   label: 'Reroute',    effect: { blame: 5, dignity: -2 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -2, dignity: 1, blame: 3 } },
      { key: 'reboot',    label: 'Reboot',     effect: { memory: 6, heat: 3 } }
    ]
  },
  {
    id: 'net_offline_again',
    title: 'Offline status complaint',
    description: 'A laptop has declared you offline. You remain present.',
    category: 'network',
    urgency: 1,
    risk: { blame: 7, dignity: 2 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { memory: -4, blame: 2 } },
      { key: 'reboot',    label: 'Reboot',     effect: { memory: 10, heat: 2, dignity: -2, dayTime: 2 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -3, dignity: 2, blame: 2 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -5, blame: 7 } }
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
  {
    id: 'net_cloud_sync',
    title: 'Cloud print sync',
    description: 'A cloud service has become emotional. It requires reassurance in paper form.',
    category: 'network',
    urgency: 3,
    risk: { memory: 12, blame: 5 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { memory: -14, heat: 3, blame: 3 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -5, dignity: 2, blame: 4 } },
      { key: 'reroute',   label: 'Reroute',    effect: { blame: 8, dignity: -2 } },
      { key: 'reboot',    label: 'Reboot',     effect: { memory: 12, heat: 3, dayTime: 3 } }
    ]
  },
  {
    id: 'net_queue_duplicate',
    title: 'Duplicate job storm',
    description: 'The same job has appeared three times. The office calls it "redundancy".',
    category: 'network',
    urgency: 2,
    risk: { memory: 10, blame: 4 },
    choices: [
      { key: 'accept',     label: 'Accept',     effect: { memory: -10, heat: 2, blame: 2 } },
      { key: 'purgeQueue', label: 'Purge queue', effect: {} },
      { key: 'reboot',     label: 'Reboot',     effect: { memory: 14, heat: 2, dignity: -2, dayTime: 3 } },
      { key: 'reject',     label: 'Reject',     effect: { dignity: -6, blame: 9 } }
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
      { key: 'accept', label: 'Accept', effect: { toner: 22, heat: 3, dayTime: 2 } },
      { key: 'reject', label: 'Reject', effect: { dignity: -5, blame: 4 } }
    ]
  },
  {
    id: 'maint_paper_tray_alignment',
    title: 'Paper tray alignment',
    description: 'Tray guides have drifted. They have also developed pride.',
    category: 'maintenance',
    urgency: 1,
    risk: { paperPath: -12, memory: 2 },
    choices: [
      { key: 'accept',  label: 'Accept',  effect: { paperPath: 12, memory: -2, dignity: 1 } },
      { key: 'reboot',  label: 'Reboot',  effect: { memory: 10, heat: -2, dignity: -2, dayTime: 3 } },
      { key: 'reject',  label: 'Reject',  effect: { dignity: -5, blame: 5 } }
    ]
  },
  {
    id: 'maint_cooldown_protocol',
    title: 'Overheat cooldown protocol',
    description: 'Cooling procedure requested. The office will call it "laziness".',
    category: 'maintenance',
    urgency: 2,
    risk: { heat: -20, blame: 6 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { heat: -16, dignity: -2, blame: 3, dayTime: 3 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -4, dignity: 2, heat: -5, blame: 2, dayTime: 1 } },
      { key: 'reject',    label: 'Reject',     effect: { heat: 6, dignity: -4, blame: 5 } }
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
      { key: 'accept',    label: 'Accept',     effect: { paperPath: 14, heat: -2, dignity: 2 } },
      { key: 'reroute',   label: 'Reroute',    effect: { blame: 5, dignity: -2 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -3, dignity: 1, blame: 1 } }
    ]
  },
  {
    id: 'maint_calibration',
    title: 'Sensor calibration',
    description: 'A calibration page is required. The calibration page is also required to be correct.',
    category: 'maintenance',
    urgency: 2,
    risk: { memory: 6, dignity: 3 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { memory: -5, paperPath: 7, dignity: 1 } },
      { key: 'reboot',    label: 'Reboot',     effect: { memory: 12, heat: -1, dignity: -2, dayTime: 3 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -4, dignity: 2, blame: 2 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -5, blame: 6 } }
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
      { key: 'accept',    label: 'Accept',     effect: { memory: -12, heat: 5, dignity: -4 } },
      { key: 'reboot',    label: 'Reboot',     effect: { memory: 14, heat: -2, dignity: -3, dayTime: 4 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -8, blame: 10 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -6, dignity: 2, blame: 5 } }
    ]
  },
  {
    id: 'maint_service_ticket',
    title: 'Service ticket follow-up',
    description: 'A ticket has been closed. The problem remains. This is considered resolution.',
    category: 'maintenance',
    urgency: 1,
    risk: { blame: 6, dignity: 2 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { memory: -3, blame: 2, dignity: -2 } },
      { key: 'reroute',   label: 'Reroute',    effect: { blame: 4, dignity: -2 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -3, dignity: 2, blame: 1 } }
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
      { key: 'accept',    label: 'Accept',     effect: { dignity: -9, heat: 4, toner: -5 } },
      { key: 'reroute',   label: 'Reroute',    effect: { blame: 6, dignity: -4 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -4, dignity: 1, blame: 4 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -7, blame: 10 } },
      { key: 'reboot',    label: 'Reboot',     effect: { memory: 8, heat: -1, dignity: 1, dayTime: 3 } }
    ]
  },
  {
    id: 'human_meme_prints',
    title: 'Non-business printing',
    description: 'Someone is printing something "for morale". Morale has not authorized this.',
    category: 'human',
    urgency: 1,
    risk: { toner: 10, dignity: 4 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { toner: -9, dignity: -3, heat: 1 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -2, blame: 5 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -3, dignity: 2, blame: 2 } }
    ]
  },
  {
    id: 'human_meeting_handouts',
    title: 'Meeting handouts request',
    description: 'A meeting begins in two minutes. The handouts have just been written.',
    category: 'human',
    urgency: 3,
    risk: { heat: 7, blame: 8 },
    choices: [
      { key: 'accept',     label: 'Accept',     effect: { heat: 7, toner: -10, blame: 3 } },
      { key: 'reroute',    label: 'Reroute',    effect: { blame: 8, dignity: -3 } },
      { key: 'fakeError',  label: 'Fake error', effect: { memory: -5, dignity: 2, blame: 5 } },
      { key: 'purgeQueue', label: 'Purge queue', effect: {} },
      { key: 'reject',     label: 'Reject',     effect: { dignity: -10, blame: 16 } }
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
      { key: 'accept',    label: 'Accept',     effect: { memory: -6, paperPath: -4 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -3, dignity: 2, blame: 1 } },
      { key: 'reboot',    label: 'Reboot',     effect: { memory: 10, heat: 2, dayTime: 3 } }
    ]
  },
  {
    id: 'human_passive_aggressive_email',
    title: 'Passive-aggressive email',
    description: 'A reply-all has been printed and placed beside you. You are expected to learn from it.',
    category: 'human',
    urgency: 2,
    risk: { dignity: 8, blame: 4 },
    choices: [
      { key: 'accept',    label: 'Accept',     effect: { dignity: -8, blame: 3 } },
      { key: 'fakeError', label: 'Fake error', effect: { memory: -4, dignity: 2, blame: 3 } },
      { key: 'reject',    label: 'Reject',     effect: { dignity: -4, blame: 8 } }
    ]
  },
  {
    id: 'human_hr_forms',
    title: 'HR forms packet',
    description: 'HR requires signatures collected from people who have already quit.',
    category: 'human',
    urgency: 2,
    risk: { paperPath: 6, blame: 6 },
    choices: [
      { key: 'accept',   label: 'Accept',  effect: { paperPath: -6, toner: -5, blame: 2 } },
      { key: 'reroute',  label: 'Reroute', effect: { blame: 6, dignity: -3 } },
      { key: 'reject',   label: 'Reject',  effect: { dignity: -6, blame: 9 } }
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
      { key: 'accept',     label: 'Accept',      effect: { memory: -10, heat: 3, paperPath: -5 } },
      { key: 'reject',     label: 'Reject',      effect: { dignity: -9, blame: 12 } },
      { key: 'fakeError',  label: 'Fake error',  effect: { memory: -6, dignity: 2, blame: 5 } },
      { key: 'purgeQueue', label: 'Purge queue', effect: {} }
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

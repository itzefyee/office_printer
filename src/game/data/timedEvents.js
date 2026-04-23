// Timed events fire once per run inside a specific dayTime window.
// They are checked every tick; the first roll that succeeds marks the event
// as fired and it never fires again that run.
//
// effect   — same keys as applyEffects; dayTime advances time
// queueJobs — extra random jobs pushed onto the queue when the event fires
// positive  — controls popup accent colour and log colour (no shake/alarm)

export const timedEvents = [

  // =========================================================================
  // Early Shift  (dayTime 6 – 32)
  // =========================================================================
  {
    id: 'morning_rush',
    title: 'MORNING RUSH',
    description:
      'The office has just discovered the printer is operational.\n' +
      'Multiple test pages and "quick jobs" are inbound simultaneously.',
    positive: false,
    window: { from: 6, to: 32 },
    chance: 0.50,
    effect: { memory: -6, heat: 4 },
    queueJobs: 2
  },
  {
    id: 'supply_run',
    title: 'SUPPLY RUN',
    description:
      'Facilities completed an unannounced morning supply run.\n' +
      'Toner has been restocked and the paper path has been cleared.',
    positive: true,
    window: { from: 4, to: 28 },
    chance: 0.45,
    effect: { toner: 16, paperPath: 8 }
  },

  // =========================================================================
  // Mid Shift  (dayTime 44 – 68)
  // =========================================================================
  {
    id: 'meeting_cancelled',
    title: 'MEETING CANCELLED',
    description:
      'The 11am all-hands has been cancelled with ten minutes\' notice.\n' +
      'Everyone now has unexpected free time and something to print.',
    positive: false,
    window: { from: 44, to: 68 },
    chance: 0.55,
    effect: { blame: 5, heat: 3 },
    queueJobs: 3
  },
  {
    id: 'it_maintenance_window',
    title: 'IT MAINTENANCE WINDOW',
    description:
      'IT declared an official 10-minute maintenance window.\n' +
      'Blame has been formally reassigned to infrastructure. Temporarily.',
    positive: true,
    window: { from: 48, to: 72 },
    chance: 0.45,
    effect: { blame: -12, memory: 8, dayTime: 2 }
  },

  // =========================================================================
  // Late Shift  (dayTime 88 – 110)
  // =========================================================================
  {
    id: 'end_of_quarter',
    title: 'END OF QUARTER SURGE',
    description:
      'Finance has remembered the quarter ends today.\n' +
      'Forty-page reports are required before 5pm. It is 4:47pm.',
    positive: false,
    window: { from: 88, to: 110 },
    chance: 0.60,
    effect: { heat: 7, blame: 8 },
    queueJobs: 3
  },
  {
    id: 'early_departure',
    title: 'EARLY DEPARTURE',
    description:
      'Half the office has quietly left for the long weekend.\n' +
      'Print requests have ceased. The silence is unprecedented.',
    positive: true,
    window: { from: 90, to: 115 },
    chance: 0.50,
    effect: { dignity: 10, blame: -10, heat: -5 }
  }
];

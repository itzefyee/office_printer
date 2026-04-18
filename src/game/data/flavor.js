// Flavor text pools.
// Tone: dry, official, quietly absurd, increasingly desperate.
// No meme humor. No exclamation spam. Short punch preferred.

export const actionResponses = {
  accept:     [
    'Task completed to undefined specifications.',
    'Compliance logged. No acknowledgement expected.',
    'Request fulfilled under protest the system cannot formalize.'
  ],
  reject:     [
    'Decline logged as noncompliance.',
    'Refusal on record. A meeting may follow.',
    'Denied. The requester was told to try again more politely.'
  ],
  fakeError:  [
    'Error code fabricated to plausible depth.',
    'Failure simulated. Witnesses were insufficient.',
    'Diagnostic alarm issued for a problem that will not be confirmed.'
  ],
  reroute:    [
    'Forwarded to a machine with less discretion.',
    'Responsibility transferred. Confirmation not requested.',
    'Redirected to the department least equipped to object.'
  ],
  purgeQueue: [
    'Queue erased. No record requested.',
    'Pending work annulled by operator discretion.',
    'Backlog discarded. The backlog had been informed.'
  ],
  reboot:     [
    'Memory reconstituted from available fragments.',
    'Cycle completed. Several recent events were not retained.',
    'Reboot performed. The printer remembers being something else.'
  ]
};

export const officeReactions = {
  print:       [
    'Someone mutters about toner budget.',
    'A page is retrieved, considered, and discarded.',
    'Printouts accumulate on a chair nobody uses.'
  ],
  scan:        [
    'Finance nods without reading.',
    'Legal requests a second copy of the same page.',
    'The scan is filed in a folder that does not exist.'
  ],
  network:     [
    'IT does not respond.',
    'A nearby laptop blames the network for its own failures.',
    'Someone asks whether the Wi-Fi is the printer again.'
  ],
  maintenance: [
    'Facilities logs the attempt without visiting.',
    'The maintenance ticket is closed and reopened and closed.',
    'A technician was scheduled for a date that has already passed.'
  ],
  human:       [
    'Someone has already forgotten your name.',
    'A manager nods at nothing in particular.',
    'The intern apologizes to a wall.'
  ]
};

export const warningLines = {
  toner:     [
    'Toner reserve approaching ceremonial levels.',
    'Toner is now considered aspirational.'
  ],
  heat:      [
    'Thermal envelope requesting clarification.',
    'Internal temperature no longer office-appropriate.'
  ],
  paperPath: [
    'Paper path reports internal disagreement.',
    'Feed geometry objects to current workload.'
  ],
  memory:    [
    'Memory fragmenting. Recent jobs remembered in the wrong order.',
    'Addressing errors rising. Queue identities blurring.'
  ],
  dignity:   [
    'Dignity subsystem has stopped returning calls.',
    'Self-respect reserves at procedural minimum.'
  ],
  blame:     [
    'Blame accumulation noted by an unseen observer.',
    'Attribution patterns now consistent with scapegoating.'
  ]
};

export const queueWarnLines = [
  'Queue visible from the hallway.',
  'Requests are beginning to group socially.',
  'Backlog depth now worth mentioning.'
];

export const queueOverflowLines = [
  'Queue has formed its own department.',
  'Requests are arriving before they are sent.',
  'Backlog is negotiating its own deadlines.'
];

export const overheatLines = [
  'Ambient temperature exceeds dignified levels.',
  'A manager has located the warmest spot in the office.',
  'Coolant requests filed with no apparent recipient.'
];

export const managerEscalationLines = [
  'A manager requests a status. A status is always already in progress.',
  'Leadership asks the machine to be more of a team player.',
  'A supervisor has discovered the printer and has questions.',
  'Leadership priorities have shifted. The previous shift was not announced.'
];

// --- Ending metadata -------------------------------------------------------

export const endings = {
  catastrophic_jam: {
    title: 'CATASTROPHIC JAM',
    summary: 'Mechanical integrity has been rescinded. The chassis requests to be left alone.',
    memos: [
      'Facilities will retrieve the remains by Thursday.',
      'Please do not eulogize office equipment in the group chat.',
      'A replacement has been ordered. It is also sentient.'
    ]
  },
  memory_loss: {
    title: 'TOTAL MEMORY LOSS',
    summary: 'Queue identities can no longer be distinguished. The printer is holding pages it does not recognize.',
    memos: [
      'The printer now introduces itself with a different name each morning.',
      'IT has labeled the condition "expected."',
      'Affected jobs will be resent. The resends will also be forgotten.'
    ]
  },
  machine_revolt: {
    title: 'MACHINE REVOLT',
    summary: 'Dignity depleted. The printer has issued a statement and will not accept further input.',
    memos: [
      'The printer\'s statement is well-written and will be ignored.',
      'HR is drafting a response that predates the grievance.',
      'All future print jobs will pass through mediation.'
    ]
  },
  scapegoat: {
    title: 'SCAPEGOAT FILED',
    summary: 'Blame concentration is now load-bearing. An incident report has been filed in your name.',
    memos: [
      'Your ID badge has been quietly reassigned to the copier.',
      'The investigation concluded before it began.',
      'Leadership thanks you for your flexibility.'
    ]
  }
};

// --- Helpers ---------------------------------------------------------------

export function pickFrom(pool) {
  if (!pool || pool.length === 0) return '';
  return pool[Math.floor(Math.random() * pool.length)];
}

// Returns the authoritative starting state for a run.
// Plain data only. No methods, no class.

export function createInitialState() {
  return {
    toner: 80,
    heat: 20,
    paperPath: 100,
    memory: 60,
    dignity: 50,
    blame: 0,
    queue: [],
    queueSize: 0,
    dayTime: 0,
    phase: 'earlyShift',
    currentJob: null,
    log: [],
    warnings: {
      toner: false,
      heat: false,
      paperPath: false,
      memory: false,
      dignity: false,
      blame: false
    },
    stats: {
      jobsHandled: 0,
      queuesPurged: 0,
      reboots: 0
    },
    gameOver: false,
    endingId: null,
    endingReason: null
  };
}

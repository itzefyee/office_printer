Use these references first:
- @.cursor/docs/game-overview.md
- @.cursor/docs/core-mechanics.md
- @.cursor/docs/ui.md

Task:
Expand the prototype into a playable first loop.

Requirements:
- Add 12 to 15 jobs in jobs.js across categories:
  print, scan, network, maintenance, human
- Each job must include:
  id, title, description, category, urgency, risk, choices
- Add 3 to 5 choices depending on the job, chosen from:
  accept, reject, fakeError, reroute, purgeQueue, reboot
- Add a Phaser timed event in GameScene that fires every few seconds
- The timer should:
  - increase pressure over time
  - sometimes enqueue a new job
  - sometimes add heat or blame
- Add simple phase progression:
  earlyShift, midShift, lateShift
- Show phase and queue size in the HUD
- If the queue grows too large, add consequences
- Keep everything readable and easy to tune

Important:
- job content should be funny but dry
- do not overcomplicate balancing
- keep all tuning values easy to edit in data or top-level constants

Also:
- Improve visual hierarchy
- Use short labels
- Make warning states obvious
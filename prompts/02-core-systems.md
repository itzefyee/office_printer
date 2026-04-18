Use these references first:
- @.cursor/docs/game-overview.md
- @.cursor/docs/core-mechanics.md
- @.cursor/docs/ui.md

Implement the first playable simulation slice for Office Printer 9K.

Task:
Build the core gameplay state and resolver.

Requirements:
- createInitialState.js should return the initial game state
- applyEffects.js should apply effect objects, clamp meter values, and support:
  toner, heat, paperPath, memory, dignity, blame, queueSize, dayTime
- checkEndings.js should determine whether the run ends and return an ending id plus reason
- GameScene should hold one authoritative state object
- Add a method resolveChoice(choiceKey) that:
  - reads the current job
  - finds the selected choice
  - applies its effects
  - advances time
  - logs a short event line
  - checks for ending conditions
  - loads the next job
- Add a simple on-screen event log panel
- Keep visuals minimal, text-first, and dashboard-like

Use plain JavaScript and keep all game rule logic outside the scene where possible.
Also explain the responsibilities of each file after generating them.

Constraints:
- No overengineering
- No save system
- No networking
- No extra scenes
We can expand **Office Printer 9K** into a full, nearly complete jam blueprint by defining the player fantasy, the machine systems, the event library, the run structure, the UI, and the content production plan. For a jam entry, the main goal is to make every screen and every action reinforce “you are the machine” while staying small enough to finish in browser within the Gamedev.js Jam constraints. [itch](https://itch.io/jam/gamedevjs-2026)
## Game premise
The player is a sentient office printer trapped in a hostile corporate environment. Humans keep sending impossible jobs, and the printer must juggle heat, toner, paper path health, memory, and dignity to survive the workday.

The tone should be dry, absurd, and increasingly desperate. The fantasy is not “powerful machine,” but “underpaid, abused machine trying to keep itself together.”
## Core fantasy
The emotional loop is:
- An absurd request appears.
- You decide whether to comply, half-comply, delay, fake a failure, or push the problem onto someone else.
- The machine suffers consequences.
- The office reacts with blame, denial, or worse requests.

That gives the player agency without needing a huge world. The fun comes from making bad decisions intelligently.
## Full game loop
A strong run structure is:

1. Start of day with a few resources restored.
2. Human request arrives.
3. Player inspects request and chooses a response.
4. System resolves immediately or after a short processing delay.
5. Random office incident may trigger.
6. Queue grows faster over time.
7. End the day by surviving, rebelling, or catastrophically jamming.

This structure supports both comedy and tension. It also makes balancing easier because every choice can be evaluated by its effect on a few meters.

## Data structure
A simple content-first approach works best.

```js
const job = {
  id: "scan_crumpled_receipt",
  title: "Scan a crumpled receipt",
  description: "Finance says it must be searchable.",
  category: "scan",
  urgency: 2,
  risk: { heat: 4, paperPath: 12, memory: 3, dignity: -2 },
  choices: [
    { key: "accept", label: "Accept", effect: { heat: 2, paperPath: -6 } },
    { key: "reject", label: "Reject", effect: { dignity: -4, blame: 3 } },
    { key: "fakeError", label: "Fake error", effect: { memory: -1, dignity: 1 } }
  ]
};
```

That kind of structure lets you add content fast and tune it without refactoring. It is ideal for a jam because all the complexity stays in data, not code.
## Simulation model
Use a small state object and update it through one resolver function.

```js
const state = {
  toner: 80,
  heat: 20,
  paperPath: 100,
  memory: 60,
  dignity: 50,
  blame: 0,
  dayTime: 0,
  queue: [],
  currentJob: null,
  gameOver: false
};
```

Every action should pass through a single effect-application path so you can clamp values, trigger warnings, and check endings consistently. That keeps bugs low and balancing easier.
## Example resolver
```js
function applyEffects(state, effects) {
  for (const key of Object.keys(effects)) {
    state[key] = (state[key] ?? 0) + effects[key];
  }

  state.toner = Math.max(0, Math.min(100, state.toner));
  state.heat = Math.max(0, Math.min(100, state.heat));
  state.paperPath = Math.max(0, Math.min(100, state.paperPath));
  state.memory = Math.max(0, Math.min(100, state.memory));
  state.dignity = Math.max(0, Math.min(100, state.dignity));

  if (state.heat >= 100 || state.paperPath <= 0 || state.memory <= 0 || state.dignity <= 0) {
    state.gameOver = true;
  }
}
```

This is deliberately plain. A jam game wins by being understandable, not clever.
## Timer and pacing
Use Phaser’s scene clock for timed escalation, because timer events are built into the engine and suit repeating pressure systems well. [docs.phaser](https://docs.phaser.io/phaser/concepts/time)

```js
this.time.addEvent({
  delay: 6000,
  loop: true,
  callback: () => {
    if (!this.state.gameOver) {
      this.state.heat += 2;
      if (Math.random() < 0.4) this.enqueueRandomJob();
      this.updateHud();
      this.checkGameOver();
    }
  }
});
```

This creates the sense that the office is always getting worse even if the player is doing okay.

## Event library
Here is a nearly complete content outline for the event set.

**Print events**
- 1-page memo.
- 200-page color report.
- Manual double-sided printing.
- Sticker sheet misfeed.
- Staple request.
- Confidential envelope print.

**Scan events**
- Crumpled receipt.
- Faded document.
- Multi-page contract.
- Coffee-stained page.
- Oversized magazine page.

**Network events**
- Wi-Fi reconnect.
- Driver update request.
- Ghost printer conflict.
- “Why is it offline?”
- Cloud print sync.

**Maintenance events**
- Toner refill.
- Roller cleaning.
- Paper tray alignment.
- Overheat cooldown.
- Firmware reset.

**Human events**
- Manager yelling nearby.
- Intern panicking.
- IT leaving you on read.
- Finance needing a miracle.
- Someone printing memes.

That gives you enough breadth to support a full day-sim with variety and humor.
## Random modifiers
Add a few daily modifiers to make runs feel different.

- **Low toner day**.
- **Quarterly audit**.
- **IT on lunch**.
- **Manager in the office**.
- **Paper quality downgrade**.
- **Broken AC**.


## Stretch goals
If time remains, add:
- A reactive office voiceover system.
- A second printer rival.
- Special “boss” jobs.
- Unlockable printer skins.
- A post-run summary with stats and insults.

These are nice-to-have, not must-have. The core game should already be complete without them.
## Final shape
If fully outlined, the game becomes:
- a one-screen browser sim,
- driven by short events,
- built around 4–5 resource meters,
- with 20–30 reusable job cards,
- several endings,
- and a steady rise in office absurdity.

That is enough structure to feel like a full jam game while staying realistic for a small team in two weeks. The theme fit is strong, the implementation is manageable, and the comedy gives you a lot of room to stand out. [docs.phaser](https://docs.phaser.io/phaser/concepts/scenes)

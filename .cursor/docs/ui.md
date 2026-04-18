## UI outline
The whole game can live on one dashboard-like screen.

- **Center**: printer body or schematic.
- **Left panel**: current request.
- **Right panel**: resource meters and warnings.
- **Bottom row**: action buttons.
- **Top strip**: day, time, queue size, office mood.

If you keep the interface visually clear, you can get a lot of mileage from simple icons and short phrases. This kind of UI fits Phaser’s text buttons and scene-based structure well. [docs.phaser](https://docs.phaser.io/phaser/concepts/scenes)
## Scene layout
A practical Phaser structure is:

- **BootScene**: load fonts, sounds, sprites.
- **TitleScene**: title, how to play, start button.
- **GameScene**: all gameplay.
- **ResultsScene**: summary and ending.

Phaser scenes are meant for this kind of separation, and scene lifecycle events make it easier to manage transitions and cleanup. [docs.phaser](https://docs.phaser.io/phaser/concepts/scenes)

## Button flow
Phaser text buttons are enough for this game, and the standard interactive pattern is straightforward. [phaser](https://phaser.io/examples/v3.85.0/game-objects/text/view/simple-text-button)

```js
const button = this.add.text(100, 500, "Reject", {
  fontFamily: "Arial",
  fontSize: "24px",
  color: "#ffffff",
  backgroundColor: "#444444",
  padding: { left: 12, right: 12, top: 8, bottom: 8 }
}).setInteractive({ useHandCursor: true });

button.on("pointerdown", () => {
  this.resolveChoice("reject");
});
```

Use a small set of buttons that stay in the same position throughout the run. That makes the game feel like a control panel instead of a menu.
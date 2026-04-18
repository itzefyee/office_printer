Use these references first:
- @.cursor/docs/game-overview.md
- @.cursor/docs/core-mechanics.md
- @.cursor/docs/ui.md

Improve the HUD and controls for Office Printer 9K without expanding scope.

Requirements:
- Keep the game on one screen
- Improve visual hierarchy of:
  current job panel
  resource meters
  queue display
  bottom action buttons
  event log
- Add hover and pressed states to text buttons
- Disable or visually mute actions when they are not sensible
- Add color-coded warnings for dangerous meter thresholds
- Make the layout feel like a corporate machine control panel
- Keep art minimal: shapes, panels, bars, labels, warning lights
- No external UI frameworks

Also:
- ensure text remains readable
- keep button positions fixed
- avoid animation spam
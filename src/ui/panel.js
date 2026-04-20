export function drawPanel(scene, x, y, w, h, title, style) {
  const body = scene.add.rectangle(x, y, w, h, style.panelFill).setOrigin(0, 0);
  body.setStrokeStyle(1, style.panelStroke);

  const header = scene.add.rectangle(x, y, w, 32, style.panelHeaderFill).setOrigin(0, 0);
  header.setStrokeStyle(1, style.panelStroke);

  scene.add.text(x + 12, y + 6, title, {
    fontFamily: 'monospace',
    fontSize: '16px',
    color: '#c9d1d9'
  });
}


export const AUDIO = {
  bgm:         { key: 'bgm',         url: 'audio/bgm_toner_room.mp3', volume: 0.45, loop: true },
  uiClick:     { key: 'uiClick',     url: 'audio/ui_click.ogg',     volume: 0.55, loop: false },
  uiConfirm:   { key: 'uiConfirm',   url: 'audio/ui_confirm.ogg',   volume: 0.65, loop: false },
  uiError:     { key: 'uiError',     url: 'audio/ui_error.ogg',     volume: 0.70, loop: false },
  paperFeed:   { key: 'paperFeed',   url: 'audio/paper_feed.ogg',   volume: 0.65, loop: false },
  beepWarning: { key: 'beepWarning', url: 'audio/beep_warning.ogg', volume: 0.55, loop: false },
  reboot:      { key: 'reboot',      url: 'audio/reboot.ogg',       volume: 0.75, loop: false },
  jamAlarm:    { key: 'jamAlarm',    url: 'audio/jam_alarm.ogg',    volume: 0.75, loop: false },
  endingWin:   { key: 'endingWin',   url: 'audio/ending_win.ogg',   volume: 0.80, loop: false },
  endingFail:  { key: 'endingFail',  url: 'audio/ending_fail.ogg',  volume: 0.80, loop: false }
};

export const AUDIO_LIST = Object.values(AUDIO);


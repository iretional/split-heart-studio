import type { IconName } from "./components/Icon";

// Each key has four facts: a symbol (what the keyboard map shows), a role (the readable name),
// its ZMK keycode, and a description from keys.h. This file holds the first two.
// Roles: shown above the keycode in the Keycode Dialog and in the Inspector.
// Keys whose ZMK name already reads well (A to Z, F1 to F24) are left out and show that name.
// Paired K_ and C_ codes share a name on purpose; the ZMK name below tells them apart.
const digits = (prefix: string) => Object.fromEntries("0123456789".split("").map(d => [prefix + d, d]));

export const KEYCODE_NAMES: Record<string, string> = {
  // Numbers and symbols
  ...digits("N"),
  EXCL: "!", AT: "@", HASH: "#", DLLR: "$", PRCNT: "%", CARET: "^", AMPS: "&", STAR: "*", LPAR: "(", RPAR: ")",
  MINUS: "-", UNDER: "_", EQUAL: "=", PLUS: "+", LBKT: "[", LBRC: "{", RBKT: "]", RBRC: "}", BSLH: "\\", PIPE: "|",
  SEMI: ";", COLON: ":", SQT: "'", DQT: '"', GRAVE: "`", TILDE: "~", COMMA: ",", LT: "<", DOT: ".", GT: ">", FSLH: "/", QMARK: "?",
  NUHS: "Non-US #", TILDE2: "Non-US ~", NUBS: "Non-US \\", PIPE2: "Non-US |",

  // Control, navigation and locks
  ENTER: "Enter", ESC: "Esc", BSPC: "Backspace", TAB: "Tab", SPACE: "Space", INS: "Insert", DEL: "Delete",
  HOME: "Home", END: "End", PG_UP: "Page Up", PG_DN: "Page Down", LEFT: "←", DOWN: "↓", UP: "↑", RIGHT: "→",
  CAPS: "Caps Lock", SLCK: "Scroll Lock", LCAPS: "Locking Caps", LNLCK: "Locking Num", LSLCK: "Locking Scroll",

  // International and language
  INT1: "Ro", INT2: "Kana", INT3: "Yen", INT4: "Henkan", INT5: "Muhenkan",
  INT6: "International 6", INT7: "International 7", INT8: "International 8", INT9: "International 9",
  LANG1: "Hangul/English", LANG2: "Hanja", LANG3: "Katakana", LANG4: "Hiragana", LANG5: "Zenkaku",
  LANG6: "Language 6", LANG7: "Language 7", LANG8: "Language 8", LANG9: "Language 9",

  // Miscellaneous keyboard keys
  PSCRN: "Print Screen", PAUSE_BREAK: "Pause", CLEAR2: "Keypad Clear", K_APP: "Context Menu", K_EXEC: "Execute", K_HELP: "Help", K_MENU: "Menu",
  K_SELECT: "Select", K_STOP: "Stop", K_FIND: "Find", K_MUTE: "Mute", K_VOL_UP: "Volume Up", K_VOL_DN: "Volume Down",
  ALT_ERASE: "Alt Erase", SYSREQ: "SysRq", K_CANCEL: "Cancel", CLEAR: "Clear", PRIOR: "Prior", RET2: "Return 2", SEPARATOR: "Separator",
  OUT: "Out", OPER: "Oper", CLEAR_AGAIN: "Clear/Again", CRSEL: "CrSel", EXSEL: "ExSel",
  K_PP: "Play/Pause", K_STOP2: "Stop", K_PREV: "Previous", K_NEXT: "Next", K_EJECT: "Eject", K_VOL_UP2: "Volume Up", K_VOL_DN2: "Volume Down", K_MUTE2: "Mute",
  K_WWW: "Browser", K_BACK: "Back", K_FORWARD: "Forward", K_STOP3: "Stop", K_FIND2: "Find", K_SCROLL_UP: "Scroll Up", K_SCROLL_DOWN: "Scroll Down",
  K_EDIT: "Edit", K_LOCK: "Lock", K_REFRESH: "Refresh", K_CALC: "Calculator",

  // Modifiers
  LCTRL: "Left Ctrl", LSHFT: "Left Shift", LALT: "Left Alt", LGUI: "Left Win/Cmd",
  RCTRL: "Right Ctrl", RSHFT: "Right Shift", RALT: "Right Alt", RGUI: "Right Win/Cmd",

  // Keypad. These read as "Keypad 1" outside the Keypad tab (see keycodeText).
  ...digits("KP_N"),
  KP_NUM: "Num Lock", KP_SLASH: "/", KP_MULTIPLY: "*", KP_MINUS: "-", KP_PLUS: "+", KP_ENTER: "Enter", KP_DOT: ".", KP_EQUAL: "=", KP_COMMA: ",",
  KP_EQUAL_AS400: "= (AS/400)", KP_LPAR: "(", KP_RPAR: ")", KP_CLEAR: "Clear",

  // Editing
  K_REDO: "Redo", K_UNDO: "Undo", K_CUT: "Cut", K_COPY: "Copy", K_PASTE: "Paste",
  C_AC_UNDO: "Undo", C_AC_COPY: "Copy", C_AC_CUT: "Cut", C_AC_PASTE: "Paste", C_AC_REDO: "Redo",

  // Sound and display
  C_MUTE: "Mute", C_BASS_BOOST: "Bass Boost", C_VOL_UP: "Volume Up", C_VOL_DN: "Volume Down",
  C_DATA_ON_SCREEN: "On-Screen Data", C_CAPTIONS: "Captions", C_SNAPSHOT: "Snapshot", C_PIP: "Picture in Picture", C_ASPECT: "Aspect Ratio",
  C_BRI_UP: "Brightness Up", C_BRI_DN: "Brightness Down", C_BKLT_TOG: "Backlight", C_BRI_MIN: "Brightness Min", C_BRI_MAX: "Brightness Max", C_BRI_AUTO: "Auto Brightness",
  C_MEDIA_VIDEOPHONE: "Video Phone",

  // Media controls
  C_MODE_STEP: "Next Mode", C_CHAN_LAST: "Last Channel", C_MEDIA_COMPUTER: "Computer", C_MEDIA_TV: "TV", C_MEDIA_WWW: "Web", C_MEDIA_DVD: "DVD", C_MEDIA_PHONE: "Phone",
  C_MEDIA_GUIDE: "Program Guide", C_MEDIA_GAMES: "Games", C_MEDIA_MESSAGES: "Messages", C_MEDIA_CD: "CD", C_MEDIA_VCR: "VCR", C_MEDIA_TUNER: "Tuner", C_QUIT: "Quit",
  C_MEDIA_TAPE: "Tape", C_MEDIA_CABLE: "Cable", C_MEDIA_SATELLITE: "Satellite", C_MEDIA_HOME: "Media Home", C_CHAN_INC: "Channel Up", C_CHAN_DEC: "Channel Down", C_MEDIA_VCR_PLUS: "VCR Plus",
  C_PLAY: "Play", C_PAUSE: "Pause", C_REC: "Record", C_FF: "Fast Forward", C_RW: "Rewind", C_NEXT: "Next Track", C_PREV: "Previous Track", C_STOP: "Stop", C_EJECT: "Eject",
  C_SHUFFLE: "Shuffle", C_REPEAT: "Repeat", C_SLOW2: "Slow Tracking", C_STOP_EJECT: "Stop/Eject", C_PP: "Play/Pause", C_SLOW: "Slow",

  // Menus and other consumer controls
  C_MENU: "Menu", C_MENU_PICK: "Menu Select", C_MENU_UP: "Menu Up", C_MENU_DOWN: "Menu Down", C_MENU_LEFT: "Menu Left", C_MENU_RIGHT: "Menu Right", C_MENU_ESC: "Menu Esc",
  C_MENU_INC: "Menu Value Up", C_MENU_DEC: "Menu Value Down",
  C_RED: "Red Button", C_GREEN: "Green Button", C_BLUE: "Blue Button", C_YELLOW: "Yellow Button", C_HELP: "Help", C_VOICE_COMMAND: "Voice Command", C_ALT_AUDIO_INC: "Next Audio Track",

  // Application launch
  C_AL_CCC: "Control Config", C_AL_WORD: "Word Processor", C_AL_TEXT_EDITOR: "Text Editor", C_AL_SHEET: "Spreadsheet", C_AL_GRAPHICS_EDITOR: "Graphics Editor", C_AL_PRESENTATION: "Presentation",
  C_AL_DB: "Database", C_AL_MAIL: "Email", C_AL_NEWS: "News", C_AL_VOICEMAIL: "Voicemail", C_AL_CONTACTS: "Contacts", C_AL_CAL: "Calendar", C_AL_TASK_MANAGER: "Task Manager",
  C_AL_JOURNAL: "Journal", C_AL_FINANCE: "Finance", C_AL_CALC: "Calculator", C_AL_AV_CAPTURE_PLAYBACK: "A/V Capture", C_AL_MY_COMPUTER: "My Computer", C_AL_WWW: "Browser", C_AL_CHAT: "Chat",
  C_AL_LOGOFF: "Log Off", C_AL_LOCK: "Lock Screen", C_AL_CONTROL_PANEL: "Control Panel", C_AL_SELECT_TASK: "Task Switcher", C_AL_NEXT_TASK: "Next App", C_AL_PREV_TASK: "Previous App",
  C_AL_HELP: "Help Center", C_AL_DOCS: "Documents", C_AL_SPELL: "Spell Check", C_AL_KEYBOARD_LAYOUT: "Keyboard Layout", C_AL_FILES: "File Browser", C_AL_IMAGES: "Image Browser",
  C_AL_AUDIO: "Audio Browser", C_AL_MOVIES: "Movie Browser", C_AL_IM: "Messenger", C_AL_TIPS: "Tips",

  // Application controls
  C_AC_NEW: "New", C_AC_OPEN: "Open", C_AC_CLOSE: "Close", C_AC_EXIT: "Exit", C_AC_SAVE: "Save", C_AC_PRINT: "Print", C_AC_PROPS: "Properties", C_AC_FIND: "Find", C_AC_SEARCH: "Search",
  C_AC_GOTO: "Go To", C_AC_HOME: "Home", C_AC_BACK: "Back", C_AC_FORWARD: "Forward", C_AC_STOP: "Stop", C_AC_REFRESH: "Refresh", C_AC_BOOKMARKS: "Bookmarks",
  C_AC_ZOOM_IN: "Zoom In", C_AC_ZOOM_OUT: "Zoom Out", C_AC_ZOOM: "Zoom", C_AC_VIEW_TOGGLE: "View Toggle", C_AC_SCROLL_UP: "Scroll Up", C_AC_SCROLL_DOWN: "Scroll Down", C_AC_EDIT: "Edit",
  C_AC_CANCEL: "Cancel", C_AC_INS: "Insert Mode", C_AC_DEL: "Delete", C_AC_REPLY: "Reply", C_AC_FORWARD_MAIL: "Forward Mail", C_AC_SEND: "Send", GLOBE: "Globe",
  C_AC_DESKTOP_SHOW_ALL_WINDOWS: "Show All Windows", C_AC_DESKTOP_SHOW_ALL_APPLICATIONS: "Show All Apps",

  // Input assist
  C_KBIA_PREV: "Assist Previous", C_KBIA_NEXT: "Assist Next", C_KBIA_PREV_GRP: "Assist Previous Group", C_KBIA_NEXT_GRP: "Assist Next Group", C_KBIA_ACCEPT: "Assist Accept", C_KBIA_CANCEL: "Assist Cancel",

  // Power and lock
  SYS_PWR: "Power Down", SYS_SLEEP: "Sleep", SYS_WAKE: "Wake", K_PWR: "Power", K_SLEEP: "Sleep", C_PWR: "Power", C_RESET: "Reset", C_SLEEP: "Sleep", C_SLEEP_MODE: "Sleep Mode", C_AL_SCREEN_SAVER: "Screen Saver",
};

// Symbols: what a map key shows. A key not listed here shows its role, and Keypad keys get a KP prefix.
export const KEYCODE_SYMBOLS: Record<string, string> = {
  LCTRL: "Ctrl(L)", RCTRL: "Ctrl(R)", LSHFT: "Shift(L)", RSHFT: "Shift(R)", LALT: "Alt(L)", RALT: "Alt(R)", LGUI: "Win(L)", RGUI: "Win(R)",
  PG_UP: "PgUp", PG_DN: "PgDn", CAPS: "Caps", SLCK: "ScrLk", PSCRN: "PrtSc", KP_NUM: "NumLk",
  LANG1: "한/영", LANG2: "한자",
};

// Symbols drawn as an icon instead of text.
export const KEYCODE_ICONS: Partial<Record<string, IconName>> = {
  C_VOL_UP: "volumeUp", K_VOL_UP: "volumeUp", K_VOL_UP2: "volumeUp", C_VOL_DN: "volumeDown", K_VOL_DN: "volumeDown", K_VOL_DN2: "volumeDown",
  C_MUTE: "mute", K_MUTE: "mute", K_MUTE2: "mute", C_PP: "playPause", K_PP: "playPause", C_PLAY: "play", C_PAUSE: "pause", C_STOP: "stop", K_STOP2: "stop",
  C_NEXT: "nextTrack", K_NEXT: "nextTrack", C_PREV: "previousTrack", K_PREV: "previousTrack", C_FF: "fastForward", C_RW: "rewind",
  C_EJECT: "eject", K_EJECT: "eject", C_REC: "record", C_SHUFFLE: "shuffle", C_REPEAT: "repeat", C_BRI_UP: "brightnessUp", C_BRI_DN: "brightnessDown",
};

export const TILE_SIZE = 16;
export const SCALE = 3;
export const MAP_COLS = 30;
export const MAP_ROWS = 20;
export const CANVAS_WIDTH = MAP_COLS * TILE_SIZE;
export const CANVAS_HEIGHT = MAP_ROWS * TILE_SIZE;
export const CHAR_SIZE = 16;

// Colors - PICO-8 inspired palette
export const COLORS = {
  // Floor
  FLOOR_LIGHT: 0xfffcf5,
  FLOOR_DARK: 0xf4ecd8,
  FLOOR_GRID: 0xe6dfca,

  // Walls
  WALL_TOP: 0x8b7355,
  WALL_FACE: 0x6b5540,
  WALL_DARK: 0x5a4530,

  // Furniture
  DESK_TOP: 0xc4956a,
  DESK_SIDE: 0xa07850,
  MONITOR_FRAME: 0x3a3a5c,
  MONITOR_SCREEN: 0x4488ff,
  MONITOR_SCREEN_OFF: 0x2a2a3a,
  CHAIR_SEAT: 0x6a4040,
  CHAIR_BACK: 0x5a3030,

  // Whiteboard
  WHITEBOARD_BG: 0xffffff,
  WHITEBOARD_FRAME: 0x555555,

  // Bookshelf
  SHELF_WOOD: 0x8b6543,
  BOOK_RED: 0xcc3333,
  BOOK_BLUE: 0x3366cc,
  BOOK_GREEN: 0x339933,
  BOOK_YELLOW: 0xccaa33,

  // Plants
  PLANT_POT: 0x8b5e3c,
  PLANT_LEAF: 0x228833,
  PLANT_LEAF_LIGHT: 0x33aa44,

  // Server
  SERVER_BODY: 0x555566,
  SERVER_LIGHT: 0x33ff33,

  // Characters
  SKIN: 0xffcc99,
  HAIR_BLACK: 0x2a2a2a,

  // Carpet/rug area
  CARPET: 0x4466aa,
  CARPET_DARK: 0x385590,

  // UI
  LABEL_BG: 0x0066cc,
  LABEL_TEXT: 0xffffff,
  BUBBLE_BG: 0xffffff,
  BUBBLE_BORDER: 0xd1d1d6,
  ZZZ_COLOR: 0x86868b,
} as const;

// Character color variants
export const CHAR_COLORS: Record<string, { hair: number; shirt: number }> = {
  "char-red": { hair: 0x993333, shirt: 0xcc4444 },
  "char-blue": { hair: 0x333366, shirt: 0x4466aa },
  "char-green": { hair: 0x336633, shirt: 0x44aa66 },
  "char-yellow": { hair: 0x666633, shirt: 0xaaaa44 },
  "char-orange": { hair: 0x664433, shirt: 0xcc8833 },
  "char-lead": { hair: 0x222222, shirt: 0x333333 },
};

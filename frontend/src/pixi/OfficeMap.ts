import { Graphics, Container } from "pixi.js";
import {
  TILE_SIZE,
  MAP_COLS,
  MAP_ROWS,
  COLORS,
} from "../utils/constants";

// Office layout: 0=floor, 1=wall, 2=carpet
const LAYOUT: number[][] = createLayout();

function createLayout(): number[][] {
  const map: number[][] = [];
  for (let y = 0; y < MAP_ROWS; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_COLS; x++) {
      // Walls around edges
      if (y === 0 || y === MAP_ROWS - 1 || x === 0 || x === MAP_COLS - 1) {
        map[y][x] = 1;
      }
      // Second row wall (thicker top wall)
      else if (y === 1) {
        map[y][x] = 1;
      }
      // Carpet area — bottom-right lounge
      else if (x >= 40 && y >= 20 && y <= 23) {
        map[y][x] = 2;
      }
      // Default floor
      else {
        map[y][x] = 0;
      }
    }
  }
  return map;
}

// All desk tile positions (2 tiles wide each) — used by collision map
const DESK_TILES: [number, number][] = [
  // Row 1 (y=4): 6 desks
  [3, 4], [4, 4], [10, 4], [11, 4], [17, 4], [18, 4],
  [24, 4], [25, 4], [31, 4], [32, 4], [38, 4], [39, 4],
  // Row 2 (y=10): 6 desks
  [3, 10], [4, 10], [10, 10], [11, 10], [17, 10], [18, 10],
  [24, 10], [25, 10], [31, 10], [32, 10], [38, 10], [39, 10],
  // Row 3 (y=16): 6 desks
  [3, 16], [4, 16], [10, 16], [11, 16], [17, 16], [18, 16],
  [24, 16], [25, 16], [31, 16], [32, 16], [38, 16], [39, 16],
  // Lead desk (top-right)
  [44, 2], [45, 2],
];

// Points of interest for agent wandering (exported for AgentCharacter)
export const POI_LOCATIONS: [number, number][] = [
  [44, 8],   // Whiteboard area
  [44, 14],  // Coffee machine area
  [12, 22],  // Meeting table area
  [30, 22],  // Bookshelf / reading area
  [42, 22],  // Bottom-right lounge area
];

// Collision map: true = walkable
export function createCollisionMap(): boolean[][] {
  const coll: boolean[][] = [];
  for (let y = 0; y < MAP_ROWS; y++) {
    coll[y] = [];
    for (let x = 0; x < MAP_COLS; x++) {
      coll[y][x] = LAYOUT[y][x] !== 1;
    }
  }

  // Mark furniture as non-walkable
  const furniturePositions: [number, number][] = [
    ...DESK_TILES,
    // Whiteboard
    [44, 6], [45, 6], [46, 6], [44, 7], [45, 7], [46, 7],
    // Bookshelves (bottom area)
    [28, 21], [29, 21], [30, 21], [31, 21], [32, 21], [33, 21],
    [28, 22], [29, 22], [30, 22], [31, 22], [32, 22], [33, 22],
    // Plants
    [2, 2], [20, 2], [2, 23], [20, 23],
    // Servers
    [3, 13], [4, 13],
    // Coffee machine
    [44, 12], [45, 12],
    // Meeting table
    [10, 21], [11, 21], [12, 21], [13, 21],
    [10, 22], [11, 22], [12, 22], [13, 22],
  ];

  for (const [x, y] of furniturePositions) {
    if (y >= 0 && y < MAP_ROWS && x >= 0 && x < MAP_COLS) {
      coll[y][x] = false;
    }
  }

  return coll;
}

export function createOfficeMap(): Container {
  const container = new Container();

  // Draw floor
  const floor = new Graphics();
  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      const tile = LAYOUT[y][x];
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;

      if (tile === 0) {
        // Floor tile with subtle grid
        const isLight = (x + y) % 2 === 0;
        floor.rect(px, py, TILE_SIZE, TILE_SIZE);
        floor.fill(isLight ? COLORS.FLOOR_LIGHT : COLORS.FLOOR_DARK);
        // Grid line
        floor.rect(px, py, TILE_SIZE, 1);
        floor.fill(COLORS.FLOOR_GRID);
        floor.rect(px, py, 1, TILE_SIZE);
        floor.fill(COLORS.FLOOR_GRID);
      } else if (tile === 1) {
        // Wall
        floor.rect(px, py, TILE_SIZE, TILE_SIZE);
        floor.fill(COLORS.WALL_TOP);
        // Wall face detail
        floor.rect(px, py + TILE_SIZE - 4, TILE_SIZE, 4);
        floor.fill(COLORS.WALL_FACE);
        // Brick pattern
        if (x % 2 === 0) {
          floor.rect(px + 2, py + 2, TILE_SIZE - 4, 5);
          floor.fill(COLORS.WALL_DARK);
        }
      } else if (tile === 2) {
        // Carpet
        floor.rect(px, py, TILE_SIZE, TILE_SIZE);
        floor.fill((x + y) % 2 === 0 ? COLORS.CARPET : COLORS.CARPET_DARK);
      }
    }
  }
  container.addChild(floor);

  // Draw furniture
  const furniture = new Graphics();
  drawDesks(furniture);
  drawWhiteboard(furniture);
  drawBookshelves(furniture, 28, 21);
  drawPlants(furniture);
  drawServers(furniture);
  drawCoffeeMachine(furniture);
  drawMeetingTable(furniture);
  container.addChild(furniture);

  return container;
}

function drawDesks(g: Graphics) {
  const deskPositions = [
    // Row 1 (y=4): 6 desks
    { x: 3, y: 4 }, { x: 10, y: 4 }, { x: 17, y: 4 },
    { x: 24, y: 4 }, { x: 31, y: 4 }, { x: 38, y: 4 },
    // Row 2 (y=10): 6 desks
    { x: 3, y: 10 }, { x: 10, y: 10 }, { x: 17, y: 10 },
    { x: 24, y: 10 }, { x: 31, y: 10 }, { x: 38, y: 10 },
    // Row 3 (y=16): 6 desks
    { x: 3, y: 16 }, { x: 10, y: 16 }, { x: 17, y: 16 },
    { x: 24, y: 16 }, { x: 31, y: 16 }, { x: 38, y: 16 },
    // Lead desk (top-right)
    { x: 44, y: 2 },
  ];

  for (const desk of deskPositions) {
    const px = desk.x * TILE_SIZE;
    const py = desk.y * TILE_SIZE;

    // Desk surface (2 tiles wide)
    g.rect(px, py, TILE_SIZE * 2, TILE_SIZE);
    g.fill(COLORS.DESK_TOP);
    // Desk front edge
    g.rect(px, py + TILE_SIZE - 3, TILE_SIZE * 2, 3);
    g.fill(COLORS.DESK_SIDE);

    // Monitor
    g.rect(px + 5, py - 8, 10, 8);
    g.fill(COLORS.MONITOR_FRAME);
    g.rect(px + 6, py - 7, 8, 5);
    g.fill(COLORS.MONITOR_SCREEN);
    // Monitor stand
    g.rect(px + 8, py, 4, 2);
    g.fill(COLORS.MONITOR_FRAME);

    // Second monitor on wider desks
    g.rect(px + TILE_SIZE + 3, py - 8, 10, 8);
    g.fill(COLORS.MONITOR_FRAME);
    g.rect(px + TILE_SIZE + 4, py - 7, 8, 5);
    g.fill(COLORS.MONITOR_SCREEN);
    g.rect(px + TILE_SIZE + 6, py, 4, 2);
    g.fill(COLORS.MONITOR_FRAME);
  }
}

function drawWhiteboard(g: Graphics) {
  const px = 44 * TILE_SIZE;
  const py = 6 * TILE_SIZE;

  // Board frame
  g.rect(px - 2, py - 2, TILE_SIZE * 3 + 4, TILE_SIZE * 2 + 4);
  g.fill(COLORS.WHITEBOARD_FRAME);
  // Board surface
  g.rect(px, py, TILE_SIZE * 3, TILE_SIZE * 2);
  g.fill(COLORS.WHITEBOARD_BG);

  // Draw some "content lines" on the whiteboard with Graphics
  for (let line = 0; line < 3; line++) {
    g.rect(px + 4, py + 4 + line * 7, 20 + (line % 2) * 8, 2);
    g.fill(0xaaaaaa);
  }

  // Colored status dots at the bottom
  const dotColors = [0xcc3333, 0x3366cc, 0x339933, 0xccaa33];
  for (let i = 0; i < dotColors.length; i++) {
    g.rect(px + 4 + i * 10, py + TILE_SIZE * 2 - 6, 6, 4);
    g.fill(dotColors[i]);
  }
}

function drawBookshelves(g: Graphics, startX: number, startY: number) {
  for (let i = 0; i < 6; i++) {
    const px = (startX + i) * TILE_SIZE;
    const py = startY * TILE_SIZE;

    // Shelf structure
    g.rect(px, py, TILE_SIZE, TILE_SIZE * 2);
    g.fill(COLORS.SHELF_WOOD);

    // Books
    const bookColors = [COLORS.BOOK_RED, COLORS.BOOK_BLUE, COLORS.BOOK_GREEN, COLORS.BOOK_YELLOW];
    for (let row = 0; row < 3; row++) {
      for (let b = 0; b < 3; b++) {
        const bx = px + 2 + b * 4;
        const by = py + 2 + row * 9;
        g.rect(bx, by, 3, 7);
        g.fill(bookColors[(i + b + row) % bookColors.length]);
      }
    }
  }
}

function drawPlants(g: Graphics) {
  const positions = [
    [2, 2],
    [20, 2],
    [2, 23],
    [20, 23],
    // Extra plants for visual breaks
    [2, 13],
    [48, 13],
  ];

  for (const [x, y] of positions) {
    const px = x * TILE_SIZE + TILE_SIZE / 2;
    const py = y * TILE_SIZE + TILE_SIZE / 2;

    // Pot
    g.rect(px - 4, py + 1, 8, 6);
    g.fill(COLORS.PLANT_POT);

    // Leaves (diamond shape)
    g.circle(px, py - 3, 5);
    g.fill(COLORS.PLANT_LEAF);
    g.circle(px - 2, py - 5, 3);
    g.fill(COLORS.PLANT_LEAF_LIGHT);
    g.circle(px + 2, py - 4, 3);
    g.fill(COLORS.PLANT_LEAF_LIGHT);
  }
}

function drawServers(g: Graphics) {
  const positions: [number, number][] = [
    [3, 13],
    [4, 13],
  ];

  for (const [x, y] of positions) {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;

    // Server rack body
    g.rect(px + 1, py, TILE_SIZE - 2, TILE_SIZE * 2);
    g.fill(COLORS.SERVER_BODY);

    // Slots
    for (let s = 0; s < 4; s++) {
      g.rect(px + 3, py + 2 + s * 7, TILE_SIZE - 6, 5);
      g.fill(0x444455);
      // Status light
      g.circle(px + TILE_SIZE - 5, py + 4 + s * 7, 1);
      g.fill(COLORS.SERVER_LIGHT);
    }
  }
}

function drawCoffeeMachine(g: Graphics) {
  const px = 44 * TILE_SIZE;
  const py = 12 * TILE_SIZE;

  // Machine body
  g.rect(px, py, TILE_SIZE * 2, TILE_SIZE);
  g.fill(COLORS.COFFEE_BODY);
  // Top panel
  g.rect(px + 2, py + 1, TILE_SIZE * 2 - 4, 4);
  g.fill(COLORS.COFFEE_TOP);
  // Cup slot
  g.rect(px + 6, py + 7, 8, 6);
  g.fill(0x333344);
  // Cup
  g.rect(px + 8, py + 8, 5, 5);
  g.fill(COLORS.COFFEE_CUP);
  // Coffee in cup
  g.rect(px + 9, py + 9, 3, 2);
  g.fill(COLORS.COFFEE_LIQUID);
  // Status light
  g.circle(px + TILE_SIZE * 2 - 4, py + 3, 1);
  g.fill(COLORS.SERVER_LIGHT);
}

function drawMeetingTable(g: Graphics) {
  const px = 10 * TILE_SIZE;
  const py = 21 * TILE_SIZE;

  // Large table surface (4×2 tiles)
  g.rect(px, py, TILE_SIZE * 4, TILE_SIZE * 2);
  g.fill(COLORS.MEETING_TABLE);
  // Table edge
  g.rect(px, py + TILE_SIZE * 2 - 3, TILE_SIZE * 4, 3);
  g.fill(COLORS.MEETING_TABLE_SIDE);
  // Center line
  g.rect(px + TILE_SIZE * 2 - 1, py + 2, 2, TILE_SIZE * 2 - 5);
  g.fill(COLORS.MEETING_TABLE_SIDE);
  // Chairs (small rectangles around table)
  const chairColor = COLORS.CHAIR_SEAT;
  // Top chairs
  g.rect(px + 8, py - 4, 8, 4); g.fill(chairColor);
  g.rect(px + TILE_SIZE * 2 + 4, py - 4, 8, 4); g.fill(chairColor);
  // Bottom chairs
  g.rect(px + 8, py + TILE_SIZE * 2, 8, 4); g.fill(chairColor);
  g.rect(px + TILE_SIZE * 2 + 4, py + TILE_SIZE * 2, 8, 4); g.fill(chairColor);
}

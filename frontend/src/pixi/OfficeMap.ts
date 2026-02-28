import { Graphics, Container } from "pixi.js";
import {
  TILE_SIZE,
  MAP_COLS,
  MAP_ROWS,
  COLORS,
} from "../utils/constants";

// Office layout: 0=floor, 1=wall, 2=carpet, 3=desk, 4=whiteboard, 5=bookshelf, 6=plant, 7=server
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
      // Carpet area bottom-right
      else if (x >= 20 && y >= 14) {
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
  const furniturePositions = [
    // Desks (each desk is 2x1)
    [5, 5], [6, 5], [11, 5], [12, 5], [17, 5], [18, 5], // Row 1 desks
    [8, 12], [9, 12], [14, 12], [15, 12], // Row 2 desks
    [23, 2], [24, 2], // Lead desk
    // Whiteboard
    [22, 6], [23, 6], [24, 6], [22, 7], [23, 7], [24, 7],
    // Bookshelves
    [22, 16], [23, 16], [24, 16], [25, 16], [26, 16], [27, 16],
    [22, 17], [23, 17], [24, 17], [25, 17], [26, 17], [27, 17],
    // Plants
    [2, 2], [15, 2], [2, 18], [15, 18],
    // Servers
    [3, 16], [4, 16],
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
  drawBookshelves(furniture);
  drawPlants(furniture);
  drawServers(furniture);
  container.addChild(furniture);

  return container;
}

function drawDesks(g: Graphics) {
  const deskPositions = [
    { x: 5, y: 5, label: "" },
    { x: 11, y: 5, label: "" },
    { x: 17, y: 5, label: "" },
    { x: 8, y: 12, label: "" },
    { x: 14, y: 12, label: "" },
    { x: 23, y: 2, label: "" },
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
  const px = 22 * TILE_SIZE;
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

function drawBookshelves(g: Graphics) {
  const startX = 22;
  const startY = 16;

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
    [15, 2],
    [2, 18],
    [15, 18],
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
  const positions = [
    [3, 16],
    [4, 16],
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

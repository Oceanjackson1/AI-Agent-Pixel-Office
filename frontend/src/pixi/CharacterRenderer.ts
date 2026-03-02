import { Graphics, Container, Text, TextStyle } from "pixi.js";
import { COLORS, CHAR_COLORS } from "../utils/constants";

/**
 * Programmatic pixel character renderer.
 * Creates tiny pixel art characters using Graphics primitives.
 * Each character is a 16x16 pixel person.
 */

export function createCharacterFrames(
  spriteKey: string,
  state: "idle" | "walk1" | "walk2" | "working" | "sleeping",
  direction: "down" | "up" | "left" | "right" = "down"
): Graphics {
  const g = new Graphics();
  const colors = CHAR_COLORS[spriteKey] || CHAR_COLORS["char-blue"];

  switch (state) {
    case "idle":
      drawIdleCharacter(g, colors, direction);
      break;
    case "walk1":
      drawWalkFrame1(g, colors, direction);
      break;
    case "walk2":
      drawWalkFrame2(g, colors, direction);
      break;
    case "working":
      drawWorkingCharacter(g, colors);
      break;
    case "sleeping":
      drawSleepingCharacter(g, colors);
      break;
  }

  return g;
}

function drawIdleCharacter(
  g: Graphics,
  colors: { hair: number; shirt: number },
  _dir: string
) {
  // Head
  g.rect(5, 0, 6, 6);
  g.fill(COLORS.SKIN);
  // Hair
  g.rect(5, 0, 6, 2);
  g.fill(colors.hair);
  // Eyes
  g.rect(6, 3, 1, 1);
  g.fill(0x000000);
  g.rect(9, 3, 1, 1);
  g.fill(0x000000);

  // Body/shirt
  g.rect(4, 6, 8, 5);
  g.fill(colors.shirt);

  // Arms
  g.rect(2, 6, 2, 4);
  g.fill(colors.shirt);
  g.rect(12, 6, 2, 4);
  g.fill(colors.shirt);

  // Hands
  g.rect(2, 10, 2, 1);
  g.fill(COLORS.SKIN);
  g.rect(12, 10, 2, 1);
  g.fill(COLORS.SKIN);

  // Legs
  g.rect(5, 11, 3, 4);
  g.fill(0x444466);
  g.rect(8, 11, 3, 4);
  g.fill(0x444466);

  // Shoes
  g.rect(4, 15, 4, 1);
  g.fill(0x333333);
  g.rect(8, 15, 4, 1);
  g.fill(0x333333);
}

function drawWalkFrame1(
  g: Graphics,
  colors: { hair: number; shirt: number },
  _dir: string
) {
  // Head (slightly bobbing)
  g.rect(5, 1, 6, 6);
  g.fill(COLORS.SKIN);
  g.rect(5, 1, 6, 2);
  g.fill(colors.hair);
  g.rect(6, 4, 1, 1);
  g.fill(0x000000);
  g.rect(9, 4, 1, 1);
  g.fill(0x000000);

  // Body
  g.rect(4, 7, 8, 5);
  g.fill(colors.shirt);

  // Arms swinging - left forward
  g.rect(1, 7, 3, 4);
  g.fill(colors.shirt);
  g.rect(12, 8, 3, 4);
  g.fill(colors.shirt);

  // Legs - left forward
  g.rect(4, 12, 3, 3);
  g.fill(0x444466);
  g.rect(9, 12, 3, 3);
  g.fill(0x444466);

  // Shoes
  g.rect(3, 15, 4, 1);
  g.fill(0x333333);
  g.rect(9, 15, 4, 1);
  g.fill(0x333333);
}

function drawWalkFrame2(
  g: Graphics,
  colors: { hair: number; shirt: number },
  _dir: string
) {
  // Head
  g.rect(5, 0, 6, 6);
  g.fill(COLORS.SKIN);
  g.rect(5, 0, 6, 2);
  g.fill(colors.hair);
  g.rect(6, 3, 1, 1);
  g.fill(0x000000);
  g.rect(9, 3, 1, 1);
  g.fill(0x000000);

  // Body
  g.rect(4, 6, 8, 5);
  g.fill(colors.shirt);

  // Arms swinging - right forward
  g.rect(1, 8, 3, 4);
  g.fill(colors.shirt);
  g.rect(12, 7, 3, 4);
  g.fill(colors.shirt);

  // Legs - right forward
  g.rect(4, 12, 3, 3);
  g.fill(0x444466);
  g.rect(9, 12, 3, 3);
  g.fill(0x444466);

  g.rect(4, 15, 4, 1);
  g.fill(0x333333);
  g.rect(8, 15, 4, 1);
  g.fill(0x333333);
}

function drawWorkingCharacter(
  g: Graphics,
  colors: { hair: number; shirt: number }
) {
  // Seated, facing "up" (toward desk)
  // Head
  g.rect(5, 2, 6, 6);
  g.fill(COLORS.SKIN);
  g.rect(5, 2, 6, 3);
  g.fill(colors.hair);

  // Body
  g.rect(4, 8, 8, 4);
  g.fill(colors.shirt);

  // Arms extended forward (typing)
  g.rect(2, 8, 2, 3);
  g.fill(colors.shirt);
  g.rect(12, 8, 2, 3);
  g.fill(colors.shirt);
  // Hands on keyboard
  g.rect(1, 8, 2, 1);
  g.fill(COLORS.SKIN);
  g.rect(13, 8, 2, 1);
  g.fill(COLORS.SKIN);

  // Chair
  g.rect(3, 12, 10, 3);
  g.fill(COLORS.CHAIR_SEAT);
  g.rect(3, 12, 10, 1);
  g.fill(COLORS.CHAIR_BACK);
}

function drawSleepingCharacter(
  g: Graphics,
  colors: { hair: number; shirt: number }
) {
  // Slumped over desk
  // Head laying sideways
  g.rect(3, 2, 7, 5);
  g.fill(COLORS.SKIN);
  g.rect(3, 2, 7, 2);
  g.fill(colors.hair);
  // Closed eyes (line instead of dot)
  g.rect(5, 4, 2, 1);
  g.fill(0x000000);

  // Body
  g.rect(4, 7, 8, 5);
  g.fill(colors.shirt);

  // Arms on desk
  g.rect(1, 7, 3, 2);
  g.fill(colors.shirt);
  g.rect(12, 7, 3, 2);
  g.fill(colors.shirt);

  // Chair
  g.rect(3, 12, 10, 3);
  g.fill(COLORS.CHAIR_SEAT);
}

/**
 * Create a role label badge
 */
export function createRoleLabel(text: string): Container {
  const container = new Container();

  const style = new TextStyle({
    fontSize: 9,
    fill: COLORS.LABEL_TEXT,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif',
    fontWeight: "bold",
    stroke: { color: 0x0044aa, width: 1 },
  });

  const label = new Text({ text, style, resolution: 3 });
  label.anchor.set(0.5, 0.5);

  // Background
  const bg = new Graphics();
  const padding = 4;
  const width = Math.max(label.width + padding * 2, 30);
  bg.roundRect(
    -width / 2,
    -label.height / 2 - 2,
    width,
    label.height + 4,
    3
  );
  bg.fill(COLORS.LABEL_BG);
  // Remove harsh dark stroke, optionally add a softer one or none
  bg.stroke({ color: 0xffffff, width: 0.5 });

  container.addChild(bg);
  container.addChild(label);

  return container;
}

/**
 * Create ZZZ floating text for sleeping characters
 */
export function createZzzEffect(): Text {
  const style = new TextStyle({
    fontSize: 8,
    fill: COLORS.ZZZ_COLOR,
    fontFamily: "monospace",
    fontWeight: "bold",
  });
  return new Text({ text: "z", style, resolution: 3 });
}

/**
 * Create task bubble
 */
export function createTaskBubble(task: string): Container {
  const container = new Container();
  const isLongText = task.length > 18;
  const paddingX = isLongText ? 5 : 3;
  const paddingY = isLongText ? 4 : 3;
  const bubbleMaxWidth = isLongText ? 160 : 110;

  const style = new TextStyle({
    fontSize: 9,
    fill: 0x1d1d1f,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif',
    fontWeight: "600",
    align: "center",
    breakWords: true,
    lineHeight: 11,
    wordWrap: true,
    wordWrapWidth: bubbleMaxWidth - paddingX * 2,
  });

  const text = new Text({ text: task, style, resolution: 3 });
  text.anchor.set(0.5, 0.5);

  const bg = new Graphics();
  const minWidth = isLongText ? 48 : 28;
  const w = Math.min(Math.max(text.width + paddingX * 2, minWidth), bubbleMaxWidth);
  const h = text.height + paddingY * 2;
  bg.roundRect(-w / 2, -h, w, h, 4); // Softer bubble corners
  bg.fill(COLORS.BUBBLE_BG);
  bg.stroke({ color: COLORS.BUBBLE_BORDER, width: 0.5 });

  // Speech bubble pointer
  bg.moveTo(-3, 0);
  bg.lineTo(0, 4);
  bg.lineTo(3, 0);
  bg.fill(COLORS.BUBBLE_BG);

  text.x = 0;
  text.y = -h / 2;

  container.addChild(bg);
  container.addChild(text);

  return container;
}

import { Container, Graphics, Text } from "pixi.js";
import type { AgentState, AgentStatus } from "../types/agent";
import {
  createCharacterFrames,
  createRoleLabel,
  createZzzEffect,
  createTaskBubble,
} from "./CharacterRenderer";
import { TILE_SIZE } from "../utils/constants";

type AnimState = "sleeping" | "waking" | "walking" | "working" | "idle" | "thinking";
type FrameKey = "idle" | "walk1" | "walk2" | "working" | "sleeping";

export class AgentCharacter {
  public container: Container;
  public agentId: string;
  public gridX: number;
  public gridY: number;

  private spriteKey: string;
  private roleLabel: Container;
  private zzzText: Text | null = null;
  private taskBubble: Container | null = null;
  private animState: AnimState = "sleeping";
  private walkFrame = 0;
  private walkTimer = 0;
  private targetGridX: number;
  private targetGridY: number;
  private deskGridX: number;
  private deskGridY: number;
  private zzzPhase = 0;
  private idleTimer = 0;
  private workAnimTimer = 0;

  // Pre-cached frames to avoid destroy/recreate per animation tick
  private frames: Record<FrameKey, Graphics>;
  private activeFrameKey: FrameKey = "sleeping";

  constructor(agent: AgentState) {
    this.agentId = agent.id;
    this.spriteKey = agent.character_sprite;
    this.deskGridX = agent.desk_position[0];
    this.deskGridY = agent.desk_position[1] + 1; // Sit below the desk
    this.gridX = this.deskGridX;
    this.gridY = this.deskGridY;
    this.targetGridX = this.gridX;
    this.targetGridY = this.gridY;

    this.container = new Container();
    this.container.x = this.gridX * TILE_SIZE;
    this.container.y = this.gridY * TILE_SIZE;

    // Pre-create all animation frames (hidden by default)
    this.frames = {
      idle: createCharacterFrames(this.spriteKey, "idle"),
      walk1: createCharacterFrames(this.spriteKey, "walk1"),
      walk2: createCharacterFrames(this.spriteKey, "walk2"),
      working: createCharacterFrames(this.spriteKey, "working"),
      sleeping: createCharacterFrames(this.spriteKey, "sleeping"),
    };
    for (const key of Object.keys(this.frames) as FrameKey[]) {
      this.frames[key].visible = false;
      this.container.addChild(this.frames[key]);
    }
    // Show sleeping frame initially
    this.frames.sleeping.visible = true;
    this.activeFrameKey = "sleeping";

    // Identity label (name + role)
    this.roleLabel = createRoleLabel(`${agent.name} · ${agent.role_label_zh}`);
    this.roleLabel.x = 8; // center of 16px character
    this.roleLabel.y = -9;
    this.container.addChild(this.roleLabel);

    // Initialize based on status
    this.setStatus(agent.status, agent.current_task);
  }

  setStatus(status: AgentStatus, currentTask: string | null) {
    const prevState = this.animState;

    switch (status) {
      case "working":
        if (prevState === "sleeping" || prevState === "idle") {
          if (
            Math.abs(this.gridX - this.deskGridX) > 1 ||
            Math.abs(this.gridY - this.deskGridY) > 1
          ) {
            this.animState = "walking";
            this.setWalkPath(this.deskGridX, this.deskGridY);
          } else {
            this.animState = "working";
          }
        } else {
          this.animState = "working";
        }
        this.setTaskText(currentTask);
        break;

      case "idle":
        this.animState = "idle";
        this.idleTimer = 0;
        this.clearTaskText();
        break;

      case "thinking":
        this.animState = "thinking";
        this.setWalkPath(
          this.deskGridX + Math.floor(Math.random() * 4) - 2,
          this.deskGridY + Math.floor(Math.random() * 3)
        );
        break;

      case "sleeping":
      case "offline":
        this.animState = "sleeping";
        this.clearTaskText();
        break;
    }

    this.updateVisuals();
  }

  private setWalkPath(toX: number, toY: number) {
    this.targetGridX = Math.max(2, Math.min(toX, 27));
    this.targetGridY = Math.max(3, Math.min(toY, 17));
  }

  private setTaskText(task: string | null) {
    this.clearTaskText();
    if (task) {
      this.taskBubble = createTaskBubble(task);
      this.taskBubble.x = 8;
      this.taskBubble.y = -20;
      this.container.addChild(this.taskBubble);
    }
  }

  private clearTaskText() {
    if (this.taskBubble) {
      this.container.removeChild(this.taskBubble);
      this.taskBubble.destroy();
      this.taskBubble = null;
    }
  }

  private showFrame(key: FrameKey) {
    if (key === this.activeFrameKey) return;
    this.frames[this.activeFrameKey].visible = false;
    this.frames[this.activeFrameKey].y = 0; // reset any animation offset
    this.frames[key].visible = true;
    this.frames[key].y = 0;
    this.activeFrameKey = key;
  }

  private updateVisuals() {
    // Manage zzz text
    if (this.animState === "sleeping") {
      if (!this.zzzText) {
        this.zzzText = createZzzEffect();
        this.zzzText.x = 14;
        this.zzzText.y = -2;
        this.container.addChild(this.zzzText);
      }
    } else {
      if (this.zzzText) {
        this.container.removeChild(this.zzzText);
        this.zzzText.destroy();
        this.zzzText = null;
      }
    }

    // Switch visible frame
    switch (this.animState) {
      case "sleeping":
        this.showFrame("sleeping");
        break;
      case "walking":
      case "waking":
      case "thinking":
        this.showFrame(this.walkFrame % 2 === 0 ? "walk1" : "walk2");
        break;
      case "working":
        this.showFrame("working");
        break;
      case "idle":
        this.showFrame("idle");
        break;
    }
  }

  update(delta: number) {
    switch (this.animState) {
      case "sleeping":
        this.updateSleeping(delta);
        break;
      case "walking":
      case "thinking":
        this.updateWalking(delta);
        break;
      case "working":
        this.updateWorking(delta);
        break;
      case "idle":
        this.updateIdle(delta);
        break;
    }
  }

  private updateSleeping(delta: number) {
    if (this.zzzText) {
      this.zzzPhase += delta * 0.05;
      this.zzzText.y = -2 + Math.sin(this.zzzPhase) * 3;
      this.zzzText.alpha = 0.5 + Math.sin(this.zzzPhase * 0.7) * 0.5;
      const zCount = (Math.floor(this.zzzPhase / 2) % 3) + 1;
      this.zzzText.text = "z".repeat(zCount);
    }
  }

  private updateWalking(delta: number) {
    this.walkTimer += delta;

    // Swap walk frames (no destroy/recreate — just toggle visibility)
    if (this.walkTimer > 8) {
      this.walkTimer = 0;
      this.walkFrame++;
      this.showFrame(this.walkFrame % 2 === 0 ? "walk1" : "walk2");
    }

    // Move toward target
    const targetX = this.targetGridX * TILE_SIZE;
    const targetY = this.targetGridY * TILE_SIZE;
    const dx = targetX - this.container.x;
    const dy = targetY - this.container.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) {
      this.container.x = targetX;
      this.container.y = targetY;
      this.gridX = this.targetGridX;
      this.gridY = this.targetGridY;

      if (this.animState === "walking") {
        this.animState = "working";
        this.updateVisuals();
      }
    } else {
      const speed = 0.8 * delta;
      this.container.x += (dx / dist) * speed;
      this.container.y += (dy / dist) * speed;
    }
  }

  private updateWorking(delta: number) {
    this.workAnimTimer += delta;
    this.frames.working.y = Math.sin(this.workAnimTimer * 0.1) * 0.3;
  }

  private updateIdle(delta: number) {
    this.idleTimer += delta;
    this.frames.idle.y = Math.sin(this.idleTimer * 0.03) * 0.5;
  }

  get sortY(): number {
    return this.container.y;
  }

  destroy() {
    this.clearTaskText();
    if (this.zzzText) {
      this.zzzText.destroy();
    }
    for (const frame of Object.values(this.frames)) {
      frame.destroy();
    }
    this.roleLabel.destroy();
    this.container.destroy();
  }
}

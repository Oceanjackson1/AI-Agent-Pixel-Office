import { Container, Graphics, Text } from "pixi.js";
import type { AgentState, AgentStatus } from "../types/agent";
import {
  createCharacterFrames,
  createRoleLabel,
  createZzzEffect,
} from "./CharacterRenderer";
import { TILE_SIZE, MAP_COLS, MAP_ROWS } from "../utils/constants";
import { POI_LOCATIONS } from "./OfficeMap";
import type { OfficeScene } from "./OfficeScene";

type AnimState = "sleeping" | "waking" | "walking" | "working" | "idle" | "thinking";
type FrameKey = "idle" | "walk1" | "walk2" | "working" | "sleeping";
type WanderState = "at_desk" | "walking_to_poi" | "at_poi" | "returning";

export class AgentCharacter {
  public container: Container;
  public agentId: string;
  public gridX: number;
  public gridY: number;

  private scene: OfficeScene;
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

  // Cached task text for restoring bubble after wandering
  private currentTaskText: string | null = null;

  // Wander sub-state for working agents
  private wanderState: WanderState = "at_desk";
  private wanderCooldown = 0;
  private poiTimer = 0;

  // Pre-cached frames to avoid destroy/recreate per animation tick
  private frames: Record<FrameKey, Graphics>;
  private activeFrameKey: FrameKey = "sleeping";

  constructor(agent: AgentState, scene: OfficeScene) {
    this.agentId = agent.id;
    this.scene = scene;
    this.spriteKey = agent.character_sprite;
    this.deskGridX = agent.desk_position[0];
    this.deskGridY = agent.desk_position[1] + 1; // Sit below the desk
    this.gridX = this.deskGridX;
    this.gridY = this.deskGridY;
    this.targetGridX = this.gridX;
    this.targetGridY = this.gridY;

    // Stagger initial wander cooldown so agents don't all move at once
    this.wanderCooldown = 300 + Math.random() * 1200;

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

    // Identity label (name only — role/task shown in right panel)
    this.roleLabel = createRoleLabel(agent.name);
    this.roleLabel.x = 8; // center of 16px character
    this.roleLabel.y = -12;
    this.container.addChild(this.roleLabel);

    // Initialize based on status
    this.setStatus(agent.status, agent.current_task);
  }

  /** Whether this agent is in the "working" animation state (for inter-agent visits) */
  isWorking(): boolean {
    return this.animState === "working";
  }

  /** Whether the task bubble is currently visible */
  hasVisibleBubble(): boolean {
    return false;
  }

  /** Offset the task bubble Y position (for de-overlap) */
  setBubbleYOffset(_offset: number) {
    // No-op: bubbles removed from map
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
        // Reset wander state when status changes to working
        this.wanderState = "at_desk";
        this.wanderCooldown = 300 + Math.random() * 600;
        this.setTaskText(currentTask);
        break;

      case "idle":
        this.animState = "idle";
        this.wanderState = "at_desk";
        this.idleTimer = 0;
        this.clearTaskText();
        break;

      case "thinking":
        this.animState = "thinking";
        this.wanderState = "at_desk";
        this.setTaskText(currentTask);
        this.setThinkingPath();
        break;

      case "sleeping":
      case "offline":
        this.animState = "sleeping";
        this.wanderState = "at_desk";
        this.clearTaskText();
        break;
    }

    this.updateVisuals();
  }

  private setWalkPath(toX: number, toY: number) {
    this.targetGridX = Math.max(2, Math.min(toX, MAP_COLS - 3));
    this.targetGridY = Math.max(3, Math.min(toY, MAP_ROWS - 3));
  }

  private setThinkingPath() {
    this.setWalkPath(
      this.deskGridX + Math.floor(Math.random() * 5) - 2,
      this.deskGridY + Math.floor(Math.random() * 4) - 1
    );
  }

  private setTaskText(task: string | null) {
    this.currentTaskText = task;
  }

  private clearTaskText() {
    this.currentTaskText = null;
  }

  private restoreTaskBubble() {
    // No-op: task info shown in right panel only
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
      } else if (this.animState === "thinking") {
        this.setThinkingPath();
      }
    } else {
      const speed = 0.8 * delta;
      this.container.x += (dx / dist) * speed;
      this.container.y += (dy / dist) * speed;
    }
  }

  // ---------------------------------------------------------------------------
  // Working state with wander sub-state machine
  // ---------------------------------------------------------------------------
  private updateWorking(delta: number) {
    switch (this.wanderState) {
      case "at_desk":
        this.updateWorkingAtDesk(delta);
        break;
      case "walking_to_poi":
      case "returning":
        this.updateWanderWalking(delta);
        break;
      case "at_poi":
        this.updateAtPoi(delta);
        break;
    }
  }

  private updateWorkingAtDesk(delta: number) {
    // Normal working bob animation
    this.workAnimTimer += delta;
    this.frames.working.y = Math.sin(this.workAnimTimer * 0.1) * 0.3;

    // Decrement wander cooldown
    this.wanderCooldown -= delta;
    if (this.wanderCooldown <= 0) {
      // Reset cooldown (roughly every 15-30 seconds at 60fps)
      this.wanderCooldown = 900 + Math.random() * 900;

      // 40% chance to actually wander
      if (Math.random() < 0.4) {
        this.startWander();
      }
    }
  }

  private startWander() {
    // 60% go to POI, 40% visit another working agent
    if (Math.random() < 0.6) {
      this.startWanderToPoi();
    } else {
      this.startWanderToAgent();
    }
  }

  private startWanderToPoi() {
    const poi = POI_LOCATIONS[Math.floor(Math.random() * POI_LOCATIONS.length)];
    // Jitter to avoid stacking
    const jx = Math.floor(Math.random() * 3) - 1;
    const jy = Math.floor(Math.random() * 3) - 1;

    this.wanderState = "walking_to_poi";
    this.setWalkPath(poi[0] + jx, poi[1] + jy);
    this.clearTaskText(); // Hide bubble while away
    this.showFrame("walk1");
  }

  private startWanderToAgent() {
    const other = this.scene.getRandomWorkingAgent(this.agentId);
    if (!other) {
      // No other working agent; fall back to POI
      this.startWanderToPoi();
      return;
    }
    // Walk to a tile adjacent to the other agent's desk
    const jx = Math.random() < 0.5 ? -1 : 2;
    this.wanderState = "walking_to_poi";
    this.setWalkPath(other.deskGridX + jx, other.deskGridY);
    this.clearTaskText();
    this.showFrame("walk1");
  }

  private updateWanderWalking(delta: number) {
    this.walkTimer += delta;

    if (this.walkTimer > 8) {
      this.walkTimer = 0;
      this.walkFrame++;
      this.showFrame(this.walkFrame % 2 === 0 ? "walk1" : "walk2");
    }

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

      if (this.wanderState === "walking_to_poi") {
        // Arrived at POI — linger 3-8 seconds
        this.wanderState = "at_poi";
        this.poiTimer = 180 + Math.random() * 300;
        this.showFrame("idle");
      } else if (this.wanderState === "returning") {
        // Back at desk
        this.wanderState = "at_desk";
        this.showFrame("working");
        this.restoreTaskBubble();
        this.wanderCooldown = 600 + Math.random() * 600;
      }
    } else {
      const speed = 0.8 * delta;
      this.container.x += (dx / dist) * speed;
      this.container.y += (dy / dist) * speed;
    }
  }

  private updateAtPoi(delta: number) {
    this.poiTimer -= delta;
    // Gentle idle sway at POI
    this.frames.idle.y = Math.sin(this.poiTimer * 0.05) * 0.5;

    if (this.poiTimer <= 0) {
      // Head back to desk
      this.wanderState = "returning";
      this.setWalkPath(this.deskGridX, this.deskGridY);
      this.showFrame(this.walkFrame % 2 === 0 ? "walk1" : "walk2");
    }
  }

  private updateIdle(delta: number) {
    this.idleTimer += delta;
    this.frames.idle.y = Math.sin(this.idleTimer * 0.03) * 0.5;
  }

  get sortY(): number {
    return this.container.y;
  }

  destroy() {
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

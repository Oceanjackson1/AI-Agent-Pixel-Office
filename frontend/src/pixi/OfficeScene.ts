import { Application, Container } from "pixi.js";
import { createOfficeMap } from "./OfficeMap";
import { AgentCharacter } from "./AgentCharacter";
import { CANVAS_WIDTH, CANVAS_HEIGHT, WORLD_HEIGHT } from "../utils/constants";
import type { AgentState, AgentStatus } from "../types/agent";

export class OfficeScene {
  public app: Application;
  private root: Container;
  private mapContainer: Container;
  private agentContainer: Container;
  private agents: Map<string, AgentCharacter> = new Map();
  private initialized = false;
  private _destroyed = false;

  // Camera panning state
  private cameraY = 0;
  private cameraTargetY: number | undefined;
  private readonly maxCameraY = Math.max(0, WORLD_HEIGHT - CANVAS_HEIGHT);

  // Drag state
  private dragging = false;
  private lastPointerY = 0;

  constructor() {
    this.app = new Application();
    this.root = new Container();
    this.mapContainer = new Container();
    this.agentContainer = new Container();
  }

  get isInitialized() {
    return this.initialized;
  }

  async init(canvas: HTMLCanvasElement) {
    if (this.initialized || this._destroyed) return;

    await this.app.init({
      canvas,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: 0xf5f5f7,
      antialias: false,
      roundPixels: true,
      resolution: Math.max(1, window.devicePixelRatio || 1),
    });

    // If destroyed while awaiting init, clean up and bail out
    if (this._destroyed) {
      this.app.destroy(true);
      return;
    }

    // Root container (moves for camera scrolling)
    this.app.stage.addChild(this.root);

    // Office map (static background)
    this.mapContainer = createOfficeMap();
    this.root.addChild(this.mapContainer);

    // Reuse the agentContainer from constructor (agents may already be added before init completes)
    this.root.addChild(this.agentContainer);

    // Camera controls
    this.setupCameraControls(canvas);

    // Main game loop
    this.app.ticker.add((ticker) => {
      this.update(ticker.deltaTime);
    });

    this.initialized = true;
  }

  private setupCameraControls(canvas: HTMLCanvasElement) {
    // Mouse wheel scrolling
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.cameraTargetY = undefined; // Cancel any smooth scroll
      this.cameraY = this.clampCameraY(this.cameraY + e.deltaY * 0.5);
      this.root.y = -this.cameraY;
    }, { passive: false });

    // Touch/drag panning
    canvas.addEventListener("pointerdown", (e) => {
      this.dragging = true;
      this.lastPointerY = e.clientY;
      this.cameraTargetY = undefined; // Cancel any smooth scroll
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!this.dragging) return;
      const dy = this.lastPointerY - e.clientY;
      // Scale dy by the ratio of canvas native size to CSS display size
      const rect = canvas.getBoundingClientRect();
      const scale = rect.height > 0 ? CANVAS_HEIGHT / rect.height : 1;
      this.cameraY = this.clampCameraY(this.cameraY + dy * scale);
      this.root.y = -this.cameraY;
      this.lastPointerY = e.clientY;
    });
    canvas.addEventListener("pointerup", () => { this.dragging = false; });
    canvas.addEventListener("pointerleave", () => { this.dragging = false; });
  }

  private clampCameraY(y: number): number {
    return Math.max(0, Math.min(this.maxCameraY, y));
  }

  private update(delta: number) {
    // Smooth camera scroll (when scrollToAgent is used)
    if (this.cameraTargetY !== undefined) {
      const diff = this.cameraTargetY - this.cameraY;
      if (Math.abs(diff) < 0.5) {
        this.cameraY = this.cameraTargetY;
        this.cameraTargetY = undefined;
      } else {
        this.cameraY += diff * 0.12;
      }
      this.root.y = -this.cameraY;
    }

    // Update all agents
    for (const agent of this.agents.values()) {
      agent.update(delta);
    }

    // Depth sort: characters with higher Y render on top
    this.agentContainer.children.sort((a, b) => a.y - b.y);

    // De-overlap task bubbles
    this.deoverlapBubbles();
  }

  /**
   * Smooth-scroll the camera to center on a specific agent
   */
  scrollToAgent(agentId: string) {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    this.cameraTargetY = this.clampCameraY(
      agent.container.y - CANVAS_HEIGHT / 2
    );
  }

  /**
   * Get a random working agent (for inter-agent visits).
   * Excludes the requesting agent.
   */
  getRandomWorkingAgent(excludeId: string): AgentCharacter | null {
    const candidates: AgentCharacter[] = [];
    for (const agent of this.agents.values()) {
      if (agent.agentId !== excludeId && agent.isWorking()) {
        candidates.push(agent);
      }
    }
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * Sync agents from the store
   */
  syncAgents(agentStates: AgentState[]) {
    // Add or update agents
    for (const state of agentStates) {
      let agent = this.agents.get(state.id);
      if (!agent) {
        // Create new agent character
        agent = new AgentCharacter(state, this);
        this.agents.set(state.id, agent);
        this.agentContainer.addChild(agent.container);
      }
    }

    // Remove agents that no longer exist
    for (const [id, agent] of this.agents) {
      if (!agentStates.find((s) => s.id === id)) {
        this.agentContainer.removeChild(agent.container);
        agent.destroy();
        this.agents.delete(id);
      }
    }
  }

  /**
   * Update a single agent's status
   */
  updateAgentStatus(
    agentId: string,
    status: AgentStatus,
    currentTask: string | null
  ) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.setStatus(status, currentTask);
    }
  }

  getScaledDimensions() {
    return {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    };
  }

  /**
   * Prevent nearby task bubbles from overlapping by offsetting them vertically
   */
  private deoverlapBubbles() {
    const bubbleAgents: AgentCharacter[] = [];
    for (const agent of this.agents.values()) {
      if (agent.hasVisibleBubble()) {
        bubbleAgents.push(agent);
      }
    }
    if (bubbleAgents.length < 2) return;

    // Sort by x position for pairwise proximity check
    bubbleAgents.sort((a, b) => a.container.x - b.container.x);

    // Reset all offsets first
    for (const agent of bubbleAgents) {
      agent.setBubbleYOffset(0);
    }

    for (let i = 1; i < bubbleAgents.length; i++) {
      const prev = bubbleAgents[i - 1];
      const curr = bubbleAgents[i];
      const dx = Math.abs(curr.container.x - prev.container.x);
      const dy = Math.abs(curr.container.y - prev.container.y);

      // If agents are within ~3 tiles of each other, offset the bubble upward
      if (dx < 48 && dy < 32) {
        curr.setBubbleYOffset(-16);
      }
    }
  }

  destroy() {
    this._destroyed = true;
    for (const agent of this.agents.values()) {
      agent.destroy();
    }
    this.agents.clear();
    if (this.initialized) {
      this.app.destroy(true);
    }
  }
}

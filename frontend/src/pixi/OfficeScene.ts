import { Application, Container } from "pixi.js";
import { createOfficeMap } from "./OfficeMap";
import { AgentCharacter } from "./AgentCharacter";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../utils/constants";
import type { AgentState, AgentStatus } from "../types/agent";

export class OfficeScene {
  public app: Application;
  private root: Container;
  private mapContainer: Container;
  private agentContainer: Container;
  private agents: Map<string, AgentCharacter> = new Map();
  private initialized = false;
  private _destroyed = false;

  // Zoom + pan camera state
  private zoom = 1;
  private targetZoom: number | undefined;
  private panX = 0;
  private panY = 0;
  private targetPanX: number | undefined;
  private targetPanY: number | undefined;
  private minZoom = 0.5;
  private readonly maxZoom = 1.5;

  // Drag state
  private dragging = false;
  private lastPointerX = 0;
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

    // Root container (scaled + positioned for zoom/pan)
    this.app.stage.addChild(this.root);

    // Office map (static background)
    this.mapContainer = createOfficeMap();
    this.root.addChild(this.mapContainer);

    // Reuse the agentContainer from constructor (agents may already be added before init completes)
    this.root.addChild(this.agentContainer);

    // Compute initial zoom to fit entire map in canvas
    this.computeMinZoom(canvas);
    this.zoom = this.minZoom;
    // Center the map initially
    this.panX = (CANVAS_WIDTH - CANVAS_WIDTH * this.zoom) / 2;
    this.panY = (CANVAS_HEIGHT - CANVAS_HEIGHT * this.zoom) / 2;
    this.applyCamera();

    // Camera controls
    this.setupCameraControls(canvas);

    // Main game loop
    this.app.ticker.add((ticker) => {
      this.update(ticker.deltaTime);
    });

    this.initialized = true;
  }

  private computeMinZoom(canvas: HTMLCanvasElement) {
    // minZoom = the zoom at which the entire world fits in the canvas
    // Since canvas resolution = world size, minZoom that fits both axes:
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      // The canvas native size is CANVAS_WIDTH x CANVAS_HEIGHT.
      // We want the full world visible, so minZoom = 1 means native.
      // If canvas CSS is smaller we might need <1. But since canvas = world, min is 1
      // to see full map, and >1 to zoom in.
      this.minZoom = Math.min(
        CANVAS_WIDTH / CANVAS_WIDTH,
        CANVAS_HEIGHT / CANVAS_HEIGHT
      );
    }
    // Ensure the full map is visible at minZoom = 1 (native resolution = world size)
    this.minZoom = Math.max(0.3, Math.min(this.minZoom, 1));
  }

  private setupCameraControls(canvas: HTMLCanvasElement) {
    // Mouse wheel zoom (anchored to mouse position)
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.targetZoom = undefined;
      this.targetPanX = undefined;
      this.targetPanY = undefined;

      const rect = canvas.getBoundingClientRect();
      // Mouse position in canvas native coordinates
      const mouseX = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
      const mouseY = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;

      // World position under mouse before zoom
      const worldX = (mouseX - this.panX) / this.zoom;
      const worldY = (mouseY - this.panY) / this.zoom;

      // Apply zoom delta
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));

      // Adjust pan so the same world point stays under the mouse
      this.panX = mouseX - worldX * this.zoom;
      this.panY = mouseY - worldY * this.zoom;

      this.clampPan();
      this.applyCamera();
    }, { passive: false });

    // Drag panning
    canvas.addEventListener("pointerdown", (e) => {
      this.dragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.targetZoom = undefined;
      this.targetPanX = undefined;
      this.targetPanY = undefined;
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!this.dragging) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width > 0 ? CANVAS_WIDTH / rect.width : 1;
      const scaleY = rect.height > 0 ? CANVAS_HEIGHT / rect.height : 1;
      const dx = (e.clientX - this.lastPointerX) * scaleX;
      const dy = (e.clientY - this.lastPointerY) * scaleY;
      this.panX += dx;
      this.panY += dy;
      this.clampPan();
      this.applyCamera();
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    });
    canvas.addEventListener("pointerup", () => { this.dragging = false; });
    canvas.addEventListener("pointerleave", () => { this.dragging = false; });
  }

  private clampPan() {
    // Ensure the map doesn't get dragged completely outside the canvas
    const scaledW = CANVAS_WIDTH * this.zoom;
    const scaledH = CANVAS_HEIGHT * this.zoom;

    // If map is smaller than canvas, center it
    if (scaledW <= CANVAS_WIDTH) {
      this.panX = (CANVAS_WIDTH - scaledW) / 2;
    } else {
      this.panX = Math.min(0, Math.max(CANVAS_WIDTH - scaledW, this.panX));
    }

    if (scaledH <= CANVAS_HEIGHT) {
      this.panY = (CANVAS_HEIGHT - scaledH) / 2;
    } else {
      this.panY = Math.min(0, Math.max(CANVAS_HEIGHT - scaledH, this.panY));
    }
  }

  private applyCamera() {
    this.root.scale.set(this.zoom);
    this.root.x = this.panX;
    this.root.y = this.panY;
  }

  private update(delta: number) {
    // Smooth zoom animation (when scrollToAgent is used)
    let cameraChanged = false;

    if (this.targetZoom !== undefined) {
      const diff = this.targetZoom - this.zoom;
      if (Math.abs(diff) < 0.002) {
        this.zoom = this.targetZoom;
        this.targetZoom = undefined;
      } else {
        this.zoom += diff * 0.1;
      }
      cameraChanged = true;
    }

    if (this.targetPanX !== undefined) {
      const dx = this.targetPanX - this.panX;
      if (Math.abs(dx) < 0.5) {
        this.panX = this.targetPanX;
        this.targetPanX = undefined;
      } else {
        this.panX += dx * 0.1;
      }
      cameraChanged = true;
    }

    if (this.targetPanY !== undefined) {
      const dy = this.targetPanY - this.panY;
      if (Math.abs(dy) < 0.5) {
        this.panY = this.targetPanY;
        this.targetPanY = undefined;
      } else {
        this.panY += dy * 0.1;
      }
      cameraChanged = true;
    }

    if (cameraChanged) {
      this.clampPan();
      this.applyCamera();
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
   * Smooth zoom + pan to center on a specific agent
   */
  scrollToAgent(agentId: string) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Zoom in to ~0.7 (or current if already zoomed in more)
    const desiredZoom = Math.max(0.7, this.zoom);
    this.targetZoom = Math.min(this.maxZoom, desiredZoom);

    // Pan to center the agent
    const agentWorldX = agent.container.x;
    const agentWorldY = agent.container.y;
    this.targetPanX = CANVAS_WIDTH / 2 - agentWorldX * (this.targetZoom ?? this.zoom);
    this.targetPanY = CANVAS_HEIGHT / 2 - agentWorldY * (this.targetZoom ?? this.zoom);
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

import { Application, Container } from "pixi.js";
import { createOfficeMap } from "./OfficeMap";
import { AgentCharacter } from "./AgentCharacter";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../utils/constants";
import type { AgentState, AgentStatus } from "../types/agent";

export class OfficeScene {
  public app: Application;
  private mapContainer: Container;
  private agentContainer: Container;
  private agents: Map<string, AgentCharacter> = new Map();
  private initialized = false;
  private _destroyed = false;

  constructor() {
    this.app = new Application();
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

    // Root container
    const root = new Container();
    this.app.stage.addChild(root);

    // Office map (static background)
    this.mapContainer = createOfficeMap();
    root.addChild(this.mapContainer);

    // Reuse the agentContainer from constructor (agents may already be added before init completes)
    root.addChild(this.agentContainer);

    // Main game loop
    this.app.ticker.add((ticker) => {
      this.update(ticker.deltaTime);
    });

    this.initialized = true;
  }

  private update(delta: number) {
    // Update all agents
    for (const agent of this.agents.values()) {
      agent.update(delta);
    }

    // Depth sort: characters with higher Y render on top
    this.agentContainer.children.sort((a, b) => a.y - b.y);
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
        agent = new AgentCharacter(state);
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

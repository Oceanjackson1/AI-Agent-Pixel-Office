import { useEffect, useRef, useCallback, useState } from "react";
import { OfficeScene } from "../pixi/OfficeScene";
import { useAgentStore } from "../hooks/useAgentStore";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../utils/constants";

// React StrictMode in dev mounts/unmounts effects twice; queue scene init to avoid
// concurrent Pixi app.init() calls against the same canvas.
let sceneInitQueue: Promise<void> = Promise.resolve();

export function OfficeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<OfficeScene | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: CANVAS_WIDTH, h: CANVAS_HEIGHT });
  const [ready, setReady] = useState(false);
  const agents = useAgentStore((s) => s.agents);
  const prevAgentsRef = useRef(agents);

  // Initialize PixiJS scene (properly awaited)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let destroyed = false;
    let scene: OfficeScene | null = null;

    const initTask = sceneInitQueue
      .catch(() => undefined)
      .then(async () => {
        if (destroyed) return;
        scene = new OfficeScene();
        sceneRef.current = scene;
        await scene.init(canvas);
        if (destroyed) {
          scene.destroy();
          return;
        }
        setReady(true);
      });

    sceneInitQueue = initTask.catch(() => undefined);
    initTask.catch((error) => {
      if (!destroyed) {
        console.error("[OfficeCanvas] Scene init failed", error);
      }
    });

    return () => {
      destroyed = true;
      setReady(false);
      scene?.destroy();
      sceneRef.current = null;
    };
  }, []);

  // Sync agents to scene when agents change (only after scene is ready)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !ready) return;

    const agentList = Object.values(agents);
    const prevAgentList = Object.values(prevAgentsRef.current);

    // Full sync on first load or agent count change
    if (prevAgentList.length === 0 || agentList.length !== prevAgentList.length) {
      scene.syncAgents(agentList);
    } else {
      // Incremental status updates
      for (const agent of agentList) {
        const prev = prevAgentsRef.current[agent.id];
        if (
          !prev ||
          prev.status !== agent.status ||
          prev.current_task !== agent.current_task
        ) {
          scene.updateAgentStatus(
            agent.id,
            agent.status,
            agent.current_task
          );
        }
      }
    }

    prevAgentsRef.current = agents;
  }, [agents, ready]);

  // Responsive scaling — compute the CSS display size that fits inside the container
  const handleResize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const padding = 32; // breathing room around the canvas
    const maxW = container.clientWidth - padding;
    const maxH = container.clientHeight - padding;

    const aspect = CANVAS_WIDTH / CANVAS_HEIGHT;
    let w: number, h: number;
    if (maxW / maxH > aspect) {
      // Container is wider → height is the constraint
      h = Math.max(100, maxH);
      w = h * aspect;
    } else {
      // Container is taller → width is the constraint
      w = Math.max(100, maxW);
      h = w / aspect;
    }
    setCanvasSize({ w: Math.round(w), h: Math.round(h) });
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f5f7",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          display: "block",
          width: canvasSize.w,
          height: canvasSize.h,
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}


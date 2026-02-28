import { useAgentStore } from "../hooks/useAgentStore";
import type { AgentStatus } from "../types/agent";

const STATUS_EMOJI: Record<AgentStatus, string> = {
  working: "💻",
  idle: "☕",
  thinking: "🤔",
  sleeping: "😴",
  offline: "⚫",
};

const STATUS_LABEL: Record<AgentStatus, string> = {
  working: "工作中",
  idle: "休息中",
  thinking: "思考中",
  sleeping: "睡觉中",
  offline: "离线",
};

export function StatusPanel() {
  const agents = useAgentStore((s) => s.agents);
  const agentList = Object.values(agents);

  if (agentList.length === 0) {
    return (
      <div className="scrollable-panel" style={panelStyle}>
        <h3 style={titleStyle}>🏢 Ocean的牛马大军</h3>
        <p style={connectingStyle}>正在连接服务器...</p>
      </div>
    );
  }

  return (
    <div className="scrollable-panel" style={panelStyle}>
      <h3 style={titleStyle}>🏢 Ocean的牛马大军</h3>
      <div style={statsStyle}>
        <span style={statBadge("working")}>
          {agentList.filter((a) => a.status === "working").length} 工作
        </span>
        <span style={statBadge("sleeping")}>
          {agentList.filter((a) => a.status === "sleeping").length} 休息
        </span>
      </div>
      <div style={listStyle}>
        {agentList.map((agent) => (
          <div key={agent.id} style={agentCardStyle}>
            <div style={agentHeaderStyle}>
              <span>{STATUS_EMOJI[agent.status]}</span>
              <span style={agentNameStyle}>{agent.name}</span>
              <span style={roleBadgeStyle}>{agent.role_label_zh}</span>
            </div>
            <div style={statusTextStyle}>
              {STATUS_LABEL[agent.status]}
            </div>
            {agent.current_task && (
              <div style={taskTextStyle}>{agent.current_task}</div>
            )}
            {agent.progress != null && agent.progress > 0 && (
              <div style={progressBarBgStyle}>
                <div
                  style={{
                    ...progressBarFillStyle,
                    width: `${agent.progress * 100}%`,
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Styles
const panelStyle: React.CSSProperties = {
  width: 330,
  minWidth: 330,
  height: "100vh",
  background: "rgba(255, 255, 255, 0.75)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  color: "#1d1d1f",
  padding: "20px 16px",
  overflowY: "auto",
  borderLeft: "1px solid rgba(0,0,0,0.08)",
  boxShadow: "-4px 0 24px rgba(0,0,0,0.04)",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 4px 0",
  fontSize: 18,
  fontWeight: 600,
  color: "#1d1d1f",
  textAlign: "center",
  letterSpacing: "-0.4px",
};

const connectingStyle: React.CSSProperties = {
  color: "#86868b",
  textAlign: "center",
  fontSize: 14,
};

const statsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  justifyContent: "center",
  marginBottom: 8,
};

function statBadge(status: string): React.CSSProperties {
  const isWorking = status === "working";
  return {
    padding: "4px 10px",
    borderRadius: 12,
    background: isWorking ? "#e5f0e9" : "#f2f2f7",
    color: isWorking ? "#2e7d32" : "#8e8e93",
    fontSize: 12,
    fontWeight: 500,
  };
}

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const agentCardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 14,
  padding: "12px 14px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.02)",
  border: "1px solid rgba(0,0,0,0.03)",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const agentHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const agentNameStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "#1d1d1f",
  flex: 1,
  fontSize: 14,
};

const roleBadgeStyle: React.CSSProperties = {
  padding: "3px 8px",
  borderRadius: 8,
  background: "#f0f4ff",
  fontSize: 11,
  fontWeight: 500,
  color: "#0066cc",
};

const statusTextStyle: React.CSSProperties = {
  color: "#86868b",
  fontSize: 12,
  fontWeight: 400,
};

const taskTextStyle: React.CSSProperties = {
  color: "#1d1d1f",
  fontSize: 13,
  marginTop: 2,
  lineHeight: 1.5,
  whiteSpace: "normal",
  overflowWrap: "anywhere",
};

const progressBarBgStyle: React.CSSProperties = {
  marginTop: 8,
  height: 4,
  background: "#f2f2f7",
  borderRadius: 4,
  overflow: "hidden",
};

const progressBarFillStyle: React.CSSProperties = {
  height: "100%",
  background: "#34c759",
  borderRadius: 4,
  transition: "width 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)",
};

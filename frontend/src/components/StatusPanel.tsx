import { useAgentStore } from "../hooks/useAgentStore";
import type { AgentState, AgentStatus } from "../types/agent";

const DOT_COLORS: Record<AgentStatus, string> = {
  working: "#34c759",
  thinking: "#ff9f0a",
  idle: "#c7c7cc",
  sleeping: "#c7c7cc",
  offline: "#c7c7cc",
};

type StatusGroup = {
  key: string;
  label: string;
  agents: AgentState[];
};

function groupAgents(agents: AgentState[]): StatusGroup[] {
  const working: AgentState[] = [];
  const thinking: AgentState[] = [];
  const resting: AgentState[] = [];

  for (const a of agents) {
    switch (a.status) {
      case "working":
        working.push(a);
        break;
      case "thinking":
        thinking.push(a);
        break;
      default:
        resting.push(a);
        break;
    }
  }

  const groups: StatusGroup[] = [];
  if (working.length > 0) groups.push({ key: "working", label: "工作中", agents: working });
  if (thinking.length > 0) groups.push({ key: "thinking", label: "思考中", agents: thinking });
  if (resting.length > 0) groups.push({ key: "resting", label: "休息中", agents: resting });
  return groups;
}

function StatusDot({ status }: { status: AgentStatus }) {
  return <span style={dotStyle(status)} />;
}

export function StatusPanel() {
  const agents = useAgentStore((s) => s.agents);
  const scrollToAgent = useAgentStore((s) => s.scrollToAgent);
  const agentList = Object.values(agents);

  if (agentList.length === 0) {
    return (
      <div className="scrollable-panel" style={panelStyle}>
        <h3 style={titleStyle}>{"🏢 Ocean的牛马大军"}</h3>
        <p style={connectingStyle}>{"正在连接服务器..."}</p>
      </div>
    );
  }

  const groups = groupAgents(agentList);
  const workingCount = agentList.filter((a) => a.status === "working").length;
  const thinkingCount = agentList.filter((a) => a.status === "thinking").length;
  const restingCount = agentList.length - workingCount - thinkingCount;

  return (
    <div className="scrollable-panel" style={panelStyle}>
      <h3 style={titleStyle}>{"🏢 Ocean的牛马大军"}</h3>
      <div style={statsStyle}>
        {workingCount > 0 && (
          <span style={statBadge("working")}>
            <span style={statDotStyle("#34c759")} />
            {workingCount} {"工作"}
          </span>
        )}
        {thinkingCount > 0 && (
          <span style={statBadge("thinking")}>
            <span style={statDotStyle("#ff9f0a")} />
            {thinkingCount} {"思考"}
          </span>
        )}
        {restingCount > 0 && (
          <span style={statBadge("sleeping")}>
            <span style={statDotStyle("#c7c7cc")} />
            {restingCount} {"休息"}
          </span>
        )}
      </div>

      <div style={groupListStyle}>
        {groups.map((group) => (
          <div key={group.key} style={groupStyle}>
            <div style={groupHeaderStyle}>
              {group.label} ({group.agents.length})
            </div>
            <div style={groupCardsStyle}>
              {group.key === "resting"
                ? group.agents.map((agent) => (
                    <div
                      key={agent.id}
                      style={compactCardStyle}
                      onClick={() => scrollToAgent?.(agent.id)}
                    >
                      <StatusDot status={agent.status} />
                      <span style={compactNameStyle}>{agent.name}</span>
                      <span style={compactRoleStyle}>{agent.role_label_zh}</span>
                    </div>
                  ))
                : group.agents.map((agent) => (
                    <div
                      key={agent.id}
                      style={agentCardStyle}
                      onClick={() => scrollToAgent?.(agent.id)}
                    >
                      <div style={agentHeaderStyle}>
                        <StatusDot status={agent.status} />
                        <span style={agentNameStyle}>{agent.name}</span>
                      </div>
                      <div style={roleTextStyle}>{agent.role_label_zh}</div>
                      {agent.current_task && (
                        <div style={taskTextStyle}>{agent.current_task}</div>
                      )}
                      {agent.progress != null && agent.progress > 0 && (
                        <div style={progressRowStyle}>
                          <div style={progressBarBgStyle}>
                            <div
                              style={{
                                ...progressBarFillStyle,
                                width: `${agent.progress * 100}%`,
                              }}
                            />
                          </div>
                          <span style={progressTextStyle}>
                            {Math.round(agent.progress * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Apple HIG Styles ---

const panelStyle: React.CSSProperties = {
  width: 330,
  minWidth: 330,
  height: "100vh",
  background: "rgba(255, 255, 255, 0.78)",
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
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
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
  marginBottom: 4,
};

function statBadge(status: string): React.CSSProperties {
  const colors: Record<string, { bg: string; fg: string }> = {
    working: { bg: "#e5f0e9", fg: "#2e7d32" },
    thinking: { bg: "#fef3c7", fg: "#d97706" },
    sleeping: { bg: "#f2f2f7", fg: "#8e8e93" },
  };
  const c = colors[status] || colors.sleeping;
  return {
    padding: "4px 10px",
    borderRadius: 12,
    background: c.bg,
    color: c.fg,
    fontSize: 12,
    fontWeight: 500,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  };
}

function statDotStyle(color: string): React.CSSProperties {
  return {
    display: "inline-block",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: color,
  };
}

function dotStyle(status: AgentStatus): React.CSSProperties {
  return {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: DOT_COLORS[status],
    flexShrink: 0,
  };
}

const groupListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const groupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const groupHeaderStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#86868b",
  marginBottom: 2,
  paddingLeft: 2,
  letterSpacing: "0.5px",
};

const groupCardsStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

// --- Working / Thinking cards ---

const agentCardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 10,
  padding: "10px 12px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  border: "1px solid rgba(0,0,0,0.06)",
  display: "flex",
  flexDirection: "column",
  gap: 2,
  cursor: "pointer",
  transition: "background 0.15s",
};

const agentHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const agentNameStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "#1d1d1f",
  fontSize: 13,
};

const roleTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#86868b",
  paddingLeft: 16,
};

const taskTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#999",
  paddingLeft: 16,
  lineHeight: 1.4,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const progressRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  paddingLeft: 16,
  marginTop: 2,
};

const progressBarBgStyle: React.CSSProperties = {
  flex: 1,
  height: 4,
  background: "#f2f2f7",
  borderRadius: 2,
  overflow: "hidden",
};

const progressBarFillStyle: React.CSSProperties = {
  height: "100%",
  background: "#34c759",
  borderRadius: 2,
  transition: "width 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)",
};

const progressTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#86868b",
  fontWeight: 500,
  minWidth: 28,
  textAlign: "right",
};

// --- Resting (compact) cards ---

const compactCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 12px",
  background: "#ffffff",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.04)",
  cursor: "pointer",
  transition: "background 0.15s",
};

const compactNameStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "#1d1d1f",
  flex: 1,
};

const compactRoleStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#aeaeb2",
};

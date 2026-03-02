import { useAgentStore } from "../hooks/useAgentStore";
import type { AgentState, AgentStatus } from "../types/agent";

const STATUS_EMOJI: Record<AgentStatus, string> = {
  working: "\u{1F4BB}",
  idle: "\u2615",
  thinking: "\u{1F914}",
  sleeping: "\u{1F634}",
  offline: "\u26AB",
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
  if (working.length > 0) groups.push({ key: "working", label: "\u5DE5\u4F5C\u4E2D", agents: working });
  if (thinking.length > 0) groups.push({ key: "thinking", label: "\u601D\u8003\u4E2D", agents: thinking });
  if (resting.length > 0) groups.push({ key: "resting", label: "\u4F11\u606F\u4E2D", agents: resting });
  return groups;
}

export function StatusPanel() {
  const agents = useAgentStore((s) => s.agents);
  const scrollToAgent = useAgentStore((s) => s.scrollToAgent);
  const agentList = Object.values(agents);

  if (agentList.length === 0) {
    return (
      <div className="scrollable-panel" style={panelStyle}>
        <h3 style={titleStyle}>{"\u{1F3E2}"} Ocean\u7684\u725B\u9A6C\u5927\u519B</h3>
        <p style={connectingStyle}>\u6B63\u5728\u8FDE\u63A5\u670D\u52A1\u5668...</p>
      </div>
    );
  }

  const groups = groupAgents(agentList);
  const workingCount = agentList.filter((a) => a.status === "working").length;
  const thinkingCount = agentList.filter((a) => a.status === "thinking").length;
  const restingCount = agentList.length - workingCount - thinkingCount;

  return (
    <div className="scrollable-panel" style={panelStyle}>
      <h3 style={titleStyle}>{"\u{1F3E2}"} Ocean\u7684\u725B\u9A6C\u5927\u519B</h3>
      <div style={statsStyle}>
        {workingCount > 0 && <span style={statBadge("working")}>{workingCount} \u5DE5\u4F5C</span>}
        {thinkingCount > 0 && <span style={statBadge("thinking")}>{thinkingCount} \u601D\u8003</span>}
        {restingCount > 0 && <span style={statBadge("sleeping")}>{restingCount} \u4F11\u606F</span>}
      </div>

      <div style={groupListStyle}>
        {groups.map((group) => (
          <div key={group.key} style={groupStyle}>
            <div style={groupHeaderStyle}>
              {group.label} ({group.agents.length})
            </div>
            <div style={groupCardsStyle}>
              {group.agents.map((agent) => (
                <div
                  key={agent.id}
                  style={group.key === "resting" ? compactCardStyle : agentCardStyle}
                  onClick={() => scrollToAgent?.(agent.id)}
                >
                  <div style={agentRowStyle}>
                    <span style={emojiStyle}>{STATUS_EMOJI[agent.status]}</span>
                    <span style={agentNameStyle}>{agent.name}</span>
                    <span style={roleBadgeStyle}>{agent.role_label_zh}</span>
                  </div>
                  {group.key !== "resting" && agent.current_task && (
                    <div style={taskTextStyle}>{agent.current_task}</div>
                  )}
                  {group.key !== "resting" && agent.progress != null && agent.progress > 0 && (
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

// --- Styles ---

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
  marginBottom: 4,
};

function statBadge(status: string): React.CSSProperties {
  const colors: Record<string, { bg: string; fg: string }> = {
    working: { bg: "#e5f0e9", fg: "#2e7d32" },
    thinking: { bg: "#fff8e1", fg: "#f57f17" },
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
  gap: 2,
};

const groupHeaderStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#86868b",
  marginBottom: 4,
  paddingLeft: 2,
};

const groupCardsStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const agentCardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 10,
  padding: "8px 10px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
  border: "1px solid rgba(0,0,0,0.04)",
  display: "flex",
  flexDirection: "column",
  gap: 3,
  cursor: "pointer",
  transition: "background 0.15s",
};

const compactCardStyle: React.CSSProperties = {
  ...agentCardStyle,
  padding: "6px 10px",
  gap: 0,
};

const agentRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const emojiStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1,
};

const agentNameStyle: React.CSSProperties = {
  fontWeight: 600,
  color: "#1d1d1f",
  flex: 1,
  fontSize: 13,
};

const roleBadgeStyle: React.CSSProperties = {
  padding: "2px 6px",
  borderRadius: 6,
  background: "#f0f4ff",
  fontSize: 10,
  fontWeight: 500,
  color: "#0066cc",
};

const taskTextStyle: React.CSSProperties = {
  color: "#555",
  fontSize: 12,
  lineHeight: 1.4,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  paddingLeft: 19, // align with name (emoji + gap)
};

const progressRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  paddingLeft: 19,
};

const progressBarBgStyle: React.CSSProperties = {
  flex: 1,
  height: 3,
  background: "#f2f2f7",
  borderRadius: 3,
  overflow: "hidden",
};

const progressBarFillStyle: React.CSSProperties = {
  height: "100%",
  background: "#34c759",
  borderRadius: 3,
  transition: "width 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)",
};

const progressTextStyle: React.CSSProperties = {
  fontSize: 10,
  color: "#86868b",
  fontWeight: 500,
  minWidth: 28,
  textAlign: "right",
};

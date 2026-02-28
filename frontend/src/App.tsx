import { OfficeCanvas } from "./components/OfficeCanvas";
import { StatusPanel } from "./components/StatusPanel";
import { useOceanLeader } from "./hooks/useOceanLeader";
import { useWebSocket } from "./hooks/useWebSocket";

function App() {
  useOceanLeader();
  // Connect to WebSocket
  useWebSocket();

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh" }}>
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <OfficeCanvas />
      </div>
      <StatusPanel />
    </div>
  );
}

export default App;

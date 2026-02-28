import { OfficeCanvas } from "./components/OfficeCanvas";
import { StatusPanel } from "./components/StatusPanel";
import { useWebSocket } from "./hooks/useWebSocket";

function App() {
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

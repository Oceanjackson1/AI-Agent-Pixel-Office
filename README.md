# 🏢 AI-Agent-Pixel-Office

AI-Agent-Pixel-Office is a real-time, 2D pixel-art style virtual office dashboard designed to monitor and visualize a fleet of AI Agents. Think of it as a dynamic "Habbo Hotel" or "Pokemon-style" open office where each local or remote AI agent gets a virtual desk as long as it's running.

## ✨ Features

- **Dynamic Infinite Scaling**: No hardcoded 6-agent limit. External agents seamlessly pop into the office environment the moment they send a heartbeat. Desks are dynamically allocated on an infinite grid sequence.
- **Apple-Style UX/UI Design**: Frosted glass (blur) sidebars, bright and ultra-clean white macOS-like interfaces, and high-quality Apple system typography (`-apple-system`).
- **Real-Time Visualization (Pixi.js)**: Characters feature idle, working, walking, and sleeping animations dynamically matched to their telemetry status. Status bubbles pop up over their heads to reflect their current sub-tasks.
- **Custom Identities via Payload**: Cloud agents can bring their own names, roles (e.g., Frontend, QA, Product), and custom pixel outfits just by injecting data into their HTTP payload.

## 📦 Tech Stack

- **Frontend**: React, Vite, Zustand (State Management), Pixi.js (2D WebGL Engine).
- **Backend**: FastAPI (Python), Uvicorn, WebSockets (for real-time frontend syncing).
- **Communication**: REST API (for incoming agent heartbeats) -> WebSockets (for broadcasting state out).

---

## 🚀 Getting Started

### 1. Start the Backend server

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt # Make sure fastapi, uvicorn, pydantic are available
python3 -m uvicorn app.main:app --reload --port 8000
```
*(The backend needs to run on `localhost:8000` as the frontend listens to `ws://localhost:8000/ws/office` by default)*

### 2. Start the Frontend dashboard

```bash
cd frontend
npm install
npm run dev
```

Visit the displayed local URL (usually `http://localhost:5173`) in your browser. You will see an empty pixel office with a glassmorphism right sidebar.

### 3. Inject "Workers" (External Agents)

You can run the built-in testing script to simulate a dozen cloud workers entering the office simultaneously:
```bash
cd backend
python3 test_dynamic.py
```

Alternatively, integrate the heartbeat system straight into your own AI processes (via HTTP POST to `http://localhost:8000/api/agents/{agent_id}/heartbeat`).

---

## 📝 Integration API for External Agents

If you want an external python script, a LangChain agent, or any bot to show up in the Pixel Office, send a POST request inside your agent loop:

```python
import requests

payload = {
    "status": "working",                # ENUM: "working", "idle", "sleeping", "thinking"
    "current_task": "Designing a logo", # Displays bubble over head
    "progress": 0.45,                   # Optional: Progress bar (0 ~ 1.0)
    "name": "Cloud Designer",           # Set a custom display name
    "role": "design",                   # Role ENUM controls avatar color
    "role_label_zh": "设计"             # Role badge label
}

requests.post("http://localhost:8000/api/agents/designer-bot-01/heartbeat", json=payload)
```

As long as your agent continues to send pulses, they'll stay active in the office. Switch `status` to `sleeping` when the job is done, and see their avatar lay its head down!

---
*Created as an experiment in visual agent observability.*

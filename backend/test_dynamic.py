import requests
import json
import time
import random

API_URL = "http://localhost:8000/api/agents"

def register_agent(agent_id, name, role, status="working", task="Writing tests"):
    payload = {
        "status": status,
        "current_task": task,
        "progress": random.random(),
        "name": name,
        "role": role,
        "role_label_zh": f"{role.capitalize()} Expert",
        "character_sprite": "char-red" if role == "frontend" else "char-green"
    }
    res = requests.post(f"{API_URL}/{agent_id}/heartbeat", json=payload)
    print(f"[{agent_id}] Response ({res.status_code}):", res.json())

if __name__ == "__main__":
    print("Testing dynamic agent expansion...")
    for i in range(10, 25):
        time.sleep(0.5)
        role = random.choice(["frontend", "backend", "design", "product", "qa"])
        register_agent(f"dynamic-agent-{i}", f"Cloud User {i}", role, status="working", task=f"Task #{i} running")

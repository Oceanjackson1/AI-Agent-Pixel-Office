from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class AgentRole(str, Enum):
    FRONTEND = "frontend"
    BACKEND = "backend"
    DESIGN = "design"
    PRODUCT = "product"
    QA = "qa"
    DEVOPS = "devops"
    DATA = "data"
    LEAD = "lead"


class AgentStatus(str, Enum):
    WORKING = "working"
    IDLE = "idle"
    THINKING = "thinking"
    SLEEPING = "sleeping"
    OFFLINE = "offline"


ROLE_LABELS_ZH = {
    AgentRole.FRONTEND: "前端",
    AgentRole.BACKEND: "后端",
    AgentRole.DESIGN: "设计",
    AgentRole.PRODUCT: "产品",
    AgentRole.QA: "品质",
    AgentRole.DEVOPS: "运维",
    AgentRole.DATA: "数据",
    AgentRole.LEAD: "Lead",
}


class AgentConfig(BaseModel):
    id: str
    name: str
    role: AgentRole
    role_label_zh: str
    desk_position: tuple[int, int]
    character_sprite: str
    pid: Optional[int] = None


class AgentState(BaseModel):
    id: str
    name: str
    role: AgentRole
    role_label_zh: str
    status: AgentStatus = AgentStatus.SLEEPING
    current_task: Optional[str] = None
    progress: Optional[float] = None
    desk_position: tuple[int, int] = (0, 0)
    character_sprite: str = "char-default"
    last_heartbeat: Optional[datetime] = None


class HeartbeatPayload(BaseModel):
    status: AgentStatus
    current_task: Optional[str] = None
    progress: Optional[float] = None
    pid: Optional[int] = None
    name: Optional[str] = None
    role: Optional[AgentRole] = None
    role_label_zh: Optional[str] = None
    character_sprite: Optional[str] = None

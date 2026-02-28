from .models import AgentConfig, AgentRole, ROLE_LABELS_ZH

AGENTS: list[AgentConfig] = [
    AgentConfig(
        id="ocean-lead-01",
        name="Ocean",
        role=AgentRole.LEAD,
        role_label_zh="Boss",
        desk_position=(23, 2),
        character_sprite="char-lead",
    ),
]

HEARTBEAT_TIMEOUT_SECONDS = 10.0
MONITOR_CHECK_INTERVAL = 3.0


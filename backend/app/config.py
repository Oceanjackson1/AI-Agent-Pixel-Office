from .models import AgentConfig, AgentRole, ROLE_LABELS_ZH

AGENTS: list[AgentConfig] = [
    AgentConfig(
        id="agent-frontend-01",
        name="小明",
        role=AgentRole.FRONTEND,
        role_label_zh=ROLE_LABELS_ZH[AgentRole.FRONTEND],
        desk_position=(5, 5),
        character_sprite="char-red",
    ),
    AgentConfig(
        id="agent-backend-01",
        name="小华",
        role=AgentRole.BACKEND,
        role_label_zh=ROLE_LABELS_ZH[AgentRole.BACKEND],
        desk_position=(11, 5),
        character_sprite="char-blue",
    ),
    AgentConfig(
        id="agent-design-01",
        name="小美",
        role=AgentRole.DESIGN,
        role_label_zh=ROLE_LABELS_ZH[AgentRole.DESIGN],
        desk_position=(17, 5),
        character_sprite="char-green",
    ),
    AgentConfig(
        id="agent-product-01",
        name="小杰",
        role=AgentRole.PRODUCT,
        role_label_zh=ROLE_LABELS_ZH[AgentRole.PRODUCT],
        desk_position=(8, 12),
        character_sprite="char-yellow",
    ),
    AgentConfig(
        id="agent-qa-01",
        name="小丽",
        role=AgentRole.QA,
        role_label_zh=ROLE_LABELS_ZH[AgentRole.QA],
        desk_position=(14, 12),
        character_sprite="char-orange",
    ),
    AgentConfig(
        id="agent-lead-01",
        name="Leader",
        role=AgentRole.LEAD,
        role_label_zh=ROLE_LABELS_ZH[AgentRole.LEAD],
        desk_position=(23, 2),
        character_sprite="char-lead",
    ),
]

HEARTBEAT_TIMEOUT_SECONDS = 10.0
MONITOR_CHECK_INTERVAL = 3.0

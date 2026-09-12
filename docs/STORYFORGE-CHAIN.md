# 逐轮引擎：StoryForge 新链路（P4a / P4b）

2026-09-08 起，Lotus 99 的每一轮不再走 Prompt 1/2/3（见 CURRENT-PROMPT-WORKFLOW.md，已停用），改为 StoryForge 的运行层：

1. **P4a 回合路由**（`app/prompts/p4a.md`）：读进度、上文摘录、玩家输入、可用锚点，决定 `continue_deepen / activate_anchor / open_action`，并挑选本轮要投影的材料索引。
2. **packet 组装**（`app/engine/runtime.ts#makePacket`）：把故事包里被选中的材料原样投影成 `turn_context`（story_premise / on_stage_characters+performance_card / relevant_relationships / relevant_knowledge_boundaries / relationship_memory / scene / choice_guide）。
3. **P4b 互动正文生成器**（`app/prompts/p4b.md`）：产出 prose + handoff_snapshot + choice_sidecar（+ 可选 game_state / state_cards）。
4. **前端适配**（`app/engine/adapter.ts`）：prose 按“人名：台词”确定性切成 events，choice_sidecar → 2 个选项，进度换章 → chapterComplete / transition，媒体触发见 `app/engine/lotus-media.ts`。

故事包（`app/engine/story-pack.ts`）只从既有素材逐字搬运：`story-data.ts`、`workflow-precompiled.ts`、`workflow-source.ts`。引擎不含 Lotus 专名。

跨轮状态封在 `workflowToken`（AES-GCM，`app/engine/token.ts`），前端契约不变。

模型：kaon-router，环境变量 `KAON_API_KEY` / `KAON_MODEL`（默认 `kaon/gemini-3.7-flash`）。

改提示词：编辑 `app/prompts/*.md` 后运行 `node scripts/build-prompts.mjs` 重新生成同名 `.ts`。

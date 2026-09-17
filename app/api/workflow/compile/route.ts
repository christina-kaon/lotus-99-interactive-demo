/**
 * 会话初始化。新链路没有在线的 Prompt 1/2 编译：故事包是预编好的素材（app/engine/story-pack.ts），
 * 这里只发一枚封装了初始进度的 workflowToken，并把锁定开场、初始选项、角色卡原样交给前端。
 */
import { lotusStoryPack } from "../../../engine/story-pack";
import { initialState } from "../../../engine/state";
import { sealState } from "../../../engine/token";
import { responseContract } from "../../chat/contract";
import { modelName } from "../../../engine/kaon";
import { publicCharacterIds } from "../../../engine/adapter";

async function compiled(sessionId: string) {
  const pack = lotusStoryPack();
  const state = initialState(pack);
  const anchor = pack.anchors.find((entry) => entry.id === state.progress.active_anchor_id) ?? pack.anchors[0];
  return Response.json({
    sessionId,
    workflowToken: await sealState(state),
    compiledFrom: "story-pack",
    engine: { chain: "storyforge-p4a-p4b", model: modelName() },
    story: pack.user_view,
    opening: pack.opening,
    playerContract: pack.player_contract,
    responseContract,
    roleCardCharacters: pack.user_view.character_bios,
    visibleCharacters: anchor.present.filter((id) => publicCharacterIds(pack, anchor.segment_index).includes(id)),
    present: anchor.present,
    current: { segmentId: anchor.id, chapterId: anchor.chapter_id, location: anchor.location },
    progress: state.progress,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { sessionId?: string };
  return compiled(body.sessionId?.trim() || crypto.randomUUID());
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return compiled(url.searchParams.get("sessionId")?.trim() || crypto.randomUUID());
}

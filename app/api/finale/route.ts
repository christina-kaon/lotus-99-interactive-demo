/**
 * 终局投票：只在进度停在 finale_vote.trigger_segment_id 且尚未投票时接受；结局视频素材原样来自预编译 finale_vote.options。
 */
import { lotusStoryPack } from "../../engine/story-pack";
import { openState, sealState } from "../../engine/token";
import type { EngineState } from "../../engine/state";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { sessionId?: string; workflowToken?: string; choice?: string };
    const token = body.workflowToken?.trim();
    const choice = body.choice === "destroy" || body.choice === "preserve" ? body.choice : undefined;
    if (!token || !choice) return Response.json({ error: "finale_session_or_choice_missing" }, { status: 400 });

    const pack = lotusStoryPack();
    const finale = pack.finale_vote;
    const state = await openState(token);
    if (!finale || state.progress.active_anchor_id !== finale.trigger_segment_id) return Response.json({ error: "finale_not_ready" }, { status: 400 });
    if (state.finale_choice) return Response.json({ error: "finale_already_decided" }, { status: 409 });
    const option = finale.options.find((entry) => entry.id === choice);
    if (!option) return Response.json({ error: "finale_choice_invalid" }, { status: 400 });

    const nextState: EngineState = {
      ...state,
      finale_ready: true,
      finale_choice: choice,
      handoff_snapshot: `${state.handoff_snapshot}\n你投出最后一票：${option.label}。${option.summary}`,
    };

    return Response.json({
      workflowToken: await sealState(nextState),
      ending: {
        id: option.id,
        title: option.video.title,
        summary: option.summary,
        video: {
          status: option.video.url && option.video.status !== "pending" ? "ready" : "pending",
          ...(option.video.url ? { url: option.video.url } : {}),
          ...(option.video.poster ? { poster: option.video.poster } : {}),
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "finale_failed";
    return Response.json({ error: message }, { status: message === "workflow_token_invalid" ? 409 : 500 });
  }
}

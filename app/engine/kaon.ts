/** kaon-router 调用与 JSON 容错解析（口径与 storyforge/app/api/story/route.ts 一致）。 */

const ENDPOINT = "https://kaon-router.kaonai.com/v1/chat/completions";

export function modelName() {
  return process.env.KAON_MODEL || process.env.STORY_MODEL || "kaon/gemini-3.7-flash";
}

export function apiKey() {
  return process.env.KAON_API_KEY || process.env.DEEPSEEK_API_KEY || "";
}

export async function completion(system: string, user: string, options: { temperature: number; maxTokens: number; timeoutMs: number; jsonMode?: boolean; reasoningEffort?: "low" | "medium" | "high" }) {
  const key = apiKey();
  if (!key) throw new Error("missing_api_key");
  const request = async (jsonMode: boolean) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      return await fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: modelName(),
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          // 账本抽取这类小调用压低隐藏推理（Gemini 3.7 flash 默认会烧 ~2k 推理 token，700 的预算会被吃空）。
          ...(options.reasoningEffort ? { reasoning_effort: options.reasoningEffort } : {}),
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
      });
    } finally {
      clearTimeout(timer);
    }
  };
  let response = await request(options.jsonMode !== false);
  if (response.status === 400 || response.status === 422) response = await request(false);
  if (!response.ok) throw new Error(`model_upstream_${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string }; finish_reason?: string }> };
  return { raw: data.choices?.[0]?.message?.content ?? "", finishReason: data.choices?.[0]?.finish_reason };
}

function looseString(raw: string, key: string) {
  const start = raw.search(new RegExp(`"${key}"\\s*:\\s*"`));
  if (start < 0) return "";
  const valueStart = raw.indexOf('"', raw.indexOf(":", start) + 1) + 1;
  const boundary = /"(?=\s*,\s*"(?:prose|handoff_snapshot|choice_sidecar|state_cards|game_state|mode|selected_anchor_id|progress)"|\s*})/g;
  boundary.lastIndex = valueStart;
  const end = boundary.exec(raw)?.index;
  if (end === undefined) return "";
  const value = raw.slice(valueStart, end);
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
}

function recoverJsonFields(raw: string) {
  const recovered: Record<string, unknown> = {};
  const prose = looseString(raw, "prose");
  const handoff = looseString(raw, "handoff_snapshot");
  if (prose) recovered.prose = prose;
  if (handoff) recovered.handoff_snapshot = handoff;
  const choices = raw.match(/"choice_sidecar"\s*:\s*\[([\s\S]*?)\]/)?.[1] || "";
  const labels = [...choices.matchAll(/"label"\s*:\s*"((?:\\.|[^"\\])*)"/g)]
    .map((match) => { try { return JSON.parse(`"${match[1]}"`) as string; } catch { return match[1]; } })
    .filter(Boolean);
  if (labels.length) recovered.choice_sidecar = labels.map((label) => ({ label }));
  return recovered;
}

export function jsonCandidates(raw: string): Record<string, unknown> {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        // fall through to field-level recovery
      }
    }
    const recovered = recoverJsonFields(trimmed);
    if (Object.keys(recovered).length) return recovered;
    throw new Error("模型没有返回可解析的 JSON");
  }
}

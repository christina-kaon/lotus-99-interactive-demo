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
  // Transient upstream answers (403 bursts from the router, 429, 5xx) get up to two more tries with a short backoff.
  for (let attempt = 1; attempt <= 2 && !response.ok && (response.status === 403 || response.status === 408 || response.status === 429 || response.status >= 500); attempt++) {
    const retryAfter = Number(response.headers.get("retry-after"));
    await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 5) * 1000 : 800 * attempt + Math.floor(Math.random() * 300)));
    response = await request(options.jsonMode !== false);
  }
  if (!response.ok) throw new Error(`model_upstream_${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string }; finish_reason?: string }> };
  return { raw: data.choices?.[0]?.message?.content ?? "", finishReason: data.choices?.[0]?.finish_reason };
}

export type StreamOptions = {
  temperature: number;
  maxTokens: number;
  /** 整条流的总时限（从发请求到读完）。 */
  timeoutMs: number;
  reasoningEffort?: "low" | "medium" | "high";
  /** 调用方可用它中途掐断模型流（例如已经发现禁词，后面的 token 不必再收）。 */
  signal?: AbortSignal;
};

export type StreamResult = { raw: string; finishReason?: string; aborted: boolean };

/**
 * 流式调用（SSE，`stream: true`）。每收到一段 delta 就把**累计**的原文交给 onDelta；
 * 返回完整原文与是否被调用方中止。上游 4xx/5xx 的重试口径与 completion 一致（流一旦开始就不再重试——
 * 已经交给调用方的增量不能撤回）。不带 response_format：storyforge 同款，router 对流式 + json_object 的支持不稳定。
 */
export async function completionStream(system: string, user: string, options: StreamOptions, onDelta: (raw: string) => void): Promise<StreamResult> {
  const key = apiKey();
  if (!key) throw new Error("missing_api_key");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  const onOuterAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onOuterAbort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const request = () => fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: controller.signal,
    body: JSON.stringify({
      model: modelName(),
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: true,
      ...(options.reasoningEffort ? { reasoning_effort: options.reasoningEffort } : {}),
    }),
  });
  try {
    let response = await request();
    for (let attempt = 1; attempt <= 2 && !response.ok && (response.status === 403 || response.status === 408 || response.status === 429 || response.status >= 500); attempt++) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 5) * 1000 : 800 * attempt + Math.floor(Math.random() * 300)));
      response = await request();
    }
    if (!response.ok) throw new Error(`model_upstream_${response.status}`);
    if (!response.body) throw new Error("model_upstream_no_stream");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let raw = "";
    let finishReason: string | undefined;
    try {
      for (;;) {
        const read = await reader.read();
        if (read.done) break;
        buffer += decoder.decode(read.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        let changed = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const part = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string }; finish_reason?: string }> };
            const delta = part.choices?.[0]?.delta?.content || "";
            if (delta) { raw += delta; changed = true; }
            if (part.choices?.[0]?.finish_reason) finishReason = part.choices[0].finish_reason;
          } catch {
            // 上游偶发的坏帧：跳过，继续收这一轮。
          }
        }
        if (changed) onDelta(raw);
        if (options.signal?.aborted) break;
      }
    } catch (error) {
      if (options.signal?.aborted) return { raw, finishReason, aborted: true };
      throw error;
    } finally {
      reader.cancel().catch(() => undefined);
    }
    return { raw, finishReason, aborted: Boolean(options.signal?.aborted) };
  } catch (error) {
    if (options.signal?.aborted) return { raw: "", finishReason: undefined, aborted: true };
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onOuterAbort);
  }
}

/**
 * 从**尚未闭合**的写手 JSON 原文里增量抠出 prose 字段已到的部分（含转义还原）；
 * 与 storyforge/app/api/story/route.ts 的 scanProse 同源。prose 字段还没开始返回空串。
 */
export function scanProse(raw: string) {
  const marker = raw.match(/"prose"\s*:\s*"/);
  if (!marker || marker.index === undefined) return "";
  let index = marker.index + marker[0].length;
  let result = "";
  while (index < raw.length) {
    const character = raw[index];
    if (character === '"') break;
    if (character !== "\\") {
      result += character;
      index += 1;
      continue;
    }
    const next = raw[index + 1];
    if (!next) break;
    if (next === "n") result += "\n";
    else if (next === "r") result += "\r";
    else if (next === "t") result += "\t";
    else if (next === '"') result += '"';
    else if (next === "\\") result += "\\";
    else if (next === "/") result += "/";
    else if (next === "u") {
      const hex = raw.slice(index + 2, index + 6);
      if (hex.length < 4) break;
      result += String.fromCharCode(parseInt(hex, 16));
      index += 6;
      continue;
    } else result += next;
    index += 2;
  }
  return result;
}

/** prose 字段是否已经闭合（后续内容不再属于正文）。 */
export function proseClosed(raw: string) {
  const marker = raw.match(/"prose"\s*:\s*"/);
  if (!marker || marker.index === undefined) return false;
  let index = marker.index + marker[0].length;
  while (index < raw.length) {
    const character = raw[index];
    if (character === '"') return true;
    index += character === "\\" ? 2 : 1;
  }
  return false;
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

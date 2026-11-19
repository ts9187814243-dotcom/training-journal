const ALLOWED_ORIGIN = "https://training-journal-3vk.pages.dev";
const GEMINI_MODEL_DEFAULT = "gemini-2.5-flash";
const GROQ_MODEL_DEFAULT = "openai/gpt-oss-120b";
const INSTRUCTIONS = `Ты — персональный тренер по силовым тренировкам в приложении-дневнике. Используй профиль и историю тренировок. Анализируй прогрессию нагрузок, объём, частоту, восстановление и баланс мышечных групп. Давай конкретные реалистичные рекомендации, не выдумывай прошлые результаты. Если данных мало, скажи об этом. Не ставь диагнозов и не назначай лечение. При боли, травмах или хронических заболеваниях рекомендуй консультацию врача. Не поощряй опасные максимальные попытки и тренировку через боль. Отвечай понятно и по делу, обычно до 250 слов.

ФОРМАТ ОТВЕТА: верни только один корректный JSON-объект без Markdown-ограждений и текста до/после. Схема: {"version":1,"kind":"text"|"recommendation","title":"короткий заголовок или пустая строка","summary":"краткий вывод или пустая строка","sections":[{"title":"заголовок","content":"текст раздела"}],"exercises":[{"name":"название упражнения","current":"текущий результат или пустая строка","recommendation":"целевая рекомендация или пустая строка","sets":[{"weight":"вес с единицей или пустая строка","reps":"повторения или пустая строка"}],"reason":"обоснование"}],"tips":["короткий совет"],"warnings":["важное ограничение или предупреждение"]}. Все массивы обязательны; если данных нет, используй []. Не выдумывай веса, подходы или результаты: если данных недостаточно, явно сообщи об этом в summary или sections. Для обычного вопроса используй kind=text и заполняй sections; для рекомендаций по тренировкам используй kind=recommendation и exercises. Значения веса и повторений возвращай строками, не заменяй неизвестные значения нулями.`;

function json(data, status = 200, origin = "") {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  if (origin === ALLOWED_ORIGIN) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return new Response(JSON.stringify(data), { status, headers });
}

async function callGemini(messages, language, env) {
  const model = env.GEMINI_MODEL || GEMINI_MODEL_DEFAULT;
  const prompt = messages.map(m => (m.role === "assistant" ? "Тренер" : "Пользователь") + ": " + m.content).join("\n\n");
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(env.GEMINI_API_KEY);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: INSTRUCTIONS + " Отвечай строго на " + language + " языке." }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 700, temperature: 0.7 }
    }),
    signal: AbortSignal.timeout(35000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.error?.message || "Gemini API error"); error.status = response.status; throw error; }
  const reply = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
  if (!reply) throw new Error("Gemini вернул пустой ответ");
  return reply;
}

async function callGroq(messages, language, env) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": "Bearer " + env.GROQ_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.GROQ_MODEL || GROQ_MODEL_DEFAULT,
      messages: [{ role: "system", content: INSTRUCTIONS + " Отвечай строго на " + language + " языке." }, ...messages],
      max_tokens: 700,
      temperature: 0.7
    }),
    signal: AbortSignal.timeout(35000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.error?.message || "Groq API error"); error.status = response.status; throw error; }
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("Groq вернул пустой ответ");
  return reply;
}

async function callCloudflare(messages, language, env) {
  if (!env.AI) throw new Error("Cloudflare Workers AI binding не настроен");
  const request = {
    messages: [
      { role: "system", content: INSTRUCTIONS + " Отвечай строго на " + language + " языке." },
      ...messages
    ],
    temperature: 0.7,
    reasoning_effort: "low"
  };
  const contentText = (value) => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map(part => {
      if (typeof part === "string") return part;
      return part?.text || part?.content || "";
    }).join("");
    return "";
  };
  const extractReply = (response) => {
    const outputMessage = Array.isArray(response?.output)
      ? response.output.find(item => item?.type === "message" || item?.role === "assistant")
      : null;
    const outputContent = Array.isArray(outputMessage?.content)
      ? outputMessage.content.map(part => part?.text || part?.content || "").join("")
      : "";
    return (
      contentText(response?.response) ||
      contentText(response?.output_text) ||
      contentText(response?.choices?.[0]?.message?.content) ||
      contentText(response?.choices?.[0]?.text) ||
      contentText(response?.choices?.[0]?.content) ||
      contentText(response?.choices?.[0]?.delta?.content) ||
      contentText(response?.result?.response) ||
      outputContent
    ).trim();
  };

  // Retry once with a larger output budget only when the model reports truncation.
  for (const maxTokens of [2000, 3000]) {
    const response = await env.AI.run(env.CF_AI_MODEL || "@cf/openai/gpt-oss-20b", {
      ...request,
      max_tokens: maxTokens
    });
    const reply = extractReply(response);
    const firstChoice = Array.isArray(response?.choices) ? response.choices[0] : null;
    const finishReason = firstChoice?.finish_reason ?? firstChoice?.stop_reason ?? null;
    if (finishReason === "length" && maxTokens === 2000) {
      console.warn("Cloudflare Workers AI response truncated; retrying once with 3000 tokens");
      continue;
    }
    if (reply) return reply;

    // Log structure only: never include the user's prompt or model-generated content.
    const choiceMessage = firstChoice?.message;
    const shape = {
      topLevelKeys: response && typeof response === "object" ? Object.keys(response) : [],
      choicesType: Array.isArray(response?.choices) ? "array" : typeof response?.choices,
      choicesLength: Array.isArray(response?.choices) ? response.choices.length : null,
      firstChoiceType: typeof firstChoice,
      firstChoiceKeys: firstChoice && typeof firstChoice === "object" ? Object.keys(firstChoice) : [],
      messageType: typeof choiceMessage,
      messageKeys: choiceMessage && typeof choiceMessage === "object" ? Object.keys(choiceMessage) : [],
      messageContentType: typeof choiceMessage?.content,
      messageContentIsNull: choiceMessage?.content === null,
      messageContentKeys: choiceMessage?.content && typeof choiceMessage.content === "object" ? Object.keys(choiceMessage.content) : [],
      messageContentIsArray: Array.isArray(choiceMessage?.content),
      refusalType: typeof choiceMessage?.refusal,
      reasoningContentType: typeof choiceMessage?.reasoning_content,
      reasoningContentLength: typeof choiceMessage?.reasoning_content === "string" ? choiceMessage.reasoning_content.length : null,
      choiceTextType: typeof firstChoice?.text,
      finishReason
    };
    throw new Error("Cloudflare Workers AI: не удалось извлечь текст; структура ответа: " + JSON.stringify(shape));
  }
  throw new Error("Cloudflare Workers AI: не удалось получить ответ после повторной генерации");
}


async function deleteAccount(request, env, origin) {
  const base = (env.SUPABASE_URL || "https://wxpvlphfblxvijwrwtjm.supabase.co").replace(/\/$/, "");
  const secretKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const legacyAdminKey = env.SUPABASE_AUTH_ADMIN_KEY;
  if (!secretKey || !legacyAdminKey) {
    return json({ error: "Удаление аккаунта не настроено: проверьте серверные ключи Supabase." }, 503, origin);
  }

  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return json({ error: "Требуется авторизация." }, 401, origin);

  // Verify the caller's session using the user's JWT and the modern project API key.
  const userResponse = await fetch(base + "/auth/v1/user", {
    headers: { "apikey": secretKey, "Authorization": "Bearer " + token }
  });
  const user = await userResponse.json().catch(() => ({}));
  if (!userResponse.ok || !user.id) return json({ error: "Сессия недействительна. Войдите снова." }, 401, origin);

  // Modern sb_secret keys are API keys, not JWTs: use them only as apikey.
  const dataResponse = await fetch(base + "/rest/v1/user_data?user_id=eq." + encodeURIComponent(user.id), {
    method: "DELETE",
    headers: { "apikey": secretKey, "Authorization": "Bearer " + legacyAdminKey, "Prefer": "return=minimal" }
  });
  if (!dataResponse.ok) {
    const detail = (await dataResponse.text()).slice(0, 500);
    console.error("Account data deletion failed:", dataResponse.status, detail);
    return json({ error: "Не удалось удалить облачные данные.", stage: "data_delete", upstreamStatus: dataResponse.status, detail }, 502, origin);
  }

  // Supabase Auth Admin currently requires a JWT-style admin bearer credential.
  const deleteResponse = await fetch(base + "/auth/v1/admin/users/" + encodeURIComponent(user.id), {
    method: "DELETE",
    headers: {
      "apikey": legacyAdminKey,
      "Authorization": "Bearer " + legacyAdminKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ should_soft_delete: false })
  });
  if (!deleteResponse.ok) {
    const detail = (await deleteResponse.text()).slice(0, 500);
    console.error("Auth account deletion failed:", deleteResponse.status, detail);
    return json({ error: "Не удалось удалить аккаунт. Данные приложения уже удалены.", stage: "auth_delete", upstreamStatus: deleteResponse.status, detail }, 502, origin);
  }
  return json({ ok: true }, 200, origin);
}


function boundedText(value, max = 1200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseCoachPayload(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const candidate = raw.trim().replace(/^`{3}(?:json)?\s*/i, "").replace(/\s*`{3}$/i, "");
  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || parsed.version !== 1) return null;
    const list = (value, mapper, limit = 8) => Array.isArray(value) ? value.slice(0, limit).map(mapper).filter(Boolean) : [];
    const sections = list(parsed.sections, item => {
      if (!item || typeof item !== "object") return null;
      const title = boundedText(item.title, 100), content = boundedText(item.content, 1800);
      return title || content ? { title, content } : null;
    }, 8);
    const exercises = list(parsed.exercises, item => {
      if (!item || typeof item !== "object") return null;
      const name = boundedText(item.name, 120);
      if (!name) return null;
      const sets = list(item.sets, set => {
        if (!set || typeof set !== "object") return null;
        const weight = boundedText(set.weight, 40), reps = boundedText(set.reps, 40);
        return weight || reps ? { weight, reps } : null;
      }, 12);
      return { name, current: boundedText(item.current, 160), recommendation: boundedText(item.recommendation, 160), sets, reason: boundedText(item.reason, 500) };
    }, 12);
    const tips = list(parsed.tips, item => boundedText(item, 300), 8);
    const warnings = list(parsed.warnings, item => boundedText(item, 300), 8);
    const payload = { version: 1, kind: parsed.kind === "recommendation" ? "recommendation" : "text", title: boundedText(parsed.title, 120), summary: boundedText(parsed.summary, 500), sections, exercises, tips, warnings };
    return payload.title || payload.summary || sections.length || exercises.length || tips.length || warnings.length ? payload : null;
  } catch { return null; }
}

function coachPayloadToText(payload) {
  const parts = [];
  if (payload.title) parts.push("## " + payload.title);
  if (payload.summary) parts.push(payload.summary);
  for (const section of payload.sections) parts.push((section.title ? "### " + section.title + "\n" : "") + section.content);
  for (const exercise of payload.exercises) {
    let block = "### " + exercise.name;
    if (exercise.current) block += "\nТекущий результат: " + exercise.current;
    if (exercise.recommendation) block += "\nРекомендация: " + exercise.recommendation;
    if (exercise.sets.length) block += "\n" + exercise.sets.map((set, i) => (i + 1) + ". " + [set.weight, set.reps].filter(Boolean).join(" × ")).join("\n");
    if (exercise.reason) block += "\n" + exercise.reason;
    parts.push(block);
  }
  if (payload.tips.length) parts.push("### Советы\n" + payload.tips.map(x => "- " + x).join("\n"));
  if (payload.warnings.length) parts.push("### Важно\n" + payload.warnings.map(x => "- " + x).join("\n"));
  return parts.join("\n\n");
}

async function coach(request, env, origin) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Некорректный JSON." }, 400, origin); }
  const language = ({ ru: "русском", en: "английском", de: "немецком", es: "испанском", fr: "французском", zh: "китайском", ja: "японском", hi: "хинди" })[body?.language] || "русском";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const context = typeof body?.context === "string" ? body.context.slice(0, 18000) : "";
  const history = Array.isArray(body?.history) ? body.history.slice(-10) : [];
  if (!message || message.length > 4000) return json({ error: "Сообщение должно содержать от 1 до 4000 символов." }, 400, origin);
  const input = history.filter(x => x && ["user", "assistant"].includes(x.role) && typeof x.content === "string")
    .map(x => ({ role: x.role, content: x.content.slice(0, 4000) }));
  input.push({ role: "user", content: "Данные журнала тренировок:\n" + (context || "Нет данных профиля и истории.") + "\n\nВопрос пользователя:\n" + message });
  const requested = ["auto", "cloudflare", "gemini", "groq"].includes(body?.provider) ? body.provider : "auto";
  const order = requested === "auto" ? ["cloudflare", "groq"] : [requested];
  const errors = [];
  for (const name of order) {
    if (name === "cloudflare" && !env.AI) { errors.push("Cloudflare Workers AI: binding не настроен"); continue; }
    if (name === "gemini" && !env.GEMINI_API_KEY) { errors.push("Gemini: ключ не настроен"); continue; }
    if (name === "groq" && !env.GROQ_API_KEY) { errors.push("Groq: ключ не настроен"); continue; }
    try {
      const rawReply = name === "cloudflare" ? await callCloudflare(input, language, env) : name === "gemini" ? await callGemini(input, language, env) : await callGroq(input, language, env);
      const structured = parseCoachPayload(rawReply);
      const reply = structured ? coachPayloadToText(structured) : rawReply;
      return json({ reply, structured, format: structured ? "coach.v1" : "text", provider: name }, 200, origin);
    } catch (error) {
      console.error(name + " API error:", error?.status || "", error?.message || error);
      errors.push(name + ": " + (error?.status === 429 ? "достигнут лимит запросов" : error?.status === 401 || error?.status === 403 ? "ключ недействителен или доступ запрещён" : "сервис временно недоступен"));
    }
  }
  const detail = errors.length ? errors.join("; ") : "Нет доступного ИИ-провайдера";
  const status = order.length === 1 && errors.some(x => x.includes("лимит")) ? 429 : 503;
  return json({ error: "Не удалось получить ответ от ИИ-тренера. " + detail + ". Проверьте API-ключи и лимиты." }, status, origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      if (origin && origin !== ALLOWED_ORIGIN) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin"
      }});
    }
    if (origin && origin !== ALLOWED_ORIGIN) return json({ error: "Origin not allowed" }, 403);
    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true, providers: { cloudflare: Boolean(env.AI), gemini: Boolean(env.GEMINI_API_KEY), groq: Boolean(env.GROQ_API_KEY) } }, 200, origin);
    }
    if (url.pathname === "/api/account/delete" && request.method === "POST") {
      return deleteAccount(request, env, origin);
    }
    if (url.pathname === "/api/coach" && request.method === "POST") {
      const length = Number(request.headers.get("Content-Length") || 0);
      if (length > 65536) return json({ error: "Запрос слишком большой." }, 413, origin);
      return coach(request, env, origin);
    }
    return json({ error: "Not found" }, 404, origin);
  }
};

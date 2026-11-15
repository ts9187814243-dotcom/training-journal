const ALLOWED_ORIGIN = "https://training-journal-3vk.pages.dev";
const GEMINI_MODEL_DEFAULT = "gemini-2.5-flash";
const GROQ_MODEL_DEFAULT = "openai/gpt-oss-120b";
const INSTRUCTIONS = `Ты — персональный тренер по силовым тренировкам в приложении-дневнике. Используй профиль и историю тренировок. Анализируй прогрессию нагрузок, объём, частоту, восстановление и баланс мышечных групп. Давай конкретные реалистичные рекомендации, не выдумывай прошлые результаты. Если данных мало, скажи об этом. Не ставь диагнозов и не назначай лечение. При боли, травмах или хронических заболеваниях рекомендуй консультацию врача. Не поощряй опасные максимальные попытки и тренировку через боль. Отвечай понятно и по делу, обычно до 250 слов.`;

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
  const response = await env.AI.run(env.CF_AI_MODEL || "@cf/openai/gpt-oss-20b", {
    messages: [
      { role: "system", content: INSTRUCTIONS + " Отвечай строго на " + language + " языке." },
      ...messages
    ],
    max_tokens: 700,
    temperature: 0.7
  });
  const contentText = (value) => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map(part => {
      if (typeof part === "string") return part;
      return part?.text || part?.content || "";
    }).join("");
    return "";
  };
  const outputMessage = Array.isArray(response?.output)
    ? response.output.find(item => item?.type === "message" || item?.role === "assistant")
    : null;
  const outputContent = Array.isArray(outputMessage?.content)
    ? outputMessage.content.map(part => part?.text || part?.content || "").join("")
    : "";
  const reply = (
    contentText(response?.response) ||
    contentText(response?.output_text) ||
    contentText(response?.choices?.[0]?.message?.content) ||
    contentText(response?.result?.response) ||
    outputContent
  ).trim();
  if (!reply) {
    const shape = response && typeof response === "object"
      ? Object.keys(response).join(",")
      : typeof response;
    throw new Error("Cloudflare Workers AI вернул ответ без распознанного текста (поля: " + shape + ")");
  }
  return reply;
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
      const reply = name === "cloudflare" ? await callCloudflare(input, language, env) : name === "gemini" ? await callGemini(input, language, env) : await callGroq(input, language, env);
      return json({ reply, provider: name }, 200, origin);
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
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin"
      }});
    }
    if (origin && origin !== ALLOWED_ORIGIN) return json({ error: "Origin not allowed" }, 403);
    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true, providers: { cloudflare: Boolean(env.AI), gemini: Boolean(env.GEMINI_API_KEY), groq: Boolean(env.GROQ_API_KEY) } }, 200, origin);
    }
    if (url.pathname === "/api/coach" && request.method === "POST") {
      const length = Number(request.headers.get("Content-Length") || 0);
      if (length > 65536) return json({ error: "Запрос слишком большой." }, 413, origin);
      return coach(request, env, origin);
    }
    return json({ error: "Not found" }, 404, origin);
  }
};

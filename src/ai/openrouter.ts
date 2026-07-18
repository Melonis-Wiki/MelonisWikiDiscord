import { config } from "../config/env.js";
import { withTimeout } from "../utils/async.js";
import { cleanDiscordText, clip } from "../utils/text.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_CONTENT_CHARS = 14_000;

type ChatCompletionResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
  message?: string;
};

export async function summarizeArticle(title: string, content: string): Promise<string> {
  const articleBody =
    content.length > MAX_CONTENT_CHARS
      ? `${content.slice(0, MAX_CONTENT_CHARS)}\n\n[trimmed for model limit]`
      : content;

  const response = await withTimeout(
    (signal) =>
      fetch(OPENROUTER_URL, {
        method: "POST",
        signal,
        headers: {
          Authorization: `Bearer ${config.openRouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": config.wikiBaseUrl,
          "X-Title": "Melonis Wiki Discord"
        },
        body: JSON.stringify({
          model: config.openRouterModel,
          messages: [
            {
              role: "system",
              content:
                "Ты помощник вики Melonis. Пиши краткие точные пересказы статей на русском. " +
                "Не используй эмодзи, markdown-заголовки и массовые списки. " +
                "Сохраняй ключевые факты, правила и числа. Не добавляй факты, которых нет в статье. " +
                "Длина: 600-1200 символов, чтобы ответ хорошо помещался в Discord."
            },
            {
              role: "user",
              content: `Заголовок: ${title}\n\nТекст статьи:\n\n${articleBody}`
            }
          ],
          max_tokens: 700,
          temperature: 0.25
        })
      }),
    30_000,
    "OpenRouter request"
  );

  const body = await response.text();
  let data: ChatCompletionResponse;
  try {
    data = JSON.parse(body) as ChatCompletionResponse;
  } catch {
    throw new Error(`OpenRouter returned invalid JSON (${response.status}): ${clip(body.replace(/\s+/g, " "), 300)}`);
  }

  if (!response.ok) {
    throw new Error(data.error?.message ?? data.message ?? `OpenRouter error (${response.status})`);
  }

  const summary = cleanDiscordText(data.choices?.[0]?.message?.content ?? "");
  if (!summary) {
    throw new Error("OpenRouter returned an empty summary");
  }

  return summary;
}

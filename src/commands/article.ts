import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { summarizeArticle } from "../ai/openrouter.js";
import { config } from "../config/env.js";
import {
  deleteCachedArticleSummary,
  getCachedArticleSummary,
  saveArticleSummary
} from "../db/article-summary-repository.js";
import { isArticleSummaryCacheFresh } from "../db/article-summary-cache.js";
import { searchArticles, getArticleById } from "../wiki/client.js";
import { normalizeWikiArticleUrl } from "../wiki/url.js";
import { cleanDiscordText, clip } from "../utils/text.js";
import { logger } from "../utils/logger.js";

const EMBED_COLOR = 0x2b6cb0;
const MAX_DESCRIPTION = 4096;
const MAX_FIELD = 1024;

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function description(summary: string): string {
  const cleaned = cleanDiscordText(summary);
  return clip(cleaned || "Краткое содержание недоступно.", MAX_DESCRIPTION);
}

function articleEmbed(meta: {
  title: string;
  url: string;
  sectionName: string;
  updatedAt: string;
  summary: string;
  fromCache: boolean;
}): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setTitle(clip(cleanDiscordText(meta.title) || "Статья", 256))
    .setDescription(description(meta.summary))
    .addFields(
      {
        name: "Раздел",
        value: clip(cleanDiscordText(meta.sectionName) || "-", MAX_FIELD),
        inline: true
      },
      {
        name: "Обновлено",
        value: formatDate(meta.updatedAt),
        inline: true
      }
    )
    .setFooter({ text: meta.fromCache ? "melonis.wiki · cache" : "melonis.wiki" });

  try {
    embed.setURL(new URL(meta.url).href);
  } catch {
    logger.warn("Invalid article URL skipped in embed", { url: meta.url });
  }

  return embed;
}

async function replyWithArticle(
  interaction: ChatInputCommandInteraction,
  meta: {
    title: string;
    url: string;
    sectionName: string;
    updatedAt: string;
    summary: string;
    fromCache: boolean;
  }
): Promise<void> {
  try {
    await interaction.editReply({ embeds: [articleEmbed(meta)] });
  } catch (error) {
    logger.warn("Article embed failed; falling back to plain text", error);
    await interaction.editReply({
      content: [
        `**${clip(cleanDiscordText(meta.title) || "Статья", 200)}**`,
        meta.url,
        "",
        clip(description(meta.summary), 1900)
      ].join("\n")
    });
  }
}

export async function handleArticleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const query = cleanDiscordText(interaction.options.getString("query", true));

  if (query.length < 2) {
    await interaction.reply({
      content: "Запрос должен содержать минимум 2 символа.",
      ephemeral: true
    });
    return;
  }

  await interaction.deferReply();

  const hits = await searchArticles(query);
  if (hits.length === 0) {
    await interaction.editReply(`По запросу "${clip(query, 200)}" на melonis.wiki ничего не найдено.`);
    return;
  }

  const selected = hits[0];
  if (!selected) {
    await interaction.editReply(`По запросу "${clip(query, 200)}" на melonis.wiki ничего не найдено.`);
    return;
  }
  const cached = await getCachedArticleSummary(selected.id);

  if (cached && isArticleSummaryCacheFresh(cached, selected.updated_at, Date.now(), config.summaryCacheTtlMs)) {
    await replyWithArticle(interaction, {
      title: cached.title,
      url: normalizeWikiArticleUrl(cached.url, selected.id),
      sectionName: cached.section_name,
      updatedAt: cached.wiki_updated_at,
      summary: cached.summary,
      fromCache: true
    });
    return;
  }

  if (cached) {
    await deleteCachedArticleSummary(selected.id);
  }

  const article = await getArticleById(selected.id);
  const summary = await summarizeArticle(article.title, article.content);
  const canonicalUrl = normalizeWikiArticleUrl(article.url, article.id);

  await saveArticleSummary({
    articleId: article.id,
    title: article.title,
    url: canonicalUrl,
    sectionName: article.section_name,
    authorUsername: article.author_username,
    wikiUpdatedAt: article.updated_at,
    summary
  });

  await replyWithArticle(interaction, {
    title: article.title,
    url: canonicalUrl,
    sectionName: article.section_name,
    updatedAt: article.updated_at,
    summary,
    fromCache: false
  });
}

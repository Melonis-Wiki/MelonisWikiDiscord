import { ApplicationCommandOptionType, REST, Routes, type Client } from "discord.js";
import { config } from "../config/env.js";
import { logger } from "../utils/logger.js";

const slashCommands = [
  {
    name: "article",
    description: "Найти статью на melonis.wiki и показать краткое содержание",
    dm_permission: false,
    options: [
      {
        name: "query",
        description: "Поисковый запрос",
        type: ApplicationCommandOptionType.String,
        required: true,
        min_length: 2,
        max_length: 200
      }
    ]
  }
] as const;

export async function registerSlashCommands(client: Client<true>): Promise<void> {
  const guild =
    client.guilds.cache.get(config.guildId) ??
    (await client.guilds.fetch(config.guildId).catch(() => undefined));

  if (!guild) {
    logger.warn(`Bot is not in guild ${config.guildId}; slash commands were not registered`);
    return;
  }

  const rest = new REST({ version: "10" }).setToken(config.discordToken);
  await rest.put(Routes.applicationGuildCommands(client.user.id, config.guildId), {
    body: [...slashCommands]
  });
  logger.info(`Registered ${slashCommands.length} slash command(s) in ${guild.name}`);
}

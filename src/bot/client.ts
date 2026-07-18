import { Client, Events, GatewayIntentBits } from "discord.js";
import { config } from "../config/env.js";
import { handleArticleCommand } from "../commands/article.js";
import { registerSlashCommands } from "../commands/register.js";
import { handlePrefixCommand } from "../moderation/prefix-router.js";
import { logger } from "../utils/logger.js";

export function createDiscordClient(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildModeration
    ]
  });

  client.once(Events.ClientReady, (readyClient) => {
    void (async () => {
      for (const [, guild] of readyClient.guilds.cache) {
        if (guild.id !== config.guildId) {
          await guild.leave().catch((error) => logger.warn(`Failed to leave guild ${guild.id}`, error));
        }
      }

      await registerSlashCommands(readyClient).catch((error) => {
        logger.error("Failed to register slash commands", error);
      });

      logger.info(`Logged in as ${readyClient.user.tag}`);
    })();
  });

  client.on(Events.GuildCreate, (guild) => {
    if (guild.id !== config.guildId) {
      void guild.leave().catch((error) => logger.warn(`Failed to leave guild ${guild.id}`, error));
    }
  });

  client.on(Events.InteractionCreate, (interaction) => {
    void (async () => {
      if (interaction.guildId !== config.guildId) return;
      if (!interaction.isChatInputCommand()) return;

      if (interaction.commandName === "article") {
        try {
          await handleArticleCommand(interaction);
        } catch (error) {
          logger.error("Article command failed", error);
          const payload = { content: "Не удалось обработать команду. Попробуйте позже." };
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply(payload).catch(() => undefined);
          } else {
            await interaction.reply({ ...payload, ephemeral: true }).catch(() => undefined);
          }
        }
      }
    })();
  });

  client.on(Events.MessageCreate, (message) => {
    void handlePrefixCommand(message);
  });

  client.on("error", (error) => {
    logger.error("Discord client error", error);
  });

  client.on("warn", (message) => {
    logger.warn(`Discord warning: ${message}`);
  });

  return client;
}

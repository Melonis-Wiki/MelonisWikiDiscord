import {
  ChannelType,
  PermissionFlagsBits,
  type GuildMember,
  type Message,
  type TextChannel
} from "discord.js";
import { config } from "../config/env.js";
import {
  addWarning,
  getModerationLogs,
  getWarnings,
  logModeration
} from "../db/moderation-repository.js";
import {
  botCanManageRole,
  botCanModerateMember,
  canManageRole,
  canModerateMember,
  hasPermission
} from "../discord/permissions.js";
import {
  parseCommand,
  parseDurationMinutes,
  parseNonNegativeInt,
  parsePositiveInt,
  parseUserId
} from "../utils/parse.js";
import { clip, isoDateOnly, reasonText } from "../utils/text.js";
import { helpText } from "../commands/help.js";
import { logger } from "../utils/logger.js";

async function hasAdminRole(message: Message): Promise<boolean> {
  const member =
    message.member ?? (await message.guild?.members.fetch(message.author.id).catch(() => null));
  return member?.roles.cache.has(config.adminRoleId) ?? false;
}

async function resolveMember(message: Message, arg: string | undefined): Promise<GuildMember | null> {
  const userId = parseUserId(message, arg);
  if (!userId || !message.guild) return null;
  return message.guild.members.fetch(userId).catch(() => null);
}

async function reply(message: Message, text: string, autoDeleteMs?: number): Promise<void> {
  const sent = await message.reply({ content: clip(text, 1900), allowedMentions: { repliedUser: false } });
  if (autoDeleteMs) {
    setTimeout(() => {
      void sent.delete().catch(() => undefined);
    }, autoDeleteMs);
  }
}

function currentTextChannel(message: Message): TextChannel | null {
  if (!message.channel.isTextBased() || message.channel.isDMBased()) return null;
  if (message.channel.type !== ChannelType.GuildText) return null;
  return message.channel;
}

function missingBotPermission(bot: GuildMember, permission: bigint): boolean {
  return !hasPermission(bot, permission);
}

function canActOnTarget(actor: GuildMember, bot: GuildMember, target: GuildMember): string | null {
  if (!canModerateMember(actor, target)) return "You cannot moderate that user.";
  if (!botCanModerateMember(bot, target)) return "I cannot moderate that user.";
  return null;
}

async function audit(action: string, userId: string | null, moderatorId: string, reason: string): Promise<void> {
  await logModeration(action, userId, moderatorId, reason).catch((error) => {
    logger.warn("Failed to write moderation log", error);
  });
}

export async function handlePrefixCommand(message: Message): Promise<void> {
  if (message.author.bot || !message.guild) return;
  if (message.guild.id !== config.guildId) return;
  if (!message.content.startsWith(config.commandPrefix)) return;
  if (!(await hasAdminRole(message))) return;

  const { command, args } = parseCommand(message.content, config.commandPrefix);
  if (!command) return;

  const bot = message.guild.members.me;
  const actor = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
  if (!bot || !actor) return;

  try {
    switch (command) {
      case "help": {
        await reply(message, helpText(config.commandPrefix));
        return;
      }

      case "ban": {
        if (missingBotPermission(bot, PermissionFlagsBits.BanMembers)) {
          await reply(message, "Missing Ban Members permission.");
          return;
        }
        const target = await resolveMember(message, args[0]);
        if (!target) {
          await reply(message, "Invalid user.");
          return;
        }
        const blocked = canActOnTarget(actor, bot, target);
        if (blocked) {
          await reply(message, blocked);
          return;
        }
        const reason = reasonText(args.slice(1), "No reason");
        await target.ban({ reason });
        await audit("ban", target.id, message.author.id, reason);
        await reply(message, `Banned ${target.user.tag}.`);
        return;
      }

      case "unban": {
        if (missingBotPermission(bot, PermissionFlagsBits.BanMembers)) {
          await reply(message, "Missing Ban Members permission.");
          return;
        }
        const userId = parseUserId(message, args[0]);
        if (!userId) {
          await reply(message, "Invalid user id.");
          return;
        }
        const reason = reasonText(args.slice(1), "No reason");
        await message.guild.members.unban(userId, reason);
        await audit("unban", userId, message.author.id, reason);
        await reply(message, `Unbanned ${userId}.`);
        return;
      }

      case "kick": {
        if (missingBotPermission(bot, PermissionFlagsBits.KickMembers)) {
          await reply(message, "Missing Kick Members permission.");
          return;
        }
        const target = await resolveMember(message, args[0]);
        if (!target) {
          await reply(message, "Invalid user.");
          return;
        }
        const blocked = canActOnTarget(actor, bot, target);
        if (blocked) {
          await reply(message, blocked);
          return;
        }
        const reason = reasonText(args.slice(1), "No reason");
        await target.kick(reason);
        await audit("kick", target.id, message.author.id, reason);
        await reply(message, `Kicked ${target.user.tag}.`);
        return;
      }

      case "timeout": {
        if (missingBotPermission(bot, PermissionFlagsBits.ModerateMembers)) {
          await reply(message, "Missing Moderate Members permission.");
          return;
        }
        const target = await resolveMember(message, args[0]);
        const minutes = parseDurationMinutes(args[1]);
        if (!target || !minutes) {
          await reply(message, `Usage: ${config.commandPrefix}timeout @user|id minutes [reason]`);
          return;
        }
        const blocked = canActOnTarget(actor, bot, target);
        if (blocked) {
          await reply(message, blocked);
          return;
        }
        const reason = reasonText(args.slice(2), "No reason");
        await target.timeout(minutes * 60_000, reason);
        await audit("timeout", target.id, message.author.id, reason);
        await reply(message, `Timed out ${target.user.tag} for ${minutes}m.`);
        return;
      }

      case "untimeout":
      case "unmute": {
        if (missingBotPermission(bot, PermissionFlagsBits.ModerateMembers)) {
          await reply(message, "Missing Moderate Members permission.");
          return;
        }
        const target = await resolveMember(message, args[0]);
        if (!target) {
          await reply(message, "Invalid user.");
          return;
        }
        const blocked = canActOnTarget(actor, bot, target);
        if (blocked) {
          await reply(message, blocked);
          return;
        }
        await target.timeout(null);
        await audit(command, target.id, message.author.id, "");
        await reply(message, command === "untimeout" ? `Removed timeout from ${target.user.tag}.` : `Unmuted ${target.user.tag}.`);
        return;
      }

      case "mute": {
        if (missingBotPermission(bot, PermissionFlagsBits.ModerateMembers)) {
          await reply(message, "Missing Moderate Members permission.");
          return;
        }
        const target = await resolveMember(message, args[0]);
        if (!target) {
          await reply(message, "Invalid user.");
          return;
        }
        const blocked = canActOnTarget(actor, bot, target);
        if (blocked) {
          await reply(message, blocked);
          return;
        }
        const reason = reasonText(args.slice(1), "Muted");
        await target.timeout(24 * 60 * 60_000, reason);
        await audit("mute", target.id, message.author.id, reason);
        await reply(message, `Muted ${target.user.tag}.`);
        return;
      }

      case "warn": {
        const target = await resolveMember(message, args[0]);
        if (!target) {
          await reply(message, "Invalid user.");
          return;
        }
        if (!canModerateMember(actor, target)) {
          await reply(message, "You cannot warn that user.");
          return;
        }
        const reason = reasonText(args.slice(1), "No reason");
        const count = await addWarning(target.id, message.author.id, reason);
        await audit("warn", target.id, message.author.id, reason);
        await reply(message, `Warned ${target.user.tag}. Total: ${count}.`);
        return;
      }

      case "warnings": {
        const userId = parseUserId(message, args[0]);
        if (!userId) {
          await reply(message, "Invalid user.");
          return;
        }
        const warnings = await getWarnings(userId);
        if (warnings.length === 0) {
          await reply(message, "No warnings.");
          return;
        }
        await reply(
          message,
          warnings
            .map((warning, index) => `${index + 1}. ${warning.reason || "No reason"} (${isoDateOnly(warning.created_at)})`)
            .join("\n")
        );
        return;
      }

      case "purge": {
        if (missingBotPermission(bot, PermissionFlagsBits.ManageMessages)) {
          await reply(message, "Missing Manage Messages permission.");
          return;
        }
        const amount = parsePositiveInt(args[0]);
        if (!amount || amount > 100) {
          await reply(message, `Usage: ${config.commandPrefix}purge 1-100`);
          return;
        }
        const channel = currentTextChannel(message);
        if (!channel) {
          await reply(message, "Invalid channel.");
          return;
        }
        await message.delete().catch(() => undefined);
        const deleted = await channel.bulkDelete(amount, true);
        const notice = await channel.send(`Deleted ${deleted.size} messages.`);
        setTimeout(() => {
          void notice.delete().catch(() => undefined);
        }, 5_000);
        return;
      }

      case "slowmode": {
        if (missingBotPermission(bot, PermissionFlagsBits.ManageChannels)) {
          await reply(message, "Missing Manage Channels permission.");
          return;
        }
        const seconds = parseNonNegativeInt(args[0]);
        if (seconds === null || seconds > 21_600) {
          await reply(message, `Usage: ${config.commandPrefix}slowmode seconds (0-21600)`);
          return;
        }
        const channel = currentTextChannel(message);
        if (!channel) {
          await reply(message, "Invalid channel.");
          return;
        }
        await channel.setRateLimitPerUser(seconds, `Changed by ${message.author.tag}`);
        await audit("slowmode", null, message.author.id, `${seconds}s`);
        await reply(message, `Slowmode set to ${seconds}s.`);
        return;
      }

      case "lockdown":
      case "unlock": {
        if (missingBotPermission(bot, PermissionFlagsBits.ManageChannels)) {
          await reply(message, "Missing Manage Channels permission.");
          return;
        }
        const channel = currentTextChannel(message);
        if (!channel) {
          await reply(message, "Invalid channel.");
          return;
        }
        await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
          SendMessages: command === "lockdown" ? false : null
        });
        await audit(command, null, message.author.id, channel.id);
        await reply(message, command === "lockdown" ? "Channel locked." : "Channel unlocked.");
        return;
      }

      case "nick": {
        if (missingBotPermission(bot, PermissionFlagsBits.ManageNicknames)) {
          await reply(message, "Missing Manage Nicknames permission.");
          return;
        }
        const target = await resolveMember(message, args[0]);
        const nickname = reasonText(args.slice(1), "", 32);
        if (!target || !nickname) {
          await reply(message, `Usage: ${config.commandPrefix}nick @user|id nickname`);
          return;
        }
        const blocked = canActOnTarget(actor, bot, target);
        if (blocked) {
          await reply(message, blocked);
          return;
        }
        await target.setNickname(nickname, `Changed by ${message.author.tag}`);
        await audit("nick", target.id, message.author.id, nickname);
        await reply(message, `Nickname updated for ${target.user.tag}.`);
        return;
      }

      case "role": {
        const subcommand = args[0]?.toLowerCase();
        const target = await resolveMember(message, args[1]);
        const roleId = args[2];
        if (!subcommand || !target || !roleId) {
          await reply(message, `Usage: ${config.commandPrefix}role add|remove @user|id role_id`);
          return;
        }
        const role = message.guild.roles.cache.get(roleId);
        if (!role) {
          await reply(message, "Role not found.");
          return;
        }
        if (!canManageRole(actor, role)) {
          await reply(message, "You cannot manage that role.");
          return;
        }
        if (!botCanManageRole(bot, role)) {
          await reply(message, "I cannot manage that role.");
          return;
        }
        if (subcommand === "add") {
          await target.roles.add(role, `Added by ${message.author.tag}`);
          await audit("role_add", target.id, message.author.id, role.id);
          await reply(message, `Added role to ${target.user.tag}.`);
        } else if (subcommand === "remove") {
          await target.roles.remove(role, `Removed by ${message.author.tag}`);
          await audit("role_remove", target.id, message.author.id, role.id);
          await reply(message, `Removed role from ${target.user.tag}.`);
        } else {
          await reply(message, `Usage: ${config.commandPrefix}role add|remove @user|id role_id`);
        }
        return;
      }

      case "userinfo": {
        const target = await resolveMember(message, args[0]);
        if (!target) {
          await reply(message, "Invalid user.");
          return;
        }
        const warnings = await getWarnings(target.id);
        const logs = await getModerationLogs(target.id, 5);
        const lines = [
          `User: ${target.user.tag} (${target.id})`,
          `Joined: ${target.joinedAt?.toISOString() ?? "unknown"}`,
          `Warnings: ${warnings.length}`
        ];
        if (logs.length > 0) {
          lines.push(
            "Recent mod actions:",
            ...logs.map((log) => `- ${log.action}: ${log.reason || "none"} (${isoDateOnly(log.created_at)})`)
          );
        }
        await reply(message, lines.join("\n"));
        return;
      }

      case "voice": {
        const subcommand = args[0]?.toLowerCase();
        if (missingBotPermission(bot, PermissionFlagsBits.MoveMembers)) {
          await reply(message, "Missing Move Members permission.");
          return;
        }
        if (subcommand === "kick") {
          const target = await resolveMember(message, args[1]);
          if (!target?.voice.channel) {
            await reply(message, "User not in voice.");
            return;
          }
          const blocked = canActOnTarget(actor, bot, target);
          if (blocked) {
            await reply(message, blocked);
            return;
          }
          await target.voice.disconnect(`Disconnected by ${message.author.tag}`);
          await audit("voice_kick", target.id, message.author.id, "");
          await reply(message, `Disconnected ${target.user.tag}.`);
          return;
        }
        if (subcommand === "kickall") {
          const members = await message.guild.members.fetch();
          let count = 0;
          for (const [, member] of members) {
            if (!member.user.bot && member.voice.channel && canModerateMember(actor, member) && botCanModerateMember(bot, member)) {
              await member.voice.disconnect(`Disconnected by ${message.author.tag}`).catch(() => undefined);
              count += 1;
            }
          }
          await audit("voice_kickall", null, message.author.id, String(count));
          await reply(message, `Disconnected ${count} members.`);
          return;
        }
        await reply(message, `Usage: ${config.commandPrefix}voice kick @user|id | ${config.commandPrefix}voice kickall`);
        return;
      }

      default:
        return;
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Command failed";
    logger.warn(`Prefix command failed: ${command}`, error);
    await reply(message, messageText);
  }
}

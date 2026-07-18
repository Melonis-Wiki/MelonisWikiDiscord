import { PermissionFlagsBits, type GuildMember, type Role } from "discord.js";

export function canModerateMember(actor: GuildMember, target: GuildMember): boolean {
  if (target.id === actor.id) return false;
  if (target.id === target.guild.ownerId) return false;
  if (actor.id === actor.guild.ownerId) return true;
  return actor.roles.highest.position > target.roles.highest.position;
}

export function botCanModerateMember(bot: GuildMember, target: GuildMember): boolean {
  if (target.id === bot.id) return false;
  if (target.id === target.guild.ownerId) return false;
  return bot.roles.highest.position > target.roles.highest.position;
}

export function canManageRole(actor: GuildMember, role: Role): boolean {
  if (!actor.permissions.has(PermissionFlagsBits.ManageRoles)) return false;
  if (role.managed) return false;
  if (actor.id === actor.guild.ownerId) return true;
  return role.position < actor.roles.highest.position;
}

export function botCanManageRole(bot: GuildMember, role: Role): boolean {
  if (!bot.permissions.has(PermissionFlagsBits.ManageRoles)) return false;
  if (role.managed) return false;
  return role.position < bot.roles.highest.position;
}

export function hasPermission(member: GuildMember, permission: bigint): boolean {
  return member.permissions.has(permission);
}

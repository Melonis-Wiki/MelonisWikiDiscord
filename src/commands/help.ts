export function helpText(prefix: string): string {
  return [
    "Moderation",
    `${prefix}ban @user|id [reason]`,
    `${prefix}unban user_id [reason]`,
    `${prefix}kick @user|id [reason]`,
    `${prefix}timeout @user|id minutes [reason]`,
    `${prefix}untimeout @user|id`,
    `${prefix}mute @user|id [reason]`,
    `${prefix}unmute @user|id`,
    `${prefix}warn @user|id [reason]`,
    `${prefix}warnings @user|id`,
    `${prefix}purge amount`,
    `${prefix}slowmode seconds`,
    `${prefix}lockdown`,
    `${prefix}unlock`,
    `${prefix}nick @user|id nickname`,
    `${prefix}role add @user|id role_id`,
    `${prefix}role remove @user|id role_id`,
    `${prefix}userinfo @user|id`,
    "",
    "Voice",
    `${prefix}voice kick @user|id`,
    `${prefix}voice kickall`,
    "",
    "Other",
    `${prefix}help`
  ].join("\n");
}

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PermissionFlagsBits, type GuildMember, type Role } from "discord.js";
import {
  botCanManageRole,
  botCanModerateMember,
  canManageRole,
  canModerateMember,
  hasPermission
} from "../src/discord/permissions.js";

function member(options: {
  id: string;
  ownerId?: string;
  highestRolePosition: number;
  manageRoles?: boolean;
}): GuildMember {
  const ownerId = options.ownerId ?? "owner";
  return {
    id: options.id,
    guild: { ownerId },
    roles: { highest: { position: options.highestRolePosition } },
    permissions: {
      has: (permission: bigint) =>
        permission === PermissionFlagsBits.ManageRoles ? Boolean(options.manageRoles) : false
    }
  } as unknown as GuildMember;
}

function role(options: { position: number; managed?: boolean }): Role {
  return {
    position: options.position,
    managed: Boolean(options.managed)
  } as unknown as Role;
}

describe("canModerateMember", () => {
  it("allows a higher ranked moderator to act on a lower ranked member", () => {
    assert.equal(
      canModerateMember(
        member({ id: "moderator", highestRolePosition: 10 }),
        member({ id: "target", highestRolePosition: 5 })
      ),
      true
    );
  });

  it("rejects self moderation and owner moderation", () => {
    assert.equal(
      canModerateMember(
        member({ id: "same", highestRolePosition: 10 }),
        member({ id: "same", highestRolePosition: 1 })
      ),
      false
    );
    assert.equal(
      canModerateMember(
        member({ id: "moderator", ownerId: "owner", highestRolePosition: 10 }),
        member({ id: "owner", ownerId: "owner", highestRolePosition: 1 })
      ),
      false
    );
  });

  it("lets the guild owner bypass role position checks", () => {
    assert.equal(
      canModerateMember(
        member({ id: "owner", ownerId: "owner", highestRolePosition: 1 }),
        member({ id: "target", ownerId: "owner", highestRolePosition: 99 })
      ),
      true
    );
  });
});

describe("botCanModerateMember", () => {
  it("requires the bot to outrank the target", () => {
    assert.equal(
      botCanModerateMember(
        member({ id: "bot", highestRolePosition: 5 }),
        member({ id: "target", highestRolePosition: 5 })
      ),
      false
    );
  });
});

describe("role management", () => {
  it("requires Manage Roles and role hierarchy", () => {
    assert.equal(canManageRole(member({ id: "mod", highestRolePosition: 10, manageRoles: true }), role({ position: 9 })), true);
    assert.equal(canManageRole(member({ id: "mod", highestRolePosition: 10, manageRoles: false }), role({ position: 9 })), false);
    assert.equal(canManageRole(member({ id: "mod", highestRolePosition: 10, manageRoles: true }), role({ position: 10 })), false);
    assert.equal(canManageRole(member({ id: "mod", highestRolePosition: 10, manageRoles: true }), role({ position: 1, managed: true })), false);
  });

  it("applies the same managed-role and hierarchy checks to the bot", () => {
    assert.equal(botCanManageRole(member({ id: "bot", highestRolePosition: 10, manageRoles: true }), role({ position: 9 })), true);
    assert.equal(botCanManageRole(member({ id: "bot", highestRolePosition: 10, manageRoles: true }), role({ position: 11 })), false);
  });

  it("checks arbitrary permissions through the Discord permission object", () => {
    assert.equal(hasPermission(member({ id: "mod", highestRolePosition: 1, manageRoles: true }), PermissionFlagsBits.ManageRoles), true);
  });
});

const { query } = require('../db');
const { ROLE_MEMBER, ROLE_MODERATOR, ROLE_ADMIN } = require('../constants');

function roleLabel(role) {
  if (role === ROLE_ADMIN) {
    return 'Admin';
  }

  if (role === ROLE_MODERATOR) {
    return 'Moderador';
  }

  return 'Membro';
}

function canActOnTarget(actorRole, targetRole) {
  if (actorRole === ROLE_ADMIN) {
    return targetRole <= ROLE_MODERATOR;
  }

  if (actorRole === ROLE_MODERATOR) {
    return targetRole === ROLE_MEMBER;
  }

  return false;
}

async function hasMembership(userId, groupId) {
  const membershipResult = await query(
    'SELECT 1 FROM user_groups WHERE user_id = $1 AND group_id = $2 LIMIT 1',
    [userId, groupId],
  );

  return membershipResult.rows.length > 0;
}

async function getMembership(userId, groupId) {
  const result = await query(
    `
      SELECT user_id AS "userId", group_id AS "groupId", role, muted_until AS "mutedUntil"
      FROM user_groups
      WHERE user_id = $1 AND group_id = $2
      LIMIT 1
    `,
    [userId, groupId],
  );

  return result.rows[0] || null;
}

async function hasBan(userId, groupId) {
  const result = await query(
    'SELECT 1 FROM group_bans WHERE user_id = $1 AND group_id = $2 LIMIT 1',
    [userId, groupId],
  );

  return result.rows.length > 0;
}

async function createSystemMessage(groupId, userId, content) {
  await query(
    `
      INSERT INTO group_messages (group_id, user_id, content, is_system)
      VALUES ($1, $2, $3, true)
    `,
    [groupId, userId, content],
  );
}

module.exports = {
  roleLabel,
  canActOnTarget,
  hasMembership,
  getMembership,
  hasBan,
  createSystemMessage,
};

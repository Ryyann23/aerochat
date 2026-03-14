const { query } = require('../db');

function sanitizeUser(userRow) {
  if (!userRow) {
    return null;
  }

  return {
    id: userRow.id,
    publicId: userRow.public_id,
    name: userRow.name,
    avatar: userRow.avatar,
    avatarColor: userRow.avatar_color,
    bubbleColor: userRow.bubble_color,
    isAdmin: Boolean(userRow.is_admin),
    status: userRow.status,
    createdAt: userRow.created_at,
  };
}

function buildSyntheticEmail(username) {
  return `${username.trim().toLowerCase().replace(/\s+/g, '.')}@aerochat.local`;
}

async function findUserById(userId) {
  const result = await query(
    `
      SELECT id, public_id, name, email, avatar, avatar_color, bubble_color, status, created_at, password
      , is_admin
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rows[0] || null;
}

async function buildUniquePublicId() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const randomNumber = Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, '0');
    const publicId = `USER${randomNumber}`;
    const existing = await query('SELECT 1 FROM users WHERE public_id = $1 LIMIT 1', [publicId]);

    if (existing.rows.length === 0) {
      return publicId;
    }
  }

  return `USER${Date.now()}`;
}

async function ensurePublicIds() {
  const missingUsers = await query('SELECT id FROM users WHERE public_id IS NULL');

  for (const row of missingUsers.rows) {
    const publicId = await buildUniquePublicId();
    await query('UPDATE users SET public_id = $1 WHERE id = $2', [publicId, row.id]);
  }
}

async function isGlobalAdmin(userId) {
  const result = await query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [userId]);
  return Boolean(result.rows[0]?.is_admin);
}

module.exports = {
  sanitizeUser,
  buildSyntheticEmail,
  findUserById,
  buildUniquePublicId,
  ensurePublicIds,
  isGlobalAdmin,
};

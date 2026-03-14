const express = require('express');
const { query } = require('../db');
const { DEFAULT_USER_AVATAR } = require('../constants');
const {
  sanitizeUser,
  buildSyntheticEmail,
  buildUniquePublicId,
} = require('../services/users');
const { parseId } = require('../utils/validators');

const router = express.Router();

router.post('/register', async (request, response) => {
  const username = request.body.username?.trim();
  const password = request.body.password?.trim();

  if (!username || !password) {
    return response.status(400).json({ error: 'Usuario e senha sao obrigatorios.' });
  }

  const existingUser = await query(
    'SELECT id FROM users WHERE LOWER(name) = LOWER($1) LIMIT 1',
    [username],
  );

  if (existingUser.rows.length > 0) {
    return response.status(409).json({ error: 'Ja existe um usuario com esse nome.' });
  }

  try {
    const result = await query(
      `
        INSERT INTO users (public_id, name, email, password, avatar, avatar_color, bubble_color, status)
        VALUES ($1, $2, $3, $4, $5, '#5FC9DE', '#5C91E8', 'online')
        RETURNING id, public_id, name, avatar, avatar_color, bubble_color, is_admin, status, created_at
      `,
      [
        await buildUniquePublicId(),
        username,
        buildSyntheticEmail(username),
        password,
        DEFAULT_USER_AVATAR,
      ],
    );

    return response.status(201).json(sanitizeUser(result.rows[0]));
  } catch (error) {
    if (error.code === '23505') {
      return response.status(409).json({ error: 'Ja existe um usuario com esse nome.' });
    }

    throw error;
  }
});

router.post('/login', async (request, response) => {
  const username = request.body.username?.trim();
  const password = request.body.password?.trim();

  if (!username || !password) {
    return response.status(400).json({ error: 'Usuario e senha sao obrigatorios.' });
  }

  const result = await query(
    `
      SELECT id, name, avatar, status
      , public_id, avatar_color, bubble_color, is_admin, created_at
      FROM users
      WHERE LOWER(name) = LOWER($1) AND password = $2
      LIMIT 1
    `,
    [username, password],
  );

  if (result.rows.length === 0) {
    return response.status(401).json({ error: 'Credenciais invalidas.' });
  }

  await query('UPDATE users SET status = $2 WHERE id = $1', [result.rows[0].id, 'online']);

  return response.json({
    ...sanitizeUser(result.rows[0]),
    status: 'online',
  });
});

router.post('/logout', async (request, response) => {
  const userId = parseId(request.body.userId);

  if (!userId) {
    return response.status(400).json({ error: 'userId obrigatorio.' });
  }

  await query('UPDATE users SET status = $2 WHERE id = $1', [userId, 'offline']);
  return response.status(204).send();
});

module.exports = router;

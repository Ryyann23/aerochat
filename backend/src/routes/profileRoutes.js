const express = require('express');
const { query } = require('../db');
const {
  sanitizeUser,
  buildSyntheticEmail,
  findUserById,
} = require('../services/users');
const {
  parseId,
  isValidAvatarColor,
  isValidBubbleColor,
} = require('../utils/validators');

const router = express.Router();

router.get('/:id/profile', async (request, response) => {
  const userId = parseId(request.params.id);

  if (!userId) {
    return response.status(400).json({ error: 'userId invalido.' });
  }

  const user = await findUserById(userId);

  if (!user) {
    return response.status(404).json({ error: 'Usuario nao encontrado.' });
  }

  return response.json(sanitizeUser(user));
});

router.patch('/:id/profile', async (request, response) => {
  const userId = parseId(request.params.id);
  const rawUsername = request.body.username;
  const username = typeof rawUsername === 'string' ? rawUsername.trim() : null;
  const rawAvatarColor = request.body.avatarColor;
  const avatarColor = typeof rawAvatarColor === 'string' ? rawAvatarColor.trim() : null;
  const rawBubbleColor = request.body.bubbleColor;
  const bubbleColor = typeof rawBubbleColor === 'string' ? rawBubbleColor.trim() : null;
  const currentPassword = request.body.currentPassword?.trim();
  const newPassword = request.body.newPassword?.trim();

  if (!userId) {
    return response.status(400).json({ error: 'userId invalido.' });
  }

  const user = await findUserById(userId);

  if (!user) {
    return response.status(404).json({ error: 'Usuario nao encontrado.' });
  }

  const updates = [];
  const values = [];

  if (username !== null) {
    if (!username) {
      return response.status(400).json({ error: 'Nome de usuario nao pode estar vazio.' });
    }

    const existingUser = await query(
      'SELECT id FROM users WHERE LOWER(name) = LOWER($1) AND id <> $2 LIMIT 1',
      [username, userId],
    );

    if (existingUser.rows.length > 0) {
      return response.status(409).json({ error: 'Ja existe um usuario com esse nome.' });
    }

    values.push(username);
    updates.push(`name = $${values.length}`);

    values.push(buildSyntheticEmail(username));
    updates.push(`email = $${values.length}`);
  }

  if (avatarColor !== null) {
    if (!isValidAvatarColor(avatarColor)) {
      return response.status(400).json({ error: 'Cor de avatar invalida. Use formato #RRGGBB.' });
    }

    values.push(avatarColor.toUpperCase());
    updates.push(`avatar_color = $${values.length}`);
  }

  if (bubbleColor !== null) {
    if (!isValidBubbleColor(bubbleColor)) {
      return response.status(400).json({ error: 'Cor do balao invalida. Use formato #RRGGBB.' });
    }

    values.push(bubbleColor.toUpperCase());
    updates.push(`bubble_color = $${values.length}`);
  }

  if (currentPassword || newPassword) {
    if (!currentPassword || !newPassword) {
      return response.status(400).json({
        error: 'Para alterar a senha, informe a senha atual e a nova senha.',
      });
    }

    if (user.password !== currentPassword) {
      return response.status(401).json({ error: 'Senha atual incorreta.' });
    }

    values.push(newPassword);
    updates.push(`password = $${values.length}`);
  }

  if (updates.length === 0) {
    return response.status(400).json({ error: 'Nenhuma alteracao valida foi enviada.' });
  }

  values.push(userId);

  const result = await query(
    `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, public_id, name, avatar, avatar_color, bubble_color, is_admin, status, created_at
    `,
    values,
  );

  return response.json(sanitizeUser(result.rows[0]));
});

module.exports = router;

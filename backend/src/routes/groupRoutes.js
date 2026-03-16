const express = require('express');
const { query } = require('../db');
const { ROLE_MEMBER, ROLE_ADMIN } = require('../constants');
const {
  findUserById,
  isGlobalAdmin,
} = require('../services/users');
const {
  roleLabel,
  canActOnTarget,
  hasMembership,
  getMembership,
  hasBan,
  createSystemMessage,
} = require('../services/groups');
const {
  addClient,
  removeClient,
  publishGroupEvent,
} = require('../services/realtime');
const { parseId, isValidRole } = require('../utils/validators');

const router = express.Router();

router.get('/groups/:id/stream', async (request, response) => {
  const groupId = parseId(request.params.id);
  const userId = parseId(request.query.userId);

  if (!groupId || !userId) {
    return response.status(400).json({ error: 'groupId e userId são obrigatórios.' });
  }

  const membership = await hasMembership(userId, groupId);
  const actorIsAdmin = await isGlobalAdmin(userId);
  if (!membership && !actorIsAdmin) {
    return response.status(403).json({ error: 'Entre no grupo para receber eventos.' });
  }

  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('Connection', 'keep-alive');
  response.flushHeaders();

  addClient(groupId, response);
  response.write(`event: connected\ndata: ${JSON.stringify({ groupId })}\n\n`);

  const heartbeat = setInterval(() => {
    response.write(': keep-alive\n\n');
  }, 25000);

  request.on('close', () => {
    clearInterval(heartbeat);
    removeClient(groupId, response);
    response.end();
  });

  return undefined;
});

router.get('/groups', async (request, response) => {
  const userId = parseId(request.query.userId);
  const joinedOnly = request.query.joinedOnly === 'true';

  const result = await query(
    `
      SELECT
        g.id,
        g.name,
        g.description,
        g.icon,
        EXISTS(
          SELECT 1
          FROM user_groups own_ug
          WHERE own_ug.group_id = g.id
            AND own_ug.user_id = $1
        ) AS joined,
        COUNT(DISTINCT ug.user_id)::int AS "memberCount",
        COUNT(DISTINCT ug.user_id) FILTER (WHERE usr.status = 'online')::int AS "onlineCount"
      FROM groups g
      LEFT JOIN user_groups ug ON ug.group_id = g.id
      LEFT JOIN users usr ON usr.id = ug.user_id
      WHERE ($2 = false OR EXISTS(
        SELECT 1
        FROM user_groups own_ug
        WHERE own_ug.group_id = g.id
          AND own_ug.user_id = $1
      ))
      GROUP BY g.id
      ORDER BY g.id
    `,
    [userId, joinedOnly],
  );

  return response.json(result.rows);
});

router.post('/groups/:id/join', async (request, response) => {
  const groupId = parseId(request.params.id);
  const userId = parseId(request.body.userId);

  if (!groupId || !userId) {
    return response.status(400).json({ error: 'groupId e userId são obrigatórios.' });
  }

  const user = await findUserById(userId);
  if (!user) {
    return response.status(404).json({ error: 'Usuário não encontrado.' });
  }

  const banned = await hasBan(userId, groupId);
  if (banned) {
    return response.status(403).json({ error: 'Você foi banido deste grupo.' });
  }

  const insertMembershipResult = await query(
    `
      INSERT INTO user_groups (user_id, group_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, group_id) DO NOTHING
      RETURNING user_id
    `,
    [userId, groupId, user.is_admin ? ROLE_ADMIN : ROLE_MEMBER],
  );

  if (insertMembershipResult.rows.length > 0) {
    await createSystemMessage(groupId, userId, `${user.name} entrou no grupo.`);
    publishGroupEvent(groupId, 'group-update', { type: 'member-joined', userId });
  }

  return response.status(201).json({ success: true });
});

router.delete('/groups/:id/leave', async (request, response) => {
  const groupId = parseId(request.params.id);
  const userId = parseId(request.query.userId || request.body?.userId);

  if (!groupId || !userId) {
    return response.status(400).json({ error: 'groupId e userId são obrigatórios.' });
  }

  const user = await findUserById(userId);
  const deleteResult = await query('DELETE FROM user_groups WHERE user_id = $1 AND group_id = $2', [userId, groupId]);

  if (deleteResult.rowCount > 0 && user) {
    await createSystemMessage(groupId, userId, `${user.name} saiu do grupo.`);
    publishGroupEvent(groupId, 'group-update', { type: 'member-left', userId });
  }

  return response.status(204).send();
});

router.delete('/groups/:groupId/messages/:messageId', async (request, response) => {
  const groupId = parseId(request.params.groupId);
  const messageId = parseId(request.params.messageId);
  const actorUserId = parseId(request.query.userId || request.body?.userId);

  if (!groupId || !messageId || !actorUserId) {
    return response.status(400).json({ error: 'groupId, messageId e userId são obrigatórios.' });
  }

  const actorMembership = await getMembership(actorUserId, groupId);
  const actorIsAdmin = await isGlobalAdmin(actorUserId);
  if (!actorMembership && !actorIsAdmin) {
    return response.status(403).json({ error: 'Somente membros do grupo podem moderar mensagens.' });
  }

  const messageResult = await query(
    `
      SELECT id, user_id AS "userId", is_system AS "isSystem"
      FROM group_messages
      WHERE id = $1 AND group_id = $2
      LIMIT 1
    `,
    [messageId, groupId],
  );

  const message = messageResult.rows[0];
  if (!message) {
    return response.status(404).json({ error: 'Mensagem não encontrada.' });
  }

  if (message.isSystem) {
    return response.status(403).json({ error: 'Mensagens de sistema não podem ser removidas.' });
  }

  const targetMembership = await getMembership(message.userId, groupId);
  const targetRole = targetMembership?.role ?? ROLE_MEMBER;

  if (actorUserId !== message.userId) {
    const actorRole = actorIsAdmin ? ROLE_ADMIN : actorMembership.role;

    if (!canActOnTarget(actorRole, targetRole)) {
      return response.status(403).json({ error: 'Sem permissão para apagar esta mensagem.' });
    }
  }

  if (targetRole === ROLE_ADMIN && !actorIsAdmin && actorUserId !== message.userId) {
    return response.status(403).json({ error: 'Sem permissão para apagar esta mensagem.' });
  }

  await query('DELETE FROM group_messages WHERE id = $1', [messageId]);
  publishGroupEvent(groupId, 'group-update', { type: 'message-deleted', messageId });
  return response.status(204).send();
});

router.post('/groups/:groupId/members/:targetUserId/mute', async (request, response) => {
  const groupId = parseId(request.params.groupId);
  const targetUserId = parseId(request.params.targetUserId);
  const actorUserId = parseId(request.body.userId);
  const durationMinutes = Number(request.body.durationMinutes || 10);

  if (!groupId || !targetUserId || !actorUserId) {
    return response.status(400).json({ error: 'groupId, targetUserId e userId são obrigatórios.' });
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return response.status(400).json({ error: 'durationMinutes inválido.' });
  }

  const actorMembership = await getMembership(actorUserId, groupId);
  const actorIsAdmin = await isGlobalAdmin(actorUserId);
  const targetMembership = await getMembership(targetUserId, groupId);

  if ((!actorMembership && !actorIsAdmin) || !targetMembership) {
    return response.status(404).json({ error: 'Membro não encontrado no grupo.' });
  }

  const actorRole = actorIsAdmin ? ROLE_ADMIN : actorMembership.role;
  if (!canActOnTarget(actorRole, targetMembership.role)) {
    return response.status(403).json({ error: 'Sem permissão para mutar este usuário.' });
  }

  const targetUser = await findUserById(targetUserId);
  if (targetUser?.is_admin && !actorIsAdmin) {
    return response.status(403).json({ error: 'Não é possível mutar um admin.' });
  }

  const actorUser = await findUserById(actorUserId);
  const mutedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

  await query(
    `
      UPDATE user_groups
      SET muted_until = $3
      WHERE group_id = $1 AND user_id = $2
    `,
    [groupId, targetUserId, mutedUntil],
  );

  await createSystemMessage(
    groupId,
    actorUserId,
    `${targetUser?.name || 'Usuário'} foi mutado por ${actorUser?.name || 'moderação'} por ${durationMinutes} minuto(s).`,
  );

  publishGroupEvent(groupId, 'group-update', { type: 'member-muted', targetUserId });

  return response.status(200).json({ success: true, mutedUntil });
});

router.post('/groups/:groupId/members/:targetUserId/ban', async (request, response) => {
  const groupId = parseId(request.params.groupId);
  const targetUserId = parseId(request.params.targetUserId);
  const actorUserId = parseId(request.body.userId);
  const reason = request.body.reason?.trim() || null;

  if (!groupId || !targetUserId || !actorUserId) {
    return response.status(400).json({ error: 'groupId, targetUserId e userId são obrigatórios.' });
  }

  const actorMembership = await getMembership(actorUserId, groupId);
  const actorIsAdmin = await isGlobalAdmin(actorUserId);
  const targetMembership = await getMembership(targetUserId, groupId);

  if ((!actorMembership && !actorIsAdmin) || !targetMembership) {
    return response.status(404).json({ error: 'Membro não encontrado no grupo.' });
  }

  const actorRole = actorIsAdmin ? ROLE_ADMIN : actorMembership.role;
  if (!canActOnTarget(actorRole, targetMembership.role)) {
    return response.status(403).json({ error: 'Sem permissão para banir este usuário.' });
  }

  const targetUser = await findUserById(targetUserId);
  if (targetUser?.is_admin && !actorIsAdmin) {
    return response.status(403).json({ error: 'Não é possível banir um admin.' });
  }

  const actorUser = await findUserById(actorUserId);

  await query(
    `
      INSERT INTO group_bans (group_id, user_id, banned_by, reason)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (group_id, user_id) DO UPDATE
      SET banned_by = EXCLUDED.banned_by,
          reason = EXCLUDED.reason,
          banned_at = CURRENT_TIMESTAMP
    `,
    [groupId, targetUserId, actorUserId, reason],
  );

  await query(
    'DELETE FROM user_groups WHERE group_id = $1 AND user_id = $2',
    [groupId, targetUserId],
  );

  await createSystemMessage(
    groupId,
    actorUserId,
    `${targetUser?.name || 'Usuário'} foi banido por ${actorUser?.name || 'moderação'}.`,
  );

  publishGroupEvent(groupId, 'group-update', { type: 'member-banned', targetUserId });

  return response.status(200).json({ success: true });
});

router.post('/groups/:groupId/members/:targetUserId/expel', async (request, response) => {
  const groupId = parseId(request.params.groupId);
  const targetUserId = parseId(request.params.targetUserId);
  const actorUserId = parseId(request.body.userId);

  if (!groupId || !targetUserId || !actorUserId) {
    return response.status(400).json({ error: 'groupId, targetUserId e userId são obrigatórios.' });
  }

  const actorMembership = await getMembership(actorUserId, groupId);
  const actorIsAdmin = await isGlobalAdmin(actorUserId);
  const targetMembership = await getMembership(targetUserId, groupId);

  if ((!actorMembership && !actorIsAdmin) || !targetMembership) {
    return response.status(404).json({ error: 'Membro não encontrado no grupo.' });
  }

  const actorRole = actorIsAdmin ? ROLE_ADMIN : actorMembership.role;
  if (!canActOnTarget(actorRole, targetMembership.role)) {
    return response.status(403).json({ error: 'Sem permissão para expulsar este usuário.' });
  }

  const targetUser = await findUserById(targetUserId);
  if (targetUser?.is_admin && !actorIsAdmin) {
    return response.status(403).json({ error: 'Não é possível expulsar um admin.' });
  }

  const actorUser = await findUserById(actorUserId);

  await query(
    'DELETE FROM user_groups WHERE group_id = $1 AND user_id = $2',
    [groupId, targetUserId],
  );

  await createSystemMessage(
    groupId,
    actorUserId,
    `${targetUser?.name || 'Usuário'} foi expulso por ${actorUser?.name || 'moderação'}.`,
  );

  publishGroupEvent(groupId, 'group-update', { type: 'member-expelled', targetUserId });

  return response.status(200).json({ success: true });
});

router.patch('/groups/:groupId/members/:targetUserId/role', async (request, response) => {
  const groupId = parseId(request.params.groupId);
  const targetUserId = parseId(request.params.targetUserId);
  const actorUserId = parseId(request.body.userId);
  const nextRole = Number(request.body.role);

  if (!groupId || !targetUserId || !actorUserId || !isValidRole(nextRole)) {
    return response.status(400).json({ error: 'groupId, targetUserId, userId e role válidos são obrigatórios.' });
  }

  const actorMembership = await getMembership(actorUserId, groupId);
  const actorIsAdmin = await isGlobalAdmin(actorUserId);
  const targetMembership = await getMembership(targetUserId, groupId);

  if ((!actorMembership && !actorIsAdmin) || !targetMembership) {
    return response.status(404).json({ error: 'Membro não encontrado no grupo.' });
  }

  if (!actorIsAdmin) {
    return response.status(403).json({ error: 'Somente admins podem alterar cargos.' });
  }

  const targetUser = await findUserById(targetUserId);

  if (targetUser?.is_admin && nextRole !== ROLE_ADMIN) {
    return response.status(403).json({ error: 'Não é possível mudar admin para mod/membro por aqui.' });
  }

  if (nextRole === ROLE_ADMIN) {
    await query('UPDATE users SET is_admin = true WHERE id = $1', [targetUserId]);
  } else {
    await query('UPDATE users SET is_admin = false WHERE id = $1', [targetUserId]);
    await query(
      `
        UPDATE user_groups
        SET role = $3
        WHERE group_id = $1 AND user_id = $2
      `,
      [groupId, targetUserId, nextRole],
    );
  }

  const actorUser = await findUserById(actorUserId);

  await createSystemMessage(
    groupId,
    actorUserId,
    `${actorUser?.name || 'Admin'} alterou o cargo de ${targetUser?.name || 'usuário'} para ${roleLabel(nextRole)}.`,
  );

  publishGroupEvent(groupId, 'group-update', { type: 'role-updated', targetUserId });

  return response.status(200).json({ success: true });
});

router.patch('/groups/:groupId', async (request, response) => {
  const groupId = parseId(request.params.groupId);
  const actorUserId = parseId(request.body.userId);
  const name = request.body.name?.trim();
  const description = request.body.description?.trim();

  if (!groupId || !actorUserId) {
    return response.status(400).json({ error: 'groupId e userId são obrigatórios.' });
  }

  if (!name || !description) {
    return response.status(400).json({ error: 'Nome e descrição são obrigatórios.' });
  }

  const actorMembership = await getMembership(actorUserId, groupId);
  const actorIsAdmin = await isGlobalAdmin(actorUserId);
  if (!actorIsAdmin && (!actorMembership || actorMembership.role !== ROLE_ADMIN)) {
    return response.status(403).json({ error: 'Somente admins podem editar o grupo.' });
  }

  const result = await query(
    `
      UPDATE groups
      SET name = $2,
          description = $3
      WHERE id = $1
      RETURNING id, name, description, icon
    `,
    [groupId, name, description],
  );

  if (result.rows.length === 0) {
    return response.status(404).json({ error: 'Grupo não encontrado.' });
  }

  const actorUser = await findUserById(actorUserId);
  await createSystemMessage(groupId, actorUserId, `${actorUser?.name || 'Admin'} atualizou os dados do grupo.`);
  publishGroupEvent(groupId, 'group-update', { type: 'group-edited' });

  return response.json(result.rows[0]);
});

router.get('/groups/:id/messages', async (request, response) => {
  const groupId = parseId(request.params.id);
  const userId = parseId(request.query.userId);

  if (!groupId || !userId) {
    return response.status(400).json({ error: 'groupId e userId são obrigatórios.' });
  }

  const membership = await hasMembership(userId, groupId);
  const actorIsAdmin = await isGlobalAdmin(userId);
  if (!membership && !actorIsAdmin) {
    return response.status(403).json({ error: 'Entre no grupo para acessar as mensagens.' });
  }

  const result = await query(
    `
      SELECT
        msg.id,
        msg.content,
        msg.is_system AS "isSystem",
        msg.created_at AS "createdAt",
        usr.id AS "userId",
        usr.name AS "userName",
        usr.avatar,
        usr.avatar_color AS "avatarColor",
        usr.bubble_color AS "bubbleColor",
        CASE
          WHEN usr.is_admin = true THEN 2
          ELSE COALESCE(ug_author.role, 0)
        END AS "userRole",
        usr.is_admin AS "isAdmin",
        (usr.id = $2) AS "isOwnMessage"
      FROM group_messages msg
      INNER JOIN users usr ON usr.id = msg.user_id
      LEFT JOIN user_groups ug_author
        ON ug_author.group_id = msg.group_id
       AND ug_author.user_id = msg.user_id
      WHERE msg.group_id = $1
      ORDER BY msg.created_at ASC, msg.id ASC
    `,
    [groupId, userId],
  );

  return response.json(result.rows);
});

router.get('/members/:groupId', async (request, response) => {
  const groupId = parseId(request.params.groupId);
  const userId = parseId(request.query.userId);

  if (!groupId || !userId) {
    return response.status(400).json({ error: 'groupId e userId são obrigatórios.' });
  }

  const membership = await hasMembership(userId, groupId);
  const actorIsAdmin = await isGlobalAdmin(userId);
  if (!membership && !actorIsAdmin) {
    return response.status(403).json({ error: 'Entre no grupo para acessar os membros.' });
  }

  const result = await query(
    `
      SELECT usr.id, usr.name, usr.status, usr.avatar
      , usr.avatar_color AS "avatarColor"
      , usr.bubble_color AS "bubbleColor"
      , CASE WHEN usr.is_admin = true THEN 2 ELSE ug.role END AS role
      , usr.is_admin AS "isAdmin"
      , ug.muted_until AS "mutedUntil"
      FROM user_groups ug
      INNER JOIN users usr ON usr.id = ug.user_id
      WHERE ug.group_id = $1
      ORDER BY
        CASE WHEN usr.id = $2 THEN 0 ELSE 1 END,
        CASE WHEN usr.status = 'online' THEN 0 ELSE 1 END,
        usr.name ASC
    `,
    [groupId, userId],
  );

  return response.json(result.rows);
});

router.post('/messages', async (request, response) => {
  const groupId = parseId(request.body.groupId);
  const userId = parseId(request.body.userId);
  const content = request.body.content?.trim();

  if (!groupId || !userId || !content) {
    return response.status(400).json({ error: 'groupId, userId e content são obrigatórios.' });
  }

  const membership = await hasMembership(userId, groupId);
  if (!membership) {
    return response.status(403).json({ error: 'Entre no grupo antes de enviar mensagens.' });
  }

  const userMembership = await getMembership(userId, groupId);
  if (userMembership?.mutedUntil && new Date(userMembership.mutedUntil).getTime() > Date.now()) {
    return response.status(403).json({ error: 'Você está mutado neste grupo e não pode enviar mensagens.' });
  }

  const result = await query(
    `
      INSERT INTO group_messages (group_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, content, created_at AS "createdAt"
    `,
    [groupId, userId, content],
  );

  const user = await findUserById(userId);
  const payload = {
    ...result.rows[0],
    isSystem: false,
    userId: user.id,
    userName: user.name,
    avatar: user.avatar,
    avatarColor: user.avatar_color,
    bubbleColor: user.bubble_color,
    userRole: user.is_admin ? ROLE_ADMIN : userMembership?.role ?? ROLE_MEMBER,
    isOwnMessage: true,
  };

  publishGroupEvent(groupId, 'group-update', { type: 'message-created', messageId: payload.id });

  return response.status(201).json(payload);
});

module.exports = router;

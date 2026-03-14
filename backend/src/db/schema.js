const { query } = require('../db');
const { DEFAULT_USER_AVATAR, DEFAULT_GROUP_ICON } = require('../constants');
const { ensurePublicIds } = require('../services/users');

async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '${DEFAULT_GROUP_ICON}'
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      public_id VARCHAR(20) UNIQUE,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(160) NOT NULL UNIQUE,
      password VARCHAR(160) NOT NULL,
      avatar TEXT NOT NULL DEFAULT '${DEFAULT_USER_AVATAR}',
      avatar_color VARCHAR(7) NOT NULL DEFAULT '#5FC9DE',
      bubble_color VARCHAR(7) NOT NULL DEFAULT '#5C91E8',
      is_admin BOOLEAN NOT NULL DEFAULT false,
      status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(7) NOT NULL DEFAULT '#5FC9DE'
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS public_id VARCHAR(20)
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS bubble_color VARCHAR(7) NOT NULL DEFAULT '#5C91E8'
  `);

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS user_groups (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      role SMALLINT NOT NULL DEFAULT 0 CHECK (role IN (0, 1, 2)),
      muted_until TIMESTAMP NULL,
      joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, group_id)
    )
  `);

  await query(`
    ALTER TABLE user_groups
    ADD COLUMN IF NOT EXISTS role SMALLINT NOT NULL DEFAULT 0 CHECK (role IN (0, 1, 2))
  `);

  await query(`
    ALTER TABLE user_groups
    ADD COLUMN IF NOT EXISTS muted_until TIMESTAMP NULL
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS group_bans (
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      banned_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NULL,
      banned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (group_id, user_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS group_messages (
      id SERIAL PRIMARY KEY,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      is_system BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    ALTER TABLE group_messages
    ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false
  `);

  await ensurePublicIds();

  await query(
    `
      INSERT INTO groups (id, name, description, icon)
      VALUES
        (1, 'Hangar', 'Discussao principal do grupo', $1),
        (2, 'Pilotos', 'Canal para combinados da equipe de voo', $1),
        (3, 'Torre', 'Avisos rapidos da operacao', $1),
        (4, 'Meteorologia', 'Condicoes do tempo e previsoes', $1),
        (5, 'Manutencao', 'Demandas tecnicas e suporte', $1)
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          icon = EXCLUDED.icon
    `,
    [DEFAULT_GROUP_ICON],
  );

  await query(`
    SELECT setval(
      pg_get_serial_sequence('groups', 'id'),
      GREATEST(COALESCE((SELECT MAX(id) FROM groups), 1), 1),
      true
    )
  `);
}

module.exports = {
  ensureSchema,
};

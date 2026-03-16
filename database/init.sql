CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '/src/assets/img/icon_group.png'
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  public_id VARCHAR(20) UNIQUE,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password VARCHAR(160) NOT NULL,
  avatar TEXT NOT NULL DEFAULT '/src/assets/img/icon_user1.png',
  avatar_color VARCHAR(7) NOT NULL DEFAULT '#5FC9DE',
  bubble_color VARCHAR(7) NOT NULL DEFAULT '#5C91E8',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(7) NOT NULL DEFAULT '#5FC9DE';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS bubble_color VARCHAR(7) NOT NULL DEFAULT '#5C91E8';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS public_id VARCHAR(20);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS user_groups (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  role SMALLINT NOT NULL DEFAULT 0 CHECK (role IN (0, 1, 2)),
  muted_until TIMESTAMP NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, group_id)
);

ALTER TABLE user_groups
ADD COLUMN IF NOT EXISTS role SMALLINT NOT NULL DEFAULT 0 CHECK (role IN (0, 1, 2));

ALTER TABLE user_groups
ADD COLUMN IF NOT EXISTS muted_until TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS group_bans (
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  banned_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NULL,
  banned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_messages (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE group_messages
ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

INSERT INTO groups (id, name, description, icon)
VALUES
  (1, 'Odeio acordar cedo', 'Pra quem negocia com o despertador todo santo dia.', '/src/assets/img/icon_group.png'),
  (2, 'Abro a geladeira pra pensar', 'Você não está com fome, só em busca de respostas.', '/src/assets/img/icon_group.png'),
  (3, 'Queria sorvete mas era feijão', 'Grupo de apoio para todas as decepções culinárias.', '/src/assets/img/icon_group.png'),
  (4, 'Eu só vim pelo bolo', 'Presença confirmada em qualquer evento com comida grátis.', '/src/assets/img/icon_group.png'),
  (5, 'Tenho preguiça até de ter preguiça', 'Nível máximo de cansaço com zero esforço envolvido.', '/src/assets/img/icon_group.png'),
  (6, 'Não sou antissocial, só sem bateria social', 'Hoje não, pessoal. Talvez amanhã. Ou semana que vem.', '/src/assets/img/icon_group.png')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon;

SELECT setval('groups_id_seq', (SELECT MAX(id) FROM groups));

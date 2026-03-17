# AeroChat

Web app de chat em grupos com autenticação, perfil de usuário e mensagens em tempo real.

## O que é o app

O AeroChat é uma aplicação full stack onde o usuário pode:

- criar conta e fazer login
- entrar e sair de grupos
- enviar mensagens no chat
- editar informações do perfil
- usar recursos de moderação (de acordo com permissão)

## Linguagens e tecnologias

- JavaScript (frontend e backend)
- React 19 + Vite + Axios (frontend)
- Node.js + Express + pg (backend)
- PostgreSQL (banco de dados)
- Docker Compose (ambiente local recomendado)

## Estrutura do projeto

```text
frontend/   # interface React
backend/    # API Express
database/   # SQL inicial
```

## Requisitos

### Com Docker

- Docker Desktop
- Docker Compose (comando docker compose)

### Sem Docker

- Node.js 20+
- npm 10+
- PostgreSQL 16+

## Como rodar com Docker (recomendado)

1. Na raiz do projeto, execute:

```bash
docker compose up --build
```

2. Acesse:

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Banco: localhost:5432

3. Para parar:

```bash
docker compose down
```

## Como rodar sem Docker

1. Inicie o PostgreSQL e crie o banco aerochat.

2. Backend:

```bash
cd backend
npm install
npm run dev
```

3. Frontend (novo terminal):

```bash
cd frontend
npm install
npm run dev
```

4. Acesse no navegador:

- Frontend: http://localhost:5173

## Rotas (resumo)

- Auth: /auth/login, /auth/register
- Grupos e mensagens: /groups, /members/:groupId, /messages

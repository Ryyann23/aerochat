# AeroChat

Aplicacao de chat em grupos com frontend React, API em Node.js/Express, PostgreSQL e arquitetura simples em microservicos com Docker Compose.

## Estrutura

```text
frontend/
backend/
database/
docker-compose.yml
README.md
```

## Servicos

- frontend: interface React com Vite e Axios
- backend: API Express com rotas de grupos, membros e mensagens
- db: PostgreSQL com carga inicial de dados

## Rotas da API

- GET /groups
- GET /groups/:id/messages
- GET /members/:groupId
- POST /messages

Exemplo de payload para envio de mensagem:

```json
{
  "groupId": 1,
  "userId": 1,
  "content": "Mensagem de teste"
}
```

## Como rodar com Docker

Requisitos:

- Docker
- Docker Compose com o comando `docker compose`

Suba os servicos na raiz do projeto:

```bash
docker compose up --build
```

A aplicacao ficara disponivel em:

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- PostgreSQL: localhost:5432

## Observacoes

- O layout segue a referencia visual enviada, com tres colunas e painel central de chat.
- Os assets de avatar e grupo estao em frontend/src/assets/img.
- O banco sobe com grupos, membros e mensagens iniciais para a tela carregar pronta.

const app = require('./app');
const { waitForDatabase } = require('./db');
const { ensureSchema } = require('./db/schema');

const PORT = Number(process.env.PORT || 3001);

async function start() {
  await waitForDatabase();
  await ensureSchema();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AeroChat API escutando na porta ${PORT}`);
  });
}

start().catch((error) => {
  console.error('Falha ao iniciar a API', error);
  process.exit(1);
});

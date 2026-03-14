const groupClients = new Map();

function addClient(groupId, response) {
  if (!groupClients.has(groupId)) {
    groupClients.set(groupId, new Set());
  }

  groupClients.get(groupId).add(response);
}

function removeClient(groupId, response) {
  const clients = groupClients.get(groupId);
  if (!clients) {
    return;
  }

  clients.delete(response);

  if (clients.size === 0) {
    groupClients.delete(groupId);
  }
}

function publishGroupEvent(groupId, event, payload = {}) {
  const clients = groupClients.get(groupId);
  if (!clients || clients.size === 0) {
    return;
  }

  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

  for (const client of clients) {
    client.write(message);
  }
}

module.exports = {
  addClient,
  removeClient,
  publishGroupEvent,
};

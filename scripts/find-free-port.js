/**
 * Finds a free port on the current machine.
 * Uses a temporary server bound to port 0 so the OS assigns a free port.
 * @returns {Promise<number>} A free port number.
 */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const server = net.createServer(() => {});
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

/**
 * Finds multiple free ports without overlap.
 * @param {number} count
 * @returns {Promise<number[]>}
 */
async function findFreePorts(count) {
  const ports = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    let port;
    for (let attempt = 0; attempt < 10; attempt++) {
      port = await findFreePort();
      if (!used.has(port)) break;
    }
    if (used.has(port)) throw new Error(`Could not find ${count} free ports`);
    used.add(port);
    ports.push(port);
  }
  return ports;
}

if (require.main === module) {
  findFreePorts(Number(process.argv[2]) || 1)
    .then((p) => console.log(p.join('\n')))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
} else {
  module.exports = { findFreePort, findFreePorts };
}

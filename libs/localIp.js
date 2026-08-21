const os = require('os');

function address() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    const entries = interfaces[name] || [];
    for (const entry of entries) {
      if (entry && !entry.internal && (entry.family === 'IPv4' || entry.family === 4)) {
        return entry.address;
      }
    }
  }

  return '127.0.0.1';
}

module.exports = {
  address,
};

const HashMap = require('hashmap');

const CustomObject = require(`${__dirname}/CustomObject.js`);

class ConnectionsPool extends CustomObject {
  constructor(application) {
    super(application, 'ConnectionsPool');

    this.hash = new HashMap();
  }

  getEntries() {
    return this.hash;
  }

  get(name) {
    return this.getEntries().get(name);
  }

  set(name, value) {
    return this.getEntries().set(name, value);
  }

  stop() {
    this.hash.forEach((value) => {
      if (value && typeof value.close === 'function') {
        try {
          value.close();
        } catch {
          // already closed
        }
      }
    });
    this.hash.clear();
  }
}

module.exports = ConnectionsPool;

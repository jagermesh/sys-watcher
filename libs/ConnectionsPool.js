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
}

module.exports = ConnectionsPool;
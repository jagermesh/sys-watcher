const CustomLoggable = require(`${__dirname}/CustomLoggable.js`);

class CustomCache extends CustomLoggable {
  constructor(application, name, config) {
    super(application, name, config);

    this.instance = null;
  }

  check() {
    return Promise.resolve();
  }

  get(name, callback) {
    callback(null);
  }

  set() {

  }
}

module.exports = CustomCache;
const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

class AppEventsWatcher extends CustomWatcher {
  constructor(application, name, config, owner) {
    super(application, name, config, owner);
  }
}

module.exports = AppEventsWatcher;
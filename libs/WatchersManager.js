const CustomManager = require(`${__dirname}/CustomManager.js`);

class WatchersManager extends CustomManager {
  constructor(application, config) {
    super(application, 'WatchersManager', config, application, 'components/watcher');
  }
}

module.exports = WatchersManager;
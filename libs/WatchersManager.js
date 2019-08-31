const CustomManager = require(__dirname + '/../libs/CustomManager.js');

function WatchersManager(application, config) {

  CustomManager.call(this, application, 'WatchersManager', config, application, 'components/watcher');

}

module.exports = WatchersManager;

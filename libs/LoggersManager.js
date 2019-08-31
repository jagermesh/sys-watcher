const CustomManager = require(__dirname + '/CustomManager.js');

function LoggersManager(application, config) {

  CustomManager.call(this, application, 'LoggersManager', config, application, 'components/logger');

}

module.exports = LoggersManager;

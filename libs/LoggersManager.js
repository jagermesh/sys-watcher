const CustomManager = require(__dirname + '/../libs/CustomManager.js');

function LoggersManager(application, config) {

  CustomManager.call(this, application, 'LoggersManager', config, application, 'components/logger');

}

module.exports = LoggersManager;

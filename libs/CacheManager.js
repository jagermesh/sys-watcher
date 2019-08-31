const CustomManager = require(__dirname + '/../libs/CustomManager.js');

function CacheManager(application, config) {

  CustomManager.call(this, application, 'CacheManager', config, application, 'components/cache');

}

module.exports = CacheManager;

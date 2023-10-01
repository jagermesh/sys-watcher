const CustomManager = require(`${__dirname}/CustomManager.js`);

class CacheManager extends CustomManager {
  constructor(application, config) {
    super(application, 'CacheManager', config, application, 'components/cache');
  }
}

module.exports = CacheManager;
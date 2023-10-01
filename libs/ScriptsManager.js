const CustomManager = require(`${__dirname}/CustomManager.js`);

class ScriptsManager extends CustomManager {
  constructor(application, config) {
    super(application, 'ScriptsManager', config, application, 'components/script');
  }
}

module.exports = ScriptsManager;
const CustomManager = require(`${__dirname}/CustomManager.js`);

function ScriptsManager(application, config) {
  CustomManager.call(this, application, 'ScriptsManager', config, application, 'components/script');
}

module.exports = ScriptsManager;
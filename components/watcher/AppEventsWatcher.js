const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

function AppEventsWatcher(application, name, config, owner) {
  CustomWatcher.call(this, application, name, config, owner);
}

module.exports = AppEventsWatcher;
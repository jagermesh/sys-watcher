const CustomWatcher = require(__dirname + '/../../libs/CustomWatcher.js');

function AppEventsWatcher(application, name, config, owner) {

  CustomWatcher.call(this, application, name, config, owner);

  const _this = this;

}

module.exports = AppEventsWatcher;

const si = require('systeminformation');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

function CPUWatcher(application, name, config) {
  CustomWatcher.call(this, application, name, config);

  const _this = this;

  _this.config.settings = Object.assign({
    threshold: 0,
  }, _this.config.settings);

  _this.watch = function() {
    si.currentLoad().then(function(stats) {
      if (stats.currentload > _this.config.settings.threshold) {
        let message = `CPU Load ${stats.currentload.toFixed()}%`;

        if (_this.config.settings.threshold > 0) {
          message += ' which is more than threshold ' + _this.config.settings.threshold;
        }

        _this.getApplication().notify(_this.getLoggers(), {
          message: message,
          value: stats.currentload,
          units: 'Percent',
          dimensions: Object.create({}),
          skipConsole: (_this.config.settings.threshold == 0)
        }, Object.create({}), _this);
      }
    }).catch(function(error) {
      _this.getApplication().notify(_this.getLoggers(), {
        message: 'Can not retrive CPU information: ' + error.toString(),
        isError: true
      }, Object.create({}), _this);
    });
  };
}

module.exports = CPUWatcher;
const bytes = require('bytes');
const memory = require('free-memory');
const si = require('systeminformation');

const CustomWatcher = require(__dirname + '/../../libs/CustomWatcher.js');

function FreeRAMWatcher(application, name, config) {

  CustomWatcher.call(this, application, name, config);

  const _this = this;

  _this.config.settings.threshold      = _this.config.settings.threshold || '0 b';
  _this.config.settings.thresholdBytes = bytes.parse(_this.config.settings.threshold);

  _this.watch = function() {

    si.mem().then(function(stats) {
      let usable = stats.available;
      if ((_this.config.settings.thresholdBytes == 0) || (usable < _this.config.settings.thresholdBytes)) {
        let message = 'Free RAM is ' + bytes(usable);
        if (_this.config.settings.thresholdBytes > 0) {
          message += ' which is less than threshold ' + _this.config.settings.threshold;
        }
        _this.getApplication().notify(_this.getLoggers(), { message: message, value: usable, units: 'Bytes', dimensions: Object.create({ }) }, Object.create({ }), _this);
      }
    }).catch(function(error) {
      _this.getApplication().notify(_this.getLoggers(), { message: 'Can not retrive RAM information: ' + error.toString(), isError: true }, Object.create({ }), _this);
    });

  };

}

module.exports = FreeRAMWatcher;

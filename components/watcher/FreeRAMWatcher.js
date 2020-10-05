const bytes  = require('bytes');
const memory = require('free-memory');
const si     = require('systeminformation');
const uuid   = require('uuid');

const CustomWatcher = require(__dirname + '/../../libs/CustomWatcher.js');

function FreeRAMWatcher(application, name, config) {

  CustomWatcher.call(this, application, name, config);

  const _this = this;

  _this.config.settings.threshold      = _this.config.settings.threshold || '0 b';
  _this.config.settings.thresholdBytes = bytes.parse(_this.config.settings.threshold);

  _this.watch = function() {

    si.mem().then(function(stats) {
      let usable = stats.available;
      let total  = stats.total;
      if ((_this.config.settings.thresholdBytes == 0) || (usable < _this.config.settings.thresholdBytes)) {
        let usableBytes = bytes(usable);
        let totalBytes  = bytes(total);
        let percent     = (usable * 100 / total).toFixed();

        let message = `Free RAM ${usableBytes} out of ${totalBytes}`;
        if (_this.config.settings.thresholdBytes > 0) {
          message += ' which is less than threshold ' + _this.config.settings.threshold;
        }

        _this.getApplication().notify(_this.getLoggers(), { message: message, value: usable, units: 'Bytes', dimensions: Object.create({ }), skipConsole: (_this.config.settings.thresholdBytes == 0) }, Object.create({ }), _this);
      }
    }).catch(function(error) {
      _this.getApplication().notify(_this.getLoggers(), { message: 'Can not retrive RAM information: ' + error.toString(), isError: true }, Object.create({ }), _this);
    });

  };

}

module.exports = FreeRAMWatcher;

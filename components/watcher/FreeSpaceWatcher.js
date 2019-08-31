const diskusage = require('diskusage');
const bytes = require('bytes');

const CustomWatcher = require(__dirname + '/../libs/CustomWatcher.js');

function FreeSpaceWatcher(application, name, config) {

  CustomWatcher.call(this, application, name, config);

  const _this = this;

  _this.config.settings.threshold      = _this.config.settings.threshold || '0 b';
  _this.config.settings.thresholdBytes = bytes.parse(_this.config.settings.threshold);

  function watchPath(path) {

    let details = { Path: path };

    diskusage.check(path, function(error, stats) {
      if (error) {
        _this.getApplication().notify(_this.getLoggers(), { message: error.toString(), isError: true }, details, _this);
      } else {
        if ((_this.config.settings.thresholdBytes == 0) || (stats.free < _this.config.settings.thresholdBytes)) {
          let message = 'Free space is ' + bytes(stats.free);
          if (_this.config.settings.thresholdBytes > 0) {
            message += ' which is less than threshold ' + bytes(_this.config.settings.thresholdBytes);
          }
          _this.getApplication().notify(_this.getLoggers(), { message: message, value: stats.free, units: 'Bytes', dimensions: { Path: path } }, details, _this);
        }
      }
    });

  }

  _this.watch = function() {

    let paths = _this.getArrayValue(_this.config.settings.path);
    for(let i = 0; i < paths.length; i++) {
      watchPath(paths[i]);
    }

  };

}

module.exports = FreeSpaceWatcher;

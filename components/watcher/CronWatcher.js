const path = require('path');

const CustomWatcher = require(__dirname + '/../libs/CustomWatcher.js');

function CronWatcher(application, name, config) {

  CustomWatcher.call(this, application, name, config);

  const _this = this;

  _this.watch = function() {

    if (_this.config.settings) {
      if (_this.config.settings.job) {
        return _this.config.settings.job.call(_this);
      }
      if (_this.config.settings.cmd) {
        let cmd = typeof _this.config.settings.cmd == 'function' ? _this.config.settings.cmd.call(_this) : _this.config.settings.cmd;
        let cwd = _this.config.settings.cwd || path.dirname(__dirname);
        let details = { Cmd: cmd };

        return _this.getApplication().getExecPool().exec(cmd, cwd, _this.config.settings.cmdGroup).then(function(stdout) {
          _this.getApplication().notify(_this.getLoggers(), { message: stdout }, details, _this);
        }).catch(function(stdout) {
            _this.getApplication().notify(_this.getLoggers(), { message: stdout, isError: true }, details, _this);
        });
      }
    }
  };

}

module.exports = CronWatcher;

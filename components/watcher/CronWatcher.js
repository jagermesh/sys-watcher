const path = require('path');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

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
        let cwd = _this.config.settings.cwd || process.cwd();
        let cmdGroup = _this.config.settings.cmdGroup;

        let details = {
          Cmd: cmd,
          Cwd: cwd,
          CmdGroup: cmdGroup
        };

        return _this.getApplication().getExecPool().exec(cmd, cwd, cmdGroup).then(function(stdout) {
          _this.getApplication().notify(_this.getLoggers(), {
            message: stdout
          }, details, _this);
        }).catch(function(stdout) {
          _this.getApplication().notify(_this.getErrorLoggers(), {
            message: stdout,
            isError: true
          }, details, _this);
          throw new Error(stdout);
        });
      }
    }
  };
}

module.exports = CronWatcher;
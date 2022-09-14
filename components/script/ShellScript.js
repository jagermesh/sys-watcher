const CustomScript = require(`${__dirname}/../../libs/CustomScript.js`);

function ShellScript(application, name, config) {
  CustomScript.call(this, application, name, config);

  const _this = this;

  _this.exec = function() {
    let cmd = _this.config.settings.cmd;
    let cwd = _this.config.settings.cwd || process.cwd();
    let cmdGroup = _this.config.settings.cmdGroup;

    let details = {
      Cmd: cmd,
      Cwd: cwd,
      CmdGroup: cmdGroup
    };

    return _this.getApplication().getExecPool().exec(cmd, cwd, cmdGroup, _this).then(function(result) {
      let stdout = result.stdout;
      if (!_this.getApplication().isToolMode()) {
        _this.getApplication().notify(_this.getLoggers(), {
          message: stdout
        }, details, _this);
      }
    }).catch(function(result) {
      let stdout = result.stdout;
      if (!_this.getApplication().isToolMode()) {
        _this.getApplication().notify(_this.getLoggers(), {
          message: stdout,
          isError: true
        }, details, _this);
      }
    });
  };
}

module.exports = ShellScript;
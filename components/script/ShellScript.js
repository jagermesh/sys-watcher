const colors = require('colors');

const CustomScript = require(__dirname + '/../libs/CustomScript.js');

function ShellScript(application, name, config) {

  CustomScript.call(this, application, name, config);

  const _this = this;

  _this.exec = function () {

    let details = { Cmd: _this.config.settings.cmd };

    _this.getApplication().getConsole().log('Executing ' + colors.yellow(cmd), Object.create({ }), _this);

    return _this.getApplication().getExecPool().exec(_this.config.settings.cmd).then(function(stdout) {
      _this.getApplication().getConsole().log('Executed ' + colors.yellow(_this.config.settings.cmd), Object.create({ }), _this);
      _this.getApplication().notify(_this.getLoggers(), { message: stdout }, details, _this);
    }).catch(function(stdout) {
      _this.getApplication().getConsole().log('Execution failed ' + colors.red(_this.config.settings.cmd), Object.create({ }), _this);
      _this.getApplication().notify(_this.getLoggers(), { message: stdout, isError: true }, details, _this);
    });

  };

}

module.exports = ShellScript;

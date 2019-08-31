const colors = require('colors');
const path = require('path');

const CustomWatcher = require(__dirname + '/../libs/CustomWatcher.js');

function ConfigurationWatcher(application, name, config) {

  CustomWatcher.call(this, application, name, config);

  const _this = this;

  function watchRule(rule) {

    let cmd = rule.cmd;
    let cwd = rule.cwd = rule.cwd || path.dirname(__dirname);

    let details = Object.create(null);
    details.Cmd = cmd;
    details.Cwd = cwd;

    _this.getApplication().getExecPool().exec(cmd, cwd).then(function(stdout) {
      if (rule.check) {
        details.Check = rule.check;
        let r = new RegExp(rule.check);
        if (!r.test(stdout)) {
          _this.getApplication().notify(_this.getLoggers(), { message: 'Configuration check for ' + rule.check + ' failed:\n\n' + stdout }, details, _this);
        }
      }
    }).catch(function(stdout) {
        _this.getApplication().notify(_this.getLoggers(), { message: 'Configuration check for ' + cmd + ' failed:\n\n' + stdout }, details, _this);
    });

  }

  _this.watch = function() {

    for(let i = 0; i < _this.config.settings.rules.length; i++) {
      watchRule(_this.config.settings.rules[i]);
    }

  };

}

module.exports = ConfigurationWatcher;

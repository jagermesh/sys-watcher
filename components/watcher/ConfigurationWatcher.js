const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

function ConfigurationWatcher(application, name, config) {
  CustomWatcher.call(this, application, name, config);

  const _this = this;

  function watchRule(rule) {
    let cmd = rule.cmd;
    let cwd = rule.cwd = rule.cwd || process.cwd();
    let check = rule.check;

    let details = Object.create({});

    details.Cmd = cmd;
    details.Cwd = cwd;
    details.Check = check;

    _this.getApplication().getExecPool().exec(cmd, cwd).then(function(stdout) {
      if (check) {
        let r = new RegExp(check);
        if (!r.test(stdout)) {
          _this.getApplication().notify(_this.getLoggers(), {
            message: 'Configuration check ' + cmd + ' for ' + check + ' failed:\n\n<pre>' + stdout + '</pre>'
          }, details, _this);
        }
      }
    }).catch(function(stdout) {
      _this.getApplication().notify(_this.getLoggers(), {
        message: 'Configuration check ' + cmd + ' failed:\n\n<pre>' + stdout + '</pre>'
      }, details, _this);
    });
  }

  _this.watch = function() {
    for (let i = 0; i < _this.config.settings.rules.length; i++) {
      watchRule(_this.config.settings.rules[i]);
    }
  };
}

module.exports = ConfigurationWatcher;
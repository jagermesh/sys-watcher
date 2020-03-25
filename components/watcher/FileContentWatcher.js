const path = require('path');
const fs = require('fs');

const CustomWatcher = require(__dirname + '/../../libs/CustomWatcher.js');

function FileContentWatcher(application, name, config) {

  CustomWatcher.call(this, application, name, config);

  const _this = this;

  let filesCache = [];

  function watchFile(path, ruleConfig) {

    fs.stat(path, function(error, results) {
      let modificationTime;
      if (error) {
        _this.getApplication().notify(_this.getLoggers(), { message: error.toString(), isError: true}, { Path: path }, _this);
      } else {
        if (!filesCache[path]) {
          filesCache[path] = results.mtimeMs;
        }
        if (filesCache[path] != results.mtimeMs) {
          _this.getApplication().notify(_this.getLoggers(), { message: 'File modified ' + path }, Object.create({ }), _this);
          filesCache[path] = results.mtimeMs;
          if (ruleConfig.job) {
            return ruleConfig.job.call(_this);
          }
          if (ruleConfig.cmd) {
            let cmd = typeof ruleConfig.cmd == 'function' ? ruleConfig.cmd.call(_this) : ruleConfig.cmd;
            let cwd = ruleConfig.cwd || process.cwd();
            let cmdGroup = ruleConfig.cmdGroup;

            let details = { Cmd: cmd, Cwd: cwd, CmdGroup: cmdGroup };

            return _this.getApplication().getExecPool().exec(cmd, cwd, cmdGroup).then(function(stdout) {
              _this.getApplication().notify(_this.getLoggers(), { message: stdout }, details, _this);
            }).catch(function(stdout) {
              _this.getApplication().notify(_this.getLoggers(), { message: stdout, isError: true }, details, _this);
            });
          }
        }
      }
    });

  }

  function watchRule(ruleConfig) {

    let paths = ruleConfig.path;
    for(let i = 0; i < paths.length; i++) {
      watchFile(paths[i], ruleConfig);
    }

  }

  _this.watch = function() {

    if (_this.config.settings.rules) {
      for(let ruleName in _this.config.settings.rules) {
        let ruleConfig = _this.config.settings.rules[ruleName];
        watchRule(ruleConfig);
      }
    }

  };

}

module.exports = FileContentWatcher;

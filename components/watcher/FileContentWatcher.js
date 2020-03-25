const path = require('path');
const fs = require('fs');

const CustomWatcher = require(__dirname + '/../../libs/CustomWatcher.js');

function FileContentWatcher(application, name, config) {

  CustomWatcher.call(this, application, name, config);

  const _this = this;

  let filesCache = [];

  function watchFile(path) {

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
          if (_this.config.settings) {
            if (_this.config.settings.job) {
              return _this.config.settings.job.call(_this);
            }
            if (_this.config.settings.cmd) {
              let cmd = typeof _this.config.settings.cmd == 'function' ? _this.config.settings.cmd.call(_this) : _this.config.settings.cmd;
              let cwd = _this.config.settings.cwd || process.cwd();
              let cmdGroup = _this.config.settings.cmdGroup;

              let details = { Cmd: cmd, Cwd: cwd, CmdGroup: cmdGroup };

              return _this.getApplication().getExecPool().exec(cmd, cwd, cmdGroup).then(function(stdout) {
                _this.getApplication().notify(_this.getLoggers(), { message: stdout }, details, _this);
              }).catch(function(stdout) {
                _this.getApplication().notify(_this.getLoggers(), { message: stdout, isError: true }, details, _this);
              });
            }
          }
        }
      }
    });

  }

  _this.watch = function() {

    let paths = _this.getArrayValue(_this.config.settings.path);
    for(let i = 0; i < paths.length; i++) {
      watchFile(paths[i]);
    }

  };

}

module.exports = FileContentWatcher;

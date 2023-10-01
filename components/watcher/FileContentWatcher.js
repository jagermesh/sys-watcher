const fs = require('fs');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

class FileContentWatcher extends CustomWatcher {
  constructor(application, name, config) {
    super(application, name, config);

    this.filesCache = [];
  }

  watchFile(path, ruleConfig) {
    fs.stat(path, (error, results) => {
      if (error) {
        this.getApplication().notify(this.getLoggers(), {
          message: error.toString(),
          isError: true,
        }, {
          Path: path,
        }, this);
      } else {
        if (!this.filesCache[path]) {
          this.filesCache[path] = results.mtimeMs;
        }
        if (this.filesCache[path] != results.mtimeMs) {
          this.getApplication().notify(this.getLoggers(), {
            message: 'File modified ' + path,
          }, {}, this);
          this.filesCache[path] = results.mtimeMs;
          if (ruleConfig.job) {
            return ruleConfig.job.call(this);
          }
          if (ruleConfig.cmd) {
            let cmd = typeof ruleConfig.cmd == 'function' ? ruleConfig.cmd.call(this) : ruleConfig.cmd;
            let cwd = ruleConfig.cwd || process.cwd();
            let cmdGroup = ruleConfig.cmdGroup;

            let details = {
              Cmd: cmd,
              Cwd: cwd,
              CmdGroup: cmdGroup,
            };

            return this.getApplication().getExecPool().exec(cmd, cwd, cmdGroup).then((result) => {
              let stdout = result.stdout;
              this.getApplication().notify(this.getLoggers(), {
                message: stdout,
              }, details, this);
            }).catch((result) => {
              let stdout = result.stdout;
              this.getApplication().notify(this.getLoggers(), {
                message: stdout,
                isError: true,
              }, details, this);
            });
          }
        }
      }
    });
  }

  watchRule(ruleConfig) {
    let paths = ruleConfig.path;

    for (let i = 0; i < paths.length; i++) {
      this.watchFile(paths[i], ruleConfig);
    }
  }

  watch() {
    if (this.getConfig().settings.rules) {
      for (let ruleName in this.getConfig().settings.rules) {
        let ruleConfig = this.getConfig().settings.rules[ruleName];
        this.watchRule(ruleConfig);
      }
    }
  }
}

module.exports = FileContentWatcher;
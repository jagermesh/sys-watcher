const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

class CronWatcher extends CustomWatcher {
  constructor(application, name, config) {
    super(application, name, config);
  }

  watch() {
    if (this.getConfig().settings) {
      if (this.getConfig().settings.job) {
        return this.getConfig().settings.job.call(this);
      }
      if (this.getConfig().settings.cmd) {
        let cmd = typeof this.getConfig().settings.cmd == 'function' ? this.getConfig().settings.cmd.call(this) : this.getConfig().settings.cmd;
        let cwd = this.getConfig().settings.cwd || process.cwd();
        let cmdGroup = this.getConfig().settings.cmdGroup;

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
          this.getApplication().notify(this.getErrorLoggers(), {
            message: stdout,
            isError: true,
          }, details, this);
          throw new Error(stdout);
        });
      }
    }
  }
}

module.exports = CronWatcher;
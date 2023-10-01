const CustomScript = require(`${__dirname}/../../libs/CustomScript.js`);

class ShellScript extends CustomScript {
  constructor(application, name, config) {
    super(application, name, config);
  }

  exec() {
    let cmd = this.getConfig().settings.cmd;
    let cwd = this.getConfig().settings.cwd || process.cwd();
    let cmdGroup = this.getConfig().settings.cmdGroup;

    let details = {
      Cmd: cmd,
      Cwd: cwd,
      CmdGroup: cmdGroup,
    };

    return this.getApplication().getExecPool().exec(cmd, cwd, cmdGroup, this).then((result) => {
      let stdout = result.stdout;
      if (!this.getApplication().isToolMode()) {
        this.getApplication().notify(this.getLoggers(), {
          message: stdout,
        }, details, this);
      }
    }).catch((result) => {
      let stdout = result.stdout;
      if (!this.getApplication().isToolMode()) {
        this.getApplication().notify(this.getLoggers(), {
          message: stdout,
          isError: true,
        }, details, this);
      }
    });
  }
}

module.exports = ShellScript;
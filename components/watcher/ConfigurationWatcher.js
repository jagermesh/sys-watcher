const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

class ConfigurationWatcher extends CustomWatcher {
  constructor(application, name, config) {
    super(application, name, config);
  }

  watchRule(rule) {
    let cmd = rule.cmd;
    let cwd = rule.cwd = rule.cwd || process.cwd();
    let check = rule.check;

    let details = {};

    details.Cmd = cmd;
    details.Cwd = cwd;
    details.Check = check;

    this.getApplication().getExecPool().exec(cmd, cwd).then((result) => {
      let stdout = result.stdout;
      if (check) {
        let r = new RegExp(check);
        if (!r.test(stdout)) {
          this.getApplication().notify(this.getLoggers(), {
            message: `Configuration check ${cmd} for ${check} failed:\n\n<pre>${stdout}</pre>`,
          }, details, this);
        }
      }
    }).catch((result) => {
      let stdout = result.stdout;
      this.getApplication().notify(this.getLoggers(), {
        message: `Configuration check ${cmd} failed:\n\n<pre>${stdout}</pre>`,
      }, details, this);
    });
  }

  watch() {
    for (let i = 0; i < this.getConfig().settings.rules.length; i++) {
      this.watchRule(this.getConfig().settings.rules[i]);
    }
  }
}

module.exports = ConfigurationWatcher;
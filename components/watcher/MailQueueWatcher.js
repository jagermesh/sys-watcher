const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

class MailQueueWatcher extends CustomWatcher {
  constructor(application, name, config) {
    super(application, name, config);

    this.config.settings = Object.assign({
      threshold: 0,
    }, this.config.settings);
  }

  watch() {
    this.getApplication().getExecPool().exec('mailq').then((result) => {
      let stdout = result.stdout;
      let regexp = /([0-9]+) Requests/;
      let match = regexp.exec(stdout);
      let amount = 0;
      if (match) {
        amount = parseFloat(match[1]);
      }
      if ((this.getConfig().settings.threshold == 0) || (amount > this.getConfig().settings.threshold)) {
        let message = `Mail queue has ${amount} requests`;
        if (this.getConfig().settings.threshold > 0) {
          message += ` which is more than threshold ${this.getConfig().settings.threshold}`;
        }
        this.getApplication().notify(this.getLoggers(), {
          message: message,
          value: amount,
          units: 'Count',
          dimensions: {},
        }, {}, this);
      }
    }).catch((result) => {
      let stdout = result.stdout;
      this.getApplication().reportError(stdout, {}, this);
    });
  }
}

module.exports = MailQueueWatcher;
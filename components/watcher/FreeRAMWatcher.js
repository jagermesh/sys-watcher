const bytes = require('bytes');
const si = require('systeminformation');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

class FreeRAMWatcher extends CustomWatcher {
  constructor(application, name, config) {
    super(application, name, config);

    this.config.settings = Object.assign({
      threshold: '0 b',
    }, this.config.settings);

    this.config.settings.thresholdBytes = bytes.parse(this.config.settings.threshold);
  }

  watch() {
    si.mem().then((stats) => {
      let usable = stats.available;
      let total = stats.total;
      if ((this.getConfig().settings.thresholdBytes == 0) || (usable < this.getConfig().settings.thresholdBytes)) {
        let usableBytes = bytes(usable);
        let totalBytes = bytes(total);

        let message = `Free RAM ${usableBytes} out of ${totalBytes}`;
        if (this.getConfig().settings.thresholdBytes > 0) {
          message += ` which is less than threshold ${this.getConfig().settings.threshold}`;
        }

        this.getApplication().notify(this.getLoggers(), {
          message: message,
          value: usable,
          units: 'Bytes',
          dimensions: {},
          skipConsole: (this.getConfig().settings.thresholdBytes == 0),
        }, {}, this);
      }
    }).catch((error) => {
      this.getApplication().notify(this.getLoggers(), {
        message: `Can not retrive RAM information: ${error.toString()}`,
        isError: true,
      }, {}, this);
    });
  }
}

module.exports = FreeRAMWatcher;
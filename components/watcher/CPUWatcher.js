const si = require('systeminformation');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

class CPUWatcher extends CustomWatcher {
  constructor(application, name, config) {
    super(application, name, config);

    this.config.settings = Object.assign({
      threshold: 0,
    }, this.config.settings);
  }

  watch() {
    si.currentLoad().then((stats) => {
      if (stats.currentLoad > this.getConfig().settings.threshold) {
        let message = `CPU Load ${stats.currentLoad.toFixed()}%`;

        if (this.getConfig().settings.threshold > 0) {
          message += ` which is more than threshold ${this.getConfig().settings.threshold}`;
        }

        this.getApplication().notify(this.getLoggers(), {
          message: message,
          value: stats.currentLoad,
          units: 'Percent',
          dimensions: {},
          skipConsole: (this.getConfig().settings.threshold == 0),
        }, {}, this);
      }
    }).catch((error) => {
      this.getApplication().notify(this.getLoggers(), {
        message: `Can not retrive CPU information: ${error.toString()}`,
        isError: true,
      }, {}, this);
    });
  }
}

module.exports = CPUWatcher;
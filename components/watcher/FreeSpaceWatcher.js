const diskusage = require('diskusage');
const bytes = require('bytes');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);

class FreeSpaceWatcher extends CustomWatcher {
  constructor(application, name, config) {
    super(application, name, config);

    this.config.settings = Object.assign({
      threshold: '0 b',
    }, this.config.settings);

    this.config.settings.thresholdBytes = bytes.parse(this.config.settings.threshold);
  }

  watchPath(path) {
    let details = {
      Path: path,
    };

    diskusage.check(path, (error, stats) => {
      if (error) {
        this.getApplication().notify(this.getLoggers(), {
          message: error.toString(),
          isError: true,
        }, details, this);
      } else {
        if ((this.getConfig().settings.thresholdBytes == 0) || (stats.free < this.getConfig().settings.thresholdBytes)) {
          let message = `Free space is ${bytes(stats.free)}`;
          if (this.getConfig().settings.thresholdBytes > 0) {
            message += ` which is less than threshold ${bytes(this.getConfig().settings.thresholdBytes)}`;
          }
          this.getApplication().notify(this.getLoggers(), {
            message: message,
            value: stats.free,
            units: 'Bytes',
            dimensions: {
              Path: path,
            },
            skipConsole: (this.getConfig().settings.thresholdBytes == 0),
          }, details, this);
        }
      }
    });
  }

  watch() {
    let paths = this.getArrayValue(this.getConfig().settings.path);

    for (let i = 0; i < paths.length; i++) {
      this.watchPath(paths[i]);
    }
  }
}

module.exports = FreeSpaceWatcher;
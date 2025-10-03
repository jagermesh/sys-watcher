const checkDiskSpace = require('check-disk-space').default; // replaces 'diskusage'
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

  async watchPath(path) {
    const details = {
      Path: path,
    };

    try {
      // check-disk-space resolves the mount for the given path
      const {
        free,
        /* size */
      } = await checkDiskSpace(path);

      if (
        (this.getConfig().settings.thresholdBytes === 0) ||
        (free < this.getConfig().settings.thresholdBytes)
      ) {
        let message = `Free space is ${bytes(free)}`;
        if (this.getConfig().settings.thresholdBytes > 0) {
          message += ` which is less than threshold ${bytes(
            this.getConfig().settings.thresholdBytes,
          )}`;
        }

        this.getApplication().notify(this.getLoggers(), {
          message,
          value: free,
          units: 'Bytes',
          dimensions: {
            Path: path,
          },
          // keep the original behavior: if threshold is 0, just report value without console spam
          skipConsole: this.getConfig().settings.thresholdBytes === 0,
        }, details, this);
      }
    } catch (error) {
      this.getApplication().notify(this.getLoggers(), {
        message: error.toString(),
        isError: true,
      }, details, this);
    }
  }

  watch() {
    const paths = this.getArrayValue(this.getConfig().settings.path);
    for (let i = 0; i < paths.length; i++) {
      // fire and forget to match original async callback style
      this.watchPath(paths[i]);
    }
  }
}

module.exports = FreeSpaceWatcher;

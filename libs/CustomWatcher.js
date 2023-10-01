const CustomLoggable = require(`${__dirname}/CustomLoggable.js`);

class CustomWatcher extends CustomLoggable {
  constructor(application, name, config) {
    super(application, name, config);
  }

  watch() {

  }

  start() {
    return new Promise((resolve) => {
      if (this.needScheduler()) {
        this.getScheduler().start(() => {
          return this.watch();
        });
      } else {
        this.watch();
      }

      this.getApplication().getConsole().log('Started', {}, this);

      resolve();
    });
  }

  stop() {
    if (this.needScheduler()) {
      return this.getScheduler().stop();
    }
  }
}

module.exports = CustomWatcher;
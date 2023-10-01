const CustomLoggable = require(`${__dirname}/CustomLoggable.js`);

class CustomScript extends CustomLoggable {
  constructor(application, name, config) {
    super(application, name, config);
  }

  exec() {

  }

  start() {
    return new Promise((resolve) => {
      if (this.needScheduler()) {
        this.getScheduler().start(() => {
          this.exec();
        });
      }

      resolve();
    });
  }

  stop() {
    if (this.needScheduler()) {
      this.getScheduler().stop();
    }
  }
}

module.exports = CustomScript;
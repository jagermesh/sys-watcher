const CustomLoggable = require(`${__dirname}/CustomLoggable.js`);
const ParsedSchedule = require(`${__dirname}/ParsedSchedule.js`);

class Scheduler extends CustomLoggable {
  constructor(application, name, config, owner) {
    super(application, name, config, owner);

    if (!Array.isArray(this.getConfig().settings.interval)) {
      this.getConfig().settings.interval = [this.getConfig().settings.interval];
    }

    this.intervals = [];
  }

  run(parsedSchedule, onTime) {
    if (parsedSchedule.isTimeToRun()) {
      let result = onTime(this);
      if (result && result.then) {
        result.then(() => {
          parsedSchedule.touchMarker();
        }).catch(() => {

        });
      } else {
        parsedSchedule.touchMarker();
      }
    }
  }

  start(onTime) {
    if (this.getConfig().settings.interval) {
      this.getConfig().settings.interval.forEach((schedule) => {
        let parsedSchedule = new ParsedSchedule(this, schedule);
        if (parsedSchedule.isValid()) {
          this.run(parsedSchedule, onTime);
          this.intervals.push(setInterval(() => {
            this.run(parsedSchedule, onTime);
          }, parsedSchedule.getMs()));
          this.getApplication().getConsole().log(`Started. Will trigger ${parsedSchedule.getRule()}.`, {}, this);
        }
      });
    }
  }

  stop() {
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
  }
}

module.exports = Scheduler;
const CustomLoggable = require(`${__dirname}/CustomLoggable.js`);
const ParsedSchedule = require(`${__dirname}/ParsedSchedule.js`);

class Scheduler extends CustomLoggable {
  constructor(application, name, config, owner) {
    super(application, name, config, owner);

    if (!Array.isArray(this.getConfig().settings.interval)) {
      this.getConfig().settings.interval = [this.getConfig().settings.interval];
    }

    this.intervals = [];
    this.running = false;
  }

  run(parsedSchedule, onTime) {
    if (this.running) {
      return;
    }

    if (parsedSchedule.isTimeToRun()) {
      let result = onTime(this);
      if (result && result.then) {
        this.running = true;
        result.then(() => {
          this.running = false;
          parsedSchedule.touchMarker();
        }).catch(() => {
          this.running = false;
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
    this.intervals = [];
  }
}

module.exports = Scheduler;

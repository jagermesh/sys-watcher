const CustomLoggable = require(`${__dirname}/CustomLoggable.js`);
const ParsedSchedule = require(`${__dirname}/ParsedSchedule.js`);

function Scheduler(application, name, config, owner) {
  CustomLoggable.call(this, application, name, config, owner);

  const _this = this;

  let intervals = [];

  function run(parsedSchedule, onTime) {
    if (parsedSchedule.isTimeToRun()) {
      let result = onTime(this);
      if (result && result.then) {
        result.then(function() {
          parsedSchedule.touchMarker();
        }).catch(function() {

        });
      } else {
        parsedSchedule.touchMarker();
      }
    }
  }

  _this.start = function(onTime) {
    if (_this.config.settings.interval) {
      let schedulings = Array.isArray(_this.config.settings.interval) ? _this.config.settings.interval : [_this.config.settings.interval];
      schedulings.forEach(function(schedule) {
        let parsedSchedule = new ParsedSchedule(_this, schedule);
        if (parsedSchedule.isValid()) {
          run(parsedSchedule, onTime);
          intervals.push(setInterval(function() {
            run(parsedSchedule, onTime);
          }, parsedSchedule.getMs()));
          _this.getApplication().getConsole().log(`Started. Will trigger ${parsedSchedule.getRule()}.`, Object.create({}), _this);
        }
      });
    }

  };

  _this.stop = function() {
    intervals.forEach(function(interval) {
      clearInterval(interval);
    });
  };
}

module.exports = Scheduler;
const parseDuration = require('parse-duration');
const moment = require('moment');
const md5 = require('md5');
const fs = require('fs');
const os = require('os');

function ParsedSchedule(scheduler, schedule) {

  const re = /every[ ]+([a-z]+)[ ]+at[ ]+([0-9:amp]+)/;
  const scheduleRe = re.exec(schedule);
  const scheduleMs = parseDuration(schedule);
  const scheduleFile = os.tmpdir() + '/' + md5(scheduler.getName() + schedule) + '.txt';

  this.isValid = function() {

    return !!schedule;

  };

  this.isTimeToRun = function() {

    if (!scheduleRe) {
      return true;
    }

    let time = moment(scheduleRe[2], 'h:ma');

    if (time.isBefore()) {
      let marker;
      try {
        marker = fs.readFileSync(scheduleFile, 'utf8');
      } catch (error) {
        fs.writeFileSync(scheduleFile, moment().startOf('day').format());
        marker = fs.readFileSync(scheduleFile, 'utf8');
      }
      let lastTime = moment(marker);
      if (lastTime.isBefore(time)) {
        return true;
      }
    }

    return false;

  };

  this.touchMarker = function() {

    if (scheduleRe) {
      scheduler.getApplication().getConsole().log('Touching marker ' + scheduleFile + '.', Object.create({ }), scheduler);
      fs.writeFileSync(scheduleFile, moment().format());
    }

  };

  this.getMs = function() {

    if (!scheduleRe) {
      return scheduleMs;
    }

    return 60*1000;

  };

  this.getRule = function() {

    if (!scheduleRe) {
      return 'every ' + schedule;
    }

    return schedule;

  };

  return this;

}

module.exports = ParsedSchedule;

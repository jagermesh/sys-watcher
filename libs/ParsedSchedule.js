const parseDuration = require('parse-duration');
const moment = require('moment');
const md5 = require('md5');
const fs = require('fs');
const os = require('os');

function ParsedSchedule(scheduler, schedule) {

  const re = /every[ ]+([a-z]+)[ ]+at[ ]+([0-9:amp]+)/i;
  const scheduleRe = re.exec(schedule);
  const scheduleMs = parseDuration(schedule);
  const scheduleFile = os.tmpdir() + '/' + md5(scheduler.getName() + schedule) + '.txt';

  if (!scheduleRe && !scheduleMs) {
    throw new Error(`Schedule is invalid: "${schedule}"`);
  }

  this.isValid = function() {

    return !!scheduleRe || !!scheduleMs;

  };

  this.isTimeToRun = function() {

    if (!scheduleRe) {
      return true;
    }

    let currentDay = moment().format('dddd').toLowerCase();
    let scheduleTime = moment(scheduleRe[2], 'h:ma');
    let scheduleDay = scheduleRe[1].toLowerCase();

    if (scheduleTime.isBefore() && ((scheduleDay == 'day') || scheduleDay == currentDay)) {
      let marker;
      try {
        marker = fs.readFileSync(scheduleFile, 'utf8');
      } catch (error) {
        fs.writeFileSync(scheduleFile, moment().startOf('day').format());
        marker = fs.readFileSync(scheduleFile, 'utf8');
      }
      let lastTime = moment(marker);
      if (lastTime.isBefore(scheduleTime)) {
        return true;
      }
    }

    return false;

  };

  this.touchMarker = function() {

    if (scheduleRe) {
      scheduler.getApplication().getConsole().log(`Touching marker ${scheduleFile}.`, Object.create({ }), scheduler);
      fs.writeFileSync(scheduleFile, moment().format());
    }

  };

  this.getMs = function() {

    if (scheduleRe) {
      return 60*1000;
    }

    if (!scheduleMs) {
      return 60*1000;
    }

    return scheduleMs;

  };

  this.getRule = function() {

    if (scheduleRe) {
      return schedule;
    }

    return 'every ' + schedule;

  };

  return this;

}

module.exports = ParsedSchedule;

const parseDuration = require('parse-duration');
const moment = require('moment');
const md5 = require('md5');
const fs = require('fs');
const os = require('os');

class ParsedSchedule {
  constructor(scheduler, schedule) {
    const re = /every[ ]+([a-z]+)[ ]+at[ ]+([0-9]+:[0-9]+)/i;

    this.schedule = schedule;
    this.scheduler = scheduler;
    this.scheduleRe = re.exec(this.schedule);
    this.scheduleDay = null;
    this.scheduleTime = null;
    if (this.scheduleRe) {
      this.scheduleDay = this.scheduleRe[1].toLowerCase();
      this.scheduleTime = moment(this.scheduleRe[2], 'HH:mm');
    }
    this.scheduleMs = parseDuration(this.schedule);
    this.scheduleFile = `${os.tmpdir()}/sys-watcher-scheduler-${md5(this.scheduler.getName())}.lock`;
    this.applicableDays = ['day', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    if (!this.isValid()) {
      throw new Error(`Schedule is invalid: "${this.schedule}"`);
    }
  }

  isValid() {
    return !!this.scheduleMs || (!!this.scheduleRe && (this.applicableDays.indexOf(this.scheduleDay) != -1));
  }

  isTimeToRun() {
    if (!this.scheduleRe) {
      return true;
    }

    let currentDay = moment().format('dddd').toLowerCase();

    if (this.scheduleTime.isBefore() && ((this.scheduleDay == 'day') || (this.scheduleDay == currentDay))) {
      let marker;
      try {
        marker = fs.readFileSync(this.scheduleFile, 'utf8');
      } catch (error) {
        this.scheduler.getApplication().getConsole().log(`Time marker file not found, recreating at ${this.scheduleFile}.`, { error: error }, this.scheduler);
        fs.writeFileSync(this.scheduleFile, moment().startOf('day').format());
        marker = fs.readFileSync(this.scheduleFile, 'utf8');
      }
      let lastTime = moment(marker);
      if (lastTime.isBefore(this.scheduleTime)) {
        return true;
      }
    }

    return false;
  }

  touchMarker() {
    if (this.scheduleRe) {
      this.scheduler.getApplication().getConsole().log(`Touching time marker ${this.scheduleFile}.`, Object.create({}), this.scheduler);
      fs.writeFileSync(this.scheduleFile, moment().format());
    }
  }

  getMs() {
    if (this.scheduleRe) {
      return 60 * 1000;
    }

    if (!this.scheduleMs) {
      return 60 * 1000;
    }

    return this.scheduleMs;
  }

  getRule() {
    if (this.scheduleRe) {
      return this.schedule;
    }

    return `every ${this.schedule}`;
  }
}

module.exports = ParsedSchedule;
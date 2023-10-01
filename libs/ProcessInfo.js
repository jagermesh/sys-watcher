const moment = require('moment');

class ProcessInfo {
  constructor(pid) {
    this.pid = pid;
    this.metricValues = {};
  }

  addMetricValue(metric, value) {
    this.metricValues[metric] = this.metricValues[metric] || [];
    this.metricValues[metric].push({
      ts: moment().unix(),
      value: parseFloat(value),
    });
  }

  getPid() {
    return this.pid;
  }

  getAverageMetricValue(metric, period, clean) {
    let now = moment().unix();
    let min = 0;

    if (period) {
      min = now - period;
    }

    let cnt = 0;
    let sum = 0;
    let cln = null;

    if (this.metricValues[metric]) {
      for (let i = this.metricValues[metric].length - 1; i >= 0; i--) {
        if (this.metricValues[metric][i].ts > min) {
          cnt++;
          sum += this.metricValues[metric][i].value;
        }
        if (this.metricValues[metric][i].ts < min) {
          cln = i;
          break;
        }
      }

      if ((cln != null) || !period) {
        if (clean && period) {
          this.metricValues[metric].splice(0, cln + 1);
        }
        if (cnt > 0) {
          return Math.round((sum / cnt) * 100) / 100;
        }
      }
    }
  }

  isRunning() {
    try {
      return process.kill(this.getPid(), 0);
    } catch (e) {
      return e.code === 'EPERM';
    }
  }
}

module.exports = ProcessInfo;
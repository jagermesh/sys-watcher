const moment = require('moment');

function ProcessInfo(pid, cmd) {
  const _this = this;

  let metricValues = Object.create({});

  _this.addMetricValue = function(metric, value) {
    metricValues[metric] = metricValues[metric] || [];
    metricValues[metric].push({
      ts: moment().unix(),
      value: parseFloat(value)
    });
  };

  _this.getPid = function() {
    return pid;
  };

  _this.getAverageMetricValue = function(metric, period, clean) {
    let now = moment().unix();
    let min = 0;

    if (period) {
      min = now - period;
    }

    let cnt = 0;
    let sum = 0;
    let cln = null;

    if (metricValues[metric]) {
      for (let i = metricValues[metric].length - 1; i >= 0; i--) {
        if (metricValues[metric][i].ts > min) {
          cnt++;
          sum += metricValues[metric][i].value;
        }
        if (metricValues[metric][i].ts < min) {
          cln = i;
          break;
        }
      }

      if ((cln != null) || !period) {
        if (clean && period) {
          metricValues[metric].splice(0, cln + 1);
        }
        if (cnt > 0) {
          return Math.round((sum / cnt) * 100) / 100;
        }
      }
    }
  };

  _this.isRunning = function() {
    try {
      return process.kill(_this.getPid(), 0);
    } catch (e) {
      return e.code === 'EPERM';
    }
  };
}

module.exports = ProcessInfo;
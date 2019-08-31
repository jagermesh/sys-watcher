const colors = require('colors');
const bytes = require('bytes');
const parseDuration = require('parse-duration');
const child_process = require('child_process');
const path = require('path');
const moment = require('moment');
const HashMap = require('hashmap');

const CustomWatcher = require(__dirname + '/../../libs/CustomWatcher.js');
const ProcessInfo = require(__dirname + '/../../libs/ProcessInfo.js');

function ProcessWatcher(application, name, config) {

  CustomWatcher.call(this, application, name, config);

  const _this = this;

  let processStats = new HashMap();

  function restart(ruleName, ruleConfig, results) {

    let cmd = ruleConfig.cmd;
    let cwd = ruleConfig.cwd || path.dirname(__dirname);

    ruleConfig.retryTimeout = ruleConfig.retryTimeout || '3 sec';

    let retryTimeout = parseDuration(ruleConfig.retryTimeout);

    let details = { Check: ruleConfig.check, Processes: results, Cmd: ruleConfig.cmd, WorkingDir: cwd };

    _this.getApplication().getExecPool().spawn(cmd, cwd).then(function(stdout) {
      _this.getApplication().notify(_this.getLoggers(), { message: 'Process ' + ruleName + ' not found, restarted\n' + stdout.trim().substring(0, 1024) }, details, _this);
    }).catch(function(stdout) {
      _this.getApplication().notify(_this.getLoggers(), { message: 'Process ' + ruleName + ' not found, restart failed\n' + stdout, isError: true }, details, _this);
      setTimeout(function() {
        restart(ruleName, ruleConfig, results);
      }, retryTimeout);
    });

  }

  function watchRule(ruleName, ruleConfig) {

    const isMacOS = (process.platform == 'darwin');

    let cmd = '';

    // if (isMacOS) {
      cmd = 'ps ax -o pid,%cpu,command | grep "' + ruleConfig.check + '"';
    // } else {
      // cmd = 'top -b -n 1 -c -w 4000 | grep "' + ruleConfig.check + '"';
    // }

    ruleConfig.mode = ruleConfig.mode || 'log-count';

    if (typeof ruleConfig.mode == 'string') {
      ruleConfig.mode = ruleConfig.mode.split(',');
    }

    _this.getApplication().getConsole().log('Checking for ' + colors.yellow(ruleName) + ', executing ' + colors.yellow(cmd), { Check: ruleConfig.check }, _this);

    _this.getApplication().getExecPool().exec(cmd).then(function(stdout) {

      let lines = stdout.toLowerCase().trim().split('\n');
      let results = [];

      for(let i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('grep') == -1) {
          results.push(lines[i]);
        }
      }

      if (ruleConfig.mode.indexOf('log-count') != -1) {
        _this.getApplication().notify( _this.getLoggers()
                                     , { message: 'Found ' + results.length + ' ' + ruleName + ' processes'
                                       , value: results.length, units: 'Count', dimensions: { Rule: ruleName }
                                       }
                                     , { Check: ruleConfig.check, Processes: results }
                                     , _this);
      }

      if (results.length === 0) {
        if (ruleConfig.mode.indexOf('keepalive') != -1) {
          if (ruleConfig.cmd) {
            restart(ruleName, ruleConfig, results);
          } else {
            _this.getApplication().notify( _this.getLoggers()
                                         , { message: 'Process ' + ruleName + ' not found and no restart command configured', isError: true }
                                         , { Check: ruleConfig.check, Processes: results }
                                         , _this
                                         );
          }
        }
      }

      if (results.length > 0) {
        if (isMacOS && ((ruleConfig.mode.indexOf('log-cpu') != -1) || (ruleConfig.mode.indexOf('limit-cpu') != -1))) {
          let regexp;
          // if (isMacOS) {
            regexp = /([^ ]+?)[ ]+([^ ]+?)[ ]+(.+)/;
          // } else {
            // regexp = /([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+(.+)/;
          // }
          for(let j = 0; j < results.length; j++) {
            let match = regexp.exec(results[j]);
            if (match) {
              let pid, cpu, cmd;
              if (isMacOS) {
                pid = parseFloat(match[1]);
                cpu = parseFloat(match[2]);
                cmd = match[3];
              } else {
                pid = parseFloat(match[1]);
                cpu = parseFloat(match[9]);
                cmd = match[12];
              }
              let log = true;
              if (ruleConfig.cpu_period) {
                ruleConfig.cpu_period_sec = parseDuration(ruleConfig.cpu_period) / 1000;
                let processInfo = processStats.get(pid);
                if (!processInfo) {
                  processInfo = new ProcessInfo(pid, cmd);
                  processStats.set(pid, processInfo);
                }
                processInfo.addMetricValue('cpu', cpu);
                let avgCpu = processInfo.getAverageMetricValue('cpu', ruleConfig.cpu_period_sec, true);
                if (avgCpu != null) {
                  cpu = avgCpu;
                } else {
                  log = false;
                }
              }
              if (log) {
                let cpuOverload = false;
                if (ruleConfig.cpu_threshold) {
                  log = cpu > parseFloat(ruleConfig.cpu_threshold);
                }
                if (log) {
                  if (ruleConfig.mode.indexOf('log-cpu') != -1) {
                    _this.getApplication().notify( _this.getLoggers()
                                                 , { message: 'Application ' + cmd + ' (PID ' + pid + ') CPU ' + cpu + '%'
                                                   , value: cpu, units: 'Percent', dimensions: { Rule: ruleName }
                                                   }
                                                 , { Check: ruleConfig.check, Processes: results }
                                                 , _this);
                  }
                  if ((ruleConfig.mode.indexOf('limit-cpu') != -1) && ruleConfig.cpu_threshold) {
                    try {
                      process.kill(pid);
                      processStats.delete(pid);
                      _this.getApplication().notify( _this.getLoggers()
                                                   , { message: 'Application ' + cmd + ' (PID ' + pid + ') CPU ' + cpu + '%, greater than threshold, killed'
                                                     }
                                                   , { Check: ruleConfig.check, Processes: results }
                                                   , _this);
                      if (ruleConfig.mode.indexOf('keepalive') != -1) {
                        if (ruleConfig.cmd) {
                          restart(ruleName, ruleConfig, results);
                        } else {
                          _this.getApplication().notify( _this.getLoggers()
                                                       , { message: 'Process ' + ruleName + ' not found and no restart command configured', isError: true }
                                                       , { Check: ruleConfig.check, Processes: results }
                                                       , _this
                                                       );
                        }
                      }
                    } catch (ex) {
                      _this.getApplication().notify( _this.getLoggers()
                                                   , { message: 'Application ' + cmd + ' (PID ' + pid + ') CPU ' + cpu + '%, greater than threshold, kill failed: ' + ex.toString()
                                                     , isError: true
                                                     }
                                                   , { Check: ruleConfig.check, Processes: results }
                                                   , _this);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }).catch(function(stdout) {
      _this.getApplication().reportError(stdout, { Cmd: cmd }, _this);
    });

  }

  function checkForRunningProcesses() {

    let killed = [];

    processStats.forEach(function(processInfo) {
      if (!processInfo.isRunning()) {
        killed.push(processInfo.getPid());
      }
    });

    killed.forEach(function(pid) {
      processStats.delete(pid);
    });

  }

  _this.watch = function() {

    for(let ruleName in _this.config.settings.rules) {
      let ruleConfig = _this.config.settings.rules[ruleName];
      watchRule(ruleName, ruleConfig);
    }

    _this.getApplication().registerGCRoutine(function() {
      checkForRunningProcesses();
    });

  };

}

module.exports = ProcessWatcher;

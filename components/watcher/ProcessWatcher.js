const colors = require('colors');
const parseDuration = require('parse-duration');
const HashMap = require('hashmap');
const moment = require('moment');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);
const ProcessInfo = require(`${__dirname}/../../libs/ProcessInfo.js`);

function ProcessWatcher(application, name, config) {
  CustomWatcher.call(this, application, name, config);

  const _this = this;

  let processStats = new HashMap();

  function restart(ruleName, ruleConfig, results) {
    let cmd = ruleConfig.cmd;
    let cwd = ruleConfig.cwd || process.cwd();

    ruleConfig.retryTimeout = ruleConfig.retryTimeout || '3 sec';

    let details = {
      Check: ruleConfig.check,
      Processes: results,
      Cmd: ruleConfig.cmd,
      WorkingDir: cwd
    };

    _this.getApplication().getExecPool().spawn(cmd, cwd).then(function(result) {
      let stdout = result.stdout;
      _this.getApplication().notify(_this.getLoggers(), {
        message: `Process ${ruleName} not found, restarted\n${stdout.trim().substring(0, 1024)}`
      }, details, _this);
    }).catch(function(result) {
      let stdout = result.stdout;
      _this.getApplication().notify(_this.getLoggers(), {
        message: `Process ${ruleName} not found, restart failed\n${stdout}`,
        isError: true
      }, details, _this);
    });
  }

  function killProcess(ruleName, ruleConfig, processInfo, reason, processes) {
    try {
      process.kill(processInfo.pid);
      processStats.delete(processInfo.pid);
      _this.getApplication().notify(_this.getLoggers(), {
        message: `${reason}, killed`
      }, {
        Check: ruleConfig.check,
        Processes: processes
      }, _this);
      if (ruleConfig.mode.indexOf('keepalive') != -1) {
        if (ruleConfig.cmd) {
          restart(ruleName, ruleConfig, processes);
        } else {
          _this.getApplication().notify(_this.getLoggers(), {
            message: `Process ${ruleName} not found and no restart command configured`,
            isError: true
          }, {
            Check: ruleConfig.check,
            Processes: processes
          }, _this);
        }
      }
      return true;
    } catch (ex) {
      _this.getApplication().notify(_this.getLoggers(), {
        message: `${reason}, kill failed: ${ex.toString()}`,
        isError: true
      }, {
        Check: ruleConfig.check,
        Processes: processes
      }, _this);
      return false;
    }
  }

  function watchRule(ruleName, ruleConfig) {
    const isMacOS = (process.platform == 'darwin');

    ruleConfig.mode = ruleConfig.mode || 'log-count';

    if (typeof ruleConfig.mode == 'string') {
      ruleConfig.mode = ruleConfig.mode.split(',');
    }

    let commands = [];

    const PS_TEMPLATE = 'ps ax -o pid,%cpu,lstart,command';
    const TOP_TEMPLATE = 'top -b -n 1 -c -w 4000';

    // in MacOS ps gives us all we need
    commands.push({
      cmd: `${PS_TEMPLATE} | grep "${ruleConfig.check}"`,
      marker: 'ps',
    });

    if (!isMacOS && ((ruleConfig.mode.indexOf('log-cpu') != -1) || (ruleConfig.mode.indexOf('limit-cpu') != -1))) {
      commands.push({
        cmd: `${TOP_TEMPLATE} | grep "${ruleConfig.check}"`,
        marker: 'top',
      });
    }

    let sysCmds = commands.map(function(command) {
      return command.cmd;
    });

    _this.getApplication().getConsole().log(`Checking for ${colors.yellow(ruleName)}, executing ${colors.yellow(commands.join(', '))}`, {
      Check: ruleConfig.check
    }, _this);

    let promises = commands.map(function(command) {
      return _this.getApplication().getExecPool().exec(command.cmd, null, null, null, command.marker);
    });

    Promise.all(promises).then(function(execResults) {
      let processes = new Map();

      execResults.forEach(function(execResult) {
        let lines = execResult.stdout.trim().split('\n');

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].indexOf('grep') == -1) {
            let processInfo;
            if (execResult.marker == 'ps') {
              let match = /([^ ]+?)[ ]+([^ ]+?)[ ]+([A-Za-z]{3} [A-Za-z]{3} [0-9]{1,2} [0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2} [0-9]{4})[ ]+(.+)/.exec(lines[i]);
              if (match) {
                processInfo = {
                  pid: parseFloat(match[1]),
                  uptime: moment().unix() - moment(match[3], 'ddd MMM DD HH:mm:ss YYYY').unix(),
                  cmd: match[4].trim(),
                };
                if (isMacOS) {
                  processInfo.cpu = parseFloat(match[2]);
                }
              }
            } else
            if (execResult.marker == 'top') {
              let match = /([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+(.+)/.exec(lines[i]);
              if (match) {
                processInfo = {
                  pid: parseFloat(match[1]),
                  cpu: parseFloat(match[9]),
                  cmd: match[12].trim(),
                };
              }
            }

            if (processInfo) {
              if ((processInfo.cpu != undefined) && ruleConfig.cpu_period) {
                let cpu_period_sec = parseDuration(ruleConfig.cpu_period) / 1000;
                let processStat = processStats.get(processInfo.pid);
                if (!processStat) {
                  processStat = new ProcessInfo(processInfo.pid, processInfo.cmd);
                  processStats.set(processInfo.pid, processStat);
                }
                processStat.addMetricValue('cpu', processInfo.cpu);
                processInfo.avgCpu = processStat.getAverageMetricValue('cpu', cpu_period_sec, true);
              }

              let existingProcessInfo = processes.get(processInfo.pid);
              if (existingProcessInfo) {
                if (processInfo.uptime != undefined) {
                  existingProcessInfo.uptime = processInfo.uptime;
                }
                if (processInfo.cpu != undefined) {
                  existingProcessInfo.cpu = processInfo.cpu;
                }
                if (processInfo.avgCpu != undefined) {
                  existingProcessInfo.cpu = processInfo.avgCpu;
                }
                processes.set(processInfo.pid, existingProcessInfo);
              } else {
                processes.set(processInfo.pid, processInfo);
              }
            }
          }
        }
      });

      let processCmds = [];

      processes.forEach(function(runningProcess) {
        processCmds.push(runningProcess.cmd);
      });

      if (ruleConfig.mode.indexOf('log-count') != -1) {
        _this.getApplication().notify(_this.getLoggers(), {
          message: `Found ${processes.size} ${ruleName} process${processes.size == 1 ? '' : 'es'}`,
          value: processes.size,
          units: 'Count',
          dimensions: {
            Rule: ruleName
          }
        }, {
          Check: ruleConfig.check,
          Processes: processCmds
        }, _this);
      }

      if (processes.size === 0) {
        if (ruleConfig.mode.indexOf('keepalive') != -1) {
          if (ruleConfig.cmd) {
            restart(ruleName, ruleConfig, processCmds);
          } else {
            _this.getApplication().notify(_this.getLoggers(), {
              message: `Process ${ruleName} not found and no restart command configured`,
              isError: true
            }, {
              Check: ruleConfig.check,
              Processes: processCmds
            }, _this);
          }
        }
      }

      if (processes.size > 0) {
        processes.forEach(function(runningProcess) {
          let killed = false;
          if ((ruleConfig.mode.indexOf('limit-uptime') != -1) && runningProcess.uptime && ruleConfig.uptime_threshold) {
            let uptime_threshold_sec = parseDuration(ruleConfig.uptime_threshold) / 1000;
            if (runningProcess.uptime > uptime_threshold_sec) {
              killed = killProcess(
                ruleName,
                ruleConfig,
                runningProcess,
                `Application ${runningProcess.cmd} (PID ${runningProcess.pid}) uptime ${runningProcess.uptime} sec, greater than threshold ${uptime_threshold_sec} sec`,
                processCmds,
              );
            }
          }
          if (!killed) {
            if ((ruleConfig.mode.indexOf('log-cpu') != -1) && (runningProcess.cpu != undefined)) {
              let cpuInRange;
              if (ruleConfig.cpu_log_threshold) {
                cpuInRange = runningProcess.cpu > parseFloat(ruleConfig.cpu_log_threshold);
              } else {
                cpuInRange = true;
              }
              if (cpuInRange) {
                _this.getApplication().notify(_this.getLoggers(), {
                  message: `Application ${runningProcess.cmd} (PID ${runningProcess.pid}) CPU ${runningProcess.cpu}%`,
                  value: runningProcess.cpu,
                  units: 'Percent',
                  dimensions: {
                    Rule: ruleName
                  }
                }, {
                  Check: ruleConfig.check,
                  Processes: processCmds
                }, _this);
              }
            }
            if ((ruleConfig.mode.indexOf('limit-cpu') != -1) && (runningProcess.avgCpu != undefined) && ruleConfig.cpu_threshold) {
              if (runningProcess.avgCpu > parseFloat(ruleConfig.cpu_threshold)) {
                killed = killProcess(
                  ruleName,
                  ruleConfig,
                  runningProcess,
                  `Application ${runningProcess.cmd} (PID ${runningProcess.pid}) CPU ${runningProcess.avgCpu}%, greater than threshold ${ruleConfig.cpu_threshold}`,
                  processCmds,
                );
              }
            }
          }
        });
      }
    }).catch(function(stdout) {
      _this.getApplication().reportError(stdout, {
        Cmd: sysCmds.join(', '),
      }, _this);
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
    for (let ruleName in _this.config.settings.rules) {
      let ruleConfig = _this.config.settings.rules[ruleName];
      watchRule(ruleName, ruleConfig);
    }

    _this.getApplication().registerGCRoutine(function() {
      checkForRunningProcesses();
    });
  };
}

module.exports = ProcessWatcher;
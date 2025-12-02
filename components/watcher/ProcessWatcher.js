const colors = require('colors');
const parseDuration = require('parse-duration');
const HashMap = require('hashmap');
const moment = require('moment');

const CustomWatcher = require(`${__dirname}/../../libs/CustomWatcher.js`);
const ProcessInfo = require(`${__dirname}/../../libs/ProcessInfo.js`);

class ProcessWatcher extends CustomWatcher {
  constructor(application, name, config) {
    super(application, name, config);

    this.processStats = new HashMap();
  }

  restart(ruleName, ruleConfig, results) {
    let cmd = ruleConfig.cmd;
    let cwd = ruleConfig.cwd || process.cwd();

    ruleConfig = Object.assign({
      retryTimeout: '3 sec',
    }, ruleConfig);

    let details = {
      Check: ruleConfig.check,
      Processes: results,
      Cmd: ruleConfig.cmd,
      WorkingDir: cwd,
    };

    this.getApplication().getExecPool().spawn(cmd, cwd).then((result) => {
      let stdout = result.stdout;
      this.getApplication().notify(this.getLoggers(), {
        message: `Process ${ruleName} not found, restarted\n${stdout.trim().substring(0, 1024)}`,
      }, details, this);
    }).catch((result) => {
      let stdout = result.stdout;
      this.getApplication().notify(this.getLoggers(), {
        message: `Process ${ruleName} not found, restart failed\n${stdout}`,
        isError: true,
      }, details, this);
    });
  }

  killProcess(ruleName, ruleConfig, processInfo, reason, processes) {
    try {
      process.kill(processInfo.pid);
      this.processStats.delete(processInfo.pid);
      this.getApplication().notify(this.getLoggers(), {
        message: `${reason}, killed`,
      }, {
        Check: ruleConfig.check,
        Processes: processes,
      }, this);
      if (ruleConfig.mode.indexOf('keepalive') != -1) {
        if (ruleConfig.cmd) {
          this.restart(ruleName, ruleConfig, processes);
        } else {
          this.getApplication().notify(this.getLoggers(), {
            message: `Process ${ruleName} not found and no restart command configured`,
            isError: true,
          }, {
            Check: ruleConfig.check,
            Processes: processes,
          }, this);
        }
      }
      return true;
    } catch (ex) {
      this.getApplication().notify(this.getLoggers(), {
        message: `${reason}, kill failed: ${ex.toString()}`,
        isError: true,
      }, {
        Check: ruleConfig.check,
        Processes: processes,
      }, this);
      return false;
    }
  }

  watchRule(ruleName, ruleConfig) {
    const isMacOS = (process.platform == 'darwin');

    ruleConfig = Object.assign({
      mode: 'log-count',
    }, ruleConfig);

    if (typeof ruleConfig.mode == 'string') {
      ruleConfig.mode = ruleConfig.mode.split(',');
    }

    let commands = [];

    const PS_TEMPLATE = 'ps ax -o pid,%cpu,lstart,command';
    const TOP_TEMPLATE = 'top -b -n 1 -c -w';

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

    let sysCmds = commands.map((command) => {
      return command.cmd;
    });

    this.getApplication().getConsole().log(`Checking for ${colors.yellow(ruleName)}, executing ${colors.yellow(sysCmds.join(', '))}`, {
      Check: ruleConfig.check,
    }, this);

    let promises = commands.map((command) => {
      return this.getApplication().getExecPool().exec(command.cmd, null, null, null, command.marker);
    });

    Promise.all(promises).then((execResults) => {
      let processes = new Map();

      execResults.forEach((execResult) => {
        let lines = execResult.stdout.trim().split('\n');

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].indexOf('grep') == -1) {
            let processInfo;
            if (execResult.marker == 'ps') {
              let match = /([^ ]+?)[ ]+([^ ]+?)[ ]+([A-Za-z]{3} [A-Za-z]{3} [ 0-9]{1,2} [0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2} [0-9]{4})[ ]+(.+)/.exec(lines[i]);
              if (match) {
                processInfo = {
                  pid: parseFloat(match[1].trim()),
                  uptime: moment().unix() - moment(match[3].trim(), 'ddd MMM DD HH:mm:ss YYYY').unix(),
                  cmd: match[4].trim(),
                };
                if (isMacOS) {
                  processInfo.cpu = parseFloat(match[2].trim());
                }
              }
            } else if (execResult.marker == 'top') {
              let match = /([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+([^ ]+?)[ ]+(.+)/.exec(lines[i]);
              if (match) {
                processInfo = {
                  pid: parseFloat(match[1].trim()),
                  cpu: parseFloat(match[9].trim()),
                  cmd: match[12].trim(),
                };
              }
            }

            if (processInfo) {
              if ((processInfo.cpu != undefined) && ruleConfig.cpu_period) {
                let cpu_period_sec = parseDuration(ruleConfig.cpu_period) / 1000;
                let processStat = this.processStats.get(processInfo.pid);
                if (!processStat) {
                  processStat = new ProcessInfo(processInfo.pid, processInfo.cmd);
                  this.processStats.set(processInfo.pid, processStat);
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

      processes.forEach((runningProcess) => {
        processCmds.push(runningProcess.cmd);
      });

      if (ruleConfig.mode.indexOf('log-count') != -1) {
        this.getApplication().notify(this.getLoggers(), {
          message: `Found ${processes.size} ${ruleName} process${processes.size == 1 ? '' : 'es'}`,
          value: processes.size,
          units: 'Count',
          dimensions: {
            Rule: ruleName,
          },
        }, {
          Check: ruleConfig.check,
          Processes: processCmds,
        }, this);
      }

      if (processes.size === 0) {
        if (ruleConfig.mode.indexOf('keepalive') != -1) {
          if (ruleConfig.cmd) {
            this.restart(ruleName, ruleConfig, processCmds);
          } else {
            this.getApplication().notify(this.getLoggers(), {
              message: `Process ${ruleName} not found and no restart command configured`,
              isError: true,
            }, {
              Check: ruleConfig.check,
              Processes: processCmds,
            }, this);
          }
        }
      }

      if (processes.size > 0) {
        processes.forEach((runningProcess) => {
          let killed = false;
          if (
            (
              (ruleConfig.mode.indexOf('log-uptime') != -1) ||
              (ruleConfig.mode.indexOf('limit-uptime') != -1)
            ) &&
            (runningProcess.uptime != undefined) &&
            ruleConfig.uptime_threshold
          ) {
            let uptime_threshold_sec = parseDuration(ruleConfig.uptime_threshold) / 1000;
            if (runningProcess.uptime > uptime_threshold_sec) {
              let message = `Application ${runningProcess.cmd} (PID ${runningProcess.pid}) uptime ${runningProcess.uptime} sec, greater than threshold ${uptime_threshold_sec} sec`;
              if (ruleConfig.mode.indexOf('log-uptime') != -1) {
                this.getApplication().notify(this.getLoggers(), {
                  message: message,
                  value: runningProcess.uptime,
                  units: 'Duration',
                  dimensions: {
                    Rule: ruleName,
                  },
                }, {
                  Check: ruleConfig.check,
                  Processes: processCmds,
                }, this);
              }
              if (ruleConfig.mode.indexOf('limit-uptime') != -1) {
                killed = this.killProcess(
                  ruleName,
                  ruleConfig,
                  runningProcess,
                  message,
                  processCmds,
                );
              }
            }
          }
          if (!killed) {
            if (
              (ruleConfig.mode.indexOf('log-cpu') != -1) &&
              (runningProcess.cpu != undefined)
            ) {
              let cpuInRange;
              let message;
              if (ruleConfig.cpu_log_threshold) {
                cpuInRange = runningProcess.cpu > parseFloat(ruleConfig.cpu_log_threshold);
                message = `Application ${runningProcess.cmd} (PID ${runningProcess.pid}) CPU ${runningProcess.avgCpu}%, greater than threshold ${ruleConfig.cpu_threshold}`;
              } else {
                cpuInRange = true;
                message = `Application ${runningProcess.cmd} (PID ${runningProcess.pid}) CPU ${runningProcess.cpu}%`;
              }
              if (cpuInRange) {
                this.getApplication().notify(this.getLoggers(), {
                  message: message,
                  value: runningProcess.cpu,
                  units: 'Percent',
                  dimensions: {
                    Rule: ruleName,
                  },
                }, {
                  Check: ruleConfig.check,
                  Processes: processCmds,
                }, this);
              }
            }
            if (
              (ruleConfig.mode.indexOf('limit-cpu') != -1) &&
              (runningProcess.avgCpu != undefined) &&
              ruleConfig.cpu_threshold
            ) {
              if (runningProcess.avgCpu > parseFloat(ruleConfig.cpu_threshold)) {
                killed = this.killProcess(
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
    }).catch((stdout) => {
      this.getApplication().reportError(stdout, {
        Cmd: sysCmds.join(', '),
      }, this);
    });
  }

  checkForRunningProcesses() {
    let killed = [];

    this.processStats.forEach((processInfo) => {
      if (!processInfo.isRunning()) {
        killed.push(processInfo.getPid());
      }
    });

    killed.forEach((pid) => {
      this.processStats.delete(pid);
    });
  }

  watch() {
    for (let ruleName in this.getConfig().settings.rules) {
      let ruleConfig = this.getConfig().settings.rules[ruleName];
      this.watchRule(ruleName, ruleConfig);
    }

    this.getApplication().registerGCRoutine(() => {
      this.checkForRunningProcesses();
    });
  }
}

module.exports = ProcessWatcher;
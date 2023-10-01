const colors = require('colors');
const child_process = require('child_process');
const fs = require('fs');
const tmp = require('tmp');
const {
  v4: uuidv4
} = require('uuid');

const CustomObject = require(`${__dirname}/CustomObject.js`);

function ExecPool(application) {
  const _this = this;

  CustomObject.call(this, application, 'ExecPool');

  _this.tasks = Object.assign({
  }, _this.tasks);

  function postCheckProcessLogs(task, details, out, err, closeError) {
    fs.stat(out.name, function(error) {
      if (error) {
        _this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, stdout log not found`, details, task.senders.concat([_this]));
        task.status = 3;
        task.done(false, '');
      }
      if (!error) {
        fs.stat(err.name, function(error) {
          if (error) {
            _this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, stderr log not found`, details, task.senders.concat([_this]));
            task.status = 3;
            task.done(false, '');
          }
          if (!error) {
            let outRes = fs.readFileSync(out.name);
            let errRes = fs.readFileSync(err.name);
            let stdout = (outRes.toString().trim() + '\n' + errRes.toString().trim()).trim();
            if ((errRes.toString().trim().length > 0) || closeError) {
              _this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, error:\n${colors.red(stdout)}`, details, task.senders.concat([_this]));
              task.status = 3;
              task.done(false, stdout);
            } else {
              _this.getApplication().getConsole().log(`Executed ${colors.yellow(task.cmd)}, success:\n${colors.green(stdout)}`, details, task.senders.concat([_this]));
              task.status = 2;
              task.done(true, stdout);
            }
          }
        });
      }
    });
  }

  function start(task) {
    let details = {
      Cmd: task.cmd,
      Cwd: task.cwd
    };

    let cmd, out, err;

    if (task.longRunning) {
      out = tmp.fileSync();
      out.removeCallback();
      err = tmp.fileSync();
      err.removeCallback();
      cmd = `(${task.cmd}) >${out.name} 2>${err.name}`;
    } else {
      cmd = task.cmd;
    }

    let cmdLog = '';

    _this.getApplication().getConsole().log(`Executing ${colors.yellow(task.cmd)}`, details, task.senders.concat([_this]));

    let cmdProcess = child_process.spawn(cmd, {
      detached: true,
      shell: true,
      cwd: task.cwd
    });

    let postCheckProcessLog;

    if (cmdProcess.stdout) {
      cmdProcess.stdout.on('data', function(data) {
        cmdLog += data.toString();
      });
    }
    if (cmdProcess.stderr) {
      cmdProcess.stderr.on('data', function(data) {
        cmdLog += data.toString();
      });
    }
    cmdProcess.on('error', function() {
      _this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, error:\n${colors.red(cmdLog)}`, details, task.senders.concat([_this]));
      task.status = 3;
      task.done(false, cmdLog.trim());
    });
    cmdProcess.on('close', function(code) {
      clearTimeout(postCheckProcessLog);
      if (code == 0) {
        _this.getApplication().getConsole().log(`Executed ${colors.yellow(task.cmd)}, success:\n${colors.green(cmdLog)}`, details, task.senders.concat([_this]));
        task.status = 2;
        task.done(true, cmdLog.trim());
      } else if ((code == null) || (code > 128)) {
        if (task.longRunning) {
          _this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, but crashed:\n${colors.red(cmdLog)}`, details, task.senders.concat([_this]));
          task.status = 3;
          task.done(false, cmdLog.trim());
        } else {
          _this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, error:\n${colors.red(cmdLog)}`, details, task.senders.concat([_this]));
          task.status = 3;
          task.done(false, cmdLog.trim());
        }
      } else if (code > 0) {
        if (task.longRunning) {
          postCheckProcessLogs(task, details, out, err, true);
        } else {
          _this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, error:\n${colors.red(cmdLog)}`, details, task.senders.concat([_this]));
          task.status = 3;
          task.done(false, cmdLog.trim());
        }
      }
    });

    cmdProcess.unref();

    if (task.longRunning) {
      postCheckProcessLog = setTimeout(function() {
        postCheckProcessLogs(task, details, out, err);
      }, 3000);
    }
  }

  let interval = setInterval(function() {
    for (let tag in _this.tasks) {
      while (_this.tasks[tag].length > 0) {
        let task = _this.tasks[tag][0];
        if (task.status == 0) {
          task.status = 1;
          start(task);
          break;
        } else if (task.status == 1) {
          break;
        } else {
          _this.tasks[tag].shift();
        }
      }
    }
  }, 100);

  _this.stop = function() {
    let checkInterval = setInterval(function() {
      let tasksCount = 0;

      for (let tag in _this.tasks) {
        tasksCount += _this.tasks[tag].length;
      }

      if (tasksCount == 0) {
        clearInterval(checkInterval);
        clearInterval(interval);
      }
    }, 100);
  };

  _this.exec = function(cmd, cwd, tag, senders, marker) {
    tag = tag || uuidv4();

    senders = senders || [];

    if (senders && !Array.isArray(senders)) {
      senders = [senders];
    }

    return new Promise(function(resolve, reject) {
      _this.tasks[tag] = _this.tasks[tag] || [];
      _this.tasks[tag].push({
        status: 0,
        cmd: cmd,
        cwd: cwd || process.cwd(),
        longRunning: false,
        senders: senders,
        done: function(result, stdout) {
          if (result) {
            resolve({
              cmd: cmd,
              cwd: cwd,
              tag: tag,
              marker: marker,
              senders: senders,
              stdout: stdout,
            });
          } else {
            reject({
              cmd: cmd,
              cwd: cwd,
              tag: tag,
              marker: marker,
              senders: senders,
              stdout: stdout,
            });
          }
        }
      });
    });
  };

  _this.spawn = function(cmd, cwd, senders, marker) {
    let tag = uuidv4();

    senders = senders || [];

    if (senders && !Array.isArray(senders)) {
      senders = [senders];
    }

    return new Promise(function(resolve, reject) {
      _this.tasks[tag] = _this.tasks[tag] || [];
      _this.tasks[tag].push({
        status: 0,
        cmd: cmd,
        cwd: cwd || process.cwd(),
        longRunning: true,
        senders: senders,
        done: function(result, stdout) {
          if (result) {
            resolve({
              cmd: cmd,
              cwd: cwd,
              tag: tag,
              marker: marker,
              senders: senders,
              stdout: stdout,
            });
          } else {
            reject({
              cmd: cmd,
              cwd: cwd,
              tag: tag,
              marker: marker,
              senders: senders,
              stdout: stdout,
            });
          }
        }
      });
    });
  };
}

module.exports = ExecPool;
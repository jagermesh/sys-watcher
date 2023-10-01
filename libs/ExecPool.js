const colors = require('colors');
const child_process = require('child_process');
const fs = require('fs');
const tmp = require('tmp');
const {
  v4: uuidv4,
} = require('uuid');

const CustomObject = require(`${__dirname}/CustomObject.js`);

class ExecPool extends CustomObject {
  constructor(application) {
    super(application, 'ExecPool');

    this.tasks = {};

    this.interval = setInterval(function() {
      for (let tag in this.tasks) {
        while (this.tasks[tag].length > 0) {
          let task = this.tasks[tag][0];
          if (task.status == 0) {
            task.status = 1;
            this.start(task);
            break;
          } else if (task.status == 1) {
            break;
          } else {
            this.tasks[tag].shift();
          }
        }
      }
    }, 100);
  }

  postCheckProcessLogs(task, details, out, err, closeError) {
    fs.stat(out.name, function(error) {
      if (error) {
        this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, stdout log not found`, details, task.senders.concat([this]));
        task.status = 3;
        task.done(false, '');
      }
      if (!error) {
        fs.stat(err.name, function(error) {
          if (error) {
            this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, stderr log not found`, details, task.senders.concat([this]));
            task.status = 3;
            task.done(false, '');
          }
          if (!error) {
            let outRes = fs.readFileSync(out.name);
            let errRes = fs.readFileSync(err.name);
            let stdout = (outRes.toString().trim() + '\n' + errRes.toString().trim()).trim();
            if ((errRes.toString().trim().length > 0) || closeError) {
              this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, error:\n${colors.red(stdout)}`, details, task.senders.concat([this]));
              task.status = 3;
              task.done(false, stdout);
            } else {
              this.getApplication().getConsole().log(`Executed ${colors.yellow(task.cmd)}, success:\n${colors.green(stdout)}`, details, task.senders.concat([this]));
              task.status = 2;
              task.done(true, stdout);
            }
          }
        });
      }
    });
  }

  start(task) {
    let details = {
      Cmd: task.cmd,
      Cwd: task.cwd,
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

    this.getApplication().getConsole().log(`Executing ${colors.yellow(task.cmd)}`, details, task.senders.concat([this]));

    let cmdProcess = child_process.spawn(cmd, {
      detached: true,
      shell: true,
      cwd: task.cwd,
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
      this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, error:\n${colors.red(cmdLog)}`, details, task.senders.concat([this]));
      task.status = 3;
      task.done(false, cmdLog.trim());
    });
    cmdProcess.on('close', function(code) {
      clearTimeout(postCheckProcessLog);
      if (code == 0) {
        this.getApplication().getConsole().log(`Executed ${colors.yellow(task.cmd)}, success:\n${colors.green(cmdLog)}`, details, task.senders.concat([this]));
        task.status = 2;
        task.done(true, cmdLog.trim());
      } else if ((code == null) || (code > 128)) {
        if (task.longRunning) {
          this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, but crashed:\n${colors.red(cmdLog)}`, details, task.senders.concat([this]));
          task.status = 3;
          task.done(false, cmdLog.trim());
        } else {
          this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, error:\n${colors.red(cmdLog)}`, details, task.senders.concat([this]));
          task.status = 3;
          task.done(false, cmdLog.trim());
        }
      } else if (code > 0) {
        if (task.longRunning) {
          this.postCheckProcessLogs(task, details, out, err, true);
        } else {
          this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, error:\n${colors.red(cmdLog)}`, details, task.senders.concat([this]));
          task.status = 3;
          task.done(false, cmdLog.trim());
        }
      }
    });

    cmdProcess.unref();

    if (task.longRunning) {
      postCheckProcessLog = setTimeout(() => {
        this.postCheckProcessLogs(task, details, out, err);
      }, 3000);
    }
  }

  stop() {
    let checkInterval = setInterval(() => {
      let tasksCount = 0;

      for (let tag in this.tasks) {
        tasksCount += this.tasks[tag].length;
      }

      if (tasksCount == 0) {
        clearInterval(checkInterval);
        clearInterval(this.interval);
      }
    }, 100);
  }

  exec(cmd, cwd, tag, senders, marker) {
    tag = tag || uuidv4();

    senders = senders || [];

    if (senders && !Array.isArray(senders)) {
      senders = [senders];
    }

    return new Promise((resolve, reject) => {
      this.tasks[tag] = this.tasks[tag] || [];
      this.tasks[tag].push({
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
        },
      });
    });
  }

  spawn(cmd, cwd, senders, marker) {
    let tag = uuidv4();

    senders = senders || [];

    if (senders && !Array.isArray(senders)) {
      senders = [senders];
    }

    return new Promise((resolve, reject) => {
      this.tasks[tag] = this.tasks[tag] || [];
      this.tasks[tag].push({
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
        },
      });
    });
  }
}

module.exports = ExecPool;
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

    this.maxCmdLogBytes = 1024 * 1024;

    this.interval = setInterval(() => {
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
        if (this.tasks[tag].length === 0) {
          delete this.tasks[tag];
        }
      }
    }, 100);
  }

  appendCmdLog(cmdLog, data) {
    cmdLog += data.toString();
    if (cmdLog.length > this.maxCmdLogBytes) {
      cmdLog = cmdLog.slice(cmdLog.length - this.maxCmdLogBytes);
    }
    return cmdLog;
  }

  postCheckProcessLogs(task, details, out, err, closeError) {
    const cleanup = () => {
      try {
        if (out && out.name) {
          fs.unlinkSync(out.name);
        }
      } catch {
        // ignore
      }
      try {
        if (err && err.name) {
          fs.unlinkSync(err.name);
        }
      } catch {
        // ignore
      }
    };

    const readCapped = (fileName) => {
      let fd;
      try {
        fd = fs.openSync(fileName, 'r');
        let stat = fs.fstatSync(fd);
        let size = Math.min(stat.size, this.maxCmdLogBytes);
        let start = Math.max(0, stat.size - size);
        let buffer = Buffer.alloc(size);
        fs.readSync(fd, buffer, 0, size, start);
        return buffer.toString().trim();
      } catch {
        return '';
      } finally {
        if (fd !== undefined) {
          try {
            fs.closeSync(fd);
          } catch {
            // ignore
          }
        }
      }
    };

    fs.stat(out.name, (error) => {
      if (error) {
        this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, stdout log not found`, details, task.senders.concat([this]));
        cleanup();
        task.status = 3;
        task.done(false, '');
        return;
      }

      fs.stat(err.name, (error) => {
        if (error) {
          this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, stderr log not found`, details, task.senders.concat([this]));
          cleanup();
          task.status = 3;
          task.done(false, '');
          return;
        }

        let outRes = readCapped(out.name);
        let errRes = readCapped(err.name);
        let stdout = (outRes + '\n' + errRes).trim();
        cleanup();

        if ((errRes.length > 0) || closeError) {
          this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, error:\n${colors.red(stdout)}`, details, task.senders.concat([this]));
          task.status = 3;
          task.done(false, stdout);
        } else {
          this.getApplication().getConsole().log(`Executed ${colors.yellow(task.cmd)}, success:\n${colors.green(stdout)}`, details, task.senders.concat([this]));
          task.status = 2;
          task.done(true, stdout);
        }
      });
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
      detached: !!task.longRunning,
      shell: true,
      cwd: task.cwd,
    });

    let postCheckProcessLog;
    let finished = false;

    const finishTask = (ok, output) => {
      if (finished) {
        return;
      }
      finished = true;
      task.status = ok ? 2 : 3;
      task.done(ok, output);
    };

    if (cmdProcess.stdout) {
      cmdProcess.stdout.on('data', (data) => {
        cmdLog = this.appendCmdLog(cmdLog, data);
      });
    }
    if (cmdProcess.stderr) {
      cmdProcess.stderr.on('data', (data) => {
        cmdLog = this.appendCmdLog(cmdLog, data);
      });
    }
    cmdProcess.on('error', () => {
      this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, error:\n${colors.red(cmdLog)}`, details, task.senders.concat([this]));
      finishTask(false, cmdLog.trim());
    });
    cmdProcess.on('close', (code) => {
      clearTimeout(postCheckProcessLog);
      if (code == 0) {
        this.getApplication().getConsole().log(`Executed ${colors.yellow(task.cmd)}, success:\n${colors.green(cmdLog)}`, details, task.senders.concat([this]));
        finishTask(true, cmdLog.trim());
      } else if ((code == null) || (code > 128)) {
        if (task.longRunning) {
          this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, but crashed:\n${colors.red(cmdLog)}`, details, task.senders.concat([this]));
        } else {
          this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, error:\n${colors.red(cmdLog)}`, details, task.senders.concat([this]));
        }
        finishTask(false, cmdLog.trim());
      } else if (code > 0) {
        if (task.longRunning) {
          this.postCheckProcessLogs(task, details, out, err, true);
        } else {
          this.getApplication().getConsole().error(`Executed ${colors.yellow(task.cmd)}, error:\n${colors.red(cmdLog)}`, details, task.senders.concat([this]));
          finishTask(false, cmdLog.trim());
        }
      }
    });

    if (task.longRunning) {
      cmdProcess.unref();
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
        done: (result, stdout) => {
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
        done: (result, stdout) => {
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
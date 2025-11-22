const { program } = require('commander');
const colors = require('colors');
const fs = require('fs');
const path = require('path');
const requireS = require('require-from-string');

const Application = require(`${__dirname}/Application.js`);

class SysWatcher {
  #getConfigFile(opts) {
    let configFileName = opts.config ?? 'config.js';
    let configFilePath = path.resolve(process.cwd(), configFileName);

    if (!fs.existsSync(configFilePath)) {
      configFilePath = path.resolve(process.cwd(), 'config/' + configFileName);
      if (!fs.existsSync(configFilePath)) {
        throw 'Configuration file "' + configFileName + '" not found';
      }
    }

    console.log('Using config file from "' + configFilePath + '"');

    return configFilePath;
  }

  start() {
    process.chdir(path.dirname(require.main.filename));

    program
      .command('start')
      .option('-c, --config <string>', 'Config file name')
      .action((options) => {
        try {
          const application = new Application(this.#getConfigFile(options));
          application.start();
        } catch (error) {
          console.log(colors.red('[ERROR]') + ' ' + error);
        }
      });

    program
      .command('scripts')
      .option('-c, --config <string>', 'Config file name')
      .action((options) => {
        try {
          const application = new Application(this.#getConfigFile(options));

          const watcherCli = 'node watcher.js';
          const configParam = options.config ? ' --config ' + options.config : '';
          let max = 0;
          application.getScriptsManager().getEntries().forEach((entry, scriptName) => {
            max = Math.max(max, ('  ' + watcherCli + ' run-script ' + scriptName + configParam).length);
          });
          if (max == 0) {
            throw 'There is no scripts in config file';
          } else {
            application.getScriptsManager().getEntries().forEach((entry, scriptName) => {
              console.log(('  ' + watcherCli + ' run-script ' + scriptName + configParam).padEnd(max, ' ') + ' ' + colors.yellow(entry.config.name));
            });
          }
        } catch (error) {
          console.log(colors.red('[ERROR]') + ' ' + error);
        }
      });

    program
      .command('run-script')
      .argument('<script>')
      .option('-c, --config <string>', 'Config file name')
      .action((script, options) => {
        try {
          const application = new Application(this.#getConfigFile(options));

          const scriptInstance = application.getScriptsManager().getInstance(script);
          scriptInstance.exec();
        } catch (error) {
          console.log(colors.red('[ERROR]') + ' ' + error);
        }
      });

    program
      .command('messages')
      .option('-c, --config <string>', 'Config file name')
      .action((options) => {
        try {
          const application = new Application(this.#getConfigFile(options));

          const watcherCli = 'node watcher.js';
          const configParam = options.config ? ' --config ' + options.config : '';
          let max = 0;
          application.getLoggersManager().getEntries().forEach((entry, loggerName) => {
            max = Math.max(max, ('  ' + watcherCli + ' send-message ' + loggerName + ' <message>' + configParam).length);
          });
          if (max == 0) {
            throw 'There is no message recipients in config file';
          } else {
            application.getLoggersManager().getEntries().forEach((entry, loggerName) => {
              console.log(('  ' + watcherCli + ' send-message ' + loggerName + ' <message>' + configParam).padEnd(max, ' ') + ' ' + colors.yellow(entry.getInstance().getDescription()));
            });
          }
        } catch (error) {
          console.log(colors.red('[ERROR]') + ' ' + error);
        }
      });

    program
      .command('send-message')
      .argument('<recipient>')
      .argument('<message>')
      .option('-c, --config <string>', 'Config file name')
      .option('-e, --extra <JSON>', 'Parameters in JSON format')
      .action((recipient, message, options) => {
        try {
          const application = new Application(this.#getConfigFile(options));

          let extra;
          if (options.extra) {
            try {
              extra = requireS('module.exports = ' + options.extra);
            } catch {
              console.log(colors.red('Incorrect format of extra parameter'));
            }
          }

          application.notifyLogger(recipient, {
            message: message,
          }, null, null, {
            settings: extra,
          }).catch((error) => {
            error = error || 'Unknown error';
            error = (typeof error == 'string' ? {
              error: error,
            } : error);
            let errorMessage = error.error + '\n';
            if (error.details) {
              errorMessage += '  You can specify additional parameters via ' + colors.yellow('--extra') + '\n' +
                '  Example: ' + colors.yellow('--extra "' + error.details);
            }
            console.log(colors.red('[ERROR]') + ' ' + errorMessage);
          });
        } catch (error) {
          console.log(colors.red('[ERROR]') + ' ' + error);
        }
      });

    program
      .parse();
  }
}

module.exports = SysWatcher;
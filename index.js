const commander = require('commander');
const colors    = require('colors');
const fs        = require('fs');
const path      = require('path');
const requireS  = require('require-from-string');

const Application = require(__dirname + '/libs/Application.js');

class SysWatcher {

  start() {

    function showHelp(application) {

      const watcherCli = 'node watcher.js';

      console.log('Usage');
      console.log('  ' + watcherCli + ' <command> [sub-commmand] [options]');
      console.log('');
      console.log('Commands:');
      console.log('  start                                ' + colors.yellow('Start watcher'));
      console.log('  send-message <logger-name> <message> ' + colors.yellow('Send message to specific logger'));
      console.log('  scripts                              ' + colors.yellow('Show list of supported scripts'));
      console.log('  run-script <script-name>             ' + colors.yellow('Run specific script'));
      console.log('');
      console.log('Options:');
      console.log('  -c, --config ' + colors.yellow('Config file name'));
      console.log('  -e, --extra  ' + colors.yellow('Extra paramateres, usefull for sending messages using not fully configured loggers'));

      if (application) {
        let configParam = commander.config ? ' --config ' + commander.config : '';
        console.log('');
        console.log('Configuration file:');
        console.log('  ' + application.getConfigFileName());
        console.log('');
        console.log('Available script commands:');
        let max = 0;
        application.getScriptsManager().getEntries().forEach(function(entry, scriptName) {
          max = Math.max(max, ('  ' + watcherCli + ' run-script ' + scriptName + configParam).length);
        });
        application.getScriptsManager().getEntries().forEach(function(entry, scriptName) {
          console.log(('  ' + watcherCli + ' run-script ' + scriptName + configParam).padEnd(max, ' ') + ' ' + colors.yellow(entry.config.name));
        });

        console.log('');
        console.log('Available send message commands:');
        max = 0;
        application.getLoggersManager().getEntries().forEach(function(entry, loggerName) {
          max = Math.max(max, ('  ' + watcherCli + ' send-message ' + loggerName + ' <message>' + configParam).length);
        });
        application.getLoggersManager().getEntries().forEach(function(entry, loggerName) {
          console.log(('  ' + watcherCli + ' send-message ' + loggerName + ' <message>' + configParam).padEnd(max, ' ') + ' ' + colors.yellow(entry.getInstance().getDescription()));
        });
      }

    }

    commander
      .option('-c, --config [filename]', 'Config file name')
      .option('-e, --extra [JSON]', 'Parameters in JSON format')
      .parse(process.argv);

    let application;
    try {
      let configFileName = commander.config || 'config.js';
      let configFilePath = path.resolve(process.cwd(), configFileName);
      if (!fs.existsSync(configFilePath)) {
        configFilePath = path.resolve(process.cwd(), 'config/' + configFileName);
        if (!fs.existsSync(configFilePath)) {
          if (!commander.config) {
            throw 'Parameters validation error:\n  Missing --config option';
          }
          throw 'Configuration file ' + configFileName + ' not found';
        }
      }
      switch(commander.args[0]) {
        case 'run-script':
          if (commander.args.length == 1) {
            throw 'Parameters validation error:\n  Missing <script-name> parameter';
          }
          break;
        case 'send-message':
          if (commander.args.length == 1) {
            throw 'Parameters validation error:\n  Missing <logger-name> and <message> parameters';
          }
          if (commander.args.length == 2) {
            throw 'Parameters validation error:\n  Missing <message> parameter';
          }
          break;
      }
      application = new Application(configFilePath);
      if (commander.args[0] == 'start') {
        application.start();
      } else {
        try {
          switch(commander.args[0]) {
            case 'scripts':
              showHelp(application);
              break;
            case 'run-script':
              application.getScriptsManager().getInstance(commander.args[1]).exec();
              break;
            case 'send-message':
              let extra = Object.create({ });
              if (commander.extra) {
                try {
                  extra = requireS('module.exports = ' + commander.extra);
                } catch (error) {
                  throw 'Incorrect format of extra parameter: ' + error;
                }
              }
              application.notifyLogger(commander.args[1], { message: commander.args[2] }, null,  null, { settings: extra }).then(function(result) {

              }).catch(function(error) {
                error = error || 'Unknown error';
                error = (typeof error == 'string' ? { error: error } : error);
                let errorMessage = colors.red(error.error) + '\n';
                if (error.details) {
                  errorMessage += '  You can specify additional parameters via ' + colors.yellow('--extra') + '\n' +
                                  '  Example: ' + colors.yellow('--extra "' + error.details + '"\n');
                }
                showHelp(application);
                console.log('');
                console.log(errorMessage);
              });
              break;
            default:
              throw 'Parameters validation error:\n  Missing or unknown <command> parameter';
          }
        } finally {
          application.stop();
        }
      }
    } catch (error) {
      showHelp(application);
      console.log('');
      console.log(colors.red(error));
    }

  }

}

module.exports = SysWatcher;

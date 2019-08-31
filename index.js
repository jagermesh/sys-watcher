const commander = require('commander');
const colors    = require('colors');
const fs        = require('fs');
const path      = require('path');
const requireS  = require('require-from-string');

const Application = require(__dirname + '/libs/Application.js');

class SysWatcher {

  start() {

    function showHelp(application) {

      console.log('Usage');
      console.log('  watcher-cli <command> [sub-commmand] [options]');
      console.log('');
      console.log('Commands:');
      console.log('  watcher-cli start                                ' + colors.yellow('Start watcher'));
      console.log('  watcher-cli send-message <logger-name> <message> ' + colors.yellow('Send message to specific logger'));
      console.log('  watcher-cli scripts                              ' + colors.yellow('Show list of supported scripts'));
      console.log('  watcher-cli run-script <script-name>             ' + colors.yellow('Run specific script'));
      console.log('');
      console.log('Options:');
      console.log('  -c, --config ' + colors.yellow('Config file name'));
      console.log('  -e, --extra  ' + colors.yellow('Extra paramateres, usefull for sending messages using not fully configured loggers'));

      let max;

      if (application) {
        console.log('');
        console.log('Available script commands:');
        max = 0;
        application.getScriptsManager().getEntries().forEach(function(scriptConfig, scriptName) {
          max = Math.max(max, ('  watcher-cli run-script ' + scriptName + ' --config ' + application.configFile).length);
        });
        application.getScriptsManager().getEntries().forEach(function(scriptConfig, scriptName) {
          console.log(('  watcher-cli run-script ' + scriptName + ' --config ' + application.configFile).padEnd(max, ' ') + ' ' + colors.yellow(scriptConfig.name));
        });

        console.log('');
        console.log('Available send message commands:');
        max = 0;
        application.getLoggersManager().getEntries().forEach(function(logger, loggerName) {
          max = Math.max(max, ('  watcher-cli send-message ' + loggerName + ' <message>').length);
        });
        application.getLoggersManager().getEntries().forEach(function(logger, loggerName) {
          console.log(('  watcher-cli send-message ' + loggerName + ' <message>').padEnd(max, ' ') + ' ' + colors.yellow(logger.getInstance().getDescription()));
        });
      }

      console.log('');
      console.log('Available configs:');

      let configs = [];
      let configsFolder = process.cwd() + '/config';
      if (fs.existsSync(configsFolder)) {
        let files = fs.readdirSync(configsFolder);
        max = 0;
        for(let i = 0; i < files.length; i++) {
          if (/config.+?[.]js/.test(files[i])) {
            let filename = configsFolder + '/' + files[i];
            let config = require(filename);
            if (config.globals) {
              if (config.globals.location) {
                configs.push({ location: config.globals.location, name: files[i]});
                max = Math.max(max, ('  watcher-cli --config ' + files[i]).length);
              }
            }
          }
        }
      }

      for(let j = 0; j < configs.length; j++) {
        console.log(('  watcher-cli --config ' + configs[j].name).padEnd(max, ' ') + ' ' + colors.yellow(configs[j].location));
      }

    }

    commander
      .option('-c, --config [filename]', 'Config file name')
      .option('-e, --extra [JSON]', 'Parameters in JSON format')
      .parse(process.argv);

    let application;
    try {
      if (commander.config) {
        let configFile = commander.config;
        configFile = path.resolve(process.cwd(), configFile);
        try {
          fs.statSync(configFile);
        } catch (error) {
          throw 'Can not load configuration from ' + configFile + ':\n  ' + error;
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
        application = new Application(configFile);
        if (commander.args[0] == 'start') {
          application.start();
        } else {
          try {
            switch(commander.args[0]) {
              case 'scripts':
                showHelp(application);
                break;
              case 'run-script':
                application.getExecPool().exec(commander.args[1], commander.extra);
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
      } else {
        throw 'Parameters validation error:\n  Missing --config option';
      }
    } catch (error) {
      showHelp(application);
      console.log('');
      console.log(colors.red(error));
    }

  }

}

module.exports = SysWatcher;

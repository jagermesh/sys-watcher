const fs = require('fs');

const CustomManager = require(`${__dirname}/CustomManager.js`);

function LoggersManager(application, config) {
  let folder = 'components/logger';

  config = Object.assign({
  }, config);

  let files = fs.readdirSync(`${__dirname}/../${folder}/`);

  for (let i = 0; i < files.length; i++) {
    if (/.*?Logger[.]js$/.test(files[i])) {
      let loggerName = files[i].replace('.js', '');
      if (config[loggerName]) {
        throw Error(`Error: you can not give logger entry name same as logger class name: ${loggerName}`);
      } else {
        config[loggerName] = {
          type: loggerName
        };
      }
    }
  }

  CustomManager.call(this, application, 'LoggersManager', config, application, folder);
}

module.exports = LoggersManager;
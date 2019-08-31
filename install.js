const colors = require('colors');
const child_process = require('child_process');

const watcherCli = '/usr/local/bin/watcher-cli';

child_process.exec('rm ' + watcherCli, function(error, stdout, stderr) {
  child_process.exec('ln -s ' + __dirname + '/watcher.js ' + watcherCli, function(error, stdout, stderr) {
    if (error) {
      console.log(colors.red('Error installing watcher-cli: ' + error));
    } else {
      child_process.exec('chmod 755 ' + watcherCli);
    }
  });
});

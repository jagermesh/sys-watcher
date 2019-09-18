# System Watcher

## Setup

1) Add NPM package

```shell
npm init
npm install --save sys-watcher
```

2) Create `watcher.js` with following code as an example

```javascript
const SysWatcher = require('sys-watcher');

let watcher = new SysWatcher();

watcher.start();
```

3) Create `config.js` with following code as an example

```javascript
module.exports =
  { caching: {
      file3min: {
        type: 'FileCache'
      , settings: {
          lifespan: '3 min'
        }
      }
    , redis3min: {
        type: 'RedisCache'
      , settings: {
          lifespan: '3 min'
        }
      }
    }
  , loggers: {
      email: {
        type: 'MailLogger'
      , settings: {
          recipients: [ '<your e-mail address>' ]
        , sender: '<sender e-mail address>'
        }
      , composing: {
          format: 'text'
        , hostInfo: true
        , locationInSubject: true
        , subject: 'Error report'
        }
      }
    , slackChannel: {
        type: 'SlackLogger'
      , settings: {
          kind: 'webhook'
        , webHooks: [ '<url to channel webhook>' ]
        }
      , composing: {
          hostInfo: true
        }
      }
    , slackDirect: {
        type: 'SlackLogger'
      , settings: {
          kind: 'direct'
        , token: '<slack app token>'
        , recipients: [ '<slack recipient>' ]
        }
      , composing: {
          hostInfo: true
        }
      }
    , telegram: {
        type: 'TelegramLogger'
      , settings: {
          token: '<telegram bot token>'
        , recipients: [ <telegram user ID> ]
        }
      , composing: {
          hostInfo: true
        }
      }
    , AWSFreeSpaceCloudWatch: {
        type: 'AWSCloudWatchLogger'
      , settings: {
          metricName: 'FreeSpace'
        , nameSpace: 'TESTING'
        , units: 'Bytes'
        , AWS: {
            region: 'us-east-1'
          , accessKeyId: '<AWS Access Key>'
          , secretAccessKey: '<AWS Secret>'
          }
        }
      , composing: {
          hostInfo: true
        , locationInfo: true
        }
      }
    }
  , globals: {
      location: '<Name of your server>'
    , onStart: {
        composing: {
          hostInfo: true
        }
      , loggers: [ 'email', 'slackDirect' ]
      , cache: 'file3min'
      }
    , onError: {
        loggers: [ 'slackChannel', 'telegram' ]
      , composing: {
          hostInfo: true
        }
      , cache: 'redis3min'
      }
    }
  , watchers: {
      freeSpaceWatcher: {
        type: 'FreeSpaceWatcher'
      , settings: {
          path: '/'
        , threshold: '1 Gb'
        }
      , loggers: [ 'email', 'slackDirect' ]
      , scheduling: {
          interval: '5 min'
        }
      }
    , freeRAMWatcher: {
        type: 'FreeRAMWatcher'
      , settings: {
          threshold: '16 Gb'
        }
      , loggers: [ 'email', 'slackDirect' ]
      , scheduling: {
          interval: '1 min'
        }
      }
    , apacheErrorLog: {
        type: 'FileWatcher'
      , settings: {
          path: [ '/var/log/httpd/error_log' ]
        , rules: {
            all: {
              match: [ '([0-9]+[/][0-9]+[/][0-9]+ [0-9]+\:[0-9]+\:[0-9]+ \[error\] [0-9#]+\: [0-9*]+) (.+)' ]
            , cacheKey: '$2'
            }
          }
        }
      , loggers: [ 'email', 'slackDirect' ]
      , cache: 'redis3min'
      }
    , CMWatcher: {
        type: 'ConfigurationWatcher'
      , settings: {
          rules:[
            { cmd: 'node -v', check: '(8|10).16.(0|1|2)' }
          ]
        }
      , scheduling: {
          interval: '60 minutes'
        }
      , loggers: [ 'email', 'slackDirect' ]
      , cache: 'redis'
      }
    }
  };
```

4) Run the watcher

```shell
node watcher.js start
```

## Run using pm2 [http://pm2.keymetrics.io](http://pm2.keymetrics.io).

The best way to make sure watcher is always up and running is to use pm2.

1) Create `ecosystem.config.yml` using following code as an example:

```yaml
apps:
  - script      : ./watcher.js
    name        : 'Watcher'
    cwd         : '/usr/local/node/sys-watcher/'
    args        : 'start --config config.js'
    treekill    : false
    watch       : true
    watch_delay : 1000
    ignore_watch:
      - .git
      - node_modules
    error_file  : '/var/log/node/sys-watcher.err'
    out_file    : '/var/log/node/sys-watcher.log'
    combine_logs: true
    max_memory_restart: '200M'
```

2) Run watcher through pm2

```shell
pm2 start
```

3) Check it's running using

```shell
pm2 ls
```

4) Check logs using

```shell
pm2 logs
```

## Components

### Watchers

- AWSSQSWatcher
- ConfigurationWatcher
- CronWatcher
- DirectoryWatcher
- FileWatcher
- FreeRAMWatcher
- FreeSpaceWatcher
- GitHubWebHookWatcher
- HTTPWatcher
- MailQueueWatcher
- MySQLWatcher
- ProcessWatcher
- RabbitMQWatcher
- SSLCertificateWatcher
- WebWatcher

### Caching engines

- FileCache
- RedisCache

### Loggers

- AWSCloudWatchLogger
- ConsoleLogger
- MailLogger
- RabbitMQLogger
- SlackLogger
- TelegramLogger
module.exports = {
  globals: {
    location: 'localhost',
    onStart: {
      composing: {
        hostInfo: true
      }
    },
    onError: {
      composing: {
        hostInfo: true
      }
    }
  },
  loggers: {},
  watchers: {
    freeSpaceWatcher: {
      type: 'FreeSpaceWatcher',
      settings: {
        path: '/',
        threshold: '100 Gb'
      },
      scheduling: {
        interval: '10 sec'
      }
    },
    freeRAMWatcher: {
      type: 'FreeRAMWatcher',
      settings: {
        // threshold: '4 Gb'
      },
      scheduling: {
        interval: '3 sec'
      }
    },
    laWatcher: {
      type: 'LAWatcher',
      settings: {},
      scheduling: {
        interval: '3 sec'
      }
    },
    cpuWatcher: {
      type: 'CPUWatcher',
      scheduling: {
        interval: '3 sec'
      }
    },
    processWatcher: {
      type: 'ProcessWatcher',
      settings: {
        rules: {
          cron: {
            check: 'watcher.js',
            mode: 'log-count,log-cpu,limit-cpu,limit-uptime,keepalive',
            cpu_period: '1 min',
            cpu_threshold: 50,
            cpu_log_threshold: 10,
            uptime_threshold: '30 min',
          },
        }
      },
      scheduling: {
        interval: '30 sec'
      }
    },
    monitoringSensorWatcher: {
      type: 'MonitoringSensorWatcher',
      settings: {
        metrics: [
          // CPU
          {
            name: 'CPU',
            rendererName: 'Chart,Value,Table,Gauge'
          }, {
            name: 'CPU',
            rendererName: 'Chart,Value,Table,Gauge',
            settings: {
              processes: 'php,node'
            }
          },
          // RAM
          {
            name: 'RAM',
            rendererName: 'Chart,Value,Table,Gauge'
          },
          // LA
          {
            name: 'LA',
            rendererName: 'Chart,Value,Table,Gauge'
          },
          // Processes
          {
            name: 'Processes',
            rendererName: 'Chart,Value,Table'
          }, {
            name: 'Processes',
            rendererName: 'Chart,Value,Table',
            settings: {
              processes: 'php,node'
            }
          },
          // HDD
          {
            name: 'HDD',
            rendererName: 'Chart,Value,Table'
          }, {
            name: 'HDD',
            rendererName: 'Chart,Value,Table',
            settings: {
              mounts: '/System/Volumes/Data',
              threshold: 80
            }
          },
          // Jenkins
          {
            name: 'Jenkins',
            rendererName: 'Chart,Value,Table',
            settings: {
              apiUrl: 'http://localhost:8080/job/project/',
              username: 'admin',
              password: '11acff4a9f050afc3787c908c0812c3c8d',
            }
          },
          // MySQLProcesses
          {
            name: 'MySQLProcesses',
            rendererName: 'Chart,Value,Table',
            settings: {
              host: 'localhost',
              user: 'root',
              password: ''
            }
          },
          // MySQL
          {
            name: 'MySQL',
            rendererName: 'Chart,Value,Table',
            settings: {
              host: 'localhost',
              user: 'root',
              password: '',
              database: '',
              sql: 'SHOW PROCESSLIST',
              description: 'MySQL Process List'
            }
          },
        ]
      }
    }
  }
};
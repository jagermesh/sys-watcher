module.exports ={
  globals: {
    location: 'localhost'
  , onStart: {
      composing: {
        hostInfo: true
      }
    }
  , onError: {
      composing: {
        hostInfo: true
      }
    }
  }
, loggers: {
  }
, watchers: {
    freeSpaceWatcher: {
      type: 'FreeSpaceWatcher'
    , settings: {
        path: '/'
      , threshold: '100 Gb'
      }
    , scheduling: {
        interval: '10 sec'
      }
    }
  , freeRAMWatcher: {
      type: 'FreeRAMWatcher'
    , settings: {
        // threshold: '4 Gb'
      }
    , scheduling: {
        interval: '3 sec'
      }
    }
  , laWatcher: {
      type: 'LAWatcher'
    , settings: {
      }
    , scheduling: {
        interval: '3 sec'
      }
    }
  , cpuWatcher: {
      type: 'CPUWatcher'
    , scheduling: {
        interval: '3 sec'
      }
    }
  , monitoringSensorWatcher: {
      type: 'MonitoringSensorWatcher'
    , settings: {
        metrics: [
          // CPU
          { name: 'CPU'
          , refreshInterval: 1000
          , rendererName: 'Chart'
          },
          { name: 'CPU'
          , refreshInterval: 1000
          , rendererName: 'Chart'
          , settings: {
              processes: 'php,node'
            }
          },
          { name: 'CPU'
          , rendererName: 'Value'
          , refreshInterval: 1000
          },
          { name: 'CPU'
          , rendererName: 'Value'
          , refreshInterval: 1000
          , settings: {
              processes: 'php,node'
            }
          },
          { name: 'CPU'
          , refreshInterval: 1000
          , rendererName: 'Table'
          },
          { name: 'CPU'
          , refreshInterval: 1000
          , rendererName: 'Table'
          , settings: {
              processes: 'php,node'
            }
          },
          // RAM
          { name: 'RAM'
          , rendererName: 'Chart'
          , refreshInterval: 1000
          },
          { name: 'RAM'
          , rendererName: 'Value'
          , refreshInterval: 1000
          },
          { name: 'RAM'
          , rendererName: 'Table'
          , refreshInterval: 1000
          },
          // LA
          { name: 'LA'
          , rendererName: 'Chart'
          , refreshInterval: 1000
          },
          { name: 'LA'
          , rendererName: 'Value'
          , refreshInterval: 1000
          },
          { name: 'LA'
          , rendererName: 'Table'
          , refreshInterval: 1000
          },
          // Processes
          { name: 'Processes'
          , rendererName: 'Chart'
          , refreshInterval: 5000
          },
          { name: 'Processes'
          , rendererName: 'Value'
          , refreshInterval: 5000
          },
          { name: 'Processes'
          , rendererName: 'Table'
          , refreshInterval: 5000
          },
          { name: 'Processes'
          , rendererName: 'Chart'
          , refreshInterval: 5000
          , settings: {
              processes: 'php,node'
            }
          },
          { name: 'Processes'
          , rendererName: 'Value'
          , refreshInterval: 5000
          , settings: {
              processes: 'php,node'
            }
          },
          { name: 'Processes'
          , rendererName: 'Table'
          , refreshInterval: 5000
          , settings: {
              processes: 'php,node'
            }
          },
          // HDD
          { name: 'HDD'
          , rendererName: 'Chart'
          , refreshInterval: 1000
          },
          { name: 'HDD'
          , refreshInterval: 1000
          , rendererName: 'Table'
          },
          { name: 'HDD'
          , refreshInterval: 1000
          , rendererName: 'Value'
          },
          { name: 'HDD'
          , refreshInterval: 1000
          , rendererName: 'Chart'
          , settings: {
              mounts: '/System/Volumes/Data'
            , threshold: 80
            }
          },
          { name: 'HDD'
          , refreshInterval: 1000
          , rendererName: 'Table'
          , settings: {
              mounts: '/System/Volumes/Data'
            }
          },
          { name: 'HDD'
          , refreshInterval: 1000
          , rendererName: 'Value'
          , settings: {
              mounts: '/System/Volumes/Data'
            }
          },
          // MySQLProcesses
          { name: 'MySQLProcesses'
          , refreshInterval: 5000
          , rendererName: 'Chart'
          , settings: {
              host: 'localhost'
            , user: 'root'
            , password: ''
            }
          },
          { name: 'MySQLProcesses'
          , refreshInterval: 5000
          , rendererName: 'Table'
          , settings: {
              host: 'localhost'
            , user: 'root'
            , password: ''
            }
          },
          { name: 'MySQLProcesses'
          , refreshInterval: 5000
          , rendererName: 'Value'
          , settings: {
              host: 'localhost'
            , user: 'root'
            , password: ''
            }
          },
        ]
      }
    }
  }
};
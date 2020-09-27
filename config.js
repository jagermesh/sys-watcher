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
    , cache: 'redis'
    }
  }
, loggers: {
    monitoringHub: {
      type: 'MonitoringHubLogger'
    , settings: {

      }
    }
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
    , loggers: [ 'monitoringHub' ]
    }
  , laWatcher: {
      type: 'LAWatcher'
    , settings: {
      }
    , scheduling: {
        interval: '3 sec'
      }
    , loggers: [ 'monitoringHub' ]
    }
  , cpuWatcher: {
      type: 'CPUWatcher'
    , settings: {
      }
    , scheduling: {
        interval: '3 sec'
      }
    , loggers: [ 'monitoringHub' ]
    }
  }
};
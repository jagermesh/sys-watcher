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
        threshold: '4 Gb'
      }
    , scheduling: {
        interval: '30 sec'
      }
    }
  , laWatcher: {
      type: 'LAWatcher'
    , settings: {
      }
    , scheduling: {
        interval: '5 sec'
      }
    , loggers: [ 'monitoringHub' ]
    }
  }
};
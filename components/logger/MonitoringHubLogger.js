const socketClient = require('socket.io-client');
const uuid         = require('uuid');
const os           = require('os');

const CustomLogger = require(__dirname + '/../../libs/CustomLogger.js');

function MonitoringHubLogger(application, name, config) {

  CustomLogger.call(this, application, name, config);

  const _this = this;

  _this.config.settings.hubUrl = _this.config.settings.hubUrl || 'http://localhost:8082';

  let initialized;
  let hubConnection;
  let sensors = [];
  let registered = false;

  function registerSensors() {
    for(let sensorUid in sensors) {
      let sensor = sensors[sensorUid];
      if (!sensor.registered) {
        _this.getApplication().getConsole().log('Registering sensor', { sensorUid: sensorUid }, _this);
        hubConnection.emit('registerSensor', sensor.sensorInfo);
      }
    }
  }

  function initialize() {
    if (initialized) {
      return;
    }

    initialized = true;

    _this.getApplication().getConsole().log('Connecting to hub', { hubUrl: _this.config.settings.hubUrl }, _this);

    hubConnection = socketClient.connect(_this.config.settings.hubUrl, { reconnect: true });

    hubConnection.on('connect', function() {
      _this.getApplication().getConsole().log('Connected to hub', { hubUrl: _this.config.settings.hubUrl }, _this);
      registerSensors();
    });

    hubConnection.on('sensorRegistered', function(data) {
      let sensor = sensors[data.sensorInfo.sensorUid];
      if (sensor) {
        sensor.registered = true;
        hubConnection.emit('sensorData', sensor.sensorData);
      }
    });

    hubConnection.on('disconnect', function(a) {
      _this.getApplication().getConsole().log('Disonnected from hub', { hubUrl: _this.config.settings.hubUrl }, _this);
      for(let sensorUid in sensors) {
        sensors[sensorUid].registered = false;
      }
    });
  }

  function sendData(sensorUid) {
  }

  _this.getRecipients = function() {

    // return _this.config.settings.exchangeName;

  };

  _this.log = function(data, details, senders, config) {

    return new Promise(function(resolve, reject) {

      if (data && data.sensorInfo && data.sensorData) {
        let sensorUid = data.sensorInfo.sensorUid;
        let sensor = { sensorInfo: data.sensorInfo
                     , sensorData: data.sensorData
                     , registered: sensors[sensorUid] ? sensors[sensorUid].registered : false
                     };
        sensors[sensorUid] = sensor;
        if (hubConnection && hubConnection.connected) {
          if (sensor.registered) {
            hubConnection.emit('sensorData', sensor.sensorData);
          } else {
            registerSensors();
          }
        } else {
          initialize();
        }
      }

      resolve();

    });

  };

}

module.exports = MonitoringHubLogger;

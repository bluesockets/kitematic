require.main.paths.splice(0, 0, process.env.NODE_PATH);
var remote = require('remote');
var ContainerStore = require('./ContainerStore');
var Menu = remote.require('menu');
var React = require('react');
var SetupStore = require('./SetupStore');
var bugsnag = require('bugsnag-js');
var ipc = require('ipc');
var machine = require('./DockerMachine');
var metrics = require('./Metrics');
var router = require('./Router');
var template = require('./MenuTemplate');
var webUtil = require('./WebUtil');

webUtil.addWindowSizeSaving();
webUtil.addLiveReload();
webUtil.addBugReporting();
webUtil.disableGlobalBackspace();

Menu.setApplicationMenu(Menu.buildFromTemplate(template()));

metrics.track('Started App');
metrics.track('app heartbeat');
setInterval(function () {
  metrics.track('app heartbeat');
}, 14400000);

router.run(Handler => React.render(<Handler/>, document.body));

SetupStore.setup().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate(template()));
  ContainerStore.on(ContainerStore.SERVER_ERROR_EVENT, (err) => {
    bugsnag.notify(err);
  });
  ContainerStore.init(function () {
    router.transitionTo('containers');
  });
}).catch(err => {
  metrics.track('Setup Failed', {
    step: 'catch',
    message: err.message
  });
  console.log(err);
  bugsnag.notify(err);
});

ipc.on('application:quitting', opts => {
  if (!opts.updating && localStorage.getItem('settings.closeVMOnQuit') === 'true') {
    machine.stop();
  }
});

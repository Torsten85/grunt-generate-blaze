var spawnSync = require('spawn-sync');
var spawn = function (cmd, cwd) {

  var options = cwd ? {cwd: cwd}: {};

  if (process.platform === 'win32') {
    options.windowsVerbatimArguments = true;
    return spawnSync('cmd.exe', ['/s', '/c', '"' + cmd + '"'], options);
  }

  return spawnSync('/bin/sh', ['-c', cmd], options);
};

module.exports = spawn;
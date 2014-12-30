var spawn = require('./spawn');

var Meteor = (function () {

  var cwd;

  var parseOutput = function (sp) {
    var output = '';
    Array.prototype.slice.call(sp.output).forEach(function (line) {
      if (line)
        output += String(line).trim();
    });

    return output.trim();
  };

  var METEOR = parseOutput(spawn('which meteor'));

  var fn = function (method, params) {
    return parseOutput(spawn(METEOR + ' ' + method + ' ' + params, cwd));
  };

  fn.setCwd = function (_cwd) {
    cwd = _cwd;
  };

  return fn;
})();

module.exports = Meteor;
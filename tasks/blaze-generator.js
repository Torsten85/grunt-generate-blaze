module.exports = function (grunt) {


  grunt.registerTask('generateBlaze', 'Generates Blaze', function () {
    var fs = require('fs');
    var Generator = require('../generator');

    var options = this.options();
    var target = options.target;

    if (!target) {
      try {
        var bowerrc = fs.readFileSync('.bowerrc').toString();
        target = JSON.parse(bowerrc).directory;
      } catch(e) {}

      if (!target)
        target = 'bower_components/';

      target += 'blaze';
    }

    new Generator(target);
    grunt.log.writeln('All Done');

  });

};
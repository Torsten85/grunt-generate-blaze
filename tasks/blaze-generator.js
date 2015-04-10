function generate(grunt, generatorName, packageName) {
  var fs = require('fs');
  var Generator = require(generatorName);

  var options = this.options();
  var target = options.target;

  if (!target) {
    try {
      var bowerrc = fs.readFileSync('.bowerrc').toString();
      target = JSON.parse(bowerrc).directory;
    } catch(e) {}

    if (!target)
      target = 'bower_components/';

    target += packageName;
  }

  new Generator(target);
  grunt.log.writeln('All Done');
}

module.exports = function (grunt) {


  grunt.registerTask('generateBlaze', 'Generates Blaze', function () {

    generate.call(this, grunt, '../generator', 'blaze');

  });

  grunt.registerTask('generateIronRouter', 'Generates Iron Router', function () {

    generate.call(this, grunt, '../iron_generator', 'iron');

  });

};
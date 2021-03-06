var Generator = function (targetPath) {

  var FileProcessor = require('./file_processor');
  FileProcessor.SKIP_PACKAGES = ['deps', 'underscore', 'jquery', 'autopublish', 'insecure', 'json', 'global-imports', 'minifiers', 'ddp'];
  FileProcessor.ROOT_PACKAGE = 'blaze';

  FileProcessor.exceptionFor('minimongo', {
    exports: ['LocalCollection']
  });

  FileProcessor.exceptionFor('blaze', {
    exports: ['Blaze'],
    requirePath: './main',
    shyExports: ['UI', 'Handlebars']
  });

  FileProcessor.exceptionFor('ejson', {
    exports: ['EJSON']
  });

  FileProcessor.exceptionFor('jquery', {
    requirePath: 'jquery'
  });

  FileProcessor.exceptionFor('underscore', {
    requirePath: 'underscore'
  });

  FileProcessor.exceptionFor('tracker', {
    exports: ['Tracker']
  });

  FileProcessor.exceptionFor('meteor', {
    skipFiles: ['startup_client.js'],
    addContent: 'Meteor.startup = function (fct) { fct(); };'
  });

  FileProcessor.addFile('minimongo_mock', {
    content: __dirname + '/additions/minimongo.js'
  });

  var Meteor = require('./meteor');
  var spawn = require('./spawn');

  var APP_NAME = 'exporter';

  var TMP_PATH = __dirname + '/tmp/';
  var APP_PATH = TMP_PATH + APP_NAME;
  var BUNDLE_PATH = TMP_PATH + APP_NAME + '.bundle';
  var PACKAGES_PATH = BUNDLE_PATH + '/programs/web.browser/packages';

  var PACKAGES = ['templating', 'blaze', 'spacebars', 'reactive-var', 'spacebars-compiler'];

  function start(task) {
    process.stdout.write('\u001b[90m' + task + '...\u001b[39m');
  }

  function done() {
    console.log('\u001b[32mOK\u001b[39m');
  }

  // Ensure project is not existing
  start('Cleaning Up');
  spawn('rm -rf "' + targetPath + '/*"');
  spawn('rm -rf "' + TMP_PATH + '"*');
  done();

  // Create project
  start('Creating temporary project');
  Meteor('create', '"' + APP_PATH + '"');
  Meteor.setCwd(APP_PATH);
  done();

  // Remove unused files
  start('Preparing temporary project');
  spawn('rm ' + APP_NAME + '.*', APP_PATH);


  // Remove default packages
  Meteor('remove', 'meteor-platform');

  // Add packages
  Meteor('add', PACKAGES.join(' '));
  done();

  // Bundling
  start('Bundling');
  Meteor('bundle', '"' + BUNDLE_PATH + '" --directory --debug');
  done();

  start('Writing Files');
  var fs = require('fs');
  var files = fs.readdirSync(PACKAGES_PATH);

  files.forEach(function (file) {

    var path = PACKAGES_PATH + '/' + file;
    var processedFile = FileProcessor.process(path);
    if (processedFile !== null) {
      var pkg = FileProcessor.getPackageNameFromPath(path);
      var filename = pkg === FileProcessor.ROOT_PACKAGE ? targetPath + '/main.js' : targetPath + '/' + pkg + '.js';
      fs.writeFileSync(filename, processedFile);
    }

  });

  FileProcessor.getAdditions().forEach(function (addition) {
    console.log(targetPath + '/' + addition.filename + '.js');
    fs.writeFileSync(targetPath + '/' + addition.filename + '.js', addition.content);
  });

  done();
};

module.exports = Generator;
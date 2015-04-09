var Generator = function (targetPath) {

  var FileProcessor = require('./file_processor');
  FileProcessor.SKIP_PACKAGES = [
    'deps',
    'underscore',
    'jquery',
    'json',
    'random',
    'reload',
    'reactive-var',
    'htmljs',
    'id-map',
    'meteor',
    'minimongo',
    'insecure',
    'blaze',
    'ordered-dict',
    'templating',
    'tracker',
    'base64',
    'autopublish',
    'ejson',
    'ui',
    'observe-sequence'
  ];

  FileProcessor.ROOT_PACKAGE = 'iron:router';

  FileProcessor.exceptionFor('underscore', {
    requirePath: 'underscore'
  });

  FileProcessor.exceptionFor('jquery', {
    requirePath: 'jquery'
  });

  FileProcessor.exceptionFor('spacebars', {
    requirePath: 'blaze/spacebars'
  });

  FileProcessor.exceptionFor('tracker', {
    requirePath: 'blaze/tracker',
    shyExports: ['Deps']
  });

  FileProcessor.exceptionFor('random', {
    requirePath: 'blaze/random'
  });

  FileProcessor.exceptionFor('meteor', {
    requirePath: 'blaze/meteor'
  });

  FileProcessor.exceptionFor('ejson', {
    requirePath: 'blaze/ejson'
  });

  FileProcessor.exceptionFor('templating', {
    requirePath: 'blaze/templating'
  });

  FileProcessor.exceptionFor('spacebars', {
    requirePath: 'blaze/spacebars'
  });

  FileProcessor.exceptionFor('blaze', {
    requirePath: 'blaze'
  });

  FileProcessor.exceptionFor('reactive-var', {
    requirePath: 'blaze/reactive-var'
  });

  FileProcessor.exceptionFor('htmljs', {
    requirePath: 'blaze/htmljs'
  });

  FileProcessor.exceptionFor('iron:core', {
    skipFiles: ['lib/version_conflict_error.js']
  });

  FileProcessor.exceptionFor('iron:dynamic-template', {
    skipFiles: ['version_conflict_error.js'],
    imports: {
      'blaze': ['Blaze'],
      'spacebars': ['Spacebars']
    },
    replace: [
      {
        pattern: 'UI.registerHelper',
        replace: 'Template.registerHelper'
      }
    ]
  });

  FileProcessor.exceptionFor('iron:layout', {
    skipFiles: ['version_conflict_errors.js'],
    imports: {
      'tracker': ['Tracker'],
      'iron:core': [],
      'iron:dynamic-template': [],
      'spacebars': ['Spacebars']
    },
    replace: [
      {
        pattern: /UI\.registerHelper/g,
        replace: 'Template.registerHelper'
      }
    ]
  });

  FileProcessor.exceptionFor('iron:location', {
    imports: {
      'iron:core': [],
      'iron:url': []
    }
  });

  FileProcessor.exceptionFor('iron:middleware-stack', {
    imports: {
      'ejson': ['EJSON'],
      'iron:core': [],
      'iron:url': []
    }
  });

  FileProcessor.exceptionFor('iron:controller', {
    imports: {
      'iron:core': [],
      'iron:layout': [],
      'iron:dynamic-template': []
    }
  });


  FileProcessor.exceptionFor('iron:router', {
    skipFiles: ['lib/global_router.js'],
    imports: {
      'spacebars': ['Spacebars'],
      'iron:core': [],
      'iron:layout': [],
      'iron:middleware-stack': [],
      'iron:url': [],
      'iron:location': [],
      'iron:controller': []
    },
    replace: [
      {
        pattern: /UI\.registerHelper/g,
        replace: 'Template.registerHelper'
      }, {
        pattern: /Router\.routes\[routeName]/g,
        replace: 'window.Router.routes[routeName]'
      },
      {
        pattern: 'if (router.options.autoStart !== false)',
        replace: 'if (router.options.autoStart === true)'
      }
    ],
    exports: ['RouteController', {'Router': 'Iron.Router'}]
  });

  var Meteor = require('./meteor');
  var spawn = require('./spawn');

  var APP_NAME = 'exporter';

  var TMP_PATH = __dirname + '/tmp/';
  var APP_PATH = TMP_PATH + APP_NAME;
  var BUNDLE_PATH = TMP_PATH + APP_NAME + '.bundle';
  var PACKAGES_PATH = BUNDLE_PATH + '/programs/web.browser/packages';

  var PACKAGES = ['iron:router'];

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
  try {
    fs.mkdirSync(targetPath + '/' + FileProcessor.ROOT_PACKAGE.replace(':', '_'));
  } catch(e) {}
  var files = fs.readdirSync(PACKAGES_PATH);

  files.forEach(function (file) {

    var path = PACKAGES_PATH + '/' + file;
    var processedFile = FileProcessor.process(path);
    if (processedFile !== null) {
      var pkg = FileProcessor.getPackageNameFromPath(path);
      if (pkg.indexOf(':') > 0) {
        try {
          fs.mkdirSync(targetPath + '/' + FileProcessor.ROOT_PACKAGE.replace(':', '_') + '/' + pkg.split(':')[0])
        } catch(e) {}
      }
      var filename = pkg === FileProcessor.ROOT_PACKAGE ? targetPath + '/' + pkg.replace(':', '_') + '.js' : targetPath + '/' + FileProcessor.ROOT_PACKAGE.replace(':', '_') + '/' + pkg.replace(':', '/') + '.js';
      fs.writeFileSync(filename, processedFile);
    }

  });
  done();
};

//new Generator('test');
module.exports = Generator;
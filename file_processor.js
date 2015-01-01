var fs = require('fs');

var FileProcessor = {

  SKIP_PACKAGES: [],
  ROOT_PACKAGE: 'none',

  _processed: {},
  _exceptions: {},

  exceptionFor: function (pkg, exceptions) {
    this._exceptions[pkg] = exceptions;
  },

  getPackageNameFromPath: function (path) {
    return path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));
  },

  shouldProcess: function (path) {
    if (path.lastIndexOf('map') === path.length - 3)
      return false;


    var pkg = this.getPackageNameFromPath(path);
    return this.SKIP_PACKAGES.indexOf(pkg) === -1;
  },

  process: function (path) {
    if (!this.shouldProcess(path))
      return null;

    var pkg = this.getPackageNameFromPath(path);
    var basePath = path.substring(0, path.lastIndexOf('/') + 1);

    var processedInfo = this._processed[pkg] = {
      imports: {},
      exports: [],
      shyExports: []
    };

    if (typeof processedInfo.content !== 'undefined')
      return processedInfo.content;

    var exceptions = this._exceptions[pkg] || {};

    if (exceptions.replacement) {
      if (exceptions.exports)
        processedInfo.exports = exceptions.exports;
      return processedInfo.content = fs.readFileSync(exceptions.replacement).toString();
    }

    if (exceptions.imports)
      processedInfo.imports = exceptions.imports;

    var isRoot = pkg === this.ROOT_PACKAGE;

    try {
      var content = fs.readFileSync(path).toString();
    } catch(e) {
      processedInfo.content = null;
      return null;
    }

    // Define start
    content = content.replace(/^\(function \(\) {$/m, 'define(function (require) {\n\n var Package = {};\n\n');

    // Find and clear imports
    content = content.replace(/\/\* Imports \*\/\n((?:.|\n)+?)\n\n/, function (_, pkgs) {

      pkgs.split(/\n/).forEach(function (line) {
        var matches = line.match(/Package(?:\.|\[')((?:\w|-)+)(?:\.|'])(.+);/);
        if (!processedInfo.imports[matches[1]]) processedInfo.imports[matches[1]] = [];
        processedInfo.imports[matches[1]].push(matches[2]);
      });

      return '___IMPORT_MARKER___';

    });

    // Find additional imports
    content = content.replace(/Package(?:\.|\[')((?:\w|-)+)(?:\.|'])([^\.;]+)/g, function (_, pkg, glb) {
      if (!processedInfo.imports[pkg]) processedInfo.imports[pkg] = [];
      processedInfo.imports[pkg].push(glb);

      return glb;
    });

    // Place imports
    content = content.replace('___IMPORT_MARKER___', function () {
      var imports = [], path;

      for (var pkg in processedInfo.imports) {
        var imp = processedInfo.imports[pkg];
        var pkgExceptions = this._exceptions[pkg] || {};

        if (pkgExceptions.requirePath) {
          imports.push('var ' + imp[0] + " = require('" + pkgExceptions.requirePath + "');");
          continue;
        }

        var reqPath;
        if (isRoot)
          reqPath = './' + this.ROOT_PACKAGE + '/' + pkg;
        else if (pkg === this.ROOT_PACKAGE)
          reqPath = '../' + pkg;
        else
          reqPath = './' + pkg;

        if (!this._processed[pkg]) {
          this.process(basePath + pkg + '.js');
        }

        if (!this._processed[pkg])
          continue;

        if (this._processed[pkg].exports.length > 1) {
          var pkgName = '__' + pkg.replace('-', '_');
          imports.push('var ' + pkgName + " = require('" + reqPath + "');");
          this._processed[pkg].exports.forEach(function (exp) {
            imports.push('var ' + exp + ' = ' + pkgName + '.' + exp + ';');
          });
        } else if (this._processed[pkg].exports.length === 1) {
          imports.push('var ' + this._processed[pkg].exports[0] + " = require('" + reqPath + "');");
           if (this._processed[pkg].shyExports.length > 1) {
             this._processed[pkg].shyExports.forEach(function (exp) {
              if (exp !== this._processed[pkg].exports[0])
                imports.push('var ' + exp + ' = ' + this._processed[pkg].exports[0] + '._' + exp + ';');
             }.bind(this));
           }
        }
      }

      return imports.join('\n') + '\n';

    }.bind(this));

    // Exports
    content = content.replace(/\/\* Exports \*\/\n((?:.|\n)+)\n\n/, function (_, pkgs) {

      var matches = pkgs.match(/  .+:/g);
      if (!matches) return '';

      var exports = [];
      matches.forEach(function (exp) {
        exports.push(exp.replace(/( |:)/g, ''));
      });

      var ret = [];

      if (exceptions.exports) {
        processedInfo.shyExports = exports;
        exports = exceptions.exports;
        processedInfo.shyExports.forEach(function (exp) {
          ret.push(exports[0] + '._' + exp + ' = ' + exp + ';');
        });
      }

      processedInfo.exports = exports;

      if (exports.length === 1) {
        ret.push('return ' + exports[0] + ';\n\n');
        return ret.join('\n');
      }

      var exps = [];
      exports.map(function (exp) {
        exps.push(exp + ': ' + exp);
      });

      ret.push('return {\n  ' + exps.join(',\n  ') + '\n};\n\n');
      return ret.join('\n');
    });

    // Define end

    content = content.replace(/}\)\(\);\n?$/, '});');

    if (exceptions.skipFiles) {
      exceptions.skipFiles.forEach(function (file) {

        var regExp = new RegExp('\\(function \\(\\) {( |\/|\n)+packages\/' + pkg + '\/' + file + '(.|\n)+?( |\/|\n)}\\).call\\(this\\);\n');
        content = content.replace(regExp, '');

      });
    processedInfo.content = content;
    }

    return content;
  }
};


module.exports = FileProcessor;
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
    try {
      var content = fs.readFileSync(path).toString();
      var matches = content.match(/\(function \(\) {(?: |\/|\n)+packages\/([^\/]+)\//);
      return matches[1];

    } catch(e) {
      return path.substring(path.lastIndexOf('/') + 1, path.lastIndexOf('.'));
    }
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

    if (exceptions.shyExports)
      processedInfo.shyExports = exceptions.shyExports;

    var isRoot = pkg === this.ROOT_PACKAGE;
    var namespace = pkg.indexOf(':') !== -1 ? pkg.split(':')[0] : false;

    try {
      var content = fs.readFileSync(path).toString();
    } catch(e) {
      processedInfo.content = null;
      return null;
    }

    if (exceptions.skipFiles) {
      exceptions.skipFiles.forEach(function (file) {
        var regExp = new RegExp('\\(function \\(\\) {( |\/|\n)+packages\/' + pkg + '\/' + file + '(.|\n)+?( |\/|\n)}\\).call\\(this\\);\n');
        content = content.replace(regExp, '');

      });
      processedInfo.content = content;
    }

    // Define start
    content = content.replace(/^\(function \(\) {$/m, 'define(function (require) {\n\n var Package = {};\n\n');

    // Find and clear imports
    content = content.replace(/\/\* Imports \*\/\n((?:.|\n)+?)\n\n/, function (_, pkgs) {

      pkgs.split(/\n/).forEach(function (line) {
        var matches = line.match(/Package(?:\.|\[')((?:\w|-|:)+)(?:\.|']\.)(.+);/);
        if (!processedInfo.imports[matches[1]]) processedInfo.imports[matches[1]] = [];
        processedInfo.imports[matches[1]].push(matches[2]);
      });

      return '___IMPORT_MARKER___';

    });

    // Find additional imports
    content = content.replace(/Package(?:\.|\[')((?:\w|-|:)+)(?:\.|'])([^\. ;]+)/g, function (_, impPkg, glb) {
      if (impPkg === pkg) {
        return glb;
      }

      if (!processedInfo.imports[pkg]) processedInfo.imports[impPkg] = [];
      processedInfo.imports[impPkg].push(glb);

      return glb;
    });




    // Place imports
    content = content.replace('___IMPORT_MARKER___', function () {

      var imports = [];

      for (var pkg in processedInfo.imports) {

        if (!this._processed[pkg]) {
          this.process(basePath + pkg.replace(':', '_') + '.js');
        }

        var imp = processedInfo.imports[pkg];
        var pkgExceptions = this._exceptions[pkg] || {};

        if (pkgExceptions.requirePath) {
          imports.push('var ' + imp[0] + " = require('" + pkgExceptions.requirePath + "');");
          if (Array.isArray(pkgExceptions.shyExports)) {
            pkgExceptions.shyExports.forEach(function (exp) {
              if (exp !== imp[0])
                imports.push('var ' + exp + ' = ' + imp[0] + '._' + exp + ';');
            }.bind(this));
          }
          continue;
        }

        if (!this._processed[pkg])
          continue;

        var reqPath;
        if (isRoot)
          reqPath = './' + this.ROOT_PACKAGE + '/' + pkg.replace(':', '/');
        else if (pkg.indexOf(':') !== -1 && pkg.split(':')[0] === namespace)
          reqPath = './' + pkg.split(':')[1];
        else if (pkg === this.ROOT_PACKAGE || namespace !== false)
          reqPath = '../' + pkg;
        else
          reqPath = './' + pkg;

        reqPath = reqPath.replace(':', '_');

        if (this._processed[pkg].exports.length > 1) {
          var pkgName = '__' + pkg.replace('-', '_').replace(':', '_');
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
        } else {
          imports.push("require('" + reqPath +  "');");
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

      if (exceptions.addContent) {
        ret.push('\n' + exceptions.addContent + '\n');
      }

      if (exports.length === 1) {
        ret.push('return ' + exports[0] + ';\n\n');
        return ret.join('\n');
      }

      var exps = [];
      exports.map(function (exp) {
        if (typeof exp === 'string')
          exps.push(exp + ': ' + exp);
        else {
          var key = Object.keys(exp)[0];
          exps.push(key + ': ' + exp[key]);
        }
      });

      ret.push('return {\n  ' + exps.join(',\n  ') + '\n};\n\n');
      return ret.join('\n');
    });

    if (Array.isArray(exceptions.replace)) {
      exceptions.replace.forEach(function (rep) {
        content = content.replace(rep.pattern, rep.replace);
      });
    }

    // Define end

    content = content.replace(/}\)\(\);\n?$/, '});');

    return content;
  }
};


module.exports = FileProcessor;
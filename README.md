grunt-generate-blaze
====================

Generates Blaze for RequireJS based on the current meteor version

## Options
### Target
The target folder (where the files will be generated) can be specified as an grunt task option:
```javascript
grunt.initConfig({
  
  generateBlaze: {
      options: {
        target: 'path/to/my/folder'
      }
    }
  }
});
```

If you don't specifiy a target the task will look for a .bowerrc file to find the bower library directory.
The fallback will be *bower_components/blaze*.

The target directory has to exist before executing the task!

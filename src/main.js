var mustache = require('mustache');
var currentHightlight;
var Solium = window.solium;
var id = 1;
var callbacks = {};
var CONFIG_FILE = '.soliumrc.json';
window.extension = new window.RemixExtension()
let RESULTS_TEMPLATE = '{{#items}}<li class="item" onclick="window.highlight({{line}}, {{column}}, \'{{filename}}\')">{{filename}}:{{line}}:{{column}}: {{ruleName}} {{message}}</li>{{/items}}'

var defaultConfig = {
  "extends": "solium:recommended",
  "plugins": ["security"],
  "rules": {
    "quotes": ["error", "double"],
    "double-quotes": [2],   // returns a rule deprecation warning
    "pragma-on-top": 1
  },
  "options": { "returnInternalIssues": false }
}

window.highlight = function(line, column, filename) {
  var arg = { start: {line:line,column:0}, end: {line: line, column:column}}
  arg = JSON.stringify(arg);
  window.extension.call('editor', 'highlight', [arg, filename, "#FF9F33"], console.log);
}

function cleanupResults() {
  document.getElementById('resultHeading').style.visibility = 'hidden';
  document.getElementById('results').style.visibility = 'hidden';
  document.getElementById('results').innerHTML = '';
}

function setCompilationHeading(message, id = 'resultHeading') {
  document.getElementById(id).style.visibility = 'visible';
  document.getElementById(id).innerHTML = message;
}

function setResults(items, template, id = 'results') {
  var ele = document.getElementById(id);
  ele.style.visibility = 'visible';
  ele.innerHTML = mustache.render(template, {items});
}

function getCurrentFileContent(cb) {
  window.extension.call('editor', 'getCurrentFile', [], (e, files) => {
    if(e) {
      return cb(e);
    } else if(files && !files[0]) {
      return cb('No file is open');
    } else {
      window.extension.call('editor', 'getFile', [files[0]], (e, file) => {
        if(e) {
          return cb(e);
        } else {
          return cb(null, { file: file[0], filename: files[0] });
        }
      })
    }
  })
}

function fixContract(contents, config) {
  if (config.options) {
    config.options.autofix = true;
  } else {
    config.options = { autofix : true };
  }
  return Solium.lint(contents, config);
}

function lintContract(contents, config) {
  if (config.options) {
    config.options.autofix = false;
  } else {
    config.options = {
      autofix: false
    }
  }
  return Solium.lint(contents, config);
}

function makeCompilationHeading(result) {
  if(result.lint) {
    return `Solium linted ${result.filename}. It found ${result.errors.length} error(s)`;
  } else {
    var e = `Solium fixed ${result.filename}.`;
    if(result.errors.length > 0) {
      e = `${e} ${result.errors.length} error(s) were not fixed.`
    }
    return e;
  }
}

//
window.onload = function () {
  window.extension.call('config', 'getConfig', [CONFIG_FILE], (e, rc) => {
    if (e) {
      setCompilationHeading(e.toString());
    }
    else if(rc && !rc[0]) {
      window.extension.call('config', 'setConfig', [CONFIG_FILE, JSON.stringify(defaultConfig, null, 2)], (e, r) => {
        document.getElementById('configuration').value = JSON.stringify(defaultConfig, null, 2);
      })
    } else {
      document.getElementById('configuration').value = rc[0];
    }

    document.getElementById('lintButton').addEventListener('click', () => {
      cleanupResults();
      getCurrentFileContent((e, r) => {
        if(e) {
          return setCompilationHeading(e.toString());
        } else if(r.filename && r.filename.indexOf('.sol') !== r.filename.length - 4) {
          return setCompilationHeading(`Only .sol files can be linted. The current file ${r.filename} is not a solidity file`);
        } else {
          var config = document.getElementById('configuration').value;
          try {
            config = JSON.parse(config);
          } catch(e) {
            return setCompilationHeading(`config error: ${e.toString()}`);
          }
          var results = lintContract(r.file, config);
          var errors = results.map((e) => {
            e.filename = r.filename;
            return e;
          });
          setCompilationHeading(makeCompilationHeading({ lint: true, filename: r.filename, errors: errors || [] }));
          setResults(errors, RESULTS_TEMPLATE);
        }
      });
    });

    document.getElementById('fixButton').addEventListener('click', () => {
      cleanupResults();
      getCurrentFileContent((e, r) => {
        if(e) {
          return setCompilationHeading(e.toString());
        } else if(r.filename && r.filename.indexOf('.sol') !== r.filename.length - 4) {
          return setCompilationHeading(`Only .sol files can be linted. The current opened file ${r.filename} is not a solidity file`);
        } else {
          var config = document.getElementById('configuration').value;
          try {
            config = JSON.parse(config);
          } catch(e) {
            return setCompilationHeading(`config error: ${e.toString()}`);
          }
          var results = fixContract(r.file, config);
          var errors = results.errorMessages.map((e) => {
            e.filename = r.filename;
            return e;
          });
          window.extension.call('editor', 'setFile', [r.filename, results.fixedSourceCode], function(){});
          setCompilationHeading(makeCompilationHeading({ filename: r.filename, errors: errors || [] }));
          setResults(errors, RESULTS_TEMPLATE);
        }
      });
    });

    document.getElementById('configSave').addEventListener('click', (e) => {
      cleanupResults();
      var config = document.getElementById('configuration').value;
      window.extension.call('config', 'setConfig', [CONFIG_FILE, config], (e, config) => {
        if (e) {
          setCompilationHeading(e.toString());
        };
      });
    });

    document.getElementById('configReload').addEventListener('click', (e) => {
      cleanupResults();
      window.extension.call('config', 'getConfig', [CONFIG_FILE], (e, config) => {
        if (e) {
          setCompilationHeading(e.toString());
        } else {
          document.getElementById('configuration').value = config;
        }
      });
    });
  });
}

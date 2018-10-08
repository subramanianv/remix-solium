var mustache = require('mustache');
var Solium = window.solium;
var id = 1;
var callbacks = {};
var config = {
  "extends": "solium:recommended",
  "plugins": ["security"],
  "rules": {
    "quotes": ["error", "double"],
    "double-quotes": [2],   // returns a rule deprecation warning
    "pragma-on-top": 1
  },
  "options": { "returnInternalIssues": false }
}

function dispatch(action, key, type, args, callback) {
  _id = id
  callbacks[_id] = callback;
  window.parent.postMessage(JSON.stringify({
    action: action,
    key: key,
    type: type,
    value: args,
    id: _id
  }), '*');
  id++;
}
//
function receiveMessage (event) {

  var data = JSON.parse(event.data);
  if (data.action === 'notification') {
      console.log(event);
  }
  if (data.action === 'response') {
      var fn = callbacks[data.id];
      delete callbacks[data.id];
      if(typeof fn === 'function') {
        if(data.error) {
          return fn(data.error);
        }
        fn(null, data.value);
      }
  }
}

function soliumLint(code, config) {
  return Solium.lint(code, config)
}



function fixContract() {

  dispatch('request', 'editor', 'getCurrentFile', [], (err, files) => {
    if(files && files.length > 0 ) {
      var filename = files[0];
      dispatch('request', 'editor', 'getFile', [files[0]], (err, contents) => {
        if (config.options) {
          config.options.autofix = true;
        } else {
          config.options = { autofix : true };
        }
        var result = Solium.lint(contents[0], config);
        dispatch('request', 'editor', 'setFile', [filename, result.fixedSourceCode], (err, contents) => {
          console.log('fixed file')
        });
        document.getElementById("errors").innerHTML = mustache.render(errorsTemplate, {errors:result.errorMessages});
      });
    }
  })
}

let errorsTemplate = '{{#errors}}<li class="errorItem">{{ruleName}} {{line}}:{{column}} {{message}}</li>{{/errors}}'

function lintContract() {
  dispatch('request', 'editor', 'getCurrentFile', [], (err, files) => {
    if(files && files.length > 0 ) {
      dispatch('request', 'editor', 'getFile', [files[0]], (err, contents) => {
        if (config.options) {
          config.options.autofix = false;
        } else {
          config.options = { autofix: false };
        }
        var errors = soliumLint(contents[0], config);

        console.log(errors);
        document.getElementById("errors").innerHTML = mustache.render(errorsTemplate, {errors:errors});
      });
    }
  })
}

window.addEventListener('message', receiveMessage, false);
//
window.onload = function () {
  document.getElementById('lintButton').addEventListener('click', lintContract);
  document.getElementById('fixButton').addEventListener('click', fixContract);
  document.getElementById('configuration').value = JSON.stringify(config, null, 2);
}

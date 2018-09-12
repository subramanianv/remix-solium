var id = 1;
var callbacks = {};
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

window.addEventListener('message', receiveMessage, false);

window.onload = function () {
  dispatch('request', 'editor', 'getCurrentFile', [], function (err, file) {
    dispatch('request', 'editor', 'getFile', file, function (err, content) {
      
    });
  });
}

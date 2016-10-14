'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Gettext = require('node-gettext');
var Promise = require('bluebird');
var assign = require('object-assign'); // Support node <= 0.12

var plurals = require('./plurals');

function gettextToI18next(domain, body) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  return addTextDomain(domain, body, options).then(function (data) {
    if (options.keyasareference) {
      setKeysAsReference(data);
    }

    return parseJSON(domain, data, options);
  }).then(function (json) {
    return JSON.stringify(json, null, 4);
  });
}

/*
 * gettext --> barebone json
 */
function addTextDomain(domain, body) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var gt = new Gettext();

  if (body.length > 0) {
    gt.addTextdomain(domain, body);
  }

  if (options.filter) {
    var filterAsync = Promise.promisify(options.filter);
    return filterAsync(gt, domain);
  }

  var normalizedDomain = gt._normalizeDomain(domain);
  return Promise.resolve(gt.domains[normalizedDomain] && gt.domains[normalizedDomain].translations);
}

function setKeysAsReference(data) {
  var keys = [];

  Object.keys(data).forEach(function (ctxt) {
    Object.keys(data[ctxt]).forEach(function (key) {
      if (data[ctxt][key].comments && data[ctxt][key].comments.reference) {
        data[ctxt][key].comments.reference.split(/\r?\n|\r/).forEach(function (id) {
          var x = data[ctxt][key];
          data[ctxt][id] = x;
          if (x.msgstr[0] === '') {
            x.msgstr[0] = x.msgid;
          }
          for (var i = 1; i < x.msgstr.length; i++) {
            if (x.msgstr[i] === '') {
              x.msgstr[i] = x.msgid_plural;
            }
          }
          x.msgid = id;
          if (id !== key) {
            keys.push([ctxt, key]);
          }
        });
      }
    });
  });

  keys.forEach(function (a) {
    var c = a[0];
    var k = a[1];

    delete data[c][k];
  });
}

/*
 * barebone json --> i18next json
 */
function parseJSON(domain) {
  var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var separator = options.keyseparator || '##';
  var json = {};
  var ctxSeparator = options.ctxSeparator || '_';

  Object.keys(data).forEach(function (m) {
    var context = data[m];

    Object.keys(context).forEach(function (key) {
      var targetKey = key;
      var appendTo = json;

      if (key.length === 0) {
        // delete if msgid is empty.
        // this might be the header.
        delete context[key];
        return;
      }

      if (key.indexOf(separator) > -1) {
        var keys = key.split(separator);

        var x = 0;
        while (keys[x]) {
          if (x < keys.length - 1) {
            appendTo[keys[x]] = appendTo[keys[x]] || {};
            appendTo = appendTo[keys[x]];
          } else {
            targetKey = keys[x];
          }
          x++;
        }
      }

      if (m !== '') targetKey = '' + targetKey + ctxSeparator + m;

      var values = context[key].msgstr;
      var newValues = getGettextValues(values, domain, targetKey, options);
      assign(appendTo, newValues);
    });
  });

  return Promise.resolve(json);
}

function getGettextValues(values, domain, targetKey, options) {
  if (values.length === 1) {
    return emptyOrObject(targetKey, values[0], options);
  }

  var ext = plurals.rules[domain.replace('_', '-').split('-')[0]];
  var gettextValues = {};

  for (var i = 0; i < values.length; i++) {
    var pluralSuffix = getI18nextPluralExtension(ext, i);
    var pkey = targetKey + pluralSuffix;

    assign(gettextValues, emptyOrObject(pkey, values[i], options));
  }

  return gettextValues;
}

/*
 * helper to get plural suffix
 */
function getI18nextPluralExtension(ext, i) {
  if (ext && ext.nplurals === 2) {
    return i === 0 ? '' : '_plural';
  }
  return '_' + i;
}

function toArrayIfNeeded(value, _ref) {
  var splitNewLine = _ref.splitNewLine;

  return value.indexOf('\n') > -1 && splitNewLine ? value.split('\n') : value;
}

function emptyOrObject(key, value, options) {
  if (options.skipUntranslated && !value) {
    // empty string or other falsey
    return {};
  }

  return _defineProperty({}, key, toArrayIfNeeded(value, options));
}

module.exports = gettextToI18next;
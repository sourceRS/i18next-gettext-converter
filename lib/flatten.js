'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function regexIndexOf(value, regex, startpos) {
  var indexOf = value.substring(startpos || 0).search(regex);
  return indexOf >= 0 ? indexOf + (startpos || 0) : indexOf;
}

module.exports = {
  flatten: function flatten(input) {
    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    var _ref$keyseparator = _ref.keyseparator;
    var keyseparator = _ref$keyseparator === undefined ? '##' : _ref$keyseparator;
    var _ref$ctxSeparator = _ref.ctxSeparator;
    var ctxSeparator = _ref$ctxSeparator === undefined ? '_' : _ref$ctxSeparator;
    var ignorePlurals = _ref.ignorePlurals;

    var flat = {};

    function recurse(appendTo, obj, parentKey) {
      Object.keys(obj).forEach(function (m) {
        var kv = void 0;
        var key = parentKey;
        var context = '';
        var value = obj[m];

        if (key.length > 0) {
          key = key + keyseparator + m;
        } else {
          key = m;
        }

        // get context if used
        var pluralIndex = key.indexOf('_plural');
        if (pluralIndex < 0) pluralIndex = regexIndexOf(key, /_\d+$/);

        var isPlural = pluralIndex > -1;
        if (ignorePlurals) {
          isPlural = false;
        }

        var number = void 0;
        if (isPlural && key.indexOf('_plural') < 0) {
          number = parseInt(key.substring(pluralIndex + 1), 10);
          if (number === 1) {
            isPlural = false;
          }
          key = key.substring(0, pluralIndex);
        } else if (key.indexOf('_plural') > -1) {
          number = 2;
          key = key.substring(0, pluralIndex);
        }

        var ctxKey = key;

        if (isPlural) {
          ctxKey = ctxKey.substring(0, pluralIndex);
          if (ctxKey.indexOf(ctxSeparator) > -1) {
            context = ctxKey.substring(ctxKey.lastIndexOf(ctxSeparator) + ctxSeparator.length, ctxKey.length);
          }
        } else if (key.indexOf(ctxSeparator) > -1) {
          context = ctxKey.substring(ctxKey.lastIndexOf(ctxSeparator) + ctxSeparator.length, ctxKey.length);
        } else {
          context = '';
        }

        if (context === key) context = '';

        if (context !== '') key = key.replace(ctxSeparator + context, '');

        // append or recurse
        var appendKey = key + context;
        if (isPlural) appendKey = appendKey + '_' + number;
        if (typeof value === 'string') {
          kv = {
            // id: key.replace(new RegExp(' ', 'g'), ''),
            key: key,
            value: value,
            isPlural: isPlural,
            pluralNumber: isPlural ? number : 0,
            context: context
          };
          appendTo[appendKey] = kv;
        } else if ((typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' && typeof value.msgstr === 'string' && Array.isArray(value.paths)) {
          kv = {
            key: key,
            value: value.msgstr,
            isPlural: isPlural,
            pluralNumber: isPlural ? number : 0,
            context: context,
            paths: value.paths
          };
          appendTo[appendKey] = kv;
        } else if (Array.isArray(value)) {
          kv = {
            // id: key.replace(new RegExp(' ', 'g'), ''),
            key: key,
            value: value.join('\n'),
            isArray: true,
            isPlural: isPlural,
            pluralNumber: isPlural ? number : 0,
            context: context
          };
          appendTo[appendKey] = kv;
        } else {
          recurse(appendTo, value, key);
        }
      });
    }

    recurse(flat, input, '');

    // append plurals
    Object.keys(flat).forEach(function (m) {
      var kv = flat[m];

      if (kv.isPlural) {
        var single = flat[kv.key + kv.context];

        if (single) {
          single.plurals = single.plurals || [];
          single.plurals.push(kv);

          delete flat[m];
        }
      }
    });

    return flat;
  }
};
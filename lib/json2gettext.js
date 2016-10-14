'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var GettextParser = require('gettext-parser');
var Promise = require('bluebird');

var plurals = require('./plurals');

var _require = require('./flatten');

var flatten = _require.flatten;


function i18nextToPo(domain, body) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  return i18nextToGettext(domain, body, GettextParser.po, identity, options);
}

function i18nextToPot(domain, body) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  return i18nextToGettext(domain, body, GettextParser.po, function () {
    return '';
  }, options);
}

function i18nextToMo(domain, body) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  return i18nextToGettext(domain, body, GettextParser.mo, identity, options);
}

function i18nextToGettext(domain, body, parser, getTranslatedValue) {
  var options = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};

  return Promise.resolve(flatten(JSON.parse(body), options)).then(function (flat) {
    if (options.base) {
      var _ret = function () {
        var bflat = flatten(JSON.parse(options.base), options);
        Object.keys(bflat).forEach(function (key) {
          if (flat[key]) {
            if (flat[key].plurals) {
              bflat[key].translated_value = getTranslatedValue(getPluralArray(domain, flat[key]));
            } else {
              bflat[key].translated_value = getTranslatedValue(flat[key].value);
            }
          }
        });

        return {
          v: parseGettext(domain, bflat, options)
        };
      }();

      if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
    }

    return parseGettext(domain, flat, options);
  }).then(function (data) {
    return parser.compile(data);
  });
}

function getPluralArray(domain, translation) {
  var ext = plurals.rules[domain.replace('_', '-').split('-')[0]];
  var pArray = [];

  for (var i = 0, len = translation.plurals.length; i < len; i++) {
    var plural = translation.plurals[i];
    pArray.splice(getGettextPluralPosition(ext, plural.pluralNumber - 1), 0, plural.value);
  }
  pArray.splice(getGettextPluralPosition(ext, translation.pluralNumber - 1), 0, translation.value);

  return pArray;
}

/*
 * flat json --> gettext
 */
function parseGettext(domain, data) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var out = {
    charset: 'utf-8',
    headers: {
      'project-id-version': options.project || 'i18next-conv',
      'mime-version': '1.0',
      'content-type': 'text/plain; charset=utf-8',
      'content-transfer-encoding': '8bit'
    },
    translations: {}
  };

  var ext = plurals.rules[domain.replace('_', '-').split('-')[0]];
  var trans = {};

  out.headers['plural-forms'] = 'nplurals=' + ext.nplurals + '; ' + ('plural=' + ext.plurals);

  if (!options.noDate) {
    out.headers['pot-creation-date'] = new Date().toISOString();
    out.headers['po-revision-date'] = new Date().toISOString();
  }
  if (options.language) {
    out.headers.language = options.language;
  }
  var delkeys = [];

  Object.keys(data).forEach(function (m) {
    var kv = data[m];
    var kvPosition = void 0;

    if (kv.plurals) {
      var pArray = [];

      for (var i = 0, len = kv.plurals.length; i < len; i++) {
        var plural = kv.plurals[i];
        pArray.splice(getGettextPluralPosition(ext, plural.pluralNumber - 1), 0, plural.value);
      }
      pArray.splice(getGettextPluralPosition(ext, kv.pluralNumber - 1), 0, kv.value);

      if (_typeof(trans[kv.context]) !== 'object') trans[kv.context] = {};
      if (options.keyasareference) {
        if (_typeof(trans[kv.context][kv.value]) === 'object') {
          // same context and msgid. this could theorically be merged.
          trans[kv.context][kv.value].comments.reference.push(kv.key);
          kvPosition = kv.value;
        } else {
          trans[kv.context][kv.value] = {
            msgctxt: kv.context,
            msgid: pArray[0],
            msgid_plural: pArray.slice(1, pArray.length),
            msgstr: kv.translated_value,
            comments: { reference: [kv.key] }
          };
          kvPosition = kv.value;
        }
        if (kv.key !== kv.value) {
          delkeys.push([kv.context, kv.key]);
        }
      } else {
        trans[kv.context][kv.key] = {
          msgctxt: kv.context,
          msgid: kv.key,
          msgid_plural: kv.key,
          msgstr: pArray
        };
        kvPosition = kv.key;
      }
    } else {
      if (_typeof(trans[kv.context]) !== 'object') trans[kv.context] = {};

      if (options.keyasareference) {
        if (_typeof(trans[kv.context][kv.value]) === 'object') {
          // same context and msgid. this could theorically be merged.
          trans[kv.context][kv.value].comments.reference.push(kv.key);
          kvPosition = kv.value;
        } else {
          trans[kv.context][kv.value] = {
            msgctxt: kv.context,
            msgid: kv.value,
            msgstr: kv.translated_value,
            comments: {
              reference: [kv.key]
            }
          };
          kvPosition = kv.value;
        }
        if (kv.key !== kv.value) {
          delkeys.push([kv.context, kv.key]);
        }
      } else {
        trans[kv.context][kv.key] = { msgctxt: kv.context, msgid: kv.key, msgstr: kv.value };
        kvPosition = kv.key;
      }
    }

    // add file paths to comment references
    if (kv.paths) {
      if (trans[kv.context][kvPosition].comments && trans[kv.context][kvPosition].comments.reference) {
        trans[kv.context][kvPosition].comments.reference = trans[kv.context][kvPosition].comments.reference.concat(kv.paths);
      } else {
        trans[kv.context][kvPosition].comments = { reference: kv.paths };
      }
    }
  });

  delkeys.forEach(function (a) {
    var c = a[0];
    var k = a[1];
    delete trans[c][k];
  });

  // re-format reference comments to be able to compile with gettext-parser...
  Object.keys(trans).forEach(function (ctxt) {
    Object.keys(trans[ctxt]).forEach(function (id) {
      if (trans[ctxt][id].comments && trans[ctxt][id].comments.reference) {
        trans[ctxt][id].comments.reference = trans[ctxt][id].comments.reference.join('\n');
      }
    });
  });

  out.translations = trans;
  return Promise.resolve(out);
}

/*
 * helper to get plural suffix
 */
function getGettextPluralPosition(ext, suffix) {
  if (ext) {
    for (var i = 0; i < ext.nplurals; i++) {
      if (i === suffix) {
        return i;
      }
    }
  }

  return -1;
}

function identity(val) {
  return val;
}

module.exports = {
  i18nextToPot: i18nextToPot,
  i18nextToPo: i18nextToPo,
  i18nextToMo: i18nextToMo
};
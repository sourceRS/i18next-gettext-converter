'use strict';

var pkginfo = require('pkginfo');
var gettextToI18next = require('./gettext2json');

var _require = require('./json2gettext');

var i18nextToPo = _require.i18nextToPo;
var i18nextToPot = _require.i18nextToPot;
var i18nextToMo = _require.i18nextToMo;


module.exports = {
  gettextToI18next: gettextToI18next,
  i18nextToPo: i18nextToPo,
  i18nextToPot: i18nextToPot,
  i18nextToMo: i18nextToMo
};

pkginfo(module, ['version']);
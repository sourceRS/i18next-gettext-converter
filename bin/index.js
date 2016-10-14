#!/usr/bin/env node
'use strict';

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var program = require('commander');

var _require = require('chalk');

var red = _require.red;
var green = _require.green;
var blue = _require.blue;
var yellow = _require.yellow;


var i18nextConv = require('../lib');
var plurals = require('../lib/plurals');

var writeFileAsync = Promise.promisify(fs.writeFile);
var readFileAsync = Promise.promisify(fs.readFile);
var gettextToI18next = i18nextConv.gettextToI18next;
var i18nextToPo = i18nextConv.i18nextToPo;
var i18nextToPot = i18nextConv.i18nextToPot;
var i18nextToMo = i18nextConv.i18nextToMo;

// test calls:

// gettext -> i18next
// node bin -l en -s ./test/_testfiles/en/translation.utf8.po -t ./test/_tmp/en.json
// node bin -l de -s ./test/_testfiles/de/translation.utf8.po -t ./test/_tmp/de.json
// node bin -l ru -s ./test/_testfiles/ru/translation.utf8.po -t ./test/_tmp/ru.json

// With filter:
// node bin -l en -s ./test/_testfiles/en/translation.utf8.po -t ./test/_tmp/en.json -f path/to/filter.js

// i18next -> gettext
// node bin -l de -s ./test/_testfiles/de/translation.utf8.json -t ./test/_tmp/de.po
// and back
// node bin -l de -s ./test/_tmp/de.po -t ./test/_tmp/de.json

// program

program.version(i18nextConv.version).option('-b, --base [path]', 'Sepcify path for the base language file. only take effect with -K option', '').option('-f, --filter [path]', 'Specify path to gettext filter').option('-l, --language [domain]', 'Specify the language code, eg. \'en\'').option('-p, --pot', 'Generate POT file.').option('-s, --source [path]', 'Specify path to read from').option('-t, --target [path]', 'Specify path to write to', '').option('-K, --keyasareference', 'Deal with the reference comment as a key', false).option('-ks, --keyseparator [path]', 'Specify keyseparator you want to use, defaults to ##', '##').option('-P, --plurals [path]', 'Specify path to plural forms definitions').option('--quiet', 'Silence output', false).option('--skipUntranslated', 'Skip untranslated keys when converting into json', false).option('--splitNewLine', 'Silence output', false).option('--ctxSeparator [sep]', 'Specify the context separator', '_').option('--ignorePlurals', 'Do not process the plurals').parse(process.argv);

var source = program.source;
var target = program.target;
var filter = program.filter;

var options = _objectWithoutProperties(program, ['source', 'target', 'filter']);

if (filter && fs.existsSync(filter)) {
  options.filter = require(filter); // eslint-disable-line global-require
}

if (base && fs.existsSync(base)) {
  options.base = fs.readFileSync(base);
}

var language = options.language;
var pot = options.pot;
var base = options.base;


if (source && language) {
  if (pot && !base) {
    console.log(red('at least call with argument -p and -b.'));
    console.log('(call program with argument -h for help.)');
    process.exit();
  }

  if (!options.quiet) console.log(yellow('start converting'));

  processFile(language, source, target, options).then(function () {
    if (!options.quiet) console.log(green('file written'));
  }).catch(function () /* err */{
    console.log(red('failed writing file'));
  });
} else {
  console.log(red('at least call with argument -l and -s.'));
  console.log('(call program with argument -h for help.)');
}

function processFile(domain, source, target, options) {
  if (!options.quiet) console.log('--> reading file from: ' + source);

  return readFileAsync(source).then(function (body) {
    var dirname = path.dirname(source);
    var ext = path.extname(source);
    var filename = path.basename(source, ext);

    if (options.plurals) {
      var pluralsPath = path.join(process.cwd(), options.plurals);
      plurals.rules = require(pluralsPath); // eslint-disable-line global-require

      if (!options.quiet) console.log(blue('use custom plural forms ' + pluralsPath));
    }

    var targetDir = void 0;
    var targetExt = void 0;
    var converter = void 0;

    if (!target) {
      targetDir = dirname.lastIndexOf(domain) === 0 ? dirname : path.join(dirname, domain);
      targetExt = ext === '.json' ? '.po' : '.json';
      target = path.join(targetDir, '' + filename + targetExt);
    } else {
      targetDir = path.dirname(target);
      targetExt = path.extname(target);
    }

    switch (targetExt) {
      case '.po':
        converter = i18nextToPo;
        break;
      case '.pot':
        converter = i18nextToPot;
        break;
      case '.mo':
        converter = i18nextToMo;
        break;
      case '.json':
        converter = gettextToI18next;
        break;
      default:
        return null;
    }

    if (!fs.existsSync(targetDir)) {
      mkdirp.sync(targetDir);
    }

    return converter(domain, body, options);
  }).then(function (data) {
    return writeFile(target, data, options);
  }).catch(function (err) {
    if (err.code === 'ENOENT') console.log(red('file ' + source + ' was not found.'));
  });
}

function writeFile(target, data) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  if (!options.quiet) console.log('<-- writing file to: ' + target);

  return writeFileAsync(target, data);
}
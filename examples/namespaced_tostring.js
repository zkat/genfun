var genfun = require('../')

var logs = { toString: genfun(), name: 'logs' }
var json = { toString: genfun(), name: 'json' }
var xml = { toString: genfun(), name: 'xml' }

logs.toString.add([Array], function (array) {
  // We can still call regular JS methods on these things...
  return '!!! Data (type ' + ({}).toString.call(array) + '): ' + array.toString()
})

json.toString.add([Array], function (array) {
  return JSON.stringify(array)
})

xml.toString.add([Array], function (array) {
  return '<javascript-array>' +
    array.reduce(function (acc, next) {
      return acc + '<array-item>' + next.toString() + '</array-item>'
    }, '') + '</javascript-array>'
})

exports.runExample = function () {
  var array = ['foo', 1, 1.5]
  console.log('All the different ways that an Array can be stringified: ')
  var formatters = [logs, json, xml]
  formatters.forEach(function (module) {
    console.log(module.name + '.toString: "' + module.toString(array) + '"')
  })
}
if (module.id === '.') exports.runExample()

/* -*- js2-basic-offset: 2; indent-tabs-mode: nil; -*- */
var Genfun = require("../build/genfun"),
    addMethod = Genfun.addMethod;

var logs = { toString: new Genfun, name: "logs" },
    json = { toString: new Genfun, name: "json" },
    xml = { toString: new Genfun, name: "xml" };

addMethod(logs.toString, [Array.prototype], function(array) {
  // We can still call regular JS methods on these things...
  return "!!! Data (type " + ({}).toString.call(array) + "): " + array.toString();
});

addMethod(json.toString, [Array.prototype], function(array) {
  return JSON.stringify(array);
});

addMethod(xml.toString, [Array.prototype], function(array) {
  return "<javascript-array>" +
    array.reduce(function(acc, next) {
      return acc + "<array-item>" + next.toString() + "</array-item>";
    }, "") + "</javascript-array>";
});

exports.runExample = function() {
  var array = ["foo", 1, 1.5];
  console.log("All the different ways that an Array can be stringified: ");
  [logs, json, xml].forEach(function(module) {
    console.log(module.name + ".toString: '" + module.toString(array) + "'");
  });
};
if (module.id === ".") exports.runExample();

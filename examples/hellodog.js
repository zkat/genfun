/* -*- js2-basic-offset: 2; indent-tabs-mode: nil; -*- */
var Genfun = require("../build/genfun"),
    addMethod = Genfun.addMethod;

function Person() {}
function Dog() {}

var frobnicate = new Genfun();
addMethod(frobnicate, [Person.prototype], function(person) {
  console.log("Got a person!");
});

addMethod(frobnicate, [Dog.prototype], function(dog) {
  console.log("Got a dog!");
});

addMethod(
  frobnicate,
  [String.prototype, Person.prototype, Dog.prototype],
  function(greeting, person, dog) {
    console.log(person, " greets ", dog, ", '"+greeting+"'");
  });

exports.runExample = function() {
  var person = new Person(),
      dog = new Dog();
  frobnicate(person);
  frobnicate(dog);
  frobnicate("Hi, dog!", person, dog);
};

if (module.id === ".") exports.runExample();

var genfun = require('../')

function Person () {}
function Dog () {}

var frobnicate = genfun()

frobnicate.add([Person], function (person) {
  console.log('Got a person!')
})

frobnicate.add([Dog], function (dog) {
  console.log('Got a dog!')
})

frobnicate.add([String, Person, Dog], function (greeting, person, dog) {
  console.log(person, ' greets ', dog, ', "' + greeting + '"')
})

exports.runExample = function () {
  var person = new Person()
  var dog = new Dog()
  frobnicate(person)
  frobnicate(dog)
  frobnicate('Hi, dog!', person, dog)
}

if (module.id === '.') exports.runExample()

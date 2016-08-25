var genfun = require('./')

/*
* Test setup
*/
function TestObj () {}
var testObj = new TestObj()
var gf = genfun()

/*
* Tests
*/

function test_function (testObj) {
  return testObj.toString() + 'test'
}
bench('Regular function', function () {
  test_function(testObj)
})

TestObj.prototype.test_method = function () {
  return this.toString() + 'test'
}
bench('Native method', function () {
  testObj.test_method()
})

gf.add([TestObj], function (testObj) {
  return testObj.toString() + 'test'
})
bench('Singly-dispatched genfun', function () {
  gf(testObj)
})

gf.add([TestObj, TestObj], function (testObj1, testObj2) {
  return testObj.toString() + 'test'
})
bench('Double-dispatched genfun', function () {
  gf(testObj, testObj)
})

gf.add([TestObj, String], function (testObj1, string) {
  return testObj.toString() + string
})
bench('Double-dispatched genfun with string primitive', function () {
  gf(testObj, 'test')
})

/*
* Util
*/
function bench (name, func, iterations) {
  iterations = iterations || 100000
  console.time(name)
  for (var i = 0; i < iterations; i++) {
    func()
  }
  console.timeEnd(name)
}

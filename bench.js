const genfun = require('./')

/*
* Test setup
*/
function TestObj () {}
const testObj = new TestObj()

/*
* Tests
*/

function testFunction (testObj) {
  return testObj.toString() + 'test'
}
bench('Regular function', function () {
  return testFunction(testObj)
})

TestObj.prototype.testMethod = function () {
  return this.toString() + 'test'
}
bench('Native method', function () {
  return testObj.testMethod()
})
bench('Applied native method', function () {
  return TestObj.prototype.testMethod.apply(testObj, [])
})

testObj.methodGf = genfun(TestObj.prototype.testMethod)
bench('Native-method-style genfun', function () {
  return testObj.methodGf()
})
const defaultGenfun = genfun(function (test) {
  return testObj.toString() + 'test'
})
bench('Default-dispatched genfun', function () {
  return defaultGenfun(testObj)
})

const singleGenfun = genfun()
singleGenfun.add([TestObj], function (testObj) {
  return testObj.toString() + 'test'
})
bench('Singly-dispatched genfun', function () {
  return singleGenfun(testObj)
})

const doubleGenfun = genfun()
doubleGenfun.add([TestObj, TestObj], function (testObj1, testObj2) {
  return testObj.toString() + 'test'
})
bench('Double-dispatched genfun', function () {
  return doubleGenfun(testObj, testObj)
})

const doubleString = genfun()
doubleString.add([TestObj, String], function (testObj1, string) {
  return testObj.toString() + string
})
bench('Double-dispatched genfun with string primitive', function () {
  return doubleString(testObj, 'test')
})

/*
* Util
*/
function bench (name, func, iterations) {
  iterations = iterations || 100000
  console.time(name)
  let val
  for (let i = 0; i < iterations; i++) {
    val = func() + 'a'
  }
  console.timeEnd(name)
  // This whole dance is solely for the sake of defeating smartass compilers
  if (val !== '[object Object]testa') {
    throw new Error('got a bad value:', val)
  }
}

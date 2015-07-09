# Genfun [![Travis](https://img.shields.io/travis/zkat/genfun.svg)]() [![npm](https://img.shields.io/npm/v/genfun.svg)]() [![npm](https://img.shields.io/npm/l/genfun.svg)]()

[`genfun`](https://github.com/zkat/genfun) is a Javascript library that lets you
define generic functions: regular-seeming functions that can be invoked just
like any other function, but that automatically dispatch methods based on the
combination of arguments passed to it when it's called, also known as multiple
dispatch.

It's 'prototype-friendly' in the sense that it does not keep references to
objects in memory when methods are defined on them, so objects will be garbage
collected normally.

It was inspired by [Slate](http://slatelanguage.org/),
[CLOS](http://en.wikipedia.org/wiki/CLOS) and
[Sheeple](http://github.com/zkat/sheeple).

# Quickstart

### Install

`$ npm install genfun`

### Example

Various examples are availble to look at in the examples/ folder included in
this project. Most examples are also runnable by just invoking them with node.

```javascript
// Based on examples/hellodog.js
var Genfun = require('genfun')

function Person() {}
function Dog() {}

// Creates a generic function. This is a regular, callable function.
var frobnicate = new Genfun()

// addMethod is used to define new methods on genfuns, with the most
// "specific"  method firing when multiple methods are applicable to a set of
// arguments when the genfun is called.
//
// addMethod(<genfun>, <selector>, <method function>)
//
frobnicate.addMethod([Person.prototype], function (person) {
  console.log('Got a person!')
});

frobnicate.addMethod([Dog.prototype], function (dog) {
  console.log('Got a dog!')
});

// Selectors can include multiple arguments, which correspond to argument
// positions when the genfun is called.
//
// This last method will dispatch only when a string, a Person, and a Dog
// are the arguments to frobnicate (in that order).
//
frobnicate.addMethod(
  [String.prototype, Person.prototype, Dog.prototype],
  function(greeting, person, dog) {
    console.log(person, ' greets ', dog, ', \'' + greeting + '\'');
  });

var person = new Person()
var dog = new Dog()

frobnicate(person) // Got a person!
frobnicate(dog) // Got a dog!
frobnicate('Hi, dog!', person, dog); // {} greets {}, 'Hi, dog!'
```

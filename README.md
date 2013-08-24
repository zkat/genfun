`genfun.js` is
[hosted at Github](http://github.com/zkat/genfun.js). `genfun.js` is a
public domain work, dedicated using
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Feel
free to do whatever you want with it.

# Quickstart

### Browser support

[![browser support](http://ci.testling.com/zkat/genfun.js.png)](http://ci.testling.com/zkat/genfun.js)

### Install

`genfun.js` is available through both [NPM](http://npmjs.org) and
[Bower](http://bower.io) as `genfun`.

`$ npm install genfun`
or
`$ bower install genfun`

The `npm` version includes a build/ directory with pre-built and
pre-minified UMD versions of `genfun.js` which are loadable by both AMD and
CommonJS module systems. To generate these files in `bower`, or if you
fetched `genfun.js` from source, simply run:

```
$ npm install
...dev dependencies installed...
$ make
```

### Example

Various examples are availble to look at in the examples/ folder included
in this project. Most examples are also runnable with node, or by just
doing `make example-<name>` (for example, `make example-fmap`).

```javascript
// Based on examples/hellodog.js
var Genfun = require("genfun"),
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

var person = new Person(),
    dog = new Dog();
frobnicate(person); // Got a person!
frobnicate(dog); // Got a dog!
frobnicate("Hi, dog!", person, dog); // {} greets {}, 'Hi, dog!'

```

# Introduction

### Prototype-friendly multiple dispatch

`genfun.js` is a library that provides multimethod/generic function
capabilities in a prototype-friendly way. Inspired by
[Slate](http://slatelanguage.org/),
[CLOS](http://en.wikipedia.org/wiki/CLOS) and
[Sheeple](http://github.com/zkat/sheeple). In this case,
'prototype-friendly' means that it doesn't keep references from methods to
objects, so they will be garbage collected normally even if a method has
been directly defined on them.

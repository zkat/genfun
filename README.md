# Quickstart

`genfun.js` is
[hosted at Github](http://github.com/zkat/genfun.js).

```javascript

var frobnicate = new Genfun();

frobnicate.addMethod(
    [String.prototype, Number.prototype],
    function(string, number) {
        console.log("Got a string and a number");
    });

frobnicate.addMethod(
    [Number.prototype, String.prototype],
    function(number, string) {
        console.log("Got a number and a string");
    });

/* 'Default' methods can be defined by dispatching on Object.prototype */
frobnicate.addMethod(
    [Object.prototype, Object.prototype],
    function(obj1, obj2) {
        console.log("Dispatch fell through to the default method.");
    });

frobnicate(new String("foo"), new Number(1)); // => Got a string and a number
frobnicate(1, "foo"); // => Got a number and a string
frobnicate(1, 1); // => Dispatch fell through to the default method

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

### Notes

Right now, `genfun.js` is mainly a proof of concept and porting of old Sheeple
code. No real optimization has been done on dispatch, so you can expect it
to crawl under any real strain. Once optimized, the system would ideally be
just as fast as a singly-dispatched system when only one argument is
specialized, while still providing the flexibility to dispatch on multiple
arguments when desired.

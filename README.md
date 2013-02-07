# Quickstart

`genfun` is
[hosted at Github](http://github.com/zkat/genfun-js).

```javascript

var frobnicate = new Genfun();

Genfun.addMethod(
    frobnicate,
    [String.prototype, Number.prototype],
    function(string, number) {
        console.log("Got a string and a number");
    });

Genfun.addMethod(
    frobnicate,
    [Number.prototype, String.prototype],
    function(number, string) {
        console.log("Got a number and a string");
    });
    
frobnicate(new String("foo"), new Number(1));
frobnicate(new Number(1), new String("foo"));

```

# Introduction

### Prototype-friendly multiple dispatch

`genfun` is a library that provides multimethod/generic function
capabilities in a prototype-friendly way. Inspired by
[Slate](http://slatelanguage.org/),
[CLOS](http://en.wikipedia.org/wiki/CLOS) and
[Sheeple](http://github.com/zkat/sheeple).

### Notes

Right now, genfun is mainly a proof of concept and porting of old Sheeple
code. No real optimization has been done on dispatch, so you can expect it
to crawl under any real strain. Once optimized, the system would ideally be
just as fast as a singly-dispatched system when only one argument is
specialized, while still providing the flexibility to dispatch on multiple
arguments when desired.

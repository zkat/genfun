/* -*- js2-basic-offset: 2; indent-tabs-mode: nil; -*- */
var Genfun = require("../build/genfun"),
    addMethod = Genfun.addMethod;

/*
 * This file implements an approximation of the Functor instances described
 * in the Haskell wikibook:
 *
 * https://en.wikibooks.org/wiki/Haskell/The_Functor_class
 */

/**
 * Generic function used in the Functor typeclass we're simulating in this
 * file. The typeclass can be instantiated by simply adding the appropriate
 * methods to fmap, which follow the Functor laws:
 *
 * `fmap(identity, value) => value`
 * `fmap(compose(f, g), value) => f(g(value))`
 *
 * And for the sake of JavaScript's `this` we add an additional expectation:
 * `thing.fmap(function() { return this; }, value) => thing`
 *
 * @param {function} f - Function to map over the value.
 * @param {*} value - Value to map over.
 */
var fmap = new Genfun;

/*
 * Default method
 */
addMethod(fmap, [], function(f, value) {
  throw new Error("No instance of (Functor " +
                  Object.prototype.toString.call(value) + ")" +
                  " arising from use of `fmap'");
});

/*
 * Maybe
 */
function Just(value) {
  this.value = value;
}
var Nothing = {};

addMethod(fmap, [Function.prototype, Just.prototype], function(f, just) {
  return new Just(f.call(this, just.value));
});
addMethod(fmap, [Function.prototype, Nothing], function() {
  return Nothing;
});

/*
 * Array
 */
addMethod(fmap, [Function.prototype, Array.prototype], function(f, array) {
  return array.map(f, this);
});

/*
 * Tree
 */
function Leaf(value) {
  this.value = value;
}
function Branch(left, right) {
  this.left = left;
  this.right = right;
}

addMethod(fmap, [Function.prototype, Leaf.prototype], function(f, leaf) {
  return new Leaf(f.call(this, leaf.value));
});
addMethod(fmap, [Function.prototype, Branch.prototype], function(f, branch) {
  return new Branch(fmap.call(this, f, branch.left),
                    fmap.call(this, f, branch.right));
});

function runExample() {
  function logValue(type) {
    return function(val) {
      console.log("Mapping over ", val, " in object of type "+type);
    };
  }

  console.log("Testing Maybe");
  fmap(logValue("Just"), new Just(1));
  fmap(logValue("Nothing"), Nothing);
  console.log("-----------------");
  console.log("Testing Array");
  fmap(logValue("Array"), [1,2,3]);
  console.log("-----------------");
  console.log("Testing Tree");
  function br(a, b) { return new Branch(a, b); }
  function lf(x) { return new Leaf(x); }
  fmap(logValue("Tree"),
       br(
         br(
           lf(1),
           lf(2)),
         br(
           br(
             lf(3),
             br(
               lf(4),
               lf(5))),
           lf(6))));
  console.log("-----------------");
  console.log("Testing default");
  try {
    fmap(logValue("Fail"), "Some random string");
  } catch(e) {
    console.log("Caught exception: ", e);
  }
}

exports.runExample = runExample;
exports.fmap = fmap;

if (module.id === ".") runExample();

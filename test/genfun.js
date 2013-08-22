/* -*- js-indent-level: 2; js2-basic-offset: 2; c-basic-offset: 2; indent-tabs-mode: nil; -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80; */
"use strict";
var assert = require("assert");
var Genfun = require("../src/genfun");

describe("Genfun", function() {

  describe("new Genfun()", function() {
    it("creates a new genfun", function() {
      assert.equal("function", typeof (new Genfun));
      assert.equal(true, (new Genfun).genfun instanceof Genfun);
      // TODO - Not currently possible in JS
      // assert.equal(true, (new Genfun) instanceof Genfun);
    });
    it("calls noApplicableMethod if called without adding methods", function() {
      var frob = new Genfun(),
          data = [1, 2, 3];
      assert.throws(frob, function(err) {
        return err.message === "No applicable method found when called " +
          "with arguments of types: ()";
      });
      Genfun.addMethod(Genfun.noApplicableMethod, [frob], function() {
        return "success";
      });
      assert.equal("success", frob());
    });
  });

  describe("noApplicableMethod", function() {
    var frob = new Genfun(),
        container = { frob: frob },
        data = [1, 2, 3];
    it("throws an exception if there is no applicable method", function() {
      assert.throws(frob, function(err) { return err instanceof Error; });
    });
    it("includes the types of the inputs in the message", function() {
      assert.throws(function() { frob(data); }, function(err) {
        return err.message === "No applicable method found when called " +
          "with arguments of types: (Array)";
      });
      assert.throws(function() { frob({}); }, function(err) {
        return err.message === "No applicable method found when called " +
          "with arguments of types: (Object)";
      });
    });
    it("includes the original call arguments in the Error instance", function() {
      assert.throws(function() { frob(data); }, function(err) {
        return err.args.length === 1 && err.args[0] === data;
      });
    });
    it("includes the `this` argument in the Error instance", function() {
      assert.throws(function() { frob.call(data); }, function(err) {
        return err.thisArg === data;
      });
    });
    it("can be modified so something different happens if dispatch fails", function() {
      Genfun.addMethod(Genfun.noApplicableMethod, [frob], function() {
        return arguments;
      });
      var result = container.frob("foo");
      assert.equal(frob, result[0]);
      assert.equal(container, result[1]);
      assert.equal("foo", result[2][0]);
    });
    it("is only called when dispatch fails", function () {
      Genfun.addMethod(frob, [], function() {
        return "regular method";
      });
      assert.equal("regular method", frob());
    });
  });
  describe("#apply", function() {
    describe("basic call semantics", function() {
      var frob = new Genfun();
      Genfun.addMethod(frob, [], function() {
        return {"this": this, "arguments": arguments};
      });
      var container = {frob: frob};
      it("can be called like a normal function", function() {
        assert.equal("success", frob("success")["arguments"][0]);
        assert.equal(container, container.frob()["this"]);
      });
      it("can be called using .call", function() {
        assert.equal("success", frob.call(null, "success")["arguments"][0]);
        assert.equal(container, frob.call(container)["this"]);
      });
      it("can be called using .apply", function() {
        assert.equal("success", frob.apply(null, ["success"])["arguments"][0]);
        assert.equal(container, frob.apply(container)["this"]);
      });
      it("calls noApplicableMethod if there are no methods defined");
    });
    describe("dispatch", function() {
      describe("basic single dispatch", function() {
        var frob = new Genfun(),
            container = {frob:frob},
            Ctr = function() {};
        Genfun.addMethod(frob, [Ctr.prototype], function(ctr) {
          return {
            arguments: arguments,
            this: this
          };
        });
        it("dispatches methods based on the prototype of its argument", function() {
          var obj = new Ctr;
          assert.equal(obj, frob(obj).arguments[0]);
        });
        it("fails if there is no method defined for the given argument", function() {
          assert.throws(function() { return frob("nothing"); });
        });
        it("properly binds `this` in the method to the genfun's `this`", function() {
          assert.equal(container, container.frob(new Ctr).this);
        });
        it("dispatches the most specific method when multiple methods apply", function() {
          Genfun.addMethod(frob, [Object.prototype], function(obj) {
            return "NOPE";
          });
          var obj = new Ctr;
          assert.equal(obj, frob(obj).arguments[0]);
        });
        it("can dispatch on objects where [[Proto]] is null", function() {
          var frob = new Genfun(),
              nullProto = Object.create(null);
          Genfun.addMethod(frob, [nullProto], function() {
            return "nullProto";
          });
          assert.equal("nullProto", frob(nullProto));
        });
        it("calls noApplicableMethod correctly if [[Proto]] is null and no" +
           " applicable method exists for the argument", function() {
             var frob = new Genfun(),
                 nullProto = Object.create(null);
             Genfun.addMethod(frob, [Object.prototype], function() {
               return "whatever";
             });
             Genfun.addMethod(Genfun.noApplicableMethod, [frob], function() {
               return "nullProto";
             });
             assert.equal("nullProto", frob(nullProto));
           });
      });
      describe("ToObject dispatch conversion", function() {
        it("dispatches primitives according to their ToObject's prototypes" +
           " and passes the original primitive into the effective method function");
      });
      describe("Object.prototype empty-index shorthand", function () {
        var frob = new Genfun();
        it("lets you write empty array indices into dispatch array" +
           " to mean Object.prototype", function() {
             Genfun.addMethod(frob, [,Number.prototype], function(x, num) {
               return x;
             });
             Genfun.addMethod(frob, [String.prototype, Number.prototype], function(x, num) {
               return num;
             });
             Genfun.addMethod(frob, [], function() {
               return "nomethod";
             });
             assert.equal(5, frob(5, 10));
             assert.equal(10, frob("5", 10));
             assert.equal("nomethod", frob(Object.create(null), 5));
           });
      });
      describe("0-arity dispatch", function() {
        var frob = new Genfun();
        Genfun.addMethod(frob, [], function(arg) { return arg; });
        it("dispatches to a single method when only one method "
           +"with an empty dispatch array is defined", function() {
             var val = {};
             assert.equal(val, frob(val));
             assert.equal(undefined, frob());
           });
        it("dispatches to the empty/default method when an arg's [[Proto]] is null");
      });
      describe("multi-argument dispatch", function() {
        it("compares all given arguments to the dispatch lists for its methods");
        it("weighs methods based on the arguments' distance to dispatch prototypes");
        it("gives greater weight to earlier arguments");
        it("fails dispatch when an object with null [[Proto]]" +
           " with no applicable roles is involved", function() {
             var frob = new Genfun(),
                 nullProto = Object.create(null);
             Genfun.addMethod(frob, [Object.prototype, Object.prototype], function() {
               return "please no";
             });
             Genfun.addMethod(Genfun.noApplicableMethod, [frob], function() {
               return "success";
             });
             assert.equal("please no", frob({}, {}));
             assert.equal("success", frob(nullProto, {}));
             assert.equal("success", frob({}, nullProto));
             assert.equal("success", frob(nullProto, nullProto));
           });
      });
      describe("variable arity dispatch", function() {
        it("treats 'unfilled' spaces like Object.prototype when comparing " +
           "methods with dispatch arrays of different lengths");
        it("handles complex interactions between all the dispatch features", function() {
          var frobnicate = new Genfun(),
              addMethod = Genfun.addMethod;

          addMethod(
            frobnicate,
            [Number.prototype],
            function(num) {
              return "one number: "+num;
            });

          addMethod(
            frobnicate,
            [String.prototype],
            function(str) {
              return "one string: "+str;
            });

          addMethod(
            frobnicate,
            [String.prototype, Number.prototype],
            function(string, number) {
              return "string + number: " + string + ", " + number;
            });

          addMethod(
            frobnicate,
            [Number.prototype, String.prototype],
            function(number, string) {
              return "number + string: " + number + ", " + string;
            });

          addMethod(
            frobnicate,
            [],
            function() {
              return "Dispatch fell through";
            });

          addMethod(
            frobnicate,
            [Number.prototype, , String.prototype],
            function(number, anything, string) {
              return "number + anything + string: "
                + number + ", " + anything + ", " + string;
            });

          function test(expected, args) {
            assert.equal(expected, frobnicate.apply(null, args));
          }
          test("string + number: foo, 1", [new String("foo"), new Number(1)]);
          test("number + string: 1, foo", [1, "foo"]);
          test("one number: 1", [1, 2]);
          test("one number: 1", [1]);
          test("one string: str", ["str"]);
          test("Dispatch fell through", [true]);
          test("Dispatch fell through", []);
          test("number + anything + string: 1, true, foo", [1, true, "foo"]);
        });
      });
      it("treats empty array items (`[x, ,z]`) like Object.prototype", function() {
        var frob = new Genfun(),
            x = {};
        Genfun.addMethod(frob, [x, ,x], function(a, b, c) {
          return "3-arg method";
        });
        Genfun.addMethod(frob, [], function() {
          return "0-arg method";
        });
        assert.equal("3-arg method", frob(x, x, x));
        assert.equal("3-arg method", frob(x, {}, x));
        assert.equal("0-arg method", frob(x, Object.create(null), x));
      });
    });
  });
  
  describe("addMethod", function() {
    it("defines a new method on the genfun");
    it("can define methods that dispatch on objects with null [[Proto]]", function() {
      var frob = new Genfun(),
          nullProto = Object.create(null);
      Genfun.addMethod(frob, [nullProto, nullProto], function() {
        return "success";
      });
      assert.equal("success", frob(nullProto, nullProto));
    });
    it("defines and returns a noApplicableMethod method if given an empty array", function() {
      var frob = new Genfun();
      Genfun.addMethod(frob, [String.prototype], function() { return "nop"; });
      assert.equal(true,
                   Genfun.noApplicableMethod.genfun ===
                   Genfun.addMethod(frob, [], function() { return "yup"; }).genfun);
      assert.equal("yup", frob(Object.create(null)));
    });
  });

  describe("removeMethod", function() {
    it("undefines a previously defined method on the genfun");
    it("can remove methods that dispatch on objects with null [[Proto]]");
  });
});

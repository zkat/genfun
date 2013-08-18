/* -*- js-indent-level: 2; js2-basic-offset: 2; c-basic-offset: 2; -*- */
/* -*- indent-tabs-mode: nil; -*- */
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
  });

  describe("noApplicableMethod", function() {
	var frob = new Genfun(),
		container = { frob: frob };
	it("throws an exception if there is no applicable method", function() {
	  assert.throws(frob, function(err) { return err instanceof Error; });
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
		  Genfun.addMethod(Genfun.noApplicableMethod, [frob], function() {
			return "nullProto";
		  });
		  assert.equal("nullProto", frob(nullProto));
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
	  });
	  describe("multi-argument dispatch", function() {
		it("compares all given arguments to the dispatch lists for its methods");
		it("weighs methods based on the arguments' distance to dispatch prototypes");
		it("gives greater weight to earlier arguments");
	  });
	  describe("variable arity dispatch", function() {
		it("treats 'unfilled' spaces like Object.prototype when comparing " +
		   "methods with dispatch arrays of different lengths");
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
	  it("properly dispatches methods", function() {
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
  });

  describe("removeMethod", function() {
	it("undefines a previously defined method on the genfun");
	it("can remove methods that dispatch on objects with null [[Proto]]");
  });
});

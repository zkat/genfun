/* -*- js2-basic-offset: 2; indent-tabs-mode: nil; -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80; */
"use strict";
var Method = require("./method"),
    Role = require("./role"),
    util = require("./util");

/**
 * Creates generic functions capable of multiple dispatch across several
 * arguments. The generic function returned by this constructor is
 * functionally identical to a standard function: it can be called,
 * applied, and receives the expected binding for `this` when appropriate.
 *
 * @constructor
 * @param {object} [opts] - Options used when initializing the genfun.
 * @returns {function} New generic function.
 */
function Genfun() {
  var genfun = this;
  genfun.methods = [];
  genfun.cache = {key: [], methods: [], state: Genfun.UNINITIALIZED};
  var fun = function() {
    return apply_genfun(genfun, this, arguments);
  };
  fun.genfun = genfun;
  genfun._wrapper_function = fun;
  return fun;
}

Genfun.UNITIALIZED = 0;
Genfun.MONOMORPHIC = 1;
Genfun.POLYMORPHIC = 2;
Genfun.MEGAMORPHIC = 3;

Genfun.MAX_CACHE_SIZE = 32; // Can't inline, so the cache needs to be bigger.

/**
 * Defines a method on a generic function.
 *
 * @function
 * @param {Genfun} genfun - Genfun instance to add the method to.
 * @param {Array-like} selector - Selector array for dispatching the method.
 * @param {Function} methodFunction - Function to execute when the method
 *                                    successfully dispatches.
 */
Genfun.addMethod = function(genfun, selector, func) {
  genfun = typeof genfun === "function" &&
    genfun.genfun &&
    genfun.genfun instanceof Genfun ?
    genfun.genfun : genfun;
  if (selector.length) {
    selector = [].slice.call(selector);
    for (var i = 0; i < selector.length; i++) {
      if (!selector.hasOwnProperty(i)) {
        selector[i] = Object.prototype;
      }
    }
    var method = new Method(genfun, selector, func);
    genfun.methods.push(method);
    genfun.cache = {key: [], methods: [], state: Genfun.UNINITIALIZED};
    return method;
  } else {
    return Genfun.addMethod(
      Genfun.noApplicableMethod,
      [genfun._wrapper_function], function(_gf, newthis, args) {
        return func.apply(newthis, args);
      });
  }
};

/**
 * Removes a previously-defined method on `genfun` that matches
 * `selector` exactly.
 *
 * @function
 * @param {Genfun} genfun - Genfun to remove a method from.
 * @param {Array-like} selector - Objects to match on when finding a
 *                                    method to remove.
 */
Genfun.removeMethod = function() {
  throw new Error("not yet implemented");
};

/**
 * This generic function is called when `genfun` has been called and no
 * applicable method was found. The default method throws an `Error`.
 *
 * @function
 * @param {Genfun} genfun - Generic function instance that was called.
 * @param {*} newthis - value of `this` the genfun was called with.
 * @param {Array} callArgs - Arguments the genfun was called with.
 */
Genfun.noApplicableMethod = new Genfun();
Genfun.addMethod(Genfun.noApplicableMethod, [], function(gf, thisArg, args) {
  var msg =
        "No applicable method found when called with arguments of types: (" +
        [].map.call(args, function(arg) {
          return (/\[object ([a-zA-Z0-9]+)\]/).exec(({}).toString.call(arg))[1];
        }).join(", ") + ")",
      err = new Error(msg);
  err.genfun = gf;
  err.thisArg = thisArg;
  err.args = args;
  throw err;
});

var _current_applicable_methods,
    _current_genfun,
    _current_this,
    _current_args;
function hasNextMethod() {
  if (typeof _current_applicable_methods === "undefined") {
    throw new Error("hasNextMethod and callNextMethod must "+
                    "be called inside a Genfun method.");
  } else {
    return !!_current_applicable_methods.length;
  }
}
Genfun.hasNextMethod = hasNextMethod;

function callNextMethod() {
  if (hasNextMethod()) {
    _current_args = arguments.length ? arguments : _current_args;
    _current_applicable_methods = [].slice.call(_current_applicable_methods, 1);
    return _current_applicable_methods[0].func.apply(_current_this, _current_args);
  } else {
    return noNextMethod();
  }
}
Genfun.callNextMethod = callNextMethod;

function noNextMethod() {
  throw new Error("No next method available");
}
Genfun.noNextMethod = noNextMethod;

/*
 * Internal
 */
function apply_genfun(genfun, newthis, args) {
  var applicable_methods = get_applicable_methods(genfun, args),
      ret, tmp_current_methods, tmp_this, tmp_args;
  if (applicable_methods.length) {
    tmp_current_methods = _current_applicable_methods;
    tmp_this = _current_this;
    tmp_args = _current_args;
    _current_applicable_methods = applicable_methods;
    _current_this = newthis;
    _current_args = args;
    ret = applicable_methods[0].func.apply(newthis, args);
    _current_applicable_methods = tmp_current_methods;
    _current_this = tmp_this;
    _current_args = tmp_args;
    return ret;
  } else {
    return Genfun.noApplicableMethod(genfun._wrapper_function, newthis, args);
  }
}

function get_applicable_methods(genfun, args) {
  var applicable_methods;
  var maybe_methods = cached_methods(genfun, args);
  if (maybe_methods) {
    applicable_methods = maybe_methods;
  } else {
    applicable_methods = compute_applicable_methods(genfun, args);
    cache_args(genfun, args, applicable_methods);
  }
  return applicable_methods;
}

function cache_args(genfun, args, methods) {
  if (genfun.cache.state === Genfun.MEGAMORPHIC) return;
  var key = [];
  var proto;
  for (var i = 0; i < args.length; i++) {
    proto = cacheable_proto(genfun, args[i]);
    if (proto) {
      key[i] = proto;
    } else {
      return;
    }
  }
  genfun.cache.key.unshift(key);
  genfun.cache.methods.unshift(methods);
  if (genfun.cache.key.length === 1) {
    genfun.cache.state = Genfun.MONOMORPHIC;
  } else if (genfun.cache.key.length < Genfun.MAX_CACHE_SIZE) {
    genfun.cache.state = Genfun.POLYMORPHIC;
  } else {
    genfun.cache.state = Genfun.MEGAMORPHIC;
  }
}

function cacheable_proto(genfun, arg) {
  var dispatchable = dispatchable_object(arg);
  if (Object.hasOwnProperty.call(dispatchable, Role.role_key_name)) {
    for (var j = 0; j < dispatchable[Role.role_key_name].length; j++) {
      var role = dispatchable[Role.role_key_name][j];
      if (role.method.genfun === genfun) {
        return undefined;
      }
    }
  }
  return Object.getPrototypeOf(dispatchable);
}

function cached_methods(genfun, args) {
  if (genfun.cache.state === Genfun.UNINITIALIZED ||
      genfun.cache.state === Genfun.MEGAMORPHIC) return;
  var protos = [];
  var proto;
  for (var i = 0; i < args.length; i++) {
    proto = cacheable_proto(genfun, args[i]);
    if (proto) {
      protos[i] = proto;
    } else {
      return;
    }
  }
  for (i = 0; i < genfun.cache.key.length; i++) {
    if (match_cached_methods(genfun.cache.key[i], protos)) {
      return genfun.cache.methods[i];
    }
  }
}

function match_cached_methods(key, protos) {
  if (key.length !== protos.length) return false;
  for (var i = 0; i < key.length; i++) {
    if (key[i] !== protos[i]) {
      return false;
    }
  }
  return true;
}

function compute_applicable_methods(genfun, args) {
  args = [].slice.call(args);
  var discovered_methods = [];
  function find_and_rank_roles(object, hierarchy_position, index) {
    var roles = Object.hasOwnProperty.call(object, Role.role_key_name) ?
          object[Role.role_key_name] :
          [];
    roles.forEach(function(role) {
      if (role.method.genfun === genfun && index === role.position) {
        if (discovered_methods.indexOf(role.method) < 0) {
          Method.clear_rank(role.method);
          discovered_methods.push(role.method);
        }
        Method.set_rank_hierarchy_position(
          role.method, index, hierarchy_position);
      }
    });
    // When a discovered method would receive more arguments than
    // were specialized, we pretend all extra arguments have a role
    // on Object.prototype.
    if (util.is_object_proto(object)) {
      discovered_methods.forEach(function(method) {
        if (method.minimal_selector <= index) {
          Method.set_rank_hierarchy_position(
            method, index, hierarchy_position);
        }
      });
    }
  }
  args.forEach(function(arg, index) {
    get_precedence_list(dispatchable_object(arg))
      .forEach(function(obj, hierarchy_position) {
        find_and_rank_roles(obj, hierarchy_position, index);
      });
  });
  var applicable_methods = discovered_methods.filter(function(method) {
    return (args.length === method._rank.length &&
            Method.is_fully_specified(method));
  });
  applicable_methods.sort(function(a, b) {
    return Method.score(a) - Method.score(b);
  });
  return applicable_methods;
}

/*
 * Helper function for getting an array representing the entire
 * inheritance/precedence chain for an object by navigating its
 * prototype pointers.
 */
function get_precedence_list(obj) {
  var precedence_list = [];
  var next_obj = obj;
  while(next_obj) {
    precedence_list.push(next_obj);
    next_obj = Object.getPrototypeOf(next_obj);
  }
  return precedence_list;
}

/*
 * Returns a useful dispatch object for value using a process similar to
 * the ToObject operation specified in http://es5.github.com/#x9.9
 */
function dispatchable_object(value) {
  // To shut up jshint, which doesn't let me turn off this warning.
  var Bool = Boolean,
      Num = Number,
      Str = String,
      Obj = Object;
  switch (typeof value) {
  case "object":
    return value;
  case "boolean":
    return new Bool(value);
  case "number":
    return new Num(value);
  case "string":
    return new Str(value);
  default:
    return new Obj(value);
  }
}

module.exports = Genfun;

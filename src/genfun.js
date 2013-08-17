/* -*- js-indent-level: 2; js2-basic-offset: 2; c-basic-offset: 2; indent-tabs-mode: nil; -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80; */
/*!
 * genfun.js
 *
 * Written by Kat Marchán <kzm@sykosomatic.org>
 *
 * Dedicated to the public domain using CC0 1.0. Consider this code public
 * domain for all intents and purposes. Dedication text can be found at
 * https://creativecommons.org/licenses/zero/1.0
 *
 */

/*
 * Genfun
 *
 * Creates generic functions capable of multiple dispatch across
 * several arguments.
 *
 */
"use strict";
var Method = require("./method"),
    Role = require("./role"),
    util = require("./util");

function Genfun() {
  var genfun = this;
  genfun.methods = [];
  var cache = {key: [], methods: [], state: Genfun.UNINITIALIZED};
  var fun = function() {
    return apply_genfun(genfun, this, arguments);
  };
  fun.genfun = genfun;
  fun.addMethod = function(participants, func) {
    return add_method(genfun, participants, func);
  };
  fun.removeMethod = function(participants) {
    return remove_method(genfun, participants);
  };
  return fun;
};

Genfun.UNITIALIZED = 0;
Genfun.MONOMORPHIC = 1;
Genfun.POLYMORPHIC = 2;
Genfun.MEGAMORPHIC = 3;

Genfun.MAX_CACHE_SIZE = 32; // Can't inline, so the cache will need to be bigger.

function add_method(genfun, participants, func) {
  var method = new Method(genfun, participants, func);
  genfun.methods.push(method);
  genfun.cache = {key: [], methods: [], state: Genfun.UNINITIALIZED};
  return method;
};

function remove_method(genfun, participants) {
  throw Error("not yet implemented");
};

function apply_genfun(genfun, newthis, args) {
  var applicable_methods = get_applicable_methods(genfun, args);
  if (applicable_methods.length) {
    return applicable_methods[0].func.apply(newthis, args);
  } else {
    throw Error("No applicable methods");
  }
};

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
  if (genfun.cache.state == Genfun.MEGAMORPHIC) return;
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
  if (genfun.cache.key.length == 1) {
    genfun.cache.state = Genfun.MONOMORPHIC;
  } else if (genfun.cache.key.length < Genfun.MAX_CACHE_SIZE) {
    genfun.cache.state = Genfun.POLYMORPHIC;
  } else {
    genfun.cache.state = Genfun.MEGAMORPHIC;
  }
}

function cacheable_proto(genfun, arg) {
  if (arg.hasOwnProperty(Role.role_key_name)) {
    for (var j = 0; j < arg[Role.role_key_name].length; j++) {
      var role = arg[Role.role_key_name][j];
      if (role.method.genfun == genfun) {
        return;
      }
    }
  }
  return Object.getPrototypeOf(dispatchable_object(arg));
}

function cached_methods(genfun, args) {
  if (genfun.cache.state == Genfun.UNINITIALIZED ||
      genfun.cache.state == Genfun.MEGAMORPHIC) return;
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
  if (key.length != protos.length) return false;
  for (var i = 0; i < key.length; i++) {
    if (key[i] != protos[i]) {
      return false;
    }
  }
  return true;
}

function compute_applicable_methods(genfun, args) {
  args = [].slice.call(args);
  var discovered_methods = [];
  function find_and_rank_roles(object, hierarchy_position, index) {
    var roles = object.hasOwnProperty(Role.role_key_name)?object[Role.role_key_name]:[];
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
        if (method.minimal_participants <= index) {
          Method.set_rank_hierarchy_position(
            method, index, hierarchy_position);
        }
      });
    }
  };
  // We dispatch 'default' methods if the argument list was empty by
  // pretending an Object.prototype object was passed in, but only
  // for dispatch.
  (args.length?args:[Object.prototype]).forEach(function(arg, index) {
    get_precedence_list(dispatchable_object(arg))
      .forEach(function(obj, hierarchy_position) {
        find_and_rank_roles(obj, hierarchy_position, index);
      });
  });
  var applicable_methods = discovered_methods.filter(function(method) {
    // This ||1 works with the above hack, for 0-arity calls.
    return ((args.length||1) === method._rank.length &&
            Method.is_fully_specified(method));
  });
  applicable_methods.sort(function(a, b) {
    return Method.score(a) - Method.score(b);
  });
  return applicable_methods;
};

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
};

/*
 * Returns a useful dispatch object for value using a process similar to
 * the ToObject operation specified in http://es5.github.com/#x9.9
 */
function dispatchable_object(value) {
  switch (typeof value) {
  case "object":
    return value;
  case "boolean":
    return new Boolean(value);
  case "number":
    return new Number(value);
  case "string":
    return new String(value);
  default:
    return new Object(value);
  }
};

/*
 * Export
 */
module.exports = Genfun;

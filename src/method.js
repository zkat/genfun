/* -*- js-indent-level: 2; js2-basic-offset: 2; c-basic-offset: 2; indent-tabs-mode: nil; -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80; */
/*
 * Method
 *
 * Methods are added, conceptually, to Genfuns, not to objects
 * themselves, although the Genfun object does not have any pointers to
 * method objects.
 *
 * The _rank vector is an internal datastructure used during dispatch
 * to figure out whether a method is applicable, and if so, how to
 * order multiple discovered methods.
 *
 * Right now, the score method on Method does not take into account any
 * ordering, and all arguments to a method are ranked equally for the
 * sake of ordering.
 *
 */
"use strict";
var Role = require("./role"),
    util = require("./util");

function Method(genfun, participants, func) {
  var method = this;
  method.genfun = genfun;
  method.func = func;
  method._rank = [];
  method.minimal_participants = 0;

  // TODO: The following is false in Firefox:
  // console.log(window.objproto == Object.prototype);

  var tmp_participants = participants.length?participants:[Object.prototype];
  for (var object, i = tmp_participants.length - 1; i >= 0; i--) {
    object = tmp_participants.hasOwnProperty(i)?
      tmp_participants[i]:
      Object.prototype;
    if (i > 0
        && method.minimal_participants == 0
        && util.is_object_proto(object)) {
      continue;
    } else {
      method.minimal_participants++;
      if (!object.hasOwnProperty(Role.role_key_name)) {
        if (typeof Object.defineProperty != "undefined") {
          // Object.defineProperty is JS 1.8.0+
          Object.defineProperty(
            object, Role.role_key_name, {value: [], enumerable: false});
        } else {
          object[Role.role_key_name] = [];
        }
      }
      // XXX HACK - no method replacement now, so we just shove
      // it in a place where it'll always show up first. This
      // would probably seriously break method combination if we
      // had it.
      object[Role.role_key_name].unshift(new Role(method, i));
    }
  }
};

function set_rank_hierarchy_position(method, index, hierarchy_position) {
  method._rank[index] = hierarchy_position;
};
Method.set_rank_hierarchy_position = set_rank_hierarchy_position;

function clear_rank(method) {
  method._rank = [];
};
Method.clear_rank = clear_rank;

function is_fully_specified(method) {
  for (var i = 0; i < method.minimal_participants; i++) {
    if (!method._rank.hasOwnProperty(i)) {
      return false;
    }
  }
  return true;
};
Method.is_fully_specified = is_fully_specified;

function score(method) {
  // TODO - this makes all items in the list equal
  return method._rank.reduce(function(a, b) { return a + b; }, 0);
};
Method.score = score;

module.exports = Method;

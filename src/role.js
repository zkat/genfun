/* -*- js-indent-level: 2; js2-basic-offset: 2; c-basic-offset: 2; indent-tabs-mode: nil; -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80; */
"use strict";

/*
 * Role
 *
 * A Role encapsulates a particular object's 'role' in a method's
 * dispatch. They are added directly to the participants for a method,
 * and thus do not prevent the objects a method was defined on from
 * being garbage collected.
 */
function Role(method, position) {
  this.method = method;
  this.position = position;
};
Role.role_key_name = "__" + Math.random().toString(36).substr(2) + "_roles__";

module.exports = Role;

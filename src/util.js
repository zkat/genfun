/* -*- js-indent-level: 2; js2-basic-offset: 2; c-basic-offset: 2; indent-tabs-mode: nil; -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80; */
/*
 * Miscellaneous utilities
 */
/*
 * XXX HACK Firefox gives weird errors where the global
 * Object.prototype !== the one inside this closure, so we tag it
 * here and use that for comparisons.
 */
Object.prototype.___isobjectproto___ = true;
function is_object_proto(obj) {
  return obj.hasOwnProperty("___isobjectproto___");
}

exports.is_object_proto = is_object_proto;

/* -*- js2-basic-offset: 2; indent-tabs-mode: nil; -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80; */
"use strict";

/*
 * XXX HACK Firefox gives weird errors where the global
 * Object.prototype !== the one inside this closure, so we tag it
 * here and use that for comparisons.
 */
var prototest_key_name =
      "__" + Math.random().toString(36).substr(2) + "_is_object_proto__",
    hasDefineProperty = !!Object.defineProperty;

if (hasDefineProperty) {
  Object.defineProperty(
    Object.prototype,
    prototest_key_name,
    {value: true, enumerable: false});
}
function is_object_proto(obj) {
  return !hasDefineProperty ||
    Object.hasOwnProperty.call(obj, prototest_key_name);
}

exports.is_object_proto = is_object_proto;

/*
 * XXX HACK Firefox gives weird errors where the global
 * Object.prototype !== the one inside this closure, so we tag it
 * here and use that for comparisons.
 */
const prototestKeyName = Symbol('isObjectProto')
const hasDefineProperty = !!Object.defineProperty

if (hasDefineProperty) {
  var objproto = Object.prototype
  Object.defineProperty(
    objproto,
    prototestKeyName,
    {value: true, enumerable: false})
}

export function isObjectProto (obj) {
  return !hasDefineProperty ||
    Object.hasOwnProperty.call(obj, prototestKeyName)
}

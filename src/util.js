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

const _null = {}
const _undefined = {}

/*
 * Returns a useful dispatch object for value using a process similar to
 * the ToObject operation specified in http://es5.github.com/#x9.9
 */
export function dispatchableObject (value) {
  // To shut up jshint, which doesn't let me turn off this warning.
  const Bool = Boolean
  const Num = Number
  const Str = String
  const Obj = Object
  if (value === null) { return _null }
  if (value === undefined) { return _undefined }
  switch (typeof value) {
    case 'object': return value
    case 'boolean': return new Bool(value)
    case 'number': return new Num(value)
    case 'string': return new Str(value)
    default: return new Obj(value)
  }
}

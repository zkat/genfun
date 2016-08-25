import Method from './method'
import Role from './role'
import * as util from './util'

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
export default function Genfun () {
  let genfun = this || {}
  genfun.methods = []
  genfun.cache = {key: [], methods: [], state: Genfun.UNINITIALIZED}
  var fun = function () {
    return applyGenfun(genfun, this, arguments)
  }
  fun.genfun = genfun
  fun.addMethod = addMethod
  fun.add = addMethod
  fun.removeMethod = removeMethod
  fun.rm = removeMethod
  genfun._wrapperFunction = fun
  return fun
}

const STATES = {
  UNINITIALIZED: 0,
  MONOMORPHIC: 1,
  POLYMORPHIC: 2,
  MEGAMORPHIC: 3
}

Genfun.MAX_CACHE_SIZE = 32 // Can't inline, so the cache needs to be bigger.

/**
 * Defines a method on a generic function.
 *
 * @function
 * @param {Array-like} selector - Selector array for dispatching the method.
 * @param {Function} methodFunction - Function to execute when the method
 *                                    successfully dispatches.
 */
function addMethod (selector, func) {
  let genfun = this
  genfun = typeof genfun === 'function' &&
    genfun.genfun &&
    genfun.genfun instanceof Genfun ?
    genfun.genfun : genfun
  if (selector.length) {
    selector = [].slice.call(selector)
    for (var i = 0; i < selector.length; i++) {
      if (!selector.hasOwnProperty(i)) {
        selector[i] = Object.prototype
      }
    }
    let method = new Method(genfun, selector, func)
    genfun.methods.push(method)
    genfun.cache = {key: [], methods: [], state: STATES.UNINITIALIZED}
    return method
  } else {
    return Genfun.noApplicableMethod.addMethod(
      [genfun._wrapperFunction],
      (_gf, newthis, args) => func.apply(newthis, args))
  }
}
Genfun.addMethod = (genfun, sel, fn) => addMethod.call(genfun, sel, fn)

/**
 * Removes a previously-defined method on `genfun` that matches
 * `selector` exactly.
 *
 * @function
 * @param {Genfun} genfun - Genfun to remove a method from.
 * @param {Array-like} selector - Objects to match on when finding a
 *                                    method to remove.
 */
function removeMethod () {
  throw new Error('not yet implemented')
}
Genfun.removeMethod = (genfun, selector) => removeMethod.call(genfun, selector)

/**
 * This generic function is called when `genfun` has been called and no
 * applicable method was found. The default method throws an `Error`.
 *
 * @function
 * @param {Genfun} genfun - Generic function instance that was called.
 * @param {*} newthis - value of `this` the genfun was called with.
 * @param {Array} callArgs - Arguments the genfun was called with.
 */
Genfun.noApplicableMethod = new Genfun()
Genfun.noApplicableMethod.addMethod([], (gf, thisArg, args) => {
  let msg =
        'No applicable method found when called with arguments of types: (' +
        [].map.call(args, (arg) => {
          return (/\[object ([a-zA-Z0-9]+)\]/)
            .exec(({}).toString.call(arg))[1]
        }).join(', ') + ')'
  let err = new Error(msg)
  err.genfun = gf
  err.thisArg = thisArg
  err.args = args
  throw err
})

let _currentApplicableMethods
let _currentThis
let _currentArgs
Genfun.hasNextMethod = () => {
  if (!_currentApplicableMethods) {
    throw new Error('hasNextMethod and callNextMethod must ' +
                    'be called inside a Genfun method.')
  } else {
    return !!_currentApplicableMethods.length
  }
}

Genfun.callNextMethod = (...args) => {
  if (Genfun.hasNextMethod()) {
    _currentArgs = args.length ? args : _currentArgs
    _currentApplicableMethods = [].slice.call(_currentApplicableMethods, 1)
    return _currentApplicableMethods[0].func.apply(_currentThis, _currentArgs)
  } else {
    return Genfun.noNextMethod()
  }
}

Genfun.noNextMethod = () => {
  throw new Error('No next method available')
}

/*
 * Internal
 */
function applyGenfun (genfun, newthis, args) {
  let applicableMethods = getApplicableMethods(genfun, args)
  let ret, tmpCurrentMethods, tmpThis, tmpArgs
  if (applicableMethods.length) {
    tmpCurrentMethods = _currentApplicableMethods
    tmpThis = _currentThis
    tmpArgs = _currentArgs
    _currentApplicableMethods = applicableMethods
    _currentThis = newthis
    _currentArgs = args
    ret = applicableMethods[0].func.apply(newthis, args)
    _currentApplicableMethods = tmpCurrentMethods
    _currentThis = tmpThis
    _currentArgs = tmpArgs
    return ret
  } else {
    return Genfun.noApplicableMethod(genfun._wrapperFunction, newthis, args)
  }
}

function getApplicableMethods (genfun, args) {
  let applicableMethods
  let maybeMethods = cachedMethods(genfun, args)
  if (maybeMethods) {
    applicableMethods = maybeMethods
  } else {
    applicableMethods = computeApplicableMethods(genfun, args)
    cacheArgs(genfun, args, applicableMethods)
  }
  return applicableMethods
}

function cacheArgs (genfun, args, methods) {
  if (genfun.cache.state === STATES.MEGAMORPHIC) { return }
  var key = []
  var proto
  for (var i = 0; i < args.length; i++) {
    proto = cacheableProto(genfun, args[i])
    if (proto) {
      key[i] = proto
    } else {
      return null
    }
  }
  genfun.cache.key.unshift(key)
  genfun.cache.methods.unshift(methods)
  if (genfun.cache.key.length === 1) {
    genfun.cache.state = STATES.MONOMORPHIC
  } else if (genfun.cache.key.length < Genfun.MAX_CACHE_SIZE) {
    genfun.cache.state = STATES.POLYMORPHIC
  } else {
    genfun.cache.state = STATES.MEGAMORPHIC
  }
}

function cacheableProto (genfun, arg) {
  var dispatchable = dispatchableObject(arg)
  if (Object.hasOwnProperty.call(dispatchable, Role.roleKeyName)) {
    for (var j = 0; j < dispatchable[Role.roleKeyName].length; j++) {
      var role = dispatchable[Role.roleKeyName][j]
      if (role.method.genfun === genfun) {
        return null
      }
    }
  }
  return Object.getPrototypeOf(dispatchable)
}

function cachedMethods (genfun, args) {
  if (genfun.cache.state === STATES.UNINITIALIZED ||
      genfun.cache.state === STATES.MEGAMORPHIC) {
    return null
  }
  var protos = []
  var proto
  for (var i = 0; i < args.length; i++) {
    proto = cacheableProto(genfun, args[i])
    if (proto) {
      protos[i] = proto
    } else {
      return
    }
  }
  for (i = 0; i < genfun.cache.key.length; i++) {
    if (matchCachedMethods(genfun.cache.key[i], protos)) {
      return genfun.cache.methods[i]
    }
  }
}

function matchCachedMethods (key, protos) {
  if (key.length !== protos.length) { return false }
  for (var i = 0; i < key.length; i++) {
    if (key[i] !== protos[i]) {
      return false
    }
  }
  return true
}

function computeApplicableMethods (genfun, args) {
  args = [].slice.call(args)
  let discoveredMethods = []
  function findAndRankRoles (object, hierarchyPosition, index) {
    var roles = Object.hasOwnProperty.call(object, Role.roleKeyName) ?
          object[Role.roleKeyName] :
          []
    roles.forEach(role => {
      if (role.method.genfun === genfun && index === role.position) {
        if (discoveredMethods.indexOf(role.method) < 0) {
          Method.clearRank(role.method)
          discoveredMethods.push(role.method)
        }
        Method.setRankHierarchyPosition(role.method, index, hierarchyPosition)
      }
    })
    // When a discovered method would receive more arguments than
    // were specialized, we pretend all extra arguments have a role
    // on Object.prototype.
    if (util.isObjectProto(object)) {
      discoveredMethods.forEach(method => {
        if (method.minimalSelector <= index) {
          Method.setRankHierarchyPosition(method, index, hierarchyPosition)
        }
      })
    }
  }
  args.forEach((arg, index) => {
    getPrecedenceList(dispatchableObject(arg))
      .forEach((obj, hierarchyPosition) => {
        findAndRankRoles(obj, hierarchyPosition, index)
      })
  })
  let applicableMethods = discoveredMethods.filter(method => {
    return (args.length === method._rank.length &&
            Method.isFullySpecified(method))
  })
  applicableMethods.sort((a, b) => Method.score(a) - Method.score(b))
  return applicableMethods
}

/*
 * Helper function for getting an array representing the entire
 * inheritance/precedence chain for an object by navigating its
 * prototype pointers.
 */
function getPrecedenceList (obj) {
  var precedenceList = []
  var nextObj = obj
  while (nextObj) {
    precedenceList.push(nextObj)
    nextObj = Object.getPrototypeOf(nextObj)
  }
  return precedenceList
}

/*
 * Returns a useful dispatch object for value using a process similar to
 * the ToObject operation specified in http://es5.github.com/#x9.9
 */
function dispatchableObject (value) {
  // To shut up jshint, which doesn't let me turn off this warning.
  const Bool = Boolean
  const Num = Number
  const Str = String
  const Obj = Object
  switch (typeof value) {
  case 'object': return value
  case 'boolean': return new Bool(value)
  case 'number': return new Num(value)
  case 'string': return new Str(value)
  default: return new Obj(value)
  }
}

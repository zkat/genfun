'use strict'

const Method = require('./method')
const Role = require('./role')
const util = require('./util')

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
module.exports = function genfun () {
  function gf () {
    return gf.applyGenfun(this, arguments)
  }
  Object.setPrototypeOf(gf, Genfun.prototype)
  gf.methods = []
  gf.cache = {key: [], methods: [], state: STATES.UNINITIALIZED}
  return gf
}

class Genfun extends Function {}
Genfun.prototype.isGenfun = true

const STATES = {
  UNINITIALIZED: 0,
  MONOMORPHIC: 1,
  POLYMORPHIC: 2,
  MEGAMORPHIC: 3
}

const MAX_CACHE_SIZE = 32

/**
 * Defines a method on a generic function.
 *
 * @function
 * @param {Array-like} selector - Selector array for dispatching the method.
 * @param {Function} methodFunction - Function to execute when the method
 *                                    successfully dispatches.
 */
Genfun.prototype.add = function addMethod (selector, func) {
  selector = [].slice.call(selector)
  for (var i = 0; i < selector.length; i++) {
    if (!selector.hasOwnProperty(i)) {
      selector[i] = Object.prototype
    }
  }
  this.cache = {key: [], methods: [], state: STATES.UNINITIALIZED}
  let method = new Method(this, selector, func)
  if (selector.length) {
    this.methods.push(method)
  } else {
    this.defaultMethod = method
  }
  return this
}

/**
 * Removes a previously-defined method on `genfun` that matches
 * `selector` exactly.
 *
 * @function
 * @param {Genfun} genfun - Genfun to remove a method from.
 * @param {Array-like} selector - Objects to match on when finding a
 *                                    method to remove.
 */
Genfun.prototype.rm = function removeMethod () {
  throw new Error('not yet implemented')
}

/**
 * Returns true if there are methods that apply to the given arguments on
 * `genfun`. Additionally, makes sure the cache is warmed up for the given
 * arguments.
 *
 */
Genfun.prototype.hasMethod = function hasMethod (...args) {
  const methods = this.getApplicableMethods(args || [])
  return !!(methods && methods.length)
}

/**
 * This generic function is called when `genfun` has been called and no
 * applicable method was found. The default method throws an `Error`.
 *
 * @function
 * @param {Genfun} genfun - Generic function instance that was called.
 * @param {*} newthis - value of `this` the genfun was called with.
 * @param {Array} callArgs - Arguments the genfun was called with.
 */
module.exports.noApplicableMethod = module.exports()
module.exports.noApplicableMethod.add([], (gf, thisArg, args) => {
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
let _currentMethodIdx
let _currentThis
let _currentArgs
module.exports.hasNextMethod = function hasNextMethod () {
  return (new Context()).hasNextMethod()
}

module.exports.callNextMethod = function callNextMethod (...args) {
  return (new Context()).callNextMethod(...args)
}

module.exports.noNextMethod = function () {
  throw new Error('No next method available')
}

module.exports.getContext = () => {
  return new Context()
}

class Context {
  constructor () {
    this.applicableMethods = _currentApplicableMethods
    this.methodIdx = _currentMethodIdx
    this.this = _currentThis
    this.args = _currentArgs
  }

  hasNextMethod () {
    if (this.applicableMethods) {
      return this.applicableMethods.length > this.methodIdx
    } else {
      throw new Error('hasNextMethod and callNextMethod must ' +
      'be called inside a Genfun method.')
    }
  }

  callNextMethod (...args) {
    if (this.hasNextMethod()) {
      _currentArgs = args.length ? args : this.args
      _currentThis = this.this
      _currentApplicableMethods = this.applicableMethods
      _currentMethodIdx = ++this.methodIdx
      return _currentApplicableMethods[_currentMethodIdx].func.apply(
        _currentThis, _currentArgs)
    } else {
      return module.exports.noNextMethod()
    }
  }
}

/*
 * Internal
 */
Genfun.prototype.applyGenfun = function applyGenfun (newThis, args) {
  let applicableMethods = this.getApplicableMethods(args)
  let ret, tmpCurrentMethods, tmpThis, tmpArgs, tmpIdx
  if (applicableMethods.length) {
    tmpCurrentMethods = _currentApplicableMethods
    tmpIdx = _currentMethodIdx
    tmpThis = _currentThis
    tmpArgs = _currentArgs
    _currentApplicableMethods = applicableMethods
    _currentThis = newThis
    _currentArgs = args
    _currentMethodIdx = 0
    ret = applicableMethods[0].func.apply(newThis, args)
    _currentApplicableMethods = tmpCurrentMethods
    _currentThis = tmpThis
    _currentArgs = tmpArgs
    _currentMethodIdx = tmpIdx
    return ret
  } else {
    return module.exports.noApplicableMethod(this, newThis, args)
  }
}

Genfun.prototype.getApplicableMethods = function getApplicableMethods (args) {
  if (!args.length || !this.methods.length) {
    return this.defaultMethod ? [this.defaultMethod] : []
  }
  let applicableMethods
  let maybeMethods = cachedMethods(this, args)
  if (maybeMethods) {
    applicableMethods = maybeMethods
  } else {
    applicableMethods = computeApplicableMethods(this, args)
    cacheArgs(this, args, applicableMethods)
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
  } else if (genfun.cache.key.length < MAX_CACHE_SIZE) {
    genfun.cache.state = STATES.POLYMORPHIC
  } else {
    genfun.cache.state = STATES.MEGAMORPHIC
  }
}

function cacheableProto (genfun, arg) {
  var dispatchable = util.dispatchableObject(arg)
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
    var roles = Object.hasOwnProperty.call(object, Role.roleKeyName)
    ? object[Role.roleKeyName]
    : []
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
    getPrecedenceList(util.dispatchableObject(arg))
      .forEach((obj, hierarchyPosition) => {
        findAndRankRoles(obj, hierarchyPosition, index)
      })
  })
  let applicableMethods = discoveredMethods.filter(method => {
    return (args.length === method._rank.length &&
            Method.isFullySpecified(method))
  })
  applicableMethods.sort((a, b) => Method.score(a) - Method.score(b))
  if (genfun.defaultMethod) {
    applicableMethods.push(genfun.defaultMethod)
  }
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

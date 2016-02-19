(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

module.exports = absolutize

/**
 * redefine `path` with absolute coordinates
 *
 * @param {Array} path
 * @return {Array}
 */

function absolutize(path){
	var startX = 0
	var startY = 0
	var x = 0
	var y = 0

	return path.map(function(seg){
		seg = seg.slice()
		var type = seg[0]
		var command = type.toUpperCase()

		// is relative
		if (type != command) {
			seg[0] = command
			switch (type) {
				case 'a':
					seg[6] += x
					seg[7] += y
					break
				case 'v':
					seg[1] += y
					break
				case 'h':
					seg[1] += x
					break
				default:
					for (var i = 1; i < seg.length;) {
						seg[i++] += x
						seg[i++] += y
					}
			}
		}

		// update cursor state
		switch (command) {
			case 'Z':
				x = startX
				y = startY
				break
			case 'H':
				x = seg[1]
				break
			case 'V':
				y = seg[1]
				break
			case 'M':
				x = startX = seg[1]
				y = startY = seg[2]
				break
			default:
				x = seg[seg.length - 2]
				y = seg[seg.length - 1]
		}

		return seg
	})
}

},{}],2:[function(require,module,exports){
function clone(point) { //TODO: use gl-vec2 for this
    return [point[0], point[1]]
}

function vec2(x, y) {
    return [x, y]
}

module.exports = function createBezierBuilder(opt) {
    opt = opt||{}

    var RECURSION_LIMIT = typeof opt.recursion === 'number' ? opt.recursion : 8
    var FLT_EPSILON = typeof opt.epsilon === 'number' ? opt.epsilon : 1.19209290e-7
    var PATH_DISTANCE_EPSILON = typeof opt.pathEpsilon === 'number' ? opt.pathEpsilon : 1.0

    var curve_angle_tolerance_epsilon = typeof opt.angleEpsilon === 'number' ? opt.angleEpsilon : 0.01
    var m_angle_tolerance = opt.angleTolerance || 0
    var m_cusp_limit = opt.cuspLimit || 0

    return function bezierCurve(start, c1, c2, end, scale, points) {
        if (!points)
            points = []

        scale = typeof scale === 'number' ? scale : 1.0
        var distanceTolerance = PATH_DISTANCE_EPSILON / scale
        distanceTolerance *= distanceTolerance
        begin(start, c1, c2, end, points, distanceTolerance)
        return points
    }


    ////// Based on:
    ////// https://github.com/pelson/antigrain/blob/master/agg-2.4/src/agg_curves.cpp

    function begin(start, c1, c2, end, points, distanceTolerance) {
        points.push(clone(start))
        var x1 = start[0],
            y1 = start[1],
            x2 = c1[0],
            y2 = c1[1],
            x3 = c2[0],
            y3 = c2[1],
            x4 = end[0],
            y4 = end[1]
        recursive(x1, y1, x2, y2, x3, y3, x4, y4, points, distanceTolerance, 0)
        points.push(clone(end))
    }

    function recursive(x1, y1, x2, y2, x3, y3, x4, y4, points, distanceTolerance, level) {
        if(level > RECURSION_LIMIT) 
            return

        var pi = Math.PI

        // Calculate all the mid-points of the line segments
        //----------------------
        var x12   = (x1 + x2) / 2
        var y12   = (y1 + y2) / 2
        var x23   = (x2 + x3) / 2
        var y23   = (y2 + y3) / 2
        var x34   = (x3 + x4) / 2
        var y34   = (y3 + y4) / 2
        var x123  = (x12 + x23) / 2
        var y123  = (y12 + y23) / 2
        var x234  = (x23 + x34) / 2
        var y234  = (y23 + y34) / 2
        var x1234 = (x123 + x234) / 2
        var y1234 = (y123 + y234) / 2

        if(level > 0) { // Enforce subdivision first time
            // Try to approximate the full cubic curve by a single straight line
            //------------------
            var dx = x4-x1
            var dy = y4-y1

            var d2 = Math.abs((x2 - x4) * dy - (y2 - y4) * dx)
            var d3 = Math.abs((x3 - x4) * dy - (y3 - y4) * dx)

            var da1, da2

            if(d2 > FLT_EPSILON && d3 > FLT_EPSILON) {
                // Regular care
                //-----------------
                if((d2 + d3)*(d2 + d3) <= distanceTolerance * (dx*dx + dy*dy)) {
                    // If the curvature doesn't exceed the distanceTolerance value
                    // we tend to finish subdivisions.
                    //----------------------
                    if(m_angle_tolerance < curve_angle_tolerance_epsilon) {
                        points.push(vec2(x1234, y1234))
                        return
                    }

                    // Angle & Cusp Condition
                    //----------------------
                    var a23 = Math.atan2(y3 - y2, x3 - x2)
                    da1 = Math.abs(a23 - Math.atan2(y2 - y1, x2 - x1))
                    da2 = Math.abs(Math.atan2(y4 - y3, x4 - x3) - a23)
                    if(da1 >= pi) da1 = 2*pi - da1
                    if(da2 >= pi) da2 = 2*pi - da2

                    if(da1 + da2 < m_angle_tolerance) {
                        // Finally we can stop the recursion
                        //----------------------
                        points.push(vec2(x1234, y1234))
                        return
                    }

                    if(m_cusp_limit !== 0.0) {
                        if(da1 > m_cusp_limit) {
                            points.push(vec2(x2, y2))
                            return
                        }

                        if(da2 > m_cusp_limit) {
                            points.push(vec2(x3, y3))
                            return
                        }
                    }
                }
            }
            else {
                if(d2 > FLT_EPSILON) {
                    // p1,p3,p4 are collinear, p2 is considerable
                    //----------------------
                    if(d2 * d2 <= distanceTolerance * (dx*dx + dy*dy)) {
                        if(m_angle_tolerance < curve_angle_tolerance_epsilon) {
                            points.push(vec2(x1234, y1234))
                            return
                        }

                        // Angle Condition
                        //----------------------
                        da1 = Math.abs(Math.atan2(y3 - y2, x3 - x2) - Math.atan2(y2 - y1, x2 - x1))
                        if(da1 >= pi) da1 = 2*pi - da1

                        if(da1 < m_angle_tolerance) {
                            points.push(vec2(x2, y2))
                            points.push(vec2(x3, y3))
                            return
                        }

                        if(m_cusp_limit !== 0.0) {
                            if(da1 > m_cusp_limit) {
                                points.push(vec2(x2, y2))
                                return
                            }
                        }
                    }
                }
                else if(d3 > FLT_EPSILON) {
                    // p1,p2,p4 are collinear, p3 is considerable
                    //----------------------
                    if(d3 * d3 <= distanceTolerance * (dx*dx + dy*dy)) {
                        if(m_angle_tolerance < curve_angle_tolerance_epsilon) {
                            points.push(vec2(x1234, y1234))
                            return
                        }

                        // Angle Condition
                        //----------------------
                        da1 = Math.abs(Math.atan2(y4 - y3, x4 - x3) - Math.atan2(y3 - y2, x3 - x2))
                        if(da1 >= pi) da1 = 2*pi - da1

                        if(da1 < m_angle_tolerance) {
                            points.push(vec2(x2, y2))
                            points.push(vec2(x3, y3))
                            return
                        }

                        if(m_cusp_limit !== 0.0) {
                            if(da1 > m_cusp_limit)
                            {
                                points.push(vec2(x3, y3))
                                return
                            }
                        }
                    }
                }
                else {
                    // Collinear case
                    //-----------------
                    dx = x1234 - (x1 + x4) / 2
                    dy = y1234 - (y1 + y4) / 2
                    if(dx*dx + dy*dy <= distanceTolerance) {
                        points.push(vec2(x1234, y1234))
                        return
                    }
                }
            }
        }

        // Continue subdivision
        //----------------------
        recursive(x1, y1, x12, y12, x123, y123, x1234, y1234, points, distanceTolerance, level + 1) 
        recursive(x1234, y1234, x234, y234, x34, y34, x4, y4, points, distanceTolerance, level + 1) 
    }
}

},{}],3:[function(require,module,exports){
module.exports = require('./function')()
},{"./function":2}],4:[function(require,module,exports){
var str = Object.prototype.toString

module.exports = anArray

function anArray(arr) {
  return (
       arr.BYTES_PER_ELEMENT
    && str.call(arr.buffer) === '[object ArrayBuffer]'
    || Array.isArray(arr)
  )
}

},{}],5:[function(require,module,exports){
'use strict';
module.exports = function (arr) {
	if (!Array.isArray(arr)) {
		throw new TypeError('Expected an array');
	}

	var rand;
	var tmp;
	var len = arr.length;
	var ret = arr.slice();

	while (len) {
		rand = Math.floor(Math.random() * len--);
		tmp = ret[len];
		ret[len] = ret[rand];
		ret[rand] = tmp;
	}

	return ret;
};

},{}],6:[function(require,module,exports){
// TODO: eventually deprecate this console.trace("use the `babel-register` package instead of `babel-core/register`");
module.exports = require("babel-register");

},{"babel-register":9}],7:[function(require,module,exports){
(function (global){
"use strict";

require("core-js/shim");

require("babel-regenerator-runtime");

if (global._babelPolyfill) {
  throw new Error("only one instance of babel-polyfill is allowed");
}
global._babelPolyfill = true;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"babel-regenerator-runtime":8,"core-js/shim":234}],8:[function(require,module,exports){
(function (process,global){
/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * https://raw.github.com/facebook/regenerator/master/LICENSE file. An
 * additional grant of patent rights can be found in the PATENTS file in
 * the same directory.
 */

!(function(global) {
  "use strict";

  var hasOwn = Object.prototype.hasOwnProperty;
  var undefined; // More compressible than void 0.
  var iteratorSymbol =
    typeof Symbol === "function" && Symbol.iterator || "@@iterator";

  var inModule = typeof module === "object";
  var runtime = global.regeneratorRuntime;
  if (runtime) {
    if (inModule) {
      // If regeneratorRuntime is defined globally and we're in a module,
      // make the exports object identical to regeneratorRuntime.
      module.exports = runtime;
    }
    // Don't bother evaluating the rest of this file if the runtime was
    // already defined globally.
    return;
  }

  // Define the runtime globally (as expected by generated code) as either
  // module.exports (if we're in a module) or a new, empty object.
  runtime = global.regeneratorRuntime = inModule ? module.exports : {};

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided, then outerFn.prototype instanceof Generator.
    var generator = Object.create((outerFn || Generator).prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  runtime.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype;
  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
  GeneratorFunctionPrototype.constructor = GeneratorFunction;
  GeneratorFunction.displayName = "GeneratorFunction";

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      prototype[method] = function(arg) {
        return this._invoke(method, arg);
      };
    });
  }

  runtime.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  runtime.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `value instanceof AwaitArgument` to determine if the yielded value is
  // meant to be awaited. Some may consider the name of this method too
  // cutesy, but they are curmudgeons.
  runtime.awrap = function(arg) {
    return new AwaitArgument(arg);
  };

  function AwaitArgument(arg) {
    this.arg = arg;
  }

  function AsyncIterator(generator) {
    // This invoke function is written in a style that assumes some
    // calling function (or Promise) will handle exceptions.
    function invoke(method, arg) {
      var result = generator[method](arg);
      var value = result.value;
      return value instanceof AwaitArgument
        ? Promise.resolve(value.arg).then(invokeNext, invokeThrow)
        : Promise.resolve(value).then(function(unwrapped) {
            // When a yielded Promise is resolved, its final value becomes
            // the .value of the Promise<{value,done}> result for the
            // current iteration. If the Promise is rejected, however, the
            // result for this iteration will be rejected with the same
            // reason. Note that rejections of yielded Promises are not
            // thrown back into the generator function, as is the case
            // when an awaited Promise is rejected. This difference in
            // behavior between yield and await is important, because it
            // allows the consumer to decide what to do with the yielded
            // rejection (swallow it and continue, manually .throw it back
            // into the generator, abandon iteration, whatever). With
            // await, by contrast, there is no opportunity to examine the
            // rejection reason outside the generator function, so the
            // only option is to throw it from the await expression, and
            // let the generator function handle the exception.
            result.value = unwrapped;
            return result;
          });
    }

    if (typeof process === "object" && process.domain) {
      invoke = process.domain.bind(invoke);
    }

    var invokeNext = invoke.bind(generator, "next");
    var invokeThrow = invoke.bind(generator, "throw");
    var invokeReturn = invoke.bind(generator, "return");
    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return invoke(method, arg);
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : new Promise(function (resolve) {
          resolve(callInvokeWithMethodAndArg());
        });
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  runtime.async = function(innerFn, outerFn, self, tryLocsList) {
    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList)
    );

    return runtime.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          if (method === "return" ||
              (method === "throw" && delegate.iterator[method] === undefined)) {
            // A return or throw (when the delegate iterator has no throw
            // method) always terminates the yield* loop.
            context.delegate = null;

            // If the delegate iterator has a return method, give it a
            // chance to clean up.
            var returnMethod = delegate.iterator["return"];
            if (returnMethod) {
              var record = tryCatch(returnMethod, delegate.iterator, arg);
              if (record.type === "throw") {
                // If the return method threw an exception, let that
                // exception prevail over the original return or throw.
                method = "throw";
                arg = record.arg;
                continue;
              }
            }

            if (method === "return") {
              // Continue with the outer return, now that the delegate
              // iterator has been terminated.
              continue;
            }
          }

          var record = tryCatch(
            delegate.iterator[method],
            delegate.iterator,
            arg
          );

          if (record.type === "throw") {
            context.delegate = null;

            // Like returning generator.throw(uncaught), but without the
            // overhead of an extra function call.
            method = "throw";
            arg = record.arg;
            continue;
          }

          // Delegate generator ran and handled its own exceptions so
          // regardless of what the method was, we continue as if it is
          // "next" with an undefined arg.
          method = "next";
          arg = undefined;

          var info = record.arg;
          if (info.done) {
            context[delegate.resultName] = info.value;
            context.next = delegate.nextLoc;
          } else {
            state = GenStateSuspendedYield;
            return info;
          }

          context.delegate = null;
        }

        if (method === "next") {
          context._sent = arg;

          if (state === GenStateSuspendedYield) {
            context.sent = arg;
          } else {
            context.sent = undefined;
          }
        } else if (method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw arg;
          }

          if (context.dispatchException(arg)) {
            // If the dispatched exception was caught by a catch block,
            // then let that catch block handle the exception normally.
            method = "next";
            arg = undefined;
          }

        } else if (method === "return") {
          context.abrupt("return", arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          var info = {
            value: record.arg,
            done: context.done
          };

          if (record.arg === ContinueSentinel) {
            if (context.delegate && method === "next") {
              // Deliberately forget the last sent value so that we don't
              // accidentally pass it on to the delegate.
              arg = undefined;
            }
          } else {
            return info;
          }

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(arg) call above.
          method = "throw";
          arg = record.arg;
        }
      }
    };
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  Gp[iteratorSymbol] = function() {
    return this;
  };

  Gp.toString = function() {
    return "[object Generator]";
  };

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  runtime.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  runtime.values = values;

  function doneResult() {
    return { value: undefined, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      this.sent = undefined;
      this.done = false;
      this.delegate = null;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;
        return !!caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.next = finallyEntry.finallyLoc;
      } else {
        this.complete(record);
      }

      return ContinueSentinel;
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = record.arg;
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      return ContinueSentinel;
    }
  };
})(
  // Among the various tricks for obtaining a reference to the global
  // object, this seems to be the most reliable technique that does not
  // use indirect eval (which violates Content Security Policy).
  typeof global === "object" ? global :
  typeof window === "object" ? window :
  typeof self === "object" ? self : this
);

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":314}],9:[function(require,module,exports){
// required to safely use babel/register within a browserify codebase

"use strict";

exports.__esModule = true;

exports["default"] = function () {};

module.exports = exports["default"];
},{}],10:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],11:[function(require,module,exports){
'use strict'

var rationalize = require('./lib/rationalize')

module.exports = add

function add(a, b) {
  return rationalize(
    a[0].mul(b[1]).add(b[0].mul(a[1])),
    a[1].mul(b[1]))
}

},{"./lib/rationalize":21}],12:[function(require,module,exports){
'use strict'

module.exports = cmp

function cmp(a, b) {
    return a[0].mul(b[1]).cmp(b[0].mul(a[1]))
}

},{}],13:[function(require,module,exports){
'use strict'

var rationalize = require('./lib/rationalize')

module.exports = div

function div(a, b) {
  return rationalize(a[0].mul(b[1]), a[1].mul(b[0]))
}

},{"./lib/rationalize":21}],14:[function(require,module,exports){
'use strict'

var isRat = require('./is-rat')
var isBN = require('./lib/is-bn')
var num2bn = require('./lib/num-to-bn')
var str2bn = require('./lib/str-to-bn')
var rationalize = require('./lib/rationalize')
var div = require('./div')

module.exports = makeRational

function makeRational(numer, denom) {
  if(isRat(numer)) {
    if(denom) {
      return div(numer, makeRational(denom))
    }
    return [numer[0].clone(), numer[1].clone()]
  }
  var shift = 0
  var a, b
  if(isBN(numer)) {
    a = numer.clone()
  } else if(typeof numer === 'string') {
    a = str2bn(numer)
  } else if(numer === 0) {
    return [num2bn(0), num2bn(1)]
  } else if(numer === Math.floor(numer)) {
    a = num2bn(numer)
  } else {
    while(numer !== Math.floor(numer)) {
      numer = numer * Math.pow(2, 256)
      shift -= 256
    }
    a = num2bn(numer)
  }
  if(isRat(denom)) {
    a.mul(denom[1])
    b = denom[0].clone()
  } else if(isBN(denom)) {
    b = denom.clone()
  } else if(typeof denom === 'string') {
    b = str2bn(denom)
  } else if(!denom) {
    b = num2bn(1)
  } else if(denom === Math.floor(denom)) {
    b = num2bn(denom)
  } else {
    while(denom !== Math.floor(denom)) {
      denom = denom * Math.pow(2, 256)
      shift += 256
    }
    b = num2bn(denom)
  }
  if(shift > 0) {
    a = a.shln(shift)
  } else if(shift < 0) {
    b = b.shln(-shift)
  }
  return rationalize(a, b)
}

},{"./div":13,"./is-rat":15,"./lib/is-bn":19,"./lib/num-to-bn":20,"./lib/rationalize":21,"./lib/str-to-bn":22}],15:[function(require,module,exports){
'use strict'

var isBN = require('./lib/is-bn')

module.exports = isRat

function isRat(x) {
  return Array.isArray(x) && x.length === 2 && isBN(x[0]) && isBN(x[1])
}

},{"./lib/is-bn":19}],16:[function(require,module,exports){
'use strict'

var bn = require('bn.js')

module.exports = sign

function sign(x) {
  return x.cmp(new bn(0))
}

},{"bn.js":24}],17:[function(require,module,exports){
'use strict'

module.exports = bn2num

//TODO: Make this better
function bn2num(b) {
  var l = b.length
  var words = b.words
  var out = 0
  if (l === 1) {
    out = words[0]
  } else if (l === 2) {
    out = words[0] + (words[1] * 0x4000000)
  } else {
    var out = 0
    for (var i = 0; i < l; i++) {
      var w = words[i]
      out += w * Math.pow(0x4000000, i)
    }
  }
  return b.sign ? -out : out
}

},{}],18:[function(require,module,exports){
'use strict'

var db = require('double-bits')
var ctz = require('bit-twiddle').countTrailingZeros

module.exports = ctzNumber

//Counts the number of trailing zeros
function ctzNumber(x) {
  var l = ctz(db.lo(x))
  if(l < 32) {
    return l
  }
  var h = ctz(db.hi(x))
  if(h > 20) {
    return 52
  }
  return h + 32
}

},{"bit-twiddle":29,"double-bits":240}],19:[function(require,module,exports){
'use strict'

var BN = require('bn.js')

module.exports = isBN

//Test if x is a bignumber
//FIXME: obviously this is the wrong way to do it
function isBN(x) {
  return x && typeof x === 'object' && Boolean(x.words)
}

},{"bn.js":24}],20:[function(require,module,exports){
'use strict'

var BN = require('bn.js')
var db = require('double-bits')

module.exports = num2bn

function num2bn(x) {
  var e = db.exponent(x)
  if(e < 52) {
    return new BN(x)
  } else {
    return (new BN(x * Math.pow(2, 52-e))).shln(e-52)
  }
}

},{"bn.js":24,"double-bits":240}],21:[function(require,module,exports){
'use strict'

var num2bn = require('./num-to-bn')
var sign = require('./bn-sign')

module.exports = rationalize

function rationalize(numer, denom) {
  var snumer = sign(numer)
  var sdenom = sign(denom)
  if(snumer === 0) {
    return [num2bn(0), num2bn(1)]
  }
  if(sdenom === 0) {
    return [num2bn(0), num2bn(0)]
  }
  if(sdenom < 0) {
    numer = numer.neg()
    denom = denom.neg()
  }
  var d = numer.gcd(denom)
  if(d.cmpn(1)) {
    return [ numer.div(d), denom.div(d) ]
  }
  return [ numer, denom ]
}

},{"./bn-sign":16,"./num-to-bn":20}],22:[function(require,module,exports){
'use strict'

var BN = require('bn.js')

module.exports = str2BN

function str2BN(x) {
  return new BN(x)
}

},{"bn.js":24}],23:[function(require,module,exports){
'use strict'

var rationalize = require('./lib/rationalize')

module.exports = mul

function mul(a, b) {
  return rationalize(a[0].mul(b[0]), a[1].mul(b[1]))
}

},{"./lib/rationalize":21}],24:[function(require,module,exports){
(function (module, exports) {

'use strict';

// Utils

function assert(val, msg) {
  if (!val)
    throw new Error(msg || 'Assertion failed');
}

// Could use `inherits` module, but don't want to move from single file
// architecture yet.
function inherits(ctor, superCtor) {
  ctor.super_ = superCtor;
  var TempCtor = function () {};
  TempCtor.prototype = superCtor.prototype;
  ctor.prototype = new TempCtor();
  ctor.prototype.constructor = ctor;
}

// BN

function BN(number, base, endian) {
  // May be `new BN(bn)` ?
  if (number !== null &&
      typeof number === 'object' &&
      Array.isArray(number.words)) {
    return number;
  }

  this.sign = false;
  this.words = null;
  this.length = 0;

  // Reduction context
  this.red = null;

  if (base === 'le' || base === 'be') {
    endian = base;
    base = 10;
  }

  if (number !== null)
    this._init(number || 0, base || 10, endian || 'be');
}
if (typeof module === 'object')
  module.exports = BN;
else
  exports.BN = BN;

BN.BN = BN;
BN.wordSize = 26;

BN.prototype._init = function init(number, base, endian) {
  if (typeof number === 'number') {
    return this._initNumber(number, base, endian);
  } else if (typeof number === 'object') {
    return this._initArray(number, base, endian);
  }
  if (base === 'hex')
    base = 16;
  assert(base === (base | 0) && base >= 2 && base <= 36);

  number = number.toString().replace(/\s+/g, '');
  var start = 0;
  if (number[0] === '-')
    start++;

  if (base === 16)
    this._parseHex(number, start);
  else
    this._parseBase(number, base, start);

  if (number[0] === '-')
    this.sign = true;

  this.strip();

  if (endian !== 'le')
    return;

  this._initArray(this.toArray(), base, endian);
};

BN.prototype._initNumber = function _initNumber(number, base, endian) {
  if (number < 0) {
    this.sign = true;
    number = -number;
  }
  if (number < 0x4000000) {
    this.words = [ number & 0x3ffffff ];
    this.length = 1;
  } else if (number < 0x10000000000000) {
    this.words = [
      number & 0x3ffffff,
      (number / 0x4000000) & 0x3ffffff
    ];
    this.length = 2;
  } else {
    assert(number < 0x20000000000000); // 2 ^ 53 (unsafe)
    this.words = [
      number & 0x3ffffff,
      (number / 0x4000000) & 0x3ffffff,
      1
    ];
    this.length = 3;
  }

  if (endian !== 'le')
    return;

  // Reverse the bytes
  this._initArray(this.toArray(), base, endian);
};

BN.prototype._initArray = function _initArray(number, base, endian) {
  // Perhaps a Uint8Array
  assert(typeof number.length === 'number');
  if (number.length <= 0) {
    this.words = [ 0 ];
    this.length = 1;
    return this;
  }

  this.length = Math.ceil(number.length / 3);
  this.words = new Array(this.length);
  for (var i = 0; i < this.length; i++)
    this.words[i] = 0;

  var off = 0;
  if (endian === 'be') {
    for (var i = number.length - 1, j = 0; i >= 0; i -= 3) {
      var w = number[i] | (number[i - 1] << 8) | (number[i - 2] << 16);
      this.words[j] |= (w << off) & 0x3ffffff;
      this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
      off += 24;
      if (off >= 26) {
        off -= 26;
        j++;
      }
    }
  } else if (endian === 'le') {
    for (var i = 0, j = 0; i < number.length; i += 3) {
      var w = number[i] | (number[i + 1] << 8) | (number[i + 2] << 16);
      this.words[j] |= (w << off) & 0x3ffffff;
      this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
      off += 24;
      if (off >= 26) {
        off -= 26;
        j++;
      }
    }
  }
  return this.strip();
};

function parseHex(str, start, end) {
  var r = 0;
  var len = Math.min(str.length, end);
  for (var i = start; i < len; i++) {
    var c = str.charCodeAt(i) - 48;

    r <<= 4;

    // 'a' - 'f'
    if (c >= 49 && c <= 54)
      r |= c - 49 + 0xa;

    // 'A' - 'F'
    else if (c >= 17 && c <= 22)
      r |= c - 17 + 0xa;

    // '0' - '9'
    else
      r |= c & 0xf;
  }
  return r;
}

BN.prototype._parseHex = function _parseHex(number, start) {
  // Create possibly bigger array to ensure that it fits the number
  this.length = Math.ceil((number.length - start) / 6);
  this.words = new Array(this.length);
  for (var i = 0; i < this.length; i++)
    this.words[i] = 0;

  // Scan 24-bit chunks and add them to the number
  var off = 0;
  for (var i = number.length - 6, j = 0; i >= start; i -= 6) {
    var w = parseHex(number, i, i + 6);
    this.words[j] |= (w << off) & 0x3ffffff;
    this.words[j + 1] |= w >>> (26 - off) & 0x3fffff;
    off += 24;
    if (off >= 26) {
      off -= 26;
      j++;
    }
  }
  if (i + 6 !== start) {
    var w = parseHex(number, start, i + 6);
    this.words[j] |= (w << off) & 0x3ffffff;
    this.words[j + 1] |= w >>> (26 - off) & 0x3fffff;
  }
  this.strip();
};

function parseBase(str, start, end, mul) {
  var r = 0;
  var len = Math.min(str.length, end);
  for (var i = start; i < len; i++) {
    var c = str.charCodeAt(i) - 48;

    r *= mul;

    // 'a'
    if (c >= 49)
      r += c - 49 + 0xa;

    // 'A'
    else if (c >= 17)
      r += c - 17 + 0xa;

    // '0' - '9'
    else
      r += c;
  }
  return r;
}

BN.prototype._parseBase = function _parseBase(number, base, start) {
  // Initialize as zero
  this.words = [ 0 ];
  this.length = 1;

  // Find length of limb in base
  for (var limbLen = 0, limbPow = 1; limbPow <= 0x3ffffff; limbPow *= base)
    limbLen++;
  limbLen--;
  limbPow = (limbPow / base) | 0;

  var total = number.length - start;
  var mod = total % limbLen;
  var end = Math.min(total, total - mod) + start;

  var word = 0;
  for (var i = start; i < end; i += limbLen) {
    word = parseBase(number, i, i + limbLen, base);

    this.imuln(limbPow);
    if (this.words[0] + word < 0x4000000)
      this.words[0] += word;
    else
      this._iaddn(word);
  }

  if (mod !== 0) {
    var pow = 1;
    var word = parseBase(number, i, number.length, base);

    for (var i = 0; i < mod; i++)
      pow *= base;
    this.imuln(pow);
    if (this.words[0] + word < 0x4000000)
      this.words[0] += word;
    else
      this._iaddn(word);
  }
};

BN.prototype.copy = function copy(dest) {
  dest.words = new Array(this.length);
  for (var i = 0; i < this.length; i++)
    dest.words[i] = this.words[i];
  dest.length = this.length;
  dest.sign = this.sign;
  dest.red = this.red;
};

BN.prototype.clone = function clone() {
  var r = new BN(null);
  this.copy(r);
  return r;
};

// Remove leading `0` from `this`
BN.prototype.strip = function strip() {
  while (this.length > 1 && this.words[this.length - 1] === 0)
    this.length--;
  return this._normSign();
};

BN.prototype._normSign = function _normSign() {
  // -0 = 0
  if (this.length === 1 && this.words[0] === 0)
    this.sign = false;
  return this;
};

BN.prototype.inspect = function inspect() {
  return (this.red ? '<BN-R: ' : '<BN: ') + this.toString(16) + '>';
};

/*

var zeros = [];
var groupSizes = [];
var groupBases = [];

var s = '';
var i = -1;
while (++i < BN.wordSize) {
  zeros[i] = s;
  s += '0';
}
groupSizes[0] = 0;
groupSizes[1] = 0;
groupBases[0] = 0;
groupBases[1] = 0;
var base = 2 - 1;
while (++base < 36 + 1) {
  var groupSize = 0;
  var groupBase = 1;
  while (groupBase < (1 << BN.wordSize) / base) {
    groupBase *= base;
    groupSize += 1;
  }
  groupSizes[base] = groupSize;
  groupBases[base] = groupBase;
}

*/

var zeros = [
  '',
  '0',
  '00',
  '000',
  '0000',
  '00000',
  '000000',
  '0000000',
  '00000000',
  '000000000',
  '0000000000',
  '00000000000',
  '000000000000',
  '0000000000000',
  '00000000000000',
  '000000000000000',
  '0000000000000000',
  '00000000000000000',
  '000000000000000000',
  '0000000000000000000',
  '00000000000000000000',
  '000000000000000000000',
  '0000000000000000000000',
  '00000000000000000000000',
  '000000000000000000000000',
  '0000000000000000000000000'
];

var groupSizes = [
  0, 0,
  25, 16, 12, 11, 10, 9, 8,
  8, 7, 7, 7, 7, 6, 6,
  6, 6, 6, 6, 6, 5, 5,
  5, 5, 5, 5, 5, 5, 5,
  5, 5, 5, 5, 5, 5, 5
];

var groupBases = [
  0, 0,
  33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216,
  43046721, 10000000, 19487171, 35831808, 62748517, 7529536, 11390625,
  16777216, 24137569, 34012224, 47045881, 64000000, 4084101, 5153632,
  6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149,
  24300000, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176
];

BN.prototype.toString = function toString(base, padding) {
  base = base || 10;
  if (base === 16 || base === 'hex') {
    var out = '';
    var off = 0;
    var padding = padding | 0 || 1;
    var carry = 0;
    for (var i = 0; i < this.length; i++) {
      var w = this.words[i];
      var word = (((w << off) | carry) & 0xffffff).toString(16);
      carry = (w >>> (24 - off)) & 0xffffff;
      if (carry !== 0 || i !== this.length - 1)
        out = zeros[6 - word.length] + word + out;
      else
        out = word + out;
      off += 2;
      if (off >= 26) {
        off -= 26;
        i--;
      }
    }
    if (carry !== 0)
      out = carry.toString(16) + out;
    while (out.length % padding !== 0)
      out = '0' + out;
    if (this.sign)
      out = '-' + out;
    return out;
  } else if (base === (base | 0) && base >= 2 && base <= 36) {
    // var groupSize = Math.floor(BN.wordSize * Math.LN2 / Math.log(base));
    var groupSize = groupSizes[base];
    // var groupBase = Math.pow(base, groupSize);
    var groupBase = groupBases[base];
    var out = '';
    var c = this.clone();
    c.sign = false;
    while (c.cmpn(0) !== 0) {
      var r = c.modn(groupBase).toString(base);
      c = c.idivn(groupBase);

      if (c.cmpn(0) !== 0)
        out = zeros[groupSize - r.length] + r + out;
      else
        out = r + out;
    }
    if (this.cmpn(0) === 0)
      out = '0' + out;
    if (this.sign)
      out = '-' + out;
    return out;
  } else {
    assert(false, 'Base should be between 2 and 36');
  }
};

BN.prototype.toJSON = function toJSON() {
  return this.toString(16);
};

BN.prototype.toArray = function toArray(endian) {
  this.strip();
  var res = new Array(this.byteLength());
  res[0] = 0;

  var q = this.clone();
  if (endian !== 'le') {
    // Assume big-endian
    for (var i = 0; q.cmpn(0) !== 0; i++) {
      var b = q.andln(0xff);
      q.ishrn(8);

      res[res.length - i - 1] = b;
    }
  } else {
    // Assume little-endian
    for (var i = 0; q.cmpn(0) !== 0; i++) {
      var b = q.andln(0xff);
      q.ishrn(8);

      res[i] = b;
    }
  }

  return res;
};

if (Math.clz32) {
  BN.prototype._countBits = function _countBits(w) {
    return 32 - Math.clz32(w);
  };
} else {
  BN.prototype._countBits = function _countBits(w) {
    var t = w;
    var r = 0;
    if (t >= 0x1000) {
      r += 13;
      t >>>= 13;
    }
    if (t >= 0x40) {
      r += 7;
      t >>>= 7;
    }
    if (t >= 0x8) {
      r += 4;
      t >>>= 4;
    }
    if (t >= 0x02) {
      r += 2;
      t >>>= 2;
    }
    return r + t;
  };
}

BN.prototype._zeroBits = function _zeroBits(w) {
  // Short-cut
  if (w === 0)
    return 26;

  var t = w;
  var r = 0;
  if ((t & 0x1fff) === 0) {
    r += 13;
    t >>>= 13;
  }
  if ((t & 0x7f) === 0) {
    r += 7;
    t >>>= 7;
  }
  if ((t & 0xf) === 0) {
    r += 4;
    t >>>= 4;
  }
  if ((t & 0x3) === 0) {
    r += 2;
    t >>>= 2;
  }
  if ((t & 0x1) === 0)
    r++;
  return r;
};

// Return number of used bits in a BN
BN.prototype.bitLength = function bitLength() {
  var hi = 0;
  var w = this.words[this.length - 1];
  var hi = this._countBits(w);
  return (this.length - 1) * 26 + hi;
};

// Number of trailing zero bits
BN.prototype.zeroBits = function zeroBits() {
  if (this.cmpn(0) === 0)
    return 0;

  var r = 0;
  for (var i = 0; i < this.length; i++) {
    var b = this._zeroBits(this.words[i]);
    r += b;
    if (b !== 26)
      break;
  }
  return r;
};

BN.prototype.byteLength = function byteLength() {
  return Math.ceil(this.bitLength() / 8);
};

// Return negative clone of `this`
BN.prototype.neg = function neg() {
  if (this.cmpn(0) === 0)
    return this.clone();

  var r = this.clone();
  r.sign = !this.sign;
  return r;
};


// Or `num` with `this` in-place
BN.prototype.ior = function ior(num) {
  this.sign = this.sign || num.sign;

  while (this.length < num.length)
    this.words[this.length++] = 0;

  for (var i = 0; i < num.length; i++)
    this.words[i] = this.words[i] | num.words[i];

  return this.strip();
};


// Or `num` with `this`
BN.prototype.or = function or(num) {
  if (this.length > num.length)
    return this.clone().ior(num);
  else
    return num.clone().ior(this);
};


// And `num` with `this` in-place
BN.prototype.iand = function iand(num) {
  this.sign = this.sign && num.sign;

  // b = min-length(num, this)
  var b;
  if (this.length > num.length)
    b = num;
  else
    b = this;

  for (var i = 0; i < b.length; i++)
    this.words[i] = this.words[i] & num.words[i];

  this.length = b.length;

  return this.strip();
};


// And `num` with `this`
BN.prototype.and = function and(num) {
  if (this.length > num.length)
    return this.clone().iand(num);
  else
    return num.clone().iand(this);
};


// Xor `num` with `this` in-place
BN.prototype.ixor = function ixor(num) {
  this.sign = this.sign || num.sign;

  // a.length > b.length
  var a;
  var b;
  if (this.length > num.length) {
    a = this;
    b = num;
  } else {
    a = num;
    b = this;
  }

  for (var i = 0; i < b.length; i++)
    this.words[i] = a.words[i] ^ b.words[i];

  if (this !== a)
    for (; i < a.length; i++)
      this.words[i] = a.words[i];

  this.length = a.length;

  return this.strip();
};


// Xor `num` with `this`
BN.prototype.xor = function xor(num) {
  if (this.length > num.length)
    return this.clone().ixor(num);
  else
    return num.clone().ixor(this);
};


// Set `bit` of `this`
BN.prototype.setn = function setn(bit, val) {
  assert(typeof bit === 'number' && bit >= 0);

  var off = (bit / 26) | 0;
  var wbit = bit % 26;

  while (this.length <= off)
    this.words[this.length++] = 0;

  if (val)
    this.words[off] = this.words[off] | (1 << wbit);
  else
    this.words[off] = this.words[off] & ~(1 << wbit);

  return this.strip();
};


// Add `num` to `this` in-place
BN.prototype.iadd = function iadd(num) {
  // negative + positive
  if (this.sign && !num.sign) {
    this.sign = false;
    var r = this.isub(num);
    this.sign = !this.sign;
    return this._normSign();

  // positive + negative
  } else if (!this.sign && num.sign) {
    num.sign = false;
    var r = this.isub(num);
    num.sign = true;
    return r._normSign();
  }

  // a.length > b.length
  var a;
  var b;
  if (this.length > num.length) {
    a = this;
    b = num;
  } else {
    a = num;
    b = this;
  }

  var carry = 0;
  for (var i = 0; i < b.length; i++) {
    var r = a.words[i] + b.words[i] + carry;
    this.words[i] = r & 0x3ffffff;
    carry = r >>> 26;
  }
  for (; carry !== 0 && i < a.length; i++) {
    var r = a.words[i] + carry;
    this.words[i] = r & 0x3ffffff;
    carry = r >>> 26;
  }

  this.length = a.length;
  if (carry !== 0) {
    this.words[this.length] = carry;
    this.length++;
  // Copy the rest of the words
  } else if (a !== this) {
    for (; i < a.length; i++)
      this.words[i] = a.words[i];
  }

  return this;
};

// Add `num` to `this`
BN.prototype.add = function add(num) {
  if (num.sign && !this.sign) {
    num.sign = false;
    var res = this.sub(num);
    num.sign = true;
    return res;
  } else if (!num.sign && this.sign) {
    this.sign = false;
    var res = num.sub(this);
    this.sign = true;
    return res;
  }

  if (this.length > num.length)
    return this.clone().iadd(num);
  else
    return num.clone().iadd(this);
};

// Subtract `num` from `this` in-place
BN.prototype.isub = function isub(num) {
  // this - (-num) = this + num
  if (num.sign) {
    num.sign = false;
    var r = this.iadd(num);
    num.sign = true;
    return r._normSign();

  // -this - num = -(this + num)
  } else if (this.sign) {
    this.sign = false;
    this.iadd(num);
    this.sign = true;
    return this._normSign();
  }

  // At this point both numbers are positive
  var cmp = this.cmp(num);

  // Optimization - zeroify
  if (cmp === 0) {
    this.sign = false;
    this.length = 1;
    this.words[0] = 0;
    return this;
  }

  // a > b
  var a;
  var b;
  if (cmp > 0) {
    a = this;
    b = num;
  } else {
    a = num;
    b = this;
  }

  var carry = 0;
  for (var i = 0; i < b.length; i++) {
    var r = a.words[i] - b.words[i] + carry;
    carry = r >> 26;
    this.words[i] = r & 0x3ffffff;
  }
  for (; carry !== 0 && i < a.length; i++) {
    var r = a.words[i] + carry;
    carry = r >> 26;
    this.words[i] = r & 0x3ffffff;
  }

  // Copy rest of the words
  if (carry === 0 && i < a.length && a !== this)
    for (; i < a.length; i++)
      this.words[i] = a.words[i];
  this.length = Math.max(this.length, i);

  if (a !== this)
    this.sign = true;

  return this.strip();
};

// Subtract `num` from `this`
BN.prototype.sub = function sub(num) {
  return this.clone().isub(num);
};

/*
// NOTE: This could be potentionally used to generate loop-less multiplications
function _genCombMulTo(alen, blen) {
  var len = alen + blen - 1;
  var src = [
    'var a = this.words, b = num.words, o = out.words, c = 0, w, ' +
        'mask = 0x3ffffff, shift = 0x4000000;',
    'out.length = ' + len + ';'
  ];
  for (var k = 0; k < len; k++) {
    var minJ = Math.max(0, k - alen + 1);
    var maxJ = Math.min(k, blen - 1);

    for (var j = minJ; j <= maxJ; j++) {
      var i = k - j;
      var mul = 'a[' + i + '] * b[' + j + ']';

      if (j === minJ) {
        src.push('w = ' + mul + ' + c;');
        src.push('c = (w / shift) | 0;');
      } else {
        src.push('w += ' + mul + ';');
        src.push('c += (w / shift) | 0;');
      }
      src.push('w &= mask;');
    }
    src.push('o[' + k + '] = w;');
  }
  src.push('if (c !== 0) {',
           '  o[' + k + '] = c;',
           '  out.length++;',
           '}',
           'return out;');

  return src.join('\n');
}
*/

BN.prototype._smallMulTo = function _smallMulTo(num, out) {
  out.sign = num.sign !== this.sign;
  out.length = this.length + num.length;

  var carry = 0;
  for (var k = 0; k < out.length - 1; k++) {
    // Sum all words with the same `i + j = k` and accumulate `ncarry`,
    // note that ncarry could be >= 0x3ffffff
    var ncarry = carry >>> 26;
    var rword = carry & 0x3ffffff;
    var maxJ = Math.min(k, num.length - 1);
    for (var j = Math.max(0, k - this.length + 1); j <= maxJ; j++) {
      var i = k - j;
      var a = this.words[i] | 0;
      var b = num.words[j] | 0;
      var r = a * b;

      var lo = r & 0x3ffffff;
      ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
      lo = (lo + rword) | 0;
      rword = lo & 0x3ffffff;
      ncarry = (ncarry + (lo >>> 26)) | 0;
    }
    out.words[k] = rword;
    carry = ncarry;
  }
  if (carry !== 0) {
    out.words[k] = carry;
  } else {
    out.length--;
  }

  return out.strip();
};

BN.prototype._bigMulTo = function _bigMulTo(num, out) {
  out.sign = num.sign !== this.sign;
  out.length = this.length + num.length;

  var carry = 0;
  var hncarry = 0;
  for (var k = 0; k < out.length - 1; k++) {
    // Sum all words with the same `i + j = k` and accumulate `ncarry`,
    // note that ncarry could be >= 0x3ffffff
    var ncarry = hncarry;
    hncarry = 0;
    var rword = carry & 0x3ffffff;
    var maxJ = Math.min(k, num.length - 1);
    for (var j = Math.max(0, k - this.length + 1); j <= maxJ; j++) {
      var i = k - j;
      var a = this.words[i] | 0;
      var b = num.words[j] | 0;
      var r = a * b;

      var lo = r & 0x3ffffff;
      ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
      lo = (lo + rword) | 0;
      rword = lo & 0x3ffffff;
      ncarry = (ncarry + (lo >>> 26)) | 0;

      hncarry += ncarry >>> 26;
      ncarry &= 0x3ffffff;
    }
    out.words[k] = rword;
    carry = ncarry;
    ncarry = hncarry;
  }
  if (carry !== 0) {
    out.words[k] = carry;
  } else {
    out.length--;
  }

  return out.strip();
};

BN.prototype.mulTo = function mulTo(num, out) {
  var res;
  if (this.length + num.length < 63)
    res = this._smallMulTo(num, out);
  else
    res = this._bigMulTo(num, out);
  return res;
};

// Multiply `this` by `num`
BN.prototype.mul = function mul(num) {
  var out = new BN(null);
  out.words = new Array(this.length + num.length);
  return this.mulTo(num, out);
};

// In-place Multiplication
BN.prototype.imul = function imul(num) {
  if (this.cmpn(0) === 0 || num.cmpn(0) === 0) {
    this.words[0] = 0;
    this.length = 1;
    return this;
  }

  var tlen = this.length;
  var nlen = num.length;

  this.sign = num.sign !== this.sign;
  this.length = this.length + num.length;
  this.words[this.length - 1] = 0;

  for (var k = this.length - 2; k >= 0; k--) {
    // Sum all words with the same `i + j = k` and accumulate `carry`,
    // note that carry could be >= 0x3ffffff
    var carry = 0;
    var rword = 0;
    var maxJ = Math.min(k, nlen - 1);
    for (var j = Math.max(0, k - tlen + 1); j <= maxJ; j++) {
      var i = k - j;
      var a = this.words[i];
      var b = num.words[j];
      var r = a * b;

      var lo = r & 0x3ffffff;
      carry += (r / 0x4000000) | 0;
      lo += rword;
      rword = lo & 0x3ffffff;
      carry += lo >>> 26;
    }
    this.words[k] = rword;
    this.words[k + 1] += carry;
    carry = 0;
  }

  // Propagate overflows
  var carry = 0;
  for (var i = 1; i < this.length; i++) {
    var w = this.words[i] + carry;
    this.words[i] = w & 0x3ffffff;
    carry = w >>> 26;
  }

  return this.strip();
};

BN.prototype.imuln = function imuln(num) {
  assert(typeof num === 'number');

  // Carry
  var carry = 0;
  for (var i = 0; i < this.length; i++) {
    var w = this.words[i] * num;
    var lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
    carry >>= 26;
    carry += (w / 0x4000000) | 0;
    // NOTE: lo is 27bit maximum
    carry += lo >>> 26;
    this.words[i] = lo & 0x3ffffff;
  }

  if (carry !== 0) {
    this.words[i] = carry;
    this.length++;
  }

  return this;
};

BN.prototype.muln = function muln(num) {
  return this.clone().imuln(num);
};

// `this` * `this`
BN.prototype.sqr = function sqr() {
  return this.mul(this);
};

// `this` * `this` in-place
BN.prototype.isqr = function isqr() {
  return this.mul(this);
};

// Shift-left in-place
BN.prototype.ishln = function ishln(bits) {
  assert(typeof bits === 'number' && bits >= 0);
  var r = bits % 26;
  var s = (bits - r) / 26;
  var carryMask = (0x3ffffff >>> (26 - r)) << (26 - r);

  if (r !== 0) {
    var carry = 0;
    for (var i = 0; i < this.length; i++) {
      var newCarry = this.words[i] & carryMask;
      var c = (this.words[i] - newCarry) << r;
      this.words[i] = c | carry;
      carry = newCarry >>> (26 - r);
    }
    if (carry) {
      this.words[i] = carry;
      this.length++;
    }
  }

  if (s !== 0) {
    for (var i = this.length - 1; i >= 0; i--)
      this.words[i + s] = this.words[i];
    for (var i = 0; i < s; i++)
      this.words[i] = 0;
    this.length += s;
  }

  return this.strip();
};

// Shift-right in-place
// NOTE: `hint` is a lowest bit before trailing zeroes
// NOTE: if `extended` is present - it will be filled with destroyed bits
BN.prototype.ishrn = function ishrn(bits, hint, extended) {
  assert(typeof bits === 'number' && bits >= 0);
  var h;
  if (hint)
    h = (hint - (hint % 26)) / 26;
  else
    h = 0;

  var r = bits % 26;
  var s = Math.min((bits - r) / 26, this.length);
  var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
  var maskedWords = extended;

  h -= s;
  h = Math.max(0, h);

  // Extended mode, copy masked part
  if (maskedWords) {
    for (var i = 0; i < s; i++)
      maskedWords.words[i] = this.words[i];
    maskedWords.length = s;
  }

  if (s === 0) {
    // No-op, we should not move anything at all
  } else if (this.length > s) {
    this.length -= s;
    for (var i = 0; i < this.length; i++)
      this.words[i] = this.words[i + s];
  } else {
    this.words[0] = 0;
    this.length = 1;
  }

  var carry = 0;
  for (var i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
    var word = this.words[i];
    this.words[i] = (carry << (26 - r)) | (word >>> r);
    carry = word & mask;
  }

  // Push carried bits as a mask
  if (maskedWords && carry !== 0)
    maskedWords.words[maskedWords.length++] = carry;

  if (this.length === 0) {
    this.words[0] = 0;
    this.length = 1;
  }

  this.strip();

  return this;
};

// Shift-left
BN.prototype.shln = function shln(bits) {
  return this.clone().ishln(bits);
};

// Shift-right
BN.prototype.shrn = function shrn(bits) {
  return this.clone().ishrn(bits);
};

// Test if n bit is set
BN.prototype.testn = function testn(bit) {
  assert(typeof bit === 'number' && bit >= 0);
  var r = bit % 26;
  var s = (bit - r) / 26;
  var q = 1 << r;

  // Fast case: bit is much higher than all existing words
  if (this.length <= s) {
    return false;
  }

  // Check bit and return
  var w = this.words[s];

  return !!(w & q);
};

// Return only lowers bits of number (in-place)
BN.prototype.imaskn = function imaskn(bits) {
  assert(typeof bits === 'number' && bits >= 0);
  var r = bits % 26;
  var s = (bits - r) / 26;

  assert(!this.sign, 'imaskn works only with positive numbers');

  if (r !== 0)
    s++;
  this.length = Math.min(s, this.length);

  if (r !== 0) {
    var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
    this.words[this.length - 1] &= mask;
  }

  return this.strip();
};

// Return only lowers bits of number
BN.prototype.maskn = function maskn(bits) {
  return this.clone().imaskn(bits);
};

// Add plain number `num` to `this`
BN.prototype.iaddn = function iaddn(num) {
  assert(typeof num === 'number');
  if (num < 0)
    return this.isubn(-num);

  // Possible sign change
  if (this.sign) {
    if (this.length === 1 && this.words[0] < num) {
      this.words[0] = num - this.words[0];
      this.sign = false;
      return this;
    }

    this.sign = false;
    this.isubn(num);
    this.sign = true;
    return this;
  }

  // Add without checks
  return this._iaddn(num);
};

BN.prototype._iaddn = function _iaddn(num) {
  this.words[0] += num;

  // Carry
  for (var i = 0; i < this.length && this.words[i] >= 0x4000000; i++) {
    this.words[i] -= 0x4000000;
    if (i === this.length - 1)
      this.words[i + 1] = 1;
    else
      this.words[i + 1]++;
  }
  this.length = Math.max(this.length, i + 1);

  return this;
};

// Subtract plain number `num` from `this`
BN.prototype.isubn = function isubn(num) {
  assert(typeof num === 'number');
  if (num < 0)
    return this.iaddn(-num);

  if (this.sign) {
    this.sign = false;
    this.iaddn(num);
    this.sign = true;
    return this;
  }

  this.words[0] -= num;

  // Carry
  for (var i = 0; i < this.length && this.words[i] < 0; i++) {
    this.words[i] += 0x4000000;
    this.words[i + 1] -= 1;
  }

  return this.strip();
};

BN.prototype.addn = function addn(num) {
  return this.clone().iaddn(num);
};

BN.prototype.subn = function subn(num) {
  return this.clone().isubn(num);
};

BN.prototype.iabs = function iabs() {
  this.sign = false;

  return this;
};

BN.prototype.abs = function abs() {
  return this.clone().iabs();
};

BN.prototype._ishlnsubmul = function _ishlnsubmul(num, mul, shift) {
  // Bigger storage is needed
  var len = num.length + shift;
  var i;
  if (this.words.length < len) {
    var t = new Array(len);
    for (var i = 0; i < this.length; i++)
      t[i] = this.words[i];
    this.words = t;
  } else {
    i = this.length;
  }

  // Zeroify rest
  this.length = Math.max(this.length, len);
  for (; i < this.length; i++)
    this.words[i] = 0;

  var carry = 0;
  for (var i = 0; i < num.length; i++) {
    var w = this.words[i + shift] + carry;
    var right = num.words[i] * mul;
    w -= right & 0x3ffffff;
    carry = (w >> 26) - ((right / 0x4000000) | 0);
    this.words[i + shift] = w & 0x3ffffff;
  }
  for (; i < this.length - shift; i++) {
    var w = this.words[i + shift] + carry;
    carry = w >> 26;
    this.words[i + shift] = w & 0x3ffffff;
  }

  if (carry === 0)
    return this.strip();

  // Subtraction overflow
  assert(carry === -1);
  carry = 0;
  for (var i = 0; i < this.length; i++) {
    var w = -this.words[i] + carry;
    carry = w >> 26;
    this.words[i] = w & 0x3ffffff;
  }
  this.sign = true;

  return this.strip();
};

BN.prototype._wordDiv = function _wordDiv(num, mode) {
  var shift = this.length - num.length;

  var a = this.clone();
  var b = num;

  // Normalize
  var bhi = b.words[b.length - 1];
  var bhiBits = this._countBits(bhi);
  shift = 26 - bhiBits;
  if (shift !== 0) {
    b = b.shln(shift);
    a.ishln(shift);
    bhi = b.words[b.length - 1];
  }

  // Initialize quotient
  var m = a.length - b.length;
  var q;

  if (mode !== 'mod') {
    q = new BN(null);
    q.length = m + 1;
    q.words = new Array(q.length);
    for (var i = 0; i < q.length; i++)
      q.words[i] = 0;
  }

  var diff = a.clone()._ishlnsubmul(b, 1, m);
  if (!diff.sign) {
    a = diff;
    if (q)
      q.words[m] = 1;
  }

  for (var j = m - 1; j >= 0; j--) {
    var qj = a.words[b.length + j] * 0x4000000 + a.words[b.length + j - 1];

    // NOTE: (qj / bhi) is (0x3ffffff * 0x4000000 + 0x3ffffff) / 0x2000000 max
    // (0x7ffffff)
    qj = Math.min((qj / bhi) | 0, 0x3ffffff);

    a._ishlnsubmul(b, qj, j);
    while (a.sign) {
      qj--;
      a.sign = false;
      a._ishlnsubmul(b, 1, j);
      if (a.cmpn(0) !== 0)
        a.sign = !a.sign;
    }
    if (q)
      q.words[j] = qj;
  }
  if (q)
    q.strip();
  a.strip();

  // Denormalize
  if (mode !== 'div' && shift !== 0)
    a.ishrn(shift);
  return { div: q ? q : null, mod: a };
};

BN.prototype.divmod = function divmod(num, mode) {
  assert(num.cmpn(0) !== 0);

  if (this.sign && !num.sign) {
    var res = this.neg().divmod(num, mode);
    var div;
    var mod;
    if (mode !== 'mod')
      div = res.div.neg();
    if (mode !== 'div')
      mod = res.mod.cmpn(0) === 0 ? res.mod : num.sub(res.mod);
    return {
      div: div,
      mod: mod
    };
  } else if (!this.sign && num.sign) {
    var res = this.divmod(num.neg(), mode);
    var div;
    if (mode !== 'mod')
      div = res.div.neg();
    return { div: div, mod: res.mod };
  } else if (this.sign && num.sign) {
    return this.neg().divmod(num.neg(), mode);
  }

  // Both numbers are positive at this point

  // Strip both numbers to approximate shift value
  if (num.length > this.length || this.cmp(num) < 0)
    return { div: new BN(0), mod: this };

  // Very short reduction
  if (num.length === 1) {
    if (mode === 'div')
      return { div: this.divn(num.words[0]), mod: null };
    else if (mode === 'mod')
      return { div: null, mod: new BN(this.modn(num.words[0])) };
    return {
      div: this.divn(num.words[0]),
      mod: new BN(this.modn(num.words[0]))
    };
  }

  return this._wordDiv(num, mode);
};

// Find `this` / `num`
BN.prototype.div = function div(num) {
  return this.divmod(num, 'div').div;
};

// Find `this` % `num`
BN.prototype.mod = function mod(num) {
  return this.divmod(num, 'mod').mod;
};

// Find Round(`this` / `num`)
BN.prototype.divRound = function divRound(num) {
  var dm = this.divmod(num);

  // Fast case - exact division
  if (dm.mod.cmpn(0) === 0)
    return dm.div;

  var mod = dm.div.sign ? dm.mod.isub(num) : dm.mod;

  var half = num.shrn(1);
  var r2 = num.andln(1);
  var cmp = mod.cmp(half);

  // Round down
  if (cmp < 0 || r2 === 1 && cmp === 0)
    return dm.div;

  // Round up
  return dm.div.sign ? dm.div.isubn(1) : dm.div.iaddn(1);
};

BN.prototype.modn = function modn(num) {
  assert(num <= 0x3ffffff);
  var p = (1 << 26) % num;

  var acc = 0;
  for (var i = this.length - 1; i >= 0; i--)
    acc = (p * acc + this.words[i]) % num;

  return acc;
};

// In-place division by number
BN.prototype.idivn = function idivn(num) {
  assert(num <= 0x3ffffff);

  var carry = 0;
  for (var i = this.length - 1; i >= 0; i--) {
    var w = this.words[i] + carry * 0x4000000;
    this.words[i] = (w / num) | 0;
    carry = w % num;
  }

  return this.strip();
};

BN.prototype.divn = function divn(num) {
  return this.clone().idivn(num);
};

BN.prototype.egcd = function egcd(p) {
  assert(!p.sign);
  assert(p.cmpn(0) !== 0);

  var x = this;
  var y = p.clone();

  if (x.sign)
    x = x.mod(p);
  else
    x = x.clone();

  // A * x + B * y = x
  var A = new BN(1);
  var B = new BN(0);

  // C * x + D * y = y
  var C = new BN(0);
  var D = new BN(1);

  var g = 0;

  while (x.isEven() && y.isEven()) {
    x.ishrn(1);
    y.ishrn(1);
    ++g;
  }

  var yp = y.clone();
  var xp = x.clone();

  while (x.cmpn(0) !== 0) {
    while (x.isEven()) {
      x.ishrn(1);
      if (A.isEven() && B.isEven()) {
        A.ishrn(1);
        B.ishrn(1);
      } else {
        A.iadd(yp).ishrn(1);
        B.isub(xp).ishrn(1);
      }
    }

    while (y.isEven()) {
      y.ishrn(1);
      if (C.isEven() && D.isEven()) {
        C.ishrn(1);
        D.ishrn(1);
      } else {
        C.iadd(yp).ishrn(1);
        D.isub(xp).ishrn(1);
      }
    }

    if (x.cmp(y) >= 0) {
      x.isub(y);
      A.isub(C);
      B.isub(D);
    } else {
      y.isub(x);
      C.isub(A);
      D.isub(B);
    }
  }

  return {
    a: C,
    b: D,
    gcd: y.ishln(g)
  };
};

// This is reduced incarnation of the binary EEA
// above, designated to invert members of the
// _prime_ fields F(p) at a maximal speed
BN.prototype._invmp = function _invmp(p) {
  assert(!p.sign);
  assert(p.cmpn(0) !== 0);

  var a = this;
  var b = p.clone();

  if (a.sign)
    a = a.mod(p);
  else
    a = a.clone();

  var x1 = new BN(1);
  var x2 = new BN(0);

  var delta = b.clone();

  while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
    while (a.isEven()) {
      a.ishrn(1);
      if (x1.isEven())
        x1.ishrn(1);
      else
        x1.iadd(delta).ishrn(1);
    }
    while (b.isEven()) {
      b.ishrn(1);
      if (x2.isEven())
        x2.ishrn(1);
      else
        x2.iadd(delta).ishrn(1);
    }
    if (a.cmp(b) >= 0) {
      a.isub(b);
      x1.isub(x2);
    } else {
      b.isub(a);
      x2.isub(x1);
    }
  }
  if (a.cmpn(1) === 0)
    return x1;
  else
    return x2;
};

BN.prototype.gcd = function gcd(num) {
  if (this.cmpn(0) === 0)
    return num.clone();
  if (num.cmpn(0) === 0)
    return this.clone();

  var a = this.clone();
  var b = num.clone();
  a.sign = false;
  b.sign = false;

  // Remove common factor of two
  for (var shift = 0; a.isEven() && b.isEven(); shift++) {
    a.ishrn(1);
    b.ishrn(1);
  }

  do {
    while (a.isEven())
      a.ishrn(1);
    while (b.isEven())
      b.ishrn(1);

    var r = a.cmp(b);
    if (r < 0) {
      // Swap `a` and `b` to make `a` always bigger than `b`
      var t = a;
      a = b;
      b = t;
    } else if (r === 0 || b.cmpn(1) === 0) {
      break;
    }

    a.isub(b);
  } while (true);

  return b.ishln(shift);
};

// Invert number in the field F(num)
BN.prototype.invm = function invm(num) {
  return this.egcd(num).a.mod(num);
};

BN.prototype.isEven = function isEven() {
  return (this.words[0] & 1) === 0;
};

BN.prototype.isOdd = function isOdd() {
  return (this.words[0] & 1) === 1;
};

// And first word and num
BN.prototype.andln = function andln(num) {
  return this.words[0] & num;
};

// Increment at the bit position in-line
BN.prototype.bincn = function bincn(bit) {
  assert(typeof bit === 'number');
  var r = bit % 26;
  var s = (bit - r) / 26;
  var q = 1 << r;

  // Fast case: bit is much higher than all existing words
  if (this.length <= s) {
    for (var i = this.length; i < s + 1; i++)
      this.words[i] = 0;
    this.words[s] |= q;
    this.length = s + 1;
    return this;
  }

  // Add bit and propagate, if needed
  var carry = q;
  for (var i = s; carry !== 0 && i < this.length; i++) {
    var w = this.words[i];
    w += carry;
    carry = w >>> 26;
    w &= 0x3ffffff;
    this.words[i] = w;
  }
  if (carry !== 0) {
    this.words[i] = carry;
    this.length++;
  }
  return this;
};

BN.prototype.cmpn = function cmpn(num) {
  var sign = num < 0;
  if (sign)
    num = -num;

  if (this.sign && !sign)
    return -1;
  else if (!this.sign && sign)
    return 1;

  num &= 0x3ffffff;
  this.strip();

  var res;
  if (this.length > 1) {
    res = 1;
  } else {
    var w = this.words[0];
    res = w === num ? 0 : w < num ? -1 : 1;
  }
  if (this.sign)
    res = -res;
  return res;
};

// Compare two numbers and return:
// 1 - if `this` > `num`
// 0 - if `this` == `num`
// -1 - if `this` < `num`
BN.prototype.cmp = function cmp(num) {
  if (this.sign && !num.sign)
    return -1;
  else if (!this.sign && num.sign)
    return 1;

  var res = this.ucmp(num);
  if (this.sign)
    return -res;
  else
    return res;
};

// Unsigned comparison
BN.prototype.ucmp = function ucmp(num) {
  // At this point both numbers have the same sign
  if (this.length > num.length)
    return 1;
  else if (this.length < num.length)
    return -1;

  var res = 0;
  for (var i = this.length - 1; i >= 0; i--) {
    var a = this.words[i];
    var b = num.words[i];

    if (a === b)
      continue;
    if (a < b)
      res = -1;
    else if (a > b)
      res = 1;
    break;
  }
  return res;
};

//
// A reduce context, could be using montgomery or something better, depending
// on the `m` itself.
//
BN.red = function red(num) {
  return new Red(num);
};

BN.prototype.toRed = function toRed(ctx) {
  assert(!this.red, 'Already a number in reduction context');
  assert(!this.sign, 'red works only with positives');
  return ctx.convertTo(this)._forceRed(ctx);
};

BN.prototype.fromRed = function fromRed() {
  assert(this.red, 'fromRed works only with numbers in reduction context');
  return this.red.convertFrom(this);
};

BN.prototype._forceRed = function _forceRed(ctx) {
  this.red = ctx;
  return this;
};

BN.prototype.forceRed = function forceRed(ctx) {
  assert(!this.red, 'Already a number in reduction context');
  return this._forceRed(ctx);
};

BN.prototype.redAdd = function redAdd(num) {
  assert(this.red, 'redAdd works only with red numbers');
  return this.red.add(this, num);
};

BN.prototype.redIAdd = function redIAdd(num) {
  assert(this.red, 'redIAdd works only with red numbers');
  return this.red.iadd(this, num);
};

BN.prototype.redSub = function redSub(num) {
  assert(this.red, 'redSub works only with red numbers');
  return this.red.sub(this, num);
};

BN.prototype.redISub = function redISub(num) {
  assert(this.red, 'redISub works only with red numbers');
  return this.red.isub(this, num);
};

BN.prototype.redShl = function redShl(num) {
  assert(this.red, 'redShl works only with red numbers');
  return this.red.shl(this, num);
};

BN.prototype.redMul = function redMul(num) {
  assert(this.red, 'redMul works only with red numbers');
  this.red._verify2(this, num);
  return this.red.mul(this, num);
};

BN.prototype.redIMul = function redIMul(num) {
  assert(this.red, 'redMul works only with red numbers');
  this.red._verify2(this, num);
  return this.red.imul(this, num);
};

BN.prototype.redSqr = function redSqr() {
  assert(this.red, 'redSqr works only with red numbers');
  this.red._verify1(this);
  return this.red.sqr(this);
};

BN.prototype.redISqr = function redISqr() {
  assert(this.red, 'redISqr works only with red numbers');
  this.red._verify1(this);
  return this.red.isqr(this);
};

// Square root over p
BN.prototype.redSqrt = function redSqrt() {
  assert(this.red, 'redSqrt works only with red numbers');
  this.red._verify1(this);
  return this.red.sqrt(this);
};

BN.prototype.redInvm = function redInvm() {
  assert(this.red, 'redInvm works only with red numbers');
  this.red._verify1(this);
  return this.red.invm(this);
};

// Return negative clone of `this` % `red modulo`
BN.prototype.redNeg = function redNeg() {
  assert(this.red, 'redNeg works only with red numbers');
  this.red._verify1(this);
  return this.red.neg(this);
};

BN.prototype.redPow = function redPow(num) {
  assert(this.red && !num.red, 'redPow(normalNum)');
  this.red._verify1(this);
  return this.red.pow(this, num);
};

// Prime numbers with efficient reduction
var primes = {
  k256: null,
  p224: null,
  p192: null,
  p25519: null
};

// Pseudo-Mersenne prime
function MPrime(name, p) {
  // P = 2 ^ N - K
  this.name = name;
  this.p = new BN(p, 16);
  this.n = this.p.bitLength();
  this.k = new BN(1).ishln(this.n).isub(this.p);

  this.tmp = this._tmp();
}

MPrime.prototype._tmp = function _tmp() {
  var tmp = new BN(null);
  tmp.words = new Array(Math.ceil(this.n / 13));
  return tmp;
};

MPrime.prototype.ireduce = function ireduce(num) {
  // Assumes that `num` is less than `P^2`
  // num = HI * (2 ^ N - K) + HI * K + LO = HI * K + LO (mod P)
  var r = num;
  var rlen;

  do {
    this.split(r, this.tmp);
    r = this.imulK(r);
    r = r.iadd(this.tmp);
    rlen = r.bitLength();
  } while (rlen > this.n);

  var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
  if (cmp === 0) {
    r.words[0] = 0;
    r.length = 1;
  } else if (cmp > 0) {
    r.isub(this.p);
  } else {
    r.strip();
  }

  return r;
};

MPrime.prototype.split = function split(input, out) {
  input.ishrn(this.n, 0, out);
};

MPrime.prototype.imulK = function imulK(num) {
  return num.imul(this.k);
};

function K256() {
  MPrime.call(
    this,
    'k256',
    'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f');
}
inherits(K256, MPrime);

K256.prototype.split = function split(input, output) {
  // 256 = 9 * 26 + 22
  var mask = 0x3fffff;

  var outLen = Math.min(input.length, 9);
  for (var i = 0; i < outLen; i++)
    output.words[i] = input.words[i];
  output.length = outLen;

  if (input.length <= 9) {
    input.words[0] = 0;
    input.length = 1;
    return;
  }

  // Shift by 9 limbs
  var prev = input.words[9];
  output.words[output.length++] = prev & mask;

  for (var i = 10; i < input.length; i++) {
    var next = input.words[i];
    input.words[i - 10] = ((next & mask) << 4) | (prev >>> 22);
    prev = next;
  }
  input.words[i - 10] = prev >>> 22;
  input.length -= 9;
};

K256.prototype.imulK = function imulK(num) {
  // K = 0x1000003d1 = [ 0x40, 0x3d1 ]
  num.words[num.length] = 0;
  num.words[num.length + 1] = 0;
  num.length += 2;

  // bounded at: 0x40 * 0x3ffffff + 0x3d0 = 0x100000390
  var hi;
  var lo = 0;
  for (var i = 0; i < num.length; i++) {
    var w = num.words[i];
    hi = w * 0x40;
    lo += w * 0x3d1;
    hi += (lo / 0x4000000) | 0;
    lo &= 0x3ffffff;

    num.words[i] = lo;

    lo = hi;
  }

  // Fast length reduction
  if (num.words[num.length - 1] === 0) {
    num.length--;
    if (num.words[num.length - 1] === 0)
      num.length--;
  }
  return num;
};

function P224() {
  MPrime.call(
    this,
    'p224',
    'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001');
}
inherits(P224, MPrime);

function P192() {
  MPrime.call(
    this,
    'p192',
    'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff');
}
inherits(P192, MPrime);

function P25519() {
  // 2 ^ 255 - 19
  MPrime.call(
    this,
    '25519',
    '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed');
}
inherits(P25519, MPrime);

P25519.prototype.imulK = function imulK(num) {
  // K = 0x13
  var carry = 0;
  for (var i = 0; i < num.length; i++) {
    var hi = num.words[i] * 0x13 + carry;
    var lo = hi & 0x3ffffff;
    hi >>>= 26;

    num.words[i] = lo;
    carry = hi;
  }
  if (carry !== 0)
    num.words[num.length++] = carry;
  return num;
};

// Exported mostly for testing purposes, use plain name instead
BN._prime = function prime(name) {
  // Cached version of prime
  if (primes[name])
    return primes[name];

  var prime;
  if (name === 'k256')
    prime = new K256();
  else if (name === 'p224')
    prime = new P224();
  else if (name === 'p192')
    prime = new P192();
  else if (name === 'p25519')
    prime = new P25519();
  else
    throw new Error('Unknown prime ' + name);
  primes[name] = prime;

  return prime;
};

//
// Base reduction engine
//
function Red(m) {
  if (typeof m === 'string') {
    var prime = BN._prime(m);
    this.m = prime.p;
    this.prime = prime;
  } else {
    this.m = m;
    this.prime = null;
  }
}

Red.prototype._verify1 = function _verify1(a) {
  assert(!a.sign, 'red works only with positives');
  assert(a.red, 'red works only with red numbers');
};

Red.prototype._verify2 = function _verify2(a, b) {
  assert(!a.sign && !b.sign, 'red works only with positives');
  assert(a.red && a.red === b.red,
         'red works only with red numbers');
};

Red.prototype.imod = function imod(a) {
  if (this.prime)
    return this.prime.ireduce(a)._forceRed(this);
  return a.mod(this.m)._forceRed(this);
};

Red.prototype.neg = function neg(a) {
  var r = a.clone();
  r.sign = !r.sign;
  return r.iadd(this.m)._forceRed(this);
};

Red.prototype.add = function add(a, b) {
  this._verify2(a, b);

  var res = a.add(b);
  if (res.cmp(this.m) >= 0)
    res.isub(this.m);
  return res._forceRed(this);
};

Red.prototype.iadd = function iadd(a, b) {
  this._verify2(a, b);

  var res = a.iadd(b);
  if (res.cmp(this.m) >= 0)
    res.isub(this.m);
  return res;
};

Red.prototype.sub = function sub(a, b) {
  this._verify2(a, b);

  var res = a.sub(b);
  if (res.cmpn(0) < 0)
    res.iadd(this.m);
  return res._forceRed(this);
};

Red.prototype.isub = function isub(a, b) {
  this._verify2(a, b);

  var res = a.isub(b);
  if (res.cmpn(0) < 0)
    res.iadd(this.m);
  return res;
};

Red.prototype.shl = function shl(a, num) {
  this._verify1(a);
  return this.imod(a.shln(num));
};

Red.prototype.imul = function imul(a, b) {
  this._verify2(a, b);
  return this.imod(a.imul(b));
};

Red.prototype.mul = function mul(a, b) {
  this._verify2(a, b);
  return this.imod(a.mul(b));
};

Red.prototype.isqr = function isqr(a) {
  return this.imul(a, a);
};

Red.prototype.sqr = function sqr(a) {
  return this.mul(a, a);
};

Red.prototype.sqrt = function sqrt(a) {
  if (a.cmpn(0) === 0)
    return a.clone();

  var mod3 = this.m.andln(3);
  assert(mod3 % 2 === 1);

  // Fast case
  if (mod3 === 3) {
    var pow = this.m.add(new BN(1)).ishrn(2);
    var r = this.pow(a, pow);
    return r;
  }

  // Tonelli-Shanks algorithm (Totally unoptimized and slow)
  //
  // Find Q and S, that Q * 2 ^ S = (P - 1)
  var q = this.m.subn(1);
  var s = 0;
  while (q.cmpn(0) !== 0 && q.andln(1) === 0) {
    s++;
    q.ishrn(1);
  }
  assert(q.cmpn(0) !== 0);

  var one = new BN(1).toRed(this);
  var nOne = one.redNeg();

  // Find quadratic non-residue
  // NOTE: Max is such because of generalized Riemann hypothesis.
  var lpow = this.m.subn(1).ishrn(1);
  var z = this.m.bitLength();
  z = new BN(2 * z * z).toRed(this);
  while (this.pow(z, lpow).cmp(nOne) !== 0)
    z.redIAdd(nOne);

  var c = this.pow(z, q);
  var r = this.pow(a, q.addn(1).ishrn(1));
  var t = this.pow(a, q);
  var m = s;
  while (t.cmp(one) !== 0) {
    var tmp = t;
    for (var i = 0; tmp.cmp(one) !== 0; i++)
      tmp = tmp.redSqr();
    assert(i < m);
    var b = this.pow(c, new BN(1).ishln(m - i - 1));

    r = r.redMul(b);
    c = b.redSqr();
    t = t.redMul(c);
    m = i;
  }

  return r;
};

Red.prototype.invm = function invm(a) {
  var inv = a._invmp(this.m);
  if (inv.sign) {
    inv.sign = false;
    return this.imod(inv).redNeg();
  } else {
    return this.imod(inv);
  }
};

Red.prototype.pow = function pow(a, num) {
  var w = [];

  if (num.cmpn(0) === 0)
    return new BN(1);

  var q = num.clone();

  while (q.cmpn(0) !== 0) {
    w.push(q.andln(1));
    q.ishrn(1);
  }

  // Skip leading zeroes
  var res = a;
  for (var i = 0; i < w.length; i++, res = this.sqr(res))
    if (w[i] !== 0)
      break;

  if (++i < w.length) {
    for (var q = this.sqr(res); i < w.length; i++, q = this.sqr(q)) {
      if (w[i] === 0)
        continue;
      res = this.mul(res, q);
    }
  }

  return res;
};

Red.prototype.convertTo = function convertTo(num) {
  var r = num.mod(this.m);
  if (r === num)
    return r.clone();
  else
    return r;
};

Red.prototype.convertFrom = function convertFrom(num) {
  var res = num.clone();
  res.red = null;
  return res;
};

//
// Montgomery method engine
//

BN.mont = function mont(num) {
  return new Mont(num);
};

function Mont(m) {
  Red.call(this, m);

  this.shift = this.m.bitLength();
  if (this.shift % 26 !== 0)
    this.shift += 26 - (this.shift % 26);
  this.r = new BN(1).ishln(this.shift);
  this.r2 = this.imod(this.r.sqr());
  this.rinv = this.r._invmp(this.m);

  this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
  this.minv.sign = true;
  this.minv = this.minv.mod(this.r);
}
inherits(Mont, Red);

Mont.prototype.convertTo = function convertTo(num) {
  return this.imod(num.shln(this.shift));
};

Mont.prototype.convertFrom = function convertFrom(num) {
  var r = this.imod(num.mul(this.rinv));
  r.red = null;
  return r;
};

Mont.prototype.imul = function imul(a, b) {
  if (a.cmpn(0) === 0 || b.cmpn(0) === 0) {
    a.words[0] = 0;
    a.length = 1;
    return a;
  }

  var t = a.imul(b);
  var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
  var u = t.isub(c).ishrn(this.shift);
  var res = u;
  if (u.cmp(this.m) >= 0)
    res = u.isub(this.m);
  else if (u.cmpn(0) < 0)
    res = u.iadd(this.m);

  return res._forceRed(this);
};

Mont.prototype.mul = function mul(a, b) {
  if (a.cmpn(0) === 0 || b.cmpn(0) === 0)
    return new BN(0)._forceRed(this);

  var t = a.mul(b);
  var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
  var u = t.isub(c).ishrn(this.shift);
  var res = u;
  if (u.cmp(this.m) >= 0)
    res = u.isub(this.m);
  else if (u.cmpn(0) < 0)
    res = u.iadd(this.m);

  return res._forceRed(this);
};

Mont.prototype.invm = function invm(a) {
  // (AR)^-1 * R^2 = (A^-1 * R^-1) * R^2 = A^-1 * R
  var res = this.imod(a._invmp(this.m).mul(this.r2));
  return res._forceRed(this);
};

})(typeof module === 'undefined' || module, this);

},{}],25:[function(require,module,exports){
'use strict'

var bnsign = require('./lib/bn-sign')

module.exports = sign

function sign(x) {
  return bnsign(x[0]) * bnsign(x[1])
}

},{"./lib/bn-sign":16}],26:[function(require,module,exports){
'use strict'

var rationalize = require('./lib/rationalize')

module.exports = sub

function sub(a, b) {
  return rationalize(a[0].mul(b[1]).sub(a[1].mul(b[0])), a[1].mul(b[1]))
}

},{"./lib/rationalize":21}],27:[function(require,module,exports){
'use strict'

var bn2num = require('./lib/bn-to-num')
var ctz = require('./lib/ctz')

module.exports = roundRat

//Round a rational to the closest float
function roundRat(f) {
  var a = f[0]
  var b = f[1]
  if(a.cmpn(0) === 0) {
    return 0
  }
  var h = a.divmod(b)
  var iv = h.div
  var x = bn2num(iv)
  var ir = h.mod
  if(ir.cmpn(0) === 0) {
    return x
  }
  if(x) {
    var s = ctz(x) + 4
    var y = bn2num(ir.shln(s).divRound(b))

    // flip the sign of y if x is negative
    if (x<0) {
      y = -y;
    }

    return x + y * Math.pow(2, -s)
  } else {
    var ybits = b.bitLength() - ir.bitLength() + 53
    var y = bn2num(ir.shln(ybits).divRound(b))
    if(ybits < 1023) {
      return y * Math.pow(2, -ybits)
    }
    y *= Math.pow(2, -1023)
    return y * Math.pow(2, 1023-ybits)
  }
}

},{"./lib/bn-to-num":17,"./lib/ctz":18}],28:[function(require,module,exports){
"use strict"

function compileSearch(funcName, predicate, reversed, extraArgs, earlyOut) {
  var code = [
    "function ", funcName, "(a,l,h,", extraArgs.join(","),  "){",
earlyOut ? "" : "var i=", (reversed ? "l-1" : "h+1"),
";while(l<=h){\
var m=(l+h)>>>1,x=a[m]"]
  if(earlyOut) {
    if(predicate.indexOf("c") < 0) {
      code.push(";if(x===y){return m}else if(x<=y){")
    } else {
      code.push(";var p=c(x,y);if(p===0){return m}else if(p<=0){")
    }
  } else {
    code.push(";if(", predicate, "){i=m;")
  }
  if(reversed) {
    code.push("l=m+1}else{h=m-1}")
  } else {
    code.push("h=m-1}else{l=m+1}")
  }
  code.push("}")
  if(earlyOut) {
    code.push("return -1};")
  } else {
    code.push("return i};")
  }
  return code.join("")
}

function compileBoundsSearch(predicate, reversed, suffix, earlyOut) {
  var result = new Function([
  compileSearch("A", "x" + predicate + "y", reversed, ["y"], earlyOut),
  compileSearch("P", "c(x,y)" + predicate + "0", reversed, ["y", "c"], earlyOut),
"function dispatchBsearch", suffix, "(a,y,c,l,h){\
if(typeof(c)==='function'){\
return P(a,(l===void 0)?0:l|0,(h===void 0)?a.length-1:h|0,y,c)\
}else{\
return A(a,(c===void 0)?0:c|0,(l===void 0)?a.length-1:l|0,y)\
}}\
return dispatchBsearch", suffix].join(""))
  return result()
}

module.exports = {
  ge: compileBoundsSearch(">=", false, "GE"),
  gt: compileBoundsSearch(">", false, "GT"),
  lt: compileBoundsSearch("<", true, "LT"),
  le: compileBoundsSearch("<=", true, "LE"),
  eq: compileBoundsSearch("-", true, "EQ", true)
}

},{}],29:[function(require,module,exports){
/**
 * Bit twiddling hacks for JavaScript.
 *
 * Author: Mikola Lysenko
 *
 * Ported from Stanford bit twiddling hack library:
 *    http://graphics.stanford.edu/~seander/bithacks.html
 */

"use strict"; "use restrict";

//Number of bits in an integer
var INT_BITS = 32;

//Constants
exports.INT_BITS  = INT_BITS;
exports.INT_MAX   =  0x7fffffff;
exports.INT_MIN   = -1<<(INT_BITS-1);

//Returns -1, 0, +1 depending on sign of x
exports.sign = function(v) {
  return (v > 0) - (v < 0);
}

//Computes absolute value of integer
exports.abs = function(v) {
  var mask = v >> (INT_BITS-1);
  return (v ^ mask) - mask;
}

//Computes minimum of integers x and y
exports.min = function(x, y) {
  return y ^ ((x ^ y) & -(x < y));
}

//Computes maximum of integers x and y
exports.max = function(x, y) {
  return x ^ ((x ^ y) & -(x < y));
}

//Checks if a number is a power of two
exports.isPow2 = function(v) {
  return !(v & (v-1)) && (!!v);
}

//Computes log base 2 of v
exports.log2 = function(v) {
  var r, shift;
  r =     (v > 0xFFFF) << 4; v >>>= r;
  shift = (v > 0xFF  ) << 3; v >>>= shift; r |= shift;
  shift = (v > 0xF   ) << 2; v >>>= shift; r |= shift;
  shift = (v > 0x3   ) << 1; v >>>= shift; r |= shift;
  return r | (v >> 1);
}

//Computes log base 10 of v
exports.log10 = function(v) {
  return  (v >= 1000000000) ? 9 : (v >= 100000000) ? 8 : (v >= 10000000) ? 7 :
          (v >= 1000000) ? 6 : (v >= 100000) ? 5 : (v >= 10000) ? 4 :
          (v >= 1000) ? 3 : (v >= 100) ? 2 : (v >= 10) ? 1 : 0;
}

//Counts number of bits
exports.popCount = function(v) {
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return ((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
}

//Counts number of trailing zeros
function countTrailingZeros(v) {
  var c = 32;
  v &= -v;
  if (v) c--;
  if (v & 0x0000FFFF) c -= 16;
  if (v & 0x00FF00FF) c -= 8;
  if (v & 0x0F0F0F0F) c -= 4;
  if (v & 0x33333333) c -= 2;
  if (v & 0x55555555) c -= 1;
  return c;
}
exports.countTrailingZeros = countTrailingZeros;

//Rounds to next power of 2
exports.nextPow2 = function(v) {
  v += v === 0;
  --v;
  v |= v >>> 1;
  v |= v >>> 2;
  v |= v >>> 4;
  v |= v >>> 8;
  v |= v >>> 16;
  return v + 1;
}

//Rounds down to previous power of 2
exports.prevPow2 = function(v) {
  v |= v >>> 1;
  v |= v >>> 2;
  v |= v >>> 4;
  v |= v >>> 8;
  v |= v >>> 16;
  return v - (v>>>1);
}

//Computes parity of word
exports.parity = function(v) {
  v ^= v >>> 16;
  v ^= v >>> 8;
  v ^= v >>> 4;
  v &= 0xf;
  return (0x6996 >>> v) & 1;
}

var REVERSE_TABLE = new Array(256);

(function(tab) {
  for(var i=0; i<256; ++i) {
    var v = i, r = i, s = 7;
    for (v >>>= 1; v; v >>>= 1) {
      r <<= 1;
      r |= v & 1;
      --s;
    }
    tab[i] = (r << s) & 0xff;
  }
})(REVERSE_TABLE);

//Reverse bits in a 32 bit word
exports.reverse = function(v) {
  return  (REVERSE_TABLE[ v         & 0xff] << 24) |
          (REVERSE_TABLE[(v >>> 8)  & 0xff] << 16) |
          (REVERSE_TABLE[(v >>> 16) & 0xff] << 8)  |
           REVERSE_TABLE[(v >>> 24) & 0xff];
}

//Interleave bits of 2 coordinates with 16 bits.  Useful for fast quadtree codes
exports.interleave2 = function(x, y) {
  x &= 0xFFFF;
  x = (x | (x << 8)) & 0x00FF00FF;
  x = (x | (x << 4)) & 0x0F0F0F0F;
  x = (x | (x << 2)) & 0x33333333;
  x = (x | (x << 1)) & 0x55555555;

  y &= 0xFFFF;
  y = (y | (y << 8)) & 0x00FF00FF;
  y = (y | (y << 4)) & 0x0F0F0F0F;
  y = (y | (y << 2)) & 0x33333333;
  y = (y | (y << 1)) & 0x55555555;

  return x | (y << 1);
}

//Extracts the nth interleaved component
exports.deinterleave2 = function(v, n) {
  v = (v >>> n) & 0x55555555;
  v = (v | (v >>> 1))  & 0x33333333;
  v = (v | (v >>> 2))  & 0x0F0F0F0F;
  v = (v | (v >>> 4))  & 0x00FF00FF;
  v = (v | (v >>> 16)) & 0x000FFFF;
  return (v << 16) >> 16;
}


//Interleave bits of 3 coordinates, each with 10 bits.  Useful for fast octree codes
exports.interleave3 = function(x, y, z) {
  x &= 0x3FF;
  x  = (x | (x<<16)) & 4278190335;
  x  = (x | (x<<8))  & 251719695;
  x  = (x | (x<<4))  & 3272356035;
  x  = (x | (x<<2))  & 1227133513;

  y &= 0x3FF;
  y  = (y | (y<<16)) & 4278190335;
  y  = (y | (y<<8))  & 251719695;
  y  = (y | (y<<4))  & 3272356035;
  y  = (y | (y<<2))  & 1227133513;
  x |= (y << 1);
  
  z &= 0x3FF;
  z  = (z | (z<<16)) & 4278190335;
  z  = (z | (z<<8))  & 251719695;
  z  = (z | (z<<4))  & 3272356035;
  z  = (z | (z<<2))  & 1227133513;
  
  return x | (z << 2);
}

//Extracts nth interleaved component of a 3-tuple
exports.deinterleave3 = function(v, n) {
  v = (v >>> n)       & 1227133513;
  v = (v | (v>>>2))   & 3272356035;
  v = (v | (v>>>4))   & 251719695;
  v = (v | (v>>>8))   & 4278190335;
  v = (v | (v>>>16))  & 0x3FF;
  return (v<<22)>>22;
}

//Computes next combination in colexicographic order (this is mistakenly called nextPermutation on the bit twiddling hacks page)
exports.nextCombination = function(v) {
  var t = v | (v - 1);
  return (t + 1) | (((~t & -~t) - 1) >>> (countTrailingZeros(v) + 1));
}


},{}],30:[function(require,module,exports){
'use strict'

module.exports = findBounds

function findBounds(points) {
  var n = points.length
  if(n === 0) {
    return [[], []]
  }
  var d = points[0].length
  var lo = points[0].slice()
  var hi = points[0].slice()
  for(var i=1; i<n; ++i) {
    var p = points[i]
    for(var j=0; j<d; ++j) {
      var x = p[j]
      lo[j] = Math.min(lo[j], x)
      hi[j] = Math.max(hi[j], x)
    }
  }
  return [lo, hi]
}
},{}],31:[function(require,module,exports){
'use strict'

module.exports = boxIntersectWrapper

var pool = require('typedarray-pool')
var sweep = require('./lib/sweep')
var boxIntersectIter = require('./lib/intersect')

function boxEmpty(d, box) {
  for(var j=0; j<d; ++j) {
    if(!(box[j] <= box[j+d])) {
      return true
    }
  }
  return false
}

//Unpack boxes into a flat typed array, remove empty boxes
function convertBoxes(boxes, d, data, ids) {
  var ptr = 0
  var count = 0
  for(var i=0, n=boxes.length; i<n; ++i) {
    var b = boxes[i]
    if(boxEmpty(d, b)) {
      continue
    }
    for(var j=0; j<2*d; ++j) {
      data[ptr++] = b[j]
    }
    ids[count++] = i
  }
  return count
}

//Perform type conversions, check bounds
function boxIntersect(red, blue, visit, full) {
  var n = red.length
  var m = blue.length

  //If either array is empty, then we can skip this whole thing
  if(n <= 0 || m <= 0) {
    return
  }

  //Compute dimension, if it is 0 then we skip
  var d = (red[0].length)>>>1
  if(d <= 0) {
    return
  }

  var retval

  //Convert red boxes
  var redList  = pool.mallocDouble(2*d*n)
  var redIds   = pool.mallocInt32(n)
  n = convertBoxes(red, d, redList, redIds)

  if(n > 0) {
    if(d === 1 && full) {
      //Special case: 1d complete
      sweep.init(n)
      retval = sweep.sweepComplete(
        d, visit, 
        0, n, redList, redIds,
        0, n, redList, redIds)
    } else {

      //Convert blue boxes
      var blueList = pool.mallocDouble(2*d*m)
      var blueIds  = pool.mallocInt32(m)
      m = convertBoxes(blue, d, blueList, blueIds)

      if(m > 0) {
        sweep.init(n+m)

        if(d === 1) {
          //Special case: 1d bipartite
          retval = sweep.sweepBipartite(
            d, visit, 
            0, n, redList,  redIds,
            0, m, blueList, blueIds)
        } else {
          //General case:  d>1
          retval = boxIntersectIter(
            d, visit,    full,
            n, redList,  redIds,
            m, blueList, blueIds)
        }

        pool.free(blueList)
        pool.free(blueIds)
      }
    }

    pool.free(redList)
    pool.free(redIds)
  }

  return retval
}


var RESULT

function appendItem(i,j) {
  RESULT.push([i,j])
}

function intersectFullArray(x) {
  RESULT = []
  boxIntersect(x, x, appendItem, true)
  return RESULT
}

function intersectBipartiteArray(x, y) {
  RESULT = []
  boxIntersect(x, y, appendItem, false)
  return RESULT
}

//User-friendly wrapper, handle full input and no-visitor cases
function boxIntersectWrapper(arg0, arg1, arg2) {
  var result
  switch(arguments.length) {
    case 1:
      return intersectFullArray(arg0)
    case 2:
      if(typeof arg1 === 'function') {
        return boxIntersect(arg0, arg0, arg1, true)
      } else {
        return intersectBipartiteArray(arg0, arg1)
      }
    case 3:
      return boxIntersect(arg0, arg1, arg2, false)
    default:
      throw new Error('box-intersect: Invalid arguments')
  }
}
},{"./lib/intersect":33,"./lib/sweep":37,"typedarray-pool":363}],32:[function(require,module,exports){
'use strict'

var DIMENSION   = 'd'
var AXIS        = 'ax'
var VISIT       = 'vv'
var FLIP        = 'fp'

var ELEM_SIZE   = 'es'

var RED_START   = 'rs'
var RED_END     = 're'
var RED_BOXES   = 'rb'
var RED_INDEX   = 'ri'
var RED_PTR     = 'rp'

var BLUE_START  = 'bs'
var BLUE_END    = 'be'
var BLUE_BOXES  = 'bb'
var BLUE_INDEX  = 'bi'
var BLUE_PTR    = 'bp'

var RETVAL      = 'rv'

var INNER_LABEL = 'Q'

var ARGS = [
  DIMENSION,
  AXIS,
  VISIT,
  RED_START,
  RED_END,
  RED_BOXES,
  RED_INDEX,
  BLUE_START,
  BLUE_END,
  BLUE_BOXES,
  BLUE_INDEX
]

function generateBruteForce(redMajor, flip, full) {
  var funcName = 'bruteForce' + 
    (redMajor ? 'Red' : 'Blue') + 
    (flip ? 'Flip' : '') +
    (full ? 'Full' : '')

  var code = ['function ', funcName, '(', ARGS.join(), '){',
    'var ', ELEM_SIZE, '=2*', DIMENSION, ';']

  var redLoop = 
    'for(var i=' + RED_START + ',' + RED_PTR + '=' + ELEM_SIZE + '*' + RED_START + ';' +
        'i<' + RED_END +';' +
        '++i,' + RED_PTR + '+=' + ELEM_SIZE + '){' +
        'var x0=' + RED_BOXES + '[' + AXIS + '+' + RED_PTR + '],' +
            'x1=' + RED_BOXES + '[' + AXIS + '+' + RED_PTR + '+' + DIMENSION + '],' +
            'xi=' + RED_INDEX + '[i];'

  var blueLoop = 
    'for(var j=' + BLUE_START + ',' + BLUE_PTR + '=' + ELEM_SIZE + '*' + BLUE_START + ';' +
        'j<' + BLUE_END + ';' +
        '++j,' + BLUE_PTR + '+=' + ELEM_SIZE + '){' +
        'var y0=' + BLUE_BOXES + '[' + AXIS + '+' + BLUE_PTR + '],' +
            (full ? 'y1=' + BLUE_BOXES + '[' + AXIS + '+' + BLUE_PTR + '+' + DIMENSION + '],' : '') +
            'yi=' + BLUE_INDEX + '[j];'

  if(redMajor) {
    code.push(redLoop, INNER_LABEL, ':', blueLoop)
  } else {
    code.push(blueLoop, INNER_LABEL, ':', redLoop)
  }

  if(full) {
    code.push('if(y1<x0||x1<y0)continue;')
  } else if(flip) {
    code.push('if(y0<=x0||x1<y0)continue;')
  } else {
    code.push('if(y0<x0||x1<y0)continue;')
  }

  code.push('for(var k='+AXIS+'+1;k<'+DIMENSION+';++k){'+
    'var r0='+RED_BOXES+'[k+'+RED_PTR+'],'+
        'r1='+RED_BOXES+'[k+'+DIMENSION+'+'+RED_PTR+'],'+
        'b0='+BLUE_BOXES+'[k+'+BLUE_PTR+'],'+
        'b1='+BLUE_BOXES+'[k+'+DIMENSION+'+'+BLUE_PTR+'];'+
      'if(r1<b0||b1<r0)continue ' + INNER_LABEL + ';}' +
      'var ' + RETVAL + '=' + VISIT + '(')

  if(flip) {
    code.push('yi,xi')
  } else {
    code.push('xi,yi')
  }

  code.push(');if(' + RETVAL + '!==void 0)return ' + RETVAL + ';}}}')

  return {
    name: funcName, 
    code: code.join('')
  }
}

function bruteForcePlanner(full) {
  var funcName = 'bruteForce' + (full ? 'Full' : 'Partial')
  var prefix = []
  var fargs = ARGS.slice()
  if(!full) {
    fargs.splice(3, 0, FLIP)
  }

  var code = ['function ' + funcName + '(' + fargs.join() + '){']

  function invoke(redMajor, flip) {
    var res = generateBruteForce(redMajor, flip, full)
    prefix.push(res.code)
    code.push('return ' + res.name + '(' + ARGS.join() + ');')
  }

  code.push('if(' + RED_END + '-' + RED_START + '>' +
                    BLUE_END + '-' + BLUE_START + '){')

  if(full) {
    invoke(true, false)
    code.push('}else{')
    invoke(false, false)
  } else {
    code.push('if(' + FLIP + '){')
    invoke(true, true)
    code.push('}else{')
    invoke(true, false)
    code.push('}}else{if(' + FLIP + '){')
    invoke(false, true)
    code.push('}else{')
    invoke(false, false)
    code.push('}')
  }
  code.push('}}return ' + funcName)

  var codeStr = prefix.join('') + code.join('')
  var proc = new Function(codeStr)
  return proc()
}


exports.partial = bruteForcePlanner(false)
exports.full    = bruteForcePlanner(true)
},{}],33:[function(require,module,exports){
'use strict'

module.exports = boxIntersectIter

var pool = require('typedarray-pool')
var bits = require('bit-twiddle')
var bruteForce = require('./brute')
var bruteForcePartial = bruteForce.partial
var bruteForceFull = bruteForce.full
var sweep = require('./sweep')
var findMedian = require('./median')
var genPartition = require('./partition')

//Twiddle parameters
var BRUTE_FORCE_CUTOFF    = 128       //Cut off for brute force search
var SCAN_CUTOFF           = (1<<22)   //Cut off for two way scan
var SCAN_COMPLETE_CUTOFF  = (1<<22)  

//Partition functions
var partitionInteriorContainsInterval = genPartition(
  '!(lo>=p0)&&!(p1>=hi)', 
  ['p0', 'p1'])

var partitionStartEqual = genPartition(
  'lo===p0',
  ['p0'])

var partitionStartLessThan = genPartition(
  'lo<p0',
  ['p0'])

var partitionEndLessThanEqual = genPartition(
  'hi<=p0',
  ['p0'])

var partitionContainsPoint = genPartition(
  'lo<=p0&&p0<=hi',
  ['p0'])

var partitionContainsPointProper = genPartition(
  'lo<p0&&p0<=hi',
  ['p0'])

//Frame size for iterative loop
var IFRAME_SIZE = 6
var DFRAME_SIZE = 2

//Data for box statck
var INIT_CAPACITY = 1024
var BOX_ISTACK  = pool.mallocInt32(INIT_CAPACITY)
var BOX_DSTACK  = pool.mallocDouble(INIT_CAPACITY)

//Initialize iterative loop queue
function iterInit(d, count) {
  var levels = (8 * bits.log2(count+1) * (d+1))|0
  var maxInts = bits.nextPow2(IFRAME_SIZE*levels)
  if(BOX_ISTACK.length < maxInts) {
    pool.free(BOX_ISTACK)
    BOX_ISTACK = pool.mallocInt32(maxInts)
  }
  var maxDoubles = bits.nextPow2(DFRAME_SIZE*levels)
  if(BOX_DSTACK < maxDoubles) {
    pool.free(BOX_DSTACK)
    BOX_DSTACK = pool.mallocDouble(maxDoubles)
  }
}

//Append item to queue
function iterPush(ptr,
  axis, 
  redStart, redEnd, 
  blueStart, blueEnd, 
  state, 
  lo, hi) {

  var iptr = IFRAME_SIZE * ptr
  BOX_ISTACK[iptr]   = axis
  BOX_ISTACK[iptr+1] = redStart
  BOX_ISTACK[iptr+2] = redEnd
  BOX_ISTACK[iptr+3] = blueStart
  BOX_ISTACK[iptr+4] = blueEnd
  BOX_ISTACK[iptr+5] = state

  var dptr = DFRAME_SIZE * ptr
  BOX_DSTACK[dptr]   = lo
  BOX_DSTACK[dptr+1] = hi
}

//Special case:  Intersect single point with list of intervals
function onePointPartial(
  d, axis, visit, flip,
  redStart, redEnd, red, redIndex,
  blueOffset, blue, blueId) {

  var elemSize = 2 * d
  var bluePtr  = blueOffset * elemSize
  var blueX    = blue[bluePtr + axis]

red_loop:
  for(var i=redStart, redPtr=redStart*elemSize; i<redEnd; ++i, redPtr+=elemSize) {
    var r0 = red[redPtr+axis]
    var r1 = red[redPtr+axis+d]
    if(blueX < r0 || r1 < blueX) {
      continue
    }
    if(flip && blueX === r0) {
      continue
    }
    var redId = redIndex[i]
    for(var j=axis+1; j<d; ++j) {
      var r0 = red[redPtr+j]
      var r1 = red[redPtr+j+d]
      var b0 = blue[bluePtr+j]
      var b1 = blue[bluePtr+j+d]
      if(r1 < b0 || b1 < r0) {
        continue red_loop
      }
    }
    var retval
    if(flip) {
      retval = visit(blueId, redId)
    } else {
      retval = visit(redId, blueId)
    }
    if(retval !== void 0) {
      return retval
    }
  }
}

//Special case:  Intersect one point with list of intervals
function onePointFull(
  d, axis, visit,
  redStart, redEnd, red, redIndex,
  blueOffset, blue, blueId) {

  var elemSize = 2 * d
  var bluePtr  = blueOffset * elemSize
  var blueX    = blue[bluePtr + axis]

red_loop:
  for(var i=redStart, redPtr=redStart*elemSize; i<redEnd; ++i, redPtr+=elemSize) {
    var redId = redIndex[i]
    if(redId === blueId) {
      continue
    }
    var r0 = red[redPtr+axis]
    var r1 = red[redPtr+axis+d]
    if(blueX < r0 || r1 < blueX) {
      continue
    }
    for(var j=axis+1; j<d; ++j) {
      var r0 = red[redPtr+j]
      var r1 = red[redPtr+j+d]
      var b0 = blue[bluePtr+j]
      var b1 = blue[bluePtr+j+d]
      if(r1 < b0 || b1 < r0) {
        continue red_loop
      }
    }
    var retval = visit(redId, blueId)
    if(retval !== void 0) {
      return retval
    }
  }
}

//The main box intersection routine
function boxIntersectIter(
  d, visit, initFull,
  xSize, xBoxes, xIndex,
  ySize, yBoxes, yIndex) {

  //Reserve memory for stack
  iterInit(d, xSize + ySize)

  var top  = 0
  var elemSize = 2 * d
  var retval

  iterPush(top++,
      0,
      0, xSize,
      0, ySize,
      initFull ? 16 : 0, 
      -Infinity, Infinity)
  if(!initFull) {
    iterPush(top++,
      0,
      0, ySize,
      0, xSize,
      1, 
      -Infinity, Infinity)
  }

  while(top > 0) {
    top  -= 1

    var iptr = top * IFRAME_SIZE
    var axis      = BOX_ISTACK[iptr]
    var redStart  = BOX_ISTACK[iptr+1]
    var redEnd    = BOX_ISTACK[iptr+2]
    var blueStart = BOX_ISTACK[iptr+3]
    var blueEnd   = BOX_ISTACK[iptr+4]
    var state     = BOX_ISTACK[iptr+5]

    var dptr = top * DFRAME_SIZE
    var lo        = BOX_DSTACK[dptr]
    var hi        = BOX_DSTACK[dptr+1]

    //Unpack state info
    var flip      = (state & 1)
    var full      = !!(state & 16)

    //Unpack indices
    var red       = xBoxes
    var redIndex  = xIndex
    var blue      = yBoxes
    var blueIndex = yIndex
    if(flip) {
      red         = yBoxes
      redIndex    = yIndex
      blue        = xBoxes
      blueIndex   = xIndex
    }

    if(state & 2) {
      redEnd = partitionStartLessThan(
        d, axis,
        redStart, redEnd, red, redIndex,
        hi)
      if(redStart >= redEnd) {
        continue
      }
    }
    if(state & 4) {
      redStart = partitionEndLessThanEqual(
        d, axis,
        redStart, redEnd, red, redIndex,
        lo)
      if(redStart >= redEnd) {
        continue
      }
    }
    
    var redCount  = redEnd  - redStart
    var blueCount = blueEnd - blueStart

    if(full) {
      if(d * redCount * (redCount + blueCount) < SCAN_COMPLETE_CUTOFF) {
        retval = sweep.scanComplete(
          d, axis, visit, 
          redStart, redEnd, red, redIndex,
          blueStart, blueEnd, blue, blueIndex)
        if(retval !== void 0) {
          return retval
        }
        continue
      }
    } else {
      if(d * Math.min(redCount, blueCount) < BRUTE_FORCE_CUTOFF) {
        //If input small, then use brute force
        retval = bruteForcePartial(
            d, axis, visit, flip,
            redStart,  redEnd,  red,  redIndex,
            blueStart, blueEnd, blue, blueIndex)
        if(retval !== void 0) {
          return retval
        }
        continue
      } else if(d * redCount * blueCount < SCAN_CUTOFF) {
        //If input medium sized, then use sweep and prune
        retval = sweep.scanBipartite(
          d, axis, visit, flip, 
          redStart, redEnd, red, redIndex,
          blueStart, blueEnd, blue, blueIndex)
        if(retval !== void 0) {
          return retval
        }
        continue
      }
    }
    
    //First, find all red intervals whose interior contains (lo,hi)
    var red0 = partitionInteriorContainsInterval(
      d, axis, 
      redStart, redEnd, red, redIndex,
      lo, hi)

    //Lower dimensional case
    if(redStart < red0) {

      if(d * (red0 - redStart) < BRUTE_FORCE_CUTOFF) {
        //Special case for small inputs: use brute force
        retval = bruteForceFull(
          d, axis+1, visit,
          redStart, red0, red, redIndex,
          blueStart, blueEnd, blue, blueIndex)
        if(retval !== void 0) {
          return retval
        }
      } else if(axis === d-2) {
        if(flip) {
          retval = sweep.sweepBipartite(
            d, visit,
            blueStart, blueEnd, blue, blueIndex,
            redStart, red0, red, redIndex)
        } else {
          retval = sweep.sweepBipartite(
            d, visit,
            redStart, red0, red, redIndex,
            blueStart, blueEnd, blue, blueIndex)
        }
        if(retval !== void 0) {
          return retval
        }
      } else {
        iterPush(top++,
          axis+1,
          redStart, red0,
          blueStart, blueEnd,
          flip,
          -Infinity, Infinity)
        iterPush(top++,
          axis+1,
          blueStart, blueEnd,
          redStart, red0,
          flip^1,
          -Infinity, Infinity)
      }
    }

    //Divide and conquer phase
    if(red0 < redEnd) {

      //Cut blue into 3 parts:
      //
      //  Points < mid point
      //  Points = mid point
      //  Points > mid point
      //
      var blue0 = findMedian(
        d, axis, 
        blueStart, blueEnd, blue, blueIndex)
      var mid = blue[elemSize * blue0 + axis]
      var blue1 = partitionStartEqual(
        d, axis,
        blue0, blueEnd, blue, blueIndex,
        mid)

      //Right case
      if(blue1 < blueEnd) {
        iterPush(top++,
          axis,
          red0, redEnd,
          blue1, blueEnd,
          (flip|4) + (full ? 16 : 0),
          mid, hi)
      }

      //Left case
      if(blueStart < blue0) {
        iterPush(top++,
          axis,
          red0, redEnd,
          blueStart, blue0,
          (flip|2) + (full ? 16 : 0),
          lo, mid)
      }

      //Center case (the hard part)
      if(blue0 + 1 === blue1) {
        //Optimization: Range with exactly 1 point, use a brute force scan
        if(full) {
          retval = onePointFull(
            d, axis, visit,
            red0, redEnd, red, redIndex,
            blue0, blue, blueIndex[blue0])
        } else {
          retval = onePointPartial(
            d, axis, visit, flip,
            red0, redEnd, red, redIndex,
            blue0, blue, blueIndex[blue0])
        }
        if(retval !== void 0) {
          return retval
        }
      } else if(blue0 < blue1) {
        var red1
        if(full) {
          //If full intersection, need to handle special case
          red1 = partitionContainsPoint(
            d, axis,
            red0, redEnd, red, redIndex,
            mid)
          if(red0 < red1) {
            var redX = partitionStartEqual(
              d, axis,
              red0, red1, red, redIndex,
              mid)
            if(axis === d-2) {
              //Degenerate sweep intersection:
              //  [red0, redX] with [blue0, blue1]
              if(red0 < redX) {
                retval = sweep.sweepComplete(
                  d, visit,
                  red0, redX, red, redIndex,
                  blue0, blue1, blue, blueIndex)
                if(retval !== void 0) {
                  return retval
                }
              }

              //Normal sweep intersection:
              //  [redX, red1] with [blue0, blue1]
              if(redX < red1) {
                retval = sweep.sweepBipartite(
                  d, visit,
                  redX, red1, red, redIndex,
                  blue0, blue1, blue, blueIndex)
                if(retval !== void 0) {
                  return retval
                }
              }
            } else {
              if(red0 < redX) {
                iterPush(top++,
                  axis+1,
                  red0, redX,
                  blue0, blue1,
                  16,
                  -Infinity, Infinity)
              }
              if(redX < red1) {
                iterPush(top++,
                  axis+1,
                  redX, red1,
                  blue0, blue1,
                  0,
                  -Infinity, Infinity)
                iterPush(top++,
                  axis+1,
                  blue0, blue1,
                  redX, red1,
                  1,
                  -Infinity, Infinity)
              }
            }
          }
        } else {
          if(flip) {
            red1 = partitionContainsPointProper(
              d, axis,
              red0, redEnd, red, redIndex,
              mid)
          } else {
            red1 = partitionContainsPoint(
              d, axis,
              red0, redEnd, red, redIndex,
              mid)
          }
          if(red0 < red1) {
            if(axis === d-2) {
              if(flip) {
                retval = sweep.sweepBipartite(
                  d, visit,
                  blue0, blue1, blue, blueIndex,
                  red0, red1, red, redIndex)
              } else {
                retval = sweep.sweepBipartite(
                  d, visit,
                  red0, red1, red, redIndex,
                  blue0, blue1, blue, blueIndex)
              }
            } else {
              iterPush(top++,
                axis+1,
                red0, red1,
                blue0, blue1,
                flip,
                -Infinity, Infinity)
              iterPush(top++,
                axis+1,
                blue0, blue1,
                red0, red1,
                flip^1,
                -Infinity, Infinity)
            }
          }
        }
      }
    }
  }
}
},{"./brute":32,"./median":34,"./partition":35,"./sweep":37,"bit-twiddle":29,"typedarray-pool":363}],34:[function(require,module,exports){
'use strict'

module.exports = findMedian

var genPartition = require('./partition')

var partitionStartLessThan = genPartition('lo<p0', ['p0'])

var PARTITION_THRESHOLD = 8   //Cut off for using insertion sort in findMedian

//Base case for median finding:  Use insertion sort
function insertionSort(d, axis, start, end, boxes, ids) {
  var elemSize = 2 * d
  var boxPtr = elemSize * (start+1) + axis
  for(var i=start+1; i<end; ++i, boxPtr+=elemSize) {
    var x = boxes[boxPtr]
    for(var j=i, ptr=elemSize*(i-1); 
        j>start && boxes[ptr+axis] > x; 
        --j, ptr-=elemSize) {
      //Swap
      var aPtr = ptr
      var bPtr = ptr+elemSize
      for(var k=0; k<elemSize; ++k, ++aPtr, ++bPtr) {
        var y = boxes[aPtr]
        boxes[aPtr] = boxes[bPtr]
        boxes[bPtr] = y
      }
      var tmp = ids[j]
      ids[j] = ids[j-1]
      ids[j-1] = tmp
    }
  }
}

//Find median using quick select algorithm
//  takes O(n) time with high probability
function findMedian(d, axis, start, end, boxes, ids) {
  if(end <= start+1) {
    return start
  }

  var lo       = start
  var hi       = end
  var mid      = ((end + start) >>> 1)
  var elemSize = 2*d
  var pivot    = mid
  var value    = boxes[elemSize*mid+axis]
  
  while(lo < hi) {
    if(hi - lo < PARTITION_THRESHOLD) {
      insertionSort(d, axis, lo, hi, boxes, ids)
      value = boxes[elemSize*mid+axis]
      break
    }
    
    //Select pivot using median-of-3
    var count  = hi - lo
    var pivot0 = (Math.random()*count+lo)|0
    var value0 = boxes[elemSize*pivot0 + axis]
    var pivot1 = (Math.random()*count+lo)|0
    var value1 = boxes[elemSize*pivot1 + axis]
    var pivot2 = (Math.random()*count+lo)|0
    var value2 = boxes[elemSize*pivot2 + axis]
    if(value0 <= value1) {
      if(value2 >= value1) {
        pivot = pivot1
        value = value1
      } else if(value0 >= value2) {
        pivot = pivot0
        value = value0
      } else {
        pivot = pivot2
        value = value2
      }
    } else {
      if(value1 >= value2) {
        pivot = pivot1
        value = value1
      } else if(value2 >= value0) {
        pivot = pivot0
        value = value0
      } else {
        pivot = pivot2
        value = value2
      }
    }

    //Swap pivot to end of array
    var aPtr = elemSize * (hi-1)
    var bPtr = elemSize * pivot
    for(var i=0; i<elemSize; ++i, ++aPtr, ++bPtr) {
      var x = boxes[aPtr]
      boxes[aPtr] = boxes[bPtr]
      boxes[bPtr] = x
    }
    var y = ids[hi-1]
    ids[hi-1] = ids[pivot]
    ids[pivot] = y

    //Partition using pivot
    pivot = partitionStartLessThan(
      d, axis, 
      lo, hi-1, boxes, ids,
      value)

    //Swap pivot back
    var aPtr = elemSize * (hi-1)
    var bPtr = elemSize * pivot
    for(var i=0; i<elemSize; ++i, ++aPtr, ++bPtr) {
      var x = boxes[aPtr]
      boxes[aPtr] = boxes[bPtr]
      boxes[bPtr] = x
    }
    var y = ids[hi-1]
    ids[hi-1] = ids[pivot]
    ids[pivot] = y

    //Swap pivot to last pivot
    if(mid < pivot) {
      hi = pivot-1
      while(lo < hi && 
        boxes[elemSize*(hi-1)+axis] === value) {
        hi -= 1
      }
      hi += 1
    } else if(pivot < mid) {
      lo = pivot + 1
      while(lo < hi &&
        boxes[elemSize*lo+axis] === value) {
        lo += 1
      }
    } else {
      break
    }
  }

  //Make sure pivot is at start
  return partitionStartLessThan(
    d, axis, 
    start, mid, boxes, ids,
    boxes[elemSize*mid+axis])
}
},{"./partition":35}],35:[function(require,module,exports){
'use strict'

module.exports = genPartition

var code = 'for(var j=2*a,k=j*c,l=k,m=c,n=b,o=a+b,p=c;d>p;++p,k+=j){var _;if($)if(m===p)m+=1,l+=j;else{for(var s=0;j>s;++s){var t=e[k+s];e[k+s]=e[l],e[l++]=t}var u=f[p];f[p]=f[m],f[m++]=u}}return m'

function genPartition(predicate, args) {
  var fargs ='abcdef'.split('').concat(args)
  var reads = []
  if(predicate.indexOf('lo') >= 0) {
    reads.push('lo=e[k+n]')
  }
  if(predicate.indexOf('hi') >= 0) {
    reads.push('hi=e[k+o]')
  }
  fargs.push(
    code.replace('_', reads.join())
        .replace('$', predicate))
  return Function.apply(void 0, fargs)
}
},{}],36:[function(require,module,exports){
'use strict';

//This code is extracted from ndarray-sort
//It is inlined here as a temporary workaround

module.exports = wrapper;

var INSERT_SORT_CUTOFF = 32

function wrapper(data, n0) {
  if (n0 <= 4*INSERT_SORT_CUTOFF) {
    insertionSort(0, n0 - 1, data);
  } else {
    quickSort(0, n0 - 1, data);
  }
}

function insertionSort(left, right, data) {
  var ptr = 2*(left+1)
  for(var i=left+1; i<=right; ++i) {
    var a = data[ptr++]
    var b = data[ptr++]
    var j = i
    var jptr = ptr-2
    while(j-- > left) {
      var x = data[jptr-2]
      var y = data[jptr-1]
      if(x < a) {
        break
      } else if(x === a && y < b) {
        break
      }
      data[jptr]   = x
      data[jptr+1] = y
      jptr -= 2
    }
    data[jptr]   = a
    data[jptr+1] = b
  }
}

function swap(i, j, data) {
  i *= 2
  j *= 2
  var x = data[i]
  var y = data[i+1]
  data[i] = data[j]
  data[i+1] = data[j+1]
  data[j] = x
  data[j+1] = y
}

function move(i, j, data) {
  i *= 2
  j *= 2
  data[i] = data[j]
  data[i+1] = data[j+1]
}

function rotate(i, j, k, data) {
  i *= 2
  j *= 2
  k *= 2
  var x = data[i]
  var y = data[i+1]
  data[i] = data[j]
  data[i+1] = data[j+1]
  data[j] = data[k]
  data[j+1] = data[k+1]
  data[k] = x
  data[k+1] = y
}

function shufflePivot(i, j, px, py, data) {
  i *= 2
  j *= 2
  data[i] = data[j]
  data[j] = px
  data[i+1] = data[j+1]
  data[j+1] = py
}

function compare(i, j, data) {
  i *= 2
  j *= 2
  var x = data[i],
      y = data[j]
  if(x < y) {
    return false
  } else if(x === y) {
    return data[i+1] > data[j+1]
  }
  return true
}

function comparePivot(i, y, b, data) {
  i *= 2
  var x = data[i]
  if(x < y) {
    return true
  } else if(x === y) {
    return data[i+1] < b
  }
  return false
}

function quickSort(left, right, data) {
  var sixth = (right - left + 1) / 6 | 0, 
      index1 = left + sixth, 
      index5 = right - sixth, 
      index3 = left + right >> 1, 
      index2 = index3 - sixth, 
      index4 = index3 + sixth, 
      el1 = index1, 
      el2 = index2, 
      el3 = index3, 
      el4 = index4, 
      el5 = index5, 
      less = left + 1, 
      great = right - 1, 
      tmp = 0
  if(compare(el1, el2, data)) {
    tmp = el1
    el1 = el2
    el2 = tmp
  }
  if(compare(el4, el5, data)) {
    tmp = el4
    el4 = el5
    el5 = tmp
  }
  if(compare(el1, el3, data)) {
    tmp = el1
    el1 = el3
    el3 = tmp
  }
  if(compare(el2, el3, data)) {
    tmp = el2
    el2 = el3
    el3 = tmp
  }
  if(compare(el1, el4, data)) {
    tmp = el1
    el1 = el4
    el4 = tmp
  }
  if(compare(el3, el4, data)) {
    tmp = el3
    el3 = el4
    el4 = tmp
  }
  if(compare(el2, el5, data)) {
    tmp = el2
    el2 = el5
    el5 = tmp
  }
  if(compare(el2, el3, data)) {
    tmp = el2
    el2 = el3
    el3 = tmp
  }
  if(compare(el4, el5, data)) {
    tmp = el4
    el4 = el5
    el5 = tmp
  }

  var pivot1X = data[2*el2]
  var pivot1Y = data[2*el2+1]
  var pivot2X = data[2*el4]
  var pivot2Y = data[2*el4+1]

  var ptr0 = 2 * el1;
  var ptr2 = 2 * el3;
  var ptr4 = 2 * el5;
  var ptr5 = 2 * index1;
  var ptr6 = 2 * index3;
  var ptr7 = 2 * index5;
  for (var i1 = 0; i1 < 2; ++i1) {
    var x = data[ptr0+i1];
    var y = data[ptr2+i1];
    var z = data[ptr4+i1];
    data[ptr5+i1] = x;
    data[ptr6+i1] = y;
    data[ptr7+i1] = z;
  }

  move(index2, left, data)
  move(index4, right, data)
  for (var k = less; k <= great; ++k) {
    if (comparePivot(k, pivot1X, pivot1Y, data)) {
      if (k !== less) {
        swap(k, less, data)
      }
      ++less;
    } else {
      if (!comparePivot(k, pivot2X, pivot2Y, data)) {
        while (true) {
          if (!comparePivot(great, pivot2X, pivot2Y, data)) {
            if (--great < k) {
              break;
            }
            continue;
          } else {
            if (comparePivot(great, pivot1X, pivot1Y, data)) {
              rotate(k, less, great, data)
              ++less;
              --great;
            } else {
              swap(k, great, data)
              --great;
            }
            break;
          }
        }
      }
    }
  }
  shufflePivot(left, less-1, pivot1X, pivot1Y, data)
  shufflePivot(right, great+1, pivot2X, pivot2Y, data)
  if (less - 2 - left <= INSERT_SORT_CUTOFF) {
    insertionSort(left, less - 2, data);
  } else {
    quickSort(left, less - 2, data);
  }
  if (right - (great + 2) <= INSERT_SORT_CUTOFF) {
    insertionSort(great + 2, right, data);
  } else {
    quickSort(great + 2, right, data);
  }
  if (great - less <= INSERT_SORT_CUTOFF) {
    insertionSort(less, great, data);
  } else {
    quickSort(less, great, data);
  }
}
},{}],37:[function(require,module,exports){
'use strict'

module.exports = {
  init:           sqInit,
  sweepBipartite: sweepBipartite,
  sweepComplete:  sweepComplete,
  scanBipartite:  scanBipartite,
  scanComplete:   scanComplete
}

var pool  = require('typedarray-pool')
var bits  = require('bit-twiddle')
var isort = require('./sort')

//Flag for blue
var BLUE_FLAG = (1<<28)

//1D sweep event queue stuff (use pool to save space)
var INIT_CAPACITY      = 1024
var RED_SWEEP_QUEUE    = pool.mallocInt32(INIT_CAPACITY)
var RED_SWEEP_INDEX    = pool.mallocInt32(INIT_CAPACITY)
var BLUE_SWEEP_QUEUE   = pool.mallocInt32(INIT_CAPACITY)
var BLUE_SWEEP_INDEX   = pool.mallocInt32(INIT_CAPACITY)
var COMMON_SWEEP_QUEUE = pool.mallocInt32(INIT_CAPACITY)
var COMMON_SWEEP_INDEX = pool.mallocInt32(INIT_CAPACITY)
var SWEEP_EVENTS       = pool.mallocDouble(INIT_CAPACITY * 8)

//Reserves memory for the 1D sweep data structures
function sqInit(count) {
  var rcount = bits.nextPow2(count)
  if(RED_SWEEP_QUEUE.length < rcount) {
    pool.free(RED_SWEEP_QUEUE)
    RED_SWEEP_QUEUE = pool.mallocInt32(rcount)
  }
  if(RED_SWEEP_INDEX.length < rcount) {
    pool.free(RED_SWEEP_INDEX)
    RED_SWEEP_INDEX = pool.mallocInt32(rcount)
  }
  if(BLUE_SWEEP_QUEUE.length < rcount) {
    pool.free(BLUE_SWEEP_QUEUE)
    BLUE_SWEEP_QUEUE = pool.mallocInt32(rcount)
  }
  if(BLUE_SWEEP_INDEX.length < rcount) {
    pool.free(BLUE_SWEEP_INDEX)
    BLUE_SWEEP_INDEX = pool.mallocInt32(rcount)
  }
  if(COMMON_SWEEP_QUEUE.length < rcount) {
    pool.free(COMMON_SWEEP_QUEUE)
    COMMON_SWEEP_QUEUE = pool.mallocInt32(rcount)
  }
  if(COMMON_SWEEP_INDEX.length < rcount) {
    pool.free(COMMON_SWEEP_INDEX)
    COMMON_SWEEP_INDEX = pool.mallocInt32(rcount)
  }
  var eventLength = 8 * rcount
  if(SWEEP_EVENTS.length < eventLength) {
    pool.free(SWEEP_EVENTS)
    SWEEP_EVENTS = pool.mallocDouble(eventLength)
  }
}

//Remove an item from the active queue in O(1)
function sqPop(queue, index, count, item) {
  var idx = index[item]
  var top = queue[count-1]
  queue[idx] = top
  index[top] = idx
}

//Insert an item into the active queue in O(1)
function sqPush(queue, index, count, item) {
  queue[count] = item
  index[item]  = count
}

//Recursion base case: use 1D sweep algorithm
function sweepBipartite(
    d, visit,
    redStart,  redEnd, red, redIndex,
    blueStart, blueEnd, blue, blueIndex) {

  //store events as pairs [coordinate, idx]
  //
  //  red create:  -(idx+1)
  //  red destroy: idx
  //  blue create: -(idx+BLUE_FLAG)
  //  blue destroy: idx+BLUE_FLAG
  //
  var ptr      = 0
  var elemSize = 2*d
  var istart   = d-1
  var iend     = elemSize-1

  for(var i=redStart; i<redEnd; ++i) {
    var idx = redIndex[i]
    var redOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = red[redOffset+istart]
    SWEEP_EVENTS[ptr++] = -(idx+1)
    SWEEP_EVENTS[ptr++] = red[redOffset+iend]
    SWEEP_EVENTS[ptr++] = idx
  }

  for(var i=blueStart; i<blueEnd; ++i) {
    var idx = blueIndex[i]+BLUE_FLAG
    var blueOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = blue[blueOffset+istart]
    SWEEP_EVENTS[ptr++] = -idx
    SWEEP_EVENTS[ptr++] = blue[blueOffset+iend]
    SWEEP_EVENTS[ptr++] = idx
  }

  //process events from left->right
  var n = ptr >>> 1
  isort(SWEEP_EVENTS, n)
  
  var redActive  = 0
  var blueActive = 0
  for(var i=0; i<n; ++i) {
    var e = SWEEP_EVENTS[2*i+1]|0
    if(e >= BLUE_FLAG) {
      //blue destroy event
      e = (e-BLUE_FLAG)|0
      sqPop(BLUE_SWEEP_QUEUE, BLUE_SWEEP_INDEX, blueActive--, e)
    } else if(e >= 0) {
      //red destroy event
      sqPop(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive--, e)
    } else if(e <= -BLUE_FLAG) {
      //blue create event
      e = (-e-BLUE_FLAG)|0
      for(var j=0; j<redActive; ++j) {
        var retval = visit(RED_SWEEP_QUEUE[j], e)
        if(retval !== void 0) {
          return retval
        }
      }
      sqPush(BLUE_SWEEP_QUEUE, BLUE_SWEEP_INDEX, blueActive++, e)
    } else {
      //red create event
      e = (-e-1)|0
      for(var j=0; j<blueActive; ++j) {
        var retval = visit(e, BLUE_SWEEP_QUEUE[j])
        if(retval !== void 0) {
          return retval
        }
      }
      sqPush(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive++, e)
    }
  }
}

//Complete sweep
function sweepComplete(d, visit, 
  redStart, redEnd, red, redIndex,
  blueStart, blueEnd, blue, blueIndex) {

  var ptr      = 0
  var elemSize = 2*d
  var istart   = d-1
  var iend     = elemSize-1

  for(var i=redStart; i<redEnd; ++i) {
    var idx = (redIndex[i]+1)<<1
    var redOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = red[redOffset+istart]
    SWEEP_EVENTS[ptr++] = -idx
    SWEEP_EVENTS[ptr++] = red[redOffset+iend]
    SWEEP_EVENTS[ptr++] = idx
  }

  for(var i=blueStart; i<blueEnd; ++i) {
    var idx = (blueIndex[i]+1)<<1
    var blueOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = blue[blueOffset+istart]
    SWEEP_EVENTS[ptr++] = (-idx)|1
    SWEEP_EVENTS[ptr++] = blue[blueOffset+iend]
    SWEEP_EVENTS[ptr++] = idx|1
  }

  //process events from left->right
  var n = ptr >>> 1
  isort(SWEEP_EVENTS, n)
  
  var redActive    = 0
  var blueActive   = 0
  var commonActive = 0
  for(var i=0; i<n; ++i) {
    var e     = SWEEP_EVENTS[2*i+1]|0
    var color = e&1
    if(i < n-1 && (e>>1) === (SWEEP_EVENTS[2*i+3]>>1)) {
      color = 2
      i += 1
    }
    
    if(e < 0) {
      //Create event
      var id = -(e>>1) - 1

      //Intersect with common
      for(var j=0; j<commonActive; ++j) {
        var retval = visit(COMMON_SWEEP_QUEUE[j], id)
        if(retval !== void 0) {
          return retval
        }
      }

      if(color !== 0) {
        //Intersect with red
        for(var j=0; j<redActive; ++j) {
          var retval = visit(RED_SWEEP_QUEUE[j], id)
          if(retval !== void 0) {
            return retval
          }
        }
      }

      if(color !== 1) {
        //Intersect with blue
        for(var j=0; j<blueActive; ++j) {
          var retval = visit(BLUE_SWEEP_QUEUE[j], id)
          if(retval !== void 0) {
            return retval
          }
        }
      }

      if(color === 0) {
        //Red
        sqPush(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive++, id)
      } else if(color === 1) {
        //Blue
        sqPush(BLUE_SWEEP_QUEUE, BLUE_SWEEP_INDEX, blueActive++, id)
      } else if(color === 2) {
        //Both
        sqPush(COMMON_SWEEP_QUEUE, COMMON_SWEEP_INDEX, commonActive++, id)
      }
    } else {
      //Destroy event
      var id = (e>>1) - 1
      if(color === 0) {
        //Red
        sqPop(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive--, id)
      } else if(color === 1) {
        //Blue
        sqPop(BLUE_SWEEP_QUEUE, BLUE_SWEEP_INDEX, blueActive--, id)
      } else if(color === 2) {
        //Both
        sqPop(COMMON_SWEEP_QUEUE, COMMON_SWEEP_INDEX, commonActive--, id)
      }
    }
  }
}

//Sweep and prune/scanline algorithm:
//  Scan along axis, detect intersections
//  Brute force all boxes along axis
function scanBipartite(
  d, axis, visit, flip,
  redStart,  redEnd, red, redIndex,
  blueStart, blueEnd, blue, blueIndex) {
  
  var ptr      = 0
  var elemSize = 2*d
  var istart   = axis
  var iend     = axis+d

  var redShift  = 1
  var blueShift = 1
  if(flip) {
    blueShift = BLUE_FLAG
  } else {
    redShift  = BLUE_FLAG
  }

  for(var i=redStart; i<redEnd; ++i) {
    var idx = i + redShift
    var redOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = red[redOffset+istart]
    SWEEP_EVENTS[ptr++] = -idx
    SWEEP_EVENTS[ptr++] = red[redOffset+iend]
    SWEEP_EVENTS[ptr++] = idx
  }
  for(var i=blueStart; i<blueEnd; ++i) {
    var idx = i + blueShift
    var blueOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = blue[blueOffset+istart]
    SWEEP_EVENTS[ptr++] = -idx
  }

  //process events from left->right
  var n = ptr >>> 1
  isort(SWEEP_EVENTS, n)
  
  var redActive    = 0
  for(var i=0; i<n; ++i) {
    var e = SWEEP_EVENTS[2*i+1]|0
    if(e < 0) {
      var idx   = -e
      var isRed = false
      if(idx >= BLUE_FLAG) {
        isRed = !flip
        idx -= BLUE_FLAG 
      } else {
        isRed = !!flip
        idx -= 1
      }
      if(isRed) {
        sqPush(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive++, idx)
      } else {
        var blueId  = blueIndex[idx]
        var bluePtr = elemSize * idx
        
        var b0 = blue[bluePtr+axis+1]
        var b1 = blue[bluePtr+axis+1+d]

red_loop:
        for(var j=0; j<redActive; ++j) {
          var oidx   = RED_SWEEP_QUEUE[j]
          var redPtr = elemSize * oidx

          if(b1 < red[redPtr+axis+1] || 
             red[redPtr+axis+1+d] < b0) {
            continue
          }

          for(var k=axis+2; k<d; ++k) {
            if(blue[bluePtr + k + d] < red[redPtr + k] || 
               red[redPtr + k + d] < blue[bluePtr + k]) {
              continue red_loop
            }
          }

          var redId  = redIndex[oidx]
          var retval
          if(flip) {
            retval = visit(blueId, redId)
          } else {
            retval = visit(redId, blueId)
          }
          if(retval !== void 0) {
            return retval 
          }
        }
      }
    } else {
      sqPop(RED_SWEEP_QUEUE, RED_SWEEP_INDEX, redActive--, e - redShift)
    }
  }
}

function scanComplete(
  d, axis, visit,
  redStart,  redEnd, red, redIndex,
  blueStart, blueEnd, blue, blueIndex) {

  var ptr      = 0
  var elemSize = 2*d
  var istart   = axis
  var iend     = axis+d

  for(var i=redStart; i<redEnd; ++i) {
    var idx = i + BLUE_FLAG
    var redOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = red[redOffset+istart]
    SWEEP_EVENTS[ptr++] = -idx
    SWEEP_EVENTS[ptr++] = red[redOffset+iend]
    SWEEP_EVENTS[ptr++] = idx
  }
  for(var i=blueStart; i<blueEnd; ++i) {
    var idx = i + 1
    var blueOffset = elemSize*i
    SWEEP_EVENTS[ptr++] = blue[blueOffset+istart]
    SWEEP_EVENTS[ptr++] = -idx
  }

  //process events from left->right
  var n = ptr >>> 1
  isort(SWEEP_EVENTS, n)
  
  var redActive    = 0
  for(var i=0; i<n; ++i) {
    var e = SWEEP_EVENTS[2*i+1]|0
    if(e < 0) {
      var idx   = -e
      if(idx >= BLUE_FLAG) {
        RED_SWEEP_QUEUE[redActive++] = idx - BLUE_FLAG
      } else {
        idx -= 1
        var blueId  = blueIndex[idx]
        var bluePtr = elemSize * idx

        var b0 = blue[bluePtr+axis+1]
        var b1 = blue[bluePtr+axis+1+d]

red_loop:
        for(var j=0; j<redActive; ++j) {
          var oidx   = RED_SWEEP_QUEUE[j]
          var redId  = redIndex[oidx]

          if(redId === blueId) {
            break
          }

          var redPtr = elemSize * oidx
          if(b1 < red[redPtr+axis+1] || 
            red[redPtr+axis+1+d] < b0) {
            continue
          }
          for(var k=axis+2; k<d; ++k) {
            if(blue[bluePtr + k + d] < red[redPtr + k] || 
               red[redPtr + k + d]   < blue[bluePtr + k]) {
              continue red_loop
            }
          }

          var retval = visit(redId, blueId)
          if(retval !== void 0) {
            return retval 
          }
        }
      }
    } else {
      var idx = e - BLUE_FLAG
      for(var j=redActive-1; j>=0; --j) {
        if(RED_SWEEP_QUEUE[j] === idx) {
          for(var k=j+1; k<redActive; ++k) {
            RED_SWEEP_QUEUE[k-1] = RED_SWEEP_QUEUE[k]
          }
          break
        }
      }
      --redActive
    }
  }
}
},{"./sort":36,"bit-twiddle":29,"typedarray-pool":363}],38:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
 *     on objects.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

function typedArraySupport () {
  function Bar () {}
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    arr.constructor = Bar
    return arr.foo() === 42 && // typed array instances can be augmented
        arr.constructor === Bar && // constructor can be set
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    this.length = 0
    this.parent = undefined
  }

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined') {
    if (object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object)
    }
    if (object instanceof ArrayBuffer) {
      return fromArrayBuffer(that, object)
    }
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    array.byteLength
    that = Buffer._augment(new Uint8Array(array))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromTypedArray(that, new Uint8Array(array))
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
} else {
  // pre-set for values that may exist in the future
  Buffer.prototype.length = undefined
  Buffer.prototype.parent = undefined
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` is deprecated
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` is deprecated
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":10,"ieee754":300,"isarray":39}],39:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],40:[function(require,module,exports){
'use strict'

var monotoneTriangulate = require('./lib/monotone')
var makeIndex = require('./lib/triangulation')
var delaunayFlip = require('./lib/delaunay')
var filterTriangulation = require('./lib/filter')

module.exports = cdt2d

function canonicalizeEdge(e) {
  return [Math.min(e[0], e[1]), Math.max(e[0], e[1])]
}

function compareEdge(a, b) {
  return a[0]-b[0] || a[1]-b[1]
}

function canonicalizeEdges(edges) {
  return edges.map(canonicalizeEdge).sort(compareEdge)
}

function getDefault(options, property, dflt) {
  if(property in options) {
    return options[property]
  }
  return dflt
}

function cdt2d(points, edges, options) {

  if(!Array.isArray(edges)) {
    options = edges || {}
    edges = []
  } else {
    options = options || {}
    edges = edges || []
  }

  //Parse out options
  var delaunay = !!getDefault(options, 'delaunay', true)
  var interior = !!getDefault(options, 'interior', true)
  var exterior = !!getDefault(options, 'exterior', true)
  var infinity = !!getDefault(options, 'infinity', false)

  //Handle trivial case
  if((!interior && !exterior) || points.length === 0) {
    return []
  }

  //Construct initial triangulation
  var cells = monotoneTriangulate(points, edges)

  //If delaunay refinement needed, then improve quality by edge flipping
  if(delaunay || interior !== exterior || infinity) {

    //Index all of the cells to support fast neighborhood queries
    var triangulation = makeIndex(points.length, canonicalizeEdges(edges))
    for(var i=0; i<cells.length; ++i) {
      var f = cells[i]
      triangulation.addTriangle(f[0], f[1], f[2])
    }

    //Run edge flipping
    if(delaunay) {
      delaunayFlip(points, triangulation)
    }

    //Filter points
    if(!exterior) {
      return filterTriangulation(triangulation, -1)
    } else if(!interior) {
      return filterTriangulation(triangulation,  1, infinity)
    } else if(infinity) {
      return filterTriangulation(triangulation, 0, infinity)
    } else {
      return triangulation.cells()
    }
    
  } else {
    return cells
  }
}

},{"./lib/delaunay":41,"./lib/filter":42,"./lib/monotone":43,"./lib/triangulation":44}],41:[function(require,module,exports){
'use strict'

var inCircle = require('robust-in-sphere')[4]
var bsearch = require('binary-search-bounds')

module.exports = delaunayRefine

function testFlip(points, triangulation, stack, a, b, x) {
  var y = triangulation.opposite(a, b)

  //Test boundary edge
  if(y < 0) {
    return
  }

  //Swap edge if order flipped
  if(b < a) {
    var tmp = a
    a = b
    b = tmp
    tmp = x
    x = y
    y = tmp
  }

  //Test if edge is constrained
  if(triangulation.isConstraint(a, b)) {
    return
  }

  //Test if edge is delaunay
  if(inCircle(points[a], points[b], points[x], points[y]) < 0) {
    stack.push(a, b)
  }
}

//Assume edges are sorted lexicographically
function delaunayRefine(points, triangulation) {
  var stack = []

  var numPoints = points.length
  var stars = triangulation.stars
  for(var a=0; a<numPoints; ++a) {
    var star = stars[a]
    for(var j=1; j<star.length; j+=2) {
      var b = star[j]

      //If order is not consistent, then skip edge
      if(b < a) {
        continue
      }

      //Check if edge is constrained
      if(triangulation.isConstraint(a, b)) {
        continue
      }

      //Find opposite edge
      var x = star[j-1], y = -1
      for(var k=1; k<star.length; k+=2) {
        if(star[k-1] === b) {
          y = star[k]
          break
        }
      }

      //If this is a boundary edge, don't flip it
      if(y < 0) {
        continue
      }

      //If edge is in circle, flip it
      if(inCircle(points[a], points[b], points[x], points[y]) < 0) {
        stack.push(a, b)
      }
    }
  }

  while(stack.length > 0) {
    var b = stack.pop()
    var a = stack.pop()

    //Find opposite pairs
    var x = -1, y = -1
    var star = stars[a]
    for(var i=1; i<star.length; i+=2) {
      var s = star[i-1]
      var t = star[i]
      if(s === b) {
        y = t
      } else if(t === b) {
        x = s
      }
    }

    //If x/y are both valid then skip edge
    if(x < 0 || y < 0) {
      continue
    }

    //If edge is now delaunay, then don't flip it
    if(inCircle(points[a], points[b], points[x], points[y]) >= 0) {
      continue
    }

    //Flip the edge
    triangulation.flip(a, b)

    //Test flipping neighboring edges
    testFlip(points, triangulation, stack, x, a, y)
    testFlip(points, triangulation, stack, a, y, x)
    testFlip(points, triangulation, stack, y, b, x)
    testFlip(points, triangulation, stack, b, x, y)
  }
}

},{"binary-search-bounds":28,"robust-in-sphere":323}],42:[function(require,module,exports){
'use strict'

var bsearch = require('binary-search-bounds')

module.exports = classifyFaces

function FaceIndex(cells, neighbor, constraint, flags, active, next, boundary) {
  this.cells       = cells
  this.neighbor    = neighbor
  this.flags       = flags
  this.constraint  = constraint
  this.active      = active
  this.next        = next
  this.boundary    = boundary
}

var proto = FaceIndex.prototype

function compareCell(a, b) {
  return a[0] - b[0] ||
         a[1] - b[1] ||
         a[2] - b[2]
}

proto.locate = (function() {
  var key = [0,0,0]
  return function(a, b, c) {
    var x = a, y = b, z = c
    if(b < c) {
      if(b < a) {
        x = b
        y = c
        z = a
      }
    } else if(c < a) {
      x = c
      y = a
      z = b
    }
    if(x < 0) {
      return -1
    }
    key[0] = x
    key[1] = y
    key[2] = z
    return bsearch.eq(this.cells, key, compareCell)
  }
})()

function indexCells(triangulation, infinity) {
  //First get cells and canonicalize
  var cells = triangulation.cells()
  var nc = cells.length
  for(var i=0; i<nc; ++i) {
    var c = cells[i]
    var x = c[0], y = c[1], z = c[2]
    if(y < z) {
      if(y < x) {
        c[0] = y
        c[1] = z
        c[2] = x
      }
    } else if(z < x) {
      c[0] = z
      c[1] = x
      c[2] = y
    }
  }
  cells.sort(compareCell)

  //Initialize flag array
  var flags = new Array(nc)
  for(var i=0; i<flags.length; ++i) {
    flags[i] = 0
  }

  //Build neighbor index, initialize queues
  var active = []
  var next   = []
  var neighbor = new Array(3*nc)
  var constraint = new Array(3*nc)
  var boundary = null
  if(infinity) {
    boundary = []
  }
  var index = new FaceIndex(
    cells,
    neighbor,
    constraint,
    flags,
    active,
    next,
    boundary)
  for(var i=0; i<nc; ++i) {
    var c = cells[i]
    for(var j=0; j<3; ++j) {
      var x = c[j], y = c[(j+1)%3]
      var a = neighbor[3*i+j] = index.locate(y, x, triangulation.opposite(y, x))
      var b = constraint[3*i+j] = triangulation.isConstraint(x, y)
      if(a < 0) {
        if(b) {
          next.push(i)
        } else {
          active.push(i)
          flags[i] = 1
        }
        if(infinity) {
          boundary.push([y, x, -1])
        }
      }
    }
  }
  return index
}

function filterCells(cells, flags, target) {
  var ptr = 0
  for(var i=0; i<cells.length; ++i) {
    if(flags[i] === target) {
      cells[ptr++] = cells[i]
    }
  }
  cells.length = ptr
  return cells
}

function classifyFaces(triangulation, target, infinity) {
  var index = indexCells(triangulation, infinity)

  if(target === 0) {
    if(infinity) {
      return index.cells.concat(index.boundary)
    } else {
      return index.cells
    }
  }

  var side = 1
  var active = index.active
  var next = index.next
  var flags = index.flags
  var cells = index.cells
  var constraint = index.constraint
  var neighbor = index.neighbor

  while(active.length > 0 || next.length > 0) {
    while(active.length > 0) {
      var t = active.pop()
      if(flags[t] === -side) {
        continue
      }
      flags[t] = side
      var c = cells[t]
      for(var j=0; j<3; ++j) {
        var f = neighbor[3*t+j]
        if(f >= 0 && flags[f] === 0) {
          if(constraint[3*t+j]) {
            next.push(f)
          } else {
            active.push(f)
            flags[f] = side
          }
        }
      }
    }

    //Swap arrays and loop
    var tmp = next
    next = active
    active = tmp
    next.length = 0
    side = -side
  }

  var result = filterCells(cells, flags, target)
  if(infinity) {
    return result.concat(index.boundary)
  }
  return result
}

},{"binary-search-bounds":28}],43:[function(require,module,exports){
'use strict'

var bsearch = require('binary-search-bounds')
var orient = require('robust-orientation')[3]

var EVENT_POINT = 0
var EVENT_END   = 1
var EVENT_START = 2

module.exports = monotoneTriangulate

//A partial convex hull fragment, made of two unimonotone polygons
function PartialHull(a, b, idx, lowerIds, upperIds) {
  this.a = a
  this.b = b
  this.idx = idx
  this.lowerIds = lowerIds
  this.upperIds = upperIds
}

//An event in the sweep line procedure
function Event(a, b, type, idx) {
  this.a    = a
  this.b    = b
  this.type = type
  this.idx  = idx
}

//This is used to compare events for the sweep line procedure
// Points are:
//  1. sorted lexicographically
//  2. sorted by type  (point < end < start)
//  3. segments sorted by winding order
//  4. sorted by index
function compareEvent(a, b) {
  var d =
    (a.a[0] - b.a[0]) ||
    (a.a[1] - b.a[1]) ||
    (a.type - b.type)
  if(d) { return d }
  if(a.type !== EVENT_POINT) {
    d = orient(a.a, a.b, b.b)
    if(d) { return d }
  }
  return a.idx - b.idx
}

function testPoint(hull, p) {
  return orient(hull.a, hull.b, p)
}

function addPoint(cells, hulls, points, p, idx) {
  var lo = bsearch.lt(hulls, p, testPoint)
  var hi = bsearch.gt(hulls, p, testPoint)
  for(var i=lo; i<hi; ++i) {
    var hull = hulls[i]

    //Insert p into lower hull
    var lowerIds = hull.lowerIds
    var m = lowerIds.length
    while(m > 1 && orient(
        points[lowerIds[m-2]],
        points[lowerIds[m-1]],
        p) > 0) {
      cells.push(
        [lowerIds[m-1],
         lowerIds[m-2],
         idx])
      m -= 1
    }
    lowerIds.length = m
    lowerIds.push(idx)

    //Insert p into upper hull
    var upperIds = hull.upperIds
    var m = upperIds.length
    while(m > 1 && orient(
        points[upperIds[m-2]],
        points[upperIds[m-1]],
        p) < 0) {
      cells.push(
        [upperIds[m-2],
         upperIds[m-1],
         idx])
      m -= 1
    }
    upperIds.length = m
    upperIds.push(idx)
  }
}

function findSplit(hull, edge) {
  var d
  if(hull.a[0] < edge.a[0]) {
    d = orient(hull.a, hull.b, edge.a)
  } else {
    d = orient(edge.b, edge.a, hull.a)
  }
  if(d) { return d }
  if(edge.b[0] < hull.b[0]) {
    d = orient(hull.a, hull.b, edge.b)
  } else {
    d = orient(edge.b, edge.a, hull.b)
  }
  return d || hull.idx - edge.idx
}

function splitHulls(hulls, points, event) {
  var splitIdx = bsearch.le(hulls, event, findSplit)
  var hull = hulls[splitIdx]
  var upperIds = hull.upperIds
  var x = upperIds[upperIds.length-1]
  hull.upperIds = [x]
  hulls.splice(splitIdx+1, 0,
    new PartialHull(event.a, event.b, event.idx, [x], upperIds))
}


function mergeHulls(hulls, points, event) {
  //Swap pointers for merge search
  var tmp = event.a
  event.a = event.b
  event.b = tmp
  var mergeIdx = bsearch.eq(hulls, event, findSplit)
  var upper = hulls[mergeIdx]
  var lower = hulls[mergeIdx-1]
  lower.upperIds = upper.upperIds
  hulls.splice(mergeIdx, 1)
}


function monotoneTriangulate(points, edges) {

  var numPoints = points.length
  var numEdges = edges.length

  var events = []

  //Create point events
  for(var i=0; i<numPoints; ++i) {
    events.push(new Event(
      points[i],
      null,
      EVENT_POINT,
      i))
  }

  //Create edge events
  for(var i=0; i<numEdges; ++i) {
    var e = edges[i]
    var a = points[e[0]]
    var b = points[e[1]]
    if(a[0] < b[0]) {
      events.push(
        new Event(a, b, EVENT_START, i),
        new Event(b, a, EVENT_END, i))
    } else if(a[0] > b[0]) {
      events.push(
        new Event(b, a, EVENT_START, i),
        new Event(a, b, EVENT_END, i))
    }
  }

  //Sort events
  events.sort(compareEvent)

  //Initialize hull
  var minX = events[0].a[0] - (1 + Math.abs(events[0].a[0])) * Math.pow(2, -52)
  var hull = [ new PartialHull([minX, 1], [minX, 0], -1, [], [], [], []) ]

  //Process events in order
  var cells = []
  for(var i=0, numEvents=events.length; i<numEvents; ++i) {
    var event = events[i]
    var type = event.type
    if(type === EVENT_POINT) {
      addPoint(cells, hull, points, event.a, event.idx)
    } else if(type === EVENT_START) {
      splitHulls(hull, points, event)
    } else {
      mergeHulls(hull, points, event)
    }
  }

  //Return triangulation
  return cells
}

},{"binary-search-bounds":28,"robust-orientation":324}],44:[function(require,module,exports){
'use strict'

var bsearch = require('binary-search-bounds')

module.exports = createTriangulation

function Triangulation(stars, edges) {
  this.stars = stars
  this.edges = edges
}

var proto = Triangulation.prototype

function removePair(list, j, k) {
  for(var i=1, n=list.length; i<n; i+=2) {
    if(list[i-1] === j && list[i] === k) {
      list[i-1] = list[n-2]
      list[i] = list[n-1]
      list.length = n - 2
      return
    }
  }
}

proto.isConstraint = (function() {
  var e = [0,0]
  function compareLex(a, b) {
    return a[0] - b[0] || a[1] - b[1]
  }
  return function(i, j) {
    e[0] = Math.min(i,j)
    e[1] = Math.max(i,j)
    return bsearch.eq(this.edges, e, compareLex) >= 0
  }
})()

proto.removeTriangle = function(i, j, k) {
  var stars = this.stars
  removePair(stars[i], j, k)
  removePair(stars[j], k, i)
  removePair(stars[k], i, j)
}

proto.addTriangle = function(i, j, k) {
  var stars = this.stars
  stars[i].push(j, k)
  stars[j].push(k, i)
  stars[k].push(i, j)
}

proto.opposite = function(j, i) {
  var list = this.stars[i]
  for(var k=1, n=list.length; k<n; k+=2) {
    if(list[k] === j) {
      return list[k-1]
    }
  }
  return -1
}

proto.flip = function(i, j) {
  var a = this.opposite(i, j)
  var b = this.opposite(j, i)
  this.removeTriangle(i, j, a)
  this.removeTriangle(j, i, b)
  this.addTriangle(i, b, a)
  this.addTriangle(j, a, b)
}

proto.edges = function() {
  var stars = this.stars
  var result = []
  for(var i=0, n=stars.length; i<n; ++i) {
    var list = stars[i]
    for(var j=0, m=list.length; j<m; j+=2) {
      result.push([list[j], list[j+1]])
    }
  }
  return result
}

proto.cells = function() {
  var stars = this.stars
  var result = []
  for(var i=0, n=stars.length; i<n; ++i) {
    var list = stars[i]
    for(var j=0, m=list.length; j<m; j+=2) {
      var s = list[j]
      var t = list[j+1]
      if(i < Math.min(s, t)) {
        result.push([i, s, t])
      }
    }
  }
  return result
}

function createTriangulation(numVerts, edges) {
  var stars = new Array(numVerts)
  for(var i=0; i<numVerts; ++i) {
    stars[i] = []
  }
  return new Triangulation(stars, edges)
}

},{"binary-search-bounds":28}],45:[function(require,module,exports){
'use strict'

module.exports = cleanPSLG

var UnionFind = require('union-find')
var boxIntersect = require('box-intersect')
var compareCell = require('compare-cell')
var segseg = require('robust-segment-intersect')
var rat = require('big-rat')
var ratCmp = require('big-rat/cmp')
var ratToFloat = require('big-rat/to-float')
var ratVec = require('rat-vec')
var nextafter = require('nextafter')

var solveIntersection = require('./lib/rat-seg-intersect')

//Bounds on a rational number when rounded to a float
function boundRat(r) {
  var f = ratToFloat(r)
  var cmp = ratCmp(rat(f), r)
  if(cmp < 0) {
    return [f, nextafter(f, Infinity)]
  } else if(cmp > 0) {
    return [nextafter(f, -Infinity), f]
  } else {
    return [f, f]
  }
}

//Convert a list of edges in a pslg to bounding boxes
function boundEdges(points, edges) {
  var bounds = new Array(edges.length)
  for(var i=0; i<edges.length; ++i) {
    var e = edges[i]
    var a = points[e[0]]
    var b = points[e[1]]
    bounds[i] = [
      Math.min(a[0], b[0]),
      Math.min(a[1], b[1]),
      Math.max(a[0], b[0]),
      Math.max(a[1], b[1]) ]
  }
  return bounds
}

//Convert a list of points into bounding boxes by duplicating coords
function boundPoints(points) {
  var bounds = new Array(points.length)
  for(var i=0; i<points.length; ++i) {
    var p = points[i]
    bounds[i] = [ p[0], p[1], p[0], p[1] ]
  }
  return bounds
}

//Find all pairs of crossing edges in a pslg (given edge bounds)
function getCrossings(points, edges, edgeBounds) {
  var result = []
  boxIntersect(edgeBounds, function(i, j) {
    var e = edges[i]
    var f = edges[j]
    if(e[0] === f[0] || e[0] === f[1] ||
       e[1] === f[0] || e[1] === f[1]) {
         return
    }
    var a = points[e[0]]
    var b = points[e[1]]
    var c = points[f[0]]
    var d = points[f[1]]
    if(segseg(a, b, c, d)) {
      result.push([i, j])
    }
  })
  return result
}

//Find all pairs of crossing vertices in a pslg (given edge/vert bounds)
function getTJunctions(points, edges, edgeBounds, vertBounds) {
  var result = []
  boxIntersect(edgeBounds, vertBounds, function(i, v) {
    var e = edges[i]
    if(e[0] === v || e[1] === v) {
      return
    }
    var p = points[v]
    var a = points[e[0]]
    var b = points[e[1]]
    if(segseg(a, b, p, p)) {
      result.push([i, v])
    }
  })
  return result
}


//Cut edges along crossings/tjunctions
function cutEdges(floatPoints, edges, crossings, junctions, useColor) {

  //Convert crossings into tjunctions by constructing rational points
  var ratPoints = []
  for(var i=0; i<crossings.length; ++i) {
    var crossing = crossings[i]
    var e = crossing[0]
    var f = crossing[1]
    var ee = edges[e]
    var ef = edges[f]
    var x = solveIntersection(
      ratVec(floatPoints[ee[0]]),
      ratVec(floatPoints[ee[1]]),
      ratVec(floatPoints[ef[0]]),
      ratVec(floatPoints[ef[1]]))
    if(!x) {
      //Segments are parallel, should already be handled by t-junctions
      continue
    }
    var idx = ratPoints.length + floatPoints.length
    ratPoints.push(x)
    junctions.push([e, idx], [f, idx])
  }

  //Sort tjunctions
  function getPoint(idx) {
    if(idx >= floatPoints.length) {
      return ratPoints[idx-floatPoints.length]
    }
    var p = floatPoints[idx]
    return [ rat(p[0]), rat(p[1]) ]
  }
  junctions.sort(function(a, b) {
    if(a[0] !== b[0]) {
      return a[0] - b[0]
    }
    var u = getPoint(a[1])
    var v = getPoint(b[1])
    return ratCmp(u[0], v[0]) || ratCmp(u[1], v[1])
  })

  //Split edges along junctions
  for(var i=junctions.length-1; i>=0; --i) {
    var junction = junctions[i]
    var e = junction[0]

    var edge = edges[e]
    var s = edge[0]
    var t = edge[1]

    //Check if edge is not lexicographically sorted
    var a = floatPoints[s]
    var b = floatPoints[t]
    if(((a[0] - b[0]) || (a[1] - b[1])) < 0) {
      var tmp = s
      s = t
      t = tmp
    }

    //Split leading edge
    edge[0] = s
    var last = edge[1] = junction[1]

    //If we are grouping edges by color, remember to track data
    var color
    if(useColor) {
      color = edge[2]
    }

    //Split other edges
    while(i > 0 && junctions[i-1][0] === e) {
      var junction = junctions[--i]
      var next = junction[1]
      if(useColor) {
        edges.push([last, next, color])
      } else {
        edges.push([last, next])
      }
      last = next
    }

    //Add final edge
    if(useColor) {
      edges.push([last, t, color])
    } else {
      edges.push([last, t])
    }
  }

  //Return constructed rational points
  return ratPoints
}

//Merge overlapping points
function dedupPoints(floatPoints, ratPoints, floatBounds) {
  var numPoints = floatPoints.length + ratPoints.length
  var uf        = new UnionFind(numPoints)

  //Compute rational bounds
  var bounds = floatBounds
  for(var i=0; i<ratPoints.length; ++i) {
    var p = ratPoints[i]
    var xb = boundRat(p[0])
    var yb = boundRat(p[1])
    bounds.push([ xb[0], yb[0], xb[1], yb[1] ])
    floatPoints.push([ ratToFloat(p[0]), ratToFloat(p[1]) ])
  }

  //Link all points with over lapping boxes
  boxIntersect(bounds, function(i, j) {
    uf.link(i, j)
  })

  //Call find on each point to get a relabeling
  var ptr = 0
  var noDupes = true
  var labels = new Array(numPoints)
  for(var i=0; i<numPoints; ++i) {
    var j = uf.find(i)
    if(j === i) {
      //If not a duplicate, then don't bother
      labels[i] = ptr
      floatPoints[ptr++] = floatPoints[i]
    } else {
      //Clear no-dupes flag, zero out label
      noDupes = false
      labels[i] = -1
    }
  }
  floatPoints.length = ptr

  //If no duplicates, return null to signal termination
  if(noDupes) {
    return null
  }

  //Do a second pass to fix up missing labels
  for(var i=0; i<numPoints; ++i) {
    if(labels[i] < 0) {
      labels[i] = labels[uf.find(i)]
    }
  }

  //Return resulting union-find data structure
  return labels
}

function compareLex2(a,b) { return (a[0]-b[0]) || (a[1]-b[1]) }
function compareLex3(a,b) {
  var d = (a[0] - b[0]) || (a[1] - b[1])
  if(d) {
    return d
  }
  if(a[2] < b[2]) {
    return -1
  } else if(a[2] > b[2]) {
    return 1
  }
  return 0
}

//Remove duplicate edge labels
function dedupEdges(edges, labels, useColor) {
  if(edges.length === 0) {
    return
  }
  if(labels) {
    for(var i=0; i<edges.length; ++i) {
      var e = edges[i]
      var a = labels[e[0]]
      var b = labels[e[1]]
      e[0] = Math.min(a, b)
      e[1] = Math.max(a, b)
    }
  } else {
    for(var i=0; i<edges.length; ++i) {
      var e = edges[i]
      var a = e[0]
      var b = e[1]
      e[0] = Math.min(a, b)
      e[1] = Math.max(a, b)
    }
  }
  if(useColor) {
    edges.sort(compareLex3)
  } else {
    edges.sort(compareLex2)
  }
  var ptr = 1
  for(var i=1; i<edges.length; ++i) {
    var prev = edges[i-1]
    var next = edges[i]
    if(next[0] === prev[0] && next[1] === prev[1] &&
      (!useColor || next[2] === prev[2])) {
      continue
    }
    edges[ptr++] = next
  }
  edges.length = ptr
}

//Repeat until convergence
function snapRound(points, edges, useColor) {

  // 1. find edge crossings
  var edgeBounds = boundEdges(points, edges)
  var crossings  = getCrossings(points, edges, edgeBounds)

  // 2. find t-junctions
  var vertBounds = boundPoints(points)
  var tjunctions = getTJunctions(points, edges, edgeBounds, vertBounds)

  // 3. cut edges, construct rational points
  var ratPoints  = cutEdges(points, edges, crossings, tjunctions, useColor)

  // 4. dedupe verts
  var labels     = dedupPoints(points, ratPoints, vertBounds)

  // 6. dedupe edges
  dedupEdges(edges, labels, useColor)

  // 5. check termination
  if(!labels) {
    return (crossings.length > 0 || tjunctions.length > 0)
  }

  // More iterations necessary
  return true
}

//Main loop, runs PSLG clean up until completion
function cleanPSLG(points, edges, colors) {
  var modified = false

  //If using colors, augment edges with color data
  var prevEdges
  if(colors) {
    prevEdges = edges
    var augEdges = new Array(edges.length)
    for(var i=0; i<edges.length; ++i) {
      var e = edges[i]
      augEdges[i] = [e[0], e[1], colors[i]]
    }
    edges = augEdges
  }

  //Run snap rounding until convergence
  while(snapRound(points, edges, !!colors)) {
    modified = true
  }

  //Strip color tags
  if(!!colors && modified) {
    prevEdges.length = 0
    colors.length = 0
    for(var i=0; i<edges.length; ++i) {
      var e = edges[i]
      prevEdges.push([e[0], e[1]])
      colors.push(e[2])
    }
  }

  return modified
}

},{"./lib/rat-seg-intersect":46,"big-rat":14,"big-rat/cmp":12,"big-rat/to-float":27,"box-intersect":31,"compare-cell":47,"nextafter":306,"rat-vec":319,"robust-segment-intersect":326,"union-find":366}],46:[function(require,module,exports){
'use strict'

//TODO: Move this to a separate module

module.exports = solveIntersection

var ratMul = require('big-rat/mul')
var ratDiv = require('big-rat/div')
var ratSub = require('big-rat/sub')
var ratSign = require('big-rat/sign')
var rvSub = require('rat-vec/sub')
var rvAdd = require('rat-vec/add')
var rvMuls = require('rat-vec/muls')

var toFloat = require('big-rat/to-float')

function ratPerp(a, b) {
  return ratSub(ratMul(a[0], b[1]), ratMul(a[1], b[0]))
}

//Solve for intersection
//  x = a + t (b-a)
//  (x - c) ^ (d-c) = 0
//  (t * (b-a) + (a-c) ) ^ (d-c) = 0
//  t * (b-a)^(d-c) = (d-c)^(a-c)
//  t = (d-c)^(a-c) / (b-a)^(d-c)

function solveIntersection(a, b, c, d) {
  var ba = rvSub(b, a)
  var dc = rvSub(d, c)

  var baXdc = ratPerp(ba, dc)

  if(ratSign(baXdc) === 0) {
    return null
  }

  var ac = rvSub(a, c)
  var dcXac = ratPerp(dc, ac)

  var t = ratDiv(dcXac, baXdc)

  return rvAdd(a, rvMuls(ba, t))
}

},{"big-rat/div":13,"big-rat/mul":23,"big-rat/sign":25,"big-rat/sub":26,"big-rat/to-float":27,"rat-vec/add":318,"rat-vec/muls":320,"rat-vec/sub":321}],47:[function(require,module,exports){
module.exports = compareCells

var min = Math.min

function compareInt(a, b) {
  return a - b
}

function compareCells(a, b) {
  var n = a.length
    , t = a.length - b.length
  if(t) {
    return t
  }
  switch(n) {
    case 0:
      return 0
    case 1:
      return a[0] - b[0]
    case 2:
      return (a[0]+a[1]-b[0]-b[1]) ||
             min(a[0],a[1]) - min(b[0],b[1])
    case 3:
      var l1 = a[0]+a[1]
        , m1 = b[0]+b[1]
      t = l1+a[2] - (m1+b[2])
      if(t) {
        return t
      }
      var l0 = min(a[0], a[1])
        , m0 = min(b[0], b[1])
      return min(l0, a[2]) - min(m0, b[2]) ||
             min(l0+a[2], l1) - min(m0+b[2], m1)
    case 4:
      var aw=a[0], ax=a[1], ay=a[2], az=a[3]
        , bw=b[0], bx=b[1], by=b[2], bz=b[3]
      return (aw+ax+ay+az)-(bw+bx+by+bz) ||
             min(aw,ax,ay,az)-min(bw,bx,by,bz,bw) ||
             min(aw+ax,aw+ay,aw+az,ax+ay,ax+az,ay+az) -
               min(bw+bx,bw+by,bw+bz,bx+by,bx+bz,by+bz) ||
             min(aw+ax+ay,aw+ax+az,aw+ay+az,ax+ay+az) -
               min(bw+bx+by,bw+bx+bz,bw+by+bz,bx+by+bz)
    default:
      var as = a.slice().sort(compareInt)
      var bs = b.slice().sort(compareInt)
      for(var i=0; i<n; ++i) {
        t = as[i] - bs[i]
        if(t) {
          return t
        }
      }
      return 0
  }
}

},{}],48:[function(require,module,exports){
module.exports = function(it){
  if(typeof it != 'function')throw TypeError(it + ' is not a function!');
  return it;
};
},{}],49:[function(require,module,exports){
// 22.1.3.31 Array.prototype[@@unscopables]
var UNSCOPABLES = require('./$.wks')('unscopables')
  , ArrayProto  = Array.prototype;
if(ArrayProto[UNSCOPABLES] == undefined)require('./$.hide')(ArrayProto, UNSCOPABLES, {});
module.exports = function(key){
  ArrayProto[UNSCOPABLES][key] = true;
};
},{"./$.hide":77,"./$.wks":129}],50:[function(require,module,exports){
var isObject = require('./$.is-object');
module.exports = function(it){
  if(!isObject(it))throw TypeError(it + ' is not an object!');
  return it;
};
},{"./$.is-object":84}],51:[function(require,module,exports){
// 22.1.3.3 Array.prototype.copyWithin(target, start, end = this.length)
'use strict';
var toObject = require('./$.to-object')
  , toIndex  = require('./$.to-index')
  , toLength = require('./$.to-length');

module.exports = [].copyWithin || function copyWithin(target/*= 0*/, start/*= 0, end = @length*/){
  var O     = toObject(this)
    , len   = toLength(O.length)
    , to    = toIndex(target, len)
    , from  = toIndex(start, len)
    , $$    = arguments
    , end   = $$.length > 2 ? $$[2] : undefined
    , count = Math.min((end === undefined ? len : toIndex(end, len)) - from, len - to)
    , inc   = 1;
  if(from < to && to < from + count){
    inc  = -1;
    from += count - 1;
    to   += count - 1;
  }
  while(count-- > 0){
    if(from in O)O[to] = O[from];
    else delete O[to];
    to   += inc;
    from += inc;
  } return O;
};
},{"./$.to-index":122,"./$.to-length":125,"./$.to-object":126}],52:[function(require,module,exports){
// 22.1.3.6 Array.prototype.fill(value, start = 0, end = this.length)
'use strict';
var toObject = require('./$.to-object')
  , toIndex  = require('./$.to-index')
  , toLength = require('./$.to-length');
module.exports = [].fill || function fill(value /*, start = 0, end = @length */){
  var O      = toObject(this)
    , length = toLength(O.length)
    , $$     = arguments
    , $$len  = $$.length
    , index  = toIndex($$len > 1 ? $$[1] : undefined, length)
    , end    = $$len > 2 ? $$[2] : undefined
    , endPos = end === undefined ? length : toIndex(end, length);
  while(endPos > index)O[index++] = value;
  return O;
};
},{"./$.to-index":122,"./$.to-length":125,"./$.to-object":126}],53:[function(require,module,exports){
// false -> Array#indexOf
// true  -> Array#includes
var toIObject = require('./$.to-iobject')
  , toLength  = require('./$.to-length')
  , toIndex   = require('./$.to-index');
module.exports = function(IS_INCLUDES){
  return function($this, el, fromIndex){
    var O      = toIObject($this)
      , length = toLength(O.length)
      , index  = toIndex(fromIndex, length)
      , value;
    // Array#includes uses SameValueZero equality algorithm
    if(IS_INCLUDES && el != el)while(length > index){
      value = O[index++];
      if(value != value)return true;
    // Array#toIndex ignores holes, Array#includes - not
    } else for(;length > index; index++)if(IS_INCLUDES || index in O){
      if(O[index] === el)return IS_INCLUDES || index;
    } return !IS_INCLUDES && -1;
  };
};
},{"./$.to-index":122,"./$.to-iobject":124,"./$.to-length":125}],54:[function(require,module,exports){
// 0 -> Array#forEach
// 1 -> Array#map
// 2 -> Array#filter
// 3 -> Array#some
// 4 -> Array#every
// 5 -> Array#find
// 6 -> Array#findIndex
var ctx      = require('./$.ctx')
  , IObject  = require('./$.iobject')
  , toObject = require('./$.to-object')
  , toLength = require('./$.to-length')
  , asc      = require('./$.array-species-create');
module.exports = function(TYPE){
  var IS_MAP        = TYPE == 1
    , IS_FILTER     = TYPE == 2
    , IS_SOME       = TYPE == 3
    , IS_EVERY      = TYPE == 4
    , IS_FIND_INDEX = TYPE == 6
    , NO_HOLES      = TYPE == 5 || IS_FIND_INDEX;
  return function($this, callbackfn, that){
    var O      = toObject($this)
      , self   = IObject(O)
      , f      = ctx(callbackfn, that, 3)
      , length = toLength(self.length)
      , index  = 0
      , result = IS_MAP ? asc($this, length) : IS_FILTER ? asc($this, 0) : undefined
      , val, res;
    for(;length > index; index++)if(NO_HOLES || index in self){
      val = self[index];
      res = f(val, index, O);
      if(TYPE){
        if(IS_MAP)result[index] = res;            // map
        else if(res)switch(TYPE){
          case 3: return true;                    // some
          case 5: return val;                     // find
          case 6: return index;                   // findIndex
          case 2: result.push(val);               // filter
        } else if(IS_EVERY)return false;          // every
      }
    }
    return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : result;
  };
};
},{"./$.array-species-create":55,"./$.ctx":63,"./$.iobject":80,"./$.to-length":125,"./$.to-object":126}],55:[function(require,module,exports){
// 9.4.2.3 ArraySpeciesCreate(originalArray, length)
var isObject = require('./$.is-object')
  , isArray  = require('./$.is-array')
  , SPECIES  = require('./$.wks')('species');
module.exports = function(original, length){
  var C;
  if(isArray(original)){
    C = original.constructor;
    // cross-realm fallback
    if(typeof C == 'function' && (C === Array || isArray(C.prototype)))C = undefined;
    if(isObject(C)){
      C = C[SPECIES];
      if(C === null)C = undefined;
    }
  } return new (C === undefined ? Array : C)(length);
};
},{"./$.is-array":82,"./$.is-object":84,"./$.wks":129}],56:[function(require,module,exports){
// getting tag from 19.1.3.6 Object.prototype.toString()
var cof = require('./$.cof')
  , TAG = require('./$.wks')('toStringTag')
  // ES3 wrong here
  , ARG = cof(function(){ return arguments; }()) == 'Arguments';

module.exports = function(it){
  var O, T, B;
  return it === undefined ? 'Undefined' : it === null ? 'Null'
    // @@toStringTag case
    : typeof (T = (O = Object(it))[TAG]) == 'string' ? T
    // builtinTag case
    : ARG ? cof(O)
    // ES3 arguments fallback
    : (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
};
},{"./$.cof":57,"./$.wks":129}],57:[function(require,module,exports){
var toString = {}.toString;

module.exports = function(it){
  return toString.call(it).slice(8, -1);
};
},{}],58:[function(require,module,exports){
'use strict';
var $            = require('./$')
  , hide         = require('./$.hide')
  , redefineAll  = require('./$.redefine-all')
  , ctx          = require('./$.ctx')
  , strictNew    = require('./$.strict-new')
  , defined      = require('./$.defined')
  , forOf        = require('./$.for-of')
  , $iterDefine  = require('./$.iter-define')
  , step         = require('./$.iter-step')
  , ID           = require('./$.uid')('id')
  , $has         = require('./$.has')
  , isObject     = require('./$.is-object')
  , setSpecies   = require('./$.set-species')
  , DESCRIPTORS  = require('./$.descriptors')
  , isExtensible = Object.isExtensible || isObject
  , SIZE         = DESCRIPTORS ? '_s' : 'size'
  , id           = 0;

var fastKey = function(it, create){
  // return primitive with prefix
  if(!isObject(it))return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
  if(!$has(it, ID)){
    // can't set id to frozen object
    if(!isExtensible(it))return 'F';
    // not necessary to add id
    if(!create)return 'E';
    // add missing object id
    hide(it, ID, ++id);
  // return object id with prefix
  } return 'O' + it[ID];
};

var getEntry = function(that, key){
  // fast case
  var index = fastKey(key), entry;
  if(index !== 'F')return that._i[index];
  // frozen object case
  for(entry = that._f; entry; entry = entry.n){
    if(entry.k == key)return entry;
  }
};

module.exports = {
  getConstructor: function(wrapper, NAME, IS_MAP, ADDER){
    var C = wrapper(function(that, iterable){
      strictNew(that, C, NAME);
      that._i = $.create(null); // index
      that._f = undefined;      // first entry
      that._l = undefined;      // last entry
      that[SIZE] = 0;           // size
      if(iterable != undefined)forOf(iterable, IS_MAP, that[ADDER], that);
    });
    redefineAll(C.prototype, {
      // 23.1.3.1 Map.prototype.clear()
      // 23.2.3.2 Set.prototype.clear()
      clear: function clear(){
        for(var that = this, data = that._i, entry = that._f; entry; entry = entry.n){
          entry.r = true;
          if(entry.p)entry.p = entry.p.n = undefined;
          delete data[entry.i];
        }
        that._f = that._l = undefined;
        that[SIZE] = 0;
      },
      // 23.1.3.3 Map.prototype.delete(key)
      // 23.2.3.4 Set.prototype.delete(value)
      'delete': function(key){
        var that  = this
          , entry = getEntry(that, key);
        if(entry){
          var next = entry.n
            , prev = entry.p;
          delete that._i[entry.i];
          entry.r = true;
          if(prev)prev.n = next;
          if(next)next.p = prev;
          if(that._f == entry)that._f = next;
          if(that._l == entry)that._l = prev;
          that[SIZE]--;
        } return !!entry;
      },
      // 23.2.3.6 Set.prototype.forEach(callbackfn, thisArg = undefined)
      // 23.1.3.5 Map.prototype.forEach(callbackfn, thisArg = undefined)
      forEach: function forEach(callbackfn /*, that = undefined */){
        var f = ctx(callbackfn, arguments.length > 1 ? arguments[1] : undefined, 3)
          , entry;
        while(entry = entry ? entry.n : this._f){
          f(entry.v, entry.k, this);
          // revert to the last existing entry
          while(entry && entry.r)entry = entry.p;
        }
      },
      // 23.1.3.7 Map.prototype.has(key)
      // 23.2.3.7 Set.prototype.has(value)
      has: function has(key){
        return !!getEntry(this, key);
      }
    });
    if(DESCRIPTORS)$.setDesc(C.prototype, 'size', {
      get: function(){
        return defined(this[SIZE]);
      }
    });
    return C;
  },
  def: function(that, key, value){
    var entry = getEntry(that, key)
      , prev, index;
    // change existing entry
    if(entry){
      entry.v = value;
    // create new entry
    } else {
      that._l = entry = {
        i: index = fastKey(key, true), // <- index
        k: key,                        // <- key
        v: value,                      // <- value
        p: prev = that._l,             // <- previous entry
        n: undefined,                  // <- next entry
        r: false                       // <- removed
      };
      if(!that._f)that._f = entry;
      if(prev)prev.n = entry;
      that[SIZE]++;
      // add to index
      if(index !== 'F')that._i[index] = entry;
    } return that;
  },
  getEntry: getEntry,
  setStrong: function(C, NAME, IS_MAP){
    // add .keys, .values, .entries, [@@iterator]
    // 23.1.3.4, 23.1.3.8, 23.1.3.11, 23.1.3.12, 23.2.3.5, 23.2.3.8, 23.2.3.10, 23.2.3.11
    $iterDefine(C, NAME, function(iterated, kind){
      this._t = iterated;  // target
      this._k = kind;      // kind
      this._l = undefined; // previous
    }, function(){
      var that  = this
        , kind  = that._k
        , entry = that._l;
      // revert to the last existing entry
      while(entry && entry.r)entry = entry.p;
      // get next entry
      if(!that._t || !(that._l = entry = entry ? entry.n : that._t._f)){
        // or finish the iteration
        that._t = undefined;
        return step(1);
      }
      // return step by kind
      if(kind == 'keys'  )return step(0, entry.k);
      if(kind == 'values')return step(0, entry.v);
      return step(0, [entry.k, entry.v]);
    }, IS_MAP ? 'entries' : 'values' , !IS_MAP, true);

    // add [@@species], 23.1.2.2, 23.2.2.2
    setSpecies(NAME);
  }
};
},{"./$":92,"./$.ctx":63,"./$.defined":64,"./$.descriptors":65,"./$.for-of":73,"./$.has":76,"./$.hide":77,"./$.is-object":84,"./$.iter-define":88,"./$.iter-step":90,"./$.redefine-all":106,"./$.set-species":111,"./$.strict-new":115,"./$.uid":128}],59:[function(require,module,exports){
// https://github.com/DavidBruant/Map-Set.prototype.toJSON
var forOf   = require('./$.for-of')
  , classof = require('./$.classof');
module.exports = function(NAME){
  return function toJSON(){
    if(classof(this) != NAME)throw TypeError(NAME + "#toJSON isn't generic");
    var arr = [];
    forOf(this, false, arr.push, arr);
    return arr;
  };
};
},{"./$.classof":56,"./$.for-of":73}],60:[function(require,module,exports){
'use strict';
var hide              = require('./$.hide')
  , redefineAll       = require('./$.redefine-all')
  , anObject          = require('./$.an-object')
  , isObject          = require('./$.is-object')
  , strictNew         = require('./$.strict-new')
  , forOf             = require('./$.for-of')
  , createArrayMethod = require('./$.array-methods')
  , $has              = require('./$.has')
  , WEAK              = require('./$.uid')('weak')
  , isExtensible      = Object.isExtensible || isObject
  , arrayFind         = createArrayMethod(5)
  , arrayFindIndex    = createArrayMethod(6)
  , id                = 0;

// fallback for frozen keys
var frozenStore = function(that){
  return that._l || (that._l = new FrozenStore);
};
var FrozenStore = function(){
  this.a = [];
};
var findFrozen = function(store, key){
  return arrayFind(store.a, function(it){
    return it[0] === key;
  });
};
FrozenStore.prototype = {
  get: function(key){
    var entry = findFrozen(this, key);
    if(entry)return entry[1];
  },
  has: function(key){
    return !!findFrozen(this, key);
  },
  set: function(key, value){
    var entry = findFrozen(this, key);
    if(entry)entry[1] = value;
    else this.a.push([key, value]);
  },
  'delete': function(key){
    var index = arrayFindIndex(this.a, function(it){
      return it[0] === key;
    });
    if(~index)this.a.splice(index, 1);
    return !!~index;
  }
};

module.exports = {
  getConstructor: function(wrapper, NAME, IS_MAP, ADDER){
    var C = wrapper(function(that, iterable){
      strictNew(that, C, NAME);
      that._i = id++;      // collection id
      that._l = undefined; // leak store for frozen objects
      if(iterable != undefined)forOf(iterable, IS_MAP, that[ADDER], that);
    });
    redefineAll(C.prototype, {
      // 23.3.3.2 WeakMap.prototype.delete(key)
      // 23.4.3.3 WeakSet.prototype.delete(value)
      'delete': function(key){
        if(!isObject(key))return false;
        if(!isExtensible(key))return frozenStore(this)['delete'](key);
        return $has(key, WEAK) && $has(key[WEAK], this._i) && delete key[WEAK][this._i];
      },
      // 23.3.3.4 WeakMap.prototype.has(key)
      // 23.4.3.4 WeakSet.prototype.has(value)
      has: function has(key){
        if(!isObject(key))return false;
        if(!isExtensible(key))return frozenStore(this).has(key);
        return $has(key, WEAK) && $has(key[WEAK], this._i);
      }
    });
    return C;
  },
  def: function(that, key, value){
    if(!isExtensible(anObject(key))){
      frozenStore(that).set(key, value);
    } else {
      $has(key, WEAK) || hide(key, WEAK, {});
      key[WEAK][that._i] = value;
    } return that;
  },
  frozenStore: frozenStore,
  WEAK: WEAK
};
},{"./$.an-object":50,"./$.array-methods":54,"./$.for-of":73,"./$.has":76,"./$.hide":77,"./$.is-object":84,"./$.redefine-all":106,"./$.strict-new":115,"./$.uid":128}],61:[function(require,module,exports){
'use strict';
var global         = require('./$.global')
  , $export        = require('./$.export')
  , redefine       = require('./$.redefine')
  , redefineAll    = require('./$.redefine-all')
  , forOf          = require('./$.for-of')
  , strictNew      = require('./$.strict-new')
  , isObject       = require('./$.is-object')
  , fails          = require('./$.fails')
  , $iterDetect    = require('./$.iter-detect')
  , setToStringTag = require('./$.set-to-string-tag');

module.exports = function(NAME, wrapper, methods, common, IS_MAP, IS_WEAK){
  var Base  = global[NAME]
    , C     = Base
    , ADDER = IS_MAP ? 'set' : 'add'
    , proto = C && C.prototype
    , O     = {};
  var fixMethod = function(KEY){
    var fn = proto[KEY];
    redefine(proto, KEY,
      KEY == 'delete' ? function(a){
        return IS_WEAK && !isObject(a) ? false : fn.call(this, a === 0 ? 0 : a);
      } : KEY == 'has' ? function has(a){
        return IS_WEAK && !isObject(a) ? false : fn.call(this, a === 0 ? 0 : a);
      } : KEY == 'get' ? function get(a){
        return IS_WEAK && !isObject(a) ? undefined : fn.call(this, a === 0 ? 0 : a);
      } : KEY == 'add' ? function add(a){ fn.call(this, a === 0 ? 0 : a); return this; }
        : function set(a, b){ fn.call(this, a === 0 ? 0 : a, b); return this; }
    );
  };
  if(typeof C != 'function' || !(IS_WEAK || proto.forEach && !fails(function(){
    new C().entries().next();
  }))){
    // create collection constructor
    C = common.getConstructor(wrapper, NAME, IS_MAP, ADDER);
    redefineAll(C.prototype, methods);
  } else {
    var instance             = new C
      // early implementations not supports chaining
      , HASNT_CHAINING       = instance[ADDER](IS_WEAK ? {} : -0, 1) != instance
      // V8 ~  Chromium 40- weak-collections throws on primitives, but should return false
      , THROWS_ON_PRIMITIVES = fails(function(){ instance.has(1); })
      // most early implementations doesn't supports iterables, most modern - not close it correctly
      , ACCEPT_ITERABLES     = $iterDetect(function(iter){ new C(iter); }) // eslint-disable-line no-new
      // for early implementations -0 and +0 not the same
      , BUGGY_ZERO;
    if(!ACCEPT_ITERABLES){ 
      C = wrapper(function(target, iterable){
        strictNew(target, C, NAME);
        var that = new Base;
        if(iterable != undefined)forOf(iterable, IS_MAP, that[ADDER], that);
        return that;
      });
      C.prototype = proto;
      proto.constructor = C;
    }
    IS_WEAK || instance.forEach(function(val, key){
      BUGGY_ZERO = 1 / key === -Infinity;
    });
    if(THROWS_ON_PRIMITIVES || BUGGY_ZERO){
      fixMethod('delete');
      fixMethod('has');
      IS_MAP && fixMethod('get');
    }
    if(BUGGY_ZERO || HASNT_CHAINING)fixMethod(ADDER);
    // weak collections should not contains .clear method
    if(IS_WEAK && proto.clear)delete proto.clear;
  }

  setToStringTag(C, NAME);

  O[NAME] = C;
  $export($export.G + $export.W + $export.F * (C != Base), O);

  if(!IS_WEAK)common.setStrong(C, NAME, IS_MAP);

  return C;
};
},{"./$.export":68,"./$.fails":70,"./$.for-of":73,"./$.global":75,"./$.is-object":84,"./$.iter-detect":89,"./$.redefine":107,"./$.redefine-all":106,"./$.set-to-string-tag":112,"./$.strict-new":115}],62:[function(require,module,exports){
var core = module.exports = {version: '1.2.6'};
if(typeof __e == 'number')__e = core; // eslint-disable-line no-undef
},{}],63:[function(require,module,exports){
// optional / simple context binding
var aFunction = require('./$.a-function');
module.exports = function(fn, that, length){
  aFunction(fn);
  if(that === undefined)return fn;
  switch(length){
    case 1: return function(a){
      return fn.call(that, a);
    };
    case 2: return function(a, b){
      return fn.call(that, a, b);
    };
    case 3: return function(a, b, c){
      return fn.call(that, a, b, c);
    };
  }
  return function(/* ...args */){
    return fn.apply(that, arguments);
  };
};
},{"./$.a-function":48}],64:[function(require,module,exports){
// 7.2.1 RequireObjectCoercible(argument)
module.exports = function(it){
  if(it == undefined)throw TypeError("Can't call method on  " + it);
  return it;
};
},{}],65:[function(require,module,exports){
// Thank's IE8 for his funny defineProperty
module.exports = !require('./$.fails')(function(){
  return Object.defineProperty({}, 'a', {get: function(){ return 7; }}).a != 7;
});
},{"./$.fails":70}],66:[function(require,module,exports){
var isObject = require('./$.is-object')
  , document = require('./$.global').document
  // in old IE typeof document.createElement is 'object'
  , is = isObject(document) && isObject(document.createElement);
module.exports = function(it){
  return is ? document.createElement(it) : {};
};
},{"./$.global":75,"./$.is-object":84}],67:[function(require,module,exports){
// all enumerable object keys, includes symbols
var $ = require('./$');
module.exports = function(it){
  var keys       = $.getKeys(it)
    , getSymbols = $.getSymbols;
  if(getSymbols){
    var symbols = getSymbols(it)
      , isEnum  = $.isEnum
      , i       = 0
      , key;
    while(symbols.length > i)if(isEnum.call(it, key = symbols[i++]))keys.push(key);
  }
  return keys;
};
},{"./$":92}],68:[function(require,module,exports){
var global    = require('./$.global')
  , core      = require('./$.core')
  , hide      = require('./$.hide')
  , redefine  = require('./$.redefine')
  , ctx       = require('./$.ctx')
  , PROTOTYPE = 'prototype';

var $export = function(type, name, source){
  var IS_FORCED = type & $export.F
    , IS_GLOBAL = type & $export.G
    , IS_STATIC = type & $export.S
    , IS_PROTO  = type & $export.P
    , IS_BIND   = type & $export.B
    , target    = IS_GLOBAL ? global : IS_STATIC ? global[name] || (global[name] = {}) : (global[name] || {})[PROTOTYPE]
    , exports   = IS_GLOBAL ? core : core[name] || (core[name] = {})
    , expProto  = exports[PROTOTYPE] || (exports[PROTOTYPE] = {})
    , key, own, out, exp;
  if(IS_GLOBAL)source = name;
  for(key in source){
    // contains in native
    own = !IS_FORCED && target && key in target;
    // export native or passed
    out = (own ? target : source)[key];
    // bind timers to global for call from export context
    exp = IS_BIND && own ? ctx(out, global) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
    // extend global
    if(target && !own)redefine(target, key, out);
    // export
    if(exports[key] != out)hide(exports, key, exp);
    if(IS_PROTO && expProto[key] != out)expProto[key] = out;
  }
};
global.core = core;
// type bitmap
$export.F = 1;  // forced
$export.G = 2;  // global
$export.S = 4;  // static
$export.P = 8;  // proto
$export.B = 16; // bind
$export.W = 32; // wrap
module.exports = $export;
},{"./$.core":62,"./$.ctx":63,"./$.global":75,"./$.hide":77,"./$.redefine":107}],69:[function(require,module,exports){
var MATCH = require('./$.wks')('match');
module.exports = function(KEY){
  var re = /./;
  try {
    '/./'[KEY](re);
  } catch(e){
    try {
      re[MATCH] = false;
      return !'/./'[KEY](re);
    } catch(f){ /* empty */ }
  } return true;
};
},{"./$.wks":129}],70:[function(require,module,exports){
module.exports = function(exec){
  try {
    return !!exec();
  } catch(e){
    return true;
  }
};
},{}],71:[function(require,module,exports){
'use strict';
var hide     = require('./$.hide')
  , redefine = require('./$.redefine')
  , fails    = require('./$.fails')
  , defined  = require('./$.defined')
  , wks      = require('./$.wks');

module.exports = function(KEY, length, exec){
  var SYMBOL   = wks(KEY)
    , original = ''[KEY];
  if(fails(function(){
    var O = {};
    O[SYMBOL] = function(){ return 7; };
    return ''[KEY](O) != 7;
  })){
    redefine(String.prototype, KEY, exec(defined, SYMBOL, original));
    hide(RegExp.prototype, SYMBOL, length == 2
      // 21.2.5.8 RegExp.prototype[@@replace](string, replaceValue)
      // 21.2.5.11 RegExp.prototype[@@split](string, limit)
      ? function(string, arg){ return original.call(string, this, arg); }
      // 21.2.5.6 RegExp.prototype[@@match](string)
      // 21.2.5.9 RegExp.prototype[@@search](string)
      : function(string){ return original.call(string, this); }
    );
  }
};
},{"./$.defined":64,"./$.fails":70,"./$.hide":77,"./$.redefine":107,"./$.wks":129}],72:[function(require,module,exports){
'use strict';
// 21.2.5.3 get RegExp.prototype.flags
var anObject = require('./$.an-object');
module.exports = function(){
  var that   = anObject(this)
    , result = '';
  if(that.global)     result += 'g';
  if(that.ignoreCase) result += 'i';
  if(that.multiline)  result += 'm';
  if(that.unicode)    result += 'u';
  if(that.sticky)     result += 'y';
  return result;
};
},{"./$.an-object":50}],73:[function(require,module,exports){
var ctx         = require('./$.ctx')
  , call        = require('./$.iter-call')
  , isArrayIter = require('./$.is-array-iter')
  , anObject    = require('./$.an-object')
  , toLength    = require('./$.to-length')
  , getIterFn   = require('./core.get-iterator-method');
module.exports = function(iterable, entries, fn, that){
  var iterFn = getIterFn(iterable)
    , f      = ctx(fn, that, entries ? 2 : 1)
    , index  = 0
    , length, step, iterator;
  if(typeof iterFn != 'function')throw TypeError(iterable + ' is not iterable!');
  // fast case for arrays with default iterator
  if(isArrayIter(iterFn))for(length = toLength(iterable.length); length > index; index++){
    entries ? f(anObject(step = iterable[index])[0], step[1]) : f(iterable[index]);
  } else for(iterator = iterFn.call(iterable); !(step = iterator.next()).done; ){
    call(iterator, f, step.value, entries);
  }
};
},{"./$.an-object":50,"./$.ctx":63,"./$.is-array-iter":81,"./$.iter-call":86,"./$.to-length":125,"./core.get-iterator-method":130}],74:[function(require,module,exports){
// fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
var toIObject = require('./$.to-iobject')
  , getNames  = require('./$').getNames
  , toString  = {}.toString;

var windowNames = typeof window == 'object' && Object.getOwnPropertyNames
  ? Object.getOwnPropertyNames(window) : [];

var getWindowNames = function(it){
  try {
    return getNames(it);
  } catch(e){
    return windowNames.slice();
  }
};

module.exports.get = function getOwnPropertyNames(it){
  if(windowNames && toString.call(it) == '[object Window]')return getWindowNames(it);
  return getNames(toIObject(it));
};
},{"./$":92,"./$.to-iobject":124}],75:[function(require,module,exports){
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
if(typeof __g == 'number')__g = global; // eslint-disable-line no-undef
},{}],76:[function(require,module,exports){
var hasOwnProperty = {}.hasOwnProperty;
module.exports = function(it, key){
  return hasOwnProperty.call(it, key);
};
},{}],77:[function(require,module,exports){
var $          = require('./$')
  , createDesc = require('./$.property-desc');
module.exports = require('./$.descriptors') ? function(object, key, value){
  return $.setDesc(object, key, createDesc(1, value));
} : function(object, key, value){
  object[key] = value;
  return object;
};
},{"./$":92,"./$.descriptors":65,"./$.property-desc":105}],78:[function(require,module,exports){
module.exports = require('./$.global').document && document.documentElement;
},{"./$.global":75}],79:[function(require,module,exports){
// fast apply, http://jsperf.lnkit.com/fast-apply/5
module.exports = function(fn, args, that){
  var un = that === undefined;
  switch(args.length){
    case 0: return un ? fn()
                      : fn.call(that);
    case 1: return un ? fn(args[0])
                      : fn.call(that, args[0]);
    case 2: return un ? fn(args[0], args[1])
                      : fn.call(that, args[0], args[1]);
    case 3: return un ? fn(args[0], args[1], args[2])
                      : fn.call(that, args[0], args[1], args[2]);
    case 4: return un ? fn(args[0], args[1], args[2], args[3])
                      : fn.call(that, args[0], args[1], args[2], args[3]);
  } return              fn.apply(that, args);
};
},{}],80:[function(require,module,exports){
// fallback for non-array-like ES3 and non-enumerable old V8 strings
var cof = require('./$.cof');
module.exports = Object('z').propertyIsEnumerable(0) ? Object : function(it){
  return cof(it) == 'String' ? it.split('') : Object(it);
};
},{"./$.cof":57}],81:[function(require,module,exports){
// check on default Array iterator
var Iterators  = require('./$.iterators')
  , ITERATOR   = require('./$.wks')('iterator')
  , ArrayProto = Array.prototype;

module.exports = function(it){
  return it !== undefined && (Iterators.Array === it || ArrayProto[ITERATOR] === it);
};
},{"./$.iterators":91,"./$.wks":129}],82:[function(require,module,exports){
// 7.2.2 IsArray(argument)
var cof = require('./$.cof');
module.exports = Array.isArray || function(arg){
  return cof(arg) == 'Array';
};
},{"./$.cof":57}],83:[function(require,module,exports){
// 20.1.2.3 Number.isInteger(number)
var isObject = require('./$.is-object')
  , floor    = Math.floor;
module.exports = function isInteger(it){
  return !isObject(it) && isFinite(it) && floor(it) === it;
};
},{"./$.is-object":84}],84:[function(require,module,exports){
module.exports = function(it){
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};
},{}],85:[function(require,module,exports){
// 7.2.8 IsRegExp(argument)
var isObject = require('./$.is-object')
  , cof      = require('./$.cof')
  , MATCH    = require('./$.wks')('match');
module.exports = function(it){
  var isRegExp;
  return isObject(it) && ((isRegExp = it[MATCH]) !== undefined ? !!isRegExp : cof(it) == 'RegExp');
};
},{"./$.cof":57,"./$.is-object":84,"./$.wks":129}],86:[function(require,module,exports){
// call something on iterator step with safe closing on error
var anObject = require('./$.an-object');
module.exports = function(iterator, fn, value, entries){
  try {
    return entries ? fn(anObject(value)[0], value[1]) : fn(value);
  // 7.4.6 IteratorClose(iterator, completion)
  } catch(e){
    var ret = iterator['return'];
    if(ret !== undefined)anObject(ret.call(iterator));
    throw e;
  }
};
},{"./$.an-object":50}],87:[function(require,module,exports){
'use strict';
var $              = require('./$')
  , descriptor     = require('./$.property-desc')
  , setToStringTag = require('./$.set-to-string-tag')
  , IteratorPrototype = {};

// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
require('./$.hide')(IteratorPrototype, require('./$.wks')('iterator'), function(){ return this; });

module.exports = function(Constructor, NAME, next){
  Constructor.prototype = $.create(IteratorPrototype, {next: descriptor(1, next)});
  setToStringTag(Constructor, NAME + ' Iterator');
};
},{"./$":92,"./$.hide":77,"./$.property-desc":105,"./$.set-to-string-tag":112,"./$.wks":129}],88:[function(require,module,exports){
'use strict';
var LIBRARY        = require('./$.library')
  , $export        = require('./$.export')
  , redefine       = require('./$.redefine')
  , hide           = require('./$.hide')
  , has            = require('./$.has')
  , Iterators      = require('./$.iterators')
  , $iterCreate    = require('./$.iter-create')
  , setToStringTag = require('./$.set-to-string-tag')
  , getProto       = require('./$').getProto
  , ITERATOR       = require('./$.wks')('iterator')
  , BUGGY          = !([].keys && 'next' in [].keys()) // Safari has buggy iterators w/o `next`
  , FF_ITERATOR    = '@@iterator'
  , KEYS           = 'keys'
  , VALUES         = 'values';

var returnThis = function(){ return this; };

module.exports = function(Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED){
  $iterCreate(Constructor, NAME, next);
  var getMethod = function(kind){
    if(!BUGGY && kind in proto)return proto[kind];
    switch(kind){
      case KEYS: return function keys(){ return new Constructor(this, kind); };
      case VALUES: return function values(){ return new Constructor(this, kind); };
    } return function entries(){ return new Constructor(this, kind); };
  };
  var TAG        = NAME + ' Iterator'
    , DEF_VALUES = DEFAULT == VALUES
    , VALUES_BUG = false
    , proto      = Base.prototype
    , $native    = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT]
    , $default   = $native || getMethod(DEFAULT)
    , methods, key;
  // Fix native
  if($native){
    var IteratorPrototype = getProto($default.call(new Base));
    // Set @@toStringTag to native iterators
    setToStringTag(IteratorPrototype, TAG, true);
    // FF fix
    if(!LIBRARY && has(proto, FF_ITERATOR))hide(IteratorPrototype, ITERATOR, returnThis);
    // fix Array#{values, @@iterator}.name in V8 / FF
    if(DEF_VALUES && $native.name !== VALUES){
      VALUES_BUG = true;
      $default = function values(){ return $native.call(this); };
    }
  }
  // Define iterator
  if((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])){
    hide(proto, ITERATOR, $default);
  }
  // Plug for library
  Iterators[NAME] = $default;
  Iterators[TAG]  = returnThis;
  if(DEFAULT){
    methods = {
      values:  DEF_VALUES  ? $default : getMethod(VALUES),
      keys:    IS_SET      ? $default : getMethod(KEYS),
      entries: !DEF_VALUES ? $default : getMethod('entries')
    };
    if(FORCED)for(key in methods){
      if(!(key in proto))redefine(proto, key, methods[key]);
    } else $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
  }
  return methods;
};
},{"./$":92,"./$.export":68,"./$.has":76,"./$.hide":77,"./$.iter-create":87,"./$.iterators":91,"./$.library":94,"./$.redefine":107,"./$.set-to-string-tag":112,"./$.wks":129}],89:[function(require,module,exports){
var ITERATOR     = require('./$.wks')('iterator')
  , SAFE_CLOSING = false;

try {
  var riter = [7][ITERATOR]();
  riter['return'] = function(){ SAFE_CLOSING = true; };
  Array.from(riter, function(){ throw 2; });
} catch(e){ /* empty */ }

module.exports = function(exec, skipClosing){
  if(!skipClosing && !SAFE_CLOSING)return false;
  var safe = false;
  try {
    var arr  = [7]
      , iter = arr[ITERATOR]();
    iter.next = function(){ safe = true; };
    arr[ITERATOR] = function(){ return iter; };
    exec(arr);
  } catch(e){ /* empty */ }
  return safe;
};
},{"./$.wks":129}],90:[function(require,module,exports){
module.exports = function(done, value){
  return {value: value, done: !!done};
};
},{}],91:[function(require,module,exports){
module.exports = {};
},{}],92:[function(require,module,exports){
var $Object = Object;
module.exports = {
  create:     $Object.create,
  getProto:   $Object.getPrototypeOf,
  isEnum:     {}.propertyIsEnumerable,
  getDesc:    $Object.getOwnPropertyDescriptor,
  setDesc:    $Object.defineProperty,
  setDescs:   $Object.defineProperties,
  getKeys:    $Object.keys,
  getNames:   $Object.getOwnPropertyNames,
  getSymbols: $Object.getOwnPropertySymbols,
  each:       [].forEach
};
},{}],93:[function(require,module,exports){
var $         = require('./$')
  , toIObject = require('./$.to-iobject');
module.exports = function(object, el){
  var O      = toIObject(object)
    , keys   = $.getKeys(O)
    , length = keys.length
    , index  = 0
    , key;
  while(length > index)if(O[key = keys[index++]] === el)return key;
};
},{"./$":92,"./$.to-iobject":124}],94:[function(require,module,exports){
module.exports = false;
},{}],95:[function(require,module,exports){
// 20.2.2.14 Math.expm1(x)
module.exports = Math.expm1 || function expm1(x){
  return (x = +x) == 0 ? x : x > -1e-6 && x < 1e-6 ? x + x * x / 2 : Math.exp(x) - 1;
};
},{}],96:[function(require,module,exports){
// 20.2.2.20 Math.log1p(x)
module.exports = Math.log1p || function log1p(x){
  return (x = +x) > -1e-8 && x < 1e-8 ? x - x * x / 2 : Math.log(1 + x);
};
},{}],97:[function(require,module,exports){
// 20.2.2.28 Math.sign(x)
module.exports = Math.sign || function sign(x){
  return (x = +x) == 0 || x != x ? x : x < 0 ? -1 : 1;
};
},{}],98:[function(require,module,exports){
var global    = require('./$.global')
  , macrotask = require('./$.task').set
  , Observer  = global.MutationObserver || global.WebKitMutationObserver
  , process   = global.process
  , Promise   = global.Promise
  , isNode    = require('./$.cof')(process) == 'process'
  , head, last, notify;

var flush = function(){
  var parent, domain, fn;
  if(isNode && (parent = process.domain)){
    process.domain = null;
    parent.exit();
  }
  while(head){
    domain = head.domain;
    fn     = head.fn;
    if(domain)domain.enter();
    fn(); // <- currently we use it only for Promise - try / catch not required
    if(domain)domain.exit();
    head = head.next;
  } last = undefined;
  if(parent)parent.enter();
};

// Node.js
if(isNode){
  notify = function(){
    process.nextTick(flush);
  };
// browsers with MutationObserver
} else if(Observer){
  var toggle = 1
    , node   = document.createTextNode('');
  new Observer(flush).observe(node, {characterData: true}); // eslint-disable-line no-new
  notify = function(){
    node.data = toggle = -toggle;
  };
// environments with maybe non-completely correct, but existent Promise
} else if(Promise && Promise.resolve){
  notify = function(){
    Promise.resolve().then(flush);
  };
// for other environments - macrotask based on:
// - setImmediate
// - MessageChannel
// - window.postMessag
// - onreadystatechange
// - setTimeout
} else {
  notify = function(){
    // strange IE + webpack dev server bug - use .call(global)
    macrotask.call(global, flush);
  };
}

module.exports = function asap(fn){
  var task = {fn: fn, next: undefined, domain: isNode && process.domain};
  if(last)last.next = task;
  if(!head){
    head = task;
    notify();
  } last = task;
};
},{"./$.cof":57,"./$.global":75,"./$.task":121}],99:[function(require,module,exports){
// 19.1.2.1 Object.assign(target, source, ...)
var $        = require('./$')
  , toObject = require('./$.to-object')
  , IObject  = require('./$.iobject');

// should work with symbols and should have deterministic property order (V8 bug)
module.exports = require('./$.fails')(function(){
  var a = Object.assign
    , A = {}
    , B = {}
    , S = Symbol()
    , K = 'abcdefghijklmnopqrst';
  A[S] = 7;
  K.split('').forEach(function(k){ B[k] = k; });
  return a({}, A)[S] != 7 || Object.keys(a({}, B)).join('') != K;
}) ? function assign(target, source){ // eslint-disable-line no-unused-vars
  var T     = toObject(target)
    , $$    = arguments
    , $$len = $$.length
    , index = 1
    , getKeys    = $.getKeys
    , getSymbols = $.getSymbols
    , isEnum     = $.isEnum;
  while($$len > index){
    var S      = IObject($$[index++])
      , keys   = getSymbols ? getKeys(S).concat(getSymbols(S)) : getKeys(S)
      , length = keys.length
      , j      = 0
      , key;
    while(length > j)if(isEnum.call(S, key = keys[j++]))T[key] = S[key];
  }
  return T;
} : Object.assign;
},{"./$":92,"./$.fails":70,"./$.iobject":80,"./$.to-object":126}],100:[function(require,module,exports){
// most Object methods by ES6 should accept primitives
var $export = require('./$.export')
  , core    = require('./$.core')
  , fails   = require('./$.fails');
module.exports = function(KEY, exec){
  var fn  = (core.Object || {})[KEY] || Object[KEY]
    , exp = {};
  exp[KEY] = exec(fn);
  $export($export.S + $export.F * fails(function(){ fn(1); }), 'Object', exp);
};
},{"./$.core":62,"./$.export":68,"./$.fails":70}],101:[function(require,module,exports){
var $         = require('./$')
  , toIObject = require('./$.to-iobject')
  , isEnum    = $.isEnum;
module.exports = function(isEntries){
  return function(it){
    var O      = toIObject(it)
      , keys   = $.getKeys(O)
      , length = keys.length
      , i      = 0
      , result = []
      , key;
    while(length > i)if(isEnum.call(O, key = keys[i++])){
      result.push(isEntries ? [key, O[key]] : O[key]);
    } return result;
  };
};
},{"./$":92,"./$.to-iobject":124}],102:[function(require,module,exports){
// all object keys, includes non-enumerable and symbols
var $        = require('./$')
  , anObject = require('./$.an-object')
  , Reflect  = require('./$.global').Reflect;
module.exports = Reflect && Reflect.ownKeys || function ownKeys(it){
  var keys       = $.getNames(anObject(it))
    , getSymbols = $.getSymbols;
  return getSymbols ? keys.concat(getSymbols(it)) : keys;
};
},{"./$":92,"./$.an-object":50,"./$.global":75}],103:[function(require,module,exports){
'use strict';
var path      = require('./$.path')
  , invoke    = require('./$.invoke')
  , aFunction = require('./$.a-function');
module.exports = function(/* ...pargs */){
  var fn     = aFunction(this)
    , length = arguments.length
    , pargs  = Array(length)
    , i      = 0
    , _      = path._
    , holder = false;
  while(length > i)if((pargs[i] = arguments[i++]) === _)holder = true;
  return function(/* ...args */){
    var that  = this
      , $$    = arguments
      , $$len = $$.length
      , j = 0, k = 0, args;
    if(!holder && !$$len)return invoke(fn, pargs, that);
    args = pargs.slice();
    if(holder)for(;length > j; j++)if(args[j] === _)args[j] = $$[k++];
    while($$len > k)args.push($$[k++]);
    return invoke(fn, args, that);
  };
};
},{"./$.a-function":48,"./$.invoke":79,"./$.path":104}],104:[function(require,module,exports){
module.exports = require('./$.global');
},{"./$.global":75}],105:[function(require,module,exports){
module.exports = function(bitmap, value){
  return {
    enumerable  : !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable    : !(bitmap & 4),
    value       : value
  };
};
},{}],106:[function(require,module,exports){
var redefine = require('./$.redefine');
module.exports = function(target, src){
  for(var key in src)redefine(target, key, src[key]);
  return target;
};
},{"./$.redefine":107}],107:[function(require,module,exports){
// add fake Function#toString
// for correct work wrapped methods / constructors with methods like LoDash isNative
var global    = require('./$.global')
  , hide      = require('./$.hide')
  , SRC       = require('./$.uid')('src')
  , TO_STRING = 'toString'
  , $toString = Function[TO_STRING]
  , TPL       = ('' + $toString).split(TO_STRING);

require('./$.core').inspectSource = function(it){
  return $toString.call(it);
};

(module.exports = function(O, key, val, safe){
  if(typeof val == 'function'){
    val.hasOwnProperty(SRC) || hide(val, SRC, O[key] ? '' + O[key] : TPL.join(String(key)));
    val.hasOwnProperty('name') || hide(val, 'name', key);
  }
  if(O === global){
    O[key] = val;
  } else {
    if(!safe)delete O[key];
    hide(O, key, val);
  }
})(Function.prototype, TO_STRING, function toString(){
  return typeof this == 'function' && this[SRC] || $toString.call(this);
});
},{"./$.core":62,"./$.global":75,"./$.hide":77,"./$.uid":128}],108:[function(require,module,exports){
module.exports = function(regExp, replace){
  var replacer = replace === Object(replace) ? function(part){
    return replace[part];
  } : replace;
  return function(it){
    return String(it).replace(regExp, replacer);
  };
};
},{}],109:[function(require,module,exports){
// 7.2.9 SameValue(x, y)
module.exports = Object.is || function is(x, y){
  return x === y ? x !== 0 || 1 / x === 1 / y : x != x && y != y;
};
},{}],110:[function(require,module,exports){
// Works with __proto__ only. Old v8 can't work with null proto objects.
/* eslint-disable no-proto */
var getDesc  = require('./$').getDesc
  , isObject = require('./$.is-object')
  , anObject = require('./$.an-object');
var check = function(O, proto){
  anObject(O);
  if(!isObject(proto) && proto !== null)throw TypeError(proto + ": can't set as prototype!");
};
module.exports = {
  set: Object.setPrototypeOf || ('__proto__' in {} ? // eslint-disable-line
    function(test, buggy, set){
      try {
        set = require('./$.ctx')(Function.call, getDesc(Object.prototype, '__proto__').set, 2);
        set(test, []);
        buggy = !(test instanceof Array);
      } catch(e){ buggy = true; }
      return function setPrototypeOf(O, proto){
        check(O, proto);
        if(buggy)O.__proto__ = proto;
        else set(O, proto);
        return O;
      };
    }({}, false) : undefined),
  check: check
};
},{"./$":92,"./$.an-object":50,"./$.ctx":63,"./$.is-object":84}],111:[function(require,module,exports){
'use strict';
var global      = require('./$.global')
  , $           = require('./$')
  , DESCRIPTORS = require('./$.descriptors')
  , SPECIES     = require('./$.wks')('species');

module.exports = function(KEY){
  var C = global[KEY];
  if(DESCRIPTORS && C && !C[SPECIES])$.setDesc(C, SPECIES, {
    configurable: true,
    get: function(){ return this; }
  });
};
},{"./$":92,"./$.descriptors":65,"./$.global":75,"./$.wks":129}],112:[function(require,module,exports){
var def = require('./$').setDesc
  , has = require('./$.has')
  , TAG = require('./$.wks')('toStringTag');

module.exports = function(it, tag, stat){
  if(it && !has(it = stat ? it : it.prototype, TAG))def(it, TAG, {configurable: true, value: tag});
};
},{"./$":92,"./$.has":76,"./$.wks":129}],113:[function(require,module,exports){
var global = require('./$.global')
  , SHARED = '__core-js_shared__'
  , store  = global[SHARED] || (global[SHARED] = {});
module.exports = function(key){
  return store[key] || (store[key] = {});
};
},{"./$.global":75}],114:[function(require,module,exports){
// 7.3.20 SpeciesConstructor(O, defaultConstructor)
var anObject  = require('./$.an-object')
  , aFunction = require('./$.a-function')
  , SPECIES   = require('./$.wks')('species');
module.exports = function(O, D){
  var C = anObject(O).constructor, S;
  return C === undefined || (S = anObject(C)[SPECIES]) == undefined ? D : aFunction(S);
};
},{"./$.a-function":48,"./$.an-object":50,"./$.wks":129}],115:[function(require,module,exports){
module.exports = function(it, Constructor, name){
  if(!(it instanceof Constructor))throw TypeError(name + ": use the 'new' operator!");
  return it;
};
},{}],116:[function(require,module,exports){
var toInteger = require('./$.to-integer')
  , defined   = require('./$.defined');
// true  -> String#at
// false -> String#codePointAt
module.exports = function(TO_STRING){
  return function(that, pos){
    var s = String(defined(that))
      , i = toInteger(pos)
      , l = s.length
      , a, b;
    if(i < 0 || i >= l)return TO_STRING ? '' : undefined;
    a = s.charCodeAt(i);
    return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff
      ? TO_STRING ? s.charAt(i) : a
      : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
  };
};
},{"./$.defined":64,"./$.to-integer":123}],117:[function(require,module,exports){
// helper for String#{startsWith, endsWith, includes}
var isRegExp = require('./$.is-regexp')
  , defined  = require('./$.defined');

module.exports = function(that, searchString, NAME){
  if(isRegExp(searchString))throw TypeError('String#' + NAME + " doesn't accept regex!");
  return String(defined(that));
};
},{"./$.defined":64,"./$.is-regexp":85}],118:[function(require,module,exports){
// https://github.com/ljharb/proposal-string-pad-left-right
var toLength = require('./$.to-length')
  , repeat   = require('./$.string-repeat')
  , defined  = require('./$.defined');

module.exports = function(that, maxLength, fillString, left){
  var S            = String(defined(that))
    , stringLength = S.length
    , fillStr      = fillString === undefined ? ' ' : String(fillString)
    , intMaxLength = toLength(maxLength);
  if(intMaxLength <= stringLength)return S;
  if(fillStr == '')fillStr = ' ';
  var fillLen = intMaxLength - stringLength
    , stringFiller = repeat.call(fillStr, Math.ceil(fillLen / fillStr.length));
  if(stringFiller.length > fillLen)stringFiller = stringFiller.slice(0, fillLen);
  return left ? stringFiller + S : S + stringFiller;
};
},{"./$.defined":64,"./$.string-repeat":119,"./$.to-length":125}],119:[function(require,module,exports){
'use strict';
var toInteger = require('./$.to-integer')
  , defined   = require('./$.defined');

module.exports = function repeat(count){
  var str = String(defined(this))
    , res = ''
    , n   = toInteger(count);
  if(n < 0 || n == Infinity)throw RangeError("Count can't be negative");
  for(;n > 0; (n >>>= 1) && (str += str))if(n & 1)res += str;
  return res;
};
},{"./$.defined":64,"./$.to-integer":123}],120:[function(require,module,exports){
var $export = require('./$.export')
  , defined = require('./$.defined')
  , fails   = require('./$.fails')
  , spaces  = '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003' +
      '\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF'
  , space   = '[' + spaces + ']'
  , non     = '\u200b\u0085'
  , ltrim   = RegExp('^' + space + space + '*')
  , rtrim   = RegExp(space + space + '*$');

var exporter = function(KEY, exec){
  var exp  = {};
  exp[KEY] = exec(trim);
  $export($export.P + $export.F * fails(function(){
    return !!spaces[KEY]() || non[KEY]() != non;
  }), 'String', exp);
};

// 1 -> String#trimLeft
// 2 -> String#trimRight
// 3 -> String#trim
var trim = exporter.trim = function(string, TYPE){
  string = String(defined(string));
  if(TYPE & 1)string = string.replace(ltrim, '');
  if(TYPE & 2)string = string.replace(rtrim, '');
  return string;
};

module.exports = exporter;
},{"./$.defined":64,"./$.export":68,"./$.fails":70}],121:[function(require,module,exports){
var ctx                = require('./$.ctx')
  , invoke             = require('./$.invoke')
  , html               = require('./$.html')
  , cel                = require('./$.dom-create')
  , global             = require('./$.global')
  , process            = global.process
  , setTask            = global.setImmediate
  , clearTask          = global.clearImmediate
  , MessageChannel     = global.MessageChannel
  , counter            = 0
  , queue              = {}
  , ONREADYSTATECHANGE = 'onreadystatechange'
  , defer, channel, port;
var run = function(){
  var id = +this;
  if(queue.hasOwnProperty(id)){
    var fn = queue[id];
    delete queue[id];
    fn();
  }
};
var listner = function(event){
  run.call(event.data);
};
// Node.js 0.9+ & IE10+ has setImmediate, otherwise:
if(!setTask || !clearTask){
  setTask = function setImmediate(fn){
    var args = [], i = 1;
    while(arguments.length > i)args.push(arguments[i++]);
    queue[++counter] = function(){
      invoke(typeof fn == 'function' ? fn : Function(fn), args);
    };
    defer(counter);
    return counter;
  };
  clearTask = function clearImmediate(id){
    delete queue[id];
  };
  // Node.js 0.8-
  if(require('./$.cof')(process) == 'process'){
    defer = function(id){
      process.nextTick(ctx(run, id, 1));
    };
  // Browsers with MessageChannel, includes WebWorkers
  } else if(MessageChannel){
    channel = new MessageChannel;
    port    = channel.port2;
    channel.port1.onmessage = listner;
    defer = ctx(port.postMessage, port, 1);
  // Browsers with postMessage, skip WebWorkers
  // IE8 has postMessage, but it's sync & typeof its postMessage is 'object'
  } else if(global.addEventListener && typeof postMessage == 'function' && !global.importScripts){
    defer = function(id){
      global.postMessage(id + '', '*');
    };
    global.addEventListener('message', listner, false);
  // IE8-
  } else if(ONREADYSTATECHANGE in cel('script')){
    defer = function(id){
      html.appendChild(cel('script'))[ONREADYSTATECHANGE] = function(){
        html.removeChild(this);
        run.call(id);
      };
    };
  // Rest old browsers
  } else {
    defer = function(id){
      setTimeout(ctx(run, id, 1), 0);
    };
  }
}
module.exports = {
  set:   setTask,
  clear: clearTask
};
},{"./$.cof":57,"./$.ctx":63,"./$.dom-create":66,"./$.global":75,"./$.html":78,"./$.invoke":79}],122:[function(require,module,exports){
var toInteger = require('./$.to-integer')
  , max       = Math.max
  , min       = Math.min;
module.exports = function(index, length){
  index = toInteger(index);
  return index < 0 ? max(index + length, 0) : min(index, length);
};
},{"./$.to-integer":123}],123:[function(require,module,exports){
// 7.1.4 ToInteger
var ceil  = Math.ceil
  , floor = Math.floor;
module.exports = function(it){
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};
},{}],124:[function(require,module,exports){
// to indexed object, toObject with fallback for non-array-like ES3 strings
var IObject = require('./$.iobject')
  , defined = require('./$.defined');
module.exports = function(it){
  return IObject(defined(it));
};
},{"./$.defined":64,"./$.iobject":80}],125:[function(require,module,exports){
// 7.1.15 ToLength
var toInteger = require('./$.to-integer')
  , min       = Math.min;
module.exports = function(it){
  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};
},{"./$.to-integer":123}],126:[function(require,module,exports){
// 7.1.13 ToObject(argument)
var defined = require('./$.defined');
module.exports = function(it){
  return Object(defined(it));
};
},{"./$.defined":64}],127:[function(require,module,exports){
// 7.1.1 ToPrimitive(input [, PreferredType])
var isObject = require('./$.is-object');
// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
module.exports = function(it, S){
  if(!isObject(it))return it;
  var fn, val;
  if(S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it)))return val;
  if(typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it)))return val;
  if(!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it)))return val;
  throw TypeError("Can't convert object to primitive value");
};
},{"./$.is-object":84}],128:[function(require,module,exports){
var id = 0
  , px = Math.random();
module.exports = function(key){
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};
},{}],129:[function(require,module,exports){
var store  = require('./$.shared')('wks')
  , uid    = require('./$.uid')
  , Symbol = require('./$.global').Symbol;
module.exports = function(name){
  return store[name] || (store[name] =
    Symbol && Symbol[name] || (Symbol || uid)('Symbol.' + name));
};
},{"./$.global":75,"./$.shared":113,"./$.uid":128}],130:[function(require,module,exports){
var classof   = require('./$.classof')
  , ITERATOR  = require('./$.wks')('iterator')
  , Iterators = require('./$.iterators');
module.exports = require('./$.core').getIteratorMethod = function(it){
  if(it != undefined)return it[ITERATOR]
    || it['@@iterator']
    || Iterators[classof(it)];
};
},{"./$.classof":56,"./$.core":62,"./$.iterators":91,"./$.wks":129}],131:[function(require,module,exports){
'use strict';
var $                 = require('./$')
  , $export           = require('./$.export')
  , DESCRIPTORS       = require('./$.descriptors')
  , createDesc        = require('./$.property-desc')
  , html              = require('./$.html')
  , cel               = require('./$.dom-create')
  , has               = require('./$.has')
  , cof               = require('./$.cof')
  , invoke            = require('./$.invoke')
  , fails             = require('./$.fails')
  , anObject          = require('./$.an-object')
  , aFunction         = require('./$.a-function')
  , isObject          = require('./$.is-object')
  , toObject          = require('./$.to-object')
  , toIObject         = require('./$.to-iobject')
  , toInteger         = require('./$.to-integer')
  , toIndex           = require('./$.to-index')
  , toLength          = require('./$.to-length')
  , IObject           = require('./$.iobject')
  , IE_PROTO          = require('./$.uid')('__proto__')
  , createArrayMethod = require('./$.array-methods')
  , arrayIndexOf      = require('./$.array-includes')(false)
  , ObjectProto       = Object.prototype
  , ArrayProto        = Array.prototype
  , arraySlice        = ArrayProto.slice
  , arrayJoin         = ArrayProto.join
  , defineProperty    = $.setDesc
  , getOwnDescriptor  = $.getDesc
  , defineProperties  = $.setDescs
  , factories         = {}
  , IE8_DOM_DEFINE;

if(!DESCRIPTORS){
  IE8_DOM_DEFINE = !fails(function(){
    return defineProperty(cel('div'), 'a', {get: function(){ return 7; }}).a != 7;
  });
  $.setDesc = function(O, P, Attributes){
    if(IE8_DOM_DEFINE)try {
      return defineProperty(O, P, Attributes);
    } catch(e){ /* empty */ }
    if('get' in Attributes || 'set' in Attributes)throw TypeError('Accessors not supported!');
    if('value' in Attributes)anObject(O)[P] = Attributes.value;
    return O;
  };
  $.getDesc = function(O, P){
    if(IE8_DOM_DEFINE)try {
      return getOwnDescriptor(O, P);
    } catch(e){ /* empty */ }
    if(has(O, P))return createDesc(!ObjectProto.propertyIsEnumerable.call(O, P), O[P]);
  };
  $.setDescs = defineProperties = function(O, Properties){
    anObject(O);
    var keys   = $.getKeys(Properties)
      , length = keys.length
      , i = 0
      , P;
    while(length > i)$.setDesc(O, P = keys[i++], Properties[P]);
    return O;
  };
}
$export($export.S + $export.F * !DESCRIPTORS, 'Object', {
  // 19.1.2.6 / 15.2.3.3 Object.getOwnPropertyDescriptor(O, P)
  getOwnPropertyDescriptor: $.getDesc,
  // 19.1.2.4 / 15.2.3.6 Object.defineProperty(O, P, Attributes)
  defineProperty: $.setDesc,
  // 19.1.2.3 / 15.2.3.7 Object.defineProperties(O, Properties)
  defineProperties: defineProperties
});

  // IE 8- don't enum bug keys
var keys1 = ('constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,' +
            'toLocaleString,toString,valueOf').split(',')
  // Additional keys for getOwnPropertyNames
  , keys2 = keys1.concat('length', 'prototype')
  , keysLen1 = keys1.length;

// Create object with `null` prototype: use iframe Object with cleared prototype
var createDict = function(){
  // Thrash, waste and sodomy: IE GC bug
  var iframe = cel('iframe')
    , i      = keysLen1
    , gt     = '>'
    , iframeDocument;
  iframe.style.display = 'none';
  html.appendChild(iframe);
  iframe.src = 'javascript:'; // eslint-disable-line no-script-url
  // createDict = iframe.contentWindow.Object;
  // html.removeChild(iframe);
  iframeDocument = iframe.contentWindow.document;
  iframeDocument.open();
  iframeDocument.write('<script>document.F=Object</script' + gt);
  iframeDocument.close();
  createDict = iframeDocument.F;
  while(i--)delete createDict.prototype[keys1[i]];
  return createDict();
};
var createGetKeys = function(names, length){
  return function(object){
    var O      = toIObject(object)
      , i      = 0
      , result = []
      , key;
    for(key in O)if(key != IE_PROTO)has(O, key) && result.push(key);
    // Don't enum bug & hidden keys
    while(length > i)if(has(O, key = names[i++])){
      ~arrayIndexOf(result, key) || result.push(key);
    }
    return result;
  };
};
var Empty = function(){};
$export($export.S, 'Object', {
  // 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)
  getPrototypeOf: $.getProto = $.getProto || function(O){
    O = toObject(O);
    if(has(O, IE_PROTO))return O[IE_PROTO];
    if(typeof O.constructor == 'function' && O instanceof O.constructor){
      return O.constructor.prototype;
    } return O instanceof Object ? ObjectProto : null;
  },
  // 19.1.2.7 / 15.2.3.4 Object.getOwnPropertyNames(O)
  getOwnPropertyNames: $.getNames = $.getNames || createGetKeys(keys2, keys2.length, true),
  // 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
  create: $.create = $.create || function(O, /*?*/Properties){
    var result;
    if(O !== null){
      Empty.prototype = anObject(O);
      result = new Empty();
      Empty.prototype = null;
      // add "__proto__" for Object.getPrototypeOf shim
      result[IE_PROTO] = O;
    } else result = createDict();
    return Properties === undefined ? result : defineProperties(result, Properties);
  },
  // 19.1.2.14 / 15.2.3.14 Object.keys(O)
  keys: $.getKeys = $.getKeys || createGetKeys(keys1, keysLen1, false)
});

var construct = function(F, len, args){
  if(!(len in factories)){
    for(var n = [], i = 0; i < len; i++)n[i] = 'a[' + i + ']';
    factories[len] = Function('F,a', 'return new F(' + n.join(',') + ')');
  }
  return factories[len](F, args);
};

// 19.2.3.2 / 15.3.4.5 Function.prototype.bind(thisArg, args...)
$export($export.P, 'Function', {
  bind: function bind(that /*, args... */){
    var fn       = aFunction(this)
      , partArgs = arraySlice.call(arguments, 1);
    var bound = function(/* args... */){
      var args = partArgs.concat(arraySlice.call(arguments));
      return this instanceof bound ? construct(fn, args.length, args) : invoke(fn, args, that);
    };
    if(isObject(fn.prototype))bound.prototype = fn.prototype;
    return bound;
  }
});

// fallback for not array-like ES3 strings and DOM objects
$export($export.P + $export.F * fails(function(){
  if(html)arraySlice.call(html);
}), 'Array', {
  slice: function(begin, end){
    var len   = toLength(this.length)
      , klass = cof(this);
    end = end === undefined ? len : end;
    if(klass == 'Array')return arraySlice.call(this, begin, end);
    var start  = toIndex(begin, len)
      , upTo   = toIndex(end, len)
      , size   = toLength(upTo - start)
      , cloned = Array(size)
      , i      = 0;
    for(; i < size; i++)cloned[i] = klass == 'String'
      ? this.charAt(start + i)
      : this[start + i];
    return cloned;
  }
});
$export($export.P + $export.F * (IObject != Object), 'Array', {
  join: function join(separator){
    return arrayJoin.call(IObject(this), separator === undefined ? ',' : separator);
  }
});

// 22.1.2.2 / 15.4.3.2 Array.isArray(arg)
$export($export.S, 'Array', {isArray: require('./$.is-array')});

var createArrayReduce = function(isRight){
  return function(callbackfn, memo){
    aFunction(callbackfn);
    var O      = IObject(this)
      , length = toLength(O.length)
      , index  = isRight ? length - 1 : 0
      , i      = isRight ? -1 : 1;
    if(arguments.length < 2)for(;;){
      if(index in O){
        memo = O[index];
        index += i;
        break;
      }
      index += i;
      if(isRight ? index < 0 : length <= index){
        throw TypeError('Reduce of empty array with no initial value');
      }
    }
    for(;isRight ? index >= 0 : length > index; index += i)if(index in O){
      memo = callbackfn(memo, O[index], index, this);
    }
    return memo;
  };
};

var methodize = function($fn){
  return function(arg1/*, arg2 = undefined */){
    return $fn(this, arg1, arguments[1]);
  };
};

$export($export.P, 'Array', {
  // 22.1.3.10 / 15.4.4.18 Array.prototype.forEach(callbackfn [, thisArg])
  forEach: $.each = $.each || methodize(createArrayMethod(0)),
  // 22.1.3.15 / 15.4.4.19 Array.prototype.map(callbackfn [, thisArg])
  map: methodize(createArrayMethod(1)),
  // 22.1.3.7 / 15.4.4.20 Array.prototype.filter(callbackfn [, thisArg])
  filter: methodize(createArrayMethod(2)),
  // 22.1.3.23 / 15.4.4.17 Array.prototype.some(callbackfn [, thisArg])
  some: methodize(createArrayMethod(3)),
  // 22.1.3.5 / 15.4.4.16 Array.prototype.every(callbackfn [, thisArg])
  every: methodize(createArrayMethod(4)),
  // 22.1.3.18 / 15.4.4.21 Array.prototype.reduce(callbackfn [, initialValue])
  reduce: createArrayReduce(false),
  // 22.1.3.19 / 15.4.4.22 Array.prototype.reduceRight(callbackfn [, initialValue])
  reduceRight: createArrayReduce(true),
  // 22.1.3.11 / 15.4.4.14 Array.prototype.indexOf(searchElement [, fromIndex])
  indexOf: methodize(arrayIndexOf),
  // 22.1.3.14 / 15.4.4.15 Array.prototype.lastIndexOf(searchElement [, fromIndex])
  lastIndexOf: function(el, fromIndex /* = @[*-1] */){
    var O      = toIObject(this)
      , length = toLength(O.length)
      , index  = length - 1;
    if(arguments.length > 1)index = Math.min(index, toInteger(fromIndex));
    if(index < 0)index = toLength(length + index);
    for(;index >= 0; index--)if(index in O)if(O[index] === el)return index;
    return -1;
  }
});

// 20.3.3.1 / 15.9.4.4 Date.now()
$export($export.S, 'Date', {now: function(){ return +new Date; }});

var lz = function(num){
  return num > 9 ? num : '0' + num;
};

// 20.3.4.36 / 15.9.5.43 Date.prototype.toISOString()
// PhantomJS / old WebKit has a broken implementations
$export($export.P + $export.F * (fails(function(){
  return new Date(-5e13 - 1).toISOString() != '0385-07-25T07:06:39.999Z';
}) || !fails(function(){
  new Date(NaN).toISOString();
})), 'Date', {
  toISOString: function toISOString(){
    if(!isFinite(this))throw RangeError('Invalid time value');
    var d = this
      , y = d.getUTCFullYear()
      , m = d.getUTCMilliseconds()
      , s = y < 0 ? '-' : y > 9999 ? '+' : '';
    return s + ('00000' + Math.abs(y)).slice(s ? -6 : -4) +
      '-' + lz(d.getUTCMonth() + 1) + '-' + lz(d.getUTCDate()) +
      'T' + lz(d.getUTCHours()) + ':' + lz(d.getUTCMinutes()) +
      ':' + lz(d.getUTCSeconds()) + '.' + (m > 99 ? m : '0' + lz(m)) + 'Z';
  }
});
},{"./$":92,"./$.a-function":48,"./$.an-object":50,"./$.array-includes":53,"./$.array-methods":54,"./$.cof":57,"./$.descriptors":65,"./$.dom-create":66,"./$.export":68,"./$.fails":70,"./$.has":76,"./$.html":78,"./$.invoke":79,"./$.iobject":80,"./$.is-array":82,"./$.is-object":84,"./$.property-desc":105,"./$.to-index":122,"./$.to-integer":123,"./$.to-iobject":124,"./$.to-length":125,"./$.to-object":126,"./$.uid":128}],132:[function(require,module,exports){
// 22.1.3.3 Array.prototype.copyWithin(target, start, end = this.length)
var $export = require('./$.export');

$export($export.P, 'Array', {copyWithin: require('./$.array-copy-within')});

require('./$.add-to-unscopables')('copyWithin');
},{"./$.add-to-unscopables":49,"./$.array-copy-within":51,"./$.export":68}],133:[function(require,module,exports){
// 22.1.3.6 Array.prototype.fill(value, start = 0, end = this.length)
var $export = require('./$.export');

$export($export.P, 'Array', {fill: require('./$.array-fill')});

require('./$.add-to-unscopables')('fill');
},{"./$.add-to-unscopables":49,"./$.array-fill":52,"./$.export":68}],134:[function(require,module,exports){
'use strict';
// 22.1.3.9 Array.prototype.findIndex(predicate, thisArg = undefined)
var $export = require('./$.export')
  , $find   = require('./$.array-methods')(6)
  , KEY     = 'findIndex'
  , forced  = true;
// Shouldn't skip holes
if(KEY in [])Array(1)[KEY](function(){ forced = false; });
$export($export.P + $export.F * forced, 'Array', {
  findIndex: function findIndex(callbackfn/*, that = undefined */){
    return $find(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
  }
});
require('./$.add-to-unscopables')(KEY);
},{"./$.add-to-unscopables":49,"./$.array-methods":54,"./$.export":68}],135:[function(require,module,exports){
'use strict';
// 22.1.3.8 Array.prototype.find(predicate, thisArg = undefined)
var $export = require('./$.export')
  , $find   = require('./$.array-methods')(5)
  , KEY     = 'find'
  , forced  = true;
// Shouldn't skip holes
if(KEY in [])Array(1)[KEY](function(){ forced = false; });
$export($export.P + $export.F * forced, 'Array', {
  find: function find(callbackfn/*, that = undefined */){
    return $find(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
  }
});
require('./$.add-to-unscopables')(KEY);
},{"./$.add-to-unscopables":49,"./$.array-methods":54,"./$.export":68}],136:[function(require,module,exports){
'use strict';
var ctx         = require('./$.ctx')
  , $export     = require('./$.export')
  , toObject    = require('./$.to-object')
  , call        = require('./$.iter-call')
  , isArrayIter = require('./$.is-array-iter')
  , toLength    = require('./$.to-length')
  , getIterFn   = require('./core.get-iterator-method');
$export($export.S + $export.F * !require('./$.iter-detect')(function(iter){ Array.from(iter); }), 'Array', {
  // 22.1.2.1 Array.from(arrayLike, mapfn = undefined, thisArg = undefined)
  from: function from(arrayLike/*, mapfn = undefined, thisArg = undefined*/){
    var O       = toObject(arrayLike)
      , C       = typeof this == 'function' ? this : Array
      , $$      = arguments
      , $$len   = $$.length
      , mapfn   = $$len > 1 ? $$[1] : undefined
      , mapping = mapfn !== undefined
      , index   = 0
      , iterFn  = getIterFn(O)
      , length, result, step, iterator;
    if(mapping)mapfn = ctx(mapfn, $$len > 2 ? $$[2] : undefined, 2);
    // if object isn't iterable or it's array with default iterator - use simple case
    if(iterFn != undefined && !(C == Array && isArrayIter(iterFn))){
      for(iterator = iterFn.call(O), result = new C; !(step = iterator.next()).done; index++){
        result[index] = mapping ? call(iterator, mapfn, [step.value, index], true) : step.value;
      }
    } else {
      length = toLength(O.length);
      for(result = new C(length); length > index; index++){
        result[index] = mapping ? mapfn(O[index], index) : O[index];
      }
    }
    result.length = index;
    return result;
  }
});

},{"./$.ctx":63,"./$.export":68,"./$.is-array-iter":81,"./$.iter-call":86,"./$.iter-detect":89,"./$.to-length":125,"./$.to-object":126,"./core.get-iterator-method":130}],137:[function(require,module,exports){
'use strict';
var addToUnscopables = require('./$.add-to-unscopables')
  , step             = require('./$.iter-step')
  , Iterators        = require('./$.iterators')
  , toIObject        = require('./$.to-iobject');

// 22.1.3.4 Array.prototype.entries()
// 22.1.3.13 Array.prototype.keys()
// 22.1.3.29 Array.prototype.values()
// 22.1.3.30 Array.prototype[@@iterator]()
module.exports = require('./$.iter-define')(Array, 'Array', function(iterated, kind){
  this._t = toIObject(iterated); // target
  this._i = 0;                   // next index
  this._k = kind;                // kind
// 22.1.5.2.1 %ArrayIteratorPrototype%.next()
}, function(){
  var O     = this._t
    , kind  = this._k
    , index = this._i++;
  if(!O || index >= O.length){
    this._t = undefined;
    return step(1);
  }
  if(kind == 'keys'  )return step(0, index);
  if(kind == 'values')return step(0, O[index]);
  return step(0, [index, O[index]]);
}, 'values');

// argumentsList[@@iterator] is %ArrayProto_values% (9.4.4.6, 9.4.4.7)
Iterators.Arguments = Iterators.Array;

addToUnscopables('keys');
addToUnscopables('values');
addToUnscopables('entries');
},{"./$.add-to-unscopables":49,"./$.iter-define":88,"./$.iter-step":90,"./$.iterators":91,"./$.to-iobject":124}],138:[function(require,module,exports){
'use strict';
var $export = require('./$.export');

// WebKit Array.of isn't generic
$export($export.S + $export.F * require('./$.fails')(function(){
  function F(){}
  return !(Array.of.call(F) instanceof F);
}), 'Array', {
  // 22.1.2.3 Array.of( ...items)
  of: function of(/* ...args */){
    var index  = 0
      , $$     = arguments
      , $$len  = $$.length
      , result = new (typeof this == 'function' ? this : Array)($$len);
    while($$len > index)result[index] = $$[index++];
    result.length = $$len;
    return result;
  }
});
},{"./$.export":68,"./$.fails":70}],139:[function(require,module,exports){
require('./$.set-species')('Array');
},{"./$.set-species":111}],140:[function(require,module,exports){
'use strict';
var $             = require('./$')
  , isObject      = require('./$.is-object')
  , HAS_INSTANCE  = require('./$.wks')('hasInstance')
  , FunctionProto = Function.prototype;
// 19.2.3.6 Function.prototype[@@hasInstance](V)
if(!(HAS_INSTANCE in FunctionProto))$.setDesc(FunctionProto, HAS_INSTANCE, {value: function(O){
  if(typeof this != 'function' || !isObject(O))return false;
  if(!isObject(this.prototype))return O instanceof this;
  // for environment w/o native `@@hasInstance` logic enough `instanceof`, but add this:
  while(O = $.getProto(O))if(this.prototype === O)return true;
  return false;
}});
},{"./$":92,"./$.is-object":84,"./$.wks":129}],141:[function(require,module,exports){
var setDesc    = require('./$').setDesc
  , createDesc = require('./$.property-desc')
  , has        = require('./$.has')
  , FProto     = Function.prototype
  , nameRE     = /^\s*function ([^ (]*)/
  , NAME       = 'name';
// 19.2.4.2 name
NAME in FProto || require('./$.descriptors') && setDesc(FProto, NAME, {
  configurable: true,
  get: function(){
    var match = ('' + this).match(nameRE)
      , name  = match ? match[1] : '';
    has(this, NAME) || setDesc(this, NAME, createDesc(5, name));
    return name;
  }
});
},{"./$":92,"./$.descriptors":65,"./$.has":76,"./$.property-desc":105}],142:[function(require,module,exports){
'use strict';
var strong = require('./$.collection-strong');

// 23.1 Map Objects
require('./$.collection')('Map', function(get){
  return function Map(){ return get(this, arguments.length > 0 ? arguments[0] : undefined); };
}, {
  // 23.1.3.6 Map.prototype.get(key)
  get: function get(key){
    var entry = strong.getEntry(this, key);
    return entry && entry.v;
  },
  // 23.1.3.9 Map.prototype.set(key, value)
  set: function set(key, value){
    return strong.def(this, key === 0 ? 0 : key, value);
  }
}, strong, true);
},{"./$.collection":61,"./$.collection-strong":58}],143:[function(require,module,exports){
// 20.2.2.3 Math.acosh(x)
var $export = require('./$.export')
  , log1p   = require('./$.math-log1p')
  , sqrt    = Math.sqrt
  , $acosh  = Math.acosh;

// V8 bug https://code.google.com/p/v8/issues/detail?id=3509
$export($export.S + $export.F * !($acosh && Math.floor($acosh(Number.MAX_VALUE)) == 710), 'Math', {
  acosh: function acosh(x){
    return (x = +x) < 1 ? NaN : x > 94906265.62425156
      ? Math.log(x) + Math.LN2
      : log1p(x - 1 + sqrt(x - 1) * sqrt(x + 1));
  }
});
},{"./$.export":68,"./$.math-log1p":96}],144:[function(require,module,exports){
// 20.2.2.5 Math.asinh(x)
var $export = require('./$.export');

function asinh(x){
  return !isFinite(x = +x) || x == 0 ? x : x < 0 ? -asinh(-x) : Math.log(x + Math.sqrt(x * x + 1));
}

$export($export.S, 'Math', {asinh: asinh});
},{"./$.export":68}],145:[function(require,module,exports){
// 20.2.2.7 Math.atanh(x)
var $export = require('./$.export');

$export($export.S, 'Math', {
  atanh: function atanh(x){
    return (x = +x) == 0 ? x : Math.log((1 + x) / (1 - x)) / 2;
  }
});
},{"./$.export":68}],146:[function(require,module,exports){
// 20.2.2.9 Math.cbrt(x)
var $export = require('./$.export')
  , sign    = require('./$.math-sign');

$export($export.S, 'Math', {
  cbrt: function cbrt(x){
    return sign(x = +x) * Math.pow(Math.abs(x), 1 / 3);
  }
});
},{"./$.export":68,"./$.math-sign":97}],147:[function(require,module,exports){
// 20.2.2.11 Math.clz32(x)
var $export = require('./$.export');

$export($export.S, 'Math', {
  clz32: function clz32(x){
    return (x >>>= 0) ? 31 - Math.floor(Math.log(x + 0.5) * Math.LOG2E) : 32;
  }
});
},{"./$.export":68}],148:[function(require,module,exports){
// 20.2.2.12 Math.cosh(x)
var $export = require('./$.export')
  , exp     = Math.exp;

$export($export.S, 'Math', {
  cosh: function cosh(x){
    return (exp(x = +x) + exp(-x)) / 2;
  }
});
},{"./$.export":68}],149:[function(require,module,exports){
// 20.2.2.14 Math.expm1(x)
var $export = require('./$.export');

$export($export.S, 'Math', {expm1: require('./$.math-expm1')});
},{"./$.export":68,"./$.math-expm1":95}],150:[function(require,module,exports){
// 20.2.2.16 Math.fround(x)
var $export   = require('./$.export')
  , sign      = require('./$.math-sign')
  , pow       = Math.pow
  , EPSILON   = pow(2, -52)
  , EPSILON32 = pow(2, -23)
  , MAX32     = pow(2, 127) * (2 - EPSILON32)
  , MIN32     = pow(2, -126);

var roundTiesToEven = function(n){
  return n + 1 / EPSILON - 1 / EPSILON;
};


$export($export.S, 'Math', {
  fround: function fround(x){
    var $abs  = Math.abs(x)
      , $sign = sign(x)
      , a, result;
    if($abs < MIN32)return $sign * roundTiesToEven($abs / MIN32 / EPSILON32) * MIN32 * EPSILON32;
    a = (1 + EPSILON32 / EPSILON) * $abs;
    result = a - (a - $abs);
    if(result > MAX32 || result != result)return $sign * Infinity;
    return $sign * result;
  }
});
},{"./$.export":68,"./$.math-sign":97}],151:[function(require,module,exports){
// 20.2.2.17 Math.hypot([value1[, value2[, … ]]])
var $export = require('./$.export')
  , abs     = Math.abs;

$export($export.S, 'Math', {
  hypot: function hypot(value1, value2){ // eslint-disable-line no-unused-vars
    var sum   = 0
      , i     = 0
      , $$    = arguments
      , $$len = $$.length
      , larg  = 0
      , arg, div;
    while(i < $$len){
      arg = abs($$[i++]);
      if(larg < arg){
        div  = larg / arg;
        sum  = sum * div * div + 1;
        larg = arg;
      } else if(arg > 0){
        div  = arg / larg;
        sum += div * div;
      } else sum += arg;
    }
    return larg === Infinity ? Infinity : larg * Math.sqrt(sum);
  }
});
},{"./$.export":68}],152:[function(require,module,exports){
// 20.2.2.18 Math.imul(x, y)
var $export = require('./$.export')
  , $imul   = Math.imul;

// some WebKit versions fails with big numbers, some has wrong arity
$export($export.S + $export.F * require('./$.fails')(function(){
  return $imul(0xffffffff, 5) != -5 || $imul.length != 2;
}), 'Math', {
  imul: function imul(x, y){
    var UINT16 = 0xffff
      , xn = +x
      , yn = +y
      , xl = UINT16 & xn
      , yl = UINT16 & yn;
    return 0 | xl * yl + ((UINT16 & xn >>> 16) * yl + xl * (UINT16 & yn >>> 16) << 16 >>> 0);
  }
});
},{"./$.export":68,"./$.fails":70}],153:[function(require,module,exports){
// 20.2.2.21 Math.log10(x)
var $export = require('./$.export');

$export($export.S, 'Math', {
  log10: function log10(x){
    return Math.log(x) / Math.LN10;
  }
});
},{"./$.export":68}],154:[function(require,module,exports){
// 20.2.2.20 Math.log1p(x)
var $export = require('./$.export');

$export($export.S, 'Math', {log1p: require('./$.math-log1p')});
},{"./$.export":68,"./$.math-log1p":96}],155:[function(require,module,exports){
// 20.2.2.22 Math.log2(x)
var $export = require('./$.export');

$export($export.S, 'Math', {
  log2: function log2(x){
    return Math.log(x) / Math.LN2;
  }
});
},{"./$.export":68}],156:[function(require,module,exports){
// 20.2.2.28 Math.sign(x)
var $export = require('./$.export');

$export($export.S, 'Math', {sign: require('./$.math-sign')});
},{"./$.export":68,"./$.math-sign":97}],157:[function(require,module,exports){
// 20.2.2.30 Math.sinh(x)
var $export = require('./$.export')
  , expm1   = require('./$.math-expm1')
  , exp     = Math.exp;

// V8 near Chromium 38 has a problem with very small numbers
$export($export.S + $export.F * require('./$.fails')(function(){
  return !Math.sinh(-2e-17) != -2e-17;
}), 'Math', {
  sinh: function sinh(x){
    return Math.abs(x = +x) < 1
      ? (expm1(x) - expm1(-x)) / 2
      : (exp(x - 1) - exp(-x - 1)) * (Math.E / 2);
  }
});
},{"./$.export":68,"./$.fails":70,"./$.math-expm1":95}],158:[function(require,module,exports){
// 20.2.2.33 Math.tanh(x)
var $export = require('./$.export')
  , expm1   = require('./$.math-expm1')
  , exp     = Math.exp;

$export($export.S, 'Math', {
  tanh: function tanh(x){
    var a = expm1(x = +x)
      , b = expm1(-x);
    return a == Infinity ? 1 : b == Infinity ? -1 : (a - b) / (exp(x) + exp(-x));
  }
});
},{"./$.export":68,"./$.math-expm1":95}],159:[function(require,module,exports){
// 20.2.2.34 Math.trunc(x)
var $export = require('./$.export');

$export($export.S, 'Math', {
  trunc: function trunc(it){
    return (it > 0 ? Math.floor : Math.ceil)(it);
  }
});
},{"./$.export":68}],160:[function(require,module,exports){
'use strict';
var $           = require('./$')
  , global      = require('./$.global')
  , has         = require('./$.has')
  , cof         = require('./$.cof')
  , toPrimitive = require('./$.to-primitive')
  , fails       = require('./$.fails')
  , $trim       = require('./$.string-trim').trim
  , NUMBER      = 'Number'
  , $Number     = global[NUMBER]
  , Base        = $Number
  , proto       = $Number.prototype
  // Opera ~12 has broken Object#toString
  , BROKEN_COF  = cof($.create(proto)) == NUMBER
  , TRIM        = 'trim' in String.prototype;

// 7.1.3 ToNumber(argument)
var toNumber = function(argument){
  var it = toPrimitive(argument, false);
  if(typeof it == 'string' && it.length > 2){
    it = TRIM ? it.trim() : $trim(it, 3);
    var first = it.charCodeAt(0)
      , third, radix, maxCode;
    if(first === 43 || first === 45){
      third = it.charCodeAt(2);
      if(third === 88 || third === 120)return NaN; // Number('+0x1') should be NaN, old V8 fix
    } else if(first === 48){
      switch(it.charCodeAt(1)){
        case 66 : case 98  : radix = 2; maxCode = 49; break; // fast equal /^0b[01]+$/i
        case 79 : case 111 : radix = 8; maxCode = 55; break; // fast equal /^0o[0-7]+$/i
        default : return +it;
      }
      for(var digits = it.slice(2), i = 0, l = digits.length, code; i < l; i++){
        code = digits.charCodeAt(i);
        // parseInt parses a string to a first unavailable symbol
        // but ToNumber should return NaN if a string contains unavailable symbols
        if(code < 48 || code > maxCode)return NaN;
      } return parseInt(digits, radix);
    }
  } return +it;
};

if(!$Number(' 0o1') || !$Number('0b1') || $Number('+0x1')){
  $Number = function Number(value){
    var it = arguments.length < 1 ? 0 : value
      , that = this;
    return that instanceof $Number
      // check on 1..constructor(foo) case
      && (BROKEN_COF ? fails(function(){ proto.valueOf.call(that); }) : cof(that) != NUMBER)
        ? new Base(toNumber(it)) : toNumber(it);
  };
  $.each.call(require('./$.descriptors') ? $.getNames(Base) : (
    // ES3:
    'MAX_VALUE,MIN_VALUE,NaN,NEGATIVE_INFINITY,POSITIVE_INFINITY,' +
    // ES6 (in case, if modules with ES6 Number statics required before):
    'EPSILON,isFinite,isInteger,isNaN,isSafeInteger,MAX_SAFE_INTEGER,' +
    'MIN_SAFE_INTEGER,parseFloat,parseInt,isInteger'
  ).split(','), function(key){
    if(has(Base, key) && !has($Number, key)){
      $.setDesc($Number, key, $.getDesc(Base, key));
    }
  });
  $Number.prototype = proto;
  proto.constructor = $Number;
  require('./$.redefine')(global, NUMBER, $Number);
}
},{"./$":92,"./$.cof":57,"./$.descriptors":65,"./$.fails":70,"./$.global":75,"./$.has":76,"./$.redefine":107,"./$.string-trim":120,"./$.to-primitive":127}],161:[function(require,module,exports){
// 20.1.2.1 Number.EPSILON
var $export = require('./$.export');

$export($export.S, 'Number', {EPSILON: Math.pow(2, -52)});
},{"./$.export":68}],162:[function(require,module,exports){
// 20.1.2.2 Number.isFinite(number)
var $export   = require('./$.export')
  , _isFinite = require('./$.global').isFinite;

$export($export.S, 'Number', {
  isFinite: function isFinite(it){
    return typeof it == 'number' && _isFinite(it);
  }
});
},{"./$.export":68,"./$.global":75}],163:[function(require,module,exports){
// 20.1.2.3 Number.isInteger(number)
var $export = require('./$.export');

$export($export.S, 'Number', {isInteger: require('./$.is-integer')});
},{"./$.export":68,"./$.is-integer":83}],164:[function(require,module,exports){
// 20.1.2.4 Number.isNaN(number)
var $export = require('./$.export');

$export($export.S, 'Number', {
  isNaN: function isNaN(number){
    return number != number;
  }
});
},{"./$.export":68}],165:[function(require,module,exports){
// 20.1.2.5 Number.isSafeInteger(number)
var $export   = require('./$.export')
  , isInteger = require('./$.is-integer')
  , abs       = Math.abs;

$export($export.S, 'Number', {
  isSafeInteger: function isSafeInteger(number){
    return isInteger(number) && abs(number) <= 0x1fffffffffffff;
  }
});
},{"./$.export":68,"./$.is-integer":83}],166:[function(require,module,exports){
// 20.1.2.6 Number.MAX_SAFE_INTEGER
var $export = require('./$.export');

$export($export.S, 'Number', {MAX_SAFE_INTEGER: 0x1fffffffffffff});
},{"./$.export":68}],167:[function(require,module,exports){
// 20.1.2.10 Number.MIN_SAFE_INTEGER
var $export = require('./$.export');

$export($export.S, 'Number', {MIN_SAFE_INTEGER: -0x1fffffffffffff});
},{"./$.export":68}],168:[function(require,module,exports){
// 20.1.2.12 Number.parseFloat(string)
var $export = require('./$.export');

$export($export.S, 'Number', {parseFloat: parseFloat});
},{"./$.export":68}],169:[function(require,module,exports){
// 20.1.2.13 Number.parseInt(string, radix)
var $export = require('./$.export');

$export($export.S, 'Number', {parseInt: parseInt});
},{"./$.export":68}],170:[function(require,module,exports){
// 19.1.3.1 Object.assign(target, source)
var $export = require('./$.export');

$export($export.S + $export.F, 'Object', {assign: require('./$.object-assign')});
},{"./$.export":68,"./$.object-assign":99}],171:[function(require,module,exports){
// 19.1.2.5 Object.freeze(O)
var isObject = require('./$.is-object');

require('./$.object-sap')('freeze', function($freeze){
  return function freeze(it){
    return $freeze && isObject(it) ? $freeze(it) : it;
  };
});
},{"./$.is-object":84,"./$.object-sap":100}],172:[function(require,module,exports){
// 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
var toIObject = require('./$.to-iobject');

require('./$.object-sap')('getOwnPropertyDescriptor', function($getOwnPropertyDescriptor){
  return function getOwnPropertyDescriptor(it, key){
    return $getOwnPropertyDescriptor(toIObject(it), key);
  };
});
},{"./$.object-sap":100,"./$.to-iobject":124}],173:[function(require,module,exports){
// 19.1.2.7 Object.getOwnPropertyNames(O)
require('./$.object-sap')('getOwnPropertyNames', function(){
  return require('./$.get-names').get;
});
},{"./$.get-names":74,"./$.object-sap":100}],174:[function(require,module,exports){
// 19.1.2.9 Object.getPrototypeOf(O)
var toObject = require('./$.to-object');

require('./$.object-sap')('getPrototypeOf', function($getPrototypeOf){
  return function getPrototypeOf(it){
    return $getPrototypeOf(toObject(it));
  };
});
},{"./$.object-sap":100,"./$.to-object":126}],175:[function(require,module,exports){
// 19.1.2.11 Object.isExtensible(O)
var isObject = require('./$.is-object');

require('./$.object-sap')('isExtensible', function($isExtensible){
  return function isExtensible(it){
    return isObject(it) ? $isExtensible ? $isExtensible(it) : true : false;
  };
});
},{"./$.is-object":84,"./$.object-sap":100}],176:[function(require,module,exports){
// 19.1.2.12 Object.isFrozen(O)
var isObject = require('./$.is-object');

require('./$.object-sap')('isFrozen', function($isFrozen){
  return function isFrozen(it){
    return isObject(it) ? $isFrozen ? $isFrozen(it) : false : true;
  };
});
},{"./$.is-object":84,"./$.object-sap":100}],177:[function(require,module,exports){
// 19.1.2.13 Object.isSealed(O)
var isObject = require('./$.is-object');

require('./$.object-sap')('isSealed', function($isSealed){
  return function isSealed(it){
    return isObject(it) ? $isSealed ? $isSealed(it) : false : true;
  };
});
},{"./$.is-object":84,"./$.object-sap":100}],178:[function(require,module,exports){
// 19.1.3.10 Object.is(value1, value2)
var $export = require('./$.export');
$export($export.S, 'Object', {is: require('./$.same-value')});
},{"./$.export":68,"./$.same-value":109}],179:[function(require,module,exports){
// 19.1.2.14 Object.keys(O)
var toObject = require('./$.to-object');

require('./$.object-sap')('keys', function($keys){
  return function keys(it){
    return $keys(toObject(it));
  };
});
},{"./$.object-sap":100,"./$.to-object":126}],180:[function(require,module,exports){
// 19.1.2.15 Object.preventExtensions(O)
var isObject = require('./$.is-object');

require('./$.object-sap')('preventExtensions', function($preventExtensions){
  return function preventExtensions(it){
    return $preventExtensions && isObject(it) ? $preventExtensions(it) : it;
  };
});
},{"./$.is-object":84,"./$.object-sap":100}],181:[function(require,module,exports){
// 19.1.2.17 Object.seal(O)
var isObject = require('./$.is-object');

require('./$.object-sap')('seal', function($seal){
  return function seal(it){
    return $seal && isObject(it) ? $seal(it) : it;
  };
});
},{"./$.is-object":84,"./$.object-sap":100}],182:[function(require,module,exports){
// 19.1.3.19 Object.setPrototypeOf(O, proto)
var $export = require('./$.export');
$export($export.S, 'Object', {setPrototypeOf: require('./$.set-proto').set});
},{"./$.export":68,"./$.set-proto":110}],183:[function(require,module,exports){
'use strict';
// 19.1.3.6 Object.prototype.toString()
var classof = require('./$.classof')
  , test    = {};
test[require('./$.wks')('toStringTag')] = 'z';
if(test + '' != '[object z]'){
  require('./$.redefine')(Object.prototype, 'toString', function toString(){
    return '[object ' + classof(this) + ']';
  }, true);
}
},{"./$.classof":56,"./$.redefine":107,"./$.wks":129}],184:[function(require,module,exports){
'use strict';
var $          = require('./$')
  , LIBRARY    = require('./$.library')
  , global     = require('./$.global')
  , ctx        = require('./$.ctx')
  , classof    = require('./$.classof')
  , $export    = require('./$.export')
  , isObject   = require('./$.is-object')
  , anObject   = require('./$.an-object')
  , aFunction  = require('./$.a-function')
  , strictNew  = require('./$.strict-new')
  , forOf      = require('./$.for-of')
  , setProto   = require('./$.set-proto').set
  , same       = require('./$.same-value')
  , SPECIES    = require('./$.wks')('species')
  , speciesConstructor = require('./$.species-constructor')
  , asap       = require('./$.microtask')
  , PROMISE    = 'Promise'
  , process    = global.process
  , isNode     = classof(process) == 'process'
  , P          = global[PROMISE]
  , Wrapper;

var testResolve = function(sub){
  var test = new P(function(){});
  if(sub)test.constructor = Object;
  return P.resolve(test) === test;
};

var USE_NATIVE = function(){
  var works = false;
  function P2(x){
    var self = new P(x);
    setProto(self, P2.prototype);
    return self;
  }
  try {
    works = P && P.resolve && testResolve();
    setProto(P2, P);
    P2.prototype = $.create(P.prototype, {constructor: {value: P2}});
    // actual Firefox has broken subclass support, test that
    if(!(P2.resolve(5).then(function(){}) instanceof P2)){
      works = false;
    }
    // actual V8 bug, https://code.google.com/p/v8/issues/detail?id=4162
    if(works && require('./$.descriptors')){
      var thenableThenGotten = false;
      P.resolve($.setDesc({}, 'then', {
        get: function(){ thenableThenGotten = true; }
      }));
      works = thenableThenGotten;
    }
  } catch(e){ works = false; }
  return works;
}();

// helpers
var sameConstructor = function(a, b){
  // library wrapper special case
  if(LIBRARY && a === P && b === Wrapper)return true;
  return same(a, b);
};
var getConstructor = function(C){
  var S = anObject(C)[SPECIES];
  return S != undefined ? S : C;
};
var isThenable = function(it){
  var then;
  return isObject(it) && typeof (then = it.then) == 'function' ? then : false;
};
var PromiseCapability = function(C){
  var resolve, reject;
  this.promise = new C(function($$resolve, $$reject){
    if(resolve !== undefined || reject !== undefined)throw TypeError('Bad Promise constructor');
    resolve = $$resolve;
    reject  = $$reject;
  });
  this.resolve = aFunction(resolve),
  this.reject  = aFunction(reject)
};
var perform = function(exec){
  try {
    exec();
  } catch(e){
    return {error: e};
  }
};
var notify = function(record, isReject){
  if(record.n)return;
  record.n = true;
  var chain = record.c;
  asap(function(){
    var value = record.v
      , ok    = record.s == 1
      , i     = 0;
    var run = function(reaction){
      var handler = ok ? reaction.ok : reaction.fail
        , resolve = reaction.resolve
        , reject  = reaction.reject
        , result, then;
      try {
        if(handler){
          if(!ok)record.h = true;
          result = handler === true ? value : handler(value);
          if(result === reaction.promise){
            reject(TypeError('Promise-chain cycle'));
          } else if(then = isThenable(result)){
            then.call(result, resolve, reject);
          } else resolve(result);
        } else reject(value);
      } catch(e){
        reject(e);
      }
    };
    while(chain.length > i)run(chain[i++]); // variable length - can't use forEach
    chain.length = 0;
    record.n = false;
    if(isReject)setTimeout(function(){
      var promise = record.p
        , handler, console;
      if(isUnhandled(promise)){
        if(isNode){
          process.emit('unhandledRejection', value, promise);
        } else if(handler = global.onunhandledrejection){
          handler({promise: promise, reason: value});
        } else if((console = global.console) && console.error){
          console.error('Unhandled promise rejection', value);
        }
      } record.a = undefined;
    }, 1);
  });
};
var isUnhandled = function(promise){
  var record = promise._d
    , chain  = record.a || record.c
    , i      = 0
    , reaction;
  if(record.h)return false;
  while(chain.length > i){
    reaction = chain[i++];
    if(reaction.fail || !isUnhandled(reaction.promise))return false;
  } return true;
};
var $reject = function(value){
  var record = this;
  if(record.d)return;
  record.d = true;
  record = record.r || record; // unwrap
  record.v = value;
  record.s = 2;
  record.a = record.c.slice();
  notify(record, true);
};
var $resolve = function(value){
  var record = this
    , then;
  if(record.d)return;
  record.d = true;
  record = record.r || record; // unwrap
  try {
    if(record.p === value)throw TypeError("Promise can't be resolved itself");
    if(then = isThenable(value)){
      asap(function(){
        var wrapper = {r: record, d: false}; // wrap
        try {
          then.call(value, ctx($resolve, wrapper, 1), ctx($reject, wrapper, 1));
        } catch(e){
          $reject.call(wrapper, e);
        }
      });
    } else {
      record.v = value;
      record.s = 1;
      notify(record, false);
    }
  } catch(e){
    $reject.call({r: record, d: false}, e); // wrap
  }
};

// constructor polyfill
if(!USE_NATIVE){
  // 25.4.3.1 Promise(executor)
  P = function Promise(executor){
    aFunction(executor);
    var record = this._d = {
      p: strictNew(this, P, PROMISE),         // <- promise
      c: [],                                  // <- awaiting reactions
      a: undefined,                           // <- checked in isUnhandled reactions
      s: 0,                                   // <- state
      d: false,                               // <- done
      v: undefined,                           // <- value
      h: false,                               // <- handled rejection
      n: false                                // <- notify
    };
    try {
      executor(ctx($resolve, record, 1), ctx($reject, record, 1));
    } catch(err){
      $reject.call(record, err);
    }
  };
  require('./$.redefine-all')(P.prototype, {
    // 25.4.5.3 Promise.prototype.then(onFulfilled, onRejected)
    then: function then(onFulfilled, onRejected){
      var reaction = new PromiseCapability(speciesConstructor(this, P))
        , promise  = reaction.promise
        , record   = this._d;
      reaction.ok   = typeof onFulfilled == 'function' ? onFulfilled : true;
      reaction.fail = typeof onRejected == 'function' && onRejected;
      record.c.push(reaction);
      if(record.a)record.a.push(reaction);
      if(record.s)notify(record, false);
      return promise;
    },
    // 25.4.5.1 Promise.prototype.catch(onRejected)
    'catch': function(onRejected){
      return this.then(undefined, onRejected);
    }
  });
}

$export($export.G + $export.W + $export.F * !USE_NATIVE, {Promise: P});
require('./$.set-to-string-tag')(P, PROMISE);
require('./$.set-species')(PROMISE);
Wrapper = require('./$.core')[PROMISE];

// statics
$export($export.S + $export.F * !USE_NATIVE, PROMISE, {
  // 25.4.4.5 Promise.reject(r)
  reject: function reject(r){
    var capability = new PromiseCapability(this)
      , $$reject   = capability.reject;
    $$reject(r);
    return capability.promise;
  }
});
$export($export.S + $export.F * (!USE_NATIVE || testResolve(true)), PROMISE, {
  // 25.4.4.6 Promise.resolve(x)
  resolve: function resolve(x){
    // instanceof instead of internal slot check because we should fix it without replacement native Promise core
    if(x instanceof P && sameConstructor(x.constructor, this))return x;
    var capability = new PromiseCapability(this)
      , $$resolve  = capability.resolve;
    $$resolve(x);
    return capability.promise;
  }
});
$export($export.S + $export.F * !(USE_NATIVE && require('./$.iter-detect')(function(iter){
  P.all(iter)['catch'](function(){});
})), PROMISE, {
  // 25.4.4.1 Promise.all(iterable)
  all: function all(iterable){
    var C          = getConstructor(this)
      , capability = new PromiseCapability(C)
      , resolve    = capability.resolve
      , reject     = capability.reject
      , values     = [];
    var abrupt = perform(function(){
      forOf(iterable, false, values.push, values);
      var remaining = values.length
        , results   = Array(remaining);
      if(remaining)$.each.call(values, function(promise, index){
        var alreadyCalled = false;
        C.resolve(promise).then(function(value){
          if(alreadyCalled)return;
          alreadyCalled = true;
          results[index] = value;
          --remaining || resolve(results);
        }, reject);
      });
      else resolve(results);
    });
    if(abrupt)reject(abrupt.error);
    return capability.promise;
  },
  // 25.4.4.4 Promise.race(iterable)
  race: function race(iterable){
    var C          = getConstructor(this)
      , capability = new PromiseCapability(C)
      , reject     = capability.reject;
    var abrupt = perform(function(){
      forOf(iterable, false, function(promise){
        C.resolve(promise).then(capability.resolve, reject);
      });
    });
    if(abrupt)reject(abrupt.error);
    return capability.promise;
  }
});
},{"./$":92,"./$.a-function":48,"./$.an-object":50,"./$.classof":56,"./$.core":62,"./$.ctx":63,"./$.descriptors":65,"./$.export":68,"./$.for-of":73,"./$.global":75,"./$.is-object":84,"./$.iter-detect":89,"./$.library":94,"./$.microtask":98,"./$.redefine-all":106,"./$.same-value":109,"./$.set-proto":110,"./$.set-species":111,"./$.set-to-string-tag":112,"./$.species-constructor":114,"./$.strict-new":115,"./$.wks":129}],185:[function(require,module,exports){
// 26.1.1 Reflect.apply(target, thisArgument, argumentsList)
var $export = require('./$.export')
  , _apply  = Function.apply;

$export($export.S, 'Reflect', {
  apply: function apply(target, thisArgument, argumentsList){
    return _apply.call(target, thisArgument, argumentsList);
  }
});
},{"./$.export":68}],186:[function(require,module,exports){
// 26.1.2 Reflect.construct(target, argumentsList [, newTarget])
var $         = require('./$')
  , $export   = require('./$.export')
  , aFunction = require('./$.a-function')
  , anObject  = require('./$.an-object')
  , isObject  = require('./$.is-object')
  , bind      = Function.bind || require('./$.core').Function.prototype.bind;

// MS Edge supports only 2 arguments
// FF Nightly sets third argument as `new.target`, but does not create `this` from it
$export($export.S + $export.F * require('./$.fails')(function(){
  function F(){}
  return !(Reflect.construct(function(){}, [], F) instanceof F);
}), 'Reflect', {
  construct: function construct(Target, args /*, newTarget*/){
    aFunction(Target);
    var newTarget = arguments.length < 3 ? Target : aFunction(arguments[2]);
    if(Target == newTarget){
      // w/o altered newTarget, optimization for 0-4 arguments
      if(args != undefined)switch(anObject(args).length){
        case 0: return new Target;
        case 1: return new Target(args[0]);
        case 2: return new Target(args[0], args[1]);
        case 3: return new Target(args[0], args[1], args[2]);
        case 4: return new Target(args[0], args[1], args[2], args[3]);
      }
      // w/o altered newTarget, lot of arguments case
      var $args = [null];
      $args.push.apply($args, args);
      return new (bind.apply(Target, $args));
    }
    // with altered newTarget, not support built-in constructors
    var proto    = newTarget.prototype
      , instance = $.create(isObject(proto) ? proto : Object.prototype)
      , result   = Function.apply.call(Target, instance, args);
    return isObject(result) ? result : instance;
  }
});
},{"./$":92,"./$.a-function":48,"./$.an-object":50,"./$.core":62,"./$.export":68,"./$.fails":70,"./$.is-object":84}],187:[function(require,module,exports){
// 26.1.3 Reflect.defineProperty(target, propertyKey, attributes)
var $        = require('./$')
  , $export  = require('./$.export')
  , anObject = require('./$.an-object');

// MS Edge has broken Reflect.defineProperty - throwing instead of returning false
$export($export.S + $export.F * require('./$.fails')(function(){
  Reflect.defineProperty($.setDesc({}, 1, {value: 1}), 1, {value: 2});
}), 'Reflect', {
  defineProperty: function defineProperty(target, propertyKey, attributes){
    anObject(target);
    try {
      $.setDesc(target, propertyKey, attributes);
      return true;
    } catch(e){
      return false;
    }
  }
});
},{"./$":92,"./$.an-object":50,"./$.export":68,"./$.fails":70}],188:[function(require,module,exports){
// 26.1.4 Reflect.deleteProperty(target, propertyKey)
var $export  = require('./$.export')
  , getDesc  = require('./$').getDesc
  , anObject = require('./$.an-object');

$export($export.S, 'Reflect', {
  deleteProperty: function deleteProperty(target, propertyKey){
    var desc = getDesc(anObject(target), propertyKey);
    return desc && !desc.configurable ? false : delete target[propertyKey];
  }
});
},{"./$":92,"./$.an-object":50,"./$.export":68}],189:[function(require,module,exports){
'use strict';
// 26.1.5 Reflect.enumerate(target)
var $export  = require('./$.export')
  , anObject = require('./$.an-object');
var Enumerate = function(iterated){
  this._t = anObject(iterated); // target
  this._i = 0;                  // next index
  var keys = this._k = []       // keys
    , key;
  for(key in iterated)keys.push(key);
};
require('./$.iter-create')(Enumerate, 'Object', function(){
  var that = this
    , keys = that._k
    , key;
  do {
    if(that._i >= keys.length)return {value: undefined, done: true};
  } while(!((key = keys[that._i++]) in that._t));
  return {value: key, done: false};
});

$export($export.S, 'Reflect', {
  enumerate: function enumerate(target){
    return new Enumerate(target);
  }
});
},{"./$.an-object":50,"./$.export":68,"./$.iter-create":87}],190:[function(require,module,exports){
// 26.1.7 Reflect.getOwnPropertyDescriptor(target, propertyKey)
var $        = require('./$')
  , $export  = require('./$.export')
  , anObject = require('./$.an-object');

$export($export.S, 'Reflect', {
  getOwnPropertyDescriptor: function getOwnPropertyDescriptor(target, propertyKey){
    return $.getDesc(anObject(target), propertyKey);
  }
});
},{"./$":92,"./$.an-object":50,"./$.export":68}],191:[function(require,module,exports){
// 26.1.8 Reflect.getPrototypeOf(target)
var $export  = require('./$.export')
  , getProto = require('./$').getProto
  , anObject = require('./$.an-object');

$export($export.S, 'Reflect', {
  getPrototypeOf: function getPrototypeOf(target){
    return getProto(anObject(target));
  }
});
},{"./$":92,"./$.an-object":50,"./$.export":68}],192:[function(require,module,exports){
// 26.1.6 Reflect.get(target, propertyKey [, receiver])
var $        = require('./$')
  , has      = require('./$.has')
  , $export  = require('./$.export')
  , isObject = require('./$.is-object')
  , anObject = require('./$.an-object');

function get(target, propertyKey/*, receiver*/){
  var receiver = arguments.length < 3 ? target : arguments[2]
    , desc, proto;
  if(anObject(target) === receiver)return target[propertyKey];
  if(desc = $.getDesc(target, propertyKey))return has(desc, 'value')
    ? desc.value
    : desc.get !== undefined
      ? desc.get.call(receiver)
      : undefined;
  if(isObject(proto = $.getProto(target)))return get(proto, propertyKey, receiver);
}

$export($export.S, 'Reflect', {get: get});
},{"./$":92,"./$.an-object":50,"./$.export":68,"./$.has":76,"./$.is-object":84}],193:[function(require,module,exports){
// 26.1.9 Reflect.has(target, propertyKey)
var $export = require('./$.export');

$export($export.S, 'Reflect', {
  has: function has(target, propertyKey){
    return propertyKey in target;
  }
});
},{"./$.export":68}],194:[function(require,module,exports){
// 26.1.10 Reflect.isExtensible(target)
var $export       = require('./$.export')
  , anObject      = require('./$.an-object')
  , $isExtensible = Object.isExtensible;

$export($export.S, 'Reflect', {
  isExtensible: function isExtensible(target){
    anObject(target);
    return $isExtensible ? $isExtensible(target) : true;
  }
});
},{"./$.an-object":50,"./$.export":68}],195:[function(require,module,exports){
// 26.1.11 Reflect.ownKeys(target)
var $export = require('./$.export');

$export($export.S, 'Reflect', {ownKeys: require('./$.own-keys')});
},{"./$.export":68,"./$.own-keys":102}],196:[function(require,module,exports){
// 26.1.12 Reflect.preventExtensions(target)
var $export            = require('./$.export')
  , anObject           = require('./$.an-object')
  , $preventExtensions = Object.preventExtensions;

$export($export.S, 'Reflect', {
  preventExtensions: function preventExtensions(target){
    anObject(target);
    try {
      if($preventExtensions)$preventExtensions(target);
      return true;
    } catch(e){
      return false;
    }
  }
});
},{"./$.an-object":50,"./$.export":68}],197:[function(require,module,exports){
// 26.1.14 Reflect.setPrototypeOf(target, proto)
var $export  = require('./$.export')
  , setProto = require('./$.set-proto');

if(setProto)$export($export.S, 'Reflect', {
  setPrototypeOf: function setPrototypeOf(target, proto){
    setProto.check(target, proto);
    try {
      setProto.set(target, proto);
      return true;
    } catch(e){
      return false;
    }
  }
});
},{"./$.export":68,"./$.set-proto":110}],198:[function(require,module,exports){
// 26.1.13 Reflect.set(target, propertyKey, V [, receiver])
var $          = require('./$')
  , has        = require('./$.has')
  , $export    = require('./$.export')
  , createDesc = require('./$.property-desc')
  , anObject   = require('./$.an-object')
  , isObject   = require('./$.is-object');

function set(target, propertyKey, V/*, receiver*/){
  var receiver = arguments.length < 4 ? target : arguments[3]
    , ownDesc  = $.getDesc(anObject(target), propertyKey)
    , existingDescriptor, proto;
  if(!ownDesc){
    if(isObject(proto = $.getProto(target))){
      return set(proto, propertyKey, V, receiver);
    }
    ownDesc = createDesc(0);
  }
  if(has(ownDesc, 'value')){
    if(ownDesc.writable === false || !isObject(receiver))return false;
    existingDescriptor = $.getDesc(receiver, propertyKey) || createDesc(0);
    existingDescriptor.value = V;
    $.setDesc(receiver, propertyKey, existingDescriptor);
    return true;
  }
  return ownDesc.set === undefined ? false : (ownDesc.set.call(receiver, V), true);
}

$export($export.S, 'Reflect', {set: set});
},{"./$":92,"./$.an-object":50,"./$.export":68,"./$.has":76,"./$.is-object":84,"./$.property-desc":105}],199:[function(require,module,exports){
var $        = require('./$')
  , global   = require('./$.global')
  , isRegExp = require('./$.is-regexp')
  , $flags   = require('./$.flags')
  , $RegExp  = global.RegExp
  , Base     = $RegExp
  , proto    = $RegExp.prototype
  , re1      = /a/g
  , re2      = /a/g
  // "new" creates a new object, old webkit buggy here
  , CORRECT_NEW = new $RegExp(re1) !== re1;

if(require('./$.descriptors') && (!CORRECT_NEW || require('./$.fails')(function(){
  re2[require('./$.wks')('match')] = false;
  // RegExp constructor can alter flags and IsRegExp works correct with @@match
  return $RegExp(re1) != re1 || $RegExp(re2) == re2 || $RegExp(re1, 'i') != '/a/i';
}))){
  $RegExp = function RegExp(p, f){
    var piRE = isRegExp(p)
      , fiU  = f === undefined;
    return !(this instanceof $RegExp) && piRE && p.constructor === $RegExp && fiU ? p
      : CORRECT_NEW
        ? new Base(piRE && !fiU ? p.source : p, f)
        : Base((piRE = p instanceof $RegExp) ? p.source : p, piRE && fiU ? $flags.call(p) : f);
  };
  $.each.call($.getNames(Base), function(key){
    key in $RegExp || $.setDesc($RegExp, key, {
      configurable: true,
      get: function(){ return Base[key]; },
      set: function(it){ Base[key] = it; }
    });
  });
  proto.constructor = $RegExp;
  $RegExp.prototype = proto;
  require('./$.redefine')(global, 'RegExp', $RegExp);
}

require('./$.set-species')('RegExp');
},{"./$":92,"./$.descriptors":65,"./$.fails":70,"./$.flags":72,"./$.global":75,"./$.is-regexp":85,"./$.redefine":107,"./$.set-species":111,"./$.wks":129}],200:[function(require,module,exports){
// 21.2.5.3 get RegExp.prototype.flags()
var $ = require('./$');
if(require('./$.descriptors') && /./g.flags != 'g')$.setDesc(RegExp.prototype, 'flags', {
  configurable: true,
  get: require('./$.flags')
});
},{"./$":92,"./$.descriptors":65,"./$.flags":72}],201:[function(require,module,exports){
// @@match logic
require('./$.fix-re-wks')('match', 1, function(defined, MATCH){
  // 21.1.3.11 String.prototype.match(regexp)
  return function match(regexp){
    'use strict';
    var O  = defined(this)
      , fn = regexp == undefined ? undefined : regexp[MATCH];
    return fn !== undefined ? fn.call(regexp, O) : new RegExp(regexp)[MATCH](String(O));
  };
});
},{"./$.fix-re-wks":71}],202:[function(require,module,exports){
// @@replace logic
require('./$.fix-re-wks')('replace', 2, function(defined, REPLACE, $replace){
  // 21.1.3.14 String.prototype.replace(searchValue, replaceValue)
  return function replace(searchValue, replaceValue){
    'use strict';
    var O  = defined(this)
      , fn = searchValue == undefined ? undefined : searchValue[REPLACE];
    return fn !== undefined
      ? fn.call(searchValue, O, replaceValue)
      : $replace.call(String(O), searchValue, replaceValue);
  };
});
},{"./$.fix-re-wks":71}],203:[function(require,module,exports){
// @@search logic
require('./$.fix-re-wks')('search', 1, function(defined, SEARCH){
  // 21.1.3.15 String.prototype.search(regexp)
  return function search(regexp){
    'use strict';
    var O  = defined(this)
      , fn = regexp == undefined ? undefined : regexp[SEARCH];
    return fn !== undefined ? fn.call(regexp, O) : new RegExp(regexp)[SEARCH](String(O));
  };
});
},{"./$.fix-re-wks":71}],204:[function(require,module,exports){
// @@split logic
require('./$.fix-re-wks')('split', 2, function(defined, SPLIT, $split){
  // 21.1.3.17 String.prototype.split(separator, limit)
  return function split(separator, limit){
    'use strict';
    var O  = defined(this)
      , fn = separator == undefined ? undefined : separator[SPLIT];
    return fn !== undefined
      ? fn.call(separator, O, limit)
      : $split.call(String(O), separator, limit);
  };
});
},{"./$.fix-re-wks":71}],205:[function(require,module,exports){
'use strict';
var strong = require('./$.collection-strong');

// 23.2 Set Objects
require('./$.collection')('Set', function(get){
  return function Set(){ return get(this, arguments.length > 0 ? arguments[0] : undefined); };
}, {
  // 23.2.3.1 Set.prototype.add(value)
  add: function add(value){
    return strong.def(this, value = value === 0 ? 0 : value, value);
  }
}, strong);
},{"./$.collection":61,"./$.collection-strong":58}],206:[function(require,module,exports){
'use strict';
var $export = require('./$.export')
  , $at     = require('./$.string-at')(false);
$export($export.P, 'String', {
  // 21.1.3.3 String.prototype.codePointAt(pos)
  codePointAt: function codePointAt(pos){
    return $at(this, pos);
  }
});
},{"./$.export":68,"./$.string-at":116}],207:[function(require,module,exports){
// 21.1.3.6 String.prototype.endsWith(searchString [, endPosition])
'use strict';
var $export   = require('./$.export')
  , toLength  = require('./$.to-length')
  , context   = require('./$.string-context')
  , ENDS_WITH = 'endsWith'
  , $endsWith = ''[ENDS_WITH];

$export($export.P + $export.F * require('./$.fails-is-regexp')(ENDS_WITH), 'String', {
  endsWith: function endsWith(searchString /*, endPosition = @length */){
    var that = context(this, searchString, ENDS_WITH)
      , $$   = arguments
      , endPosition = $$.length > 1 ? $$[1] : undefined
      , len    = toLength(that.length)
      , end    = endPosition === undefined ? len : Math.min(toLength(endPosition), len)
      , search = String(searchString);
    return $endsWith
      ? $endsWith.call(that, search, end)
      : that.slice(end - search.length, end) === search;
  }
});
},{"./$.export":68,"./$.fails-is-regexp":69,"./$.string-context":117,"./$.to-length":125}],208:[function(require,module,exports){
var $export        = require('./$.export')
  , toIndex        = require('./$.to-index')
  , fromCharCode   = String.fromCharCode
  , $fromCodePoint = String.fromCodePoint;

// length should be 1, old FF problem
$export($export.S + $export.F * (!!$fromCodePoint && $fromCodePoint.length != 1), 'String', {
  // 21.1.2.2 String.fromCodePoint(...codePoints)
  fromCodePoint: function fromCodePoint(x){ // eslint-disable-line no-unused-vars
    var res   = []
      , $$    = arguments
      , $$len = $$.length
      , i     = 0
      , code;
    while($$len > i){
      code = +$$[i++];
      if(toIndex(code, 0x10ffff) !== code)throw RangeError(code + ' is not a valid code point');
      res.push(code < 0x10000
        ? fromCharCode(code)
        : fromCharCode(((code -= 0x10000) >> 10) + 0xd800, code % 0x400 + 0xdc00)
      );
    } return res.join('');
  }
});
},{"./$.export":68,"./$.to-index":122}],209:[function(require,module,exports){
// 21.1.3.7 String.prototype.includes(searchString, position = 0)
'use strict';
var $export  = require('./$.export')
  , context  = require('./$.string-context')
  , INCLUDES = 'includes';

$export($export.P + $export.F * require('./$.fails-is-regexp')(INCLUDES), 'String', {
  includes: function includes(searchString /*, position = 0 */){
    return !!~context(this, searchString, INCLUDES)
      .indexOf(searchString, arguments.length > 1 ? arguments[1] : undefined);
  }
});
},{"./$.export":68,"./$.fails-is-regexp":69,"./$.string-context":117}],210:[function(require,module,exports){
'use strict';
var $at  = require('./$.string-at')(true);

// 21.1.3.27 String.prototype[@@iterator]()
require('./$.iter-define')(String, 'String', function(iterated){
  this._t = String(iterated); // target
  this._i = 0;                // next index
// 21.1.5.2.1 %StringIteratorPrototype%.next()
}, function(){
  var O     = this._t
    , index = this._i
    , point;
  if(index >= O.length)return {value: undefined, done: true};
  point = $at(O, index);
  this._i += point.length;
  return {value: point, done: false};
});
},{"./$.iter-define":88,"./$.string-at":116}],211:[function(require,module,exports){
var $export   = require('./$.export')
  , toIObject = require('./$.to-iobject')
  , toLength  = require('./$.to-length');

$export($export.S, 'String', {
  // 21.1.2.4 String.raw(callSite, ...substitutions)
  raw: function raw(callSite){
    var tpl   = toIObject(callSite.raw)
      , len   = toLength(tpl.length)
      , $$    = arguments
      , $$len = $$.length
      , res   = []
      , i     = 0;
    while(len > i){
      res.push(String(tpl[i++]));
      if(i < $$len)res.push(String($$[i]));
    } return res.join('');
  }
});
},{"./$.export":68,"./$.to-iobject":124,"./$.to-length":125}],212:[function(require,module,exports){
var $export = require('./$.export');

$export($export.P, 'String', {
  // 21.1.3.13 String.prototype.repeat(count)
  repeat: require('./$.string-repeat')
});
},{"./$.export":68,"./$.string-repeat":119}],213:[function(require,module,exports){
// 21.1.3.18 String.prototype.startsWith(searchString [, position ])
'use strict';
var $export     = require('./$.export')
  , toLength    = require('./$.to-length')
  , context     = require('./$.string-context')
  , STARTS_WITH = 'startsWith'
  , $startsWith = ''[STARTS_WITH];

$export($export.P + $export.F * require('./$.fails-is-regexp')(STARTS_WITH), 'String', {
  startsWith: function startsWith(searchString /*, position = 0 */){
    var that   = context(this, searchString, STARTS_WITH)
      , $$     = arguments
      , index  = toLength(Math.min($$.length > 1 ? $$[1] : undefined, that.length))
      , search = String(searchString);
    return $startsWith
      ? $startsWith.call(that, search, index)
      : that.slice(index, index + search.length) === search;
  }
});
},{"./$.export":68,"./$.fails-is-regexp":69,"./$.string-context":117,"./$.to-length":125}],214:[function(require,module,exports){
'use strict';
// 21.1.3.25 String.prototype.trim()
require('./$.string-trim')('trim', function($trim){
  return function trim(){
    return $trim(this, 3);
  };
});
},{"./$.string-trim":120}],215:[function(require,module,exports){
'use strict';
// ECMAScript 6 symbols shim
var $              = require('./$')
  , global         = require('./$.global')
  , has            = require('./$.has')
  , DESCRIPTORS    = require('./$.descriptors')
  , $export        = require('./$.export')
  , redefine       = require('./$.redefine')
  , $fails         = require('./$.fails')
  , shared         = require('./$.shared')
  , setToStringTag = require('./$.set-to-string-tag')
  , uid            = require('./$.uid')
  , wks            = require('./$.wks')
  , keyOf          = require('./$.keyof')
  , $names         = require('./$.get-names')
  , enumKeys       = require('./$.enum-keys')
  , isArray        = require('./$.is-array')
  , anObject       = require('./$.an-object')
  , toIObject      = require('./$.to-iobject')
  , createDesc     = require('./$.property-desc')
  , getDesc        = $.getDesc
  , setDesc        = $.setDesc
  , _create        = $.create
  , getNames       = $names.get
  , $Symbol        = global.Symbol
  , $JSON          = global.JSON
  , _stringify     = $JSON && $JSON.stringify
  , setter         = false
  , HIDDEN         = wks('_hidden')
  , isEnum         = $.isEnum
  , SymbolRegistry = shared('symbol-registry')
  , AllSymbols     = shared('symbols')
  , useNative      = typeof $Symbol == 'function'
  , ObjectProto    = Object.prototype;

// fallback for old Android, https://code.google.com/p/v8/issues/detail?id=687
var setSymbolDesc = DESCRIPTORS && $fails(function(){
  return _create(setDesc({}, 'a', {
    get: function(){ return setDesc(this, 'a', {value: 7}).a; }
  })).a != 7;
}) ? function(it, key, D){
  var protoDesc = getDesc(ObjectProto, key);
  if(protoDesc)delete ObjectProto[key];
  setDesc(it, key, D);
  if(protoDesc && it !== ObjectProto)setDesc(ObjectProto, key, protoDesc);
} : setDesc;

var wrap = function(tag){
  var sym = AllSymbols[tag] = _create($Symbol.prototype);
  sym._k = tag;
  DESCRIPTORS && setter && setSymbolDesc(ObjectProto, tag, {
    configurable: true,
    set: function(value){
      if(has(this, HIDDEN) && has(this[HIDDEN], tag))this[HIDDEN][tag] = false;
      setSymbolDesc(this, tag, createDesc(1, value));
    }
  });
  return sym;
};

var isSymbol = function(it){
  return typeof it == 'symbol';
};

var $defineProperty = function defineProperty(it, key, D){
  if(D && has(AllSymbols, key)){
    if(!D.enumerable){
      if(!has(it, HIDDEN))setDesc(it, HIDDEN, createDesc(1, {}));
      it[HIDDEN][key] = true;
    } else {
      if(has(it, HIDDEN) && it[HIDDEN][key])it[HIDDEN][key] = false;
      D = _create(D, {enumerable: createDesc(0, false)});
    } return setSymbolDesc(it, key, D);
  } return setDesc(it, key, D);
};
var $defineProperties = function defineProperties(it, P){
  anObject(it);
  var keys = enumKeys(P = toIObject(P))
    , i    = 0
    , l = keys.length
    , key;
  while(l > i)$defineProperty(it, key = keys[i++], P[key]);
  return it;
};
var $create = function create(it, P){
  return P === undefined ? _create(it) : $defineProperties(_create(it), P);
};
var $propertyIsEnumerable = function propertyIsEnumerable(key){
  var E = isEnum.call(this, key);
  return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key]
    ? E : true;
};
var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(it, key){
  var D = getDesc(it = toIObject(it), key);
  if(D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key]))D.enumerable = true;
  return D;
};
var $getOwnPropertyNames = function getOwnPropertyNames(it){
  var names  = getNames(toIObject(it))
    , result = []
    , i      = 0
    , key;
  while(names.length > i)if(!has(AllSymbols, key = names[i++]) && key != HIDDEN)result.push(key);
  return result;
};
var $getOwnPropertySymbols = function getOwnPropertySymbols(it){
  var names  = getNames(toIObject(it))
    , result = []
    , i      = 0
    , key;
  while(names.length > i)if(has(AllSymbols, key = names[i++]))result.push(AllSymbols[key]);
  return result;
};
var $stringify = function stringify(it){
  if(it === undefined || isSymbol(it))return; // IE8 returns string on undefined
  var args = [it]
    , i    = 1
    , $$   = arguments
    , replacer, $replacer;
  while($$.length > i)args.push($$[i++]);
  replacer = args[1];
  if(typeof replacer == 'function')$replacer = replacer;
  if($replacer || !isArray(replacer))replacer = function(key, value){
    if($replacer)value = $replacer.call(this, key, value);
    if(!isSymbol(value))return value;
  };
  args[1] = replacer;
  return _stringify.apply($JSON, args);
};
var buggyJSON = $fails(function(){
  var S = $Symbol();
  // MS Edge converts symbol values to JSON as {}
  // WebKit converts symbol values to JSON as null
  // V8 throws on boxed symbols
  return _stringify([S]) != '[null]' || _stringify({a: S}) != '{}' || _stringify(Object(S)) != '{}';
});

// 19.4.1.1 Symbol([description])
if(!useNative){
  $Symbol = function Symbol(){
    if(isSymbol(this))throw TypeError('Symbol is not a constructor');
    return wrap(uid(arguments.length > 0 ? arguments[0] : undefined));
  };
  redefine($Symbol.prototype, 'toString', function toString(){
    return this._k;
  });

  isSymbol = function(it){
    return it instanceof $Symbol;
  };

  $.create     = $create;
  $.isEnum     = $propertyIsEnumerable;
  $.getDesc    = $getOwnPropertyDescriptor;
  $.setDesc    = $defineProperty;
  $.setDescs   = $defineProperties;
  $.getNames   = $names.get = $getOwnPropertyNames;
  $.getSymbols = $getOwnPropertySymbols;

  if(DESCRIPTORS && !require('./$.library')){
    redefine(ObjectProto, 'propertyIsEnumerable', $propertyIsEnumerable, true);
  }
}

var symbolStatics = {
  // 19.4.2.1 Symbol.for(key)
  'for': function(key){
    return has(SymbolRegistry, key += '')
      ? SymbolRegistry[key]
      : SymbolRegistry[key] = $Symbol(key);
  },
  // 19.4.2.5 Symbol.keyFor(sym)
  keyFor: function keyFor(key){
    return keyOf(SymbolRegistry, key);
  },
  useSetter: function(){ setter = true; },
  useSimple: function(){ setter = false; }
};
// 19.4.2.2 Symbol.hasInstance
// 19.4.2.3 Symbol.isConcatSpreadable
// 19.4.2.4 Symbol.iterator
// 19.4.2.6 Symbol.match
// 19.4.2.8 Symbol.replace
// 19.4.2.9 Symbol.search
// 19.4.2.10 Symbol.species
// 19.4.2.11 Symbol.split
// 19.4.2.12 Symbol.toPrimitive
// 19.4.2.13 Symbol.toStringTag
// 19.4.2.14 Symbol.unscopables
$.each.call((
  'hasInstance,isConcatSpreadable,iterator,match,replace,search,' +
  'species,split,toPrimitive,toStringTag,unscopables'
).split(','), function(it){
  var sym = wks(it);
  symbolStatics[it] = useNative ? sym : wrap(sym);
});

setter = true;

$export($export.G + $export.W, {Symbol: $Symbol});

$export($export.S, 'Symbol', symbolStatics);

$export($export.S + $export.F * !useNative, 'Object', {
  // 19.1.2.2 Object.create(O [, Properties])
  create: $create,
  // 19.1.2.4 Object.defineProperty(O, P, Attributes)
  defineProperty: $defineProperty,
  // 19.1.2.3 Object.defineProperties(O, Properties)
  defineProperties: $defineProperties,
  // 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
  getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
  // 19.1.2.7 Object.getOwnPropertyNames(O)
  getOwnPropertyNames: $getOwnPropertyNames,
  // 19.1.2.8 Object.getOwnPropertySymbols(O)
  getOwnPropertySymbols: $getOwnPropertySymbols
});

// 24.3.2 JSON.stringify(value [, replacer [, space]])
$JSON && $export($export.S + $export.F * (!useNative || buggyJSON), 'JSON', {stringify: $stringify});

// 19.4.3.5 Symbol.prototype[@@toStringTag]
setToStringTag($Symbol, 'Symbol');
// 20.2.1.9 Math[@@toStringTag]
setToStringTag(Math, 'Math', true);
// 24.3.3 JSON[@@toStringTag]
setToStringTag(global.JSON, 'JSON', true);
},{"./$":92,"./$.an-object":50,"./$.descriptors":65,"./$.enum-keys":67,"./$.export":68,"./$.fails":70,"./$.get-names":74,"./$.global":75,"./$.has":76,"./$.is-array":82,"./$.keyof":93,"./$.library":94,"./$.property-desc":105,"./$.redefine":107,"./$.set-to-string-tag":112,"./$.shared":113,"./$.to-iobject":124,"./$.uid":128,"./$.wks":129}],216:[function(require,module,exports){
'use strict';
var $            = require('./$')
  , redefine     = require('./$.redefine')
  , weak         = require('./$.collection-weak')
  , isObject     = require('./$.is-object')
  , has          = require('./$.has')
  , frozenStore  = weak.frozenStore
  , WEAK         = weak.WEAK
  , isExtensible = Object.isExtensible || isObject
  , tmp          = {};

// 23.3 WeakMap Objects
var $WeakMap = require('./$.collection')('WeakMap', function(get){
  return function WeakMap(){ return get(this, arguments.length > 0 ? arguments[0] : undefined); };
}, {
  // 23.3.3.3 WeakMap.prototype.get(key)
  get: function get(key){
    if(isObject(key)){
      if(!isExtensible(key))return frozenStore(this).get(key);
      if(has(key, WEAK))return key[WEAK][this._i];
    }
  },
  // 23.3.3.5 WeakMap.prototype.set(key, value)
  set: function set(key, value){
    return weak.def(this, key, value);
  }
}, weak, true, true);

// IE11 WeakMap frozen keys fix
if(new $WeakMap().set((Object.freeze || Object)(tmp), 7).get(tmp) != 7){
  $.each.call(['delete', 'has', 'get', 'set'], function(key){
    var proto  = $WeakMap.prototype
      , method = proto[key];
    redefine(proto, key, function(a, b){
      // store frozen objects on leaky map
      if(isObject(a) && !isExtensible(a)){
        var result = frozenStore(this)[key](a, b);
        return key == 'set' ? this : result;
      // store all the rest on native weakmap
      } return method.call(this, a, b);
    });
  });
}
},{"./$":92,"./$.collection":61,"./$.collection-weak":60,"./$.has":76,"./$.is-object":84,"./$.redefine":107}],217:[function(require,module,exports){
'use strict';
var weak = require('./$.collection-weak');

// 23.4 WeakSet Objects
require('./$.collection')('WeakSet', function(get){
  return function WeakSet(){ return get(this, arguments.length > 0 ? arguments[0] : undefined); };
}, {
  // 23.4.3.1 WeakSet.prototype.add(value)
  add: function add(value){
    return weak.def(this, value, true);
  }
}, weak, false, true);
},{"./$.collection":61,"./$.collection-weak":60}],218:[function(require,module,exports){
'use strict';
var $export   = require('./$.export')
  , $includes = require('./$.array-includes')(true);

$export($export.P, 'Array', {
  // https://github.com/domenic/Array.prototype.includes
  includes: function includes(el /*, fromIndex = 0 */){
    return $includes(this, el, arguments.length > 1 ? arguments[1] : undefined);
  }
});

require('./$.add-to-unscopables')('includes');
},{"./$.add-to-unscopables":49,"./$.array-includes":53,"./$.export":68}],219:[function(require,module,exports){
// https://github.com/DavidBruant/Map-Set.prototype.toJSON
var $export  = require('./$.export');

$export($export.P, 'Map', {toJSON: require('./$.collection-to-json')('Map')});
},{"./$.collection-to-json":59,"./$.export":68}],220:[function(require,module,exports){
// http://goo.gl/XkBrjD
var $export  = require('./$.export')
  , $entries = require('./$.object-to-array')(true);

$export($export.S, 'Object', {
  entries: function entries(it){
    return $entries(it);
  }
});
},{"./$.export":68,"./$.object-to-array":101}],221:[function(require,module,exports){
// https://gist.github.com/WebReflection/9353781
var $          = require('./$')
  , $export    = require('./$.export')
  , ownKeys    = require('./$.own-keys')
  , toIObject  = require('./$.to-iobject')
  , createDesc = require('./$.property-desc');

$export($export.S, 'Object', {
  getOwnPropertyDescriptors: function getOwnPropertyDescriptors(object){
    var O       = toIObject(object)
      , setDesc = $.setDesc
      , getDesc = $.getDesc
      , keys    = ownKeys(O)
      , result  = {}
      , i       = 0
      , key, D;
    while(keys.length > i){
      D = getDesc(O, key = keys[i++]);
      if(key in result)setDesc(result, key, createDesc(0, D));
      else result[key] = D;
    } return result;
  }
});
},{"./$":92,"./$.export":68,"./$.own-keys":102,"./$.property-desc":105,"./$.to-iobject":124}],222:[function(require,module,exports){
// http://goo.gl/XkBrjD
var $export = require('./$.export')
  , $values = require('./$.object-to-array')(false);

$export($export.S, 'Object', {
  values: function values(it){
    return $values(it);
  }
});
},{"./$.export":68,"./$.object-to-array":101}],223:[function(require,module,exports){
// https://github.com/benjamingr/RexExp.escape
var $export = require('./$.export')
  , $re     = require('./$.replacer')(/[\\^$*+?.()|[\]{}]/g, '\\$&');

$export($export.S, 'RegExp', {escape: function escape(it){ return $re(it); }});

},{"./$.export":68,"./$.replacer":108}],224:[function(require,module,exports){
// https://github.com/DavidBruant/Map-Set.prototype.toJSON
var $export  = require('./$.export');

$export($export.P, 'Set', {toJSON: require('./$.collection-to-json')('Set')});
},{"./$.collection-to-json":59,"./$.export":68}],225:[function(require,module,exports){
'use strict';
// https://github.com/mathiasbynens/String.prototype.at
var $export = require('./$.export')
  , $at     = require('./$.string-at')(true);

$export($export.P, 'String', {
  at: function at(pos){
    return $at(this, pos);
  }
});
},{"./$.export":68,"./$.string-at":116}],226:[function(require,module,exports){
'use strict';
var $export = require('./$.export')
  , $pad    = require('./$.string-pad');

$export($export.P, 'String', {
  padLeft: function padLeft(maxLength /*, fillString = ' ' */){
    return $pad(this, maxLength, arguments.length > 1 ? arguments[1] : undefined, true);
  }
});
},{"./$.export":68,"./$.string-pad":118}],227:[function(require,module,exports){
'use strict';
var $export = require('./$.export')
  , $pad    = require('./$.string-pad');

$export($export.P, 'String', {
  padRight: function padRight(maxLength /*, fillString = ' ' */){
    return $pad(this, maxLength, arguments.length > 1 ? arguments[1] : undefined, false);
  }
});
},{"./$.export":68,"./$.string-pad":118}],228:[function(require,module,exports){
'use strict';
// https://github.com/sebmarkbage/ecmascript-string-left-right-trim
require('./$.string-trim')('trimLeft', function($trim){
  return function trimLeft(){
    return $trim(this, 1);
  };
});
},{"./$.string-trim":120}],229:[function(require,module,exports){
'use strict';
// https://github.com/sebmarkbage/ecmascript-string-left-right-trim
require('./$.string-trim')('trimRight', function($trim){
  return function trimRight(){
    return $trim(this, 2);
  };
});
},{"./$.string-trim":120}],230:[function(require,module,exports){
// JavaScript 1.6 / Strawman array statics shim
var $       = require('./$')
  , $export = require('./$.export')
  , $ctx    = require('./$.ctx')
  , $Array  = require('./$.core').Array || Array
  , statics = {};
var setStatics = function(keys, length){
  $.each.call(keys.split(','), function(key){
    if(length == undefined && key in $Array)statics[key] = $Array[key];
    else if(key in [])statics[key] = $ctx(Function.call, [][key], length);
  });
};
setStatics('pop,reverse,shift,keys,values,entries', 1);
setStatics('indexOf,every,some,forEach,map,filter,find,findIndex,includes', 3);
setStatics('join,slice,concat,push,splice,unshift,sort,lastIndexOf,' +
           'reduce,reduceRight,copyWithin,fill');
$export($export.S, 'Array', statics);
},{"./$":92,"./$.core":62,"./$.ctx":63,"./$.export":68}],231:[function(require,module,exports){
require('./es6.array.iterator');
var global      = require('./$.global')
  , hide        = require('./$.hide')
  , Iterators   = require('./$.iterators')
  , ITERATOR    = require('./$.wks')('iterator')
  , NL          = global.NodeList
  , HTC         = global.HTMLCollection
  , NLProto     = NL && NL.prototype
  , HTCProto    = HTC && HTC.prototype
  , ArrayValues = Iterators.NodeList = Iterators.HTMLCollection = Iterators.Array;
if(NLProto && !NLProto[ITERATOR])hide(NLProto, ITERATOR, ArrayValues);
if(HTCProto && !HTCProto[ITERATOR])hide(HTCProto, ITERATOR, ArrayValues);
},{"./$.global":75,"./$.hide":77,"./$.iterators":91,"./$.wks":129,"./es6.array.iterator":137}],232:[function(require,module,exports){
var $export = require('./$.export')
  , $task   = require('./$.task');
$export($export.G + $export.B, {
  setImmediate:   $task.set,
  clearImmediate: $task.clear
});
},{"./$.export":68,"./$.task":121}],233:[function(require,module,exports){
// ie9- setTimeout & setInterval additional parameters fix
var global     = require('./$.global')
  , $export    = require('./$.export')
  , invoke     = require('./$.invoke')
  , partial    = require('./$.partial')
  , navigator  = global.navigator
  , MSIE       = !!navigator && /MSIE .\./.test(navigator.userAgent); // <- dirty ie9- check
var wrap = function(set){
  return MSIE ? function(fn, time /*, ...args */){
    return set(invoke(
      partial,
      [].slice.call(arguments, 2),
      typeof fn == 'function' ? fn : Function(fn)
    ), time);
  } : set;
};
$export($export.G + $export.B + $export.F * MSIE, {
  setTimeout:  wrap(global.setTimeout),
  setInterval: wrap(global.setInterval)
});
},{"./$.export":68,"./$.global":75,"./$.invoke":79,"./$.partial":103}],234:[function(require,module,exports){
require('./modules/es5');
require('./modules/es6.symbol');
require('./modules/es6.object.assign');
require('./modules/es6.object.is');
require('./modules/es6.object.set-prototype-of');
require('./modules/es6.object.to-string');
require('./modules/es6.object.freeze');
require('./modules/es6.object.seal');
require('./modules/es6.object.prevent-extensions');
require('./modules/es6.object.is-frozen');
require('./modules/es6.object.is-sealed');
require('./modules/es6.object.is-extensible');
require('./modules/es6.object.get-own-property-descriptor');
require('./modules/es6.object.get-prototype-of');
require('./modules/es6.object.keys');
require('./modules/es6.object.get-own-property-names');
require('./modules/es6.function.name');
require('./modules/es6.function.has-instance');
require('./modules/es6.number.constructor');
require('./modules/es6.number.epsilon');
require('./modules/es6.number.is-finite');
require('./modules/es6.number.is-integer');
require('./modules/es6.number.is-nan');
require('./modules/es6.number.is-safe-integer');
require('./modules/es6.number.max-safe-integer');
require('./modules/es6.number.min-safe-integer');
require('./modules/es6.number.parse-float');
require('./modules/es6.number.parse-int');
require('./modules/es6.math.acosh');
require('./modules/es6.math.asinh');
require('./modules/es6.math.atanh');
require('./modules/es6.math.cbrt');
require('./modules/es6.math.clz32');
require('./modules/es6.math.cosh');
require('./modules/es6.math.expm1');
require('./modules/es6.math.fround');
require('./modules/es6.math.hypot');
require('./modules/es6.math.imul');
require('./modules/es6.math.log10');
require('./modules/es6.math.log1p');
require('./modules/es6.math.log2');
require('./modules/es6.math.sign');
require('./modules/es6.math.sinh');
require('./modules/es6.math.tanh');
require('./modules/es6.math.trunc');
require('./modules/es6.string.from-code-point');
require('./modules/es6.string.raw');
require('./modules/es6.string.trim');
require('./modules/es6.string.iterator');
require('./modules/es6.string.code-point-at');
require('./modules/es6.string.ends-with');
require('./modules/es6.string.includes');
require('./modules/es6.string.repeat');
require('./modules/es6.string.starts-with');
require('./modules/es6.array.from');
require('./modules/es6.array.of');
require('./modules/es6.array.iterator');
require('./modules/es6.array.species');
require('./modules/es6.array.copy-within');
require('./modules/es6.array.fill');
require('./modules/es6.array.find');
require('./modules/es6.array.find-index');
require('./modules/es6.regexp.constructor');
require('./modules/es6.regexp.flags');
require('./modules/es6.regexp.match');
require('./modules/es6.regexp.replace');
require('./modules/es6.regexp.search');
require('./modules/es6.regexp.split');
require('./modules/es6.promise');
require('./modules/es6.map');
require('./modules/es6.set');
require('./modules/es6.weak-map');
require('./modules/es6.weak-set');
require('./modules/es6.reflect.apply');
require('./modules/es6.reflect.construct');
require('./modules/es6.reflect.define-property');
require('./modules/es6.reflect.delete-property');
require('./modules/es6.reflect.enumerate');
require('./modules/es6.reflect.get');
require('./modules/es6.reflect.get-own-property-descriptor');
require('./modules/es6.reflect.get-prototype-of');
require('./modules/es6.reflect.has');
require('./modules/es6.reflect.is-extensible');
require('./modules/es6.reflect.own-keys');
require('./modules/es6.reflect.prevent-extensions');
require('./modules/es6.reflect.set');
require('./modules/es6.reflect.set-prototype-of');
require('./modules/es7.array.includes');
require('./modules/es7.string.at');
require('./modules/es7.string.pad-left');
require('./modules/es7.string.pad-right');
require('./modules/es7.string.trim-left');
require('./modules/es7.string.trim-right');
require('./modules/es7.regexp.escape');
require('./modules/es7.object.get-own-property-descriptors');
require('./modules/es7.object.values');
require('./modules/es7.object.entries');
require('./modules/es7.map.to-json');
require('./modules/es7.set.to-json');
require('./modules/js.array.statics');
require('./modules/web.timers');
require('./modules/web.immediate');
require('./modules/web.dom.iterable');
module.exports = require('./modules/$.core');
},{"./modules/$.core":62,"./modules/es5":131,"./modules/es6.array.copy-within":132,"./modules/es6.array.fill":133,"./modules/es6.array.find":135,"./modules/es6.array.find-index":134,"./modules/es6.array.from":136,"./modules/es6.array.iterator":137,"./modules/es6.array.of":138,"./modules/es6.array.species":139,"./modules/es6.function.has-instance":140,"./modules/es6.function.name":141,"./modules/es6.map":142,"./modules/es6.math.acosh":143,"./modules/es6.math.asinh":144,"./modules/es6.math.atanh":145,"./modules/es6.math.cbrt":146,"./modules/es6.math.clz32":147,"./modules/es6.math.cosh":148,"./modules/es6.math.expm1":149,"./modules/es6.math.fround":150,"./modules/es6.math.hypot":151,"./modules/es6.math.imul":152,"./modules/es6.math.log10":153,"./modules/es6.math.log1p":154,"./modules/es6.math.log2":155,"./modules/es6.math.sign":156,"./modules/es6.math.sinh":157,"./modules/es6.math.tanh":158,"./modules/es6.math.trunc":159,"./modules/es6.number.constructor":160,"./modules/es6.number.epsilon":161,"./modules/es6.number.is-finite":162,"./modules/es6.number.is-integer":163,"./modules/es6.number.is-nan":164,"./modules/es6.number.is-safe-integer":165,"./modules/es6.number.max-safe-integer":166,"./modules/es6.number.min-safe-integer":167,"./modules/es6.number.parse-float":168,"./modules/es6.number.parse-int":169,"./modules/es6.object.assign":170,"./modules/es6.object.freeze":171,"./modules/es6.object.get-own-property-descriptor":172,"./modules/es6.object.get-own-property-names":173,"./modules/es6.object.get-prototype-of":174,"./modules/es6.object.is":178,"./modules/es6.object.is-extensible":175,"./modules/es6.object.is-frozen":176,"./modules/es6.object.is-sealed":177,"./modules/es6.object.keys":179,"./modules/es6.object.prevent-extensions":180,"./modules/es6.object.seal":181,"./modules/es6.object.set-prototype-of":182,"./modules/es6.object.to-string":183,"./modules/es6.promise":184,"./modules/es6.reflect.apply":185,"./modules/es6.reflect.construct":186,"./modules/es6.reflect.define-property":187,"./modules/es6.reflect.delete-property":188,"./modules/es6.reflect.enumerate":189,"./modules/es6.reflect.get":192,"./modules/es6.reflect.get-own-property-descriptor":190,"./modules/es6.reflect.get-prototype-of":191,"./modules/es6.reflect.has":193,"./modules/es6.reflect.is-extensible":194,"./modules/es6.reflect.own-keys":195,"./modules/es6.reflect.prevent-extensions":196,"./modules/es6.reflect.set":198,"./modules/es6.reflect.set-prototype-of":197,"./modules/es6.regexp.constructor":199,"./modules/es6.regexp.flags":200,"./modules/es6.regexp.match":201,"./modules/es6.regexp.replace":202,"./modules/es6.regexp.search":203,"./modules/es6.regexp.split":204,"./modules/es6.set":205,"./modules/es6.string.code-point-at":206,"./modules/es6.string.ends-with":207,"./modules/es6.string.from-code-point":208,"./modules/es6.string.includes":209,"./modules/es6.string.iterator":210,"./modules/es6.string.raw":211,"./modules/es6.string.repeat":212,"./modules/es6.string.starts-with":213,"./modules/es6.string.trim":214,"./modules/es6.symbol":215,"./modules/es6.weak-map":216,"./modules/es6.weak-set":217,"./modules/es7.array.includes":218,"./modules/es7.map.to-json":219,"./modules/es7.object.entries":220,"./modules/es7.object.get-own-property-descriptors":221,"./modules/es7.object.values":222,"./modules/es7.regexp.escape":223,"./modules/es7.set.to-json":224,"./modules/es7.string.at":225,"./modules/es7.string.pad-left":226,"./modules/es7.string.pad-right":227,"./modules/es7.string.trim-left":228,"./modules/es7.string.trim-right":229,"./modules/js.array.statics":230,"./modules/web.dom.iterable":231,"./modules/web.immediate":232,"./modules/web.timers":233}],235:[function(require,module,exports){
var Anim = {
  Tween:require('./dhaak-tween.js'),
  Timeline:require('./dhaak-timeline.js'),
  Easing: require('penner')
};

module.exports = Anim;

},{"./dhaak-timeline.js":236,"./dhaak-tween.js":238,"penner":312}],236:[function(require,module,exports){
var _ = require("underscore");
var Tween = require('./dhaak-tween.js');

var TweenManager = require('./dhaak-tween-manager.js');
var round = Math.round;

var Timeline = function( options ){
  this.init( options );
};

// References the tween class
var proto = Timeline.prototype = new Tween();

proto.init = function( options ){
  this._type = 'timeline';
  this._tweens = [];

  this._tail = null;
  this._head = null;

  this._currentTween = null;
  this._previousTween = null;
  this._nextTween = null;

  //this._currentTweenIdx = 0;
  this._numTweens = 0;

  this._tween = null;
  this._delta = 0;
  this._previousTime = 0;
  this._startTime = 0;

  this._duration = 0;
  this._percentComplete = 0;
  this._manager = TweenManager;

  this._loop = false;

  if (options) this._setupWithOptions( options );
  this._setupMainTween();
};

proto._addTween = function( tween ){
  var _prevTweenEnd = (this._numTweens > 0) ? this._tweens[this._numTweens-1].end : 0;

  var tweenReference = {
    start: _prevTweenEnd + tween.delay,
    end: _prevTweenEnd + tween.duration + tween.delay,
    tween: tween
  }


  this._tweens.push(tweenReference);
  this._setDuration();
  this._numTweens++;
};

proto._setupMainTween = function(){
  var options = {
    node:this,
    easing:require('penner').linear,
    onUpdate:this.onUpdate.bind(this),
    onBegin:this.onBegin,
    onEnd:this.onEnd.bind(this),
    curve:[0,1]
  }

  this._setOptions(options);
};

proto._setupWithOptions = function( options ){
  for(var key in options){
    this[key] = options[key];
  }
};

proto._getTweenAtTime = function(time){
  var i; len = this._tweens.length;


  for( i = 0; i < len; ++i ){
    var _t =  this._tweens[i];
    if(time > _t.start && time < _t.end){
      if (!_t.isPaused){
/*
        if (this._tweens.indexOf(_t) !== this._currentTweenIdx){
          this._previousTweenIdx = this._currentTweenIdx || 0;

          var _prevTween = this._tweens[this._previousTweenIdx];
          var _tmp = _prevTween.tween;
        }
*/
        //this._currentTweenIdx = this._tweens.indexOf(_t);

        return this._tweens[ this._tweens.indexOf(_t) ];
      }
    }
  }
};

proto._setDuration = function(){
  var i, tmpDuration = 0, len = this._tweens.length;

  for(i = 0; i < len; ++i){
    tmpDuration += this._tweens[i].tween.duration + this._tweens[i].tween.delay;
  }

  this.duration = this._duration = tmpDuration;

  this.setDuration(this.duration);
};

/*
 * Overwritten method
 */

proto.start = function(){
  //if ( !this._currentTween) this._currentTween = this._tweens[0];
  //this._currentTween.play();
  this.play();
};

proto.addTweens = function( tweens ){
  var i; len = tweens.length;

  for(i = 0; i < len; ++i){
    this._addTween(tweens[i])
  }
};

proto.addTweenAt = function(tween, idx){};
proto.removeTween = function( tween ){};

proto.loop = function( bool ){
  this._loop = bool;
  return this;
};

  // EVENTS
proto.onBegin = function(){};
proto.onEnd = function(){
  //this._tweens[this._tweens.length - 1]._stop();

  if(this._loop){
    setTimeout(function(){
        for( var _t in this._tweens ){
          this._tweens[_t].tween.reverse();
        }

        this.reverse();
        this.play();
      }.bind(this),
    1);
    }
};

proto.onUpdate = function(c){
  this._currentTime = c * this.duration;

  var _tweenReference = this._getTweenAtTime(round(this._currentTime));

  if(_tweenReference){
    var _tween = _tweenReference.tween;
    var _inputTime = this._t - _tweenReference.start;

    console.log(this._t);
    _tween.inputTime = _inputTime;

    _tween._step(_inputTime);
  }
};

module.exports = Timeline;

},{"./dhaak-tween-manager.js":237,"./dhaak-tween.js":238,"penner":312,"underscore":364}],237:[function(require,module,exports){
var TweenManager = {
  // PROPERTIES
  _tweens:[],
  _timelines:[],

  // METHODS
  init:function(){},
  add:function(){},
  delete:function(){},
  update:function(){},

  // EVENTS
  onTweenComplete:function(){},
  onTimelineComplete:function(){}
};


module.exports = TweenManager;

},{}],238:[function(require,module,exports){
/**
 *    @constructor
 *    @description A lightweight <b>Tween</b> class independant of Third Party libraries (aside from Robert Penner's easing functions). The engine has Paul Irish's
 *    requestAnimFrame shim built in allowing for consistent animations across browsers and devices.
 *    <br>
 *    @example
 *    <b><u>Properties Example</b></u>
 *
 *    var tween = new Tween();
 *    target = document.getElementById("target");
 *
 *    var propertyOptions = {
 *       node: target,
 *       duration: 1000,
 *       properties:{height:{start:300, end:4000, unit:"px"},
 *                   width:{start:200, end:3000, unit:"px"}},
 *    }
 *
 *    tween.to(propertyOptions);
 *    @link <a href="../examples/PropertyExample.html">Property Example</a>
 *    @link <a href="../examples/CurveExample.html">Curve Example</a>
 *    @link <a href="../examples/LineExample.html">Line Example</a>
 *
 *    @example
 *
 *
 *    <b><u>Curve Example</b></u>
 *
 *    var tween = new Tween();
 *    target = document.getElementById("target");
 *
 *    var curveOptions = {
 *       node: target,
 *       duration: 1000,
 *       curve:[0, 100],
 *       onUpdate:function(c){
 *        this.node.style.width = c + "px"
 *    }
 *
 *    tween.to(curveOptions);
 *    @example
 *
 *
 *    <b><u>Line Example</b></u>
 *
 *    var tween = new Tween();
 *    target = document.getElementById("target");
 *
 *    var lineOptions = {
 *       node: target,
 *       duration: 1000,
 *       curve:new Line([0, 0],[100,200]),
 *       onUpdate:function(c){
 *        this.node.style.width = c[0] + "px"
 *        this.node.style.left = c[1] + "px"
 *       }
 *    }
 *
 *    tween.to(lineOptions);
 *
 *
 *    @property {function} onEnd A function to be called at the end of the Tween.
 *    @property {function} onBegin A function to be called at the beginning of the Tween.
 *    @property {function} onUpdate A function to be called at every step of the Tween.
 *    @property {number} delay The delay before the  Tween starts.
 *    @property {boolean} isAnimating (read-only) Boolean determining if the Tween is in animating state.
 *    @property {boolean} isReversed (read-only) Boolean determining if the Tween is reversed.
 *    @property {boolean} isPaused (read-only) Boolean determining if the Tween is in the paused state.
 *    @property {number} percentage (read-only) The percentage of the Tween's completion.
 *    @property {object} properties The properties object which is used to create the motion objects.
 *    @property {array} _curve The curves object which is used to create the motion objects.
 *    @property {function} easing The easing function to be used for the tween.
 *    @property {object} node An object which the Tween will animate.
 *    @property {number} duration The duration of the tween (in milliseconds).
 *    @property {number} _previousTime (read-only) The previous time from the last step.
 *    @property {number} _currentTime (read-only) The current time for the current step.
 *    @property {number} _startTime (read-only) The initial start time for the tween.
 *    @property {number} _delta (read-only) The difference between the last and first step.
 *    @property {number} _t (read-only) The time value to pass to the easing function.
 *    @property {array}  _motionStack (read-only) The motion objects which will be tweened.
 */

var Tween = function( options ){
  this.onEnd = null;
  this.onBegin = null;
  this.onUpdate = null;
  this.delay = 0;
  this.node = null;
  this.duration = 0;
  this.isAnimating = false;
  this.isReversed = false;
  this.isPaused = false;
  this.properties = null;
  this._curve = [0, 1];
  this.overshoot = 0;
  this._manager = require('./dhaak-tween-manager.js');
  this.easing = function(t, b, c, d){
    return c*t/d + b;
  };
  this._previousTime = null;
  this._currentTime = null;
  this._startTime = 0;
  this._endTime = null;
  this._delta = null;
  this._t = 0;
  this._motionStack = null;
  this.options = options;
  this.measurements = null;
  this.timelineProperties = [];

  if (options) this._setOptions(options);

  return this;
}

Tween.prototype = {
   _callbacks:{
      onEnd:[],
      onBegin:[],
      onComplete:[]
   },
   _setOptions:function(options){
      for(var key in options){
        if (key === 'curve'){
          this._curve = options[key];
        }

        this[key] = options[key];
      }

      this._endTime = this.duration;
      // Grab the motion objects
      if (this._motionStack == null){
        this._motionStack = [];
        if (this.properties != null) {
          this._setMotionFromProperty();
        }else{
          this._setMotionFromCurve();
        }
      }
   },
   /**
    * Private method which creates a MotionObject based on the curves set in the Tween Options before the start of the tween.
    * @private  {object}    Tween._setMotionFromCurve
    * @property {object}
    *
   */
   _setMotionFromCurve:function(){
    var c = this._curve;

    if (c instanceof Tween.Line !== true){
      var _mo = new MotionObject();
      _mo.d = this.duration;
      _mo.b = c[0];
      _mo.c = c[1] - c[0];
      this._motionStack.push(_mo);
    }else{
        var _c1 = c.curves[0];
        var _c2 = c.curves[1];

        var len = _c1.length;

        for (var i = 0; i < len; ++i){
          var _mo = new MotionObject();

          _mo.b = _c1[i];
          _mo.c = _c2[i] - _c1[i];
          this._motionStack.push(_mo);
        }
      }
  },

  /**
   *  Private method which creates a MotionObject based on the property Object passed in
   *  @private {object}     Tween._setMotionFromProperty
   *  @param   {object}     properties           The properties object which should contain standard CSS properties.
   *
   */

   _setMotionFromProperty:function(){
         // Each object in the properties object should be a CSS style
           for(var property in this.properties){
              var _mo = new MotionObject();
              _mo.prop = property;
              var _property = this.properties[property];
              // If this is an object parse
              // // TODO: webkit, color tranforms: further detection and proceeding parsing
              //
              if (typeof _property == "object"){
                for(var _p in _property){
                  switch(_p){
                    case (_p == "begin"): _mo.b = _property[_p];
                    case (_p == "end"): {_mo.c = _property[_p] - _mo.b;}
                    case (_p == "unit"): _mo.unit = _property[_p];
                  }
                 }
              // If not use the value as the end
              }else{
                 this.change = _property - this.begin;
              }

              this._motionStack.push(_mo);
           }
   },

  /**
   * Starts the tween according to the delay if any
   * @private {object}    Tween._start
   *
   */

   _start:function(){
    var self = this; // Self reference for the delay setTimeout callback

    this._currentTime = 0;
    this._startTime = this.delay;
    this._endTime = (this.delay == 0) ? this.duration : this.duration;

    this._previousTime = Date.now();
    this.isAnimating = true;

    this._t = (this.isReversed == true) ? this._endTime : 0;
    var self = this;
    setTimeout(function(){self._update();}, this.delay);
   },

  /**
   * Steps the tween
   * @private {object}    Tween._step
   *
   */

   _step:function( timeToAdvance ){
        if ( timeToAdvance ) this._t = timeToAdvance;
        // Get the current time
        this._currentTime = Date.now();
        // Get the difference between the current time and the last time
        if (this._t < 17 && this.onBegin !== null && !this.isReversed) this.onBegin();
        else if( this.isReversed && this.onBegin !== null && this._t > this.duration - 16) this.onBegin();

        this._delta = this._currentTime - this._previousTime;
        // Bottleneck the difference if it is too high
        this._delta = Math.min(this._delta, 16);

        var offsetTime = (this.offsetTime) ? this.offsetTime : this._t + this._delta;

        // If we are moving forward
        if (!this.isReversed){
            // If the time and the difference is less than the duration
            if ( offsetTime < this._endTime ){
                // Add this and the adjusted frame step to the tween value
                if (!timeToAdvance) this._t = this._delta + this._t;
                // Continue to the next step
                this._setProperties();
            // If we are at the end of the tween
            }else{
                // Set the tween value to the final step
                this._t = this.duration;
                // End the tween
                this._stop();
            }
        // If we are moving in reverse
        }else{
             // If the tween value is greater than the start (0)
             if (this._t - this._delta > 0){
              // Tween value minus the adjusted frame step or the beginning value
              this._t = (this._t - this._delta > 0) ? this._t - this._delta : 0;
              // Continue to the next step
              //this.animationFrame = window.requestAnimationFrame(this._update.bind(this));
              this._setProperties();
            }else{
              this._stop();
            }
          }
        // If there is an onUpdate callback
        // Change the time
        this._previousTime = this._currentTime;

    },

  /**
   * Stops the tween
   * @private {object}    Tween._stop
   *
   */
   _setProperties:function(){
     //if(!this._motionStack) return;
      // Iterate through the motion stack to get all our motion objects
     var i, len = this._motionStack.length;

      for (i = 0; i < len; ++i){
          // Assign a temporary motion object
          var motionObject = this._motionStack[i];
          // If it has a property value
          if (motionObject.prop != null){
              // Assign the value to the tween return value
              this.node.style[motionObject.prop] = this.easing( this._t, motionObject.b, motionObject.c, this._endTime) + motionObject.unit;
              // If there is an onUpdate function return the tween with a beginning of 0 and an end of 1
              if (this.onUpdate != null) var c = this.easing( this._t, 0, 1, this.duration);
          // If there is no property value and only a curve value
          }else{
              // If we only have one curve
              if(this._motionStack.length == 1){
                  // Assign the onUpdate parameter to the one curve
                  var c = this.easing( this._t, motionObject.b, motionObject.c, this.duration);
              // If there are multiple curves
              }else{
                  // Assign the onUpdate parameter to an empty array
                  var c = [];
                  // Iterate through the motionObjects
                  for (var motionObject in this._motionStack){
                      var _m = this._motionStack[motionObject];
                      // Add the return paramater to the array
                      c.push(this.easing( this._t, _m.b, _m.c, this.duration));
                  }
              }
           }
           //c = Math.min(Math.max(0, c), 1);
           if (this.onUpdate != null) this.onUpdate(c);
        }
   },
  /**
   * Stops the tween
   * @private {object}    Tween._stop
   *
   */

   _stop:function(){
    this.isAnimating = false;
    this.isCompleted = true;

    window.cancelAnimationFrame(this.animationFrame);

    this._t = (this.isReversed) ? 0 : this.duration;
    this._setProperties();

    if (this.onEnd != null && !this.isPaused) this.onEnd();
   },

  /**
   * Updates the tween
   * @private {object}    Tween._update
   *
   */

   _update:function(time){
    var self = this;

    // Synchronizes the time
    if (time) {
      this._t = time;
    }

    if (this.isAnimating == true) this.animationFrame = window.requestAnimFrame(this._update.bind(this, time));
    self._step();
   },

  /**
   * Reverses the tween
   * @public {object}    Tween.reverse
   *
   */

   reverse:function(){
     this.isReversed = !this.isReversed;
     return this;
   },

  /**
   * Checks to see if the tween is paused. If so, resumes the tween.
   * @public {object}    Tween.resume
   *
   */

   resume:function(){
     if (!this.isPaused) return;
     // Reset our time settings
     this._delta = 0;
     this._previousTime = Date.now();
     // Set our properties
     this.isPaused = false;
     this.isAnimating = true;
     // Resume the tween
     this._update();
   },

  /**
   * the user can manually add a wait method to a tween which would delay the
   * progress mid-tween
   * @public {object}    Tween.wait
   *
   */


  /**
   * Pauses the tween
   * @public {object}    Tween.pause
   *
   */

   pause:function(){
     // No need to pause a stopped tween
     if (this.isAnimating == false) return;
     // Set the properties
     this.isAnimating = false;
     this.isPaused = true;
     this._step();
   },

  /**
   * Initializes the tween animation.
   * @public {object}    Tween.play
   * @param {object} options The options object.
   * @example
   * var options = {
   *  node:this,
   *  duration:100,
   *  properties:{width:400}
   * }
   *
   * tween.play(options)
   */

   play:function(options){
      //setup options
      if(options){
        // Iterate through the options
        for (var key in options){
          // Assign our properties
          this[key] = options[key];
        }
      }
      // Grab the motion objects
      if (this._motionStack == null){
        this._motionStack = [];
        if (this.properties != null) {
          this._setMotionFromProperty();
        }else{
          this._setMotionFromCurve();
        }
      }

      // Let her rip
      this._start();

      return this;
    },
    // method to flatten timeline
    // @TODO
    flattenTimeline: function(){
      var arr = [];

      return arr;
    },

    recordMeasurements: function(){
    },

    // functional methods
    update: function( cb ){
      this.onUpdate = cb;
      return this;
    },

    begin:function( fn ){
      this.onBegin = fn;
      return this;
    },

    end:function( fn ){
      this.onEnd = fn;
      return this;
    },

    ease: function(ease){
      this.ease = ease;
      return this;
    },

    clone: function(){
      return new Tween(this.options);
    },

    startTime : function( time ){
      this._startTime = time;
      return this;
    },

    curve:function(curve){
      this._curve = curve;
      this._motionStack = [];
      this._setMotionFromCurve(curve);
      return this;
    },

    setDuration:function( duration ){
      this.duration = this._endTime = this._duration = duration;
      return this;
    },

    getCurrentFrame:function(){
      return Math.ceil((this._t / this.duration) * this._getTotalFrames());
    },

    _getTotalFrames: function(){
      // Add 2 frames for beginning and end
      return ((this.duration/1000)*60)+2;
    }
}
/**
  Create a MotionObject which the Tween Engine uses to modify a given value
  @constructor
  @property {number} b          the begin value for the tween
  @property {number} c          the change value for the tween
  @property {number} t          the time value for the tween
  @property {string} prop       the property which the tween manipulates (if any)
  @property {string} unit       the unit which determines the scale of the property (if any)
*/

function MotionObject(){
  this.b = 0; this.c; this.t; this.prop = null; this.unit = "";
}

/**
  Create a Line Object or an array containing an array of start values and an array of end values
  @constructor
  @param {array} a              an Array of start points
  @param {array} b              an Array of end points
*/

Tween.Line = function(a, b){
  if (a.length != b.length) throw new Error("Uneven Amount of Lines " + a.length + " != " + b.length);
  this.curves = [a, b];
}

/**
 * @ignore
 */

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          window.oRequestAnimationFrame      ||
          window.msRequestAnimationFrame     ||
          function( callback ){
                  window.setTimeout(callback, 1000 / 60);
          };
})();

module.exports = Tween;

},{"./dhaak-tween-manager.js":237}],239:[function(require,module,exports){
/*!
  * domready (c) Dustin Diaz 2014 - License MIT
  */
!function (name, definition) {

  if (typeof module != 'undefined') module.exports = definition()
  else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)
  else this[name] = definition()

}('domready', function () {

  var fns = [], listener
    , doc = document
    , hack = doc.documentElement.doScroll
    , domContentLoaded = 'DOMContentLoaded'
    , loaded = (hack ? /^loaded|^c/ : /^loaded|^i|^c/).test(doc.readyState)


  if (!loaded)
  doc.addEventListener(domContentLoaded, listener = function () {
    doc.removeEventListener(domContentLoaded, listener)
    loaded = 1
    while (listener = fns.shift()) listener()
  })

  return function (fn) {
    loaded ? setTimeout(fn, 0) : fns.push(fn)
  }

});

},{}],240:[function(require,module,exports){
(function (Buffer){
var hasTypedArrays = false
if(typeof Float64Array !== "undefined") {
  var DOUBLE_VIEW = new Float64Array(1)
    , UINT_VIEW   = new Uint32Array(DOUBLE_VIEW.buffer)
  DOUBLE_VIEW[0] = 1.0
  hasTypedArrays = true
  if(UINT_VIEW[1] === 0x3ff00000) {
    //Use little endian
    module.exports = function doubleBitsLE(n) {
      DOUBLE_VIEW[0] = n
      return [ UINT_VIEW[0], UINT_VIEW[1] ]
    }
    function toDoubleLE(lo, hi) {
      UINT_VIEW[0] = lo
      UINT_VIEW[1] = hi
      return DOUBLE_VIEW[0]
    }
    module.exports.pack = toDoubleLE
    function lowUintLE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[0]
    }
    module.exports.lo = lowUintLE
    function highUintLE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[1]
    }
    module.exports.hi = highUintLE
  } else if(UINT_VIEW[0] === 0x3ff00000) {
    //Use big endian
    module.exports = function doubleBitsBE(n) {
      DOUBLE_VIEW[0] = n
      return [ UINT_VIEW[1], UINT_VIEW[0] ]
    }
    function toDoubleBE(lo, hi) {
      UINT_VIEW[1] = lo
      UINT_VIEW[0] = hi
      return DOUBLE_VIEW[0]
    }
    module.exports.pack = toDoubleBE
    function lowUintBE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[1]
    }
    module.exports.lo = lowUintBE
    function highUintBE(n) {
      DOUBLE_VIEW[0] = n
      return UINT_VIEW[0]
    }
    module.exports.hi = highUintBE
  } else {
    hasTypedArrays = false
  }
}
if(!hasTypedArrays) {
  var buffer = new Buffer(8)
  module.exports = function doubleBits(n) {
    buffer.writeDoubleLE(n, 0, true)
    return [ buffer.readUInt32LE(0, true), buffer.readUInt32LE(4, true) ]
  }
  function toDouble(lo, hi) {
    buffer.writeUInt32LE(lo, 0, true)
    buffer.writeUInt32LE(hi, 4, true)
    return buffer.readDoubleLE(0, true)
  }
  module.exports.pack = toDouble  
  function lowUint(n) {
    buffer.writeDoubleLE(n, 0, true)
    return buffer.readUInt32LE(0, true)
  }
  module.exports.lo = lowUint
  function highUint(n) {
    buffer.writeDoubleLE(n, 0, true)
    return buffer.readUInt32LE(4, true)
  }
  module.exports.hi = highUint
}

module.exports.sign = function(n) {
  return module.exports.hi(n) >>> 31
}

module.exports.exponent = function(n) {
  var b = module.exports.hi(n)
  return ((b<<1) >>> 21) - 1023
}

module.exports.fraction = function(n) {
  var lo = module.exports.lo(n)
  var hi = module.exports.hi(n)
  var b = hi & ((1<<20) - 1)
  if(hi & 0x7ff00000) {
    b += (1<<20)
  }
  return [lo, b]
}

module.exports.denormalized = function(n) {
  var hi = module.exports.hi(n)
  return !(hi & 0x7ff00000)
}
}).call(this,require("buffer").Buffer)
},{"buffer":38}],241:[function(require,module,exports){
"use strict"

function dupe_array(count, value, i) {
  var c = count[i]|0
  if(c <= 0) {
    return []
  }
  var result = new Array(c), j
  if(i === count.length-1) {
    for(j=0; j<c; ++j) {
      result[j] = value
    }
  } else {
    for(j=0; j<c; ++j) {
      result[j] = dupe_array(count, value, i+1)
    }
  }
  return result
}

function dupe_number(count, value) {
  var result, i
  result = new Array(count)
  for(i=0; i<count; ++i) {
    result[i] = value
  }
  return result
}

function dupe(count, value) {
  if(typeof value === "undefined") {
    value = 0
  }
  switch(typeof count) {
    case "number":
      if(count > 0) {
        return dupe_number(count|0, value)
      }
    break
    case "object":
      if(typeof (count.length) === "number") {
        return dupe_array(count, value, 0)
      }
    break
  }
  return []
}

module.exports = dupe
},{}],242:[function(require,module,exports){
function backInOut(t) {
  var s = 1.70158 * 1.525
  if ((t *= 2) < 1)
    return 0.5 * (t * t * ((s + 1) * t - s))
  return 0.5 * ((t -= 2) * t * ((s + 1) * t + s) + 2)
}

module.exports = backInOut
},{}],243:[function(require,module,exports){
function backIn(t) {
  var s = 1.70158
  return t * t * ((s + 1) * t - s)
}

module.exports = backIn
},{}],244:[function(require,module,exports){
function backOut(t) {
  var s = 1.70158
  return --t * t * ((s + 1) * t + s) + 1
}

module.exports = backOut
},{}],245:[function(require,module,exports){
var bounceOut = require('./bounce-out')

function bounceInOut(t) {
  return t < 0.5
    ? 0.5 * (1.0 - bounceOut(1.0 - t * 2.0))
    : 0.5 * bounceOut(t * 2.0 - 1.0) + 0.5
}

module.exports = bounceInOut
},{"./bounce-out":247}],246:[function(require,module,exports){
var bounceOut = require('./bounce-out')

function bounceIn(t) {
  return 1.0 - bounceOut(1.0 - t)
}

module.exports = bounceIn
},{"./bounce-out":247}],247:[function(require,module,exports){
function bounceOut(t) {
  var a = 4.0 / 11.0
  var b = 8.0 / 11.0
  var c = 9.0 / 10.0

  var ca = 4356.0 / 361.0
  var cb = 35442.0 / 1805.0
  var cc = 16061.0 / 1805.0

  var t2 = t * t

  return t < a
    ? 7.5625 * t2
    : t < b
      ? 9.075 * t2 - 9.9 * t + 3.4
      : t < c
        ? ca * t2 - cb * t + cc
        : 10.8 * t * t - 20.52 * t + 10.72
}

module.exports = bounceOut
},{}],248:[function(require,module,exports){
function circInOut(t) {
  if ((t *= 2) < 1) return -0.5 * (Math.sqrt(1 - t * t) - 1)
  return 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1)
}

module.exports = circInOut
},{}],249:[function(require,module,exports){
function circIn(t) {
  return 1.0 - Math.sqrt(1.0 - t * t)
}

module.exports = circIn
},{}],250:[function(require,module,exports){
function circOut(t) {
  return Math.sqrt(1 - ( --t * t ))
}

module.exports = circOut
},{}],251:[function(require,module,exports){
function cubicInOut(t) {
  return t < 0.5
    ? 4.0 * t * t * t
    : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0
}

module.exports = cubicInOut
},{}],252:[function(require,module,exports){
function cubicIn(t) {
  return t * t * t
}

module.exports = cubicIn
},{}],253:[function(require,module,exports){
function cubicOut(t) {
  var f = t - 1.0
  return f * f * f + 1.0
}

module.exports = cubicOut
},{}],254:[function(require,module,exports){
function elasticInOut(t) {
  return t < 0.5
    ? 0.5 * Math.sin(+13.0 * Math.PI/2 * 2.0 * t) * Math.pow(2.0, 10.0 * (2.0 * t - 1.0))
    : 0.5 * Math.sin(-13.0 * Math.PI/2 * ((2.0 * t - 1.0) + 1.0)) * Math.pow(2.0, -10.0 * (2.0 * t - 1.0)) + 1.0
}

module.exports = elasticInOut
},{}],255:[function(require,module,exports){
function elasticIn(t) {
  return Math.sin(13.0 * t * Math.PI/2) * Math.pow(2.0, 10.0 * (t - 1.0))
}

module.exports = elasticIn
},{}],256:[function(require,module,exports){
function elasticOut(t) {
  return Math.sin(-13.0 * (t + 1.0) * Math.PI/2) * Math.pow(2.0, -10.0 * t) + 1.0
}

module.exports = elasticOut
},{}],257:[function(require,module,exports){
function expoInOut(t) {
  return (t === 0.0 || t === 1.0)
    ? t
    : t < 0.5
      ? +0.5 * Math.pow(2.0, (20.0 * t) - 10.0)
      : -0.5 * Math.pow(2.0, 10.0 - (t * 20.0)) + 1.0
}

module.exports = expoInOut
},{}],258:[function(require,module,exports){
function expoIn(t) {
  return t === 0.0 ? t : Math.pow(2.0, 10.0 * (t - 1.0))
}

module.exports = expoIn
},{}],259:[function(require,module,exports){
function expoOut(t) {
  return t === 1.0 ? t : 1.0 - Math.pow(2.0, -10.0 * t)
}

module.exports = expoOut
},{}],260:[function(require,module,exports){
module.exports = {
	'backInOut': require('./back-in-out'),
	'backIn': require('./back-in'),
	'backOut': require('./back-out'),
	'bounceInOut': require('./bounce-in-out'),
	'bounceIn': require('./bounce-in'),
	'bounceOut': require('./bounce-out'),
	'circInOut': require('./circ-in-out'),
	'circIn': require('./circ-in'),
	'circOut': require('./circ-out'),
	'cubicInOut': require('./cubic-in-out'),
	'cubicIn': require('./cubic-in'),
	'cubicOut': require('./cubic-out'),
	'elasticInOut': require('./elastic-in-out'),
	'elasticIn': require('./elastic-in'),
	'elasticOut': require('./elastic-out'),
	'expoInOut': require('./expo-in-out'),
	'expoIn': require('./expo-in'),
	'expoOut': require('./expo-out'),
	'linear': require('./linear'),
	'quadInOut': require('./quad-in-out'),
	'quadIn': require('./quad-in'),
	'quadOut': require('./quad-out'),
	'quartInOut': require('./quart-in-out'),
	'quartIn': require('./quart-in'),
	'quartOut': require('./quart-out'),
	'quintInOut': require('./quint-in-out'),
	'quintIn': require('./quint-in'),
	'quintOut': require('./quint-out'),
	'sineInOut': require('./sine-in-out'),
	'sineIn': require('./sine-in'),
	'sineOut': require('./sine-out')
}
},{"./back-in":243,"./back-in-out":242,"./back-out":244,"./bounce-in":246,"./bounce-in-out":245,"./bounce-out":247,"./circ-in":249,"./circ-in-out":248,"./circ-out":250,"./cubic-in":252,"./cubic-in-out":251,"./cubic-out":253,"./elastic-in":255,"./elastic-in-out":254,"./elastic-out":256,"./expo-in":258,"./expo-in-out":257,"./expo-out":259,"./linear":261,"./quad-in":263,"./quad-in-out":262,"./quad-out":264,"./quart-in":266,"./quart-in-out":265,"./quart-out":267,"./quint-in":269,"./quint-in-out":268,"./quint-out":270,"./sine-in":272,"./sine-in-out":271,"./sine-out":273}],261:[function(require,module,exports){
function linear(t) {
  return t
}

module.exports = linear
},{}],262:[function(require,module,exports){
function quadInOut(t) {
    t /= 0.5
    if (t < 1) return 0.5*t*t
    t--
    return -0.5 * (t*(t-2) - 1)
}

module.exports = quadInOut
},{}],263:[function(require,module,exports){
function quadIn(t) {
  return t * t
}

module.exports = quadIn
},{}],264:[function(require,module,exports){
function quadOut(t) {
  return -t * (t - 2.0)
}

module.exports = quadOut
},{}],265:[function(require,module,exports){
function quarticInOut(t) {
  return t < 0.5
    ? +8.0 * Math.pow(t, 4.0)
    : -8.0 * Math.pow(t - 1.0, 4.0) + 1.0
}

module.exports = quarticInOut
},{}],266:[function(require,module,exports){
function quarticIn(t) {
  return Math.pow(t, 4.0)
}

module.exports = quarticIn
},{}],267:[function(require,module,exports){
function quarticOut(t) {
  return Math.pow(t - 1.0, 3.0) * (1.0 - t) + 1.0
}

module.exports = quarticOut
},{}],268:[function(require,module,exports){
function qinticInOut(t) {
    if ( ( t *= 2 ) < 1 ) return 0.5 * t * t * t * t * t
    return 0.5 * ( ( t -= 2 ) * t * t * t * t + 2 )
}

module.exports = qinticInOut
},{}],269:[function(require,module,exports){
function qinticIn(t) {
  return t * t * t * t * t
}

module.exports = qinticIn
},{}],270:[function(require,module,exports){
function qinticOut(t) {
  return --t * t * t * t * t + 1
}

module.exports = qinticOut
},{}],271:[function(require,module,exports){
function sineInOut(t) {
  return -0.5 * (Math.cos(Math.PI*t) - 1)
}

module.exports = sineInOut
},{}],272:[function(require,module,exports){
function sineIn (t) {
  var v = Math.cos(t * Math.PI * 0.5)
  if (Math.abs(v) < 1e-14) return 1
  else return 1 - v
}

module.exports = sineIn

},{}],273:[function(require,module,exports){
function sineOut(t) {
  return Math.sin(t * Math.PI/2)
}

module.exports = sineOut
},{}],274:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],275:[function(require,module,exports){
module.exports = adjoint;

/**
 * Calculates the adjugate of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function adjoint(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    out[0]  =  (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
    out[1]  = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    out[2]  =  (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
    out[3]  = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    out[4]  = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    out[5]  =  (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
    out[6]  = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    out[7]  =  (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
    out[8]  =  (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
    out[9]  = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    out[10] =  (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    out[13] =  (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    out[15] =  (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
    return out;
};
},{}],276:[function(require,module,exports){
module.exports = clone;

/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {mat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */
function clone(a) {
    var out = new Float32Array(16);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};
},{}],277:[function(require,module,exports){
module.exports = copy;

/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};
},{}],278:[function(require,module,exports){
module.exports = create;

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */
function create() {
    var out = new Float32Array(16);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
},{}],279:[function(require,module,exports){
module.exports = determinant;

/**
 * Calculates the determinant of a mat4
 *
 * @param {mat4} a the source matrix
 * @returns {Number} determinant of a
 */
function determinant(a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
};
},{}],280:[function(require,module,exports){
module.exports = fromQuat;

/**
 * Creates a matrix from a quaternion rotation.
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @returns {mat4} out
 */
function fromQuat(out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        yx = y * x2,
        yy = y * y2,
        zx = z * x2,
        zy = z * y2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;

    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;

    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;

    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return out;
};
},{}],281:[function(require,module,exports){
module.exports = fromRotationTranslation;

/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     var quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */
function fromRotationTranslation(out, q, v) {
    // Quaternion math
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    
    return out;
};
},{}],282:[function(require,module,exports){
module.exports = frustum;

/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */
function frustum(out, left, right, bottom, top, near, far) {
    var rl = 1 / (right - left),
        tb = 1 / (top - bottom),
        nf = 1 / (near - far);
    out[0] = (near * 2) * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = (near * 2) * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (far * near * 2) * nf;
    out[15] = 0;
    return out;
};
},{}],283:[function(require,module,exports){
module.exports = identity;

/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */
function identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};
},{}],284:[function(require,module,exports){
module.exports = {
  create: require('./create')
  , clone: require('./clone')
  , copy: require('./copy')
  , identity: require('./identity')
  , transpose: require('./transpose')
  , invert: require('./invert')
  , adjoint: require('./adjoint')
  , determinant: require('./determinant')
  , multiply: require('./multiply')
  , translate: require('./translate')
  , scale: require('./scale')
  , rotate: require('./rotate')
  , rotateX: require('./rotateX')
  , rotateY: require('./rotateY')
  , rotateZ: require('./rotateZ')
  , fromRotationTranslation: require('./fromRotationTranslation')
  , fromQuat: require('./fromQuat')
  , frustum: require('./frustum')
  , perspective: require('./perspective')
  , perspectiveFromFieldOfView: require('./perspectiveFromFieldOfView')
  , ortho: require('./ortho')
  , lookAt: require('./lookAt')
  , str: require('./str')
}
},{"./adjoint":275,"./clone":276,"./copy":277,"./create":278,"./determinant":279,"./fromQuat":280,"./fromRotationTranslation":281,"./frustum":282,"./identity":283,"./invert":285,"./lookAt":286,"./multiply":287,"./ortho":288,"./perspective":289,"./perspectiveFromFieldOfView":290,"./rotate":291,"./rotateX":292,"./rotateY":293,"./rotateZ":294,"./scale":295,"./str":296,"./translate":297,"./transpose":298}],285:[function(require,module,exports){
module.exports = invert;

/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function invert(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
};
},{}],286:[function(require,module,exports){
var identity = require('./identity');

module.exports = lookAt;

/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {vec3} eye Position of the viewer
 * @param {vec3} center Point the viewer is looking at
 * @param {vec3} up vec3 pointing up
 * @returns {mat4} out
 */
function lookAt(out, eye, center, up) {
    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
        eyex = eye[0],
        eyey = eye[1],
        eyez = eye[2],
        upx = up[0],
        upy = up[1],
        upz = up[2],
        centerx = center[0],
        centery = center[1],
        centerz = center[2];

    if (Math.abs(eyex - centerx) < 0.000001 &&
        Math.abs(eyey - centery) < 0.000001 &&
        Math.abs(eyez - centerz) < 0.000001) {
        return identity(out);
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return out;
};
},{"./identity":283}],287:[function(require,module,exports){
module.exports = multiply;

/**
 * Multiplies two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
function multiply(out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    // Cache only the current line of the second matrix
    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];  
    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return out;
};
},{}],288:[function(require,module,exports){
module.exports = ortho;

/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
function ortho(out, left, right, bottom, top, near, far) {
    var lr = 1 / (left - right),
        bt = 1 / (bottom - top),
        nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
};
},{}],289:[function(require,module,exports){
module.exports = perspective;

/**
 * Generates a perspective projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
function perspective(out, fovy, aspect, near, far) {
    var f = 1.0 / Math.tan(fovy / 2),
        nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return out;
};
},{}],290:[function(require,module,exports){
module.exports = perspectiveFromFieldOfView;

/**
 * Generates a perspective projection matrix with the given field of view.
 * This is primarily useful for generating projection matrices to be used
 * with the still experiemental WebVR API.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
function perspectiveFromFieldOfView(out, fov, near, far) {
    var upTan = Math.tan(fov.upDegrees * Math.PI/180.0),
        downTan = Math.tan(fov.downDegrees * Math.PI/180.0),
        leftTan = Math.tan(fov.leftDegrees * Math.PI/180.0),
        rightTan = Math.tan(fov.rightDegrees * Math.PI/180.0),
        xScale = 2.0 / (leftTan + rightTan),
        yScale = 2.0 / (upTan + downTan);

    out[0] = xScale;
    out[1] = 0.0;
    out[2] = 0.0;
    out[3] = 0.0;
    out[4] = 0.0;
    out[5] = yScale;
    out[6] = 0.0;
    out[7] = 0.0;
    out[8] = -((leftTan - rightTan) * xScale * 0.5);
    out[9] = ((upTan - downTan) * yScale * 0.5);
    out[10] = far / (near - far);
    out[11] = -1.0;
    out[12] = 0.0;
    out[13] = 0.0;
    out[14] = (far * near) / (near - far);
    out[15] = 0.0;
    return out;
}


},{}],291:[function(require,module,exports){
module.exports = rotate;

/**
 * Rotates a mat4 by the given angle
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
function rotate(out, a, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2],
        len = Math.sqrt(x * x + y * y + z * z),
        s, c, t,
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23,
        b00, b01, b02,
        b10, b11, b12,
        b20, b21, b22;

    if (Math.abs(len) < 0.000001) { return null; }
    
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;

    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

    // Construct the elements of the rotation matrix
    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

    // Perform rotation-specific matrix multiplication
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    return out;
};
},{}],292:[function(require,module,exports){
module.exports = rotateX;

/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function rotateX(out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[0]  = a[0];
        out[1]  = a[1];
        out[2]  = a[2];
        out[3]  = a[3];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
};
},{}],293:[function(require,module,exports){
module.exports = rotateY;

/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function rotateY(out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[4]  = a[4];
        out[5]  = a[5];
        out[6]  = a[6];
        out[7]  = a[7];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
};
},{}],294:[function(require,module,exports){
module.exports = rotateZ;

/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
function rotateZ(out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[8]  = a[8];
        out[9]  = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
};
},{}],295:[function(require,module,exports){
module.exports = scale;

/**
 * Scales the mat4 by the dimensions in the given vec3
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to scale
 * @param {vec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/
function scale(out, a, v) {
    var x = v[0], y = v[1], z = v[2];

    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};
},{}],296:[function(require,module,exports){
module.exports = str;

/**
 * Returns a string representation of a mat4
 *
 * @param {mat4} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
function str(a) {
    return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
                    a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
                    a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' + 
                    a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
};
},{}],297:[function(require,module,exports){
module.exports = translate;

/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to translate
 * @param {vec3} v vector to translate by
 * @returns {mat4} out
 */
function translate(out, a, v) {
    var x = v[0], y = v[1], z = v[2],
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23;

    if (a === out) {
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
        a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
        a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
        a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

        out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
        out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
        out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

        out[12] = a00 * x + a10 * y + a20 * z + a[12];
        out[13] = a01 * x + a11 * y + a21 * z + a[13];
        out[14] = a02 * x + a12 * y + a22 * z + a[14];
        out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }

    return out;
};
},{}],298:[function(require,module,exports){
module.exports = transpose;

/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
function transpose(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a03 = a[3],
            a12 = a[6], a13 = a[7],
            a23 = a[11];

        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a01;
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a02;
        out[9] = a12;
        out[11] = a[14];
        out[12] = a03;
        out[13] = a13;
        out[14] = a23;
    } else {
        out[0] = a[0];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a[1];
        out[5] = a[5];
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a[2];
        out[9] = a[6];
        out[10] = a[10];
        out[11] = a[14];
        out[12] = a[3];
        out[13] = a[7];
        out[14] = a[11];
        out[15] = a[15];
    }
    
    return out;
};
},{}],299:[function(require,module,exports){
module.exports = random;

/**
 * Generates a random vector with the given scale
 *
 * @param {vec3} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec3} out
 */
function random(out, scale) {
    scale = scale || 1.0

    var r = Math.random() * 2.0 * Math.PI
    var z = (Math.random() * 2.0) - 1.0
    var zScale = Math.sqrt(1.0-z*z) * scale

    out[0] = Math.cos(r) * zScale
    out[1] = Math.sin(r) * zScale
    out[2] = z * scale
    return out
}
},{}],300:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],301:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],302:[function(require,module,exports){
var lerp = require('lerp')

module.exports = function lerpValues(value1, value2, t, out) {
    if (typeof value1 === 'number'
            && typeof value2 === 'number')
        return lerp(value1, value2, t)
    else { //assume array
        var len = Math.min(value1.length, value2.length)
        out = out||new Array(len)
        for (var i=0; i<len; i++) 
            out[i] = lerp(value1[i], value2[i], t)
        return out
    }
}
},{"lerp":303}],303:[function(require,module,exports){
function lerp(v0, v1, t) {
    return v0*(1-t)+v1*t
}
module.exports = lerp
},{}],304:[function(require,module,exports){
module.exports = reindex

function reindex(array) {
  var pos = []
  var cel = []

  var i = 0
  var c = 0
  while (i < array.length) {
    cel.push([c++, c++, c++])
    pos.push([
        array[i++]
      , array[i++]
      , array[i++]
    ], [
        array[i++]
      , array[i++]
      , array[i++]
    ], [
        array[i++]
      , array[i++]
      , array[i++]
    ])
  }

  return {
      positions: pos
    , cells: cel
  }
}

},{}],305:[function(require,module,exports){
var xtend = require('xtend')

var defaults = {
	enumerable: true,
	configurable: true
}

function mix(obj, entries) {
	for (var k in entries) {
		if (!entries.hasOwnProperty(k))
			continue
		var f = entries[k]
		if (typeof f === 'function') {
			obj[k] = f
		} else if (f && typeof f === 'object') {
			var def = xtend(defaults, f)
			Object.defineProperty(obj, k, def);
		}
	}
}

module.exports = function mixes(ctor, entries) {
	mix(ctor.prototype, entries)
}

module.exports.mix = mix
},{"xtend":369}],306:[function(require,module,exports){
"use strict"

var doubleBits = require("double-bits")

var SMALLEST_DENORM = Math.pow(2, -1074)
var UINT_MAX = (-1)>>>0

module.exports = nextafter

function nextafter(x, y) {
  if(isNaN(x) || isNaN(y)) {
    return NaN
  }
  if(x === y) {
    return x
  }
  if(x === 0) {
    if(y < 0) {
      return -SMALLEST_DENORM
    } else {
      return SMALLEST_DENORM
    }
  }
  var hi = doubleBits.hi(x)
  var lo = doubleBits.lo(x)
  if((y > x) === (x > 0)) {
    if(lo === UINT_MAX) {
      hi += 1
      lo = 0
    } else {
      lo += 1
    }
  } else {
    if(lo === 0) {
      lo = UINT_MAX
      hi -= 1
    } else {
      lo -= 1
    }
  }
  return doubleBits.pack(lo, hi)
}
},{"double-bits":240}],307:[function(require,module,exports){
var getBounds = require('bound-points')
var unlerp = require('unlerp')

module.exports = normalizePathScale
function normalizePathScale (positions, bounds) {
  if (!Array.isArray(positions)) {
    throw new TypeError('must specify positions as first argument')
  }
  if (!Array.isArray(bounds)) {
    bounds = getBounds(positions)
  }

  var min = bounds[0]
  var max = bounds[1]

  var width = max[0] - min[0]
  var height = max[1] - min[1]

  var aspectX = width > height ? 1 : (height / width)
  var aspectY = width > height ? (width / height) : 1

  if (max[0] - min[0] === 0 || max[1] - min[1] === 0) {
    return positions // div by zero; leave positions unchanged
  }

  for (var i = 0; i < positions.length; i++) {
    var pos = positions[i]
    pos[0] = (unlerp(min[0], max[0], pos[0]) * 2 - 1) / aspectX
    pos[1] = (unlerp(min[1], max[1], pos[1]) * 2 - 1) / aspectY
  }
  return positions
}
},{"bound-points":30,"unlerp":367}],308:[function(require,module,exports){

var π = Math.PI
var _120 = radians(120)

module.exports = normalize

/**
 * describe `path` in terms of cubic bézier 
 * curves and move commands
 *
 * @param {Array} path
 * @return {Array}
 */

function normalize(path){
	// init state
	var prev
	var result = []
	var bezierX = 0
	var bezierY = 0
	var startX = 0
	var startY = 0
	var quadX = null
	var quadY = null
	var x = 0
	var y = 0

	for (var i = 0, len = path.length; i < len; i++) {
		var seg = path[i]
		var command = seg[0]
		switch (command) {
			case 'M':
				startX = seg[1]
				startY = seg[2]
				break
			case 'A':
				seg = arc(x, y,seg[1],seg[2],radians(seg[3]),seg[4],seg[5],seg[6],seg[7])
				// split multi part
				seg.unshift('C')
				if (seg.length > 7) {
					result.push(seg.splice(0, 7))
					seg.unshift('C')
				}
				break
			case 'S':
				// default control point
				var cx = x
				var cy = y
				if (prev == 'C' || prev == 'S') {
					cx += cx - bezierX // reflect the previous command's control
					cy += cy - bezierY // point relative to the current point
				}
				seg = ['C', cx, cy, seg[1], seg[2], seg[3], seg[4]]
				break
			case 'T':
				if (prev == 'Q' || prev == 'T') {
					quadX = x * 2 - quadX // as with 'S' reflect previous control point
					quadY = y * 2 - quadY
				} else {
					quadX = x
					quadY = y
				}
				seg = quadratic(x, y, quadX, quadY, seg[1], seg[2])
				break
			case 'Q':
				quadX = seg[1]
				quadY = seg[2]
				seg = quadratic(x, y, seg[1], seg[2], seg[3], seg[4])
				break
			case 'L':
				seg = line(x, y, seg[1], seg[2])
				break
			case 'H':
				seg = line(x, y, seg[1], y)
				break
			case 'V':
				seg = line(x, y, x, seg[1])
				break
			case 'Z':
				seg = line(x, y, startX, startY)
				break
		}

		// update state
		prev = command
		x = seg[seg.length - 2]
		y = seg[seg.length - 1]
		if (seg.length > 4) {
			bezierX = seg[seg.length - 4]
			bezierY = seg[seg.length - 3]
		} else {
			bezierX = x
			bezierY = y
		}
		result.push(seg)
	}

	return result
}

function line(x1, y1, x2, y2){
	return ['C', x1, y1, x2, y2, x2, y2]
}

function quadratic(x1, y1, cx, cy, x2, y2){
	return [
		'C',
		x1/3 + (2/3) * cx,
		y1/3 + (2/3) * cy,
		x2/3 + (2/3) * cx,
		y2/3 + (2/3) * cy,
		x2,
		y2
	]
}

// This function is ripped from 
// github.com/DmitryBaranovskiy/raphael/blob/4d97d4/raphael.js#L2216-L2304 
// which references w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
// TODO: make it human readable

function arc(x1, y1, rx, ry, angle, large_arc_flag, sweep_flag, x2, y2, recursive) {
	if (!recursive) {
		var xy = rotate(x1, y1, -angle)
		x1 = xy.x
		y1 = xy.y
		xy = rotate(x2, y2, -angle)
		x2 = xy.x
		y2 = xy.y
		var x = (x1 - x2) / 2
		var y = (y1 - y2) / 2
		var h = (x * x) / (rx * rx) + (y * y) / (ry * ry)
		if (h > 1) {
			h = Math.sqrt(h)
			rx = h * rx
			ry = h * ry
		}
		var rx2 = rx * rx
		var ry2 = ry * ry
		var k = (large_arc_flag == sweep_flag ? -1 : 1)
			* Math.sqrt(Math.abs((rx2 * ry2 - rx2 * y * y - ry2 * x * x) / (rx2 * y * y + ry2 * x * x)))
		if (k == Infinity) k = 1 // neutralize
		var cx = k * rx * y / ry + (x1 + x2) / 2
		var cy = k * -ry * x / rx + (y1 + y2) / 2
		var f1 = Math.asin(((y1 - cy) / ry).toFixed(9))
		var f2 = Math.asin(((y2 - cy) / ry).toFixed(9))

		f1 = x1 < cx ? π - f1 : f1
		f2 = x2 < cx ? π - f2 : f2
		if (f1 < 0) f1 = π * 2 + f1
		if (f2 < 0) f2 = π * 2 + f2
		if (sweep_flag && f1 > f2) f1 = f1 - π * 2
		if (!sweep_flag && f2 > f1) f2 = f2 - π * 2
	} else {
		f1 = recursive[0]
		f2 = recursive[1]
		cx = recursive[2]
		cy = recursive[3]
	}
	// greater than 120 degrees requires multiple segments
	if (Math.abs(f2 - f1) > _120) {
		var f2old = f2
		var x2old = x2
		var y2old = y2
		f2 = f1 + _120 * (sweep_flag && f2 > f1 ? 1 : -1)
		x2 = cx + rx * Math.cos(f2)
		y2 = cy + ry * Math.sin(f2)
		var res = arc(x2, y2, rx, ry, angle, 0, sweep_flag, x2old, y2old, [f2, f2old, cx, cy])
	}
	var t = Math.tan((f2 - f1) / 4)
	var hx = 4 / 3 * rx * t
	var hy = 4 / 3 * ry * t
	var curve = [
		2 * x1 - (x1 + hx * Math.sin(f1)),
		2 * y1 - (y1 - hy * Math.cos(f1)),
		x2 + hx * Math.sin(f2),
		y2 - hy * Math.cos(f2),
		x2,
		y2
	]
	if (recursive) return curve
	if (res) curve = curve.concat(res)
	for (var i = 0; i < curve.length;) {
		var rot = rotate(curve[i], curve[i+1], angle)
		curve[i++] = rot.x
		curve[i++] = rot.y
	}
	return curve
}

function rotate(x, y, rad){
	return {
		x: x * Math.cos(rad) - y * Math.sin(rad),
		y: x * Math.sin(rad) + y * Math.cos(rad)
	}
}

function radians(degress){
	return degress * (π / 180)
}

},{}],309:[function(require,module,exports){
/* eslint-disable no-unused-vars */
'use strict';
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

module.exports = Object.assign || function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (Object.getOwnPropertySymbols) {
			symbols = Object.getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};

},{}],310:[function(require,module,exports){
var propIsEnumerable = Object.prototype.propertyIsEnumerable

module.exports = ownEnumerableKeys
function ownEnumerableKeys (obj) {
  var keys = Object.getOwnPropertyNames(obj)

  if (Object.getOwnPropertySymbols) {
    keys = keys.concat(Object.getOwnPropertySymbols(obj))
  }

  return keys.filter(function (key) {
    return propIsEnumerable.call(obj, key)
  })
}

},{}],311:[function(require,module,exports){

module.exports = parse

/**
 * expected argument lengths
 * @type {Object}
 */

var length = {a: 7, c: 6, h: 1, l: 2, m: 2, q: 4, s: 4, t: 2, v: 1, z: 0}

/**
 * segment pattern
 * @type {RegExp}
 */

var segment = /([astvzqmhlc])([^astvzqmhlc]*)/ig

/**
 * parse an svg path data string. Generates an Array
 * of commands where each command is an Array of the
 * form `[command, arg1, arg2, ...]`
 *
 * @param {String} path
 * @return {Array}
 */

function parse(path) {
	var data = []
	path.replace(segment, function(_, command, args){
		var type = command.toLowerCase()
		args = parseValues(args)

		// overloaded moveTo
		if (type == 'm' && args.length > 2) {
			data.push([command].concat(args.splice(0, 2)))
			type = 'l'
			command = command == 'm' ? 'l' : 'L'
		}

		while (true) {
			if (args.length == length[type]) {
				args.unshift(command)
				return data.push(args)
			}
			if (args.length < length[type]) throw new Error('malformed path data')
			data.push([command].concat(args.splice(0, length[type])))
		}
	})
	return data
}

function parseValues(args){
	args = args.match(/-?[.0-9]+(?:e[-+]?\d+)?/ig)
	return args ? args.map(Number) : []
}

},{}],312:[function(require,module,exports){

/*
	Copyright © 2001 Robert Penner
	All rights reserved.

	Redistribution and use in source and binary forms, with or without modification, 
	are permitted provided that the following conditions are met:

	Redistributions of source code must retain the above copyright notice, this list of 
	conditions and the following disclaimer.
	Redistributions in binary form must reproduce the above copyright notice, this list 
	of conditions and the following disclaimer in the documentation and/or other materials 
	provided with the distribution.

	Neither the name of the author nor the names of contributors may be used to endorse 
	or promote products derived from this software without specific prior written permission.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY 
	EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
	MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
	COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
	EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
	GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED 
	AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
	OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function() {
  var penner, umd;

  umd = function(factory) {
    if (typeof exports === 'object') {
      return module.exports = factory;
    } else if (typeof define === 'function' && define.amd) {
      return define([], factory);
    } else {
      return this.penner = factory;
    }
  };

  penner = {
    linear: function(t, b, c, d) {
      return c * t / d + b;
    },
    easeInQuad: function(t, b, c, d) {
      return c * (t /= d) * t + b;
    },
    easeOutQuad: function(t, b, c, d) {
      return -c * (t /= d) * (t - 2) + b;
    },
    easeInOutQuad: function(t, b, c, d) {
      if ((t /= d / 2) < 1) {
        return c / 2 * t * t + b;
      } else {
        return -c / 2 * ((--t) * (t - 2) - 1) + b;
      }
    },
    easeInCubic: function(t, b, c, d) {
      return c * (t /= d) * t * t + b;
    },
    easeOutCubic: function(t, b, c, d) {
      return c * ((t = t / d - 1) * t * t + 1) + b;
    },
    easeInOutCubic: function(t, b, c, d) {
      if ((t /= d / 2) < 1) {
        return c / 2 * t * t * t + b;
      } else {
        return c / 2 * ((t -= 2) * t * t + 2) + b;
      }
    },
    easeInQuart: function(t, b, c, d) {
      return c * (t /= d) * t * t * t + b;
    },
    easeOutQuart: function(t, b, c, d) {
      return -c * ((t = t / d - 1) * t * t * t - 1) + b;
    },
    easeInOutQuart: function(t, b, c, d) {
      if ((t /= d / 2) < 1) {
        return c / 2 * t * t * t * t + b;
      } else {
        return -c / 2 * ((t -= 2) * t * t * t - 2) + b;
      }
    },
    easeInQuint: function(t, b, c, d) {
      return c * (t /= d) * t * t * t * t + b;
    },
    easeOutQuint: function(t, b, c, d) {
      return c * ((t = t / d - 1) * t * t * t * t + 1) + b;
    },
    easeInOutQuint: function(t, b, c, d) {
      if ((t /= d / 2) < 1) {
        return c / 2 * t * t * t * t * t + b;
      } else {
        return c / 2 * ((t -= 2) * t * t * t * t + 2) + b;
      }
    },
    easeInSine: function(t, b, c, d) {
      return -c * Math.cos(t / d * (Math.PI / 2)) + c + b;
    },
    easeOutSine: function(t, b, c, d) {
      return c * Math.sin(t / d * (Math.PI / 2)) + b;
    },
    easeInOutSine: function(t, b, c, d) {
      return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
    },
    easeInExpo: function(t, b, c, d) {
      if (t === 0) {
        return b;
      } else {
        return c * Math.pow(2, 10 * (t / d - 1)) + b;
      }
    },
    easeOutExpo: function(t, b, c, d) {
      if (t === d) {
        return b + c;
      } else {
        return c * (-Math.pow(2, -10 * t / d) + 1) + b;
      }
    },
    easeInOutExpo: function(t, b, c, d) {
      if (t === 0) {
        b;
      }
      if (t === d) {
        b + c;
      }
      if ((t /= d / 2) < 1) {
        return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
      } else {
        return c / 2 * (-Math.pow(2, -10 * --t) + 2) + b;
      }
    },
    easeInCirc: function(t, b, c, d) {
      return -c * (Math.sqrt(1 - (t /= d) * t) - 1) + b;
    },
    easeOutCirc: function(t, b, c, d) {
      return c * Math.sqrt(1 - (t = t / d - 1) * t) + b;
    },
    easeInOutCirc: function(t, b, c, d) {
      if ((t /= d / 2) < 1) {
        return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
      } else {
        return c / 2 * (Math.sqrt(1 - (t -= 2) * t) + 1) + b;
      }
    },
    easeInElastic: function(t, b, c, d) {
      var a, p, s;
      s = 1.70158;
      p = 0;
      a = c;
      if (t === 0) {
        b;
      } else if ((t /= d) === 1) {
        b + c;
      }
      if (!p) {
        p = d * .3;
      }
      if (a < Math.abs(c)) {
        a = c;
        s = p / 4;
      } else {
        s = p / (2 * Math.PI) * Math.asin(c / a);
      }
      return -(a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
    },
    easeOutElastic: function(t, b, c, d) {
      var a, p, s;
      s = 1.70158;
      p = 0;
      a = c;
      if (t === 0) {
        b;
      } else if ((t /= d) === 1) {
        b + c;
      }
      if (!p) {
        p = d * .3;
      }
      if (a < Math.abs(c)) {
        a = c;
        s = p / 4;
      } else {
        s = p / (2 * Math.PI) * Math.asin(c / a);
      }
      return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
    },
    easeInOutElastic: function(t, b, c, d) {
      var a, p, s;
      s = 1.70158;
      p = 0;
      a = c;
      if (t === 0) {
        b;
      } else if ((t /= d / 2) === 2) {
        b + c;
      }
      if (!p) {
        p = d * (.3 * 1.5);
      }
      if (a < Math.abs(c)) {
        a = c;
        s = p / 4;
      } else {
        s = p / (2 * Math.PI) * Math.asin(c / a);
      }
      if (t < 1) {
        return -.5 * (a * Math.pow(2, 10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p)) + b;
      } else {
        return a * Math.pow(2, -10 * (t -= 1)) * Math.sin((t * d - s) * (2 * Math.PI) / p) * .5 + c + b;
      }
    },
    easeInBack: function(t, b, c, d, s) {
      if (s === void 0) {
        s = 1.70158;
      }
      return c * (t /= d) * t * ((s + 1) * t - s) + b;
    },
    easeOutBack: function(t, b, c, d, s) {
      if (s === void 0) {
        s = 1.70158;
      }
      return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
    },
    easeInOutBack: function(t, b, c, d, s) {
      if (s === void 0) {
        s = 1.70158;
      }
      if ((t /= d / 2) < 1) {
        return c / 2 * (t * t * (((s *= 1.525) + 1) * t - s)) + b;
      } else {
        return c / 2 * ((t -= 2) * t * (((s *= 1.525) + 1) * t + s) + 2) + b;
      }
    },
    easeInBounce: function(t, b, c, d) {
      var v;
      v = penner.easeOutBounce(d - t, 0, c, d);
      return c - v + b;
    },
    easeOutBounce: function(t, b, c, d) {
      if ((t /= d) < 1 / 2.75) {
        return c * (7.5625 * t * t) + b;
      } else if (t < 2 / 2.75) {
        return c * (7.5625 * (t -= 1.5 / 2.75) * t + .75) + b;
      } else if (t < 2.5 / 2.75) {
        return c * (7.5625 * (t -= 2.25 / 2.75) * t + .9375) + b;
      } else {
        return c * (7.5625 * (t -= 2.625 / 2.75) * t + .984375) + b;
      }
    },
    easeInOutBounce: function(t, b, c, d) {
      var v;
      if (t < d / 2) {
        v = penner.easeInBounce(t * 2, 0, c, d);
        return v * .5 + b;
      } else {
        v = penner.easeOutBounce(t * 2 - d, 0, c, d);
        return v * .5 + c * .5 + b;
      }
    }
  };

  umd(penner);

}).call(this);

},{}],313:[function(require,module,exports){
(function (process){
// Generated by CoffeeScript 1.7.1
(function() {
  var getNanoSeconds, hrtime, loadTime;

  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
    module.exports = function() {
      return performance.now();
    };
  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
    module.exports = function() {
      return (getNanoSeconds() - loadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function() {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    loadTime = getNanoSeconds();
  } else if (Date.now) {
    module.exports = function() {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    module.exports = function() {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }

}).call(this);

}).call(this,require('_process'))
},{"_process":314}],314:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],315:[function(require,module,exports){
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var now = require('right-now')
var raf = require('raf')

module.exports = Engine
function Engine(fn) {
    if (!(this instanceof Engine)) 
        return new Engine(fn)
    this.running = false
    this.last = now()
    this._frame = 0
    this._tick = this.tick.bind(this)

    if (fn)
        this.on('tick', fn)
}

inherits(Engine, EventEmitter)

Engine.prototype.start = function() {
    if (this.running) 
        return
    this.running = true
    this.last = now()
    this._frame = raf(this._tick)
    return this
}

Engine.prototype.stop = function() {
    this.running = false
    if (this._frame !== 0)
        raf.cancel(this._frame)
    this._frame = 0
    return this
}

Engine.prototype.tick = function() {
    this._frame = raf(this._tick)
    var time = now()
    var dt = time - this.last
    this.emit('tick', dt)
    this.last = time
}
},{"events":274,"inherits":301,"raf":316,"right-now":322}],316:[function(require,module,exports){
var now = require('performance-now')
  , global = typeof window === 'undefined' ? {} : window
  , vendors = ['moz', 'webkit']
  , suffix = 'AnimationFrame'
  , raf = global['request' + suffix]
  , caf = global['cancel' + suffix] || global['cancelRequest' + suffix]

for(var i = 0; i < vendors.length && !raf; i++) {
  raf = global[vendors[i] + 'Request' + suffix]
  caf = global[vendors[i] + 'Cancel' + suffix]
      || global[vendors[i] + 'CancelRequest' + suffix]
}

// Some versions of FF have rAF but not cAF
if(!raf || !caf) {
  var last = 0
    , id = 0
    , queue = []
    , frameDuration = 1000 / 60

  raf = function(callback) {
    if(queue.length === 0) {
      var _now = now()
        , next = Math.max(0, frameDuration - (_now - last))
      last = next + _now
      setTimeout(function() {
        var cp = queue.slice(0)
        // Clear queue here to prevent
        // callbacks from appending listeners
        // to the current frame's queue
        queue.length = 0
        for(var i = 0; i < cp.length; i++) {
          if(!cp[i].cancelled) {
            try{
              cp[i].callback(last)
            } catch(e) {
              setTimeout(function() { throw e }, 0)
            }
          }
        }
      }, Math.round(next))
    }
    queue.push({
      handle: ++id,
      callback: callback,
      cancelled: false
    })
    return id
  }

  caf = function(handle) {
    for(var i = 0; i < queue.length; i++) {
      if(queue[i].handle === handle) {
        queue[i].cancelled = true
      }
    }
  }
}

module.exports = function(fn) {
  // Wrap in a new function to prevent
  // `cancel` potentially being assigned
  // to the native rAF function
  return raf.call(global, fn)
}
module.exports.cancel = function() {
  caf.apply(global, arguments)
}

},{"performance-now":313}],317:[function(require,module,exports){
'use strict';
module.exports = function (min, max) {
	if (max === undefined) {
		max = min;
		min = 0;
	}

	if (typeof min !== 'number' || typeof max !== 'number') {
		throw new TypeError('Expected all arguments to be numbers');
	}

	return Math.random() * (max - min) + min;
};

},{}],318:[function(require,module,exports){
'use strict'

var bnadd = require('big-rat/add')

module.exports = add

function add(a, b) {
  var n = a.length
  var r = new Array(n)
    for(var i=0; i<n; ++i) {
    r[i] = bnadd(a[i], b[i])
  }
  return r
}

},{"big-rat/add":11}],319:[function(require,module,exports){
'use strict'

module.exports = float2rat

var rat = require('big-rat')

function float2rat(v) {
  var result = new Array(v.length)
  for(var i=0; i<v.length; ++i) {
    result[i] = rat(v[i])
  }
  return result
}

},{"big-rat":14}],320:[function(require,module,exports){
'use strict'

var rat = require('big-rat')
var mul = require('big-rat/mul')

module.exports = muls

function muls(a, x) {
  var s = rat(x)
  var n = a.length
  var r = new Array(n)
  for(var i=0; i<n; ++i) {
    r[i] = mul(a[i], s)
  }
  return r
}

},{"big-rat":14,"big-rat/mul":23}],321:[function(require,module,exports){
'use strict'

var bnsub = require('big-rat/sub')

module.exports = sub

function sub(a, b) {
  var n = a.length
  var r = new Array(n)
    for(var i=0; i<n; ++i) {
    r[i] = bnsub(a[i], b[i])
  }
  return r
}

},{"big-rat/sub":26}],322:[function(require,module,exports){
(function (global){
module.exports =
  global.performance &&
  global.performance.now ? function now() {
    return performance.now()
  } : Date.now || function now() {
    return +new Date
  }

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],323:[function(require,module,exports){
"use strict"

var twoProduct = require("two-product")
var robustSum = require("robust-sum")
var robustDiff = require("robust-subtract")
var robustScale = require("robust-scale")

var NUM_EXPAND = 6

function cofactor(m, c) {
  var result = new Array(m.length-1)
  for(var i=1; i<m.length; ++i) {
    var r = result[i-1] = new Array(m.length-1)
    for(var j=0,k=0; j<m.length; ++j) {
      if(j === c) {
        continue
      }
      r[k++] = m[i][j]
    }
  }
  return result
}

function matrix(n) {
  var result = new Array(n)
  for(var i=0; i<n; ++i) {
    result[i] = new Array(n)
    for(var j=0; j<n; ++j) {
      result[i][j] = ["m", j, "[", (n-i-2), "]"].join("")
    }
  }
  return result
}

function generateSum(expr) {
  if(expr.length === 1) {
    return expr[0]
  } else if(expr.length === 2) {
    return ["sum(", expr[0], ",", expr[1], ")"].join("")
  } else {
    var m = expr.length>>1
    return ["sum(", generateSum(expr.slice(0, m)), ",", generateSum(expr.slice(m)), ")"].join("")
  }
}

function makeProduct(a, b) {
  if(a.charAt(0) === "m") {
    if(b.charAt(0) === "w") {
      var toks = a.split("[")
      return ["w", b.substr(1), "m", toks[0].substr(1)].join("")
    } else {
      return ["prod(", a, ",", b, ")"].join("")
    }
  } else {
    return makeProduct(b, a)
  }
}

function sign(s) {
  if(s & 1 !== 0) {
    return "-"
  }
  return ""
}

function determinant(m) {
  if(m.length === 2) {
    return [["diff(", makeProduct(m[0][0], m[1][1]), ",", makeProduct(m[1][0], m[0][1]), ")"].join("")]
  } else {
    var expr = []
    for(var i=0; i<m.length; ++i) {
      expr.push(["scale(", generateSum(determinant(cofactor(m, i))), ",", sign(i), m[0][i], ")"].join(""))
    }
    return expr
  }
}

function makeSquare(d, n) {
  var terms = []
  for(var i=0; i<n-2; ++i) {
    terms.push(["prod(m", d, "[", i, "],m", d, "[", i, "])"].join(""))
  }
  return generateSum(terms)
}

function orientation(n) {
  var pos = []
  var neg = []
  var m = matrix(n)
  for(var i=0; i<n; ++i) {
    m[0][i] = "1"
    m[n-1][i] = "w"+i
  } 
  for(var i=0; i<n; ++i) {
    if((i&1)===0) {
      pos.push.apply(pos,determinant(cofactor(m, i)))
    } else {
      neg.push.apply(neg,determinant(cofactor(m, i)))
    }
  }
  var posExpr = generateSum(pos)
  var negExpr = generateSum(neg)
  var funcName = "exactInSphere" + n
  var funcArgs = []
  for(var i=0; i<n; ++i) {
    funcArgs.push("m" + i)
  }
  var code = ["function ", funcName, "(", funcArgs.join(), "){"]
  for(var i=0; i<n; ++i) {
    code.push("var w",i,"=",makeSquare(i,n),";")
    for(var j=0; j<n; ++j) {
      if(j !== i) {
        code.push("var w",i,"m",j,"=scale(w",i,",m",j,"[0]);")
      }
    }
  }
  code.push("var p=", posExpr, ",n=", negExpr, ",d=diff(p,n);return d[d.length-1];}return ", funcName)
  var proc = new Function("sum", "diff", "prod", "scale", code.join(""))
  return proc(robustSum, robustDiff, twoProduct, robustScale)
}

function inSphere0() { return 0 }
function inSphere1() { return 0 }
function inSphere2() { return 0 }

var CACHED = [
  inSphere0,
  inSphere1,
  inSphere2
]

function slowInSphere(args) {
  var proc = CACHED[args.length]
  if(!proc) {
    proc = CACHED[args.length] = orientation(args.length)
  }
  return proc.apply(undefined, args)
}

function generateInSphereTest() {
  while(CACHED.length <= NUM_EXPAND) {
    CACHED.push(orientation(CACHED.length))
  }
  var args = []
  var procArgs = ["slow"]
  for(var i=0; i<=NUM_EXPAND; ++i) {
    args.push("a" + i)
    procArgs.push("o" + i)
  }
  var code = [
    "function testInSphere(", args.join(), "){switch(arguments.length){case 0:case 1:return 0;"
  ]
  for(var i=2; i<=NUM_EXPAND; ++i) {
    code.push("case ", i, ":return o", i, "(", args.slice(0, i).join(), ");")
  }
  code.push("}var s=new Array(arguments.length);for(var i=0;i<arguments.length;++i){s[i]=arguments[i]};return slow(s);}return testInSphere")
  procArgs.push(code.join(""))

  var proc = Function.apply(undefined, procArgs)

  module.exports = proc.apply(undefined, [slowInSphere].concat(CACHED))
  for(var i=0; i<=NUM_EXPAND; ++i) {
    module.exports[i] = CACHED[i]
  }
}

generateInSphereTest()
},{"robust-scale":325,"robust-subtract":327,"robust-sum":328,"two-product":361}],324:[function(require,module,exports){
"use strict"

var twoProduct = require("two-product")
var robustSum = require("robust-sum")
var robustScale = require("robust-scale")
var robustSubtract = require("robust-subtract")

var NUM_EXPAND = 5

var EPSILON     = 1.1102230246251565e-16
var ERRBOUND3   = (3.0 + 16.0 * EPSILON) * EPSILON
var ERRBOUND4   = (7.0 + 56.0 * EPSILON) * EPSILON

function cofactor(m, c) {
  var result = new Array(m.length-1)
  for(var i=1; i<m.length; ++i) {
    var r = result[i-1] = new Array(m.length-1)
    for(var j=0,k=0; j<m.length; ++j) {
      if(j === c) {
        continue
      }
      r[k++] = m[i][j]
    }
  }
  return result
}

function matrix(n) {
  var result = new Array(n)
  for(var i=0; i<n; ++i) {
    result[i] = new Array(n)
    for(var j=0; j<n; ++j) {
      result[i][j] = ["m", j, "[", (n-i-1), "]"].join("")
    }
  }
  return result
}

function sign(n) {
  if(n & 1) {
    return "-"
  }
  return ""
}

function generateSum(expr) {
  if(expr.length === 1) {
    return expr[0]
  } else if(expr.length === 2) {
    return ["sum(", expr[0], ",", expr[1], ")"].join("")
  } else {
    var m = expr.length>>1
    return ["sum(", generateSum(expr.slice(0, m)), ",", generateSum(expr.slice(m)), ")"].join("")
  }
}

function determinant(m) {
  if(m.length === 2) {
    return [["sum(prod(", m[0][0], ",", m[1][1], "),prod(-", m[0][1], ",", m[1][0], "))"].join("")]
  } else {
    var expr = []
    for(var i=0; i<m.length; ++i) {
      expr.push(["scale(", generateSum(determinant(cofactor(m, i))), ",", sign(i), m[0][i], ")"].join(""))
    }
    return expr
  }
}

function orientation(n) {
  var pos = []
  var neg = []
  var m = matrix(n)
  var args = []
  for(var i=0; i<n; ++i) {
    if((i&1)===0) {
      pos.push.apply(pos, determinant(cofactor(m, i)))
    } else {
      neg.push.apply(neg, determinant(cofactor(m, i)))
    }
    args.push("m" + i)
  }
  var posExpr = generateSum(pos)
  var negExpr = generateSum(neg)
  var funcName = "orientation" + n + "Exact"
  var code = ["function ", funcName, "(", args.join(), "){var p=", posExpr, ",n=", negExpr, ",d=sub(p,n);\
return d[d.length-1];};return ", funcName].join("")
  var proc = new Function("sum", "prod", "scale", "sub", code)
  return proc(robustSum, twoProduct, robustScale, robustSubtract)
}

var orientation3Exact = orientation(3)
var orientation4Exact = orientation(4)

var CACHED = [
  function orientation0() { return 0 },
  function orientation1() { return 0 },
  function orientation2(a, b) { 
    return b[0] - a[0]
  },
  function orientation3(a, b, c) {
    var l = (a[1] - c[1]) * (b[0] - c[0])
    var r = (a[0] - c[0]) * (b[1] - c[1])
    var det = l - r
    var s
    if(l > 0) {
      if(r <= 0) {
        return det
      } else {
        s = l + r
      }
    } else if(l < 0) {
      if(r >= 0) {
        return det
      } else {
        s = -(l + r)
      }
    } else {
      return det
    }
    var tol = ERRBOUND3 * s
    if(det >= tol || det <= -tol) {
      return det
    }
    return orientation3Exact(a, b, c)
  },
  function orientation4(a,b,c,d) {
    var adx = a[0] - d[0]
    var bdx = b[0] - d[0]
    var cdx = c[0] - d[0]
    var ady = a[1] - d[1]
    var bdy = b[1] - d[1]
    var cdy = c[1] - d[1]
    var adz = a[2] - d[2]
    var bdz = b[2] - d[2]
    var cdz = c[2] - d[2]
    var bdxcdy = bdx * cdy
    var cdxbdy = cdx * bdy
    var cdxady = cdx * ady
    var adxcdy = adx * cdy
    var adxbdy = adx * bdy
    var bdxady = bdx * ady
    var det = adz * (bdxcdy - cdxbdy) 
            + bdz * (cdxady - adxcdy)
            + cdz * (adxbdy - bdxady)
    var permanent = (Math.abs(bdxcdy) + Math.abs(cdxbdy)) * Math.abs(adz)
                  + (Math.abs(cdxady) + Math.abs(adxcdy)) * Math.abs(bdz)
                  + (Math.abs(adxbdy) + Math.abs(bdxady)) * Math.abs(cdz)
    var tol = ERRBOUND4 * permanent
    if ((det > tol) || (-det > tol)) {
      return det
    }
    return orientation4Exact(a,b,c,d)
  }
]

function slowOrient(args) {
  var proc = CACHED[args.length]
  if(!proc) {
    proc = CACHED[args.length] = orientation(args.length)
  }
  return proc.apply(undefined, args)
}

function generateOrientationProc() {
  while(CACHED.length <= NUM_EXPAND) {
    CACHED.push(orientation(CACHED.length))
  }
  var args = []
  var procArgs = ["slow"]
  for(var i=0; i<=NUM_EXPAND; ++i) {
    args.push("a" + i)
    procArgs.push("o" + i)
  }
  var code = [
    "function getOrientation(", args.join(), "){switch(arguments.length){case 0:case 1:return 0;"
  ]
  for(var i=2; i<=NUM_EXPAND; ++i) {
    code.push("case ", i, ":return o", i, "(", args.slice(0, i).join(), ");")
  }
  code.push("}var s=new Array(arguments.length);for(var i=0;i<arguments.length;++i){s[i]=arguments[i]};return slow(s);}return getOrientation")
  procArgs.push(code.join(""))

  var proc = Function.apply(undefined, procArgs)
  module.exports = proc.apply(undefined, [slowOrient].concat(CACHED))
  for(var i=0; i<=NUM_EXPAND; ++i) {
    module.exports[i] = CACHED[i]
  }
}

generateOrientationProc()
},{"robust-scale":325,"robust-subtract":327,"robust-sum":328,"two-product":361}],325:[function(require,module,exports){
"use strict"

var twoProduct = require("two-product")
var twoSum = require("two-sum")

module.exports = scaleLinearExpansion

function scaleLinearExpansion(e, scale) {
  var n = e.length
  if(n === 1) {
    var ts = twoProduct(e[0], scale)
    if(ts[0]) {
      return ts
    }
    return [ ts[1] ]
  }
  var g = new Array(2 * n)
  var q = [0.1, 0.1]
  var t = [0.1, 0.1]
  var count = 0
  twoProduct(e[0], scale, q)
  if(q[0]) {
    g[count++] = q[0]
  }
  for(var i=1; i<n; ++i) {
    twoProduct(e[i], scale, t)
    var pq = q[1]
    twoSum(pq, t[0], q)
    if(q[0]) {
      g[count++] = q[0]
    }
    var a = t[1]
    var b = q[1]
    var x = a + b
    var bv = x - a
    var y = b - bv
    q[1] = x
    if(y) {
      g[count++] = y
    }
  }
  if(q[1]) {
    g[count++] = q[1]
  }
  if(count === 0) {
    g[count++] = 0.0
  }
  g.length = count
  return g
}
},{"two-product":361,"two-sum":362}],326:[function(require,module,exports){
"use strict"

module.exports = segmentsIntersect

var orient = require("robust-orientation")[3]

function checkCollinear(a0, a1, b0, b1) {

  for(var d=0; d<2; ++d) {
    var x0 = a0[d]
    var y0 = a1[d]
    var l0 = Math.min(x0, y0)
    var h0 = Math.max(x0, y0)    

    var x1 = b0[d]
    var y1 = b1[d]
    var l1 = Math.min(x1, y1)
    var h1 = Math.max(x1, y1)    

    if(h1 < l0 || h0 < l1) {
      return false
    }
  }

  return true
}

function segmentsIntersect(a0, a1, b0, b1) {
  var x0 = orient(a0, b0, b1)
  var y0 = orient(a1, b0, b1)
  if((x0 > 0 && y0 > 0) || (x0 < 0 && y0 < 0)) {
    return false
  }

  var x1 = orient(b0, a0, a1)
  var y1 = orient(b1, a0, a1)
  if((x1 > 0 && y1 > 0) || (x1 < 0 && y1 < 0)) {
    return false
  }

  //Check for degenerate collinear case
  if(x0 === 0 && y0 === 0 && x1 === 0 && y1 === 0) {
    return checkCollinear(a0, a1, b0, b1)
  }

  return true
}
},{"robust-orientation":324}],327:[function(require,module,exports){
"use strict"

module.exports = robustSubtract

//Easy case: Add two scalars
function scalarScalar(a, b) {
  var x = a + b
  var bv = x - a
  var av = x - bv
  var br = b - bv
  var ar = a - av
  var y = ar + br
  if(y) {
    return [y, x]
  }
  return [x]
}

function robustSubtract(e, f) {
  var ne = e.length|0
  var nf = f.length|0
  if(ne === 1 && nf === 1) {
    return scalarScalar(e[0], -f[0])
  }
  var n = ne + nf
  var g = new Array(n)
  var count = 0
  var eptr = 0
  var fptr = 0
  var abs = Math.abs
  var ei = e[eptr]
  var ea = abs(ei)
  var fi = -f[fptr]
  var fa = abs(fi)
  var a, b
  if(ea < fa) {
    b = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    b = fi
    fptr += 1
    if(fptr < nf) {
      fi = -f[fptr]
      fa = abs(fi)
    }
  }
  if((eptr < ne && ea < fa) || (fptr >= nf)) {
    a = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    a = fi
    fptr += 1
    if(fptr < nf) {
      fi = -f[fptr]
      fa = abs(fi)
    }
  }
  var x = a + b
  var bv = x - a
  var y = b - bv
  var q0 = y
  var q1 = x
  var _x, _bv, _av, _br, _ar
  while(eptr < ne && fptr < nf) {
    if(ea < fa) {
      a = ei
      eptr += 1
      if(eptr < ne) {
        ei = e[eptr]
        ea = abs(ei)
      }
    } else {
      a = fi
      fptr += 1
      if(fptr < nf) {
        fi = -f[fptr]
        fa = abs(fi)
      }
    }
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
  }
  while(eptr < ne) {
    a = ei
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
    }
  }
  while(fptr < nf) {
    a = fi
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    } 
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    fptr += 1
    if(fptr < nf) {
      fi = -f[fptr]
    }
  }
  if(q0) {
    g[count++] = q0
  }
  if(q1) {
    g[count++] = q1
  }
  if(!count) {
    g[count++] = 0.0  
  }
  g.length = count
  return g
}
},{}],328:[function(require,module,exports){
"use strict"

module.exports = linearExpansionSum

//Easy case: Add two scalars
function scalarScalar(a, b) {
  var x = a + b
  var bv = x - a
  var av = x - bv
  var br = b - bv
  var ar = a - av
  var y = ar + br
  if(y) {
    return [y, x]
  }
  return [x]
}

function linearExpansionSum(e, f) {
  var ne = e.length|0
  var nf = f.length|0
  if(ne === 1 && nf === 1) {
    return scalarScalar(e[0], f[0])
  }
  var n = ne + nf
  var g = new Array(n)
  var count = 0
  var eptr = 0
  var fptr = 0
  var abs = Math.abs
  var ei = e[eptr]
  var ea = abs(ei)
  var fi = f[fptr]
  var fa = abs(fi)
  var a, b
  if(ea < fa) {
    b = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    b = fi
    fptr += 1
    if(fptr < nf) {
      fi = f[fptr]
      fa = abs(fi)
    }
  }
  if((eptr < ne && ea < fa) || (fptr >= nf)) {
    a = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    a = fi
    fptr += 1
    if(fptr < nf) {
      fi = f[fptr]
      fa = abs(fi)
    }
  }
  var x = a + b
  var bv = x - a
  var y = b - bv
  var q0 = y
  var q1 = x
  var _x, _bv, _av, _br, _ar
  while(eptr < ne && fptr < nf) {
    if(ea < fa) {
      a = ei
      eptr += 1
      if(eptr < ne) {
        ei = e[eptr]
        ea = abs(ei)
      }
    } else {
      a = fi
      fptr += 1
      if(fptr < nf) {
        fi = f[fptr]
        fa = abs(fi)
      }
    }
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
  }
  while(eptr < ne) {
    a = ei
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
    }
  }
  while(fptr < nf) {
    a = fi
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    } 
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    fptr += 1
    if(fptr < nf) {
      fi = f[fptr]
    }
  }
  if(q0) {
    g[count++] = q0
  }
  if(q1) {
    g[count++] = q1
  }
  if(!count) {
    g[count++] = 0.0  
  }
  g.length = count
  return g
}
},{}],329:[function(require,module,exports){
// square distance from a point to a segment
function getSqSegDist(p, p1, p2) {
    var x = p1[0],
        y = p1[1],
        dx = p2[0] - x,
        dy = p2[1] - y;

    if (dx !== 0 || dy !== 0) {

        var t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);

        if (t > 1) {
            x = p2[0];
            y = p2[1];

        } else if (t > 0) {
            x += dx * t;
            y += dy * t;
        }
    }

    dx = p[0] - x;
    dy = p[1] - y;

    return dx * dx + dy * dy;
}

function simplifyDPStep(points, first, last, sqTolerance, simplified) {
    var maxSqDist = sqTolerance,
        index;

    for (var i = first + 1; i < last; i++) {
        var sqDist = getSqSegDist(points[i], points[first], points[last]);

        if (sqDist > maxSqDist) {
            index = i;
            maxSqDist = sqDist;
        }
    }

    if (maxSqDist > sqTolerance) {
        if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
        simplified.push(points[index]);
        if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
    }
}

// simplification using Ramer-Douglas-Peucker algorithm
module.exports = function simplifyDouglasPeucker(points, tolerance) {
    if (points.length<=1)
        return points;
    tolerance = typeof tolerance === 'number' ? tolerance : 1;
    var sqTolerance = tolerance * tolerance;
    
    var last = points.length - 1;

    var simplified = [points[0]];
    simplifyDPStep(points, 0, last, sqTolerance, simplified);
    simplified.push(points[last]);

    return simplified;
}

},{}],330:[function(require,module,exports){
var simplifyRadialDist = require('./radial-distance')
var simplifyDouglasPeucker = require('./douglas-peucker')

//simplifies using both algorithms
module.exports = function simplify(points, tolerance) {
    points = simplifyRadialDist(points, tolerance);
    points = simplifyDouglasPeucker(points, tolerance);
    return points;
}

module.exports.radialDistance = simplifyRadialDist;
module.exports.douglasPeucker = simplifyDouglasPeucker;
},{"./douglas-peucker":329,"./radial-distance":331}],331:[function(require,module,exports){
function getSqDist(p1, p2) {
    var dx = p1[0] - p2[0],
        dy = p1[1] - p2[1];

    return dx * dx + dy * dy;
}

// basic distance-based simplification
module.exports = function simplifyRadialDist(points, tolerance) {
    if (points.length<=1)
        return points;
    tolerance = typeof tolerance === 'number' ? tolerance : 1;
    var sqTolerance = tolerance * tolerance;
    
    var prevPoint = points[0],
        newPoints = [prevPoint],
        point;

    for (var i = 1, len = points.length; i < len; i++) {
        point = points[i];

        if (getSqDist(point, prevPoint) > sqTolerance) {
            newPoints.push(point);
            prevPoint = point;
        }
    }

    if (prevPoint !== point) newPoints.push(point);

    return newPoints;
}
},{}],332:[function(require,module,exports){
var parseSVG = require('parse-svg-path')
var getContours = require('svg-path-contours')
var cdt2d = require('cdt2d')
var cleanPSLG = require('clean-pslg')
var getBounds = require('bound-points')
var normalize = require('normalize-path-scale')
var random = require('random-float')
var assign = require('object-assign')
var simplify = require('simplify-path')

module.exports = svgMesh3d
function svgMesh3d (svgPath, opt) {
  if (typeof svgPath !== 'string') {
    throw new TypeError('must provide a string as first parameter')
  }
  
  opt = assign({
    delaunay: true,
    clean: true,
    exterior: false,
    randomization: 0,
    simplify: 0,
    scale: 1
  }, opt)
  
  var i
  // parse string as a list of operations
  var svg = parseSVG(svgPath)
  
  // convert curves into discrete points
  var contours = getContours(svg, opt.scale)
  
  // optionally simplify the path for faster triangulation and/or aesthetics
  if (opt.simplify > 0 && typeof opt.simplify === 'number') {
    for (i = 0; i < contours.length; i++) {
      contours[i] = simplify(contours[i], opt.simplify)
    }
  }
  
  // prepare for triangulation
  var polyline = denestPolyline(contours)
  var positions = polyline.positions
  var bounds = getBounds(positions)

  // optionally add random points for aesthetics
  var randomization = opt.randomization
  if (typeof randomization === 'number' && randomization > 0) {
    addRandomPoints(positions, bounds, randomization)
  }
  
  var loops = polyline.edges
  var edges = []
  for (i = 0; i < loops.length; ++i) {
    var loop = loops[i]
    for (var j = 0; j < loop.length; ++j) {
      edges.push([loop[j], loop[(j + 1) % loop.length]])
    }
  }

  // this updates points/edges so that they now form a valid PSLG 
  if (opt.clean !== false) {
    cleanPSLG(positions, edges)
  }

  // triangulate mesh
  var cells = cdt2d(positions, edges, opt)

  // rescale to [-1 ... 1]
  normalize(positions, bounds)

  // convert to 3D representation and flip on Y axis for convenience w/ OpenGL
  to3D(positions)

  return {
    positions: positions,
    cells: cells
  }
}

function to3D (positions) {
  for (var i = 0; i < positions.length; i++) {
    var xy = positions[i]
    xy[1] *= -1
    xy[2] = xy[2] || 0
  }
}

function addRandomPoints (positions, bounds, count) {
  var min = bounds[0]
  var max = bounds[1]

  for (var i = 0; i < count; i++) {
    positions.push([ // random [ x, y ]
      random(min[0], max[0]),
      random(min[1], max[1])
    ])
  }
}

function denestPolyline (nested) {
  var positions = []
  var edges = []

  for (var i = 0; i < nested.length; i++) {
    var path = nested[i]
    var loop = []
    for (var j = 0; j < path.length; j++) {
      var pos = path[j]
      var idx = positions.indexOf(pos)
      if (idx === -1) {
        positions.push(pos)
        idx = positions.length - 1
      }
      loop.push(idx)
    }
    edges.push(loop)
  }
  return {
    positions: positions,
    edges: edges
  }
}

},{"bound-points":30,"cdt2d":40,"clean-pslg":45,"normalize-path-scale":307,"object-assign":309,"parse-svg-path":311,"random-float":317,"simplify-path":330,"svg-path-contours":345}],333:[function(require,module,exports){

module.exports = require('./lib/caster');
},{"./lib/caster":337}],334:[function(require,module,exports){
module.exports = BoundingBox;

// from https://github.com/gabelerner/canvg/blob/860e418aca67b9a41e858a223d74d375793ec364/canvg.js#L449

function BoundingBox(x1, y1, x2, y2) { // pass in initial points if you want
  this.x1 = Number.NaN;
  this.y1 = Number.NaN;
  this.x2 = Number.NaN;
  this.y2 = Number.NaN;

  this.addPoint(x1, y1);
  this.addPoint(x2, y2);
}

BoundingBox.prototype = {

  width: function () {
    return this.x2 - this.x1;
  },

  height: function () {
    return this.y2 - this.y1;
  },

  addPoint: function (x, y) {
    if (x != null) {
      if (isNaN(this.x1) || isNaN(this.x2)) {
        this.x1 = x;
        this.x2 = x;
      }
      if (x < this.x1) this.x1 = x;
      if (x > this.x2) this.x2 = x;
    }

    if (y != null) {
      if (isNaN(this.y1) || isNaN(this.y2)) {
        this.y1 = y;
        this.y2 = y;
      }
      if (y < this.y1) this.y1 = y;
      if (y > this.y2) this.y2 = y;
    }
  },

  addX: function (x) {
    this.addPoint(x, null);
  },

  addY: function (y) {
    this.addPoint(null, y);
  },

  addQuadraticCurve: function (p0x, p0y, p1x, p1y, p2x, p2y) {
    var cp1x = p0x + 2 / 3 * (p1x - p0x); // CP1 = QP0 + 2/3 *(QP1-QP0)
    var cp1y = p0y + 2 / 3 * (p1y - p0y); // CP1 = QP0 + 2/3 *(QP1-QP0)
    var cp2x = cp1x + 1 / 3 * (p2x - p0x); // CP2 = CP1 + 1/3 *(QP2-QP0)
    var cp2y = cp1y + 1 / 3 * (p2y - p0y); // CP2 = CP1 + 1/3 *(QP2-QP0)
    this.addBezierCurve(p0x, p0y, cp1x, cp2x, cp1y, cp2y, p2x, p2y);
  },

  addBezierCurve: function (p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y) {
    // from http://blog.hackers-cafe.net/2009/06/how-to-calculate-bezier-curves-bounding.html
    var
      i,
      p0 = [p0x, p0y],
      p1 = [p1x, p1y],
      p2 = [p2x, p2y],
      p3 = [p3x, p3y];

    this.addPoint(p0[0], p0[1]);
    this.addPoint(p3[0], p3[1]);

    for (i = 0; i <= 1; i++) {
      var f = function (t) {
        return Math.pow(1 - t, 3) * p0[i]
          + 3 * Math.pow(1 - t, 2) * t * p1[i]
          + 3 * (1 - t) * Math.pow(t, 2) * p2[i]
          + Math.pow(t, 3) * p3[i];
      };

      var b = 6 * p0[i] - 12 * p1[i] + 6 * p2[i];
      var a = -3 * p0[i] + 9 * p1[i] - 9 * p2[i] + 3 * p3[i];
      var c = 3 * p1[i] - 3 * p0[i];

      if (a == 0) {
        if (b == 0) continue;
        var t = -c / b;
        if (0 < t && t < 1) {
          if (i == 0) this.addX(f(t));
          if (i == 1) this.addY(f(t));
        }
        continue;
      }

      var b2ac = Math.pow(b, 2) - 4 * c * a;
      if (b2ac < 0) continue;
      var t1 = (-b + Math.sqrt(b2ac)) / (2 * a);
      if (0 < t1 && t1 < 1) {
        if (i == 0) this.addX(f(t1));
        if (i == 1) this.addY(f(t1));
      }
      var t2 = (-b - Math.sqrt(b2ac)) / (2 * a);
      if (0 < t2 && t2 < 1) {
        if (i == 0) this.addX(f(t2));
        if (i == 1) this.addY(f(t2));
      }
    }
  }

};


},{}],335:[function(require,module,exports){

module.exports = BoundingBoxView;

function BoundingBoxView(boundingBox) {

  this.x1 = this.minX = boundingBox.x1 || 0;
  this.y1 = this.minY = boundingBox.y1 || 0;
  this.x2 = this.maxX = boundingBox.x2 || 0;
  this.y2 = this.maxY = boundingBox.y2 || 0;
  this.width = boundingBox.width() || 0;
  this.height = boundingBox.height() || 0;

}

BoundingBoxView.prototype = {

  round: function(precision) {
    precision = precision || 0;

    this.x1 = this.minX = +this.x1.toFixed(precision);
    this.y1 = this.minY = +this.y1.toFixed(precision);
    this.x2 = this.maxX = +this.x2.toFixed(precision);
    this.y2 = this.maxY = +this.y2.toFixed(precision);
    this.width = +this.width.toFixed(precision);
    this.height = +this.height.toFixed(precision);

    return this;
  },

  scale: function(scale) {
    var
      self = this;

    scale = scale || 1;

    [
      'x1',
      'minX',
      'y1',
      'minY',
      'x2',
      'maxX',
      'y2',
      'maxY',
      'width',
      'height'
    ]
      .forEach(function(name) {
        self[name] = self[name] * scale;
      });

    return this;
  },

  toString: function() {
    return [
      this.minX,
      this.minY,
      this.width,
      this.height
    ]
      .join(' ');
  }

};
},{}],336:[function(require,module,exports){
var
  BoundingBox = require('./BoundingBox'),
  BoundingBoxView = require('./BoundingBoxView'),
  SvgPath = require('svgpath');

module.exports = Path;

function Path(d) {
  this.d = d;
}

Path.prototype = {

  getBoundingBox: function() {
    var
      pathDriver,
      boundingBox;

    pathDriver = new SvgPath(this.d);
    boundingBox = new BoundingBox();

    pathDriver
      .abs()
      .unarc()
      .unshort()
      .iterate(function(seg, index, x, y) {

        switch(seg[0]) {
          case 'M':
          case 'L':
            boundingBox.addPoint(
              seg[1],
              seg[2]
            );
            break;
          case 'H':
            boundingBox.addX(seg[1]);
            break;
          case 'V':
            boundingBox.addY(seg[1]);
            break;
          case 'Q':
            boundingBox.addQuadraticCurve(
              x,
              y,
              seg[1],
              seg[2],
              seg[3],
              seg[4]
            );
            break;
          case 'C':
            boundingBox.addBezierCurve(
              x,
              y,
              seg[1],
              seg[2],
              seg[3],
              seg[4],
              seg[5],
              seg[6]
            );
            break;
        }

      });

    return new BoundingBoxView(boundingBox);
  }

};

},{"./BoundingBox":334,"./BoundingBoxView":335,"svgpath":338}],337:[function(require,module,exports){
var
  Path = require('./Path/Path');

module.exports = caster;

function caster(path) {
  return new Path(path).getBoundingBox();
}

caster.Path = Path;
},{"./Path/Path":336}],338:[function(require,module,exports){
'use strict';

module.exports = require('./lib/svgpath');

},{"./lib/svgpath":343}],339:[function(require,module,exports){
// Convert an arc to a sequence of cubic bézier curves
//
'use strict';


var TAU = Math.PI * 2;


/* eslint-disable space-infix-ops */

// Calculate an angle between two vectors
//
function vector_angle(ux, uy, vx, vy) {
  var sign = (ux * vy - uy * vx < 0) ? -1 : 1;
  var umag = Math.sqrt(ux * ux + uy * uy);
  var vmag = Math.sqrt(ux * ux + uy * uy);
  var dot  = ux * vx + uy * vy;
  var div  = dot / (umag * vmag);

  // rounding errors, e.g. -1.0000000000000002 can screw up this
  if (div >  1.0) { div =  1.0; }
  if (div < -1.0) { div = -1.0; }

  return sign * Math.acos(div);
}


// Convert from endpoint to center parameterization,
// see http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
//
// Return [cx, cy, θ1, Δθ]
//
function get_arc_center(x1, y1, x2, y2, fa, fs, rx, ry, sin_φ, cos_φ) {
  // Step 1.
  //
  // Moving an ellipse so origin will be the middlepoint between our two
  // points. After that, rotate it to line up ellipse axes with coordinate
  // axes.
  //
  var x1p =  cos_φ*(x1-x2)/2 + sin_φ*(y1-y2)/2;
  var y1p = -sin_φ*(x1-x2)/2 + cos_φ*(y1-y2)/2;

  var rx_sq  =  rx * rx;
  var ry_sq  =  ry * ry;
  var x1p_sq = x1p * x1p;
  var y1p_sq = y1p * y1p;

  // Step 2.
  //
  // Compute coordinates of the centre of this ellipse (cx', cy')
  // in the new coordinate system.
  //
  var radicant = (rx_sq * ry_sq) - (rx_sq * y1p_sq) - (ry_sq * x1p_sq);

  if (radicant < 0) {
    // due to rounding errors it might be e.g. -1.3877787807814457e-17
    radicant = 0;
  }

  radicant /=   (rx_sq * y1p_sq) + (ry_sq * x1p_sq);
  radicant = Math.sqrt(radicant) * (fa === fs ? -1 : 1);

  var cxp = radicant *  rx/ry * y1p;
  var cyp = radicant * -ry/rx * x1p;

  // Step 3.
  //
  // Transform back to get centre coordinates (cx, cy) in the original
  // coordinate system.
  //
  var cx = cos_φ*cxp - sin_φ*cyp + (x1+x2)/2;
  var cy = sin_φ*cxp + cos_φ*cyp + (y1+y2)/2;

  // Step 4.
  //
  // Compute angles (θ1, Δθ).
  //
  var v1x =  (x1p - cxp) / rx;
  var v1y =  (y1p - cyp) / ry;
  var v2x = (-x1p - cxp) / rx;
  var v2y = (-y1p - cyp) / ry;

  var θ1 = vector_angle(1, 0, v1x, v1y);
  var Δθ = vector_angle(v1x, v1y, v2x, v2y);

  if (fs === 0 && Δθ > 0) {
    Δθ -= TAU;
  }
  if (fs === 1 && Δθ < 0) {
    Δθ += TAU;
  }

  return [ cx, cy, θ1, Δθ ];
}

//
// Approximate one unit arc segment with bézier curves,
// see http://math.stackexchange.com/questions/873224
//
function approximate_unit_arc(θ1, Δθ) {
  var α = 4/3 * Math.tan(Δθ/4);

  var x1 = Math.cos(θ1);
  var y1 = Math.sin(θ1);
  var x2 = Math.cos(θ1 + Δθ);
  var y2 = Math.sin(θ1 + Δθ);

  return [ x1, y1, x1 - y1*α, y1 + x1*α, x2 + y2*α, y2 - x2*α, x2, y2 ];
}

module.exports = function a2c(x1, y1, x2, y2, fa, fs, rx, ry, φ) {
  var sin_φ = Math.sin(φ * TAU / 360);
  var cos_φ = Math.cos(φ * TAU / 360);

  // Make sure radii are valid
  //
  var x1p =  cos_φ*(x1-x2)/2 + sin_φ*(y1-y2)/2;
  var y1p = -sin_φ*(x1-x2)/2 + cos_φ*(y1-y2)/2;

  if (x1p === 0 && y1p === 0) {
    // we're asked to draw line to itself
    return [];
  }

  if (rx === 0 || ry === 0) {
    // one of the radii is zero
    return [];
  }


  // Compensate out-of-range radii
  //
  rx = Math.abs(rx);
  ry = Math.abs(ry);

  var Λ = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (Λ > 1) {
    rx *= Math.sqrt(Λ);
    ry *= Math.sqrt(Λ);
  }


  // Get center parameters (cx, cy, θ1, Δθ)
  //
  var cc = get_arc_center(x1, y1, x2, y2, fa, fs, rx, ry, sin_φ, cos_φ);

  var result = [];
  var θ1 = cc[2];
  var Δθ = cc[3];

  // Split an arc to multiple segments, so each segment
  // will be less than τ/4 (= 90°)
  //
  var segments = Math.max(Math.ceil(Math.abs(Δθ) / (TAU / 4)), 1);
  Δθ /= segments;

  for (var i = 0; i < segments; i++) {
    result.push(approximate_unit_arc(θ1, Δθ));
    θ1 += Δθ;
  }

  // We have a bezier approximation of a unit circle,
  // now need to transform back to the original ellipse
  //
  return result.map(function (curve) {
    for (var i = 0; i < curve.length; i += 2) {
      var x = curve[i + 0];
      var y = curve[i + 1];

      // scale
      x *= rx;
      y *= ry;

      // rotate
      var xp = cos_φ*x - sin_φ*y;
      var yp = sin_φ*x + cos_φ*y;

      // translate
      curve[i + 0] = xp + cc[0];
      curve[i + 1] = yp + cc[1];
    }

    return curve;
  });
};

},{}],340:[function(require,module,exports){
'use strict';

/* eslint-disable space-infix-ops */

// The precision used to consider an ellipse as a circle
//
var epsilon = 0.0000000001;

// To convert degree in radians
//
var torad = Math.PI / 180;

// Class constructor :
//  an ellipse centred at 0 with radii rx,ry and x - axis - angle ax.
//
function Ellipse(rx, ry, ax) {
  if (!(this instanceof Ellipse)) { return new Ellipse(rx, ry, ax); }
  this.rx = rx;
  this.ry = ry;
  this.ax = ax;
}

// Apply a linear transform m to the ellipse
// m is an array representing a matrix :
//    -         -
//   | m[0] m[2] |
//   | m[1] m[3] |
//    -         -
//
Ellipse.prototype.transform = function (m) {
  // We consider the current ellipse as image of the unit circle
  // by first scale(rx,ry) and then rotate(ax) ...
  // So we apply ma =  m x rotate(ax) x scale(rx,ry) to the unit circle.
  var c = Math.cos(this.ax * torad), s = Math.sin(this.ax * torad);
  var ma = [ this.rx * (m[0]*c + m[2]*s),
             this.rx * (m[1]*c + m[3]*s),
             this.ry * (-m[0]*s + m[2]*c),
             this.ry * (-m[1]*s + m[3]*c) ];

  // ma * transpose(ma) = [ J L ]
  //                      [ L K ]
  // L is calculated later (if the image is not a circle)
  var J = ma[0]*ma[0] + ma[2]*ma[2],
      K = ma[1]*ma[1] + ma[3]*ma[3];

  // the discriminant of the characteristic polynomial of ma * transpose(ma)
  var D = ((ma[0]-ma[3])*(ma[0]-ma[3]) + (ma[2]+ma[1])*(ma[2]+ma[1])) *
          ((ma[0]+ma[3])*(ma[0]+ma[3]) + (ma[2]-ma[1])*(ma[2]-ma[1]));

  // the "mean eigenvalue"
  var JK = (J + K) / 2;

  // check if the image is (almost) a circle
  if (D < epsilon * JK) {
    // if it is
    this.rx = this.ry = Math.sqrt(JK);
    this.ax = 0;
    return this;
  }

  // if it is not a circle
  var L = ma[0]*ma[1] + ma[2]*ma[3];

  D = Math.sqrt(D);

  // {l1,l2} = the two eigen values of ma * transpose(ma)
  var l1 = JK + D/2,
      l2 = JK - D/2;
  // the x - axis - rotation angle is the argument of the l1 - eigenvector
  this.ax = (L === 0 && l1 === K) ?
    90
  :
    Math.atan(Math.abs(L) > Math.abs(l1 - K) ?
      (l1 - J) / L
    :
      L / (l1 - K)
    ) * 180 / Math.PI;

  // if ax > 0 => rx = sqrt(l1), ry = sqrt(l2), else exchange axes and ax += 90
  if (this.ax >= 0) {
    // if ax in [0,90]
    this.rx = Math.sqrt(l1);
    this.ry = Math.sqrt(l2);
  } else {
    // if ax in ]-90,0[ => exchange axes
    this.ax += 90;
    this.rx = Math.sqrt(l2);
    this.ry = Math.sqrt(l1);
  }

  return this;
};

// Check if the ellipse is (almost) degenerate, i.e. rx = 0 or ry = 0
//
Ellipse.prototype.isDegenerate = function () {
  return (this.rx < epsilon * this.ry || this.ry < epsilon * this.rx);
};

module.exports = Ellipse;

},{}],341:[function(require,module,exports){
'use strict';

// combine 2 matrixes
// m1, m2 - [a, b, c, d, e, g]
//
function combine(m1, m2) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
  ];
}


function Matrix() {
  if (!(this instanceof Matrix)) { return new Matrix(); }
  this.queue = [];   // list of matrixes to apply
  this.cache = null; // combined matrix cache
}


Matrix.prototype.matrix = function (m) {
  if (m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0) {
    return this;
  }
  this.cache = null;
  this.queue.push(m);
  return this;
};


Matrix.prototype.translate = function (tx, ty) {
  if (tx !== 0 || ty !== 0) {
    this.cache = null;
    this.queue.push([ 1, 0, 0, 1, tx, ty ]);
  }
  return this;
};


Matrix.prototype.scale = function (sx, sy) {
  if (sx !== 1 || sy !== 1) {
    this.cache = null;
    this.queue.push([ sx, 0, 0, sy, 0, 0 ]);
  }
  return this;
};


Matrix.prototype.rotate = function (angle, rx, ry) {
  var rad, cos, sin;

  if (angle !== 0) {
    this.translate(rx, ry);

    rad = angle * Math.PI / 180;
    cos = Math.cos(rad);
    sin = Math.sin(rad);

    this.queue.push([ cos, sin, -sin, cos, 0, 0 ]);
    this.cache = null;

    this.translate(-rx, -ry);
  }
  return this;
};


Matrix.prototype.skewX = function (angle) {
  if (angle !== 0) {
    this.cache = null;
    this.queue.push([ 1, 0, Math.tan(angle * Math.PI / 180), 1, 0, 0 ]);
  }
  return this;
};


Matrix.prototype.skewY = function (angle) {
  if (angle !== 0) {
    this.cache = null;
    this.queue.push([ 1, Math.tan(angle * Math.PI / 180), 0, 1, 0, 0 ]);
  }
  return this;
};


// Flatten queue
//
Matrix.prototype.toArray = function () {
  if (this.cache) {
    return this.cache;
  }

  if (!this.queue.length) {
    this.cache = [ 1, 0, 0, 1, 0, 0 ];
    return this.cache;
  }

  this.cache = this.queue[0];

  if (this.queue.length === 1) {
    return this.cache;
  }

  for (var i = 1; i < this.queue.length; i++) {
    this.cache = combine(this.cache, this.queue[i]);
  }

  return this.cache;
};


// Apply list of matrixes to (x,y) point.
// If `isRelative` set, `translate` component of matrix will be skipped
//
Matrix.prototype.calc = function (x, y, isRelative) {
  var m, i, len;

  // Don't change point on empty transforms queue
  if (!this.queue.length) { return [ x, y ]; }

  // Calculate final matrix, if not exists
  //
  // NB. if you deside to apply transforms to point one-by-one,
  // they should be taken in reverse order

  if (!this.cache) {
    this.cache = this.toArray();
  }

  m = this.cache;

  // Apply matrix to point
  return [
    x * m[0] + y * m[2] + (isRelative ? 0 : m[4]),
    x * m[1] + y * m[3] + (isRelative ? 0 : m[5])
  ];
};


module.exports = Matrix;

},{}],342:[function(require,module,exports){
'use strict';


var paramCounts = { a: 7, c: 6, h: 1, l: 2, m: 2, r: 4, q: 4, s: 4, t: 2, v: 1, z: 0 };

var SPECIAL_SPACES = [
  0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006,
  0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF
];

function isSpace(ch) {
  return (ch === 0x0A) || (ch === 0x0D) || (ch === 0x2028) || (ch === 0x2029) || // Line terminators
    // White spaces
    (ch === 0x20) || (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
    (ch >= 0x1680 && SPECIAL_SPACES.indexOf(ch) >= 0);
}

function isCommand(code) {
  /*eslint-disable no-bitwise*/
  switch (code | 0x20) {
    case 0x6D/* m */:
    case 0x7A/* z */:
    case 0x6C/* l */:
    case 0x68/* h */:
    case 0x76/* v */:
    case 0x63/* c */:
    case 0x73/* s */:
    case 0x71/* q */:
    case 0x74/* t */:
    case 0x61/* a */:
    case 0x72/* r */:
      return true;
  }
  return false;
}

function isDigit(code) {
  return (code >= 48 && code <= 57);   // 0..9
}

function isDigitStart(code) {
  return (code >= 48 && code <= 57) || /* 0..9 */
          code === 0x2B || /* + */
          code === 0x2D || /* - */
          code === 0x2E;   /* . */
}


function State(path) {
  this.index  = 0;
  this.path   = path;
  this.max    = path.length;
  this.result = [];
  this.param  = 0.0;
  this.err    = '';
  this.segmentStart = 0;
  this.data   = [];
}

function skipSpaces(state) {
  while (state.index < state.max && isSpace(state.path.charCodeAt(state.index))) {
    state.index++;
  }
}


function scanParam(state) {
  var start = state.index,
      index = start,
      max = state.max,
      zeroFirst = false,
      hasCeiling = false,
      hasDecimal = false,
      hasDot = false,
      ch;

  if (index >= max) {
    state.err = 'SvgPath: missed param (at pos ' + index + ')';
    return;
  }
  ch = state.path.charCodeAt(index);

  if (ch === 0x2B/* + */ || ch === 0x2D/* - */) {
    index++;
    ch = (index < max) ? state.path.charCodeAt(index) : 0;
  }

  // This logic is shamelessly borrowed from Esprima
  // https://github.com/ariya/esprimas
  //
  if (!isDigit(ch) && ch !== 0x2E/* . */) {
    state.err = 'SvgPath: param should start with 0..9 or `.` (at pos ' + index + ')';
    return;
  }

  if (ch !== 0x2E/* . */) {
    zeroFirst = (ch === 0x30/* 0 */);
    index++;

    ch = (index < max) ? state.path.charCodeAt(index) : 0;

    if (zeroFirst && index < max) {
      // decimal number starts with '0' such as '09' is illegal.
      if (ch && isDigit(ch)) {
        state.err = 'SvgPath: numbers started with `0` such as `09` are ilegal (at pos ' + start + ')';
        return;
      }
    }

    while (index < max && isDigit(state.path.charCodeAt(index))) {
      index++;
      hasCeiling = true;
    }
    ch = (index < max) ? state.path.charCodeAt(index) : 0;
  }

  if (ch === 0x2E/* . */) {
    hasDot = true;
    index++;
    while (isDigit(state.path.charCodeAt(index))) {
      index++;
      hasDecimal = true;
    }
    ch = (index < max) ? state.path.charCodeAt(index) : 0;
  }

  if (ch === 0x65/* e */ || ch === 0x45/* E */) {
    if (hasDot && !hasCeiling && !hasDecimal) {
      state.err = 'SvgPath: invalid float exponent (at pos ' + index + ')';
      return;
    }

    index++;

    ch = (index < max) ? state.path.charCodeAt(index) : 0;
    if (ch === 0x2B/* + */ || ch === 0x2D/* - */) {
      index++;
    }
    if (index < max && isDigit(state.path.charCodeAt(index))) {
      while (index < max && isDigit(state.path.charCodeAt(index))) {
        index++;
      }
    } else {
      state.err = 'SvgPath: invalid float exponent (at pos ' + index + ')';
      return;
    }
  }

  state.index = index;
  state.param = parseFloat(state.path.slice(start, index)) + 0.0;
}


function finalizeSegment(state) {
  var cmd, cmdLC;

  // Process duplicated commands (without comand name)

  // This logic is shamelessly borrowed from Raphael
  // https://github.com/DmitryBaranovskiy/raphael/
  //
  cmd   = state.path[state.segmentStart];
  cmdLC = cmd.toLowerCase();

  var params = state.data;

  if (cmdLC === 'm' && params.length > 2) {
    state.result.push([ cmd, params[0], params[1] ]);
    params = params.slice(2);
    cmdLC = 'l';
    cmd = (cmd === 'm') ? 'l' : 'L';
  }

  if (cmdLC === 'r') {
    state.result.push([ cmd ].concat(params));
  } else {

    while (params.length >= paramCounts[cmdLC]) {
      state.result.push([ cmd ].concat(params.splice(0, paramCounts[cmdLC])));
      if (!paramCounts[cmdLC]) {
        break;
      }
    }
  }
}


function scanSegment(state) {
  var max = state.max, cmdCode, comma_found,
            need_params, i;

  state.segmentStart = state.index;
  cmdCode = state.path.charCodeAt(state.index);

  if (!isCommand(cmdCode)) {
    state.err = 'SvgPath: bad command ' + state.path[state.index] + ' (at pos ' + state.index + ')';
    return;
  }

  need_params = paramCounts[state.path[state.index].toLowerCase()];

  state.index++;
  skipSpaces(state);

  state.data = [];

  if (!need_params) {
    // Z
    finalizeSegment(state);
    return;
  }

  comma_found = false;

  for (;;) {
    for (i = need_params; i > 0; i--) {
      scanParam(state);
      if (state.err.length) {
        return;
      }
      state.data.push(state.param);

      skipSpaces(state);
      comma_found = false;

      if (state.index < max && state.path.charCodeAt(state.index) === 0x2C/* , */) {
        state.index++;
        skipSpaces(state);
        comma_found = true;
      }
    }

    // after ',' param is mandatory
    if (comma_found) {
      continue;
    }

    if (state.index >= state.max) {
      break;
    }

    // Stop on next segment
    if (!isDigitStart(state.path.charCodeAt(state.index))) {
      break;
    }
  }

  finalizeSegment(state);
}


/* Returns array of segments:
 *
 * [
 *   [ command, coord1, coord2, ... ]
 * ]
 */
module.exports = function pathParse(svgPath) {
  var state = new State(svgPath);
  var max = state.max;

  skipSpaces(state);

  while (state.index < max && !state.err.length) {
    scanSegment(state);
  }

  if (state.err.length) {
    state.result = [];

  } else if (state.result.length) {

    if ('mM'.indexOf(state.result[0][0]) < 0) {
      state.err = 'SvgPath: string should start with `M` or `m`';
      state.result = [];
    } else {
      state.result[0][0] = 'M';
    }
  }

  return {
    err: state.err,
    segments: state.result
  };
};

},{}],343:[function(require,module,exports){
// SVG Path transformations library
//
// Usage:
//
//    SvgPath('...')
//      .translate(-150, -100)
//      .scale(0.5)
//      .translate(-150, -100)
//      .toFixed(1)
//      .toString()
//

'use strict';


var pathParse      = require('./path_parse');
var transformParse = require('./transform_parse');
var matrix         = require('./matrix');
var a2c            = require('./a2c');
var ellipse        = require('./ellipse');


// Class constructor
//
function SvgPath(path) {
  if (!(this instanceof SvgPath)) { return new SvgPath(path); }

  var pstate = pathParse(path);

  // Array of path segments.
  // Each segment is array [command, param1, param2, ...]
  this.segments = pstate.segments;

  // Error message on parse error.
  this.err      = pstate.err;

  // Transforms stack for lazy evaluation
  this.__stack    = [];
}


SvgPath.prototype.__matrix = function (m) {
  var self = this,
      ma, sx, sy, angle, arc2line, i;

  // Quick leave for empty matrix
  if (!m.queue.length) { return; }

  this.iterate(function (s, index, x, y) {
    var p, result, name, isRelative;

    switch (s[0]) {

      // Process 'assymetric' commands separately
      case 'v':
        p      = m.calc(0, s[1], true);
        result = (p[0] === 0) ? [ 'v', p[1] ] : [ 'l', p[0], p[1] ];
        break;

      case 'V':
        p      = m.calc(x, s[1], false);
        result = (p[0] === m.calc(x, y, false)[0]) ? [ 'V', p[1] ] : [ 'L', p[0], p[1] ];
        break;

      case 'h':
        p      = m.calc(s[1], 0, true);
        result = (p[1] === 0) ? [ 'h', p[0] ] : [ 'l', p[0], p[1] ];
        break;

      case 'H':
        p      = m.calc(s[1], y, false);
        result = (p[1] === m.calc(x, y, false)[1]) ? [ 'H', p[0] ] : [ 'L', p[0], p[1] ];
        break;

      case 'a':
      case 'A':
        // ARC is: ['A', rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]

        // Drop segment if arc is empty (end point === start point)
        /*if ((s[0] === 'A' && s[6] === x && s[7] === y) ||
            (s[0] === 'a' && s[6] === 0 && s[7] === 0)) {
          return [];
        }*/

        // Transform rx, ry and the x-axis-rotation
        var e = ellipse(s[1], s[2], s[3]).transform(m.toArray());

        // Transform end point as usual (without translation for relative notation)
        p = m.calc(s[6], s[7], s[0] === 'a');

        // Empty arcs can be ignored by renderer, but should not be dropped
        // to avoid collisions with `S A S` and so on. Replace with empty line.
        if ((s[0] === 'A' && s[6] === x && s[7] === y) ||
            (s[0] === 'a' && s[6] === 0 && s[7] === 0)) {
          result = [ s[0] === 'a' ? 'l' : 'L', p[0], p[1] ];
          break;
        }

        // if the resulting ellipse is (almost) a segment ...
        if (e.isDegenerate()) {
          // replace the arc by a line
          result = [ s[0] === 'a' ? 'l' : 'L', p[0], p[1] ];
        } else {
          // if it is a real ellipse
          // s[0], s[4] and s[5] are not modified
          result = [ s[0], e.rx, e.ry, e.ax, s[4], s[5], p[0], p[1] ];
        }

        break;

      case 'm':
        // Edge case. The very first `m` should be processed as absolute, if happens.
        // Make sense for coord shift transforms.
        isRelative = index > 0;

        p = m.calc(s[1], s[2], isRelative);
        result = [ 'm', p[0], p[1] ];
        break;

      default:
        name       = s[0];
        result     = [ name ];
        isRelative = (name.toLowerCase() === name);

        // Apply transformations to the segment
        for (i = 1; i < s.length; i += 2) {
          p = m.calc(s[i], s[i + 1], isRelative);
          result.push(p[0], p[1]);
        }
    }

    self.segments[index] = result;
  }, true);
};


// Apply stacked commands
//
SvgPath.prototype.__evaluateStack = function () {
  var m, i;

  if (!this.__stack.length) { return; }

  if (this.__stack.length === 1) {
    this.__matrix(this.__stack[0]);
    this.__stack = [];
    return;
  }

  m = matrix();
  i = this.__stack.length;

  while (--i >= 0) {
    m.matrix(this.__stack[i].toArray());
  }

  this.__matrix(m);
  this.__stack = [];
};


// Convert processed SVG Path back to string
//
SvgPath.prototype.toString = function () {
  var elements = [], skipCmd, cmd;

  this.__evaluateStack();

  for (var i = 0; i < this.segments.length; i++) {
    // remove repeating commands names
    cmd = this.segments[i][0];
    skipCmd = i > 0 && cmd !== 'm' && cmd !== 'M' && cmd === this.segments[i - 1][0];
    elements = elements.concat(skipCmd ? this.segments[i].slice(1) : this.segments[i]);
  }

  return elements.join(' ')
            // Optimizations: remove spaces around commands & before `-`
            //
            // We could also remove leading zeros for `0.5`-like values,
            // but their count is too small to spend time for.
            .replace(/ ?([achlmqrstvz]) ?/gi, '$1')
            .replace(/ \-/g, '-')
            // workaround for FontForge SVG importing bug
            .replace(/zm/g, 'z m');
};


// Translate path to (x [, y])
//
SvgPath.prototype.translate = function (x, y) {
  this.__stack.push(matrix().translate(x, y || 0));
  return this;
};


// Scale path to (sx [, sy])
// sy = sx if not defined
//
SvgPath.prototype.scale = function (sx, sy) {
  this.__stack.push(matrix().scale(sx, (!sy && (sy !== 0)) ? sx : sy));
  return this;
};


// Rotate path around point (sx [, sy])
// sy = sx if not defined
//
SvgPath.prototype.rotate = function (angle, rx, ry) {
  this.__stack.push(matrix().rotate(angle, rx || 0, ry || 0));
  return this;
};


// Apply matrix transform (array of 6 elements)
//
SvgPath.prototype.matrix = function (m) {
  this.__stack.push(matrix().matrix(m));
  return this;
};


// Transform path according to "transform" attr of SVG spec
//
SvgPath.prototype.transform = function (transformString) {
  if (!transformString.trim()) {
    return this;
  }
  this.__stack.push(transformParse(transformString));
  return this;
};


// Round coords with given decimal precition.
// 0 by default (to integers)
//
SvgPath.prototype.round = function (d) {
  var contourStartDeltaX = 0, contourStartDeltaY = 0, deltaX = 0, deltaY = 0, l;

  d = d || 0;

  this.__evaluateStack();

  this.segments.forEach(function (s) {
    var isRelative = (s[0].toLowerCase() === s[0]), t;

    switch (s[0]) {
      case 'H':
      case 'h':
        if (isRelative) { s[1] += deltaX; }
        deltaX = s[1] - s[1].toFixed(d);
        s[1] = +s[1].toFixed(d);
        return;

      case 'V':
      case 'v':
        if (isRelative) { s[1] += deltaY; }
        deltaY = s[1] - s[1].toFixed(d);
        s[1] = +s[1].toFixed(d);
        return;

      case 'Z':
      case 'z':
        deltaX = contourStartDeltaX;
        deltaY = contourStartDeltaY;
        return;

      case 'M':
      case 'm':
        if (isRelative) {
          s[1] += deltaX;
          s[2] += deltaY;
        }

        deltaX = s[1] - s[1].toFixed(d);
        deltaY = s[2] - s[2].toFixed(d);

        contourStartDeltaX = deltaX;
        contourStartDeltaY = deltaY;

        s[1] = +s[1].toFixed(d);
        s[2] = +s[2].toFixed(d);
        return;

      case 'A':
      case 'a':
        // [cmd, rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
        if (isRelative) {
          s[6] += deltaX;
          s[7] += deltaY;
        }

        deltaX = s[6] - s[6].toFixed(d);
        deltaY = s[7] - s[7].toFixed(d);

        s[1] = +s[1].toFixed(d);
        s[2] = +s[2].toFixed(d);
        s[3] = +s[3].toFixed(d + 2); // better precision for rotation
        s[6] = +s[6].toFixed(d);
        s[7] = +s[7].toFixed(d);
        return;

      default:
        // a c l q s t
        l = s.length;

        if (isRelative) {
          s[l - 2] += deltaX;
          s[l - 1] += deltaY;
        }

        deltaX = s[l - 2] - s[l - 2].toFixed(d);
        deltaY = s[l - 1] - s[l - 1].toFixed(d);

        s.forEach(function (val, i) {
          if (!i) { return; }
          s[i] = +s[i].toFixed(d);
        });
        return;
    }
  });

  return this;
};


// Apply iterator function to all segments. If function returns result,
// current segment will be replaced to array of returned segments.
// If empty array is returned, current regment will be deleted.
//
SvgPath.prototype.iterate = function (iterator, keepLazyStack) {
  var segments = this.segments,
      replacements = {},
      needReplace = false,
      lastX = 0,
      lastY = 0,
      countourStartX = 0,
      countourStartY = 0;
  var i, j, isRelative, newSegments;

  if (!keepLazyStack) {
    this.__evaluateStack();
  }

  segments.forEach(function (s, index) {

    var res = iterator(s, index, lastX, lastY);

    if (Array.isArray(res)) {
      replacements[index] = res;
      needReplace = true;
    }

    var isRelative = (s[0] === s[0].toLowerCase());

    // calculate absolute X and Y
    switch (s[0]) {
      case 'm':
      case 'M':
        lastX = s[1] + (isRelative ? lastX : 0);
        lastY = s[2] + (isRelative ? lastY : 0);
        countourStartX = lastX;
        countourStartY = lastY;
        return;

      case 'h':
      case 'H':
        lastX = s[1] + (isRelative ? lastX : 0);
        return;

      case 'v':
      case 'V':
        lastY = s[1] + (isRelative ? lastY : 0);
        return;

      case 'z':
      case 'Z':
        // That make sence for multiple contours
        lastX = countourStartX;
        lastY = countourStartY;
        return;

      default:
        lastX = s[s.length - 2] + (isRelative ? lastX : 0);
        lastY = s[s.length - 1] + (isRelative ? lastY : 0);
    }
  });

  // Replace segments if iterator return results

  if (!needReplace) { return this; }

  newSegments = [];

  for (i = 0; i < segments.length; i++) {
    if (typeof replacements[i] !== 'undefined') {
      for (j = 0; j < replacements[i].length; j++) {
        newSegments.push(replacements[i][j]);
      }
    } else {
      newSegments.push(segments[i]);
    }
  }

  this.segments = newSegments;

  return this;
};


// Converts segments from relative to absolute
//
SvgPath.prototype.abs = function () {

  this.iterate(function (s, index, x, y) {
    var name = s[0],
        nameUC = name.toUpperCase(),
        i;

    // Skip absolute commands
    if (name === nameUC) { return; }

    s[0] = nameUC;

    switch (name) {
      case 'v':
        // v has shifted coords parity
        s[1] += y;
        return;

      case 'a':
        // ARC is: ['A', rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
        // touch x, y only
        s[6] += x;
        s[7] += y;
        return;

      default:
        for (i = 1; i < s.length; i++) {
          s[i] += i % 2 ? x : y; // odd values are X, even - Y
        }
    }
  }, true);

  return this;
};


// Converts segments from absolute to relative
//
SvgPath.prototype.rel = function () {

  this.iterate(function (s, index, x, y) {
    var name = s[0],
        nameLC = name.toLowerCase(),
        i;

    // Skip relative commands
    if (name === nameLC) { return; }

    // Don't touch the first M to avoid potential confusions.
    if (index === 0 && name === 'M') { return; }

    s[0] = nameLC;

    switch (name) {
      case 'V':
        // V has shifted coords parity
        s[1] -= y;
        return;

      case 'A':
        // ARC is: ['A', rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
        // touch x, y only
        s[6] -= x;
        s[7] -= y;
        return;

      default:
        for (i = 1; i < s.length; i++) {
          s[i] -= i % 2 ? x : y; // odd values are X, even - Y
        }
    }
  }, true);

  return this;
};


// Converts arcs to cubic bézier curves
//
SvgPath.prototype.unarc = function () {
  this.iterate(function (s, index, x, y) {
    var i, new_segments, nextX, nextY, result = [], name = s[0];

    // Skip anything except arcs
    if (name !== 'A' && name !== 'a') { return null; }

    if (name === 'a') {
      // convert relative arc coordinates to absolute
      nextX = x + s[6];
      nextY = y + s[7];
    } else {
      nextX = s[6];
      nextY = s[7];
    }

    new_segments = a2c(x, y, nextX, nextY, s[4], s[5], s[1], s[2], s[3]);

    // Degenerated arcs can be ignored by renderer, but should not be dropped
    // to avoid collisions with `S A S` and so on. Replace with empty line.
    if (new_segments.length === 0) {
      return [ [ s[0] === 'a' ? 'l' : 'L', s[6], s[7] ] ];
    }

    new_segments.forEach(function (s) {
      result.push([ 'C', s[2], s[3], s[4], s[5], s[6], s[7] ]);
    });

    return result;
  });

  return this;
};


// Converts smooth curves (with missed control point) to generic curves
//
SvgPath.prototype.unshort = function () {
  var segments = this.segments;
  var prevControlX, prevControlY, prevSegment;
  var curControlX, curControlY;

  // TODO: add lazy evaluation flag when relative commands supported

  this.iterate(function (s, idx, x, y) {
    var name = s[0], nameUC = name.toUpperCase(), isRelative;

    // First command MUST be M|m, it's safe to skip.
    // Protect from access to [-1] for sure.
    if (!idx) { return; }

    if (nameUC === 'T') { // quadratic curve
      isRelative = (name === 't');

      prevSegment = segments[idx - 1];

      if (prevSegment[0] === 'Q') {
        prevControlX = prevSegment[1] - x;
        prevControlY = prevSegment[2] - y;
      } else if (prevSegment[0] === 'q') {
        prevControlX = prevSegment[1] - prevSegment[3];
        prevControlY = prevSegment[2] - prevSegment[4];
      } else {
        prevControlX = 0;
        prevControlY = 0;
      }

      curControlX = -prevControlX;
      curControlY = -prevControlY;

      if (!isRelative) {
        curControlX += x;
        curControlY += y;
      }

      segments[idx] = [
        isRelative ? 'q' : 'Q',
        curControlX, curControlY,
        s[1], s[2]
      ];

    } else if (nameUC === 'S') { // cubic curve
      isRelative = (name === 's');

      prevSegment = segments[idx - 1];

      if (prevSegment[0] === 'C') {
        prevControlX = prevSegment[3] - x;
        prevControlY = prevSegment[4] - y;
      } else if (prevSegment[0] === 'c') {
        prevControlX = prevSegment[3] - prevSegment[5];
        prevControlY = prevSegment[4] - prevSegment[6];
      } else {
        prevControlX = 0;
        prevControlY = 0;
      }

      curControlX = -prevControlX;
      curControlY = -prevControlY;

      if (!isRelative) {
        curControlX += x;
        curControlY += y;
      }

      segments[idx] = [
        isRelative ? 'c' : 'C',
        curControlX, curControlY,
        s[1], s[2], s[3], s[4]
      ];
    }
  });

  return this;
};


module.exports = SvgPath;

},{"./a2c":339,"./ellipse":340,"./matrix":341,"./path_parse":342,"./transform_parse":344}],344:[function(require,module,exports){
'use strict';


var Matrix = require('./matrix');

var operations = {
  matrix: true,
  scale: true,
  rotate: true,
  translate: true,
  skewX: true,
  skewY: true
};

var CMD_SPLIT_RE    = /\s*(matrix|translate|scale|rotate|skewX|skewY)\s*\(\s*(.+?)\s*\)[\s,]*/;
var PARAMS_SPLIT_RE = /[\s,]+/;


module.exports = function transformParse(transformString) {
  var matrix = new Matrix();
  var cmd, params;

  // Split value into ['', 'translate', '10 50', '', 'scale', '2', '', 'rotate',  '-45', '']
  transformString.split(CMD_SPLIT_RE).forEach(function (item) {

    // Skip empty elements
    if (!item.length) { return; }

    // remember operation
    if (typeof operations[item] !== 'undefined') {
      cmd = item;
      return;
    }

    // extract params & att operation to matrix
    params = item.split(PARAMS_SPLIT_RE).map(function (i) {
      return +i || 0;
    });

    // If params count is not correct - ignore command
    switch (cmd) {
      case 'matrix':
        if (params.length === 6) {
          matrix.matrix(params);
        }
        return;

      case 'scale':
        if (params.length === 1) {
          matrix.scale(params[0], params[0]);
        } else if (params.length === 2) {
          matrix.scale(params[0], params[1]);
        }
        return;

      case 'rotate':
        if (params.length === 1) {
          matrix.rotate(params[0], 0, 0);
        } else if (params.length === 3) {
          matrix.rotate(params[0], params[1], params[2]);
        }
        return;

      case 'translate':
        if (params.length === 1) {
          matrix.translate(params[0], 0);
        } else if (params.length === 2) {
          matrix.translate(params[0], params[1]);
        }
        return;

      case 'skewX':
        if (params.length === 1) {
          matrix.skewX(params[0]);
        }
        return;

      case 'skewY':
        if (params.length === 1) {
          matrix.skewY(params[0]);
        }
        return;
    }
  });

  return matrix;
};

},{"./matrix":341}],345:[function(require,module,exports){
var bezier = require('adaptive-bezier-curve')
var abs = require('abs-svg-path')
var norm = require('normalize-svg-path')
var copy = require('vec2-copy')

function set(out, x, y) {
    out[0] = x
    out[1] = y
    return out
}

var tmp1 = [0,0],
    tmp2 = [0,0],
    tmp3 = [0,0]

function bezierTo(points, scale, start, seg) {
    bezier(start, 
        set(tmp1, seg[1], seg[2]), 
        set(tmp2, seg[3], seg[4]),
        set(tmp3, seg[5], seg[6]), scale, points)
}

module.exports = function contours(svg, scale) {
    var paths = []

    var points = []
    var pen = [0, 0]
    norm(abs(svg)).forEach(function(segment, i, self) {
        if (segment[0] === 'M') {
            copy(pen, segment.slice(1))
            if (points.length>0) {
                paths.push(points)
                points = []
            }
        } else if (segment[0] === 'C') {
            bezierTo(points, scale, pen, segment)
            set(pen, segment[5], segment[6])
        } else {
            throw new Error('illegal type in SVG: '+segment[0])
        }
    })
    if (points.length>0)
        paths.push(points)
    return paths
}
},{"abs-svg-path":1,"adaptive-bezier-curve":3,"normalize-svg-path":308,"vec2-copy":368}],346:[function(require,module,exports){
/*!
* svg.js - A lightweight library for manipulating and animating SVG.
* @version 2.2.4
* http://www.svgjs.com
*
* @copyright Wout Fierens <wout@impinc.co.uk>
* @license MIT
*
* BUILT: Tue Dec 29 2015 13:14:32 GMT+0100 (Mitteleuropäische Zeit)
*/;
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(function(){
      return factory(root, root.document)
    })
  } else if (typeof exports === 'object') {
    module.exports = root.document ? factory(root, root.document) : function(w){ return factory(w, w.document) }
  } else {
    root.SVG = factory(root, root.document)
  }
}(typeof window !== "undefined" ? window : this, function(window, document) {

// The main wrapping element
var SVG = this.SVG = function(element) {
  if (SVG.supported) {
    element = new SVG.Doc(element)

    if (!SVG.parser)
      SVG.prepare(element)

    return element
  }
}

// Default namespaces
SVG.ns    = 'http://www.w3.org/2000/svg'
SVG.xmlns = 'http://www.w3.org/2000/xmlns/'
SVG.xlink = 'http://www.w3.org/1999/xlink'
SVG.svgjs = 'http://svgjs.com/svgjs'

// Svg support test
SVG.supported = (function() {
  return !! document.createElementNS &&
         !! document.createElementNS(SVG.ns,'svg').createSVGRect
})()

// Don't bother to continue if SVG is not supported
if (!SVG.supported) return false

// Element id sequence
SVG.did  = 1000

// Get next named element id
SVG.eid = function(name) {
  return 'Svgjs' + capitalize(name) + (SVG.did++)
}

// Method for element creation
SVG.create = function(name) {
  // create element
  var element = document.createElementNS(this.ns, name)

  // apply unique id
  element.setAttribute('id', this.eid(name))

  return element
}

// Method for extending objects
SVG.extend = function() {
  var modules, methods, key, i

  // Get list of modules
  modules = [].slice.call(arguments)

  // Get object with extensions
  methods = modules.pop()

  for (i = modules.length - 1; i >= 0; i--)
    if (modules[i])
      for (key in methods)
        modules[i].prototype[key] = methods[key]

  // Make sure SVG.Set inherits any newly added methods
  if (SVG.Set && SVG.Set.inherit)
    SVG.Set.inherit()
}

// Invent new element
SVG.invent = function(config) {
  // Create element initializer
  var initializer = typeof config.create == 'function' ?
    config.create :
    function() {
      this.constructor.call(this, SVG.create(config.create))
    }

  // Inherit prototype
  if (config.inherit)
    initializer.prototype = new config.inherit

  // Extend with methods
  if (config.extend)
    SVG.extend(initializer, config.extend)

  // Attach construct method to parent
  if (config.construct)
    SVG.extend(config.parent || SVG.Container, config.construct)

  return initializer
}

// Adopt existing svg elements
SVG.adopt = function(node) {
  // check for presence of node
  if (!node) return null

  // make sure a node isn't already adopted
  if (node.instance) return node.instance

  // initialize variables
  var element

  // adopt with element-specific settings
  if (node.nodeName == 'svg')
    element = node.parentNode instanceof SVGElement ? new SVG.Nested : new SVG.Doc
  else if (node.nodeName == 'linearGradient')
    element = new SVG.Gradient('linear')
  else if (node.nodeName == 'radialGradient')
    element = new SVG.Gradient('radial')
  else if (SVG[capitalize(node.nodeName)])
    element = new SVG[capitalize(node.nodeName)]
  else
    element = new SVG.Element(node)

  // ensure references
  element.type  = node.nodeName
  element.node  = node
  node.instance = element

  // SVG.Class specific preparations
  if (element instanceof SVG.Doc)
    element.namespace().defs()

  // pull svgjs data from the dom (getAttributeNS doesn't work in html5)
  element.setData(JSON.parse(node.getAttribute('svgjs:data')) || {})

  return element
}

// Initialize parsing element
SVG.prepare = function(element) {
  // Select document body and create invisible svg element
  var body = document.getElementsByTagName('body')[0]
    , draw = (body ? new SVG.Doc(body) : element.nested()).size(2, 0)
    , path = SVG.create('path')

  // Insert parsers
  draw.node.appendChild(path)

  // Create parser object
  SVG.parser = {
    body: body || element.parent()
  , draw: draw.style('opacity:0;position:fixed;left:100%;top:100%;overflow:hidden')
  , poly: draw.polyline().node
  , path: path
  }
}

// Storage for regular expressions
SVG.regex = {
  // Parse unit value
  unit:             /^(-?[\d\.]+)([a-z%]{0,2})$/

  // Parse hex value
, hex:              /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i

  // Parse rgb value
, rgb:              /rgb\((\d+),(\d+),(\d+)\)/

  // Parse reference id
, reference:        /#([a-z0-9\-_]+)/i

  // Parse matrix wrapper
, matrix:           /matrix\(|\)/g

  // Elements of a matrix
, matrixElements:   /,*\s+|,/

  // Whitespace
, whitespace:       /\s/g

  // Test hex value
, isHex:            /^#[a-f0-9]{3,6}$/i

  // Test rgb value
, isRgb:            /^rgb\(/

  // Test css declaration
, isCss:            /[^:]+:[^;]+;?/

  // Test for blank string
, isBlank:          /^(\s+)?$/

  // Test for numeric string
, isNumber:         /^-?[\d\.]+$/

  // Test for percent value
, isPercent:        /^-?[\d\.]+%$/

  // Test for image url
, isImage:          /\.(jpg|jpeg|png|gif|svg)(\?[^=]+.*)?/i

  // The following regex are used to parse the d attribute of a path

  // Replaces all negative exponents
, negExp:           /e\-/gi

  // Replaces all comma
, comma:            /,/g

  // Replaces all hyphens
, hyphen:           /\-/g

  // Replaces and tests for all path letters
, pathLetters:      /[MLHVCSQTAZ]/gi

  // yes we need this one, too
, isPathLetter:     /[MLHVCSQTAZ]/i

  // split at whitespaces
, whitespaces:      /\s+/

  // matches X
, X:                /X/g
}
SVG.utils = {
    // Map function
    map: function(array, block) {
    var i
      , il = array.length
      , result = []

    for (i = 0; i < il; i++)
      result.push(block(array[i]))

    return result
  }

  // Degrees to radians
, radians: function(d) {
    return d % 360 * Math.PI / 180
  }
  // Radians to degrees
, degrees: function(r) {
    return r * 180 / Math.PI % 360
  }
, filterSVGElements: function(p) {
    return [].filter.call(p, function(el){ return el instanceof SVGElement })
  }

}

SVG.defaults = {
  // Default attribute values
  attrs: {
    // fill and stroke
    'fill-opacity':     1
  , 'stroke-opacity':   1
  , 'stroke-width':     0
  , 'stroke-linejoin':  'miter'
  , 'stroke-linecap':   'butt'
  , fill:               '#000000'
  , stroke:             '#000000'
  , opacity:            1
    // position
  , x:                  0
  , y:                  0
  , cx:                 0
  , cy:                 0
    // size
  , width:              0
  , height:             0
    // radius
  , r:                  0
  , rx:                 0
  , ry:                 0
    // gradient
  , offset:             0
  , 'stop-opacity':     1
  , 'stop-color':       '#000000'
    // text
  , 'font-size':        16
  , 'font-family':      'Helvetica, Arial, sans-serif'
  , 'text-anchor':      'start'
  }

}
// Module for color convertions
SVG.Color = function(color) {
  var match

  // initialize defaults
  this.r = 0
  this.g = 0
  this.b = 0

  // parse color
  if (typeof color === 'string') {
    if (SVG.regex.isRgb.test(color)) {
      // get rgb values
      match = SVG.regex.rgb.exec(color.replace(/\s/g,''))

      // parse numeric values
      this.r = parseInt(match[1])
      this.g = parseInt(match[2])
      this.b = parseInt(match[3])

    } else if (SVG.regex.isHex.test(color)) {
      // get hex values
      match = SVG.regex.hex.exec(fullHex(color))

      // parse numeric values
      this.r = parseInt(match[1], 16)
      this.g = parseInt(match[2], 16)
      this.b = parseInt(match[3], 16)

    }

  } else if (typeof color === 'object') {
    this.r = color.r
    this.g = color.g
    this.b = color.b

  }

}

SVG.extend(SVG.Color, {
  // Default to hex conversion
  toString: function() {
    return this.toHex()
  }
  // Build hex value
, toHex: function() {
    return '#'
      + compToHex(this.r)
      + compToHex(this.g)
      + compToHex(this.b)
  }
  // Build rgb value
, toRgb: function() {
    return 'rgb(' + [this.r, this.g, this.b].join() + ')'
  }
  // Calculate true brightness
, brightness: function() {
    return (this.r / 255 * 0.30)
         + (this.g / 255 * 0.59)
         + (this.b / 255 * 0.11)
  }
  // Make color morphable
, morph: function(color) {
    this.destination = new SVG.Color(color)

    return this
  }
  // Get morphed color at given position
, at: function(pos) {
    // make sure a destination is defined
    if (!this.destination) return this

    // normalise pos
    pos = pos < 0 ? 0 : pos > 1 ? 1 : pos

    // generate morphed color
    return new SVG.Color({
      r: ~~(this.r + (this.destination.r - this.r) * pos)
    , g: ~~(this.g + (this.destination.g - this.g) * pos)
    , b: ~~(this.b + (this.destination.b - this.b) * pos)
    })
  }

})

// Testers

// Test if given value is a color string
SVG.Color.test = function(color) {
  color += ''
  return SVG.regex.isHex.test(color)
      || SVG.regex.isRgb.test(color)
}

// Test if given value is a rgb object
SVG.Color.isRgb = function(color) {
  return color && typeof color.r == 'number'
               && typeof color.g == 'number'
               && typeof color.b == 'number'
}

// Test if given value is a color
SVG.Color.isColor = function(color) {
  return SVG.Color.isRgb(color) || SVG.Color.test(color)
}
// Module for array conversion
SVG.Array = function(array, fallback) {
  array = (array || []).valueOf()

  // if array is empty and fallback is provided, use fallback
  if (array.length == 0 && fallback)
    array = fallback.valueOf()

  // parse array
  this.value = this.parse(array)
}

SVG.extend(SVG.Array, {
  // Make array morphable
  morph: function(array) {
    this.destination = this.parse(array)

    // normalize length of arrays
    if (this.value.length != this.destination.length) {
      var lastValue       = this.value[this.value.length - 1]
        , lastDestination = this.destination[this.destination.length - 1]

      while(this.value.length > this.destination.length)
        this.destination.push(lastDestination)
      while(this.value.length < this.destination.length)
        this.value.push(lastValue)
    }

    return this
  }
  // Clean up any duplicate points
, settle: function() {
    // find all unique values
    for (var i = 0, il = this.value.length, seen = []; i < il; i++)
      if (seen.indexOf(this.value[i]) == -1)
        seen.push(this.value[i])

    // set new value
    return this.value = seen
  }
  // Get morphed array at given position
, at: function(pos) {
    // make sure a destination is defined
    if (!this.destination) return this

    // generate morphed array
    for (var i = 0, il = this.value.length, array = []; i < il; i++)
      array.push(this.value[i] + (this.destination[i] - this.value[i]) * pos)

    return new SVG.Array(array)
  }
  // Convert array to string
, toString: function() {
    return this.value.join(' ')
  }
  // Real value
, valueOf: function() {
    return this.value
  }
  // Parse whitespace separated string
, parse: function(array) {
    array = array.valueOf()

    // if already is an array, no need to parse it
    if (Array.isArray(array)) return array

    return this.split(array)
  }
  // Strip unnecessary whitespace
, split: function(string) {
    return string.trim().split(/\s+/)
  }
  // Reverse array
, reverse: function() {
    this.value.reverse()

    return this
  }

})
// Poly points array
SVG.PointArray = function(array, fallback) {
  this.constructor.call(this, array, fallback || [[0,0]])
}

// Inherit from SVG.Array
SVG.PointArray.prototype = new SVG.Array

SVG.extend(SVG.PointArray, {
  // Convert array to string
  toString: function() {
    // convert to a poly point string
    for (var i = 0, il = this.value.length, array = []; i < il; i++)
      array.push(this.value[i].join(','))

    return array.join(' ')
  }
  // Convert array to line object
, toLine: function() {
    return {
      x1: this.value[0][0]
    , y1: this.value[0][1]
    , x2: this.value[1][0]
    , y2: this.value[1][1]
    }
  }
  // Get morphed array at given position
, at: function(pos) {
    // make sure a destination is defined
    if (!this.destination) return this

    // generate morphed point string
    for (var i = 0, il = this.value.length, array = []; i < il; i++)
      array.push([
        this.value[i][0] + (this.destination[i][0] - this.value[i][0]) * pos
      , this.value[i][1] + (this.destination[i][1] - this.value[i][1]) * pos
      ])

    return new SVG.PointArray(array)
  }
  // Parse point string
, parse: function(array) {
    array = array.valueOf()

    // if already is an array, no need to parse it
    if (Array.isArray(array)) return array

    // split points
    array = this.split(array)

    // parse points
    for (var i = 0, il = array.length, p, points = []; i < il; i++) {
      p = array[i].split(',')
      points.push([parseFloat(p[0]), parseFloat(p[1])])
    }

    return points
  }
  // Move point string
, move: function(x, y) {
    var box = this.bbox()

    // get relative offset
    x -= box.x
    y -= box.y

    // move every point
    if (!isNaN(x) && !isNaN(y))
      for (var i = this.value.length - 1; i >= 0; i--)
        this.value[i] = [this.value[i][0] + x, this.value[i][1] + y]

    return this
  }
  // Resize poly string
, size: function(width, height) {
    var i, box = this.bbox()

    // recalculate position of all points according to new size
    for (i = this.value.length - 1; i >= 0; i--) {
      this.value[i][0] = ((this.value[i][0] - box.x) * width)  / box.width  + box.x
      this.value[i][1] = ((this.value[i][1] - box.y) * height) / box.height + box.y
    }

    return this
  }
  // Get bounding box of points
, bbox: function() {
    SVG.parser.poly.setAttribute('points', this.toString())

    return SVG.parser.poly.getBBox()
  }

})
// Path points array
SVG.PathArray = function(array, fallback) {
  this.constructor.call(this, array, fallback || [['M', 0, 0]])
}

// Inherit from SVG.Array
SVG.PathArray.prototype = new SVG.Array

SVG.extend(SVG.PathArray, {
  // Convert array to string
  toString: function() {
    return arrayToString(this.value)
  }
  // Move path string
, move: function(x, y) {
    // get bounding box of current situation
    var box = this.bbox()

    // get relative offset
    x -= box.x
    y -= box.y

    if (!isNaN(x) && !isNaN(y)) {
      // move every point
      for (var l, i = this.value.length - 1; i >= 0; i--) {
        l = this.value[i][0]

        if (l == 'M' || l == 'L' || l == 'T')  {
          this.value[i][1] += x
          this.value[i][2] += y

        } else if (l == 'H')  {
          this.value[i][1] += x

        } else if (l == 'V')  {
          this.value[i][1] += y

        } else if (l == 'C' || l == 'S' || l == 'Q')  {
          this.value[i][1] += x
          this.value[i][2] += y
          this.value[i][3] += x
          this.value[i][4] += y

          if (l == 'C')  {
            this.value[i][5] += x
            this.value[i][6] += y
          }

        } else if (l == 'A')  {
          this.value[i][6] += x
          this.value[i][7] += y
        }

      }
    }

    return this
  }
  // Resize path string
, size: function(width, height) {
    // get bounding box of current situation
    var i, l, box = this.bbox()

    // recalculate position of all points according to new size
    for (i = this.value.length - 1; i >= 0; i--) {
      l = this.value[i][0]

      if (l == 'M' || l == 'L' || l == 'T')  {
        this.value[i][1] = ((this.value[i][1] - box.x) * width)  / box.width  + box.x
        this.value[i][2] = ((this.value[i][2] - box.y) * height) / box.height + box.y

      } else if (l == 'H')  {
        this.value[i][1] = ((this.value[i][1] - box.x) * width)  / box.width  + box.x

      } else if (l == 'V')  {
        this.value[i][1] = ((this.value[i][1] - box.y) * height) / box.height + box.y

      } else if (l == 'C' || l == 'S' || l == 'Q')  {
        this.value[i][1] = ((this.value[i][1] - box.x) * width)  / box.width  + box.x
        this.value[i][2] = ((this.value[i][2] - box.y) * height) / box.height + box.y
        this.value[i][3] = ((this.value[i][3] - box.x) * width)  / box.width  + box.x
        this.value[i][4] = ((this.value[i][4] - box.y) * height) / box.height + box.y

        if (l == 'C')  {
          this.value[i][5] = ((this.value[i][5] - box.x) * width)  / box.width  + box.x
          this.value[i][6] = ((this.value[i][6] - box.y) * height) / box.height + box.y
        }

      } else if (l == 'A')  {
        // resize radii
        this.value[i][1] = (this.value[i][1] * width)  / box.width
        this.value[i][2] = (this.value[i][2] * height) / box.height

        // move position values
        this.value[i][6] = ((this.value[i][6] - box.x) * width)  / box.width  + box.x
        this.value[i][7] = ((this.value[i][7] - box.y) * height) / box.height + box.y
      }

    }

    return this
  }
  // Absolutize and parse path to array
, parse: function(array) {
    // if it's already a patharray, no need to parse it
    if (array instanceof SVG.PathArray) return array.valueOf()

    // prepare for parsing
    var i, x0, y0, s, seg, arr
      , x = 0
      , y = 0
      , paramCnt = { 'M':2, 'L':2, 'H':1, 'V':1, 'C':6, 'S':4, 'Q':4, 'T':2, 'A':7 }

    if(typeof array == 'string'){

      array = array
        .replace(SVG.regex.negExp, 'X')         // replace all negative exponents with certain char
        .replace(SVG.regex.pathLetters, ' $& ') // put some room between letters and numbers
        .replace(SVG.regex.hyphen, ' -')        // add space before hyphen
        .replace(SVG.regex.comma, ' ')          // unify all spaces
        .replace(SVG.regex.X, 'e-')             // add back the expoent
        .trim()                                 // trim
        .split(SVG.regex.whitespaces)           // split into array

      // at this place there could be parts like ['3.124.854.32'] because we could not determine the point as seperator till now
      // we fix this elements in the next loop
      for(i = array.length; --i;){
        if(array[i].indexOf('.') != array[i].lastIndexOf('.')){
          var split = array[i].split('.') // split at the point
          var first = [split.shift(), split.shift()].join('.') // join the first number together
          array.splice.apply(array, [i, 1].concat(first, split.map(function(el){ return '.'+el }))) // add first and all other entries back to array
        }
      }

    }else{
      array = array.reduce(function(prev, curr){
        return [].concat.apply(prev, curr)
      }, [])
    }

    // array now is an array containing all parts of a path e.g. ['M', '0', '0', 'L', '30', '30' ...]

    var arr = []

    do{

      // Test if we have a path letter
      if(SVG.regex.isPathLetter.test(array[0])){
        s = array[0]
        array.shift()
      // If last letter was a move command and we got no new, it defaults to [L]ine
      }else if(s == 'M'){
        s = 'L'
      }else if(s == 'm'){
        s = 'l'
      }

      // add path letter as first element
      seg = [s.toUpperCase()]

      // push all necessary parameters to segment
      for(i = 0; i < paramCnt[seg[0]]; ++i){
        seg.push(parseFloat(array.shift()))
      }

      // upper case
      if(s == seg[0]){

        if(s == 'M' || s == 'L' || s == 'C' || s == 'Q'){
          x = seg[paramCnt[seg[0]]-1]
          y = seg[paramCnt[seg[0]]]
        }else if(s == 'V'){
          y = seg[1]
        }else if(s == 'H'){
          x = seg[1]
        }else if(s == 'A'){
          x = seg[6]
          y = seg[7]
        }

      // lower case
      }else{

        // convert relative to absolute values
        if(s == 'm' || s == 'l' || s == 'c' || s == 's' || s == 'q' || s == 't'){

          seg[1] += x
          seg[2] += y

          if(seg[3] != null){
            seg[3] += x
            seg[4] += y
          }

          if(seg[5] != null){
            seg[5] += x
            seg[6] += y
          }

          // move pointer
          x = seg[paramCnt[seg[0]]-1]
          y = seg[paramCnt[seg[0]]]

        }else if(s == 'v'){
          seg[1] += y
          y = seg[1]
        }else if(s == 'h'){
          seg[1] += x
          x = seg[1]
        }else if(s == 'a'){
          seg[6] += x
          seg[7] += y
          x = seg[6]
          y = seg[7]
        }

      }

      if(seg[0] == 'M'){
        x0 = x
        y0 = y
      }

      if(seg[0] == 'Z'){
        x = x0
        y = y0
      }

      arr.push(seg)

    }while(array.length)

    return arr

  }
  // Get bounding box of path
, bbox: function() {
    SVG.parser.path.setAttribute('d', this.toString())

    return SVG.parser.path.getBBox()
  }

})
// Module for unit convertions
SVG.Number = SVG.invent({
  // Initialize
  create: function(value, unit) {
    // initialize defaults
    this.value = 0
    this.unit  = unit || ''

    // parse value
    if (typeof value === 'number') {
      // ensure a valid numeric value
      this.value = isNaN(value) ? 0 : !isFinite(value) ? (value < 0 ? -3.4e+38 : +3.4e+38) : value

    } else if (typeof value === 'string') {
      unit = value.match(SVG.regex.unit)

      if (unit) {
        // make value numeric
        this.value = parseFloat(unit[1])

        // normalize
        if (unit[2] == '%')
          this.value /= 100
        else if (unit[2] == 's')
          this.value *= 1000

        // store unit
        this.unit = unit[2]
      }

    } else {
      if (value instanceof SVG.Number) {
        this.value = value.valueOf()
        this.unit  = value.unit
      }
    }

  }
  // Add methods
, extend: {
    // Stringalize
    toString: function() {
      return (
        this.unit == '%' ?
          ~~(this.value * 1e8) / 1e6:
        this.unit == 's' ?
          this.value / 1e3 :
          this.value
      ) + this.unit
    }
  , // Convert to primitive
    valueOf: function() {
      return this.value
    }
    // Add number
  , plus: function(number) {
      return new SVG.Number(this + new SVG.Number(number), this.unit)
    }
    // Subtract number
  , minus: function(number) {
      return this.plus(-new SVG.Number(number))
    }
    // Multiply number
  , times: function(number) {
      return new SVG.Number(this * new SVG.Number(number), this.unit)
    }
    // Divide number
  , divide: function(number) {
      return new SVG.Number(this / new SVG.Number(number), this.unit)
    }
    // Convert to different unit
  , to: function(unit) {
      var number = new SVG.Number(this)

      if (typeof unit === 'string')
        number.unit = unit

      return number
    }
    // Make number morphable
  , morph: function(number) {
      this.destination = new SVG.Number(number)

      return this
    }
    // Get morphed number at given position
  , at: function(pos) {
      // Make sure a destination is defined
      if (!this.destination) return this

      // Generate new morphed number
      return new SVG.Number(this.destination)
          .minus(this)
          .times(pos)
          .plus(this)
    }

  }
})

SVG.ViewBox = function(element) {
  var x, y, width, height
    , wm   = 1 // width multiplier
    , hm   = 1 // height multiplier
    , box  = element.bbox()
    , view = (element.attr('viewBox') || '').match(/-?[\d\.]+/g)
    , we   = element
    , he   = element

  // get dimensions of current node
  width  = new SVG.Number(element.width())
  height = new SVG.Number(element.height())

  // find nearest non-percentual dimensions
  while (width.unit == '%') {
    wm *= width.value
    width = new SVG.Number(we instanceof SVG.Doc ? we.parent().offsetWidth : we.parent().width())
    we = we.parent()
  }
  while (height.unit == '%') {
    hm *= height.value
    height = new SVG.Number(he instanceof SVG.Doc ? he.parent().offsetHeight : he.parent().height())
    he = he.parent()
  }

  // ensure defaults
  this.x      = box.x
  this.y      = box.y
  this.width  = width  * wm
  this.height = height * hm
  this.zoom   = 1

  if (view) {
    // get width and height from viewbox
    x      = parseFloat(view[0])
    y      = parseFloat(view[1])
    width  = parseFloat(view[2])
    height = parseFloat(view[3])

    // calculate zoom accoring to viewbox
    this.zoom = ((this.width / this.height) > (width / height)) ?
      this.height / height :
      this.width  / width

    // calculate real pixel dimensions on parent SVG.Doc element
    this.x      = x
    this.y      = y
    this.width  = width
    this.height = height

  }

}

//
SVG.extend(SVG.ViewBox, {
  // Parse viewbox to string
  toString: function() {
    return this.x + ' ' + this.y + ' ' + this.width + ' ' + this.height
  }

})

SVG.Element = SVG.invent({
  // Initialize node
  create: function(node) {
    // make stroke value accessible dynamically
    this._stroke = SVG.defaults.attrs.stroke

    // initialize data object
    this.dom = {}

    // create circular reference
    if (this.node = node) {
      this.type = node.nodeName
      this.node.instance = this

      // store current attribute value
      this._stroke = node.getAttribute('stroke') || this._stroke
    }
  }

  // Add class methods
, extend: {
    // Move over x-axis
    x: function(x) {
      return this.attr('x', x)
    }
    // Move over y-axis
  , y: function(y) {
      return this.attr('y', y)
    }
    // Move by center over x-axis
  , cx: function(x) {
      return x == null ? this.x() + this.width() / 2 : this.x(x - this.width() / 2)
    }
    // Move by center over y-axis
  , cy: function(y) {
      return y == null ? this.y() + this.height() / 2 : this.y(y - this.height() / 2)
    }
    // Move element to given x and y values
  , move: function(x, y) {
      return this.x(x).y(y)
    }
    // Move element by its center
  , center: function(x, y) {
      return this.cx(x).cy(y)
    }
    // Set width of element
  , width: function(width) {
      return this.attr('width', width)
    }
    // Set height of element
  , height: function(height) {
      return this.attr('height', height)
    }
    // Set element size to given width and height
  , size: function(width, height) {
      var p = proportionalSize(this.bbox(), width, height)

      return this
        .width(new SVG.Number(p.width))
        .height(new SVG.Number(p.height))
    }
    // Clone element
  , clone: function() {
      // clone element and assign new id
      var clone = assignNewId(this.node.cloneNode(true))

      // insert the clone after myself
      this.after(clone)

      return clone
    }
    // Remove element
  , remove: function() {
      if (this.parent())
        this.parent().removeElement(this)

      return this
    }
    // Replace element
  , replace: function(element) {
      this.after(element).remove()

      return element
    }
    // Add element to given container and return self
  , addTo: function(parent) {
      return parent.put(this)
    }
    // Add element to given container and return container
  , putIn: function(parent) {
      return parent.add(this)
    }
    // Get / set id
  , id: function(id) {
      return this.attr('id', id)
    }
    // Checks whether the given point inside the bounding box of the element
  , inside: function(x, y) {
      var box = this.bbox()

      return x > box.x
          && y > box.y
          && x < box.x + box.width
          && y < box.y + box.height
    }
    // Show element
  , show: function() {
      return this.style('display', '')
    }
    // Hide element
  , hide: function() {
      return this.style('display', 'none')
    }
    // Is element visible?
  , visible: function() {
      return this.style('display') != 'none'
    }
    // Return id on string conversion
  , toString: function() {
      return this.attr('id')
    }
    // Return array of classes on the node
  , classes: function() {
      var attr = this.attr('class')

      return attr == null ? [] : attr.trim().split(/\s+/)
    }
    // Return true if class exists on the node, false otherwise
  , hasClass: function(name) {
      return this.classes().indexOf(name) != -1
    }
    // Add class to the node
  , addClass: function(name) {
      if (!this.hasClass(name)) {
        var array = this.classes()
        array.push(name)
        this.attr('class', array.join(' '))
      }

      return this
    }
    // Remove class from the node
  , removeClass: function(name) {
      if (this.hasClass(name)) {
        this.attr('class', this.classes().filter(function(c) {
          return c != name
        }).join(' '))
      }

      return this
    }
    // Toggle the presence of a class on the node
  , toggleClass: function(name) {
      return this.hasClass(name) ? this.removeClass(name) : this.addClass(name)
    }
    // Get referenced element form attribute value
  , reference: function(attr) {
      return SVG.get(this.attr(attr))
    }
    // Returns the parent element instance
  , parent: function(type) {
      var parent = this

      // check for parent
      if(!parent.node.parentNode) return null

      // get parent element
      parent = SVG.adopt(parent.node.parentNode)

      if(!type) return parent

      // loop trough ancestors if type is given
      while(parent.node instanceof SVGElement){
        if(typeof type === 'string' ? parent.matches(type) : parent instanceof type) return parent
        parent = SVG.adopt(parent.node.parentNode)
      }
    }
    // Get parent document
  , doc: function() {
      return this instanceof SVG.Doc ? this : this.parent(SVG.Doc)
    }
    // return array of all ancestors of given type up to the root svg
  , parents: function(type) {
      var parents = [], parent = this

      do{
        parent = parent.parent(type)
        if(!parent || !parent.node) break

        parents.push(parent)
      } while(parent.parent)

      return parents
    }
    // matches the element vs a css selector
  , matches: function(selector){
      return matches(this.node, selector)
    }
    // Returns the svg node to call native svg methods on it
  , native: function() {
      return this.node
    }
    // Import raw svg
  , svg: function(svg) {
      // create temporary holder
      var well = document.createElement('svg')

      // act as a setter if svg is given
      if (svg && this instanceof SVG.Parent) {
        // dump raw svg
        well.innerHTML = '<svg>' + svg.replace(/\n/, '').replace(/<(\w+)([^<]+?)\/>/g, '<$1$2></$1>') + '</svg>'

        // transplant nodes
        for (var i = 0, il = well.firstChild.childNodes.length; i < il; i++)
          this.node.appendChild(well.firstChild.firstChild)

      // otherwise act as a getter
      } else {
        // create a wrapping svg element in case of partial content
        well.appendChild(svg = document.createElement('svg'))

        // write svgjs data to the dom
        this.writeDataToDom()

        // insert a copy of this node
        svg.appendChild(this.node.cloneNode(true))

        // return target element
        return well.innerHTML.replace(/^<svg>/, '').replace(/<\/svg>$/, '')
      }

      return this
    }
  // write svgjs data to the dom
  , writeDataToDom: function() {

      // dump variables recursively
      if(this.each || this.lines){
        var fn = this.each ? this : this.lines();
        fn.each(function(){
          this.writeDataToDom()
        })
      }

      // remove previously set data
      this.node.removeAttribute('svgjs:data')

      if(Object.keys(this.dom).length)
        this.node.setAttributeNS(SVG.svgjs, 'svgjs:data', JSON.stringify(this.dom))

      return this
    }
  // set given data to the elements data property
  , setData: function(o){
      this.dom = o
      return this
    }
  }
})

SVG.FX = SVG.invent({
  // Initialize FX object
  create: function(element) {
    // store target element
    this.target = element
  }

  // Add class methods
, extend: {
    // Add animation parameters and start animation
    animate: function(d, ease, delay) {
      var akeys, skeys, key
        , element = this.target
        , fx = this

      // dissect object if one is passed
      if (typeof d == 'object') {
        delay = d.delay
        ease = d.ease
        d = d.duration
      }

      // ensure default duration and easing
      d = d == '=' ? d : d == null ? 1000 : new SVG.Number(d).valueOf()
      ease = ease || '<>'

      // process values
      fx.at = function(pos) {
        var i

        // normalise pos
        pos = pos < 0 ? 0 : pos > 1 ? 1 : pos

        // collect attribute keys
        if (akeys == null) {
          akeys = []
          for (key in fx.attrs)
            akeys.push(key)

          // make sure morphable elements are scaled, translated and morphed all together
          if (element.morphArray && (fx.destination.plot || akeys.indexOf('points') > -1)) {
            // get destination
            var box
              , p = new element.morphArray(fx.destination.plot || fx.attrs.points || element.array())

            // add size
            if (fx.destination.size)
              p.size(fx.destination.size.width.to, fx.destination.size.height.to)

            // add movement
            box = p.bbox()
            if (fx.destination.x)
              p.move(fx.destination.x.to, box.y)
            else if (fx.destination.cx)
              p.move(fx.destination.cx.to - box.width / 2, box.y)

            box = p.bbox()
            if (fx.destination.y)
              p.move(box.x, fx.destination.y.to)
            else if (fx.destination.cy)
              p.move(box.x, fx.destination.cy.to - box.height / 2)

            // reset destination values
            fx.destination = {
              plot: element.array().morph(p)
            }
          }
        }

        // collect style keys
        if (skeys == null) {
          skeys = []
          for (key in fx.styles)
            skeys.push(key)
        }

        // apply easing
        pos = ease == '<>' ?
          (-Math.cos(pos * Math.PI) / 2) + 0.5 :
        ease == '>' ?
          Math.sin(pos * Math.PI / 2) :
        ease == '<' ?
          -Math.cos(pos * Math.PI / 2) + 1 :
        ease == '-' ?
          pos :
        typeof ease == 'function' ?
          ease(pos) :
          pos

        // run plot function
        if (fx.destination.plot) {
          element.plot(fx.destination.plot.at(pos))

        } else {
          // run all x-position properties
          if (fx.destination.x)
            element.x(fx.destination.x.at(pos))
          else if (fx.destination.cx)
            element.cx(fx.destination.cx.at(pos))

          // run all y-position properties
          if (fx.destination.y)
            element.y(fx.destination.y.at(pos))
          else if (fx.destination.cy)
            element.cy(fx.destination.cy.at(pos))

          // run all size properties
          if (fx.destination.size)
            element.size(fx.destination.size.width.at(pos), fx.destination.size.height.at(pos))
        }

        // run all viewbox properties
        if (fx.destination.viewbox)
          element.viewbox(
            fx.destination.viewbox.x.at(pos)
          , fx.destination.viewbox.y.at(pos)
          , fx.destination.viewbox.width.at(pos)
          , fx.destination.viewbox.height.at(pos)
          )

        // run leading property
        if (fx.destination.leading)
          element.leading(fx.destination.leading.at(pos))

        // animate attributes
        for (i = akeys.length - 1; i >= 0; i--)
          element.attr(akeys[i], at(fx.attrs[akeys[i]], pos))

        // animate styles
        for (i = skeys.length - 1; i >= 0; i--)
          element.style(skeys[i], at(fx.styles[skeys[i]], pos))

        // callback for each keyframe
        if (fx.situation.during)
          fx.situation.during.call(element, pos, function(from, to) {
            return at({ from: from, to: to }, pos)
          })
      }

      if (typeof d === 'number') {
        // delay animation
        this.timeout = setTimeout(function() {
          var start = new Date().getTime()

          // initialize situation object
          fx.situation.start    = start
          fx.situation.play     = true
          fx.situation.finish   = start + d
          fx.situation.duration = d
          fx.situation.ease     = ease

          // render function
          fx.render = function() {

            if (fx.situation.play === true) {
              // calculate pos
              var time = new Date().getTime()
                , pos = time > fx.situation.finish ? 1 : (time - fx.situation.start) / d

              // reverse pos if animation is reversed
              if (fx.situation.reversing)
                pos = -pos + 1

              // process values
              fx.at(pos)

              // finish off animation
              if (time > fx.situation.finish) {
                if (fx.destination.plot)
                  element.plot(new SVG.PointArray(fx.destination.plot.destination).settle())

                if (fx.situation.loop === true || (typeof fx.situation.loop == 'number' && fx.situation.loop > 0)) {
                  // register reverse
                  if (fx.situation.reverse)
                    fx.situation.reversing = !fx.situation.reversing

                  if (typeof fx.situation.loop == 'number') {
                    // reduce loop count
                    if (!fx.situation.reverse || fx.situation.reversing)
                      --fx.situation.loop

                    // remove last loop if reverse is disabled
                    if (!fx.situation.reverse && fx.situation.loop == 1)
                      --fx.situation.loop
                  }

                  fx.animate(d, ease, delay)
                } else {
                  fx.situation.after ? fx.situation.after.apply(element, [fx]) : fx.stop()
                }

              } else {
                fx.animationFrame = requestAnimationFrame(fx.render)
              }
            } else {
              fx.animationFrame = requestAnimationFrame(fx.render)
            }

          }

          // start animation
          fx.render()

        }, new SVG.Number(delay).valueOf())
      }

      return this
    }
    // Get bounding box of target element
  , bbox: function() {
      return this.target.bbox()
    }
    // Add animatable attributes
  , attr: function(a, v) {
      // apply attributes individually
      if (typeof a == 'object') {
        for (var key in a)
          this.attr(key, a[key])

      } else {
        // get the current state
        var from = this.target.attr(a)

        // detect format
        if (a == 'transform') {
          // merge given transformation with an existing one
          if (this.attrs[a])
            v = this.attrs[a].destination.multiply(v)

          // prepare matrix for morphing
          this.attrs[a] = (new SVG.Matrix(this.target)).morph(v)

          // add parametric rotation values
          if (this.param) {
            // get initial rotation
            v = this.target.transform('rotation')

            // add param
            this.attrs[a].param = {
              from: this.target.param || { rotation: v, cx: this.param.cx, cy: this.param.cy }
            , to:   this.param
            }
          }

        } else {
          this.attrs[a] = SVG.Color.isColor(v) ?
            // prepare color for morphing
            new SVG.Color(from).morph(v) :
          SVG.regex.unit.test(v) ?
            // prepare number for morphing
            new SVG.Number(from).morph(v) :
            // prepare for plain morphing
            { from: from, to: v }
        }
      }

      return this
    }
    // Add animatable styles
  , style: function(s, v) {
      if (typeof s == 'object')
        for (var key in s)
          this.style(key, s[key])

      else
        this.styles[s] = { from: this.target.style(s), to: v }

      return this
    }
    // Animatable x-axis
  , x: function(x) {
      this.destination.x = new SVG.Number(this.target.x()).morph(x)

      return this
    }
    // Animatable y-axis
  , y: function(y) {
      this.destination.y = new SVG.Number(this.target.y()).morph(y)

      return this
    }
    // Animatable center x-axis
  , cx: function(x) {
      this.destination.cx = new SVG.Number(this.target.cx()).morph(x)

      return this
    }
    // Animatable center y-axis
  , cy: function(y) {
      this.destination.cy = new SVG.Number(this.target.cy()).morph(y)

      return this
    }
    // Add animatable move
  , move: function(x, y) {
      return this.x(x).y(y)
    }
    // Add animatable center
  , center: function(x, y) {
      return this.cx(x).cy(y)
    }
    // Add animatable size
  , size: function(width, height) {
      if (this.target instanceof SVG.Text) {
        // animate font size for Text elements
        this.attr('font-size', width)

      } else {
        // animate bbox based size for all other elements
        var box = this.target.bbox()

        this.destination.size = {
          width:  new SVG.Number(box.width).morph(width)
        , height: new SVG.Number(box.height).morph(height)
        }
      }

      return this
    }
    // Add animatable plot
  , plot: function(p) {
      this.destination.plot = p

      return this
    }
    // Add leading method
  , leading: function(value) {
      if (this.target.destination.leading)
        this.destination.leading = new SVG.Number(this.target.destination.leading).morph(value)

      return this
    }
    // Add animatable viewbox
  , viewbox: function(x, y, width, height) {
      if (this.target instanceof SVG.Container) {
        var box = this.target.viewbox()

        this.destination.viewbox = {
          x:      new SVG.Number(box.x).morph(x)
        , y:      new SVG.Number(box.y).morph(y)
        , width:  new SVG.Number(box.width).morph(width)
        , height: new SVG.Number(box.height).morph(height)
        }
      }

      return this
    }
    // Add animateable gradient update
  , update: function(o) {
      if (this.target instanceof SVG.Stop) {
        if (o.opacity != null) this.attr('stop-opacity', o.opacity)
        if (o.color   != null) this.attr('stop-color', o.color)
        if (o.offset  != null) this.attr('offset', new SVG.Number(o.offset))
      }

      return this
    }
    // Add callback for each keyframe
  , during: function(during) {
      this.situation.during = during

      return this
    }
    // Callback after animation
  , after: function(after) {
      this.situation.after = after

      return this
    }
    // Make loopable
  , loop: function(times, reverse) {
      // store current loop and total loops
      this.situation.loop = this.situation.loops = times || true

      // make reversable
      this.situation.reverse = !!reverse

      return this
    }
    // Stop running animation
  , stop: function(fulfill) {
      // fulfill animation
      if (fulfill === true) {

        this.animate(0)

        if (this.situation.after)
          this.situation.after.apply(this.target, [this])

      } else {
        // stop current animation
        clearTimeout(this.timeout)
        cancelAnimationFrame(this.animationFrame);

        // reset storage for properties
        this.attrs       = {}
        this.styles      = {}
        this.situation   = {}
        this.destination = {}
      }

      return this
    }
    // Pause running animation
  , pause: function() {
      if (this.situation.play === true) {
        this.situation.play  = false
        this.situation.pause = new Date().getTime()
      }

      return this
    }
    // Play running animation
  , play: function() {
      if (this.situation.play === false) {
        var pause = new Date().getTime() - this.situation.pause

        this.situation.finish += pause
        this.situation.start  += pause
        this.situation.play    = true
      }

      return this
    }

  }

  // Define parent class
, parent: SVG.Element

  // Add method to parent elements
, construct: {
    // Get fx module or create a new one, then animate with given duration and ease
    animate: function(d, ease, delay) {
      return (this.fx || (this.fx = new SVG.FX(this))).stop().animate(d, ease, delay)
    }
    // Stop current animation; this is an alias to the fx instance
  , stop: function(fulfill) {
      if (this.fx)
        this.fx.stop(fulfill)

      return this
    }
    // Pause current animation
  , pause: function() {
      if (this.fx)
        this.fx.pause()

      return this
    }
    // Play paused current animation
  , play: function() {
      if (this.fx)
        this.fx.play()

      return this
    }

  }
})

SVG.BBox = SVG.invent({
  // Initialize
  create: function(element) {
    // get values if element is given
    if (element) {
      var box

      // yes this is ugly, but Firefox can be a bitch when it comes to elements that are not yet rendered
      try {
        // find native bbox
        box = element.node.getBBox()
      } catch(e) {
        if(element instanceof SVG.Shape){
          var clone = element.clone().addTo(SVG.parser.draw)
          box = clone.bbox()
          clone.remove()
        }else{
          box = {
            x:      element.node.clientLeft
          , y:      element.node.clientTop
          , width:  element.node.clientWidth
          , height: element.node.clientHeight
          }
        }
      }

      // plain x and y
      this.x = box.x
      this.y = box.y

      // plain width and height
      this.width  = box.width
      this.height = box.height
    }

    // add center, right and bottom
    fullBox(this)
  }

  // Define Parent
, parent: SVG.Element

  // Constructor
, construct: {
    // Get bounding box
    bbox: function() {
      return new SVG.BBox(this)
    }
  }

})

SVG.TBox = SVG.invent({
  // Initialize
  create: function(element) {
    // get values if element is given
    if (element) {
      var t   = element.ctm().extract()
        , box = element.bbox()

      // width and height including transformations
      this.width  = box.width  * t.scaleX
      this.height = box.height * t.scaleY

      // x and y including transformations
      this.x = box.x + t.x
      this.y = box.y + t.y
    }

    // add center, right and bottom
    fullBox(this)
  }

  // Define Parent
, parent: SVG.Element

  // Constructor
, construct: {
    // Get transformed bounding box
    tbox: function() {
      return new SVG.TBox(this)
    }
  }

})


SVG.RBox = SVG.invent({
  // Initialize
  create: function(element) {
    if (element) {
      var e    = element.doc().parent()
        , box  = element.node.getBoundingClientRect()
        , zoom = 1

      // get screen offset
      this.x = box.left
      this.y = box.top

      // subtract parent offset
      this.x -= e.offsetLeft
      this.y -= e.offsetTop

      while (e = e.offsetParent) {
        this.x -= e.offsetLeft
        this.y -= e.offsetTop
      }

      // calculate cumulative zoom from svg documents
      e = element
      while (e.parent && (e = e.parent())) {
        if (e.viewbox) {
          zoom *= e.viewbox().zoom
          this.x -= e.x() || 0
          this.y -= e.y() || 0
        }
      }

      // recalculate viewbox distortion
      this.width  = box.width  /= zoom
      this.height = box.height /= zoom
    }

    // add center, right and bottom
    fullBox(this)

    // offset by window scroll position, because getBoundingClientRect changes when window is scrolled
    this.x += window.pageXOffset
    this.y += window.pageYOffset
  }

  // define Parent
, parent: SVG.Element

  // Constructor
, construct: {
    // Get rect box
    rbox: function() {
      return new SVG.RBox(this)
    }
  }

})

// Add universal merge method
;[SVG.BBox, SVG.TBox, SVG.RBox].forEach(function(c) {

  SVG.extend(c, {
    // Merge rect box with another, return a new instance
    merge: function(box) {
      var b = new c()

      // merge boxes
      b.x      = Math.min(this.x, box.x)
      b.y      = Math.min(this.y, box.y)
      b.width  = Math.max(this.x + this.width,  box.x + box.width)  - b.x
      b.height = Math.max(this.y + this.height, box.y + box.height) - b.y

      return fullBox(b)
    }

  })

})

SVG.Matrix = SVG.invent({
  // Initialize
  create: function(source) {
    var i, base = arrayToMatrix([1, 0, 0, 1, 0, 0])

    // ensure source as object
    source = source instanceof SVG.Element ?
      source.matrixify() :
    typeof source === 'string' ?
      stringToMatrix(source) :
    arguments.length == 6 ?
      arrayToMatrix([].slice.call(arguments)) :
    typeof source === 'object' ?
      source : base

    // merge source
    for (i = abcdef.length - 1; i >= 0; i--)
      this[abcdef[i]] = source && typeof source[abcdef[i]] === 'number' ?
        source[abcdef[i]] : base[abcdef[i]]
  }

  // Add methods
, extend: {
    // Extract individual transformations
    extract: function() {
      // find delta transform points
      var px    = deltaTransformPoint(this, 0, 1)
        , py    = deltaTransformPoint(this, 1, 0)
        , skewX = 180 / Math.PI * Math.atan2(px.y, px.x) - 90

      return {
        // translation
        x:        this.e
      , y:        this.f
        // skew
      , skewX:    -skewX
      , skewY:    180 / Math.PI * Math.atan2(py.y, py.x)
        // scale
      , scaleX:   Math.sqrt(this.a * this.a + this.b * this.b)
      , scaleY:   Math.sqrt(this.c * this.c + this.d * this.d)
        // rotation
      , rotation: skewX
      , a: this.a
      , b: this.b
      , c: this.c
      , d: this.d
      , e: this.e
      , f: this.f
      }
    }
    // Clone matrix
  , clone: function() {
      return new SVG.Matrix(this)
    }
    // Morph one matrix into another
  , morph: function(matrix) {
      // store new destination
      this.destination = new SVG.Matrix(matrix)

      return this
    }
    // Get morphed matrix at a given position
  , at: function(pos) {
      // make sure a destination is defined
      if (!this.destination) return this

      // calculate morphed matrix at a given position
      var matrix = new SVG.Matrix({
        a: this.a + (this.destination.a - this.a) * pos
      , b: this.b + (this.destination.b - this.b) * pos
      , c: this.c + (this.destination.c - this.c) * pos
      , d: this.d + (this.destination.d - this.d) * pos
      , e: this.e + (this.destination.e - this.e) * pos
      , f: this.f + (this.destination.f - this.f) * pos
      })

      // process parametric rotation if present
      if (this.param && this.param.to) {
        // calculate current parametric position
        var param = {
          rotation: this.param.from.rotation + (this.param.to.rotation - this.param.from.rotation) * pos
        , cx:       this.param.from.cx
        , cy:       this.param.from.cy
        }

        // rotate matrix
        matrix = matrix.rotate(
          (this.param.to.rotation - this.param.from.rotation * 2) * pos
        , param.cx
        , param.cy
        )

        // store current parametric values
        matrix.param = param
      }

      return matrix
    }
    // Multiplies by given matrix
  , multiply: function(matrix) {
      return new SVG.Matrix(this.native().multiply(parseMatrix(matrix).native()))
    }
    // Inverses matrix
  , inverse: function() {
      return new SVG.Matrix(this.native().inverse())
    }
    // Translate matrix
  , translate: function(x, y) {
      return new SVG.Matrix(this.native().translate(x || 0, y || 0))
    }
    // Scale matrix
  , scale: function(x, y, cx, cy) {
      // support universal scale
      if (arguments.length == 1 || arguments.length == 3)
        y = x
      if (arguments.length == 3) {
        cy = cx
        cx = y
      }

      return this.around(cx, cy, new SVG.Matrix(x, 0, 0, y, 0, 0))
    }
    // Rotate matrix
  , rotate: function(r, cx, cy) {
      // convert degrees to radians
      r = SVG.utils.radians(r)

      return this.around(cx, cy, new SVG.Matrix(Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0))
    }
    // Flip matrix on x or y, at a given offset
  , flip: function(a, o) {
      return a == 'x' ? this.scale(-1, 1, o, 0) : this.scale(1, -1, 0, o)
    }
    // Skew
  , skew: function(x, y, cx, cy) {
      return this.around(cx, cy, this.native().skewX(x || 0).skewY(y || 0))
    }
    // SkewX
  , skewX: function(x, cx, cy) {
      return this.around(cx, cy, this.native().skewX(x || 0))
    }
    // SkewY
  , skewY: function(y, cx, cy) {
      return this.around(cx, cy, this.native().skewY(y || 0))
    }
    // Transform around a center point
  , around: function(cx, cy, matrix) {
      return this
        .multiply(new SVG.Matrix(1, 0, 0, 1, cx || 0, cy || 0))
        .multiply(matrix)
        .multiply(new SVG.Matrix(1, 0, 0, 1, -cx || 0, -cy || 0))
    }
    // Convert to native SVGMatrix
  , native: function() {
      // create new matrix
      var matrix = SVG.parser.draw.node.createSVGMatrix()

      // update with current values
      for (var i = abcdef.length - 1; i >= 0; i--)
        matrix[abcdef[i]] = this[abcdef[i]]

      return matrix
    }
    // Convert matrix to string
  , toString: function() {
      return 'matrix(' + this.a + ',' + this.b + ',' + this.c + ',' + this.d + ',' + this.e + ',' + this.f + ')'
    }
  }

  // Define parent
, parent: SVG.Element

  // Add parent method
, construct: {
    // Get current matrix
    ctm: function() {
      return new SVG.Matrix(this.node.getCTM())
    },
    // Get current screen matrix
    screenCTM: function() {
      return new SVG.Matrix(this.node.getScreenCTM())
    }

  }

})
SVG.extend(SVG.Element, {
  // Set svg element attribute
  attr: function(a, v, n) {
    // act as full getter
    if (a == null) {
      // get an object of attributes
      a = {}
      v = this.node.attributes
      for (n = v.length - 1; n >= 0; n--)
        a[v[n].nodeName] = SVG.regex.isNumber.test(v[n].nodeValue) ? parseFloat(v[n].nodeValue) : v[n].nodeValue

      return a

    } else if (typeof a == 'object') {
      // apply every attribute individually if an object is passed
      for (v in a) this.attr(v, a[v])

    } else if (v === null) {
        // remove value
        this.node.removeAttribute(a)

    } else if (v == null) {
      // act as a getter if the first and only argument is not an object
      v = this.node.getAttribute(a)
      return v == null ?
        SVG.defaults.attrs[a] :
      SVG.regex.isNumber.test(v) ?
        parseFloat(v) : v

    } else {
      // BUG FIX: some browsers will render a stroke if a color is given even though stroke width is 0
      if (a == 'stroke-width')
        this.attr('stroke', parseFloat(v) > 0 ? this._stroke : null)
      else if (a == 'stroke')
        this._stroke = v

      // convert image fill and stroke to patterns
      if (a == 'fill' || a == 'stroke') {
        if (SVG.regex.isImage.test(v))
          v = this.doc().defs().image(v, 0, 0)

        if (v instanceof SVG.Image)
          v = this.doc().defs().pattern(0, 0, function() {
            this.add(v)
          })
      }

      // ensure correct numeric values (also accepts NaN and Infinity)
      if (typeof v === 'number')
        v = new SVG.Number(v)

      // ensure full hex color
      else if (SVG.Color.isColor(v))
        v = new SVG.Color(v)

      // parse array values
      else if (Array.isArray(v))
        v = new SVG.Array(v)

      // store parametric transformation values locally
      else if (v instanceof SVG.Matrix && v.param)
        this.param = v.param

      // if the passed attribute is leading...
      if (a == 'leading') {
        // ... call the leading method instead
        if (this.leading)
          this.leading(v)
      } else {
        // set given attribute on node
        typeof n === 'string' ?
          this.node.setAttributeNS(n, a, v.toString()) :
          this.node.setAttribute(a, v.toString())
      }

      // rebuild if required
      if (this.rebuild && (a == 'font-size' || a == 'x'))
        this.rebuild(a, v)
    }

    return this
  }
})
SVG.extend(SVG.Element, SVG.FX, {
  // Add transformations
  transform: function(o, relative) {
    // get target in case of the fx module, otherwise reference this
    var target = this.target || this
      , matrix

    // act as a getter
    if (typeof o !== 'object') {
      // get current matrix
      matrix = new SVG.Matrix(target).extract()

      // add parametric rotation
      if (typeof this.param === 'object') {
        matrix.rotation = this.param.rotation
        matrix.cx       = this.param.cx
        matrix.cy       = this.param.cy
      }

      return typeof o === 'string' ? matrix[o] : matrix
    }

    // get current matrix
    matrix = this instanceof SVG.FX && this.attrs.transform ?
      this.attrs.transform :
      new SVG.Matrix(target)

    // ensure relative flag
    relative = !!relative || !!o.relative

    // act on matrix
    if (o.a != null) {
      matrix = relative ?
        // relative
        matrix.multiply(new SVG.Matrix(o)) :
        // absolute
        new SVG.Matrix(o)

    // act on rotation
    } else if (o.rotation != null) {
      // ensure centre point
      ensureCentre(o, target)

      // relativize rotation value
      if (relative) {
        o.rotation += this.param && this.param.rotation != null ?
          this.param.rotation :
          matrix.extract().rotation
      }

      // store parametric values
      this.param = o

      // apply transformation
      if (this instanceof SVG.Element) {
        matrix = relative ?
          // relative
          matrix.rotate(o.rotation, o.cx, o.cy) :
          // absolute
          matrix.rotate(o.rotation - matrix.extract().rotation, o.cx, o.cy)
      }

    // act on scale
    } else if (o.scale != null || o.scaleX != null || o.scaleY != null) {
      // ensure centre point
      ensureCentre(o, target)

      // ensure scale values on both axes
      o.scaleX = o.scale != null ? o.scale : o.scaleX != null ? o.scaleX : 1
      o.scaleY = o.scale != null ? o.scale : o.scaleY != null ? o.scaleY : 1

      if (!relative) {
        // absolute; multiply inversed values
        var e = matrix.extract()
        o.scaleX = o.scaleX * 1 / e.scaleX
        o.scaleY = o.scaleY * 1 / e.scaleY
      }

      matrix = matrix.scale(o.scaleX, o.scaleY, o.cx, o.cy)

    // act on skew
    } else if (o.skewX != null || o.skewY != null) {
      // ensure centre point
      ensureCentre(o, target)

      // ensure skew values on both axes
      o.skewX = o.skewX != null ? o.skewX : 0
      o.skewY = o.skewY != null ? o.skewY : 0

      if (!relative) {
        // absolute; reset skew values
        var e = matrix.extract()
        matrix = matrix.multiply(new SVG.Matrix().skew(e.skewX, e.skewY, o.cx, o.cy).inverse())
      }

      matrix = matrix.skew(o.skewX, o.skewY, o.cx, o.cy)

    // act on flip
    } else if (o.flip) {
      matrix = matrix.flip(
        o.flip
      , o.offset == null ? target.bbox()['c' + o.flip] : o.offset
      )

    // act on translate
    } else if (o.x != null || o.y != null) {
      if (relative) {
        // relative
        matrix = matrix.translate(o.x, o.y)
      } else {
        // absolute
        if (o.x != null) matrix.e = o.x
        if (o.y != null) matrix.f = o.y
      }
    }

    return this.attr(this instanceof SVG.Pattern ? 'patternTransform' : this instanceof SVG.Gradient ? 'gradientTransform' : 'transform', matrix)
  }
})

SVG.extend(SVG.Element, {
  // Reset all transformations
  untransform: function() {
    return this.attr('transform', null)
  },
  // merge the whole transformation chain into one matrix and returns it
  matrixify: function() {

    var matrix = (this.attr('transform') || '')
      // split transformations
      .split(/\)\s*/).slice(0,-1).map(function(str){
        // generate key => value pairs
        var kv = str.trim().split('(')
        return [kv[0], kv[1].split(SVG.regex.matrixElements).map(function(str){ return parseFloat(str) })]
      })
      // calculate every transformation into one matrix
      .reduce(function(matrix, transform){

        if(transform[0] == 'matrix') return matrix.multiply(arrayToMatrix(transform[1]))
        return matrix[transform[0]].apply(matrix, transform[1])

      }, new SVG.Matrix())

    return matrix
  },
  // add an element to another parent without changing the visual representation on the screen
  toParent: function(parent) {
    if(this == parent) return this
    var ctm = this.screenCTM()
    var temp = parent.rect(1,1)
    var pCtm = temp.screenCTM().inverse()
    temp.remove()

    this.addTo(parent).untransform().transform(pCtm.multiply(ctm))

    return this
  },
  // same as above with parent equals root-svg
  toDoc: function() {
    return this.toParent(this.doc())
  }

})

SVG.extend(SVG.Element, {
  // Dynamic style generator
  style: function(s, v) {
    if (arguments.length == 0) {
      // get full style
      return this.node.style.cssText || ''

    } else if (arguments.length < 2) {
      // apply every style individually if an object is passed
      if (typeof s == 'object') {
        for (v in s) this.style(v, s[v])

      } else if (SVG.regex.isCss.test(s)) {
        // parse css string
        s = s.split(';')

        // apply every definition individually
        for (var i = 0; i < s.length; i++) {
          v = s[i].split(':')
          this.style(v[0].replace(/\s+/g, ''), v[1])
        }
      } else {
        // act as a getter if the first and only argument is not an object
        return this.node.style[camelCase(s)]
      }

    } else {
      this.node.style[camelCase(s)] = v === null || SVG.regex.isBlank.test(v) ? '' : v
    }

    return this
  }
})
SVG.Parent = SVG.invent({
  // Initialize node
  create: function(element) {
    this.constructor.call(this, element)
  }

  // Inherit from
, inherit: SVG.Element

  // Add class methods
, extend: {
    // Returns all child elements
    children: function() {
      return SVG.utils.map(SVG.utils.filterSVGElements(this.node.childNodes), function(node) {
        return SVG.adopt(node)
      })
    }
    // Add given element at a position
  , add: function(element, i) {
      if (!this.has(element)) {
        // define insertion index if none given
        i = i == null ? this.children().length : i

        // add element references
        this.node.insertBefore(element.node, this.node.childNodes[i] || null)
      }

      return this
    }
    // Basically does the same as `add()` but returns the added element instead
  , put: function(element, i) {
      this.add(element, i)
      return element
    }
    // Checks if the given element is a child
  , has: function(element) {
      return this.index(element) >= 0
    }
    // Gets index of given element
  , index: function(element) {
      return this.children().indexOf(element)
    }
    // Get a element at the given index
  , get: function(i) {
      return this.children()[i]
    }
    // Get first child, skipping the defs node
  , first: function() {
      return this.children()[0]
    }
    // Get the last child
  , last: function() {
      return this.children()[this.children().length - 1]
    }
    // Iterates over all children and invokes a given block
  , each: function(block, deep) {
      var i, il
        , children = this.children()

      for (i = 0, il = children.length; i < il; i++) {
        if (children[i] instanceof SVG.Element)
          block.apply(children[i], [i, children])

        if (deep && (children[i] instanceof SVG.Container))
          children[i].each(block, deep)
      }

      return this
    }
    // Remove a given child
  , removeElement: function(element) {
      this.node.removeChild(element.node)

      return this
    }
    // Remove all elements in this container
  , clear: function() {
      // remove children
      while(this.node.hasChildNodes())
        this.node.removeChild(this.node.lastChild)

      // remove defs reference
      delete this._defs

      return this
    }
  , // Get defs
    defs: function() {
      return this.doc().defs()
    }
  }

})

SVG.extend(SVG.Parent, {

  ungroup: function(parent, depth) {
    if(depth === 0 || this instanceof SVG.Defs) return this

    parent = parent || (this instanceof SVG.Doc ? this : this.parent(SVG.Parent))
    depth = depth || Infinity

    this.each(function(){
      if(this instanceof SVG.Defs) return this
      if(this instanceof SVG.Parent) return this.ungroup(parent, depth-1)
      return this.toParent(parent)
    })

    this.node.firstChild || this.remove()

    return this
  },

  flatten: function(parent, depth) {
    return this.ungroup(parent, depth)
  }

})
SVG.Container = SVG.invent({
  // Initialize node
  create: function(element) {
    this.constructor.call(this, element)
  }

  // Inherit from
, inherit: SVG.Parent

  // Add class methods
, extend: {
    // Get the viewBox and calculate the zoom value
    viewbox: function(v) {
      if (arguments.length == 0)
        // act as a getter if there are no arguments
        return new SVG.ViewBox(this)

      // otherwise act as a setter
      v = arguments.length == 1 ?
        [v.x, v.y, v.width, v.height] :
        [].slice.call(arguments)

      return this.attr('viewBox', v)
    }
  }

})
// Add events to elements
;[  'click'
  , 'dblclick'
  , 'mousedown'
  , 'mouseup'
  , 'mouseover'
  , 'mouseout'
  , 'mousemove'
  // , 'mouseenter' -> not supported by IE
  // , 'mouseleave' -> not supported by IE
  , 'touchstart'
  , 'touchmove'
  , 'touchleave'
  , 'touchend'
  , 'touchcancel' ].forEach(function(event) {

  // add event to SVG.Element
  SVG.Element.prototype[event] = function(f) {
    var self = this

    // bind event to element rather than element node
    this.node['on' + event] = typeof f == 'function' ?
      function() { return f.apply(self, arguments) } : null

    return this
  }

})

// Initialize listeners stack
SVG.listeners = []
SVG.handlerMap = []

// Add event binder in the SVG namespace
SVG.on = function(node, event, listener, binding) {
  // create listener, get object-index
  var l     = listener.bind(binding || node.instance || node)
    , index = (SVG.handlerMap.indexOf(node) + 1 || SVG.handlerMap.push(node)) - 1
    , ev    = event.split('.')[0]
    , ns    = event.split('.')[1] || '*'


  // ensure valid object
  SVG.listeners[index]         = SVG.listeners[index]         || {}
  SVG.listeners[index][ev]     = SVG.listeners[index][ev]     || {}
  SVG.listeners[index][ev][ns] = SVG.listeners[index][ev][ns] || {}

  // reference listener
  SVG.listeners[index][ev][ns][listener] = l

  // add listener
  node.addEventListener(ev, l, false)
}

// Add event unbinder in the SVG namespace
SVG.off = function(node, event, listener) {
  var index = SVG.handlerMap.indexOf(node)
    , ev    = event && event.split('.')[0]
    , ns    = event && event.split('.')[1]

  if(index == -1) return

  if (listener) {
    // remove listener reference
    if (SVG.listeners[index][ev] && SVG.listeners[index][ev][ns || '*']) {
      // remove listener
      node.removeEventListener(ev, SVG.listeners[index][ev][ns || '*'][listener], false)

      delete SVG.listeners[index][ev][ns || '*'][listener]
    }

  } else if (ns && ev) {
    // remove all listeners for a namespaced event
    if (SVG.listeners[index][ev] && SVG.listeners[index][ev][ns]) {
      for (listener in SVG.listeners[index][ev][ns])
        SVG.off(node, [ev, ns].join('.'), listener)

      delete SVG.listeners[index][ev][ns]
    }

  } else if (ns){
    // remove all listeners for a specific namespace
    for(event in SVG.listeners[index]){
        for(namespace in SVG.listeners[index][event]){
            if(ns === namespace){
                SVG.off(node, [event, ns].join('.'))
            }
        }
    }

  } else if (ev) {
    // remove all listeners for the event
    if (SVG.listeners[index][ev]) {
      for (namespace in SVG.listeners[index][ev])
        SVG.off(node, [ev, namespace].join('.'))

      delete SVG.listeners[index][ev]
    }

  } else {
    // remove all listeners on a given node
    for (event in SVG.listeners[index])
      SVG.off(node, event)

    delete SVG.listeners[index]

  }
}

//
SVG.extend(SVG.Element, {
  // Bind given event to listener
  on: function(event, listener, binding) {
    SVG.on(this.node, event, listener, binding)

    return this
  }
  // Unbind event from listener
, off: function(event, listener) {
    SVG.off(this.node, event, listener)

    return this
  }
  // Fire given event
, fire: function(event, data) {

    // Dispatch event
    if(event instanceof Event){
        this.node.dispatchEvent(event)
    }else{
        this.node.dispatchEvent(new CustomEvent(event, {detail:data}))
    }

    return this
  }
})

SVG.Defs = SVG.invent({
  // Initialize node
  create: 'defs'

  // Inherit from
, inherit: SVG.Container

})
SVG.G = SVG.invent({
  // Initialize node
  create: 'g'

  // Inherit from
, inherit: SVG.Container

  // Add class methods
, extend: {
    // Move over x-axis
    x: function(x) {
      return x == null ? this.transform('x') : this.transform({ x: x - this.x() }, true)
    }
    // Move over y-axis
  , y: function(y) {
      return y == null ? this.transform('y') : this.transform({ y: y - this.y() }, true)
    }
    // Move by center over x-axis
  , cx: function(x) {
      return x == null ? this.tbox().cx : this.x(x - this.tbox().width / 2)
    }
    // Move by center over y-axis
  , cy: function(y) {
      return y == null ? this.tbox().cy : this.y(y - this.tbox().height / 2)
    }
  , gbox: function() {

      var bbox  = this.bbox()
        , trans = this.transform()

      bbox.x  += trans.x
      bbox.x2 += trans.x
      bbox.cx += trans.x

      bbox.y  += trans.y
      bbox.y2 += trans.y
      bbox.cy += trans.y

      return bbox
    }
  }

  // Add parent method
, construct: {
    // Create a group element
    group: function() {
      return this.put(new SVG.G)
    }
  }
})

// ### This module adds backward / forward functionality to elements.

//
SVG.extend(SVG.Element, {
  // Get all siblings, including myself
  siblings: function() {
    return this.parent().children()
  }
  // Get the curent position siblings
, position: function() {
    return this.parent().index(this)
  }
  // Get the next element (will return null if there is none)
, next: function() {
    return this.siblings()[this.position() + 1]
  }
  // Get the next element (will return null if there is none)
, previous: function() {
    return this.siblings()[this.position() - 1]
  }
  // Send given element one step forward
, forward: function() {
    var i = this.position() + 1
      , p = this.parent()

    // move node one step forward
    p.removeElement(this).add(this, i)

    // make sure defs node is always at the top
    if (p instanceof SVG.Doc)
      p.node.appendChild(p.defs().node)

    return this
  }
  // Send given element one step backward
, backward: function() {
    var i = this.position()

    if (i > 0)
      this.parent().removeElement(this).add(this, i - 1)

    return this
  }
  // Send given element all the way to the front
, front: function() {
    var p = this.parent()

    // Move node forward
    p.node.appendChild(this.node)

    // Make sure defs node is always at the top
    if (p instanceof SVG.Doc)
      p.node.appendChild(p.defs().node)

    return this
  }
  // Send given element all the way to the back
, back: function() {
    if (this.position() > 0)
      this.parent().removeElement(this).add(this, 0)

    return this
  }
  // Inserts a given element before the targeted element
, before: function(element) {
    element.remove()

    var i = this.position()

    this.parent().add(element, i)

    return this
  }
  // Insters a given element after the targeted element
, after: function(element) {
    element.remove()

    var i = this.position()

    this.parent().add(element, i + 1)

    return this
  }

})
SVG.Mask = SVG.invent({
  // Initialize node
  create: function() {
    this.constructor.call(this, SVG.create('mask'))

    // keep references to masked elements
    this.targets = []
  }

  // Inherit from
, inherit: SVG.Container

  // Add class methods
, extend: {
    // Unmask all masked elements and remove itself
    remove: function() {
      // unmask all targets
      for (var i = this.targets.length - 1; i >= 0; i--)
        if (this.targets[i])
          this.targets[i].unmask()
      this.targets = []

      // remove mask from parent
      this.parent().removeElement(this)

      return this
    }
  }

  // Add parent method
, construct: {
    // Create masking element
    mask: function() {
      return this.defs().put(new SVG.Mask)
    }
  }
})


SVG.extend(SVG.Element, {
  // Distribute mask to svg element
  maskWith: function(element) {
    // use given mask or create a new one
    this.masker = element instanceof SVG.Mask ? element : this.parent().mask().add(element)

    // store reverence on self in mask
    this.masker.targets.push(this)

    // apply mask
    return this.attr('mask', 'url("#' + this.masker.attr('id') + '")')
  }
  // Unmask element
, unmask: function() {
    delete this.masker
    return this.attr('mask', null)
  }

})

SVG.ClipPath = SVG.invent({
  // Initialize node
  create: function() {
    this.constructor.call(this, SVG.create('clipPath'))

    // keep references to clipped elements
    this.targets = []
  }

  // Inherit from
, inherit: SVG.Container

  // Add class methods
, extend: {
    // Unclip all clipped elements and remove itself
    remove: function() {
      // unclip all targets
      for (var i = this.targets.length - 1; i >= 0; i--)
        if (this.targets[i])
          this.targets[i].unclip()
      this.targets = []

      // remove clipPath from parent
      this.parent().removeElement(this)

      return this
    }
  }

  // Add parent method
, construct: {
    // Create clipping element
    clip: function() {
      return this.defs().put(new SVG.ClipPath)
    }
  }
})

//
SVG.extend(SVG.Element, {
  // Distribute clipPath to svg element
  clipWith: function(element) {
    // use given clip or create a new one
    this.clipper = element instanceof SVG.ClipPath ? element : this.parent().clip().add(element)

    // store reverence on self in mask
    this.clipper.targets.push(this)

    // apply mask
    return this.attr('clip-path', 'url("#' + this.clipper.attr('id') + '")')
  }
  // Unclip element
, unclip: function() {
    delete this.clipper
    return this.attr('clip-path', null)
  }

})
SVG.Gradient = SVG.invent({
  // Initialize node
  create: function(type) {
    this.constructor.call(this, SVG.create(type + 'Gradient'))

    // store type
    this.type = type
  }

  // Inherit from
, inherit: SVG.Container

  // Add class methods
, extend: {
    // Add a color stop
    at: function(offset, color, opacity) {
      return this.put(new SVG.Stop).update(offset, color, opacity)
    }
    // Update gradient
  , update: function(block) {
      // remove all stops
      this.clear()

      // invoke passed block
      if (typeof block == 'function')
        block.call(this, this)

      return this
    }
    // Return the fill id
  , fill: function() {
      return 'url(#' + this.id() + ')'
    }
    // Alias string convertion to fill
  , toString: function() {
      return this.fill()
    }
    // custom attr to handle transform
  , attr: function(a, b, c) {
      if(a == 'transform') a = 'gradientTransform'
      return SVG.Container.prototype.attr.call(this, a, b, c)
    }
  }

  // Add parent method
, construct: {
    // Create gradient element in defs
    gradient: function(type, block) {
      return this.defs().gradient(type, block)
    }
  }
})

// Add animatable methods to both gradient and fx module
SVG.extend(SVG.Gradient, SVG.FX, {
  // From position
  from: function(x, y) {
    return (this.target || this).type == 'radial' ?
      this.attr({ fx: new SVG.Number(x), fy: new SVG.Number(y) }) :
      this.attr({ x1: new SVG.Number(x), y1: new SVG.Number(y) })
  }
  // To position
, to: function(x, y) {
    return (this.target || this).type == 'radial' ?
      this.attr({ cx: new SVG.Number(x), cy: new SVG.Number(y) }) :
      this.attr({ x2: new SVG.Number(x), y2: new SVG.Number(y) })
  }
})

// Base gradient generation
SVG.extend(SVG.Defs, {
  // define gradient
  gradient: function(type, block) {
    return this.put(new SVG.Gradient(type)).update(block)
  }

})

SVG.Stop = SVG.invent({
  // Initialize node
  create: 'stop'

  // Inherit from
, inherit: SVG.Element

  // Add class methods
, extend: {
    // add color stops
    update: function(o) {
      if (typeof o == 'number' || o instanceof SVG.Number) {
        o = {
          offset:  arguments[0]
        , color:   arguments[1]
        , opacity: arguments[2]
        }
      }

      // set attributes
      if (o.opacity != null) this.attr('stop-opacity', o.opacity)
      if (o.color   != null) this.attr('stop-color', o.color)
      if (o.offset  != null) this.attr('offset', new SVG.Number(o.offset))

      return this
    }
  }

})

SVG.Pattern = SVG.invent({
  // Initialize node
  create: 'pattern'

  // Inherit from
, inherit: SVG.Container

  // Add class methods
, extend: {
    // Return the fill id
    fill: function() {
      return 'url(#' + this.id() + ')'
    }
    // Update pattern by rebuilding
  , update: function(block) {
      // remove content
      this.clear()

      // invoke passed block
      if (typeof block == 'function')
        block.call(this, this)

      return this
    }
    // Alias string convertion to fill
  , toString: function() {
      return this.fill()
    }
    // custom attr to handle transform
  , attr: function(a, b, c) {
      if(a == 'transform') a = 'patternTransform'
      return SVG.Container.prototype.attr.call(this, a, b, c)
    }

  }

  // Add parent method
, construct: {
    // Create pattern element in defs
    pattern: function(width, height, block) {
      return this.defs().pattern(width, height, block)
    }
  }
})

SVG.extend(SVG.Defs, {
  // Define gradient
  pattern: function(width, height, block) {
    return this.put(new SVG.Pattern).update(block).attr({
      x:            0
    , y:            0
    , width:        width
    , height:       height
    , patternUnits: 'userSpaceOnUse'
    })
  }

})
SVG.Doc = SVG.invent({
  // Initialize node
  create: function(element) {
    if (element) {
      // ensure the presence of a dom element
      element = typeof element == 'string' ?
        document.getElementById(element) :
        element

      // If the target is an svg element, use that element as the main wrapper.
      // This allows svg.js to work with svg documents as well.
      if (element.nodeName == 'svg') {
        this.constructor.call(this, element)
      } else {
        this.constructor.call(this, SVG.create('svg'))
        element.appendChild(this.node)
      }

      // set svg element attributes and ensure defs node
      this.namespace().size('100%', '100%').defs()
    }
  }

  // Inherit from
, inherit: SVG.Container

  // Add class methods
, extend: {
    // Add namespaces
    namespace: function() {
      return this
        .attr({ xmlns: SVG.ns, version: '1.1' })
        .attr('xmlns:xlink', SVG.xlink, SVG.xmlns)
        .attr('xmlns:svgjs', SVG.svgjs, SVG.xmlns)
    }
    // Creates and returns defs element
  , defs: function() {
      if (!this._defs) {
        var defs

        // Find or create a defs element in this instance
        if (defs = this.node.getElementsByTagName('defs')[0])
          this._defs = SVG.adopt(defs)
        else
          this._defs = new SVG.Defs

        // Make sure the defs node is at the end of the stack
        this.node.appendChild(this._defs.node)
      }

      return this._defs
    }
    // custom parent method
  , parent: function() {
      return this.node.parentNode.nodeName == '#document' ? null : this.node.parentNode
    }
    // Fix for possible sub-pixel offset. See:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=608812
  , spof: function(spof) {
      var pos = this.node.getScreenCTM()

      if (pos)
        this
          .style('left', (-pos.e % 1) + 'px')
          .style('top',  (-pos.f % 1) + 'px')

      return this
    }

      // Removes the doc from the DOM
  , remove: function() {
      if(this.parent()) {
        this.parent().removeChild(this.node);
      }

      return this;
    }
  }

})

SVG.Shape = SVG.invent({
  // Initialize node
  create: function(element) {
    this.constructor.call(this, element)
  }

  // Inherit from
, inherit: SVG.Element

})

SVG.Bare = SVG.invent({
  // Initialize
  create: function(element, inherit) {
    // construct element
    this.constructor.call(this, SVG.create(element))

    // inherit custom methods
    if (inherit)
      for (var method in inherit.prototype)
        if (typeof inherit.prototype[method] === 'function')
          this[method] = inherit.prototype[method]
  }

  // Inherit from
, inherit: SVG.Element

  // Add methods
, extend: {
    // Insert some plain text
    words: function(text) {
      // remove contents
      while (this.node.hasChildNodes())
        this.node.removeChild(this.node.lastChild)

      // create text node
      this.node.appendChild(document.createTextNode(text))

      return this
    }
  }
})


SVG.extend(SVG.Parent, {
  // Create an element that is not described by SVG.js
  element: function(element, inherit) {
    return this.put(new SVG.Bare(element, inherit))
  }
  // Add symbol element
, symbol: function() {
    return this.defs().element('symbol', SVG.Container)
  }

})
SVG.Use = SVG.invent({
  // Initialize node
  create: 'use'

  // Inherit from
, inherit: SVG.Shape

  // Add class methods
, extend: {
    // Use element as a reference
    element: function(element, file) {
      // Set lined element
      return this.attr('href', (file || '') + '#' + element, SVG.xlink)
    }
  }

  // Add parent method
, construct: {
    // Create a use element
    use: function(element, file) {
      return this.put(new SVG.Use).element(element, file)
    }
  }
})
SVG.Rect = SVG.invent({
  // Initialize node
  create: 'rect'

  // Inherit from
, inherit: SVG.Shape

  // Add parent method
, construct: {
    // Create a rect element
    rect: function(width, height) {
      return this.put(new SVG.Rect()).size(width, height)
    }
  }
})
SVG.Circle = SVG.invent({
  // Initialize node
  create: 'circle'

  // Inherit from
, inherit: SVG.Shape

  // Add parent method
, construct: {
    // Create circle element, based on ellipse
    circle: function(size) {
      return this.put(new SVG.Circle).rx(new SVG.Number(size).divide(2)).move(0, 0)
    }
  }
})

SVG.extend(SVG.Circle, SVG.FX, {
  // Radius x value
  rx: function(rx) {
    return this.attr('r', rx)
  }
  // Alias radius x value
, ry: function(ry) {
    return this.rx(ry)
  }
})

SVG.Ellipse = SVG.invent({
  // Initialize node
  create: 'ellipse'

  // Inherit from
, inherit: SVG.Shape

  // Add parent method
, construct: {
    // Create an ellipse
    ellipse: function(width, height) {
      return this.put(new SVG.Ellipse).size(width, height).move(0, 0)
    }
  }
})

SVG.extend(SVG.Ellipse, SVG.Rect, SVG.FX, {
  // Radius x value
  rx: function(rx) {
    return this.attr('rx', rx)
  }
  // Radius y value
, ry: function(ry) {
    return this.attr('ry', ry)
  }
})

// Add common method
SVG.extend(SVG.Circle, SVG.Ellipse, {
    // Move over x-axis
    x: function(x) {
      return x == null ? this.cx() - this.rx() : this.cx(x + this.rx())
    }
    // Move over y-axis
  , y: function(y) {
      return y == null ? this.cy() - this.ry() : this.cy(y + this.ry())
    }
    // Move by center over x-axis
  , cx: function(x) {
      return x == null ? this.attr('cx') : this.attr('cx', x)
    }
    // Move by center over y-axis
  , cy: function(y) {
      return y == null ? this.attr('cy') : this.attr('cy', y)
    }
    // Set width of element
  , width: function(width) {
      return width == null ? this.rx() * 2 : this.rx(new SVG.Number(width).divide(2))
    }
    // Set height of element
  , height: function(height) {
      return height == null ? this.ry() * 2 : this.ry(new SVG.Number(height).divide(2))
    }
    // Custom size function
  , size: function(width, height) {
      var p = proportionalSize(this.bbox(), width, height)

      return this
        .rx(new SVG.Number(p.width).divide(2))
        .ry(new SVG.Number(p.height).divide(2))
    }
})
SVG.Line = SVG.invent({
  // Initialize node
  create: 'line'

  // Inherit from
, inherit: SVG.Shape

  // Add class methods
, extend: {
    // Get array
    array: function() {
      return new SVG.PointArray([
        [ this.attr('x1'), this.attr('y1') ]
      , [ this.attr('x2'), this.attr('y2') ]
      ])
    }
    // Overwrite native plot() method
  , plot: function(x1, y1, x2, y2) {
      if (arguments.length == 4)
        x1 = { x1: x1, y1: y1, x2: x2, y2: y2 }
      else
        x1 = new SVG.PointArray(x1).toLine()

      return this.attr(x1)
    }
    // Move by left top corner
  , move: function(x, y) {
      return this.attr(this.array().move(x, y).toLine())
    }
    // Set element size to given width and height
  , size: function(width, height) {
      var p = proportionalSize(this.bbox(), width, height)

      return this.attr(this.array().size(p.width, p.height).toLine())
    }
  }

  // Add parent method
, construct: {
    // Create a line element
    line: function(x1, y1, x2, y2) {
      return this.put(new SVG.Line).plot(x1, y1, x2, y2)
    }
  }
})

SVG.Polyline = SVG.invent({
  // Initialize node
  create: 'polyline'

  // Inherit from
, inherit: SVG.Shape

  // Add parent method
, construct: {
    // Create a wrapped polyline element
    polyline: function(p) {
      return this.put(new SVG.Polyline).plot(p)
    }
  }
})

SVG.Polygon = SVG.invent({
  // Initialize node
  create: 'polygon'

  // Inherit from
, inherit: SVG.Shape

  // Add parent method
, construct: {
    // Create a wrapped polygon element
    polygon: function(p) {
      return this.put(new SVG.Polygon).plot(p)
    }
  }
})

// Add polygon-specific functions
SVG.extend(SVG.Polyline, SVG.Polygon, {
  // Get array
  array: function() {
    return this._array || (this._array = new SVG.PointArray(this.attr('points')))
  }
  // Plot new path
, plot: function(p) {
    return this.attr('points', (this._array = new SVG.PointArray(p)))
  }
  // Move by left top corner
, move: function(x, y) {
    return this.attr('points', this.array().move(x, y))
  }
  // Set element size to given width and height
, size: function(width, height) {
    var p = proportionalSize(this.bbox(), width, height)

    return this.attr('points', this.array().size(p.width, p.height))
  }

})
// unify all point to point elements
SVG.extend(SVG.Line, SVG.Polyline, SVG.Polygon, {
  // Define morphable array
  morphArray:  SVG.PointArray
  // Move by left top corner over x-axis
, x: function(x) {
    return x == null ? this.bbox().x : this.move(x, this.bbox().y)
  }
  // Move by left top corner over y-axis
, y: function(y) {
    return y == null ? this.bbox().y : this.move(this.bbox().x, y)
  }
  // Set width of element
, width: function(width) {
    var b = this.bbox()

    return width == null ? b.width : this.size(width, b.height)
  }
  // Set height of element
, height: function(height) {
    var b = this.bbox()

    return height == null ? b.height : this.size(b.width, height)
  }
})
SVG.Path = SVG.invent({
  // Initialize node
  create: 'path'

  // Inherit from
, inherit: SVG.Shape

  // Add class methods
, extend: {
    // Define morphable array
    morphArray:  SVG.PathArray
    // Get array
  , array: function() {
      return this._array || (this._array = new SVG.PathArray(this.attr('d')))
    }
    // Plot new poly points
  , plot: function(p) {
      return this.attr('d', (this._array = new SVG.PathArray(p)))
    }
    // Move by left top corner
  , move: function(x, y) {
      return this.attr('d', this.array().move(x, y))
    }
    // Move by left top corner over x-axis
  , x: function(x) {
      return x == null ? this.bbox().x : this.move(x, this.bbox().y)
    }
    // Move by left top corner over y-axis
  , y: function(y) {
      return y == null ? this.bbox().y : this.move(this.bbox().x, y)
    }
    // Set element size to given width and height
  , size: function(width, height) {
      var p = proportionalSize(this.bbox(), width, height)

      return this.attr('d', this.array().size(p.width, p.height))
    }
    // Set width of element
  , width: function(width) {
      return width == null ? this.bbox().width : this.size(width, this.bbox().height)
    }
    // Set height of element
  , height: function(height) {
      return height == null ? this.bbox().height : this.size(this.bbox().width, height)
    }

  }

  // Add parent method
, construct: {
    // Create a wrapped path element
    path: function(d) {
      return this.put(new SVG.Path).plot(d)
    }
  }
})
SVG.Image = SVG.invent({
  // Initialize node
  create: 'image'

  // Inherit from
, inherit: SVG.Shape

  // Add class methods
, extend: {
    // (re)load image
    load: function(url) {
      if (!url) return this

      var self = this
        , img  = document.createElement('img')

      // preload image
      img.onload = function() {
        var p = self.parent(SVG.Pattern)

        if(p === null) return

        // ensure image size
        if (self.width() == 0 && self.height() == 0)
          self.size(img.width, img.height)

        // ensure pattern size if not set
        if (p && p.width() == 0 && p.height() == 0)
          p.size(self.width(), self.height())

        // callback
        if (typeof self._loaded === 'function')
          self._loaded.call(self, {
            width:  img.width
          , height: img.height
          , ratio:  img.width / img.height
          , url:    url
          })
      }

      return this.attr('href', (img.src = this.src = url), SVG.xlink)
    }
    // Add loaded callback
  , loaded: function(loaded) {
      this._loaded = loaded
      return this
    }
  }

  // Add parent method
, construct: {
    // create image element, load image and set its size
    image: function(source, width, height) {
      return this.put(new SVG.Image).load(source).size(width || 0, height || width || 0)
    }
  }

})
SVG.Text = SVG.invent({
  // Initialize node
  create: function() {
    this.constructor.call(this, SVG.create('text'))

    this.dom.leading = new SVG.Number(1.3)    // store leading value for rebuilding
    this._rebuild = true                      // enable automatic updating of dy values
    this._build   = false                     // disable build mode for adding multiple lines

    // set default font
    this.attr('font-family', SVG.defaults.attrs['font-family'])
  }

  // Inherit from
, inherit: SVG.Shape

  // Add class methods
, extend: {
    clone: function(){
      // clone element and assign new id
      var clone = assignNewId(this.node.cloneNode(true))

      // insert the clone after myself
      this.after(clone)

      return clone
    }
    // Move over x-axis
  , x: function(x) {
      // act as getter
      if (x == null)
        return this.attr('x')

      // move lines as well if no textPath is present
      if (!this.textPath)
        this.lines().each(function() { if (this.dom.newLined) this.x(x) })

      return this.attr('x', x)
    }
    // Move over y-axis
  , y: function(y) {
      var oy = this.attr('y')
        , o  = typeof oy === 'number' ? oy - this.bbox().y : 0

      // act as getter
      if (y == null)
        return typeof oy === 'number' ? oy - o : oy

      return this.attr('y', typeof y === 'number' ? y + o : y)
    }
    // Move center over x-axis
  , cx: function(x) {
      return x == null ? this.bbox().cx : this.x(x - this.bbox().width / 2)
    }
    // Move center over y-axis
  , cy: function(y) {
      return y == null ? this.bbox().cy : this.y(y - this.bbox().height / 2)
    }
    // Set the text content
  , text: function(text) {
      // act as getter
      if (typeof text === 'undefined'){
        var text = ''
        var children = this.node.childNodes
        for(var i = 0, len = children.length; i < len; ++i){

          // add newline if its not the first child and newLined is set to true
          if(i != 0 && children[i].nodeType != 3 && SVG.adopt(children[i]).dom.newLined == true){
            text += '\n'
          }

          // add content of this node
          text += children[i].textContent
        }

        return text
      }

      // remove existing content
      this.clear().build(true)

      if (typeof text === 'function') {
        // call block
        text.call(this, this)

      } else {
        // store text and make sure text is not blank
        text = text.split('\n')

        // build new lines
        for (var i = 0, il = text.length; i < il; i++)
          this.tspan(text[i]).newLine()
      }

      // disable build mode and rebuild lines
      return this.build(false).rebuild()
    }
    // Set font size
  , size: function(size) {
      return this.attr('font-size', size).rebuild()
    }
    // Set / get leading
  , leading: function(value) {
      // act as getter
      if (value == null)
        return this.dom.leading

      // act as setter
      this.dom.leading = new SVG.Number(value)

      return this.rebuild()
    }
    // Get all the first level lines
  , lines: function() {
      // filter tspans and map them to SVG.js instances
      var lines = SVG.utils.map(SVG.utils.filterSVGElements(this.node.childNodes), function(el){
        return SVG.adopt(el)
      })

      // return an instance of SVG.set
      return new SVG.Set(lines)
    }
    // Rebuild appearance type
  , rebuild: function(rebuild) {
      // store new rebuild flag if given
      if (typeof rebuild == 'boolean')
        this._rebuild = rebuild

      // define position of all lines
      if (this._rebuild) {
        var self = this
          , blankLineOffset = 0
          , dy = this.dom.leading * new SVG.Number(this.attr('font-size'))

        this.lines().each(function() {
          if (this.dom.newLined) {
            if (!this.textPath)
              this.attr('x', self.attr('x'))

            if(this.text() == '\n') {
              blankLineOffset += dy
            }else{
              this.attr('dy', dy + blankLineOffset)
              blankLineOffset = 0
            }
          }
        })

        this.fire('rebuild')
      }

      return this
    }
    // Enable / disable build mode
  , build: function(build) {
      this._build = !!build
      return this
    }
    // overwrite method from parent to set data properly
  , setData: function(o){
      this.dom = o
      this.dom.leading = o.leading ? new SVG.Number(o.leading.value, o.leading.unit) : new SVG.Number(1.3)
      return this
    }
  }

  // Add parent method
, construct: {
    // Create text element
    text: function(text) {
      return this.put(new SVG.Text).text(text)
    }
    // Create plain text element
  , plain: function(text) {
      return this.put(new SVG.Text).plain(text)
    }
  }

})

SVG.Tspan = SVG.invent({
  // Initialize node
  create: 'tspan'

  // Inherit from
, inherit: SVG.Shape

  // Add class methods
, extend: {
    // Set text content
    text: function(text) {
      if(text == null) return this.node.textContent + (this.dom.newLined ? '\n' : '')

      typeof text === 'function' ? text.call(this, this) : this.plain(text)

      return this
    }
    // Shortcut dx
  , dx: function(dx) {
      return this.attr('dx', dx)
    }
    // Shortcut dy
  , dy: function(dy) {
      return this.attr('dy', dy)
    }
    // Create new line
  , newLine: function() {
      // fetch text parent
      var t = this.parent(SVG.Text)

      // mark new line
      this.dom.newLined = true

      // apply new hy¡n
      return this.dy(t.dom.leading * t.attr('font-size')).attr('x', t.x())
    }
  }

})

SVG.extend(SVG.Text, SVG.Tspan, {
  // Create plain text node
  plain: function(text) {
    // clear if build mode is disabled
    if (this._build === false)
      this.clear()

    // create text node
    this.node.appendChild(document.createTextNode(text))

    return this
  }
  // Create a tspan
, tspan: function(text) {
    var node  = (this.textPath && this.textPath() || this).node
      , tspan = new SVG.Tspan

    // clear if build mode is disabled
    if (this._build === false)
      this.clear()

    // add new tspan
    node.appendChild(tspan.node)

    return tspan.text(text)
  }
  // Clear all lines
, clear: function() {
    var node = (this.textPath && this.textPath() || this).node

    // remove existing child nodes
    while (node.hasChildNodes())
      node.removeChild(node.lastChild)

    return this
  }
  // Get length of text element
, length: function() {
    return this.node.getComputedTextLength()
  }
})

SVG.TextPath = SVG.invent({
  // Initialize node
  create: 'textPath'

  // Inherit from
, inherit: SVG.Element

  // Define parent class
, parent: SVG.Text

  // Add parent method
, construct: {
    // Create path for text to run on
    path: function(d) {
      // create textPath element
      var path  = new SVG.TextPath
        , track = this.doc().defs().path(d)

      // move lines to textpath
      while (this.node.hasChildNodes())
        path.node.appendChild(this.node.firstChild)

      // add textPath element as child node
      this.node.appendChild(path.node)

      // link textPath to path and add content
      path.attr('href', '#' + track, SVG.xlink)

      return this
    }
    // Plot path if any
  , plot: function(d) {
      var track = this.track()

      if (track)
        track.plot(d)

      return this
    }
    // Get the path track element
  , track: function() {
      var path = this.textPath()

      if (path)
        return path.reference('href')
    }
    // Get the textPath child
  , textPath: function() {
      if (this.node.firstChild && this.node.firstChild.nodeName == 'textPath')
        return SVG.adopt(this.node.firstChild)
    }
  }
})
SVG.Nested = SVG.invent({
  // Initialize node
  create: function() {
    this.constructor.call(this, SVG.create('svg'))

    this.style('overflow', 'visible')
  }

  // Inherit from
, inherit: SVG.Container

  // Add parent method
, construct: {
    // Create nested svg document
    nested: function() {
      return this.put(new SVG.Nested)
    }
  }
})
SVG.A = SVG.invent({
  // Initialize node
  create: 'a'

  // Inherit from
, inherit: SVG.Container

  // Add class methods
, extend: {
    // Link url
    to: function(url) {
      return this.attr('href', url, SVG.xlink)
    }
    // Link show attribute
  , show: function(target) {
      return this.attr('show', target, SVG.xlink)
    }
    // Link target attribute
  , target: function(target) {
      return this.attr('target', target)
    }
  }

  // Add parent method
, construct: {
    // Create a hyperlink element
    link: function(url) {
      return this.put(new SVG.A).to(url)
    }
  }
})

SVG.extend(SVG.Element, {
  // Create a hyperlink element
  linkTo: function(url) {
    var link = new SVG.A

    if (typeof url == 'function')
      url.call(link, link)
    else
      link.to(url)

    return this.parent().put(link).put(this)
  }

})
SVG.Marker = SVG.invent({
  // Initialize node
  create: 'marker'

  // Inherit from
, inherit: SVG.Container

  // Add class methods
, extend: {
    // Set width of element
    width: function(width) {
      return this.attr('markerWidth', width)
    }
    // Set height of element
  , height: function(height) {
      return this.attr('markerHeight', height)
    }
    // Set marker refX and refY
  , ref: function(x, y) {
      return this.attr('refX', x).attr('refY', y)
    }
    // Update marker
  , update: function(block) {
      // remove all content
      this.clear()

      // invoke passed block
      if (typeof block == 'function')
        block.call(this, this)

      return this
    }
    // Return the fill id
  , toString: function() {
      return 'url(#' + this.id() + ')'
    }
  }

  // Add parent method
, construct: {
    marker: function(width, height, block) {
      // Create marker element in defs
      return this.defs().marker(width, height, block)
    }
  }

})

SVG.extend(SVG.Defs, {
  // Create marker
  marker: function(width, height, block) {
    // Set default viewbox to match the width and height, set ref to cx and cy and set orient to auto
    return this.put(new SVG.Marker)
      .size(width, height)
      .ref(width / 2, height / 2)
      .viewbox(0, 0, width, height)
      .attr('orient', 'auto')
      .update(block)
  }

})

SVG.extend(SVG.Line, SVG.Polyline, SVG.Polygon, SVG.Path, {
  // Create and attach markers
  marker: function(marker, width, height, block) {
    var attr = ['marker']

    // Build attribute name
    if (marker != 'all') attr.push(marker)
    attr = attr.join('-')

    // Set marker attribute
    marker = arguments[1] instanceof SVG.Marker ?
      arguments[1] :
      this.doc().marker(width, height, block)

    return this.attr(attr, marker)
  }

})
// Define list of available attributes for stroke and fill
var sugar = {
  stroke: ['color', 'width', 'opacity', 'linecap', 'linejoin', 'miterlimit', 'dasharray', 'dashoffset']
, fill:   ['color', 'opacity', 'rule']
, prefix: function(t, a) {
    return a == 'color' ? t : t + '-' + a
  }
}

// Add sugar for fill and stroke
;['fill', 'stroke'].forEach(function(m) {
  var i, extension = {}

  extension[m] = function(o) {
    if (typeof o == 'string' || SVG.Color.isRgb(o) || (o && typeof o.fill === 'function'))
      this.attr(m, o)

    else
      // set all attributes from sugar.fill and sugar.stroke list
      for (i = sugar[m].length - 1; i >= 0; i--)
        if (o[sugar[m][i]] != null)
          this.attr(sugar.prefix(m, sugar[m][i]), o[sugar[m][i]])

    return this
  }

  SVG.extend(SVG.Element, SVG.FX, extension)

})

SVG.extend(SVG.Element, SVG.FX, {
  // Map rotation to transform
  rotate: function(d, cx, cy) {
    return this.transform({ rotation: d, cx: cx, cy: cy })
  }
  // Map skew to transform
, skew: function(x, y, cx, cy) {
    return this.transform({ skewX: x, skewY: y, cx: cx, cy: cy })
  }
  // Map scale to transform
, scale: function(x, y, cx, cy) {
    return arguments.length == 1  || arguments.length == 3 ?
      this.transform({ scale: x, cx: y, cy: cx }) :
      this.transform({ scaleX: x, scaleY: y, cx: cx, cy: cy })
  }
  // Map translate to transform
, translate: function(x, y) {
    return this.transform({ x: x, y: y })
  }
  // Map flip to transform
, flip: function(a, o) {
    return this.transform({ flip: a, offset: o })
  }
  // Map matrix to transform
, matrix: function(m) {
    return this.attr('transform', new SVG.Matrix(m))
  }
  // Opacity
, opacity: function(value) {
    return this.attr('opacity', value)
  }
  // Relative move over x axis
, dx: function(x) {
    return this.x((this.target || this).x() + x)
  }
  // Relative move over y axis
, dy: function(y) {
    return this.y((this.target || this).y() + y)
  }
  // Relative move over x and y axes
, dmove: function(x, y) {
    return this.dx(x).dy(y)
  }
})

SVG.extend(SVG.Rect, SVG.Ellipse, SVG.Circle, SVG.Gradient, SVG.FX, {
  // Add x and y radius
  radius: function(x, y) {
    var type = (this.target || this).type;
    return type == 'radial' || type == 'circle' ?
      this.attr({ 'r': new SVG.Number(x) }) :
      this.rx(x).ry(y == null ? x : y)
  }
})

SVG.extend(SVG.Path, {
  // Get path length
  length: function() {
    return this.node.getTotalLength()
  }
  // Get point at length
, pointAt: function(length) {
    return this.node.getPointAtLength(length)
  }
})

SVG.extend(SVG.Parent, SVG.Text, SVG.FX, {
  // Set font
  font: function(o) {
    for (var k in o)
      k == 'leading' ?
        this.leading(o[k]) :
      k == 'anchor' ?
        this.attr('text-anchor', o[k]) :
      k == 'size' || k == 'family' || k == 'weight' || k == 'stretch' || k == 'variant' || k == 'style' ?
        this.attr('font-'+ k, o[k]) :
        this.attr(k, o[k])

    return this
  }
})


SVG.Set = SVG.invent({
  // Initialize
  create: function(members) {
    // Set initial state
    Array.isArray(members) ? this.members = members : this.clear()
  }

  // Add class methods
, extend: {
    // Add element to set
    add: function() {
      var i, il, elements = [].slice.call(arguments)

      for (i = 0, il = elements.length; i < il; i++)
        this.members.push(elements[i])

      return this
    }
    // Remove element from set
  , remove: function(element) {
      var i = this.index(element)

      // remove given child
      if (i > -1)
        this.members.splice(i, 1)

      return this
    }
    // Iterate over all members
  , each: function(block) {
      for (var i = 0, il = this.members.length; i < il; i++)
        block.apply(this.members[i], [i, this.members])

      return this
    }
    // Restore to defaults
  , clear: function() {
      // initialize store
      this.members = []

      return this
    }
    // Get the length of a set
  , length: function() {
      return this.members.length
    }
    // Checks if a given element is present in set
  , has: function(element) {
      return this.index(element) >= 0
    }
    // retuns index of given element in set
  , index: function(element) {
      return this.members.indexOf(element)
    }
    // Get member at given index
  , get: function(i) {
      return this.members[i]
    }
    // Get first member
  , first: function() {
      return this.get(0)
    }
    // Get last member
  , last: function() {
      return this.get(this.members.length - 1)
    }
    // Default value
  , valueOf: function() {
      return this.members
    }
    // Get the bounding box of all members included or empty box if set has no items
  , bbox: function(){
      var box = new SVG.BBox()

      // return an empty box of there are no members
      if (this.members.length == 0)
        return box

      // get the first rbox and update the target bbox
      var rbox = this.members[0].rbox()
      box.x      = rbox.x
      box.y      = rbox.y
      box.width  = rbox.width
      box.height = rbox.height

      this.each(function() {
        // user rbox for correct position and visual representation
        box = box.merge(this.rbox())
      })

      return box
    }
  }

  // Add parent method
, construct: {
    // Create a new set
    set: function(members) {
      return new SVG.Set(members)
    }
  }
})

SVG.FX.Set = SVG.invent({
  // Initialize node
  create: function(set) {
    // store reference to set
    this.set = set
  }

})

// Alias methods
SVG.Set.inherit = function() {
  var m
    , methods = []

  // gather shape methods
  for(var m in SVG.Shape.prototype)
    if (typeof SVG.Shape.prototype[m] == 'function' && typeof SVG.Set.prototype[m] != 'function')
      methods.push(m)

  // apply shape aliasses
  methods.forEach(function(method) {
    SVG.Set.prototype[method] = function() {
      for (var i = 0, il = this.members.length; i < il; i++)
        if (this.members[i] && typeof this.members[i][method] == 'function')
          this.members[i][method].apply(this.members[i], arguments)

      return method == 'animate' ? (this.fx || (this.fx = new SVG.FX.Set(this))) : this
    }
  })

  // clear methods for the next round
  methods = []

  // gather fx methods
  for(var m in SVG.FX.prototype)
    if (typeof SVG.FX.prototype[m] == 'function' && typeof SVG.FX.Set.prototype[m] != 'function')
      methods.push(m)

  // apply fx aliasses
  methods.forEach(function(method) {
    SVG.FX.Set.prototype[method] = function() {
      for (var i = 0, il = this.set.members.length; i < il; i++)
        this.set.members[i].fx[method].apply(this.set.members[i].fx, arguments)

      return this
    }
  })
}




SVG.extend(SVG.Element, {
  // Store data values on svg nodes
  data: function(a, v, r) {
    if (typeof a == 'object') {
      for (v in a)
        this.data(v, a[v])

    } else if (arguments.length < 2) {
      try {
        return JSON.parse(this.attr('data-' + a))
      } catch(e) {
        return this.attr('data-' + a)
      }

    } else {
      this.attr(
        'data-' + a
      , v === null ?
          null :
        r === true || typeof v === 'string' || typeof v === 'number' ?
          v :
          JSON.stringify(v)
      )
    }

    return this
  }
})
SVG.extend(SVG.Element, {
  // Remember arbitrary data
  remember: function(k, v) {
    // remember every item in an object individually
    if (typeof arguments[0] == 'object')
      for (var v in k)
        this.remember(v, k[v])

    // retrieve memory
    else if (arguments.length == 1)
      return this.memory()[k]

    // store memory
    else
      this.memory()[k] = v

    return this
  }

  // Erase a given memory
, forget: function() {
    if (arguments.length == 0)
      this._memory = {}
    else
      for (var i = arguments.length - 1; i >= 0; i--)
        delete this.memory()[arguments[i]]

    return this
  }

  // Initialize or return local memory object
, memory: function() {
    return this._memory || (this._memory = {})
  }

})
// Method for getting an element by id
SVG.get = function(id) {
  var node = document.getElementById(idFromReference(id) || id)
  return SVG.adopt(node)
}

// Select elements by query string
SVG.select = function(query, parent) {
  return new SVG.Set(
    SVG.utils.map((parent || document).querySelectorAll(query), function(node) {
      return SVG.adopt(node)
    })
  )
}

SVG.extend(SVG.Parent, {
  // Scoped select method
  select: function(query) {
    return SVG.select(query, this.node)
  }

})
// tests if a given selector matches an element
function matches(el, selector) {
  return (el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector).call(el, selector);
}

// Convert dash-separated-string to camelCase
function camelCase(s) {
  return s.toLowerCase().replace(/-(.)/g, function(m, g) {
    return g.toUpperCase()
  })
}

// Capitalize first letter of a string
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Ensure to six-based hex
function fullHex(hex) {
  return hex.length == 4 ?
    [ '#',
      hex.substring(1, 2), hex.substring(1, 2)
    , hex.substring(2, 3), hex.substring(2, 3)
    , hex.substring(3, 4), hex.substring(3, 4)
    ].join('') : hex
}

// Component to hex value
function compToHex(comp) {
  var hex = comp.toString(16)
  return hex.length == 1 ? '0' + hex : hex
}

// Calculate proportional width and height values when necessary
function proportionalSize(box, width, height) {
  if (height == null)
    height = box.height / box.width * width
  else if (width == null)
    width = box.width / box.height * height

  return {
    width:  width
  , height: height
  }
}

// Delta transform point
function deltaTransformPoint(matrix, x, y) {
  return {
    x: x * matrix.a + y * matrix.c + 0
  , y: x * matrix.b + y * matrix.d + 0
  }
}

// Map matrix array to object
function arrayToMatrix(a) {
  return { a: a[0], b: a[1], c: a[2], d: a[3], e: a[4], f: a[5] }
}

// Parse matrix if required
function parseMatrix(matrix) {
  if (!(matrix instanceof SVG.Matrix))
    matrix = new SVG.Matrix(matrix)

  return matrix
}

// Add centre point to transform object
function ensureCentre(o, target) {
  o.cx = o.cx == null ? target.bbox().cx : o.cx
  o.cy = o.cy == null ? target.bbox().cy : o.cy
}

// Convert string to matrix
function stringToMatrix(source) {
  // remove matrix wrapper and split to individual numbers
  source = source
    .replace(SVG.regex.whitespace, '')
    .replace(SVG.regex.matrix, '')
    .split(SVG.regex.matrixElements)

  // convert string values to floats and convert to a matrix-formatted object
  return arrayToMatrix(
    SVG.utils.map(source, function(n) {
      return parseFloat(n)
    })
  )
}

// Calculate position according to from and to
function at(o, pos) {
  // number recalculation (don't bother converting to SVG.Number for performance reasons)
  return typeof o.from == 'number' ?
    o.from + (o.to - o.from) * pos :

  // instance recalculation
  o instanceof SVG.Color || o instanceof SVG.Number || o instanceof SVG.Matrix ? o.at(pos) :

  // for all other values wait until pos has reached 1 to return the final value
  pos < 1 ? o.from : o.to
}

// PathArray Helpers
function arrayToString(a) {
  for (var i = 0, il = a.length, s = ''; i < il; i++) {
    s += a[i][0]

    if (a[i][1] != null) {
      s += a[i][1]

      if (a[i][2] != null) {
        s += ' '
        s += a[i][2]

        if (a[i][3] != null) {
          s += ' '
          s += a[i][3]
          s += ' '
          s += a[i][4]

          if (a[i][5] != null) {
            s += ' '
            s += a[i][5]
            s += ' '
            s += a[i][6]

            if (a[i][7] != null) {
              s += ' '
              s += a[i][7]
            }
          }
        }
      }
    }
  }

  return s + ' '
}

// Deep new id assignment
function assignNewId(node) {
  // do the same for SVG child nodes as well
  for (var i = node.childNodes.length - 1; i >= 0; i--)
    if (node.childNodes[i] instanceof SVGElement)
      assignNewId(node.childNodes[i])

  return SVG.adopt(node).id(SVG.eid(node.nodeName))
}

// Add more bounding box properties
function fullBox(b) {
  if (b.x == null) {
    b.x      = 0
    b.y      = 0
    b.width  = 0
    b.height = 0
  }

  b.w  = b.width
  b.h  = b.height
  b.x2 = b.x + b.width
  b.y2 = b.y + b.height
  b.cx = b.x + b.width / 2
  b.cy = b.y + b.height / 2

  return b
}

// Get id from reference string
function idFromReference(url) {
  var m = url.toString().match(SVG.regex.reference)

  if (m) return m[1]
}

// Create matrix array for looping
var abcdef = 'abcdef'.split('')
// Add CustomEvent to IE9 and IE10
if (typeof CustomEvent !== 'function') {
  // Code from: https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent
  var CustomEvent = function(event, options) {
    options = options || { bubbles: false, cancelable: false, detail: undefined }
    var e = document.createEvent('CustomEvent')
    e.initCustomEvent(event, options.bubbles, options.cancelable, options.detail)
    return e
  }

  CustomEvent.prototype = window.Event.prototype

  window.CustomEvent = CustomEvent
}

// requestAnimationFrame / cancelAnimationFrame Polyfill with fallback based on Paul Irish
(function(w) {
  var lastTime = 0
  var vendors = ['moz', 'webkit']

  for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    w.requestAnimationFrame = w[vendors[x] + 'RequestAnimationFrame']
    w.cancelAnimationFrame  = w[vendors[x] + 'CancelAnimationFrame'] ||
                              w[vendors[x] + 'CancelRequestAnimationFrame']
  }

  w.requestAnimationFrame = w.requestAnimationFrame ||
    function(callback) {
      var currTime = new Date().getTime()
      var timeToCall = Math.max(0, 16 - (currTime - lastTime))

      var id = w.setTimeout(function() {
        callback(currTime + timeToCall)
      }, timeToCall)

      lastTime = currTime + timeToCall
      return id
    }

  w.cancelAnimationFrame = w.cancelAnimationFrame || w.clearTimeout;

}(window))

return SVG

}));
},{}],347:[function(require,module,exports){
module.exports = require('./src/tess2');
},{"./src/tess2":348}],348:[function(require,module,exports){
/*
** SGI FREE SOFTWARE LICENSE B (Version 2.0, Sept. 18, 2008) 
** Copyright (C) [dates of first publication] Silicon Graphics, Inc.
** All Rights Reserved.
**
** Permission is hereby granted, free of charge, to any person obtaining a copy
** of this software and associated documentation files (the "Software"), to deal
** in the Software without restriction, including without limitation the rights
** to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
** of the Software, and to permit persons to whom the Software is furnished to do so,
** subject to the following conditions:
** 
** The above copyright notice including the dates of first publication and either this
** permission notice or a reference to http://oss.sgi.com/projects/FreeB/ shall be
** included in all copies or substantial portions of the Software. 
**
** THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
** INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
** PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL SILICON GRAPHICS, INC.
** BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
** TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
** OR OTHER DEALINGS IN THE SOFTWARE.
** 
** Except as contained in this notice, the name of Silicon Graphics, Inc. shall not
** be used in advertising or otherwise to promote the sale, use or other dealings in
** this Software without prior written authorization from Silicon Graphics, Inc.
*/
/*
** Author: Mikko Mononen, Aug 2013.
** The code is based on GLU libtess by Eric Veach, July 1994
*/

	"use strict";

	/* Public API */

	var Tess2 = {};

	module.exports = Tess2;
	
	Tess2.WINDING_ODD = 0;
	Tess2.WINDING_NONZERO = 1;
	Tess2.WINDING_POSITIVE = 2;
	Tess2.WINDING_NEGATIVE = 3;
	Tess2.WINDING_ABS_GEQ_TWO = 4;

	Tess2.POLYGONS = 0;
	Tess2.CONNECTED_POLYGONS = 1;
	Tess2.BOUNDARY_CONTOURS = 2;

	Tess2.tesselate = function(opts) {
		var debug =  opts.debug || false;
		var tess = new Tesselator();
		for (var i = 0; i < opts.contours.length; i++) {
			tess.addContour(opts.vertexSize || 2, opts.contours[i]);
		}
		tess.tesselate(opts.windingRule || Tess2.WINDING_ODD,
					   opts.elementType || Tess2.POLYGONS,
					   opts.polySize || 3,
					   opts.vertexSize || 2,
					   opts.normal || [0,0,1]);
		return {
			vertices: tess.vertices,
			vertexIndices: tess.vertexIndices,
			vertexCount: tess.vertexCount,
			elements: tess.elements,
			elementCount: tess.elementCount,
			mesh: debug ? tess.mesh : undefined
		};
	};

	/* Internal */

	var assert = function(cond) {
		if (!cond) {
			throw "Assertion Failed!";
		}
	}

	/* The mesh structure is similar in spirit, notation, and operations
	* to the "quad-edge" structure (see L. Guibas and J. Stolfi, Primitives
	* for the manipulation of general subdivisions and the computation of
	* Voronoi diagrams, ACM Transactions on Graphics, 4(2):74-123, April 1985).
	* For a simplified description, see the course notes for CS348a,
	* "Mathematical Foundations of Computer Graphics", available at the
	* Stanford bookstore (and taught during the fall quarter).
	* The implementation also borrows a tiny subset of the graph-based approach
	* use in Mantyla's Geometric Work Bench (see M. Mantyla, An Introduction
	* to Sold Modeling, Computer Science Press, Rockville, Maryland, 1988).
	*
	* The fundamental data structure is the "half-edge".  Two half-edges
	* go together to make an edge, but they point in opposite directions.
	* Each half-edge has a pointer to its mate (the "symmetric" half-edge Sym),
	* its origin vertex (Org), the face on its left side (Lface), and the
	* adjacent half-edges in the CCW direction around the origin vertex
	* (Onext) and around the left face (Lnext).  There is also a "next"
	* pointer for the global edge list (see below).
	*
	* The notation used for mesh navigation:
	*  Sym   = the mate of a half-edge (same edge, but opposite direction)
	*  Onext = edge CCW around origin vertex (keep same origin)
	*  Dnext = edge CCW around destination vertex (keep same dest)
	*  Lnext = edge CCW around left face (dest becomes new origin)
	*  Rnext = edge CCW around right face (origin becomes new dest)
	*
	* "prev" means to substitute CW for CCW in the definitions above.
	*
	* The mesh keeps global lists of all vertices, faces, and edges,
	* stored as doubly-linked circular lists with a dummy header node.
	* The mesh stores pointers to these dummy headers (vHead, fHead, eHead).
	*
	* The circular edge list is special; since half-edges always occur
	* in pairs (e and e->Sym), each half-edge stores a pointer in only
	* one direction.  Starting at eHead and following the e->next pointers
	* will visit each *edge* once (ie. e or e->Sym, but not both).
	* e->Sym stores a pointer in the opposite direction, thus it is
	* always true that e->Sym->next->Sym->next == e.
	*
	* Each vertex has a pointer to next and previous vertices in the
	* circular list, and a pointer to a half-edge with this vertex as
	* the origin (NULL if this is the dummy header).  There is also a
	* field "data" for client data.
	*
	* Each face has a pointer to the next and previous faces in the
	* circular list, and a pointer to a half-edge with this face as
	* the left face (NULL if this is the dummy header).  There is also
	* a field "data" for client data.
	*
	* Note that what we call a "face" is really a loop; faces may consist
	* of more than one loop (ie. not simply connected), but there is no
	* record of this in the data structure.  The mesh may consist of
	* several disconnected regions, so it may not be possible to visit
	* the entire mesh by starting at a half-edge and traversing the edge
	* structure.
	*
	* The mesh does NOT support isolated vertices; a vertex is deleted along
	* with its last edge.  Similarly when two faces are merged, one of the
	* faces is deleted (see tessMeshDelete below).  For mesh operations,
	* all face (loop) and vertex pointers must not be NULL.  However, once
	* mesh manipulation is finished, TESSmeshZapFace can be used to delete
	* faces of the mesh, one at a time.  All external faces can be "zapped"
	* before the mesh is returned to the client; then a NULL face indicates
	* a region which is not part of the output polygon.
	*/

	function TESSvertex() {
		this.next = null;	/* next vertex (never NULL) */
		this.prev = null;	/* previous vertex (never NULL) */
		this.anEdge = null;	/* a half-edge with this origin */

		/* Internal data (keep hidden) */
		this.coords = [0,0,0];	/* vertex location in 3D */
		this.s = 0.0;
		this.t = 0.0;			/* projection onto the sweep plane */
		this.pqHandle = 0;		/* to allow deletion from priority queue */
		this.n = 0;				/* to allow identify unique vertices */
		this.idx = 0;			/* to allow map result to original verts */
	} 

	function TESSface() {
		this.next = null;		/* next face (never NULL) */
		this.prev = null;		/* previous face (never NULL) */
		this.anEdge = null;		/* a half edge with this left face */

		/* Internal data (keep hidden) */
		this.trail = null;		/* "stack" for conversion to strips */
		this.n = 0;				/* to allow identiy unique faces */
		this.marked = false;	/* flag for conversion to strips */
		this.inside = false;	/* this face is in the polygon interior */
	};

	function TESShalfEdge(side) {
		this.next = null;		/* doubly-linked list (prev==Sym->next) */
		this.Sym = null;		/* same edge, opposite direction */
		this.Onext = null;		/* next edge CCW around origin */
		this.Lnext = null;		/* next edge CCW around left face */
		this.Org = null;		/* origin vertex (Overtex too long) */
		this.Lface = null;		/* left face */

		/* Internal data (keep hidden) */
		this.activeRegion = null;	/* a region with this upper edge (sweep.c) */
		this.winding = 0;			/* change in winding number when crossing
									   from the right face to the left face */
		this.side = side;
	};

	TESShalfEdge.prototype = {
		get Rface() { return this.Sym.Lface; },
		set Rface(v) { this.Sym.Lface = v; },
		get Dst() { return this.Sym.Org; },
		set Dst(v) { this.Sym.Org = v; },
		get Oprev() { return this.Sym.Lnext; },
		set Oprev(v) { this.Sym.Lnext = v; },
		get Lprev() { return this.Onext.Sym; },
		set Lprev(v) { this.Onext.Sym = v; },
		get Dprev() { return this.Lnext.Sym; },
		set Dprev(v) { this.Lnext.Sym = v; },
		get Rprev() { return this.Sym.Onext; },
		set Rprev(v) { this.Sym.Onext = v; },
		get Dnext() { return /*this.Rprev*/this.Sym.Onext.Sym; },  /* 3 pointers */
		set Dnext(v) { /*this.Rprev*/this.Sym.Onext.Sym = v; },  /* 3 pointers */
		get Rnext() { return /*this.Oprev*/this.Sym.Lnext.Sym; },  /* 3 pointers */
		set Rnext(v) { /*this.Oprev*/this.Sym.Lnext.Sym = v; },  /* 3 pointers */
	};



	function TESSmesh() {
		var v = new TESSvertex();
		var f = new TESSface();
		var e = new TESShalfEdge(0);
		var eSym = new TESShalfEdge(1);

		v.next = v.prev = v;
		v.anEdge = null;

		f.next = f.prev = f;
		f.anEdge = null;
		f.trail = null;
		f.marked = false;
		f.inside = false;

		e.next = e;
		e.Sym = eSym;
		e.Onext = null;
		e.Lnext = null;
		e.Org = null;
		e.Lface = null;
		e.winding = 0;
		e.activeRegion = null;

		eSym.next = eSym;
		eSym.Sym = e;
		eSym.Onext = null;
		eSym.Lnext = null;
		eSym.Org = null;
		eSym.Lface = null;
		eSym.winding = 0;
		eSym.activeRegion = null;

		this.vHead = v;		/* dummy header for vertex list */
		this.fHead = f;		/* dummy header for face list */
		this.eHead = e;		/* dummy header for edge list */
		this.eHeadSym = eSym;	/* and its symmetric counterpart */
	};

	/* The mesh operations below have three motivations: completeness,
	* convenience, and efficiency.  The basic mesh operations are MakeEdge,
	* Splice, and Delete.  All the other edge operations can be implemented
	* in terms of these.  The other operations are provided for convenience
	* and/or efficiency.
	*
	* When a face is split or a vertex is added, they are inserted into the
	* global list *before* the existing vertex or face (ie. e->Org or e->Lface).
	* This makes it easier to process all vertices or faces in the global lists
	* without worrying about processing the same data twice.  As a convenience,
	* when a face is split, the "inside" flag is copied from the old face.
	* Other internal data (v->data, v->activeRegion, f->data, f->marked,
	* f->trail, e->winding) is set to zero.
	*
	* ********************** Basic Edge Operations **************************
	*
	* tessMeshMakeEdge( mesh ) creates one edge, two vertices, and a loop.
	* The loop (face) consists of the two new half-edges.
	*
	* tessMeshSplice( eOrg, eDst ) is the basic operation for changing the
	* mesh connectivity and topology.  It changes the mesh so that
	*  eOrg->Onext <- OLD( eDst->Onext )
	*  eDst->Onext <- OLD( eOrg->Onext )
	* where OLD(...) means the value before the meshSplice operation.
	*
	* This can have two effects on the vertex structure:
	*  - if eOrg->Org != eDst->Org, the two vertices are merged together
	*  - if eOrg->Org == eDst->Org, the origin is split into two vertices
	* In both cases, eDst->Org is changed and eOrg->Org is untouched.
	*
	* Similarly (and independently) for the face structure,
	*  - if eOrg->Lface == eDst->Lface, one loop is split into two
	*  - if eOrg->Lface != eDst->Lface, two distinct loops are joined into one
	* In both cases, eDst->Lface is changed and eOrg->Lface is unaffected.
	*
	* tessMeshDelete( eDel ) removes the edge eDel.  There are several cases:
	* if (eDel->Lface != eDel->Rface), we join two loops into one; the loop
	* eDel->Lface is deleted.  Otherwise, we are splitting one loop into two;
	* the newly created loop will contain eDel->Dst.  If the deletion of eDel
	* would create isolated vertices, those are deleted as well.
	*
	* ********************** Other Edge Operations **************************
	*
	* tessMeshAddEdgeVertex( eOrg ) creates a new edge eNew such that
	* eNew == eOrg->Lnext, and eNew->Dst is a newly created vertex.
	* eOrg and eNew will have the same left face.
	*
	* tessMeshSplitEdge( eOrg ) splits eOrg into two edges eOrg and eNew,
	* such that eNew == eOrg->Lnext.  The new vertex is eOrg->Dst == eNew->Org.
	* eOrg and eNew will have the same left face.
	*
	* tessMeshConnect( eOrg, eDst ) creates a new edge from eOrg->Dst
	* to eDst->Org, and returns the corresponding half-edge eNew.
	* If eOrg->Lface == eDst->Lface, this splits one loop into two,
	* and the newly created loop is eNew->Lface.  Otherwise, two disjoint
	* loops are merged into one, and the loop eDst->Lface is destroyed.
	*
	* ************************ Other Operations *****************************
	*
	* tessMeshNewMesh() creates a new mesh with no edges, no vertices,
	* and no loops (what we usually call a "face").
	*
	* tessMeshUnion( mesh1, mesh2 ) forms the union of all structures in
	* both meshes, and returns the new mesh (the old meshes are destroyed).
	*
	* tessMeshDeleteMesh( mesh ) will free all storage for any valid mesh.
	*
	* tessMeshZapFace( fZap ) destroys a face and removes it from the
	* global face list.  All edges of fZap will have a NULL pointer as their
	* left face.  Any edges which also have a NULL pointer as their right face
	* are deleted entirely (along with any isolated vertices this produces).
	* An entire mesh can be deleted by zapping its faces, one at a time,
	* in any order.  Zapped faces cannot be used in further mesh operations!
	*
	* tessMeshCheckMesh( mesh ) checks a mesh for self-consistency.
	*/

	TESSmesh.prototype = {

		/* MakeEdge creates a new pair of half-edges which form their own loop.
		* No vertex or face structures are allocated, but these must be assigned
		* before the current edge operation is completed.
		*/
		//static TESShalfEdge *MakeEdge( TESSmesh* mesh, TESShalfEdge *eNext )
		makeEdge_: function(eNext) {
			var e = new TESShalfEdge(0);
			var eSym = new TESShalfEdge(1);

			/* Make sure eNext points to the first edge of the edge pair */
			if( eNext.Sym.side < eNext.side ) { eNext = eNext.Sym; }

			/* Insert in circular doubly-linked list before eNext.
			* Note that the prev pointer is stored in Sym->next.
			*/
			var ePrev = eNext.Sym.next;
			eSym.next = ePrev;
			ePrev.Sym.next = e;
			e.next = eNext;
			eNext.Sym.next = eSym;

			e.Sym = eSym;
			e.Onext = e;
			e.Lnext = eSym;
			e.Org = null;
			e.Lface = null;
			e.winding = 0;
			e.activeRegion = null;

			eSym.Sym = e;
			eSym.Onext = eSym;
			eSym.Lnext = e;
			eSym.Org = null;
			eSym.Lface = null;
			eSym.winding = 0;
			eSym.activeRegion = null;

			return e;
		},

		/* Splice( a, b ) is best described by the Guibas/Stolfi paper or the
		* CS348a notes (see mesh.h).  Basically it modifies the mesh so that
		* a->Onext and b->Onext are exchanged.  This can have various effects
		* depending on whether a and b belong to different face or vertex rings.
		* For more explanation see tessMeshSplice() below.
		*/
		// static void Splice( TESShalfEdge *a, TESShalfEdge *b )
		splice_: function(a, b) {
			var aOnext = a.Onext;
			var bOnext = b.Onext;
			aOnext.Sym.Lnext = b;
			bOnext.Sym.Lnext = a;
			a.Onext = bOnext;
			b.Onext = aOnext;
		},

		/* MakeVertex( newVertex, eOrig, vNext ) attaches a new vertex and makes it the
		* origin of all edges in the vertex loop to which eOrig belongs. "vNext" gives
		* a place to insert the new vertex in the global vertex list.  We insert
		* the new vertex *before* vNext so that algorithms which walk the vertex
		* list will not see the newly created vertices.
		*/
		//static void MakeVertex( TESSvertex *newVertex, TESShalfEdge *eOrig, TESSvertex *vNext )
		makeVertex_: function(newVertex, eOrig, vNext) {
			var vNew = newVertex;
			assert(vNew !== null);

			/* insert in circular doubly-linked list before vNext */
			var vPrev = vNext.prev;
			vNew.prev = vPrev;
			vPrev.next = vNew;
			vNew.next = vNext;
			vNext.prev = vNew;

			vNew.anEdge = eOrig;
			/* leave coords, s, t undefined */

			/* fix other edges on this vertex loop */
			var e = eOrig;
			do {
				e.Org = vNew;
				e = e.Onext;
			} while(e !== eOrig);
		},

		/* MakeFace( newFace, eOrig, fNext ) attaches a new face and makes it the left
		* face of all edges in the face loop to which eOrig belongs.  "fNext" gives
		* a place to insert the new face in the global face list.  We insert
		* the new face *before* fNext so that algorithms which walk the face
		* list will not see the newly created faces.
		*/
		// static void MakeFace( TESSface *newFace, TESShalfEdge *eOrig, TESSface *fNext )
		makeFace_: function(newFace, eOrig, fNext) {
			var fNew = newFace;
			assert(fNew !== null); 

			/* insert in circular doubly-linked list before fNext */
			var fPrev = fNext.prev;
			fNew.prev = fPrev;
			fPrev.next = fNew;
			fNew.next = fNext;
			fNext.prev = fNew;

			fNew.anEdge = eOrig;
			fNew.trail = null;
			fNew.marked = false;

			/* The new face is marked "inside" if the old one was.  This is a
			* convenience for the common case where a face has been split in two.
			*/
			fNew.inside = fNext.inside;

			/* fix other edges on this face loop */
			var e = eOrig;
			do {
				e.Lface = fNew;
				e = e.Lnext;
			} while(e !== eOrig);
		},

		/* KillEdge( eDel ) destroys an edge (the half-edges eDel and eDel->Sym),
		* and removes from the global edge list.
		*/
		//static void KillEdge( TESSmesh *mesh, TESShalfEdge *eDel )
		killEdge_: function(eDel) {
			/* Half-edges are allocated in pairs, see EdgePair above */
			if( eDel.Sym.side < eDel.side ) { eDel = eDel.Sym; }

			/* delete from circular doubly-linked list */
			var eNext = eDel.next;
			var ePrev = eDel.Sym.next;
			eNext.Sym.next = ePrev;
			ePrev.Sym.next = eNext;
		},


		/* KillVertex( vDel ) destroys a vertex and removes it from the global
		* vertex list.  It updates the vertex loop to point to a given new vertex.
		*/
		//static void KillVertex( TESSmesh *mesh, TESSvertex *vDel, TESSvertex *newOrg )
		killVertex_: function(vDel, newOrg) {
			var eStart = vDel.anEdge;
			/* change the origin of all affected edges */
			var e = eStart;
			do {
				e.Org = newOrg;
				e = e.Onext;
			} while(e !== eStart);

			/* delete from circular doubly-linked list */
			var vPrev = vDel.prev;
			var vNext = vDel.next;
			vNext.prev = vPrev;
			vPrev.next = vNext;
		},

		/* KillFace( fDel ) destroys a face and removes it from the global face
		* list.  It updates the face loop to point to a given new face.
		*/
		//static void KillFace( TESSmesh *mesh, TESSface *fDel, TESSface *newLface )
		killFace_: function(fDel, newLface) {
			var eStart = fDel.anEdge;

			/* change the left face of all affected edges */
			var e = eStart;
			do {
				e.Lface = newLface;
				e = e.Lnext;
			} while(e !== eStart);

			/* delete from circular doubly-linked list */
			var fPrev = fDel.prev;
			var fNext = fDel.next;
			fNext.prev = fPrev;
			fPrev.next = fNext;
		},

		/****************** Basic Edge Operations **********************/

		/* tessMeshMakeEdge creates one edge, two vertices, and a loop (face).
		* The loop consists of the two new half-edges.
		*/
		//TESShalfEdge *tessMeshMakeEdge( TESSmesh *mesh )
		makeEdge: function() {
			var newVertex1 = new TESSvertex();
			var newVertex2 = new TESSvertex();
			var newFace = new TESSface();
			var e = this.makeEdge_( this.eHead);
			this.makeVertex_( newVertex1, e, this.vHead );
			this.makeVertex_( newVertex2, e.Sym, this.vHead );
			this.makeFace_( newFace, e, this.fHead );
			return e;
		},

		/* tessMeshSplice( eOrg, eDst ) is the basic operation for changing the
		* mesh connectivity and topology.  It changes the mesh so that
		*	eOrg->Onext <- OLD( eDst->Onext )
		*	eDst->Onext <- OLD( eOrg->Onext )
		* where OLD(...) means the value before the meshSplice operation.
		*
		* This can have two effects on the vertex structure:
		*  - if eOrg->Org != eDst->Org, the two vertices are merged together
		*  - if eOrg->Org == eDst->Org, the origin is split into two vertices
		* In both cases, eDst->Org is changed and eOrg->Org is untouched.
		*
		* Similarly (and independently) for the face structure,
		*  - if eOrg->Lface == eDst->Lface, one loop is split into two
		*  - if eOrg->Lface != eDst->Lface, two distinct loops are joined into one
		* In both cases, eDst->Lface is changed and eOrg->Lface is unaffected.
		*
		* Some special cases:
		* If eDst == eOrg, the operation has no effect.
		* If eDst == eOrg->Lnext, the new face will have a single edge.
		* If eDst == eOrg->Lprev, the old face will have a single edge.
		* If eDst == eOrg->Onext, the new vertex will have a single edge.
		* If eDst == eOrg->Oprev, the old vertex will have a single edge.
		*/
		//int tessMeshSplice( TESSmesh* mesh, TESShalfEdge *eOrg, TESShalfEdge *eDst )
		splice: function(eOrg, eDst) {
			var joiningLoops = false;
			var joiningVertices = false;

			if( eOrg === eDst ) return;

			if( eDst.Org !== eOrg.Org ) {
				/* We are merging two disjoint vertices -- destroy eDst->Org */
				joiningVertices = true;
				this.killVertex_( eDst.Org, eOrg.Org );
			}
			if( eDst.Lface !== eOrg.Lface ) {
				/* We are connecting two disjoint loops -- destroy eDst->Lface */
				joiningLoops = true;
				this.killFace_( eDst.Lface, eOrg.Lface );
			}

			/* Change the edge structure */
			this.splice_( eDst, eOrg );

			if( ! joiningVertices ) {
				var newVertex = new TESSvertex();

				/* We split one vertex into two -- the new vertex is eDst->Org.
				* Make sure the old vertex points to a valid half-edge.
				*/
				this.makeVertex_( newVertex, eDst, eOrg.Org );
				eOrg.Org.anEdge = eOrg;
			}
			if( ! joiningLoops ) {
				var newFace = new TESSface();  

				/* We split one loop into two -- the new loop is eDst->Lface.
				* Make sure the old face points to a valid half-edge.
				*/
				this.makeFace_( newFace, eDst, eOrg.Lface );
				eOrg.Lface.anEdge = eOrg;
			}
		},

		/* tessMeshDelete( eDel ) removes the edge eDel.  There are several cases:
		* if (eDel->Lface != eDel->Rface), we join two loops into one; the loop
		* eDel->Lface is deleted.  Otherwise, we are splitting one loop into two;
		* the newly created loop will contain eDel->Dst.  If the deletion of eDel
		* would create isolated vertices, those are deleted as well.
		*
		* This function could be implemented as two calls to tessMeshSplice
		* plus a few calls to memFree, but this would allocate and delete
		* unnecessary vertices and faces.
		*/
		//int tessMeshDelete( TESSmesh *mesh, TESShalfEdge *eDel )
		delete: function(eDel) {
			var eDelSym = eDel.Sym;
			var joiningLoops = false;

			/* First step: disconnect the origin vertex eDel->Org.  We make all
			* changes to get a consistent mesh in this "intermediate" state.
			*/
			if( eDel.Lface !== eDel.Rface ) {
				/* We are joining two loops into one -- remove the left face */
				joiningLoops = true;
				this.killFace_( eDel.Lface, eDel.Rface );
			}

			if( eDel.Onext === eDel ) {
				this.killVertex_( eDel.Org, null );
			} else {
				/* Make sure that eDel->Org and eDel->Rface point to valid half-edges */
				eDel.Rface.anEdge = eDel.Oprev;
				eDel.Org.anEdge = eDel.Onext;

				this.splice_( eDel, eDel.Oprev );
				if( ! joiningLoops ) {
					var newFace = new TESSface();

					/* We are splitting one loop into two -- create a new loop for eDel. */
					this.makeFace_( newFace, eDel, eDel.Lface );
				}
			}

			/* Claim: the mesh is now in a consistent state, except that eDel->Org
			* may have been deleted.  Now we disconnect eDel->Dst.
			*/
			if( eDelSym.Onext === eDelSym ) {
				this.killVertex_( eDelSym.Org, null );
				this.killFace_( eDelSym.Lface, null );
			} else {
				/* Make sure that eDel->Dst and eDel->Lface point to valid half-edges */
				eDel.Lface.anEdge = eDelSym.Oprev;
				eDelSym.Org.anEdge = eDelSym.Onext;
				this.splice_( eDelSym, eDelSym.Oprev );
			}

			/* Any isolated vertices or faces have already been freed. */
			this.killEdge_( eDel );
		},

		/******************** Other Edge Operations **********************/

		/* All these routines can be implemented with the basic edge
		* operations above.  They are provided for convenience and efficiency.
		*/


		/* tessMeshAddEdgeVertex( eOrg ) creates a new edge eNew such that
		* eNew == eOrg->Lnext, and eNew->Dst is a newly created vertex.
		* eOrg and eNew will have the same left face.
		*/
		// TESShalfEdge *tessMeshAddEdgeVertex( TESSmesh *mesh, TESShalfEdge *eOrg );
		addEdgeVertex: function(eOrg) {
			var eNew = this.makeEdge_( eOrg );
			var eNewSym = eNew.Sym;

			/* Connect the new edge appropriately */
			this.splice_( eNew, eOrg.Lnext );

			/* Set the vertex and face information */
			eNew.Org = eOrg.Dst;

			var newVertex = new TESSvertex();
			this.makeVertex_( newVertex, eNewSym, eNew.Org );

			eNew.Lface = eNewSym.Lface = eOrg.Lface;

			return eNew;
		},


		/* tessMeshSplitEdge( eOrg ) splits eOrg into two edges eOrg and eNew,
		* such that eNew == eOrg->Lnext.  The new vertex is eOrg->Dst == eNew->Org.
		* eOrg and eNew will have the same left face.
		*/
		// TESShalfEdge *tessMeshSplitEdge( TESSmesh *mesh, TESShalfEdge *eOrg );
		splitEdge: function(eOrg, eDst) {
			var tempHalfEdge = this.addEdgeVertex( eOrg );
			var eNew = tempHalfEdge.Sym;

			/* Disconnect eOrg from eOrg->Dst and connect it to eNew->Org */
			this.splice_( eOrg.Sym, eOrg.Sym.Oprev );
			this.splice_( eOrg.Sym, eNew );

			/* Set the vertex and face information */
			eOrg.Dst = eNew.Org;
			eNew.Dst.anEdge = eNew.Sym;	/* may have pointed to eOrg->Sym */
			eNew.Rface = eOrg.Rface;
			eNew.winding = eOrg.winding;	/* copy old winding information */
			eNew.Sym.winding = eOrg.Sym.winding;

			return eNew;
		},


		/* tessMeshConnect( eOrg, eDst ) creates a new edge from eOrg->Dst
		* to eDst->Org, and returns the corresponding half-edge eNew.
		* If eOrg->Lface == eDst->Lface, this splits one loop into two,
		* and the newly created loop is eNew->Lface.  Otherwise, two disjoint
		* loops are merged into one, and the loop eDst->Lface is destroyed.
		*
		* If (eOrg == eDst), the new face will have only two edges.
		* If (eOrg->Lnext == eDst), the old face is reduced to a single edge.
		* If (eOrg->Lnext->Lnext == eDst), the old face is reduced to two edges.
		*/

		// TESShalfEdge *tessMeshConnect( TESSmesh *mesh, TESShalfEdge *eOrg, TESShalfEdge *eDst );
		connect: function(eOrg, eDst) {
			var joiningLoops = false;  
			var eNew = this.makeEdge_( eOrg );
			var eNewSym = eNew.Sym;

			if( eDst.Lface !== eOrg.Lface ) {
				/* We are connecting two disjoint loops -- destroy eDst->Lface */
				joiningLoops = true;
				this.killFace_( eDst.Lface, eOrg.Lface );
			}

			/* Connect the new edge appropriately */
			this.splice_( eNew, eOrg.Lnext );
			this.splice_( eNewSym, eDst );

			/* Set the vertex and face information */
			eNew.Org = eOrg.Dst;
			eNewSym.Org = eDst.Org;
			eNew.Lface = eNewSym.Lface = eOrg.Lface;

			/* Make sure the old face points to a valid half-edge */
			eOrg.Lface.anEdge = eNewSym;

			if( ! joiningLoops ) {
				var newFace = new TESSface();
				/* We split one loop into two -- the new loop is eNew->Lface */
				this.makeFace_( newFace, eNew, eOrg.Lface );
			}
			return eNew;
		},

		/* tessMeshZapFace( fZap ) destroys a face and removes it from the
		* global face list.  All edges of fZap will have a NULL pointer as their
		* left face.  Any edges which also have a NULL pointer as their right face
		* are deleted entirely (along with any isolated vertices this produces).
		* An entire mesh can be deleted by zapping its faces, one at a time,
		* in any order.  Zapped faces cannot be used in further mesh operations!
		*/
		zapFace: function( fZap )
		{
			var eStart = fZap.anEdge;
			var e, eNext, eSym;
			var fPrev, fNext;

			/* walk around face, deleting edges whose right face is also NULL */
			eNext = eStart.Lnext;
			do {
				e = eNext;
				eNext = e.Lnext;

				e.Lface = null;
				if( e.Rface === null ) {
					/* delete the edge -- see TESSmeshDelete above */

					if( e.Onext === e ) {
						this.killVertex_( e.Org, null );
					} else {
						/* Make sure that e->Org points to a valid half-edge */
						e.Org.anEdge = e.Onext;
						this.splice_( e, e.Oprev );
					}
					eSym = e.Sym;
					if( eSym.Onext === eSym ) {
						this.killVertex_( eSym.Org, null );
					} else {
						/* Make sure that eSym->Org points to a valid half-edge */
						eSym.Org.anEdge = eSym.Onext;
						this.splice_( eSym, eSym.Oprev );
					}
					this.killEdge_( e );
				}
			} while( e != eStart );

			/* delete from circular doubly-linked list */
			fPrev = fZap.prev;
			fNext = fZap.next;
			fNext.prev = fPrev;
			fPrev.next = fNext;
		},

		countFaceVerts_: function(f) {
			var eCur = f.anEdge;
			var n = 0;
			do
			{
				n++;
				eCur = eCur.Lnext;
			}
			while (eCur !== f.anEdge);
			return n;
		},

		//int tessMeshMergeConvexFaces( TESSmesh *mesh, int maxVertsPerFace )
		mergeConvexFaces: function(maxVertsPerFace) {
			var f;
			var eCur, eNext, eSym;
			var vStart;
			var curNv, symNv;

			for( f = this.fHead.next; f !== this.fHead; f = f.next )
			{
				// Skip faces which are outside the result.
				if( !f.inside )
					continue;

				eCur = f.anEdge;
				vStart = eCur.Org;
					
				while (true)
				{
					eNext = eCur.Lnext;
					eSym = eCur.Sym;

					// Try to merge if the neighbour face is valid.
					if( eSym && eSym.Lface && eSym.Lface.inside )
					{
						// Try to merge the neighbour faces if the resulting polygons
						// does not exceed maximum number of vertices.
						curNv = this.countFaceVerts_( f );
						symNv = this.countFaceVerts_( eSym.Lface );
						if( (curNv+symNv-2) <= maxVertsPerFace )
						{
							// Merge if the resulting poly is convex.
							if( Geom.vertCCW( eCur.Lprev.Org, eCur.Org, eSym.Lnext.Lnext.Org ) &&
								Geom.vertCCW( eSym.Lprev.Org, eSym.Org, eCur.Lnext.Lnext.Org ) )
							{
								eNext = eSym.Lnext;
								this.delete( eSym );
								eCur = null;
								eSym = null;
							}
						}
					}
					
					if( eCur && eCur.Lnext.Org === vStart )
						break;
						
					// Continue to next edge.
					eCur = eNext;
				}
			}
			
			return true;
		},

		/* tessMeshCheckMesh( mesh ) checks a mesh for self-consistency.
		*/
		check: function() {
			var fHead = this.fHead;
			var vHead = this.vHead;
			var eHead = this.eHead;
			var f, fPrev, v, vPrev, e, ePrev;

			fPrev = fHead;
			for( fPrev = fHead ; (f = fPrev.next) !== fHead; fPrev = f) {
				assert( f.prev === fPrev );
				e = f.anEdge;
				do {
					assert( e.Sym !== e );
					assert( e.Sym.Sym === e );
					assert( e.Lnext.Onext.Sym === e );
					assert( e.Onext.Sym.Lnext === e );
					assert( e.Lface === f );
					e = e.Lnext;
				} while( e !== f.anEdge );
			}
			assert( f.prev === fPrev && f.anEdge === null );

			vPrev = vHead;
			for( vPrev = vHead ; (v = vPrev.next) !== vHead; vPrev = v) {
				assert( v.prev === vPrev );
				e = v.anEdge;
				do {
					assert( e.Sym !== e );
					assert( e.Sym.Sym === e );
					assert( e.Lnext.Onext.Sym === e );
					assert( e.Onext.Sym.Lnext === e );
					assert( e.Org === v );
					e = e.Onext;
				} while( e !== v.anEdge );
			}
			assert( v.prev === vPrev && v.anEdge === null );

			ePrev = eHead;
			for( ePrev = eHead ; (e = ePrev.next) !== eHead; ePrev = e) {
				assert( e.Sym.next === ePrev.Sym );
				assert( e.Sym !== e );
				assert( e.Sym.Sym === e );
				assert( e.Org !== null );
				assert( e.Dst !== null );
				assert( e.Lnext.Onext.Sym === e );
				assert( e.Onext.Sym.Lnext === e );
			}
			assert( e.Sym.next === ePrev.Sym
				&& e.Sym === this.eHeadSym
				&& e.Sym.Sym === e
				&& e.Org === null && e.Dst === null
				&& e.Lface === null && e.Rface === null );
		}

	};

	var Geom = {};

	Geom.vertEq = function(u,v) {
		return (u.s === v.s && u.t === v.t);
	};

	/* Returns TRUE if u is lexicographically <= v. */
	Geom.vertLeq = function(u,v) {
		return ((u.s < v.s) || (u.s === v.s && u.t <= v.t));
	};

	/* Versions of VertLeq, EdgeSign, EdgeEval with s and t transposed. */
	Geom.transLeq = function(u,v) {
		return ((u.t < v.t) || (u.t === v.t && u.s <= v.s));
	};

	Geom.edgeGoesLeft = function(e) {
		return Geom.vertLeq( e.Dst, e.Org );
	};

	Geom.edgeGoesRight = function(e) {
		return Geom.vertLeq( e.Org, e.Dst );
	};

	Geom.vertL1dist = function(u,v) {
		return (Math.abs(u.s - v.s) + Math.abs(u.t - v.t));
	};

	//TESSreal tesedgeEval( TESSvertex *u, TESSvertex *v, TESSvertex *w )
	Geom.edgeEval = function( u, v, w ) {
		/* Given three vertices u,v,w such that VertLeq(u,v) && VertLeq(v,w),
		* evaluates the t-coord of the edge uw at the s-coord of the vertex v.
		* Returns v->t - (uw)(v->s), ie. the signed distance from uw to v.
		* If uw is vertical (and thus passes thru v), the result is zero.
		*
		* The calculation is extremely accurate and stable, even when v
		* is very close to u or w.  In particular if we set v->t = 0 and
		* let r be the negated result (this evaluates (uw)(v->s)), then
		* r is guaranteed to satisfy MIN(u->t,w->t) <= r <= MAX(u->t,w->t).
		*/
		assert( Geom.vertLeq( u, v ) && Geom.vertLeq( v, w ));

		var gapL = v.s - u.s;
		var gapR = w.s - v.s;

		if( gapL + gapR > 0.0 ) {
			if( gapL < gapR ) {
				return (v.t - u.t) + (u.t - w.t) * (gapL / (gapL + gapR));
			} else {
				return (v.t - w.t) + (w.t - u.t) * (gapR / (gapL + gapR));
			}
		}
		/* vertical line */
		return 0.0;
	};

	//TESSreal tesedgeSign( TESSvertex *u, TESSvertex *v, TESSvertex *w )
	Geom.edgeSign = function( u, v, w ) {
		/* Returns a number whose sign matches EdgeEval(u,v,w) but which
		* is cheaper to evaluate.  Returns > 0, == 0 , or < 0
		* as v is above, on, or below the edge uw.
		*/
		assert( Geom.vertLeq( u, v ) && Geom.vertLeq( v, w ));

		var gapL = v.s - u.s;
		var gapR = w.s - v.s;

		if( gapL + gapR > 0.0 ) {
			return (v.t - w.t) * gapL + (v.t - u.t) * gapR;
		}
		/* vertical line */
		return 0.0;
	};


	/***********************************************************************
	* Define versions of EdgeSign, EdgeEval with s and t transposed.
	*/

	//TESSreal testransEval( TESSvertex *u, TESSvertex *v, TESSvertex *w )
	Geom.transEval = function( u, v, w ) {
		/* Given three vertices u,v,w such that TransLeq(u,v) && TransLeq(v,w),
		* evaluates the t-coord of the edge uw at the s-coord of the vertex v.
		* Returns v->s - (uw)(v->t), ie. the signed distance from uw to v.
		* If uw is vertical (and thus passes thru v), the result is zero.
		*
		* The calculation is extremely accurate and stable, even when v
		* is very close to u or w.  In particular if we set v->s = 0 and
		* let r be the negated result (this evaluates (uw)(v->t)), then
		* r is guaranteed to satisfy MIN(u->s,w->s) <= r <= MAX(u->s,w->s).
		*/
		assert( Geom.transLeq( u, v ) && Geom.transLeq( v, w ));

		var gapL = v.t - u.t;
		var gapR = w.t - v.t;

		if( gapL + gapR > 0.0 ) {
			if( gapL < gapR ) {
				return (v.s - u.s) + (u.s - w.s) * (gapL / (gapL + gapR));
			} else {
				return (v.s - w.s) + (w.s - u.s) * (gapR / (gapL + gapR));
			}
		}
		/* vertical line */
		return 0.0;
	};

	//TESSreal testransSign( TESSvertex *u, TESSvertex *v, TESSvertex *w )
	Geom.transSign = function( u, v, w ) {
		/* Returns a number whose sign matches TransEval(u,v,w) but which
		* is cheaper to evaluate.  Returns > 0, == 0 , or < 0
		* as v is above, on, or below the edge uw.
		*/
		assert( Geom.transLeq( u, v ) && Geom.transLeq( v, w ));

		var gapL = v.t - u.t;
		var gapR = w.t - v.t;

		if( gapL + gapR > 0.0 ) {
			return (v.s - w.s) * gapL + (v.s - u.s) * gapR;
		}
		/* vertical line */
		return 0.0;
	};


	//int tesvertCCW( TESSvertex *u, TESSvertex *v, TESSvertex *w )
	Geom.vertCCW = function( u, v, w ) {
		/* For almost-degenerate situations, the results are not reliable.
		* Unless the floating-point arithmetic can be performed without
		* rounding errors, *any* implementation will give incorrect results
		* on some degenerate inputs, so the client must have some way to
		* handle this situation.
		*/
		return (u.s*(v.t - w.t) + v.s*(w.t - u.t) + w.s*(u.t - v.t)) >= 0.0;
	};

	/* Given parameters a,x,b,y returns the value (b*x+a*y)/(a+b),
	* or (x+y)/2 if a==b==0.  It requires that a,b >= 0, and enforces
	* this in the rare case that one argument is slightly negative.
	* The implementation is extremely stable numerically.
	* In particular it guarantees that the result r satisfies
	* MIN(x,y) <= r <= MAX(x,y), and the results are very accurate
	* even when a and b differ greatly in magnitude.
	*/
	Geom.interpolate = function(a,x,b,y) {
		return (a = (a < 0) ? 0 : a, b = (b < 0) ? 0 : b, ((a <= b) ? ((b == 0) ? ((x+y) / 2) : (x + (y-x) * (a/(a+b)))) : (y + (x-y) * (b/(a+b)))));
	};

	/*
	#ifndef FOR_TRITE_TEST_PROGRAM
	#define Interpolate(a,x,b,y)	RealInterpolate(a,x,b,y)
	#else

	// Claim: the ONLY property the sweep algorithm relies on is that
	// MIN(x,y) <= r <= MAX(x,y).  This is a nasty way to test that.
	#include <stdlib.h>
	extern int RandomInterpolate;

	double Interpolate( double a, double x, double b, double y)
	{
		printf("*********************%d\n",RandomInterpolate);
		if( RandomInterpolate ) {
			a = 1.2 * drand48() - 0.1;
			a = (a < 0) ? 0 : ((a > 1) ? 1 : a);
			b = 1.0 - a;
		}
		return RealInterpolate(a,x,b,y);
	}
	#endif*/

	Geom.intersect = function( o1, d1, o2, d2, v ) {
		/* Given edges (o1,d1) and (o2,d2), compute their point of intersection.
		* The computed point is guaranteed to lie in the intersection of the
		* bounding rectangles defined by each edge.
		*/
		var z1, z2;
		var t;

		/* This is certainly not the most efficient way to find the intersection
		* of two line segments, but it is very numerically stable.
		*
		* Strategy: find the two middle vertices in the VertLeq ordering,
		* and interpolate the intersection s-value from these.  Then repeat
		* using the TransLeq ordering to find the intersection t-value.
		*/

		if( ! Geom.vertLeq( o1, d1 )) { t = o1; o1 = d1; d1 = t; } //swap( o1, d1 ); }
		if( ! Geom.vertLeq( o2, d2 )) { t = o2; o2 = d2; d2 = t; } //swap( o2, d2 ); }
		if( ! Geom.vertLeq( o1, o2 )) { t = o1; o1 = o2; o2 = t; t = d1; d1 = d2; d2 = t; }//swap( o1, o2 ); swap( d1, d2 ); }

		if( ! Geom.vertLeq( o2, d1 )) {
			/* Technically, no intersection -- do our best */
			v.s = (o2.s + d1.s) / 2;
		} else if( Geom.vertLeq( d1, d2 )) {
			/* Interpolate between o2 and d1 */
			z1 = Geom.edgeEval( o1, o2, d1 );
			z2 = Geom.edgeEval( o2, d1, d2 );
			if( z1+z2 < 0 ) { z1 = -z1; z2 = -z2; }
			v.s = Geom.interpolate( z1, o2.s, z2, d1.s );
		} else {
			/* Interpolate between o2 and d2 */
			z1 = Geom.edgeSign( o1, o2, d1 );
			z2 = -Geom.edgeSign( o1, d2, d1 );
			if( z1+z2 < 0 ) { z1 = -z1; z2 = -z2; }
			v.s = Geom.interpolate( z1, o2.s, z2, d2.s );
		}

		/* Now repeat the process for t */

		if( ! Geom.transLeq( o1, d1 )) { t = o1; o1 = d1; d1 = t; } //swap( o1, d1 ); }
		if( ! Geom.transLeq( o2, d2 )) { t = o2; o2 = d2; d2 = t; } //swap( o2, d2 ); }
		if( ! Geom.transLeq( o1, o2 )) { t = o1; o1 = o2; o2 = t; t = d1; d1 = d2; d2 = t; } //swap( o1, o2 ); swap( d1, d2 ); }

		if( ! Geom.transLeq( o2, d1 )) {
			/* Technically, no intersection -- do our best */
			v.t = (o2.t + d1.t) / 2;
		} else if( Geom.transLeq( d1, d2 )) {
			/* Interpolate between o2 and d1 */
			z1 = Geom.transEval( o1, o2, d1 );
			z2 = Geom.transEval( o2, d1, d2 );
			if( z1+z2 < 0 ) { z1 = -z1; z2 = -z2; }
			v.t = Geom.interpolate( z1, o2.t, z2, d1.t );
		} else {
			/* Interpolate between o2 and d2 */
			z1 = Geom.transSign( o1, o2, d1 );
			z2 = -Geom.transSign( o1, d2, d1 );
			if( z1+z2 < 0 ) { z1 = -z1; z2 = -z2; }
			v.t = Geom.interpolate( z1, o2.t, z2, d2.t );
		}
	};



	function DictNode() {
		this.key = null;
		this.next = null;
		this.prev = null;
	};

	function Dict(frame, leq) {
		this.head = new DictNode();
		this.head.next = this.head;
		this.head.prev = this.head;
		this.frame = frame;
		this.leq = leq;
	};

	Dict.prototype = {
		min: function() {
			return this.head.next;
		},

		max: function() {
			return this.head.prev;
		},

		insert: function(k) {
			return this.insertBefore(this.head, k);
		},

		search: function(key) {
			/* Search returns the node with the smallest key greater than or equal
			* to the given key.  If there is no such key, returns a node whose
			* key is NULL.  Similarly, Succ(Max(d)) has a NULL key, etc.
			*/
			var node = this.head;
			do {
				node = node.next;
			} while( node.key !== null && ! this.leq(this.frame, key, node.key));

			return node;
		},

		insertBefore: function(node, key) {
			do {
				node = node.prev;
			} while( node.key !== null && ! this.leq(this.frame, node.key, key));

			var newNode = new DictNode();
			newNode.key = key;
			newNode.next = node.next;
			node.next.prev = newNode;
			newNode.prev = node;
			node.next = newNode;

			return newNode;
		},

		delete: function(node) {
			node.next.prev = node.prev;
			node.prev.next = node.next;
		}
	};


	function PQnode() {
		this.handle = null;
	}

	function PQhandleElem() {
		this.key = null;
		this.node = null;
	}

	function PriorityQ(size, leq) {
		this.size = 0;
		this.max = size;

		this.nodes = [];
		this.nodes.length = size+1;
		for (var i = 0; i < this.nodes.length; i++)
			this.nodes[i] = new PQnode();

		this.handles = [];
		this.handles.length = size+1;
		for (var i = 0; i < this.handles.length; i++)
			this.handles[i] = new PQhandleElem();

		this.initialized = false;
		this.freeList = 0;
		this.leq = leq;

		this.nodes[1].handle = 1;	/* so that Minimum() returns NULL */
		this.handles[1].key = null;
	};

	PriorityQ.prototype = {

		floatDown_: function( curr )
		{
			var n = this.nodes;
			var h = this.handles;
			var hCurr, hChild;
			var child;

			hCurr = n[curr].handle;
			for( ;; ) {
				child = curr << 1;
				if( child < this.size && this.leq( h[n[child+1].handle].key, h[n[child].handle].key )) {
					++child;
				}

				assert(child <= this.max);

				hChild = n[child].handle;
				if( child > this.size || this.leq( h[hCurr].key, h[hChild].key )) {
					n[curr].handle = hCurr;
					h[hCurr].node = curr;
					break;
				}
				n[curr].handle = hChild;
				h[hChild].node = curr;
				curr = child;
			}
		},

		floatUp_: function( curr )
		{
			var n = this.nodes;
			var h = this.handles;
			var hCurr, hParent;
			var parent;

			hCurr = n[curr].handle;
			for( ;; ) {
				parent = curr >> 1;
				hParent = n[parent].handle;
				if( parent == 0 || this.leq( h[hParent].key, h[hCurr].key )) {
					n[curr].handle = hCurr;
					h[hCurr].node = curr;
					break;
				}
				n[curr].handle = hParent;
				h[hParent].node = curr;
				curr = parent;
			}
		},

		init: function() {
			/* This method of building a heap is O(n), rather than O(n lg n). */
			for( var i = this.size; i >= 1; --i ) {
				this.floatDown_( i );
			}
			this.initialized = true;
		},

		min: function() {
			return this.handles[this.nodes[1].handle].key;
		},

		isEmpty: function() {
			this.size === 0;
		},

		/* really pqHeapInsert */
		/* returns INV_HANDLE iff out of memory */
		//PQhandle pqHeapInsert( TESSalloc* alloc, PriorityQHeap *pq, PQkey keyNew )
		insert: function(keyNew)
		{
			var curr;
			var free;

			curr = ++this.size;
			if( (curr*2) > this.max ) {
				this.max *= 2;
				var s;
				s = this.nodes.length;
				this.nodes.length = this.max+1;
				for (var i = s; i < this.nodes.length; i++)
					this.nodes[i] = new PQnode();

				s = this.handles.length;
				this.handles.length = this.max+1;
				for (var i = s; i < this.handles.length; i++)
					this.handles[i] = new PQhandleElem();
			}

			if( this.freeList === 0 ) {
				free = curr;
			} else {
				free = this.freeList;
				this.freeList = this.handles[free].node;
			}

			this.nodes[curr].handle = free;
			this.handles[free].node = curr;
			this.handles[free].key = keyNew;

			if( this.initialized ) {
				this.floatUp_( curr );
			}
			return free;
		},

		//PQkey pqHeapExtractMin( PriorityQHeap *pq )
		extractMin: function() {
			var n = this.nodes;
			var h = this.handles;
			var hMin = n[1].handle;
			var min = h[hMin].key;

			if( this.size > 0 ) {
				n[1].handle = n[this.size].handle;
				h[n[1].handle].node = 1;

				h[hMin].key = null;
				h[hMin].node = this.freeList;
				this.freeList = hMin;

				--this.size;
				if( this.size > 0 ) {
					this.floatDown_( 1 );
				}
			}
			return min;
		},

		delete: function( hCurr ) {
			var n = this.nodes;
			var h = this.handles;
			var curr;

			assert( hCurr >= 1 && hCurr <= this.max && h[hCurr].key !== null );

			curr = h[hCurr].node;
			n[curr].handle = n[this.size].handle;
			h[n[curr].handle].node = curr;

			--this.size;
			if( curr <= this.size ) {
				if( curr <= 1 || this.leq( h[n[curr>>1].handle].key, h[n[curr].handle].key )) {
					this.floatDown_( curr );
				} else {
					this.floatUp_( curr );
				}
			}
			h[hCurr].key = null;
			h[hCurr].node = this.freeList;
			this.freeList = hCurr;
		}
	};


	/* For each pair of adjacent edges crossing the sweep line, there is
	* an ActiveRegion to represent the region between them.  The active
	* regions are kept in sorted order in a dynamic dictionary.  As the
	* sweep line crosses each vertex, we update the affected regions.
	*/

	function ActiveRegion() {
		this.eUp = null;		/* upper edge, directed right to left */
		this.nodeUp = null;	/* dictionary node corresponding to eUp */
		this.windingNumber = 0;	/* used to determine which regions are
								* inside the polygon */
		this.inside = false;		/* is this region inside the polygon? */
		this.sentinel = false;	/* marks fake edges at t = +/-infinity */
		this.dirty = false;		/* marks regions where the upper or lower
						* edge has changed, but we haven't checked
						* whether they intersect yet */
		this.fixUpperEdge = false;	/* marks temporary edges introduced when
							* we process a "right vertex" (one without
							* any edges leaving to the right) */
	};

	var Sweep = {};

	Sweep.regionBelow = function(r) {
		return r.nodeUp.prev.key;
	}

	Sweep.regionAbove = function(r) {
		return r.nodeUp.next.key;
	}

	Sweep.debugEvent = function( tess ) {
		// empty
	}


	/*
	* Invariants for the Edge Dictionary.
	* - each pair of adjacent edges e2=Succ(e1) satisfies EdgeLeq(e1,e2)
	*   at any valid location of the sweep event
	* - if EdgeLeq(e2,e1) as well (at any valid sweep event), then e1 and e2
	*   share a common endpoint
	* - for each e, e->Dst has been processed, but not e->Org
	* - each edge e satisfies VertLeq(e->Dst,event) && VertLeq(event,e->Org)
	*   where "event" is the current sweep line event.
	* - no edge e has zero length
	*
	* Invariants for the Mesh (the processed portion).
	* - the portion of the mesh left of the sweep line is a planar graph,
	*   ie. there is *some* way to embed it in the plane
	* - no processed edge has zero length
	* - no two processed vertices have identical coordinates
	* - each "inside" region is monotone, ie. can be broken into two chains
	*   of monotonically increasing vertices according to VertLeq(v1,v2)
	*   - a non-invariant: these chains may intersect (very slightly)
	*
	* Invariants for the Sweep.
	* - if none of the edges incident to the event vertex have an activeRegion
	*   (ie. none of these edges are in the edge dictionary), then the vertex
	*   has only right-going edges.
	* - if an edge is marked "fixUpperEdge" (it is a temporary edge introduced
	*   by ConnectRightVertex), then it is the only right-going edge from
	*   its associated vertex.  (This says that these edges exist only
	*   when it is necessary.)
	*/

	/* When we merge two edges into one, we need to compute the combined
	* winding of the new edge.
	*/
	Sweep.addWinding = function(eDst,eSrc) {
		eDst.winding += eSrc.winding;
		eDst.Sym.winding += eSrc.Sym.winding;
	}


	//static int EdgeLeq( TESStesselator *tess, ActiveRegion *reg1, ActiveRegion *reg2 )
	Sweep.edgeLeq = function( tess, reg1, reg2 ) {
		/*
		* Both edges must be directed from right to left (this is the canonical
		* direction for the upper edge of each region).
		*
		* The strategy is to evaluate a "t" value for each edge at the
		* current sweep line position, given by tess->event.  The calculations
		* are designed to be very stable, but of course they are not perfect.
		*
		* Special case: if both edge destinations are at the sweep event,
		* we sort the edges by slope (they would otherwise compare equally).
		*/
		var ev = tess.event;
		var t1, t2;

		var e1 = reg1.eUp;
		var e2 = reg2.eUp;

		if( e1.Dst === ev ) {
			if( e2.Dst === ev ) {
				/* Two edges right of the sweep line which meet at the sweep event.
				* Sort them by slope.
				*/
				if( Geom.vertLeq( e1.Org, e2.Org )) {
					return Geom.edgeSign( e2.Dst, e1.Org, e2.Org ) <= 0;
				}
				return Geom.edgeSign( e1.Dst, e2.Org, e1.Org ) >= 0;
			}
			return Geom.edgeSign( e2.Dst, ev, e2.Org ) <= 0;
		}
		if( e2.Dst === ev ) {
			return Geom.edgeSign( e1.Dst, ev, e1.Org ) >= 0;
		}

		/* General case - compute signed distance *from* e1, e2 to event */
		var t1 = Geom.edgeEval( e1.Dst, ev, e1.Org );
		var t2 = Geom.edgeEval( e2.Dst, ev, e2.Org );
		return (t1 >= t2);
	}


	//static void DeleteRegion( TESStesselator *tess, ActiveRegion *reg )
	Sweep.deleteRegion = function( tess, reg ) {
		if( reg.fixUpperEdge ) {
			/* It was created with zero winding number, so it better be
			* deleted with zero winding number (ie. it better not get merged
			* with a real edge).
			*/
			assert( reg.eUp.winding === 0 );
		}
		reg.eUp.activeRegion = null;
		tess.dict.delete( reg.nodeUp );
	}

	//static int FixUpperEdge( TESStesselator *tess, ActiveRegion *reg, TESShalfEdge *newEdge )
	Sweep.fixUpperEdge = function( tess, reg, newEdge ) {
		/*
		* Replace an upper edge which needs fixing (see ConnectRightVertex).
		*/
		assert( reg.fixUpperEdge );
		tess.mesh.delete( reg.eUp );
		reg.fixUpperEdge = false;
		reg.eUp = newEdge;
		newEdge.activeRegion = reg;
	}

	//static ActiveRegion *TopLeftRegion( TESStesselator *tess, ActiveRegion *reg )
	Sweep.topLeftRegion = function( tess, reg ) {
		var org = reg.eUp.Org;
		var e;

		/* Find the region above the uppermost edge with the same origin */
		do {
			reg = Sweep.regionAbove( reg );
		} while( reg.eUp.Org === org );

		/* If the edge above was a temporary edge introduced by ConnectRightVertex,
		* now is the time to fix it.
		*/
		if( reg.fixUpperEdge ) {
			e = tess.mesh.connect( Sweep.regionBelow(reg).eUp.Sym, reg.eUp.Lnext );
			if (e === null) return null;
			Sweep.fixUpperEdge( tess, reg, e );
			reg = Sweep.regionAbove( reg );
		}
		return reg;
	}

	//static ActiveRegion *TopRightRegion( ActiveRegion *reg )
	Sweep.topRightRegion = function( reg )
	{
		var dst = reg.eUp.Dst;
		var reg = null;
		/* Find the region above the uppermost edge with the same destination */
		do {
			reg = Sweep.regionAbove( reg );
		} while( reg.eUp.Dst === dst );
		return reg;
	}

	//static ActiveRegion *AddRegionBelow( TESStesselator *tess, ActiveRegion *regAbove, TESShalfEdge *eNewUp )
	Sweep.addRegionBelow = function( tess, regAbove, eNewUp ) {
		/*
		* Add a new active region to the sweep line, *somewhere* below "regAbove"
		* (according to where the new edge belongs in the sweep-line dictionary).
		* The upper edge of the new region will be "eNewUp".
		* Winding number and "inside" flag are not updated.
		*/
		var regNew = new ActiveRegion();
		regNew.eUp = eNewUp;
		regNew.nodeUp = tess.dict.insertBefore( regAbove.nodeUp, regNew );
	//	if (regNew->nodeUp == NULL) longjmp(tess->env,1);
		regNew.fixUpperEdge = false;
		regNew.sentinel = false;
		regNew.dirty = false;

		eNewUp.activeRegion = regNew;
		return regNew;
	}

	//static int IsWindingInside( TESStesselator *tess, int n )
	Sweep.isWindingInside = function( tess, n ) {
		switch( tess.windingRule ) {
			case Tess2.WINDING_ODD:
				return (n & 1) != 0;
			case Tess2.WINDING_NONZERO:
				return (n != 0);
			case Tess2.WINDING_POSITIVE:
				return (n > 0);
			case Tess2.WINDING_NEGATIVE:
				return (n < 0);
			case Tess2.WINDING_ABS_GEQ_TWO:
				return (n >= 2) || (n <= -2);
		}
		assert( false );
		return false;
	}

	//static void ComputeWinding( TESStesselator *tess, ActiveRegion *reg )
	Sweep.computeWinding = function( tess, reg ) {
		reg.windingNumber = Sweep.regionAbove(reg).windingNumber + reg.eUp.winding;
		reg.inside = Sweep.isWindingInside( tess, reg.windingNumber );
	}


	//static void FinishRegion( TESStesselator *tess, ActiveRegion *reg )
	Sweep.finishRegion = function( tess, reg ) {
		/*
		* Delete a region from the sweep line.  This happens when the upper
		* and lower chains of a region meet (at a vertex on the sweep line).
		* The "inside" flag is copied to the appropriate mesh face (we could
		* not do this before -- since the structure of the mesh is always
		* changing, this face may not have even existed until now).
		*/
		var e = reg.eUp;
		var f = e.Lface;

		f.inside = reg.inside;
		f.anEdge = e;   /* optimization for tessMeshTessellateMonoRegion() */
		Sweep.deleteRegion( tess, reg );
	}


	//static TESShalfEdge *FinishLeftRegions( TESStesselator *tess, ActiveRegion *regFirst, ActiveRegion *regLast )
	Sweep.finishLeftRegions = function( tess, regFirst, regLast ) {
		/*
		* We are given a vertex with one or more left-going edges.  All affected
		* edges should be in the edge dictionary.  Starting at regFirst->eUp,
		* we walk down deleting all regions where both edges have the same
		* origin vOrg.  At the same time we copy the "inside" flag from the
		* active region to the face, since at this point each face will belong
		* to at most one region (this was not necessarily true until this point
		* in the sweep).  The walk stops at the region above regLast; if regLast
		* is NULL we walk as far as possible.  At the same time we relink the
		* mesh if necessary, so that the ordering of edges around vOrg is the
		* same as in the dictionary.
		*/
		var e, ePrev;
		var reg = null;
		var regPrev = regFirst;
		var ePrev = regFirst.eUp;
		while( regPrev !== regLast ) {
			regPrev.fixUpperEdge = false;	/* placement was OK */
			reg = Sweep.regionBelow( regPrev );
			e = reg.eUp;
			if( e.Org != ePrev.Org ) {
				if( ! reg.fixUpperEdge ) {
					/* Remove the last left-going edge.  Even though there are no further
					* edges in the dictionary with this origin, there may be further
					* such edges in the mesh (if we are adding left edges to a vertex
					* that has already been processed).  Thus it is important to call
					* FinishRegion rather than just DeleteRegion.
					*/
					Sweep.finishRegion( tess, regPrev );
					break;
				}
				/* If the edge below was a temporary edge introduced by
				* ConnectRightVertex, now is the time to fix it.
				*/
				e = tess.mesh.connect( ePrev.Lprev, e.Sym );
	//			if (e == NULL) longjmp(tess->env,1);
				Sweep.fixUpperEdge( tess, reg, e );
			}

			/* Relink edges so that ePrev->Onext == e */
			if( ePrev.Onext !== e ) {
				tess.mesh.splice( e.Oprev, e );
				tess.mesh.splice( ePrev, e );
			}
			Sweep.finishRegion( tess, regPrev );	/* may change reg->eUp */
			ePrev = reg.eUp;
			regPrev = reg;
		}
		return ePrev;
	}


	//static void AddRightEdges( TESStesselator *tess, ActiveRegion *regUp, TESShalfEdge *eFirst, TESShalfEdge *eLast, TESShalfEdge *eTopLeft, int cleanUp )
	Sweep.addRightEdges = function( tess, regUp, eFirst, eLast, eTopLeft, cleanUp ) {
		/*
		* Purpose: insert right-going edges into the edge dictionary, and update
		* winding numbers and mesh connectivity appropriately.  All right-going
		* edges share a common origin vOrg.  Edges are inserted CCW starting at
		* eFirst; the last edge inserted is eLast->Oprev.  If vOrg has any
		* left-going edges already processed, then eTopLeft must be the edge
		* such that an imaginary upward vertical segment from vOrg would be
		* contained between eTopLeft->Oprev and eTopLeft; otherwise eTopLeft
		* should be NULL.
		*/
		var reg, regPrev;
		var e, ePrev;
		var firstTime = true;

		/* Insert the new right-going edges in the dictionary */
		e = eFirst;
		do {
			assert( Geom.vertLeq( e.Org, e.Dst ));
			Sweep.addRegionBelow( tess, regUp, e.Sym );
			e = e.Onext;
		} while ( e !== eLast );

		/* Walk *all* right-going edges from e->Org, in the dictionary order,
		* updating the winding numbers of each region, and re-linking the mesh
		* edges to match the dictionary ordering (if necessary).
		*/
		if( eTopLeft === null ) {
			eTopLeft = Sweep.regionBelow( regUp ).eUp.Rprev;
		}
		regPrev = regUp;
		ePrev = eTopLeft;
		for( ;; ) {
			reg = Sweep.regionBelow( regPrev );
			e = reg.eUp.Sym;
			if( e.Org !== ePrev.Org ) break;

			if( e.Onext !== ePrev ) {
				/* Unlink e from its current position, and relink below ePrev */
				tess.mesh.splice( e.Oprev, e );
				tess.mesh.splice( ePrev.Oprev, e );
			}
			/* Compute the winding number and "inside" flag for the new regions */
			reg.windingNumber = regPrev.windingNumber - e.winding;
			reg.inside = Sweep.isWindingInside( tess, reg.windingNumber );

			/* Check for two outgoing edges with same slope -- process these
			* before any intersection tests (see example in tessComputeInterior).
			*/
			regPrev.dirty = true;
			if( ! firstTime && Sweep.checkForRightSplice( tess, regPrev )) {
				Sweep.addWinding( e, ePrev );
				Sweep.deleteRegion( tess, regPrev );
				tess.mesh.delete( ePrev );
			}
			firstTime = false;
			regPrev = reg;
			ePrev = e;
		}
		regPrev.dirty = true;
		assert( regPrev.windingNumber - e.winding === reg.windingNumber );

		if( cleanUp ) {
			/* Check for intersections between newly adjacent edges. */
			Sweep.walkDirtyRegions( tess, regPrev );
		}
	}


	//static void SpliceMergeVertices( TESStesselator *tess, TESShalfEdge *e1, TESShalfEdge *e2 )
	Sweep.spliceMergeVertices = function( tess, e1, e2 ) {
		/*
		* Two vertices with idential coordinates are combined into one.
		* e1->Org is kept, while e2->Org is discarded.
		*/
		tess.mesh.splice( e1, e2 ); 
	}

	//static void VertexWeights( TESSvertex *isect, TESSvertex *org, TESSvertex *dst, TESSreal *weights )
	Sweep.vertexWeights = function( isect, org, dst ) {
		/*
		* Find some weights which describe how the intersection vertex is
		* a linear combination of "org" and "dest".  Each of the two edges
		* which generated "isect" is allocated 50% of the weight; each edge
		* splits the weight between its org and dst according to the
		* relative distance to "isect".
		*/
		var t1 = Geom.vertL1dist( org, isect );
		var t2 = Geom.vertL1dist( dst, isect );
		var w0 = 0.5 * t2 / (t1 + t2);
		var w1 = 0.5 * t1 / (t1 + t2);
		isect.coords[0] += w0*org.coords[0] + w1*dst.coords[0];
		isect.coords[1] += w0*org.coords[1] + w1*dst.coords[1];
		isect.coords[2] += w0*org.coords[2] + w1*dst.coords[2];
	}


	//static void GetIntersectData( TESStesselator *tess, TESSvertex *isect, TESSvertex *orgUp, TESSvertex *dstUp, TESSvertex *orgLo, TESSvertex *dstLo )
	Sweep.getIntersectData = function( tess, isect, orgUp, dstUp, orgLo, dstLo ) {
		 /*
		 * We've computed a new intersection point, now we need a "data" pointer
		 * from the user so that we can refer to this new vertex in the
		 * rendering callbacks.
		 */
		isect.coords[0] = isect.coords[1] = isect.coords[2] = 0;
		isect.idx = -1;
		Sweep.vertexWeights( isect, orgUp, dstUp );
		Sweep.vertexWeights( isect, orgLo, dstLo );
	}

	//static int CheckForRightSplice( TESStesselator *tess, ActiveRegion *regUp )
	Sweep.checkForRightSplice = function( tess, regUp ) {
		/*
		* Check the upper and lower edge of "regUp", to make sure that the
		* eUp->Org is above eLo, or eLo->Org is below eUp (depending on which
		* origin is leftmost).
		*
		* The main purpose is to splice right-going edges with the same
		* dest vertex and nearly identical slopes (ie. we can't distinguish
		* the slopes numerically).  However the splicing can also help us
		* to recover from numerical errors.  For example, suppose at one
		* point we checked eUp and eLo, and decided that eUp->Org is barely
		* above eLo.  Then later, we split eLo into two edges (eg. from
		* a splice operation like this one).  This can change the result of
		* our test so that now eUp->Org is incident to eLo, or barely below it.
		* We must correct this condition to maintain the dictionary invariants.
		*
		* One possibility is to check these edges for intersection again
		* (ie. CheckForIntersect).  This is what we do if possible.  However
		* CheckForIntersect requires that tess->event lies between eUp and eLo,
		* so that it has something to fall back on when the intersection
		* calculation gives us an unusable answer.  So, for those cases where
		* we can't check for intersection, this routine fixes the problem
		* by just splicing the offending vertex into the other edge.
		* This is a guaranteed solution, no matter how degenerate things get.
		* Basically this is a combinatorial solution to a numerical problem.
		*/
		var regLo = Sweep.regionBelow(regUp);
		var eUp = regUp.eUp;
		var eLo = regLo.eUp;

		if( Geom.vertLeq( eUp.Org, eLo.Org )) {
			if( Geom.edgeSign( eLo.Dst, eUp.Org, eLo.Org ) > 0 ) return false;

			/* eUp->Org appears to be below eLo */
			if( ! Geom.vertEq( eUp.Org, eLo.Org )) {
				/* Splice eUp->Org into eLo */
				tess.mesh.splitEdge( eLo.Sym );
				tess.mesh.splice( eUp, eLo.Oprev );
				regUp.dirty = regLo.dirty = true;

			} else if( eUp.Org !== eLo.Org ) {
				/* merge the two vertices, discarding eUp->Org */
				tess.pq.delete( eUp.Org.pqHandle );
				Sweep.spliceMergeVertices( tess, eLo.Oprev, eUp );
			}
		} else {
			if( Geom.edgeSign( eUp.Dst, eLo.Org, eUp.Org ) < 0 ) return false;

			/* eLo->Org appears to be above eUp, so splice eLo->Org into eUp */
			Sweep.regionAbove(regUp).dirty = regUp.dirty = true;
			tess.mesh.splitEdge( eUp.Sym );
			tess.mesh.splice( eLo.Oprev, eUp );
		}
		return true;
	}

	//static int CheckForLeftSplice( TESStesselator *tess, ActiveRegion *regUp )
	Sweep.checkForLeftSplice = function( tess, regUp ) {
		/*
		* Check the upper and lower edge of "regUp", to make sure that the
		* eUp->Dst is above eLo, or eLo->Dst is below eUp (depending on which
		* destination is rightmost).
		*
		* Theoretically, this should always be true.  However, splitting an edge
		* into two pieces can change the results of previous tests.  For example,
		* suppose at one point we checked eUp and eLo, and decided that eUp->Dst
		* is barely above eLo.  Then later, we split eLo into two edges (eg. from
		* a splice operation like this one).  This can change the result of
		* the test so that now eUp->Dst is incident to eLo, or barely below it.
		* We must correct this condition to maintain the dictionary invariants
		* (otherwise new edges might get inserted in the wrong place in the
		* dictionary, and bad stuff will happen).
		*
		* We fix the problem by just splicing the offending vertex into the
		* other edge.
		*/
		var regLo = Sweep.regionBelow(regUp);
		var eUp = regUp.eUp;
		var eLo = regLo.eUp;
		var e;

		assert( ! Geom.vertEq( eUp.Dst, eLo.Dst ));

		if( Geom.vertLeq( eUp.Dst, eLo.Dst )) {
			if( Geom.edgeSign( eUp.Dst, eLo.Dst, eUp.Org ) < 0 ) return false;

			/* eLo->Dst is above eUp, so splice eLo->Dst into eUp */
			Sweep.regionAbove(regUp).dirty = regUp.dirty = true;
			e = tess.mesh.splitEdge( eUp );
			tess.mesh.splice( eLo.Sym, e );
			e.Lface.inside = regUp.inside;
		} else {
			if( Geom.edgeSign( eLo.Dst, eUp.Dst, eLo.Org ) > 0 ) return false;

			/* eUp->Dst is below eLo, so splice eUp->Dst into eLo */
			regUp.dirty = regLo.dirty = true;
			e = tess.mesh.splitEdge( eLo );
			tess.mesh.splice( eUp.Lnext, eLo.Sym );
			e.Rface.inside = regUp.inside;
		}
		return true;
	}


	//static int CheckForIntersect( TESStesselator *tess, ActiveRegion *regUp )
	Sweep.checkForIntersect = function( tess, regUp ) {
		/*
		* Check the upper and lower edges of the given region to see if
		* they intersect.  If so, create the intersection and add it
		* to the data structures.
		*
		* Returns TRUE if adding the new intersection resulted in a recursive
		* call to AddRightEdges(); in this case all "dirty" regions have been
		* checked for intersections, and possibly regUp has been deleted.
		*/
		var regLo = Sweep.regionBelow(regUp);
		var eUp = regUp.eUp;
		var eLo = regLo.eUp;
		var orgUp = eUp.Org;
		var orgLo = eLo.Org;
		var dstUp = eUp.Dst;
		var dstLo = eLo.Dst;
		var tMinUp, tMaxLo;
		var isect = new TESSvertex, orgMin;
		var e;

		assert( ! Geom.vertEq( dstLo, dstUp ));
		assert( Geom.edgeSign( dstUp, tess.event, orgUp ) <= 0 );
		assert( Geom.edgeSign( dstLo, tess.event, orgLo ) >= 0 );
		assert( orgUp !== tess.event && orgLo !== tess.event );
		assert( ! regUp.fixUpperEdge && ! regLo.fixUpperEdge );

		if( orgUp === orgLo ) return false;	/* right endpoints are the same */

		tMinUp = Math.min( orgUp.t, dstUp.t );
		tMaxLo = Math.max( orgLo.t, dstLo.t );
		if( tMinUp > tMaxLo ) return false;	/* t ranges do not overlap */

		if( Geom.vertLeq( orgUp, orgLo )) {
			if( Geom.edgeSign( dstLo, orgUp, orgLo ) > 0 ) return false;
		} else {
			if( Geom.edgeSign( dstUp, orgLo, orgUp ) < 0 ) return false;
		}

		/* At this point the edges intersect, at least marginally */
		Sweep.debugEvent( tess );

		Geom.intersect( dstUp, orgUp, dstLo, orgLo, isect );
		/* The following properties are guaranteed: */
		assert( Math.min( orgUp.t, dstUp.t ) <= isect.t );
		assert( isect.t <= Math.max( orgLo.t, dstLo.t ));
		assert( Math.min( dstLo.s, dstUp.s ) <= isect.s );
		assert( isect.s <= Math.max( orgLo.s, orgUp.s ));

		if( Geom.vertLeq( isect, tess.event )) {
			/* The intersection point lies slightly to the left of the sweep line,
			* so move it until it''s slightly to the right of the sweep line.
			* (If we had perfect numerical precision, this would never happen
			* in the first place).  The easiest and safest thing to do is
			* replace the intersection by tess->event.
			*/
			isect.s = tess.event.s;
			isect.t = tess.event.t;
		}
		/* Similarly, if the computed intersection lies to the right of the
		* rightmost origin (which should rarely happen), it can cause
		* unbelievable inefficiency on sufficiently degenerate inputs.
		* (If you have the test program, try running test54.d with the
		* "X zoom" option turned on).
		*/
		orgMin = Geom.vertLeq( orgUp, orgLo ) ? orgUp : orgLo;
		if( Geom.vertLeq( orgMin, isect )) {
			isect.s = orgMin.s;
			isect.t = orgMin.t;
		}

		if( Geom.vertEq( isect, orgUp ) || Geom.vertEq( isect, orgLo )) {
			/* Easy case -- intersection at one of the right endpoints */
			Sweep.checkForRightSplice( tess, regUp );
			return false;
		}

		if(    (! Geom.vertEq( dstUp, tess.event )
			&& Geom.edgeSign( dstUp, tess.event, isect ) >= 0)
			|| (! Geom.vertEq( dstLo, tess.event )
			&& Geom.edgeSign( dstLo, tess.event, isect ) <= 0 ))
		{
			/* Very unusual -- the new upper or lower edge would pass on the
			* wrong side of the sweep event, or through it.  This can happen
			* due to very small numerical errors in the intersection calculation.
			*/
			if( dstLo === tess.event ) {
				/* Splice dstLo into eUp, and process the new region(s) */
				tess.mesh.splitEdge( eUp.Sym );
				tess.mesh.splice( eLo.Sym, eUp );
				regUp = Sweep.topLeftRegion( tess, regUp );
	//			if (regUp == NULL) longjmp(tess->env,1);
				eUp = Sweep.regionBelow(regUp).eUp;
				Sweep.finishLeftRegions( tess, Sweep.regionBelow(regUp), regLo );
				Sweep.addRightEdges( tess, regUp, eUp.Oprev, eUp, eUp, true );
				return TRUE;
			}
			if( dstUp === tess.event ) {
				/* Splice dstUp into eLo, and process the new region(s) */
				tess.mesh.splitEdge( eLo.Sym );
				tess.mesh.splice( eUp.Lnext, eLo.Oprev ); 
				regLo = regUp;
				regUp = Sweep.topRightRegion( regUp );
				e = Sweep.regionBelow(regUp).eUp.Rprev;
				regLo.eUp = eLo.Oprev;
				eLo = Sweep.finishLeftRegions( tess, regLo, null );
				Sweep.addRightEdges( tess, regUp, eLo.Onext, eUp.Rprev, e, true );
				return true;
			}
			/* Special case: called from ConnectRightVertex.  If either
			* edge passes on the wrong side of tess->event, split it
			* (and wait for ConnectRightVertex to splice it appropriately).
			*/
			if( Geom.edgeSign( dstUp, tess.event, isect ) >= 0 ) {
				Sweep.regionAbove(regUp).dirty = regUp.dirty = true;
				tess.mesh.splitEdge( eUp.Sym );
				eUp.Org.s = tess.event.s;
				eUp.Org.t = tess.event.t;
			}
			if( Geom.edgeSign( dstLo, tess.event, isect ) <= 0 ) {
				regUp.dirty = regLo.dirty = true;
				tess.mesh.splitEdge( eLo.Sym );
				eLo.Org.s = tess.event.s;
				eLo.Org.t = tess.event.t;
			}
			/* leave the rest for ConnectRightVertex */
			return false;
		}

		/* General case -- split both edges, splice into new vertex.
		* When we do the splice operation, the order of the arguments is
		* arbitrary as far as correctness goes.  However, when the operation
		* creates a new face, the work done is proportional to the size of
		* the new face.  We expect the faces in the processed part of
		* the mesh (ie. eUp->Lface) to be smaller than the faces in the
		* unprocessed original contours (which will be eLo->Oprev->Lface).
		*/
		tess.mesh.splitEdge( eUp.Sym );
		tess.mesh.splitEdge( eLo.Sym );
		tess.mesh.splice( eLo.Oprev, eUp );
		eUp.Org.s = isect.s;
		eUp.Org.t = isect.t;
		eUp.Org.pqHandle = tess.pq.insert( eUp.Org );
		Sweep.getIntersectData( tess, eUp.Org, orgUp, dstUp, orgLo, dstLo );
		Sweep.regionAbove(regUp).dirty = regUp.dirty = regLo.dirty = true;
		return false;
	}

	//static void WalkDirtyRegions( TESStesselator *tess, ActiveRegion *regUp )
	Sweep.walkDirtyRegions = function( tess, regUp ) {
		/*
		* When the upper or lower edge of any region changes, the region is
		* marked "dirty".  This routine walks through all the dirty regions
		* and makes sure that the dictionary invariants are satisfied
		* (see the comments at the beginning of this file).  Of course
		* new dirty regions can be created as we make changes to restore
		* the invariants.
		*/
		var regLo = Sweep.regionBelow(regUp);
		var eUp, eLo;

		for( ;; ) {
			/* Find the lowest dirty region (we walk from the bottom up). */
			while( regLo.dirty ) {
				regUp = regLo;
				regLo = Sweep.regionBelow(regLo);
			}
			if( ! regUp.dirty ) {
				regLo = regUp;
				regUp = Sweep.regionAbove( regUp );
				if( regUp == null || ! regUp.dirty ) {
					/* We've walked all the dirty regions */
					return;
				}
			}
			regUp.dirty = false;
			eUp = regUp.eUp;
			eLo = regLo.eUp;

			if( eUp.Dst !== eLo.Dst ) {
				/* Check that the edge ordering is obeyed at the Dst vertices. */
				if( Sweep.checkForLeftSplice( tess, regUp )) {

					/* If the upper or lower edge was marked fixUpperEdge, then
					* we no longer need it (since these edges are needed only for
					* vertices which otherwise have no right-going edges).
					*/
					if( regLo.fixUpperEdge ) {
						Sweep.deleteRegion( tess, regLo );
						tess.mesh.delete( eLo );
						regLo = Sweep.regionBelow( regUp );
						eLo = regLo.eUp;
					} else if( regUp.fixUpperEdge ) {
						Sweep.deleteRegion( tess, regUp );
						tess.mesh.delete( eUp );
						regUp = Sweep.regionAbove( regLo );
						eUp = regUp.eUp;
					}
				}
			}
			if( eUp.Org !== eLo.Org ) {
				if(    eUp.Dst !== eLo.Dst
					&& ! regUp.fixUpperEdge && ! regLo.fixUpperEdge
					&& (eUp.Dst === tess.event || eLo.Dst === tess.event) )
				{
					/* When all else fails in CheckForIntersect(), it uses tess->event
					* as the intersection location.  To make this possible, it requires
					* that tess->event lie between the upper and lower edges, and also
					* that neither of these is marked fixUpperEdge (since in the worst
					* case it might splice one of these edges into tess->event, and
					* violate the invariant that fixable edges are the only right-going
					* edge from their associated vertex).
					*/
					if( Sweep.checkForIntersect( tess, regUp )) {
						/* WalkDirtyRegions() was called recursively; we're done */
						return;
					}
				} else {
					/* Even though we can't use CheckForIntersect(), the Org vertices
					* may violate the dictionary edge ordering.  Check and correct this.
					*/
					Sweep.checkForRightSplice( tess, regUp );
				}
			}
			if( eUp.Org === eLo.Org && eUp.Dst === eLo.Dst ) {
				/* A degenerate loop consisting of only two edges -- delete it. */
				Sweep.addWinding( eLo, eUp );
				Sweep.deleteRegion( tess, regUp );
				tess.mesh.delete( eUp );
				regUp = Sweep.regionAbove( regLo );
			}
		}
	}


	//static void ConnectRightVertex( TESStesselator *tess, ActiveRegion *regUp, TESShalfEdge *eBottomLeft )
	Sweep.connectRightVertex = function( tess, regUp, eBottomLeft ) {
		/*
		* Purpose: connect a "right" vertex vEvent (one where all edges go left)
		* to the unprocessed portion of the mesh.  Since there are no right-going
		* edges, two regions (one above vEvent and one below) are being merged
		* into one.  "regUp" is the upper of these two regions.
		*
		* There are two reasons for doing this (adding a right-going edge):
		*  - if the two regions being merged are "inside", we must add an edge
		*    to keep them separated (the combined region would not be monotone).
		*  - in any case, we must leave some record of vEvent in the dictionary,
		*    so that we can merge vEvent with features that we have not seen yet.
		*    For example, maybe there is a vertical edge which passes just to
		*    the right of vEvent; we would like to splice vEvent into this edge.
		*
		* However, we don't want to connect vEvent to just any vertex.  We don''t
		* want the new edge to cross any other edges; otherwise we will create
		* intersection vertices even when the input data had no self-intersections.
		* (This is a bad thing; if the user's input data has no intersections,
		* we don't want to generate any false intersections ourselves.)
		*
		* Our eventual goal is to connect vEvent to the leftmost unprocessed
		* vertex of the combined region (the union of regUp and regLo).
		* But because of unseen vertices with all right-going edges, and also
		* new vertices which may be created by edge intersections, we don''t
		* know where that leftmost unprocessed vertex is.  In the meantime, we
		* connect vEvent to the closest vertex of either chain, and mark the region
		* as "fixUpperEdge".  This flag says to delete and reconnect this edge
		* to the next processed vertex on the boundary of the combined region.
		* Quite possibly the vertex we connected to will turn out to be the
		* closest one, in which case we won''t need to make any changes.
		*/
		var eNew;
		var eTopLeft = eBottomLeft.Onext;
		var regLo = Sweep.regionBelow(regUp);
		var eUp = regUp.eUp;
		var eLo = regLo.eUp;
		var degenerate = false;

		if( eUp.Dst !== eLo.Dst ) {
			Sweep.checkForIntersect( tess, regUp );
		}

		/* Possible new degeneracies: upper or lower edge of regUp may pass
		* through vEvent, or may coincide with new intersection vertex
		*/
		if( Geom.vertEq( eUp.Org, tess.event )) {
			tess.mesh.splice( eTopLeft.Oprev, eUp );
			regUp = Sweep.topLeftRegion( tess, regUp );
			eTopLeft = Sweep.regionBelow( regUp ).eUp;
			Sweep.finishLeftRegions( tess, Sweep.regionBelow(regUp), regLo );
			degenerate = true;
		}
		if( Geom.vertEq( eLo.Org, tess.event )) {
			tess.mesh.splice( eBottomLeft, eLo.Oprev );
			eBottomLeft = Sweep.finishLeftRegions( tess, regLo, null );
			degenerate = true;
		}
		if( degenerate ) {
			Sweep.addRightEdges( tess, regUp, eBottomLeft.Onext, eTopLeft, eTopLeft, true );
			return;
		}

		/* Non-degenerate situation -- need to add a temporary, fixable edge.
		* Connect to the closer of eLo->Org, eUp->Org.
		*/
		if( Geom.vertLeq( eLo.Org, eUp.Org )) {
			eNew = eLo.Oprev;
		} else {
			eNew = eUp;
		}
		eNew = tess.mesh.connect( eBottomLeft.Lprev, eNew );

		/* Prevent cleanup, otherwise eNew might disappear before we've even
		* had a chance to mark it as a temporary edge.
		*/
		Sweep.addRightEdges( tess, regUp, eNew, eNew.Onext, eNew.Onext, false );
		eNew.Sym.activeRegion.fixUpperEdge = true;
		Sweep.walkDirtyRegions( tess, regUp );
	}

	/* Because vertices at exactly the same location are merged together
	* before we process the sweep event, some degenerate cases can't occur.
	* However if someone eventually makes the modifications required to
	* merge features which are close together, the cases below marked
	* TOLERANCE_NONZERO will be useful.  They were debugged before the
	* code to merge identical vertices in the main loop was added.
	*/
	//#define TOLERANCE_NONZERO	FALSE

	//static void ConnectLeftDegenerate( TESStesselator *tess, ActiveRegion *regUp, TESSvertex *vEvent )
	Sweep.connectLeftDegenerate = function( tess, regUp, vEvent ) {
		/*
		* The event vertex lies exacty on an already-processed edge or vertex.
		* Adding the new vertex involves splicing it into the already-processed
		* part of the mesh.
		*/
		var e, eTopLeft, eTopRight, eLast;
		var reg;

		e = regUp.eUp;
		if( Geom.vertEq( e.Org, vEvent )) {
			/* e->Org is an unprocessed vertex - just combine them, and wait
			* for e->Org to be pulled from the queue
			*/
			assert( false /*TOLERANCE_NONZERO*/ );
			Sweep.spliceMergeVertices( tess, e, vEvent.anEdge );
			return;
		}

		if( ! Geom.vertEq( e.Dst, vEvent )) {
			/* General case -- splice vEvent into edge e which passes through it */
			tess.mesh.splitEdge( e.Sym );
			if( regUp.fixUpperEdge ) {
				/* This edge was fixable -- delete unused portion of original edge */
				tess.mesh.delete( e.Onext );
				regUp.fixUpperEdge = false;
			}
			tess.mesh.splice( vEvent.anEdge, e );
			Sweep.sweepEvent( tess, vEvent );	/* recurse */
			return;
		}

		/* vEvent coincides with e->Dst, which has already been processed.
		* Splice in the additional right-going edges.
		*/
		assert( false /*TOLERANCE_NONZERO*/ );
		regUp = Sweep.topRightRegion( regUp );
		reg = Sweep.regionBelow( regUp );
		eTopRight = reg.eUp.Sym;
		eTopLeft = eLast = eTopRight.Onext;
		if( reg.fixUpperEdge ) {
			/* Here e->Dst has only a single fixable edge going right.
			* We can delete it since now we have some real right-going edges.
			*/
			assert( eTopLeft !== eTopRight );   /* there are some left edges too */
			Sweep.deleteRegion( tess, reg );
			tess.mesh.delete( eTopRight );
			eTopRight = eTopLeft.Oprev;
		}
		tess.mesh.splice( vEvent.anEdge, eTopRight );
		if( ! Geom.edgeGoesLeft( eTopLeft )) {
			/* e->Dst had no left-going edges -- indicate this to AddRightEdges() */
			eTopLeft = null;
		}
		Sweep.addRightEdges( tess, regUp, eTopRight.Onext, eLast, eTopLeft, true );
	}


	//static void ConnectLeftVertex( TESStesselator *tess, TESSvertex *vEvent )
	Sweep.connectLeftVertex = function( tess, vEvent ) {
		/*
		* Purpose: connect a "left" vertex (one where both edges go right)
		* to the processed portion of the mesh.  Let R be the active region
		* containing vEvent, and let U and L be the upper and lower edge
		* chains of R.  There are two possibilities:
		*
		* - the normal case: split R into two regions, by connecting vEvent to
		*   the rightmost vertex of U or L lying to the left of the sweep line
		*
		* - the degenerate case: if vEvent is close enough to U or L, we
		*   merge vEvent into that edge chain.  The subcases are:
		*	- merging with the rightmost vertex of U or L
		*	- merging with the active edge of U or L
		*	- merging with an already-processed portion of U or L
		*/
		var regUp, regLo, reg;
		var eUp, eLo, eNew;
		var tmp = new ActiveRegion();

		/* assert( vEvent->anEdge->Onext->Onext == vEvent->anEdge ); */

		/* Get a pointer to the active region containing vEvent */
		tmp.eUp = vEvent.anEdge.Sym;
		/* __GL_DICTLISTKEY */ /* tessDictListSearch */
		regUp = tess.dict.search( tmp ).key;
		regLo = Sweep.regionBelow( regUp );
		if( !regLo ) {
			// This may happen if the input polygon is coplanar.
			return;
		}
		eUp = regUp.eUp;
		eLo = regLo.eUp;

		/* Try merging with U or L first */
		if( Geom.edgeSign( eUp.Dst, vEvent, eUp.Org ) === 0.0 ) {
			Sweep.connectLeftDegenerate( tess, regUp, vEvent );
			return;
		}

		/* Connect vEvent to rightmost processed vertex of either chain.
		* e->Dst is the vertex that we will connect to vEvent.
		*/
		reg = Geom.vertLeq( eLo.Dst, eUp.Dst ) ? regUp : regLo;

		if( regUp.inside || reg.fixUpperEdge) {
			if( reg === regUp ) {
				eNew = tess.mesh.connect( vEvent.anEdge.Sym, eUp.Lnext );
			} else {
				var tempHalfEdge = tess.mesh.connect( eLo.Dnext, vEvent.anEdge);
				eNew = tempHalfEdge.Sym;
			}
			if( reg.fixUpperEdge ) {
				Sweep.fixUpperEdge( tess, reg, eNew );
			} else {
				Sweep.computeWinding( tess, Sweep.addRegionBelow( tess, regUp, eNew ));
			}
			Sweep.sweepEvent( tess, vEvent );
		} else {
			/* The new vertex is in a region which does not belong to the polygon.
			* We don''t need to connect this vertex to the rest of the mesh.
			*/
			Sweep.addRightEdges( tess, regUp, vEvent.anEdge, vEvent.anEdge, null, true );
		}
	};


	//static void SweepEvent( TESStesselator *tess, TESSvertex *vEvent )
	Sweep.sweepEvent = function( tess, vEvent ) {
		/*
		* Does everything necessary when the sweep line crosses a vertex.
		* Updates the mesh and the edge dictionary.
		*/

		tess.event = vEvent;		/* for access in EdgeLeq() */
		Sweep.debugEvent( tess );

		/* Check if this vertex is the right endpoint of an edge that is
		* already in the dictionary.  In this case we don't need to waste
		* time searching for the location to insert new edges.
		*/
		var e = vEvent.anEdge;
		while( e.activeRegion === null ) {
			e = e.Onext;
			if( e == vEvent.anEdge ) {
				/* All edges go right -- not incident to any processed edges */
				Sweep.connectLeftVertex( tess, vEvent );
				return;
			}
		}

		/* Processing consists of two phases: first we "finish" all the
		* active regions where both the upper and lower edges terminate
		* at vEvent (ie. vEvent is closing off these regions).
		* We mark these faces "inside" or "outside" the polygon according
		* to their winding number, and delete the edges from the dictionary.
		* This takes care of all the left-going edges from vEvent.
		*/
		var regUp = Sweep.topLeftRegion( tess, e.activeRegion );
		assert( regUp !== null );
	//	if (regUp == NULL) longjmp(tess->env,1);
		var reg = Sweep.regionBelow( regUp );
		var eTopLeft = reg.eUp;
		var eBottomLeft = Sweep.finishLeftRegions( tess, reg, null );

		/* Next we process all the right-going edges from vEvent.  This
		* involves adding the edges to the dictionary, and creating the
		* associated "active regions" which record information about the
		* regions between adjacent dictionary edges.
		*/
		if( eBottomLeft.Onext === eTopLeft ) {
			/* No right-going edges -- add a temporary "fixable" edge */
			Sweep.connectRightVertex( tess, regUp, eBottomLeft );
		} else {
			Sweep.addRightEdges( tess, regUp, eBottomLeft.Onext, eTopLeft, eTopLeft, true );
		}
	};


	/* Make the sentinel coordinates big enough that they will never be
	* merged with real input features.
	*/

	//static void AddSentinel( TESStesselator *tess, TESSreal smin, TESSreal smax, TESSreal t )
	Sweep.addSentinel = function( tess, smin, smax, t ) {
		/*
		* We add two sentinel edges above and below all other edges,
		* to avoid special cases at the top and bottom.
		*/
		var reg = new ActiveRegion();
		var e = tess.mesh.makeEdge();
	//	if (e == NULL) longjmp(tess->env,1);

		e.Org.s = smax;
		e.Org.t = t;
		e.Dst.s = smin;
		e.Dst.t = t;
		tess.event = e.Dst;		/* initialize it */

		reg.eUp = e;
		reg.windingNumber = 0;
		reg.inside = false;
		reg.fixUpperEdge = false;
		reg.sentinel = true;
		reg.dirty = false;
		reg.nodeUp = tess.dict.insert( reg );
	//	if (reg->nodeUp == NULL) longjmp(tess->env,1);
	}


	//static void InitEdgeDict( TESStesselator *tess )
	Sweep.initEdgeDict = function( tess ) {
		/*
		* We maintain an ordering of edge intersections with the sweep line.
		* This order is maintained in a dynamic dictionary.
		*/
		tess.dict = new Dict( tess, Sweep.edgeLeq );
	//	if (tess->dict == NULL) longjmp(tess->env,1);

		var w = (tess.bmax[0] - tess.bmin[0]);
		var h = (tess.bmax[1] - tess.bmin[1]);

		var smin = tess.bmin[0] - w;
		var smax = tess.bmax[0] + w;
		var tmin = tess.bmin[1] - h;
		var tmax = tess.bmax[1] + h;

		Sweep.addSentinel( tess, smin, smax, tmin );
		Sweep.addSentinel( tess, smin, smax, tmax );
	}


	Sweep.doneEdgeDict = function( tess )
	{
		var reg;
		var fixedEdges = 0;

		while( (reg = tess.dict.min().key) !== null ) {
			/*
			* At the end of all processing, the dictionary should contain
			* only the two sentinel edges, plus at most one "fixable" edge
			* created by ConnectRightVertex().
			*/
			if( ! reg.sentinel ) {
				assert( reg.fixUpperEdge );
				assert( ++fixedEdges == 1 );
			}
			assert( reg.windingNumber == 0 );
			Sweep.deleteRegion( tess, reg );
			/*    tessMeshDelete( reg->eUp );*/
		}
	//	dictDeleteDict( &tess->alloc, tess->dict );
	}


	Sweep.removeDegenerateEdges = function( tess ) {
		/*
		* Remove zero-length edges, and contours with fewer than 3 vertices.
		*/
		var e, eNext, eLnext;
		var eHead = tess.mesh.eHead;

		/*LINTED*/
		for( e = eHead.next; e !== eHead; e = eNext ) {
			eNext = e.next;
			eLnext = e.Lnext;

			if( Geom.vertEq( e.Org, e.Dst ) && e.Lnext.Lnext !== e ) {
				/* Zero-length edge, contour has at least 3 edges */
				Sweep.spliceMergeVertices( tess, eLnext, e );	/* deletes e->Org */
				tess.mesh.delete( e ); /* e is a self-loop */
				e = eLnext;
				eLnext = e.Lnext;
			}
			if( eLnext.Lnext === e ) {
				/* Degenerate contour (one or two edges) */
				if( eLnext !== e ) {
					if( eLnext === eNext || eLnext === eNext.Sym ) { eNext = eNext.next; }
					tess.mesh.delete( eLnext );
				}
				if( e === eNext || e === eNext.Sym ) { eNext = eNext.next; }
				tess.mesh.delete( e );
			}
		}
	}

	Sweep.initPriorityQ = function( tess ) {
		/*
		* Insert all vertices into the priority queue which determines the
		* order in which vertices cross the sweep line.
		*/
		var pq;
		var v, vHead;
		var vertexCount = 0;
		
		vHead = tess.mesh.vHead;
		for( v = vHead.next; v !== vHead; v = v.next ) {
			vertexCount++;
		}
		/* Make sure there is enough space for sentinels. */
		vertexCount += 8; //MAX( 8, tess->alloc.extraVertices );
		
		pq = tess.pq = new PriorityQ( vertexCount, Geom.vertLeq );
	//	if (pq == NULL) return 0;

		vHead = tess.mesh.vHead;
		for( v = vHead.next; v !== vHead; v = v.next ) {
			v.pqHandle = pq.insert( v );
	//		if (v.pqHandle == INV_HANDLE)
	//			break;
		}

		if (v !== vHead) {
			return false;
		}

		pq.init();

		return true;
	}


	Sweep.donePriorityQ = function( tess ) {
		tess.pq = null;
	}


	Sweep.removeDegenerateFaces = function( tess, mesh ) {
		/*
		* Delete any degenerate faces with only two edges.  WalkDirtyRegions()
		* will catch almost all of these, but it won't catch degenerate faces
		* produced by splice operations on already-processed edges.
		* The two places this can happen are in FinishLeftRegions(), when
		* we splice in a "temporary" edge produced by ConnectRightVertex(),
		* and in CheckForLeftSplice(), where we splice already-processed
		* edges to ensure that our dictionary invariants are not violated
		* by numerical errors.
		*
		* In both these cases it is *very* dangerous to delete the offending
		* edge at the time, since one of the routines further up the stack
		* will sometimes be keeping a pointer to that edge.
		*/
		var f, fNext;
		var e;

		/*LINTED*/
		for( f = mesh.fHead.next; f !== mesh.fHead; f = fNext ) {
			fNext = f.next;
			e = f.anEdge;
			assert( e.Lnext !== e );

			if( e.Lnext.Lnext === e ) {
				/* A face with only two edges */
				Sweep.addWinding( e.Onext, e );
				tess.mesh.delete( e );
			}
		}
		return true;
	}

	Sweep.computeInterior = function( tess ) {
		/*
		* tessComputeInterior( tess ) computes the planar arrangement specified
		* by the given contours, and further subdivides this arrangement
		* into regions.  Each region is marked "inside" if it belongs
		* to the polygon, according to the rule given by tess->windingRule.
		* Each interior region is guaranteed be monotone.
		*/
		var v, vNext;

		/* Each vertex defines an event for our sweep line.  Start by inserting
		* all the vertices in a priority queue.  Events are processed in
		* lexicographic order, ie.
		*
		*	e1 < e2  iff  e1.x < e2.x || (e1.x == e2.x && e1.y < e2.y)
		*/
		Sweep.removeDegenerateEdges( tess );
		if ( !Sweep.initPriorityQ( tess ) ) return false; /* if error */
		Sweep.initEdgeDict( tess );

		while( (v = tess.pq.extractMin()) !== null ) {
			for( ;; ) {
				vNext = tess.pq.min();
				if( vNext === null || ! Geom.vertEq( vNext, v )) break;

				/* Merge together all vertices at exactly the same location.
				* This is more efficient than processing them one at a time,
				* simplifies the code (see ConnectLeftDegenerate), and is also
				* important for correct handling of certain degenerate cases.
				* For example, suppose there are two identical edges A and B
				* that belong to different contours (so without this code they would
				* be processed by separate sweep events).  Suppose another edge C
				* crosses A and B from above.  When A is processed, we split it
				* at its intersection point with C.  However this also splits C,
				* so when we insert B we may compute a slightly different
				* intersection point.  This might leave two edges with a small
				* gap between them.  This kind of error is especially obvious
				* when using boundary extraction (TESS_BOUNDARY_ONLY).
				*/
				vNext = tess.pq.extractMin();
				Sweep.spliceMergeVertices( tess, v.anEdge, vNext.anEdge );
			}
			Sweep.sweepEvent( tess, v );
		}

		/* Set tess->event for debugging purposes */
		tess.event = tess.dict.min().key.eUp.Org;
		Sweep.debugEvent( tess );
		Sweep.doneEdgeDict( tess );
		Sweep.donePriorityQ( tess );

		if ( !Sweep.removeDegenerateFaces( tess, tess.mesh ) ) return false;
		tess.mesh.check();

		return true;
	}


	function Tesselator() {

		/*** state needed for collecting the input data ***/
		this.mesh = null;		/* stores the input contours, and eventually
							the tessellation itself */

		/*** state needed for projecting onto the sweep plane ***/

		this.normal = [0.0, 0.0, 0.0];	/* user-specified normal (if provided) */
		this.sUnit = [0.0, 0.0, 0.0];	/* unit vector in s-direction (debugging) */
		this.tUnit = [0.0, 0.0, 0.0];	/* unit vector in t-direction (debugging) */

		this.bmin = [0.0, 0.0];
		this.bmax = [0.0, 0.0];

		/*** state needed for the line sweep ***/
		this.windingRule = Tess2.WINDING_ODD;	/* rule for determining polygon interior */

		this.dict = null;		/* edge dictionary for sweep line */
		this.pq = null;		/* priority queue of vertex events */
		this.event = null;		/* current sweep event being processed */

		this.vertexIndexCounter = 0;
		
		this.vertices = [];
		this.vertexIndices = [];
		this.vertexCount = 0;
		this.elements = [];
		this.elementCount = 0;
	};

	Tesselator.prototype = {

		dot_: function(u, v) {
			return (u[0]*v[0] + u[1]*v[1] + u[2]*v[2]);
		},

		normalize_: function( v ) {
			var len = v[0]*v[0] + v[1]*v[1] + v[2]*v[2];
			assert( len > 0.0 );
			len = Math.sqrt( len );
			v[0] /= len;
			v[1] /= len;
			v[2] /= len;
		},

		longAxis_: function( v ) {
			var i = 0;
			if( Math.abs(v[1]) > Math.abs(v[0]) ) { i = 1; }
			if( Math.abs(v[2]) > Math.abs(v[i]) ) { i = 2; }
			return i;
		},

		computeNormal_: function( norm )
		{
			var v, v1, v2;
			var c, tLen2, maxLen2;
			var maxVal = [0,0,0], minVal = [0,0,0], d1 = [0,0,0], d2 = [0,0,0], tNorm = [0,0,0];
			var maxVert = [null,null,null], minVert = [null,null,null];
			var vHead = this.mesh.vHead;
			var i;

			v = vHead.next;
			for( i = 0; i < 3; ++i ) {
				c = v.coords[i];
				minVal[i] = c;
				minVert[i] = v;
				maxVal[i] = c;
				maxVert[i] = v;
			}

			for( v = vHead.next; v !== vHead; v = v.next ) {
				for( i = 0; i < 3; ++i ) {
					c = v.coords[i];
					if( c < minVal[i] ) { minVal[i] = c; minVert[i] = v; }
					if( c > maxVal[i] ) { maxVal[i] = c; maxVert[i] = v; }
				}
			}

			/* Find two vertices separated by at least 1/sqrt(3) of the maximum
			* distance between any two vertices
			*/
			i = 0;
			if( maxVal[1] - minVal[1] > maxVal[0] - minVal[0] ) { i = 1; }
			if( maxVal[2] - minVal[2] > maxVal[i] - minVal[i] ) { i = 2; }
			if( minVal[i] >= maxVal[i] ) {
				/* All vertices are the same -- normal doesn't matter */
				norm[0] = 0; norm[1] = 0; norm[2] = 1;
				return;
			}

			/* Look for a third vertex which forms the triangle with maximum area
			* (Length of normal == twice the triangle area)
			*/
			maxLen2 = 0;
			v1 = minVert[i];
			v2 = maxVert[i];
			d1[0] = v1.coords[0] - v2.coords[0];
			d1[1] = v1.coords[1] - v2.coords[1];
			d1[2] = v1.coords[2] - v2.coords[2];
			for( v = vHead.next; v !== vHead; v = v.next ) {
				d2[0] = v.coords[0] - v2.coords[0];
				d2[1] = v.coords[1] - v2.coords[1];
				d2[2] = v.coords[2] - v2.coords[2];
				tNorm[0] = d1[1]*d2[2] - d1[2]*d2[1];
				tNorm[1] = d1[2]*d2[0] - d1[0]*d2[2];
				tNorm[2] = d1[0]*d2[1] - d1[1]*d2[0];
				tLen2 = tNorm[0]*tNorm[0] + tNorm[1]*tNorm[1] + tNorm[2]*tNorm[2];
				if( tLen2 > maxLen2 ) {
					maxLen2 = tLen2;
					norm[0] = tNorm[0];
					norm[1] = tNorm[1];
					norm[2] = tNorm[2];
				}
			}

			if( maxLen2 <= 0 ) {
				/* All points lie on a single line -- any decent normal will do */
				norm[0] = norm[1] = norm[2] = 0;
				norm[this.longAxis_(d1)] = 1;
			}
		},

		checkOrientation_: function() {
			var area;
			var f, fHead = this.mesh.fHead;
			var v, vHead = this.mesh.vHead;
			var e;

			/* When we compute the normal automatically, we choose the orientation
			* so that the the sum of the signed areas of all contours is non-negative.
			*/
			area = 0;
			for( f = fHead.next; f !== fHead; f = f.next ) {
				e = f.anEdge;
				if( e.winding <= 0 ) continue;
				do {
					area += (e.Org.s - e.Dst.s) * (e.Org.t + e.Dst.t);
					e = e.Lnext;
				} while( e !== f.anEdge );
			}
			if( area < 0 ) {
				/* Reverse the orientation by flipping all the t-coordinates */
				for( v = vHead.next; v !== vHead; v = v.next ) {
					v.t = - v.t;
				}
				this.tUnit[0] = - this.tUnit[0];
				this.tUnit[1] = - this.tUnit[1];
				this.tUnit[2] = - this.tUnit[2];
			}
		},

	/*	#ifdef FOR_TRITE_TEST_PROGRAM
		#include <stdlib.h>
		extern int RandomSweep;
		#define S_UNIT_X	(RandomSweep ? (2*drand48()-1) : 1.0)
		#define S_UNIT_Y	(RandomSweep ? (2*drand48()-1) : 0.0)
		#else
		#if defined(SLANTED_SWEEP) */
		/* The "feature merging" is not intended to be complete.  There are
		* special cases where edges are nearly parallel to the sweep line
		* which are not implemented.  The algorithm should still behave
		* robustly (ie. produce a reasonable tesselation) in the presence
		* of such edges, however it may miss features which could have been
		* merged.  We could minimize this effect by choosing the sweep line
		* direction to be something unusual (ie. not parallel to one of the
		* coordinate axes).
		*/
	/*	#define S_UNIT_X	(TESSreal)0.50941539564955385	// Pre-normalized
		#define S_UNIT_Y	(TESSreal)0.86052074622010633
		#else
		#define S_UNIT_X	(TESSreal)1.0
		#define S_UNIT_Y	(TESSreal)0.0
		#endif
		#endif*/

		/* Determine the polygon normal and project vertices onto the plane
		* of the polygon.
		*/
		projectPolygon_: function() {
			var v, vHead = this.mesh.vHead;
			var norm = [0,0,0];
			var sUnit, tUnit;
			var i, first, computedNormal = false;

			norm[0] = this.normal[0];
			norm[1] = this.normal[1];
			norm[2] = this.normal[2];
			if( norm[0] === 0.0 && norm[1] === 0.0 && norm[2] === 0.0 ) {
				this.computeNormal_( norm );
				computedNormal = true;
			}
			sUnit = this.sUnit;
			tUnit = this.tUnit;
			i = this.longAxis_( norm );

	/*	#if defined(FOR_TRITE_TEST_PROGRAM) || defined(TRUE_PROJECT)
			// Choose the initial sUnit vector to be approximately perpendicular
			// to the normal.
			
			Normalize( norm );

			sUnit[i] = 0;
			sUnit[(i+1)%3] = S_UNIT_X;
			sUnit[(i+2)%3] = S_UNIT_Y;

			// Now make it exactly perpendicular 
			w = Dot( sUnit, norm );
			sUnit[0] -= w * norm[0];
			sUnit[1] -= w * norm[1];
			sUnit[2] -= w * norm[2];
			Normalize( sUnit );

			// Choose tUnit so that (sUnit,tUnit,norm) form a right-handed frame 
			tUnit[0] = norm[1]*sUnit[2] - norm[2]*sUnit[1];
			tUnit[1] = norm[2]*sUnit[0] - norm[0]*sUnit[2];
			tUnit[2] = norm[0]*sUnit[1] - norm[1]*sUnit[0];
			Normalize( tUnit );
		#else*/
			/* Project perpendicular to a coordinate axis -- better numerically */
			sUnit[i] = 0;
			sUnit[(i+1)%3] = 1.0;
			sUnit[(i+2)%3] = 0.0;

			tUnit[i] = 0;
			tUnit[(i+1)%3] = 0.0;
			tUnit[(i+2)%3] = (norm[i] > 0) ? 1.0 : -1.0;
	//	#endif

			/* Project the vertices onto the sweep plane */
			for( v = vHead.next; v !== vHead; v = v.next ) {
				v.s = this.dot_( v.coords, sUnit );
				v.t = this.dot_( v.coords, tUnit );
			}
			if( computedNormal ) {
				this.checkOrientation_();
			}

			/* Compute ST bounds. */
			first = true;
			for( v = vHead.next; v !== vHead; v = v.next ) {
				if (first) {
					this.bmin[0] = this.bmax[0] = v.s;
					this.bmin[1] = this.bmax[1] = v.t;
					first = false;
				} else {
					if (v.s < this.bmin[0]) this.bmin[0] = v.s;
					if (v.s > this.bmax[0]) this.bmax[0] = v.s;
					if (v.t < this.bmin[1]) this.bmin[1] = v.t;
					if (v.t > this.bmax[1]) this.bmax[1] = v.t;
				}
			}
		},

		addWinding_: function(eDst,eSrc) {
			eDst.winding += eSrc.winding;
			eDst.Sym.winding += eSrc.Sym.winding;
		},
		
		/* tessMeshTessellateMonoRegion( face ) tessellates a monotone region
		* (what else would it do??)  The region must consist of a single
		* loop of half-edges (see mesh.h) oriented CCW.  "Monotone" in this
		* case means that any vertical line intersects the interior of the
		* region in a single interval.  
		*
		* Tessellation consists of adding interior edges (actually pairs of
		* half-edges), to split the region into non-overlapping triangles.
		*
		* The basic idea is explained in Preparata and Shamos (which I don''t
		* have handy right now), although their implementation is more
		* complicated than this one.  The are two edge chains, an upper chain
		* and a lower chain.  We process all vertices from both chains in order,
		* from right to left.
		*
		* The algorithm ensures that the following invariant holds after each
		* vertex is processed: the untessellated region consists of two
		* chains, where one chain (say the upper) is a single edge, and
		* the other chain is concave.  The left vertex of the single edge
		* is always to the left of all vertices in the concave chain.
		*
		* Each step consists of adding the rightmost unprocessed vertex to one
		* of the two chains, and forming a fan of triangles from the rightmost
		* of two chain endpoints.  Determining whether we can add each triangle
		* to the fan is a simple orientation test.  By making the fan as large
		* as possible, we restore the invariant (check it yourself).
		*/
	//	int tessMeshTessellateMonoRegion( TESSmesh *mesh, TESSface *face )
		tessellateMonoRegion_: function( mesh, face ) {
			var up, lo;

			/* All edges are oriented CCW around the boundary of the region.
			* First, find the half-edge whose origin vertex is rightmost.
			* Since the sweep goes from left to right, face->anEdge should
			* be close to the edge we want.
			*/
			up = face.anEdge;
			assert( up.Lnext !== up && up.Lnext.Lnext !== up );

			for( ; Geom.vertLeq( up.Dst, up.Org ); up = up.Lprev )
				;
			for( ; Geom.vertLeq( up.Org, up.Dst ); up = up.Lnext )
				;
			lo = up.Lprev;

			while( up.Lnext !== lo ) {
				if( Geom.vertLeq( up.Dst, lo.Org )) {
					/* up->Dst is on the left.  It is safe to form triangles from lo->Org.
					* The EdgeGoesLeft test guarantees progress even when some triangles
					* are CW, given that the upper and lower chains are truly monotone.
					*/
					while( lo.Lnext !== up && (Geom.edgeGoesLeft( lo.Lnext )
						|| Geom.edgeSign( lo.Org, lo.Dst, lo.Lnext.Dst ) <= 0.0 )) {
							var tempHalfEdge = mesh.connect( lo.Lnext, lo );
							//if (tempHalfEdge == NULL) return 0;
							lo = tempHalfEdge.Sym;
					}
					lo = lo.Lprev;
				} else {
					/* lo->Org is on the left.  We can make CCW triangles from up->Dst. */
					while( lo.Lnext != up && (Geom.edgeGoesRight( up.Lprev )
						|| Geom.edgeSign( up.Dst, up.Org, up.Lprev.Org ) >= 0.0 )) {
							var tempHalfEdge = mesh.connect( up, up.Lprev );
							//if (tempHalfEdge == NULL) return 0;
							up = tempHalfEdge.Sym;
					}
					up = up.Lnext;
				}
			}

			/* Now lo->Org == up->Dst == the leftmost vertex.  The remaining region
			* can be tessellated in a fan from this leftmost vertex.
			*/
			assert( lo.Lnext !== up );
			while( lo.Lnext.Lnext !== up ) {
				var tempHalfEdge = mesh.connect( lo.Lnext, lo );
				//if (tempHalfEdge == NULL) return 0;
				lo = tempHalfEdge.Sym;
			}

			return true;
		},


		/* tessMeshTessellateInterior( mesh ) tessellates each region of
		* the mesh which is marked "inside" the polygon.  Each such region
		* must be monotone.
		*/
		//int tessMeshTessellateInterior( TESSmesh *mesh )
		tessellateInterior_: function( mesh ) {
			var f, next;

			/*LINTED*/
			for( f = mesh.fHead.next; f !== mesh.fHead; f = next ) {
				/* Make sure we don''t try to tessellate the new triangles. */
				next = f.next;
				if( f.inside ) {
					if ( !this.tessellateMonoRegion_( mesh, f ) ) return false;
				}
			}

			return true;
		},


		/* tessMeshDiscardExterior( mesh ) zaps (ie. sets to NULL) all faces
		* which are not marked "inside" the polygon.  Since further mesh operations
		* on NULL faces are not allowed, the main purpose is to clean up the
		* mesh so that exterior loops are not represented in the data structure.
		*/
		//void tessMeshDiscardExterior( TESSmesh *mesh )
		discardExterior_: function( mesh ) {
			var f, next;

			/*LINTED*/
			for( f = mesh.fHead.next; f !== mesh.fHead; f = next ) {
				/* Since f will be destroyed, save its next pointer. */
				next = f.next;
				if( ! f.inside ) {
					mesh.zapFace( f );
				}
			}
		},

		/* tessMeshSetWindingNumber( mesh, value, keepOnlyBoundary ) resets the
		* winding numbers on all edges so that regions marked "inside" the
		* polygon have a winding number of "value", and regions outside
		* have a winding number of 0.
		*
		* If keepOnlyBoundary is TRUE, it also deletes all edges which do not
		* separate an interior region from an exterior one.
		*/
	//	int tessMeshSetWindingNumber( TESSmesh *mesh, int value, int keepOnlyBoundary )
		setWindingNumber_: function( mesh, value, keepOnlyBoundary ) {
			var e, eNext;

			for( e = mesh.eHead.next; e !== mesh.eHead; e = eNext ) {
				eNext = e.next;
				if( e.Rface.inside !== e.Lface.inside ) {

					/* This is a boundary edge (one side is interior, one is exterior). */
					e.winding = (e.Lface.inside) ? value : -value;
				} else {

					/* Both regions are interior, or both are exterior. */
					if( ! keepOnlyBoundary ) {
						e.winding = 0;
					} else {
						mesh.delete( e );
					}
				}
			}
		},

		getNeighbourFace_: function(edge)
		{
			if (!edge.Rface)
				return -1;
			if (!edge.Rface.inside)
				return -1;
			return edge.Rface.n;
		},

		outputPolymesh_: function( mesh, elementType, polySize, vertexSize ) {
			var v;
			var f;
			var edge;
			var maxFaceCount = 0;
			var maxVertexCount = 0;
			var faceVerts, i;
			var elements = 0;
			var vert;

			// Assume that the input data is triangles now.
			// Try to merge as many polygons as possible
			if (polySize > 3)
			{
				mesh.mergeConvexFaces( polySize );
			}

			// Mark unused
			for ( v = mesh.vHead.next; v !== mesh.vHead; v = v.next )
				v.n = -1;

			// Create unique IDs for all vertices and faces.
			for ( f = mesh.fHead.next; f != mesh.fHead; f = f.next )
			{
				f.n = -1;
				if( !f.inside ) continue;

				edge = f.anEdge;
				faceVerts = 0;
				do
				{
					v = edge.Org;
					if ( v.n === -1 )
					{
						v.n = maxVertexCount;
						maxVertexCount++;
					}
					faceVerts++;
					edge = edge.Lnext;
				}
				while (edge !== f.anEdge);
				
				assert( faceVerts <= polySize );

				f.n = maxFaceCount;
				++maxFaceCount;
			}

			this.elementCount = maxFaceCount;
			if (elementType == Tess2.CONNECTED_POLYGONS)
				maxFaceCount *= 2;
	/*		tess.elements = (TESSindex*)tess->alloc.memalloc( tess->alloc.userData,
															  sizeof(TESSindex) * maxFaceCount * polySize );
			if (!tess->elements)
			{
				tess->outOfMemory = 1;
				return;
			}*/
			this.elements = [];
			this.elements.length = maxFaceCount * polySize;
			
			this.vertexCount = maxVertexCount;
	/*		tess->vertices = (TESSreal*)tess->alloc.memalloc( tess->alloc.userData,
															 sizeof(TESSreal) * tess->vertexCount * vertexSize );
			if (!tess->vertices)
			{
				tess->outOfMemory = 1;
				return;
			}*/
			this.vertices = [];
			this.vertices.length = maxVertexCount * vertexSize;

	/*		tess->vertexIndices = (TESSindex*)tess->alloc.memalloc( tess->alloc.userData,
																    sizeof(TESSindex) * tess->vertexCount );
			if (!tess->vertexIndices)
			{
				tess->outOfMemory = 1;
				return;
			}*/
			this.vertexIndices = [];
			this.vertexIndices.length = maxVertexCount;

			
			// Output vertices.
			for ( v = mesh.vHead.next; v !== mesh.vHead; v = v.next )
			{
				if ( v.n != -1 )
				{
					// Store coordinate
					var idx = v.n * vertexSize;
					this.vertices[idx+0] = v.coords[0];
					this.vertices[idx+1] = v.coords[1];
					if ( vertexSize > 2 )
						this.vertices[idx+2] = v.coords[2];
					// Store vertex index.
					this.vertexIndices[v.n] = v.idx;
				}
			}

			// Output indices.
			var nel = 0;
			for ( f = mesh.fHead.next; f !== mesh.fHead; f = f.next )
			{
				if ( !f.inside ) continue;
				
				// Store polygon
				edge = f.anEdge;
				faceVerts = 0;
				do
				{
					v = edge.Org;
					this.elements[nel++] = v.n;
					faceVerts++;
					edge = edge.Lnext;
				}
				while (edge !== f.anEdge);
				// Fill unused.
				for (i = faceVerts; i < polySize; ++i)
					this.elements[nel++] = -1;

				// Store polygon connectivity
				if ( elementType == Tess2.CONNECTED_POLYGONS )
				{
					edge = f.anEdge;
					do
					{
						this.elements[nel++] = this.getNeighbourFace_( edge );
						edge = edge.Lnext;
					}
					while (edge !== f.anEdge);
					// Fill unused.
					for (i = faceVerts; i < polySize; ++i)
						this.elements[nel++] = -1;
				}
			}
		},

	//	void OutputContours( TESStesselator *tess, TESSmesh *mesh, int vertexSize )
		outputContours_: function( mesh, vertexSize ) {
			var f;
			var edge;
			var start;
			var verts;
			var elements;
			var vertInds;
			var startVert = 0;
			var vertCount = 0;

			this.vertexCount = 0;
			this.elementCount = 0;

			for ( f = mesh.fHead.next; f !== mesh.fHead; f = f.next )
			{
				if ( !f.inside ) continue;

				start = edge = f.anEdge;
				do
				{
					this.vertexCount++;
					edge = edge.Lnext;
				}
				while ( edge !== start );

				this.elementCount++;
			}

	/*		tess->elements = (TESSindex*)tess->alloc.memalloc( tess->alloc.userData,
															  sizeof(TESSindex) * tess->elementCount * 2 );
			if (!tess->elements)
			{
				tess->outOfMemory = 1;
				return;
			}*/
			this.elements = [];
			this.elements.length = this.elementCount * 2;
			
	/*		tess->vertices = (TESSreal*)tess->alloc.memalloc( tess->alloc.userData,
															  sizeof(TESSreal) * tess->vertexCount * vertexSize );
			if (!tess->vertices)
			{
				tess->outOfMemory = 1;
				return;
			}*/
			this.vertices = [];
			this.vertices.length = this.vertexCount * vertexSize;

	/*		tess->vertexIndices = (TESSindex*)tess->alloc.memalloc( tess->alloc.userData,
																    sizeof(TESSindex) * tess->vertexCount );
			if (!tess->vertexIndices)
			{
				tess->outOfMemory = 1;
				return;
			}*/
			this.vertexIndices = [];
			this.vertexIndices.length = this.vertexCount;

			var nv = 0;
			var nvi = 0;
			var nel = 0;
			startVert = 0;

			for ( f = mesh.fHead.next; f !== mesh.fHead; f = f.next )
			{
				if ( !f.inside ) continue;

				vertCount = 0;
				start = edge = f.anEdge;
				do
				{
					this.vertices[nv++] = edge.Org.coords[0];
					this.vertices[nv++] = edge.Org.coords[1];
					if ( vertexSize > 2 )
						this.vertices[nv++] = edge.Org.coords[2];
					this.vertexIndices[nvi++] = edge.Org.idx;
					vertCount++;
					edge = edge.Lnext;
				}
				while ( edge !== start );

				this.elements[nel++] = startVert;
				this.elements[nel++] = vertCount;

				startVert += vertCount;
			}
		},

		addContour: function( size, vertices )
		{
			var e;
			var i;

			if ( this.mesh === null )
			  	this.mesh = new TESSmesh();
	/*	 	if ( tess->mesh == NULL ) {
				tess->outOfMemory = 1;
				return;
			}*/

			if ( size < 2 )
				size = 2;
			if ( size > 3 )
				size = 3;

			e = null;

			for( i = 0; i < vertices.length; i += size )
			{
				if( e == null ) {
					/* Make a self-loop (one vertex, one edge). */
					e = this.mesh.makeEdge();
	/*				if ( e == NULL ) {
						tess->outOfMemory = 1;
						return;
					}*/
					this.mesh.splice( e, e.Sym );
				} else {
					/* Create a new vertex and edge which immediately follow e
					* in the ordering around the left face.
					*/
					this.mesh.splitEdge( e );
					e = e.Lnext;
				}

				/* The new vertex is now e->Org. */
				e.Org.coords[0] = vertices[i+0];
				e.Org.coords[1] = vertices[i+1];
				if ( size > 2 )
					e.Org.coords[2] = vertices[i+2];
				else
					e.Org.coords[2] = 0.0;
				/* Store the insertion number so that the vertex can be later recognized. */
				e.Org.idx = this.vertexIndexCounter++;

				/* The winding of an edge says how the winding number changes as we
				* cross from the edge''s right face to its left face.  We add the
				* vertices in such an order that a CCW contour will add +1 to
				* the winding number of the region inside the contour.
				*/
				e.winding = 1;
				e.Sym.winding = -1;
			}
		},

	//	int tessTesselate( TESStesselator *tess, int windingRule, int elementType, int polySize, int vertexSize, const TESSreal* normal )
		tesselate: function( windingRule, elementType, polySize, vertexSize, normal ) {
			this.vertices = [];
			this.elements = [];
			this.vertexIndices = [];

			this.vertexIndexCounter = 0;
			
			if (normal)
			{
				this.normal[0] = normal[0];
				this.normal[1] = normal[1];
				this.normal[2] = normal[2];
			}

			this.windingRule = windingRule;

			if (vertexSize < 2)
				vertexSize = 2;
			if (vertexSize > 3)
				vertexSize = 3;

	/*		if (setjmp(tess->env) != 0) { 
				// come back here if out of memory
				return 0;
			}*/

			if (!this.mesh)
			{
				return false;
			}

			/* Determine the polygon normal and project vertices onto the plane
			* of the polygon.
			*/
			this.projectPolygon_();

			/* tessComputeInterior( tess ) computes the planar arrangement specified
			* by the given contours, and further subdivides this arrangement
			* into regions.  Each region is marked "inside" if it belongs
			* to the polygon, according to the rule given by tess->windingRule.
			* Each interior region is guaranteed be monotone.
			*/
			Sweep.computeInterior( this );

			var mesh = this.mesh;

			/* If the user wants only the boundary contours, we throw away all edges
			* except those which separate the interior from the exterior.
			* Otherwise we tessellate all the regions marked "inside".
			*/
			if (elementType == Tess2.BOUNDARY_CONTOURS) {
				this.setWindingNumber_( mesh, 1, true );
			} else {
				this.tessellateInterior_( mesh ); 
			}
	//		if (rc == 0) longjmp(tess->env,1);  /* could've used a label */

			mesh.check();

			if (elementType == Tess2.BOUNDARY_CONTOURS) {
				this.outputContours_( mesh, vertexSize );     /* output contours */
			}
			else
			{
				this.outputPolymesh_( mesh, elementType, polySize, vertexSize );     /* output polygons */
			}

//			tess.mesh = null;

			return true;
		}
	};
},{}],349:[function(require,module,exports){
module.exports = function(THREE) {
	var MOUSE = THREE.MOUSE
	if (!MOUSE)
		MOUSE = { LEFT: 0, MIDDLE: 1, RIGHT: 2 };

	/**
	 * @author qiao / https://github.com/qiao
	 * @author mrdoob / http://mrdoob.com
	 * @author alteredq / http://alteredqualia.com/
	 * @author WestLangley / http://github.com/WestLangley
	 * @author erich666 / http://erichaines.com
	 */
	/*global THREE, console */

	function OrbitConstraint ( object ) {

		this.object = object;

		// "target" sets the location of focus, where the object orbits around
		// and where it pans with respect to.
		this.target = new THREE.Vector3();

		// Limits to how far you can dolly in and out ( PerspectiveCamera only )
		this.minDistance = 0;
		this.maxDistance = Infinity;

		// Limits to how far you can zoom in and out ( OrthographicCamera only )
		this.minZoom = 0;
		this.maxZoom = Infinity;

		// How far you can orbit vertically, upper and lower limits.
		// Range is 0 to Math.PI radians.
		this.minPolarAngle = 0; // radians
		this.maxPolarAngle = Math.PI; // radians

		// How far you can orbit horizontally, upper and lower limits.
		// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
		this.minAzimuthAngle = - Infinity; // radians
		this.maxAzimuthAngle = Infinity; // radians

		// Set to true to enable damping (inertia)
		// If damping is enabled, you must call controls.update() in your animation loop
		this.enableDamping = false;
		this.dampingFactor = 0.25;

		////////////
		// internals

		var scope = this;

		var EPS = 0.000001;

		// Current position in spherical coordinate system.
		var theta;
		var phi;

		// Pending changes
		var phiDelta = 0;
		var thetaDelta = 0;
		var scale = 1;
		var panOffset = new THREE.Vector3();
		var zoomChanged = false;

		// API

		this.getPolarAngle = function () {

			return phi;

		};

		this.getAzimuthalAngle = function () {

			return theta;

		};

		this.rotateLeft = function ( angle ) {

			thetaDelta -= angle;

		};

		this.rotateUp = function ( angle ) {

			phiDelta -= angle;

		};

		// pass in distance in world space to move left
		this.panLeft = function() {

			var v = new THREE.Vector3();

			return function panLeft ( distance ) {

				var te = this.object.matrix.elements;

				// get X column of matrix
				v.set( te[ 0 ], te[ 1 ], te[ 2 ] );
				v.multiplyScalar( - distance );

				panOffset.add( v );

			};

		}();

		// pass in distance in world space to move up
		this.panUp = function() {

			var v = new THREE.Vector3();

			return function panUp ( distance ) {

				var te = this.object.matrix.elements;

				// get Y column of matrix
				v.set( te[ 4 ], te[ 5 ], te[ 6 ] );
				v.multiplyScalar( distance );

				panOffset.add( v );

			};

		}();

		// pass in x,y of change desired in pixel space,
		// right and down are positive
		this.pan = function ( deltaX, deltaY, screenWidth, screenHeight ) {

			if ( scope.object instanceof THREE.PerspectiveCamera ) {

				// perspective
				var position = scope.object.position;
				var offset = position.clone().sub( scope.target );
				var targetDistance = offset.length();

				// half of the fov is center to top of screen
				targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

				// we actually don't use screenWidth, since perspective camera is fixed to screen height
				scope.panLeft( 2 * deltaX * targetDistance / screenHeight );
				scope.panUp( 2 * deltaY * targetDistance / screenHeight );

			} else if ( scope.object instanceof THREE.OrthographicCamera ) {

				// orthographic
				scope.panLeft( deltaX * ( scope.object.right - scope.object.left ) / screenWidth );
				scope.panUp( deltaY * ( scope.object.top - scope.object.bottom ) / screenHeight );

			} else {

				// camera neither orthographic or perspective
				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );

			}

		};

		this.dollyIn = function ( dollyScale ) {

			if ( scope.object instanceof THREE.PerspectiveCamera ) {

				scale /= dollyScale;

			} else if ( scope.object instanceof THREE.OrthographicCamera ) {

				scope.object.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.object.zoom * dollyScale ) );
				scope.object.updateProjectionMatrix();
				zoomChanged = true;

			} else {

				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );

			}

		};

		this.dollyOut = function ( dollyScale ) {

			if ( scope.object instanceof THREE.PerspectiveCamera ) {

				scale *= dollyScale;

			} else if ( scope.object instanceof THREE.OrthographicCamera ) {

				scope.object.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.object.zoom / dollyScale ) );
				scope.object.updateProjectionMatrix();
				zoomChanged = true;

			} else {

				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );

			}

		};

		this.update = function() {

			var offset = new THREE.Vector3();

			// so camera.up is the orbit axis
			var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
			var quatInverse = quat.clone().inverse();

			var lastPosition = new THREE.Vector3();
			var lastQuaternion = new THREE.Quaternion();

			return function () {

				var position = this.object.position;

				offset.copy( position ).sub( this.target );

				// rotate offset to "y-axis-is-up" space
				offset.applyQuaternion( quat );

				// angle from z-axis around y-axis

				theta = Math.atan2( offset.x, offset.z );

				// angle from y-axis

				phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );

				theta += thetaDelta;
				phi += phiDelta;

				// restrict theta to be between desired limits
				theta = Math.max( this.minAzimuthAngle, Math.min( this.maxAzimuthAngle, theta ) );

				// restrict phi to be between desired limits
				phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, phi ) );

				// restrict phi to be betwee EPS and PI-EPS
				phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

				var radius = offset.length() * scale;

				// restrict radius to be between desired limits
				radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );

				// move target to panned location
				this.target.add( panOffset );

				offset.x = radius * Math.sin( phi ) * Math.sin( theta );
				offset.y = radius * Math.cos( phi );
				offset.z = radius * Math.sin( phi ) * Math.cos( theta );

				// rotate offset back to "camera-up-vector-is-up" space
				offset.applyQuaternion( quatInverse );

				position.copy( this.target ).add( offset );

				this.object.lookAt( this.target );

				if ( this.enableDamping === true ) {

					thetaDelta *= ( 1 - this.dampingFactor );
					phiDelta *= ( 1 - this.dampingFactor );

				} else {

					thetaDelta = 0;
					phiDelta = 0;

				}

				scale = 1;
				panOffset.set( 0, 0, 0 );

				// update condition is:
				// min(camera displacement, camera rotation in radians)^2 > EPS
				// using small-angle approximation cos(x/2) = 1 - x^2 / 8

				if ( zoomChanged ||
					 lastPosition.distanceToSquared( this.object.position ) > EPS ||
					8 * ( 1 - lastQuaternion.dot( this.object.quaternion ) ) > EPS ) {

					lastPosition.copy( this.object.position );
					lastQuaternion.copy( this.object.quaternion );
					zoomChanged = false;

					return true;

				}

				return false;

			};

		}();

	};


	// This set of controls performs orbiting, dollying (zooming), and panning. It maintains
	// the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
	// supported.
	//
	//    Orbit - left mouse / touch: one finger move
	//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
	//    Pan - right mouse, or arrow keys / touch: three finter swipe

	function OrbitControls ( object, domElement ) {

		var constraint = new OrbitConstraint( object );

		this.domElement = ( domElement !== undefined ) ? domElement : document;

		// API

		Object.defineProperty( this, 'constraint', {

			get: function() {

				return constraint;

			}

		} );

		this.getPolarAngle = function () {

			return constraint.getPolarAngle();

		};

		this.getAzimuthalAngle = function () {

			return constraint.getAzimuthalAngle();

		};

		// Set to false to disable this control
		this.enabled = true;

		// center is old, deprecated; use "target" instead
		this.center = this.target;

		// This option actually enables dollying in and out; left as "zoom" for
		// backwards compatibility.
		// Set to false to disable zooming
		this.enableZoom = true;
		this.zoomSpeed = 1.0;

		// Set to false to disable rotating
		this.enableRotate = true;
		this.rotateSpeed = 1.0;

		// Set to false to disable panning
		this.enablePan = true;
		this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

		// Set to true to automatically rotate around the target
		// If auto-rotate is enabled, you must call controls.update() in your animation loop
		this.autoRotate = false;
		this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

		// Set to false to disable use of the keys
		this.enableKeys = true;

		// The four arrow keys
		this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

		// Mouse buttons
		this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

		////////////
		// internals

		var scope = this;

		var rotateStart = new THREE.Vector2();
		var rotateEnd = new THREE.Vector2();
		var rotateDelta = new THREE.Vector2();

		var panStart = new THREE.Vector2();
		var panEnd = new THREE.Vector2();
		var panDelta = new THREE.Vector2();

		var dollyStart = new THREE.Vector2();
		var dollyEnd = new THREE.Vector2();
		var dollyDelta = new THREE.Vector2();

		var STATE = { NONE : - 1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

		var state = STATE.NONE;

		// for reset

		this.target0 = this.target.clone();
		this.position0 = this.object.position.clone();
		this.zoom0 = this.object.zoom;

		// events

		var changeEvent = { type: 'change' };
		var startEvent = { type: 'start' };
		var endEvent = { type: 'end' };

		// pass in x,y of change desired in pixel space,
		// right and down are positive
		function pan( deltaX, deltaY ) {

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			constraint.pan( deltaX, deltaY, element.clientWidth, element.clientHeight );

		}

		this.update = function () {

			if ( this.autoRotate && state === STATE.NONE ) {

				constraint.rotateLeft( getAutoRotationAngle() );

			}

			if ( constraint.update() === true ) {

				this.dispatchEvent( changeEvent );

			}

		};

		this.reset = function () {

			state = STATE.NONE;

			this.target.copy( this.target0 );
			this.object.position.copy( this.position0 );
			this.object.zoom = this.zoom0;

			this.object.updateProjectionMatrix();
			this.dispatchEvent( changeEvent );

			this.update();

		};

		function getAutoRotationAngle() {

			return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

		}

		function getZoomScale() {

			return Math.pow( 0.95, scope.zoomSpeed );

		}

		function onMouseDown( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();

			if ( event.button === scope.mouseButtons.ORBIT ) {

				if ( scope.enableRotate === false ) return;

				state = STATE.ROTATE;

				rotateStart.set( event.clientX, event.clientY );

			} else if ( event.button === scope.mouseButtons.ZOOM ) {

				if ( scope.enableZoom === false ) return;

				state = STATE.DOLLY;

				dollyStart.set( event.clientX, event.clientY );

			} else if ( event.button === scope.mouseButtons.PAN ) {

				if ( scope.enablePan === false ) return;

				state = STATE.PAN;

				panStart.set( event.clientX, event.clientY );

			}

			if ( state !== STATE.NONE ) {

				document.addEventListener( 'mousemove', onMouseMove, false );
				document.addEventListener( 'mouseup', onMouseUp, false );
				scope.dispatchEvent( startEvent );

			}

		}

		function onMouseMove( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			if ( state === STATE.ROTATE ) {

				if ( scope.enableRotate === false ) return;

				rotateEnd.set( event.clientX, event.clientY );
				rotateDelta.subVectors( rotateEnd, rotateStart );

				// rotating across whole screen goes 360 degrees around
				constraint.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

				// rotating up and down along whole screen attempts to go 360, but limited to 180
				constraint.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

				rotateStart.copy( rotateEnd );

			} else if ( state === STATE.DOLLY ) {

				if ( scope.enableZoom === false ) return;

				dollyEnd.set( event.clientX, event.clientY );
				dollyDelta.subVectors( dollyEnd, dollyStart );

				if ( dollyDelta.y > 0 ) {

					constraint.dollyIn( getZoomScale() );

				} else if ( dollyDelta.y < 0 ) {

					constraint.dollyOut( getZoomScale() );

				}

				dollyStart.copy( dollyEnd );

			} else if ( state === STATE.PAN ) {

				if ( scope.enablePan === false ) return;

				panEnd.set( event.clientX, event.clientY );
				panDelta.subVectors( panEnd, panStart );

				pan( panDelta.x, panDelta.y );

				panStart.copy( panEnd );

			}

			if ( state !== STATE.NONE ) scope.update();

		}

		function onMouseUp( /* event */ ) {

			if ( scope.enabled === false ) return;

			document.removeEventListener( 'mousemove', onMouseMove, false );
			document.removeEventListener( 'mouseup', onMouseUp, false );
			scope.dispatchEvent( endEvent );
			state = STATE.NONE;

		}

		function onMouseWheel( event ) {

			if ( scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE ) return;

			event.preventDefault();
			event.stopPropagation();

			var delta = 0;

			if ( event.wheelDelta !== undefined ) {

				// WebKit / Opera / Explorer 9

				delta = event.wheelDelta;

			} else if ( event.detail !== undefined ) {

				// Firefox

				delta = - event.detail;

			}

			if ( delta > 0 ) {

				constraint.dollyOut( getZoomScale() );

			} else if ( delta < 0 ) {

				constraint.dollyIn( getZoomScale() );

			}

			scope.update();
			scope.dispatchEvent( startEvent );
			scope.dispatchEvent( endEvent );

		}

		function onKeyDown( event ) {

			if ( scope.enabled === false || scope.enableKeys === false || scope.enablePan === false ) return;

			switch ( event.keyCode ) {

				case scope.keys.UP:
					pan( 0, scope.keyPanSpeed );
					scope.update();
					break;

				case scope.keys.BOTTOM:
					pan( 0, - scope.keyPanSpeed );
					scope.update();
					break;

				case scope.keys.LEFT:
					pan( scope.keyPanSpeed, 0 );
					scope.update();
					break;

				case scope.keys.RIGHT:
					pan( - scope.keyPanSpeed, 0 );
					scope.update();
					break;

			}

		}

		function touchstart( event ) {

			if ( scope.enabled === false ) return;

			switch ( event.touches.length ) {

				case 1:	// one-fingered touch: rotate

					if ( scope.enableRotate === false ) return;

					state = STATE.TOUCH_ROTATE;

					rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
					break;

				case 2:	// two-fingered touch: dolly

					if ( scope.enableZoom === false ) return;

					state = STATE.TOUCH_DOLLY;

					var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
					var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
					var distance = Math.sqrt( dx * dx + dy * dy );
					dollyStart.set( 0, distance );
					break;

				case 3: // three-fingered touch: pan

					if ( scope.enablePan === false ) return;

					state = STATE.TOUCH_PAN;

					panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
					break;

				default:

					state = STATE.NONE;

			}

			if ( state !== STATE.NONE ) scope.dispatchEvent( startEvent );

		}

		function touchmove( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();
			event.stopPropagation();

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			switch ( event.touches.length ) {

				case 1: // one-fingered touch: rotate

					if ( scope.enableRotate === false ) return;
					if ( state !== STATE.TOUCH_ROTATE ) return;

					rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
					rotateDelta.subVectors( rotateEnd, rotateStart );

					// rotating across whole screen goes 360 degrees around
					constraint.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );
					// rotating up and down along whole screen attempts to go 360, but limited to 180
					constraint.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

					rotateStart.copy( rotateEnd );

					scope.update();
					break;

				case 2: // two-fingered touch: dolly

					if ( scope.enableZoom === false ) return;
					if ( state !== STATE.TOUCH_DOLLY ) return;

					var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
					var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
					var distance = Math.sqrt( dx * dx + dy * dy );

					dollyEnd.set( 0, distance );
					dollyDelta.subVectors( dollyEnd, dollyStart );

					if ( dollyDelta.y > 0 ) {

						constraint.dollyOut( getZoomScale() );

					} else if ( dollyDelta.y < 0 ) {

						constraint.dollyIn( getZoomScale() );

					}

					dollyStart.copy( dollyEnd );

					scope.update();
					break;

				case 3: // three-fingered touch: pan

					if ( scope.enablePan === false ) return;
					if ( state !== STATE.TOUCH_PAN ) return;

					panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
					panDelta.subVectors( panEnd, panStart );

					pan( panDelta.x, panDelta.y );

					panStart.copy( panEnd );

					scope.update();
					break;

				default:

					state = STATE.NONE;

			}

		}

		function touchend( /* event */ ) {

			if ( scope.enabled === false ) return;

			scope.dispatchEvent( endEvent );
			state = STATE.NONE;

		}

		function contextmenu( event ) {

			event.preventDefault();

		}

		this.dispose = function() {

			this.domElement.removeEventListener( 'contextmenu', contextmenu, false );
			this.domElement.removeEventListener( 'mousedown', onMouseDown, false );
			this.domElement.removeEventListener( 'mousewheel', onMouseWheel, false );
			this.domElement.removeEventListener( 'MozMousePixelScroll', onMouseWheel, false ); // firefox

			this.domElement.removeEventListener( 'touchstart', touchstart, false );
			this.domElement.removeEventListener( 'touchend', touchend, false );
			this.domElement.removeEventListener( 'touchmove', touchmove, false );

			document.removeEventListener( 'mousemove', onMouseMove, false );
			document.removeEventListener( 'mouseup', onMouseUp, false );

			window.removeEventListener( 'keydown', onKeyDown, false );

		}

		this.domElement.addEventListener( 'contextmenu', contextmenu, false );

		this.domElement.addEventListener( 'mousedown', onMouseDown, false );
		this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
		this.domElement.addEventListener( 'MozMousePixelScroll', onMouseWheel, false ); // firefox

		this.domElement.addEventListener( 'touchstart', touchstart, false );
		this.domElement.addEventListener( 'touchend', touchend, false );
		this.domElement.addEventListener( 'touchmove', touchmove, false );

		window.addEventListener( 'keydown', onKeyDown, false );

		// force an update at start
		this.update();

	};

	OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
	OrbitControls.prototype.constructor = OrbitControls;

	Object.defineProperties( OrbitControls.prototype, {

		object: {

			get: function () {

				return this.constraint.object;

			}

		},

		target: {

			get: function () {

				return this.constraint.target;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: target is now immutable. Use target.set() instead.' );
				this.constraint.target.copy( value );

			}

		},

		minDistance : {

			get: function () {

				return this.constraint.minDistance;

			},

			set: function ( value ) {

				this.constraint.minDistance = value;

			}

		},

		maxDistance : {

			get: function () {

				return this.constraint.maxDistance;

			},

			set: function ( value ) {

				this.constraint.maxDistance = value;

			}

		},

		minZoom : {

			get: function () {

				return this.constraint.minZoom;

			},

			set: function ( value ) {

				this.constraint.minZoom = value;

			}

		},

		maxZoom : {

			get: function () {

				return this.constraint.maxZoom;

			},

			set: function ( value ) {

				this.constraint.maxZoom = value;

			}

		},

		minPolarAngle : {

			get: function () {

				return this.constraint.minPolarAngle;

			},

			set: function ( value ) {

				this.constraint.minPolarAngle = value;

			}

		},

		maxPolarAngle : {

			get: function () {

				return this.constraint.maxPolarAngle;

			},

			set: function ( value ) {

				this.constraint.maxPolarAngle = value;

			}

		},

		minAzimuthAngle : {

			get: function () {

				return this.constraint.minAzimuthAngle;

			},

			set: function ( value ) {

				this.constraint.minAzimuthAngle = value;

			}

		},

		maxAzimuthAngle : {

			get: function () {

				return this.constraint.maxAzimuthAngle;

			},

			set: function ( value ) {

				this.constraint.maxAzimuthAngle = value;

			}

		},

		enableDamping : {

			get: function () {

				return this.constraint.enableDamping;

			},

			set: function ( value ) {

				this.constraint.enableDamping = value;

			}

		},

		dampingFactor : {

			get: function () {

				return this.constraint.dampingFactor;

			},

			set: function ( value ) {

				this.constraint.dampingFactor = value;

			}

		},

		// backward compatibility

		noZoom: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
				return ! this.enableZoom;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
				this.enableZoom = ! value;

			}

		},

		noRotate: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
				return ! this.enableRotate;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
				this.enableRotate = ! value;

			}

		},

		noPan: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
				return ! this.enablePan;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
				this.enablePan = ! value;

			}

		},

		noKeys: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
				return ! this.enableKeys;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
				this.enableKeys = ! value;

			}

		},

		staticMoving : {

			get: function () {

				console.warn( 'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
				return ! this.constraint.enableDamping;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
				this.constraint.enableDamping = ! value;

			}

		},

		dynamicDampingFactor : {

			get: function () {

				console.warn( 'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
				return this.constraint.dampingFactor;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
				this.constraint.dampingFactor = value;

			}

		}

	} );

	return OrbitControls;
}

},{}],350:[function(require,module,exports){
var inherits = require('inherits')

module.exports = function(THREE) {

    function Complex(mesh) {
        if (!(this instanceof Complex))
            return new Complex(mesh)
        THREE.Geometry.call(this)
        this.dynamic = true

        if (mesh)
            this.update(mesh)
    }

    inherits(Complex, THREE.Geometry)

    //may expose these in next version
    Complex.prototype._updatePositions = function(positions) {
        for (var i=0; i<positions.length; i++) {
            var pos = positions[i]
            if (i > this.vertices.length-1)
                this.vertices.push(new THREE.Vector3().fromArray(pos))
            else 
                this.vertices[i].fromArray(pos)
        }
        this.vertices.length = positions.length
        this.verticesNeedUpdate = true
    }

    Complex.prototype._updateCells = function(cells) {
        for (var i=0; i<cells.length; i++) {
            var face = cells[i]
            if (i > this.faces.length-1)
                this.faces.push(new THREE.Face3(face[0], face[1], face[2]))
            else {
                var tf = this.faces[i]
                tf.a = face[0]
                tf.b = face[1]
                tf.c = face[2]
            }
        }

        this.faces.length = cells.length
        this.elementsNeedUpdate = true
    }

    Complex.prototype.update = function(mesh) {
        this._updatePositions(mesh.positions)
        this._updateCells(mesh.cells)
    }

    return Complex
}
},{"inherits":301}],351:[function(require,module,exports){
module.exports = triangleCentroid
function triangleCentroid (triangle) {
  if (triangle.length !== 3) {
    throw new TypeError('must provide triangle array of length 3')
  }

  var dimension = triangle[0].length
  var result = new Array(dimension)
  for (var i = 0; i < dimension; i++) {
    var t0 = triangle[0][i]
    var t1 = triangle[1][i]
    var t2 = triangle[2][i]
    result[i] = (t0 + t1 + t2) / 3
  }
  return result
}

},{}],352:[function(require,module,exports){
var Tess2 = require('tess2')
var xtend = require('xtend')

module.exports = function(contours, opt) {
    opt = opt||{}
    contours = contours.filter(function(c) {
        return c.length>0
    })
    
    if (contours.length === 0) {
        return { 
            positions: [],
            cells: []
        }
    }

    if (typeof opt.vertexSize !== 'number')
        opt.vertexSize = contours[0][0].length

    //flatten for tess2.js
    contours = contours.map(function(c) {
        return c.reduce(function(a, b) {
            return a.concat(b)
        })
    })

    // Tesselate
    var res = Tess2.tesselate(xtend({
        contours: contours,
        windingRule: Tess2.WINDING_ODD,
        elementType: Tess2.POLYGONS,
        polySize: 3,
        vertexSize: 2
    }, opt))

    var positions = []
    for (var i=0; i<res.vertices.length; i+=opt.vertexSize) {
        var pos = res.vertices.slice(i, i+opt.vertexSize)
        positions.push(pos)
    }
    
    var cells = []
    for (i=0; i<res.elements.length; i+=3) {
        var a = res.elements[i],
            b = res.elements[i+1],
            c = res.elements[i+2]
        cells.push([a, b, c])
    }

    //return a simplicial complex
    return {
        positions: positions,
        cells: cells
    }
}
},{"tess2":347,"xtend":369}],353:[function(require,module,exports){
var noop = function(){}
var linear = require('eases/linear')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

function BaseTween(opt) {
    EventEmitter.call(this)

    //users generally don't need to change these
    this.duration = (opt && opt.duration)||0
    this.delay = (opt && opt.delay)||0
    this.time = 0
    this.ease = opt && opt.ease
    this.active = true
    this.enabled = true
    this.cancelling = false
    this._started = false
}

inherits(BaseTween, EventEmitter)

BaseTween.prototype.lerp = noop
BaseTween.prototype.ready = noop

BaseTween.prototype.cancel = function() {
    this.cancelling = true
    return this
}

BaseTween.prototype.tick = function(dt, ease) {
    ease = typeof ease === 'function' ? ease : defaultEase

    if (this.cancelling && this.active) {
        this.active = false
        this.emit('cancelling', this)
        this.emit('complete', this)
    }

    if (!this.active || !this.enabled)
        return

    var last = this.time
    this.time += dt
            
    var alpha = (this.time-this.delay) / this.duration
    if (this.time-this.delay > 0) {
        if (!this._started) {
            this._started = true
            this.ready()
            this.emit('start', this)
        }

        if (alpha < 0)
            alpha = 0
        else if (alpha > 1)
            alpha = 1
        alpha = ease(this, alpha)
        this.lerp(alpha)
        this.emit('update', this)
    }

    if (this.time >= (this.duration+this.delay)) {
        this.active = false
        this.emit('complete', this)
    }
}

function defaultEase(tween, alpha) {
    if (typeof tween.ease === 'function')
        return tween.ease(alpha)
    return linear(alpha)
}

module.exports = BaseTween
},{"eases/linear":261,"events":274,"inherits":301}],354:[function(require,module,exports){
var ObjectTween = require('./lib/object')
var GroupTween = require('./lib/group')

module.exports = function(element, opt) {
    var tween = Array.isArray(element) 
            ? new GroupTween(element, opt)
            : new ObjectTween(element, opt)
    return tween
}
},{"./lib/group":356,"./lib/object":357}],355:[function(require,module,exports){
var BaseTween = require('tween-base')
var isArray = require('an-array')
var ownKeys = require('own-enumerable-keys')
var ignores = ownKeys(new BaseTween())

module.exports = function getTargets(element, opt) {
    var targets = []
    var optKeys = ownKeys(opt)

    for (var k in opt) { 
        //copy properties as needed
        if (optKeys.indexOf(k) >= 0 &&
                k in element &&
                ignores.indexOf(k) === -1) {
            var startVal = element[k]
            var endVal = opt[k]
            if (typeof startVal === 'number'
                 && typeof endVal === 'number') {
                targets.push({ 
                    key: k, 
                    start: startVal, 
                    end: endVal 
                })
            }
            else if (isArray(startVal) && isArray(endVal)) {
                targets.push({ 
                    key: k, 
                    start: startVal.slice(), 
                    end: endVal.slice() 
                })
            }
        }
    }
    return targets
}
},{"an-array":4,"own-enumerable-keys":310,"tween-base":353}],356:[function(require,module,exports){
var inherits = require('inherits')
var lerp = require('lerp-array')
var BaseTween = require('tween-base')
var endTarget = require('./end-target')

function GroupTween(target, opt) {
    BaseTween.call(this, opt)
    this.target = target
    this.end = []
    this._options = opt
}

inherits(GroupTween, BaseTween)

GroupTween.prototype.ready = function() {
    this.end = this.target.map(function(t) {
        return endTarget(t, this._options)
    }, this)
}

GroupTween.prototype.lerp = function(alpha) {
    for (var j=0; j<this.end.length; j++)  {
        var endings = this.end[j]
        var target = this.target[j]
        for (var i=0; i<endings.length; i++) {
            var t = endings[i]
            var k = t.key
            target[k] = lerp(t.start, t.end, alpha, target[k])    
        }
    }
}

module.exports = GroupTween
},{"./end-target":355,"inherits":301,"lerp-array":302,"tween-base":353}],357:[function(require,module,exports){
var inherits = require('inherits')
var lerp = require('lerp-array')
var BaseTween = require('tween-base')
var endTarget = require('./end-target')

function ObjectTween(target, opt) {
    BaseTween.call(this, opt)
    this.target = target
    this.endings = undefined
    this._options = opt
}

inherits(ObjectTween, BaseTween)

ObjectTween.prototype.ready = function() {
    this.endings = endTarget(this.target, this._options)
}

ObjectTween.prototype.lerp = function(alpha) {
    for (var i=0; i<this.endings.length; i++) {
        var t = this.endings[i]
        var k = t.key
        this.target[k] = lerp(t.start, t.end, alpha, this.target[k])
    }
}

module.exports = ObjectTween
},{"./end-target":355,"inherits":301,"lerp-array":302,"tween-base":353}],358:[function(require,module,exports){
var linear = require('eases/linear')
var createTween = require('tween-objects')
var BaseTween = require('tween-base')

function TweenTicker (opt) {
  if (!(this instanceof TweenTicker)) {
    return new TweenTicker(opt)
  }
  opt = opt || {}
  this.stack = []
  this.defaultEase = opt.defaultEase || linear
  this.eases = opt.eases || {}
  this._applyEase = this.ease.bind(this)
}

TweenTicker.prototype.cancel = function () {
  for (var i = 0; i < this.stack.length; i++) {
    var t = this.stack[i]
    // cancel each and force it to complete
    t.cancel()
    t.tick(0)
  }
  this.stack.length = 0
  return this
}

// no longer used, backward-compatible
TweenTicker.prototype.clear = TweenTicker.prototype.cancel

TweenTicker.prototype.to = function (element, opt) {
  var tween = element
  if (opt && typeof opt === 'object') {
    tween = createTween(element, opt)
  } else if (!element && !opt) {
    tween = new BaseTween()
  } else if (!isTween(tween)) { // to avoid programmer error
    throw new Error('must provide options or a tween object')
  }
  return this.push(tween)
}

TweenTicker.prototype.push = function (tween) {
  this.stack.push(tween)
  return tween
}

TweenTicker.prototype.tick = function (dt, ease) {
  ease = typeof ease === 'function' ? ease : this._applyEase
  dt = typeof dt === 'number' ? dt : 1 / 60

  // for all queued tweens, tick them forward (i.e. DOM read)
  for (var i = 0; i < this.stack.length; i++) {
    this.stack[i].tick(dt, ease)
  }

  // now sync their states (i.e. DOM write)
  sync(this.stack)

  // now kill any inactive tweens
  for (i = this.stack.length - 1; i >= 0; i--) {
    if (!this.stack[i].active) {
      this.stack.splice(i, 1)
    }
  }
}

// determines which easing function to use based on user options
TweenTicker.prototype.ease = function (tween, alpha) {
  var ease = tween.ease || this.defaultEase
  if (typeof ease === 'string') {
    ease = this.eases[ease]
  }
  if (typeof ease !== 'function') {
    ease = linear
  }
  return ease(alpha)
}

// mainly intended as a safeguard against potential user error
function isTween (tween) {
  return (typeof tween.tick === 'function' &&
  typeof tween.cancel === 'function')
}

function sync (tweens) {
  for (var i = 0; i < tweens.length; i++) {
    var tween = tweens[i]
    if (typeof tween.sync === 'function') {
      tween.sync()
    }
  }
}

module.exports = TweenTicker

},{"eases/linear":261,"tween-base":353,"tween-objects":354}],359:[function(require,module,exports){
var xtend = require('xtend')
var eases = require('eases')
var Ticker = require('tween-ticker')
var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits')
var mixin = require('mixes')
var loop = require('./loop')

var defaultOpt = { eases: eases }

module.exports = Tweenr
function Tweenr(opt) {
    if (!(this instanceof Tweenr))
        return new Tweenr(opt)

    Ticker.call(this, xtend(defaultOpt, opt))
    EventEmitter.call(this)

    this._handleTick = function(dt) {
        dt = Math.min(30, dt) //cap delta at 30 ms
        dt /= 1000
        this.emit('tick', dt)
        this.tick(dt)
    }.bind(this)

    loop.on('tick', this._handleTick)
}

inherits(Tweenr, Ticker)
mixin(Tweenr, EventEmitter.prototype)

Tweenr.prototype.dispose = function() {
    loop.removeListener('tick', this._handleTick)
}

},{"./loop":360,"eases":260,"events":274,"inherits":301,"mixes":305,"tween-ticker":358,"xtend":369}],360:[function(require,module,exports){
var engine = require('raf-loop')()
engine.start()

module.exports = engine
},{"raf-loop":315}],361:[function(require,module,exports){
"use strict"

module.exports = twoProduct

var SPLITTER = +(Math.pow(2, 27) + 1.0)

function twoProduct(a, b, result) {
  var x = a * b

  var c = SPLITTER * a
  var abig = c - a
  var ahi = c - abig
  var alo = a - ahi

  var d = SPLITTER * b
  var bbig = d - b
  var bhi = d - bbig
  var blo = b - bhi

  var err1 = x - (ahi * bhi)
  var err2 = err1 - (alo * bhi)
  var err3 = err2 - (ahi * blo)

  var y = alo * blo - err3

  if(result) {
    result[0] = y
    result[1] = x
    return result
  }

  return [ y, x ]
}
},{}],362:[function(require,module,exports){
"use strict"

module.exports = fastTwoSum

function fastTwoSum(a, b, result) {
	var x = a + b
	var bv = x - a
	var av = x - bv
	var br = b - bv
	var ar = a - av
	if(result) {
		result[0] = ar + br
		result[1] = x
		return result
	}
	return [ar+br, x]
}
},{}],363:[function(require,module,exports){
(function (global,Buffer){
'use strict'

var bits = require('bit-twiddle')
var dup = require('dup')

//Legacy pool support
if(!global.__TYPEDARRAY_POOL) {
  global.__TYPEDARRAY_POOL = {
      UINT8   : dup([32, 0])
    , UINT16  : dup([32, 0])
    , UINT32  : dup([32, 0])
    , INT8    : dup([32, 0])
    , INT16   : dup([32, 0])
    , INT32   : dup([32, 0])
    , FLOAT   : dup([32, 0])
    , DOUBLE  : dup([32, 0])
    , DATA    : dup([32, 0])
    , UINT8C  : dup([32, 0])
    , BUFFER  : dup([32, 0])
  }
}

var hasUint8C = (typeof Uint8ClampedArray) !== 'undefined'
var POOL = global.__TYPEDARRAY_POOL

//Upgrade pool
if(!POOL.UINT8C) {
  POOL.UINT8C = dup([32, 0])
}
if(!POOL.BUFFER) {
  POOL.BUFFER = dup([32, 0])
}

//New technique: Only allocate from ArrayBufferView and Buffer
var DATA    = POOL.DATA
  , BUFFER  = POOL.BUFFER

exports.free = function free(array) {
  if(Buffer.isBuffer(array)) {
    BUFFER[bits.log2(array.length)].push(array)
  } else {
    if(Object.prototype.toString.call(array) !== '[object ArrayBuffer]') {
      array = array.buffer
    }
    if(!array) {
      return
    }
    var n = array.length || array.byteLength
    var log_n = bits.log2(n)|0
    DATA[log_n].push(array)
  }
}

function freeArrayBuffer(buffer) {
  if(!buffer) {
    return
  }
  var n = buffer.length || buffer.byteLength
  var log_n = bits.log2(n)
  DATA[log_n].push(buffer)
}

function freeTypedArray(array) {
  freeArrayBuffer(array.buffer)
}

exports.freeUint8 =
exports.freeUint16 =
exports.freeUint32 =
exports.freeInt8 =
exports.freeInt16 =
exports.freeInt32 =
exports.freeFloat32 = 
exports.freeFloat =
exports.freeFloat64 = 
exports.freeDouble = 
exports.freeUint8Clamped = 
exports.freeDataView = freeTypedArray

exports.freeArrayBuffer = freeArrayBuffer

exports.freeBuffer = function freeBuffer(array) {
  BUFFER[bits.log2(array.length)].push(array)
}

exports.malloc = function malloc(n, dtype) {
  if(dtype === undefined || dtype === 'arraybuffer') {
    return mallocArrayBuffer(n)
  } else {
    switch(dtype) {
      case 'uint8':
        return mallocUint8(n)
      case 'uint16':
        return mallocUint16(n)
      case 'uint32':
        return mallocUint32(n)
      case 'int8':
        return mallocInt8(n)
      case 'int16':
        return mallocInt16(n)
      case 'int32':
        return mallocInt32(n)
      case 'float':
      case 'float32':
        return mallocFloat(n)
      case 'double':
      case 'float64':
        return mallocDouble(n)
      case 'uint8_clamped':
        return mallocUint8Clamped(n)
      case 'buffer':
        return mallocBuffer(n)
      case 'data':
      case 'dataview':
        return mallocDataView(n)

      default:
        return null
    }
  }
  return null
}

function mallocArrayBuffer(n) {
  var n = bits.nextPow2(n)
  var log_n = bits.log2(n)
  var d = DATA[log_n]
  if(d.length > 0) {
    return d.pop()
  }
  return new ArrayBuffer(n)
}
exports.mallocArrayBuffer = mallocArrayBuffer

function mallocUint8(n) {
  return new Uint8Array(mallocArrayBuffer(n), 0, n)
}
exports.mallocUint8 = mallocUint8

function mallocUint16(n) {
  return new Uint16Array(mallocArrayBuffer(2*n), 0, n)
}
exports.mallocUint16 = mallocUint16

function mallocUint32(n) {
  return new Uint32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocUint32 = mallocUint32

function mallocInt8(n) {
  return new Int8Array(mallocArrayBuffer(n), 0, n)
}
exports.mallocInt8 = mallocInt8

function mallocInt16(n) {
  return new Int16Array(mallocArrayBuffer(2*n), 0, n)
}
exports.mallocInt16 = mallocInt16

function mallocInt32(n) {
  return new Int32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocInt32 = mallocInt32

function mallocFloat(n) {
  return new Float32Array(mallocArrayBuffer(4*n), 0, n)
}
exports.mallocFloat32 = exports.mallocFloat = mallocFloat

function mallocDouble(n) {
  return new Float64Array(mallocArrayBuffer(8*n), 0, n)
}
exports.mallocFloat64 = exports.mallocDouble = mallocDouble

function mallocUint8Clamped(n) {
  if(hasUint8C) {
    return new Uint8ClampedArray(mallocArrayBuffer(n), 0, n)
  } else {
    return mallocUint8(n)
  }
}
exports.mallocUint8Clamped = mallocUint8Clamped

function mallocDataView(n) {
  return new DataView(mallocArrayBuffer(n), 0, n)
}
exports.mallocDataView = mallocDataView

function mallocBuffer(n) {
  n = bits.nextPow2(n)
  var log_n = bits.log2(n)
  var cache = BUFFER[log_n]
  if(cache.length > 0) {
    return cache.pop()
  }
  return new Buffer(n)
}
exports.mallocBuffer = mallocBuffer

exports.clearCache = function clearCache() {
  for(var i=0; i<32; ++i) {
    POOL.UINT8[i].length = 0
    POOL.UINT16[i].length = 0
    POOL.UINT32[i].length = 0
    POOL.INT8[i].length = 0
    POOL.INT16[i].length = 0
    POOL.INT32[i].length = 0
    POOL.FLOAT[i].length = 0
    POOL.DOUBLE[i].length = 0
    POOL.UINT8C[i].length = 0
    DATA[i].length = 0
    BUFFER[i].length = 0
  }
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"bit-twiddle":29,"buffer":38,"dup":241}],364:[function(require,module,exports){
//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind,
    nativeCreate       = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.8.3';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  var property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var getLength = property('length');
  var isArrayLike = function(collection) {
    var length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  function createReduce(dir) {
    // Optimized iterator function as using arguments.length
    // in the main function will deoptimize the, see #1991.
    function iterator(obj, iteratee, memo, keys, index, length) {
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      // Determine the initial value if none is provided.
      if (arguments.length < 3) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given item (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    return _.indexOf(obj, item, fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //flatten current level of array or arguments object
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = getLength(array); i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = getLength(array); i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    return _.unzip(arguments);
  };

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices
  _.unzip = function(array) {
    var length = array && _.max(array, getLength).length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = getLength(list); i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Generator function to create the findIndex and findLastIndex functions
  function createPredicateIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = getLength(array);
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a predicate test
  _.findIndex = createPredicateIndexFinder(1);
  _.findLastIndex = createPredicateIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = getLength(array);
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generator function to create the indexOf and lastIndexOf functions
  function createIndexFinder(dir, predicateFind, sortedIndex) {
    return function(array, item, idx) {
      var i = 0, length = getLength(array);
      if (typeof idx == 'number') {
        if (dir > 0) {
            i = idx >= 0 ? idx : Math.max(idx + length, i);
        } else {
            length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
        }
      } else if (sortedIndex && idx && length) {
        idx = sortedIndex(array, item);
        return array[idx] === item ? idx : -1;
      }
      if (item !== item) {
        idx = predicateFind(slice.call(array, i, length), _.isNaN);
        return idx >= 0 ? idx + i : -1;
      }
      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
        if (array[idx] === item) return idx;
      }
      return -1;
    };
  }

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (stop == null) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var args = slice.call(arguments, 2);
    var bound = function() {
      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object
  // In contrast to _.map it returns an object
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys =  _.keys(obj),
          length = keys.length,
          results = {},
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s)
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(object, oiteratee, context) {
    var result = {}, obj = object, iteratee, keys;
    if (obj == null) return result;
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) { return key in obj; };
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  _.create = function(prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), and in Safari 8 (#1929).
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = property;

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

  _.prototype.toString = function() {
    return '' + this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));

},{}],365:[function(require,module,exports){
module.exports = unindex

function unindex(positions, cells, out) {
  if (positions.positions && positions.cells) {
    out = cells
    cells = positions.cells
    positions = positions.positions
  }

  var dims = positions.length ? positions[0].length : 0
  var points = cells.length ? cells[0].length : 0

  out = out || new Float32Array(cells.length * points * dims)

  if (points === 3 && dims === 2) {
    for (var i = 0, n = 0, l = cells.length; i < l; i += 1) {
      var cell = cells[i]
      out[n++] = positions[cell[0]][0]
      out[n++] = positions[cell[0]][1]
      out[n++] = positions[cell[1]][0]
      out[n++] = positions[cell[1]][1]
      out[n++] = positions[cell[2]][0]
      out[n++] = positions[cell[2]][1]
    }
  } else
  if (points === 3 && dims === 3) {
    for (var i = 0, n = 0, l = cells.length; i < l; i += 1) {
      var cell = cells[i]
      out[n++] = positions[cell[0]][0]
      out[n++] = positions[cell[0]][1]
      out[n++] = positions[cell[0]][2]
      out[n++] = positions[cell[1]][0]
      out[n++] = positions[cell[1]][1]
      out[n++] = positions[cell[1]][2]
      out[n++] = positions[cell[2]][0]
      out[n++] = positions[cell[2]][1]
      out[n++] = positions[cell[2]][2]
    }
  } else {
    for (var i = 0, n = 0, l = cells.length; i < l; i += 1) {
      var cell = cells[i]
      for (var c = 0; c < cell.length; c++) {
        var C = cell[c]
        for (var k = 0; k < dims; k++) {
          out[n++] = positions[C][k]
        }
      }
    }
  }

  return out
}

},{}],366:[function(require,module,exports){
"use strict"; "use restrict";

module.exports = UnionFind;

function UnionFind(count) {
  this.roots = new Array(count);
  this.ranks = new Array(count);
  
  for(var i=0; i<count; ++i) {
    this.roots[i] = i;
    this.ranks[i] = 0;
  }
}

var proto = UnionFind.prototype

Object.defineProperty(proto, "length", {
  "get": function() {
    return this.roots.length
  }
})

proto.makeSet = function() {
  var n = this.roots.length;
  this.roots.push(n);
  this.ranks.push(0);
  return n;
}

proto.find = function(x) {
  var x0 = x
  var roots = this.roots;
  while(roots[x] !== x) {
    x = roots[x]
  }
  while(roots[x0] !== x) {
    var y = roots[x0]
    roots[x0] = x
    x0 = y
  }
  return x;
}

proto.link = function(x, y) {
  var xr = this.find(x)
    , yr = this.find(y);
  if(xr === yr) {
    return;
  }
  var ranks = this.ranks
    , roots = this.roots
    , xd    = ranks[xr]
    , yd    = ranks[yr];
  if(xd < yd) {
    roots[xr] = yr;
  } else if(yd < xd) {
    roots[yr] = xr;
  } else {
    roots[yr] = xr;
    ++ranks[xr];
  }
}
},{}],367:[function(require,module,exports){
module.exports = function range(min, max, value) {
  return (value - min) / (max - min)
}
},{}],368:[function(require,module,exports){
module.exports = function vec2Copy(out, a) {
    out[0] = a[0]
    out[1] = a[1]
    return out
}
},{}],369:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],370:[function(require,module,exports){
"use strict";

require("babel-polyfill");

var _grid = require("./modules/grid.jsx");

var _view = require("./modules/view.jsx");

var _plotter = require("./modules/plotter.jsx");

var _logo = require("./modules/animation/logo.jsx");

var _matter = require("./modules/physics/matter.jsx");

var _threed = require("./modules/threed/threed.jsx");

require("babel-core/register");

var domready = require('domready');

domready(function () {
  var element = document.getElementById('sketch');

  var _canvas = document.createElement('canvas');
  _canvas.width = window.innerWidth;
  _canvas.height = window.innerHeight;

  element.appendChild(_canvas);

  var _threeD = new _threed.ThreeD(_canvas);

  //let _grid = new Grid( canvas );
  //_grid.draw();
  var _l = new _logo.LogoAnimation(_canvas);
  var groups = _l.graphics.groups;
  console.log(groups);

  for (var _group in groups) {
    var _g = groups[_group];

    for (var _p in _g.paths) {
      var _path = _g.paths[_p];
      _path.bWidth = _g.width;
      _path.bHeight = _g.height;

      _threeD.create(_path);
    }
  }

  //for ( var path in animatedPaths ){
  //var _path = animatedPaths[path];

  //_threeD.create( _path.d );
  //}

  //_threeD.explode();

  /*
  var _physics = new Physics( canvas );
  var _canvas = _physics.physicsCanvas;
  
   for ( var path in animatedPaths ){
    var _path = animatedPaths[path];
    var _polygons = _path.getPolygons( _path.getTriangles( _path.contours, _path.threshold ) );
     _physics.addVertex( _polygons );
  }
  */
});

},{"./modules/animation/logo.jsx":372,"./modules/grid.jsx":376,"./modules/physics/matter.jsx":377,"./modules/plotter.jsx":378,"./modules/threed/threed.jsx":379,"./modules/view.jsx":380,"babel-core/register":6,"babel-polyfill":7,"domready":239}],371:[function(require,module,exports){
module.exports={"letters":{"children":[{"children":[{"children":[{"shape":{"type":"path","d":"M 403 61 m -25.1, 0 a 25.1,25.1 0 1,0 50.2,0 a 25.1,25.1 0 1,0 -50.2,0"},"fill":"#73C9C3"},{"shape":{"type":"path","d":"M 374.1 136.9 m -17.9, 0 a 17.9,17.9 0 1,0 35.8,0 a 17.9,17.9 0 1,0 -35.8,0"},"fill":"#73C9C3"},{"shape":{"type":"path","d":"M 433.9 136.9 m -17.9, 0 a 17.9,17.9 0 1,0 35.8,0 a 17.9,17.9 0 1,0 -35.8,0"},"fill":"#73C9C3"},{"shape":{"type":"path","d":"M 403.5 108.4 m -11.6, 0 a 11.6,11.6 0 1,0 23.2,0 a 11.6,11.6 0 1,0 -23.2,0"},"fill":"#73C9C3"}],"groupShape":"true"},{"shape":{"type":"path","path":"M486.3,165.8l-173.9,0.4c0,0,55.2-9.1,33.1-14.7c-14.5-3.7,42.1-53.4,24.6-53.4s45.8-54.4,25-54.4 c-20.9,0,13.3-41.6,13.3-41.6s-18,24.1,0,33.1C423,42.5,439.5,74,431,91.8c-16.7,35,58.9,51.5,39.3,51.5 C450.8,143.4,486.3,165.8,486.3,165.8z"},"fill":"#EF3B24"},{"shape":{"type":"path","d":"M327.8,150.9 325.9,149.6 403.5,35.9 481.1,149.6 479.1,150.9 403.5,40.1 327.8,150.9z"}},{"shape":{"type":"path","path":"M466.4,135.3c-0.2,0-0.4,0-0.6,0.1l-58.5-98.3c0.5-0.6,0.8-1.3,0.8-2.2c0-1.9-1.5-3.4-3.4-3.5l0,0l0,0 c-0.1,0-0.1,0-0.2,0c-2,0-3.5,1.6-3.5,3.5c0,0.9,0.3,1.7,0.9,2.3l-53.3,112.4c-0.3-0.1-0.5-0.1-0.8-0.1c-2,0-3.5,1.6-3.5,3.5 c0,2,1.6,3.5,3.5,3.5c1.5,0,2.8-0.9,3.3-2.2l75.9,13c0.1,1.9,1.6,3.4,3.5,3.4c2,0,3.5-1.6,3.5-3.5c0-0.6-0.1-1.1-0.4-1.6l30.8-24 c0.6,0.4,1.2,0.6,2,0.6c2,0,3.5-1.6,3.5-3.5C469.9,136.9,468.3,135.3,466.4,135.3z M427.2,166.1l-75.9-13c0-0.4-0.1-0.7-0.2-1 l40.1-23.9c0.6,0.7,1.6,1.1,2.6,1.1c1.5,0,2.7-0.9,3.3-2.2l25.7,4.6l6.3,32.5C428.2,164.5,427.5,165.2,427.2,166.1z M404.6,38.5 C404.6,38.5,404.6,38.5,404.6,38.5l17.9,91.6l-25.2-4.5c0-1.5-1-2.8-2.4-3.2L404.6,38.5z M430.5,163.8l-6.2-31.9l38.6,6.9 c0,0,0,0,0,0c0,0.7,0.2,1.3,0.5,1.9l-30.7,23.9C432.1,164.2,431.4,163.8,430.5,163.8z M463.1,137.4l-39.2-7l-18-92.2 c0.1,0,0.1-0.1,0.2-0.1l58.3,97.9C463.9,136.3,463.4,136.8,463.1,137.4z M403.1,38.2C403.1,38.2,403.1,38.2,403.1,38.2l-9.6,84 c-1.8,0.2-3.2,1.7-3.2,3.5c0,0.4,0.1,0.8,0.2,1.1l-40.1,23.9c-0.1-0.2-0.3-0.3-0.5-0.4L403.1,38.2z"},"fill":"#73C9C3"},{"shape":{"type":"path","path":"M403.5,28.1l14.9,36.6l14.9,36.6h-29.8h-29.8l14.9-36.6L403.5,28.1z M365,124.1l-14.1,34.6h52.6h52.6 L442,124.1H365z"},"fill":"#55AADE"}],"id":"A"},{"children":[{"children":[{"shape":{"type":"path","path":"M267.6,84c-2,0-3.6,1.4-4,3.3h-10.2l6-12.2l0,0c2.2,0,4-1.8,4-4s-1.8-4-4-4 c-2,0-3.6,1.4-4,3.3h-11.1l23.3-42.7c0.2,0,0.4,0,0.6,0c2.2,0,4-1.8,4-4s-1.8-4-4-4s-4,1.8-4,4c0,1.4,0.7,2.6,1.7,3.3l-23.7,43.3 h-13c-0.1-0.5-0.3-1.1-0.6-1.5l31.8-58.1c2.1-0.1,3.8-1.9,3.8-4c0-2.2-1.8-4-4-4s-4,1.8-4,4c0,1.6,1,3.1,2.4,3.7l-31.2,57.2 c-0.6-0.3-1.3-0.5-2-0.5c-2.2,0-4,1.8-4,4s1.8,4,4,4c1.9,0,3.4-1.2,3.9-2.9h12l-6.5,12c-0.4-0.2-0.9-0.2-1.3-0.2 c-2.2,0-4,1.8-4,4s1.8,4,4,4c1.9,0,3.5-1.3,3.9-3h13.1L225,140.5c-0.4-0.1-0.8-0.2-1.3-0.2c-2.2,0-4,1.8-4,4s1.8,4,4,4s4-1.8,4-4 c0-1.1-0.5-2.2-1.2-2.9l26-52.4h11.1c0.2,0.9,0.7,1.6,1.4,2.1l-32.8,66.2c-0.2,0-0.3,0-0.5,0c-2.2,0-4,1.8-4,4s1.8,4,4,4 s4-1.8,4-4c0-1.4-0.7-2.7-1.9-3.4l32.7-66c0.3,0.1,0.6,0.1,0.9,0.1c2.2,0,4-1.8,4-4S269.8,84,267.6,84z M237.5,87.2 c-0.2-0.8-0.5-1.6-1.1-2.1l7.1-13.1h12.1c0.3,1.1,1.1,2,2.1,2.5l-6.3,12.7H237.5L237.5,87.2z"},"fill":"#010101"}],"groupShape":"true"},{"children":[{"children":[{"shape":{"type":"path","path":"M274.9,97.8c-2.8,0-5.5-1.7-6.9-4.3c-1.2-2.4-1-5.1,0.6-7.3c3-4.2,1-6.2-3.2-9.7c-1.2-1-2.4-2.1-3.5-3.2 c-4.3-4.9-4.2-11.8-3.7-15.6c0.5-3.6,2.9-7,7.1-10.1c1.5-1.1,3.3-1.9,4.9-2.6l0.9-0.4c1.2-0.6,2.7-1.5,2.6-2.7 c-0.1-2.3-4.9-5.4-8-6.4c-8.9-2.8-13.4-9.7-12.1-18.4C255.3,7.9,263.8-2,275-2c2,0,4.1,0.3,6.1,1c3.4,1.1,5.2,4,4.6,7.5 c-0.5,3.2-3.2,6.6-7.3,6.6c-0.7,0-1.4-0.1-2.1-0.3c-3.5,0.1-5.7,0.9-6.4,2.3c-0.7,1.4-0.1,3.8,1.8,7c1,0.4,2,0.7,3,1.1 c1.8,0.6,3.6,1.2,5.4,2.1c3.5,1.7,6.6,4.9,8.1,8.5c3.3,7.7,1.4,15.6-5.1,21.1c-0.9,0.8-2.3,1.4-3.8,2.1 c-2.6,1.2-5.8,2.7-6.3,4.7c-0.2,0.8,0,1.7,0.7,2.8c1.1,1.8,3.1,3.4,4.9,4.9c1.1,0.9,2.3,1.9,3.3,2.9c5.6,5.6,5.1,13.7-1.3,22.7 C279.1,96.7,277.1,97.8,274.9,97.8z M275,0.9c-9.7,0-17,8.6-18.2,16.6c-0.5,3.4-0.6,11.8,10.1,15.1c3.4,1.1,9.7,4.8,10,9 c0.1,1.6-0.6,3.8-4.3,5.5l-1,0.4c-1.5,0.7-3.1,1.4-4.4,2.3c-3.6,2.6-5.6,5.3-5.9,8.1c-0.4,3.2-0.5,9.3,3,13.3c0.9,1,2,2,3.2,2.9 c3.7,3.1,8.3,7.1,3.7,13.6c-1.3,1.8-0.9,3.3-0.4,4.3c0.8,1.6,2.6,2.7,4.3,2.7c1.2,0,2.3-0.6,3.2-1.8c3.9-5.5,7.4-13.2,1.6-19 c-0.9-0.9-1.9-1.8-3.1-2.7c-2.1-1.7-4.2-3.5-5.6-5.6c-1.1-1.8-1.5-3.6-1-5.2c0.9-3.2,4.8-5,7.9-6.5c1.3-0.6,2.6-1.2,3.2-1.7 c5.5-4.6,7.1-11.2,4.3-17.7c-1.3-3-3.8-5.6-6.7-7c-1.7-0.8-3.3-1.3-5.1-1.9c-1.2-0.4-2.4-0.8-3.6-1.3l-0.4-0.2l-0.3-0.4 c-2.8-4.4-3.5-7.8-2.1-10.3c1.3-2.4,4.3-3.7,9.2-3.8l0.3,0l0.2,0.1c0.5,0.2,1,0.2,1.5,0.2c2.5,0,4.1-2.1,4.4-4.2 c0.2-1,0.2-3.3-2.7-4.2C278.5,1.2,276.7,0.9,275,0.9z"},"fill":"#55AADE"}]},{"children":[{"shape":{"type":"path","path":"M233.2,158.8c-2.8,0-5.5-1.7-6.9-4.3c-1.2-2.4-1-5.1,0.6-7.3c3-4.2,1-6.2-3.2-9.7 c-1.2-1-2.4-2.1-3.5-3.2c-4.3-4.9-4.2-11.8-3.7-15.6c0.5-3.6,2.9-7,7.1-10.1c1.5-1.1,3.3-1.9,4.9-2.6l1-0.4 c1.2-0.6,2.7-1.5,2.6-2.7c-0.1-2.3-4.9-5.4-8-6.4c-8.9-2.8-13.4-9.7-12.1-18.4c1.4-9.2,9.9-19.1,21.1-19.1c2,0,4.1,0.3,6.1,1 c3.4,1.1,5.2,4,4.6,7.5c-0.5,3.2-3.2,6.6-7.3,6.6c-0.7,0-1.4-0.1-2.1-0.3c-3.5,0.1-5.7,0.9-6.4,2.3c-0.7,1.4-0.1,3.8,1.8,7 c1,0.4,2,0.7,3,1.1c1.8,0.6,3.6,1.2,5.4,2.1c3.5,1.7,6.6,4.9,8.1,8.5c3.3,7.7,1.4,15.6-5.1,21.1c-0.9,0.8-2.3,1.4-3.8,2.1 c-2.6,1.2-5.8,2.7-6.3,4.7c-0.2,0.8,0,1.7,0.7,2.8c1.1,1.8,3.1,3.4,5,4.9c1.1,0.9,2.3,1.9,3.3,2.9c5.6,5.6,5.1,13.7-1.3,22.7 C237.4,157.8,235.4,158.8,233.2,158.8C233.2,158.8,233.2,158.8,233.2,158.8z M233.3,62c-9.7,0-17,8.6-18.2,16.6 c-0.5,3.4-0.6,11.8,10.1,15.1c3.4,1.1,9.7,4.8,10,9c0.1,1.6-0.6,3.8-4.3,5.5l-1,0.4c-1.5,0.7-3.1,1.4-4.4,2.3 c-3.6,2.6-5.6,5.3-5.9,8.1c-0.4,3.2-0.5,9.3,3,13.3c0.9,1,2,2,3.2,2.9c3.7,3.1,8.4,7.1,3.7,13.6c-1.3,1.8-0.9,3.3-0.4,4.3 c0.8,1.6,2.6,2.7,4.3,2.7c1.2,0,2.3-0.6,3.2-1.8c3.9-5.5,7.4-13.2,1.7-19c-0.9-0.9-1.9-1.8-3.1-2.7c-2.1-1.7-4.2-3.5-5.6-5.6 c-1.1-1.8-1.5-3.6-1-5.2c0.9-3.2,4.8-5,7.9-6.5c1.3-0.6,2.6-1.2,3.2-1.7c5.5-4.6,7.1-11.2,4.3-17.7c-1.3-3-3.8-5.6-6.7-7 c-1.7-0.8-3.3-1.3-5.1-1.9c-1.2-0.4-2.4-0.8-3.6-1.3l-0.4-0.2l-0.3-0.4c-2.8-4.4-3.5-7.8-2.1-10.3c1.3-2.4,4.3-3.7,9.2-3.8 l0.3,0l0.2,0.1c0.5,0.2,1,0.2,1.5,0.2c2.5,0,4.1-2.1,4.4-4.2c0.2-1,0.2-3.3-2.7-4.2C236.8,62.2,235,62,233.3,62z"},"fill":"#F28DB9"}]}],"groupShape":"true"},{"children":[{"children":[{"shape":{"type":"path","path":"M244,93.4C244,93.3,244,93.3,244,93.4l-12.9-12.9l-7.3-7.3c-7.4-7.4-8.1-18.8-1.6-25.3L246,24.1 c0.5-0.5,1-1.1,1.5-1.7l-4.8-4.8c-0.4,0.6-0.9,1.2-1.4,1.8l-23.7,23.8c-9.2,9.2-8.5,24.8,1.6,34.9l20.2,20.2 c5.8,5.8,6.6,14.3,1.8,19.1l-23.7,23.7c-1.5,1.5-2.6,3.2-3.6,4.9l5,5c0.8-1.9,1.8-3.7,3.3-5.2l23.6-23.8c3.4-3.4,5-7.9,5-12.6 c0-1-0.1-2.1-0.3-3.1C249.9,101.7,247.7,97.1,244,93.4z"},"fill":"#C0B3BA"}]},{"children":[{"shape":{"type":"path","path":"M287,93.4C287,93.3,287,93.3,287,93.4l-12.9-12.9l-7.3-7.3c-7.4-7.4-8.1-18.8-1.6-25.3L289,24.1 c0.5-0.5,1-1.1,1.5-1.7l-4.8-4.8c-0.4,0.6-0.9,1.2-1.4,1.8l-23.7,23.8c-9.2,9.2-8.5,24.8,1.6,34.9l20.2,20.2 c5.8,5.8,6.6,14.3,1.8,19.1l-23.7,23.7c-1.5,1.5-2.6,3.2-3.6,4.9l5,5c0.8-1.9,1.8-3.7,3.3-5.2l23.6-23.8c3.4-3.4,5-7.9,5-12.6 c0-1-0.1-2.1-0.3-3.1C292.9,101.7,290.8,97.1,287,93.4z"},"fill":"#221F1F"}]}],"groupShape":"true"}],"id":"SS"},{"children":[{"shape":{"type":"path","path":"M192.7,18.6c-33,0-59.8,26.8-59.8,59.8c0,33,26.8,59.8,59.8,59.8c33,0,59.8-26.8,59.8-59.8 C252.5,45.4,225.7,18.6,192.7,18.6z M192.7,87c-4.7,0-8.6-3.8-8.6-8.6c0-4.7,3.8-8.6,8.6-8.6c4.7,0,8.6,3.8,8.6,8.6 C201.3,83.1,197.4,87,192.7,87z"}},{"shape":{"type":"path","path":"M184.6,1c-45,0-65.3,34.9-65.3,79.9s20.2,83.1,65.3,83.1 s81.5-20.9,81.5-81.5C266.1,21.7,229.6,1,184.6,1z M184.9,116.3c-19.2,0-34.7-15.5-34.7-34.7s15.5-34.7,34.7-34.7 S233,62.5,233,81.6S204.1,116.3,184.9,116.3z"},"fill":"#FDC010","id":"_x3C_path_x3E_"},{"shape":{"type":"path","path":"M256.1,97.6c-2.2-1.2-5-0.5-6.2,1.7c-0.1,0.1-0.1,0.2-0.2,0.4l-41-15.7l-8.5-5.2l5.5,0.6 l43.6,12.8c0,0.1-0.1,0.3,0,0.4c0,1,0.8,1.7,1.8,1.7c1,0,1.7-0.8,1.7-1.8c0-1-0.8-1.7-1.8-1.7c-0.6,0-1.2,0.4-1.5,0.9l-40.8-12 l16.7,1.9c0,0.3,0.2,0.7,0.5,0.8c0.5,0.3,1.1,0.1,1.4-0.4c0.3-0.5,0.1-1.1-0.4-1.4c-0.5-0.3-1.1-0.1-1.4,0.4c0,0,0,0,0,0.1 l-19.8-2.3l-3-0.9l43.1,1.6c0.1,0.5,0.4,1.1,0.9,1.3c0.8,0.5,1.9,0.2,2.4-0.7c0.5-0.8,0.2-1.9-0.7-2.4c-0.8-0.5-1.9-0.2-2.4,0.7 c-0.1,0.2-0.1,0.3-0.2,0.5l-39.5-1.5l21.3-1c0.1,0.2,0.1,0.4,0.3,0.5c0.4,0.4,1.1,0.3,1.5-0.1c0.2-0.2,0.3-0.5,0.3-0.7l17.5-0.1 c0,0,0,0,0,0.1c0.2,0.9,1.2,1.5,2.1,1.3c0.9-0.2,1.5-1.2,1.3-2.1c-0.2-0.9-1.2-1.5-2.1-1.3c-0.7,0.2-1.3,0.8-1.3,1.5l-17.6,0.1 c0-0.1-0.1-0.2-0.2-0.2c-0.4-0.4-1.1-0.4-1.5,0.1c0,0-0.1,0.1-0.1,0.1L201.1,76l46.2-10.8c0.6,1.9,2.3,3.3,4.4,3.2 c2.5,0,4.5-2.1,4.5-4.6c0-2.5-2.1-4.5-4.6-4.5c-1.8,0-3.3,1.1-4,2.6c-0.1-0.4-0.2-0.8-0.6-1.1c-0.7-0.6-1.8-0.6-2.5,0.1 c-0.3,0.3-0.5,0.8-0.4,1.2L205,73.6l24.2-10.5c0.2,0.3,0.5,0.5,0.9,0.5c0.6,0,1-0.5,1-1.1c0-0.6-0.5-1-1.1-1c-0.6,0-1,0.5-1,1.1 c0,0,0,0,0,0.1l-27.5,11.9l44.3-23.4c0.3,0.4,0.8,0.7,1.4,0.7c1,0,1.7-0.8,1.7-1.8c0-1-0.8-1.7-1.8-1.7c-1,0-1.7,0.8-1.7,1.8 c0,0.2,0,0.4,0.1,0.5l-45.4,24c-0.2-0.4-0.5-0.7-0.9-1l3.4-3l34.9-21.1c0.1,0.1,0.2,0.2,0.3,0.3c0.7,0.6,1.8,0.6,2.5-0.1 c0.6-0.7,0.6-1.8-0.1-2.5c-0.7-0.6-1.8-0.6-2.5,0.1c-0.4,0.5-0.5,1.1-0.4,1.7l-32.5,19.7l11-9.7c0.4,0.3,0.9,0.4,1.4,0.3 c0.9-0.2,1.5-1.1,1.3-2.1c-0.2-0.9-1.1-1.5-2.1-1.3c-0.9,0.2-1.5,1.1-1.3,2.1c0.1,0.3,0.2,0.5,0.3,0.7l-13.1,11.6l-2.4,1.5 l7.2-12.4l17.2-19c0,0,0,0,0,0c0.8,0.5,1.9,0.2,2.4-0.7c0.5-0.8,0.2-1.9-0.7-2.4c-0.8-0.5-1.9-0.2-2.4,0.7c-0.4,0.7-0.3,1.5,0.2,2 l-15.5,17.2l17.5-30c0.5,0.2,1.2,0.2,1.8,0.1c1.7-0.4,2.8-2.1,2.4-3.8c-0.4-1.7-2.1-2.8-3.8-2.4c-1.7,0.4-2.8,2.1-2.4,3.8 c0.2,0.9,0.8,1.6,1.5,2L206.7,59l-7.8,8.6l1.4-6.4l15.9-28.5c1.8,0.8,4,0.5,5.3-1.1c1.7-1.9,1.5-4.8-0.4-6.4 c-1.9-1.7-4.8-1.5-6.4,0.4c-1.7,1.9-1.5,4.8,0.4,6.4c0.2,0.2,0.4,0.3,0.6,0.5l-15.1,27l6.8-31.6c0,0,0,0,0.1,0 c1,0,1.7-0.8,1.7-1.8c0-1-0.8-1.7-1.8-1.7c-1,0-1.7,0.8-1.7,1.8c0,0.8,0.5,1.4,1.2,1.6l-3.3,15.5c-0.1-0.2-0.1-0.3-0.3-0.4 c-0.4-0.4-1.1-0.4-1.5,0.1c-0.4,0.4-0.4,1.1,0.1,1.5c0,0,0,0,0.1,0l-5.7,16.6l-0.2-3l8.7-33.8c0.5,0.1,1.1-0.1,1.5-0.6 c0.6-0.7,0.6-1.8-0.1-2.5c-0.7-0.6-1.8-0.6-2.5,0.1c-0.6,0.7-0.6,1.8,0.1,2.5c0.1,0.1,0.3,0.2,0.5,0.3l-8.4,32.3l-3.1-41.1 c0.9-0.3,1.4-1.2,1.2-2.1c-0.2-0.9-1.2-1.5-2.1-1.3c-0.9,0.2-1.5,1.2-1.3,2.1c0.2,0.8,0.9,1.4,1.7,1.4l3.2,42.6l-2.8,10.8 l-2.5-4.7l0.2-12.4c0.4-0.1,0.9-0.4,1.1-0.8c0.5-0.8,0.2-1.9-0.6-2.4c-0.8-0.5-1.9-0.2-2.4,0.6c-0.5,0.8-0.2,1.9,0.6,2.4 c0.2,0.1,0.5,0.2,0.8,0.2l-0.2,11.5l-5.4-10c-0.1-0.5-0.3-0.9-0.6-1.1l-2.2-4l-7.9-25.2c0.5-0.3,1-0.7,1.3-1.2 c0.9-1.5,0.3-3.4-1.2-4.3c-1.5-0.9-3.4-0.3-4.3,1.2c-0.9,1.5-0.3,3.4,1.2,4.3c0.8,0.5,1.7,0.5,2.5,0.2l7.1,22.6l-12.9-24 c0.6-0.4,0.9-1.1,0.7-1.8c-0.2-0.9-1.2-1.5-2.1-1.3c-0.9,0.2-1.5,1.2-1.3,2.1c0.2,0.9,1.2,1.5,2.1,1.3c0.1,0,0.1,0,0.2-0.1 l14.2,26.4l1.1,3.5c-0.8,0.2-1.3,0.9-1.3,1.7c0,1,0.8,1.8,1.8,1.8c0.2,0,0.4,0,0.6-0.1l2.9,9.3L162,36.7c0.5-0.7,0.4-1.7-0.3-2.3 c-0.5-0.5-1.3-0.6-1.9-0.3l-2.3-2.7c0.4-0.5,0.7-1.2,0.7-2c0-1.7-1.4-3.1-3.2-3.1c-1.7,0-3.1,1.4-3.1,3.2c0,1.7,1.4,3.1,3.2,3.1 c0.8,0,1.5-0.3,2.1-0.8l2.2,2.6c0,0-0.1,0.1-0.1,0.1c-0.6,0.7-0.6,1.8,0.1,2.5c0.6,0.5,1.4,0.6,2,0.2l24.4,34.2l-4.6-2l-38.5-30.2 c0.4-0.8,0.1-1.8-0.7-2.3c-0.8-0.5-1.9-0.2-2.4,0.7c-0.5,0.8-0.2,1.9,0.7,2.4c0.7,0.4,1.6,0.2,2.2-0.3l36.9,29l-38.8-17 c0-0.1,0-0.2,0-0.4c0-1-0.8-1.7-1.8-1.7s-1.7,0.8-1.7,1.8c0,1,0.8,1.7,1.8,1.7c0.7,0,1.2-0.4,1.5-0.9L180.9,70l6.8,5.4 c-0.1,0.1-0.2,0.2-0.3,0.4c-0.2,0.3-0.3,0.7-0.4,1l-22.2-5.6c-0.4-0.3-0.8-0.4-1.2-0.3l-33.5-8.5c0.1-0.7-0.2-1.4-0.9-1.7 c-0.8-0.5-1.9-0.2-2.4,0.7c-0.5,0.8-0.2,1.9,0.7,2.4c0.8,0.5,1.9,0.2,2.4-0.7c0,0,0-0.1,0.1-0.1l32.8,8.3 c-0.1,0.1-0.2,0.1-0.2,0.2c-0.7,0.7-0.6,1.8,0.1,2.5c0.7,0.7,1.8,0.6,2.5-0.1c0.2-0.2,0.3-0.4,0.4-0.7l9.5,2.2 c-0.4,0.7-0.2,1.6,0.4,2.1l-32-0.7c-1.1-0.9-2.5-1.4-4-1c-0.7,0.2-1.3,0.5-1.8,0.9l-6.8-0.2c-0.1-0.7-0.4-1.4-1-1.9 c-1.3-1.2-3.3-1.1-4.4,0.2c-1.2,1.3-1.1,3.3,0.2,4.4c1.3,1.2,3.3,1.1,4.4-0.2c0.5-0.6,0.8-1.3,0.8-2.1L137,77 c-1,1.1-1.4,2.6-1.1,4.1c0.6,2.4,3,4,5.5,3.4c1.9-0.4,3.3-2.1,3.5-3.9l34.3-2.6l7.9,0.2c0,0.3,0.1,0.5,0.2,0.7l-5.3,2.4L137,94 c-0.3-0.6-0.9-1.1-1.6-1.1c-1,0-1.7,0.8-1.7,1.8c0,1,0.8,1.7,1.8,1.7c1,0,1.7-0.8,1.7-1.8c0-0.1,0-0.1,0-0.2l41.5-11.8l-44.3,19.7 c-0.1-0.1-0.2-0.2-0.3-0.3c-0.7-0.6-1.8-0.6-2.5,0.1c-0.6,0.7-0.6,1.8,0.1,2.5c0.7,0.6,1.8,0.6,2.5-0.1c0.4-0.5,0.5-1.1,0.3-1.7 l47.7-21.2l0.5-0.1c-0.2,0.3-0.4,0.7-0.4,1.1c0,1,0.8,1.8,1.8,1.8c0.3,0,0.6-0.1,0.9-0.2l-26.7,34.1c-0.2-0.2-0.5-0.4-0.8-0.6 c-2.2-1.2-5-0.5-6.2,1.7c-1.2,2.2-0.5,5,1.7,6.2c1.4,0.8,3,0.8,4.4,0.1l-4.3,5.4c-0.2-0.1-0.4-0.1-0.6-0.1 c-0.6,0.1-0.9,0.7-0.8,1.3c0.1,0.6,0.7,0.9,1.3,0.8c0.6-0.1,0.9-0.7,0.8-1.3c0-0.2-0.1-0.3-0.2-0.4l29.4-37l-19.6,39.3 c-0.6-0.2-1.4-0.1-1.9,0.5c-0.6,0.7-0.6,1.8,0.1,2.5c0.7,0.6,1.8,0.6,2.5-0.1c0.6-0.7,0.6-1.8-0.1-2.5c0,0-0.1-0.1-0.1-0.1 l20.7-41.5l0.5-0.6c0.1,0.3,0.2,0.5,0.5,0.7c0.7,0.7,1.8,0.6,2.5-0.1c0.7-0.7,0.6-1.8-0.1-2.5c-0.1-0.1-0.2-0.1-0.3-0.2l0.8-2.1 l3-3.7l0.8,4.8l-21.9,57c-0.3-0.1-0.6-0.1-1-0.1c-0.9,0.2-1.5,1.2-1.3,2.1c0.2,0.9,1.2,1.5,2.1,1.3c0.9-0.2,1.5-1.2,1.3-2.1 c-0.1-0.4-0.3-0.8-0.7-1L192,89.7l1.4,8.8l-4.2,29.9c-0.3-0.1-0.7-0.1-1-0.1c-2.5,0-4.5,2.1-4.5,4.6c0,2.5,2.1,4.5,4.6,4.5 c2.5,0,4.5-2.1,4.5-4.6c0-2-1.3-3.6-3.1-4.2l4-28.3l2.8,17.3L196,153c-0.1,0-0.2,0-0.3,0c-0.9,0.2-1.5,1.2-1.3,2.1 c0.2,0.9,1.2,1.5,2.1,1.3c0.9-0.2,1.5-1.2,1.3-2.1c-0.2-0.7-0.7-1.1-1.3-1.3l0.4-32.4l4.2,26.2c-0.2,0.1-0.4,0.2-0.5,0.4 c-0.3,0.5-0.1,1.1,0.4,1.4c0.5,0.3,1.1,0.1,1.4-0.4c0.3-0.5,0.1-1.1-0.4-1.4c-0.1-0.1-0.3-0.1-0.4-0.1l-4.7-29.2l0.3-25.7 l21.9,43.9c-1.5,1-2.2,2.9-1.8,4.7c0.6,2.5,3,4,5.5,3.4c0.1,0,0.2-0.1,0.4-0.1l0.2,0.4c-0.3,0.2-0.5,0.4-0.7,0.7 c-0.5,0.8-0.2,1.9,0.7,2.4c0.8,0.5,1.9,0.2,2.4-0.7c0.5-0.8,0.2-1.9-0.7-2.4c-0.4-0.2-0.8-0.3-1.2-0.2l-0.2-0.4 c1.9-0.9,3.1-3,2.6-5.2c-0.6-2.5-3-4-5.5-3.4c-0.1,0-0.2,0.1-0.4,0.1l-15.6-39.7l18.8,22.8c-0.3,0.2-0.5,0.4-0.8,0.7 c-1.7,1.9-1.5,4.7,0.4,6.4c1.9,1.7,4.8,1.5,6.4-0.4c1.7-1.9,1.5-4.8-0.4-6.4c-1.5-1.3-3.6-1.5-5.2-0.6l-19.9-24.1l-2.3-5.8 l9.7,9.1l5.7,7.9c-0.2,0.2-0.4,0.6-0.3,0.9c0.1,0.6,0.7,0.9,1.3,0.8c0.6-0.1,0.9-0.7,0.8-1.3c-0.1-0.6-0.7-0.9-1.3-0.8 c0,0,0,0-0.1,0l-4.1-5.7l11.2,10.5l7.7,9.1c-0.4,0.4-0.5,1-0.4,1.6c0.2,0.9,1.2,1.5,2.1,1.3c0.9-0.2,1.4-1,1.3-1.9l10.8,10.1 c-0.1,0.1-0.1,0.2-0.2,0.3c-0.5,0.8-0.2,1.9,0.7,2.4c0.8,0.5,1.9,0.2,2.4-0.7c0.5-0.8,0.2-1.9-0.7-2.4c-0.6-0.3-1.3-0.3-1.8,0.1 l-21.5-20.2l-17.8-21l15,15c-0.1,0.2-0.2,0.3-0.2,0.5c0,0.6,0.5,1,1.1,1c0.6,0,1-0.5,1-1.1c0-0.6-0.5-1-1.1-1 c-0.2,0-0.3,0.1-0.5,0.1l-19.5-19.5l-1.2-1.4l6.3,2.4l35.5,21.6c-0.1,0.3-0.2,0.5-0.2,0.9c0,1,0.8,1.7,1.8,1.7 c1,0,1.7-0.8,1.7-1.8c0-1-0.8-1.7-1.8-1.7c-0.5,0-0.9,0.2-1.2,0.5l-33.1-20.1l38.3,14.7c-0.7,2,0.2,4.3,2.1,5.4 c2.2,1.2,5,0.5,6.2-1.7C259.1,101.7,258.3,98.9,256.1,97.6z M219.7,135.5l-22.4-44.8l0.1-4.3l6.4,7.8l16.2,41.1 C219.9,135.3,219.8,135.4,219.7,135.5z M185.6,89.7l4-8l-2,5.7l-1.8,2.2C185.8,89.6,185.7,89.6,185.6,89.7z M194.1,74.3 c-0.2,0.2-0.3,0.4-0.4,0.7l-0.5-0.2l0.7-0.7L194.1,74.3z M193.1,74.1l0.3-0.6l0.1,0.1L193.1,74.1z M193,73.1l-0.7,1.2 c0,0,0,0-0.1,0l0.5-1.4L193,73.1z M193,72.3L193,72.3L193,72.3L193,72.3z M192.4,72.4l-0.2,0.5L192.4,72.4L192.4,72.4z M194.1,80 l0.4-0.5c0.2,0.2,0.4,0.4,0.7,0.5l-0.3,0.7L194.1,80z M192.6,71.8L192.6,71.8l0-0.3l0.1,0.1L192.6,71.8z M193.8,80.4l0.9,0.8 l-0.3,0.7l-0.9-1.1L193.8,80.4z M195.3,81.1l0.3-0.9c0.1,0,0.2,0.1,0.4,0.1l-0.2,1.2L195.3,81.1z M194.5,73.3L194.5,73.3 L194.5,73.3L194.5,73.3z M194.2,72.8l-0.2-0.3l0.1-0.1L194.2,72.8L194.2,72.8z M192.1,71.2l-2-2.3l0-1l2,2.9L192.1,71.2z M192,71.9l-0.5,2.1c-0.1,0-0.1,0-0.2,0l-1.2-0.5l0.1-3.6L192,71.9z M194.8,82.4l0.3-0.8l0.6,0.6l-0.2,1.1L194.8,82.4z M196.7,72.9c-0.1,0-0.3,0-0.4,0.1c-0.4,0.1-0.7,0.2-1,0.4l-0.3-0.5l1.6-1.8L196.7,72.9z M193.8,71.8l-0.1,0.2l-0.4-0.5l0.1-0.4 L193.8,71.8z M192.5,81.1c0.1,0,0.1-0.1,0.2-0.1L192.5,81.1L192.5,81.1z M193.1,81.2l1.1,1.3l-0.4,1.1l-1-2L193.1,81.2z M194.6,83 l0.9,1.1l-0.3,2.3l-1-2.1L194.6,83z M196,83.9l0.2-1.2l0.7,0.7l0,1.6L196,83.9z M196.3,82.1l0.2-1.6c0.1,0,0.3,0,0.4,0l0,2.1 L196.3,82.1z M198.8,80c0.1-0.1,0.2-0.1,0.3-0.2l0.2,0.2l0.3,0.5l-0.7-0.3L198.8,80z M198.4,73.2L198.4,73.2L198.4,73.2 C198.4,73.2,198.4,73.2,198.4,73.2z M197.2,72.9l-0.2-2.4l1-1.1L197.2,72.9C197.2,72.9,197.2,72.9,197.2,72.9z M196.5,70.4l-1.8,2 l-0.3-0.5l2-3.5L196.5,70.4z M194.1,71.3l-0.4-0.8l2.4-6.9l0.3,3.8L194.1,71.3z M192.9,71l-0.1-0.2l0.1-0.5l0.1,0.2L192.9,71z M189,66.9c0.1,0,0.2-0.1,0.3-0.1l0.4,0.5l0,1.1l-1.3-1.5C188.5,66.9,188.7,66.9,189,66.9z M189.6,69.2l-0.1,4l-0.2-0.1l-2-6.5 L189.6,69.2z M189.2,74.2c-0.2,0.1-0.4,0.2-0.6,0.3l-1.3-1.8l1.7,0.7L189.2,74.2z M188.4,80.5c0,0,0.1,0.1,0.1,0.1l-0.3,0.1 L188.4,80.5z M192,81.2l0.2,0.4l-0.8,1l-0.2-1.2C191.5,81.4,191.7,81.3,192,81.2z M195.9,84.6l1,1.2l-0.1,3.9l-1.3-2.5L195.9,84.6 z M197.4,80.5c0.2,0,0.3-0.1,0.5-0.1l0.6,0.2l2.2,5.6l-3.2-3L197.4,80.5z M200.5,78l0.2,0l2.1,0.6l-2.5-0.3 C200.4,78.2,200.4,78.1,200.5,78z M200.6,77.4c0,0,0-0.1,0-0.1c0.1-0.2,0.1-0.5,0.1-0.8l21.9-0.1L200.6,77.4L200.6,77.4z M199.4,72.6l0.8-0.5l-1.1,1L199.4,72.6z M197.8,73C197.8,73,197.8,73,197.8,73l0.9-4.3l6.7-7.4l-6.4,11L197.8,73z M196.9,69.8 l-0.2-2.3l2.7-4.8l-1.2,5.7L196.9,69.8z M193.3,69.8l-0.2-0.3l2.6-9.9l0.2,2.6L193.3,69.8z M192.4,70.1l-2.2-4l0-0.3 c0.1-0.1,0.1-0.3,0.1-0.4l2.2,4.2L192.4,70.1z M188.7,63.4l-4.9-8.7c0.2-0.2,0.3-0.4,0.4-0.6l5.1,9.5 C189.1,63.5,188.9,63.4,188.7,63.4z M182.7,51.7l-0.3-1l0.5,1C182.9,51.7,182.8,51.7,182.7,51.7z M188.1,63.5 c-0.7,0.2-1.2,0.8-1.3,1.5l-2.7-8.6L188.1,63.5z M188.8,72.8l-2-0.9L163,38.6l23.5,27L188.8,72.8z M188.2,74.9 C188.2,74.9,188.1,74.9,188.2,74.9l-5.3-4.1l3.5,1.5L188.2,74.9z M185.8,76.9l-0.5,0l-1.5-0.2l-5.6-1.3c-0.1-0.2-0.2-0.4-0.3-0.5 L185.8,76.9z M184.7,77.5l0.1,0l-0.3,0L184.7,77.5z M187.7,79.6l-2.2,0.6l2-0.9C187.6,79.4,187.6,79.5,187.7,79.6z M190.3,81.4 c0.1,0,0.3,0,0.4,0l0.3,1.7l-2.3,2.9L190.3,81.4z M192.4,82.1l1.1,2.2l-1.3,3.4l-0.7-4.4L192.4,82.1z M193.8,84.9l1.2,2.3 l-1.4,9.6l-1.3-8.1L193.8,84.9z M195.4,88.1l1.4,2.8l-0.3,23.7l-2.6-16L195.4,88.1z M197.4,85.6l0-1.7l3.7,3.5l2.1,5.3L197.4,85.6 z M199.1,80.9l1,0.4l9.9,13.8l-8.5-8L199.1,80.9z M201.5,82.3l1.5,1.5l18.9,22.4l-9.9-9.3L201.5,82.3z M199.8,79.2 C199.8,79.2,199.8,79.2,199.8,79.2L206,83l-4.5-1.7L199.8,79.2z M247.2,63.3C247.2,63.3,247.2,63.3,247.2,63.3c0,0.2,0,0.4,0,0.6 c0,0.3,0,0.5,0.1,0.8l-46.7,10.9c0,0,0-0.1,0-0.1l0.7-0.3l43-12.6c0.1,0.3,0.3,0.5,0.5,0.7C245.4,64.1,246.5,64,247.2,63.3z M203.4,44.4L199.8,61l-3.1,5.6l-0.3-4.2l6.1-17.7C202.8,44.7,203.1,44.6,203.4,44.4z M175.9,74.4c-0.2,0.1-0.4,0.2-0.5,0.4 l-9.7-2.3c0-0.2-0.1-0.5-0.2-0.7L175.9,74.4z M179,76.2l-0.7-0.1c0,0,0-0.1,0-0.1L179,76.2z M178.1,76.9c0.1-0.1,0.1-0.2,0.1-0.3 l4.4,0.6l-3.5,0.3l-1.5,0C177.8,77.3,178,77.1,178.1,76.9z M173.9,77.8L145,80c0-0.3,0-0.7-0.1-1c-0.2-0.7-0.5-1.3-0.9-1.9 L173.9,77.8z M188,80.1C188,80.1,188.1,80.1,188,80.1l-0.8,1.1l-1.7,0.7c-0.2-0.4-0.5-0.7-0.9-0.8L188,80.1z M185.7,82.3l0.9-0.4 l-0.9,1.2c0-0.1,0.1-0.3,0.1-0.5C185.8,82.5,185.7,82.4,185.7,82.3z M158.5,118.6l29.1-37.1l1.4-0.6c0.1,0.1,0.2,0.1,0.3,0.1 l-5.5,11l-24.4,30.7C159.8,121.3,159.5,119.8,158.5,118.6z M187.1,88.8l-0.2,0.7c-0.1,0-0.2,0-0.3,0L187.1,88.8z M233.5,118.2 c-0.2,0-0.4,0.1-0.5,0.2l-4.8-5.7l5.8,5.4C233.8,118.2,233.7,118.2,233.5,118.2z"},"fill":"#00ADCC"},{"shape":{"type":"path","path":"M262.2,67.6c-0.2-13.8-10.6-33.6-18-40.9c-7.4-7.4-19.9-20.2-43.6-23.9 c-23.7-3.8-45.8,4.5-62.3,19.5c-16.4,15-23.1,37.2-23.3,56.3s9.8,45,37.3,64.4c20.9,14.7,35.6,19.2,48.9,20.1 c13.3,0.9,21-5.4,27.3-10.4s11.9-16.9,15.9-24.7c4-7.7,11.4-21.7,14.6-30.2C262.2,89.3,262.4,81.3,262.2,67.6z M195.7,143.5 c0,0-22.2-8.9-37-37.8s1-47.2,13.1-53.8s27.2,0.9,30.6,8.5c3.5,7.6,2.9,21.9,4.8,28c2,6.1,7.9,21,10,30.7 C219.4,128.9,217.7,151.1,195.7,143.5z"},"fill":"#F9B2A6"},{"shape":{"type":"path","path":"M258.9,60.2c-1.7-14.7-19.7-36.5-28.6-41.4 c-8.9-4.9-39.3-22.4-72.9-2.5c-33.6,19.9-34.7,52.5-34.9,58.3c-0.2,5.7-1.5,38.6,31.3,62.7s50.1,21.5,50.1,21.5 c17.2-0.4,25.2-10.2,28.7-14.2c3.5-4,9.2-15.2,19.9-35.7C263.2,88.3,260.6,75,258.9,60.2z M233.4,45.8c-1.8,7-7.9,20.7-8.8,35.1 c-0.8,14.4,8.9,33,4.9,48s-20.2,18.6-30.4,17.3c0,0-27.6,2.8-63.6-40.7c-36-43.5,22.5-78.3,26.4-80.3s34.6-16.4,56.2-8.5 S235.2,38.8,233.4,45.8z"},"fill":"#73C9C3"}],"id":"O"},{"shape":{"type":"path","path":"M44.1,109.6C34.9,94.8,3.6,85.7-1.1,84.4c3.9-6.5,25.2-40.1,45.2-29.2 c27,14.7,45.8-15,45.8-15s-35.8,2.3-45.8-13.7C34.2,10.5-1.6,1.1-1.6,1.1l-0.1,83.1l0,0v83.1c0,0,23.7-41.1,45.8-29.1 c27,14.7,45.8-15,45.8-15S54.1,125.6,44.1,109.6z"},"fill":"#81CECB","id":"B"}]}}
},{}],372:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LogoAnimation = undefined;

var _renderer = require('../graphics/renderer.jsx');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var LogoAnimation = function LogoAnimation(canvas) {
  _classCallCheck(this, LogoAnimation);

  this.graphics = new _renderer.LogoRenderer(canvas);
};

exports.LogoAnimation = LogoAnimation;

},{"../graphics/renderer.jsx":375}],373:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SVG = require('svg.js');
var _svg = SVG('svg');

var simplify = require('simplify-path');
var normalize = require('normalize-path-scale');
var contours = require('svg-path-contours');
var triangulate = require('triangulate-contours');
var parse = require('parse-svg-path');
var getBBox = require('svg-path-bounding-box');

var matterSVG = Matter.Svg;

var AnimatedPath = function () {
  function AnimatedPath(obj, canvas) {
    _classCallCheck(this, AnimatedPath);

    this.d = obj.shape.d || obj.shape.path;
    this.canvas = canvas;
    this.fill = obj.fill || 'black';

    this.pointSize = 2;

    this.ctx = this.canvas.getContext('2d');

    this._svg = _svg.path(this.d);
    this._node = this._svg.node;
    this._path2d = new Path2D(this.d);

    this.index = 0;
    this.dt = 0;
    this.index = 0;
  }

  _createClass(AnimatedPath, [{
    key: 'draw',
    value: function draw() {
      this.ctx.fillStyle = this.fill || 'black';
      this.ctx.stroke(this._path2d);
    }
  }, {
    key: 'getPointAtLength',
    value: function getPointAtLength(length) {
      return this._node.getPointAtLength(length);
    }
  }, {
    key: 'update',
    value: function update() {
      this.render(this.canvas.getContext('2d'), this.canvas.width, this.canvas.height, this.dt);

      if (this.currentPoint++ > this.totalLength) {
        this.currentPoint = 0;
      }

      var pt = this.getPointAtLength(this.currentPoint);

      return pt;
    }
  }, {
    key: 'render',
    value: function render(ctx, width, height, dt) {
      this.timer += dt;

      if (this.timer > 1000) {
        this.timer = 0;
        this.index++;
        update();
      }

      ctx.fillStyle = '#121212';
      ctx.globalAlpha = 0.9;
      ctx.save();
      ctx.lineWidth = 1;

      var fn = function fn(m) {
        return m.positions.length > 0;
      };

      var _triangles = this.getTriangles(this.contours, this.threshold);

      ctx.save();
      ctx.translate(0, 0);
      ctx.beginPath();

      this.drawTriangles(ctx, _triangles);
      ctx.lineWidth = 1;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.stroke();
      ctx.restore();
    }
  }, {
    key: 'drawTriangles',
    value: function drawTriangles(ctx, complex) {
      var v = complex.positions;

      complex.cells.forEach(function (f) {
        var v0 = v[f[0]],
            v1 = v[f[1]],
            v2 = v[f[2]];

        var p1, p2, p3;

        ctx.beginPath();
        ctx.moveTo(v0[0], v0[1]);

        var _s = 5;
        p1 = new Path2D();
        p1.moveTo(v1[0], v1[1]);
        p1.arc(v1[0], v1[1], _s, 0, 2 * Math.PI);

        p2 = new Path2D();
        p2.moveTo(v2[0], v2[1]);
        p2.arc(v2[0], v2[1], _s, 0, 2 * Math.PI);

        p3 = new Path2D();
        p3.moveTo(v0[0], v0[1]);
        p3.arc(v0[0], v0[1], _s, 0, 2 * Math.PI);

        ctx.lineTo(v1[0], v1[1]);
        ctx.lineTo(v2[0], v2[1]);
        ctx.lineTo(v0[0], v0[1]);

        ctx.strokeStyle = "green";
        ctx.stroke();
        ctx.closePath();
        ctx.save();

        ctx.closePath();
        ctx.beginPath();
        ctx.fillStyle = 'rgba( 255,0,0, 1)';
        ctx.stroke(p1);
        ctx.fill(p1);
        ctx.closePath();

        ctx.fillStyle = 'rgba(0,255,0,1)';
        ctx.beginPath();
        ctx.stroke(p2);
        ctx.fill(p2);
        ctx.closePath();

        ctx.fillStyle = 'rgba( 0, 0, 255, 1)';
        ctx.beginPath();
        ctx.stroke(p3);
        ctx.fill(p3);
        ctx.closePath();

        ctx.restore();
      });
    }
  }, {
    key: 'getPolygons',
    value: function getPolygons(complex) {
      var v = complex.positions;
      var polygons = [];

      var fn = function fn(f) {
        var v0 = v[f[0]],
            v1 = v[f[1]],
            v2 = v[f[2]];

        var x1, y1;
        var x2, y2;
        var x3, y3;

        var p1, p2, p3;

        p1 = { x: Math.floor(v1[0]), y: Math.floor(v1[1]) };
        p2 = { x: Math.floor(v2[0]), y: Math.floor(v2[1]) };
        p3 = { x: Math.floor(v0[0]), y: Math.floor(v0[1]) };

        var t = [p1, p2, p3];
        polygons.push(t);
      };

      complex.cells.forEach(fn);

      return polygons;
    }
  }, {
    key: 'toMesh',
    value: function toMesh(contents) {
      var threshold = 2;
      var scale = 10;
    }
  }, {
    key: 'getTriangles',
    value: function getTriangles(contours, threshold) {
      var fn = function fn(path) {
        return simplify(path, threshold);
      };

      var lines = contours.map(fn);

      var c = triangulate(lines);
      //c.positions = normalize( c.positions );
      return c;
    }
  }, {
    key: 'contours',
    get: function get() {
      return contours(parse(this.d));
    }
  }, {
    key: 'bbox',
    get: function get() {
      return getBBox(this.d);
    }
  }, {
    key: 'x',
    get: function get() {
      return this.bbox.x1;
    }
  }, {
    key: 'y',
    get: function get() {
      return this.bbox.y1;
    }
  }, {
    key: 'matterPath',
    get: function get() {
      return matterSVG.pathToVertices(this.d, 30);
    }
  }, {
    key: 'width',
    get: function get() {
      return this.bbox.width;
    }
  }, {
    key: 'height',
    get: function get() {
      return this.bbox.height;
    }
  }, {
    key: 'svgNode',
    get: function get() {
      return this._node;
    }
  }, {
    key: 'totalLength',
    get: function get() {
      return ~ ~this._node.getTotalLength();
    }
  }]);

  return AnimatedPath;
}();

var proto = AnimatedPath.prototype;
proto.threshold = 0.1;

proto.currentPoint = 0;

exports.AnimatedPath = AnimatedPath;

},{"normalize-path-scale":307,"parse-svg-path":311,"simplify-path":330,"svg-path-bounding-box":333,"svg-path-contours":345,"svg.js":346,"triangulate-contours":352}],374:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LogoAnimation = undefined;

var _renderer = require('../renderer.jsx');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var LogoAnimation = function LogoAnimation() {
  _classCallCheck(this, LogoAnimation);

  this.graphics = new _renderer.LogoRenderer();
};

exports.LogoAnimation = LogoAnimation;

},{"../renderer.jsx":375}],375:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Group = exports.LogoRenderer = undefined;

var _animatedPath = require('./animatedPath.jsx');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _marked = [shapes].map(regeneratorRuntime.mark);

var json = require("../../json/logo.json");

var SVG = require('svg.js');
var _svg = SVG('svg');

function shapes(json) {
  var clean, object, _obj, a;

  return regeneratorRuntime.wrap(function shapes$(_context) {
    while (1) switch (_context.prev = _context.next) {
      case 0:
        clean = function clean(shape, parent) {

          if (!shape.shape && !shape.groupShape) {
            for (var child in shape.children) {
              var _tmp = shape.children[child];
              clean(_tmp, parent);
            }
          } else if (shape.groupShape) {
            console.log(shape);
            parent.push(shape);
          } else {
            var s = shape.groupShape ? { shape: shape, groupShape: true } : shape;
            parent.push(s);
          }
          //return (shape.children) ? shape : clean(shape);
        };

        _context.t0 = regeneratorRuntime.keys(json);

      case 2:
        if ((_context.t1 = _context.t0()).done) {
          _context.next = 12;
          break;
        }

        object = _context.t1.value;
        _obj = json[object];

        _obj.gfx = [];

        a = clean(_obj, _obj.gfx);

        delete _obj.children;

        _context.next = 10;
        return _obj;

      case 10:
        _context.next = 2;
        break;

      case 12:
      case 'end':
        return _context.stop();
    }
  }, _marked[0], this);
}

var GFXChildren = function () {
  function GFXChildren(length) {
    _classCallCheck(this, GFXChildren);

    this.children = [];
  }

  // Add the SVG group

  _createClass(GFXChildren, [{
    key: 'add',
    value: function add(child) {
      this.children.push(child);
    }
  }, {
    key: 'groups',
    get: function get() {
      return this;
    }
  }]);

  return GFXChildren;
}();

var Group = function () {
  function Group(obj, canvas) {
    var _this = this;

    _classCallCheck(this, Group);

    this.canvas = canvas;
    this.gfx = obj.gfx;
    this.id = obj.id;

    this.paths = [];

    this.gfx.forEach(function (el, idx, arr) {
      _this.create(el);
    });

    this.getBBox();
  }

  _createClass(Group, [{
    key: 'create',
    value: function create(obj, idx, array) {
      if (obj.groupShape) return;
      var shape = obj.shape || obj.shape.shape;
      var _d = shape.d || shape.path;

      var p = new _animatedPath.AnimatedPath(obj, this.canvas);

      this.paths.push(p);
    }
  }, {
    key: 'getBBox',
    value: function getBBox() {
      console.log('------');
      console.log(this.paths.length);

      if (this.paths.length == 1) {
        var bb = this.paths[0].bbox;
        this.x1 = bb.x1;
        this.x2 = bb.x2;
        this.y1 = bb.y1;
        this.y2 = bb.y2;

        this.width = bb.width;
        this.height = bb.height;
      } else {
        var x1, x2, y1, y2;

        for (var _path in this.paths) {
          var _p = this.paths[_path];
          var _bb = _p.bbox;

          x1 = x1 !== undefined ? x1 : _bb.x1;
          x2 = x2 !== undefined ? x2 : _bb.x2;
          y1 = y1 !== undefined ? y1 : _bb.y1;
          y2 = y2 !== undefined ? y2 : _bb.y2;

          x1 = x1 < _bb.x1 ? x1 : _bb.x1;
          x2 = x2 > _bb.x2 ? x2 : _bb.x2;
          y1 = y1 < _bb.y1 ? y1 : _bb.y1;
          y2 = y2 > _bb.y2 ? y2 : _bb.y2;
        }

        this.x1 = x1;
        this.x2 = x2;
        this.y1 = y1;
        this.y2 = y2;

        var r = Math.round;

        this.width = r(x2 - x1);
        this.height = r(y2 - y1);
      }
    }
  }]);

  return Group;
}();

Group.prototype.paths = [];

var LogoRenderer = function () {
  function LogoRenderer(canvas) {
    _classCallCheck(this, LogoRenderer);

    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');

    this.setupGraphics();
  }

  _createClass(LogoRenderer, [{
    key: 'draw',
    value: function draw(obj, idx, arr) {

      //p.draw();
    }
  }, {
    key: 'setupGraphics',
    value: function setupGraphics() {
      //var gen = cleanJSON(json);
      var gfx = json.letters.children;

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = shapes(gfx)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var obj = _step.value;

          console.log(obj);
          var _group = new Group(obj, this.canvas);
          this.groups.push(_group);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }
  }, {
    key: 'animate',
    value: function animate() {
      var _this2 = this;

      /*
      for( var path in this.paths ){
        var _path = this.paths[path];
        var pt = _path.update();
        var p = new Path2D();
         p.moveTo( pt.x, pt.y );
        p.arc( pt.x, pt.y, 1, 0, Math.PI * 2);
        
        this.ctx.stroke( p );
      }
      this.ctx.fillStyle = 'rgba( 255, 255, 255, 1 )';
      //this.ctx.fillRect(0,0,this.canvas.width, this.canvas.heigth);
      //*/

      window.requestAnimationFrame(function () {
        return _this2.animate();
      });
    }
  }]);

  return LogoRenderer;
}();

var _proto = LogoRenderer.prototype;
_proto.graphics = new GFXChildren(0);
_proto.paths = [];
_proto.groups = [];

exports.LogoRenderer = LogoRenderer;
exports.Group = Group;

},{"../../json/logo.json":371,"./animatedPath.jsx":373,"svg.js":346}],376:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// functionality

var Grid = function () {
  function Grid(canvas) {
    _classCallCheck(this, Grid);

    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');

    this.setup();
  }

  _createClass(Grid, [{
    key: "setup",
    value: function setup() {
      this.ctx.strokeStyle = "rgba( 0, 0, 255, 0.4)";
      this.ctx.lineWidth = 0.5;
    }
  }, {
    key: "draw",
    value: function draw() {
      var i = 1;

      var xSpacing = this.size.width / this.amount;
      var ySpacing = this.size.height / this.amount;

      while (i < this.amount) {
        var sx, sy;

        sx = 0;
        sy = 0;

        this.ctx.beginPath();
        this.ctx.moveTo(i * xSpacing, 0);
        this.ctx.lineTo(i * xSpacing, this.size.height);

        this.ctx.moveTo(0, i * ySpacing);
        this.ctx.lineTo(this.size.width, i * ySpacing);
        this.ctx.stroke();

        ++i;
      }
    }
  }, {
    key: "size",
    get: function get() {
      return {
        width: this.canvas.width,
        height: this.canvas.height
      };
    }
  }]);

  return Grid;
}();

// properties

var _proto = Grid.prototype;
_proto.amount = 90;

exports.Grid = Grid;

},{}],377:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies;

var Physics = function () {
  function Physics(canvas) {
    var _this = this;

    _classCallCheck(this, Physics);

    var renderOptions = {
      render: {
        element: canvas,
        controller: Matter.RenderPixi,
        options: {
          width: this.width,
          height: this.height,
          background: "#ffffff",
          wireframes: false,
          positionIterations: 6,
          velocityIterations: 4,
          enableSleeping: false,
          metrics: { extended: true }
        }
      }
    };

    this.engine = Engine.create(renderOptions);

    this.canvas = canvas;
    this.setupEvents();
    this.createWorld();

    document.body.addEventListener('mousedown', function () {
      console.log('mouse down');

      for (var letter in _this.letterShapes) {
        var _shape = _this.letterShapes[letter];

        Matter.Sleeping.set(_shape, false);
      };
    });

    // run the engine
    Engine.run(this.engine);
  }

  _createClass(Physics, [{
    key: 'setupEvents',
    value: function setupEvents() {
      Matter.Events.on(this.engine, "afterUpdate", this.afterUpdate.bind(this));
      Matter.Events.on(this.engine, "beforeUpdate", this.beforeUpdate.bind(this));
    }
  }, {
    key: 'beforeUpdate',
    value: function beforeUpdate(event) {}
  }, {
    key: 'afterUpdate',
    value: function afterUpdate(event) {
      return;
      var _time = ~ ~(event.timestamp / 10);

      if (_time % this.rate == 1) {
        this.createBodies();
      }
    }
  }, {
    key: 'createWorld',
    value: function createWorld() {
      var ground = Bodies.rectangle(-25, this.height / 2, 50, this.height, { isStatic: true });
      var groundA = Bodies.rectangle(this.width + 25, this.height / 2, 50, this.height, { isStatic: true });
      var groundB = Bodies.rectangle(this.width / 2, this.height + 25, this.width, 50, { isStatic: true });
      World.add(this.engine.world, ground);
      World.add(this.engine.world, groundA);
      World.add(this.engine.world, groundB);
    }
  }, {
    key: 'createBodies',
    value: function createBodies() {
      var _this2 = this;

      var fn = function fn() {
        var min = 5;
        var max = 50;
        var _size = Math.max(min, Math.random() * max);

        var options = {
          mass: 100,
          restitution: Math.random(),
          render: {
            fillStyle: 'black',
            strokeStyle: 'black'
          }
        };

        if (_this2.count > _this2.maxCount) {
          var _body = _this2.circs.splice(0, 1);
          World.remove(_this2.engine.world, _body);
        }

        _this2.count++;

        var body = Bodies.circle(Math.random() * _this2.width, Math.min(-50, Math.random() * -500), _size, options);
        _this2.circs.push(body);

        World.add(_this2.engine.world, body);
      };

      fn();
    }
  }, {
    key: 'addVertex',
    value: function addVertex(polygons) {
      var _composite = Matter.Composite.create();

      var options = {
        isSleeping: true,
        render: {
          lineWidth: 0
        }
      };

      for (var polygon in polygons) {
        var poly = polygons[polygon];

        poly.sort(function (a, b) {
          var x1 = b.x - a.x;

          return x1 == 0 ? a.y - b.y : a.x - b.x;
        });

        var body = Matter.Body.create(options);
        var _vert = Matter.Vertices.create(poly, body);

        var _body = Bodies.fromVertices(0, 0, _vert, options);
        _body.render.fillStyle = Matter.Common.choose(['#666', '#777', '#222', '#333', '#444', '#555']);

        var num = 0;
        var _p = poly[num];

        var _c = Matter.Vertices.centre(_vert);
        var _cx = _c.x,
            _cy = _c.y;

        var _px = _p.x;
        var _py = _p.y;

        var vector = Matter.Vector.create(_cx, _cy);

        Matter.Composite.add(_composite, _body);
        this.letterShapes.push(_body);

        Matter.Body.translate(_body, vector);
      }
      World.add(this.engine.world, _composite);
      this.composites.push(_composite);
    }
  }, {
    key: 'physicsCanvas',
    get: function get() {
      return this.engine.render.canvas;
    }
  }]);

  return Physics;
}();

var proto = Physics.prototype;
proto.bodies = [];

proto.width = 1900;
proto.height = 900;

proto.rate = 10;
proto.circs = [];
proto.count = 0;
proto.maxCount = 200;

proto.letterShapes = [];
proto.composites = [];

exports.Physics = Physics;

},{}],378:[function(require,module,exports){
"use strict";

},{}],379:[function(require,module,exports){
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ThreeD = undefined;

var _meshReindex = require('mesh-reindex');

var _meshReindex2 = _interopRequireDefault(_meshReindex);

var _unindexMesh = require('unindex-mesh');

var _unindexMesh2 = _interopRequireDefault(_unindexMesh);

var _arrayShuffle = require('array-shuffle');

var _arrayShuffle2 = _interopRequireDefault(_arrayShuffle);

var _svgMesh3d = require('svg-mesh-3d');

var _svgMesh3d2 = _interopRequireDefault(_svgMesh3d);

var _triangleCentroid = require('triangle-centroid');

var _triangleCentroid2 = _interopRequireDefault(_triangleCentroid);

var _tweenr = require('tweenr');

var _tweenr2 = _interopRequireDefault(_tweenr);

var _random = require('gl-vec3/random');

var _random2 = _interopRequireDefault(_random);

var _dhaakAnim = require('dhaak-anim');

var _frag = require('../../shaders/frag.jsx');

var _vert = require('../../shaders/vert.jsx');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var createGeom = require('three-simplicial-complex')(THREE);

var mat4 = require('gl-mat4');

var maxWidth = 151;
var maxHeight = 163;

var _ = require('underscore');
var svgBbox = require('svg-path-bounding-box');

//var buffer = require('three-buffer-vertex-data')

var OrbitControls = require('three-orbit-controls')(THREE);

var Letter = function () {
  function Letter(svg, delay) {
    _classCallCheck(this, Letter);

    this.delay = delay;
    this.create(svg);
  }

  _createClass(Letter, [{
    key: 'getAnimationAttributes',
    value: function getAnimationAttributes(positions, cells) {
      var directions = [];
      var centroids = [];

      for (var i = 0; i < cells.length; ++i) {
        var _cells$i = _slicedToArray(cells[i], 3);

        var f0 = _cells$i[0];
        var f1 = _cells$i[1];
        var f2 = _cells$i[2];

        var triangle = [positions[f0], positions[f1], positions[f2]];
        var center = (0, _triangleCentroid2.default)(triangle);
        var dir = new THREE.Vector3().fromArray(center);

        centroids.push(dir, dir, dir);

        var random = (0, _random2.default)([], Math.random());
        var anim = new THREE.Vector3().fromArray(random);

        directions.push(anim, anim, anim);
      }
      return {
        direction: { type: 'v3', value: directions },
        centroid: { type: 'v3', value: centroids }
      };
    }
  }, {
    key: 'createMesh',
    value: function createMesh(svg) {
      var _bb = svgBbox(svg);

      this.x = _bb.x1;
      this.y = _bb.y1;

      this.width = _bb.width;
      this.height = _bb.height;

      var options = {
        scale: 40,
        simplify: 0.01,
        randomization: 2000
      };

      var complex = (0, _svgMesh3d2.default)(svg, options);

      complex = (0, _meshReindex2.default)((0, _unindexMesh2.default)(complex.positions, complex.cells));

      return complex;
    }
  }, {
    key: 'create',
    value: function create(svg) {
      console.log(svg);
      var _d = new Date().getMilliseconds();
      console.log(_d);
      var _complex = this.createMesh(svg.d);
      //this.x = svg.x;
      //this.y = svg.y;

      this.bWidth = svg.bWidth;
      this.bHeight = svg.bHeight;

      console.log('elapsed time');
      console.log((_d - new Date().getMilliseconds()) / 1000, ' seconds');
      console.log('------------');

      this.fill = svg.fill;
      var _attributes = this.getAnimationAttributes(_complex.positions, _complex.cells);

      this.geometry = new createGeom(_complex);

      // set up our geometry
      //this.geometry = new THREE.BufferGeometry()

      //buffer.index( this.geometry, _complex.cells );

      //buffer.attr( this.geometry, 'position', _complex.positions)
      //buffer.attr( this.geometry,'direction', new THREE.BufferAttribute( (_attributes.direction), 3 ));
      //buffer.attr( this.geometry, 'centroid', new THREE.BufferAttribute( (_attributes.centroid), 3 ));

      var _color = new THREE.Color(this.fill);
      var v3 = new THREE.Vector3(_color.r, _color.g, _color.b);

      var _materialOptions = {
        color: 0xff000000,
        side: THREE.DoubleSide,
        vertexShader: _vert.vertShader,
        fragmentShader: _frag.fragShader,
        wireframe: false,
        //wireframe: true,
        transparent: false,
        attributes: _attributes,
        uniforms: {
          color: { type: 'c', value: _color },
          opacity: { type: 'f', value: 1 },
          scale: { type: 'f', value: 0 },
          animate: { type: 'f', value: 0 }
        }
      };

      this.material = new THREE.ShaderMaterial(_materialOptions);
      this.mesh = new THREE.Mesh(this.geometry, this.material);

      //this.scene.add( mesh );

      //this.animate();
      //this.explode();
    }
  }, {
    key: 'explode',
    value: function explode() {
      var _t = new _tweenr2.default();
      var _delay = this.delay;
      var _duration = 0.25;

      var _ease = 'quadOut';

      var options = {
        value: 1,
        duration: _duration,
        delay: _delay,
        ease: _ease
      };

      var node = [this.material.uniforms.animate, this.material.uniforms.scale];

      var _reverse = {
        value: 0,
        duration: _duration,
        ease: _ease
      };

      var _reverseFn = function _reverseFn() {
        var _o = _.clone(options);
        _o.value = 0;
        _o.delay = 6;

        _t.to(node[0], _o);
        _t.to(node[1], _o).on('complete', function () {
          options.delay = _delay + 4;
          _t.to(node[0], options).on('complete', _reverseFn);
          _t.to(node[1], options);
        });
      };

      _t.to(node[0], options).on('complete', _reverseFn);
      _t.to(node[1], options);
    }
  }, {
    key: 'scale',
    get: function get() {
      console.log(this.bWidth, this.bHeight, this.height, this.width);

      return {
        sy: Math.min(1, this.height / this.bHeight),
        sx: Math.min(1, this.width / this.bWidth)
      };
    }
  }]);

  return Letter;
}();

var ThreeD = function () {
  function ThreeD(canvas) {
    _classCallCheck(this, ThreeD);

    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      background: 'white',
      devicePixelRatio: window.devicePixelRatio
    });

    this.renderer.setClearColor(0xffffff);

    this.scene = new THREE.Scene();

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 1000);
    this.camera.position.set(0, 0, 7);

    this.camera.lookAt(new THREE.Vector3());

    //OrbitControls.prototype.target = new THREE.Vector3();

    //var controls = OrbitControls( this.camera );

    this.render();
  }

  _createClass(ThreeD, [{
    key: 'convertPoint',
    value: function convertPoint(point2d) {
      //var projector = new THREE.Projector();
      this.camera.updateMatrixWorld();

      var point = new THREE.Vector3().project(this.camera);
      var elem = this.renderer.domElement;

      //point.x = point2d.x - 1 * ( 2 / this.width)
      //point.x = point2d.y + 1 * -( 2 / this.height)
      point.x = (point2d.x + 1) / (2 * this.width);
      point.y = -(point2d.y - 1) / (2 * this.height);
      point.z = 0.5;

      //console.log(point2d.x / this.width);

      return point.unproject(this.camera);
      //return point;
    }
  }, {
    key: 'create',
    value: function create(svg) {
      var letter = new Letter(svg, 10 - this.letters.length);

      this.letters.push(letter);

      this.scene.add(letter.mesh);

      var _v = new THREE.Vector3(0, 0, 0);

      var _factor = 100;

      var _x = letter.x / 612 * 10;
      var _y = letter.y / _factor;

      var _vv = this.convertPoint(letter);

      var vector = new THREE.Vector3(letter.x / (0.5 * 7.5), letter.y / (0.5 * 7.5), 0.5);

      console.log(_vv);
      letter.mesh.position.set(_x - 3.5, _y + 0.2, 0.5);
      letter.explode();

      //console.log( letter.width, letter.height );
      //console.log( letter.scale.sx, letter.scale.sy );
    }
  }, {
    key: 'render',
    value: function render() {
      var _this = this;

      //this.camera.position.set( this.camera.position.x, this.camera.position.y, this.camera.position.z - this.count );
      this.renderer.render(this.scene, this.camera);

      window.requestAnimationFrame(function () {
        return _this.render();
      });
    }
  }]);

  return ThreeD;
}();

var proto = ThreeD.prototype;
proto.tweenr = new _tweenr2.default({ defaultEase: 'quadIn' });
proto.meshCount = 0;
proto.letters = [];
proto.count = 0.001;
function createNoisyEasing(randomProportion, easingFunction) {
  var normalProportion = 1.0 - randomProportion;
  return function (k) {
    return randomProportion * Math.random() + normalProportion * easingFunction(k);
  };
}
exports.ThreeD = ThreeD;

},{"../../shaders/frag.jsx":383,"../../shaders/vert.jsx":384,"array-shuffle":5,"dhaak-anim":235,"gl-mat4":284,"gl-vec3/random":299,"mesh-reindex":304,"svg-mesh-3d":332,"svg-path-bounding-box":333,"three-orbit-controls":349,"three-simplicial-complex":350,"triangle-centroid":351,"tweenr":359,"underscore":364,"unindex-mesh":365}],380:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var View = function View() {
  _classCallCheck(this, View);
};

exports.View = View;

},{}],381:[function(require,module,exports){
"use strict";

},{}],382:[function(require,module,exports){
"use strict";

},{}],383:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var fragShader = "\nuniform float animate;\nuniform float opacity;\n\nuniform vec3 color;\n\nvoid main() {\n  gl_FragColor = vec4( color.rgb, opacity);\n  //gl_FragColor = vec4( vec3( 1.0, 0.0, 0.0), opacity);\n}\n";

exports.fragShader = fragShader;

},{}],384:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var vertShader = "\nattribute vec3 direction;\nattribute vec3 centroid;\n\nuniform float animate;\nuniform float opacity;\nuniform float scale;\n\n#define PI 3.14\n\nvoid main() {\n  // rotate the triangles\n  // each half rotates the opposite direction\n  float theta = (1.0 - animate) * (PI * 0.5 ) * sign(centroid.x);\n\n  mat3 rotMat = mat3(\n    vec3(-cos(theta) * 2.0, 3.0, sin(theta) * 4.0),\n    vec3(4.0, 3.0, cos(theta) * 2.0),\n    vec3(-sin(theta) * 3.0, 3.0, 2.0 * cos(theta))\n  );\n\n  // push outward\n  vec3 offset = mix(vec3(0.0), direction.xyz * rotMat, 1.0 - animate);\n\n  // scale triangles to their centroids\n  vec3 tPos = mix(centroid.xyz, position.xyz, 1.0) + offset;\n  //vec3 tPos = vec3(0.0);\n\n  gl_Position = projectionMatrix *\n              modelViewMatrix *\n              vec4(tPos, 1.0);\n}\n";

exports.vertShader = vertShader;

},{}]},{},[370,372,373,374,375,376,377,378,379,380,381,382,383,384]);

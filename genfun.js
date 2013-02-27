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
;(function(window) {
    /*
     * Genfun
     *
     * Creates generic functions capable of multiple dispatch across
     * several arguments.
     *
     * TODO:
     *
     * * Test code in lesser browsers (see: IE7/IE8).
     *   May only need to shim forEach.
     *
     * * Try out alternative syntax for addMethod (not really exciting, but
     *   it might be fun to try it out)
     *
     * * Method combination (or at least next_method())
     *
     * Optimization:
     *
     * * Use partial dispatch trick
     *
     * * Use integers/bitfields for rank vectors instead of arrays
     *
     * * Don't bother adding roles to Object.prototype, except for position 0
     *
     * * Caching
     *
     * * See if v8/*monkey/etc provide any useful access to maps.
     *
     * * Keep trying things until genfuns are as fast as native methods
     *  (probably impossible).
     */
    function Genfun() {
        var genfun = this;
        var fun = function() {
            return apply_genfun(genfun, this, arguments);
        };
        fun.genfun = genfun;
        fun.addMethod = function(participants, func) {
            add_method(genfun, participants, func);
        };
        fun.removeMethod = function(participants) {
            remove_method(genfun, participants);
        };
        return fun;
    };

    function add_method(genfun, participants, func) {
        return new Method(genfun, participants, func);
    };

    function remove_method(genfun, participants) {
        throw Error("not yet implemented");
    };

    function apply_genfun(genfun, newthis, args) {
        var applicable_methods = compute_applicable_methods(genfun, args);
        if (applicable_methods.length) {
            return applicable_methods[0].func.apply(newthis, args);
        } else {
            throw Error("No applicable methods");
        }
    };

    function compute_applicable_methods(genfun, args) {
        args = [].slice.call(args);
        var discovered_methods = [];
        function find_and_rank_roles(object, hierarchy_position, index) {
            var roles = object.hasOwnProperty("__roles__")?object.__roles__:[];
            roles.forEach(function(role) {
                if (role.method.genfun === genfun && index === role.position) {
                    if (discovered_methods.indexOf(role.method) < 0) {
                        clear_rank(role.method);
                        discovered_methods.push(role.method);
                    }
                    set_rank_hierarchy_position(
                        role.method, index, hierarchy_position);
                }
            });
            // When a discovered method would receive more arguments than
            // were specialized, we pretend all extra arguments have a role
            // on Object.prototype.
            if (object === Object.prototype) {
                discovered_methods.forEach(function(method) {
                    if (method.participants.length <= index) {
                        set_rank_hierarchy_position(
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
                    is_fully_specified(method));
        });
        applicable_methods.sort(function(a, b) {
            return score(a) > score(b);
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
     * TODO:
     *
     * * Method redefinition: overwrite methods with identical specs
     *
     * * removeMethod(): Remove a method exactly matching a given spec
     */
    function Method(genfun, participants, func) {
        var method = this;
        method.genfun = genfun;
        method.participants = participants;
        method.func = func;
        method._rank = [];
        var tmp_participants = method.participants.length?
                method.participants:
                [Object.prototype];
        for (var i = 0, participant; i < tmp_participants.length; i++) {
            participant = tmp_participants.hasOwnProperty(i)?
                tmp_participants[i]:
                Object.prototype;
            // __roles__ was deemed Good Enough™ by the committee for
            // arbitrary property definition
            if (!participant.hasOwnProperty("__roles__")) {
                Object.defineProperty(
                    participant, "__roles__", {value: [], enumerable: false});
            };
            // HACK - no method replacement now, so we just shove it in a
            // place where it'll always show up first. This would probably
            // seriously break method combination if we had it.
            participant.__roles__.unshift(new Role(method, i));
        }
    };

    function set_rank_hierarchy_position(method, index, hierarchy_position) {
        method._rank[index] = hierarchy_position;
    };

    function clear_rank(method) {
        method._rank = [];
    };

    function is_fully_specified(method) {
        for (var i = 0; i < method.participants.length; i++) {
            if (!method._rank.hasOwnProperty(i)) {
                return false;
            }
        }
        return true;
    };

    function score(method) {
        // TODO - this makes all items in the list equal
        return method._rank.reduce(function(a, b) { return a + b; }, 0);
    };

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

    /*
     * Export
     *
     * Snippet for AMD support taken partially from lodash
     */

    if (window) window.Genfun = Genfun;

    if (typeof define == "function" &&
        typeof define.amd == "object" &&
        define.amd) {
        define(function() {
            return {
                Genfun: Genfun,
                add_method: add_method,
                remove_method: remove_method};
        });
    }
})(this);

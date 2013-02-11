(function(window) {
    /*
     * Genfun
     *
     * Creates generic functions capable of multiple dispatch across
     * several arguments.
     *
     * TODO:
     *
     * * More portability (currently rely on 1.8.0+ features)
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
     * * See if v8/*monkey/etc provide any implementation-specific access to maps.
     */
    function Genfun() {
        var genfun = this;
        var fun = function() {
            genfun.apply(this, arguments);
        };
        fun.genfun = genfun;
        fun.addMethod = function() {
            genfun.addMethod.apply(genfun, arguments);
        };
        return fun;
    };

    /*
     * Returns a useful dispatch object for value using a process similar to
     * the ToObject operation specified in http://es5.github.com/#x9.9
     *
     */
    Genfun.prototype.dispatchable_object = function(value) {
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

    Genfun.prototype.apply = function(newthis, args) {
        var applicable_methods = this.compute_applicable_methods(args);
        if (applicable_methods.length) {
            applicable_methods[0].func.apply(newthis, args);
        } else {
            throw Error("No applicable methods");
        }
    };

    Genfun.prototype.compute_applicable_methods = function(args) {
        args = [].slice.call(args);
        var discovered_methods = [];
        var genfun = this;
        function find_and_rank_roles(object, hierarchy_position, index) {
            var roles = object.hasOwnProperty("__roles__")?object.__roles__:[];
            roles.forEach(function(role) {
                if (role.method.genfun === genfun && index === role.position) {
                    if (discovered_methods.indexOf(role.method) < 0) {
                        role.method.clear_rank();
                        discovered_methods.push(role.method);
                    }
                    role.method.set_rank_hierarchy_position(index, hierarchy_position);
                }
            });
            // When a discovered method would receive more arguments than
            // were specialized, we pretend all extra arguments have a role
            // on Object.prototype.
            if (object === Object.prototype) {
                discovered_methods.forEach(function(method) {
                    if (method.participants.length <= index) {
                        method.set_rank_hierarchy_position(index, hierarchy_position);
                    }
                });
            }
        };
        // We dispatch 'default' methods if the argument list was empty by
        // pretending an Object.prototype object was passed in, but only
        // for dispatch.
        (args.length?args:[Object.prototype]).forEach(function(arg, index) {
            get_precedence_list(genfun.dispatchable_object(arg))
                .forEach(function(obj, hierarchy_position) {
                    find_and_rank_roles(obj, hierarchy_position, index);
                });
        });
        var applicable_methods = discovered_methods.filter(function(method) {
            // This ||1 works with the above hack, for 0-arity calls.
            return ((args.length||1) === method._rank.length &&
                    method.is_fully_specified());
        });
        applicable_methods.sort(function(a, b) {
            return a.score() > b.score();
        });
        return applicable_methods;
    };

    Genfun.prototype.addMethod = function(participants, func) {
        return new Method(this, participants, func);
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
        this.genfun = genfun;
        this.participants = participants;
        this.func = func;
        this._rank = [];
        var method = this;
        var tmp_participants = this.participants.length?this.participants:[Object.prototype];
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

    Method.prototype.set_rank_hierarchy_position = function(index, hierarchy_position) {
        this._rank[index] = hierarchy_position;
    };

    Method.prototype.clear_rank = function() {
        this._rank = [];
    };

    Method.prototype.is_fully_specified = function() {
        for (var i = 0; i < this.participants.length; i++) {
            if (!this._rank.hasOwnProperty(i)) {
                return false;
            }
        }
        return true;
    };

    Method.prototype.score = function() {
        // TODO - this makes all items in the list equal
        return this._rank.reduce(function(a, b) { return a + b; }, 0);
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

    Genfun.test = function() {
        /*
         * Test
         */
        var frobnicate = new Genfun();

        frobnicate.addMethod(
            [Number.prototype],
            function(num) {
                console.log("One number: ", num);
            });

        frobnicate.addMethod(
            [String.prototype],
            function(str) {
                console.log("One string: ", str);
            });

        frobnicate.addMethod(
            [String.prototype, Number.prototype],
            function(string, number) {
                console.log("Got a string and a number: ", string, number);
            });

        frobnicate.addMethod(
            [Number.prototype, String.prototype],
            function(number, string) {
                console.log("Got a number and a string: ", number, string);
            });

        frobnicate.addMethod(
            [],
            function() {
                console.log("Dispatch fell through to the default method: ", arguments);
            });

        frobnicate.addMethod(
            [Number.prototype, , String.prototype],
            function(num, anything, string) {
                console.log("A number, anything, and then a string.");
            });

        frobnicate(new String("foo"), new Number(1)); // Got a string and a number
        frobnicate(1, "foo"); // Got a number and a string
        frobnicate(1, 1); // One number
        frobnicate(1); // One number
        frobnicate("str"); // One string
        frobnicate(true); // Dispatch fell through
        frobnicate(); // Dispatch fell through
        frobnicate(1, true, "foo"); // A number, anything, and then a string.
    };

    /*
     * Export
     */
    window.Genfun = Genfun;

})(this);

var Genfun = (function() {
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
     * * Method redefinition: overwrite methods with identical specs
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
            if (object === Object.prototype) {
                discovered_methods.forEach(function(method) {
                    if (method.participants.length <= index) {
                        method.set_rank_hierarchy_position(index, hierarchy_position);
                    }
                });
            }
        };
        (args.length?args:[Object.prototype]).forEach(function(arg, index) {
            get_precedence_list(genfun.dispatchable_object(arg))
                .forEach(function(obj, hierarchy_position) {
                    find_and_rank_roles(obj, hierarchy_position, index);
                });
        });
        var applicable_methods = discovered_methods.filter(function(method) {
            return ((args.length||1) === method._rank.length &&
                    method.is_fully_specified());
        });
        applicable_methods.sort(function(a, b) {
            return a.score() > b.score();
        });

        if (applicable_methods.length) {
            applicable_methods[0].func.apply(newthis, args);
        } else {
            throw Error("No applicable methods");
        }
    };

    Genfun.prototype.addMethod = function(participants, func) {
        return new Method(this, participants, func);
    };

    function get_precedence_list(obj) {
        var precedence_list = [];
        var next_obj = obj;
        while(next_obj) {
            precedence_list.push(next_obj);
            next_obj = Object.getPrototypeOf(next_obj);
        }
        return precedence_list;
    };

    function Method(genfun, participants, func) {
        this.genfun = genfun;
        this.participants = participants;
        this.func = func;
        this._rank = [];
        var method = this;
        // TODO - check if there's a method for this genfun with matching
        //        participants defined, and overwrite it instead of
        //        unshifting.
        var tmp_participants = this.participants.length?this.participants:[Object.prototype];
        for (var i = 0, participant; i < tmp_participants.length; i++) {
            participant = tmp_participants.hasOwnProperty(i)?tmp_participants[i]:Object.prototype;
            if (!participant.hasOwnProperty("__roles__")) {
                Object.defineProperty(
                    participant, "__roles__", {value: [], enumerable: false});
            };
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

    return Genfun;
})();

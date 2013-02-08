var Genfun = (function() {
    /*
     * Genfun
     *
     * Creates generic functions capable of multiple dispatch across
     * several arguments.
     *
     * TODO:
     *
     * * More portability (currently rely on 1.8.0+ features
     * * Handle non-object primitives
     * * Test effects of varying-length arglists
     *
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
     * It differs in that new Object(value) is returned when for undefined
     * and null values instead of throwing an error.
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
        var applicable_methods = [];
        var genfun = this;
        function find_and_rank_roles(object, hposition, index) {
            var roles = object.hasOwnProperty("__roles__")?object.__roles__:[];
            roles.forEach(function(role) {
                if (role.method.genfun === genfun && index === role.position) {
                    if (discovered_methods.indexOf(role.method) < 0) {
                        role.method.clear_rank();
                        discovered_methods.push(role.method);
                    }
                    role.method.set_rank_hposition(index, hposition);
                    if (role.method.is_fully_specified() &&
                        applicable_methods.indexOf(role.method) < 0) {
                        applicable_methods.push(role.method);
                    }
                }
            });
        };
        args.forEach(function(arg, index) {
            get_precedence_list(genfun.dispatchable_object(arg))
                .forEach(function(obj, pos) {
                    find_and_rank_roles(obj, pos, index);
                });
        });
        applicable_methods.sort(function(a, b) {
            return a.score() < b.score();
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
        this._rank = participants.map(function() null);
        var method = this;
        this.participants.forEach(function(participant, i) {
            if (!participant.hasOwnProperty("__roles__")) {
                Object.defineProperty(
                    participant, "__roles__", {value: [], enumerable: false});
            };
            participant.__roles__.push(new Role(method, i));
        });
    };

    Method.prototype.is_fully_specified = function() {
        return this._rank.every(function(hposition) { return hposition; });
    };

    Method.prototype.set_rank_hposition = function(index, hposition) {
        this._rank[index] = hposition;
    };

    Method.prototype.clear_rank = function() {
        this._rank.forEach(function(_, i, arr) {
            arr[i] = null;
        });
    };

    Method.prototype.score = function() {
        this._rank.reduce(function(a, b) { return a + b; }, 0);
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
            [String.prototype, Number.prototype],
            function(string, number) {
                console.log("Got a string and a number");
            });

        frobnicate.addMethod(
            [Number.prototype, String.prototype],
            function(number, string) {
                console.log("Got a number and a string");
            });

        frobnicate.addMethod(
            [Object.prototype, Object.prototype],
            function(obj1, obj2) {
                console.log("Dispatch fell through to the default method.");
            });

        frobnicate(new String("foo"), new Number(1));
        frobnicate(1, "foo");
    };

    return Genfun;
})();
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
        return fun;
    };

    Genfun.prototype.apply = function(newthis, args) {
        // HACK
        // arguments aren't actually Arrays.
        // Hack taken from
        // https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Functions_and_function_scope/arguments
        args = Array.prototype.slice.call(args);
        // ENDHACK
        var discovered_methods = [];
        var applicable_methods = [];
        var genfun = this;
        function find_and_rank_roles(object, hposition, index) {
            (object.__roles__ || []).forEach(function(role) {
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
            get_precedence_list(arg).forEach(function(obj, pos) {
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

    Genfun.addMethod = function(genfun, participants, func) {
        return new Method(genfun.genfun, participants, func);
    };

    function get_precedence_list(obj) {
        var precedence_list = [];
        if (obj instanceof Object) {
            var next_obj = obj;
            while(next_obj) {
                precedence_list.push(next_obj);
                next_obj = Object.getPrototypeOf(next_obj);
            }
        } else {
            // TODO - compensate for non-objects somehow.
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
            if (!participant.__roles__) participant.__roles__ = [];
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

    /*
     * Test
     */
    var frobnicate = new Genfun();
    Genfun.addMethod(
        frobnicate,
        [String.prototype, Number.prototype],
        function(string, number) {
            console.log("Got a string and a number");
        });

    Genfun.addMethod(
        frobnicate,
        [Number.prototype, String.prototype],
        function(number, string) {
            console.log("Got a number and a string");
        });
        
    frobnicate(new String("foo"), new Number(1));
    frobnicate(new Number(1), new String("foo"));

    return Genfun;
})();
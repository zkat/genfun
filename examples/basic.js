var Genfun = require("genfun");

var frobnicate = new Genfun();

Genfun.addMethod(frobnicate,
    [String.prototype, Number.prototype],
    function(string, number) {
        console.log("Got a string and a number");
    });

Genfun.addMethod(frobnicate,
    [Number.prototype, String.prototype],
    function(number, string) {
        console.log("Got a number and a string");
    });

/* Genfun can handle multiple-arity dispatch. Any extra arguments will be
   ranked as if the position had been specialized on Object.prototype */
Genfun.addMethod(frobnicate,
    [Number.prototype], // Equivalent to [Number.prototype, Object.prototype]
            // when called with two arguments.
    function(number) {
        console.log("Got a single number.");
    });

/* multi-arity dispatch can be exploited to define a 'default' methods */
Genfun.addMethod(frobnicate,
    [],
    function() {
        console.log("Dispatch fell through to the default method.");
    });

/* Empty positions in the dispatch spec will be treated as Object.prototype */
Genfun.addMethod(frobnicate,
    [Number.prototype, , Boolean.prototype],
    function(a, b, c) {
        console.log("Got a number, ", b, ", and a boolean");
    });

frobnicate(new String("foo"), new Number(1)); // => Got a string and a number
frobnicate(1, "foo"); // => Got a number and a string
frobnicate(1); // => Got a single number
frobnicate(1, 1); // => Got a single number
frobnicate(true); // => Dispatch fell through
frobnicate(1, [], true); // => Got a number, [], and a boolean

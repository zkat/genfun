;(function(Genfun) {
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
})(Genfun);

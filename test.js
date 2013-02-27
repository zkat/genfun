;(function(Genfun) {
    Genfun.test = function() {
        /*
         * Test
         */
        var frobnicate = new Genfun();

        frobnicate.addMethod(
            [Number.prototype],
            function(num) {
                return "one number: "+num;
            });

        frobnicate.addMethod(
            [String.prototype],
            function(str) {
                return "one string: "+str;
            });

        frobnicate.addMethod(
            [String.prototype, Number.prototype],
            function(string, number) {
                return "string + number: " + string + ", " + number;
            });

        frobnicate.addMethod(
            [Number.prototype, String.prototype],
            function(number, string) {
                return "number + string: " + number + ", " + string;
            });

        frobnicate.addMethod(
            [],
            function() {
                return "Dispatch fell through";
            });

        frobnicate.addMethod(
            [Number.prototype, , String.prototype],
            function(number, anything, string) {
                return "number + anything + string: " + number + ", " + anything + ", " + string;
            });

        test("string + number: foo, 1", [new String("foo"), new Number(1)]);
        test("number + string: 1, foo", [1, "foo"]);
        test("one number: 1", [1, 2]);
        test("one number: 1", [1]);
        test("one string: str", ["str"]);
        test("Dispatch fell through", [true]);
        test("Dispatch fell through", []);
        test("number + anything + string: 1, true, foo", [1, true, "foo"]);

        console.log("Tests passed!");

        function test(expected, args) {
            var result = frobnicate.apply(this, args);
            if (result != expected) {
                throw Error("Tests failed. Expected "+expected+" but got "+result);
            }
        };
    };
})(Genfun);

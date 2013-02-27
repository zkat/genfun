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

    Genfun.arewefastyet = function() {
        /*
         * Test setup
         */
        function TestObj() {};
        var test_obj = new TestObj();
        var test_genfun = new Genfun();

        /*
         * Tests
         */
        TestObj.prototype.test_method = function() {
            return this.toString() + "test";
        };
        bench("Native method", function() {
            test_obj.test_method();
        });

        test_genfun.addMethod([TestObj.prototype], function(test_obj) {
            return test_obj.toString() + "test";
        });
        bench("Singly-dispatched genfun", function() {
            test_genfun(test_obj);
        });

        test_genfun.addMethod([TestObj.prototype, TestObj.prototype], function(test_obj1, test_obj2) {
            return test_obj.toString() + "test";
        });
        bench("Double-dispatched genfun", function() {
            test_genfun(test_obj, test_obj);
        });

        test_genfun.addMethod([TestObj.prototype, String.prototype], function(test_obj1, string) {
            return test_obj.toString() + string;
        });
        bench("Double-dispatched genfun with string primitive", function() {
            test_genfun(test_obj, "test");
        });

        /*
         * Util
         */
        function bench(name, func, iterations) {
            iterations = iterations || 100000;
            console.time(name);
            for (var i = 0; i < iterations; i++) {
                func();
            }
            console.timeEnd(name);
        }
    };
})(Genfun);

;(function(Genfun) {

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

        function test_function(test_obj) {
            return test_obj.toString() + "test";
        };
        bench("Regular function", function() {
            test_function(test_obj);
        });

        TestObj.prototype.test_method = function() {
            return this.toString() + "test";
        };
        bench("Native method", function() {
            test_obj.test_method();
        });

        test_genfun.addMethod(
            [TestObj.prototype],
            function(test_obj) {
                return test_obj.toString() + "test";
            });
        bench("Singly-dispatched genfun", function() {
            test_genfun(test_obj);
        });

        test_genfun.addMethod(
            [TestObj.prototype, TestObj.prototype],
            function(test_obj1, test_obj2) {
                return test_obj.toString() + "test";
            });
        bench("Double-dispatched genfun", function() {
            test_genfun(test_obj, test_obj);
        });

        test_genfun.addMethod(
            [TestObj.prototype, String.prototype],
            function(test_obj1, string) {
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

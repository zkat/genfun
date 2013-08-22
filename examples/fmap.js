/* -*- js2-basic-offset: 2; indent-tabs-mode: nil; -*- */
var gf = require("../build/genfun");

var fmap = new gf;

/*
 * Maybe
 */
function Just(value) {
	this.value = value;
}
var Nothing = {};

gf.addMethod(fmap, [Function.prototype, Just.prototype], function(f, just) {
	return new Just(f.call(this, just.value));
});
gf.addMethod(fmap, [Function.prototype, Nothing], function() {
	return Nothing;
});

/*
 * Array
 */
gf.addMethod(fmap, [Function.prototype, Array.prototype], function(f, array) {
	return array.map(f, this);
});

/*
 * Tree
 */
function Leaf(value) {
	this.value = value;
}
function Branch(left, right) {
	this.left = left;
	this.right = right;
}

gf.addMethod(fmap, [Function.prototype, Leaf.prototype], function(f, leaf) {
	return new Leaf(f.call(this, leaf.value));
});
gf.addMethod(fmap, [Function.prototype, Branch.prototype], function(f, branch) {
	return new Branch(f.call(this, branch.left), f.call(this, branch.right));
});

function runExample() {
	function logValue(type) {
		return function(val) {
			console.log("Mapping over ", val, " in object of type "+type);
		};
	}

	console.log("Testing Maybe");
	fmap(logValue("Just"), new Just(123));
	fmap(logValue("Nothing"), Nothing);
	
	console.log("Testing Array");
	fmap(logValue("Array"), [1,2,3]);

	console.log("Testing Tree");
	function br(a, b) { return new Branch(a, b); }
	function lf(x) { return new Leaf(x); }
	fmap(logValue("Tree"),
		 br(
			 br(
				 lf(1),
				 lf(2)),
			 br(
				 br(
					 lf(3),
					 br(
						 lf(4),
						 lf(5))),
				 lf(6))));
}

exports.runExample = runExample;
exports.fmap = fmap;

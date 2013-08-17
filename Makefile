.PHONY: all
all: test compile

.PHONY: compile
compile: build/genfun.min.js build/genfun.js.src

build/genfun.min.js build/genfun.js.src: build/genfun.js
	./node_modules/uglify-js/bin/uglifyjs build/genfun.js \
		-o build/genfun.min.js \
		--source-map build/genfun.js.src

build/genfun.js: src/*.js | build
	./node_modules/browserify/bin/cmd.js src/genfun.js -o build/genfun.js

build:
	mkdir -p build

.PHONY: clean
clean:
	-rm -f build/*

.PHONY: test
test:
	./node_modules/mocha/bin/mocha \
		--reporter spec \
		--check-leaks

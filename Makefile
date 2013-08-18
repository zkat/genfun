.PHONY: all
all: test lint compile docs

.PHONY: compile
compile: $(min-file) $(source-map)

uglify = ./node_modules/uglify-js/bin/uglifyjs
min-file = build/genfun.min.js
source-map = build/genfun.js.src

$(min-file) $(source-map): build/genfun.js
	$(uglify) build/genfun.js \
		-o $(min-file) \
		--source-map $(source-map)

browserify = ./node_modules/browserify/bin/cmd.js
build/genfun.js: src/*.js | build
	$(browserify) src/genfun.js \
		-s Genfun \
		-o $@

build:
	mkdir -p $@

jsdoc  = ./node_modules/jsdoc/jsdoc
docs: src/*.js README.md jsdoc.conf.json
	$(jsdoc) -d $@ -c jsdoc.conf.json src/ README.md

.PHONY: clean
clean:
	-rm -rf build
	-rm -rf docs

mocha = ./node_modules/mocha/bin/mocha \
			--reporter spec \
			--check-leaks
.PHONY: test
test: src/*.js
	$(mocha)

.PHONY: watch-test
watch-test: src/*.js
	$(mocha) --watch

linter = ./node_modules/jshint/bin/jshint
.PHONY: lint
lint: src/*.js jshint.conf.json
	$(linter) --config jshint.conf.json src/*.js

.PHONY: clean tests

clean: 
	rm -f grammar.js wiki.js markup.js

grammar.js: grammar.pegjs
	pegjs --track-line-and-column grammar.pegjs 

wiki.js:
	coffee -c wiki.coffee

markup.js:
	coffee -c markup.coffee

tests: clean wiki.js markup.js tests/tests.coffee
	coffee -c tests/tests.coffee
	node tests/tests.js
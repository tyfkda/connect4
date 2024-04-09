.PHONY: all
all:	connectfour.js

.PHONY: clean
clean:
	rm -rf connectfour.js connectfour.wasm cpptest

connectfour.js:	main.cpp 02_BitBoard.h
	emcc -o connectfour.js --bind -sEXPORTED_RUNTIME_METHODS=ccall,cwrap \
		-s EXPORTED_FUNCTIONS="['_malloc', '_free']" \
		-s WASM=1 -s NO_EXIT_RUNTIME=1 -s ALLOW_MEMORY_GROWTH=1 -O2 -DNDEBUG $<

cpptest:	cpptest.cpp 02_BitBoard.h
	g++ -o cpptest -O2 -std=gnu++17 -DNDEBUG $<


FILES:=index.html main.js style.css \
	game_worker.js connectfour.js connectfour.wasm

.PHONY:	release
release:	connectfour.js
	@rm -rf docs
	@mkdir -p docs
	cp $(FILES) docs/

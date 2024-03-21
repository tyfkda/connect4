.PHONY: all
all:	connectfour.js

.PHONY: clean
clean:
	rm -rf connectfour.js connectfour.wasm

connectfour.js:	main.cpp 02_BitBoard.h
	emcc -o connectfour.js -sEXPORTED_RUNTIME_METHODS=ccall,cwrap -O2 -DNDEBUG $<

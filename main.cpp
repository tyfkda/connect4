#include "emscripten/emscripten.h"
#include "02_BitBoard.h"

extern "C" {
void run();
}  // extern "C"

EMSCRIPTEN_KEEPALIVE
void run() {
    using std::cout;
    using std::endl;
    auto ais = std::array<StringAIPair, 2>{
        StringAIPair("mctsActionBitWithTimeThreshold 1ms", [](const State &state)
                     { return mctsActionBitWithTimeThreshold(state, 1); }),
        StringAIPair("mctsActionWithTimeThreshold 1ms", [](const State &state)
                     { return mctsActionWithTimeThreshold(state, 1); }),
    };
    testFirstPlayerWinRate(ais, 100);
}

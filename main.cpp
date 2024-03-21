#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include "02_BitBoard.h"

class Game;

extern "C" {
Game* newGame();
int getGameTurn(Game* game);
void playHumanHand(Game* game, int column);
}  // extern "C"

class Game {
private:
    State state;
    int turn;

public:
    Game() : state() {
        turn = 0;
    }

    int getTurn() const { return turn; }

    void playHand(int column) {
        // TODO:
    }
};

EMSCRIPTEN_BINDINGS(Game)
{
    using namespace emscripten;
    class_<Game>("Game")
        .constructor()
        .property("turn", &Game::getTurn)
        .function("playHand", &Game::playHand)
        ;
}

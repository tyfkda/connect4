#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include "02_BitBoard.h"

class Game;

extern "C" {
Game* newGame();
int getGameTurn(Game* game);
void playHand(Game* game, int column);
}  // extern "C"

class Game {
private:
    State state;

public:
    Game() : state() {
    }

    int getTurn() const { return state.is_first_ ? 0 : 1; }

    bool isDone() const { return state.isDone(); }

    int getWinner() const {
        auto w = state.getWinningStatus();
        switch (w) {
        case WinningStatus::WIN:
        case WinningStatus::LOSE:
            return state.is_first_;
        case WinningStatus::DRAW: return -1;
        default: return -1;  // Not happend.
        }
    }

    void start() {
        state = State();
    }

    void getBoard(intptr_t ptr) {
        const int* p1;
        const int* p2;
        if (state.is_first_) {
            p1 = &state.my_board_[0][0];
            p2 = &state.enemy_board_[0][0];
        } else {
            p1 = &state.enemy_board_[0][0];
            p2 = &state.my_board_[0][0];
        }
        unsigned char *dst = reinterpret_cast<unsigned char*>(ptr);
        for (int i = 0; i < 6; ++i) {
            for (int j = 0; j < 7; ++j) {
                *dst++ = (*p1++) + ((*p2++) << 1);
            }
        }
    }

    int getLegalActions() {
        auto legal_actions = state.legalActions();
        int result = 0;
        for (const auto &action : legal_actions) {
            result |= 1 << action;
        }
        return result;
    }

    void playHand(int action) {
        state.advance(action);
    }

    int searchHand(int time_threshold) {
        return mctsActionBitWithTimeThreshold(state, time_threshold);
    }
};

EMSCRIPTEN_BINDINGS(Game)
{
    using namespace emscripten;
    class_<Game>("Game")
        .constructor()
        .property("turn", &Game::getTurn)
        .function("start", &Game::start)
        .function("isDone", &Game::isDone)
        .function("getWinner", &Game::getWinner)
        .function("getBoard", &Game::getBoard, allow_raw_pointers())
        .function("getLegalActions", &Game::getLegalActions)
        .function("playHand", &Game::playHand)
        .function("searchHand", &Game::searchHand)
        ;
}

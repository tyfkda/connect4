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
    montecarlo_bit::Node node;

public:
    Game() : state(), node(ConnectFourStateByBitSet(state)) {
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
        updateState();
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
        updateState();
    }

    int searchHand(int time_threshold, bool for_draw_) {
        int for_draw = for_draw_ ? 1 : 0;
        double CCC = for_draw ? 3 : 1;
        return mctsActionBitWithTimeThreshold(state, time_threshold, for_draw ? 1 : 0, CCC);
    }

    void proceedMcts(int count, bool for_draw_, intptr_t ptr) {
        int for_draw = for_draw_ ? 1 : 0;
        double CCC = for_draw ? 3 : 1;
        for (int i = 0; i < count; ++i) {
            int playout_player = -1;
            node.evaluate(for_draw, CCC, &playout_player);
        }

        int32_t* dst = reinterpret_cast<int32_t*>(ptr);
        for (int i = 0; i < W; ++i)
            dst[i] = 0;
        auto legal_actions = state.legalActions();
        assert(legal_actions.size() == node.child_nodes_.size());
        for (int i = 0; i < legal_actions.size(); i++) {
            int n = node.child_nodes_[i].n_;
            dst[legal_actions[i]] = n;
        }
    }

private:
    void updateState() {
        node = montecarlo_bit::Node(ConnectFourStateByBitSet(state));
        node.expand();
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
        .function("proceedMcts", &Game::proceedMcts)
        ;
}

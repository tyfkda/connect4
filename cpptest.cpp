#include "02_BitBoard.h"
#include <iostream>

using namespace montecarlo_bit;
using namespace std;

static int tryMcts(Node* root_node, const vector<int>& legal_actions, const int64_t count, int for_draw, double CCC)
{
    root_node->expand();
    for (int cnt = 0; cnt < count; cnt++)
    {
        root_node->evaluate(for_draw, CCC);
    }

    int best_action_searched_number = -1;
    int best_action_index = -1;
    assert(legal_actions.size() == root_node->child_nodes_.size());
    for (int i = 0; i < legal_actions.size(); i++)
    {
        const Node* child = &root_node->child_nodes_[i];
        int n = child->n_;
        if (n > best_action_searched_number)
        {
            best_action_index = i;
            best_action_searched_number = n;
        }
    }
    return legal_actions[best_action_index];
}

string make_indent(int n) {
    string s = "";
    for (int i = 0; i < n; i++)
        s += "  ";
    return s;
}

static void dump_node(const Node* node, int recur) {
    const auto indent = make_indent(recur);

    const ConnectFourStateByBitSet& state = node->getState();
    static const char *cells[] = {"..", u8"❌", u8"🟢"};
    for (int y = H - 1; y >= 0; y--) {
        cout << indent;
        for (int x = 0; x < W; x++) {
            cout << cells[state.getCell(x, y)];
        }
        cout << "\n";
    }

    if (state.isDone()) {
        cout << indent << "WinningState=" << state.getWinningStatus() << endl;
    } else if (!node->child_nodes_.empty()) {
        const auto& actions = state.legalActions();
        assert(actions.size() == node->child_nodes_.size());
        for (size_t i = 0; i < node->child_nodes_.size(); ++i) {
            const auto& child = node->child_nodes_[i];
            int action = actions[i];
            printf("%sact %d: w=%.2f, n=%d rate=%.2f%%\n", indent.c_str(), action, child.getW(), (int)child.n_, 100 * child.getW() / child.n_);
        }
    }

    cout << endl;

    // cout << indent << "Legal actions: #" << actions.size() << ": ";
    // for (auto& action : actions) {
    //     cout << action << ", ";
    // }
    // cout << "\n";
}

static void dump_node_recur(const Node* node, int recur) {
    dump_node(node, recur);
    if (!node->child_nodes_.empty() && recur < 10) {
        int next_recur = recur + 1;
        const ConnectFourStateByBitSet& state = node->getState();
        const char *c = state.isFirst() ? u8"❌" : u8"🟢";
        const auto actions = state.legalActions();
        for (size_t i = 0; i < node->child_nodes_.size(); ++i) {
            const auto& child = node->child_nodes_[i];
            assert(actions.size() == node->child_nodes_.size());
            int action = actions[i];
            cout << make_indent(recur) << c << ": act=" << action << endl;
            dump_node_recur(&child, next_recur);
        }
    }
}

int main() {
    static const char *table[] = {
        "xxoxo..",
        "oooxx.x",
        "oxxxo.o",
        "xooox.x",
        "oxxxooo",
        "xooxxxo",
    };

    State state;
    for (int i = 0; i < H; ++i) {
            int y = H - 1 - i;
        for (int j = 0; j < W; ++j) {
            int c = table[i][j];
            switch (c) {
            case 'x':
                state.my_board_[y][j] = 1;
                state.enemy_board_[y][j] = 0;
                break;
            case 'o':
                state.my_board_[y][j] = 0;
                state.enemy_board_[y][j] = 1;
                break;
            default:
                break;
            }
        }
    }
    bool is_first = false;
    if (!is_first) {
        state.is_first_ = false;
        std::swap(state.my_board_, state.enemy_board_);
    } else {
        state.is_first_ = true;
    }

    // cout << state.toString() << endl;

    bool for_draw = true;
    // bool for_draw = false;
    double CCC = for_draw ? 3 : 1;
    ConnectFourStateByBitSet bitstate = ConnectFourStateByBitSet(state);
    Node root_node = Node(bitstate);
    auto action = tryMcts(&root_node, bitstate.legalActions(), 500000, for_draw ? 1 : 0, CCC);
    // state.advance(action);

    // cout << "Action: " << action << endl;
    // cout << state.toString() << endl;

    dump_node_recur(&root_node, 0);


    return 0;
}

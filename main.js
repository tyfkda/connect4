'use strict'

const W = 7
const H = 6

function enumMatchLines(buf, callback) {
    const lines = [[1, 0], [0, 1], [1, 1], [1, -1]]
    for (let r = 0; r < H; ++r) {
        for (let c = 0; c < W; ++c) {
            const u = buf[r * W + c]
            if (u === 0)
                continue
            for (const [dr, dc] of lines) {
                let rr = r
                let cc = c
                let n = 1
                for (;;) {
                    rr += dr
                    cc += dc
                    if (rr < 0 || rr >= H || cc < 0 || cc >= W || buf[rr * W + cc] !== u)
                        break
                    ++n
                }
                if (n >= 4) {
                    callback(r, c, dr, dc)
                    return
                }
            }
        }
    }
}

class App {
    constructor() {
        this.game = new Module.Game()
        this.ptr = Module._malloc(W * H * Uint8Array.BYTES_PER_ELEMENT)

        this.createBoardElement()

        const startButton = document.getElementById('start-button')
        startButton.addEventListener('click', this.start.bind(this))
    }

    start() {
        this.step = 0
        this.handOrders.fill(-1)
        this.game.start()
        for (const cell of this.boardCells) {
            cell.parentElement.classList.remove('win')
            cell.textContent = ''
        }
        this.setUiForNextState()

        document.getElementById('status').textContent = ''
    }

    setUiForNextState() {
        this.showBoard()

        if (this.game.isDone()) {
            this.setActionButtons(0)
            this.showResult()
            return
        }

        // if (this.game.turn == 0) {
            const legalActions = this.game.getLegalActions()
            this.setActionButtons(legalActions)
        // } else {
        //     this.setActionButtons(0)
        // }
    }

    showResult() {
        const status = document.getElementById('status')
        const winner = this.game.getWinner()
        if (winner >= 0) {
            status.textContent = `Winner: ${winner + 1}`
        } else {
            status.textContent = 'Draw!'
        }

        // 揃ったラインを表示
        if (winner >= 0) {
            const buf = Module.HEAPU8.subarray(this.ptr, this.ptr + (W * H * Uint8Array.BYTES_PER_ELEMENT))
            enumMatchLines(buf, (r, c, dr, dc) => {
                const u = buf[r * W + c]
                for (;; r += dr, c += dc) {
                    if (r < 0 || r >= H || c < 0 || c >= W || buf[r * W + c] !== u)
                        break
                    const cell = this.boardCells[(H - 1 - r) * W + c]
                    cell.parentElement.classList.add('win')
                }
            })
        }
    }

    showBoard() {
        this.game.getBoard(this.ptr)
        const buf = Module.HEAPU8.subarray(this.ptr, this.ptr + (W * H * Uint8Array.BYTES_PER_ELEMENT))

        for (let i = 0; i < H; ++i) {
            for (let j = 0; j < W; ++j) {
                const cell = this.boardCells[(H -  1 - i) * W + j]
                const value = buf[i * W + j]
                cell.className = 'cell'
                if (value === 1) {
                    cell.classList.add('p0')
                } else if (value === 2) {
                    cell.classList.add('p1')
                }
                const order = this.handOrders[(H -  1 - i) * W + j]
                cell.textContent = order >= 0 ? `${order + 1}` : ''
            }
        }
    }

    setActionButtons(param) {
        for (let i = 0; i < this.actionButtons.length; ++i) {
            const button = this.actionButtons[i]
            const disabled = (param & (1 << i)) === 0
            button.disabled = disabled
        }
    }

    playHand(action) {
        this.game.playHand(action)

        for (let i = 0; i < H; ++i) {
            const index = (H - 1 - i) * W + action
            if (this.handOrders[index] < 0) {
                this.handOrders[index] = this.step++
                break
            }
        }

        this.setUiForNextState()
    }

    onClickedAction(action) {
        this.playHand(action)
    }

    createBoardElement() {
        const folder = document.getElementById('board-folder')
        const table = document.createElement('table')
        table.className = 'board'
        const boardCells = []
        for (let i = 0; i < H; ++i) {
            const tr = document.createElement('tr')
            for (let j = 0; j < W; ++j) {
                const td = document.createElement('td')
                td.className = 'grid'
                const cell = document.createElement('div')
                cell.className = 'cell'
                td.appendChild(cell)
                tr.appendChild(td)
                boardCells.push(cell)
            }
            table.appendChild(tr)
        }

        // ボタン
        const actionButtons = []
        const tr = document.createElement('tr')
        for (let j = 0; j < W; ++j) {
            const td = document.createElement('td')
            const button = document.createElement('button')
            button.className = `action-button action${j}`
            button.textContent = `${j + 1}`
            button.disabled = true
            button.addEventListener('click', () => {
                this.onClickedAction(j)
            })
            td.appendChild(button)
            tr.appendChild(td)
            actionButtons.push(button)
        }
        table.appendChild(tr)

        folder.appendChild(table)

        this.boardCells = boardCells
        this.actionButtons = actionButtons

        this.handOrders = new Int8Array(boardCells.length)
    }
}

Module.onRuntimeInitialized = async () => {
    new App()
}

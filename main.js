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
    }

    setUiForNextState() {
        const status = document.getElementById('status')
        this.showBoard()

        if (this.game.isDone()) {
            this.setActionButtons(0)
            this.showResult()
            return
        }

        if (this.game.turn == 0) {
            const legalActions = this.game.getLegalActions()
            this.setActionButtons(legalActions)
            status.textContent = 'Your turn'
            this.legalActions = legalActions
        } else {
            status.textContent = 'Thinking...'
            this.setActionButtons(0)

            setTimeout(() => {
                const action = this.game.searchHand(1000)
                this.playHand(action)
            }, 100)
        }
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
                    const cell = this.boardCells[(H - 1 - r) + c * H]
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
                const cell = this.boardCells[(H -  1 - i) + j * H]
                const value = buf[i * W + j]
                cell.className = 'cell'
                if (value === 1) {
                    cell.classList.add('p0')
                } else if (value === 2) {
                    cell.classList.add('p1')
                }
                const order = this.handOrders[(H -  1 - i) + j * H]
                cell.textContent = order >= 0 ? `${order + 1}` : ''
            }
        }
    }

    setActionButtons(param) {
        for (let i = 0; i < this.boardColumns.length; ++i) {
            const column = this.boardColumns[i]
            const disabled = (param & (1 << i)) === 0
            if (disabled)
                column.classList.add('disabled')
            else
                column.classList.remove('disabled')
        }
    }

    playHand(action) {
        this.game.playHand(action)

        for (let i = 0; i < H; ++i) {
            const index = (H - 1 - i) + action * H
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
        const table = document.createElement('div')
        table.className = 'board'
        const boardColumns = []
        const boardCells = []
        for (let j = 0; j < W; ++j) {
            const column = document.createElement('div')
            column.className = 'column disabled'
            boardColumns.push(column)
            for (let i = 0; i < H; ++i) {
                const td = document.createElement('div')
                td.className = 'grid'
                const cell = document.createElement('div')
                cell.className = 'cell'
                td.appendChild(cell)
                column.appendChild(td)
                boardCells.push(cell)
            }
            table.appendChild(column)

            const action = j
            column.addEventListener('click', () => {
                if (this.game.isDone() || !(this.legalActions & (1 << action)))
                    return
                this.onClickedAction(action)
            })
        }

        folder.appendChild(table)

        this.boardCells = boardCells
        this.boardColumns = boardColumns

        this.handOrders = new Int8Array(boardCells.length)
    }
}

Module.onRuntimeInitialized = async () => {
    new App()
}

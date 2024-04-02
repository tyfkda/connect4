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
        this.ptr2 = Module._malloc(W * Uint32Array.BYTES_PER_ELEMENT)
        this.rafId = -1

        this.createBoardElement()

        this.players = [
            { com: false, assist: true },
            { com: true },
        ]
    }

    setPlayer(index, params) {
        this.players[index] = params
    }

    start(options) {
        this.options = options
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

        for (let i = 0; i < this.probabilityBars.length; ++i) {
            const bar = this.probabilityBars[i]
            bar.style.height = '0'
        }

        if (this.rafId >= 0) {
            cancelAnimationFrame(this.rafId)
            this.rafId = -1
        }

        if (this.game.isDone()) {
            this.setActionButtons(0)
            this.showResult()
            return
        }

        const turn = this.game.turn
        if (!this.players[turn].com) {
            const legalActions = this.game.getLegalActions()
            this.setActionButtons(legalActions)
            status.textContent = `Player ${turn + 1}'s turn`
            this.legalActions = legalActions

            if (this.players[turn].assist) {
                const f = () => {
                    this.updateGoodHand()
                    this.rafId = requestAnimationFrame(f)
                }
                this.rafId = requestAnimationFrame(f)
            }
        } else {
            status.textContent = 'Thinking...'
            this.setActionButtons(0)

            setTimeout(() => {
                const action = this.game.searchHand(this.players[turn].comTimeLimit)
                this.playHand(turn, action)
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

    playHand(turn, action) {
        this.game.playHand(action)
        this.printLog(turn, action)

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
        const turn = this.game.turn
        this.playHand(turn, action)
    }

    printLog(turn, action) {
        this.options.callback({event: 'onAction', turn, action})
    }

    createBoardElement() {
        const folder = document.getElementById('board-folder')
        const table = document.createElement('div')
        table.className = 'board'
        const boardColumns = []
        const boardCells = []
        const probabilityBars = []
        for (let j = 0; j < W; ++j) {
            const column = document.createElement('div')
            column.className = 'column disabled'
            boardColumns.push(column)

            const inner = document.createElement('div')
            column.appendChild(inner)

            for (let i = 0; i < H; ++i) {
                const td = document.createElement('div')
                td.className = 'grid'
                const cell = document.createElement('div')
                cell.className = 'cell'
                td.appendChild(cell)
                inner.appendChild(td)
                boardCells.push(cell)
            }

            const bar = document.createElement('div')
            bar.className = 'assist-bar'
            column.appendChild(bar)
            probabilityBars.push(bar)

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
        this.probabilityBars = probabilityBars

        this.handOrders = new Int8Array(boardCells.length)
    }


    updateGoodHand() {
        this.game.proceedMcts(10000, this.ptr2)
        const counts = Module.HEAPU32.subarray(this.ptr2 >> 2, (this.ptr2 >> 2) + (Uint32Array.BYTES_PER_ELEMENT * W))

        let sum = 0
        let maxval = 0
        let maxidx = 0
        for (let i = 0; i < W; ++i) {
            sum += counts[i]
            if (counts[i] > maxval) {
                maxval = counts[i]
                maxidx = i
            }
        }
        for (let i = 0; i < W; ++i) {
            const bar = this.probabilityBars[i]
            bar.style.height = `${counts[i] / sum * 100}%`
            bar.style.backgroundColor = i === maxidx ? '#00f' : '#008'
        }
    }
}

const ComTimeThresholds = [
    { value:   500, text: '0.5秒' },
    { value:  1000, text: '1秒' },
    { value:  3000, text: '3秒' },
    { value:  6000, text: '6秒' },
    { value: 10000, text: '10秒' },
]

async function main() {
    let resolveAlpine = () => { throw 'error' }

    let proxy = null
    let app = null
    let step = 0
    globalThis.createInitialData = () => {
        return {
            ComTimeThresholds,
            p0player: 'human',
            p0assist: false,
            com0timeLimit: 1000,
            p1player: 'com',
            p1assist: false,
            com1timeLimit: 1000,
            ready: false,
            log: '',

            init() {
                proxy = this
                this.$watch('p0player', (value) => app.players[0].com = value === 'com')
                this.$watch('p1player', (value) => app.players[1].com = value === 'com')
                this.$watch('p0assist', (value) => app.players[0].assist = value)
                this.$watch('p1assist', (value) => app.players[1].assist = value)
                this.$watch('com0timeLimit', (value) => app.players[0].comTimeLimit = value)
                this.$watch('com1timeLimit', (value) => app.players[1].comTimeLimit = value)
                resolveAlpine()
            },

            start() {
                this.log = ''
                step = 0
                app.setPlayer(0, { com: this.p0player === 'com', assist: this.p0assist, comTimeLimit: this.com0timeLimit })
                app.setPlayer(1, { com: this.p1player === 'com', assist: this.p1assist, comTimeLimit: this.com1timeLimit })
                app.start({
                    callback: (params) => {
                        switch (params.event) {
                        case 'onAction':
                            ++step
                            this.log += `#${step}, Player ${params.turn + 1}: Column ${params.action + 1}\n`
                            this.$nextTick(() => {
                                const log = document.getElementById('log-holder')
                                log.scrollTop = log.scrollHeight
                            })
                            break
                        }
                    },
                })
            },

            assistClicked(player) {
                console.log(`assist clicked: ${player}: ${this.p0assist}, ${this.p1assist}`)
            }
        }
    }

    const promises = [
        new Promise((resolve) => {
            Module.onRuntimeInitialized = () => {
                resolve()
            }
        }),
        new Promise((resolve) => resolveAlpine = resolve)
    ]
    await Promise.all(promises)
    app = new App()
    proxy.ready = true
}

var Module = typeof Module != "undefined" ? Module : {}
main()

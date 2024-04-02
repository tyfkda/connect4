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
    constructor(gameWorker) {
        this.game = gameWorker

        this.createBoardElement()

        this.players = [
            { com: false, assist: true },
            { com: true },
        ]

        const upper = gameWorker.onmessage
        gameWorker.onmessage = (e) => {
            const data = e.data
            switch (data.name) {
            case 'legalActions':
                {
                    this.legalActions = data.legalActions
                    if (!this.players[this.turn].com) {
                        this.setActionButtons(this.legalActions)
                    }
                }
                break
            case 'handSearched':
                {
                    const action = data.action
                    this.playHand(this.turn, action)
                }
                break
            case 'boardUpdated':
                {
                    this.buf.set(data.buf)
                    this.turn = data.turn
                    this.isDone = data.isDone
                    if (this.isDone) {
                        this.winner = data.winner
                    }
                    this.setUiForNextState()
                }
                break
            case 'updateGoodHand':
                this.updateGoodHand(data.counts)
                break
            default:
                upper(e)
                break
            }
        }
    }

    setPlayer(index, params) {
        this.players[index] = params
    }

    start(options) {
        this.options = options
        this.step = 0
        this.handOrders.fill(-1)
        this.game.postMessage({ name: 'start' })
        for (const cell of this.boardCells) {
            cell.parentElement.classList.remove('win')
            cell.textContent = ''
        }

        this.turn = 0
        this.isDone = false
        this.buf = new Uint8Array(W * H)
        this.setUiForNextState()
    }

    setUiForNextState() {
        const status = document.getElementById('status')
        this.showBoard()

        for (let i = 0; i < this.probabilityBars.length; ++i) {
            const bar = this.probabilityBars[i]
            bar.style.height = '0'
        }

        this.setActionButtons(0)
        if (this.isDone) {
            this.showResult()
            return
        }

        const turn = this.turn
        if (!this.players[turn].com) {
            this.game.postMessage({ name: 'requestLegalActions' })
            status.textContent = `Player ${turn + 1}'s turn`

            if (this.players[turn].assist)
                this.game.postMessage({ name: 'requestAssist', forDraw: this.players[turn].forDraw})
        } else {
            status.textContent = 'Thinking...'
            this.game.postMessage({ name: 'searchAiHand', threshold: this.players[turn].comTimeLimit, forDraw: this.players[turn].forDraw })
        }
    }

    showResult() {
        const status = document.getElementById('status')
        const winner = this.winner
        if (winner >= 0) {
            status.textContent = `Winner: ${winner + 1}`
        } else {
            status.textContent = 'Draw!'
        }

        // 揃ったラインを表示
        if (winner >= 0) {
            const buf = this.buf
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
        const buf = this.buf

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
        this.game.postMessage({ name: 'playHand', action })
        this.printLog(turn, action)

        for (let i = 0; i < H; ++i) {
            const index = (H - 1 - i) + action * H
            if (this.handOrders[index] < 0) {
                this.handOrders[index] = this.step++
                break
            }
        }
    }

    onClickedAction(action) {
        const turn = this.turn
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
                if (this.isDone || !(this.legalActions & (1 << action)))
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


    updateGoodHand(counts) {
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
    const gameWorker = new Worker("game_worker.js")
    let resolveAlpine = () => { throw 'error' }
    let resolveGameWorker = () => { throw 'error' }

    let onReady = () => { throw 'error' }
    let app = null
    let step = 0
    globalThis.createInitialData = () => {
        return {
            ComTimeThresholds,
            p0player: 'human',
            p0assist: false,
            p0draw: false,
            com0timeLimit: 1000,
            p1player: 'com',
            p1assist: false,
            p1draw: false,
            com1timeLimit: 1000,
            ready: false,
            log: '',

            init() {
                onReady = () => this.ready = true
                this.$watch('p0player', (value) => app.players[0].com = value === 'com')
                this.$watch('p1player', (value) => app.players[1].com = value === 'com')
                this.$watch('p0assist', (value) => app.players[0].assist = value)
                this.$watch('p1assist', (value) => app.players[1].assist = value)
                this.$watch('p0draw', (value) => app.players[0].forDraw = value)
                this.$watch('p1draw', (value) => app.players[1].forDraw = value)
                this.$watch('com0timeLimit', (value) => app.players[0].comTimeLimit = value)
                this.$watch('com1timeLimit', (value) => app.players[1].comTimeLimit = value)
                resolveAlpine()
            },

            start() {
                this.log = ''
                step = 0
                app.setPlayer(0, { com: this.p0player === 'com', assist: this.p0assist, comTimeLimit: this.com0timeLimit, forDraw: this.p0draw})
                app.setPlayer(1, { com: this.p1player === 'com', assist: this.p1assist, comTimeLimit: this.com1timeLimit, forDraw: this.p1draw})
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

    gameWorker.onmessage = (e) => {
        const data = e.data
        switch (data.name) {
        case 'initialized':
            resolveGameWorker()
            break
        default:
            console.error('Unknown message:', data)
            break
        }
    }

    const promises = [
        new Promise((resolve) => resolveGameWorker = resolve),
        new Promise((resolve) => resolveAlpine = resolve)
    ]
    await Promise.all(promises)
    app = new App(gameWorker)
    onReady()
}

main()

'use strict'

importScripts('connectfour.js')

const W = 7
const H = 6

var onmessage
class GameWorker {
    constructor() {
        this.game = new Module.Game()
        this.ptr = Module._malloc(W * H * Uint8Array.BYTES_PER_ELEMENT)
        this.ptr2 = Module._malloc(W * Uint32Array.BYTES_PER_ELEMENT)
        this.timer = -1

        postMessage({ name: 'initialized' })

        onmessage = this.onMessage.bind(this)
     }

     onMessage(e) {
        const data = e.data
        switch (data.name) {
        case 'start':
            this.cancelAssist()
            this.game.start()
            this.sendLegalActions()
            break
        case 'playHand':
            {
                const action = data.action
                this.game.playHand(action)
                this.cancelAssist()
                this.sendBoardUpdated()
            }
            break
        case 'requestLegalActions':
            this.sendLegalActions()
            break
        case 'requestAssist':
            this.requestAssist(data.forDraw)
            break
        case 'searchAiHand':
            {
                const {threshold, forDraw} = data
                const action = this.game.searchHand(threshold, forDraw)
                postMessage({ name: 'handSearched', action })
            }
            break
        default:
            console.error('Unknown message:', data)
            break
        }
    }

    sendLegalActions() {
        const legalActions = this.game.getLegalActions()
        postMessage({ name: 'legalActions', legalActions, turn: this.game.turn })
    }

    sendBoardUpdated() {
        this.game.getBoard(this.ptr)
        const buf = Module.HEAPU8.subarray(this.ptr, this.ptr + (W * H * Uint8Array.BYTES_PER_ELEMENT))
        const params = {
            name: 'boardUpdated',
            buf,
            turn: this.game.turn,
            isDone: this.game.isDone(),
        }
        if (params.isDone) {
            params.winner = this.game.getWinner()
        }
        postMessage(params)
    }

    requestAssist(forDraw) {
        this.timer = setInterval(() => {
            this.game.proceedMcts(10000, forDraw, this.ptr2)
            const counts = Module.HEAPU32.subarray(this.ptr2 >> 2, (this.ptr2 >> 2) + (Uint32Array.BYTES_PER_ELEMENT * W))
            postMessage({ name: 'updateGoodHand', counts })
        }, 100)
    }

    cancelAssist() {
        if (this.timer < 0)
            return
        clearTimeout(this.timer)
        this.timer = -1
    }
}

Module.onRuntimeInitialized = () => {
    new GameWorker()
}

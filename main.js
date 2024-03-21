window.addEventListener('load', () => {
    'use strict'

    let game

    document.getElementById('init-button').addEventListener('click', () => {
        let game = new Module.Game()
        const turn = game.turn
        console.log(turn)
    })
})

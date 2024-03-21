window.addEventListener('load', () => {
    'use strict'

    document.getElementById('button').addEventListener('click', () => {
        const result = Module.ccall(
            'run',
            null,  // void
            [],  // argument types
            [  // arguments
            ]
        )
        console.log(result)
    })
})

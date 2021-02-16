# PlayRat

PlayRat is a web-based interpreter for [RatVM](https://github.com/GrenDrake/ratvm) game files.
It is built using typescript with no external dependancies.
Due to security restrictions in browsers, PlayRat will not work if opened as a local file; it must be run from a server.

For more information on developing games with RatVM, check the [RatVM documentation](http://ratvm.grenslair.com/).

## Building

Run the TypeScript compiler (`tsc`) in the `js` directory.
PlayRat uses no dependancies or external modules.

## Deployment

Place the `play.html` file into the directory of choice; the JavaScript files produced by `tsc` should be placed in a `js` subdirectory.
Game files should be placed in the `games` directory.

By default, PlayRat will attempt to load and play `./games/game.rvm`.
If you want it to load a different file, you can specify the name in the query string.
For example, `/play.html?game=gamename` will attempt to load `./games/gamename.rvm`.

## License

PlayRat is released under the [GPL-3.0 license](LICENSE).

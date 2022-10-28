# hyper-html-log

Plugin for the [`hyper` terminal emulator](https://hyper.is/) to record the output of terminal sessions to a static, standalone HTML file which can be viewed in a web browser. The intent of this plugin is to aid instructors when teaching classes how to use UNIX terminals (eg, in Software Carpentries classes), and it is developed as a component of the [`livecode-streamer` project](https://pypi.org/project/livecode-streamer/).

## Usage

Open the `Tools` menu (from the hamburger in Windows/Linux and from the top bar in MacOS) and check `Log to HTML`, which will present a file picker to choose the output location. The log will be updated whenever you hit the return key. To stop logging, select `Log to HTML` again to uncheck it.

## Installation

Run the following command:
`hyper i hyper-html-log`

## Caveats

This plugin deliberately does not include content in the log printed while the terminal is in raw mode (eg, in an interactive application like `nano` or `less`), as it is unclear exactly how these scenarios should be presented in a static format.

## Change log, roadmap, contributions

Pull requests welcome :) 

Change log:

- v0.0.3: Bug fixes, move logging option to 'Tools' menu to accomodate MacOS UI
- v0.0.2: First public release


Feature wish list:

- Custom HTML templating
- Delta file updates, rather than rewriting the whole thing
- Distinguishing echoed user input from stdout/stderr


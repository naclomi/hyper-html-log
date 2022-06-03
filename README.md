# hyper-html-log

Record the output of terminal sessions to a static, standalone HTML file that can be viewed in a web browser. The intent of this plugin is to aid instructors when teaching classes how to use UNIX terminals (eg, in Software Carpentries classes), and it is developed as a component of the `livecode-streamer` project.

## Usage

Open the hamburger menu and check `Log to HTML`, which will present a file picker to choose the output location. The log will be updated whenever you hit the return key. To stop logging, select `Log to HTML` again to uncheck it.

## Caveats

This plugin deliberately does not include content in the log printed while the terminal is in raw mode (eg, in an interactive application like `nano` or `less`), as it is unclear exactly how these scenarios should be presented in a static format.

## Road map and contributions

Pull requests welcome :) 

Feature wish list:

- Custom HTML templating
- Delta file updates, rather than rewriting the whole thing
- Distinguishing echoed user input from stdout/stderr


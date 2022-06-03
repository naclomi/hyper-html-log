const {dialog} = require('electron');
const fs = require('fs');

exports.middleware = (store) => (next) => (action) => {
  const state = store.getState();
  if ('SESSION_USER_DATA' === action.type) {
    if (state.ui.htmlLogFiles && state.ui.htmlLogFiles[state.ui.activeUid] !== undefined) {
      if (action.data.endsWith("\n") || action.data.endsWith("\r")) {
        setInterval(()=>{
          store.dispatch({
            type: 'HTML_LOGGER_DUMP',
            uid: state.ui.activeUid
          });
        }, 500);
      }
    }
  } else if ('UI_OPEN_HAMBURGER_MENU' === action.type) {
    const isLogging = (state.ui.htmlLogFiles && state.ui.htmlLogFiles[state.ui.activeUid] !== undefined) || false;
    window.rpc.emit('HTML_LOGGER_STATUS', isLogging);
  }
  next(action);
};

exports.reduceUI = (state, action) => {
  switch (action.type) {
    case 'HTML_LOGGER_START':
      return state.setIn(["htmlLogFiles", action.uid], action.filename);
    case 'HTML_LOGGER_STOP':
      return state.setIn(["htmlLogFiles", action.uid], undefined);
    case 'HTML_LOGGER_REWIND':
        var log = state.htmlLogs[action.uid];
        let idx = log.length;
        let line_count = 0;
        for (let line_count = 0; line_count < action.lines; line_count++) {
          idx = log.lastIndexOf('\n', idx-1);
        }
        log = log.slice(0, idx+1);
        return state.setIn(['htmlLogs', action.uid], log);
    case 'HTML_LOGGER_NEW_DATA':
      if (state.htmlLogs && state.htmlLogs[action.uid]) {
        var log = state.htmlLogs[action.uid];
      } else {
        var log = `
<html>
  <head>
    <style>
      body {
        background: ${state.backgroundColor};
        font-family: ${state.fontFamily};
        font-weight: ${state.fontWeight};
        margin: 1em;
      }
    </style>
  </head>
  <body><pre>`;
      }
      log += action.data;
      return state.setIn(['htmlLogs', action.uid], log);;
    case 'HTML_LOGGER_DUMP':
      var final_html = state.htmlLogs[action.uid] + "</pre></body></html>";
      fs.writeFileSync(state.htmlLogFiles[action.uid], final_html, 'utf-8'); 
      return state;
  }
  return state;
};

exports.onWindow = (window) => {
  const {Menu} = require('electron');
  window.rpc.on('HTML_LOGGER_STATUS',(logging) => {
    let menuItems = Menu.getApplicationMenu().items;
    for (let item of menuItems) {
      if (item.label === 'Log to HTML') {
        item.checked = logging;
        break;
      }
    }
  });
}

exports.decorateMenu = (menu) =>  {
    return menu.concat([
      {type: 'separator'},
      {label: 'Log to HTML',
        type: 'checkbox',
        click: (item, window, event) => {
          if (item.checked === true) {
            let filename = dialog.showSaveDialogSync(window, {
              properties: ['createDirectory', "showOverwriteConfirmation"],
              filters: [
                { name: 'Webpages', extensions: ['html', 'htm'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });
            if (filename) {
              window.rpc.emit('HTML_LOGGER_START', filename);
            } else {
              item.checked = false;
            }
          } else {
            window.rpc.emit('HTML_LOGGER_STOP');
            item.checked = false;
          }
      }}
    ]);
}


exports.mapTermsState = (state, map) => {
  return Object.assign(map, {
    htmlLogs: state.ui.htmlLogs,
    htmlLogFiles: state.ui.htmlLogFiles
  });
};

const passProps = (uid, parentProps, props) => {
  return Object.assign(props, {
    htmlLogs: parentProps.htmlLogs,
    htmlLogFiles: parentProps.htmlLogFiles
  });
}

exports.getTermGroupProps = passProps;
exports.getTermProps = passProps;


exports.decorateTerm = (Term, { React, notify }) => {
  return class extends React.Component {
    constructor (props, context) {
      super(props, context);
      this._onDecorated = this._onDecorated.bind(this);

      this._term = null;
      this._lastLogLine = 0;
    }

    _onDecorated (term) {
      if (this.props.onDecorated) this.props.onDecorated(term);
      this._term = term ? term.term : null;
      this._term.onLineFeed(()=>{
        // TODO: figure out exactly what mode we care about:
        if (!this._term.modes.applicationCursorKeysMode) {
          const buffer = this._term.buffer.active;
          const theme = this._term.options.theme;
          const bufferMaxY = buffer.baseY + buffer.cursorY - 1;
          if (this._lastLogLine > bufferMaxY) {
            window.store.dispatch({
              type: 'HTML_LOGGER_REWIND',
              uid: this.props.uid,
              lines: this._lastLogLine - bufferMaxY
            })
            this._lastLogLine = bufferMaxY;
          }
          let html = "";
          for (; this._lastLogLine <= bufferMaxY; this._lastLogLine += 1) {
            const line = buffer.getLine(this._lastLogLine);
            let cell = buffer.getNullCell();
            let line_html = "<span>";
            let lastFgColorRaw = undefined;
            let lastBgColorRaw = undefined;
            let lastBold = undefined;
            for (let col = 0; col < line.length; col += 1) {
              cell = line.getCell(col, cell);

              let fgColorRaw = cell.getFgColor();
              let bgColorRaw = cell.getBgColor();
              const bold = cell.isBold();

              // Bold text in brighter colors
              // See: https://github.com/xtermjs/xterm.js/blob/da93a35671489477e6e0b5ebc164d974b7896a9d/src/browser/renderer/TextRenderLayer.ts#L255
              if (bold && cell.isFgPalette()) {
                fgColorRaw += 8;
              }
              if (bold && cell.isBgPalette()) {
                bgColorRaw += 8;
              }

              if (fgColorRaw !== lastFgColorRaw || bgColorRaw !== lastBgColorRaw || bold != lastBold) {
                //////////////////////////
                // 
                // TODO: this reaches into non-public xterm.js structures; figure out how to correlate ansi
                //       palette entries to theme colors without doing this
                // Maybe use this: https://www.npmjs.com/package/ansi-styles
                let fgColor = fgColorRaw === -1 ? theme.foreground :
                                fgColorRaw <= 255 ? this._term._core._colorManager.colors.ansi[fgColorRaw].css :
                                                      fgColorRaw;
                let bgColor = bgColorRaw === -1 ? theme.background :
                                bgColorRaw <= 255 ? this._term._core._colorManager.colors.ansi[bgColorRaw].css :
                                                      bgColorRaw;
                //
                //////////////////////////
                let fontProps = ""
                if (bold) {
                  fontProps += "font-weight: bold; ";
                }
                line_html += `</span><span style="color: ${fgColor}; background-color: ${bgColor}; ${fontProps}">`;
              }

              let char = cell.getChars();
              if (char == "") {
                char = " ";
              }
              line_html += char;

              lastFgColorRaw = fgColorRaw;
              lastBgColorRaw = bgColorRaw;
              lastBold = bold;
            }
            line_html += "</span>\n";
            html += line_html;
          }
          // TODO: only dispatch if logging
          window.store.dispatch({
            type: 'HTML_LOGGER_NEW_DATA',
            uid: this.props.uid,
            data: html
          })
        }
      })
    }

    componentDidMount () {
      window.rpc.on('HTML_LOGGER_START',(filename) => {
        if (!this.props.isTermActive) return;
        window.store.dispatch({
          type: 'HTML_LOGGER_START',
          uid: this.props.uid,
          filename: filename
        })
      });
      window.rpc.on('HTML_LOGGER_STOP',() => {
        if (!this.props.isTermActive) return;
        window.store.dispatch({
          type: 'HTML_LOGGER_STOP',
          uid: this.props.uid
        })
      });
    }

    render () {
      return React.createElement(Term, Object.assign({}, this.props, {
        onDecorated: this._onDecorated,
      }));
    }

    componentWillUnmount () {
    }
  }
};


var state = {
  compiler: {},
  content: {},
  themes: [],
  theme: '',
  raw: false,
  tab: ''
}

var events = {
  tab: (e) => {
    state.tab = e.target.parentNode.hash.replace('#tab-', '')
    localStorage.setItem('tab', state.tab)
  },

  compiler: {
    name: (e) => {
      state.compiler.name = ui.compilers[e.target.selectedIndex]
      chrome.runtime.sendMessage({
        message: 'compiler.name',
        compiler: state.compiler
      }, () => {
        // preserve options order
        state.compiler.options = []
        m.redraw()
        chrome.runtime.sendMessage({message: 'settings'}, init)
      })
    },
    options: (e) => {
      state.compiler.options[e.target.name] = !state.compiler.options[e.target.name]
      chrome.runtime.sendMessage({
        message: 'compiler.options',
        compiler: state.compiler
      })
    },
    flavor: (e) => {
      state.compiler.flavor = ui.flavors[e.target.selectedIndex]
      chrome.runtime.sendMessage({
        message: 'compiler.flavor',
        compiler: state.compiler
      }, () => {
        chrome.runtime.sendMessage({message: 'settings'}, init)
      })
    }
  },

  content: (e) => {
    state.content[e.target.name] = !state.content[e.target.name]
    chrome.runtime.sendMessage({
      message: 'content',
      content: state.content
    })
  },

  theme: (e) => {
    state.theme = state.themes[e.target.selectedIndex]
    chrome.runtime.sendMessage({
      message: 'theme',
      theme: state.theme
    })
  },

  raw: () => {
    state.raw = !state.raw
    chrome.runtime.sendMessage({
      message: 'raw',
      raw: state.raw
    })
  },

  defaults: () => {
    chrome.runtime.sendMessage({
      message: 'defaults'
    }, () => {
      chrome.runtime.sendMessage({message: 'settings'}, init)
      localStorage.removeItem('tab')
    })
  },

  advanced: () => {
    chrome.runtime.sendMessage({message: 'advanced'})
  }
}

var ui = {
  tabs: [
    'theme', 'compiler', 'options', 'content'
  ],
  compilers: [
    'showdown', 'marked'
  ],
  flavors: [
    'github', 'original'
  ],
  description: {
    compiler: {
      marked: {
        gfm: 'Enable GFM\n(GitHub Flavored Markdown)',
        tables: 'Enable GFM tables\n(requires the gfm option to be true)',
        breaks: 'Enable GFM line breaks\n(requires the gfm option to be true)',
        pedantic: 'Don\'t fix any of the original markdown\nbugs or poor behavior',
        sanitize: 'Ignore any HTML\nthat has been input',
        smartLists: 'Use smarter list behavior\nthan the original markdown',
        smartypants: 'Use "smart" typographic punctuation\nfor things like quotes and dashes'
      },
      showdown: {
        disableForced4SpacesIndentedSublists: "Disables the requirement of indenting nested sublists by 4 spaces",
        encodeEmails: "Encode e-mail addresses through the use of Character Entities, transforming ASCII e-mail addresses into its equivalent decimal entities",
        excludeTrailingPunctuationFromURLs: "Excludes trailing punctuation from links generated with autoLinking",
        ghCodeBlocks: "Turn on/off GFM fenced code blocks support",
        ghCompatibleHeaderId: "Generate header ids compatible with github style (spaces are replaced with dashes, a bunch of non alphanumeric chars are removed)",
        ghMentions: "Enables github @mentions",
        ghMentionsLink: "Changes the link generated by @mentions. Only applies if ghMentions option is enabled.",
        headerLevelStart: "The header blocks level start",
        literalMidWordUnderscores: "Parse midword underscores as literal underscores",
        noHeaderId: "Turn on/off generated header id",
        omitExtraWLInCodeBlocks: "Omit the default extra whiteline added to code blocks",
        parseImgDimensions: "Turn on/off image dimension parsing",
        prefixHeaderId: "Specify a prefix to generated header ids",
        requireSpaceBeforeHeadingText: "Makes adding a space between `#` and the header text mandatory (GFM Style)",
        simpleLineBreaks: "Parses simple line breaks as <br> (GFM Style)",
        simplifiedAutoLink: "Turn on/off GFM autolink style",
        smartIndentationFix: "Tries to smartly fix indentation in es6 strings",
        smoothLivePreview: "Prevents weird effects in live previews due to incomplete input",
        strikethrough: "Turn on/off strikethrough support",
        tables: "Turn on/off tables support",
        tablesHeaderId: "Add an id to table headers",
        tasklists: "Turn on/off GFM tasklist support"
      }
    },
    content: {
      scroll: 'Remember scroll position',
      toc: 'Generate Table of Contents'
    }
  }
}

function init (res) {
  state.compiler = res.compiler
  state.content = res.content
  state.theme = res.theme

  state.themes = chrome.runtime.getManifest().web_accessible_resources
    .filter((file) => (file.indexOf('/themes/') === 0))
    .map((file) => (file.replace(/\/themes\/(.*)\.css/, '$1')))

  state.raw = res.raw
  state.tab = localStorage.getItem('tab') || 'theme'
  m.redraw()
}

chrome.runtime.sendMessage({message: 'settings'}, init)

function oncreate (vnode) {
  componentHandler.upgradeElements(vnode.dom)
}
var onupdate = (tab, key) => (vnode) => {
  var value = tab === 'compiler' ? state[tab].options[key]
    : tab === 'content' ? state[tab][key]
    : null

  if (vnode.dom.classList.contains('is-checked') !== value) {
    vnode.dom.classList.toggle('is-checked')
  }
}

m.mount(document.querySelector('body'), {
  view: (vnode) =>
    m('#popup',
      // defaults
      m('button.mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect',
        {oncreate, onclick: events.raw},
        (state.raw ? 'Html' : 'Markdown')),
      m('button.mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect',
        {oncreate, onclick: events.defaults},
        'Defaults'),

      // tabs
      m('.mdl-tabs mdl-js-tabs mdl-js-ripple-effect', {oncreate},
        m('.mdl-tabs__tab-bar', {onclick: events.tab}, ui.tabs.map((tab) =>
          m('a.mdl-tabs__tab', {
            href: '#tab-' + tab,
            class: state.tab === tab ? 'is-active' : null
          }, tab))
        ),

        // theme
        m('.mdl-tabs__panel #tab-theme', {class: state.tab === 'theme' ? 'is-active' : null},
          m('select.mdl-shadow--2dp', {onchange: events.theme}, state.themes.map((theme) =>
            m('option', {selected: state.theme === theme}, theme)
          ))
        ),

        // compiler
        m('.mdl-tabs__panel #tab-compiler', {class: state.tab === 'compiler' ? 'is-active' : null},
          m('select.mdl-shadow--2dp', {onchange: events.compiler.name}, ui.compilers.map((name) =>
            m('option', {selected: state.compiler.name === name}, name)
          ))
        ),

        // options
        m('.mdl-tabs__panel #tab-options',
          {class: state.tab === 'options' ? 'is-active' : null}, [
          (state.compiler.name === 'showdown' || null) &&
          m('select.mdl-shadow--2dp', {onchange: events.compiler.flavor}, ui.flavors.map((name) =>
            m('option', {selected: state.compiler.flavor === name}, name)
          )),
          m('.scroll', {class: state.compiler.name},
            m('.mdl-grid', Object.keys(state.compiler.options || [])
              .filter((key) => typeof state.compiler.options[key] === 'boolean')
              .map((key) =>
              m('.mdl-cell',
                m('label.mdl-switch mdl-js-switch mdl-js-ripple-effect',
                  {oncreate, onupdate: onupdate('compiler', key),
                  title: ui.description.compiler[state.compiler.name][key]},
                  m('input[type="checkbox"].mdl-switch__input', {
                    name: key,
                    checked: state.compiler.options[key],
                    onchange: events.compiler.options
                  }),
                  m('span.mdl-switch__label', key)
                )
              ))
            )
          )
        ]),

        // content
        m('.mdl-tabs__panel #tab-content',
          {class: state.tab === 'content' ? 'is-active' : null},
          m('.scroll',
            m('.mdl-grid', Object.keys(state.content).map((key) =>
              m('.mdl-cell',
                m('label.mdl-switch mdl-js-switch mdl-js-ripple-effect',
                  {oncreate, onupdate: onupdate('content', key), title: ui.description.content[key]},
                  m('input[type="checkbox"].mdl-switch__input', {
                    name: key,
                    checked: state.content[key],
                    onchange: events.content
                  }),
                  m('span.mdl-switch__label', key)
                )
              )
            ))
          )
        )
      ),

      // advanced options
      m('button.mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect',
        {oncreate, onclick: events.advanced},
        'Advanced Options')
    )
})


var $ = document.querySelector.bind(document)

var state = {
  theme,
  raw,
  content,
  compiler,
  html: '',
  markdown: '',
  toc: ''
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.message === 'reload') {
    location.reload(true)
  }
  else if (req.message === 'theme') {
    state.theme = req.theme
    m.redraw()
  }
  else if (req.message === 'raw') {
    state.raw = req.raw
    m.redraw()
  }
})

var oncreate = {
  markdown: () => {
    scroll()
  },
  html: () => {
    scroll()
    if (state.content.toc && !state.toc) {
      state.toc = toc()
      m.redraw()
    }
    setTimeout(() => Prism.highlightAll(), 20)
  }
}

function mount () {
  $('pre').style.display = 'none'
  var md = $('pre').innerText

  m.mount($('body'), {
    oninit: () => {
      ;((done) => {
        if (document.charset === 'UTF-8') {
          done()
          return
        }
        m.request({method: 'GET', url: location.href,
          deserialize: (body) => {
            done(body)
            return body
          }
        })
      })((data) => {
        state.markdown = data || md

        chrome.runtime.sendMessage({
          message: 'markdown',
          compiler: state.compiler,
          markdown: state.markdown
        }, (res) => {
          state.html = res.html
          m.redraw()
        })
      })
    },
    view: () => {
      var dom = []

      if (state.raw) {
        dom.push(m('pre#markdown', {oncreate: oncreate.markdown}, state.markdown))
        $('body').classList.remove('_toc-left', '_toc-right')
      }
      else {
        if (state.theme) {
          dom.push(m('link#theme [rel="stylesheet"] [type="text/css"]', {
            href: chrome.runtime.getURL('/themes/' + state.theme + '.css')
          }))
        }
        if (state.html) {
          dom.push(m('#html', {oncreate: oncreate.html,
            class: /github(-dark)?/.test(state.theme) ? 'markdown-body' : 'markdown-theme'},
            m.trust(state.html)
          ))
          if (state.content.toc && state.toc) {
            dom.push(m.trust(state.toc))
            $('body').classList.add('_toc-left')
          }
        }
      }

      return (dom.length ? dom : m('div'))
    }
  })
}

function scroll () {
  if (state.content.scroll) {
    $('body').scrollTop = parseInt(localStorage.getItem('md-' + location.href))
  }
  else if (location.hash) {
    $('body').scrollTop = $(location.hash) && $(location.hash).offsetTop
    setTimeout(() => {
      $('body').scrollTop = $(location.hash) && $(location.hash).offsetTop
    }, 100)
  }
}
scroll.init = () => {
  if (state.content.scroll) {
    var timeout = null
    window.addEventListener('scroll', () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        localStorage.setItem('md-' + location.href, $('body').scrollTop)
      }, 100)
    })
  }
  setTimeout(scroll, 100)
}

if (document.readyState === 'complete') {
  mount()
  scroll.init()
}
else {
  window.addEventListener('DOMContentLoaded', mount)
  window.addEventListener('load', scroll.init)
}

var toc = (
  link = (header) => '<a href="#' + header.id + '">' + header.title + '</a>') =>
  Array.from($('#html').childNodes)
  .filter((node) => /h[1-6]/i.test(node.tagName))
  .map((node) => ({
    id: node.getAttribute('id'),
    level: parseInt(node.tagName.replace('H', '')),
    title: node.innerText
  }))
  .reduce((html, header, index, headers) => {
    if (index) {
      var prev = headers[index - 1]
    }
    if (!index || prev.level === header.level) {
      html += link(header)
    }
    else if (prev.level > header.level) {
      html += '</div>' + link(header)
    }
    else if (prev.level < header.level) {
      html += '<div id="_ul">' + link(header)
    }
    return html
  }, '<div id="_toc"><div id="_ul">') + '</div></div>'

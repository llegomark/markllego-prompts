(() => {

  const fetch = window._fetch = window._fetch || window.fetch
  window.fetch = (...t) => {
    if (t[0] !== 'https://chat.openai.com/backend-api/conversation') return fetch(...t)
    if (!window.selectedprompttemplate) return fetch(...t)
    const template = window.selectedprompttemplate

    try {
      const options = t[1]
      const body = JSON.parse(options.body)
      const prompt = body.messages[0].content.parts[0]
      body.messages[0].content.parts[0] = template.prompt.replace('[INSERT]', prompt)
      selectPromptTemplate(null)
      options.body = JSON.stringify(body)
      return fetch(t[0], options)
    } catch {
      return fetch(...t)
    }
  }

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type !== 'childList')
        if (mutation.addedNodes.length == 0) return
      const node = mutation.addedNodes[0]
      if (!node || !node.querySelector) return
      handleElementAdded(node)
    })
  })

  observer.observe(document.body, { subtree: true, childList: true })

  fetch('')
    .then(res => res.text())
    .then(csv => CSVToArray(csv))
    .then(records => {
      return records.map(([category, title, teaser, prompt, placeholder]) => {
        return { category, title, teaser, prompt, placeholder }
      })
        .filter(({ title }) => title && title !== 'title')
    })
    .then(templates => {
      window.prompttemplates = templates
      insertPromptTemplatesSection()
    })

  setupSidebar()
})()

function handleElementAdded(e) {
  if (e.id === 'headlessui-portal-root') {
    setupSidebar()
    return
  }

  if (e.querySelector('h1.text-4xl')) {
    insertPromptTemplatesSection()
    const button = document.getElementById('export-button')
    if (button) button.style = 'pointer-events: none;opacity: 0.5'
  }

  if (document.querySelector('.xl\\:max-w-3xl')) {
    const button = document.getElementById('export-button')
    if (button) button.style = ''
  }

  if (e.querySelector('.lg\\:self-center.lg\\:pl-2')) {
    const buttonGroup = e.querySelector('.lg\\:self-center.lg\\:pl-2')
    if (buttonGroup.children.length !== 2) return
    addCopyButton(buttonGroup)
  }

}

function setupSidebar() {
  addExportButton()
  const buttons = getNewChatButtons()
  buttons.forEach(button => {
    button.onclick = () => {
      selectPromptTemplate(null)
    }
  })
}

function addExportButton() {
  const nav = document.querySelector('nav')
  if (!nav || nav.querySelector('#export-button')) return

  const button = document.createElement('a')
  button.id = 'export-button'
  button.className = css`ExportButton`
  button.innerHTML = `${svg`Archive`} Export Chat`
  button.onclick = exportCurrentChat

  if (document.querySelector('.flex-1.overflow-hidden h1')) {
    button.style = 'pointer-events: none;opacity: 0.5'
  }

  const colorModeButton = [...nav.children].find(child => child.innerText.includes('Mode'))
  nav.insertBefore(button, colorModeButton)
}

function getNewChatButtons(callback) {
  const sidebar = document.querySelector('nav')
  const topbar = document.querySelector('.sticky')
  const newChatButton = [...sidebar?.querySelectorAll('.cursor-pointer') ?? []].find(e => e.innerText === 'New Chat')
  const AddButton = topbar?.querySelector("button.px-3")
  return [newChatButton, AddButton].filter(button => button)
}

const promptTemplateSection = {
  currentPage: 0,
  pageSize: 1
}

function insertPromptTemplatesSection() {
  const title = document.querySelector('h1.text-4xl')
  if (!title) return

  title.style = 'text-align: center; margin-top: 4rem'
  title.innerHTML = 'Mark Llego ChatGPT Prompts'

  const templates = window.prompttemplates
  if (!templates) return

  const parent = title.parentElement
  if (!parent) return

  parent.classList.remove('md:h-full')

  const { currentPage, pageSize } = promptTemplateSection
  const start = pageSize * currentPage
  const end = Math.min(pageSize * (currentPage + 1), templates.length)
  const currentTemplates = window.prompttemplates.slice(start, end)

  const html = `
    <div class="${css`column`}">
    ${svg`ChatBubble`}
    <h2 class="${css`h2`}">
    <ul class="${css`ul`}">
      ${currentTemplates.map((template, i) => `
        <button onclick="selectPromptTemplate(${start + i})" class="${css`card`}">
          <h3 class="${css`h3`}">${template.title}</h3>
          <p class="${css`p`}">${template.teaser
    }</p>
          <span class="font-medium">Use prompt →</span>
        </button>
      `).join('')}
    </ul>

    <div class="${css`column`} items-center">
      <span class="${css`paginationText`}">
        Showing <span class="${css`paginationNumber`}">${start + 1}</span> to <span class="${css`paginationNumber`}">${end}</span> of <a href="https://prompts.chat/" target="_blank" class="underline"><span class="${css`paginationNumber`}">${templates.length} Entries</span></a>
      </span>
      <div class="${css`paginationButtonGroup`}">
        <button onclick="prevPromptTemplatesPage()" class="${css`paginationButton`}" style="border-radius: 6px 0 0 6px">Prev</button>
        <button onclick="nextPromptTemplatesPage()" class="${css`paginationButton`} border-0 border-l border-gray-500" style="border-radius: 0 6px 6px 0">Next</button>
      </div>
    </div>
    </div>
  `

  let wrapper = document.createElement('div')
  wrapper.id = 'templates-wrapper'
  wrapper.className = 'mt-6 flex items-start text-center gap-3.5'

  if (parent.querySelector('#templates-wrapper')) {
    wrapper = parent.querySelector('#templates-wrapper')
  } else {
    parent.appendChild(wrapper)
  }

  wrapper.innerHTML = html
}

function prevPromptTemplatesPage() {
  promptTemplateSection.currentPage--
  promptTemplateSection.currentPage = Math.max(0, promptTemplateSection.currentPage)
  insertPromptTemplatesSection()
}

function nextPromptTemplatesPage() {
  const templates = window.prompttemplates
  if (!templates || !Array.isArray(templates)) return

  promptTemplateSection.currentPage++
  promptTemplateSection.currentPage = Math.min(
    Math.floor(
      (templates.length - 1) /
      promptTemplateSection.pageSize
    ),
    promptTemplateSection.currentPage
  )
  insertPromptTemplatesSection()
}

function addCopyButton(buttonGroup) {
  const button = document.createElement('button')
  button.onclick = () => {
    const text = buttonGroup.parentElement.innerText
    navigator.clipboard.writeText(text)
  }
  button.className = css`action`
  button.innerHTML = svg`Clipboard`
  buttonGroup.prepend(button)
}

function exportCurrentChat() {
  const blocks = [...document.querySelector('.flex.flex-col.items-center').children]
  let markdown = blocks.map(block => {
    let wrapper = block.querySelector('.whitespace-pre-wrap')

    if (!wrapper) {
      return ''
    }

    if (wrapper.children.length === 0) {
      return '**User:**\n' + wrapper.innerText
    }

    wrapper = wrapper.firstChild

    return '**ChatGPT:**\n' + [...wrapper.children].map(node => {
      switch (node.nodeName) {
        case 'PRE': return `\`\`\`${node.getElementsByTagName('code')[0].classList[2].split('-')[1]}\n${node.innerText.replace(/^Copy code/g, '').trim()}\n\`\`\``
        default: return `${node.innerHTML}`
      }
    }).join('\n')

  })

  markdown = markdown.filter(b => b)

  if (!markdown) return false

  let signature = ''

  try {
    signature = `***\n###### _Exported by **${__NEXT_DATA__.props.pageProps.user.name}** on ${new Date().toLocaleString()}_`
  } catch { }

  const blob = new Blob([markdown.join('\n\n***\n\n') + '\n\n\n' + signature], { type: 'text/plain' })

  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'chatgpt-thread_' + (new Date().toLocaleString('en-US', { hour12: false }).replace(/[\s/:]/g, '-').replace(',', '')) + '.md'
  document.body.appendChild(a)
  a.click()
}

function selectPromptTemplate(idx) {
  const templates = window.prompttemplates
  if (!templates || !Array.isArray(templates)) return

  const template = templates[idx]

  const textarea = document.querySelector('textarea')
  const parent = textarea.parentElement
  let wrapper = document.createElement('div')
  wrapper.id = 'prompt-wrapper'
  if (parent.querySelector('#prompt-wrapper')) {
    wrapper = parent.querySelector('#prompt-wrapper')
  } else {
    parent.prepend(wrapper)
  }

  if (template) {
    wrapper.innerHTML = `
    <span class="${css`tag`}">
      ${template.title}
    </span>
    `
    textarea.placeholder = template.placeholder
    window.selectedprompttemplate = template
    textarea.focus()
  } else {
    wrapper.innerHTML = ``
    textarea.placeholder = ''
    window.selectedprompttemplate = null
  }
}

function CSVToArray(strData, strDelimiter) {
  strDelimiter = strDelimiter || ",";
  var pattern = new RegExp(
    "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
    "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
    "([^\"\\" + strDelimiter + "\\r\\n]*))",
    "gi"
  );
  var data = [[]];
  var matches;
  while (matches = pattern.exec(strData)) {
    var delimiter = matches[1];
    if (delimiter.length && delimiter !== strDelimiter) {
      data.push([]);
    }
    var value = matches[2]
      ? matches[2].replace(new RegExp("\"\"", "g"), "\"")
      : matches[3];
    data[data.length - 1].push(value);
  }
  return data;
}

function svg(name) {
  name = Array.isArray(name) ? name[0] : name
  switch (name) {
    case 'Archive': return '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4" height="1em" <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>'
    case 'ChatBubble': return '<svg stroke="currentColor" fill="none" stroke-width="1.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 m-auto" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>'
    case 'Clipboard': return '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>'
  }
}

function css(name) {
  name = Array.isArray(name) ? name[0] : name
  switch (name) {
    case 'ExportButton': return 'flex py-3 px-3 items-center gap-3 rounded-md hover:bg-gray-500/10 transition-colors duration-200 text-white cursor-pointer text-sm'
    case 'column': return 'flex flex-col gap-3.5 flex-1'
    case 'h2': return 'text-lg font-normal">Optimized ChatGPT Prompts</h2><ul class="flex flex-col gap-3.5'
    case 'h3': return 'm-0 tracking-tight leading-8 text-gray-900 dark:text-gray-100 text-xl'
    case 'ul': return 'flex flex-col gap-3.5'
    case 'card': return 'flex flex-col gap-2 w-full bg-gray-50 dark:bg-white/5 p-4 rounded-md hover:bg-gray-200 dark:hover:bg-gray-900 text-left'
    case 'p': return 'm-0 font-light text-gray-500'
    case 'paginationText': return 'text-sm text-gray-700 dark:text-gray-400'
    case 'paginationNumber': return 'font-semibold text-gray-900 dark:text-white'
    case 'paginationButtonGroup': return 'inline-flex mt-2 xs:mt-0'
    case 'paginationButton': return 'px-4 py-2  font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:text-white'
    case 'action': return 'p-1 rounded-md hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 disabled:dark:hover:text-gray-400 md:invisible md:group-hover:visible'
    case 'tag': return 'inline-flex items-center py-1 px-2 mr-2 mb-2 text-sm font-medium text-white rounded bg-gray-600 whitespace-nowrap'
  }
}

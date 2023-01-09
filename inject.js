let PromptPlaceholder = '[INSERT]';
let PromptFeedURL = '';
let EndpointConversation = 'https://chat.openai.com/backend-api/conversation';
let AppShort = 'Mark Llego';
let AppName = 'Mark Llego ChatGPT Prompts';
let AppSlogan = 'ChatGPT Prompts for Productive Work';
let AppURL = 'https://markllego.com/';
let ExportFilePrefix = 'MarkLlego-export-chatgpt-thread_';
let ExportHeaderPrefix = '\n```\nExported with Mark Llego ChatGPT Prompts';

(() => {
  const fetch = window._fetch = window._fetch || window.fetch
  window.fetch = (...t) => {
    if (t[0] !== EndpointConversation) return fetch(...t)

    if (!window.selectedprompttemplate) return fetch(...t)
    const template = window.selectedprompttemplate

    try {
      const options = t[1]
      const body = JSON.parse(options.body)
      const prompt = body.messages[0].content.parts[0]
      body.messages[0].content.parts[0] = template.prompt.replace(PromptPlaceholder, prompt)
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


  const now = new Date();
  const cacheBuster = btoa(now.toISOString().slice(0, 16).toString(36));

  fetch(PromptFeedURL + cacheBuster)
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
  button.innerHTML = `${svg`Export`} Export Chat`
  button.onclick = exportCurrentChat

  if (document.querySelector('.flex-1.overflow-hidden h1')) {
    button.style = 'pointer-events: none;opacity: 0.5'
  }

  const colorModeButton = [...nav.children].find(child => child.innerText.includes('Log out'))
  nav.insertBefore(button, colorModeButton)


  const version = document.createElement('a')
  version.id = 'AppName'
  version.className = css`VersionInfo`
  version.innerHTML = `${svg`Rocket`}` + `markllego.com`
  version.href = AppURL

  colorModeButton2 = [...nav.children].find(child => child.innerText.includes('Log out'))

  nav.insertBefore(version, colorModeButton2)

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
  pageSize: 5
}

function insertPromptTemplatesSection() {
  const title = document.querySelector('h1.text-4xl')
  if (!title) return

  title.style = 'text-align: center; margin-top: 4rem'
  title.innerHTML = AppName

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
    
    ${svg`PromptBubble`}
    <h2 class="${css`h2`}">
    <ul class="${css`ul`}">
      ${currentTemplates.map((template, i) => `
        <button onclick="selectPromptTemplate(${start + i})" class="${css`card`}">
          <h3 class="${css`h3`}">${template.title}</h3>
          <p class="${css`p`}">${template.teaser
    }</p>
        </button>
      `).join('')}
    </ul>

    <div class="${css`column`} items-center">
      <span class="${css`paginationText`}">
        Showing <span class="${css`paginationNumber`}">${start + 1}</span> to <span class="${css`paginationNumber`}">${end}</span> of <span class="${css`paginationNumber`}">${templates.length} Entries</span>
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
  wrapper.className = 'mt-6 flex items-start text-center gap-2.5'

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

  let header = ''

  try {
    header = ExportHeaderPrefix + __NEXT_DATA__.props.pageProps.user.name + ' on ' + new Date().toLocaleString() + '\n```\n\n---'
  } catch { }

  const blob = new Blob([header + '\n\n\n' + markdown.join('\n\n---\n\n')], { type: 'text/plain' })

  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = ExportFilePrefix + new Date().toISOString() + '.md';
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
  let pattern = new RegExp(
    "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
    "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
    "([^\"\\" + strDelimiter + "\\r\\n]*))",
    "gi"
  );
  let data = [[]];
  let matches;
  while (matches = pattern.exec(strData)) {
    let delimiter = matches[1];
    if (delimiter.length && delimiter !== strDelimiter) {
      data.push([]);
    }
    let value = matches[2]
      ? matches[2].replace(new RegExp("\"\"", "g"), "\"")
      : matches[3];
    data[data.length - 1].push(value);
  }
  return data;
}

function svg(name) {
  name = Array.isArray(name) ? name[0] : name
  switch (name) {

    case 'Rocket': return `<svg fill="#ffffff" height="1rem" width="1rem" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-25.91 -25.91 310.92 310.92" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_iconCarrier"> <g> <g> <g> <path d="M256.468,2.637c-1.907-1.907-4.575-2.855-7.25-2.593L228.027,2.14c-33.604,3.324-65.259,18.304-89.135,42.18 l-0.365,0.365l-5.298-2.038c-23.593-9.073-50.386-3.388-68.262,14.486l-54.008,54.008c-0.096,0.091-0.188,0.184-0.279,0.279 l-8.044,8.043c-3.515,3.515-3.515,9.213,0,12.728c3.516,3.515,9.213,3.515,12.729,0l4.051-4.051l32.714,12.582 c0.372,0.618,0.813,1.206,1.347,1.739l3.65,3.65l-10.583,10.583c-3.49,3.49-3.51,9.129-0.071,12.649 c-17.598,19.116-23.107,33.004-32.352,56.335c-1.229,3.099-2.53,6.384-3.942,9.889c-1.543,3.823-0.657,8.178,2.257,11.095 c1.965,1.966,4.584,3.011,7.255,3.011c1.291,0,2.595-0.244,3.842-0.746c3.509-1.414,6.793-2.715,9.892-3.943 c23.33-9.246,37.219-14.755,56.336-32.353c1.748,1.707,4.015,2.564,6.285,2.564c2.304,0,4.606-0.879,6.364-2.636l10.582-10.582 l3.649,3.649c0.525,0.524,1.112,0.968,1.738,1.344l12.583,32.718l-4.051,4.051c-3.515,3.515-3.515,9.213,0,12.728 c1.758,1.758,4.061,2.636,6.364,2.636c2.303,0,4.606-0.879,6.364-2.636l8.043-8.043c0.096-0.091,0.188-0.185,0.279-0.28 l54.01-54.009c17.874-17.875,23.56-44.669,14.485-68.261l-2.037-5.298l0.365-0.365c23.876-23.876,38.856-55.532,42.18-89.135 l2.096-21.191C259.325,7.204,258.374,4.543,256.468,2.637z M33.343,114.214l44.353-44.352 c12.291-12.291,30.45-16.558,46.85-11.196l-65.453,65.452L33.343,114.214z M33.537,225.569 c7.256-18.099,12.332-28.892,25.667-43.484l17.816,17.816C62.428,213.236,51.633,218.313,33.537,225.569z M96.044,193.469 L65.635,163.06l4.219-4.219l30.409,30.409L96.044,193.469z M123.005,186.536L72.568,136.1l59.424-59.423l50.436,50.436 L123.005,186.536z M189.242,181.409l-44.352,44.352l-9.904-25.751l65.451-65.451 C205.801,150.958,201.534,169.117,189.242,181.409z M239.052,29.306c-2.915,29.473-16.054,57.237-36.996,78.179l-6.9,6.9 L144.72,63.949l6.901-6.901c20.94-20.941,48.705-34.08,78.178-36.995l10.27-1.016L239.052,29.306z"></path> <path d="M195.926,40.017c-6.187,0-12.003,2.409-16.378,6.784c-9.03,9.03-9.03,23.725,0,32.755 c4.375,4.375,10.191,6.784,16.378,6.784s12.003-2.409,16.378-6.784c9.03-9.03,9.03-23.725,0-32.755 C207.929,42.426,202.113,40.017,195.926,40.017z M199.575,66.828c-0.975,0.975-2.271,1.512-3.649,1.512 c-1.378,0-2.675-0.537-3.649-1.512c-2.013-2.013-2.013-5.287,0-7.3c0.975-0.975,2.271-1.512,3.649-1.512 c1.378,0,2.675,0.537,3.649,1.512C201.588,61.541,201.588,64.816,199.575,66.828z"></path> </g> </g> </g> </g></svg>`
    case 'Export': return '<svg fill="#ffffff" height="1rem" width="1rem" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 29.978 29.978" xml:space="preserve" stroke="#ffffff"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M25.462,19.105v6.848H4.515v-6.848H0.489v8.861c0,1.111,0.9,2.012,2.016,2.012h24.967c1.115,0,2.016-0.9,2.016-2.012 v-8.861H25.462z"></path> <path d="M14.62,18.426l-5.764-6.965c0,0-0.877-0.828,0.074-0.828s3.248,0,3.248,0s0-0.557,0-1.416c0-2.449,0-6.906,0-8.723 c0,0-0.129-0.494,0.615-0.494c0.75,0,4.035,0,4.572,0c0.536,0,0.524,0.416,0.524,0.416c0,1.762,0,6.373,0,8.742 c0,0.768,0,1.266,0,1.266s1.842,0,2.998,0c1.154,0,0.285,0.867,0.285,0.867s-4.904,6.51-5.588,7.193 C15.092,18.979,14.62,18.426,14.62,18.426z"></path> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> <g> </g> </g> </g></svg>'
    case 'PromptBubble': return '<svg stroke="currentColor" fill="none" stroke-width="1.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 m-auto" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>'

  }
}

function css(name) {
  name = Array.isArray(name) ? name[0] : name
  switch (name) {
    case 'VersionInfo': return 'flex py-3 px-3 items-center gap-3 rounded-md hover:bg-gray-500/10 transition-colors duration-200 text-white cursor-pointer text-sm'
    case 'ExportButton': return 'flex py-3 px-3 items-center gap-3 rounded-md hover:bg-gray-500/10 transition-colors duration-200 text-white cursor-pointer text-sm'
    case 'column': return 'flex flex-col gap-3.5 flex-1'
    case 'h2': return 'text-lg font-normal">' + AppSlogan + '</h2><ul class="flex flex-col gap-3.5'
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
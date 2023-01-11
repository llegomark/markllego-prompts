let PromptPlaceholder = '[PROMPT]';
let TargetLanguagePlaceholder = '[TARGETLANGUAGE]';
let PromptFeedURL = '';
let LanguageFeedURL = '';
let EndpointConversation = 'https://chat.openai.com/backend-api/conversation';
let AppShort = 'Mark Llego';
let AppName = 'Mark Llego ChatGPT Prompts';
let AppSlogan = 'Mark Llego Optimized ChatGPT Prompts';
let AppURL = 'https://markllego.com';
let ExportFilePrefix = 'markllego-export-chatgpt-thread_';
let ExportHeaderPrefix = '\n```\nExported with Mark Llego https://markllego.com by ';
let Version = 'markllego';

(() => {
  // Set default TargetLanguage
  window.TargetLanguage = 'English';

  // Save a reference to the original fetch function
  const fetch = window._fetch = window._fetch || window.fetch
  // Replace the fetch function with a modified version that will include a prompt template
  // if one has been selected by the user
  window.fetch = (...t) => {
    // If the request is not for the chat backend API, just use the original fetch function
    if (t[0] !== EndpointConversation) return fetch(...t)

    // If no prompt template has been selected, use the original fetch function
    if (!window.selectedprompttemplate) return fetch(...t)
    // Get the selected prompt template
    const template = window.selectedprompttemplate

    try {
      // Get the options object for the request, which includes the request body
      const options = t[1]
      // Parse the request body from JSON
      const body = JSON.parse(options.body)
      // Get the prompt from the request body
      const prompt = body.messages[0].content.parts[0]
      // Replace the prompt in the request body with the selected prompt template,
      // inserting the original prompt into the template and replacing the target language placeholder
      body.messages[0].content.parts[0] = template.prompt
        .replaceAll(PromptPlaceholder, prompt)
        .replaceAll(TargetLanguagePlaceholder, window.TargetLanguage);

      // Clear the selected prompt template
      selectPromptTemplate(null)
      // Stringify the modified request body and update the options object
      options.body = JSON.stringify(body)
      // Use the modified fetch function to make the request
      return fetch(t[0], options)
    } catch {
      // If there was an error parsing the request body or modifying the request,
      // just use the original fetch function
      return fetch(...t)
    }
  }

  // Create a new observer for the chat sidebar to watch for changes to the document body
  const observer = new MutationObserver(mutations => {
    // For each mutation (change) to the document body
    mutations.forEach(mutation => {
      // If the mutation is not a change to the list of child nodes, skip it
      if (mutation.type !== 'childList')
        // If no new nodes were added, skip this mutation
        if (mutation.addedNodes.length == 0) return
      // Get the first added node
      const node = mutation.addedNodes[0]
      // If the node is not an element or does not have a `querySelector` method, skip it
      if (!node || !node.querySelector) return
      // Call the `handleElementAdded` function with the added node
      handleElementAdded(node)
    })
  })

  // Start observing the document body for changes
  observer.observe(document.body, { subtree: true, childList: true })


  // Get current date and time in ISO format (YYYY-MM-DDTHH:mm)
  const now = new Date();
  // The cache buster will change only once per minute
  const cacheBuster = btoa(now.toISOString().slice(0, 16).toString(36));


  // Fetch the list of prompt templates from a remote CSV file
  fetch(PromptFeedURL + cacheBuster)
    // Convert the response to text
    .then(res => res.text())
    // Convert the CSV text to an array of records
    .then(csv => CSVToArray(csv))
    // Map the records to template objects with properties 'title', 'prompt', and 'placeholder'
    .then(records => {
      return records.map(([category, title, teaser, prompt, placeholder]) => {
        return { category, title, teaser, prompt, placeholder }
      })
        // Filter out records that do not have a title or it is the header row (with "title" as its title)
        .filter(({ title }) => title && title !== 'title')
    })
    .then(templates => {
      // Save the array of prompt templates to a global letiable
      window.prompttemplates = templates
      // Insert the "Prompt Templates" section into the chat interfac
      insertPromptTemplatesSection()
    })

  // Fetch the list of languages from a remote CSV file
  fetch(LanguageFeedURL + cacheBuster)
    // Convert the response to text
    .then(res => res.text())
    // Convert the CSV text to an array of records
    .then(csv => CSVToArray(csv))
    // Map the records to language objects with properties 'langcode', 'languageEnglish' and 'languageLabel'
    .then(records => {
      return records.map(([langcode, languageEnglish, languageLabel]) => {
        return { langcode, languageEnglish, languageLabel }
      })
        // Filter out records that do not have a language code, or it is the header row (with "langcode" as its title)
        .filter(({ langcode }) => langcode && langcode !== 'langcode')
    })
    .then(languages => {
      // Save the array of languages to a global letiable
      window.languages = languages

      // Insert language select and continue button above the prompt textarea input
      insertLanguageSelect()
    });

  // Set up the Sidebar (by adding "Export Chat" button and other stuff)
  setupSidebar()
})()

// This function is called for each new element added to the document body
function handleElementAdded(e) {
  // If the element added is the root element for the chat sidebar, set up the sidebar
  if (e.id === 'headlessui-portal-root') {
    setupSidebar()
    return
  }

  // Disable "Export Button" when no chat were started.
  // Insert "Prompt Templates" section to the main page.
  // Insert language select and continue button above the prompt textarea input
  if (e.querySelector('h1.text-4xl')) {
    insertPromptTemplatesSection()
    const button = document.getElementById('export-button')
    if (button) button.style = 'pointer-events: none;opacity: 0.5'

    insertLanguageSelect();
  }

  // Enable "Export Button" when a new chat started.
  // Insert language select and continue button above the prompt textarea input
  if (document.querySelector('.xl\\:max-w-3xl')) {
    const button = document.getElementById('export-button')
    if (button) button.style = ''

    insertLanguageSelect();
  }

}

// This function sets up the chat sidebar by adding an "Export Button" and modifying
// the "New Chat" buttons to clear the selected prompt template when clicked
function setupSidebar() {
  // Add the "Export Button" to the sidebar
  addExportButton()
  // Get the "New Chat" buttons
  const buttons = getNewChatButtons()
  // Set the onclick event for each button to clear the selected prompt template
  buttons.forEach(button => {
    button.onclick = () => {
      selectPromptTemplate(null)
    }
  })
}

// This function adds an "Export Button" to the sidebar
function addExportButton() {
  // Get the nav element in the sidebar
  const nav = document.querySelector('nav')
  // If there is no nav element or the "Export Button" already exists, skip
  if (!nav || nav.querySelector('#export-button')) return

  // Create the "Export Button" element
  const button = document.createElement('a')
  button.id = 'export-button'
  button.className = css`ExportButton`
  button.innerHTML = `${svg`Export`} Export Content`
  button.onclick = exportCurrentChat

  // If there is no chat started, disable the button 
  if (document.querySelector('.flex-1.overflow-hidden h1')) {
    button.style = 'pointer-events: none;opacity: 0.5'
  }

  // Get the Log out button as a reference 
  const colorModeButton = [...nav.children].find(child => child.innerText.includes('Log out'))
  // Insert the "Export Button" before the "Color Mode" button
  nav.insertBefore(button, colorModeButton)

  // Create the "Version" element
  const version = document.createElement('a')
  version.id = `Version`
  version.className = css`VersionInfo`
  version.innerHTML = `${svg`Rocket`}` + Version + ` v1.0.0`
  //version.onclick = exportCurrentChat
  version.href = AppURL

  // Get the Log out button as a reference 
  colorModeButton2 = [...nav.children].find(child => child.innerText.includes('Log out'))
  // Insert the "Export Button" before the "Color Mode" button

  nav.insertBefore(version, colorModeButton2)

}

// This function gets the "New Chat" buttons
function getNewChatButtons(callback) {
  // Get the sidebar and topbar elements
  const sidebar = document.querySelector('nav')
  const topbar = document.querySelector('.sticky')
  // Get the "New Chat" button in the sidebar
  const newChatButton = [...sidebar?.querySelectorAll('.cursor-pointer') ?? []].find(e => e.innerText === 'New Chat')
  // Get the "Plus" button in the topbar
  const AddButton = topbar?.querySelector("button.px-3")
  // Return an array containing the buttons, filtering out any null elements
  return [newChatButton, AddButton].filter(button => button)
}

// This object contains properties for the prompt templates section
const promptTemplateSection = {
  currentPage: 0, // The current page number
  pageSize: 2 // The number of prompt templates per page
}


// This function inserts a section containing a list of prompt templates into the chat interface
function insertPromptTemplatesSection() {
  // Get the title element (as a reference point and also for some alteration)
  const title = document.querySelector('h1.text-4xl')
  // If there is no title element, return
  if (!title) return

  // Style the title element and set it to "ChatGPT for SEO"
  title.style = 'text-align: center; margin-top: 4rem'
  title.innerHTML = AppName

  // Get the list of prompt templates
  const templates = window.prompttemplates
  // If there are no templates, skip
  if (!templates) return

  // Get the parent element of the title element (main page)
  const parent = title.parentElement
  // If there is no parent element, skip
  if (!parent) return

  // Remove the "md:h-full" class from the parent element
  parent.classList.remove('md:h-full')

  // Get the current page number and page size from the promptTemplateSection object
  const { currentPage, pageSize } = promptTemplateSection
  // Calculate the start and end indices of the current page of prompt templates
  const start = pageSize * currentPage
  const end = Math.min(pageSize * (currentPage + 1), templates.length)
  // Get the current page of prompt templates
  const currentTemplates = window.prompttemplates.slice(start, end)

  // Create the HTML for the prompt templates section
  const html = `
    <div class="${css`column`}">
    
    ${svg`PromptBubble`}
    <h2 class="${css`h2`}">
    <ul class="${css`ul`}">
      ${currentTemplates.map((template, i) => `
        <button onclick="selectPromptTemplate(${start + i})" class="${css`card`}">
          <h3 class="${css`h3`}">${template.title}</h3>
          <p class="${css`p`}">${
    // template.prompt.replace('[INSERT]', template.placeholder)
    template.teaser
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

// Insert language select and continue button above the prompt textarea input
function insertLanguageSelect() {
  let wrapper = document.createElement('div')

  wrapper.id = 'language-select-wrapper'
  wrapper.className = css('languageSelectWrapper')

  // Get the list of languages
  const languages = window.languages

  // If there are no languages, skip
  if (!languages) return

  // Get the prompt textarea input
  const textarea = document.querySelector('form textarea');

  // If there is no textarea, skip
  if (!textarea) return

  // Get the parent of the form element for the textarea
  const parent = textarea.form.parentElement;

  // If there is no parent element, skip
  if (!parent) return

  // Get existing language select wrapper or create a new one
  if (parent.querySelector(`#${wrapper.id}`)) {
    wrapper = parent.querySelector(`#${wrapper.id}`)
  } else {
    parent.prepend(wrapper)
  }

  // Create the HTML for the language select section
  const html = `
    <div>
      <label for="languageSelect" class="${css('languageSelectLabel')}">Language Output</label>
      
      <select id="languageSelect" class="${css('languageSelect')}">
        ${window.languages.map((language) => `
          <option value="${language.languageEnglish}" ${window.TargetLanguage === language.languageEnglish ? ' selected' : ''}>
            ${language.languageLabel}
            </option> 
        `).join('')}
      </select>
    </div>
    
    <div>
      <button title="Could you please continue writing the article?" class="${css('continueButton')}" onclick="continueWriting()">
        Continue
      </button> 
    </div>

    <div>
      <button title="Continue writing where you cut off" class="${css('cutoffButton')}" onclick="cutoffWriting()">
        Cutoff
      </button>
    </div>

    <div>
      <button title="Write a short persuasive call to action on the topic above" class="${css('persuasiveButton')}" onclick="persuasiveWriting()">
        Persuasive
      </button>
    </div>
  `

  wrapper.innerHTML = html

  // Add event listener to language select to update the target language on change
  wrapper.querySelector('#languageSelect').addEventListener('change', changeTargetLanguage);
}

// Change the TargetLanguage on selection change
function changeTargetLanguage(event) {
  window.TargetLanguage = event.target.value;
}

// Ask ChatGPT to continue writing
function continueWriting() {
  const textarea = document.querySelector('form textarea');

  // Add "Could you please continue writing the article?" prompt to the textarea
  textarea.value = "Could you please continue writing the article?";
  textarea.focus();

  // Click the "Submit" button
  const button = document.querySelector('form button');
  button.click();
}

// Ask ChatGPT to write persuasive call to action
function persuasiveWriting() {
  const textarea = document.querySelector('form textarea');

  // Add "write a short persuasive call to action on the topic above" prompt to the textarea
  textarea.value = "write a short persuasive call to action on the topic above";
  textarea.focus();

  // Click the "Submit" button
  const button = document.querySelector('form button');
  button.click();
}

// Ask ChatGPT to continue writing where you cut off
function cutoffWriting() {
  const textarea = document.querySelector('form textarea');

  // Add "write a short persuasive call to action on the topic above" prompt to the textarea
  textarea.value = "continue writing where you cut off";
  textarea.focus();

  // Click the "Submit" button
  const button = document.querySelector('form button');
  button.click();
}

function prevPromptTemplatesPage() {
  promptTemplateSection.currentPage--
  promptTemplateSection.currentPage = Math.max(0, promptTemplateSection.currentPage)
  // Update the section
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
  // Update the section
  insertPromptTemplatesSection()
}

function exportCurrentChat() {
  const blocks = [...document.querySelector('.flex.flex-col.items-center').children]
  let markdown = blocks.map(block => {
    let wrapper = block.querySelector('.whitespace-pre-wrap')

    if (!wrapper) {
      return ''
    }

    // probably a user's, so..
    if (wrapper.children.length === 0) {
      return '**User:**\n' + wrapper.innerText
    }

    // pass this point is assistant's

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
  //a.download = 'chatgpt-thread_' + (new Date().toLocaleString('en-US', { hour12: false }).replace(/[\s/:]/g, '-').replace(',', '')) + '.md'
  a.download = ExportFilePrefix + new Date().toISOString() + '.md';
  document.body.appendChild(a)
  a.click()
}

// This function selects a prompt template
function selectPromptTemplate(idx) {
  // Get the list of prompt templates 
  const templates = window.prompttemplates
  // If there are no templates, skip
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
    case 'paginationButton': return 'px-4 py-2 font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:text-white'
    case 'continueButton': return 'px-4 py-2 font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:text-white rounded bg-gray disabled:text-gray-300 disabled:hover:bg-transparent'
    case 'persuasiveButton': return 'px-4 py-2 font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:text-white rounded bg-gray disabled:text-gray-300 disabled:hover:bg-transparent'
    case 'cutoffButton': return 'px-4 py-2 font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:text-white rounded bg-gray disabled:text-gray-300 disabled:hover:bg-transparent'
    case 'action': return 'p-1 rounded-md hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 disabled:dark:hover:text-gray-400 md:invisible md:group-hover:visible'
    case 'tag': return 'inline-flex items-center py-1 px-2 mr-2 mb-2 text-sm font-medium text-white rounded bg-gray-600 whitespace-nowrap'
    case 'languageSelectWrapper': return 'flex flex-row gap-3 lg:max-w-3xl lg:mx-auto md:last:mb-6 mx-2 pt-2 stretch justify-between text-sm items-end lg:-mb-4'
    case 'languageSelect': return 'bg-gray-100 border-0 text-sm rounded block w-full dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white hover:bg-gray-200 focus:ring-0';
    case 'languageSelectLabel': return 'block text-sm font-medium';
  }
}

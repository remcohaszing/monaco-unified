import * as monaco from 'monaco-editor'
import { configureMonacoUnified } from 'monaco-unified'

import './index.css'

window.MonacoEnvironment = {
  getWorker(moduleId, label) {
    switch (label) {
      case 'editorWorkerService':
        return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url))
      case 'remark':
        return new Worker(new URL('remark.worker', import.meta.url))
      default:
        throw new Error(`Unknown label ${label}`)
    }
  }
}

const form = document.getElementById('configuration') as HTMLFormElement

/**
 * Get a configuration object based on user selection.
 *
 * @returns A mapping of plugin names to a boolean indicating if they are enabled.
 */
function getConfiguration(): Record<string, boolean> {
  const configuration: Record<string, boolean> = {}
  for (const { checked, name } of form as Iterable<HTMLInputElement>) {
    configuration[name] = checked
  }
  return configuration
}

const monacoUnified = configureMonacoUnified(monaco, {
  displayName: 'remark',
  label: 'remark',
  languageSelector: 'markdown',
  configuration: getConfiguration()
})

for (const checkbox of form) {
  checkbox.addEventListener('change', () => {
    monacoUnified.reconfigure(getConfiguration())
  })
}

const value = `# Welcome to monaco-unified

### Getting started

Using [monaco-unified] can use [remark][] to validate your files.

For example, you can use [remark]() to:

- validate links
- validate list styling

More plugins can be found on https://github.com/remarkjs/remark/blob/main/doc/plugins.md

It's also possible to use \`remark-retext\` to validate natural language issues, such as repeated repeated words words, butt also profanities, and quite some other things, like invalid quotes

Many more plugins can be found on https://github.com/retextjs/retext/blob/main/doc/plugins.md

Some plugins have quick fixes available, many retext plugins plugins do! Amazing right!?

Formatting is also supported. Just press \`Ctrl\` + \`Shift\` + \`I\` (\`Command\` + \`Shift\` + \`I\` on macOS) to format this document.

[remark]: https://remark.js.org
[remark]: https://remark.js.org
[unified]: https://unifiedjs.com
`

const ed = monaco.editor.create(document.getElementById('editor')!, {
  automaticLayout: true,
  model: monaco.editor.createModel(value, 'markdown', monaco.Uri.parse('readme.md')),
  theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'vs-light',
  unicodeHighlight: { ambiguousCharacters: false },
  wordWrap: 'on'
})

monaco.editor.onDidChangeMarkers(([resource]) => {
  const problems = document.getElementById('problems')!
  const markers = monaco.editor.getModelMarkers({ resource })
  while (problems.lastChild) {
    problems.lastChild.remove()
  }
  for (const marker of markers) {
    const wrapper = document.createElement('div')
    wrapper.setAttribute('role', 'button')
    const codicon = document.createElement('div')
    const text = document.createElement('div')
    wrapper.classList.add('problem')
    codicon.classList.add('codicon', 'codicon-warning')
    text.classList.add('problem-text')
    text.textContent = marker.message
    wrapper.append(codicon, text)
    wrapper.addEventListener('click', () => {
      ed.setPosition({ lineNumber: marker.startLineNumber, column: marker.startColumn })
      ed.focus()
    })
    problems.append(wrapper)
  }
})

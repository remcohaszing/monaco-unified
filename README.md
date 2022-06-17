# monaco-unified

[![ci](https://github.com/remcohaszing/monaco-unified/actions/workflows/ci.yaml/badge.svg)](https://github.com/remcohaszing/monaco-unified/actions/workflows/ci.yaml)
[![npm badge](https://img.shields.io/npm/v/monaco-unified)](https://www.npmjs.com/package/monaco-unified)
[![prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io)

Get warnings and error messages in monaco editor based on a unified processor.

## Installation

```sh
npm install monaco-unified
```

## Usage

First, create your own unified worker. Let’s create a remark worker for this example.

`unified.worker.js`:

```js
import { initialize } from 'monaco-unified/worker'
import { remark } from 'remark'
import remarkLintHeadingIncrement from 'remark-lint-heading-increment'

initialize((vfile, configuration) => remark().use(remarkLintHeadingIncrement))
```

Next, configure `monaco-unified` in the main thread. Also add your worker in the monaco environment.

```js
import * as monaco from 'monaco-editor'
import { configureMonacoUnified } from 'monaco-unified'

window.MonacoEnvironment = {
  getWorker(moduleId, label) {
    switch (label) {
      case 'editorWorkerService':
        return new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url))
      case 'remark':
        return new Worker(new URL('unified.worker', import.meta.url))
      default:
        throw new Error(`Unknown label ${label}`)
    }
  },
}

const monacoUnified = configureMonacoUnified(monaco, {
  languageSelector: 'markdown',
  label: 'remark',
  configuration: {
    // This configuration will be passed to your worker.
  },
})
```

## API

This package exposes two exports. One to setup the main logic, another to create a worker.

### `monaco-unified`

#### `configureMonacoUnified(monaco, options)`

Configure monaco-unified.

**Arguments**:

- `monaco`: The `monaco-editor` module.
- `options`: An object with the following properties:
  - `label`: The label to use for the worker. This is used to match a worker in in
    `MonacoEnvironment` (`string`).
  - `languageSelector`: The language ID or IDs to which to apply `monaco-unified`. (`string` |
    `string[]`)
  - `configuration`: The configuration that will be sent to the worker. (optional)
  - `formatting`: By default `monaco-unified` supports formatting using unified. Set this to `false`
    to disable. (`boolean`, optional, default: `true`)
  - `validation`: By default `monaco-unified` supports validation using unified. Set this to `false`
    to disable.. (`boolean`, optional, default: `true`)

**Returns**: A disposable with the following additional properties:

- `reconfigure(configuration)`: Update the configuration.

### `monaco-unified/worker`

#### `initialize(getProcessor)`

Initialize the worker.

**Arguments**:

- `getProcessor`: A function which gets called with a [VFile](https://github.com/vfile/vfile)
  instance and the passed configuration, and should return a unified processor.

## Related projects

- [`monaco-tailwindcss`](https://monaco-tailwindcss.js.org)
- [`monaco-yaml`](https://monaco-yaml.js.org)

## Showcase

- [Motif](https://motif.land) uses `monaco-unified` to provide a rich editing experience for MDX
  files.

## License

[MIT](LICENSE.md) @ [Remco Haszing](https://github.com/remcohaszing)

import {
  type MarkerDataProviderInstance,
  registerMarkerDataProvider
} from 'monaco-marker-data-provider'
import { type editor, type IDisposable, type languages, type MonacoEditor } from 'monaco-types'
import { createWorkerManager, type WorkerManagerOptions } from 'monaco-worker-manager'

import { type SerializableMarkerData, type UnifiedWorker } from './worker.js'

const messagesMap = new WeakMap<editor.ITextModel, SerializableMarkerData[]>()

export interface MonacoUnifiedOptions<Configuration>
  extends Pick<WorkerManagerOptions<Configuration>, 'interval' | 'label' | 'stopWhenIdleFor'> {
  /**
   * The language ID or IDs to which to apply `monaco-unified`.
   */
  languageSelector: string[] | string

  /**
   * The configuration that will be sent to the worker.
   */
  configuration?: Configuration

  /**
   * By default `monaco-unified` supports formatting using unified. Set this to `false` to disable.
   *
   * @default true
   */
  formatting?: boolean

  /**
   * By default `monaco-unified` supports validation using unified. Set this to `false` to disable.
   *
   * @default true
   */
  validation?: boolean
}

export interface MonacoUnified<Configuration> extends IDisposable {
  /**
   * Update the configuration.
   */
  reconfigure: (configuration: Configuration) => void
}

/**
 * Configure monaco-unified.
 *
 * @param monaco The `monaco-editor` module to use.
 * @param options Options to configure `monaco-unified`.
 * @returns A disposable
 */
export function configureMonacoUnified<Configuration>(
  monaco: MonacoEditor,
  options: MonacoUnifiedOptions<Configuration>
): MonacoUnified<Configuration> {
  const workerManager = createWorkerManager<UnifiedWorker>(monaco, {
    label: options.label,
    moduleId: options.label,
    createData: options.configuration,
    interval: options.interval,
    stopWhenIdleFor: options.stopWhenIdleFor
  })

  let markerDataProvider: MarkerDataProviderInstance | undefined
  const disposables: IDisposable[] = [workerManager]
  if (options.formatting !== false) {
    disposables.push(
      monaco.languages.registerDocumentFormattingEditProvider(options.languageSelector, {
        async provideDocumentFormattingEdits(model) {
          const worker = await workerManager.getWorker(model.uri)

          const text = await worker.doFormat(String(model.uri))

          if (!text) {
            return
          }

          return [{ range: model.getFullModelRange(), text }]
        }
      })
    )
  }

  if (options.validation !== false) {
    disposables.push(
      monaco.languages.registerCodeActionProvider(options.languageSelector, {
        provideCodeActions(model, range) {
          const messages = messagesMap.get(model)

          if (!messages) {
            return
          }

          const actions: languages.CodeAction[] = []

          for (const message of messages) {
            if (!message.expected) {
              continue
            }

            if (!range.intersectRanges(message)) {
              continue
            }

            for (const expected of message.expected) {
              const value = model.getValueInRange(message)
              actions.push({
                title: expected
                  ? value
                    ? `Replace \`${value}\` with \`${expected}\``
                    : `Insert \`${expected}\``
                  : `Delete \`${value}\``,
                kind: 'quickfix',
                isPreferred: message.expected.length === 1,
                edit: {
                  edits: [
                    {
                      textEdit: { range: message, text: expected },
                      resource: model.uri,
                      versionId: model.getVersionId()
                    }
                  ]
                }
              })
            }
          }

          return {
            actions,
            dispose() {
              // This function is needed by the TypeScript interface
            }
          }
        }
      })
    )

    markerDataProvider = registerMarkerDataProvider(monaco, options.languageSelector, {
      owner: 'unified',
      async provideMarkerData(model) {
        const worker = await workerManager.getWorker(model.uri)

        const messages = await worker.doValidate(String(model.uri))

        if (!messages) {
          messagesMap.delete(model)
          return
        }

        messagesMap.set(model, messages)

        return messages.map(({ code, expected, url, ...message }) => ({
          ...message,
          code: url ? { target: monaco.Uri.parse(url), value: code ?? url } : code
        }))
      }
    })
  }

  return {
    dispose() {
      markerDataProvider?.dispose()
      for (const disposable of disposables) {
        disposable.dispose()
      }
    },

    reconfigure(configuration) {
      workerManager.updateCreateData(configuration)
      markerDataProvider?.revalidate()
    }
  }
}

import { type editor, type languages } from 'monaco-editor'
import { type MarkerDataProvider } from 'monaco-marker-data-provider'
import { type WorkerGetter } from 'monaco-worker-manager'

import { type SerializableMarkerData, type UnifiedWorker } from './worker.js'

type GetWorker = WorkerGetter<UnifiedWorker>

const messagesMap = new WeakMap<editor.ITextModel, SerializableMarkerData[]>()

/**
 * Create a marker data provider for validation.
 *
 * @internal
 * @param getWorker A function to get the unified worker.
 * @returns A Monaco marker data provider
 */
export function createMarkerDataProvider(
  { Uri }: typeof import('monaco-editor'),
  getWorker: GetWorker,
): MarkerDataProvider {
  return {
    owner: 'unified',
    async provideMarkerData(model) {
      const worker = await getWorker(model.uri)

      const messages = await worker.doValidate(String(model.uri))

      if (!messages) {
        messagesMap.delete(model)
        return
      }

      messagesMap.set(model, messages)

      return messages.map(({ code, expected, url, ...message }) => ({
        ...message,
        code: url ? { target: Uri.parse(url), value: code ?? url } : code,
      }))
    },
  }
}

/**
 * Create a Monaco document formatting provider.
 *
 * @internal
 * @param getWorker A function to get the unified worker.
 * @returns A Monaco document formatting provider.
 */
export function createDocumentFormattingProvider(
  getWorker: GetWorker,
): languages.DocumentFormattingEditProvider {
  return {
    async provideDocumentFormattingEdits(model) {
      const worker = await getWorker(model.uri)

      const text = await worker.doFormat(String(model.uri))

      if (!text) {
        return
      }

      return [{ range: model.getFullModelRange(), text }]
    },
  }
}

/**
 * Create a Monaco code action provider.
 *
 * @internal
 * @returns A Monaco code action provider.
 */
export function createCodeActionProvider(): languages.CodeActionProvider {
  return {
    provideCodeActions(model, range) {
      const actions: languages.CodeAction[] = []

      const messages = messagesMap.get(model)

      if (messages) {
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
                    versionId: model.getVersionId(),
                  },
                ],
              },
            })
          }
        }
      }

      return {
        actions,
        dispose() {
          // This function is needed by the TypeScript interface
        },
      }
    },
  }
}

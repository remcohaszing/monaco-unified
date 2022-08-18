import { editor } from 'monaco-editor'
import { initialize as initializeWorker } from 'monaco-worker-manager/worker'
import { Processor } from 'unified'
import { VFile } from 'vfile'
import { VFileMessage } from 'vfile-message'

/**
 * @internal
 */
export interface SerializableMarkerData extends editor.IMarkerData {
  /**
   * The marker data code as a string.
   */
  code?: string

  /**
   * An array of expected values that may replace the reported range.
   */
  expected?: string[]

  /**
   * A url to link to.
   */
  url?: string
}

/**
 * @internal
 */
export interface UnifiedWorker {
  /**
   * Validate a document using a unified processor.
   */
  doValidate: (uri: string) => SerializableMarkerData[] | undefined

  /**
   * Format the document using a unified processor.
   */
  doFormat: (uri: string) => string | undefined
}

/**
 * A function for getting a processor to use for validation and formatting.
 */
export type ProcessorGetter<Configuration> = (
  file: VFile,
  configuration: Configuration,
) => Processor | PromiseLike<Processor>

/**
 * Represent a vfile message in Monaco editor.
 *
 * @param message The vfile message to represent in Monaco editor
 * @returns The vfile message as Monaco editor marker data.
 */
function vfileMessageToMarkerData(message: VFileMessage): SerializableMarkerData {
  const msg: string[] = []
  if (message.reason) {
    msg.push(message.reason)
  }
  if (message.note) {
    msg.push(message.note)
  }
  if (message.stack) {
    msg.push(message.stack)
  }

  return {
    severity: message.fatal == null ? 1 : message.fatal ? 8 : 4,
    startLineNumber: message.position?.start.line ?? message.line ?? 0,
    startColumn: message.position?.start.column ?? message.column ?? 0,
    endLineNumber: message.position?.end.line ?? message.line ?? 0,
    endColumn: message.position?.end.column ?? message.column ?? 0,
    message: msg.join('\n\n'),
    code: message.ruleId ?? undefined,
    source: message.source ?? undefined,
    expected: message.expected ?? undefined,
    url: message.url ?? undefined,
  }
}

/**
 * Initialize the worker.
 *
 * @param getProcessor A function for getting a processor.
 */
export function initialize<Configuration>(getProcessor: ProcessorGetter<Configuration>): void {
  initializeWorker<UnifiedWorker, Configuration>((ctx, createData) => {
    const getVFile = (uri: string): VFile | undefined => {
      const models = ctx.getMirrorModels()
      for (const model of models) {
        if (String(model.uri) === uri) {
          return new VFile({
            path: new URL(uri),
            value: model.getValue(),
          })
        }
      }
    }

    return {
      async doValidate(uri) {
        const file = getVFile(uri)

        if (!file) {
          return
        }

        const processor = await getProcessor(file, createData)
        const { messages } = await processor.process(file)
        return messages.map(vfileMessageToMarkerData)
      },

      async doFormat(uri) {
        const file = getVFile(uri)

        if (!file) {
          return
        }

        const processor = await getProcessor(file, createData)
        const { value } = await processor.process(file)
        return value
      },
    }
  })
}

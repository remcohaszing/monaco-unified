import { type editor, type IRange } from 'monaco-types'
import { initialize as initializeWorker } from 'monaco-worker-manager/worker'
import { type Processor } from 'unified'
import { VFile } from 'vfile'
import { type VFileMessage } from 'vfile-message'

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
  configuration: Configuration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Processor<any, any, any, any, any> | PromiseLike<Processor<any, any, any, any, any>>

/**
 * Convert a vfile message place to a Monaco range.
 *
 * @param place
 *   The vfile place to convert.
 * @returns
 *   The place as a Monaco range.
 */
function placeToRange(place: VFileMessage['place']): IRange {
  if (!place) {
    return {
      startLineNumber: 0,
      startColumn: 0,
      endLineNumber: 0,
      endColumn: 0
    }
  }

  if ('start' in place) {
    return {
      startLineNumber: place.start.line,
      startColumn: place.start.column,
      endLineNumber: place.end.line,
      endColumn: place.end.column
    }
  }

  return {
    startLineNumber: place.line,
    startColumn: place.column,
    endLineNumber: place.line,
    endColumn: place.column
  }
}

/**
 * Represent a vfile message in Monaco editor.
 *
 * @param message
 *   The vfile message to represent in Monaco editor
 * @returns
 *   The vfile message as Monaco editor marker data.
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
    ...placeToRange(message.place),
    severity: message.fatal == null ? 1 : message.fatal ? 8 : 4,
    message: msg.join('\n\n'),
    code: message.ruleId ?? undefined,
    source: message.source ?? undefined,
    expected: message.expected ?? undefined,
    url: message.url ?? undefined
  }
}

/**
 * Initialize the worker.
 *
 * @param getProcessor
 *   A function for getting a processor.
 */
export function initialize<Configuration>(getProcessor: ProcessorGetter<Configuration>): undefined {
  initializeWorker<UnifiedWorker, Configuration>((ctx, createData) => {
    const getVFile = (uri: string): undefined | VFile => {
      const models = ctx.getMirrorModels()
      for (const model of models) {
        if (String(model.uri) === uri) {
          return new VFile({
            path: new URL(uri),
            value: model.getValue()
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
        return String(await processor.process(file))
      }
    }
  })
}

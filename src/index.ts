import { IDisposable, languages } from 'monaco-editor/esm/vs/editor/editor.api.js'
import { registerMarkerDataProvider } from 'monaco-marker-data-provider'
import { createWorkerManager } from 'monaco-worker-manager'

import {
  createCodeActionProvider,
  createDocumentFormattingProvider,
  createMarkerDataProvider,
} from './languageFeatures.js'
import { UnifiedWorker } from './worker.js'

export interface MonacoUnifiedOptions<Configuration> {
  /**
   * The label to use for the worker.
   *
   * This is used to match a worker in in `MonacoEnvironment`.
   */
  label: string

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
 * @param monaco - The `monaco-editor` module to use.
 * @param options - Options to configure `monaco-unified`.
 * @returns A disposable
 */
export function configureMonacoUnified<Configuration>(
  monaco: typeof import('monaco-editor'),
  options: MonacoUnifiedOptions<Configuration>,
): MonacoUnified<Configuration> {
  const workerManager = createWorkerManager<UnifiedWorker>(monaco, {
    label: options.label,
    moduleId: options.label,
    createData: options.configuration,
  })

  let markerDataProvider: IDisposable | undefined
  const disposables: IDisposable[] = [workerManager]
  if (options.formatting !== false) {
    disposables.push(
      languages.registerDocumentFormattingEditProvider(
        options.languageSelector,
        createDocumentFormattingProvider(workerManager.getWorker),
      ),
    )
  }
  if (options.validation !== false) {
    disposables.push(
      languages.registerCodeActionProvider(options.languageSelector, createCodeActionProvider()),
    )
    markerDataProvider = registerMarkerDataProvider(
      monaco,
      options.languageSelector,
      createMarkerDataProvider(monaco, workerManager.getWorker),
    )
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
      if (markerDataProvider) {
        markerDataProvider.dispose()
        markerDataProvider = registerMarkerDataProvider(
          monaco,
          options.languageSelector,
          createMarkerDataProvider(monaco, workerManager.getWorker),
        )
      }
    },
  }
}

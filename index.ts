import { registerMarkerDataProvider } from 'monaco-marker-data-provider'
import { type IDisposable, type MonacoEditor } from 'monaco-types'
import { createWorkerManager, type WorkerManagerOptions } from 'monaco-worker-manager'

import {
  createCodeActionProvider,
  createDocumentFormattingProvider,
  createMarkerDataProvider
} from './languageFeatures.js'
import { type UnifiedWorker } from './worker.js'

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

  let markerDataProvider: IDisposable | undefined
  const disposables: IDisposable[] = [workerManager]
  if (options.formatting !== false) {
    disposables.push(
      monaco.languages.registerDocumentFormattingEditProvider(
        options.languageSelector,
        createDocumentFormattingProvider(workerManager.getWorker)
      )
    )
  }
  if (options.validation !== false) {
    disposables.push(
      monaco.languages.registerCodeActionProvider(
        options.languageSelector,
        createCodeActionProvider()
      )
    )
    markerDataProvider = registerMarkerDataProvider(
      monaco,
      options.languageSelector,
      createMarkerDataProvider(monaco, workerManager.getWorker)
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
          createMarkerDataProvider(monaco, workerManager.getWorker)
        )
      }
    }
  }
}

import { initialize } from 'monaco-unified/worker'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkLintHeadingIncrement from 'remark-lint-heading-increment'
import remarkLintListItemIndent from 'remark-lint-list-item-indent'
import remarkLintListItemSpacing from 'remark-lint-list-item-spacing'
import remarkLintNoDuplicateDefinedUrls from 'remark-lint-no-duplicate-defined-urls'
import remarkLintNoDuplicateDefinitions from 'remark-lint-no-duplicate-definitions'
import remarkLintNoEmptyUrl from 'remark-lint-no-empty-url'
import remarkLintNoReferenceLikeUrl from 'remark-lint-no-reference-like-url'
import remarkLintNoUndefinedReferences from 'remark-lint-no-undefined-references'
import remarkLintNoUnneededFullReferenceImage from 'remark-lint-no-unneeded-full-reference-image'
import remarkLintNoUnneededFullReferenceLink from 'remark-lint-no-unneeded-full-reference-link'
import remarkLintNoUnusedDefinitions from 'remark-lint-no-unused-definitions'
import remarkRetext from 'remark-retext'
import retextEnglish from 'retext-english'
import retextIntensify from 'retext-intensify'
import retextProfanities from 'retext-profanities'
import retextQuotes from 'retext-quotes'
import retextRepeatedWords from 'retext-repeated-words'
import { unified } from 'unified'

const remarkPlugins = {
  'remark-lint-list-item-indent': remarkLintListItemIndent,
  'remark-lint-list-item-spacing': remarkLintListItemSpacing,
  'remark-lint-heading-increment': remarkLintHeadingIncrement,
  'remark-lint-no-duplicate-defined-urls': remarkLintNoDuplicateDefinedUrls,
  'remark-lint-no-duplicate-definitions': remarkLintNoDuplicateDefinitions,
  'remark-lint-no-empty-url': remarkLintNoEmptyUrl,
  'remark-lint-no-reference-like-url': remarkLintNoReferenceLikeUrl,
  'remark-lint-no-undefined-references': remarkLintNoUndefinedReferences,
  'remark-lint-no-unneeded-full-reference-image': remarkLintNoUnneededFullReferenceImage,
  'remark-lint-no-unneeded-full-reference-link': remarkLintNoUnneededFullReferenceLink,
  'remark-lint-no-unused-definitions': remarkLintNoUnusedDefinitions
} as const

const retextPlugins = {
  'retext-intensify': retextIntensify,
  'retext-profanities': retextProfanities,
  'retext-quotes': retextQuotes,
  'retext-repeated-words': retextRepeatedWords
} as const

initialize((vfile, configuration: Record<string, boolean>) => {
  const retext = unified().use(retextEnglish)
  const processor = remark().use([remarkGfm, [remarkRetext, retext]])

  for (const [name, enabled] of Object.entries(configuration)) {
    if (enabled) {
      if (name in remarkPlugins) {
        processor.use(remarkPlugins[name as keyof typeof remarkPlugins])
      }
      if (name in retextPlugins) {
        retext.use(retextPlugins[name as keyof typeof retextPlugins])
      }
    }
  }
  return processor
})

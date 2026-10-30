import { useCommonStore } from '@/stores/common'

// No props at all - matches production's own PopularDestinationsTheme2.vue,
// which reads its content 100% from a live API (commonStore.popularRoutes)
// rather than page JSON. This editor has no such API, so the ported
// component (src/components/home-page-components/PopularDestinationsTheme2.vue)
// just renders its own small hardcoded example array through the real
// markup/CSS - nothing here to seed or restore per-insertion.
//
// Still checked against deletedSingletonBlocks (see stores/common.ts) for
// consistency with faq.ts's own singleton-restore behavior, even though
// with no props there's currently nothing meaningful for a restore to
// preserve beyond the bare block shape itself.
export function popularDestinations () {
  const cached = useCommonStore().deletedSingletonBlocks.PopularDestinationsTheme2
  if (cached) {
    return structuredClone(cached)
  }

  return {
    type: 'component',
    content: 'PopularDestinationsTheme2',
  }
}

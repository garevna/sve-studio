// A freshly inserted image slot should start as an empty "canvas" (the
// checkerboard placeholder - see .image-placeholder-bg in common.css, which
// every image-rendering component keys off an empty src) rather than a
// pre-filled placeholder photo, so it's obvious at a glance which images
// still need a real one uploaded.
export const defaultImage = () => ''

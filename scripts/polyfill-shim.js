// Intentionally empty.
// Replaces next/dist/build/polyfills/polyfill-module (Promise.finally,
// Object.fromEntries, Array.prototype.at/flat/flatMap, Object.hasOwn,
// String.trimStart/trimEnd, IntersectionObserver shims). Next injects this
// unconditionally into the app-router client bundle, but every browser in
// the project's browserslist (chrome/firefox/edge >= 100, safari >= 15.6)
// ships all of these natively — see next.config.mjs for the alias.

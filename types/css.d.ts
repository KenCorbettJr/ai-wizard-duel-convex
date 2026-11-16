// Ambient declaration for side-effect CSS imports (e.g. `import "./globals.css"`).
// TypeScript 6.0 requires a type declaration for side-effect imports of non-code
// assets; without this, `tsc --noEmit` reports TS2882. These imports are handled
// by the Next.js bundler at build time and carry no runtime type surface.
declare module "*.css";

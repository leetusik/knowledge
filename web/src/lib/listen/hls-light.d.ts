// hls.js 1.7 ships its light build (`hls.js/light`: no subtitles, alternate audio, EME or
// CMCD, none of which Listen uses) without a `types` entry in its exports map. Its API is
// the full build's, so it takes the full build's declarations.
declare module "hls.js/light" {
  export * from "hls.js";
  export { default } from "hls.js";
}

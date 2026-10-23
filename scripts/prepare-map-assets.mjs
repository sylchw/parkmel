import {mkdir} from "node:fs/promises";
import {build} from "esbuild";
await mkdir("public/maplibre",{recursive:true});
// A self-contained module avoids Safari worker imports fetching sibling chunks.
await build({entryPoints:["node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs"],outfile:"public/maplibre/maplibre-gl-worker.mjs",bundle:true,format:"esm",platform:"browser",target:"es2022",minify:true,legalComments:"eof"});

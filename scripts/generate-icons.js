import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.join(__dirname, "..", "public", "icons", "icon.svg");
const outputDir = path.join(__dirname, "..", "public", "icons");

// Generate 192x192 icon
exec(
  `npx svgexport ${svgPath} ${path.join(
    outputDir,
    "icon-192x192.png"
  )} 192:192`,
  (error) => {
    if (error) {
      console.error("Error generating 192x192 icon:", error);
      return;
    }
    console.log("Generated 192x192 icon");
  }
);

// Generate 512x512 icon
exec(
  `npx svgexport ${svgPath} ${path.join(
    outputDir,
    "icon-512x512.png"
  )} 512:512`,
  (error) => {
    if (error) {
      console.error("Error generating 512x512 icon:", error);
      return;
    }
    console.log("Generated 512x512 icon");
  }
);

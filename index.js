#!/usr/bin/env node

const child_process = require("child_process");
const { analyzeDuplicates } = require("./analyze-duplicates");
const { prepare } = require("./prepare");
const { DOWNLOAD_DIR } = require("./download-dir");

const command = process.argv[2];
const args = Array.prototype.slice.call(process.argv, 3);

const COMMANDS = {
  prepare,
  duplicates: analyzeDuplicates,
  explore: () => {
    child_process.spawn("npx", ["source-map-explorer", `${DOWNLOAD_DIR}/*`], {
      stdio: "inherit"
    });
  }
};

if (COMMANDS[command]) {
  COMMANDS[command](...args);
} else {
  console.log(
    `Unknown command. Must be one of: ${Object.keys(COMMANDS).join(", ")}.`
  );
}

const fs = require("fs");
const path = require("path");
const request = require("request");
const rimraf = require("rimraf");
const child_process = require("child_process");

const DOWNLOAD_DIR = path.resolve(__dirname, "download");

function reset() {
  if (fs.existsSync(DOWNLOAD_DIR)) {
    rimraf.sync(DOWNLOAD_DIR);
  }
  fs.mkdirSync(DOWNLOAD_DIR);
}

function download(jsUrl) {
  const urlParts = jsUrl.split("/");
  const fileName = urlParts[urlParts.length - 1];
  const filePath = path.resolve(DOWNLOAD_DIR, fileName);
  const writeStream = fs.createWriteStream(filePath);
  return new Promise((resolve, reject) => {
    const r = request(jsUrl).pipe(writeStream);
    r.on("close", resolve);
    r.on("error", reject);
  });
}

async function run(harPath, entriesUntil) {
  reset();

  const har = JSON.parse(fs.readFileSync(harPath));

  const promises = [];
  for (let entry of har.log.entries) {
    if (entry._resourceType === "script") {
      console.log(`Downloading js and source map for ${entry.request.url}`);
      promises.push(download(entry.request.url));
      promises.push(download(entry.request.url + ".map"));
      if (entriesUntil && entry.request.url.includes(entriesUntil)) {
        break;
      }
    }
  }

  await Promise.all(promises);

  console.log("Running source-map-explorer");
  child_process.spawn("npx", ["source-map-explorer", `${DOWNLOAD_DIR}/*`], {
    stdio: "inherit"
  });
}

run(process.argv[2], process.argv[3]);

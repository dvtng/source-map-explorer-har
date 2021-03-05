const fs = require("fs");
const path = require("path");
const request = require("request");
const rimraf = require("rimraf");
const { DOWNLOAD_DIR } = require("./download-dir");

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

exports.prepare = async (harPath, entriesUntil) => {
  reset();

  const har = JSON.parse(fs.readFileSync(harPath));
  
  for (let entry of har.log.entries) {
    if (entry._resourceType === "script") {
      const promises = [];
      console.log(`Downloading js and source map for ${entry.request.url}`);
      promises.push(download(entry.request.url));
      promises.push(download(entry.request.url + ".map"));
      if (entriesUntil && entry.request.url.includes(entriesUntil)) {
        break;
      }
      await Promise.all(promises);
    }
  }
};

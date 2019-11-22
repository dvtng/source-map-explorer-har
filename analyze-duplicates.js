const { explore } = require("source-map-explorer");
const { DOWNLOAD_DIR } = require("./download-dir");

const set = (obj, key, setter) => {
  obj[key] = setter(obj[key]);
  return obj;
};

const last = array => {
  return array[array.length - 1];
};

const formatAsKb = bytes => {
  return `${bytes / 1024}kb`;
};

// Assume we need the occurence of the maximum size,
// and return the sum of all other occurences
const getWastedSize = sizes => {
  let max = 0;
  const sum = sizes.reduce((sum, size) => {
    if (size > max) {
      max = size;
    }
    return sum + size;
  }, 0);
  return sum - max;
};

const packageInfo = filePath => {
  const packages = filePath.split(/(^|\/)node_modules\//);
  const lastPackage = last(packages);
  const packageName =
    lastPackage[0] === "@"
      ? lastPackage
          .split("/")
          .slice(0, 2)
          .join("/")
      : lastPackage.split("/")[0];

  return {
    name: packageName,
    path: packages
      .slice(0, -1)
      .filter(part => part.length && part !== "/")
      .concat(packageName)
      .join("/node_modules/")
  };
};

const excludedPackages = new Set(["", "<unmapped>", "~", "next", "packages"]);

exports.analyzeDuplicates = async likePackageName => {
  const { bundles } = await explore(`${DOWNLOAD_DIR}/*`, {
    output: { format: "json" }
  });

  const packageMap = {};

  bundles.forEach(({ bundleName, files }) => {
    Object.entries(files).forEach(([filePath, size]) => {
      const { name, path } = packageInfo(filePath);

      if (excludedPackages.has(name)) return;
      if (likePackageName && !name.includes(likePackageName)) return;

      const shortBundleName = bundleName.substr(DOWNLOAD_DIR.length + 1);

      set(packageMap, name, (paths = {}) => {
        return set(
          paths,
          shortBundleName + ":" + path,
          (totalSize = 0) => totalSize + size
        );
      });
    });
  });

  let totalWasted = 0;
  Object.entries(packageMap)
    .sort((a, b) => {
      return a[0].localeCompare(b[0]);
    })
    .forEach(([name, paths]) => {
      const pathNames = Object.keys(paths);
      if (pathNames.length > 1) {
        const wasted = getWastedSize(Object.values(paths));
        totalWasted += wasted;

        console.log(
          `${name} is duplicated ${pathNames.length} times. Wasted: ${wasted /
            1000}kb`
        );
        pathNames.forEach(pathName => {
          console.log(`  > ${pathName}: ${formatAsKb(paths[pathName])}`);
        });
      }
    });

  console.log(`Total wasted: ${formatAsKb(totalWasted)}`);
};

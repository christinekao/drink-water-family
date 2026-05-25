const fs = require("fs").promises;
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const sourceDir = path.join(projectRoot, "prototype");
const outDir = path.join(projectRoot, "dist");
const files = ["index.html", "app.js", "styles.css"];
const directories = ["assets"];

async function build() {
  try {
    await fs.rmdir(outDir, { recursive: true });
  } catch {
    // nothing to remove
  }
  await fs.mkdir(outDir, { recursive: true });

  for (const file of files) {
    await fs.copyFile(path.join(sourceDir, file), path.join(outDir, file));
  }

  for (const directory of directories) {
    await copyDirectory(path.join(sourceDir, directory), path.join(outDir, directory));
  }
}

async function copyDirectory(source, target) {
  let entries;
  try {
    entries = await fs.readdir(source, { withFileTypes: true });
  } catch {
    return;
  }

  await fs.mkdir(target, { recursive: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});

# Install notes

This project must install from the public npm registry.

Recommended clean install:

```bash
rm -rf node_modules package-lock.json.old pnpm-lock.yaml yarn.lock
npm cache verify
npm install --registry=https://registry.npmjs.org/ --verbose --foreground-scripts --timing 2>&1 | tee npm-install.log
```

If you previously unzipped an older build into the same folder, make sure the old `package-lock.json` is overwritten. This package includes a fresh lockfile whose `resolved` URLs point to `https://registry.npmjs.org/`, not the OpenAI internal registry.

Quick check:

```bash
grep -R "applied-caas\|internal.api.openai" package-lock.json package.json .npmrc
```

No output means the package metadata is clean.

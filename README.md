# InkDNA Web

Vite + React implementation of the InkDNA font workshop prototype.

## Development

```bash
npm ci
npm run dev
```

## Build

```bash
npm run build
```

The project uses `base: './'` so the built site works under GitHub Pages
subpaths such as `https://username.github.io/repository-name/`.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` builds `dist` and deploys it to
GitHub Pages whenever `main` is pushed.

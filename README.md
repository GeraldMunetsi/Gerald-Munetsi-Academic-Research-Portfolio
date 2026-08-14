# Gerald Munetsi — Portfolio

A fast, responsive, single-page portfolio for **Gerald Munetsi** — Deep Learning
Researcher · Infectious Disease Modeler · Social Entrepreneur.

Built as static HTML/CSS/JS with **no build step and no dependencies**, so it
hosts cleanly on **GitHub Pages**.

## Structure

```
.
├── index.html        # main page content
├── blog.html          # blog index / post view (hash-routed: #/some-slug)
├── blog/
│   ├── posts.js       # published post data — the source of truth
│   ├── blog.js         # list/detail rendering + routing
│   └── admin.js        # write/publish panel (loaded on demand only)
├── styles.css         # design system + layout (warm, light, editorial)
├── script.js          # typewriter roles, scroll reveals, lightbox, nav
├── .nojekyll          # tells GitHub Pages to skip Jekyll processing
├── images/            # photos (see images/README.md for filenames)
└── README.md
```

## Add the photos

Open [`images/README.md`](images/README.md) and drop each photo in using the exact
filenames listed. Missing photos degrade gracefully to soft placeholders, so
the site always looks intact.

## Preview locally

Just open `index.html` in a browser. (Google Fonts load over the network; the site
still works offline with system-font fallbacks.)

Optional local server:

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000>. Note: `blog.html` loads its scripts as ES
modules, and some Python versions serve `.js` with the wrong content type, which
browsers reject for modules. If the blog page looks blank locally, either use a
different static server (e.g. `npx serve`) or don't worry about it — GitHub Pages
serves the correct type, so it works fine once deployed.

## Deploy on GitHub Pages

1. Create a repo (e.g. `gerald-munetsi-portfolio` — or `<username>.github.io` for a
   user site) and push these files to the default branch:

   ```bash
   git init
   git add .
   git commit -m "Portfolio site"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```

2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a
   branch**, pick `main` / `root`, then **Save**.

3. The site publishes at `https://<username>.github.io/<repo>/`.

All asset paths are **relative**, so it works whether it's served from a project
subpath (`/<repo>/`) or a root user site.

## Customise

- **Roles** (typewriter): edit the `roles` array near the top of `script.js`.
- **Colours**: change the CSS variables in `:root` in `styles.css`.
- **Content**: everything is plain HTML in `index.html`.
- **Contact email**: update the `mailto:` links in `index.html` if Gerald prefers a
  different address (currently `germunetsi15@gmail.com` — swap as needed).
- **Blog posts**: add entries directly to the `POSTS` array in `blog/posts.js`
  following the shape documented at the top of that file, then commit.

// Blog post data — the single source of truth for what's published on the site.
//
// Nothing is here yet. Posts written and published through the editor live in
// this browser's local storage until they're exported and this file is
// replaced — see the "Download posts.js" button in the editor.
//
// Shape of a post:
// {
//   slug:    'kebab-case-id',           // unique, used in the URL (#/slug)
//   title:   'Post title',
//   date:    'YYYY-MM-DD',
//   tags:    ['epidemiology', 'deep learning'],
//   excerpt: 'One or two sentences shown on the blog index.',
//   body:    'Blank-line paragraphs. "# " and "## " headings. "- " bullet ' +
//             'lines. **bold**, *italic*, [text](https://example.com) links.',
//   status:  'published'
// }

export const POSTS = [];

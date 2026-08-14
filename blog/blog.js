// Public blog engine: renders the post list / a single post from posts.js
// plus anything published locally through the editor, and hash-routes
// between them (#/ = list, #/some-slug = a post). No build step, no backend.
import { POSTS as SEED_POSTS } from "./posts.js";

const LOCAL_KEY = "gm_blog_local_posts_v1";

function getLocalPosts() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); }
  catch { return []; }
}
function saveLocalPosts(posts) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(posts));
}

function getPublicPosts() {
  const local = getLocalPosts().filter((p) => p.status === "published");
  const map = new Map();
  [...SEED_POSTS, ...local].forEach((p) => map.set(p.slug, p)); // local wins on slug clash
  return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ---------------- tiny markdown-lite ---------------- */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function inline(s) {
  let out = escapeHtml(s);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*(.+?)\*/g, "<em>$1</em>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return out;
}
function renderMarkdownLite(src) {
  const lines = String(src || "").replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let list = [], para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } };
  const flushList = () => { if (list.length) { out.push(`<ul>${list.map((i) => `<li>${inline(i)}</li>`).join("")}</ul>`); list = []; } };

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); return; }
    if (line.startsWith("## ")) { flushPara(); flushList(); out.push(`<h3>${inline(line.slice(3))}</h3>`); return; }
    if (line.startsWith("# ")) { flushPara(); flushList(); out.push(`<h2>${inline(line.slice(2))}</h2>`); return; }
    if (line.startsWith("- ")) { flushPara(); list.push(line.slice(2)); return; }
    flushList(); para.push(line);
  });
  flushPara(); flushList();
  return out.join("\n");
}

/* ---------------- rendering ---------------- */
function formatDate(d) {
  try { return new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return d; }
}
function tagsHTML(tags) {
  return (tags || []).map((t) => `<span class="post-tag">${escapeHtml(t)}</span>`).join("");
}
function postCardHTML(p) {
  const href = `#/${encodeURIComponent(p.slug)}`;
  return `
  <article class="post-card reveal is-in">
    <p class="post-card__meta"><time datetime="${p.date}">${formatDate(p.date)}</time></p>
    <h3><a href="${href}">${escapeHtml(p.title)}</a></h3>
    <p class="post-card__excerpt">${escapeHtml(p.excerpt)}</p>
    <div class="post-card__tags">${tagsHTML(p.tags)}</div>
    <a class="post-card__read" href="${href}">Read the piece &rarr;</a>
  </article>`;
}
function postDetailHTML(p) {
  return `
  <article class="post-detail reveal is-in">
    <a class="post-detail__back" href="#/">&larr; All posts</a>
    <p class="post-detail__meta"><time datetime="${p.date}">${formatDate(p.date)}</time></p>
    <h1>${escapeHtml(p.title)}</h1>
    <div class="post-detail__tags">${tagsHTML(p.tags)}</div>
    <div class="post-detail__body">${renderMarkdownLite(p.body)}</div>
    <a class="post-detail__back post-detail__back--bottom" href="#/">&larr; All posts</a>
  </article>`;
}

function renderList(root) {
  const posts = getPublicPosts();
  if (!posts.length) {
    root.innerHTML = `
      <div class="blog-empty reveal is-in">
        <h3>New writing is on the way</h3>
        <p>Nothing published yet — check back soon, or follow along on
          <a href="https://www.linkedin.com/in/gerald-munetsi-566496219/" target="_blank" rel="noopener">LinkedIn</a>
          in the meantime.</p>
      </div>`;
    return;
  }
  root.innerHTML = `<div class="post-grid">${posts.map(postCardHTML).join("")}</div>`;
}
function renderDetail(root, slug) {
  const post = getPublicPosts().find((p) => p.slug === slug);
  if (!post) {
    root.innerHTML = `<div class="blog-empty reveal is-in"><h3>Post not found</h3><p><a href="#/">&larr; Back to all posts</a></p></div>`;
    return;
  }
  root.innerHTML = postDetailHTML(post);
}
function route() {
  const root = document.getElementById("blogRoot");
  if (!root) return;
  const slug = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  if (slug) renderDetail(root, slug); else renderList(root);
  root.scrollIntoView({ block: "start" });
}
window.addEventListener("hashchange", route);
document.addEventListener("DOMContentLoaded", route);

/* ================================================================
   Not part of the public site: a keyboard-only way in for Gerald.
   No link, no button, no menu entry — nothing here for a reader
   to find or click.
   ================================================================ */
const held = new Set();
let promptOpen = false;

window.addEventListener("keydown", (e) => {
  const el = document.activeElement;
  const editable = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
  if (editable) return;
  held.add(e.key.toLowerCase());
  if (e.ctrlKey && held.has("g") && held.has("m")) {
    held.clear();
    tryUnlock();
  }
});
window.addEventListener("keyup", (e) => held.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => held.clear());

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// SHA-256 of the access phrase — the phrase itself lives nowhere in this repo.
const ADMIN_HASH = "e008193cf5608b42c95c70582867dd49af681ae7081e12c7877c521fb938df88";

async function tryUnlock() {
  if (promptOpen || document.getElementById("gmAdminModal")) return;
  promptOpen = true;
  const pass = window.prompt("Access phrase:");
  promptOpen = false;
  if (!pass) return;
  const hash = await sha256Hex(pass);
  if (hash !== ADMIN_HASH) return; // wrong phrase: fail silently, no hint given
  const mod = await import("./admin.js");
  mod.openEditor({ getLocalPosts, saveLocalPosts, seedPosts: SEED_POSTS, rerender: route });
}

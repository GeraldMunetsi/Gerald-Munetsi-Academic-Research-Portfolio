// The write/publish panel. This file is never loaded by an ordinary visit —
// blog.js only fetches it after the hidden key-combo + correct access phrase.
export function openEditor({ getLocalPosts, saveLocalPosts, seedPosts, rerender }) {
  if (document.getElementById("gmAdminModal")) return;

  let editingSlug = null;

  const overlay = document.createElement("div");
  overlay.id = "gmAdminModal";
  overlay.className = "admin-overlay";
  overlay.innerHTML = `
    <div class="admin-panel" role="dialog" aria-modal="true" aria-label="Blog editor">
      <div class="admin-panel__head">
        <h2>Write a post</h2>
        <button type="button" class="admin-close" aria-label="Close editor">&times;</button>
      </div>
      <div class="admin-panel__body">
        <aside class="admin-list" id="adminList"></aside>
        <form class="admin-form" id="adminForm" autocomplete="off">
          <label>Title
            <input name="title" required />
          </label>
          <div class="admin-row">
            <label>Date
              <input name="date" type="date" required />
            </label>
            <label>Tags
              <input name="tags" placeholder="epidemiology, deep learning" />
            </label>
          </div>
          <label>Excerpt
            <textarea name="excerpt" rows="2" required></textarea>
          </label>
          <label>Body
            <textarea name="body" rows="14" required placeholder="Blank-line paragraphs. # and ## headings. - bullet lines. **bold**, *italic*, [text](https://…) links."></textarea>
          </label>
          <div class="admin-actions">
            <button type="button" class="btn btn--ghost btn--sm" id="adminNew">New post</button>
            <button type="button" class="btn btn--ghost btn--sm" id="adminDelete">Delete</button>
            <button type="submit" class="btn btn--ghost btn--sm" data-mode="draft">Save draft</button>
            <button type="submit" class="btn btn--primary btn--sm" data-mode="published">Publish</button>
          </div>
        </form>
      </div>
      <div class="admin-panel__foot">
        <span>Publishing here shows the post to you, on this browser, right away.</span>
        <button type="button" class="btn btn--ghost btn--sm" id="adminExport">Download posts.js to make it live for everyone</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  const form = overlay.querySelector("#adminForm");
  const listEl = overlay.querySelector("#adminList");

  function slugify(title) {
    return title.toLowerCase().trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "post";
  }
  function uniqueSlug(base, excludeSlug) {
    const taken = new Set([...seedPosts, ...getLocalPosts()].filter((p) => p.slug !== excludeSlug).map((p) => p.slug));
    let slug = base, i = 2;
    while (taken.has(slug)) slug = `${base}-${i++}`;
    return slug;
  }

  function renderList() {
    const local = getLocalPosts().slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    if (!local.length) { listEl.innerHTML = `<p class="admin-empty">No local posts yet.</p>`; return; }
    listEl.innerHTML = local.map((p) => `
      <button type="button" class="admin-list__item${p.slug === editingSlug ? " is-active" : ""}" data-slug="${p.slug}">
        <span>${p.title || "(untitled)"}</span><em>${p.status}</em>
      </button>`).join("");
    listEl.querySelectorAll(".admin-list__item").forEach((btn) => {
      btn.addEventListener("click", () => loadPost(btn.getAttribute("data-slug")));
    });
  }

  function loadPost(slug) {
    const post = getLocalPosts().find((p) => p.slug === slug);
    if (!post) return;
    editingSlug = slug;
    form.title.value = post.title || "";
    form.date.value = post.date || "";
    form.tags.value = (post.tags || []).join(", ");
    form.excerpt.value = post.excerpt || "";
    form.body.value = post.body || "";
    renderList();
  }

  function resetForm() {
    editingSlug = null;
    form.reset();
    form.date.value = new Date().toISOString().slice(0, 10);
    renderList();
  }

  overlay.querySelector("#adminNew").addEventListener("click", resetForm);

  overlay.querySelector("#adminDelete").addEventListener("click", () => {
    if (!editingSlug) return;
    saveLocalPosts(getLocalPosts().filter((p) => p.slug !== editingSlug));
    resetForm();
    rerender();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const mode = (e.submitter && e.submitter.getAttribute("data-mode")) || "draft";
    const title = form.title.value.trim();
    if (!title) return;
    const local = getLocalPosts();
    const slug = editingSlug || uniqueSlug(slugify(title), null);
    const post = {
      slug,
      title,
      date: form.date.value || new Date().toISOString().slice(0, 10),
      tags: form.tags.value.split(",").map((t) => t.trim()).filter(Boolean),
      excerpt: form.excerpt.value.trim(),
      body: form.body.value,
      status: mode,
    };
    const idx = local.findIndex((p) => p.slug === slug);
    if (idx >= 0) local[idx] = post; else local.push(post);
    saveLocalPosts(local);
    editingSlug = slug;
    renderList();
    rerender();
  });

  overlay.querySelector("#adminExport").addEventListener("click", () => {
    const published = getLocalPosts().filter((p) => p.status === "published");
    const map = new Map();
    [...seedPosts, ...published].forEach((p) => map.set(p.slug, p));
    const all = [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
    const file =
      "// Generated by the blog editor.\n" +
      "// Replace blog/posts.js with this file, then commit & push to publish for everyone.\n" +
      `export const POSTS = ${JSON.stringify(all, null, 2)};\n`;
    const blob = new Blob([file], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "posts.js";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });

  function close() {
    document.body.style.overflow = "";
    overlay.remove();
    document.removeEventListener("keydown", onEsc);
  }
  function onEsc(e) { if (e.key === "Escape") close(); }
  overlay.querySelector(".admin-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", onEsc);

  resetForm();
}

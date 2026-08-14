// The write/publish panel. This file is never loaded by an ordinary visit —
// blog.js only fetches it after the hidden key-combo + correct access phrase.
import { buildDocxBlob } from "./docx.js";
import { EMAILJS_CONFIG } from "./email-config.js";

export function openEditor({ getLocalPosts, saveLocalPosts, seedPosts, rerender }) {
  if (document.getElementById("gmAdminModal")) return;

  let editingSlug = null;
  let listFilter = "all"; // 'all' | 'draft' | 'published'

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
        <aside class="admin-sidebar">
          <div class="admin-filter" role="tablist" aria-label="Filter posts">
            <button type="button" class="admin-filter__btn is-active" data-filter="all">All</button>
            <button type="button" class="admin-filter__btn" data-filter="draft">Drafts</button>
            <button type="button" class="admin-filter__btn" data-filter="published">Published</button>
          </div>
          <div class="admin-list" id="adminList"></div>
        </aside>
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
            <textarea name="body" rows="12" required placeholder="Blank-line paragraphs. # and ## headings. - bullet lines. **bold**, *italic*, [text](https://…) links."></textarea>
          </label>
          <div class="admin-actions">
            <button type="button" class="btn btn--ghost btn--sm" id="adminNew">New post</button>
            <button type="button" class="btn btn--ghost btn--sm" id="adminDelete">Delete</button>
            <button type="submit" class="btn btn--ghost btn--sm" data-mode="draft">Save draft</button>
            <button type="submit" class="btn btn--primary btn--sm" data-mode="published">Publish</button>
          </div>

          <div class="admin-share">
            <label>Send for review
              <input name="reviewerEmail" type="email" multiple placeholder="reviewer@example.com" />
            </label>
            <div class="admin-share__row">
              <button type="button" class="btn btn--ghost btn--sm" id="adminShare">Share as Word doc</button>
              <span class="admin-share__status" id="adminShareStatus"></span>
            </div>
            <p class="admin-hint" id="adminShareHint">Emails the reviewer a Word doc of this draft directly.</p>
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
  const shareStatus = overlay.querySelector("#adminShareStatus");
  const shareHint = overlay.querySelector("#adminShareHint");
  const emailReady = !!(EMAILJS_CONFIG.publicKey && EMAILJS_CONFIG.serviceId && EMAILJS_CONFIG.templateId);
  shareHint.textContent = emailReady
    ? "Emails the reviewer a Word doc of this draft directly."
    : "Email sending isn't set up yet (see blog/email-config.js), so this downloads the .docx and opens a pre-filled email instead — attach the file before sending.";

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
    const all = getLocalPosts().slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    const local = listFilter === "all" ? all : all.filter((p) => p.status === listFilter);
    if (!local.length) {
      listEl.innerHTML = `<p class="admin-empty">${all.length ? "Nothing in this view." : "No local posts yet."}</p>`;
      return;
    }
    listEl.innerHTML = local.map((p) => `
      <button type="button" class="admin-list__item${p.slug === editingSlug ? " is-active" : ""}" data-slug="${p.slug}">
        <span>${p.title || "(untitled)"}</span><em>${p.status}</em>
      </button>`).join("");
    listEl.querySelectorAll(".admin-list__item").forEach((btn) => {
      btn.addEventListener("click", () => loadPost(btn.getAttribute("data-slug")));
    });
  }

  overlay.querySelectorAll(".admin-filter__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      listFilter = btn.getAttribute("data-filter");
      overlay.querySelectorAll(".admin-filter__btn").forEach((b) => b.classList.toggle("is-active", b === btn));
      renderList();
    });
  });

  function loadPost(slug) {
    const post = getLocalPosts().find((p) => p.slug === slug);
    if (!post) return;
    editingSlug = slug;
    form.title.value = post.title || "";
    form.date.value = post.date || "";
    form.tags.value = (post.tags || []).join(", ");
    form.excerpt.value = post.excerpt || "";
    form.body.value = post.body || "";
    setShareStatus("");
    renderList();
  }

  function resetForm() {
    editingSlug = null;
    form.reset();
    form.date.value = new Date().toISOString().slice(0, 10);
    setShareStatus("");
    renderList();
  }

  function currentDraftFromForm() {
    return {
      slug: editingSlug || slugify(form.title.value.trim() || "untitled"),
      title: form.title.value.trim(),
      date: form.date.value || new Date().toISOString().slice(0, 10),
      tags: form.tags.value.split(",").map((t) => t.trim()).filter(Boolean),
      excerpt: form.excerpt.value.trim(),
      body: form.body.value,
      status: editingSlug ? (getLocalPosts().find((p) => p.slug === editingSlug)?.status || "draft") : "draft",
    };
  }

  function setShareStatus(msg, isError = false) {
    shareStatus.textContent = msg;
    shareStatus.classList.toggle("is-error", isError);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function openMailtoDraft(reviewer, subject, message) {
    window.location.href = `mailto:${encodeURIComponent(reviewer)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  }

  function loadEmailJsScript() {
    return new Promise((resolve, reject) => {
      if (window.emailjs) { resolve(window.emailjs); return; }
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
      s.onload = () => resolve(window.emailjs);
      s.onerror = () => reject(new Error("Could not load the email service."));
      document.head.appendChild(s);
    });
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function sendViaEmailJS({ reviewer, subject, message, blob }) {
    const emailjs = await loadEmailJsScript();
    emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
    const attachment = await blobToDataURL(blob);
    return emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
      to_email: reviewer,
      subject,
      message,
      attachment,
    });
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
    setShareStatus("");
    renderList();
    rerender();
  });

  overlay.querySelector("#adminShare").addEventListener("click", async () => {
    const post = currentDraftFromForm();
    if (!post.title || !post.body.trim()) { setShareStatus("Add a title and body first.", true); return; }
    const reviewer = form.reviewerEmail.value.trim();
    if (!reviewer) { setShareStatus("Add a reviewer email first.", true); return; }

    const shareBtn = overlay.querySelector("#adminShare");
    const blob = buildDocxBlob(post);
    const filename = `${post.slug || "draft"}-review.docx`;
    const subject = `Draft for review: ${post.title}`;
    const message = `Hi,\n\nWould you take a look at this draft and share your thoughts?\n\n"${post.title}"\n\nThanks,\nGerald`;

    if (emailReady) {
      shareBtn.disabled = true;
      setShareStatus("Sending…");
      try {
        await sendViaEmailJS({ reviewer, subject, message, blob });
        setShareStatus(`Sent to ${reviewer}.`);
      } catch (err) {
        setShareStatus(`Couldn't send automatically — downloaded instead, attach it yourself. (${(err && err.text) || (err && err.message) || "send failed"})`, true);
        downloadBlob(blob, filename);
        openMailtoDraft(reviewer, subject, message);
      } finally {
        shareBtn.disabled = false;
      }
      return;
    }

    downloadBlob(blob, filename);
    openMailtoDraft(reviewer, subject, message);
    setShareStatus(`Downloaded ${filename} — attach it in the email that just opened.`);
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
    downloadBlob(new Blob([file], { type: "text/javascript" }), "posts.js");
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

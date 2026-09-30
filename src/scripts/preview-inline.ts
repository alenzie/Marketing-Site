/**
 * Admin portal preview: while this page is shown inside the portal's Preview tab, show the portal's
 * unsaved edits in place and let text be edited by double-clicking it.
 *
 * On a normal visit (the page is not framed) this does nothing at all. When framed, it announces
 * itself to the portal and waits for the portal to send its list of text fields; only after that
 * message, from the portal's origin, does it touch the page. Matching is by text: an element whose
 * text equals a field's original value shows the field's current value instead, and a double-click
 * makes it editable in place. Only text moves in either direction (textContent, never HTML).
 */
export {};

(() => {
  if (window.parent === window) return;

  const PORTAL = 'https://admin.ophthalytics.com';
  const VERSION = 1;
  const MAX_FIELDS = 400;
  const MAX_TEXT = 4000;
  /** Descendants that still count as "just text" (a formatted run, a line break, a styled span). */
  const INLINE_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'A', 'BR', 'SPAN']);
  const SKIP = 'script,style,noscript,template,input,textarea,select,option,title,[contenteditable]';

  interface Field {
    path: string;
    /** Normalised: what an element's text must equal. */
    original: string;
    current: string;
    rich: boolean;
  }
  interface Tracked {
    key: string;
    /** The element's children as the page loaded them (put back when a value returns to its original). */
    saved: Node[];
    patched: boolean;
  }
  interface Active {
    el: HTMLElement;
    path: string;
    rich: boolean;
    before: string;
    saved: Node[];
  }

  let fields: Field[] = [];
  let byOriginal = new Map<string, Field[]>();
  const tracked = new Map<HTMLElement, Tracked>();
  let armed = false;
  let active: Active | null = null;
  let pendingClick = 0;

  const post = (message: object) => {
    try {
      window.parent.postMessage(message, PORTAL);
    } catch {
      /* not reachable: nothing to do */
    }
  };

  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().normalize('NFC');

  /** The text of a node: a <br> (or a block the browser inserted while editing) is a line break. */
  const textOf = (n: Node, root = true): string => {
    if (n.nodeType === Node.TEXT_NODE) return (n as Text).data;
    if (n.nodeType !== Node.ELEMENT_NODE) return '';
    const el = n as Element;
    if (el.tagName === 'BR') return '\n';
    let s = '';
    for (const c of Array.from(el.childNodes)) s += textOf(c, false);
    return !root && (el.tagName === 'DIV' || el.tagName === 'P') ? `\n${s}` : s;
  };

  /** Plain text with, at most, formatting runs inside: nothing else may be replaced by text. */
  const isTextElement = (el: HTMLElement) => {
    if (el.closest(SKIP)) return false;
    const inner = el.getElementsByTagName('*');
    for (let i = 0; i < inner.length; i++) if (!INLINE_TAGS.has(inner[i].tagName)) return false;
    return true;
  };

  const restore = (el: HTMLElement, t: Tracked) => {
    if (!t.patched) return;
    el.replaceChildren(...t.saved.map((n) => n.cloneNode(true)));
    t.patched = false;
  };

  /** Show the field's current value in `el`, or the page's own text when the value is unchanged. */
  const patch = (el: HTMLElement, t: Tracked) => {
    const group = byOriginal.get(t.key);
    if (!group) {
      restore(el, t);
      tracked.delete(el);
      el.removeAttribute('data-oph-editable');
      return;
    }
    if (group.length === 1) el.setAttribute('data-oph-editable', '');
    else el.removeAttribute('data-oph-editable');
    // The same text in several fields: only patched while they all say the same thing.
    const currents = new Set(group.map((f) => norm(f.current)));
    if (currents.size !== 1) {
      restore(el, t);
      return;
    }
    const cur = group[0].current;
    if (norm(cur) === t.key) {
      restore(el, t);
      return;
    }
    t.patched = true;
    if (norm(textOf(el)) !== norm(cur)) el.textContent = cur;
  };

  /** Match new elements by their text, drop stale ones, then patch every tracked element. */
  const applyAll = () => {
    const found: HTMLElement[] = [];
    const all = document.body.querySelectorAll<HTMLElement>('*');
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      if (!(el instanceof HTMLElement) || tracked.has(el) || (active && el === active.el)) continue;
      if (!isTextElement(el)) continue;
      const key = norm(textOf(el));
      if (key && byOriginal.has(key)) found.push(el);
    }
    // A match inside another match (a button's inner span): keep the innermost only.
    for (const el of found) {
      if (found.some((o) => o !== el && el.contains(o))) continue;
      tracked.set(el, { key: norm(textOf(el)), saved: Array.from(el.childNodes).map((n) => n.cloneNode(true)), patched: false });
    }
    for (const [el, t] of Array.from(tracked)) {
      if (active && el === active.el) continue;
      if (!el.isConnected) {
        tracked.delete(el);
        continue;
      }
      patch(el, t);
    }
  };

  const setFields = (list: Field[]) => {
    fields = list;
    byOriginal = new Map();
    for (const f of fields) {
      if (!f.original) continue;
      const g = byOriginal.get(f.original);
      if (g) g.push(f);
      else byOriginal.set(f.original, [f]);
    }
    applyAll();
  };

  /* ------------------------------------------------------------ editing */

  /** The field an element edits: exactly one field has this text (else a double-click does nothing). */
  const fieldFor = (el: HTMLElement): Field | null => {
    const t = tracked.get(el);
    const group = t && byOriginal.get(t.key);
    return group && group.length === 1 ? group[0] : null;
  };

  const trackedFrom = (target: EventTarget | null): HTMLElement | null => {
    let n: HTMLElement | null =
      target instanceof HTMLElement ? target : target instanceof Node ? target.parentElement : null;
    while (n) {
      if (tracked.has(n)) return n;
      n = n.parentElement;
    }
    return null;
  };

  const endEdit = (): Active | null => {
    const a = active;
    if (!a) return null;
    active = null;
    a.el.removeEventListener('keydown', onKey);
    a.el.removeEventListener('blur', onBlur);
    a.el.removeAttribute('contenteditable');
    a.el.removeAttribute('data-oph-editing');
    window.getSelection()?.removeAllRanges();
    return a;
  };

  const cancel = () => {
    const a = endEdit();
    if (a) a.el.replaceChildren(...a.saved);
  };

  const commit = () => {
    const a = endEdit();
    if (!a) return;
    const value = textOf(a.el)
      .replace(/[^\S\n]+/g, ' ')
      .replace(/ ?\n ?/g, '\n')
      .trim();
    if (!value || norm(value) === norm(a.before)) {
      a.el.replaceChildren(...a.saved);
      return;
    }
    a.el.textContent = value;
    // Every copy shows it at once; the portal confirms (or reverts) with oph:field / oph:fields.
    for (const f of fields) if (f.path === a.path) f.current = value;
    applyAll();
    post({ type: 'oph:edit', v: VERSION, path: a.path, value });
  };

  const onKey = (e: KeyboardEvent) => {
    if (!active) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
      return;
    }
    // Plain text: Enter confirms (Shift+Enter for a new line). Rich text: Ctrl/Cmd+Enter confirms.
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || (!active.rich && !e.shiftKey))) {
      e.preventDefault();
      commit();
    }
  };
  const onBlur = () => commit();

  const startEdit = (el: HTMLElement, field: Field) => {
    if (active) commit();
    el.setAttribute('contenteditable', 'plaintext-only');
    if (!el.isContentEditable) el.setAttribute('contenteditable', 'true');
    el.setAttribute('data-oph-editing', '');
    // Clones: the browser edits the live text nodes in place, so only a copy can put things back.
    active = {
      el,
      path: field.path,
      rich: field.rich,
      before: textOf(el),
      saved: Array.from(el.childNodes).map((n) => n.cloneNode(true)),
    };
    el.addEventListener('keydown', onKey);
    el.addEventListener('blur', onBlur);
    el.focus();
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  /** After the handshake only: the outline, the double-click, and a short hold on links/buttons. */
  const arm = () => {
    if (armed) return;
    armed = true;
    const style = document.createElement('style');
    style.textContent =
      '[data-oph-editable]{cursor:text}' +
      '[data-oph-editable]:hover{outline:1px dashed rgba(37,99,235,.55);outline-offset:3px}' +
      '[data-oph-editing]{outline:2px solid #2563eb;outline-offset:3px;white-space:pre-wrap}';
    document.head.appendChild(style);

    document.addEventListener('dblclick', (e) => {
      const el = trackedFrom(e.target);
      const field = el && fieldFor(el);
      if (!el || !field) return;
      e.preventDefault();
      window.clearTimeout(pendingClick);
      if (active?.el !== el) startEdit(el, field);
    });

    // A double-click on a link or button must not follow the link / open the popup first: its single
    // click is held back briefly and replayed unless a double-click arrives.
    document.addEventListener(
      'click',
      (e) => {
        if (!e.isTrusted) return;
        const el = trackedFrom(e.target);
        if (!el || !fieldFor(el)) return;
        const act = el.closest<HTMLElement>('a,button');
        if (!act) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        window.clearTimeout(pendingClick);
        if (e.detail > 1) return;
        pendingClick = window.setTimeout(() => {
          if (!active) act.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        }, 300);
      },
      true,
    );
  };

  /* ----------------------------------------------------------- messages */

  const asField = (x: unknown): Field | null => {
    if (!x || typeof x !== 'object') return null;
    const { path, original, current, rich } = x as { path?: unknown; original?: unknown; current?: unknown; rich?: unknown };
    if (typeof path !== 'string' || path.length > 300) return null;
    if (typeof original !== 'string' || original.length > MAX_TEXT) return null;
    if (typeof current !== 'string' || current.length > MAX_TEXT) return null;
    if (rich !== undefined && rich !== true) return null;
    return { path, original: norm(original), current, rich: rich === true };
  };

  window.addEventListener('message', (e: MessageEvent) => {
    if (e.origin !== PORTAL || e.source !== window.parent) return;
    const d: unknown = e.data;
    if (!d || typeof d !== 'object') return;
    const m = d as { type?: unknown; v?: unknown; fields?: unknown; path?: unknown; current?: unknown };
    if (m.v !== VERSION) return;
    if (m.type === 'oph:fields') {
      if (!Array.isArray(m.fields) || m.fields.length > MAX_FIELDS) return;
      const list: Field[] = [];
      for (const f of m.fields) {
        const field = asField(f);
        if (field) list.push(field);
      }
      setFields(list);
      arm();
      return;
    }
    if (m.type === 'oph:field' && armed) {
      if (typeof m.path !== 'string' || typeof m.current !== 'string' || m.current.length > MAX_TEXT) return;
      let hit = false;
      for (const f of fields) {
        if (f.path === m.path) {
          f.current = m.current;
          hit = true;
        }
      }
      if (hit) applyAll();
    }
  });

  const announce = () => post({ type: 'oph:ready', v: VERSION });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', announce, { once: true });
  else announce();
})();

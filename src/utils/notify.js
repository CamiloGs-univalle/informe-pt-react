/**
 * utils/notify.js
 * ─────────────────────────────────────────────────────────────────────────
 * Lightweight, non-React toast notifier used by most views and controllers
 * (anything outside the React tree, or components that don't want to wire
 * up `useToast()`).
 *
 * KNOWN ISSUE (pre-existing, carried over from the previous flat structure):
 * this looks up a DOM node with id="toast", but no such element is
 * currently rendered anywhere (index.html doesn't have one, and
 * `views/common/Toast.jsx`'s `ToastProvider` renders its own `.toast` div
 * without that id). In practice this means calls to `toast()` are
 * currently a silent no-op. It is left unchanged here to avoid altering
 * runtime behaviour during the architecture migration — see
 * docs/ARCHITECTURE.md ("Deuda técnica conocida") for the suggested fix
 * (route every `toast()` call through `ToastProvider`/`useToast()` instead).
 */
export function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 2800);
}

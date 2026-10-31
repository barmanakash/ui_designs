// Applies the saved theme before first paint to avoid a flash of the wrong theme.
// Lives in its own file (not inline in index.html) so the Content-Security-Policy can use script-src 'self'.
try {
  var t = localStorage.getItem('theme');
  if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}

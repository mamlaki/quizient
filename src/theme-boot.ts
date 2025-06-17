(() => {
  const STORAGE_KEY = 'quizient-theme';
  const saved = localStorage.getItem(STORAGE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const isDark = saved === 'dark' || (saved === 'auto' || saved === null) && prefersDark;

  if (isDark) document.documentElement.classList.add('dark');
})();
(function() {
  function setTheme(isDark) {
    if (isDark) {
      document.documentElement.classList.add('dark-theme');
      if (document.body) document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-theme');
      if (document.body) document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
    // Update all toggle icons if they exist
    document.querySelectorAll('.theme-toggle-icon').forEach(icon => {
      icon.textContent = isDark ? 'light_mode' : 'dark_mode';
    });
  }

  window.toggleTheme = function() {
    const isDark = document.documentElement.classList.contains('dark-theme');
    setTheme(!isDark);
  };

  function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark') {
      setTheme(true);
    } else {
      setTheme(false);
    }
  }

  // Initialize immediately (for documentElement) to avoid flash
  initTheme();
  
  // Also run on DOMContentLoaded to ensure body gets the class if script was in <head>
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
  });
})();

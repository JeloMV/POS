/**
 * Chick N Pastil Shared Bars & Session Manager
 */
(function () {
  // Default session if not set
  if (!localStorage.getItem('chick_user')) {
    localStorage.setItem('chick_user', JSON.stringify({
      name: 'Francis Pablo',
      role: 'Manager',
      branch: 'Balagtas',
      email: 'manager@chickpastil.ph'
    }));
  }

  window.getCurrentUser = function () {
    try {
      return JSON.parse(localStorage.getItem('chick_user'));
    } catch (e) {
      return { name: 'Francis Pablo', role: 'Manager', branch: 'Balagtas' };
    }
  };

  window.setCurrentUser = function (user) {
    localStorage.setItem('chick_user', JSON.stringify(user));
  };

  async function loadBars() {
    const container = document.getElementById('bars-container');
    if (!container) return;

    try {
      const resp = await fetch('/shared/bars.html');
      const html = await resp.text();
      container.innerHTML = html;

      initBarsUI();
    } catch (err) {
      console.error('Failed to load bars.html:', err);
    }
  }

  function initBarsUI() {
    const user = getCurrentUser();

    const nameEl = document.getElementById('topbar-user-name');
    const roleEl = document.getElementById('topbar-user-role');
    const branchEl = document.getElementById('branch-location-name');
    const dropNameEl = document.getElementById('dropdown-user-name');
    const dropRoleEl = document.getElementById('dropdown-user-role');
    const dropBranchEl = document.getElementById('dropdown-branch-name');

    if (nameEl) nameEl.textContent = user.name || 'User Staff';
    if (roleEl) roleEl.textContent = user.role === 'Manager' ? 'Business Manager' : 'Branch Staff';
    if (branchEl) branchEl.textContent = user.branch || 'Balagtas';
    if (dropNameEl) dropNameEl.textContent = user.name;
    if (dropRoleEl) dropRoleEl.textContent = user.role === 'Manager' ? 'Business Manager' : 'Branch Staff';
    if (dropBranchEl) dropBranchEl.textContent = user.branch;

    const managerLinks = document.querySelectorAll('.manager-only-link');
    const staffLinks = document.querySelectorAll('.staff-only-link');

    if (user.role === 'Staff') {
      managerLinks.forEach(el => el.classList.add('d-none'));
      staffLinks.forEach(el => el.classList.remove('d-none'));
    } else {
      managerLinks.forEach(el => el.classList.remove('d-none'));
      staffLinks.forEach(el => el.classList.add('d-none'));
    }

    const pageTitle = document.body.getAttribute('data-page-title') || document.title.split('-')[0].trim();
    const headingEl = document.getElementById('page-title-heading');
    if (headingEl && pageTitle) {
      headingEl.textContent = pageTitle;
    }

    // Route Live Sales link based on role
    const liveSalesLink = document.getElementById('link-live-sales');
    if (liveSalesLink) {
      liveSalesLink.href = user.role === 'Staff' ? '/staff/dashboard.html' : '/manager/dashboard.html';
    }

    // Route logo home link based on role
    const logoLink = document.querySelector('.topbar a[href*="dashboard.html"]');
    if (logoLink) {
      logoLink.href = user.role === 'Staff' ? '/staff/dashboard.html' : '/manager/dashboard.html';
    }

    // Fix saveRoleAndBranch redirect for staff going to manager-only pages
    const path = window.location.pathname;
    const links = document.querySelectorAll('.sidebar-nav a.nav-link');
    links.forEach(a => {
      const href = a.getAttribute('href');
      if (href && (path.includes(href) || (href.endsWith('dashboard.html') && path === '/'))) {
        a.classList.add('active');
      }
    });

    document.querySelectorAll('.nav-group-toggle').forEach(btn => {
      btn.addEventListener('click', function () {
        const targetId = this.getAttribute('data-target');
        const subnav = document.getElementById(targetId);
        if (subnav) {
          const isHidden = subnav.hasAttribute('hidden');
          if (isHidden) {
            subnav.removeAttribute('hidden');
            this.classList.add('subnav-open');
          } else {
            subnav.setAttribute('hidden', '');
            this.classList.remove('subnav-open');
          }
        }
      });
    });

    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-collapsed');
      });
    }

    const mobileToggle = document.getElementById('mobile-sidebar-toggle');
    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        document.body.classList.toggle('mobile-sidebar-open');
      });
    }

    document.addEventListener('click', (e) => {
      if (document.body.classList.contains('mobile-sidebar-open')) {
        const sidebar = document.getElementById('app-sidebar');
        const toggle = document.getElementById('mobile-sidebar-toggle');
        if (sidebar && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
          document.body.classList.remove('mobile-sidebar-open');
        }
      }
    });

    const branchLoc = document.getElementById('branch-location');
    if (branchLoc) {
      branchLoc.addEventListener('click', () => {
        switchRoleModal();
      });
    }
  }

  window.switchRoleModal = function () {
    const user = getCurrentUser();
    const modalEl = document.getElementById('switchBranchModal');
    if (!modalEl) return;

    const modal = new bootstrap.Modal(modalEl);
    setRoleSelection(user.role || 'Manager');
    const select = document.getElementById('branch-select-input');
    if (select) select.value = user.branch || 'Balagtas';

    modal.show();
  };

  let selectedRole = 'Manager';
  window.setRoleSelection = function (role) {
    selectedRole = role;
    const btnManager = document.getElementById('btn-role-manager');
    const btnStaff = document.getElementById('btn-role-staff');
    if (role === 'Manager') {
      btnManager?.classList.add('active');
      btnStaff?.classList.remove('active');
    } else {
      btnStaff?.classList.add('active');
      btnManager?.classList.remove('active');
    }
  };

  window.saveRoleAndBranch = function () {
    const user = getCurrentUser();
    const select = document.getElementById('branch-select-input');
    const newBranch = select ? select.value : 'Balagtas';

    user.role = selectedRole;
    user.branch = newBranch;
    user.name = selectedRole === 'Manager' ? 'Francis Pablo' : 'Maria Santos';

    setCurrentUser(user);

    const path = window.location.pathname;
    if (selectedRole === 'Staff' && (path.includes('menu.html') || path.includes('transaction_reports.html') || path.includes('/manager/'))) {
      window.location.href = '/staff/dashboard.html';
    } else if (selectedRole === 'Manager' && path.includes('/staff/dashboard.html')) {
      window.location.href = '/manager/dashboard.html';
    } else {
      window.location.reload();
    }
  };

  window.logout = function () {
    localStorage.removeItem('chick_user');
    window.location.href = '/login.html';
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadBars);
  } else {
    loadBars();
  }
})();

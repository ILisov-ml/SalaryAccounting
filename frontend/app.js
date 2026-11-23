import { api } from "./api.js";

const state = {
  user: null,
  route: "overview",
  month: "2026-10",
  positions: [],
  employees: [],
  salaries: []
};

const els = {
  authScreen: document.getElementById("auth-screen"),
  appShell: document.getElementById("app-shell"),
  sidebar: document.getElementById("sidebar"),
  sidebarNav: document.getElementById("sidebar-nav"),
  drawerBackdrop: document.getElementById("drawer-backdrop"),
  breadcrumbs: document.getElementById("breadcrumbs"),
  mainContent: document.getElementById("main-content"),
  headerUserName: document.getElementById("header-user-name"),
  headerUserRole: document.getElementById("header-user-role"),
  headerUserAvatar: document.getElementById("header-user-avatar"),
  dialog: document.getElementById("app-dialog"),
  dialogTitle: document.getElementById("dialog-title"),
  dialogBody: document.getElementById("dialog-body"),
  toastRegion: document.getElementById("toast-region")
};

const MONTHS_FULL = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];
const MONTHS_SHORT = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек"
];

function formatMonthLabel(ym) {
  const [y, m] = String(ym || "").split("-");
  const idx = Number(m) - 1;
  if (!y || idx < 0 || idx > 11) return ym;
  return `${MONTHS_FULL[idx]} ${y}`;
}

function renderMonthPickerHtml(id, value, isField = false) {
  return `
    <button
      type="button"
      id="${id}-trigger"
      class="month-trigger${isField ? " month-trigger--field" : ""}"
      popovertarget="${id}-popover"
      aria-label="Выбрать месяц: ${escapeHtml(formatMonthLabel(value))}"
    >
      <span id="${id}-label">${escapeHtml(formatMonthLabel(value))}</span>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
    </button>
    <input type="hidden" id="${id}" value="${escapeHtml(value)}">
    <div id="${id}-popover" popover="auto" class="month-popover"></div>
  `;
}

function initMonthPicker(id, initialValue, onChange, root = document) {
  const trigger = root.querySelector(`#${id}-trigger`);
  const labelEl = root.querySelector(`#${id}-label`);
  const hiddenInput = root.querySelector(`#${id}`);
  const pop = root.querySelector(`#${id}-popover`);
  if (!trigger || !pop || !hiddenInput) return;

  let currentVal = initialValue;
  let viewYear = Number(String(initialValue).split("-")[0]) || new Date().getFullYear();

  const now = new Date();
  const todayYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const renderGrid = () => {
    pop.innerHTML = `
      <div class="month-pop-head">
        <button type="button" class="month-pop-nav" data-ym-nav="-1" aria-label="Предыдущий год">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span class="month-pop-year">${viewYear}</span>
        <button type="button" class="month-pop-nav" data-ym-nav="1" aria-label="Следующий год">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
      <div class="month-pop-grid">
        ${MONTHS_SHORT.map((mName, idx) => {
          const mm = String(idx + 1).padStart(2, "0");
          const ym = `${viewYear}-${mm}`;
          const isSelected = ym === currentVal;
          const isToday = ym === todayYm;
          return `<button type="button" class="month-cell${isSelected ? " is-selected" : ""}${!isSelected && isToday ? " is-today" : ""}" data-ym="${ym}">${mName}</button>`;
        }).join("")}
      </div>
      <div class="month-pop-foot">
        <span class="mono" style="font-size:11.5px;color:var(--muted)">${escapeHtml(currentVal)}</span>
        <button type="button" class="month-pop-today" data-ym-today="1">Текущий месяц</button>
      </div>
    `;

    pop.querySelectorAll("[data-ym-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        viewYear += Number(btn.dataset.ymNav);
        renderGrid();
      });
    });

    pop.querySelectorAll("[data-ym]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectYm(btn.dataset.ym);
      });
    });

    pop.querySelector("[data-ym-today]")?.addEventListener("click", () => {
      selectYm(todayYm);
    });
  };

  const selectYm = (ym) => {
    currentVal = ym;
    viewYear = Number(ym.split("-")[0]);
    hiddenInput.value = ym;
    labelEl.textContent = formatMonthLabel(ym);
    trigger.setAttribute("aria-label", `Выбрать месяц: ${formatMonthLabel(ym)}`);
    pop.hidePopover?.();
    if (onChange) onChange(ym);
  };

  pop.addEventListener("toggle", (e) => {
    if (e.newState === "open") {
      viewYear = Number(String(currentVal).split("-")[0]) || viewYear;
      renderGrid();
    }
  });
}

function renderExportBarHtml(title, description, scopeKey) {
  return `
    <div class="export-bar" data-export-scope="${escapeHtml(scopeKey)}">
      <div class="export-info">
        <span class="export-title">${escapeHtml(title)}</span>
        <span class="export-desc">${escapeHtml(description)}</span>
      </div>
      <div class="export-pills" role="group" aria-label="${escapeHtml(title)}">
        <button type="button" class="export-pill" data-fmt="json">JSON</button>
        <button type="button" class="export-pill" data-fmt="csv">CSV</button>
        <button type="button" class="export-pill" data-fmt="xml">XML</button>
        <button type="button" class="export-pill" data-fmt="yaml">YAML</button>
      </div>
    </div>
  `;
}

function bindExportBar(scopeKey, handler, root = els.mainContent) {
  const bar = root.querySelector(`[data-export-scope="${scopeKey}"]`);
  if (!bar) return;
  bar.querySelectorAll("[data-fmt]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await handler(btn.dataset.fmt);
        showToast(`Файл сохранён (${btn.dataset.fmt.toUpperCase()})`);
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
}

// ===== Форматирование =====
const rubFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

function money(val) {
  return `${rubFormatter.format(Number(val || 0))} ₽`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name || "SA").slice(0, 2).toUpperCase();
}

// ===== Тосты =====
function showToast(message, isError = false) {
  const node = document.createElement("div");
  node.className = `toast${isError ? " is-error" : ""}`;
  node.textContent = message;
  els.toastRegion.append(node);
  setTimeout(() => node.remove(), 3600);
}

// ===== Тема =====
// Фиксированная чёрно-белая тёмная тема без переключателя

// ===== Валидация форм (:user-invalid + ARIA + fallback) =====
function initValidationHelpers() {
  const linkError = (el, shown) => {
    const errorId = el.dataset.error;
    if (!errorId) return;
    const ids = (el.getAttribute("aria-describedby") || "")
      .split(/\s+/)
      .filter((id) => id && id !== errorId);
    if (shown) ids.push(errorId);
    if (ids.length) el.setAttribute("aria-describedby", ids.join(" "));
    else el.removeAttribute("aria-describedby");
  };

  const supportsUserInvalid = CSS.supports("selector(:user-invalid)");
  const dirtyState = new WeakMap();

  const syncControl = (el) => {
    if (!el.matches?.("input, select, textarea")) return;
    const invalid = supportsUserInvalid
      ? el.matches(":user-invalid")
      : Boolean(dirtyState.get(el)?.hasBlurred && !el.validity.valid);
    if (!supportsUserInvalid && dirtyState.get(el)?.hasBlurred) {
      el.classList.toggle("user-invalid-fallback", !el.validity.valid);
      el.classList.toggle("user-valid-fallback", el.validity.valid);
    }
    el.setAttribute("aria-invalid", invalid ? "true" : "false");
    linkError(el, invalid);
  };

  document.addEventListener("blur", (e) => {
    const el = e.target;
    if (!el.matches?.("input, select, textarea")) return;
    const s = dirtyState.get(el) || { hasInteracted: false, hasBlurred: false };
    s.hasBlurred = true;
    dirtyState.set(el, s);
    syncControl(el);
  }, true);

  document.addEventListener("input", (e) => {
    const el = e.target;
    if (!el.matches?.("input, select, textarea")) return;
    const s = dirtyState.get(el) || { hasInteracted: false, hasBlurred: false };
    s.hasInteracted = true;
    dirtyState.set(el, s);
    if (s.hasBlurred || el.getAttribute("aria-invalid") === "true") syncControl(el);
  });

  document.addEventListener("invalid", (e) => {
    const el = e.target;
    dirtyState.set(el, { hasInteracted: true, hasBlurred: true });
    syncControl(el);
  }, true);
}

// ===== Нативный <dialog> =====
function initDialog() {
  if (!("closedBy" in HTMLDialogElement.prototype)) {
    const outside = (e, dialog) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    els.dialog.addEventListener("pointerdown", (e) => {
      pressedOutside = outside(e, els.dialog);
    });
    els.dialog.addEventListener("pointerup", (e) => {
      if (pressedOutside && outside(e, els.dialog)) els.dialog.close();
    });
  }

  document.getElementById("dialog-close-x").addEventListener("click", () => {
    els.dialog.close("cancel");
  });

  els.dialog.addEventListener("close", () => {
    els.dialog.returnValue = "";
    els.dialogBody.innerHTML = "";
  });
}

function openDialog(title, bodyHtml, onMount) {
  els.dialogTitle.textContent = title;
  els.dialogBody.innerHTML = bodyHtml;
  els.dialog.showModal();
  if (onMount) onMount(els.dialogBody, () => els.dialog.close());
}

// ===== Авторизация =====
async function refreshRegisterPositions() {
  const positions = await api.getPositions();
  const select = document.getElementById("reg-position");
  select.innerHTML = `<option value="" disabled selected>Выберите должность…</option>` +
    positions.map((p) => `<option value="${p.position_id}">${escapeHtml(p.name)} — ${money(p.base_salary)}</option>`).join("");
}

function initAuth() {
  const loginForm = document.getElementById("login-form");
  const regForm = document.getElementById("register-form");
  const tabs = document.querySelectorAll(".auth-tab");

  tabs.forEach((tab) => {
    tab.addEventListener("click", async () => {
      const target = tab.dataset.authTab;
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      loginForm.hidden = target !== "login";
      regForm.hidden = target !== "register";
      if (target === "register") await refreshRegisterPositions();
    });
  });

  document.querySelectorAll("[data-fill-login]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("login-username").value = btn.dataset.fillLogin;
      document.getElementById("login-password").value = btn.dataset.fillPass;
      loginForm.requestSubmit();
    });
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errBox = document.getElementById("login-server-error");
    errBox.hidden = true;
    if (!loginForm.reportValidity()) return;

    const login = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    try {
      const user = await api.login(login, password);
      enterApp(user);
    } catch (err) {
      errBox.textContent = err.message;
      errBox.hidden = false;
    }
  });

  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errBox = document.getElementById("reg-server-error");
    errBox.hidden = true;
    if (!regForm.reportValidity()) return;

    try {
      const login = document.getElementById("reg-login").value;
      const password = document.getElementById("reg-password").value;
      const full_name = document.getElementById("reg-fullname").value;
      const position_id = Number(document.getElementById("reg-position").value);
      const res = await api.registerEmployee({ login, password, full_name, position_id });
      if (res?.pending_approval) {
        regForm.reset();
        showToast("Заявка отправлена! После утверждения должности бухгалтером вы сможете войти.");
        document.querySelector('[data-auth-tab="login"]')?.click();
        document.getElementById("login-username").value = login;
        document.getElementById("login-password").value = "";
      } else {
        const user = await api.login(login, password);
        showToast("Аккаунт сотрудника создан");
        enterApp(user);
      }
    } catch (err) {
      errBox.textContent = err.message;
      errBox.hidden = false;
    }
  });
}

function enterApp(user) {
  state.user = user;
  localStorage.setItem("sa_session", JSON.stringify(user));
  state.route = user.role_name === "Бухгалтер" ? "overview" : "my-salaries";
  els.authScreen.hidden = true;
  els.appShell.hidden = false;

  const displayName = user.employee?.full_name || user.login;
  els.headerUserName.textContent = displayName;
  els.headerUserRole.textContent = user.role_name;
  els.headerUserAvatar.textContent = initials(displayName);

  renderSidebar();
  renderRoute();
}

function logout() {
  state.user = null;
  localStorage.removeItem("sa_session");
  els.appShell.hidden = true;
  els.authScreen.hidden = false;
  document.getElementById("login-password").value = "";
}

// ===== Навигация =====
const ICONS = {
  overview: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/></svg>`,
  salaries: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  employees: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  positions: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`
};

function getNavItems() {
  if (state.user?.role_name === "Бухгалтер") {
    return [
      { id: "overview", label: "Обзор и отчёт", icon: ICONS.overview },
      { id: "salaries", label: "Зарплаты", icon: ICONS.salaries },
      { id: "employees", label: "Сотрудники", icon: ICONS.employees },
      { id: "positions", label: "Должности", icon: ICONS.positions }
    ];
  }
  return [
    { id: "my-salaries", label: "Мои начисления", icon: ICONS.salaries }
  ];
}

function renderSidebar() {
  const items = getNavItems();
  els.sidebarNav.innerHTML = items.map((item) => `
    <button type="button" class="nav-item${state.route === item.id ? " is-active" : ""}" data-route="${item.id}">
      ${item.icon}
      <span class="nav-label">${item.label}</span>
    </button>
  `).join("");

  els.sidebarNav.querySelectorAll("[data-route]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.route = btn.dataset.route;
      closeMobileDrawer();
      renderSidebar();
      renderRoute();
    });
  });
}

function setBreadcrumbs(currentLabel) {
  els.breadcrumbs.innerHTML = `<span>SalaryAccounting</span><span>/</span><strong>${escapeHtml(currentLabel)}</strong>`;
}

function closeMobileDrawer() {
  els.sidebar.classList.remove("is-open");
  els.drawerBackdrop.hidden = true;
}

function initShellControls() {
  const brandLink = els.sidebar.querySelector(".brand-link");
  const syncBrandTooltip = () => {
    const collapsed = els.appShell.classList.contains("is-collapsed");
    brandLink.title = collapsed ? "Развернуть меню" : "На главную";
  };
  syncBrandTooltip();

  document.getElementById("sidebar-collapse-btn").addEventListener("click", () => {
    els.appShell.classList.toggle("is-collapsed");
    syncBrandTooltip();
  });

  brandLink.addEventListener("click", (e) => {
    e.preventDefault();
    if (els.appShell.classList.contains("is-collapsed")) {
      els.appShell.classList.remove("is-collapsed");
      syncBrandTooltip();
      return;
    }
    state.route = state.user?.role_name === "Бухгалтер" ? "overview" : "my-salaries";
    renderSidebar();
    renderRoute();
  });

  document.getElementById("mobile-menu-btn").addEventListener("click", () => {
    els.sidebar.classList.add("is-open");
    els.drawerBackdrop.hidden = false;
  });
  els.drawerBackdrop.addEventListener("click", closeMobileDrawer);
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("change-pass-btn").addEventListener("click", openChangePasswordDialog);
}

// ===== Экран: Смена пароля =====
function openChangePasswordDialog() {
  openDialog("Смена пароля", `
    <form id="change-pass-form" class="auth-form" novalidate>
      <div class="field">
        <label for="old-pass">Старый пароль</label>
        <input id="old-pass" type="password" required autofocus autocomplete="current-password" data-error="old-pass-err">
        <div id="old-pass-err" class="error-msg">Введите текущий пароль</div>
      </div>
      <div class="field">
        <label for="new-pass">Новый пароль</label>
        <input id="new-pass" type="password" required minlength="4" autocomplete="new-password" data-error="new-pass-err">
        <div id="new-pass-err" class="error-msg">Минимум 4 символа</div>
      </div>
      <div id="pass-err-box" class="form-alert" hidden></div>
      <div class="dialog-actions">
        <button type="button" class="btn" id="pass-cancel">Отмена</button>
        <button type="submit" class="btn btn-primary">Сохранить</button>
      </div>
    </form>
  `, (root, close) => {
    root.querySelector("#pass-cancel").addEventListener("click", close);
    const form = root.querySelector("#change-pass-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const errBox = root.querySelector("#pass-err-box");
      errBox.hidden = true;
      try {
        await api.changePassword(
          state.user.user_id,
          root.querySelector("#old-pass").value,
          root.querySelector("#new-pass").value
        );
        close();
        showToast("Пароль успешно изменён");
      } catch (err) {
        errBox.textContent = err.message;
        errBox.hidden = false;
      }
    });
  });
}

// ===== Роутинг =====
async function renderRoute() {
  if (!state.user) return;
  try {
    if (state.route === "overview") await renderOverview();
    else if (state.route === "salaries") await renderSalariesPage();
    else if (state.route === "employees") await renderEmployeesPage();
    else if (state.route === "positions") await renderPositionsPage();
    else if (state.route === "my-salaries") await renderEmployeeHistoryPage();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ===== Бухгалтер: Обзор и отчёт за месяц =====
async function renderOverview() {
  setBreadcrumbs("Обзор и отчёт");
  const [salaries, employees, positions] = await Promise.all([
    api.getMonthReport(state.month),
    api.getEmployees(),
    api.getPositions()
  ]);
  state.salaries = salaries;
  state.employees = employees;
  state.positions = positions;

  const totalAmount = salaries.reduce((s, r) => s + r.amount, 0);
  const totalTax = salaries.reduce((s, r) => s + r.tax, 0);
  const totalPayout = salaries.reduce((s, r) => s + r.payout, 0);
  const paidCount = salaries.filter((r) => r.is_paid).length;

  els.mainContent.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title">Отчёт за месяц</h1>
        <p class="page-subtitle">Сводка начислений, удержания НДФЛ 13% и статус выплат</p>
      </div>
      <div class="page-actions">
        ${renderMonthPickerHtml("overview-month", state.month)}
        <button type="button" id="btn-accrue-all" class="btn">Начислить всем по окладу</button>
        <button type="button" id="btn-accrue-one" class="btn btn-primary">+ Начислить</button>
      </div>
    </div>

    <section class="kpi-grid" aria-label="Итоги за месяц">
      <div class="kpi-card">
        <span class="kpi-label">Итого начислено</span>
        <strong class="kpi-value">${money(totalAmount)}</strong>
        <span class="kpi-hint">Сотрудников в ведомости: ${salaries.length}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Итого налог (13%)</span>
        <strong class="kpi-value">${money(totalTax)}</strong>
        <span class="kpi-hint">НДФЛ по ставке 13%</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Итого к выплате</span>
        <strong class="kpi-value">${money(totalPayout)}</strong>
        <span class="kpi-hint">После вычета налога</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Выплачено</span>
        <strong class="kpi-value">${paidCount} / ${salaries.length}</strong>
        <span class="kpi-hint">Всего в штате: ${employees.length}</span>
      </div>
    </section>

    <section class="panel">
      <div class="panel-toolbar">
        <h2 class="panel-title">Ведомость за ${escapeHtml(state.month)}</h2>
      </div>
      ${renderSalariesTableHtml(salaries, "overview-table-cap")}
    </section>
  `;

  initMonthPicker("overview-month", state.month, (ym) => {
    state.month = ym;
    renderOverview();
  });
  document.getElementById("btn-accrue-all").addEventListener("click", handleAccrueAll);
  document.getElementById("btn-accrue-one").addEventListener("click", openAccrueDialog);
  bindSalaryRowActions();
}

function renderSalariesTableHtml(salaries, captionId) {
  if (!salaries.length) {
    return `<div class="empty-state">За этот месяц начислений пока нет. Нажмите «Начислить всем по окладу» или добавьте вручную.</div>`;
  }
  return `
    <div tabindex="0" role="region" aria-labelledby="${captionId}" class="table-wrapper">
      <table>
        <caption id="${captionId}">Начисления зарплаты за выбранный месяц</caption>
        <thead>
          <tr>
            <th>Сотрудник</th>
            <th>Должность</th>
            <th>Начислено</th>
            <th>Налог 13%</th>
            <th>К выплате</th>
            <th>Статус</th>
            <th style="text-align:right">Действия</th>
          </tr>
        </thead>
        <tbody>
          ${salaries.map((s) => `
            <tr>
              <th>${escapeHtml(s.employee_name)}</th>
              <td data-label="Должность">${escapeHtml(s.position_name)}</td>
              <td data-label="Начислено" class="num mono">${money(s.amount)}</td>
              <td data-label="Налог 13%" class="num mono">${money(s.tax)}</td>
              <td data-label="К выплате" class="num mono"><strong>${money(s.payout)}</strong></td>
              <td data-label="Статус">
                ${s.is_paid
                  ? `<span class="badge badge-paid">Выплачено</span>`
                  : `<span class="badge badge-pending">Ожидает выплаты</span>`}
              </td>
              <td data-label="Действия">
                <div class="row-actions">
                  ${!s.is_paid
                    ? `<button type="button" class="btn btn-success btn-sm" data-pay-id="${s.salary_id}">Выплатить</button>
                       <button type="button" class="btn btn-danger btn-sm" data-del-salary="${s.salary_id}">Удалить</button>`
                    : `<span style="color:var(--text-muted);font-size:12px">Проведено</span>`}
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function bindSalaryRowActions() {
  els.mainContent.querySelectorAll("[data-pay-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await api.markPaid(Number(btn.dataset.payId));
        showToast("Выплата отмечена");
        renderRoute();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });

  els.mainContent.querySelectorAll("[data-del-salary]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.delSalary);
      openConfirmDialog("Удалить начисление?", "Невыплаченное начисление будет удалено без возможности восстановления.", async () => {
        await api.deleteSalary(id);
        showToast("Начисление удалено");
        renderRoute();
      });
    });
  });
}

async function handleAccrueAll() {
  try {
    const res = await api.accrueForAll(state.month);
    showToast(res.count > 0 ? `Начислено сотрудникам: ${res.count}` : "Всем сотрудникам за этот месяц уже начислено");
    renderRoute();
  } catch (err) {
    showToast(err.message, true);
  }
}

async function openAccrueDialog() {
  const employees = await api.getEmployees();
  if (!employees.length) {
    showToast("Сначала добавьте хотя бы одного сотрудника", true);
    return;
  }
  openDialog("Начислить зарплату", `
    <form id="accrue-form" class="auth-form" novalidate>
      <div class="field">
        <label for="accrue-emp">Сотрудник</label>
        <select id="accrue-emp" required autofocus data-error="accrue-emp-err">
          ${employees.map((e) => `<option value="${e.employee_id}" data-base="${e.base_salary}">${escapeHtml(e.full_name)} (${escapeHtml(e.position_name)})</option>`).join("")}
        </select>
        <div id="accrue-emp-err" class="error-msg">Выберите сотрудника</div>
      </div>
      <div class="field">
        <label for="accrue-month-trigger">Месяц (ГГГГ-ММ)</label>
        ${renderMonthPickerHtml("accrue-month", state.month, true)}
      </div>
      <div class="field">
        <label for="accrue-amount">Сумма начисления (₽)</label>
        <input id="accrue-amount" type="number" min="1" step="any" required value="${employees[0].base_salary}" data-error="accrue-amount-err">
        <div id="accrue-amount-err" class="error-msg">Сумма должна быть больше 0</div>
      </div>
      <div class="calc-preview">
        <div class="calc-item"><span>Сумма</span><strong id="calc-gross">${money(employees[0].base_salary)}</strong></div>
        <div class="calc-item"><span>Налог 13%</span><strong id="calc-tax">${money(api.calculateTax(employees[0].base_salary))}</strong></div>
        <div class="calc-item"><span>К выплате</span><strong id="calc-net">${money(api.calculatePayout(employees[0].base_salary))}</strong></div>
      </div>
      <div id="accrue-err" class="form-alert" hidden></div>
      <div class="dialog-actions">
        <button type="button" class="btn" id="accrue-cancel">Отмена</button>
        <button type="submit" class="btn btn-primary">Начислить</button>
      </div>
    </form>
  `, (root, close) => {
    initMonthPicker("accrue-month", state.month, null, root);
    const empSelect = root.querySelector("#accrue-emp");
    const amountInput = root.querySelector("#accrue-amount");
    const updatePreview = () => {
      const val = Number(amountInput.value || 0);
      root.querySelector("#calc-gross").textContent = money(val);
      root.querySelector("#calc-tax").textContent = money(api.calculateTax(val));
      root.querySelector("#calc-net").textContent = money(api.calculatePayout(val));
    };
    empSelect.addEventListener("change", () => {
      const opt = empSelect.selectedOptions[0];
      if (opt?.dataset.base) {
        amountInput.value = opt.dataset.base;
        updatePreview();
      }
    });
    amountInput.addEventListener("input", updatePreview);
    root.querySelector("#accrue-cancel").addEventListener("click", close);

    const form = root.querySelector("#accrue-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const errBox = root.querySelector("#accrue-err");
      errBox.hidden = true;
      try {
        const month = root.querySelector("#accrue-month").value;
        const amount = Number(amountInput.value);
        await api.accrueSalary(Number(empSelect.value), month, amount);
        state.month = month;
        close();
        showToast("Зарплата начислена");
        renderRoute();
      } catch (err) {
        errBox.textContent = err.message;
        errBox.hidden = false;
      }
    });
  });
}

// ===== Бухгалтер: Зарплаты =====
async function renderSalariesPage() {
  setBreadcrumbs("Зарплаты");
  const salaries = await api.getMonthReport(state.month);
  els.mainContent.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title">Начисления и выплаты</h1>
        <p class="page-subtitle">Расчёт зарплаты, отметка о выдаче и удаление ошибочных начислений</p>
      </div>
      <div class="page-actions">
        ${renderMonthPickerHtml("sal-month", state.month)}
        <button type="button" id="sal-accrue-all" class="btn">Начислить всем по окладу</button>
        <button type="button" id="sal-accrue-one" class="btn btn-primary">+ Начислить сотруднику</button>
      </div>
    </div>
    <section class="panel">
      ${renderSalariesTableHtml(salaries, "salaries-table-cap")}
    </section>
  `;
  initMonthPicker("sal-month", state.month, (ym) => {
    state.month = ym;
    renderSalariesPage();
  });
  document.getElementById("sal-accrue-all").addEventListener("click", handleAccrueAll);
  document.getElementById("sal-accrue-one").addEventListener("click", openAccrueDialog);
  bindSalaryRowActions();
}

// ===== Бухгалтер: Сотрудники =====
async function renderEmployeesPage() {
  setBreadcrumbs("Сотрудники");
  const [employees, positions] = await Promise.all([api.getEmployees(), api.getPositions()]);
  state.employees = employees;
  state.positions = positions;

  const pending = employees.filter((e) => e.is_approved === false);
  const approved = employees.filter((e) => e.is_approved !== false);

  els.mainContent.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title">Сотрудники</h1>
        <p class="page-subtitle">Управление штатом, утверждение должностей новых регистраций и перевод</p>
      </div>
      <div class="page-actions">
        <button type="button" id="btn-add-emp" class="btn btn-primary">+ Добавить сотрудника</button>
      </div>
    </div>

    ${pending.length ? `
      <section class="panel">
        <div class="panel-toolbar">
          <h2 class="panel-title">Ожидают утверждения (${pending.length})</h2>
        </div>
        <div tabindex="0" role="region" aria-labelledby="pending-table-cap" class="table-wrapper">
          <table>
            <caption id="pending-table-cap">Новые регистрации, ожидающие утверждения должности бухгалтером</caption>
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Логин</th>
                <th>Запрошенная должность</th>
                <th>Оклад</th>
                <th style="text-align:right">Действия</th>
              </tr>
            </thead>
            <tbody>
              ${pending.map((e) => `
                <tr>
                  <th>${escapeHtml(e.full_name)}</th>
                  <td data-label="Логин" class="mono">${escapeHtml(e.login)}</td>
                  <td data-label="Должность">${escapeHtml(e.position_name)}</td>
                  <td data-label="Оклад" class="num mono">${money(e.base_salary)}</td>
                  <td data-label="Действия">
                    <div class="row-actions">
                      <button type="button" class="btn btn-success btn-sm" data-approve-emp="${e.employee_id}">Утвердить</button>
                      <button type="button" class="btn btn-danger btn-sm" data-del-emp="${e.employee_id}">Отклонить</button>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    ` : ""}

    <section class="panel">
      <div class="panel-toolbar">
        <h2 class="panel-title">Утверждённый штат (${approved.length})</h2>
      </div>
      ${renderExportBarHtml(
        "Сохранить таблицу сотрудников (employees)",
        "Выгружает всех сотрудников со связями: ФИО, должность, оклад, логин и роль в системе.",
        "employees-list"
      )}
      ${!approved.length ? `<div class="empty-state">Утверждённых сотрудников пока нет</div>` : `
        <div tabindex="0" role="region" aria-labelledby="emp-table-cap" class="table-wrapper">
          <table>
            <caption id="emp-table-cap">Список сотрудников организации</caption>
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Логин</th>
                <th>Должность</th>
                <th>Оклад</th>
                <th style="text-align:right">Действия</th>
              </tr>
            </thead>
            <tbody>
              ${approved.map((e) => `
                <tr>
                  <th>${escapeHtml(e.full_name)}</th>
                  <td data-label="Логин" class="mono">${escapeHtml(e.login)}</td>
                  <td data-label="Должность">${escapeHtml(e.position_name)}</td>
                  <td data-label="Оклад" class="num mono">${money(e.base_salary)}</td>
                  <td data-label="Действия">
                    <div class="row-actions">
                      <button type="button" class="btn btn-sm" data-move-emp="${e.employee_id}">Перевести</button>
                      <button type="button" class="btn btn-danger btn-sm" data-del-emp="${e.employee_id}">Удалить</button>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `}
    </section>
  `;

  document.getElementById("btn-add-emp").addEventListener("click", openAddEmployeeDialog);
  bindExportBar("employees-list", (fmt) => api.exportEmployees(fmt));
  els.mainContent.querySelectorAll("[data-approve-emp]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const emp = state.employees.find((x) => x.employee_id === Number(btn.dataset.approveEmp));
      if (emp) openApproveEmployeeDialog(emp);
    });
  });
  els.mainContent.querySelectorAll("[data-move-emp]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const emp = state.employees.find((x) => x.employee_id === Number(btn.dataset.moveEmp));
      if (emp) openTransferEmployeeDialog(emp);
    });
  });
  els.mainContent.querySelectorAll("[data-del-emp]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.delEmp);
      const emp = state.employees.find((x) => x.employee_id === id);
      try {
        const history = await api.getEmployeeHistory(id);
        if (history.length > 0 && emp) {
          openDeleteEmployeeWithExportDialog(emp, history.length);
        } else {
          openConfirmDialog("Удалить сотрудника?", "Учётная запись и карточка сотрудника будут удалены.", async () => {
            await api.deleteEmployee(id);
            showToast("Сотрудник удалён");
            renderEmployeesPage();
          });
        }
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
}

function openDeleteEmployeeWithExportDialog(emp, historyCount) {
  openDialog("Удаление сотрудника", `
    <div class="auth-form">
      <p style="margin:0;color:var(--muted)">Сотрудник: <strong style="color:var(--ink)">${escapeHtml(emp.full_name)}</strong></p>
      <div class="info-banner">
        У сотрудника есть история начислений (<span class="mono">${historyCount}</span>). Чтобы удалить карточку вместе с историей, сначала скачайте таблицу (заглушка).
      </div>
      <button type="button" class="btn btn-full" id="stub-export-btn">1. Скачать таблицу (заглушка)</button>
      <div class="dialog-actions">
        <button type="button" class="btn" id="del-emp-cancel" autofocus>Отмена</button>
        <button type="button" class="btn btn-danger" id="del-emp-confirm" disabled>2. Удалить сотрудника</button>
      </div>
    </div>
  `, (root, close) => {
    const exportBtn = root.querySelector("#stub-export-btn");
    const confirmBtn = root.querySelector("#del-emp-confirm");
    root.querySelector("#del-emp-cancel").addEventListener("click", close);

    exportBtn.addEventListener("click", async () => {
      try {
        await api.exportEmployeeTableStub(emp.employee_id);
        exportBtn.textContent = "✓ Таблица скачана (заглушка)";
        confirmBtn.disabled = false;
        showToast("Таблица выгружена (заглушка), теперь можно удалить сотрудника");
      } catch (err) {
        showToast(err.message, true);
      }
    });

    confirmBtn.addEventListener("click", async () => {
      try {
        await api.deleteEmployee(emp.employee_id);
        close();
        showToast("Сотрудник и его история начислений удалены");
        renderEmployeesPage();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
}

function openApproveEmployeeDialog(emp) {
  openDialog("Утвердить должность", `
    <form id="approve-emp-form" class="auth-form" novalidate>
      <p style="margin:0;color:var(--text-secondary)">Сотрудник: <strong style="color:var(--text-primary)">${escapeHtml(emp.full_name)}</strong> (<span class="mono">${escapeHtml(emp.login)}</span>)</p>
      <div class="field">
        <label for="approve-pos">Утверждаемая должность</label>
        <select id="approve-pos" required autofocus>
          ${state.positions.map((p) => `<option value="${p.position_id}" ${p.position_id === emp.position_id ? "selected" : ""}>${escapeHtml(p.name)} — ${money(p.base_salary)}</option>`).join("")}
        </select>
      </div>
      <p style="margin:0;font-size:12px;color:var(--text-muted)">После утверждения пользователь получит все права выбранной должности (для должности «Бухгалтер» — права администратора).</p>
      <div id="approve-emp-err" class="form-alert" hidden></div>
      <div class="dialog-actions">
        <button type="button" class="btn" id="approve-cancel">Отмена</button>
        <button type="submit" class="btn btn-success">Утвердить</button>
      </div>
    </form>
  `, (root, close) => {
    root.querySelector("#approve-cancel").addEventListener("click", close);
    root.querySelector("#approve-emp-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const errBox = root.querySelector("#approve-emp-err");
      errBox.hidden = true;
      try {
        await api.approveEmployee(emp.employee_id, Number(root.querySelector("#approve-pos").value));
        close();
        showToast("Должность утверждена, доступ открыт");
        renderEmployeesPage();
      } catch (err) {
        errBox.textContent = err.message;
        errBox.hidden = false;
      }
    });
  });
}

function openAddEmployeeDialog() {
  openDialog("Новый сотрудник", `
    <form id="add-emp-form" class="auth-form" novalidate>
      <div class="field">
        <label for="emp-fullname">ФИО</label>
        <input id="emp-fullname" type="text" required minlength="3" autofocus placeholder="Соколов Дмитрий Андреевич" data-error="emp-fullname-err">
        <div id="emp-fullname-err" class="error-msg">Укажите ФИО</div>
      </div>
      <div class="field">
        <label for="emp-login">Логин</label>
        <input id="emp-login" type="text" required minlength="3" placeholder="sokolov" data-error="emp-login-err">
        <div id="emp-login-err" class="error-msg">Минимум 3 символа</div>
      </div>
      <div class="field">
        <label for="emp-pass">Пароль</label>
        <input id="emp-pass" type="password" required minlength="4" placeholder="Минимум 4 символа" data-error="emp-pass-err">
        <div id="emp-pass-err" class="error-msg">Минимум 4 символа</div>
      </div>
      <div class="field">
        <label for="emp-pos">Должность</label>
        <select id="emp-pos" required data-error="emp-pos-err">
          ${state.positions.map((p) => `<option value="${p.position_id}">${escapeHtml(p.name)} — ${money(p.base_salary)}</option>`).join("")}
        </select>
        <div id="emp-pos-err" class="error-msg">Выберите должность</div>
      </div>
      <div id="add-emp-err" class="form-alert" hidden></div>
      <div class="dialog-actions">
        <button type="button" class="btn" id="emp-cancel">Отмена</button>
        <button type="submit" class="btn btn-primary">Добавить</button>
      </div>
    </form>
  `, (root, close) => {
    root.querySelector("#emp-cancel").addEventListener("click", close);
    const form = root.querySelector("#add-emp-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const errBox = root.querySelector("#add-emp-err");
      errBox.hidden = true;
      try {
        await api.registerEmployee({
          full_name: root.querySelector("#emp-fullname").value,
          login: root.querySelector("#emp-login").value,
          password: root.querySelector("#emp-pass").value,
          position_id: Number(root.querySelector("#emp-pos").value)
        });
        close();
        showToast("Сотрудник добавлен");
        renderEmployeesPage();
      } catch (err) {
        errBox.textContent = err.message;
        errBox.hidden = false;
      }
    });
  });
}

function openTransferEmployeeDialog(emp) {
  openDialog("Перевод на должность", `
    <form id="move-emp-form" class="auth-form" novalidate>
      <p style="margin:0;color:var(--text-secondary)">Сотрудник: <strong style="color:var(--text-primary)">${escapeHtml(emp.full_name)}</strong></p>
      <div class="field">
        <label for="move-pos">Новая должность</label>
        <select id="move-pos" required autofocus>
          ${state.positions.map((p) => `<option value="${p.position_id}" ${p.position_id === emp.position_id ? "selected" : ""}>${escapeHtml(p.name)} — ${money(p.base_salary)}</option>`).join("")}
        </select>
      </div>
      <div id="move-emp-err" class="form-alert" hidden></div>
      <div class="dialog-actions">
        <button type="button" class="btn" id="move-cancel">Отмена</button>
        <button type="submit" class="btn btn-primary">Перевести</button>
      </div>
    </form>
  `, (root, close) => {
    root.querySelector("#move-cancel").addEventListener("click", close);
    root.querySelector("#move-emp-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const errBox = root.querySelector("#move-emp-err");
      errBox.hidden = true;
      try {
        await api.changeEmployeePosition(emp.employee_id, Number(root.querySelector("#move-pos").value));
        close();
        showToast("Сотрудник переведён");
        renderEmployeesPage();
      } catch (err) {
        errBox.textContent = err.message;
        errBox.hidden = false;
      }
    });
  });
}

// ===== Бухгалтер: Должности =====
async function renderPositionsPage() {
  setBreadcrumbs("Должности");
  const positions = await api.getPositions();
  state.positions = positions;

  els.mainContent.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title">Должности и оклады</h1>
        <p class="page-subtitle">Справочник должностей; изменение оклада не затрагивает прошлые начисления</p>
      </div>
      <div class="page-actions">
        <button type="button" id="btn-add-pos" class="btn btn-primary">+ Добавить должность</button>
      </div>
    </div>

    <section class="panel">
      ${!positions.length ? `<div class="empty-state">Должностей пока нет</div>` : `
        <div tabindex="0" role="region" aria-labelledby="pos-table-cap" class="table-wrapper">
          <table>
            <caption id="pos-table-cap">Справочник должностей</caption>
            <thead>
              <tr>
                <th>Название</th>
                <th>Базовый оклад</th>
                <th style="text-align:right">Действия</th>
              </tr>
            </thead>
            <tbody>
              ${positions.map((p) => `
                <tr>
                  <th>${escapeHtml(p.name)}</th>
                  <td data-label="Базовый оклад" class="num mono">${money(p.base_salary)}</td>
                  <td data-label="Действия">
                    <div class="row-actions">
                      <button type="button" class="btn btn-sm" data-edit-pos="${p.position_id}">Изменить оклад</button>
                      <button type="button" class="btn btn-danger btn-sm" data-del-pos="${p.position_id}">Удалить</button>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `}
    </section>
  `;

  document.getElementById("btn-add-pos").addEventListener("click", openAddPositionDialog);
  els.mainContent.querySelectorAll("[data-edit-pos]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pos = state.positions.find((x) => x.position_id === Number(btn.dataset.editPos));
      if (pos) openEditPositionDialog(pos);
    });
  });
  els.mainContent.querySelectorAll("[data-del-pos]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.delPos);
      openConfirmDialog("Удалить должность?", "Удаление возможно только если на этой должности нет сотрудников.", async () => {
        await api.deletePosition(id);
        showToast("Должность удалена");
        renderPositionsPage();
      });
    });
  });
}

function openAddPositionDialog() {
  openDialog("Новая должность", `
    <form id="add-pos-form" class="auth-form" novalidate>
      <div class="field">
        <label for="pos-name">Название</label>
        <input id="pos-name" type="text" required autofocus placeholder="Тестировщик" data-error="pos-name-err">
        <div id="pos-name-err" class="error-msg">Введите название должности</div>
      </div>
      <div class="field">
        <label for="pos-salary">Оклад (₽)</label>
        <input id="pos-salary" type="number" min="1" step="any" required placeholder="85000" data-error="pos-salary-err">
        <div id="pos-salary-err" class="error-msg">Оклад должен быть больше 0</div>
      </div>
      <div id="add-pos-err" class="form-alert" hidden></div>
      <div class="dialog-actions">
        <button type="button" class="btn" id="pos-cancel">Отмена</button>
        <button type="submit" class="btn btn-primary">Создать</button>
      </div>
    </form>
  `, (root, close) => {
    root.querySelector("#pos-cancel").addEventListener("click", close);
    const form = root.querySelector("#add-pos-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const errBox = root.querySelector("#add-pos-err");
      errBox.hidden = true;
      try {
        await api.createPosition(
          root.querySelector("#pos-name").value,
          Number(root.querySelector("#pos-salary").value)
        );
        close();
        showToast("Должность добавлена");
        renderPositionsPage();
      } catch (err) {
        errBox.textContent = err.message;
        errBox.hidden = false;
      }
    });
  });
}

function openEditPositionDialog(pos) {
  openDialog("Изменить оклад", `
    <form id="edit-pos-form" class="auth-form" novalidate>
      <p style="margin:0;color:var(--text-secondary)">Должность: <strong style="color:var(--text-primary)">${escapeHtml(pos.name)}</strong></p>
      <div class="field">
        <label for="edit-pos-salary">Новый оклад (₽)</label>
        <input id="edit-pos-salary" type="number" min="1" step="any" required autofocus value="${pos.base_salary}" data-error="edit-pos-err">
        <div id="edit-pos-err" class="error-msg">Оклад должен быть больше 0</div>
      </div>
      <div id="edit-pos-alert" class="form-alert" hidden></div>
      <div class="dialog-actions">
        <button type="button" class="btn" id="edit-pos-cancel">Отмена</button>
        <button type="submit" class="btn btn-primary">Сохранить</button>
      </div>
    </form>
  `, (root, close) => {
    root.querySelector("#edit-pos-cancel").addEventListener("click", close);
    const form = root.querySelector("#edit-pos-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const errBox = root.querySelector("#edit-pos-alert");
      errBox.hidden = true;
      try {
        await api.updatePositionSalary(pos.position_id, Number(root.querySelector("#edit-pos-salary").value));
        close();
        showToast("Оклад обновлён");
        renderPositionsPage();
      } catch (err) {
        errBox.textContent = err.message;
        errBox.hidden = false;
      }
    });
  });
}

// ===== Сотрудник: Мои начисления =====
async function renderEmployeeHistoryPage() {
  setBreadcrumbs("Мои начисления");
  const emp = state.user.employee;
  if (!emp) {
    els.mainContent.innerHTML = `<div class="panel"><div class="empty-state">Для этого пользователя не найдена карточка сотрудника.</div></div>`;
    return;
  }
  const salaries = await api.getEmployeeHistory(emp.employee_id);
  const totalAmount = salaries.reduce((s, r) => s + r.amount, 0);
  const totalTax = salaries.reduce((s, r) => s + r.tax, 0);
  const totalPaid = salaries.filter((r) => r.is_paid).reduce((s, r) => s + r.payout, 0);
  const latest = salaries[0];

  els.mainContent.innerHTML = `
    <div class="page-head">
      <div>
        <h1 class="page-title">${escapeHtml(emp.full_name)}</h1>
        <p class="page-subtitle">Должность: ${escapeHtml(emp.position_name)} · История начислений и удержаний НДФЛ</p>
      </div>
    </div>

    <section class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Всего начислено</span>
        <strong class="kpi-value">${money(totalAmount)}</strong>
        <span class="kpi-hint">Записей: ${salaries.length}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Удержано НДФЛ (13%)</span>
        <strong class="kpi-value">${money(totalTax)}</strong>
        <span class="kpi-hint">За весь период</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Выплачено на руки</span>
        <strong class="kpi-value">${money(totalPaid)}</strong>
        <span class="kpi-hint">Подтверждённые выплаты</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Последний месяц</span>
        <strong class="kpi-value">${latest ? money(latest.payout) : "—"}</strong>
        <span class="kpi-hint">${latest ? latest.month : "Начислений нет"}</span>
      </div>
    </section>

    <section class="panel">
      <div class="panel-toolbar">
        <h2 class="panel-title">История начислений</h2>
      </div>
      ${!salaries.length ? `<div class="empty-state">Начислений пока нет</div>` : `
        <div tabindex="0" role="region" aria-labelledby="emp-hist-cap" class="table-wrapper">
          <table>
            <caption id="emp-hist-cap">История начислений сотрудника</caption>
            <thead>
              <tr>
                <th>Месяц</th>
                <th>Начислено</th>
                <th>Налог 13%</th>
                <th>К выплате</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              ${salaries.map((s) => `
                <tr>
                  <th class="mono">${escapeHtml(s.month)}</th>
                  <td data-label="Начислено" class="num mono">${money(s.amount)}</td>
                  <td data-label="Налог 13%" class="num mono">${money(s.tax)}</td>
                  <td data-label="К выплате" class="num mono"><strong>${money(s.payout)}</strong></td>
                  <td data-label="Статус">
                    ${s.is_paid
                      ? `<span class="badge badge-paid">Выплачено</span>`
                      : `<span class="badge badge-pending">Ожидает выплаты</span>`}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `}
    </section>
  `;
}

// ===== Подтверждение удаления =====
function openConfirmDialog(title, description, onConfirm) {
  openDialog(title, `
    <p style="margin:0;color:var(--text-secondary)">${escapeHtml(description)}</p>
    <div class="dialog-actions">
      <button type="button" class="btn" id="confirm-cancel" autofocus>Отмена</button>
      <button type="button" class="btn btn-danger" id="confirm-ok">Удалить</button>
    </div>
  `, (root, close) => {
    root.querySelector("#confirm-cancel").addEventListener("click", close);
    root.querySelector("#confirm-ok").addEventListener("click", async () => {
      try {
        await onConfirm();
        close();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
}

// ===== Инициализация =====
if (!Object.hasOwn(HTMLElement.prototype, "popover")) {
  import("https://unpkg.com/@oddbird/popover-polyfill@latest/dist/popover.min.js");
}
initValidationHelpers();
initDialog();
initAuth();
initShellControls();

try {
  const savedUser = localStorage.getItem("sa_session");
  if (savedUser) {
    enterApp(JSON.parse(savedUser));
  }
} catch {
  // ignore corrupted session
}

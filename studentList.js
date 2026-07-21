"use strict";

const API_BASE = "/api/students";
const DEMO_DATA_URL = "./students.json";
const PROFILE_URL_BASE = "./studentProfile.html";
const ADD_STUDENT_URL = "./addStudent.html";

const DEMO_MODE = true;

const state = {
  all: [],
  filtered: [],
  currentPage: 1,
  pageSize: 10,
};

document.addEventListener("DOMContentLoaded", async () => {
  initSidebarToggle();
  initNavButtons();
  initFilters();
  initPagination();
  initRowNavigation();
  initThemeToggle();

  await loadStudents();
});

function initThemeToggle() {
  const toggleBtn = document.getElementById("themeToggleBtn");
  const icon = document.getElementById("themeIcon");
  const root = document.documentElement;

  const applyIcon = () => {
    const isDark = root.getAttribute("data-theme") === "dark";
    icon.className = isDark ? "fa-solid fa-moon" : "fa-solid fa-sun";
  };

  applyIcon();

  toggleBtn?.addEventListener("click", () => {
    const isDark = root.getAttribute("data-theme") === "dark";
    if (isDark) {
      root.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    } else {
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    }
    applyIcon();
  });
}

function initSidebarToggle() {
  const sidebar = document.getElementById("sidebar");
  const menuBtn = document.getElementById("menuBtn");
  menuBtn?.addEventListener("click", () =>
    sidebar?.classList.toggle("sidebar--open"),
  );
}

function initNavButtons() {
  document.getElementById("backBtn")?.addEventListener("click", () => {
    window.location.href = "/main"; // الصفحة الرئيسية
  });

  document.getElementById("goToAddBtn")?.addEventListener("click", () => {
    window.location.href = ADD_STUDENT_URL;
  });
}

async function loadStudents() {
  try {
    state.all = await fetchStudents();
    applyFilters();
  } catch (err) {
    showToast(err.message || "تعذر تحميل بيانات الطلاب", "error");
  }
}

/**
 * @returns {Promise<Array>}
 */
async function fetchStudents() {
  const url = DEMO_MODE ? DEMO_DATA_URL : API_BASE;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("تعذر تحميل بيانات الطلاب");
  }

  return response.json();
}

//  Filter
function initFilters() {
  const searchInput = document.getElementById("searchInput");
  const departmentSelect = document.getElementById("filterDepartment");
  const levelSelect = document.getElementById("filterLevel");
  const statusSelect = document.getElementById("filterStatus");
  const filterBtn = document.getElementById("filterBtn");

  let debounceTimer;
  searchInput?.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.currentPage = 1;
      applyFilters();
    }, 250);
  });

  [departmentSelect, levelSelect, statusSelect].forEach((select) => {
    select?.addEventListener("change", () => {
      state.currentPage = 1;
      applyFilters();
    });
  });

  filterBtn?.addEventListener("click", () => {
    state.currentPage = 1;
    applyFilters();
  });
}

function applyFilters() {
  const search = document
    .getElementById("searchInput")
    .value.trim()
    .toLowerCase();
  const department = document.getElementById("filterDepartment").value;
  const level = document.getElementById("filterLevel").value;
  const status = document.getElementById("filterStatus").value;

  state.filtered = state.all.filter((student) => {
    const matchesSearch =
      !search ||
      student.fullName.toLowerCase().includes(search) ||
      student.studentId.toLowerCase().includes(search);

    const matchesDepartment = !department || student.department === department;
    const matchesLevel = !level || String(student.level) === level;
    const matchesStatus = !status || student.status === status;

    return matchesSearch && matchesDepartment && matchesLevel && matchesStatus;
  });

  renderTable();
  renderPagination();
}

//  Table rendering
function renderTable() {
  const tbody = document.getElementById("tableBody");
  const emptyState = document.getElementById("tableEmpty");

  const start = (state.currentPage - 1) * state.pageSize;
  const pageItems = state.filtered.slice(start, start + state.pageSize);

  tbody.innerHTML = "";

  if (pageItems.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  pageItems.forEach((student, index) => {
    const row = document.createElement("tr");
    row.className = "row--clickable";
    row.dataset.id = student.id;
    row.tabIndex = 0;
    row.setAttribute("role", "link");
    row.setAttribute("aria-label", `عرض ملف الطالب ${student.fullName}`);

    row.innerHTML = `
      <td>${start + index + 1}</td>
      <td>${escapeHtml(student.studentId)}</td>
      <td><span class="student-link">${escapeHtml(student.fullName)}</span></td>
      <td>${escapeHtml(student.department)}</td>
      <td>${escapeHtml(String(student.level))}</td>
      <td>
        <span class="badge ${student.status === "active" ? "badge--active" : "badge--inactive"}">
          ${student.status === "active" ? "مُفعل" : "غير مُفعل"}
        </span>
      </td>
      <td>
        <div class="row-actions">
          <button class="icon-btn icon-btn--view" data-view-id="${student.id}" title="عرض الملف الشخصي" aria-label="عرض الملف الشخصي">
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function initRowNavigation() {
  const tableBody = document.getElementById("tableBody");

  tableBody.addEventListener("click", (e) => {
    const row = e.target.closest("tr[data-id]");
    if (!row) return;
    goToProfile(row.dataset.id);
  });

  tableBody.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const row = e.target.closest("tr[data-id]");
    if (!row) return;
    e.preventDefault();
    goToProfile(row.dataset.id);
  });
}

function goToProfile(studentId) {
  window.location.href = `${PROFILE_URL_BASE}?id=${encodeURIComponent(studentId)}`;
}

function initPagination() {
  document.getElementById("pageSizeSelect")?.addEventListener("change", (e) => {
    state.pageSize = Number(e.target.value);
    state.currentPage = 1;
    renderTable();
    renderPagination();
  });
}

function renderPagination() {
  const container = document.getElementById("paginationPages");
  const totalPages = Math.max(
    1,
    Math.ceil(state.filtered.length / state.pageSize),
  );

  if (state.currentPage > totalPages) state.currentPage = totalPages;

  container.innerHTML = "";
  container.appendChild(
    createPageButton("‹", state.currentPage - 1, state.currentPage === 1),
  );

  getPageNumbers(state.currentPage, totalPages).forEach((page) => {
    if (page === "...") {
      const dots = document.createElement("span");
      dots.className = "page-btn page-btn--dots";
      dots.textContent = "…";
      container.appendChild(dots);
    } else {
      container.appendChild(
        createPageButton(page, page, false, page === state.currentPage),
      );
    }
  });

  container.appendChild(
    createPageButton(
      "›",
      state.currentPage + 1,
      state.currentPage === totalPages,
    ),
  );
}

function createPageButton(label, targetPage, disabled, isActive) {
  const btn = document.createElement("button");
  btn.className = "page-btn" + (isActive ? " page-btn--active" : "");
  btn.textContent = label;
  btn.disabled = disabled;
  btn.addEventListener("click", () => {
    state.currentPage = targetPage;
    renderTable();
    renderPagination();
  });
  return btn;
}

function getPageNumbers(current, total) {
  const pages = [];
  const window = 1;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= window) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }
  return pages;
}

let toastTimeout;
function showToast(message, type = "default") {
  const toast = document.getElementById("toast");
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.className =
    "toast toast--visible" + (type === "error" ? " toast--error" : "");
  toastTimeout = setTimeout(
    () => toast.classList.remove("toast--visible"),
    3200,
  );
}

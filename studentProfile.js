"use strict";

const API_BASE = "/api/students";
const DEMO_DATA_URL = "./students.json";
const STUDENTS_LIST_URL = "./index.html";
const EDIT_STUDENT_URL_BASE = "./editStudent.html";

const DEMO_MODE = true;

const state = {
  studentPendingDeletion: null,
};

const FALLBACK_PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#e4e8f1"/><circle cx="50" cy="38" r="18" fill="#98a1b3"/><path d="M18 88c4-22 24-32 32-32s28 10 32 32" fill="#98a1b3"/></svg>',
  );

document.addEventListener("DOMContentLoaded", async () => {
  initThemeToggle();
  initNavButtons();
  initDeleteModal();
  await loadStudentProfile();
});

//  Theme toggle
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

//  Navigation
function initNavButtons() {
  document.getElementById("backBtn")?.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

//  Load + render profile
async function loadStudentProfile() {
  const studentId = getStudentIdFromUrl();

  if (!studentId) {
    showError("لم يتم تحديد الطالب المطلوب عرضه");
    return;
  }

  try {
    const student = await fetchStudentById(studentId);
    if (!student) {
      showError("لا يوجد طالب بهذا الرقم");
      return;
    }
    renderProfile(student);
  } catch (err) {
    showError(err.message || "تعذر تحميل بيانات الطالب");
  }
}

function getStudentIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

/**
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function fetchStudentById(id) {
  const url = DEMO_MODE ? DEMO_DATA_URL : `${API_BASE}/${id}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("تعذر تحميل بيانات الطالب");
  }

  const data = await response.json();

  if (DEMO_MODE) {
    return data.find((s) => String(s.id) === String(id)) || null;
  }
  return data;
}

function renderProfile(student) {
  document.getElementById("loadingState").hidden = true;
  state.student = student;

  document.getElementById("studentPhoto").src =
    student.photoUrl || FALLBACK_PHOTO;
  document.getElementById("studentPhoto").alt = student.fullName || "";
  document.getElementById("studentPhoto").onerror = () => {
    document.getElementById("studentPhoto").src = FALLBACK_PHOTO;
  };

  document.getElementById("studentName").textContent = student.fullName || "—";
  document.getElementById("studentIdText").textContent =
    student.studentId || "—";

  const badge = document.getElementById("statusBadge");
  const isActive = student.status === "active";
  badge.textContent = isActive ? "مُفعل" : "غير مُفعل";
  badge.className = "badge " + (isActive ? "badge--active" : "badge--inactive");

  setField("f_fullName", student.fullName);
  setField("f_nationalId", student.nationalId);
  setField("f_gender", genderLabel(student.gender));
  setField("f_birthDate", student.birthDate);
  setField("f_address", student.address);

  setField("f_studentId", student.studentId);
  setField("f_department", departmentLabel(student.department));
  setField("f_level", student.level ? `المستوى ${student.level}` : null);
  setField("f_academicYear", student.academicYear);
  setField("f_enrollmentDate", student.enrollmentDate);

  setField("f_email", student.email);
  setField("f_phone", student.phone);
  setField("f_guardianPhone", student.guardianPhone);

  document.getElementById("editBtn")?.addEventListener("click", () => {
    window.location.href = `${EDIT_STUDENT_URL_BASE}?id=${encodeURIComponent(student.id)}`;
  });

  document.getElementById("deleteBtn")?.addEventListener("click", () => {
    openDeleteModal(student);
  });

  document.getElementById("profileCard").hidden = false;
}

function setField(elementId, value) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = value || "—";
}

function genderLabel(gender) {
  if (gender === "male") return "ذكر";
  if (gender === "female") return "أنثى";
  return null;
}

function departmentLabel(department) {
  const map = {
    "Computer Science": "علوم الحاسب",
    "Information Systems": "نظم المعلومات",
    "Software Engineering": "هندسة البرمجيات",
    "Information Technology": "تكنولوجيا المعلومات",
  };
  return map[department] || department;
}

function showError(message) {
  document.getElementById("loadingState").hidden = true;
  document.getElementById("errorMessage").textContent = message;
  document.getElementById("errorState").hidden = false;
}

// ============ Delete confirmation modal ============
function initDeleteModal() {
  const overlay = document.getElementById("deleteOverlay");
  const closeBtn = document.getElementById("deleteModalClose");
  const cancelBtn = document.getElementById("cancelDeleteBtn");
  const confirmBtn = document.getElementById("confirmDeleteBtn");

  const close = () => {
    overlay.hidden = true;
    state.studentPendingDeletion = null;
  };

  closeBtn.addEventListener("click", close);
  cancelBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) close();
  });

  confirmBtn.addEventListener("click", async () => {
    const student = state.studentPendingDeletion;
    if (!student) return;

    const originalHtml = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحذف...';

    try {
      await deleteStudentRequest(student.id);
      close();
      showToast(
        `تم حذف الطالب "${student.fullName}" نهائيًا من قاعدة البيانات`,
        "success",
      );
      setTimeout(() => {
        window.location.href = STUDENTS_LIST_URL;
      }, 1200);
    } catch (err) {
      showToast(err.message || "تعذر حذف الطالب، حاول مرة أخرى", "error");
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = originalHtml;
    }
  });
}

function openDeleteModal(student) {
  state.studentPendingDeletion = student;
  document.getElementById("deleteStudentName").textContent = student.fullName;
  document.getElementById("deleteOverlay").hidden = false;
}

/**
 * بيبعت طلب حذف الطالب فعليًا.
 * @param {number|string} id
 */
async function deleteStudentRequest(id) {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return;
  }

  const response = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });

  if (!response.ok) {
    let message = "تعذر حذف الطالب";
    try {
      const body = await response.json();
      message = body.message || message;
    } catch (_) {}
    throw new Error(message);
  }
}

// ============ Toast ============
let toastTimeout;
function showToast(message, type = "default") {
  const toast = document.getElementById("toast");
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.className =
    "toast toast--visible" +
    (type === "error"
      ? " toast--error"
      : type === "success"
        ? " toast--success"
        : "");
  toastTimeout = setTimeout(
    () => toast.classList.remove("toast--visible"),
    3200,
  );
}

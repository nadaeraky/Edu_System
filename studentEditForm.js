"use strict";

const API_BASE = "/api/students";
const EDIT_REQUESTS_API = "/api/edit-requests";
const DEMO_DATA_URL = "./students.json";
const DEMO_REQUESTS_URL = "./editRequests.json";
const PROFILE_URL_BASE = "./studentProfile.html";

const DEMO_MODE = true;

const FALLBACK_PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#e4e8f1"/><circle cx="50" cy="38" r="18" fill="#98a1b3"/><path d="M18 88c4-22 24-32 32-32s28 10 32 32" fill="#98a1b3"/></svg>',
  );

const GOVERNORATES = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "الدقهلية",
  "البحر الأحمر",
  "البحيرة",
  "الفيوم",
  "الغربية",
  "الإسماعيلية",
  "المنوفية",
  "المنيا",
  "القليوبية",
  "الوادي الجديد",
  "السويس",
  "أسوان",
  "أسيوط",
  "بني سويف",
  "بورسعيد",
  "دمياط",
  "الشرقية",
  "جنوب سيناء",
  "كفر الشيخ",
  "مطروح",
  "الأقصر",
  "قنا",
  "شمال سيناء",
  "سوهاج",
];

const DEPARTMENTS = {
  "Computer Science": "علوم الحاسب",
  "Information Systems": "نظم المعلومات",
  "Software Engineering": "هندسة البرمجيات",
  "Information Technology": "تكنولوجيا المعلومات",
};

const FIELD_DEFS = [
  //  البيانات الشخصية (محتاجة موافقة الإدارة)
  {
    key: "fullName",
    label: "اسم الطالب رباعي (عربي)",
    section: "personal",
    type: "text",
    editable: false,
  },
  {
    key: "nationalId",
    label: "الرقم القومي",
    section: "personal",
    type: "text",
    editable: false,
  },
  {
    key: "gender",
    label: "النوع",
    section: "personal",
    type: "select",
    editable: false,
    options: [
      { value: "male", label: "ذكر" },
      { value: "female", label: "أنثى" },
    ],
  },
  {
    key: "birthDate",
    label: "تاريخ الميلاد",
    section: "personal",
    type: "date",
    editable: false,
  },
  {
    key: "governorate",
    label: "المحافظة",
    section: "personal",
    type: "select",
    editable: false,
    options: GOVERNORATES.map((g) => ({ value: g, label: g })),
  },
  {
    key: "address",
    label: "العنوان بالتفصيل",
    section: "personal",
    type: "text",
    editable: true,
  },

  //  البيانات الأكاديمية (قابلة للتعديل)
  {
    key: "studentId",
    label: "الرقم الجامعي",
    section: "academic",
    type: "text",
    editable: true,
  },
  {
    key: "department",
    label: "القسم",
    section: "academic",
    type: "select",
    editable: true,
    options: Object.entries(DEPARTMENTS).map(([value, label]) => ({
      value,
      label,
    })),
  },
  {
    key: "level",
    label: "المستوى",
    section: "academic",
    type: "select",
    editable: true,
    options: [1, 2, 3, 4].map((l) => ({
      value: String(l),
      label: `المستوى ${l}`,
    })),
  },
  {
    key: "academicYear",
    label: "العام الدراسي",
    section: "academic",
    type: "text",
    editable: true,
  },
  {
    key: "enrollmentDate",
    label: "تاريخ الالتحاق",
    section: "academic",
    type: "date",
    editable: true,
  },
  {
    key: "status",
    label: "الحالة",
    section: "academic",
    type: "select",
    editable: true,
    options: [
      { value: "active", label: "مُفعل" },
      { value: "inactive", label: "غير مُفعل" },
    ],
  },

  //  بيانات التواصل (محتاجة موافقة الإدارة إلا هاتف ولي الأمر)
  {
    key: "phone",
    label: "رقم الهاتف",
    section: "contact",
    type: "tel",
    editable: false,
  },
  {
    key: "email",
    label: "البريد الإلكتروني",
    section: "contact",
    type: "email",
    editable: false,
  },
  {
    key: "guardianPhone",
    label: "هاتف ولي الأمر",
    section: "contact",
    type: "tel",
    editable: true,
  },
];

const state = {
  studentId: null,
  student: null,
  requests: {}, // { fieldKey: { status: 'pending' | 'approved', reason } }
  pendingRequestField: null,
};

document.addEventListener("DOMContentLoaded", async () => {
  initThemeToggle();
  initNavButtons();
  initRequestModal();
  initFormSubmit();
  await loadEditForm();
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
  document.getElementById("backBtn")?.addEventListener("click", goToProfile);
  document.getElementById("cancelBtn")?.addEventListener("click", goToProfile);
  document
    .getElementById("breadcrumbProfileLink")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      goToProfile();
    });
}

function goToProfile() {
  window.location.href = `${PROFILE_URL_BASE}?id=${encodeURIComponent(state.studentId)}`;
}

function getStudentIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

//  Load data + requests, then render
async function loadEditForm() {
  state.studentId = getStudentIdFromUrl();

  if (!state.studentId) {
    showError("لم يتم تحديد الطالب المطلوب تعديله");
    return;
  }

  try {
    const [student, requests] = await Promise.all([
      fetchStudentById(state.studentId),
      fetchEditRequests(state.studentId),
    ]);

    if (!student) {
      showError("لا يوجد طالب بهذا الرقم");
      return;
    }

    state.student = student;
    state.requests = requests;
    renderForm();
  } catch (err) {
    showError(err.message || "تعذر تحميل بيانات الطالب");
  }
}

async function fetchStudentById(id) {
  const url = DEMO_MODE ? DEMO_DATA_URL : `${API_BASE}/${id}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("تعذر تحميل بيانات الطالب");
  const data = await response.json();
  return DEMO_MODE
    ? data.find((s) => String(s.id) === String(id)) || null
    : data;
}

async function fetchEditRequests(studentId) {
  const url = DEMO_MODE
    ? DEMO_REQUESTS_URL
    : `${EDIT_REQUESTS_API}?studentId=${encodeURIComponent(studentId)}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("تعذر تحميل حالة طلبات التعديل");
  const list = await response.json();

  const relevant = DEMO_MODE
    ? list.filter((r) => String(r.studentId) === String(studentId))
    : list;

  const map = {};
  relevant.forEach((r) => {
    map[r.field] = { status: r.status, reason: r.reason };
  });
  return map;
}

//  Rendering
function renderForm() {
  document.getElementById("loadingState").hidden = true;

  const student = state.student;
  document.getElementById("studentPhoto").src =
    student.photoUrl || FALLBACK_PHOTO;
  document.getElementById("studentPhoto").onerror = () => {
    document.getElementById("studentPhoto").src = FALLBACK_PHOTO;
  };
  document.getElementById("studentName").textContent = student.fullName || "—";
  document.getElementById("studentIdText").textContent =
    student.studentId || "—";

  document
    .getElementById("photoRequestBtn")
    .addEventListener("click", () =>
      openRequestModal("photoUrl", "الصورة الشخصية"),
    );

  ["personal", "academic", "contact"].forEach((section) => {
    const container = document.getElementById(`section-${section}`);
    container.innerHTML = "";
    FIELD_DEFS.filter((f) => f.section === section).forEach((def) => {
      container.appendChild(renderField(def));
    });
  });

  document.getElementById("infoNotice").hidden = false;
  document.getElementById("editForm").hidden = false;
}

function renderField(def) {
  const requestInfo = state.requests[def.key];
  const isApproved = requestInfo?.status === "approved";
  const isPending = requestInfo?.status === "pending";
  const isUnlocked = def.editable || isApproved;

  const wrap = document.createElement("div");
  wrap.className = "field";

  const label = document.createElement("div");
  label.className = "field__label";
  label.innerHTML = isUnlocked
    ? escapeHtml(def.label)
    : `<i class="fa-solid fa-lock"></i> ${escapeHtml(def.label)}`;
  wrap.appendChild(label);

  const row = document.createElement("div");
  row.className = "field__input-row";

  const input = buildInputElement(def, isUnlocked);
  row.appendChild(input);

  if (!def.editable) {
    const reqBtn = document.createElement("button");
    reqBtn.type = "button";
    reqBtn.className = "request-btn";
    reqBtn.title = isUnlocked ? "تمت الموافقة على التعديل" : "طلب تعديل";
    reqBtn.innerHTML = isUnlocked
      ? '<i class="fa-solid fa-check"></i>'
      : '<i class="fa-solid fa-paper-plane"></i>';
    reqBtn.disabled = isUnlocked || isPending;
    reqBtn.addEventListener("click", () =>
      openRequestModal(def.key, def.label),
    );
    row.appendChild(reqBtn);
  }

  wrap.appendChild(row);

  if (isPending) {
    const status = document.createElement("div");
    status.className = "field-status field-status--pending";
    status.innerHTML =
      '<i class="fa-solid fa-hourglass-half"></i> بانتظار موافقة الإدارة';
    wrap.appendChild(status);
    if (DEMO_MODE) {
      const demoBtn = document.createElement("button");
      demoBtn.type = "button";
      demoBtn.className = "demo-approve-link";
      demoBtn.textContent = "(تجريبي) اعتبار الطلب مقبول من الإدارة";
      demoBtn.addEventListener("click", () => approveDemoRequest(def.key));
      wrap.appendChild(demoBtn);
    }
  } else if (isApproved) {
    const status = document.createElement("div");
    status.className = "field-status field-status--approved";
    status.innerHTML =
      '<i class="fa-solid fa-check"></i> تمت الموافقة، يمكن التعديل الآن';
    wrap.appendChild(status);
  }

  return wrap;
}

function buildInputElement(def, isUnlocked) {
  let el;
  if (def.type === "select") {
    el = document.createElement("select");
    (def.options || []).forEach((opt) => {
      const optionEl = document.createElement("option");
      optionEl.value = opt.value;
      optionEl.textContent = opt.label;
      el.appendChild(optionEl);
    });
    el.value = String(state.student[def.key] ?? "");
  } else {
    el = document.createElement("input");
    el.type = def.type;
    el.value = state.student[def.key] ?? "";
  }
  el.id = `field_${def.key}`;
  el.name = def.key;
  el.disabled = !isUnlocked;
  return el;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showError(message) {
  document.getElementById("loadingState").hidden = true;
  document.getElementById("errorMessage").textContent = message;
  document.getElementById("errorState").hidden = false;
}

//  Request-to-edit modal 
function initRequestModal() {
  const overlay = document.getElementById("requestOverlay");
  const close = () => {
    overlay.hidden = true;
    state.pendingRequestField = null;
    document.getElementById("requestReason").value = "";
  };

  document.getElementById("requestModalClose").addEventListener("click", close);
  document.getElementById("cancelRequestBtn").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) close();
  });

  document
    .getElementById("submitRequestBtn")
    .addEventListener("click", async () => {
      const field = state.pendingRequestField;
      if (!field) return;

      const reason = document.getElementById("requestReason").value.trim();
      const submitBtn = document.getElementById("submitRequestBtn");
      submitBtn.disabled = true;

      try {
        await submitEditRequest(
          state.studentId,
          field.key,
          field.label,
          reason,
        );
        state.requests[field.key] = { status: "pending", reason };
        close();
        renderForm();
        showToast("تم إرسال طلب التعديل للإدارة بنجاح");
      } catch (err) {
        showToast(err.message || "تعذر إرسال طلب التعديل", "error");
      } finally {
        submitBtn.disabled = false;
      }
    });
}

function openRequestModal(fieldKey, fieldLabel) {
  state.pendingRequestField = { key: fieldKey, label: fieldLabel };
  document.getElementById("requestFieldLabel").value = fieldLabel;
  document.getElementById("requestOverlay").hidden = false;
}

async function submitEditRequest(studentId, field, fieldLabel, reason) {
  const payload = { studentId, field, fieldLabel, reason };

  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return payload;
  }

  const response = await fetch(EDIT_REQUESTS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error("تعذر إرسال طلب التعديل");
  return response.json();
}

function approveDemoRequest(field) {
  state.requests[field] = { status: "approved" };
  renderForm();
  showToast("تمت الموافقة على الحقل (محاكاة تجريبية)");
}

//  Save form 
function initFormSubmit() {
  document.getElementById("editForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {};
    FIELD_DEFS.forEach((def) => {
      const el = document.getElementById(`field_${def.key}`);
      if (el && !el.disabled) payload[def.key] = el.value;
    });

    const saveBtn = document.getElementById("saveBtn");
    const originalHtml = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';

    try {
      await saveStudentChanges(state.studentId, payload);
      showToast("تم حفظ التعديلات بنجاح", "success");
    } catch (err) {
      showToast(err.message || "تعذر حفظ التعديلات", "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalHtml;
    }
  });
}

async function saveStudentChanges(studentId, payload) {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return;
  }

  const response = await fetch(`${API_BASE}/${studentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error("تعذر حفظ التعديلات");
}

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

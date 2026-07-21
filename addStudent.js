"use strict";

const API_ENDPOINT = "http://localhost:3000/api/students";

const DEMO_MODE = false;

document.addEventListener("DOMContentLoaded", () => {
  initSidebarToggle();
  initThemeToggle();
  initConditionalFields();
  initWizard();
});

function initThemeToggle() {
  const toggleBtn = document.getElementById("themeToggleBtn");
  const icon = document.getElementById("themeIcon");
  const root = document.documentElement;

  const applyIcon = () => {
    const isDark = root.getAttribute("data-theme") === "dark";
    icon.className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
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

// Sidebar toggle (mobile)
function initSidebarToggle() {
  const sidebar = document.getElementById("sidebar");
  const menuBtn = document.getElementById("menuBtn");

  menuBtn?.addEventListener("click", () => {
    sidebar?.classList.toggle("sidebar--open");
  });
}

function initConditionalFields() {
  const idType = document.getElementById("idType");
  const idNumberField = document.getElementById("idNumberField");
  const idNumberLabel = document.getElementById("idNumberLabel");
  const idNumberInput = document.getElementById("idNumber");

  idType?.addEventListener("change", () => {
    const value = idType.value;
    if (!value) {
      idNumberField.hidden = true;
      return;
    }
    idNumberField.hidden = false;
    if (value === "national") {
      idNumberLabel.textContent = "رقم قومي";
      idNumberInput.placeholder = "أدخل الرقم القومي (14 رقم)";
      idNumberInput.maxLength = 14;
    } else {
      idNumberLabel.textContent = "رقم جواز السفر";
      idNumberInput.placeholder = "أدخل رقم جواز السفر";
      idNumberInput.removeAttribute("maxlength");
    }
    idNumberInput.value = "";
    clearFieldError(idNumberInput);
  });

  const isFatherDeceased = document.getElementById("isFatherDeceased");
  const guardianSection = document.getElementById("guardianSection");

  isFatherDeceased?.addEventListener("change", () => {
    guardianSection.hidden = !isFatherDeceased.checked;
    if (!isFatherDeceased.checked) {
      guardianSection.querySelectorAll("input, select").forEach((el) => {
        el.value = "";
        clearFieldError(el);
      });
    }
  });
}

const TOTAL_STEPS = 3;
let currentStep = 1;

function clearAllFieldErrors(form) {
  form?.querySelectorAll(".field--invalid").forEach((fieldWrapper) => {
    fieldWrapper.classList.remove("field--invalid");
    const errorEl = fieldWrapper.querySelector(".field__error");
    if (errorEl) errorEl.textContent = "";
  });
}

function getFieldByErrorPath(form, errorPath) {
  if (!form || !errorPath) return null;

  const fieldName = errorPath.split(".").pop();
  return form.elements[fieldName] || null;
}

function showServerErrors(form, errors) {
  if (!errors || typeof errors !== "object") return;

  Object.entries(errors).forEach(([fieldPath, message]) => {
    const field = getFieldByErrorPath(form, fieldPath);
    if (!field) return;

    const wrapper = field.closest(".field");
    const errorEl = wrapper?.querySelector(".field__error");

    wrapper?.classList.add("field--invalid");
    if (errorEl) errorEl.textContent = message;
  });
}

function initWizard() {
  const form = document.getElementById("studentForm");
  const continueBtn = document.getElementById("continueBtn");
  const backStepBtn = document.getElementById("backStepBtn");
  const saveBtn = document.getElementById("saveBtn");

  if (!form) return;

  form.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", () => clearFieldError(el));
    el.addEventListener("change", () => clearFieldError(el));
  });

  goToStep(1);

  continueBtn?.addEventListener("click", () => {
    const currentStepFields = getVisibleFieldsForStep(form, currentStep);
    const isValid = validateCurrentStepFields(form, currentStepFields);

    if (isValid && currentStep < TOTAL_STEPS) {
      goToStep(currentStep + 1);
      return;
    }

    if (!isValid) {
      showToast("يرجى إكمال جميع الحقول في هذه الصفحة أولًا", "error");
    }
  });

  backStepBtn?.addEventListener("click", () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearAllFieldErrors(form);

    const payload = collectPayload(form);

    setLoading(saveBtn, true);

    try {
      const result = await submitStudent(payload);
      OfficialForm.setPayload(result?.data || result || payload);

      showSuccessModal();
      form.reset();
      resetConditionalFields();
      goToStep(1);
      showToast("Student created successfully.", "success");
    } catch (err) {
      if (err?.serverErrors && typeof err.serverErrors === "object") {
        showServerErrors(form, err.serverErrors);
        showToast("يرجى تصحيح الأخطاء في الحقول المميزة", "error");
      } else {
        showToast(err.message || "Failed to save student.", "error");
      }
    } finally {
      setLoading(saveBtn, false);
    }
  });

  initSuccessModal();
}

// popUP
function initSuccessModal() {
  const overlay = document.getElementById("successModal");
  const closeBtn = document.getElementById("successModalCloseBtn");

  closeBtn?.addEventListener("click", hideSuccessModal);
  overlay?.addEventListener("click", (event) => {
    if (event.target === overlay) hideSuccessModal();
  });
}

function showSuccessModal() {
  const overlay = document.getElementById("successModal");
  if (!overlay) return;
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add("modal-overlay--visible"));
}

function hideSuccessModal() {
  const overlay = document.getElementById("successModal");
  if (!overlay) return;
  overlay.classList.remove("modal-overlay--visible");
  setTimeout(() => {
    overlay.hidden = true;
  }, 200);
}

function resetConditionalFields() {
  const idNumberField = document.getElementById("idNumberField");
  if (idNumberField) idNumberField.hidden = true;
  const guardianSection = document.getElementById("guardianSection");
  if (guardianSection) guardianSection.hidden = true;
}

function goToStep(step) {
  currentStep = step;

  document.querySelectorAll(".wizard-step").forEach((section) => {
    section.classList.toggle(
      "wizard-step--active",
      Number(section.dataset.step) === step,
    );
  });

  document.querySelectorAll("[data-step-indicator]").forEach((item) => {
    const itemStep = Number(item.dataset.stepIndicator);
    item.classList.toggle("wizard-steps__item--active", itemStep === step);
    item.classList.toggle("wizard-steps__item--done", itemStep < step);
  });

  const continueBtn = document.getElementById("continueBtn");
  const backStepBtn = document.getElementById("backStepBtn");

  if (continueBtn) continueBtn.hidden = step === TOTAL_STEPS;
  if (backStepBtn) backStepBtn.hidden = step === 1;

  document
    .querySelector(".page")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getVisibleFieldsForStep(form, step) {
  const fields = [];
  const stepMap = {
    1: ["arabFullName", "phone", "governorate", "gender", "dob", "idType", "idNumber"],
    2: ["englishFullName", "address", "country", "maritalStatus", "religion", "cardIssuePlace", "dataEntryDate", "oneChanceStudent", "studyType", "qualification", "qualificationYear", "schoolName", "total", "seatNumber", "enrollmentStatus", "enrollmentType", "coordinationNumber"],
    3: ["fatherName", "motherName", "fatherJob", "motherJob", "fatherWorkplace", "motherWorkplace", "fatherPhone", "motherPhone", "isFatherDeceased", "guardianName", "guardianRelation", "guardianWorkplace", "guardianPhone", "guardianAddress"],
  };

  const names = stepMap[step] || [];
  names.forEach((name) => {
    const field = form.elements[name];
    if (!field) return;

    const wrapper = field.closest(".field");
    if (wrapper && wrapper.hidden) return;
    if (wrapper && wrapper.closest("[hidden]")) return;

    fields.push(field);
  });

  return fields;
}

function validateCurrentStepFields(form, fields) {
  let hasErrors = false;

  fields.forEach((field) => {
    if (!field) return;

    const value = (field.value || "").toString().trim();
    const fieldName = field.name || field.id;

    if (fieldName === "arabFullName" && value.split(/\s+/).filter(Boolean).length < 4) {
      showFieldError(field, "الاسم العربي يجب أن يكون رباعي");
      hasErrors = true;
      return;
    }

    if (fieldName === "englishFullName" && value.split(/\s+/).filter(Boolean).length < 4) {
      showFieldError(field, "الاسم الإنجليزي يجب أن يكون رباعي");
      hasErrors = true;
      return;
    }

    if ((fieldName === "phone" || fieldName === "fatherPhone" || fieldName === "motherPhone") && !/^01[0125][0-9]{8}$/.test(value)) {
      showFieldError(field, "رقم الهاتف غير صحيح");
      hasErrors = true;
      return;
    }

    if (fieldName === "idNumber") {
      const idType = form.elements["idType"]?.value;
      if (idType === "national" && !/^\d{14}$/.test(value)) {
        showFieldError(field, "الرقم القومي يجب أن يكون 14 رقم");
        hasErrors = true;
      } else if (idType === "passport" && value.length < 4) {
        showFieldError(field, "رقم جواز السفر غير صحيح");
        hasErrors = true;
      }
      return;
    }

    if ((fieldName === "governorate" || fieldName === "gender" || fieldName === "dob" || fieldName === "idType" || fieldName === "address" || fieldName === "country" || fieldName === "maritalStatus" || fieldName === "religion" || fieldName === "cardIssuePlace" || fieldName === "dataEntryDate" || fieldName === "oneChanceStudent" || fieldName === "studyType" || fieldName === "qualification" || fieldName === "qualificationYear" || fieldName === "schoolName" || fieldName === "total" || fieldName === "seatNumber" || fieldName === "enrollmentStatus" || fieldName === "enrollmentType" || fieldName === "coordinationNumber" || fieldName === "fatherName" || fieldName === "motherName" || fieldName === "fatherJob" || fieldName === "motherJob" || fieldName === "fatherWorkplace" || fieldName === "motherWorkplace" || fieldName === "fatherPhone" || fieldName === "motherPhone") && !value) {
      showFieldError(field, "هذا الحقل مطلوب");
      hasErrors = true;
      return;
    }

    if (fieldName === "guardianName" && form.elements["isFatherDeceased"]?.checked && !value) {
      showFieldError(field, "اسم ولي الأمر مطلوب");
      hasErrors = true;
      return;
    }

    if (fieldName === "guardianRelation" && form.elements["isFatherDeceased"]?.checked && !value) {
      showFieldError(field, "درجة القرابة مطلوبة");
      hasErrors = true;
      return;
    }

    if (fieldName === "guardianWorkplace" && form.elements["isFatherDeceased"]?.checked && !value) {
      showFieldError(field, "جهة عمل ولي الأمر مطلوبة");
      hasErrors = true;
      return;
    }

    if (fieldName === "guardianPhone" && form.elements["isFatherDeceased"]?.checked && !/^01[0125][0-9]{8}$/.test(value)) {
      showFieldError(field, "هاتف ولي الأمر غير صحيح");
      hasErrors = true;
      return;
    }

    if (fieldName === "guardianAddress" && form.elements["isFatherDeceased"]?.checked && !value) {
      showFieldError(field, "عنوان ولي الأمر مطلوب");
      hasErrors = true;
      return;
    }

    clearFieldError(field);
  });

  return !hasErrors;
}

function showFieldError(field, message) {
  const wrapper = field.closest(".field");
  const errorEl = wrapper?.querySelector(".field__error");

  wrapper?.classList.add("field--invalid");
  if (errorEl) errorEl.textContent = message;
}

function collectPayload(form) {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  return {
    personalInfo: {
      arabFullName: data.arabFullName,
      englishFullName: data.englishFullName,
      phone: data.phone,
      governorate: data.governorate,
      gender: data.gender,
      dob: data.dob,
      idType: data.idType,
      idNumber: data.idNumber,
      address: data.address,
      country: data.country,
      maritalStatus: data.maritalStatus,
      religion: data.religion,
      cardIssuePlace: data.cardIssuePlace,
      dataEntryDate: data.dataEntryDate,
    },

    academicInfo: {
      oneChanceStudent: data.oneChanceStudent,
      studyType: data.studyType,
      enrollmentStatus: data.enrollmentStatus,
      enrollmentType: data.enrollmentType,
      coordinationNumber: data.coordinationNumber,
    },

    qualification: {
      qualification: data.qualification,
      qualificationYear: Number(data.qualificationYear),
      schoolName: data.schoolName,
      total: Number(data.total),
      seatNumber: data.seatNumber,
    },

    familyInfo: {
      fatherName: data.fatherName,
      motherName: data.motherName,
      fatherJob: data.fatherJob,
      motherJob: data.motherJob,
      fatherWorkplace: data.fatherWorkplace,
      motherWorkplace: data.motherWorkplace,
      fatherPhone: data.fatherPhone,
      motherPhone: data.motherPhone,
      isFatherDeceased: form.elements["isFatherDeceased"].checked,

      guardian: {
        guardianName: data.guardianName || "",
        guardianRelation: data.guardianRelation || "",
        guardianWorkplace: data.guardianWorkplace || "",
        guardianPhone: data.guardianPhone || "",
        guardianAddress: data.guardianAddress || "",
      },
    },
  };
}

function clearFieldError(field) {
  const wrapper = field.closest(".field");
  const errorEl = wrapper?.querySelector(".field__error");

  wrapper?.classList.remove("field--invalid");
  if (errorEl) errorEl.textContent = "";
}

function setLoading(button, isLoading) {
  if (!button) return;
  button.disabled = isLoading;
  const label = button.querySelector(".btn__label");
  if (label) label.textContent = isLoading ? "جاري الحفظ..." : "إرسال";
}

/*  Backend integration point  */

/**
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
async function submitStudent(payload) {

  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let result = {};
  try {
    result = await response.json();
  } catch (_) {}

  if (!response.ok) {
    const error = new Error(result.message || "Failed to create student.");
    error.serverErrors = result.errors || {};
    throw error;
  }

  return result;
}

/*  Toast notifications  */
let toastTimeout;

function showToast(message, type = "default") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.className = "toast toast--visible";
  if (type === "success") toast.classList.add("toast--success");
  if (type === "error") toast.classList.add("toast--error");

  toastTimeout = setTimeout(() => {
    toast.classList.remove("toast--visible");
  }, 3200);
}

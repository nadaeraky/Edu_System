"use strict";
const OfficialForm = (() => {
  let lastSubmittedPayload = null;

  const LABELS = {
    gender: { male: "ذكر", female: "أنثى" },
    maritalStatus: { single: "أعزب", married: "متزوج" },
    religion: { muslim: "مسلم", christian: "مسيحي", other: "أخرى" },
    idType: { national: "رقم قومي", passport: "رقم جواز السفر" },
    qualification: {
      high_school: "ثانوية عامة",
      diploma: "دبلوم",
      other: "أخرى",
    },
  };

  function labelFor(field, value) {
    if (!value) return "—";
    return LABELS[field]?.[value] || value;
  }

  function setField(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value && String(value).trim() ? value : "—";
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  function fill(payload) {
    if (!payload) return;

    setField("of-arabName", payload.arabFullName);
    setField("of-engName", payload.englishFullName);
    setField("of-address", payload.address);
    setField("of-gov", payload.governorate);
    setField("of-dob", formatDate(payload.dob));
    setField("of-country", payload.country);
    setField("of-religion", labelFor("religion", payload.religion));
    setField("of-gender", labelFor("gender", payload.gender));
    setField("of-marital", labelFor("maritalStatus", payload.maritalStatus));
    setField("of-phone", payload.phone);

    const idLabelEl = document.getElementById("of-idLabel");
    if (idLabelEl) {
      idLabelEl.textContent =
        payload.idType === "passport" ? "رقم جواز السفر" : "الرقم القومي";
    }
    setField("of-idNumber", payload.idNumber);
    setField("of-idType", labelFor("idType", payload.idType));
    setField("of-cardIssuePlace", payload.cardIssuePlace);

    const isFatherDeceased =
      payload.isFatherDeceased === true || payload.isFatherDeceased === "true";

    const guardianTitleEl = document.getElementById("of-guardianSectionTitle");
    if (guardianTitleEl) {
      guardianTitleEl.textContent = isFatherDeceased
        ? "بيانات ولي الأمر"
        : "بيانات ولي الأمر (الأب)";
    }

    if (isFatherDeceased) {
      setField("of-guardianName", payload.guardianName);
      setField("of-guardianRelation", payload.guardianRelation);
      setField("of-guardianWorkplace", payload.guardianWorkplace);
      setField("of-guardianPhone", payload.guardianPhone);
    } else {
      setField("of-guardianName", payload.fatherName);
      setField("of-guardianRelation", "الأب");
      setField("of-guardianWorkplace", payload.fatherWorkplace);
      setField("of-guardianPhone", payload.fatherPhone);
    }

    setField("of-motherName", payload.motherName);
    setField("of-motherJob", payload.motherJob);

    setField("of-qualification", labelFor("qualification", payload.qualification));
    setField("of-qualificationYear", payload.qualificationYear);
    setField("of-seatNumber", payload.seatNumber);
    setField("of-total", payload.total);
    setField("of-schoolName", payload.schoolName);

    const declarationNameEl = document.getElementById("of-declarationName");
    if (declarationNameEl) {
      declarationNameEl.textContent = payload.arabFullName
        ? `/ ${payload.arabFullName}`
        : "أعلاه";
    }

    const signatureNameEl = document.getElementById("of-signatureName");
    if (signatureNameEl) {
      signatureNameEl.textContent = payload.arabFullName || "—";
    }
  }

  function hideSuccessModal() {
    const overlay = document.getElementById("successModal");
    if (!overlay) return;
    overlay.classList.remove("modal-overlay--visible");
    setTimeout(() => {
      overlay.hidden = true;
    }, 200);
  }

  function show() {
    const overlay = document.getElementById("officialFormModal");
    if (!overlay) return;
    overlay.hidden = false;
    requestAnimationFrame(() =>
      overlay.classList.add("modal-overlay--visible"),
    );
  }

  function hide() {
    const overlay = document.getElementById("officialFormModal");
    if (!overlay) return;
    overlay.classList.remove("modal-overlay--visible");
    setTimeout(() => {
      overlay.hidden = true;
    }, 200);
  }

  function print() {
    const printArea = document.getElementById("officialFormPrintArea");
    if (!printArea) return;

    const printWindow = window.open("", "_blank", "width=900,height=1000");
    if (!printWindow) {
      const toast = document.getElementById("toast");
      if (toast) {
        toast.textContent = "يرجى السماح بالنوافذ المنبثقة لطباعة الاستمارة";
        toast.className = "toast toast--visible toast--error";
        setTimeout(() => toast.classList.remove("toast--visible"), 3200);
      }
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <title>استمارة بيانات الطالب</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="./style.css" />
    <style>
      body {
        margin: 0;
        padding: 24px;
        background: #fff;
      }
      .official-form {
        overflow: visible !important;
        max-height: none !important;
        padding: 0 !important;
      }
    </style>
  </head>
  <body>
    ${printArea.outerHTML}
  </body>
</html>`);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };
  }

  function init() {
    const overlay = document.getElementById("officialFormModal");
    const viewBtn = document.getElementById("viewOfficialFormBtn");
    const closeBtn = document.getElementById("officialFormCloseBtn");
    const printBtn = document.getElementById("officialFormPrintBtn");

    viewBtn?.addEventListener("click", () => {
      if (!lastSubmittedPayload) return;
      fill(lastSubmittedPayload);
      hideSuccessModal();
      show();
    });

    closeBtn?.addEventListener("click", hide);
    overlay?.addEventListener("click", (event) => {
      if (event.target === overlay) hide();
    });

    printBtn?.addEventListener("click", print);
  }

  document.addEventListener("DOMContentLoaded", init);

  return {
    setPayload(payload) {
      lastSubmittedPayload = payload;
    },
  };
})();

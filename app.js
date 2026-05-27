const starterData = {
  users: [
    {
      id: "admin-1",
      name: "Admin",
      email: "admin@team.local",
      password: "admin123",
      role: "admin",
      position: "Schulungsleitung",
      courseIds: []
    },
    {
      id: "user-1",
      name: "Anna Beispiel",
      email: "anna@team.local",
      password: "lernen123",
      role: "learner",
      position: "Customer Success",
      courseIds: ["course-onboarding", "course-privacy"],
      progress: {
        "course-onboarding": 65,
        "course-privacy": 30
      }
    }
  ],
  courses: [
    {
      id: "course-onboarding",
      title: "Onboarding: Erste Woche",
      description: "Ein klarer Startpunkt fuer neue Teammitglieder mit Kultur, Tools und Ablauforientierung.",
      category: "Onboarding",
      status: "published",
      lessons: ["Willkommen und Ziele", "Unsere Arbeitsweise", "Tools einrichten", "Erste Checkliste abschliessen"],
      quiz: "Welche drei Tools brauchst du taeglich?"
    },
    {
      id: "course-privacy",
      title: "Datenschutz Grundlagen",
      description: "Pflichtschulung fuer den sicheren Umgang mit Kunden- und Unternehmensdaten.",
      category: "Compliance",
      status: "published",
      lessons: ["Personenbezogene Daten erkennen", "Interne Freigaben", "Meldewege bei Vorfaellen"],
      quiz: "Wann muss ein Datenschutzvorfall gemeldet werden?"
    },
    {
      id: "course-product-q2",
      title: "Produktwissen Q2",
      description: "Aktuelle Funktionen, Nutzenargumente und haeufige Kundenfragen fuer Beratung und Vertrieb.",
      category: "Produktwissen",
      status: "draft",
      lessons: ["Neue Funktionen", "Demo Ablauf", "Einwaende beantworten"],
      quiz: "Welches Kundenproblem loest die wichtigste neue Funktion?"
    }
  ]
};

const storageKey = "schulungsplatform-state-v2";
const sessionKey = "schulungsplatform-session-v1";
let state = loadState();
let currentUser = loadSession();
let activeFilter = "all";

const pageTitles = {
  dashboard: "Dashboard",
  courses: "Kurse",
  builder: "Course Builder",
  team: "Team",
  reports: "Auswertung"
};

const views = document.querySelectorAll(".view");
const navItems = document.querySelectorAll(".nav-item");
const pageTitle = document.querySelector("#pageTitle");
const appShell = document.querySelector("#appShell");
const loginScreen = document.querySelector("#loginScreen");

document.querySelector("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.querySelector("#loginEmail").value.trim().toLowerCase();
  const password = document.querySelector("#loginPassword").value;
  const user = state.users.find((item) => item.email.toLowerCase() === email && item.password === password);

  if (!user) {
    document.querySelector("#loginError").textContent = "E-Mail oder Passwort stimmt nicht.";
    return;
  }

  currentUser = user;
  sessionStorage.setItem(sessionKey, user.id);
  document.querySelector("#loginError").textContent = "";
  event.target.reset();
  applyAccess();
});

document.querySelector("#logoutButton").addEventListener("click", () => {
  currentUser = null;
  sessionStorage.removeItem(sessionKey);
  applyAccess();
});

document.querySelectorAll("[data-view], [data-view-jump]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view || button.dataset.viewJump));
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
    renderCourses();
  });
});

document.querySelector("#courseForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!isAdmin()) return;

  const lessons = document
    .querySelector("#courseLessons")
    .value.split("\n")
    .map((lesson) => lesson.trim())
    .filter(Boolean);

  state.courses.unshift({
    id: crypto.randomUUID(),
    title: document.querySelector("#courseTitle").value.trim(),
    description: document.querySelector("#courseDescription").value.trim(),
    category: document.querySelector("#courseCategory").value,
    status: document.querySelector("#courseStatus").value,
    lessons,
    quiz: document.querySelector("#courseQuiz").value.trim() || "Abschlussfrage noch offen"
  });

  saveState();
  event.target.reset();
  updatePreview();
  render();
  showView("courses");
});

document.querySelector("#learnerForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!isAdmin()) return;

  const email = document.querySelector("#learnerEmail").value.trim().toLowerCase();
  if (state.users.some((user) => user.email.toLowerCase() === email)) {
    alert("Diese E-Mail ist bereits vergeben.");
    return;
  }

  const courseId = document.querySelector("#learnerCourse").value;
  state.users.unshift({
    id: crypto.randomUUID(),
    name: document.querySelector("#learnerName").value.trim(),
    email,
    password: document.querySelector("#learnerPassword").value,
    role: "learner",
    position: document.querySelector("#learnerRole").value.trim(),
    courseIds: courseId ? [courseId] : [],
    progress: courseId ? { [courseId]: 0 } : {}
  });

  saveState();
  event.target.reset();
  render();
});

document.querySelector("#clearForm").addEventListener("click", () => {
  document.querySelector("#courseForm").reset();
  updatePreview();
});

document.querySelector("#resetDemo").addEventListener("click", () => {
  if (!isAdmin()) return;
  state = structuredClone(starterData);
  saveState();
  currentUser = state.users.find((user) => user.role === "admin");
  sessionStorage.setItem(sessionKey, currentUser.id);
  render();
  applyAccess();
});

["#courseTitle", "#courseDescription", "#courseCategory", "#courseStatus", "#courseLessons", "#courseQuiz"].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", updatePreview);
});

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) {
    return structuredClone(starterData);
  }
  try {
    const parsed = JSON.parse(saved);
    if (!parsed.users) return structuredClone(starterData);
    return parsed;
  } catch {
    return structuredClone(starterData);
  }
}

function loadSession() {
  const userId = sessionStorage.getItem(sessionKey);
  return state.users.find((user) => user.id === userId) || null;
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function applyAccess() {
  const loggedIn = Boolean(currentUser);
  loginScreen.classList.toggle("hidden", loggedIn);
  appShell.classList.toggle("locked", !loggedIn);

  if (!loggedIn) {
    return;
  }

  const admin = isAdmin();
  document.body.classList.toggle("learner-mode", !admin);
  document.querySelector("#currentUserName").textContent = currentUser.name;
  document.querySelector("#roleLabel").textContent = admin ? "Adminbereich" : "Meine Kurse";
  document.querySelector("#coursesEyebrow").textContent = admin ? "Bibliothek" : "Lernbereich";
  document.querySelector("#coursesTitle").textContent = admin ? "Kurse fuer dein Team" : "Meine Kurse";

  render();
  showView(admin ? "dashboard" : "courses");
}

function showView(viewName) {
  if (!currentUser) return;
  if (!isAdmin() && viewName !== "courses") {
    viewName = "courses";
  }

  views.forEach((view) => view.classList.toggle("active", view.id === viewName));
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  pageTitle.textContent = pageTitles[viewName] || "Kurse";
}

function render() {
  renderMetrics();
  renderDashboardCourses();
  renderCourses();
  renderLearnerCourseOptions();
  renderLearners();
  renderReports();
  updatePreview();
}

function renderMetrics() {
  const learners = state.users.filter((user) => user.role === "learner");
  const progressValues = learners.flatMap((learner) => Object.values(learner.progress || {}));
  const totalProgress = progressValues.reduce((sum, value) => sum + value, 0);
  const average = progressValues.length ? Math.round(totalProgress / progressValues.length) : 0;
  const certificates = progressValues.filter((value) => value >= 100).length;

  document.querySelector("#courseCount").textContent = state.courses.length;
  document.querySelector("#learnerCount").textContent = learners.length;
  document.querySelector("#averageProgress").textContent = `${average}%`;
  document.querySelector("#certificateCount").textContent = certificates;
}

function renderDashboardCourses() {
  const target = document.querySelector("#featuredCourses");
  const published = state.courses.filter((course) => course.status === "published").slice(0, 4);
  target.innerHTML = published.length ? published.map(courseRow).join("") : emptyState("Noch keine veroeffentlichten Kurse.");
}

function renderCourses() {
  const target = document.querySelector("#courseCatalog");
  const courses = isAdmin() ? adminCourses() : learnerCourses();
  target.innerHTML = courses.length ? courses.map(courseCard).join("") : emptyState("Dir wurden noch keine Kurse zugewiesen.");
}

function adminCourses() {
  return state.courses.filter((course) => activeFilter === "all" || course.status === activeFilter);
}

function learnerCourses() {
  const assigned = new Set(currentUser?.courseIds || []);
  return state.courses.filter((course) => course.status === "published" && assigned.has(course.id));
}

function renderLearnerCourseOptions() {
  const target = document.querySelector("#learnerCourse");
  target.innerHTML = state.courses
    .filter((course) => course.status === "published")
    .map((course) => `<option value="${course.id}">${escapeHtml(course.title)}</option>`)
    .join("");
}

function renderLearners() {
  const target = document.querySelector("#learnerList");
  const users = state.users.filter((user) => user.role === "learner");
  target.innerHTML = users.length
    ? users.map((user) => {
        const courseNames = (user.courseIds || []).map((id) => findCourse(id)?.title).filter(Boolean).join(", ") || "Kein Kurs";
        return `
          <article class="learner-row">
            <div>
              <strong>${escapeHtml(user.name)}</strong>
              <small>${escapeHtml(user.email)} | ${escapeHtml(user.position)} | ${escapeHtml(courseNames)}</small>
            </div>
          </article>
        `;
      }).join("")
    : emptyState("Noch keine Nutzer angelegt.");
}

function renderReports() {
  const target = document.querySelector("#reportTable");
  const rows = state.users
    .filter((user) => user.role === "learner")
    .flatMap((user) => (user.courseIds || []).map((courseId) => ({ user, course: findCourse(courseId), progress: user.progress?.[courseId] || 0 })))
    .filter((row) => row.course);

  target.innerHTML = rows.length
    ? `<div class="report-row header"><span>Name</span><span>Kurs</span><span>Fortschritt</span><span>Status</span></div>${rows.map(reportRow).join("")}`
    : emptyState("Sobald Nutzer Kurse haben, erscheinen hier Fortschritte.");
}

function reportRow(row) {
  const status = row.progress >= 100 ? "Abgeschlossen" : row.progress >= 60 ? "Aktiv" : "Gestartet";
  return `
    <div class="report-row">
      <strong>${escapeHtml(row.user.name)}</strong>
      <span>${escapeHtml(row.course.title)}</span>
      ${progress(row.progress)}
      <small>${status}</small>
    </div>
  `;
}

function updatePreview() {
  if (!document.querySelector("#coursePreview")) return;
  const lessons = document
    .querySelector("#courseLessons")
    .value.split("\n")
    .map((lesson) => lesson.trim())
    .filter(Boolean);
  const title = document.querySelector("#courseTitle").value.trim() || "Dein neuer Kurs";
  const description = document.querySelector("#courseDescription").value.trim() || "Die Beschreibung zeigt hier, was dein Team lernen wird.";
  const category = document.querySelector("#courseCategory").value;
  const status = document.querySelector("#courseStatus").value;
  const quiz = document.querySelector("#courseQuiz").value.trim() || "Quizfrage wird hier angezeigt.";

  document.querySelector("#coursePreview").innerHTML = `
    <span class="status-pill ${status === "draft" ? "draft" : ""}">${status === "draft" ? "Entwurf" : "Veroeffentlicht"}</span>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(description)}</p>
    <p><strong>Kategorie:</strong> ${escapeHtml(category)}</p>
    <ul class="lesson-list">
      ${(lessons.length ? lessons : ["Erste Lektion", "Praxisaufgabe", "Abschluss"]).map((lesson) => `<li>${escapeHtml(lesson)}</li>`).join("")}
    </ul>
    <p><strong>Quiz:</strong> ${escapeHtml(quiz)}</p>
  `;
}

function courseRow(course) {
  const learners = state.users.filter((user) => user.role === "learner" && (user.courseIds || []).includes(course.id));
  const average = learners.length ? Math.round(learners.reduce((sum, user) => sum + (user.progress?.[course.id] || 0), 0) / learners.length) : 0;
  return `
    <article class="course-row">
      <div>
        <strong>${escapeHtml(course.title)}</strong>
        <p>${escapeHtml(course.description)}</p>
      </div>
      ${progress(average)}
    </article>
  `;
}

function courseCard(course) {
  const value = currentUser?.progress?.[course.id] || 0;
  const adminMeta = `${escapeHtml(course.category)} | ${course.lessons.length} Lektionen`;
  const learnerMeta = `${course.lessons.length} Lektionen | Fortschritt ${value}%`;
  return `
    <article class="course-card">
      ${isAdmin() ? `<span class="status-pill ${course.status === "draft" ? "draft" : ""}">${course.status === "draft" ? "Entwurf" : "Veroeffentlicht"}</span>` : ""}
      <div>
        <h3>${escapeHtml(course.title)}</h3>
        <p>${escapeHtml(course.description)}</p>
      </div>
      <ul class="lesson-list">
        ${course.lessons.map((lesson) => `<li>${escapeHtml(lesson)}</li>`).join("")}
      </ul>
      ${!isAdmin() ? progress(value) : ""}
      <small>${isAdmin() ? adminMeta : learnerMeta}</small>
    </article>
  `;
}

function progress(value) {
  return `
    <div>
      <small>${value}%</small>
      <div class="progress-track" aria-label="Fortschritt ${value}%">
        <div class="progress-bar" style="width: ${value}%"></div>
      </div>
    </div>
  `;
}

function findCourse(id) {
  return state.courses.find((course) => course.id === id);
}

function isAdmin() {
  return currentUser?.role === "admin";
}

function emptyState(message) {
  return `<div class="empty-state">${message}</div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

saveState();
applyAccess();

const starterData = {
  courses: [
    {
      id: crypto.randomUUID(),
      title: "Onboarding: Erste Woche",
      description: "Ein klarer Startpunkt fuer neue Teammitglieder mit Kultur, Tools und Ablauforientierung.",
      category: "Onboarding",
      status: "published",
      lessons: ["Willkommen und Ziele", "Unsere Arbeitsweise", "Tools einrichten", "Erste Checkliste abschliessen"],
      quiz: "Welche drei Tools brauchst du taeglich?"
    },
    {
      id: crypto.randomUUID(),
      title: "Datenschutz Grundlagen",
      description: "Pflichtschulung fuer den sicheren Umgang mit Kunden- und Unternehmensdaten.",
      category: "Compliance",
      status: "published",
      lessons: ["Personenbezogene Daten erkennen", "Interne Freigaben", "Meldewege bei Vorfaellen"],
      quiz: "Wann muss ein Datenschutzvorfall gemeldet werden?"
    },
    {
      id: crypto.randomUUID(),
      title: "Produktwissen Q2",
      description: "Aktuelle Funktionen, Nutzenargumente und haeufige Kundenfragen fuer Beratung und Vertrieb.",
      category: "Produktwissen",
      status: "draft",
      lessons: ["Neue Funktionen", "Demo Ablauf", "Einwaende beantworten"],
      quiz: "Welches Kundenproblem loest die wichtigste neue Funktion?"
    }
  ],
  learners: []
};

const storageKey = "schulungsplatform-state-v1";
let state = loadState();
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
  const courseId = document.querySelector("#learnerCourse").value;
  state.learners.unshift({
    id: crypto.randomUUID(),
    name: document.querySelector("#learnerName").value.trim(),
    role: document.querySelector("#learnerRole").value.trim(),
    courseId,
    progress: Math.floor(Math.random() * 70) + 15,
    lastActive: new Date().toLocaleDateString("de-DE")
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
  state = structuredClone(starterData);
  saveState();
  render();
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
    return JSON.parse(saved);
  } catch {
    return structuredClone(starterData);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function showView(viewName) {
  views.forEach((view) => view.classList.toggle("active", view.id === viewName));
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  pageTitle.textContent = pageTitles[viewName] || "Dashboard";
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
  const totalProgress = state.learners.reduce((sum, learner) => sum + learner.progress, 0);
  const average = state.learners.length ? Math.round(totalProgress / state.learners.length) : 0;
  const certificates = state.learners.filter((learner) => learner.progress >= 100).length;

  document.querySelector("#courseCount").textContent = state.courses.length;
  document.querySelector("#learnerCount").textContent = state.learners.length;
  document.querySelector("#averageProgress").textContent = `${average}%`;
  document.querySelector("#certificateCount").textContent = certificates;
  document.querySelector("#activeLearners").textContent = `${state.learners.length} Lernende`;
}

function renderDashboardCourses() {
  const target = document.querySelector("#featuredCourses");
  const published = state.courses.filter((course) => course.status === "published").slice(0, 4);
  target.innerHTML = published.length ? published.map(courseRow).join("") : emptyState("Noch keine veroeffentlichten Kurse.");
}

function renderCourses() {
  const target = document.querySelector("#courseCatalog");
  const courses = state.courses.filter((course) => activeFilter === "all" || course.status === activeFilter);
  target.innerHTML = courses.length ? courses.map(courseCard).join("") : emptyState("Keine Kurse in diesem Filter.");
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
  target.innerHTML = state.learners.length
    ? state.learners.map((learner) => {
        const course = findCourse(learner.courseId);
        return `
          <article class="learner-row">
            <div>
              <strong>${escapeHtml(learner.name)}</strong>
              <small>${escapeHtml(learner.role)} · ${escapeHtml(course?.title || "Kein Kurs")}</small>
            </div>
            ${progress(learner.progress)}
          </article>
        `;
      }).join("")
    : emptyState("Noch niemand eingeschrieben.");
}

function renderReports() {
  const target = document.querySelector("#reportTable");
  const rows = state.learners.map((learner) => {
    const course = findCourse(learner.courseId);
    const status = learner.progress >= 100 ? "Abgeschlossen" : learner.progress >= 60 ? "Aktiv" : "Gestartet";
    return `
      <div class="report-row">
        <strong>${escapeHtml(learner.name)}</strong>
        <span>${escapeHtml(course?.title || "Kein Kurs")}</span>
        ${progress(learner.progress)}
        <small>${status}</small>
      </div>
    `;
  });

  target.innerHTML = state.learners.length
    ? `<div class="report-row header"><span>Name</span><span>Kurs</span><span>Fortschritt</span><span>Status</span></div>${rows.join("")}`
    : emptyState("Sobald du Lernende einschreibst, erscheinen hier Fortschritte.");
}

function updatePreview() {
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
    <span class="status-pill ${status === "draft" ? "draft" : ""}">${status === "draft" ? "Entwurf" : "Veröffentlicht"}</span>
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
  const enrolled = state.learners.filter((learner) => learner.courseId === course.id);
  const average = enrolled.length ? Math.round(enrolled.reduce((sum, learner) => sum + learner.progress, 0) / enrolled.length) : 0;
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
  return `
    <article class="course-card">
      <span class="status-pill ${course.status === "draft" ? "draft" : ""}">${course.status === "draft" ? "Entwurf" : "Veröffentlicht"}</span>
      <div>
        <h3>${escapeHtml(course.title)}</h3>
        <p>${escapeHtml(course.description)}</p>
      </div>
      <ul class="lesson-list">
        ${course.lessons.map((lesson) => `<li>${escapeHtml(lesson)}</li>`).join("")}
      </ul>
      <small>${escapeHtml(course.category)} · ${course.lessons.length} Lektionen</small>
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

render();

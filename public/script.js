const EXAMPLE = "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG";
const BASES = ["A", "T", "G", "C"];
const BASE_COLORS = { A: "var(--A)", T: "var(--T)", G: "var(--G)", C: "var(--C)" };

const $ = (id) => document.getElementById(id);
const input = $("sequence");
let lastResult = null;

/* ---------- Page effects ---------- */

// Preloader fades out once the page has loaded.
window.addEventListener("load", () => {
  setTimeout(() => {
    $("preloader").classList.add("done");
    document.body.classList.remove("loading");
  }, 1400);
});

// DNA helix backgrounds.
createHelix($("hero-helix"), { color: "213,232,240" });
createHelix($("story-helix"), { color: "90,140,205", tilt: -1.15, radiusRatio: 0.16, turns: 1.4, offsetX: 0, density: 700 });

// Fade elements in as they scroll into view.
const revealer = new IntersectionObserver((entries) => {
  entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible"));
}, { threshold: 0.2 });
document.querySelectorAll(".reveal").forEach((el) => revealer.observe(el));

// Header turns navy while it sits over the light section.
const header = document.querySelector(".site-header");
function updateHeader() {
  const box = $("story").getBoundingClientRect();
  header.classList.toggle("on-light", box.top < 44 && box.bottom > 44);
}
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

// Full-screen menu.
const menu = $("menu");
function setMenu(open) {
  menu.classList.toggle("open", open);
  menu.setAttribute("aria-hidden", String(!open));
  $("menu-btn").setAttribute("aria-expanded", String(open));
  $("menu-btn").firstChild.textContent = open ? "Close " : "Menu ";
}
$("menu-btn").addEventListener("click", () => setMenu(!menu.classList.contains("open")));
menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

// DNA → RNA → protein slider, advances every 6 seconds or on click.
const slides = document.querySelectorAll(".slide");
let slideIndex = 0;
function showSlide(i) {
  slideIndex = i % slides.length;
  slides.forEach((s, n) => s.classList.toggle("active", n === slideIndex));
  $("slide-count").textContent = `${slideIndex + 1}/${slides.length}`;
  $("slide-bar").style.width = `${((slideIndex + 1) / slides.length) * 100}%`;
}
showSlide(0);
let slideTimer = setInterval(() => showSlide(slideIndex + 1), 6000);
$("slide-next").addEventListener("click", () => {
  clearInterval(slideTimer);
  showSlide(slideIndex + 1);
  slideTimer = setInterval(() => showSlide(slideIndex + 1), 6000);
});

/* ---------- Analysis ---------- */

// Colour each letter; anything that is not A/T/G/C/U is highlighted as invalid.
function colorize(text) {
  return [...text]
    .map((ch) => `<span class="b-${"ATGCU".includes(ch) ? ch : "x"}">${ch}</span>`)
    .join("");
}

function updatePreview() {
  $("preview").innerHTML = colorize(input.value.replace(/\s/g, "").toUpperCase());
}

function showError(message) {
  $("error").textContent = message;
}

function renderChart(counts, length) {
  $("chart").innerHTML = BASES
    .map((base) => `
      <div class="bar-row">
        <span class="bar-label b-${base}">${base}</span>
        <div class="bar-track"><div class="bar-fill b-${base}" data-width="${(counts[base] / length) * 100}" style="background:${BASE_COLORS[base]}"></div></div>
        <span class="bar-value">${counts[base]}</span>
      </div>`)
    .join("");
  // Next frame so the width transition animates.
  requestAnimationFrame(() => {
    document.querySelectorAll(".bar-fill").forEach((el) => (el.style.width = `${el.dataset.width}%`));
  });
}

function renderResults(r) {
  $("length").textContent = `${r.length} bases`;
  $("gc").textContent = `${r.gc_percent.toFixed(2)}%`;
  $("at").textContent = `${r.at_percent.toFixed(2)}%`;
  renderChart(r.counts, r.length);
  $("revcomp").innerHTML = colorize(r.reverse_complement);
  $("rna").innerHTML = colorize(r.rna);
  $("protein").textContent = r.protein || "(too short: fewer than 3 bases)";
  $("skipped").textContent = r.bases_skipped
    ? `Length is not divisible by 3, so ${r.codons_translated} complete codons were translated and the last ${r.bases_skipped} base(s) were skipped.`
    : "";
  $("results").classList.remove("hidden");
  $("results").scrollIntoView({ behavior: "smooth" });
}

async function analyze() {
  showError("");
  const button = $("analyze");
  button.disabled = true;
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sequence: input.value }),
    });
    const data = await res.json();
    if (!res.ok) {
      $("results").classList.add("hidden");
      lastResult = null;
      showError(data.error);
      return;
    }
    lastResult = data;
    renderResults(data);
  } catch (err) {
    showError("Could not reach the server. Please try again.");
  } finally {
    button.disabled = false;
  }
}

async function uploadFasta(file) {
  showError("");
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/fasta", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) {
    showError(data.error);
    return;
  }
  input.value = data.sequence;
  updatePreview();
  analyze();
}

function downloadReport() {
  const r = lastResult;
  const report = [
    "DNA EXPLORER REPORT",
    "===================",
    `Generated: ${new Date().toLocaleString()}`,
    "",
    `Sequence: ${r.sequence}`,
    `Length: ${r.length} bases`,
    "",
    "Base composition",
    ...BASES.map((b) => `  ${b}: ${r.counts[b]}`),
    "",
    `GC percentage: ${r.gc_percent.toFixed(2)}%`,
    `AT percentage: ${r.at_percent.toFixed(2)}%`,
    "",
    `Reverse complement: ${r.reverse_complement}`,
    `RNA: ${r.rna}`,
    `Protein: ${r.protein}`,
    r.bases_skipped ? `Note: last ${r.bases_skipped} base(s) skipped during translation.` : "",
  ].join("\n");
  const url = URL.createObjectURL(new Blob([report], { type: "text/plain" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "dna-report.txt" });
  a.click();
  URL.revokeObjectURL(url);
}

input.addEventListener("input", updatePreview);
$("analyze").addEventListener("click", analyze);
$("example").addEventListener("click", () => {
  input.value = EXAMPLE;
  updatePreview();
  analyze();
});
$("clear").addEventListener("click", () => {
  input.value = "";
  updatePreview();
  showError("");
  lastResult = null;
  $("results").classList.add("hidden");
});
$("fasta").addEventListener("change", (e) => {
  if (e.target.files[0]) uploadFasta(e.target.files[0]);
  e.target.value = "";
});
$("download").addEventListener("click", downloadReport);
document.querySelectorAll(".copy").forEach((btn) =>
  btn.addEventListener("click", async () => {
    await navigator.clipboard.writeText($(btn.dataset.target).textContent);
    btn.textContent = "Copied";
    setTimeout(() => (btn.textContent = "Copy"), 1200);
  })
);

const API = "https://api.postalpincode.in";

const state = { mode: "pincode" };

const tabs = document.querySelectorAll(".tab");
const form = document.getElementById("searchForm");
const input = document.getElementById("searchInput");
const label = document.getElementById("searchLabel");
const hint = document.getElementById("searchHint");
const results = document.getElementById("results");
const resultsTitle = document.getElementById("resultsTitle");
const resultsMeta = document.getElementById("resultsMeta");
const stats = document.getElementById("stats");
const body = document.getElementById("resultsBody");
const empty = document.getElementById("emptyState");
const clearBtn = document.getElementById("clearBtn");

const modes = {
  pincode: {
    label: "Enter 6-digit PIN Code",
    placeholder: "e.g. 314001",
    inputmode: "numeric",
    maxlength: 6,
    hint: "Example: 314001"
  },
  postoffice: {
    label: "Enter Post Office Name",
    placeholder: "e.g. Dungarpur",
    inputmode: "text",
    maxlength: 80,
    hint: "Example: Dungarpur"
  },
  location: {
    label: "Enter Location",
    placeholder: "e.g. Dungarpur, Rajasthan",
    inputmode: "text",
    maxlength: 80,
    hint: "The public API searches by post office/name; location mode uses your entered place name."
  }
};

tabs.forEach(tab => tab.addEventListener("click", () => {
  state.mode = tab.dataset.mode;
  tabs.forEach(t => {
    const active = t === tab;
    t.classList.toggle("active", active);
    t.setAttribute("aria-selected", active ? "true" : "false");
  });
  const cfg = modes[state.mode];
  label.textContent = cfg.label;
  input.placeholder = cfg.placeholder;
  input.inputMode = cfg.inputmode;
  input.maxLength = cfg.maxlength;
  hint.textContent = cfg.hint;
  input.value = "";
  input.focus();
}));

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function statusBadge(status) {
  const isDelivery = String(status).toLowerCase() === "delivery";
  return '<span class="status ' + (isDelivery ? 'delivery' : 'non') + '">' + escapeHtml(status || "Unknown") + '</span>';
}

function render(data, query) {
  body.innerHTML = "";
  empty.hidden = true;

  if (!Array.isArray(data) || data.length === 0) {
    empty.hidden = false;
    resultsTitle.textContent = "No results";
    resultsMeta.textContent = "No matching post offices were returned.";
    stats.innerHTML = "";
    return;
  }

  results.hidden = false;
  resultsTitle.textContent = data.length === 1 ? (data[0].Name || "Post office") : query;
  resultsMeta.textContent = data.length + " post office" + (data.length === 1 ? "" : "s") + " found";

  const states = [...new Set(data.map(x => x.State).filter(Boolean))];
  const districts = [...new Set(data.map(x => x.District).filter(Boolean))];
  const delivery = data.filter(x => String(x.DeliveryStatus).toLowerCase() === "delivery").length;

  stats.innerHTML = [
    ["Total Offices", data.length],
    ["Delivery", delivery],
    ["Districts", districts.length]
  ].map(([k,v]) => '<div class="stat"><span>'+escapeHtml(k)+'</span><strong>'+escapeHtml(v)+'</strong></div>').join("");

  body.innerHTML = data.map(row => `
    <tr>
      <td>${escapeHtml(row.Name)}</td>
      <td>${escapeHtml(row.Pincode)}</td>
      <td>${escapeHtml(row.BranchType)}</td>
      <td>${statusBadge(row.DeliveryStatus)}</td>
      <td>${escapeHtml(row.District)}</td>
      <td>${escapeHtml(row.State)}</td>
    </tr>
  `).join("");

  results.scrollIntoView({behavior:"smooth", block:"start"});
}

async function searchByPath(path, query) {
  const response = await fetch(API + path);
  if (!response.ok) throw new Error("API request failed");
  const payload = await response.json();
  const first = Array.isArray(payload) ? payload[0] : payload;
  if (!first || first.Status !== "Success") return [];
  return Array.isArray(first.PostOffice) ? first.PostOffice : [];
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = input.value.trim();

  if (!query) return;

  if (state.mode === "pincode" && !/^\d{6}$/.test(query)) {
    input.setCustomValidity("Please enter a valid 6-digit PIN code.");
    input.reportValidity();
    input.setCustomValidity("");
    return;
  }

  const button = form.querySelector(".search-btn");
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = "Searching…";

  try {
    let path;
    if (state.mode === "pincode") {
      path = "/pincode/" + encodeURIComponent(query);
    } else {
      path = "/postoffice/" + encodeURIComponent(query);
    }

    const data = await searchByPath(path, query);
    results.hidden = false;
    render(data, query);
  } catch (error) {
    results.hidden = false;
    resultsTitle.textContent = "Search error";
    resultsMeta.textContent = "The postal API could not be reached.";
    stats.innerHTML = "";
    body.innerHTML = "";
    empty.hidden = false;
    empty.textContent = "Please try again in a moment.";
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
});

clearBtn.addEventListener("click", () => {
  input.value = "";
  results.hidden = true;
  input.focus();
});

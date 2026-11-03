
const planForm = document.getElementById("planForm");
const planCatalog = document.getElementById("planCatalog");
const planTableBody = document.getElementById("planTableBody");
const planCount = document.getElementById("planCount");
const planMessage = document.getElementById("planMessage");
const planFormHeading = document.getElementById("planFormHeading");
const savePlanBtn = document.getElementById("savePlanBtn");
const cancelPlanEdit = document.getElementById("cancelPlanEdit");

let plans = [];
let editingPlanId = null;
let planMessageTimer;

const planImages = [
  "/images/gym-equipment.jpg",
  "/images/gym-facility.jpg",
  "/images/fitness-training.jpg"
];

function showPlanMessage(message, type = "success") {
  planMessage.textContent = message;
  planMessage.className = `plan-message ${type}`;
  planMessage.hidden = false;

  clearTimeout(planMessageTimer);
  planMessageTimer = setTimeout(() => {
    planMessage.hidden = true;
  }, 5000);

  planMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function planRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Unable to complete plan request.");
  }

  return data;
}

function createPlanCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value === null || value === undefined || value === ""
    ? "—"
    : String(value);
  return cell;
}

function formatFee(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "₹0";

  return number.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  });
}

function renderPlanCards() {
  planCatalog.replaceChildren();

  if (plans.length === 0) {
    const empty = document.createElement("article");
    empty.className = "panel";
    empty.textContent = "No membership plans found. Create your first plan below.";
    planCatalog.appendChild(empty);
    return;
  }

  plans.forEach((plan, index) => {
    const card = document.createElement("article");
    card.className = "plan-card";
    if (index === 1) card.classList.add("featured");

    const img = document.createElement("img");
    img.src = planImages[index % planImages.length];
    img.alt = `${plan.plan_name} membership`;
    img.loading = "lazy";

    const body = document.createElement("div");
    body.className = "plan-card-body";

    const label = document.createElement("span");
    label.className = "plan-label";
    label.textContent = index === 1 ? "Popular choice" : "Fitness membership";

    const title = document.createElement("h3");
    title.textContent = plan.plan_name;

    const price = document.createElement("div");
    price.className = "plan-price";
    price.textContent = formatFee(plan.fee);

    const duration = document.createElement("div");
    duration.className = "plan-duration";
    duration.textContent =
      `${plan.duration_months} month${Number(plan.duration_months) === 1 ? "" : "s"}`;

    const description = document.createElement("p");
    description.className = "plan-description";
    description.textContent = plan.description || "A flexible fitness membership for your goals.";

    const footer = document.createElement("div");
    footer.className = "plan-card-footer";

    const idLabel = document.createElement("small");
    idLabel.textContent = `PLAN #${plan.plan_id}`;

    const actions = document.createElement("div");
    actions.className = "plan-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "plan-action";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => startPlanEdit(plan));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "plan-action delete";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => requestPlanDelete(plan));

    actions.append(edit, remove);
    footer.append(idLabel, actions);
    body.append(label, title, price, duration, description, footer);
    card.append(img, body);
    planCatalog.appendChild(card);
  });
}

function renderPlanTable() {
  planTableBody.replaceChildren();

  if (plans.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "loading-cell";
    cell.textContent = "No plans available.";
    row.appendChild(cell);
    planTableBody.appendChild(row);
    return;
  }

  plans.forEach((plan) => {
    const row = document.createElement("tr");
    row.appendChild(createPlanCell(plan.plan_id));
    row.appendChild(createPlanCell(plan.plan_name));
    row.appendChild(createPlanCell(`${plan.duration_months} month(s)`));
    row.appendChild(createPlanCell(formatFee(plan.fee)));
    row.appendChild(createPlanCell(plan.description));

    const actionCell = document.createElement("td");
    const group = document.createElement("div");
    group.className = "action-group";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "action-btn";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => startPlanEdit(plan));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "action-btn delete";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => requestPlanDelete(plan));

    group.append(edit, remove);
    actionCell.appendChild(group);
    row.appendChild(actionCell);
    planTableBody.appendChild(row);
  });
}

function renderPlans() {
  planCount.textContent = `${plans.length} plan(s) available`;
  renderPlanCards();
  renderPlanTable();
}

async function loadPlans() {
  try {
    const data = await planRequest("/api/plans");

    if (!Array.isArray(data)) {
      throw new Error("Unexpected membership plan data.");
    }

    plans = data;
    renderPlans();
  } catch (error) {
    planCatalog.replaceChildren();

    const message = document.createElement("article");
    message.className = "panel";
    message.textContent = "Could not load membership plans. Check the server.";
    planCatalog.appendChild(message);

    planTableBody.replaceChildren();
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.className = "loading-cell";
    cell.textContent = "Unable to load records.";
    row.appendChild(cell);
    planTableBody.appendChild(row);

    planCount.textContent = "Unable to load plans";
    showPlanMessage(error.message, "error");
  }
}

function startPlanEdit(plan) {
  editingPlanId = plan.plan_id;

  planForm.elements.plan_name.value = plan.plan_name || "";
  planForm.elements.duration_months.value = plan.duration_months ?? "";
  planForm.elements.fee.value = plan.fee ?? "";
  planForm.elements.description.value = plan.description || "";

  planFormHeading.textContent = "Edit membership plan";
  savePlanBtn.textContent = "Save Changes";
  cancelPlanEdit.hidden = false;

  planForm.scrollIntoView({ behavior: "smooth", block: "start" });
  planForm.elements.plan_name.focus();
}

function resetPlanForm() {
  planForm.reset();
  editingPlanId = null;
  planFormHeading.textContent = "Create a membership plan";
  savePlanBtn.textContent = "Create Plan";
  cancelPlanEdit.hidden = true;
}

planForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(planForm);
  const duration = Number(formData.get("duration_months"));
  const fee = Number(formData.get("fee"));

  const planData = {
    plan_name: String(formData.get("plan_name") || "").trim(),
    duration_months: duration,
    fee,
    description: String(formData.get("description") || "").trim()
  };

  if (!planData.plan_name || !Number.isInteger(duration) ||
      duration < 1 || duration > 120 || !Number.isFinite(fee) || fee < 0) {
    showPlanMessage("Enter a plan name, a duration from 1 to 120 months, and a valid non-negative fee.", "error");
    return;
  }

  savePlanBtn.disabled = true;
  savePlanBtn.textContent = "Saving...";

  try {
    const isEditing = editingPlanId !== null;
    const url = isEditing
      ? `/api/plans/${editingPlanId}`
      : "/api/plans";
    const method = isEditing ? "PUT" : "POST";

    const result = await planRequest(url, {
      method,
      body: JSON.stringify(planData)
    });

    resetPlanForm();
    await loadPlans();
    showPlanMessage(result.message || "Membership plan saved successfully.");
  } catch (error) {
    showPlanMessage(error.message, "error");
  } finally {
    savePlanBtn.disabled = false;
    savePlanBtn.textContent =
      editingPlanId !== null ? "Save Changes" : "Create Plan";
  }
});

cancelPlanEdit.addEventListener("click", () => {
  resetPlanForm();
  showPlanMessage("Plan editing cancelled.");
});

function requestPlanDelete(plan) {
  const oldConfirm = document.getElementById("planDeleteConfirm");
  if (oldConfirm) oldConfirm.remove();

  const box = document.createElement("div");
  box.id = "planDeleteConfirm";
  box.className = "plan-message error";

  const text = document.createElement("span");
  text.textContent =
    `Delete "${plan.plan_name}"? Plans used by subscriptions may not be deletable. `;

  const confirm = document.createElement("button");
  confirm.type = "button";
  confirm.className = "action-btn delete";
  confirm.textContent = "Confirm Delete";

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "action-btn";
  cancel.textContent = "Cancel";
  cancel.style.marginLeft = "8px";

  box.append(text, confirm, cancel);
  planMessage.replaceChildren(box);
  planMessage.className = "plan-message error";
  planMessage.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });

  cancel.addEventListener("click", () => {
    planMessage.hidden = true;
    planMessage.replaceChildren();
  });

  confirm.addEventListener("click", async () => {
    confirm.disabled = true;
    confirm.textContent = "Deleting...";

    try {
      const result = await planRequest(`/api/plans/${plan.plan_id}`, {
        method: "DELETE"
      });

      if (editingPlanId === plan.plan_id) resetPlanForm();
      await loadPlans();
      showPlanMessage(result.message || "Membership plan deleted successfully.");
    } catch (error) {
      showPlanMessage(error.message, "error");
    }
  });
}

loadPlans();

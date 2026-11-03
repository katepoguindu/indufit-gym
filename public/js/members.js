
const memberForm = document.getElementById("memberForm");
const membersTableBody = document.getElementById("membersTableBody");
const memberSearch = document.getElementById("memberSearch");
const memberCount = document.getElementById("memberCount");
const memberMessage = document.getElementById("memberMessage");
const formHeading = document.getElementById("formHeading");
const saveMemberBtn = document.getElementById("saveMemberBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

let members = [];
let editingMemberId = null;
let messageTimeout;

function showMemberMessage(message, type = "success") {
  memberMessage.textContent = message;
  memberMessage.className = `member-message ${type}`;
  memberMessage.hidden = false;

  clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => {
    memberMessage.hidden = true;
  }, 5000);

  memberMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function formatMemberDate(value) {
  if (!value) return "—";

  const text = String(value).slice(0, 10);
  const parts = text.split("-");

  if (parts.length !== 3) return text;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function makeCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text || "—";
  return cell;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "The request could not be completed.");
  }

  return data;
}

async function loadMembers() {
  membersTableBody.replaceChildren();

  const loadingRow = document.createElement("tr");
  const loadingCell = document.createElement("td");
  loadingCell.colSpan = 5;
  loadingCell.className = "empty-state";
  loadingCell.textContent = "Loading members...";
  loadingRow.appendChild(loadingCell);
  membersTableBody.appendChild(loadingRow);

  try {
    const data = await apiRequest("/api/members");

    if (!Array.isArray(data)) {
      throw new Error("Unexpected members data received.");
    }

    members = data;
    renderMembers();
  } catch (error) {
    membersTableBody.replaceChildren();

    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "empty-state";
    cell.textContent = "Could not load members. Check the server connection.";
    row.appendChild(cell);
    membersTableBody.appendChild(row);

    memberCount.textContent = "Unable to load records";
    showMemberMessage(error.message, "error");
  }
}

function renderMembers() {
  const searchTerm = memberSearch.value.trim().toLowerCase();

  const filteredMembers = members.filter((member) => {
    const searchableText = [
      member.name,
      member.email,
      member.phone,
      member.status,
      member.member_id
    ].join(" ").toLowerCase();

    return searchableText.includes(searchTerm);
  });

  memberCount.textContent =
    `${filteredMembers.length} of ${members.length} member(s)`;

  membersTableBody.replaceChildren();

  if (filteredMembers.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "empty-state";
    cell.textContent = members.length
      ? "No matching members found."
      : "No members registered yet. Add your first member.";
    row.appendChild(cell);
    membersTableBody.appendChild(row);
    return;
  }

  filteredMembers.forEach((member) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.className = "member-name-cell";

    const person = document.createElement("div");
    person.className = "member-person";

    const avatar = document.createElement("span");
    avatar.className = "member-avatar";
    avatar.textContent = (member.name || "M").trim().charAt(0).toUpperCase();

    const details = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = member.name || "Unnamed member";

    const email = document.createElement("small");
    email.textContent = member.email || "No email";

    details.append(name, email);
    person.append(avatar, details);
    nameCell.appendChild(person);
    row.appendChild(nameCell);

    row.appendChild(makeCell(member.phone));
    row.appendChild(makeCell(formatMemberDate(member.join_date)));

    const statusCell = document.createElement("td");
    const statusPill = document.createElement("span");
    statusPill.className = "status-pill";
    statusPill.textContent = member.status || "Active";
    statusCell.appendChild(statusPill);
    row.appendChild(statusCell);

    const actionsCell = document.createElement("td");
    const actionGroup = document.createElement("div");
    actionGroup.className = "action-group";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "action-btn";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => startEditing(member));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "action-btn delete";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteMember(member));

    actionGroup.append(editButton, deleteButton);
    actionsCell.appendChild(actionGroup);
    row.appendChild(actionsCell);

    membersTableBody.appendChild(row);
  });
}

function startEditing(member) {
  editingMemberId = member.member_id;

  memberForm.elements.name.value = member.name || "";
  memberForm.elements.email.value = member.email || "";
  memberForm.elements.phone.value = member.phone || "";
  memberForm.elements.join_date.value = member.join_date
    ? String(member.join_date).slice(0, 10)
    : "";
  memberForm.elements.status.value = member.status || "Active";

  formHeading.textContent = "Edit member";
  saveMemberBtn.textContent = "Save Changes";
  cancelEditBtn.hidden = false;

  memberForm.scrollIntoView({ behavior: "smooth", block: "start" });
  memberForm.elements.name.focus();
}

function resetMemberForm() {
  memberForm.reset();
  editingMemberId = null;

  formHeading.textContent = "Add a member";
  saveMemberBtn.textContent = "Add Member";
  cancelEditBtn.hidden = true;
}

memberForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(memberForm);

  const memberData = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    join_date: formData.get("join_date") || null,
    status: formData.get("status") || "Active"
  };

  if (!memberData.name || !memberData.email) {
    showMemberMessage("Please enter the member name and email.", "error");
    return;
  }

  saveMemberBtn.disabled = true;
  saveMemberBtn.textContent = "Saving...";

  try {
    const isEditing = editingMemberId !== null;

    const url = isEditing
      ? `/api/members/${editingMemberId}`
      : "/api/members";

    const method = isEditing ? "PUT" : "POST";

    const result = await apiRequest(url, {
      method,
      body: JSON.stringify(memberData)
    });

    resetMemberForm();
    await loadMembers();

    showMemberMessage(
      result.message || (isEditing
        ? "Member updated successfully!"
        : "Member added successfully!")
    );
  } catch (error) {
    showMemberMessage(error.message, "error");
  } finally {
    saveMemberBtn.disabled = false;
    saveMemberBtn.textContent =
      editingMemberId !== null ? "Save Changes" : "Add Member";
  }
});

cancelEditBtn.addEventListener("click", () => {
  resetMemberForm();
  showMemberMessage("Edit cancelled.");
});

async function deleteMember(member) {
  // Inline confirmation: no browser popup.
  const existing = document.getElementById("deleteConfirm");

  if (existing) existing.remove();

  const confirmation = document.createElement("div");
  confirmation.id = "deleteConfirm";
  confirmation.className = "member-message error";

  const message = document.createElement("span");
  message.textContent =
    `Delete ${member.name}? This action cannot be undone. `;

  const confirmButton = document.createElement("button");
  confirmButton.type = "button";
  confirmButton.className = "action-btn delete";
  confirmButton.textContent = "Confirm Delete";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "action-btn";
  cancelButton.textContent = "Cancel";
  cancelButton.style.marginLeft = "8px";

  confirmation.append(message, confirmButton, cancelButton);
  memberMessage.hidden = false;
  memberMessage.className = "member-message error";
  memberMessage.replaceChildren(confirmation);
  confirmation.scrollIntoView({ behavior: "smooth", block: "nearest" });

  cancelButton.addEventListener("click", () => {
    memberMessage.hidden = true;
    memberMessage.replaceChildren();
  });

  confirmButton.addEventListener("click", async () => {
    confirmButton.disabled = true;
    confirmButton.textContent = "Deleting...";

    try {
      const result = await apiRequest(`/api/members/${member.member_id}`, {
        method: "DELETE"
      });

      if (editingMemberId === member.member_id) {
        resetMemberForm();
      }

      await loadMembers();
      showMemberMessage(result.message || "Member deleted successfully!");
    } catch (error) {
      showMemberMessage(error.message, "error");
    }
  });
}

memberSearch.addEventListener("input", renderMembers);

loadMembers();

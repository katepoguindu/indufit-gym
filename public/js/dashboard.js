
const totalMembers = document.getElementById("totalMembers");
const totalPlans = document.getElementById("totalPlans");
const totalSubscriptions = document.getElementById("totalSubscriptions");
const recentMembers = document.getElementById("recentMembers");
const pageMessage = document.getElementById("pageMessage");

function showMessage(message, isError = false) {
  if (!pageMessage) return;

  pageMessage.textContent = message;
  pageMessage.hidden = false;
  pageMessage.classList.toggle("error", isError);
}

function formatDate(dateValue) {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
}

function createCell(value) {
  const cell = document.createElement("td");
  cell.textContent =
    value === null || value === undefined || value === ""
      ? "—"
      : String(value);

  return cell;
}

async function loadDashboard() {
  try {
    const [membersResponse, plansResponse, subscriptionsResponse] =
      await Promise.all([
        fetch("/api/members"),
        fetch("/api/plans"),
        fetch("/api/subscriptions")
      ]);

    if (
      !membersResponse.ok ||
      !plansResponse.ok ||
      !subscriptionsResponse.ok
    ) {
      throw new Error("Unable to retrieve dashboard data.");
    }

    const members = await membersResponse.json();
    const plans = await plansResponse.json();
    const subscriptions = await subscriptionsResponse.json();

    if (
      !Array.isArray(members) ||
      !Array.isArray(plans) ||
      !Array.isArray(subscriptions)
    ) {
      throw new Error("Unexpected data received from the server.");
    }

    totalMembers.textContent = members.length;
    totalPlans.textContent = plans.length;
    totalSubscriptions.textContent = subscriptions.length;

    recentMembers.replaceChildren();

    const latestMembers = [...members].reverse().slice(0, 5);

    if (latestMembers.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");

      cell.colSpan = 5;
      cell.className = "loading-cell";
      cell.textContent = "No members have been added yet.";

      row.appendChild(cell);
      recentMembers.appendChild(row);
      return;
    }

    latestMembers.forEach((member) => {
      const row = document.createElement("tr");

      row.appendChild(
        createCell(member.name ?? member.member_name)
      );
      row.appendChild(createCell(member.email));
      row.appendChild(createCell(member.phone));
      row.appendChild(createCell(formatDate(member.join_date)));

      const statusCell = document.createElement("td");
      const status = document.createElement("span");

      status.className = "status-pill";
      status.textContent = member.status || "Active";

      statusCell.appendChild(status);
      row.appendChild(statusCell);

      recentMembers.appendChild(row);
    });
  } catch (error) {
    console.error("Dashboard loading error:", error);

    totalMembers.textContent = "—";
    totalPlans.textContent = "—";
    totalSubscriptions.textContent = "—";

    recentMembers.replaceChildren();

    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 5;
    cell.className = "loading-cell";
    cell.textContent = "Could not load member records. Please check the server.";

    row.appendChild(cell);
    recentMembers.appendChild(row);

    showMessage(
      "Database data could not be loaded. Check the server and API routes.",
      true
    );
  }
}

loadDashboard();


const subscriptionForm = document.getElementById('subscriptionForm');
const subscriptionMessage = document.getElementById('subscriptionMessage');
const subscriptionTableBody = document.getElementById('subscriptionTableBody');
const tableMessage = document.getElementById('tableMessage');

const memberSelect = document.getElementById('member_id');
const planSelect = document.getElementById('plan_id');
const startDateInput = document.getElementById('start_date');
const endDateInput = document.getElementById('end_date');
const submitButton = document.getElementById('subscriptionSubmit');

let messageTimeout;
let pendingRemoveId = null;

// Show messages inside the page
function showMessage(message, type) {
    clearTimeout(messageTimeout);

    subscriptionMessage.textContent = message;
    subscriptionMessage.className = `subscription-message show ${type}`;

    if (type === 'success') {
        messageTimeout = setTimeout(() => {
            subscriptionMessage.className = 'subscription-message';
            subscriptionMessage.textContent = '';
        }, 4000);
    }
}

function addOption(select, value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
}

// Load members
async function loadMembers() {
    try {
        const response = await fetch('/api/members');

        if (!response.ok) {
            throw new Error('Could not load members.');
        }

        const members = await response.json();

        memberSelect.replaceChildren();
        addOption(memberSelect, '', 'Select a member');

        members.forEach(member => {
            addOption(
                memberSelect,
                member.member_id,
                `${member.name} (ID: ${member.member_id})`
            );
        });
    } catch (error) {
        memberSelect.replaceChildren();
        addOption(memberSelect, '', 'Unable to load members');
        showMessage(error.message, 'error');
    }
}

// Load membership plans
async function loadPlans() {
    try {
        const response = await fetch('/api/plans');

        if (!response.ok) {
            throw new Error('Could not load membership plans.');
        }

        const plans = await response.json();

        planSelect.replaceChildren();
        addOption(planSelect, '', 'Select a membership plan');

        plans.forEach(plan => {
            addOption(
                planSelect,
                plan.plan_id,
                `${plan.plan_name} — ₹${Number(plan.fee).toLocaleString('en-IN')}`
            );
        });
    } catch (error) {
        planSelect.replaceChildren();
        addOption(planSelect, '', 'Unable to load plans');
        showMessage(error.message, 'error');
    }
}

// Format dates
function formatDate(dateValue) {
    if (!dateValue) return '—';

    const date = String(dateValue).slice(0, 10);
    const parts = date.split('-');

    if (parts.length !== 3) return date;

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Create table cell
function createCell(value) {
    const cell = document.createElement('td');
    cell.textContent = value ?? '—';
    return cell;
}

// Create Remove button
function createRemoveButton(subscription) {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'subscription-remove-button';
    button.textContent = 'Remove';

    button.addEventListener('click', async () => {
        const subscriptionId = Number(subscription.subscription_id);
        console.log('Removing subscription ID:', subscriptionId);

        // First click: ask for confirmation inside the page
        if (pendingRemoveId !== subscriptionId) {
            pendingRemoveId = subscriptionId;

            showMessage(
                `Remove subscription #${subscriptionId}? Click "Confirm Remove" to continue.`,
                'error'
            );

            button.textContent = 'Confirm Remove';
            button.classList.add('confirm-remove');
            return;
        }

        // Second click: delete the record
        button.disabled = true;
        button.textContent = 'Removing...';

        try {
            const response = await fetch(
                `/api/subscriptions/${subscriptionId}`,
                { method: 'DELETE' }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || 'Unable to remove subscription.'
                );
            }

            pendingRemoveId = null;

            showMessage(
                result.message || 'Subscription removed successfully!',
                'success'
            );

            await loadSubscriptions();
        } catch (error) {
            pendingRemoveId = null;

            showMessage(error.message, 'error');

            button.disabled = false;
            button.textContent = 'Remove';
            button.classList.remove('confirm-remove');
        }
    });

    return button;
}

// Load subscriptions table
async function loadSubscriptions() {
    tableMessage.textContent = 'Loading subscriptions...';

    try {
        const response = await fetch('/api/subscriptions');

        if (!response.ok) {
            throw new Error('Unable to load subscription records.');
        }

        const subscriptions = await response.json();

        subscriptionTableBody.replaceChildren();

        if (subscriptions.length === 0) {
            const row = document.createElement('tr');
            const cell = createCell('No subscriptions found yet.');

            cell.colSpan = 7;
            cell.className = 'empty-row';

            row.appendChild(cell);
            subscriptionTableBody.appendChild(row);

            tableMessage.textContent = '0 subscription records';
            return;
        }

        subscriptions.forEach(subscription => {
            const row = document.createElement('tr');

            row.appendChild(createCell(subscription.subscription_id));
            row.appendChild(createCell(subscription.member_name));
            row.appendChild(createCell(subscription.plan_name));

            row.appendChild(
                createCell(subscription.trainer_name || 'Not assigned')
            );

            row.appendChild(
                createCell(
                    `${formatDate(subscription.start_date)} – ${formatDate(subscription.end_date)}`
                )
            );

            // Payment status badge
            const paymentCell = document.createElement('td');
            const paymentBadge = document.createElement('span');

            const paymentStatus = String(
                subscription.payment_status || 'Pending'
            ).toLowerCase();

            paymentBadge.className = 'payment-badge';

            if (paymentStatus === 'paid') {
                paymentBadge.classList.add('paid');
                paymentBadge.textContent = 'Paid';
            } else {
                paymentBadge.classList.add('pending');
                paymentBadge.textContent = 'Pending';
            }

            paymentCell.appendChild(paymentBadge);
            row.appendChild(paymentCell);

            // Remove action
            const actionCell = document.createElement('td');
            actionCell.appendChild(createRemoveButton(subscription));
            row.appendChild(actionCell);

            subscriptionTableBody.appendChild(row);
        });

        tableMessage.textContent =
            `${subscriptions.length} subscription record(s)`;
    } catch (error) {
        tableMessage.textContent = error.message;
        subscriptionTableBody.replaceChildren();

        const row = document.createElement('tr');
        const cell = createCell('Please check the server and try again.');

        cell.colSpan = 7;
        cell.className = 'empty-row';

        row.appendChild(cell);
        subscriptionTableBody.appendChild(row);
    }
}

// Validate end date
startDateInput.addEventListener('change', () => {
    endDateInput.min = startDateInput.value;

    if (
        endDateInput.value &&
        endDateInput.value < startDateInput.value
    ) {
        endDateInput.value = '';
    }
});

// Create subscription
subscriptionForm.addEventListener('submit', async event => {
    event.preventDefault();

    if (!subscriptionForm.reportValidity()) {
        return;
    }

    if (endDateInput.value < startDateInput.value) {
        showMessage(
            'End date must be on or after the start date.',
            'error'
        );
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Creating...';

    const formData = new FormData(subscriptionForm);
    const subscription = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/subscriptions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(subscription)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || 'Unable to create subscription.'
            );
        }

        pendingRemoveId = null;

        showMessage(
            result.message || 'Subscription created successfully!',
            'success'
        );

        subscriptionForm.reset();
        endDateInput.min = '';

        await loadSubscriptions();
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Create Subscription';
    }
});

// Initialize page
async function initializeSubscriptions() {
    await Promise.all([
        loadMembers(),
        loadPlans(),
        loadSubscriptions()
    ]);
}

initializeSubscriptions();

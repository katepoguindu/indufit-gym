
const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===============================
// MEMBERS - READ ALL
// ===============================
app.get('/api/members', (req, res) => {
    db.query(
        'SELECT * FROM members ORDER BY member_id ASC',
        (err, results) => {
            if (err) {
                return res.status(500).json({
                    error: 'Unable to load members'
                });
            }

            res.json(results);
        }
    );
});

// ===============================
// MEMBERS - ADD NEW
// ===============================
app.post('/api/members', (req, res) => {
    const { name, email, phone, join_date, status } = req.body;

    if (!name || !name.trim() || !email || !email.trim()) {
        return res.status(400).json({
            error: 'Name and email are required.'
        });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
        return res.status(400).json({
            error: 'Please enter a valid email address.'
        });
    }

    const sql = `
        INSERT INTO members
        (name, email, phone, join_date, status)
        VALUES (?, ?, ?, ?, ?)
    `;

    const values = [
        cleanName,
        cleanEmail,
        phone ? phone.trim() : null,
        join_date || new Date().toISOString().slice(0, 10),
        status || 'Active'
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    error: 'This email address is already registered.'
                });
            }

            console.error('Add member error:', err);

            return res.status(500).json({
                error: 'Unable to add member.'
            });
        }

        res.status(201).json({
            message: 'Member added successfully!',
            member_id: result.insertId
        });
    });
});

// ===============================
// MEMBERS - UPDATE DETAILS
// ===============================
app.put('/api/members/:id', (req, res) => {
    const memberId = Number(req.params.id);
    const { name, email, phone, join_date, status } = req.body;

    if (!Number.isInteger(memberId) || memberId < 1) {
        return res.status(400).json({
            error: 'Invalid member ID.'
        });
    }

    if (!name || !name.trim() || !email || !email.trim()) {
        return res.status(400).json({
            error: 'Name and email are required.'
        });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({
            error: 'Please enter a valid email address.'
        });
    }

    const sql = `
        UPDATE members
        SET name = ?, email = ?, phone = ?,
            join_date = ?, status = ?
        WHERE member_id = ?
    `;

    const values = [
        cleanName,
        cleanEmail,
        phone ? phone.trim() : null,
        join_date || new Date().toISOString().slice(0, 10),
        status || 'Active',
        memberId
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    error: 'This email address is already used by another member.'
                });
            }

            console.error('Update member error:', err);

            return res.status(500).json({
                error: 'Unable to update member.'
            });
        }

        if (result.affectedRows === 0) {
            return db.query(
                'SELECT member_id FROM members WHERE member_id = ?',
                [memberId],
                (checkErr, rows) => {
                    if (checkErr) {
                        return res.status(500).json({
                            error: 'Unable to verify member.'
                        });
                    }

                    if (rows.length === 0) {
                        return res.status(404).json({
                            error: 'Member not found.'
                        });
                    }

                    res.json({
                        message: 'Member details are already up to date.'
                    });
                }
            );
        }

        res.json({
            message: 'Member updated successfully!'
        });
    });
});

// ===============================
// MEMBERS - DELETE
// ===============================
app.delete('/api/members/:id', (req, res) => {
    const memberId = Number(req.params.id);

    if (!Number.isInteger(memberId) || memberId < 1) {
        return res.status(400).json({
            error: 'Invalid member ID.'
        });
    }

    db.query(
        'DELETE FROM members WHERE member_id = ?',
        [memberId],
        (err, result) => {
            if (err) {
                if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                    return res.status(409).json({
                        error: 'This member has subscriptions. Remove or reassign those subscriptions before deleting this member.'
                    });
                }

                console.error('Delete member error:', err);

                return res.status(500).json({
                    error: 'Unable to delete member.'
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: 'Member not found.'
                });
            }

            res.json({
                message: 'Member deleted successfully!'
            });
        }
    );
});

// ===============================
// MEMBERSHIP PLANS - READ ALL
// ===============================

app.get('/api/plans', (req, res) => {
    const sql = `
        SELECT *
        FROM membership_plans
        ORDER BY plan_id ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Load plans error:', err);
            return res.status(500).json({
                error: 'Unable to load membership plans.'
            });
        }

        res.json(results);
    });
});

/* MEMBERSHIP PLANS - CREATE */
app.post('/api/plans', (req, res) => {
    const { plan_name, duration_months, fee, description } = req.body;

    const duration = Number(duration_months);
    const amount = Number(fee);

    if (!plan_name || !plan_name.trim()) {
        return res.status(400).json({ error: 'Plan name is required.' });
    }

    if (!Number.isInteger(duration) || duration < 1 || duration > 120) {
        return res.status(400).json({ error: 'Duration must be between 1 and 120 months.' });
    }

    if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({ error: 'Enter a valid non-negative fee.' });
    }

    const sql = `
        INSERT INTO membership_plans
        (plan_name, duration_months, fee, description)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [
        plan_name.trim(),
        duration,
        amount,
        description ? description.trim() : null
    ], (err, result) => {
        if (err) {
            console.error('Create plan error:', err);
            return res.status(500).json({ error: 'Unable to create plan.' });
        }

        res.status(201).json({
            message: 'Membership plan created successfully!',
            plan_id: result.insertId
        });
    });
});

/* MEMBERSHIP PLANS - UPDATE */
app.put('/api/plans/:id', (req, res) => {
    const planId = Number(req.params.id);
    const { plan_name, duration_months, fee, description } = req.body;

    const duration = Number(duration_months);
    const amount = Number(fee);

    if (!Number.isInteger(planId) || planId < 1) {
        return res.status(400).json({ error: 'Invalid plan ID.' });
    }

    if (!plan_name || !plan_name.trim()) {
        return res.status(400).json({ error: 'Plan name is required.' });
    }

    if (!Number.isInteger(duration) || duration < 1 || duration > 120) {
        return res.status(400).json({ error: 'Duration must be between 1 and 120 months.' });
    }

    if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({ error: 'Enter a valid non-negative fee.' });
    }

    const sql = `
        UPDATE membership_plans
        SET plan_name = ?, duration_months = ?, fee = ?, description = ?
        WHERE plan_id = ?
    `;

    db.query(sql, [
        plan_name.trim(),
        duration,
        amount,
        description ? description.trim() : null,
        planId
    ], (err, result) => {
        if (err) {
            console.error('Update plan error:', err);
            return res.status(500).json({ error: 'Unable to update plan.' });
        }

        if (result.affectedRows === 0) {
            return db.query(
                'SELECT plan_id FROM membership_plans WHERE plan_id = ?',
                [planId],
                (checkErr, rows) => {
                    if (checkErr) {
                        return res.status(500).json({ error: 'Unable to verify plan.' });
                    }

                    if (rows.length === 0) {
                        return res.status(404).json({ error: 'Plan not found.' });
                    }

                    res.json({ message: 'Plan details are already up to date.' });
                }
            );
        }

        res.json({ message: 'Membership plan updated successfully!' });
    });
});

/* MEMBERSHIP PLANS - DELETE */
app.delete('/api/plans/:id', (req, res) => {
    const planId = Number(req.params.id);

    if (!Number.isInteger(planId) || planId < 1) {
        return res.status(400).json({ error: 'Invalid plan ID.' });
    }

    db.query(
        'DELETE FROM membership_plans WHERE plan_id = ?',
        [planId],
        (err, result) => {
            if (err) {
                if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                    return res.status(409).json({
                        error: 'This plan is used by subscriptions. Reassign or remove those subscriptions before deleting this plan.'
                    });
                }

                console.error('Delete plan error:', err);
                return res.status(500).json({ error: 'Unable to delete plan.' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Plan not found.' });
            }

            res.json({ message: 'Membership plan deleted successfully!' });
        }
    );
});

// ===============================
// SUBSCRIPTIONS - READ ALL
// ===============================
app.get('/api/subscriptions', (req, res) => {
    const sql = `
        SELECT s.*, m.name AS member_name,
               p.plan_name, p.fee
        FROM subscriptions s
        JOIN members m ON s.member_id = m.member_id
        JOIN membership_plans p ON s.plan_id = p.plan_id
        ORDER BY s.subscription_id ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({
                error: 'Unable to load subscriptions'
            });
        }

        res.json(results);
    });
});

 // CREATE SUBSCRIPTION
app.post('/api/subscriptions', (req, res) => {
    const {
        member_id,
        plan_id,
        trainer_name,
        start_date,
        end_date,
        payment_status
    } = req.body;

    const memberId = Number(member_id);
    const planId = Number(plan_id);

    if (!Number.isInteger(memberId) || memberId < 1 ||
        !Number.isInteger(planId) || planId < 1) {
        return res.status(400).json({
            error: 'Please select a valid member and membership plan.'
        });
    }

    if (!start_date || !end_date ||
        end_date < start_date) {
        return res.status(400).json({
            error: 'Please enter valid start and end dates.'
        });
    }

    const allowedStatuses = ['Paid', 'Pending'];

    if (!allowedStatuses.includes(payment_status)) {
        return res.status(400).json({
            error: 'Payment status must be Paid or Pending.'
        });
    }

    const sql = `
        INSERT INTO subscriptions
        (member_id, plan_id, trainer_name,
         start_date, end_date, payment_status)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
        memberId,
        planId,
        trainer_name ? trainer_name.trim() : null,
        start_date,
        end_date,
        payment_status
    ], (err, result) => {
        if (err) {
            console.error('Create subscription error:', err);
            return res.status(500).json({
                error: 'Unable to create subscription. Check the member, plan and database details.'
            });
        }

        res.status(201).json({
            message: 'Subscription created successfully!',
            subscription_id: result.insertId
        });
    });
});

/* REMOVE SUBSCRIPTION */
app.delete('/api/subscriptions/:id', (req, res) => {
    const subscriptionId = Number(req.params.id);

    if (!Number.isInteger(subscriptionId) || subscriptionId < 1) {
        return res.status(400).json({
            error: 'Invalid subscription ID.'
        });
    }

    const sql = `
        DELETE FROM subscriptions
        WHERE subscription_id = ?
    `;

    db.query(sql, [subscriptionId], (err, result) => {
        if (err) {
            console.error('Remove subscription error:', err);
            return res.status(500).json({
                error: 'Unable to remove subscription.'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Subscription not found.'
            });
        }

        res.json({
            message: 'Subscription removed successfully!'
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(
        `INDU ELITE FITNESS running at http://localhost:${PORT}`
    );
});

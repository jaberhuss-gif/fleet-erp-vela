const express = require('express');
const path = require('path');   
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const pool = new Pool({
  connectionString: process.env.VELA_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function parseDate(dateStr) {
  if (!dateStr || String(dateStr).trim() === '') return null;
  const str = String(dateStr).trim().split(' ')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  const parts = str.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const d = new Date(isoDate);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'OK', 
      message: 'Fleet ERP Vela API is running', 
      time: result.rows[0].now 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/debug/work-orders-columns', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'work_orders'
      ORDER BY ordinal_position
    `);

    res.json({
      count: result.rows.length,
      columns: result.rows
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// ========== Ø§Ù„Ù…ÙˆØ§Ù‚Ø¹ ==========
app.get('/api/buildings/sites', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sites ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/buildings/sites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query(
  `SELECT COUNT(*) 
   FROM work_orders wo
   WHERE wo.site = (
     SELECT name FROM sites WHERE id = $1
   )`,
  [id]
);
    if (parseInt(check.rows[0].count) > 0) {
      return res.status(400).json({ error: `Cannot delete: ${check.rows[0].count} work orders are linked to this site` });
    }
    const result = await pool.query('DELETE FROM sites WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/buildings/sites', async (req, res) => {
  try {
    const { name, region } = req.body;
    const result = await pool.query(
      'INSERT INTO sites (name, region) VALUES ($1, $2) RETURNING *',
      [name, region]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== Ø£ÙˆØ§Ù…Ø± Ø§Ù„Ø¹Ù…Ù„ ==========
app.get('/api/buildings/work-orders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        wo.*,
        wo.site AS site_name
      FROM work_orders wo
      ORDER BY wo.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Get Work Orders Error:', err);
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/buildings/work-orders', async (req, res) => {
  try {
    const {
      wo_no,
      site_id,
      area,
      category,
      priority,
      description,
      assigned_to,
      contractor
    } = req.body;

    let siteName = null;

    if (site_id) {
      const siteResult = await pool.query(
        `SELECT name
         FROM sites
         WHERE id = $1`,
        [site_id]
      );

      if (siteResult.rows.length > 0) {
        siteName = siteResult.rows[0].name;
      }
    }

    const contractorName =
      contractor && String(contractor).trim()
        ? String(contractor).trim()
        : null;

    const isContractor = contractorName ? 1 : 0;

    const result = await pool.query(
      `INSERT INTO work_orders
       (
         wo_no,
         site,
         area,
         category,
         priority,
         description,
         assigned_to,
         is_contractor,
         contractor_name,
         status,
         reported_date,
         created_at,
         updated_at
       )
       VALUES
       (
         $1, $2, $3, $4, $5, $6, $7,
         $8, $9, 'Open', CURRENT_DATE, NOW(), NOW()
       )
       RETURNING *`,
      [
        wo_no,
        siteName,
        area || null,
        category || null,
        priority || 'Normal',
        description || null,
        assigned_to || null,
        isContractor,
        contractorName
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error('Create Work Order Error:', err);
    res.status(500).json({ error: err.message });
  }
});
// Ø¥ØºÙ„Ø§Ù‚ Ø£Ù…Ø± Ø§Ù„Ø¹Ù…Ù„
app.put('/api/buildings/work-orders/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    const { work_by, labor_cost, closing_notes } = req.body;

    const labor = parseFloat(labor_cost) || 0;
    const isContractor = work_by === 'Contractor' ? 1 : 0;

    const woResult = await pool.query(
      `SELECT wo_no, contractor_name
       FROM work_orders
       WHERE id = $1`,
      [id]
    );

    if (woResult.rows.length === 0) {
      return res.status(404).json({ error: 'Work Order not found' });
    }

    const woNo = woResult.rows[0].wo_no;
    const contractorName = woResult.rows[0].contractor_name || null;

    const partsResult = await pool.query(
      `SELECT
        COALESCE(SUM(total_cost), 0) AS total,
        COALESCE(
          SUM(CASE WHEN source = 'Company' THEN total_cost ELSE 0 END), 0
        ) AS company_parts,
        COALESCE(
          SUM(CASE WHEN source = 'Contractor' THEN total_cost ELSE 0 END), 0
        ) AS contractor_parts
       FROM fleet_purchases
       WHERE reference_id = $1`,
      [woNo]
    );

    const partsCost = parseFloat(partsResult.rows[0].total) || 0;
    const contractorParts = parseFloat(partsResult.rows[0].contractor_parts) || 0;

    const finalCost = labor + partsCost;

    const contractorCost =
      (isContractor ? labor : 0) + contractorParts;

    const result = await pool.query(
      `UPDATE work_orders
       SET status = 'Closed',
           final_cost = $1,
           contractor_cost = $2,
           labor_cost = $3,
           parts_cost = $4,
           performed_by = $5,
           is_contractor = $6,
           contractor_name = $7,
           closing_notes = $8,
           completed_date = CURRENT_DATE,
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        finalCost,
        contractorCost,
        labor,
        partsCost,
        work_by || null,
        isContractor,
        contractorName,
        closing_notes || null,
        id
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error('Close Work Order Error:', err);
    res.status(500).json({ error: err.message });
  }
});
// Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø£ÙˆØ§Ù…Ø± Ø§Ù„Ø¹Ù…Ù„
// Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø£ÙˆØ§Ù…Ø± Ø§Ù„Ø¹Ù…Ù„
app.post('/api/buildings/import-work-orders', async (req, res) => {
  try {
    const { rows } = req.body;

    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    let inserted = 0;
    let skipped = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const woNo = String(row.wo_no || '').trim();

        if (
          !woNo ||
          woNo.toLowerCase() === 'wo no' ||
          !woNo.toUpperCase().startsWith('WO')
        ) {
          skipped++;
          continue;
        }

        const reportedDate =
          parseDate(row.reported_date) || new Date();

        const completionDate =
          parseDate(row.completion_date);

        const finalCost =
          parseFloat(row.final_cost) || 0;

        const isContractor =
          row.contractor || row.contractor_name ? 1 : 0;

        const contractorName =
          row.contractor_name ||
          row.contractor ||
          null;

        await pool.query(
          `INSERT INTO work_orders
           (
             wo_no,
             site,
             area,
             category,
             priority,
             description,
             assigned_to,
             is_contractor,
             contractor_name,
             status,
             reported_date,
             completed_date,
             final_cost,
             parts_used,
             closing_notes,
             created_at,
             updated_at
           )
           VALUES
           (
             $1, $2, $3, $4, $5, $6, $7, $8, $9,
             $10, $11, $12, $13, $14, $15, $16, NOW()
           )
           ON CONFLICT (wo_no) DO NOTHING`,
          [
            woNo,
            row.site || null,
            row.area || null,
            row.category || null,
            row.priority || 'Normal',
            row.description || null,
            row.assigned_to || null,
            isContractor,
            contractorName,
            row.status || 'Open',
            reportedDate,
            completionDate,
            finalCost,
            row.parts_used || null,
            row.closing_notes || null,
            reportedDate
          ]
        );

        inserted++;

      } catch (err) {
        errors.push({
          wo_no: row.wo_no,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      inserted,
      skipped,
      errors
    });

  } catch (err) {
    console.error('Import Work Orders Error:', err);
    res.status(500).json({ error: err.message });
  }
});
// ========== Ø§Ù„Ù…Ø´Ø§Ø±ÙŠØ¹ Ø§Ù„ØªØ·ÙˆÙŠØ±ÙŠØ© ==========
app.get('/api/buildings/dev-projects-test', async (req, res) => {
  try {
    const db = await pool.query(
      SELECT current_database() AS db,
             current_user AS usr,
             COUNT(*) AS projects
      FROM development_projects
    );
    res.json(db.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/buildings/dev-projects', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM development_projects ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('DEV PROJECTS ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/buildings/dev-projects', async (req, res) => {
  try {
    const { name, site_id, description, contractor, budget, status, start_date, end_date } = req.body;
    const result = await pool.query(
      `INSERT INTO development_projects (name, site_id, description, contractor, budget, status, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, site_id || null, description || null, contractor || null, budget || 0, status || 'Planned', start_date || null, end_date || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ø¥ØºÙ„Ø§Ù‚ Ù…Ø´Ø±ÙˆØ¹
app.put('/api/buildings/dev-projects/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    const { work_by, labor_cost, closing_notes } = req.body;

    const labor = parseFloat(labor_cost) || 0;
    const contractorLabor = work_by === 'Contractor' ? labor : 0;
    const companyLabor = work_by === 'Company' ? labor : 0;

    const projResult = await pool.query('SELECT id FROM development_projects WHERE id = $1', [id]);
    if (projResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const refId = 'PRJ-' + String(id).padStart(4, '0');

    const partsResult = await pool.query(
      `SELECT 
        COALESCE(SUM(total_cost), 0) as total,
        COALESCE(SUM(CASE WHEN source = 'Company' THEN total_cost ELSE 0 END), 0) as company_parts,
        COALESCE(SUM(CASE WHEN source = 'Contractor' THEN total_cost ELSE 0 END), 0) as contractor_parts
       FROM fleet_purchases 
       WHERE reference_id = $1`,
      [refId]
    );

    const partsCost = parseFloat(partsResult.rows[0].total) || 0;
    const companyParts = parseFloat(partsResult.rows[0].company_parts) || 0;
    const contractorParts = parseFloat(partsResult.rows[0].contractor_parts) || 0;

    const companyTotal = companyLabor + companyParts;
    const contractorTotal = contractorLabor + contractorParts;
    const totalCost = companyTotal + contractorTotal;

    const result = await pool.query(
      `UPDATE development_projects 
       SET status = 'Completed', 
           total_cost = $1,
           work_by = $2,
           labor_cost = $3,
           parts_cost = $4,
           company_labor = $5,
           contractor_labor = $6,
           company_total = $7,
           contractor_total = $8
       WHERE id = $9 RETURNING *`,
      [totalCost, work_by, labor, partsCost, companyLabor, contractorLabor, companyTotal, contractorTotal, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ… ==========
app.get('/api/buildings/dashboard', async (req, res) => {
  try {
    const woCount = await pool.query('SELECT COUNT(*) FROM work_orders');
    const projCount = await pool.query('SELECT COUNT(*) FROM development_projects');
    const siteCount = await pool.query('SELECT COUNT(*) FROM sites');
    const purchaseCount = await pool.query('SELECT COUNT(*) FROM fleet_purchases');
    const totalCost = await pool.query('SELECT COALESCE(SUM(final_cost), 0) as total FROM work_orders WHERE status = $1', ['Closed']);
    const totalPurchases = await pool.query('SELECT COALESCE(SUM(total_cost), 0) as total FROM fleet_purchases');
    res.json({
      totalWO: parseInt(woCount.rows[0].count),
      totalProjects: parseInt(projCount.rows[0].count),
      totalSites: parseInt(siteCount.rows[0].count),
      totalPurchases: parseInt(purchaseCount.rows[0].count),
      totalCost: parseFloat(totalCost.rows[0].total),
      totalPurchasesCost: parseFloat(totalPurchases.rows[0].total),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø´Ù‡Ø±ÙŠ ==========
app.get('/api/buildings/monthly-report', async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month);
    const y = parseInt(year);

    const woResult = await pool.query(
      `SELECT 
        COALESCE(SUM(contractor_labor), 0) as contractor_labor,
        COALESCE(SUM(company_labor), 0) as company_labor
       FROM work_orders 
       WHERE EXTRACT(MONTH FROM COALESCE(closed_at, created_at)) = $1 
       AND EXTRACT(YEAR FROM COALESCE(closed_at, created_at)) = $2
       AND status = 'Closed'`,
      [m, y]
    );

    const devResult = await pool.query(
      `SELECT 
        COALESCE(SUM(contractor_labor), 0) as contractor_labor,
        COALESCE(SUM(company_labor), 0) as company_labor
       FROM development_projects 
       WHERE EXTRACT(MONTH FROM COALESCE(start_date, created_at)) = $1 
       AND EXTRACT(YEAR FROM COALESCE(start_date, created_at)) = $2
       AND status = 'Completed'`,
      [m, y]
    );

    const partsWO = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN source = 'Contractor' THEN total_cost ELSE 0 END), 0) as contractor_parts,
        COALESCE(SUM(CASE WHEN source = 'Company' THEN total_cost ELSE 0 END), 0) as company_parts
       FROM fleet_purchases 
       WHERE EXTRACT(MONTH FROM purchase_date) = $1 
       AND EXTRACT(YEAR FROM purchase_date) = $2
       AND reference_id LIKE 'WO%'`,
      [m, y]
    );

    const partsDev = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN source = 'Contractor' THEN total_cost ELSE 0 END), 0) as contractor_parts,
        COALESCE(SUM(CASE WHEN source = 'Company' THEN total_cost ELSE 0 END), 0) as company_parts
       FROM fleet_purchases 
       WHERE EXTRACT(MONTH FROM purchase_date) = $1 
       AND EXTRACT(YEAR FROM purchase_date) = $2
       AND reference_id LIKE 'PRJ%'`,
      [m, y]
    );

    const contractorLaborWO = parseFloat(woResult.rows[0].contractor_labor) || 0;
    const companyLaborWO = parseFloat(woResult.rows[0].company_labor) || 0;
    const contractorLaborDev = parseFloat(devResult.rows[0].contractor_labor) || 0;
    const companyLaborDev = parseFloat(devResult.rows[0].company_labor) || 0;

    const contractorPartsWO = parseFloat(partsWO.rows[0].contractor_parts) || 0;
    const companyPartsWO = parseFloat(partsWO.rows[0].company_parts) || 0;
    const contractorPartsDev = parseFloat(partsDev.rows[0].contractor_parts) || 0;
    const companyPartsDev = parseFloat(partsDev.rows[0].company_parts) || 0;

    const totalContractorLabor = contractorLaborWO + contractorLaborDev;
    const totalCompanyLabor = companyLaborWO + companyLaborDev;
    const totalContractorParts = contractorPartsWO + contractorPartsDev;
    const totalCompanyParts = companyPartsWO + companyPartsDev;

    const totalLabor = totalContractorLabor + totalCompanyLabor;
    const totalParts = totalContractorParts + totalCompanyParts;
    const grandTotal = totalLabor + totalParts;

    res.json({
      month: m,
      year: y,
      contractorLaborWO,
      contractorLaborDev,
      contractorPartsWO,
      contractorPartsDev,
      companyLaborWO,
      companyLaborDev,
      companyPartsWO,
      companyPartsDev,
      totalContractorLabor,
      totalCompanyLabor,
      totalContractorParts,
      totalCompanyParts,
      totalLabor,
      totalParts,
      grandTotal,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø´Ø§Ù…Ù„ ==========
app.post('/api/buildings/import-all', async (req, res) => {
  try {
    const { devProjects, purchases, devTasks, parts, siteTasks } = req.body;
    const results = { devProjects: 0, purchases: 0, devTasks: 0, parts: 0, siteTasks: 0, errors: [] };

    if (devProjects && Array.isArray(devProjects)) {
      for (const p of devProjects) {
        try {
          if (!p.id || p.id.trim() === '') continue;
          let site_id = null;
          if (p.location && p.location.trim() !== '') {
            const siteResult = await pool.query('SELECT id FROM sites WHERE name = $1', [p.location.trim()]);
            if (siteResult.rows.length > 0) site_id = siteResult.rows[0].id;
          }
          await pool.query(
            `INSERT INTO development_projects (name, site_id, description, contractor, budget, status, start_date, end_date, total_cost)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
            [p.description || p.id, site_id, p.description || null, p.contractor || null,
             parseFloat(p.total_cost) || 0, p.status || 'Planned',
             parseDate(p.start_date), parseDate(p.end_date), parseFloat(p.total_cost) || 0]
          );
          results.devProjects++;
        } catch (err) {
          results.errors.push({ type: 'devProject', id: p.id, error: err.message });
        }
      }
    }

    if (purchases && Array.isArray(purchases)) {
      for (const p of purchases) {
        try {
          if (!p.purchase_id || p.purchase_id.trim() === '') continue;
          await pool.query(
            `INSERT INTO fleet_purchases (purchase_id, type, reference_id, item_name, quantity, unit_cost, total_cost, supplier, source, purchase_date, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (purchase_id) DO NOTHING`,
            [p.purchase_id.trim(), p.type || null, p.reference_id || null, p.item_name || null,
             parseInt(p.quantity) || 0, parseFloat(p.unit_cost) || 0, parseFloat(p.total_cost) || 0,
             p.supplier || null, p.source || null, parseDate(p.purchase_date), p.notes || null]
          );
          results.purchases++;
        } catch (err) {
          results.errors.push({ type: 'purchase', id: p.purchase_id, error: err.message });
        }
      }
    }

    if (devTasks && Array.isArray(devTasks)) {
      for (const t of devTasks) {
        try {
          if (!t.id || t.id.trim() === '') continue;
          await pool.query(
            `INSERT INTO dev_tasks (task_id, project_id, task_name, cost, contractor, status)
             VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (task_id) DO NOTHING`,
            [t.id.trim(), t.project_id || null, t.task_name || null, parseFloat(t.cost) || 0, t.contractor || null, t.status || 'Pending']
          );
          results.devTasks++;
        } catch (err) {
          results.errors.push({ type: 'devTask', id: t.id, error: err.message });
        }
      }
    }

    if (parts && Array.isArray(parts)) {
      for (const p of parts) {
        try {
          if (!p.id || p.id.trim() === '') continue;
          await pool.query(
            `INSERT INTO parts (part_id, wo_no, part_name, quantity, unit_price, total_price)
             VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (part_id) DO NOTHING`,
            [p.id.trim(), p.wo_no || null, p.part_name || null, parseInt(p.quantity) || 0, parseFloat(p.unit_price) || 0, parseFloat(p.total_price) || 0]
          );
          results.parts++;
        } catch (err) {
          results.errors.push({ type: 'part', id: p.id, error: err.message });
        }
      }
    }

    if (siteTasks && Array.isArray(siteTasks)) {
      for (const t of siteTasks) {
        try {
          if (!t.id || t.id.trim() === '') continue;
          let site_id = null;
          if (t.site_name && t.site_name.trim() !== '') {
            const siteResult = await pool.query('SELECT id FROM sites WHERE name = $1', [t.site_name.trim()]);
            if (siteResult.rows.length > 0) site_id = siteResult.rows[0].id;
          }
          await pool.query(
            `INSERT INTO site_tasks (site_id, description, start_date, close_date, amount, status, assigned_to)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [site_id, t.task_description || null, parseDate(t.start_date), parseDate(t.close_date), parseFloat(t.amount) || 0, t.status || 'Open', t.assigned_to || null]
          );
          results.siteTasks++;
        } catch (err) {
          results.errors.push({ type: 'siteTask', id: t.id, error: err.message });
        }
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== Ø¬Ù„Ø¨ Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª ==========
app.get('/api/buildings/purchases', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM fleet_purchases ORDER BY purchase_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ØªØµØ­ÙŠØ­ ØªÙˆØ§Ø±ÙŠØ® Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª ==========
app.post('/api/buildings/fix-purchase-dates', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE fleet_purchases SET purchase_date = created_at WHERE purchase_date IS NULL`
    );
    res.json({ fixed: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ø´Ù‡Ø± ==========
app.post('/api/buildings/close-month', async (req, res) => {
  try {
    const { month, year, notes } = req.body;
    const m = parseInt(month);
    const y = parseInt(year);

    if (!m || !y) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const existing = await pool.query(
      'SELECT id FROM monthly_closures WHERE month = $1 AND year = $2',
      [m, y]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'This month is already closed' });
    }

    // ===== Ù‡Ù„ Ø§Ù„Ø´Ù‡Ø± ÙÙŠ 7 Ø£Ùˆ 8 (Ù…Ø·Ø§Ø¨Ù‚Ø© Google Sheet) Ø£Ù… 9+ (Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ø¬Ø¯ÙŠØ¯)ØŸ =====
    const useLegacyMode = (y === 2026 && (m === 7 || m === 8));

    let woCompanyLabor = 0, woContractorLabor = 0, woCompanyParts = 0, woContractorParts = 0;
    let devCompanyLabor = 0, devContractorLabor = 0, devCompanyParts = 0, devContractorParts = 0;
    let woCountCompany = 0, woCountContractor = 0, devCountCompany = 0, devCountContractor = 0;

    if (useLegacyMode) {
      // ===== Ø§Ù„ÙˆØ¶Ø¹ Ø§Ù„Ù‚Ø¯ÙŠÙ… (Ù…Ø·Ø§Ø¨Ù‚Ø© Google Sheet) =====
      const woLegacy = await pool.query(
        `SELECT 
          COALESCE(SUM(final_cost), 0) as total_final_cost,
          COALESCE(SUM(contractor_cost), 0) as total_contractor_cost,
          COUNT(*) as count
         FROM work_orders 
         WHERE EXTRACT(MONTH FROM created_at) = $1 
         AND EXTRACT(YEAR FROM created_at) = $2
         AND status = 'Closed'`,
        [m, y]
      );

      woContractorLabor = parseFloat(woLegacy.rows[0].total_final_cost) || 0;
      woCountContractor = parseInt(woLegacy.rows[0].count) || 0;
      woCountCompany = 0;

      const devLegacy = await pool.query(
        `SELECT 
          COALESCE(SUM(total_cost), 0) as total_cost,
          COUNT(*) as count
         FROM development_projects 
         WHERE EXTRACT(MONTH FROM COALESCE(start_date, created_at)) = $1 
         AND EXTRACT(YEAR FROM COALESCE(start_date, created_at)) = $2`,
        [m, y]
      );

      devContractorLabor = parseFloat(devLegacy.rows[0].total_cost) || 0;
      devCountContractor = parseInt(devLegacy.rows[0].count) || 0;
      devCountCompany = 0;

      const partsWOLegacy = await pool.query(
        `SELECT COALESCE(SUM(total_cost), 0) as total
         FROM fleet_purchases 
         WHERE EXTRACT(MONTH FROM purchase_date) = $1 
         AND EXTRACT(YEAR FROM purchase_date) = $2
         AND reference_id LIKE 'WO%'
         AND source = 'Contractor'`,
        [m, y]
      );

      woContractorParts = parseFloat(partsWOLegacy.rows[0].total) || 0;

      const partsDevLegacy = await pool.query(
        `SELECT COALESCE(SUM(total_cost), 0) as total
         FROM fleet_purchases 
         WHERE EXTRACT(MONTH FROM purchase_date) = $1 
         AND EXTRACT(YEAR FROM purchase_date) = $2
         AND reference_id LIKE 'PRJ%'
         AND source = 'Contractor'`,
        [m, y]
      );

      devContractorParts = parseFloat(partsDevLegacy.rows[0].total) || 0;

    } else {
      // ===== Ø§Ù„ÙˆØ¶Ø¹ Ø§Ù„Ø¬Ø¯ÙŠØ¯ (Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ø¬Ø¯ÙŠØ¯) =====
      const woResult = await pool.query(
        `SELECT 
          COUNT(CASE WHEN work_by = 'Company' THEN 1 END) as count_company,
          COUNT(CASE WHEN work_by = 'Contractor' THEN 1 END) as count_contractor,
          COALESCE(SUM(company_labor), 0) as company_labor,
          COALESCE(SUM(contractor_labor), 0) as contractor_labor
         FROM work_orders 
         WHERE EXTRACT(MONTH FROM COALESCE(closed_at, created_at)) = $1 
         AND EXTRACT(YEAR FROM COALESCE(closed_at, created_at)) = $2
         AND status = 'Closed'`,
        [m, y]
      );

      woCountCompany = parseInt(woResult.rows[0].count_company) || 0;
      woCountContractor = parseInt(woResult.rows[0].count_contractor) || 0;
      woCompanyLabor = parseFloat(woResult.rows[0].company_labor) || 0;
      woContractorLabor = parseFloat(woResult.rows[0].contractor_labor) || 0;

      const woParts = await pool.query(
        `SELECT 
          COALESCE(SUM(CASE WHEN source = 'Company' THEN total_cost ELSE 0 END), 0) as company_parts,
          COALESCE(SUM(CASE WHEN source = 'Contractor' THEN total_cost ELSE 0 END), 0) as contractor_parts
         FROM fleet_purchases 
         WHERE EXTRACT(MONTH FROM purchase_date) = $1 
         AND EXTRACT(YEAR FROM purchase_date) = $2
         AND reference_id LIKE 'WO%'`,
        [m, y]
      );

      woCompanyParts = parseFloat(woParts.rows[0].company_parts) || 0;
      woContractorParts = parseFloat(woParts.rows[0].contractor_parts) || 0;

      const devResult = await pool.query(
        `SELECT 
          COUNT(CASE WHEN work_by = 'Company' THEN 1 END) as count_company,
          COUNT(CASE WHEN work_by = 'Contractor' THEN 1 END) as count_contractor,
          COALESCE(SUM(company_labor), 0) as company_labor,
          COALESCE(SUM(contractor_labor), 0) as contractor_labor
         FROM development_projects 
         WHERE EXTRACT(MONTH FROM COALESCE(start_date, created_at)) = $1 
         AND EXTRACT(YEAR FROM COALESCE(start_date, created_at)) = $2
         AND status = 'Completed'`,
        [m, y]
      );

      devCountCompany = parseInt(devResult.rows[0].count_company) || 0;
      devCountContractor = parseInt(devResult.rows[0].count_contractor) || 0;
      devCompanyLabor = parseFloat(devResult.rows[0].company_labor) || 0;
      devContractorLabor = parseFloat(devResult.rows[0].contractor_labor) || 0;

      const devParts = await pool.query(
        `SELECT 
          COALESCE(SUM(CASE WHEN source = 'Company' THEN total_cost ELSE 0 END), 0) as company_parts,
          COALESCE(SUM(CASE WHEN source = 'Contractor' THEN total_cost ELSE 0 END), 0) as contractor_parts
         FROM fleet_purchases 
         WHERE EXTRACT(MONTH FROM purchase_date) = $1 
         AND EXTRACT(YEAR FROM purchase_date) = $2
         AND reference_id LIKE 'PRJ%'`,
        [m, y]
      );

      devCompanyParts = parseFloat(devParts.rows[0].company_parts) || 0;
      devContractorParts = parseFloat(devParts.rows[0].contractor_parts) || 0;
    }

    const totalCompanyLabor = woCompanyLabor + devCompanyLabor;
    const totalContractorLabor = woContractorLabor + devContractorLabor;
    const totalCompanyParts = woCompanyParts + devCompanyParts;
    const totalContractorParts = woContractorParts + devContractorParts;
    const totalCompany = totalCompanyLabor + totalCompanyParts;
    const totalContractor = totalContractorLabor + totalContractorParts;
    const grandTotal = totalCompany + totalContractor;

    const maintenanceBudget = 20577;
    const developmentBudget = 132551;
    const totalBudget = maintenanceBudget + developmentBudget;

    const maintenanceActual = woCompanyLabor + woContractorLabor + woCompanyParts + woContractorParts;
    const developmentActual = devCompanyLabor + devContractorLabor + devCompanyParts + devContractorParts;

    const maintenanceSavings = maintenanceBudget - maintenanceActual;
    const developmentSavings = developmentBudget - developmentActual;
    const totalSavings = totalBudget - grandTotal;

    const maintenanceSavingsPct = maintenanceBudget > 0 ? (maintenanceSavings / maintenanceBudget) * 100 : 0;
    const developmentSavingsPct = developmentBudget > 0 ? (developmentSavings / developmentBudget) * 100 : 0;
    const totalSavingsPct = totalBudget > 0 ? (totalSavings / totalBudget) * 100 : 0;

    const result = await pool.query(
      `INSERT INTO monthly_closures (
        month, year,
        wo_count_company, wo_count_contractor,
        wo_company_labor, wo_contractor_labor, wo_company_parts, wo_contractor_parts,
        dev_count_company, dev_count_contractor,
        dev_company_labor, dev_contractor_labor, dev_company_parts, dev_contractor_parts,
        total_company_labor, total_contractor_labor, total_company_parts, total_contractor_parts,
        total_company, total_contractor, grand_total,
        maintenance_budget, development_budget, total_budget,
        maintenance_savings, development_savings, total_savings,
        maintenance_savings_pct, development_savings_pct, total_savings_pct,
        is_locked, closed_by, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33
      ) RETURNING *`,
      [
        m, y,
        woCountCompany, woCountContractor,
        woCompanyLabor, woContractorLabor, woCompanyParts, woContractorParts,
        devCountCompany, devCountContractor,
        devCompanyLabor, devContractorLabor, devCompanyParts, devContractorParts,
        totalCompanyLabor, totalContractorLabor, totalCompanyParts, totalContractorParts,
        totalCompany, totalContractor, grandTotal,
        maintenanceBudget, developmentBudget, totalBudget,
        maintenanceSavings, developmentSavings, totalSavings,
        maintenanceSavingsPct, developmentSavingsPct, totalSavingsPct,
        true, 'owner', notes || null
      ]
    );

    res.json({ success: true, closure: result.rows[0], mode: useLegacyMode ? 'legacy' : 'new' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== Ø¬Ù„Ø¨ Ø§Ù„Ø£Ø´Ù‡Ø± Ø§Ù„Ù…ØºÙ„Ù‚Ø© ==========
app.get('/api/buildings/monthly-closures', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM monthly_closures ORDER BY year DESC, month DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== Ø¥Ø¹Ø§Ø¯Ø© ÙØªØ­ Ø´Ù‡Ø± ==========
app.post('/api/buildings/reopen-month/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.body;

    if (user !== 'owner') {
      return res.status(403).json({ error: 'Only owner can reopen a month' });
    }

    const result = await pool.query(
      `UPDATE monthly_closures SET is_locked = FALSE WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Closure not found' });
    }

    res.json({ success: true, closure: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ù‚ÙÙ„ Ø§Ù„Ø´Ù‡Ø± ==========
app.get('/api/buildings/check-month-lock', async (req, res) => {
  try {
    const { month, year } = req.query;
    const result = await pool.query(
      'SELECT * FROM monthly_closures WHERE month = $1 AND year = $2',
      [month, year]
    );
    res.json({ 
      isLocked: result.rows.length > 0 && result.rows[0].is_locked,
      closure: result.rows[0] || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ØªÙ‚Ø±ÙŠØ± ÙØªØ±Ø© Ø²Ù…Ù†ÙŠØ© ==========
app.get('/api/buildings/report-range', async (req, res) => {
  try {
    const { from, to } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to are required (YYYY-MM)' });
    }

    const [fromYear, fromMonth] = from.split('-').map(Number);
    const [toYear, toMonth] = to.split('-').map(Number);

    const result = await pool.query(
      `SELECT * FROM monthly_closures 
       WHERE (year * 100 + month) >= $1 
       AND (year * 100 + month) <= $2
       ORDER BY year, month`,
      [fromYear * 100 + fromMonth, toYear * 100 + toMonth]
    );

    const totals = {
      wo_count_company: 0,
      wo_count_contractor: 0,
      dev_count_company: 0,
      dev_count_contractor: 0,
      total_company_labor: 0,
      total_contractor_labor: 0,
      total_company_parts: 0,
      total_contractor_parts: 0,
      total_company: 0,
      total_contractor: 0,
      grand_total: 0,
      maintenance_budget: 0,
      development_budget: 0,
      total_budget: 0,
      maintenance_savings: 0,
      development_savings: 0,
      total_savings: 0,
    };

    for (const c of result.rows) {
      totals.wo_count_company += c.wo_count_company || 0;
      totals.wo_count_contractor += c.wo_count_contractor || 0;
      totals.dev_count_company += c.dev_count_company || 0;
      totals.dev_count_contractor += c.dev_count_contractor || 0;
      totals.total_company_labor += parseFloat(c.total_company_labor) || 0;
      totals.total_contractor_labor += parseFloat(c.total_contractor_labor) || 0;
      totals.total_company_parts += parseFloat(c.total_company_parts) || 0;
      totals.total_contractor_parts += parseFloat(c.total_contractor_parts) || 0;
      totals.total_company += parseFloat(c.total_company) || 0;
      totals.total_contractor += parseFloat(c.total_contractor) || 0;
      totals.grand_total += parseFloat(c.grand_total) || 0;
      totals.maintenance_budget += parseFloat(c.maintenance_budget) || 0;
      totals.development_budget += parseFloat(c.development_budget) || 0;
      totals.total_budget += parseFloat(c.total_budget) || 0;
      totals.maintenance_savings += parseFloat(c.maintenance_savings) || 0;
      totals.development_savings += parseFloat(c.development_savings) || 0;
      totals.total_savings += parseFloat(c.total_savings) || 0;
    }

    totals.maintenance_savings_pct = totals.maintenance_budget > 0 
      ? (totals.maintenance_savings / totals.maintenance_budget) * 100 : 0;
    totals.development_savings_pct = totals.development_budget > 0 
      ? (totals.development_savings / totals.development_budget) * 100 : 0;
    totals.total_savings_pct = totals.total_budget > 0 
      ? (totals.total_savings / totals.total_budget) * 100 : 0;

    res.json({
      from,
      to,
      months: result.rows,
      totals,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ========== GM Dashboard (Ø¢Ø®Ø± 3 Ø£Ø´Ù‡Ø±) ==========
app.get('/api/buildings/gm-dashboard', async (req, res) => {
  try {
    // Ø¬Ù„Ø¨ Ø¢Ø®Ø± 3 Ø£Ø´Ù‡Ø± Ù…ØºÙ„Ù‚Ø©
    const closuresResult = await pool.query(
      `SELECT * FROM monthly_closures 
       ORDER BY year DESC, month DESC 
       LIMIT 3`
    );

    // Ø¹ÙƒØ³ Ø§Ù„ØªØ±ØªÙŠØ¨ Ù„ÙŠØ¸Ù‡Ø± Ø§Ù„Ø£Ù‚Ø¯Ù… Ø£ÙˆÙ„Ø§Ù‹
    const closures = closuresResult.rows.reverse();

    // Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠØ§Øª
    const totals = {
      wo_count_company: 0,
      wo_count_contractor: 0,
      dev_count_company: 0,
      dev_count_contractor: 0,
      total_company: 0,
      total_contractor: 0,
      grand_total: 0,
      total_budget: 0,
      total_savings: 0,
      maintenance_savings: 0,
      development_savings: 0,
    };

    for (const c of closures) {
      totals.wo_count_company += c.wo_count_company || 0;
      totals.wo_count_contractor += c.wo_count_contractor || 0;
      totals.dev_count_company += c.dev_count_company || 0;
      totals.dev_count_contractor += c.dev_count_contractor || 0;
      totals.total_company += parseFloat(c.total_company) || 0;
      totals.total_contractor += parseFloat(c.total_contractor) || 0;
      totals.grand_total += parseFloat(c.grand_total) || 0;
      totals.total_budget += parseFloat(c.total_budget) || 0;
      totals.total_savings += parseFloat(c.total_savings) || 0;
      totals.maintenance_savings += parseFloat(c.maintenance_savings) || 0;
      totals.development_savings += parseFloat(c.development_savings) || 0;
    }

    totals.total_savings_pct = totals.total_budget > 0 
      ? (totals.total_savings / totals.total_budget) * 100 : 0;

    res.json({
      months: closures,
      totals,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ============================================================
// FLEET MANAGEMENT - VEHICLES
// ============================================================

// Ø¬Ù„Ø¨ ÙƒÙ„ Ø§Ù„Ø³ÙŠØ§Ø±Ø§Øª
app.get('/api/fleet/vehicles', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM vehicles';
    const params = [];

    if (search) {
      query += ` WHERE 
        plate ILIKE $1 OR 
        plate_number ILIKE $1 OR 
        make ILIKE $1 OR 
        model ILIKE $1 OR 
        driver_name ILIKE $1 OR 
        driver ILIKE $1 OR
        location ILIKE $1`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY id DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ø¬Ù„Ø¨ Ø³ÙŠØ§Ø±Ø© ÙˆØ§Ø­Ø¯Ø©
app.get('/api/fleet/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM vehicles WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ø¥Ø¶Ø§ÙØ© Ø³ÙŠØ§Ø±Ø© Ø¬Ø¯ÙŠØ¯Ø©
app.post('/api/fleet/vehicles', async (req, res) => {
  try {
    const {
      plate_number,
      plate_code,
      plate,
      make,
      model,
      year,
      location,
      driver,
      driver_name,
      phone,
      driver_phone,
      current_km,
      last_oil_km,
      oil_change_interval,
      last_oil_change_date,
      status,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO vehicles 
       (plate_number, plate_code, plate, make, model, year, location, driver, driver_name, phone, driver_phone, current_km, last_oil_km, oil_change_interval, last_oil_change_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        plate_number || null,
        plate_code || null,
        plate || (plate_number && plate_code ? `${plate_number} ${plate_code}` : null),
        make || null,
        model || null,
        year || null,
        location || null,
        driver || null,
        driver_name || null,
        phone || null,
        driver_phone || null,
        current_km || 0,
        last_oil_km || 0,
        oil_change_interval || 5000,
        last_oil_change_date || null,
        status || 'Active',
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ØªØ¹Ø¯ÙŠÙ„ Ø³ÙŠØ§Ø±Ø©
app.put('/api/fleet/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      plate_number,
      plate_code,
      plate,
      make,
      model,
      year,
      location,
      driver,
      driver_name,
      phone,
      driver_phone,
      current_km,
      last_oil_km,
      oil_change_interval,
      last_oil_change_date,
      status,
    } = req.body;

    const result = await pool.query(
      `UPDATE vehicles SET
        plate_number = $1,
        plate_code = $2,
        plate = $3,
        make = $4,
        model = $5,
        year = $6,
        location = $7,
        driver = $8,
        driver_name = $9,
        phone = $10,
        driver_phone = $11,
        current_km = $12,
        last_oil_km = $13,
        oil_change_interval = $14,
        last_oil_change_date = $15,
        status = $16,
        updated_at = NOW()
       WHERE id = $17 RETURNING *`,
      [
        plate_number || null,
        plate_code || null,
        plate || null,
        make || null,
        model || null,
        year || null,
        location || null,
        driver || null,
        driver_name || null,
        phone || null,
        driver_phone || null,
        current_km || 0,
        last_oil_km || 0,
        oil_change_interval || 5000,
        last_oil_change_date || null,
        status || 'Active',
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ø­Ø°Ù Ø³ÙŠØ§Ø±Ø©
app.delete('/api/fleet/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM vehicles WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ============================================================
// FLEET MANAGEMENT - KM RECORDS
// ============================================================

// Ø¬Ù„Ø¨ Ù‚Ø±Ø§Ø¡Ø§Øª Ø§Ù„Ø¹Ø¯Ø§Ø¯ (Ù…Ø¹ ÙÙ„ØªØ±Ø© Ø§Ø®ØªÙŠØ§Ø±ÙŠØ©)
app.get('/api/fleet/km-records', async (req, res) => {
  try {
    const { vehicle_id, plate, from_date, to_date, limit } = req.query;
    
    let query = `
      SELECT km.*, v.plate_number, v.plate_code
      FROM km_records km
      LEFT JOIN vehicles v ON km.vehicle_id = v.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (vehicle_id) {
      query += ` AND km.vehicle_id = $${paramIndex}`;
      params.push(vehicle_id);
      paramIndex++;
    }

    if (plate) {
      query += ` AND km.plate ILIKE $${paramIndex}`;
      params.push(`%${plate}%`);
      paramIndex++;
    }

    if (from_date) {
      query += ` AND km.reading_date >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      query += ` AND km.reading_date <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    query += ' ORDER BY km.reading_date DESC, km.id DESC';

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
    } else {
      query += ' LIMIT 500';
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ø¬Ù„Ø¨ Ù‚Ø±Ø§Ø¡Ø© ÙˆØ§Ø­Ø¯Ø©
app.get('/api/fleet/km-records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM km_records WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ø¥Ø¶Ø§ÙØ© Ù‚Ø±Ø§Ø¡Ø© Ø¬Ø¯ÙŠØ¯Ø©
app.post('/api/fleet/km-records', async (req, res) => {
  try {
    const { vehicle_id, plate, reading_km, reading_date, is_oil_change, notes } = req.body;

    if (!vehicle_id || !reading_km || !reading_date) {
      return res.status(400).json({ error: 'vehicle_id, reading_km, and reading_date are required' });
    }

    const result = await pool.query(
      `INSERT INTO km_records 
       (vehicle_id, plate, reading_km, reading_date, is_oil_change, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [vehicle_id, plate || null, reading_km, reading_date, is_oil_change || 0, notes || null]
    );

    // ØªØ­Ø¯ÙŠØ« current_km ÙÙŠ Ø¬Ø¯ÙˆÙ„ vehicles
    await pool.query(
      `UPDATE vehicles 
       SET current_km = $1, meter_updated_at = NOW() 
       WHERE id = $2 AND current_km < $1`,
      [reading_km, vehicle_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ø­Ø°Ù Ù‚Ø±Ø§Ø¡Ø©
app.delete('/api/fleet/km-records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM km_records WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ============================================================
// FLEET MANAGEMENT - DAILY COMPLIANCE
// ============================================================

// ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø§Ù„ØªØ²Ø§Ù… Ø§Ù„ÙŠÙˆÙ…ÙŠ
app.get('/api/fleet/daily-compliance', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // 1. ÙƒÙ„ Ø§Ù„Ø³ÙŠØ§Ø±Ø§Øª
    const vehiclesResult = await pool.query(
      `SELECT id, plate_number, plate_code, plate, make, model, driver, driver_name, phone, driver_phone, location 
       FROM vehicles 
       ORDER BY plate_number, plate_code`
    );

    // 2. Ø§Ù„Ù‚Ø±Ø§Ø¡Ø§Øª ÙÙŠ Ø§Ù„ÙŠÙˆÙ… Ø§Ù„Ù…Ø­Ø¯Ø¯
    const kmResult = await pool.query(
      `SELECT DISTINCT ON (vehicle_id) 
        vehicle_id, reading_km, reading_date, created_at
       FROM km_records 
       WHERE DATE(created_at) = $1
       ORDER BY vehicle_id, created_at DESC`,
      [targetDate]
    );

    // 3. Ø±Ø¨Ø· Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª
    const kmMap = {};
    kmResult.rows.forEach((r) => {
      kmMap[r.vehicle_id] = r;
    });

    const submitted = [];
    const pending = [];

    for (const v of vehiclesResult.rows) {
      const reading = kmMap[v.id];
      const item = {
        id: v.id,
        plate: `${v.plate_number} ${v.plate_code}`,
        plate_number: v.plate_number,
        plate_code: v.plate_code,
        make: v.make,
        model: v.model,
        driver: v.driver_name || v.driver || 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯',
        phone: v.driver_phone || v.phone || '',
        location: v.location,
        reading_km: reading ? reading.reading_km : null,
        submitted_at: reading ? reading.created_at : null,
      };

      if (reading) {
        submitted.push(item);
      } else {
        pending.push(item);
      }
    }

    res.json({
      date: targetDate,
      total: vehiclesResult.rows.length,
      submitted_count: submitted.length,
      pending_count: pending.length,
      compliance_pct: vehiclesResult.rows.length > 0 
        ? (submitted.length / vehiclesResult.rows.length) * 100 
        : 0,
      submitted,
      pending,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ============================================================
// FLEET MANAGEMENT - DRIVERS
// ============================================================

app.get('/api/fleet/drivers', async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT d.*, v.plate_number, v.plate_code, v.make, v.model
      FROM drivers d
      LEFT JOIN vehicles v ON d.vehicle_id = v.id
    `;
    const params = [];

    if (search) {
      query += ` WHERE 
        d.name ILIKE $1 OR 
        d.phone ILIKE $1 OR 
        d.license_no ILIKE $1 OR 
        d.nationality ILIKE $1`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY d.id DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/fleet/drivers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM drivers WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fleet/drivers', async (req, res) => {
  try {
    const { name, phone, license_no, license_expiry, nationality, vehicle_id, status, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO drivers (name, phone, license_no, license_expiry, nationality, vehicle_id, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, phone, license_no, license_expiry || null, nationality, vehicle_id || null, status || 'Active', notes || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/fleet/drivers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, license_no, license_expiry, nationality, vehicle_id, status, notes } = req.body;
    
    // 1. ØªØ­Ø¯ÙŠØ« Ø¬Ø¯ÙˆÙ„ drivers
    const result = await pool.query(
      `UPDATE drivers SET
        name = $1, phone = $2, license_no = $3, license_expiry = $4,
        nationality = $5, vehicle_id = $6, status = $7, notes = $8,
        updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [name, phone, license_no, license_expiry || null, nationality, vehicle_id || null, status || 'Active', notes || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // 2. ØªØ­Ø¯ÙŠØ« Ø¬Ø¯ÙˆÙ„ vehicles Ø§Ù„Ù…Ø±ØªØ¨Ø· (Ø¥Ø°Ø§ ÙƒØ§Ù† Ù‡Ù†Ø§Ùƒ vehicle_id)
    if (vehicle_id) {
      await pool.query(
        `UPDATE vehicles SET
          driver = $1,
          driver_name = $1,
          phone = $2,
          driver_phone = $2,
          updated_at = NOW()
         WHERE id = $3`,
        [name, phone, vehicle_id]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/fleet/drivers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM drivers WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ============================================================
// FLEET MANAGEMENT - SYNC FROM NEON
// ============================================================

// Ø±Ø§Ø¨Ø· Neon (Ø¶Ø¹ Ø±Ø§Ø¨Ø·Ùƒ Ù‡Ù†Ø§)
const NEON_URL = 'postgresql://neondb_owner:npg_dynmHfhw3O1V@ep-rapid-bread-b1qjr8sh.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

app.post('/api/fleet/sync', async (req, res) => {
  const { Client } = require('pg');
  
  const neonClient = new Client({
    connectionString: NEON_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await neonClient.connect();

    // 1. Ø¢Ø®Ø± ID ÙÙŠ Vela
    const velaMaxResult = await pool.query('SELECT COALESCE(MAX(id), 0) as max_id FROM km_records');
    const velaMaxId = parseInt(velaMaxResult.rows[0].max_id);

    // 2. Ø§Ù„ØµÙÙˆÙ Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø© Ù…Ù† Neon
    const neonResult = await neonClient.query(
      'SELECT * FROM km_records WHERE id > $1 ORDER BY id',
      [velaMaxId]
    );

    if (neonResult.rows.length === 0) {
      await neonClient.end();
      return res.json({
        success: true,
        message: 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ù‚Ø±Ø§Ø¡Ø§Øª Ø¬Ø¯ÙŠØ¯Ø©',
        inserted: 0,
        skipped: 0,
      });
    }

    // 3. Ø¥Ø¯Ø®Ø§Ù„Ù‡Ø§ ÙÙŠ Vela
    let inserted = 0;
    let skipped = 0;
    const errors = [];

    for (const row of neonResult.rows) {
      try {
        const result = await pool.query(
          `INSERT INTO km_records (id, vehicle_id, plate, reading_km, reading_date, is_oil_change, notes, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING`,
          [row.id, row.vehicle_id, row.plate, row.reading_km, row.reading_date, row.is_oil_change, row.notes, row.created_at]
        );
        if (result.rowCount > 0) inserted++;
        else skipped++;
      } catch (err) {
        errors.push({ id: row.id, error: err.message });
      }
    }

    await neonClient.end();

    res.json({
      success: true,
      message: `ØªÙ…Øª Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ø¨Ù†Ø¬Ø§Ø­`,
      inserted,
      skipped,
      errors: errors.length,
      total: neonResult.rows.length,
    });
  } catch (err) {
    try { await neonClient.end(); } catch (e) {}
    res.status(500).json({ error: err.message });
  }
});
// ============================================================
// FLEET MANAGEMENT - OIL CHANGES
// ============================================================

app.get('/api/fleet/oil-changes', async (req, res) => {
  try {
    const { vehicle_id, plate, limit } = req.query;
    let query = `
      SELECT oc.*, v.plate_number, v.plate_code, v.make, v.model, v.driver_name, v.driver
      FROM oil_changes oc
      LEFT JOIN vehicles v ON oc.vehicle_id = v.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (vehicle_id) {
      query += ` AND oc.vehicle_id = $${paramIndex}`;
      params.push(vehicle_id);
      paramIndex++;
    }

    if (plate) {
      query += ` AND v.plate_number ILIKE $${paramIndex}`;
      params.push(`%${plate}%`);
      paramIndex++;
    }

    query += ' ORDER BY oc.oil_change_date DESC, oc.id DESC';

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
    } else {
      query += ' LIMIT 500';
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fleet/oil-changes', async (req, res) => {
  try {
    const { vehicle_id, oil_change_km, oil_change_date, changed_by, notes } = req.body;

    if (!vehicle_id || !oil_change_km || !oil_change_date) {
      return res.status(400).json({ error: 'vehicle_id, oil_change_km, and oil_change_date are required' });
    }

    const result = await pool.query(
      `INSERT INTO oil_changes (vehicle_id, oil_change_km, oil_change_date, changed_by, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [vehicle_id, oil_change_km, oil_change_date, changed_by || null, notes || null]
    );

    // ØªØ­Ø¯ÙŠØ« last_oil_km ÙÙŠ vehicles
    await pool.query(
      `UPDATE vehicles SET last_oil_km = $1, last_oil_change_date = $2, updated_at = NOW() WHERE id = $3`,
      [oil_change_km, oil_change_date, vehicle_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/fleet/oil-changes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM oil_changes WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ============================================================
// FLEET MANAGEMENT - OIL STATUS
// ============================================================

app.get('/api/fleet/oil-status', async (req, res) => {
  try {
    const vehiclesResult = await pool.query(
      `SELECT 
        id, plate_number, plate_code, plate, make, model, 
        driver, driver_name, phone, driver_phone, location,
        current_km, last_oil_km, oil_change_interval, last_oil_change_date
       FROM vehicles 
       ORDER BY plate_number, plate_code`
    );

    const vehicles = vehiclesResult.rows.map((v) => {
      const currentKm = parseInt(v.current_km) || 0;
      const lastOilKm = parseInt(v.last_oil_km) || 0;
      const interval = parseInt(v.oil_change_interval) || 5000;
      const driven = currentKm - lastOilKm;
      const remaining = interval - driven;
      const percentage = interval > 0 ? (driven / interval) * 100 : 0;

      let status = 'OK';
      let statusLabel = 'OK';
      let statusColor = '#28a745';

        if (lastOilKm === 0) {
        status = 'NO_DATA';
        statusLabel = 'No Data';
        statusColor = '#6c757d';
      } else if (remaining <= 0) {
        status = 'OVERDUE';
        statusLabel = 'Overdue';
        statusColor = '#dc3545';
      } else if (remaining <= 1000) {
        status = 'DUE_SOON';
        statusLabel = 'Due Soon';
        statusColor = '#ffc107';
      }

      return {
        id: v.id,
        plate: `${v.plate_number} ${v.plate_code}`,
        plate_number: v.plate_number,
        plate_code: v.plate_code,
        make: v.make,
        model: v.model,
        driver: v.driver_name || v.driver || '-',
        phone: v.driver_phone || v.phone || '-',
        location: v.location,
        current_km: currentKm,
        last_oil_km: lastOilKm,
        oil_change_interval: interval,
        last_oil_change_date: v.last_oil_change_date,
        driven,
        remaining,
        percentage: Math.round(percentage),
        status,
        statusLabel,
        statusColor,
      };
    });

    const stats = {
      total: vehicles.length,
      ok: vehicles.filter((v) => v.status === 'OK').length,
      dueSoon: vehicles.filter((v) => v.status === 'DUE_SOON').length,
      overdue: vehicles.filter((v) => v.status === 'OVERDUE').length,
      noData: vehicles.filter((v) => v.status === 'NO_DATA').length,
    };

    const order = { OVERDUE: 1, DUE_SOON: 2, NO_DATA: 3, OK: 4 };
    vehicles.sort((a, b) => order[a.status] - order[b.status]);

    res.json({ vehicles, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ============================================================
// FLEET MANAGEMENT - PERIODIC MAINTENANCE
// ============================================================

app.get('/api/fleet/periodic-maintenance', async (req, res) => {
  try {
    const { vehicle_id, status, limit } = req.query;
    let query = `
      SELECT pm.*, v.plate_number, v.plate_code, v.make, v.model, v.driver_name, v.driver
      FROM periodic_maintenance pm
      LEFT JOIN vehicles v ON pm.vehicle_id = v.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (vehicle_id) {
      query += ` AND pm.vehicle_id = $${paramIndex}`;
      params.push(vehicle_id);
      paramIndex++;
    }

    if (status) {
      query += ` AND pm.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ' ORDER BY pm.scheduled_date DESC NULLS LAST, pm.id DESC';

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
    } else {
      query += ' LIMIT 500';
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fleet/periodic-maintenance', async (req, res) => {
  try {
    const { vehicle_id, type, scheduled_date, status, technician, cost, notes } = req.body;
    if (!vehicle_id || !type) {
      return res.status(400).json({ error: 'vehicle_id and type are required' });
    }
    const result = await pool.query(
      `INSERT INTO periodic_maintenance (vehicle_id, type, scheduled_date, status, technician, cost, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [vehicle_id, type, scheduled_date || null, status || 'Pending', technician || null, cost || 0, notes || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/fleet/periodic-maintenance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_id, type, scheduled_date, completed_date, status, technician, cost, notes } = req.body;
    const result = await pool.query(
      `UPDATE periodic_maintenance SET
        vehicle_id = $1, type = $2, scheduled_date = $3, completed_date = $4,
        status = $5, technician = $6, cost = $7, notes = $8
       WHERE id = $9 RETURNING *`,
      [vehicle_id, type, scheduled_date || null, completed_date || null, status || 'Pending', technician || null, cost || 0, notes || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/fleet/periodic-maintenance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM periodic_maintenance WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ============================================================
// ============================================================
// FLEET MANAGEMENT - INVENTORY
// ============================================================

app.get('/api/fleet/inventory', async (req, res) => {
  try {
    const { category, status, search, limit } = req.query;
    let query = 'SELECT * FROM inventory WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' ORDER BY id DESC';

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fleet/inventory', async (req, res) => {
  try {
    const { code, name, category, unit, quantity, min_stock, unit_cost, location, supplier, status, notes } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    const result = await pool.query(
      `INSERT INTO inventory (code, name, category, unit, quantity, min_stock, unit_cost, location, supplier, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [code || null, name, category || null, unit || null, quantity || 0, min_stock || 0, unit_cost || 0, location || null, supplier || null, status || 'ACTIVE', notes || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/fleet/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, category, unit, quantity, min_stock, unit_cost, location, supplier, status, notes } = req.body;
    const result = await pool.query(
      `UPDATE inventory SET
        code = $1, name = $2, category = $3, unit = $4,
        quantity = $5, min_stock = $6, unit_cost = $7,
        location = $8, supplier = $9, status = $10, notes = $11,
        updated_at = NOW()
       WHERE id = $12 RETURNING *`,
      [code || null, name, category || null, unit || null, quantity || 0, min_stock || 0, unit_cost || 0, location || null, supplier || null, status || 'ACTIVE', notes || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/fleet/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM inventory WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ============================================================
// FLEET MANAGEMENT - STOCK TRANSACTIONS
// ============================================================

app.get('/api/fleet/stock-transactions', async (req, res) => {
  try {
    const { type, item_code, from_location, to_location, limit } = req.query;
    let query = 'SELECT * FROM stock_transactions WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    if (item_code) {
      query += ` AND item_code ILIKE $${paramIndex}`;
      params.push(`%${item_code}%`);
      paramIndex++;
    }
    if (from_location) {
      query += ` AND from_location = $${paramIndex}`;
      params.push(from_location);
      paramIndex++;
    }
    if (to_location) {
      query += ` AND to_location = $${paramIndex}`;
      params.push(to_location);
      paramIndex++;
    }

    query += ' ORDER BY trans_date DESC NULLS LAST, id DESC';

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fleet/stock-transactions', async (req, res) => {
  try {
    const { type, item_code, item_name, quantity, from_location, to_location, reference_no, notes, trans_date } = req.body;
    if (!type || !item_name || !quantity) {
      return res.status(400).json({ error: 'type, item_name, quantity are required' });
    }
    const result = await pool.query(
      `INSERT INTO stock_transactions (type, item_code, item_name, quantity, from_location, to_location, reference_no, notes, trans_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [type, item_code || null, item_name, quantity, from_location || null, to_location || null, reference_no || null, notes || null, trans_date || new Date()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/fleet/stock-transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, item_code, item_name, quantity, from_location, to_location, reference_no, notes, trans_date } = req.body;
    const result = await pool.query(
      `UPDATE stock_transactions SET
        type = $1, item_code = $2, item_name = $3, quantity = $4,
        from_location = $5, to_location = $6, reference_no = $7,
        notes = $8, trans_date = $9
       WHERE id = $10 RETURNING *`,
      [type, item_code || null, item_name, quantity, from_location || null, to_location || null, reference_no || null, notes || null, trans_date || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/fleet/stock-transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM stock_transactions WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// FLEET MANAGEMENT - WAREHOUSE LOCATIONS
// ============================================================

app.get('/api/fleet/warehouse-locations', async (req, res) => {
  try {
    const { status, site, limit } = req.query;
    let query = 'SELECT * FROM warehouse_locations WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (site) {
      query += ` AND site = $${paramIndex}`;
      params.push(site);
      paramIndex++;
    }

    query += ' ORDER BY id ASC';

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fleet/warehouse-locations', async (req, res) => {
  try {
    const { code, name, site, status } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    const result = await pool.query(
      `INSERT INTO warehouse_locations (code, name, site, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [code || null, name, site || null, status || 'ACTIVE']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/fleet/warehouse-locations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, site, status } = req.body;
    const result = await pool.query(
      `UPDATE warehouse_locations SET
        code = $1, name = $2, site = $3, status = $4
       WHERE id = $5 RETURNING *`,
      [code || null, name, site || null, status || 'ACTIVE', id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/fleet/warehouse-locations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM warehouse_locations WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ============================================================
// DRIVER APP - LOGIN + DAILY KM
// ============================================================

// 1) Login by phone
app.post('/api/driver/login', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });

    const cleanPhone = phone.toString().replace(/\D/g, '');
    const result = await pool.query(
      `SELECT d.*, v.plate_number, v.plate_code, v.plate, v.make, v.model, v.current_km
       FROM drivers d
       LEFT JOIN vehicles v ON d.vehicle_id = v.id
       WHERE REPLACE(REPLACE(d.phone, ' ', ''), '-', '') = $1
       OR REPLACE(REPLACE(d.phone, ' ', ''), '-', '') = $2
       LIMIT 1`,
      [cleanPhone, '0' + cleanPhone]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Phone not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2) Get driver info + vehicle + last km
app.get('/api/driver/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await pool.query(
      `SELECT d.*, v.plate_number, v.plate_code, v.plate, v.make, v.model, v.current_km, v.last_oil_km
       FROM drivers d
       LEFT JOIN vehicles v ON d.vehicle_id = v.id
       WHERE d.id = $1`,
      [id]
    );

    if (driver.rows.length === 0) return res.status(404).json({ error: 'Driver not found' });

    const lastKm = await pool.query(
      `SELECT reading_km, reading_date FROM km_records
       WHERE vehicle_id = $1
       ORDER BY reading_date DESC, id DESC LIMIT 1`,
      [driver.rows[0].vehicle_id]
    );

    res.json({
      ...driver.rows[0],
      last_km: lastKm.rows[0]?.reading_km || null,
      last_km_date: lastKm.rows[0]?.reading_date || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3) Submit daily KM
app.post('/api/driver/km', async (req, res) => {
  try {
    const { driver_id, vehicle_id, reading_km, reading_date, notes, is_oil_change } = req.body;

    if (!driver_id || !vehicle_id || !reading_km) {
      return res.status(400).json({ error: 'driver_id, vehicle_id, reading_km required' });
    }

    // Get plate
    const veh = await pool.query('SELECT plate FROM vehicles WHERE id = $1', [vehicle_id]);
    if (veh.rows.length === 0) return res.status(404).json({ error: 'Vehicle not found' });

    const date = reading_date || new Date().toISOString().split('T')[0];

    // Check if already submitted today
    const exists = await pool.query(
      `SELECT id FROM km_records WHERE vehicle_id = $1 AND reading_date = $2`,
      [vehicle_id, date]
    );

    let result;
    if (exists.rows.length > 0) {
      // Update existing
      result = await pool.query(
        `UPDATE km_records SET reading_km = $1, notes = $2, is_oil_change = $3
         WHERE id = $4 RETURNING *`,
        [reading_km, notes || '', is_oil_change ? 1 : 0, exists.rows[0].id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO km_records (vehicle_id, plate, reading_km, reading_date, notes, is_oil_change)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [vehicle_id, veh.rows[0].plate, reading_km, date, notes || '', is_oil_change ? 1 : 0]
      );
    }

    // Update vehicle current_km
    await pool.query(
      `UPDATE vehicles SET current_km = $1, meter_updated_at = NOW() WHERE id = $2`,
      [reading_km, vehicle_id]
    );

    // Log to driver_messages (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)
    // await pool.query(...)

    res.json({ success: true, record: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4) Driver's KM history
app.get('/api/driver/:id/km-history', async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await pool.query('SELECT vehicle_id FROM drivers WHERE id = $1', [id]);
    if (driver.rows.length === 0) return res.status(404).json({ error: 'Driver not found' });

    const result = await pool.query(
      `SELECT * FROM km_records
       WHERE vehicle_id = $1
       ORDER BY reading_date DESC, id DESC
       LIMIT 30`,
      [driver.rows[0].vehicle_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ============================================================
// DRIVER APP - EXTRA APIS
// ============================================================

// 1) KM status (for DailyKmGate)
app.get('/api/driver/:id/km-status', async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await pool.query(
      `SELECT d.id, d.vehicle_id, v.plate_number, v.plate_code, v.plate, v.current_km
       FROM drivers d
       LEFT JOIN vehicles v ON d.vehicle_id = v.id
       WHERE d.id = $1`,
      [id]
    );

    if (driver.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const d = driver.rows[0];
    const today = new Date().toISOString().split('T')[0];

    const todayKm = await pool.query(
      `SELECT id FROM km_records
       WHERE vehicle_id = $1 AND DATE(reading_date) = $2`,
      [d.vehicle_id, today]
    );

    res.json({
      status: {
        required: todayKm.rows.length === 0,
        date: today,
        vehicle: {
          plate: `${d.plate_number || ''} ${d.plate_code || ''}`.trim(),
          currentKm: d.current_km || 0
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2) Create ticket
app.post('/api/tickets', async (req, res) => {
  try {
    const { vehicleId, category, description, reportedBy, priority } = req.body;
    if (!description) {
      return res.status(400).json({ error: 'description is required' });
    }

    const result = await pool.query(
      `INSERT INTO tickets (vehicle_id, title, category, description, reported_by, priority, status, opened_at, department)
       VALUES ($1, $2, $3, $4, $5, $6, 'Open', NOW(), 'Fleet')
       RETURNING *`,
      [vehicleId || null, category || 'Issue', category || 'Other', description, reportedBy || 'Driver', priority || 'Medium']
    );

    res.json({ success: true, ticket: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3) Create vehicle repair order
app.post('/api/vehicle-repairs', async (req, res) => {
  try {
    const { vehicleId, issueDescription } = req.body;
    if (!vehicleId || !issueDescription) {
      return res.status(400).json({ error: 'vehicleId and issueDescription required' });
    }

    const result = await pool.query(
      `INSERT INTO vehicle_repair_orders (vehicle_id, issue_description, status, reported_at)
       VALUES ($1, $2, 'Pending Verification', NOW())
       RETURNING *`,
      [vehicleId, issueDescription]
    );

    res.json({ success: true, repair: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4) Complete vehicle repair
app.put('/api/vehicle-repairs/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { repairDetails, partsUsed, repairKm, repairDate, repairCost } = req.body;

    const result = await pool.query(
      `UPDATE vehicle_repair_orders SET
        repair_details = $1,
        parts_used = $2,
        repair_km = $3,
        repair_date = $4,
        repair_cost = $5,
        status = 'Pending Verification',
        completed_at = NOW()
       WHERE id = $6 RETURNING *`,
      [repairDetails, partsUsed, repairKm, repairDate, repairCost, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Repair order not found' });
    }

    res.json({ success: true, repair: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5) Vehicles list
app.get('/api/vehicles/list', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, plate, plate_number, plate_code, driver, driver_name
       FROM vehicles
       ORDER BY plate_number, plate_code`
    );
    res.json({ vehicles: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6) Vehicle details
app.get('/api/vehicles/:id/details', async (req, res) => {
  try {
    const { id } = req.params;

    const veh = await pool.query('SELECT * FROM vehicles WHERE id = $1', [id]);
    if (veh.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const readings = await pool.query(
      `SELECT id, reading_date, reading_km, is_oil_change, notes
       FROM km_records
       WHERE vehicle_id = $1
       ORDER BY reading_date DESC, id DESC
       LIMIT 20`,
      [id]
    );

    const v = veh.rows[0];
    const sinceOil = (v.current_km || 0) - (v.last_oil_km || 0);
    const remaining = (v.oil_change_interval || 5000) - sinceOil;

    let status = 'OK';
    if (v.last_oil_km === 0) status = 'No Data';
    else if (remaining <= 0) status = 'Urgent Overdue';
    else if (remaining <= 1000) status = 'Warning';

    res.json({
      vehicle: {
        id: v.id,
        plate: v.plate || `${v.plate_number} ${v.plate_code}`,
        driver: v.driver_name || v.driver || '-',
        location: v.location,
        currentKm: v.current_km || 0,
        lastOilKm: v.last_oil_km || 0,
        oilChangeInterval: v.oil_change_interval || 5000,
        sinceOil,
        remaining,
        status
      },
      readings: readings.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ============================================================
// AUTH â€” LOGIN + JWT
// ============================================================

const JWT_SECRET = process.env.JWT_SECRET || 'vela-default-secret-change-me';

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Missing fields' });
    }

    const result = await pool.query(
      `SELECT id, username, password, full_name, role, email, phone, is_active, site, department
       FROM users
       WHERE LOWER(TRIM(username)) = LOWER(TRIM($1)) AND is_active = 1
       LIMIT 1`,
      [username]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        site: user.site || '',
        department: user.department || 'General'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        site: user.site || '',
        department: user.department || 'General'
      }
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ success: true, user: decoded });
  } catch (e) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});
// ============================================================
// DRIVER APP - OIL CHANGE
// ============================================================

app.post('/api/vehicles/:id/oil-change', async (req, res) => {
  try {
    const { id } = req.params;
    const { changedBy } = req.body;

    const veh = await pool.query(
      'SELECT current_km, plate FROM vehicles WHERE id = $1',
      [id]
    );
    if (veh.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const km = veh.rows[0].current_km || 0;
    const today = new Date().toISOString().split('T')[0];

    // 1) Ø³Ø¬Ù‘Ù„ Oil Change ÙÙŠ Ø¬Ø¯ÙˆÙ„ oil_changes
    await pool.query(
      `INSERT INTO oil_changes (vehicle_id, oil_change_km, oil_change_date, changed_by, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, km, today, changedBy || 'Driver', 'Oil change by driver']
    );

    // 2) Ø­Ø¯Ù‘Ø« vehicles
    await pool.query(
      `UPDATE vehicles
       SET last_oil_km = $1, last_oil_change_date = $2, updated_at = NOW()
       WHERE id = $3`,
      [km, today, id]
    );

    // 3) âœ… Ø­Ø¯Ù‘Ø« Ø¢Ø®Ø± Ø³Ø¬Ù„ KM Ù„ÙŠÙØ¹Ù„Ù‘Ù… Ø£Ù†Ù‡ Ø¹Ù†Ø¯Ù‡ Oil Change
    await pool.query(
      `UPDATE km_records
       SET is_oil_change = 1
       WHERE id = (
         SELECT id FROM km_records
         WHERE vehicle_id = $1
         ORDER BY id DESC
         LIMIT 1
       )`,
      [id]
    );

    const updated = await pool.query('SELECT * FROM vehicles WHERE id = $1', [id]);
    res.json({ success: true, vehicle: updated.rows[0] });
  } catch (err) {
    console.error('Oil change error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DRIVER APP - KM READING (Save Reading)
// ============================================================

app.post('/api/vehicles/:id/reading', async (req, res) => {
  try {
    const { id } = req.params;
    const { readingKm } = req.body;

    if (!readingKm || Number(readingKm) <= 0) {
      return res.status(400).json({ error: 'readingKm required and must be > 0' });
    }

    const veh = await pool.query(
      'SELECT plate, current_km FROM vehicles WHERE id = $1',
      [id]
    );
    if (veh.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const km = Number(readingKm);
    const currentKm = veh.rows[0].current_km || 0;
    const plate = veh.rows[0].plate;

    if (km < currentKm) {
      return res.status(400).json({
        error: `Reading must be >= current odometer (${currentKm.toLocaleString()} km)`
      });
    }

    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `INSERT INTO km_records (vehicle_id, plate, reading_km, reading_date, is_oil_change, notes)
       VALUES ($1, $2, $3, $4, 0, $5)
       RETURNING *`,
      [id, plate, km, today, 'Driver reading']
    );

    await pool.query(
      `UPDATE vehicles
       SET current_km = $1, meter_updated_at = NOW()
       WHERE id = $2`,
      [km, id]
    );

    const updated = await pool.query('SELECT * FROM vehicles WHERE id = $1', [id]);
    res.json({ success: true, record: result.rows[0], vehicle: updated.rows[0] });
  } catch (err) {
    console.error('Save reading error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// MY TICKETS (for driver)
// ============================================================

app.get('/api/my-tickets', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, vehicle_id, title, category, department, priority, status,
              description, reported_by, opened_at, closed_at, closed_by,
              resolution_notes, cost
       FROM tickets
       WHERE department = 'Fleet'
       ORDER BY id DESC
       LIMIT 200`
    );
    res.json({ tickets: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// CLOSE TICKET (Owner only)
// ============================================================

app.patch('/api/tickets/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes, cost, technician, closedBy } = req.body;

    const result = await pool.query(
      `UPDATE tickets SET
        status = 'Closed',
        closed_at = NOW(),
        closed_by = $1,
        resolution_notes = $2,
        cost = $3,
        assigned_to_name = $4
       WHERE id = $5
       RETURNING *`,
      [
        closedBy || 'Owner',
        resolution_notes || '',
        parseFloat(cost) || 0,
        technician || null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ success: true, ticket: result.rows[0] });
  } catch (err) {
    console.error('Close ticket error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// FLEET REPORTS - TICKETS
// ============================================================

app.get('/api/tickets/report', async (req, res) => {
  try {
    const { from, to, includeSystem } = req.query;

    const dateConditions = [];
    const params = [];
    let paramIndex = 1;

    if (from) {
      dateConditions.push(`opened_at >= $${paramIndex}`);
      params.push(from);
      paramIndex++;
    }
    if (to) {
      dateConditions.push(`opened_at <= $${paramIndex}`);
      params.push(`${to} 23:59:59`);
      paramIndex++;
    }

    const dateFilter = dateConditions.length > 0
      ? 'AND ' + dateConditions.join(' AND ')
      : '';

    // ÙÙ„ØªØ± Ø§Ù„ØªØ°Ø§ÙƒØ± Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠØ© (Ø¥Ø°Ø§ Ù„Ù… ÙŠÙÙØ¹Ù‘Ù„ includeSystem)
    const systemFilter = includeSystem === 'true'
      ? ''
      : `AND reported_by != 'System' AND category NOT IN ('Daily KM', 'Maintenance')`;

    // 1) Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø¹Ø§Ù…Ø©
    const stats = await pool.query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'Closed') AS closed_count,
        COUNT(*) FILTER (WHERE status != 'Closed') AS open_count,
        COALESCE(SUM(cost), 0) AS total_cost,
        COALESCE(AVG(cost) FILTER (WHERE cost > 0), 0) AS avg_cost
       FROM tickets
       WHERE department = 'Fleet' ${systemFilter} ${dateFilter}`,
      params
    );

    // 2) Ø­Ø³Ø¨ Ø§Ù„ÙÙ†ÙŠ
    const byTechnician = await pool.query(
      `SELECT
        COALESCE(assigned_to_name, 'Unassigned') AS technician,
        COUNT(*) AS tickets_count,
        COALESCE(SUM(cost), 0) AS total_cost
       FROM tickets
       WHERE department = 'Fleet' AND status = 'Closed' ${systemFilter} ${dateFilter}
       GROUP BY assigned_to_name
       ORDER BY total_cost DESC`,
      params
    );

    // 3) Ø­Ø³Ø¨ Ø§Ù„ÙØ¦Ø©
    const byCategory = await pool.query(
      `SELECT
        COALESCE(category, 'Other') AS category,
        COUNT(*) AS tickets_count,
        COALESCE(SUM(cost), 0) AS total_cost
       FROM tickets
       WHERE department = 'Fleet' ${systemFilter} ${dateFilter}
       GROUP BY category
       ORDER BY total_cost DESC`,
      params
    );

    // 4) Ø­Ø³Ø¨ Ø§Ù„Ù…Ø±ÙƒØ¨Ø©
    const byVehicle = await pool.query(
      `SELECT
        t.vehicle_id,
        v.plate_number,
        v.plate_code,
        COUNT(*) AS tickets_count,
        COALESCE(SUM(t.cost), 0) AS total_cost
       FROM tickets t
       LEFT JOIN vehicles v ON t.vehicle_id = v.id
       WHERE t.department = 'Fleet' 
         ${systemFilter.replace(/reported_by/g, 't.reported_by').replace(/category/g, 't.category')}
         ${dateFilter.replace(/opened_at/g, 't.opened_at')}
       GROUP BY t.vehicle_id, v.plate_number, v.plate_code
       ORDER BY total_cost DESC
       LIMIT 30`,
      params
    );

    // 5) Ø¬Ø¯ÙˆÙ„ ÙƒÙ„ Ø§Ù„ØªØ°Ø§ÙƒØ± Ø§Ù„Ù…ØºÙ„Ù‚Ø©
    const closedTickets = await pool.query(
      `SELECT
        t.id,
        t.vehicle_id,
        v.plate_number,
        v.plate_code,
        t.category,
        t.title,
        t.priority,
        t.assigned_to_name AS technician,
        t.cost,
        t.closed_at,
        t.closed_by,
        t.resolution_notes
       FROM tickets t
       LEFT JOIN vehicles v ON t.vehicle_id = v.id
       WHERE t.department = 'Fleet' AND t.status = 'Closed'
         ${systemFilter.replace(/reported_by/g, 't.reported_by').replace(/category/g, 't.category')}
         ${dateFilter.replace(/opened_at/g, 't.opened_at')}
       ORDER BY t.closed_at DESC
       LIMIT 500`,
      params
    );

    res.json({
      stats: stats.rows[0],
      byTechnician: byTechnician.rows,
      byCategory: byCategory.rows,
      byVehicle: byVehicle.rows,
      closedTickets: closedTickets.rows,
      filter: { from: from || null, to: to || null, includeSystem: includeSystem === 'true' }
    });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PERIODIC MAINTENANCE REPORT
// ============================================================

app.get('/api/periodic-maintenance/report', async (req, res) => {
  try {
    const { from, to } = req.query;

    const dateConditions = [];
    const params = [];
    let paramIndex = 1;

    if (from) {
      dateConditions.push(`pm.scheduled_date >= $${paramIndex}`);
      params.push(from);
      paramIndex++;
    }
    if (to) {
      dateConditions.push(`pm.scheduled_date <= $${paramIndex}`);
      params.push(to);
      paramIndex++;
    }

    const dateFilter = dateConditions.length > 0
      ? 'AND ' + dateConditions.join(' AND ')
      : '';

    // 1) Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø¹Ø§Ù…Ø©
    const stats = await pool.query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'Completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'Pending') AS pending
       FROM periodic_maintenance pm
       WHERE 1=1 ${dateFilter}`,
      params
    );

    // 2) Ø­Ø³Ø¨ Ø§Ù„Ù†ÙˆØ¹
    const byType = await pool.query(
      `SELECT
        COALESCE(type, 'Other') AS type,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'Completed') AS completed,
        COUNT(*) FILTER (WHERE status != 'Completed') AS pending,
        COALESCE(SUM(cost), 0) AS total_cost
       FROM periodic_maintenance pm
       WHERE 1=1 ${dateFilter}
       GROUP BY type
       ORDER BY total DESC`,
      params
    );

    // 3) Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ Ø­Ø³Ø¨ Ø§Ù„Ù†ÙˆØ¹ (ÙƒÙ… Ø³ÙŠØ§Ø±Ø© Ù„Ù… ØªÙÙ†Ø¬Ø²)
    const remaining = await pool.query(
      `SELECT
        COALESCE(pm.type, 'Other') AS type,
        COUNT(*) AS remaining_count
       FROM periodic_maintenance pm
       WHERE pm.status != 'Completed' ${dateFilter}
       GROUP BY pm.type
       ORDER BY remaining_count DESC`,
      params
    );

    // 4) Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø±ÙƒØ¨Ø§Øª (Ù„ÙƒÙŠ Ù†Ø­Ø³Ø¨ Ù†Ø³Ø¨Ø© Ø§Ù„Ø¥Ù†Ø¬Ø§Ø²)
    const totalVehicles = await pool.query(
      `SELECT COUNT(*) AS count FROM vehicles WHERE status = 'Active' OR status IS NULL`
    );

    // 5) Ø§Ù„Ø³Ø¬Ù„Ø§Øª Ø§Ù„ØªÙØµÙŠÙ„ÙŠØ©
    const details = await pool.query(
      `SELECT
        pm.id,
        pm.vehicle_id,
        v.plate_number,
        v.plate_code,
        v.driver_name,
        v.driver,
        pm.type,
        pm.scheduled_date,
        pm.completed_date,
        pm.status,
        pm.technician,
        pm.cost,
        pm.notes
       FROM periodic_maintenance pm
       LEFT JOIN vehicles v ON pm.vehicle_id = v.id
       WHERE 1=1 ${dateFilter}
       ORDER BY pm.scheduled_date DESC NULLS LAST, pm.id DESC
       LIMIT 500`,
      params
    );

    res.json({
      stats: stats.rows[0],
      byType: byType.rows,
      remaining: remaining.rows,
      totalVehicles: parseInt(totalVehicles.rows[0].count || 0),
      details: details.rows,
      filter: { from: from || null, to: to || null }
    });
  } catch (err) {
    console.error('Periodic maintenance report error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// SERVE FRONTEND (React build)
// ============================================================

const clientBuildPath = path.join(__dirname, 'client', 'dist');

app.use(express.static(clientBuildPath));

app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// ============================================================

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`ðŸš€ Server running on http://localhost:${PORT}`);
});

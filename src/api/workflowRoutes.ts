/**
 * src/api/workflowRoutes.ts
 * 
 * Defines local workflow endpoints: GET, POST, PUT, DELETE, and execution.
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { Type } from '@google/genai';
import { 
  getCustomers, 
  getOrders, 
  getEvents 
} from '../server/db.js';
import { getAi, generateContentWithRetry } from '../../server.js';

const router = Router();
const WORKFLOWS_FILE = path.join(process.cwd(), 'workflow_automations.json');

function getLocalWorkflows(): any[] {
  try {
    if (fs.existsSync(WORKFLOWS_FILE)) {
      return JSON.parse(fs.readFileSync(WORKFLOWS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[Workflows Router] Error loading local workflows:', e);
  }
  return [
    {
      id: "wf_1",
      name: "Dormant Brewer Recovery Trigger",
      trigger: "customer_inactive",
      condition: "Inactivity > 60 days",
      action: "generate_campaign",
      status: "active",
      createdAt: new Date().toISOString()
    },
    {
      id: "wf_2",
      name: "VIP Appreciation Reward Loop",
      trigger: "high_value_customer",
      condition: "Total Spent > 20000 INR",
      action: "send_whatsapp",
      status: "paused",
      createdAt: new Date().toISOString()
    }
  ];
}

function writeLocalWorkflows(workflows: any[]): void {
  try {
    fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify(workflows, null, 2), 'utf8');
  } catch (e) {
    console.error('[Workflows Router] Error saving local workflows:', e);
  }
}

// GET /api/workflows
router.get('/', (req, res) => {
  try {
    const list = getLocalWorkflows();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error loading workflows' });
  }
});

// POST /api/workflows
router.post('/', (req, res) => {
  try {
    const { name, trigger, condition, action, status } = req.body;
    if (!name || !trigger || !action) {
      return res.status(400).json({ message: 'Name, trigger, and action are required fields.' });
    }
    const workflows = getLocalWorkflows();
    const newWf = {
      id: `wf_${Date.now()}`,
      name,
      trigger,
      condition: condition || '',
      action,
      status: status || 'active',
      createdAt: new Date().toISOString()
    };
    workflows.push(newWf);
    writeLocalWorkflows(workflows);
    res.status(201).json(newWf);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error creating workflow' });
  }
});

// PUT /api/workflows/:id
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const workflows = getLocalWorkflows();
    const idx = workflows.findIndex(w => w.id === id);
    if (idx === -1) {
      return res.status(404).json({ message: 'Workflow not found.' });
    }
    workflows[idx] = { ...workflows[idx], ...updates };
    writeLocalWorkflows(workflows);
    res.json(workflows[idx]);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error updating workflow' });
  }
});

// DELETE /api/workflows/:id
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const workflows = getLocalWorkflows();
    const filtered = workflows.filter(w => w.id !== id);
    writeLocalWorkflows(filtered);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error deleting workflow' });
  }
});

// POST /api/workflows/:id/execute
router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const workflows = getLocalWorkflows();
    const idx = workflows.findIndex(w => w.id === id);
    if (idx === -1) {
      return res.status(404).json({ message: 'Workflow not found.' });
    }

    const workflow = workflows[idx];
    workflow.lastExecuted = new Date().toISOString();
    writeLocalWorkflows(workflows);

    // Collect telemetry context
    const customers = getCustomers();
    const orders = getOrders();
    const events = getEvents();

    // Select targeted cohort segment depending on trigger to build intelligent context
    let targetCohort = customers;
    if (workflow.trigger === 'customer_inactive') {
      const pivotDate = new Date('2026-06-18');
      targetCohort = customers.filter(c => {
        const lastOrder = new Date(c.lastOrderDate);
        const diffDays = (pivotDate.getTime() - lastOrder.getTime()) / (1000 * 3600 * 24);
        return diffDays > 45 || c.tags?.includes('inactive');
      });
    } else if (workflow.trigger === 'high_churn_risk') {
      targetCohort = customers.filter(c => c.tags?.includes('inactive') || c.orderCount <= 1);
    } else if (workflow.trigger === 'high_value_customer') {
      targetCohort = customers.filter(c => c.totalSpent > 15000);
    } else if (workflow.trigger === 'new_customer') {
      targetCohort = [...customers].sort((a,b) => b.memberSince.localeCompare(a.memberSince)).slice(0, 5);
    }

    if (targetCohort.length === 0) {
      targetCohort = customers.slice(0, 3);
    }

    const telemetry = targetCohort.slice(0, 6).map(c => {
      const cOrders = orders.filter(o => o.customerId === c.id);
      const cEvents = events.filter(e => e.customerId === c.id);
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        totalSpent: c.totalSpent,
        orderCount: c.orderCount,
        lastOrderDate: c.lastOrderDate,
        tags: c.tags,
        ordersCount: cOrders.length,
        eventsCount: cEvents.length
      };
    });

    const ai = getAi();
    if (ai) {
      try {
        const sysInstruction = `You are Mochi CRM's advanced machine learning Workflow Automation Engine.
Evaluate the current automation workflow trigger and condition rules alongside customer telemetry.
Determine the target cohort response and formulate the optimal automated action.
Return a strictly formatted valid JSON matching the schema:
{
  "generatedCampaign": "Strategic dynamic campaign title identifying coupon or target blend",
  "message": "Polished, rich, compelling, contextual copy or email matching the requested action (e.g., promotional pitch, Win-back offer)",
  "predictedRecovery": (number) expected revenue recovered in INR,
  "reason": "Clear and detailed behavioral rationale demonstrating why this was triggered and how this recovery is calculated based on customer history"
}`;

        const gResponse = await generateContentWithRetry({
          preferredModel: 'gemini-3.5-flash',
          contents: `Automated Rule Profile:\n${JSON.stringify({
            name: workflow.name,
            trigger: workflow.trigger,
            condition: workflow.condition,
            action: workflow.action
          })}\n\nCustomer Targets Data:\n${JSON.stringify(telemetry)}`,
          config: {
            systemInstruction: sysInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                generatedCampaign: { type: Type.STRING },
                message: { type: Type.STRING },
                predictedRecovery: { type: Type.NUMBER },
                reason: { type: Type.STRING }
              },
              required: ['generatedCampaign', 'message', 'predictedRecovery', 'reason']
            }
          }
        });

        const parsed = JSON.parse(gResponse.text || '{}');
        return res.json({
          workflow,
          generatedCampaign: parsed.generatedCampaign,
          message: parsed.message,
          predictedRecovery: parsed.predictedRecovery,
          reason: parsed.reason
        });
      } catch (geminiErr) {
        console.error('[Workflow Server Engine] Gemini execution failed, fallback triggered:', geminiErr);
      }
    }

    // Server Fallback
    const targetName = targetCohort[0]?.name || 'Valued Client';
    let gCmp = `Automated Recovery Lead Campaign`;
    let msg = `Hi ${targetName}! We noticed you've been inactive. We'd love to invite you to try our new microlot blends with a special 20% discount code: WINBACK20.`;
    let recovery = 12500;
    let rsn = `Fallback processing success: automated trigger [${workflow.trigger}] successfully matches target user ${targetName}. Calculated recovery: standard 12500 INR.`;

    if (workflow.action === 'send_whatsapp') {
      msg = `Hey ${targetName}! ☕ Early winter microlot coffee selection has arrived at Mochi! Tap to check out with 15% off using coffee discount: MATCH15`;
    } else if (workflow.action === 'notify_sales') {
      msg = `Internal Sales Briefing: customer ${targetName} matches trigger [${workflow.trigger}] with condition [${workflow.condition}]. High propensity lead detected, please execute follow-up pitch immediately.`;
    }

    return res.json({
      workflow,
      generatedCampaign: gCmp,
      message: msg,
      predictedRecovery: recovery,
      reason: rsn
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error executing automated workflow process' });
  }
});

export default router;

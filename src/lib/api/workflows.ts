import { WorkflowAutomation, WorkflowExecutionResponse } from '../../types/index.js';
import { db, handleFirestoreError, OperationType } from '../firebase.js';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { isDemoMode, getUid } from './auth.js';

const API_BASE = '/api';

export function initLocalDemoWorkflows() {
  if (!localStorage.getItem('xeno_demo_workflows')) {
    const seed = [
      {
        id: "wf_1",
        name: "Dormant Brewer Recovery Trigger",
        trigger: "customer_inactive",
        condition: "Inactivity > 60 days",
        action: "generate_campaign",
        status: "active",
        createdAt: new Date().toISOString().split('T')[0]
      },
      {
        id: "wf_2",
        name: "VIP Appreciation Reward Loop",
        trigger: "high_value_customer",
        condition: "Total Spent > 20000 INR",
        action: "send_whatsapp",
        status: "paused",
        createdAt: new Date().toISOString().split('T')[0]
      }
    ];
    localStorage.setItem('xeno_demo_workflows', JSON.stringify(seed));
  }
}

// -------------------------------------------------------------
// GET WORKFLOWS
// -------------------------------------------------------------
export async function fetchWorkflows(): Promise<WorkflowAutomation[]> {
  if (isDemoMode()) {
    initLocalDemoWorkflows();
    const list = JSON.parse(localStorage.getItem('xeno_demo_workflows') || '[]');
    return list;
  }

  const uid = getUid();
  if (uid) {
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'workflow_automations'));
      const list: WorkflowAutomation[] = [];
      snap.forEach((d) => {
        list.push({
          ...(d.data() as WorkflowAutomation),
          id: d.id
        });
      });
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${uid}/workflow_automations`);
    }
  }

  const res = await fetch(`${API_BASE}/workflows`);
  if (!res.ok) throw new Error('Failed to fetch workflows');
  return res.json();
}

// -------------------------------------------------------------
// CREATE WORKFLOW
// -------------------------------------------------------------
export async function createWorkflow(workflow: Partial<WorkflowAutomation>): Promise<WorkflowAutomation> {
  const wId = workflow.id || `wf_${Date.now()}`;
  const newWorkflow: WorkflowAutomation = {
    id: wId,
    name: workflow.name || `Automation — ${new Date().toLocaleDateString()}`,
    trigger: workflow.trigger || 'customer_inactive',
    condition: workflow.condition || 'Inactivity > 45 days',
    action: workflow.action || 'generate_campaign',
    status: workflow.status || 'active',
    createdAt: new Date().toISOString()
  };

  if (isDemoMode()) {
    initLocalDemoWorkflows();
    const list = JSON.parse(localStorage.getItem('xeno_demo_workflows') || '[]');
    list.push(newWorkflow);
    localStorage.setItem('xeno_demo_workflows', JSON.stringify(list));
    return newWorkflow;
  }

  const uid = getUid();
  if (uid) {
    try {
      await setDoc(doc(db, 'users', uid, 'workflow_automations', wId), newWorkflow);
      return newWorkflow;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${uid}/workflow_automations/${wId}`);
    }
  }

  const res = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newWorkflow)
  });
  if (!res.ok) throw new Error('Failed to create workflow');
  return res.json();
}

// -------------------------------------------------------------
// UPDATE WORKFLOW
// -------------------------------------------------------------
export async function updateWorkflow(id: string, updates: Partial<WorkflowAutomation>): Promise<WorkflowAutomation> {
  if (isDemoMode()) {
    initLocalDemoWorkflows();
    const list = JSON.parse(localStorage.getItem('xeno_demo_workflows') || '[]');
    const idx = list.findIndex((w: any) => w.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      localStorage.setItem('xeno_demo_workflows', JSON.stringify(list));
      return list[idx];
    }
    throw new Error('Workflow not found');
  }

  const uid = getUid();
  if (uid) {
    try {
      const dRef = doc(db, 'users', uid, 'workflow_automations', id);
      const snap = await getDoc(dRef);
      if (!snap.exists()) throw new Error('Workflow not found');
      const current = snap.data() as WorkflowAutomation;
      const updated = { ...current, ...updates };
      await setDoc(dRef, updated);
      return updated;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/workflow_automations/${id}`);
    }
  }

  const res = await fetch(`${API_BASE}/workflows/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update workflow');
  return res.json();
}

// -------------------------------------------------------------
// DELETE WORKFLOW
// -------------------------------------------------------------
export async function deleteWorkflow(id: string): Promise<void> {
  if (isDemoMode()) {
    initLocalDemoWorkflows();
    const list = JSON.parse(localStorage.getItem('xeno_demo_workflows') || '[]');
    const filtered = list.filter((w: any) => w.id !== id);
    localStorage.setItem('xeno_demo_workflows', JSON.stringify(filtered));
    return;
  }

  const uid = getUid();
  if (uid) {
    try {
      await deleteDoc(doc(db, 'users', uid, 'workflow_automations', id));
      return;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${uid}/workflow_automations/${id}`);
    }
  }

  const res = await fetch(`${API_BASE}/workflows/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete workflow');
}

// -------------------------------------------------------------
// EXECUTE WORKFLOW (SIMULATION/AI MATCHING)
// -------------------------------------------------------------
export async function executeWorkflow(id: string): Promise<WorkflowExecutionResponse> {
  if (isDemoMode()) {
    initLocalDemoWorkflows();
    const list = JSON.parse(localStorage.getItem('xeno_demo_workflows') || '[]');
    const workflow = list.find((w: any) => w.id === id);
    if (!workflow) throw new Error('Workflow not found');

    // Update lastExecuted
    workflow.lastExecuted = new Date().toISOString();
    localStorage.setItem('xeno_demo_workflows', JSON.stringify(list));

    const recCampaignName = `Automated ${workflow.name} Campaign`;
    return {
      workflow,
      generatedCampaign: recCampaignName,
      message: `Dear Coffee Connoisseur, customized notification trigger [${workflow.action}] matched your recent actions. Let's brew custom coffee together!`,
      predictedRecovery: Math.floor(Math.random() * 15000) + 5000,
      reason: `Automated execution successful in demo mode. Met condition: "${workflow.condition}".`
    };
  }

  const uid = getUid();
  const res = await fetch(`${API_BASE}/workflows/${id}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid })
  });
  if (!res.ok) throw new Error('Failed to execute workflow');
  return res.json();
}

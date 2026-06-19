/**
 * src/services/workflowService.ts
 * 
 * Manages automation workflows using Firestore sub-collection 'workflow_automations'
 * or local storage fallback in demo mode.
 */

import { db, handleFirestoreError, OperationType } from '../lib/firebase.js';
import { isDemoMode, getUid } from '../lib/api/auth.js';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc,
  deleteDoc 
} from 'firebase/firestore';

export interface WorkflowAutomation {
  id: string;
  name: string;
  trigger: 'customer_inactive' | 'high_churn_risk' | 'high_value_customer' | 'new_customer' | string;
  condition?: string;
  action: 'generate_campaign' | 'send_whatsapp' | 'notify_sales' | string;
  status: 'active' | 'paused';
  createdAt: string;
  lastExecuted?: string;
}

const LOCAL_STORAGE_KEY = 'mochi_workflow_automations';

// Helper to load fallback presets if storage is empty
function getLocalWorkflows(): WorkflowAutomation[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error parsing local workflows:', e);
  }
  const defaultWorkflows: WorkflowAutomation[] = [
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
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultWorkflows));
  return defaultWorkflows;
}

function saveLocalWorkflows(wfs: WorkflowAutomation[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(wfs));
}

const API_BASE = '/api';

export const workflowService = {
  /**
   * Retrieves all workflow automations.
   */
  async getWorkflows(): Promise<WorkflowAutomation[]> {
    if (isDemoMode()) {
      return getLocalWorkflows();
    }

    const uid = getUid();
    if (!uid) {
      // Direct call fallback via API
      const res = await fetch(`${API_BASE}/workflows`);
      if (!res.ok) throw new Error('Failed to fetch workflows from server');
      return res.json();
    }

    const collPath = `users/${uid}/workflow_automations`;
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'workflow_automations'));
      const list: WorkflowAutomation[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as WorkflowAutomation);
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collPath);
    }
  },

  /**
   * Creates new automation workflow.
   */
  async createWorkflow(workflow: Partial<WorkflowAutomation>): Promise<WorkflowAutomation> {
    const newWf: WorkflowAutomation = {
      id: workflow.id || `wf_${Date.now()}`,
      name: workflow.name || 'Untitled Automation',
      trigger: workflow.trigger || 'customer_inactive',
      condition: workflow.condition || '',
      action: workflow.action || 'generate_campaign',
      status: workflow.status || 'active',
      createdAt: new Date().toISOString(),
      lastExecuted: workflow.lastExecuted
    };

    if (isDemoMode()) {
      const list = getLocalWorkflows();
      list.push(newWf);
      saveLocalWorkflows(list);
      return newWf;
    }

    const uid = getUid();
    if (!uid) {
      // API proxy fallback
      const response = await fetch(`${API_BASE}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWf)
      });
      if (!response.ok) throw new Error('Server workflows creation failed');
      return response.json();
    }

    const path = `users/${uid}/workflow_automations/${newWf.id}`;
    try {
      await setDoc(doc(db, 'users', uid, 'workflow_automations', newWf.id), newWf);
      return newWf;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  /**
   * Updates an existing automation workflow.
   */
  async updateWorkflow(id: string, data: Partial<WorkflowAutomation>): Promise<WorkflowAutomation> {
    if (isDemoMode()) {
      const list = getLocalWorkflows();
      const idx = list.findIndex(w => w.id === id);
      if (idx === -1) throw new Error('Workflow not found');
      const updated = { ...list[idx], ...data };
      list[idx] = updated;
      saveLocalWorkflows(list);
      return updated;
    }

    const uid = getUid();
    if (!uid) {
      // API proxy fallback
      const response = await fetch(`${API_BASE}/workflows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Server workflows update failed');
      return response.json();
    }

    const path = `users/${uid}/workflow_automations/${id}`;
    try {
      const docRef = doc(db, 'users', uid, 'workflow_automations', id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        throw new Error('Workflow document not found in Firestore');
      }
      const updated = { ...snap.data(), ...data };
      await setDoc(docRef, updated);
      return updated as WorkflowAutomation;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Deletes a workflow.
   */
  async deleteWorkflow(id: string): Promise<boolean> {
    if (isDemoMode()) {
      const list = getLocalWorkflows();
      const filtered = list.filter(w => w.id !== id);
      saveLocalWorkflows(filtered);
      return true;
    }

    const uid = getUid();
    if (!uid) {
      // API proxy fallback
      const response = await fetch(`${API_BASE}/workflows/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Server workflows delete failed');
      const result = await response.json();
      return !!result.success;
    }

    const path = `users/${uid}/workflow_automations/${id}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'workflow_automations', id));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  /**
   * Triggers workflow execution and calls Gemini server endpoint.
   */
  async executeWorkflow(id: string): Promise<any> {
    // Both offline and live mode hit the execution API endpoint for deep AI cohort matching.
    const response = await fetch(`${API_BASE}/workflows/${id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Error executing workflow on automation backend server');
    
    const result = await response.json();
    
    // In demo mode, update the local storage to reflect executions
    if (isDemoMode()) {
      const list = getLocalWorkflows();
      const idx = list.findIndex(w => w.id === id);
      if (idx !== -1) {
        list[idx].lastExecuted = new Date().toISOString();
        saveLocalWorkflows(list);
      }
    }
    return result;
  },

  /**
   * Pauses / resumes a workflow.
   */
  async pauseWorkflow(id: string): Promise<WorkflowAutomation> {
    return this.updateWorkflow(id, { status: 'paused' });
  },

  async resumeWorkflow(id: string): Promise<WorkflowAutomation> {
    return this.updateWorkflow(id, { status: 'active' });
  }
};

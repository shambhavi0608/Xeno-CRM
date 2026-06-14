// Compliance Logs and Audits Persistence Core
export interface ComplianceLog {
  id: string;
  action: string;
  details: string;
  category: 'campaign' | 'security' | 'user' | 'system';
  user: string;
  ipAddress: string;
  timestamp: string;
}

const COMPLIANCE_LOGS_KEY = 'xeno_compliance_logs';

const SEED_LOGS: ComplianceLog[] = [
  {
    id: 'log-1',
    action: 'USER_AUTHENTICATION_SUCCESS',
    details: 'User authenticated successfully. CRM cloud handshake completed.',
    category: 'user',
    user: 'trivedishambhavi5@gmail.com',
    ipAddress: '157.45.21.198',
    timestamp: new Date(Date.now() - 4 * 10 * 60 * 1000).toISOString()
  },
  {
    id: 'log-2',
    action: 'DATABASE_SEED_INITIALIZED',
    details: 'Hydrated local sandbox database with 8 curated coffee shop retention demographics.',
    category: 'system',
    user: 'SYSTEM_DAEMON',
    ipAddress: '127.0.0.1',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'log-3',
    action: 'CAMPAIGN_DRAFT_CREATED',
    details: 'Registered campaign "Organic VIP Offer — EMAIL" with matchedCount: 5.',
    category: 'campaign',
    user: 'trivedishambhavi5@gmail.com',
    ipAddress: '157.45.21.198',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'log-4',
    action: 'CAMPAIGN_DISPATCHED_SECURE',
    details: 'Successfully deployed webhook loops for "Fresh Roast Campaign" targeting whatsapp cohort.',
    category: 'campaign',
    user: 'trivedishambhavi5@gmail.com',
    ipAddress: '157.45.21.198',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    id: 'log-5',
    action: 'CORS_POLICY_HANDSHAKE',
    details: 'Helmet security layers active. Restricting wildcard resource sharing origins in production.',
    category: 'security',
    user: 'SECURITY_CORAL',
    ipAddress: '10.0.8.4',
    timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString()
  }
];

export function getComplianceLogs(): ComplianceLog[] {
  const local = localStorage.getItem(COMPLIANCE_LOGS_KEY);
  if (!local) {
    localStorage.setItem(COMPLIANCE_LOGS_KEY, JSON.stringify(SEED_LOGS));
    return SEED_LOGS;
  }
  try {
    const parsed = JSON.parse(local) as ComplianceLog[];
    // Sort reverse chronological
    return parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (e) {
    return SEED_LOGS;
  }
}

export function addComplianceLog(
  action: string, 
  details: string, 
  category: 'campaign' | 'security' | 'user' | 'system',
  userEmail: string = 'trivedishambhavi5@gmail.com'
): ComplianceLog[] {
  const logs = getComplianceLogs();
  const newLog: ComplianceLog = {
    id: `log_rec_${Date.now()}`,
    action,
    details,
    category,
    user: userEmail,
    ipAddress: '157.45.21.198',
    timestamp: new Date().toISOString()
  };
  
  const updated = [newLog, ...logs];
  localStorage.setItem(COMPLIANCE_LOGS_KEY, JSON.stringify(updated));
  return updated;
}

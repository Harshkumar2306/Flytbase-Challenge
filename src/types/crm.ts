export type FactStatus = 'verified' | 'told' | 'claim' | 'unknown';

export type DealStage = 'identified' | 'qualified' | 'cleared' | 'agreed' | 'lost' | 'unqualified';

export type StakeholderRoleType = 
  | 'decision_maker' 
  | 'payer' 
  | 'user' 
  | 'blocker' 
  | 'champion' 
  | 'influencer' 
  | 'unknown';

export type RelationshipStatus = 'ally' | 'warm' | 'neutral' | 'guarded' | 'unknown';

export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

export interface EvidenceReference {
  id: string;
  sourceType: 'file' | 'person' | 'paperwork' | 'contract' | 'email' | 'call' | 'ticket' | 'calculation' | 'fact';
  sourceTitle: string;
  content: string;
  factStatus: FactStatus;
  saidBy?: string;
  verifiedBy?: string;
  learnedAtMinute?: number;
  filePath?: string;
  recordPath?: string;
}

export interface DealCalculation {
  formula: string;
  inputs: Array<{
    label: string;
    value: string | number;
    sourceId: string;
    factStatus: FactStatus;
  }>;
  explanation: string;
}

export interface Deal {
  id: string;
  accountId: string;
  name: string;
  currency: string;
  contractBaselineValue?: number; // Verified order form baseline revenue
  discoveryEstimateValue?: number; // Morning discovery qualified progression estimate
  nominalCeilingValue?: number; // Maximum uncommitted framework or expansion potential
  nominalValue: number; // e.g. worth_up_to or contract value
  supportedValue: number; // evidenced contract baseline or qualified discovery estimate
  unsupportedValue: number; // unevidenced amount
  stage: DealStage;
  statusText: string;
  blocker: {
    text: string;
    status: 'open' | 'cleared' | 'none';
    clearedEvidenceId?: string;
  } | null;
  deadline?: {
    text: string;
    soon: boolean;
    passed: boolean;
    movesLeft?: number | null;
    dueDate?: string;
  } | null;
  evidenceIds: string[];
  evidenceItems: EvidenceReference[];
  calculation?: DealCalculation;
  stakeholders: Array<{
    personId: string;
    role: StakeholderRoleType;
    details: string;
  }>;
  whatMovesIt?: string;
}

export interface Stakeholder {
  id: string;
  accountId: string;
  name: string;
  title: string;
  relationshipStatus: RelationshipStatus;
  available: boolean;
  isMet: boolean;
  decisionMakerStatus: boolean | 'unknown';
  payerStatus: boolean | 'unknown';
  operationalUserStatus: boolean | 'unknown';
  technicalBlockerStatus: boolean | 'unknown';
  procurementBlockerStatus: boolean | 'unknown';
  championStatus: boolean | 'unknown';
  lastInteraction?: string;
  needsBeforeProgressing?: string;
  associatedDealIds: string[];
  evidenceIds: string[];
  sourceRecords: string[];
  notes?: string;
}

export interface ActionItem {
  id: string;
  rank: number;
  priorityScore: number;
  scoringFactors: {
    dealValueWeight: number; // 0-30
    deadlineUrgency: number; // 0-25
    blockerClearance: number; // 0-25
    evidenceReadiness: number; // 0-20
  };
  title: string;
  description: string;
  responsibleOwner: string; // e.g. "Rhys Calder" or "Owner unassigned"
  dueDate: string; // ISO date or "Date not established"
  accountId: string;
  relatedDealId: string;
  relevantStakeholderId?: string;
  reasonForPrioritization: string;
  evidenceIds: string[];
  expectedOutcome: string;
  dependency: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
}

export interface RiskItem {
  id: string;
  riskId?: string;
  title: string;
  accountId: string;
  relatedDealId?: string;
  severity: RiskSeverity;
  probability?: string; // only if supported
  whyItMatters: string;
  triggerOrDeadline: string;
  recommendedMitigation: string;
  responsibleOwner: string;
  evidenceIds: string[];
  sourceRecords: string[];
  statusColor: 'red' | 'amber' | 'green' | 'gray';
}

export interface KnowledgeGap {
  id: string;
  title: string;
  accountId: string;
  relatedDealId?: string;
  whyItMatters: string;
  whoCanFill: string;
  recommendedQuestion: string;
  priority: 'critical' | 'high' | 'medium';
  blocksDealProgression: boolean;
  category: 'financial' | 'decision_authority' | 'payer' | 'technical' | 'compliance' | 'operational';
  evidenceIds: string[];
  status: 'unknown' | 'not_found_in_records' | 'confirmed_not_available';
}

export interface AccountData {
  id: string;
  name: string;
  officialStory: string;
  sector: string;
  currency: string;
  signedContractBaseline: number; // Existing signed contract revenue verified by order form
  qualifiedDiscoveryEstimate: number; // Sum of morning discovery qualified deal valuations
  nominalOpportunityCeiling: number; // Maximum uncommitted framework / expansion ceiling
  unbackedCustomerClaims: number; // Unbacked claims (e.g. €1.2M savings claim)
  signedContractValue: number; // Legacy alias for signedContractBaseline
  futurePipelineEstimate: number; // Legacy alias for qualifiedDiscoveryEstimate
  supportedPipeline: number; // Disambiguated in UI: displays discovery estimate with explicit labels
  unbackedPipeline: number;
  totalNominalPipeline: number;
  deals: Deal[];
  stakeholders: Stakeholder[];
  topActions: ActionItem[];
  allActions: ActionItem[];
  risks: RiskItem[];
  knowledgeGaps: KnowledgeGap[];
  deadlines: Array<{
    text: string;
    passed: boolean;
    soon?: boolean;
    movesLeft?: number | null;
  }>;
  offers: Array<{
    id: string;
    title: string;
    value: number;
    pitchTo: string;
    status: string;
  }>;
  notOnFile: string[];
}

export interface LiveSignal {
  id: string;
  timestamp: string;
  accountId?: string;
  dealId?: string;
  text: string;
  sourceId: string;
  impactsRisk?: string;
  impactsAction?: string;
  impactsDeal?: string;
}

export interface CRMNote {
  id: string;
  accountId: string;
  kind: 'note' | 'task' | 'risk' | 'next_step';
  title?: string;
  text: string;
  createdAt: string;
  author: string;
  syncStatus?: 'synced' | 'saved_locally_pending' | 'pending_retry';
  remoteConfirmedAt?: string;
  remoteError?: string;
}

export interface EvidenceRecord {
  path: string;
  kind: string;
  account: string;
  summary: string;
  content: string;
}

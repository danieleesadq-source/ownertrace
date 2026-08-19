/**
 * Shared types matching frontend/src/lib/types.ts exactly.
 * Keep these two files in sync if the data model changes.
 */

export type NodeType = 'person' | 'property';
export type RiskScore = number;

export interface Transaction {
  id: string;
  date: string;
  propertyId: string;
  role?: string;
  amount: string;
  isFlagged: boolean;
  statusText?: string;
}

export interface OwnerHistory {
  name: string;
  date: string;
  amount: string;
  isFlagged?: boolean;
}

export interface Person {
  id: string;
  type: 'person';
  name: string;
  ssn: string;
  role: string;
  riskScore: RiskScore;
  isFlagged: boolean;
  connectionsCount: number;
  flagExplanation?: string;
  transactions: Transaction[];
}

export interface Property {
  id: string;
  type: 'property';
  address: string;
  propertyId: string;
  location: string;
  size: string;
  propertyType: string;
  riskScore: RiskScore;
  isFlagged: boolean;
  flagExplanation?: string;
  ownershipHistory: OwnerHistory[];
}

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  sublabel: string;
  isFlagged: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  isFlagged: boolean;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

export type EntityDetails = Person | Property;

// --- Pattern detection (backend-only — not mirrored to the frontend types
// file since no UI consumes this yet; see /api/patterns) -------------------

export interface CircularFlipPattern {
  type: 'circular_flip';
  personA: { id: string; name: string };
  personB: { id: string; name: string };
  property: { id: string; address: string };
  firstDate: string;
  secondDate: string;
  firstAmount: string;
  secondAmount: string;
}

export interface WitnessThenBuyerPattern {
  type: 'witness_then_buyer';
  witness: { id: string; name: string };
  witnessedProperty: { id: string; address: string };
  purchasedProperty: { id: string; address: string };
  sharedParticipant: { id: string; name: string };
}

export type SuspiciousPattern = CircularFlipPattern | WitnessThenBuyerPattern;

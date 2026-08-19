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
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  isFlagged: boolean;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

export interface SearchResult {
  graph: GraphData;
}

export type EntityDetails = Person | Property;

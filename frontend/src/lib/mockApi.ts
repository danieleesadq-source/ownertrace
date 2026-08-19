import { GraphData, EntityDetails } from './types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mockGraph: GraphData = {
  nodes: [
    { id: 'p1', type: 'person', label: 'Marcus Whitfield', sublabel: '•••-••-4521', isFlagged: true },
    { id: 'p2', type: 'person', label: 'Diane Castellano', sublabel: '•••-••-1122', isFlagged: false },
    { id: 'p3', type: 'person', label: 'Ray Delgado', sublabel: '•••-••-9988', isFlagged: true },
    { id: 'p4', type: 'person', label: 'Angela Brooks', sublabel: '•••-••-4433', isFlagged: false },
    { id: 'prop1', type: 'property', label: '1420 Maple Avenue, Austin', sublabel: 'APN-4471-020-015', isFlagged: true },
    { id: 'prop2', type: 'property', label: '88 Birchwood Court, Denver', sublabel: 'APN-2203-118-004', isFlagged: false },
    { id: 'prop3', type: 'property', label: '501 Harbor View Blvd, Miami', sublabel: 'APN-7790-045-201', isFlagged: true }
  ],
  links: [
    { source: 'p1', target: 'prop1', isFlagged: true, label: 'Buyer' },
    { source: 'p2', target: 'prop1', isFlagged: false, label: 'Seller' },
    { source: 'p3', target: 'prop1', isFlagged: true, label: 'Witness' },
    // prop3 circular flip loop: Marcus and Ray traded roles 3 times in 39 days
    { source: 'p1', target: 'prop3', isFlagged: true, label: 'Seller' },
    { source: 'p1', target: 'prop3', isFlagged: true, label: 'Buyer' },
    { source: 'p3', target: 'prop3', isFlagged: true, label: 'Buyer' },
    { source: 'p3', target: 'prop3', isFlagged: true, label: 'Seller' },
    { source: 'p4', target: 'prop2', isFlagged: false, label: 'Owner' },
    { source: 'p2', target: 'prop2', isFlagged: false, label: 'Previous Owner' },
  ]
};

const mockEntities: Record<string, EntityDetails> = {
  'p1': {
    id: 'p1',
    type: 'person',
    name: 'Marcus Whitfield',
    ssn: '•••-••-4521',
    role: 'Frequent Buyer / Seller',
    riskScore: 85,
    isFlagged: true,
    connectionsCount: 6,
    flagExplanation: 'This person repeatedly flips the same property back and forth with Ray Delgado at escalating prices — a circular transaction pattern within a short timeframe.',
    transactions: [
      { id: 't1', date: '2024-01-12', propertyId: 'APN-4471-020-015', role: 'Buyer', amount: '$650,000', isFlagged: true, statusText: 'Flagged' },
      { id: 't4', date: '2024-01-20', propertyId: 'APN-7790-045-201', role: 'Seller', amount: '$2,100,000', isFlagged: true, statusText: 'Flagged' },
      { id: 't9', date: '2024-02-08', propertyId: 'APN-7790-045-201', role: 'Buyer', amount: '$2,600,000', isFlagged: true, statusText: 'Flagged' },
      { id: 't10', date: '2024-02-28', propertyId: 'APN-7790-045-201', role: 'Seller', amount: '$3,200,000', isFlagged: true, statusText: 'Flagged' },
    ]
  },
  'p2': {
    id: 'p2',
    type: 'person',
    name: 'Diane Castellano',
    ssn: '•••-••-1122',
    role: 'Seller',
    riskScore: 12,
    isFlagged: false,
    connectionsCount: 2,
    transactions: [
      { id: 't3', date: '2024-01-12', propertyId: 'APN-4471-020-015', role: 'Seller', amount: '$650,000', isFlagged: false, statusText: 'Clean' },
      { id: 't4', date: '2019-06-15', propertyId: 'APN-2203-118-004', role: 'Seller', amount: '$410,000', isFlagged: false, statusText: 'Clean' },
    ]
  },
  'p3': {
    id: 'p3',
    type: 'person',
    name: 'Ray Delgado',
    ssn: '•••-••-9988',
    role: 'Witness / Buyer',
    riskScore: 78,
    isFlagged: true,
    connectionsCount: 6,
    flagExplanation: 'This person witnessed a transaction they later profited from, then repeatedly flipped the same property back and forth with the seller at escalating prices.',
    transactions: [
      { id: 't3', date: '2024-01-12', propertyId: 'APN-4471-020-015', role: 'Witness', amount: 'N/A', isFlagged: true, statusText: 'Flagged' },
      { id: 't5', date: '2024-01-20', propertyId: 'APN-7790-045-201', role: 'Buyer', amount: '$2,100,000', isFlagged: true, statusText: 'Flagged' },
      { id: 't8', date: '2024-02-08', propertyId: 'APN-7790-045-201', role: 'Seller', amount: '$2,600,000', isFlagged: true, statusText: 'Flagged' },
      { id: 't11', date: '2024-02-28', propertyId: 'APN-7790-045-201', role: 'Buyer', amount: '$3,200,000', isFlagged: true, statusText: 'Flagged' },
    ]
  },
  'p4': {
    id: 'p4',
    type: 'person',
    name: 'Angela Brooks',
    ssn: '•••-••-4433',
    role: 'Owner',
    riskScore: 5,
    isFlagged: false,
    connectionsCount: 1,
    transactions: [
      { id: 't7', date: '2019-06-15', propertyId: 'APN-2203-118-004', role: 'Buyer', amount: '$410,000', isFlagged: false, statusText: 'Clean' },
    ]
  },
  'prop1': {
    id: 'prop1',
    type: 'property',
    address: '1420 Maple Avenue, Austin, TX 78701',
    propertyId: 'APN-4471-020-015',
    location: 'Austin, TX',
    size: '2,400 sq ft',
    propertyType: 'Single-Family Home',
    riskScore: 82,
    isFlagged: true,
    flagExplanation: 'Property was sold below market value and involves a high-risk individual (Marcus Whitfield) in its recent transaction chain.',
    ownershipHistory: [
      { name: 'Marcus Whitfield', date: '2024-01-12', amount: '$650,000', isFlagged: true },
      { name: 'Diane Castellano', date: '2015-08-11', amount: '$260,000', isFlagged: false },
    ]
  },
  'prop2': {
    id: 'prop2',
    type: 'property',
    address: '88 Birchwood Court, Denver, CO 80202',
    propertyId: 'APN-2203-118-004',
    location: 'Denver, CO',
    size: '1,100 sq ft',
    propertyType: 'Condominium',
    riskScore: 15,
    isFlagged: false,
    ownershipHistory: [
      { name: 'Angela Brooks', date: '2019-06-15', amount: '$410,000', isFlagged: false },
      { name: 'Diane Castellano', date: '2012-01-15', amount: '$150,000', isFlagged: false },
    ]
  },
  'prop3': {
    id: 'prop3',
    type: 'property',
    address: '501 Harbor View Blvd, Miami, FL 33131',
    propertyId: 'APN-7790-045-201',
    location: 'Miami, FL',
    size: '8,500 sq ft',
    propertyType: 'Commercial',
    riskScore: 90,
    isFlagged: true,
    flagExplanation: '3 transactions between the same two related parties within 39 days, price escalating on every flip ($2.1M → $2.6M → $3.2M). Clear signs of an orchestrated flip ring.',
    ownershipHistory: [
      { name: 'Ray Delgado', date: '2024-02-28', amount: '$3,200,000', isFlagged: true },
      { name: 'Marcus Whitfield', date: '2024-02-08', amount: '$2,600,000', isFlagged: true },
      { name: 'Ray Delgado', date: '2024-01-20', amount: '$2,100,000', isFlagged: true },
    ]
  }
};

export async function searchOwnershipGraph(query: string): Promise<GraphData> {
  const waitTime = Math.floor(Math.random() * 500) + 400;
  await delay(waitTime);

  if (query.toLowerCase() === 'error') {
    throw new Error("The connection timed out. Check your network and try again.");
  }

  if (query.toLowerCase() === 'noresults') {
    return { nodes: [], links: [] };
  }

  if (query.toLowerCase() === 'clean') {
    return {
      nodes: [
        { id: 'p4', type: 'person', label: 'Angela Brooks', sublabel: '•••-••-4433', isFlagged: false },
        { id: 'prop2', type: 'property', label: '88 Birchwood Court, Denver', sublabel: 'APN-2203-118-004', isFlagged: false },
      ],
      links: [
        { source: 'p4', target: 'prop2', isFlagged: false, label: 'Owner' }
      ]
    };
  }

  // Return the full mock graph by default for any other query
  return mockGraph;
}

export async function getEntityDetails(id: string): Promise<EntityDetails> {
  const waitTime = Math.floor(Math.random() * 500) + 400;
  await delay(waitTime);

  const entity = mockEntities[id];
  if (!entity) {
    throw new Error("Entity not found in the case file.");
  }
  return entity;
}

import { create } from 'zustand';
import { TxRecord, ContractEvent, ProcurementRequest, Bid, RequestStatus, BidStatus } from '../types';

interface AppState {
  // Wallet
  address: string | null;
  walletName: string | null;
  balance: string;
  isConnecting: boolean;
  
  // Transaction Tracking
  transactions: TxRecord[];
  
  // Live Events
  events: ContractEvent[];
  
  // Live Data Cache
  liveRequests: ProcurementRequest[];
  liveBids: Record<number, Bid[]>; // requestId -> bids
  
  // Actions
  connectWallet: (address: string, walletName: string) => void;
  disconnectWallet: () => void;
  setBalance: (balance: string) => void;
  setConnecting: (isConnecting: boolean) => void;
  
  addTransaction: (hash: string, title: string) => void;
  updateTransactionStatus: (hash: string, status: 'pending' | 'success' | 'failed') => void;
  
  addEvent: (event: Omit<ContractEvent, 'id' | 'timestamp'>) => void;
  setEvents: (events: ContractEvent[]) => void;
  setLiveRequests: (requests: ProcurementRequest[]) => void;
  setLiveBids: (requestId: number, bids: Bid[]) => void;
}

// Helper to construct explorer links
export const getExplorerLink = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`;

// High-fidelity Mock Data for premium aesthetic fallback
export const mockRequests: ProcurementRequest[] = [
  {
    id: 101,
    buyer: 'GBUYER...OFFICE',
    token: 'CDLZFC3SYJYDATH7K42SBVS4M2ZEDFGEKZWUW4T75W5NZIG3J5Z3W2W3',
    title: 'High-Performance Workstations',
    description: 'Procurement of 12 developer workstations with 64GB RAM, 2TB NVMe SSDs, and dedicated GPUs for AI model training.',
    budget: BigInt(8500) * BigInt(10000000), // standard native stroops
    status: RequestStatus.InProgress,
    selectedBidId: 201,
    createdAt: Math.floor(Date.now() / 1000) - 172800, // 2 days ago
  },
  {
    id: 102,
    buyer: 'GBUYER...INFRA',
    token: 'CDLZFC3SYJYDATH7K42SBVS4M2ZEDFGEKZWUW4T75W5NZIG3J5Z3W2W3',
    title: 'Cloud Infrastructure Upgrade',
    description: 'Decentralized nodes hosting services and dedicated validator setup. Looking for server hardware lease or hosting services.',
    budget: BigInt(15000) * BigInt(10000000),
    status: RequestStatus.Open,
    selectedBidId: null,
    createdAt: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
  },
  {
    id: 103,
    buyer: 'GBUYER...SUPPLY',
    token: 'CDLZFC3SYJYDATH7K42SBVS4M2ZEDFGEKZWUW4T75W5NZIG3J5Z3W2W3',
    title: 'Smart Office IoT Setup',
    description: 'Sourcing components for lighting controls, thermodynamic optimization systems, and smart presence sensors.',
    budget: BigInt(3200) * BigInt(10000000),
    status: RequestStatus.Completed,
    selectedBidId: 203,
    createdAt: Math.floor(Date.now() / 1000) - 345600, // 4 days ago
  }
];

export const mockBids: Record<number, Bid[]> = {
  101: [
    {
      id: 201,
      requestId: 101,
      vendor: 'GVEN1...SERVERS',
      amount: BigInt(8100) * BigInt(10000000),
      deliveryTime: 5,
      description: 'Enterprise rackmounted units with customized liquid cooling. Full SLA contract included.',
      status: BidStatus.Accepted,
      createdAt: Math.floor(Date.now() / 1000) - 150000,
    },
    {
      id: 202,
      requestId: 101,
      vendor: 'GVEN2...DESKTOPS',
      amount: BigInt(8400) * BigInt(10000000),
      deliveryTime: 10,
      description: 'Standard desktop towers. 3-year hardware warranty included.',
      status: BidStatus.Rejected,
      createdAt: Math.floor(Date.now() / 1000) - 160000,
    }
  ],
  102: [
    {
      id: 204,
      requestId: 102,
      vendor: 'GVEN1...SERVERS',
      amount: BigInt(14200) * BigInt(10000000),
      deliveryTime: 14,
      description: 'Dedicated hypervisor hosting in Tier-4 Datacenter with direct peering nodes.',
      status: BidStatus.Pending,
      createdAt: Math.floor(Date.now() / 1000) - 30000,
    }
  ],
  103: [
    {
      id: 203,
      requestId: 103,
      vendor: 'GVEN3...IoT',
      amount: BigInt(3000) * BigInt(10000000),
      deliveryTime: 3,
      description: 'Complete kit of 120 smart sensors and integrated central console.',
      status: BidStatus.Accepted,
      createdAt: Math.floor(Date.now() / 1000) - 300000,
    }
  ]
};

export const mockEvents: ContractEvent[] = [
  {
    id: 'evt_1',
    type: 'completed',
    requestId: 103,
    wallet: 'GBUYER...SUPPLY',
    details: 'Procurement complete. Released 3000.0 XLM to vendor GVEN3...IoT and refunded 200.0 XLM to buyer.',
    timestamp: Date.now() - 3600000 * 2, // 2 hrs ago
  },
  {
    id: 'evt_2',
    type: 'selected',
    requestId: 101,
    wallet: 'GBUYER...OFFICE',
    details: 'Selected Bid #201 by GVEN1...SERVERS for 8100.0 XLM.',
    timestamp: Date.now() - 3600000 * 5, // 5 hrs ago
  },
  {
    id: 'evt_3',
    type: 'placed',
    requestId: 102,
    wallet: 'GVEN1...SERVERS',
    details: 'Submitted Bid #204 for 14200.0 XLM (Delivery in 14 days).',
    timestamp: Date.now() - 3600000 * 8, // 8 hrs ago
  },
  {
    id: 'evt_4',
    type: 'created',
    requestId: 102,
    wallet: 'GBUYER...INFRA',
    details: 'Created RFP for Cloud Infrastructure Upgrade with budget 15000.0 XLM.',
    timestamp: Date.now() - 3600000 * 24, // 24 hrs ago
  }
];

export const useAppStore = create<AppState>((set) => ({
  // Wallet
  address: null,
  walletName: null,
  balance: '0.00',
  isConnecting: false,
  
  // Transaction Tracking
  transactions: [],
  
  // Live Events
  events: [],
  
  // Live Data Cache
  liveRequests: [],
  liveBids: {},
  
  // Actions
  connectWallet: (address, walletName) => set({ address, walletName }),
  disconnectWallet: () => set({ address: null, walletName: null, balance: '0.00' }),
  setBalance: (balance) => set({ balance }),
  setConnecting: (isConnecting) => set({ isConnecting }),
  
  addTransaction: (hash, title) => set((state) => ({
    transactions: [
      {
        hash,
        title,
        status: 'pending',
        timestamp: Math.floor(Date.now() / 1000),
        explorerLink: getExplorerLink(hash)
      },
      ...state.transactions
    ]
  })),
  
  updateTransactionStatus: (hash, status) => set((state) => ({
    transactions: state.transactions.map((tx) => 
      tx.hash === hash ? { ...tx, status } : tx
    )
  })),
  
  addEvent: (event) => set((state) => ({
    events: [
      {
        ...event,
        id: `live_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      },
      ...state.events
    ]
  })),
  
  setEvents: (events) => set({ events }),
  setLiveRequests: (liveRequests) => set({ liveRequests }),
  setLiveBids: (requestId, bids) => set((state) => ({
    liveBids: {
      ...state.liveBids,
      [requestId]: bids
    }
  }))
}));

export interface ProcurementRequest {
  id: number;
  buyer: string;
  token: string;
  title: string;
  description: string;
  budget: bigint;
  status: RequestStatus; // 0 = Open, 1 = InProgress, 2 = Completed, 3 = Cancelled
  selectedBidId: number | null;
  createdAt: number;
}

export interface Bid {
  id: number;
  requestId: number;
  vendor: string;
  amount: bigint;
  deliveryTime: number; // in days
  description: string;
  status: BidStatus; // 0 = Pending, 1 = Accepted, 2 = Rejected
  createdAt: number;
}

export enum RequestStatus {
  Open = 0,
  InProgress = 1,
  Completed = 2,
  Cancelled = 3,
}

export enum BidStatus {
  Pending = 0,
  Accepted = 1,
  Rejected = 2,
}

export type TxStatus = 'pending' | 'success' | 'failed';

export interface TxRecord {
  hash: string;
  title: string;
  status: TxStatus;
  timestamp: number;
  explorerLink: string;
}

export interface ContractEvent {
  id: string;
  type: 'created' | 'placed' | 'selected' | 'completed' | 'cancelled';
  requestId: number;
  wallet: string;
  details: string;
  timestamp: number;
}

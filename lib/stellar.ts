import { rpc, Contract, Address, TransactionBuilder, Account, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';
import { ProcurementRequest, Bid } from '../types';

export const RPC_URL = 'https://soroban-testnet.stellar.org';
export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
export const CONTRACT_ID = 'CABYZJQCDECRTGDY6UP2RD2ESBF6CTUSKABVRWZUGVATXR3MHSGEZHQO';
export const NATIVE_TOKEN_ID = 'CDLZFC3SYJYDATH7K42SBVS4M2ZEDFGEKZWUW4T75W5NZIG3J5Z3W2W3';

export const server = new rpc.Server(RPC_URL);

const DUMMY_SOURCE = 'GBRP5GTY2Y42YZ2YZ2YZ2YZ2YZ2YZ2YZ2YZ2YZ2YZ2YZ2YZ2YZ2YZZQD';

// Read-only contract call
export async function callContractRead(method: string, args: unknown[] = []): Promise<unknown> {
  try {
    const account = new Account(DUMMY_SOURCE, '0');
    const contract = new Contract(CONTRACT_ID);
    
    const scValArgs = args.map(arg => {
      // If the arg is an address-like string that starts with C or G, parse it as Address
      if (typeof arg === 'string' && (arg.startsWith('C') || arg.startsWith('G')) && arg.length === 56) {
        return Address.fromString(arg).toScVal();
      }
      return nativeToScVal(arg);
    });

    const tx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...scValArgs))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    
    if ('error' in sim) {
      console.error(`Simulation error for ${method}:`, sim.error);
      throw new Error(`Simulation failed: ${sim.error}`);
    }

    if (sim.result?.retval) {
      return scValToNative(sim.result.retval);
    }
    
    return null;
  } catch (error: unknown) {
    console.error(`Error in callContractRead for ${method}:`, error);
    throw error;
  }
}

// Map smart contract Request to frontend ProcurementRequest
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapRequest(raw: any): ProcurementRequest {
  return {
    id: Number(raw.id),
    buyer: raw.buyer.toString(),
    token: raw.token.toString(),
    title: raw.title.toString(),
    description: raw.description.toString(),
    budget: BigInt(raw.budget),
    status: Number(raw.status),
    selectedBidId: raw.selected_bid_id ? Number(raw.selected_bid_id) : null,
    createdAt: Number(raw.created_at),
  };
}

// Map smart contract Bid to frontend Bid
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBid(raw: any): Bid {
  return {
    id: Number(raw.id),
    requestId: Number(raw.request_id),
    vendor: raw.vendor.toString(),
    amount: BigInt(raw.amount),
    deliveryTime: Number(raw.delivery_time),
    description: raw.description.toString(),
    status: Number(raw.status),
    createdAt: Number(raw.created_at),
  };
}

// Fetch all requests
export async function getRequests(): Promise<ProcurementRequest[]> {
  const result = await callContractRead('get_all_requests');
  if (!result || !Array.isArray(result)) return [];
  return result.map(mapRequest);
}

// Fetch details for a specific request
export async function getRequest(id: number): Promise<ProcurementRequest | null> {
  const result = await callContractRead('get_request', [id]);
  if (!result) return null;
  return mapRequest(result);
}

// Fetch bids for a request
export async function getRequestBids(id: number): Promise<Bid[]> {
  const result = await callContractRead('get_request_bids', [id]);
  if (!result || !Array.isArray(result)) return [];
  return result.map(mapBid);
}

// Poll Transaction Status helper
export async function pollTxStatus(hash: string): Promise<rpc.Api.GetTransactionResponse> {
  let attempts = 0;
  const maxAttempts = 15;
  
  while (attempts < maxAttempts) {
    const status = await server.getTransaction(hash);
    if (status.status !== 'NOT_FOUND') {
      if (status.status === 'SUCCESS' || status.status === 'FAILED') {
        return status;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;
  }
  
  throw new Error('Transaction polling timed out');
}

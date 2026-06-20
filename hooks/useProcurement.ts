import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  rpc, 
  TransactionBuilder, 
  Contract, 
  Address, 
  scValToNative, 
  nativeToScVal, 
} from '@stellar/stellar-sdk';
import { 
  getRequests, 
  getRequest, 
  getRequestBids, 
  server, 
  CONTRACT_ID, 
  NETWORK_PASSPHRASE,
  NATIVE_TOKEN_ID,
  pollTxStatus
} from '../lib/stellar';
import { getWalletKit } from '../lib/wallet';
import { useAppStore, mockRequests, mockBids, mockEvents } from '../lib/store';
import { ContractEvent } from '../types';

// Helper to prepare transaction with fallback to simulate/assemble
async function prepareTransaction(tx: any) {
  try {
    return await server.prepareTransaction(tx);
  } catch (error) {
    console.warn("prepareTransaction failed, falling back to manual simulate/assemble:", error);
    const sim = await server.simulateTransaction(tx);
    if ('error' in sim) {
      throw new Error(`Simulation failed: ${sim.error}`);
    }
    return rpc.assembleTransaction(tx, sim);
  }
}

// Fetch live events from testnet
export async function fetchContractEvents(): Promise<ContractEvent[]> {
  try {
    const latestLedger = await server.getLatestLedger();
    const startLedger = Math.max(1, latestLedger.sequence - 3000); // query last ~4 hours
    
    const response = await server.getEvents({
      startLedger,
      filters: [
        {
          type: "contract",
          contractIds: [CONTRACT_ID]
        }
      ]
    });
    
    if (!response || !response.events) return [];
    
    return response.events.map((evt) => {
      const topics = evt.topic;
      const val = scValToNative(evt.value);
      const typeSymbol = scValToNative(topics[0]).toString();
      const wallet = scValToNative(topics[1]).toString();
      
      let details = '';
      let requestId = 0;
      
      if (typeSymbol === 'created') {
        requestId = Number(val[0]);
        const budget = Number(val[1]) / 10000000;
        details = `Created RFP #${requestId} with budget of ${budget.toFixed(1)} XLM`;
      } else if (typeSymbol === 'placed') {
        requestId = Number(val[0]);
        const bidId = Number(val[1]);
        const amount = Number(val[2]) / 10000000;
        details = `Submitted Bid #${bidId} for RFP #${requestId} of ${amount.toFixed(1)} XLM`;
      } else if (typeSymbol === 'selected') {
        requestId = Number(val[0]);
        const bidId = Number(val[1]);
        details = `Selected Bid #${bidId} for RFP #${requestId}`;
      } else if (typeSymbol === 'completed') {
        requestId = Number(val[0]);
        const vendor = val[1].toString();
        const amount = Number(val[2]) / 10000000;
        details = `RFP #${requestId} completed. Released ${amount.toFixed(1)} XLM to vendor ${vendor.substring(0,6)}...`;
      } else if (typeSymbol === 'cancelled') {
        requestId = Number(val);
        details = `RFP #${requestId} was cancelled by buyer. Escrow budget refunded.`;
      }
      
      return {
        id: evt.id,
        type: typeSymbol as any,
        requestId,
        wallet,
        details,
        timestamp: Date.now() - (latestLedger.sequence - evt.ledger) * 5000 // estimate age in ms
      };
    });
  } catch (error) {
    console.error("Error fetching contract events:", error);
    return [];
  }
}

// 1. Hook to fetch all requests
export function useRequests() {
  return useQuery({
    queryKey: ['requests'],
    queryFn: async () => {
      const live = await getRequests();
      // If there are no live requests, merge/fall back to high-fidelity mock requests
      if (live.length === 0) {
        return mockRequests;
      }
      return [...live, ...mockRequests];
    },
    refetchInterval: 10000 // Poll every 10 seconds for real-time updates
  });
}

// 2. Hook to fetch detailed request info + bids
export function useRequestDetails(id: number) {
  return useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      // If it's a mock request (id > 100), return mock details
      if (id >= 101) {
        const req = mockRequests.find(r => r.id === id) || null;
        const bids = mockBids[id] || [];
        return { request: req, bids };
      }

      const request = await getRequest(id);
      if (!request) return { request: null, bids: [] };
      const bids = await getRequestBids(id);
      return { request, bids };
    },
    refetchInterval: 5000
  });
}

// 3. Hook to fetch event feed
export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const live = await fetchContractEvents();
      return [...live, ...mockEvents];
    },
    refetchInterval: 5000
  });
}

// Helper to sign and submit a transaction using the static StellarWalletsKit API
async function signAndSubmit(tx: any, address: string) {
  const preparedResult = await prepareTransaction(tx);
  // prepareTransaction may return a TransactionBuilder (needs .build()) or a Transaction
  const builtTx = 'build' in preparedResult && typeof preparedResult.build === 'function'
    ? preparedResult.build()
    : preparedResult;
      const kit = await getWalletKit();
      const { signedTxXdr } = await kit.signTransaction((builtTx as any).toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address,
  });
  const submitted = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE)
  );
  if (submitted.status === 'ERROR') {
    throw new Error(`Transaction rejected by network: ${submitted.errorResult}`);
  }
  return submitted;
}

// 4. Create RFP Mutation
export function useCreateRequest() {
  const queryClient = useQueryClient();
  const { address, addTransaction, updateTransactionStatus } = useAppStore();

  return useMutation({
    mutationFn: async ({ title, description, budget }: { title: string; description: string; budget: number }) => {
      if (!address) throw new Error("Wallet not connected");

      const contract = new Contract(CONTRACT_ID);
      const stroopsBudget = BigInt(budget) * BigInt(10000000);

      const sourceAccount = await server.getAccount(address);
      const tx = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'create_request',
            Address.fromString(address).toScVal(),
            Address.fromString(NATIVE_TOKEN_ID).toScVal(),
            nativeToScVal(title),
            nativeToScVal(description),
            nativeToScVal(stroopsBudget)
          )
        )
        .setTimeout(60)
        .build();

      const submitted = await signAndSubmit(tx, address);

      // Track transaction
      addTransaction(submitted.hash, `Create RFP: "${title}"`);
      
      // Wait for ledger confirmation
      const finalResult = await pollTxStatus(submitted.hash);
      if (finalResult.status === 'SUCCESS') {
        updateTransactionStatus(submitted.hash, 'success');
        return submitted.hash;
      } else {
        updateTransactionStatus(submitted.hash, 'failed');
        throw new Error("Transaction execution failed in ledger");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
}

// 5. Submit Bid Mutation
export function usePlaceBid() {
  const queryClient = useQueryClient();
  const { address, addTransaction, updateTransactionStatus } = useAppStore();

  return useMutation({
    mutationFn: async ({ requestId, amount, deliveryTime, description }: { requestId: number; amount: number; deliveryTime: number; description: string }) => {
      if (!address) throw new Error("Wallet not connected");

      const contract = new Contract(CONTRACT_ID);
      const stroopsAmount = BigInt(amount) * BigInt(10000000);

      const sourceAccount = await server.getAccount(address);
      const tx = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'place_bid',
            Address.fromString(address).toScVal(),
            nativeToScVal(requestId),
            nativeToScVal(stroopsAmount),
            nativeToScVal(BigInt(deliveryTime)),
            nativeToScVal(description)
          )
        )
        .setTimeout(60)
        .build();

      const submitted = await signAndSubmit(tx, address);

      addTransaction(submitted.hash, `Place Bid on RFP #${requestId}`);
      
      const finalResult = await pollTxStatus(submitted.hash);
      if (finalResult.status === 'SUCCESS') {
        updateTransactionStatus(submitted.hash, 'success');
        return submitted.hash;
      } else {
        updateTransactionStatus(submitted.hash, 'failed');
        throw new Error("Bid placement transaction failed");
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['request', variables.requestId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
}

// 6. Select Bid Mutation
export function useSelectBid() {
  const queryClient = useQueryClient();
  const { address, addTransaction, updateTransactionStatus } = useAppStore();

  return useMutation({
    mutationFn: async ({ requestId, bidId }: { requestId: number; bidId: number }) => {
      if (!address) throw new Error("Wallet not connected");

      const contract = new Contract(CONTRACT_ID);

      const sourceAccount = await server.getAccount(address);
      const tx = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'select_bid',
            Address.fromString(address).toScVal(),
            nativeToScVal(requestId),
            nativeToScVal(bidId)
          )
        )
        .setTimeout(60)
        .build();

      const submitted = await signAndSubmit(tx, address);

      addTransaction(submitted.hash, `Accept Bid #${bidId} on RFP #${requestId}`);
      
      const finalResult = await pollTxStatus(submitted.hash);
      if (finalResult.status === 'SUCCESS') {
        updateTransactionStatus(submitted.hash, 'success');
        return submitted.hash;
      } else {
        updateTransactionStatus(submitted.hash, 'failed');
        throw new Error("Bid selection failed");
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['request', variables.requestId] });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
}

// 7. Complete Request Mutation (Confirm delivery / release escrow)
export function useCompleteRequest() {
  const queryClient = useQueryClient();
  const { address, addTransaction, updateTransactionStatus } = useAppStore();

  return useMutation({
    mutationFn: async (requestId: number) => {
      if (!address) throw new Error("Wallet not connected");

      const contract = new Contract(CONTRACT_ID);

      const sourceAccount = await server.getAccount(address);
      const tx = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'mark_completed',
            Address.fromString(address).toScVal(),
            nativeToScVal(requestId)
          )
        )
        .setTimeout(60)
        .build();

      const submitted = await signAndSubmit(tx, address);

      addTransaction(submitted.hash, `Complete & Release RFP #${requestId}`);
      
      const finalResult = await pollTxStatus(submitted.hash);
      if (finalResult.status === 'SUCCESS') {
        updateTransactionStatus(submitted.hash, 'success');
        return submitted.hash;
      } else {
        updateTransactionStatus(submitted.hash, 'failed');
        throw new Error("Fulfillment confirmation failed");
      }
    },
    onSuccess: (_, requestId) => {
      queryClient.invalidateQueries({ queryKey: ['request', requestId] });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
}

// 8. Cancel Request Mutation
export function useCancelRequest() {
  const queryClient = useQueryClient();
  const { address, addTransaction, updateTransactionStatus } = useAppStore();

  return useMutation({
    mutationFn: async (requestId: number) => {
      if (!address) throw new Error("Wallet not connected");

      const contract = new Contract(CONTRACT_ID);

      const sourceAccount = await server.getAccount(address);
      const tx = new TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'cancel_request',
            Address.fromString(address).toScVal(),
            nativeToScVal(requestId)
          )
        )
        .setTimeout(60)
        .build();

      const submitted = await signAndSubmit(tx, address);

      addTransaction(submitted.hash, `Cancel RFP #${requestId}`);
      
      const finalResult = await pollTxStatus(submitted.hash);
      if (finalResult.status === 'SUCCESS') {
        updateTransactionStatus(submitted.hash, 'success');
        return submitted.hash;
      } else {
        updateTransactionStatus(submitted.hash, 'failed');
        throw new Error("Cancellation failed");
      }
    },
    onSuccess: (_, requestId) => {
      queryClient.invalidateQueries({ queryKey: ['request', requestId] });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  });
}

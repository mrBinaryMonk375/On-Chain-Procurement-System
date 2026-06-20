#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec, token};

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Request {
    pub id: u32,
    pub buyer: Address,
    pub token: Address,
    pub title: String,
    pub description: String,
    pub budget: i128,
    pub status: u32, // 0 = Open, 1 = InInProgress, 2 = Completed, 3 = Cancelled
    pub selected_bid_id: Option<u32>,
    pub created_at: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Bid {
    pub id: u32,
    pub request_id: u32,
    pub vendor: Address,
    pub amount: i128,
    pub delivery_time: u64, // Delivery time in days or timestamp
    pub description: String,
    pub status: u32, // 0 = Pending, 1 = Accepted, 2 = Rejected
    pub created_at: u64,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Request(u32),
    Bid(u32),
    RequestBids(u32),
    RequestsCount,
    BidsCount,
}

#[contract]
pub struct ProcurementContract;

#[contractimpl]
impl ProcurementContract {
    // Helper to get requests count
    fn get_requests_count(env: &Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::RequestsCount)
            .unwrap_or(0)
    }

    // Helper to increment and return new requests count
    fn increment_requests_count(env: &Env) -> u32 {
        let count = Self::get_requests_count(env) + 1;
        env.storage().instance().set(&DataKey::RequestsCount, &count);
        count
    }

    // Helper to get bids count
    fn get_bids_count(env: &Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::BidsCount)
            .unwrap_or(0)
    }

    // Helper to increment and return new bids count
    fn increment_bids_count(env: &Env) -> u32 {
        let count = Self::get_bids_count(env) + 1;
        env.storage().instance().set(&DataKey::BidsCount, &count);
        count
    }

    /// Create a new procurement request (RFP) and lock the budget in escrow.
    pub fn create_request(
        env: Env,
        buyer: Address,
        token: Address,
        title: String,
        description: String,
        budget: i128,
    ) -> u32 {
        buyer.require_auth();
        assert!(budget > 0, "Budget must be greater than zero");

        // Lock funds in contract escrow
        let contract_address = env.current_contract_address();
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&buyer, &contract_address, &budget);

        let request_id = Self::increment_requests_count(&env);
        let request = Request {
            id: request_id,
            buyer: buyer.clone(),
            token,
            title,
            description,
            budget,
            status: 0, // Open
            selected_bid_id: None,
            created_at: env.ledger().timestamp(),
        };

        // Store request in persistent storage
        env.storage().persistent().set(&DataKey::Request(request_id), &request);

        // Initialize empty bids list for this request
        let empty_bids: Vec<u32> = Vec::new(&env);
        env.storage().persistent().set(&DataKey::RequestBids(request_id), &empty_bids);

        // Emit request creation event
        env.events().publish(
            (symbol_short!("created"), buyer),
            (request_id, budget),
        );

        request_id
    }

    /// Submit a bid for a procurement request.
    pub fn place_bid(
        env: Env,
        vendor: Address,
        request_id: u32,
        amount: i128,
        delivery_time: u64,
        description: String,
    ) -> u32 {
        vendor.require_auth();
        assert!(amount > 0, "Bid amount must be greater than zero");

        let request_key = DataKey::Request(request_id);
        assert!(env.storage().persistent().has(&request_key), "Request does not exist");
        
        let request: Request = env.storage().persistent().get(&request_key).unwrap();
        assert!(request.status == 0, "Request is not open for bidding");
        assert!(amount <= request.budget, "Bid amount exceeds request budget");

        let bid_id = Self::increment_bids_count(&env);
        let bid = Bid {
            id: bid_id,
            request_id,
            vendor: vendor.clone(),
            amount,
            delivery_time,
            description,
            status: 0, // Pending
            created_at: env.ledger().timestamp(),
        };

        // Store bid
        env.storage().persistent().set(&DataKey::Bid(bid_id), &bid);

        // Add to request bids list
        let bids_key = DataKey::RequestBids(request_id);
        let mut bids_list: Vec<u32> = env.storage().persistent().get(&bids_key).unwrap();
        bids_list.push_back(bid_id);
        env.storage().persistent().set(&bids_key, &bids_list);

        // Emit bid placement event
        env.events().publish(
            (symbol_short!("placed"), vendor),
            (request_id, bid_id, amount),
        );

        bid_id
    }

    /// Select a bid for a request (Buyer chooses vendor).
    pub fn select_bid(env: Env, buyer: Address, request_id: u32, bid_id: u32) {
        buyer.require_auth();

        let request_key = DataKey::Request(request_id);
        assert!(env.storage().persistent().has(&request_key), "Request does not exist");
        
        let mut request: Request = env.storage().persistent().get(&request_key).unwrap();
        assert!(request.buyer == buyer, "Only the buyer can select a bid");
        assert!(request.status == 0, "Request is not in Open state");

        let bid_key = DataKey::Bid(bid_id);
        assert!(env.storage().persistent().has(&bid_key), "Bid does not exist");
        
        let mut bid: Bid = env.storage().persistent().get(&bid_key).unwrap();
        assert!(bid.request_id == request_id, "Bid does not belong to this request");
        assert!(bid.status == 0, "Bid is not in Pending state");

        // Update statuses
        request.status = 1; // InProgress
        request.selected_bid_id = Some(bid_id);
        env.storage().persistent().set(&request_key, &request);

        bid.status = 1; // Accepted
        env.storage().persistent().set(&bid_key, &bid);

        // Reject other bids
        let bids_key = DataKey::RequestBids(request_id);
        let bids_list: Vec<u32> = env.storage().persistent().get(&bids_key).unwrap();
        for id in bids_list.iter() {
            if id != bid_id {
                let other_bid_key = DataKey::Bid(id);
                if let Some(mut other_bid) = env.storage().persistent().get::<DataKey, Bid>(&other_bid_key) {
                    other_bid.status = 2; // Rejected
                    env.storage().persistent().set(&other_bid_key, &other_bid);
                }
            }
        }

        // Emit bid selection event
        env.events().publish(
            (symbol_short!("selected"), buyer),
            (request_id, bid_id),
        );
    }

    /// Mark the request as completed, release escrow to vendor, and refund the surplus to the buyer.
    pub fn mark_completed(env: Env, buyer: Address, request_id: u32) {
        buyer.require_auth();

        let request_key = DataKey::Request(request_id);
        assert!(env.storage().persistent().has(&request_key), "Request does not exist");
        
        let mut request: Request = env.storage().persistent().get(&request_key).unwrap();
        assert!(request.buyer == buyer, "Only the buyer can complete the request");
        assert!(request.status == 1, "Request is not in InProgress state");

        let bid_id = request.selected_bid_id.expect("Selected bid id must be set");
        let bid_key = DataKey::Bid(bid_id);
        let bid: Bid = env.storage().persistent().get(&bid_key).unwrap();

        // Release funds
        let contract_address = env.current_contract_address();
        let token_client = token::Client::new(&env, &request.token);

        // Pay vendor the bid amount
        token_client.transfer(&contract_address, &bid.vendor, &bid.amount);

        // Refund buyer any surplus (budget - bid amount)
        let surplus = request.budget - bid.amount;
        if surplus > 0 {
            token_client.transfer(&contract_address, &buyer, &surplus);
        }

        // Update status
        request.status = 2; // Completed
        env.storage().persistent().set(&request_key, &request);

        // Emit completion event
        env.events().publish(
            (symbol_short!("completed"), buyer),
            (request_id, bid.vendor, bid.amount),
        );
    }

    /// Cancel an open request and refund the locked budget to the buyer.
    pub fn cancel_request(env: Env, buyer: Address, request_id: u32) {
        buyer.require_auth();

        let request_key = DataKey::Request(request_id);
        assert!(env.storage().persistent().has(&request_key), "Request does not exist");
        
        let mut request: Request = env.storage().persistent().get(&request_key).unwrap();
        assert!(request.buyer == buyer, "Only the buyer can cancel the request");
        assert!(request.status == 0, "Can only cancel requests in Open state");

        // Refund budget to buyer
        let contract_address = env.current_contract_address();
        let token_client = token::Client::new(&env, &request.token);
        token_client.transfer(&contract_address, &buyer, &request.budget);

        // Update status
        request.status = 3; // Cancelled
        env.storage().persistent().set(&request_key, &request);

        // Emit cancellation event
        env.events().publish(
            (symbol_short!("cancelled"), buyer),
            request_id,
        );
    }

    /// Read details of a specific request.
    pub fn get_request(env: Env, request_id: u32) -> Option<Request> {
        let request_key = DataKey::Request(request_id);
        if env.storage().persistent().has(&request_key) {
            Some(env.storage().persistent().get(&request_key).unwrap())
        } else {
            None
        }
    }

    /// Read details of a specific bid.
    pub fn get_bid(env: Env, bid_id: u32) -> Option<Bid> {
        let bid_key = DataKey::Bid(bid_id);
        if env.storage().persistent().has(&bid_key) {
            Some(env.storage().persistent().get(&bid_key).unwrap())
        } else {
            None
        }
    }

    /// Read all bids submitted for a specific request.
    pub fn get_request_bids(env: Env, request_id: u32) -> Vec<Bid> {
        let bids_key = DataKey::RequestBids(request_id);
        let mut result = Vec::new(&env);
        if env.storage().persistent().has(&bids_key) {
            let bids_list: Vec<u32> = env.storage().persistent().get(&bids_key).unwrap();
            for id in bids_list.iter() {
                let bid_key = DataKey::Bid(id);
                if let Some(bid) = env.storage().persistent().get::<DataKey, Bid>(&bid_key) {
                    result.push_back(bid);
                }
            }
        }
        result
    }

    /// Read all requests created so far.
    pub fn get_all_requests(env: Env) -> Vec<Request> {
        let count = Self::get_requests_count(&env);
        let mut result = Vec::new(&env);
        for id in 1..=count {
            let request_key = DataKey::Request(id);
            if let Some(request) = env.storage().persistent().get::<DataKey, Request>(&request_key) {
                result.push_back(request);
            }
        }
        result
    }
}

#[cfg(test)]
mod test;

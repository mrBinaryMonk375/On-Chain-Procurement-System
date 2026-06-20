#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient as TokenAdminClient};

#[test]
fn test_procurement_flow() {
    let env = Env::default();
    env.mock_all_auths();

    // Register contract
    let contract_id = env.register(ProcurementContract, ());
    let client = ProcurementContractClient::new(&env, &contract_id);

    // Create test addresses
    let buyer = Address::generate(&env);
    let vendor1 = Address::generate(&env);
    let vendor2 = Address::generate(&env);

    // Register a mock token
    let token_admin_address = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin_address.clone());
    let token_id = token_contract.address();
    let token_client = TokenClient::new(&env, &token_id);
    let token_admin = TokenAdminClient::new(&env, &token_id);

    // Mint tokens for testing
    token_admin.mint(&buyer, &1000);
    token_admin.mint(&vendor1, &100);
    token_admin.mint(&vendor2, &100);

    assert_eq!(token_client.balance(&buyer), 1000);

    // 1. Create procurement request (RFP)
    let title = String::from_str(&env, "Office Setup");
    let description = String::from_str(&env, "Need desks and chairs");
    let budget = 500i128;

    let req_id = client.create_request(&buyer, &token_id, &title, &description, &budget);
    assert_eq!(req_id, 1);

    // Verify budget locked in contract escrow
    assert_eq!(token_client.balance(&buyer), 500);
    assert_eq!(token_client.balance(&contract_id), 500);

    // Verify request fields
    let req = client.get_request(&req_id).unwrap();
    assert_eq!(req.id, 1);
    assert_eq!(req.buyer, buyer);
    assert_eq!(req.budget, 500);
    assert_eq!(req.status, 0); // Open

    // 2. Submit bids
    let bid_desc_1 = String::from_str(&env, "Standard supplies pkg");
    let bid_id_1 = client.place_bid(&vendor1, &req_id, &450i128, &7u64, &bid_desc_1);
    assert_eq!(bid_id_1, 1);

    let bid_desc_2 = String::from_str(&env, "Premium supplies pkg");
    let bid_id_2 = client.place_bid(&vendor2, &req_id, &480i128, &5u64, &bid_desc_2);
    assert_eq!(bid_id_2, 2);

    // Check request bids list
    let bids = client.get_request_bids(&req_id);
    assert_eq!(bids.len(), 2);
    assert_eq!(bids.get(0).unwrap().amount, 450);
    assert_eq!(bids.get(1).unwrap().amount, 480);

    // 3. Select bid 1
    client.select_bid(&buyer, &req_id, &bid_id_1);

    // Verify statuses
    let req_after_select = client.get_request(&req_id).unwrap();
    assert_eq!(req_after_select.status, 1); // InProgress
    assert_eq!(req_after_select.selected_bid_id, Some(bid_id_1));

    let bid_1_after_select = client.get_bid(&bid_id_1).unwrap();
    assert_eq!(bid_1_after_select.status, 1); // Accepted

    let bid_2_after_select = client.get_bid(&bid_id_2).unwrap();
    assert_eq!(bid_2_after_select.status, 2); // Rejected

    // 4. Complete request (Fulfillment confirmed by buyer)
    client.mark_completed(&buyer, &req_id);

    // Verify status updated to Completed (2)
    let final_req = client.get_request(&req_id).unwrap();
    assert_eq!(final_req.status, 2); // Completed

    // Verify payments and escrow release:
    // Vendor 1 receives their bid amount: 100 + 450 = 550
    // Buyer receives refund of surplus: 500 (remaining budget) + 50 (surplus: 500 - 450) = 550
    // Contract balance becomes 0
    assert_eq!(token_client.balance(&buyer), 550);
    assert_eq!(token_client.balance(&vendor1), 550);
    assert_eq!(token_client.balance(&contract_id), 0);
}

#[test]
fn test_cancellation_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ProcurementContract, ());
    let client = ProcurementContractClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);

    let token_admin_address = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin_address.clone());
    let token_id = token_contract.address();
    let token_client = TokenClient::new(&env, &token_id);
    let token_admin = TokenAdminClient::new(&env, &token_id);

    token_admin.mint(&buyer, &1000);

    // Create request
    let title = String::from_str(&env, "Office Setup");
    let description = String::from_str(&env, "Need desks");
    let budget = 500i128;

    let req_id = client.create_request(&buyer, &token_id, &title, &description, &budget);
    assert_eq!(token_client.balance(&buyer), 500);

    // Cancel request
    client.cancel_request(&buyer, &req_id);

    // Verify status updated to Cancelled (3)
    let req = client.get_request(&req_id).unwrap();
    assert_eq!(req.status, 3); // Cancelled

    // Verify full budget refunded
    assert_eq!(token_client.balance(&buyer), 1000);
    assert_eq!(token_client.balance(&contract_id), 0);
}

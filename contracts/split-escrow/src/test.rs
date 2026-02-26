//! # Unit Tests for Split Escrow Contract
//!
//! I'm testing all of core functionality to ensure that contract
//! behaves correctly under various scenarios.

#![cfg(test)]

extern crate std;
use std::string::ToString;

use super::*;
use soroban_sdk::{
    IntoVal, TryIntoVal,
    Address, Env, String, Vec, Symbol, Map, Bytes, symbol_short,
    testutils::{Ledger, Address as _, Events},
    token::{StellarAssetClient, Client},
    contracterror,
};

use std::panic::{catch_unwind, AssertUnwindSafe};

/// Helper to create a test environment and contract client
fn setup_test() -> (
    Env,
    Address,
    Address,
    SplitEscrowContractClient<'static>,
    token::Client<'static>,
    token::StellarAssetClient<'static>,
) {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract(token_admin.clone());
    let token_client = token::Client::new(&env, &token_id);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_id);

    let contract_id = env.register_contract(None, SplitEscrowContract);
    let client = SplitEscrowContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    (
        env,
        admin,
        token_id,
        client,
        token_client,
        token_admin_client,
    )
}

/// Helper to initialize contract
fn initialize_contract(client: &SplitEscrowContractClient, admin: &Address, token: &Address) {
    client.initialize(admin, token);
}

/// Helper to convert u64 to String in no_std environment
fn u64_to_string(env: &Env, num: u64) -> String {
    // For simplicity in tests, we'll use basic pattern matching
    match num {
        0 => String::from_str(env, "0"),
        1 => String::from_str(env, "1"),
        2 => String::from_str(env, "2"),
        3 => String::from_str(env, "3"),
        4 => String::from_str(env, "4"),
        5 => String::from_str(env, "5"),
        6 => String::from_str(env, "6"),
        7 => String::from_str(env, "7"),
        8 => String::from_str(env, "8"),
        9 => String::from_str(env, "9"),
        10 => String::from_str(env, "10"),
        _ => String::from_str(env, "999"), // Fallback for test environment
    }
}

// ============================================
// Initialization Tests
// ============================================

#[test]
fn test_initialize() {
    let (_env, admin, token_id, client, _token_client, _token_admin_client) = setup_test();

    initialize_contract(&client, &admin, &token_id);

    let stored_admin = client.get_admin();
    assert_eq!(stored_admin, admin);
}

#[test]
#[should_panic(expected = "Contract already initialized")]
fn test_double_initialize_fails() {
    let (_env, admin, token_id, client, _token_client, _token_admin_client) = setup_test();

    initialize_contract(&client, &admin, &token_id);
    // Second initialization should fail
    initialize_contract(&client, &admin, &token_id);
}

// ============================================
// Split Creation Tests
// ============================================

#[test]
fn test_create_split() {
    let (env, admin, token_id, client, _token_client, _token_admin_client) = setup_test();
    initialize_contract(&client, &admin, &token_id);

    let creator = Address::generate(&env);
    let participant1 = Address::generate(&env);
    let participant2 = Address::generate(&env);

    let description = String::from_str(&env, "Dinner at Joe's");
    let total_amount: i128 = 100_0000000; // 100 with 7 decimals

    let mut addresses = Vec::new(&env);
    addresses.push_back(participant1.clone());
    addresses.push_back(participant2.clone());

    let mut shares = Vec::new(&env);
    shares.push_back(50_0000000i128);
    shares.push_back(50_0000000i128);

    let mut test_assets = Vec::new(&env);
    for _ in 0..shares.len() { test_assets.push_back(token_id.clone()); }
    let split_id = client.create_split(&creator, &description, &total_amount, &addresses, &shares, &test_assets);

    assert_eq!(split_id, 1);

    let split = client.get_split(&split_id);
    assert_eq!(split.id, 1);
    assert_eq!(split.creator, creator);
    assert_eq!(split.total_amount, total_amount);
    assert_eq!(split.status, SplitStatus::Pending);
    assert_eq!(split.participants.len(), 2);
}

#[test]
#[should_panic(expected = "Participant shares must sum to total amount")]
fn test_create_split_invalid_shares() {
    let (env, admin, token_id, client, _token_client, _token_admin_client) = setup_test();
    initialize_contract(&client, &admin, &token_id);

    let creator = Address::generate(&env);
    let participant = Address::generate(&env);

    let description = String::from_str(&env, "Bad split");
    let total_amount: i128 = 100_0000000;

    let mut addresses = Vec::new(&env);
    addresses.push_back(participant);

    // Share doesn't match total
    let mut shares = Vec::new(&env);
    shares.push_back(50_0000000i128);

    let mut test_assets = Vec::new(&env);
    for _ in 0..shares.len() { test_assets.push_back(token_id.clone()); }
    let split_id = client.create_split(&creator, &description, &total_amount, &addresses, &shares, &test_assets);
}

#[test]
#[should_panic(expected = "At least one participant is required")]
fn test_create_split_no_participants() {
    let (env, admin, token_id, client, _token_client, _token_admin_client) = setup_test();
    initialize_contract(&client, &admin, &token_id);

    let creator = Address::generate(&env);
    let description = String::from_str(&env, "Empty split");

    let addresses: Vec<Address> = Vec::new(&env);
    let shares: Vec<i128> = Vec::new(&env);

    let mut test_assets = Vec::new(&env);
    for _ in 0..shares.len() { test_assets.push_back(token_id.clone()); }
    let split_id = client.create_split(&creator, &description, &0, &addresses, &shares, &test_assets);
}

// ============================================
// Deposit Tests
// ============================================

#[test]
fn test_deposit() {
    let (env, admin, token_id, client, token_client, token_admin_client) = setup_test();
    initialize_contract(&client, &admin, &token_id);

    let creator = Address::generate(&env);
    let participant = Address::generate(&env);

    let description = String::from_str(&env, "Test split");
    let total_amount: i128 = 100_0000000;

    let mut addresses = Vec::new(&env);
    addresses.push_back(participant.clone());

    let mut shares = Vec::new(&env);
    shares.push_back(100_0000000i128);

    let mut test_assets = Vec::new(&env);
    for _ in 0..shares.len() { test_assets.push_back(token_id.clone()); }
    let split_id = client.create_split(&creator, &description, &total_amount, &addresses, &shares, &test_assets);

    token_admin_client.mint(&participant, &100_0000000i128);

    // Make a deposit
    client.deposit(&split_id, &participant, &50_0000000);

    let split = client.get_split(&split_id);
    assert_eq!(split.status, SplitStatus::Active);
    assert_eq!(split.amount_collected, 50_0000000);

    // Complete the deposit
    client.deposit(&split_id, &participant, &50_0000000);

    let split = client.get_split(&split_id);
    assert_eq!(split.status, SplitStatus::Released);
    assert_eq!(split.amount_collected, 100_0000000);
    assert_eq!(split.amount_released, 100_0000000);

    let creator_balance = token_client.balance(&creator);
    assert_eq!(creator_balance, 100_0000000);
}

#[test]
fn test_deposit_exceeds_share() {
    let (env, admin, token_id, client, _token_client, token_admin_client) = setup_test();
    initialize_contract(&client, &admin, &token_id);

    let creator = Address::generate(&env);
    let participant = Address::generate(&env);

    let description = String::from_str(&env, "Test split");

    let mut addresses = Vec::new(&env);
    addresses.push_back(participant.clone());

    let mut shares = Vec::new(&env);
    shares.push_back(100_0000000i128);

    let mut test_assets = Vec::new(&env);
    for _ in 0..shares.len() { test_assets.push_back(token_id.clone()); }
    let split_id = client.create_split(&creator, &description, &100_0000000, &addresses, &shares, &test_assets);

    token_admin_client.mint(&participant, &200_0000000i128);

    // Try to overpay
    let result = catch_unwind(AssertUnwindSafe(|| {
        client.deposit(&split_id, &participant, &150_0000000)
    }));
    assert!(result.is_err());
}

// ============================================
// Cancel Tests
// ============================================

#[test]
fn test_cancel_split() {
    let (env, admin, token_id, client, _token_client, _token_admin_client) = setup_test();
    initialize_contract(&client, &admin, &token_id);

    let creator = Address::generate(&env);
    let participant = Address::generate(&env);

    let description = String::from_str(&env, "Test split");

    let mut addresses = Vec::new(&env);
    addresses.push_back(participant);

    let mut shares = Vec::new(&env);
    shares.push_back(100_0000000i128);

    let mut test_assets = Vec::new(&env);
    for _ in 0..shares.len() { test_assets.push_back(token_id.clone()); }
    let split_id = client.create_split(&creator, &description, &100_0000000, &addresses, &shares, &test_assets);

    client.cancel_split(&split_id);

    let split = client.get_split(&split_id);
    assert_eq!(split.status, SplitStatus::Cancelled);
}

// ============================================
// Release Tests
// ============================================

#[test]
fn test_release_funds() {
    let (env, admin, token_id, client, token_client, token_admin_client) = setup_test();
    initialize_contract(&client, &admin, &token_id);

    let creator = Address::generate(&env);
    let participant = Address::generate(&env);

    let description = String::from_str(&env, "Test split");

    let mut addresses = Vec::new(&env);
    addresses.push_back(participant.clone());

    let mut shares = Vec::new(&env);
    shares.push_back(100_0000000i128);

    let mut test_assets = Vec::new(&env);
    for _ in 0..shares.len() { test_assets.push_back(token_id.clone()); }
    let split_id = client.create_split(&creator, &description, &100_0000000, &addresses, &shares, &test_assets);

    // Complete the split (auto-release should occur)
    token_admin_client.mint(&participant, &100_0000000i128);
    client.deposit(&split_id, &participant, &100_0000000);

    let split = client.get_split(&split_id);
    assert_eq!(split.status, SplitStatus::Released);

    let creator_balance = token_client.balance(&creator);
    assert_eq!(creator_balance, 100_0000000);

    // Manual release should be blocked after auto-release
    let result = catch_unwind(AssertUnwindSafe(|| client.release_funds(&split_id)));
    assert!(result.is_err());
}

#[test]
fn test_release_incomplete_split() {
    let (env, admin, token_id, client, _token_client, _token_admin_client) = setup_test();
    initialize_contract(&client, &admin, &token_id);

    let creator = Address::generate(&env);
    let participant = Address::generate(&env);

    let description = String::from_str(&env, "Test split");

    let mut addresses = Vec::new(&env);
    addresses.push_back(participant);

    let mut shares = Vec::new(&env);
    shares.push_back(100_0000000i128);

    let mut test_assets = Vec::new(&env);
    for _ in 0..shares.len() { test_assets.push_back(token_id.clone()); }
    let split_id = client.create_split(&creator, &description, &100_0000000, &addresses, &shares, &test_assets);

    // Try to release without completing deposits
    let result = catch_unwind(AssertUnwindSafe(|| client.release_funds(&split_id)));
    assert!(result.is_err());
}

// ============================================
// Partial Release and Funding Checks
// ============================================

#[test]
fn test_is_fully_funded() {
    let (env, admin, token_id, client, _token_client, token_admin_client) = setup_test();
    initialize_contract(&client, &admin, &token_id);

    let creator = Address::generate(&env);
    let participant = Address::generate(&env);

    let description = String::from_str(&env, "Funding check");

    let mut addresses = Vec::new(&env);
    addresses.push_back(participant.clone());

    let mut shares = Vec::new(&env);
    shares.push_back(100_0000000i128);

    let mut test_assets = Vec::new(&env);
    for _ in 0..shares.len() { test_assets.push_back(token_id.clone()); }
    let split_id = client.create_split(&creator, &description, &100_0000000, &addresses, &shares, &test_assets);

    token_admin_client.mint(&participant, &50_0000000i128);
    client.deposit(&split_id, &participant, &50_0000000);

    let funded = client.is_fully_funded(&split_id);
    assert!(!funded);

    token_admin_client.mint(&participant, &50_0000000i128);
    client.deposit(&split_id, &participant, &50_0000000);

    let funded = client.is_fully_funded(&split_id);
    assert!(funded);
}

#[test]
fn test_events_emitted_on_auto_release() {
    let (env, admin, token_id, client, _token_client, token_admin_client) = setup_test();
    initialize_contract(&client, &admin, &token_id);

    let creator = Address::generate(&env);
    let participant = Address::generate(&env);

    let description = String::from_str(&env, "Event check");

    let mut addresses = Vec::new(&env);
    addresses.push_back(participant.clone());

    let mut shares = Vec::new(&env);
    shares.push_back(100_0000000i128);

    let mut test_assets = Vec::new(&env);
    for _ in 0..shares.len() { test_assets.push_back(token_id.clone()); }
    let split_id = client.create_split(&creator, &description, &100_0000000, &addresses, &shares, &test_assets);

    token_admin_client.mint(&participant, &100_0000000i128);
    client.deposit(&split_id, &participant, &100_0000000);

    let events = env.events().all();
    let mut has_completed = false;
    let mut has_released = false;

    for i in 0..events.len() {
        let event = events.get(i).unwrap();
        let topics = &event.1;
        let data = &event.2;

        let topic: Symbol = topics.get(0).unwrap().try_into_val(&env).unwrap();
        if topic == symbol_short!("completed") {
            let payload: (u64, i128) = data.try_into_val(&env).unwrap();
            assert_eq!(payload.0, split_id);
            assert_eq!(payload.1, 100_0000000);
            has_completed = true;
        }
        if topic == symbol_short!("released") {
            let payload: (u64, Address, i128, u64) = data.try_into_val(&env).unwrap();
            assert_eq!(payload.0, split_id);
            assert_eq!(payload.1, creator);
            assert_eq!(payload.2, 100_0000000);
            has_released = true;
        }
    }

    assert!(has_completed);
    assert!(has_released);
}

// ============================================
// Enhanced Escrow Data Structure Tests (Issue #59)
// ============================================

#[test]
fn test_escrow_status_values() {
    // I'm verifying that all EscrowStatus variants are distinct and usable
    let active = EscrowStatus::Active;
    let completed = EscrowStatus::Completed;
    let cancelled = EscrowStatus::Cancelled;
    let expired = EscrowStatus::Expired;

    assert_eq!(active, EscrowStatus::Active);
    assert_ne!(active, completed);
    assert_ne!(completed, cancelled);
    assert_ne!(cancelled, expired);
}

#[test]
fn test_escrow_participant_creation() {
    let env = Env::default();
    let address = Address::generate(&env);

    let participant = EscrowParticipant::new(address.clone(), 100_0000000);

    assert_eq!(participant.address, address);
    assert_eq!(participant.amount_owed, 100_0000000);
    assert_eq!(participant.amount_paid, 0);
    assert!(participant.paid_at.is_none());
}

#[test]
fn test_escrow_participant_validation() {
    let env = Env::default();
    let address = Address::generate(&env);

    // Valid participant
    let valid = EscrowParticipant {
        address: address.clone(),
        amount_owed: 100,
        amount_paid: 50,
        paid_at: None,
    };
    assert!(valid.validate().is_ok());

    // Overpaid participant (invalid)
    let overpaid = EscrowParticipant {
        address: address.clone(),
        amount_owed: 100,
        amount_paid: 150,
        paid_at: None,
    };
    assert!(overpaid.validate().is_err());

    // Negative amount (invalid)
    let negative = EscrowParticipant {
        address: address.clone(),
        amount_owed: -100,
        amount_paid: 0,
        paid_at: None,
    };
    assert!(negative.validate().is_err());
}

#[test]
fn test_escrow_participant_helpers() {
    let env = Env::default();
    let address = Address::generate(&env);

    let participant = EscrowParticipant {
        address: address.clone(),
        amount_owed: 100,
        amount_paid: 60,
        paid_at: None,
    };

    assert!(!participant.has_fully_paid());
    assert_eq!(participant.remaining_owed(), 40);

    let fully_paid = EscrowParticipant {
        address: address.clone(),
        amount_owed: 100,
        amount_paid: 100,
        paid_at: Some(12345),
    };

    assert!(fully_paid.has_fully_paid());
    assert_eq!(fully_paid.remaining_owed(), 0);
}

#[test]
fn test_split_escrow_creation() {
    let env = Env::default();
    let creator = Address::generate(&env);
    let participant1 = Address::generate(&env);
    let participant2 = Address::generate(&env);

    let mut participants = Vec::new(&env);
    participants.push_back(EscrowParticipant::new(participant1, 50_0000000));
    participants.push_back(EscrowParticipant::new(participant2, 50_0000000));

    let escrow = create_escrow(
        &env,
        String::from_str(&env, "escrow-001"),
        creator.clone(),
        String::from_str(&env, "Team dinner"),
        100_0000000,
        participants,
        1735689600, // Some future timestamp
    );

    assert_eq!(escrow.total_amount, 100_0000000);
    assert_eq!(escrow.amount_collected, 0);
    assert_eq!(escrow.status, EscrowStatus::Active);
    assert_eq!(escrow.creator, creator);
    assert_eq!(escrow.participants.len(), 2);
}

#[test]
fn test_split_escrow_validation() {
    let env = Env::default();
    let creator = Address::generate(&env);
    let participant = Address::generate(&env);

    let mut participants = Vec::new(&env);
    participants.push_back(EscrowParticipant {
        address: participant,
        amount_owed: 100,
        amount_paid: 50,
        paid_at: None,
    });

    // Valid escrow
    let valid = SplitEscrow {
        split_id: String::from_str(&env, "test-1"),
        creator: creator.clone(),
        description: String::from_str(&env, "Test"),
        total_amount: 100,
        amount_collected: 50,
        participants: participants.clone(),
        status: EscrowStatus::Active,
        deadline: 99999999,
        created_at: 1000,
    };
    assert!(valid.validate().is_ok());

    // Collected exceeds total (invalid)
    let over_collected = SplitEscrow {
        split_id: String::from_str(&env, "test-2"),
        creator: creator.clone(),
        description: String::from_str(&env, "Test"),
        total_amount: 100,
        amount_collected: 150,
        participants: participants.clone(),
        status: EscrowStatus::Active,
        deadline: 99999999,
        created_at: 1000,
    };
    assert!(over_collected.validate().is_err());
}

#[test]
fn test_split_escrow_expiry() {
    let env = Env::default();
    let creator = Address::generate(&env);

    let participants = Vec::new(&env);

    let escrow = SplitEscrow {
        split_id: String::from_str(&env, "test"),
        creator,
        description: String::from_str(&env, "Test"),
        total_amount: 100,
        amount_collected: 0,
        participants,
        status: EscrowStatus::Active,
        deadline: 1000,
        created_at: 500,
    };

    // Before deadline
    assert!(!escrow.is_expired(999));
    assert!(!escrow.is_expired(1000));

    // After deadline
    assert!(escrow.is_expired(1001));
    assert!(escrow.is_expired(2000));
}

#[test]
fn test_split_escrow_funding_helpers() {
    let env = Env::default();
    let creator = Address::generate(&env);
    let participants = Vec::new(&env);

    let partially_funded = SplitEscrow {
        split_id: String::from_str(&env, "test"),
        creator: creator.clone(),
        description: String::from_str(&env, "Test"),
        total_amount: 100,
        amount_collected: 60,
        participants: participants.clone(),
        status: EscrowStatus::Active,
        deadline: 99999999,
        created_at: 1000,
    };

    assert!(!partially_funded.is_fully_funded());
    assert_eq!(partially_funded.remaining_amount(), 40);

    let fully_funded = SplitEscrow {
        split_id: String::from_str(&env, "test"),
        creator,
        description: String::from_str(&env, "Test"),
        total_amount: 100,
        amount_collected: 100,
        participants,
        status: EscrowStatus::Completed,
        deadline: 99999999,
        created_at: 1000,
    };

    assert!(fully_funded.is_fully_funded());
    assert_eq!(fully_funded.remaining_amount(), 0);
}

// ============================================
// Enhanced Storage Tests (Issue #59)
// ============================================

#[test]
fn test_escrow_count_storage() {
    let env = Env::default();
    let contract_id = env.register_contract(None, SplitEscrowContract);

    env.as_contract(&contract_id, || {
        // Initial count should be 0
        let initial = storage::get_escrow_count(&env);
        assert_eq!(initial, 0);

        // Increment should return new value
        let first = storage::increment_escrow_count(&env);
        assert_eq!(first, 1);

        let second = storage::increment_escrow_count(&env);
        assert_eq!(second, 2);

        // Get should return current value
        let current = storage::get_escrow_count(&env);
        assert_eq!(current, 2);
    });
}

#[test]
fn test_escrow_storage() {
    let env = Env::default();
    let contract_id = env.register_contract(None, SplitEscrowContract);
    let creator = Address::generate(&env);
    let split_id = String::from_str(&env, "test-escrow-1");

    let participants = Vec::new(&env);
    let escrow = create_escrow(
        &env,
        split_id.clone(),
        creator.clone(),
        String::from_str(&env, "Test escrow"),
        1000,
        participants,
        99999999,
    );

    env.as_contract(&contract_id, || {
        // Initially should not exist
        assert!(!storage::has_escrow(&env, &split_id));

        // Store and retrieve
        storage::set_escrow(&env, &split_id, &escrow);
        assert!(storage::has_escrow(&env, &split_id));

        let retrieved = storage::get_escrow(&env, &split_id);
        assert_eq!(retrieved.split_id, split_id);
        assert_eq!(retrieved.creator, creator);
    });
}

#[test]
fn test_has_participant_payment() {
    let env = Env::default();
    let contract_id = env.register_contract(None, SplitEscrowContract);
    let split_id = String::from_str(&env, "test-split");
    let participant = Address::generate(&env);

    env.as_contract(&contract_id, || {
        // Initially should not exist (returns false because no explicit entry)
        assert!(!storage::has_participant_payment(
            &env,
            &split_id,
            &participant
        ));

        // After setting, should exist
        storage::set_participant_payment(&env, &split_id, &participant, 100);
        assert!(storage::has_participant_payment(
            &env,
            &split_id,
            &participant
        ));
    });
}

// ============================================
// Insurance Tests
// ============================================

#[test]
fn test_insurance_storage_helpers() {
    let env = Env::default();
    let contract_id = env.register_contract(None, SplitEscrowContract);
    
    let insurance_id = String::from_str(&env, "test-insurance");
    let split_id = String::from_str(&env, "test-split");
    let policy_holder = Address::generate(&env);
    
    let policy = types::InsurancePolicy {
        insurance_id: insurance_id.clone(),
        split_id: split_id.clone(),
        policy_holder: policy_holder.clone(),
        premium: 10,
        coverage_amount: 100,
        status: types::InsuranceStatus::Active,
        created_at: 12345,
        expires_at: 12345 + (30 * 24 * 60 * 60),
    };
    
    env.as_contract(&contract_id, || {
        // Test insurance storage
        assert!(!storage::has_insurance(&env, &insurance_id));
        
        storage::set_insurance(&env, &insurance_id, &policy);
        assert!(storage::has_insurance(&env, &insurance_id));
        
        let retrieved = storage::get_insurance(&env, &insurance_id);
        assert_eq!(retrieved.insurance_id, insurance_id);
        assert_eq!(retrieved.split_id, split_id);
        assert_eq!(retrieved.policy_holder, policy_holder);
        
        // Test split to insurance mapping
        assert!(!storage::has_split_insurance(&env, &split_id));
        
        storage::set_split_to_insurance(&env, &split_id, &insurance_id);
        assert!(storage::has_split_insurance(&env, &split_id));
        
        let mapped_insurance_id = storage::get_split_to_insurance(&env, &split_id);
        assert_eq!(mapped_insurance_id, Some(insurance_id.clone()));
        
        // Test claim storage
        let claim_id = String::from_str(&env, "test-claim");
        let claim = types::InsuranceClaim {
            claim_id: claim_id.clone(),
            insurance_id: insurance_id.clone(),
            claimant: policy_holder.clone(),
            reason: String::from_str(&env, "test reason"),
            claim_amount: 50,
            status: types::ClaimStatus::Pending,
            filed_at: 12345,
            processed_at: None,
            notes: None,
        };
        
        assert!(!storage::has_claim(&env, &claim_id));
        
        storage::set_claim(&env, &claim_id, &claim);
        assert!(storage::has_claim(&env, &claim_id));
        
        let retrieved_claim = storage::get_claim(&env, &claim_id);
        assert_eq!(retrieved_claim.claim_id, claim_id);
        assert_eq!(retrieved_claim.insurance_id, insurance_id);
        
        // Test insurance claims mapping
        storage::add_insurance_claim(&env, &insurance_id, &claim_id);
        let claim_ids = storage::get_insurance_claims(&env, &insurance_id);
        assert_eq!(claim_ids.len(), 1);
        assert_eq!(claim_ids.get(0).unwrap(), claim_id);
    });
}

// ============================================
// Rewards Tests
// ============================================

#[test]
fn test_rewards_storage_helpers() {
    let env = Env::default();
    let contract_id = env.register_contract(None, SplitEscrowContract);
    
    let user = Address::generate(&env);
    
    env.as_contract(&contract_id, || {
        // Test storing and retrieving user rewards
        let rewards = types::UserRewards {
            user: user.clone(),
            total_splits_created: 3,
            total_splits_participated: 5,
            total_amount_transacted: 750,
            rewards_earned: 85,
            rewards_claimed: 25,
            last_activity: env.ledger().timestamp(),
            status: types::RewardsStatus::Active,
        };
        
        // Store rewards
        storage::set_user_rewards(&env, &user, &rewards);
        
        // Verify storage
        assert!(storage::has_user_rewards(&env, &user));
        
        let retrieved = storage::get_user_rewards(&env, &user).unwrap();
        assert_eq!(retrieved.total_splits_created, 3);
        assert_eq!(retrieved.total_splits_participated, 5);
        assert_eq!(retrieved.rewards_earned, 85);
        assert_eq!(retrieved.rewards_claimed, 25);
        
        // Test activity storage
        let activity_id = storage::get_next_activity_id(&env);
        let activity = types::UserActivity {
            user: user.clone(),
            activity_type: types::ActivityType::SplitCreated,
            split_id: 123,
            amount: 100,
            timestamp: env.ledger().timestamp(),
        };
        
        storage::set_user_activity(&env, &user, activity_id, &activity);
        
        let retrieved_activity = storage::get_user_activity(&env, &user, activity_id).unwrap();
        assert_eq!(retrieved_activity.split_id, 123);
        assert_eq!(retrieved_activity.amount, 100);
    });
}

// ============================================
// Oracle Tests
// ============================================

#[test]
fn test_atomic_swap_storage_helpers() {
    let env = Env::default();
    let contract_id = env.register_contract(None, SplitEscrowContract);
    
    let swap_id = String::from_str(&env, "test-swap");
    let participant_a = Address::generate(&env);
    let participant_b = Address::generate(&env);
    
    env.as_contract(&contract_id, || {
        // Test storing and retrieving atomic swap
        let swap = types::AtomicSwap {
            swap_id: swap_id.clone(),
            participant_a: participant_a.clone(),
            participant_b: participant_b.clone(),
            amount_a: 1000,
            amount_b: 2000,
            hash_lock: String::from_str(&env, "hash_lock"),
            secret: None,
            time_lock: 12345,
            created_at: 12345,
            status: types::SwapStatus::Pending,
            completed_at: None,
        };
        
        // Store swap
        storage::set_atomic_swap(&env, &swap_id, &swap);
        
        // Verify storage
        assert!(storage::has_atomic_swap(&env, &swap_id));
        
        let retrieved = storage::get_atomic_swap(&env, &swap_id).unwrap();
        assert_eq!(retrieved.swap_id, swap_id);
        assert_eq!(retrieved.participant_a, participant_a);
        assert_eq!(retrieved.participant_b, participant_b);
        assert_eq!(retrieved.amount_a, 1000);
        assert_eq!(retrieved.amount_b, 2000);
    });
}

#[test]
fn test_oracle_storage_helpers() {
    let env = Env::default();
    let contract_id = env.register_contract(None, SplitEscrowContract);
    
    let oracle = Address::generate(&env);
    let asset_pair = String::from_str(&env, "BTC/USD");
    
    env.as_contract(&contract_id, || {
        // Test storing and retrieving oracle node
        let oracle_node = types::OracleNode {
            oracle_address: oracle.clone(),
            stake: 10000,
            reputation: 100,
            submissions_count: 0,
            last_submission: 0,
            active: true,
        };
        
        // Store oracle node
        storage::set_oracle_node(&env, &oracle, &oracle_node);
        
        // Verify storage
        assert!(storage::has_oracle_node(&env, &oracle));
        
        let retrieved = storage::get_oracle_node(&env, &oracle).unwrap();
        assert_eq!(retrieved.oracle_address, oracle);
        assert_eq!(retrieved.stake, 10000);
        assert_eq!(retrieved.reputation, 100);
        
        // Test price submission storage
        let submission = types::PriceSubmission {
            oracle_address: oracle.clone(),
            asset_pair: asset_pair.clone(),
            price: 50000,
            timestamp: 12345,
            signature: String::from_str(&env, "signature"),
        };
        
        storage::set_price_submission(&env, &asset_pair, &oracle, &submission);
        
        let retrieved_submission = storage::get_price_submission(&env, &asset_pair, &oracle).unwrap();
        assert_eq!(retrieved_submission.oracle_address, oracle);
        assert_eq!(retrieved_submission.asset_pair, asset_pair);
        assert_eq!(retrieved_submission.price, 50000);
    });
}

#[test]
fn test_bridge_storage_helpers() {
    let env = Env::default();
    let contract_id = env.register_contract(None, SplitEscrowContract);
    
    let bridge_id = String::from_str(&env, "test-bridge");
    let sender = Address::generate(&env);
    
    env.as_contract(&contract_id, || {
        // Test storing and retrieving bridge transaction
        let bridge = types::BridgeTransaction {
            bridge_id: bridge_id.clone(),
            source_chain: String::from_str(&env, "ethereum"),
            destination_chain: String::from_str(&env, "polygon"),
            amount: 1000,
            recipient: String::from_str(&env, "0x1234567890abcdef"),
            sender: sender.clone(),
            created_at: 12345,
            status: types::BridgeStatus::Initiated,
            proof_hash: None,
            completed_at: None,
        };
        
        // Store bridge transaction
        storage::set_bridge_transaction(&env, &bridge_id, &bridge);
        
        // Verify storage
        assert!(storage::has_bridge_transaction(&env, &bridge_id));
        
        let retrieved = storage::get_bridge_transaction(&env, &bridge_id).unwrap();
        assert_eq!(retrieved.bridge_id, bridge_id);
        assert_eq!(retrieved.source_chain, String::from_str(&env, "ethereum"));
        assert_eq!(retrieved.destination_chain, String::from_str(&env, "polygon"));
        assert_eq!(retrieved.amount, 1000);
        assert_eq!(retrieved.sender, sender);
    });
}

#[test]
fn test_multi_asset_deposit_and_release() {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let admin = Address::generate(&env);
    
    // Create two separate tokens
    let token_admin1 = Address::generate(&env);
    let token1_id = env.register_stellar_asset_contract(token_admin1.clone());
    let token1_client = token::Client::new(&env, &token1_id);
    let token1_admin_client = token::StellarAssetClient::new(&env, &token1_id);

    let token_admin2 = Address::generate(&env);
    let token2_id = env.register_stellar_asset_contract(token_admin2.clone());
    let token2_client = token::Client::new(&env, &token2_id);
    let token2_admin_client = token::StellarAssetClient::new(&env, &token2_id);

    let contract_id = env.register_contract(None, SplitEscrowContract);
    let client = SplitEscrowContractClient::new(&env, &contract_id);

    // Initialize with token1
    client.initialize(&admin, &token1_id);

    // Admin must approve token2
    client.add_approved_asset(&token2_id);

    let creator = Address::generate(&env);
    let participant1 = Address::generate(&env); // Pays in token1
    let participant2 = Address::generate(&env); // Pays in token2

    let description = String::from_str(&env, "Multi-asset split");
    
    let mut addresses = Vec::new(&env);
    addresses.push_back(participant1.clone());
    addresses.push_back(participant2.clone());

    let mut shares = Vec::new(&env);
    shares.push_back(50_0000000i128); // 50 from p1
    shares.push_back(75_0000000i128); // 75 from p2
    
    // Each uses different asset
    let mut assets = Vec::new(&env);
    assets.push_back(token1_id.clone());
    assets.push_back(token2_id.clone());

    let total_amount = 125_0000000i128;

    let split_id = client.create_split(&creator, &description, &total_amount, &addresses, &shares, &assets);

    // Mint to participants
    token1_admin_client.mint(&participant1, &50_0000000);
    token2_admin_client.mint(&participant2, &75_0000000);

    // Deposit p1 using token1
    client.deposit(&split_id, &participant1, &50_0000000);
    // Deposit p2 using token2 (fully funds, triggers release)
    client.deposit(&split_id, &participant2, &75_0000000);

    // Check final balances of creator
    let creator_balance1 = token1_client.balance(&creator);
    let creator_balance2 = token2_client.balance(&creator);

    assert_eq!(creator_balance1, 50_0000000);
    assert_eq!(creator_balance2, 75_0000000);
}

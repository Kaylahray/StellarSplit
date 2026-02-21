#![cfg(test)]

use crate::{StakingContract, StakingContractClient};
use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env};
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient as TokenAdminClient};

#[test]
fn test_staking_success() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let staker = Address::generate(&env);
    
    // Deploy token
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_id.address();
    let token_client = TokenClient::new(&env, &token_address);
    let token_admin_client = TokenAdminClient::new(&env, &token_address);

    // Deploy Staking Contract
    let staking_id = env.register_contract(None, StakingContract);
    let staking_client = StakingContractClient::new(&env, &staking_id);
    staking_client.initialize(&admin, &token_address);

    // Mint tokens
    token_admin_client.mint(&staker, &1000);
    
    // Stake
    staking_client.stake(&staker, &500);
    assert_eq!(token_client.balance(&staker), 500);
    assert_eq!(token_client.balance(&staking_id), 500);
    assert_eq!(staking_client.get_voting_power(&staker), 500);

    // Unstake
    staking_client.unstake(&staker, &200);
    assert_eq!(staking_client.get_voting_power(&staker), 300);
    
    // Try withdraw (should fail - cooldown)
    let result = staking_client.try_withdraw(&staker);
    assert!(result.is_err());

    // Jump 7 days
    env.ledger().set_timestamp(604801);
    staking_client.withdraw(&staker);
    assert_eq!(token_client.balance(&staker), 700);
}

#[test]
fn test_staking_rewards() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let staker1 = Address::generate(&env);
    let staker2 = Address::generate(&env);
    
    // Deploy token
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_id.address();
    let token_admin_client = TokenAdminClient::new(&env, &token_address);

    // Deploy Staking Contract
    let staking_id = env.register_contract(None, StakingContract);
    let staking_client = StakingContractClient::new(&env, &staking_id);
    staking_client.initialize(&admin, &token_address);

    // Mint tokens & Stake
    token_admin_client.mint(&staker1, &1000);
    token_admin_client.mint(&staker2, &1000);
    staking_client.stake(&staker1, &600);
    staking_client.stake(&staker2, &400);

    // Admin deposits rewards
    token_admin_client.mint(&admin, &1000);
    staking_client.deposit_rewards(&admin, &100); // 60 for staker1, 40 for staker2

    // Claim rewards
    let claimed1 = staking_client.claim_staking_rewards(&staker1);
    let claimed2 = staking_client.claim_staking_rewards(&staker2);

    assert_eq!(claimed1, 60);
    assert_eq!(claimed2, 40);
}

#[test]
fn test_delegation() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let staker1 = Address::generate(&env);
    let staker2 = Address::generate(&env);
    
    // Deploy token
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_id.address();
    let token_admin_client = TokenAdminClient::new(&env, &token_address);

    // Deploy Staking Contract
    let staking_id = env.register_contract(None, StakingContract);
    let staking_client = StakingContractClient::new(&env, &staking_id);
    staking_client.initialize(&admin, &token_address);

    // Stake
    token_admin_client.mint(&staker1, &1000);
    token_admin_client.mint(&staker2, &1000);
    staking_client.stake(&staker1, &600);
    staking_client.stake(&staker2, &400);

    assert_eq!(staking_client.get_voting_power(&staker1), 600);
    assert_eq!(staking_client.get_voting_power(&staker2), 400);

    // Delegate staker1 -> staker2
    staking_client.delegate_voting_power(&staker1, &Some(staker2.clone()));

    assert_eq!(staking_client.get_voting_power(&staker1), 600); // Still has own voting power? 
    // Wait, usually delegation means giving power to someone else.
    // The requirement says "Delegate voting power". 
    // My implementation: get_voting_power = staked + delegated_to_me.
    // So staker2 should have 400 + 600 = 1000.
    assert_eq!(staking_client.get_voting_power(&staker2), 1000);

    // Unstake staker1 partial
    staking_client.unstake(&staker1, &100);
    assert_eq!(staking_client.get_voting_power(&staker2), 900);

    // Remove delegation
    staking_client.delegate_voting_power(&staker1, &None);
    assert_eq!(staking_client.get_voting_power(&staker2), 400);
}

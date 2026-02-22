//! Tests for path-payment contract: path finding, conversion rate, execute with slippage.

extern crate std;

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::{Client as TokenClient, StellarAssetClient},
    Address, Env, String, Vec,
};

fn setup() -> (Env, Address, PathPaymentContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, PathPaymentContract);
    let client = PathPaymentContractClient::new(&env, &contract_id);
    (env, admin, client)
}

fn setup_with_tokens() -> (
    Env,
    Address,
    Address,
    Address,
    Address,
    PathPaymentContractClient<'static>,
    TokenClient<'static>,
    StellarAssetClient<'static>,
) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let token_admin_a = Address::generate(&env);
    let token_admin_b = Address::generate(&env);
    let token_a_id = env.register_stellar_asset_contract_v2(token_admin_a.clone());
    let token_b_id = env.register_stellar_asset_contract_v2(token_admin_b.clone());
    let token_a = token_a_id.address();
    let token_b = token_b_id.address();
    let token_client = TokenClient::new(&env, &token_a);
    let stellar_token = StellarAssetClient::new(&env, &token_a);
    let contract_id = env.register_contract(None, PathPaymentContract);
    let client = PathPaymentContractClient::new(&env, &contract_id);
    (
        env,
        admin,
        token_a,
        token_b,
        contract_id,
        client,
        token_client,
        stellar_token,
    )
}

// ========== Initialization ==========

#[test]
fn test_initialize() {
    let (_env, admin, client) = setup();
    client.initialize(&admin);
    assert_eq!(client.get_admin(), admin);
}

#[test]
fn test_double_initialize_fails() {
    let (_, admin, client) = setup();
    client.initialize(&admin);
    let res = client.try_initialize(&admin);
    assert!(res.is_err());
}

// ========== Path finding ==========

#[test]
fn test_find_payment_path_not_initialized() {
    let (env, _, client) = setup();
    let a = Asset(Address::generate(&env));
    let b = Asset(Address::generate(&env));
    let res = client.try_find_payment_path(&a, &b, &1000i128);
    assert!(res.is_err());
}

#[test]
fn test_find_payment_path_same_asset() {
    let (env, admin, client) = setup();
    client.initialize(&admin);
    let a = Asset(Address::generate(&env));
    let path = client.find_payment_path(&a, &a, &1000i128);
    assert_eq!(path.len(), 1);
    assert_eq!(path.get(0).unwrap().address(), a.address());
}

#[test]
fn test_find_payment_path_direct_pair() {
    let (env, admin, client) = setup();
    client.initialize(&admin);
    let from_addr = Address::generate(&env);
    let to_addr = Address::generate(&env);
    client.register_pair(&Asset(from_addr.clone()), &Asset(to_addr.clone()));
    let path = client.find_payment_path(
        &Asset(from_addr.clone()),
        &Asset(to_addr.clone()),
        &1000i128,
    );
    assert_eq!(path.len(), 2);
    assert_eq!(path.get(0).unwrap().address(), &from_addr);
    assert_eq!(path.get(1).unwrap().address(), &to_addr);
}

#[test]
fn test_find_payment_path_multi_hop() {
    let (env, admin, client) = setup();
    client.initialize(&admin);
    let a = Address::generate(&env);
    let b = Address::generate(&env);
    let c = Address::generate(&env);
    client.register_pair(&Asset(a.clone()), &Asset(b.clone()));
    client.register_pair(&Asset(b.clone()), &Asset(c.clone()));
    let path = client.find_payment_path(&Asset(a.clone()), &Asset(c.clone()), &1000i128);
    assert_eq!(path.len(), 3);
    assert_eq!(path.get(0).unwrap().address(), &a);
    assert_eq!(path.get(1).unwrap().address(), &b);
    assert_eq!(path.get(2).unwrap().address(), &c);
}

#[test]
fn test_find_payment_path_not_found() {
    let (env, admin, client) = setup();
    client.initialize(&admin);
    let a = Asset(Address::generate(&env));
    let b = Asset(Address::generate(&env));
    let res = client.try_find_payment_path(&a, &b, &1000i128);
    assert!(res.is_err());
}

// ========== Conversion rate ==========

#[test]
fn test_get_conversion_rate_not_initialized() {
    let (env, _, client) = setup();
    let a = Asset(Address::generate(&env));
    let b = Asset(Address::generate(&env));
    assert_eq!(client.get_conversion_rate(&a, &b), 0);
}

#[test]
fn test_get_conversion_rate_same_asset() {
    let (env, admin, client) = setup();
    client.initialize(&admin);
    let a = Asset(Address::generate(&env));
    assert_eq!(client.get_conversion_rate(&a, &a), 10_000_000);
}

#[test]
fn test_get_conversion_rate_after_set_rate() {
    let (env, admin, client) = setup();
    client.initialize(&admin);
    let from_addr = Address::generate(&env);
    let to_addr = Address::generate(&env);
    client.set_rate(
        &Asset(from_addr.clone()),
        &Asset(to_addr.clone()),
        &20_000_000,
    );
    assert_eq!(
        client.get_conversion_rate(&Asset(from_addr), &Asset(to_addr)),
        20_000_000
    );
}

// ========== Execute path payment (single asset, no router) ==========

#[test]
fn test_execute_path_payment_single_asset() {
    let (env, admin, token_a, _token_b, contract_id, client, token_client, stellar_token) =
        setup_with_tokens();
    client.initialize(&admin);
    let caller = Address::generate(&env);
    stellar_token.mint(&caller, &500_0000000i128);
    env.mock_all_auths();
    let mut path = Vec::new(&env);
    path.push_back(Asset(token_a.clone()));
    let split_id = String::from_str(&env, "split-1");
    let amount = 100_0000000i128;
    let received = client.execute_path_payment(&caller, &split_id, &path, &amount, &0u32);
    assert_eq!(received, amount);
    assert_eq!(token_client.balance(&caller), 400_0000000i128);
    assert_eq!(token_client.balance(&contract_id), amount);
}

#[test]
fn test_execute_path_payment_invalid_amount() {
    let (env, admin, token_a, _token_b, _contract_id, client, _, _) = setup_with_tokens();
    client.initialize(&admin);
    let caller = Address::generate(&env);
    env.mock_all_auths();
    let mut path = Vec::new(&env);
    path.push_back(Asset(token_a.clone()));
    let split_id = String::from_str(&env, "split-1");
    let res = client.try_execute_path_payment(&caller, &split_id, &path, &0i128, &100u32);
    assert!(res.is_err());
}

#[test]
fn test_execute_path_payment_empty_path() {
    let (env, admin, _token_a, _token_b, _contract_id, client, _, _) = setup_with_tokens();
    client.initialize(&admin);
    let caller = Address::generate(&env);
    env.mock_all_auths();
    let path = Vec::new(&env);
    let split_id = String::from_str(&env, "split-1");
    let res = client.try_execute_path_payment(&caller, &split_id, &path, &100i128, &100u32);
    assert!(res.is_err());
}

// ========== Slippage (simulated with rates) ==========

#[test]
fn test_slippage_protection_single_hop() {
    let (env, admin, token_a, token_b, _contract_id, client, _token_client, stellar_token) =
        setup_with_tokens();
    client.initialize(&admin);
    client.set_rate(
        &Asset(token_a.clone()),
        &Asset(token_b.clone()),
        &10_000_000,
    );
    stellar_token.mint(&Address::generate(&env), &1000_0000000i128);
    let caller = Address::generate(&env);
    env.mock_all_auths();
    stellar_token.mint(&caller, &500_0000000i128);
    let mut path = Vec::new(&env);
    path.push_back(Asset(token_a.clone()));
    path.push_back(Asset(token_b.clone()));
    let split_id = String::from_str(&env, "split-1");
    let amount = 100_0000000i128;
    let res = client.try_execute_path_payment(&caller, &split_id, &path, &amount, &0u32);
    assert!(res.is_err());
}

// ========== Admin: set_swap_router ==========

#[test]
fn test_get_swap_router_none() {
    let (_, admin, client) = setup();
    client.initialize(&admin);
    assert!(client.get_swap_router().is_none());
}

#[test]
fn test_set_swap_router() {
    let (env, admin, client) = setup();
    client.initialize(&admin);
    let router = Address::generate(&env);
    client.set_swap_router(&router);
    assert_eq!(client.get_swap_router(), Some(router));
}

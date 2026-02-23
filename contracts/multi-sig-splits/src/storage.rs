//! # Storage Module for Multi-Signature Splits Contract

use soroban_sdk::{Address, Env, String, Symbol, symbol_short};
use crate::types::*;

/// Storage keys
const ADMIN: Symbol = symbol_short!("ADMIN");


/// Set the admin address
pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&ADMIN, admin);
}

/// Get the admin address
pub fn get_admin(env: &Env) -> Address {
    env.storage().instance().get(&ADMIN).unwrap()
}

/// Check if admin is set
pub fn has_admin(env: &Env) -> bool {
    env.storage().instance().has(&ADMIN)
}

/// Check if a multi-sig split exists
pub fn split_exists(env: &Env, split_id: &String) -> bool {
    env.storage().persistent().has(split_id)
}

/// Get a multi-sig split by ID
pub fn get_split(env: &Env, split_id: &String) -> MultisigSplit {
    env.storage().persistent().get(split_id).unwrap()
}

/// Save a multi-sig split
pub fn save_split(env: &Env, split: &MultisigSplit) {
    env.storage().persistent().set(&split.split_id, split);
}

/// Check if an address has signed a split
pub fn has_signed(env: &Env, split_id: &String, signer: &Address) -> bool {
    let split = get_split(env, split_id);
    for i in 0..split.signers.len() {
        if &split.signers.get(i).unwrap() == signer {
            return true;
        }
    }
    false
}

/// Add a signature to a split
pub fn add_signature(env: &Env, split_id: &String, signer: &Address) {
    let mut split = get_split(env, split_id);
    split.signers.push_back(signer.clone());
    split.current_signatures += 1;
    save_split(env, &split);
}

/// Check if a split can be executed
pub fn can_execute(env: &Env, split: &MultisigSplit) -> bool {
    split.status == MultisigStatus::Active
        && split.current_signatures >= split.required_signatures
        && env.ledger().timestamp() >= split.created_at + split.time_lock
}

/// Check if a split has expired
pub fn is_expired(env: &Env, split: &MultisigSplit) -> bool {
    env.ledger().timestamp() > split.created_at + split.time_lock + 86400 // 24 hours grace period
}

/// Update split status
pub fn update_split_status(env: &Env, split_id: &String, status: &MultisigStatus) {
    let mut split = get_split(env, split_id);
    split.status = *status;
    if *status == MultisigStatus::Executed {
        split.executed_at = env.ledger().timestamp();
    }
    save_split(env, &split);
}
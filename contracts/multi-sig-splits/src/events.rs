//! # Events Module for Multi-Signature Splits Contract

use soroban_sdk::{Address, Env, String};

/// Emit initialization event
pub fn emit_initialized(env: &Env, admin: &Address) {
    env.events().publish(("init", "admin"), admin.clone());
}

/// Emit multi-sig split created event
pub fn emit_split_created(env: &Env, split_id: &String, required_sigs: u32, time_lock: u64) {
    env.events().publish(("split_created", "split_id", "required_sigs", "time_lock"), (split_id.clone(), required_sigs, time_lock));
}

/// Emit signature added event
pub fn emit_signature_added(env: &Env, split_id: &String, signer: &Address) {
    env.events().publish(("signature_added", "split_id", "signer"), (split_id.clone(), signer.clone()));
}

/// Emit split executed event
pub fn emit_split_executed(env: &Env, split_id: &String) {
    env.events().publish(("split_executed", "split_id"), split_id.clone());
}

/// Emit split cancelled event
pub fn emit_split_cancelled(env: &Env, split_id: &String, reason: &String) {
    env.events().publish(("split_cancelled", "split_id", "reason"), (split_id.clone(), reason.clone()));
}

/// Emit emergency override event
pub fn emit_emergency_override(env: &Env, split_id: &String, admin: &Address) {
    env.events().publish(("emergency_override", "split_id", "admin"), (split_id.clone(), admin.clone()));
}
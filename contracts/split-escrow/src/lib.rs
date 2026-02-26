// ─────────────────────────────────────────────────────────────────────────────
// Issue #178 — Implement Contract Pause and Unpause Mechanism
//
// ADD these items to contracts/split-escrow/src/lib.rs
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. Add `Paused` and `Admin` to your DataKey enum:
//
//     #[contracttype]
//     pub enum DataKey {
//         Escrow(u64),
//         Paused,   // ← ADD
//         Admin,    // ← ADD (reused from issue #177 if done first)
//     }
//
// 2. In your `initialize` / `create_escrow` bootstrap, set:
//        env.storage().instance().set(&DataKey::Paused, &false);
//
// 3. Add the two event emitters and the pause/unpause functions shown below,
//    and add the `require_unpaused` guard call inside deposit() and
//    release_funds().
// ─────────────────────────────────────────────────────────────────────────────

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env};

// ── Error additions ──────────────────────────────────────────────────────────

#[contracttype]
#[derive(Debug, PartialEq)]
pub enum EscrowError {
    // … your existing variants …
    NotFound = 1,
    Unauthorized = 2,
    // NEW:
    ContractPaused = 20,
}

// ── Storage keys (add to your existing DataKey enum) ─────────────────────────

#[contracttype]
pub enum DataKey {
    Escrow(u64),
    Paused, // ← new
    Admin,  // ← new (shared with issue #177)
}

// ── Event emitters (add to events.rs) ────────────────────────────────────────

pub fn emit_contract_paused(env: &Env, by: Address) {
    let topics = (symbol_short!("paused"),);
    let data = (by, env.ledger().timestamp());
    env.events().publish(topics, data);
}

pub fn emit_contract_unpaused(env: &Env, by: Address) {
    let topics = (symbol_short!("unpaused"),);
    let data = (by, env.ledger().timestamp());
    env.events().publish(topics, data);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/// Returns `true` when the contract is paused.
fn is_paused(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::Paused)
        .unwrap_or(false)
}

/// Call at the top of deposit() and release_funds().
fn require_unpaused(env: &Env) -> Result<(), EscrowError> {
    if is_paused(env) {
        Err(EscrowError::ContractPaused)
    } else {
        Ok(())
    }
}

/// Returns the stored admin address.
fn get_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .expect("admin not set — call initialize first")
}

// ── Contract implementation ───────────────────────────────────────────────────

pub struct SplitEscrowContract;

#[contractimpl]
impl SplitEscrowContract {
    // ── One-time setup (call once after deployment) ──────────────────────────
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Paused, &false);
    }

    // ── Pause ────────────────────────────────────────────────────────────────
    /// Halt all deposits and fund releases. Admin-only.
    pub fn pause(env: Env) -> Result<(), EscrowError> {
        let admin = get_admin(&env);
        admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &true);
        emit_contract_paused(&env, admin);
        Ok(())
    }

    // ── Unpause ──────────────────────────────────────────────────────────────
    /// Resume normal operation. Admin-only.
    pub fn unpause(env: Env) -> Result<(), EscrowError> {
        let admin = get_admin(&env);
        admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &false);
        emit_contract_unpaused(&env, admin);
        Ok(())
    }

    // ── deposit — add require_unpaused guard ─────────────────────────────────
    //
    // In your EXISTING deposit() function, add this as the very first line:
    //
    //   pub fn deposit(env: Env, split_id: u64, participant: Address, amount: i128)
    //       -> Result<(), EscrowError>
    //   {
    //       require_unpaused(&env)?;   // ← ADD THIS LINE
    //       // … rest of your existing deposit logic …
    //   }

    // ── release_funds — add require_unpaused guard ───────────────────────────
    //
    // In your EXISTING release_funds() function, add this as the very first line:
    //
    //   pub fn release_funds(env: Env, split_id: u64) -> Result<(), EscrowError> {
    //       require_unpaused(&env)?;   // ← ADD THIS LINE
    //       // … rest of your existing release logic …
    //   }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Events, Address, Env};

    fn setup() -> (Env, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        SplitEscrowContract::initialize(env.clone(), admin.clone());
        (env, admin)
    }

    #[test]
    fn test_initially_unpaused() {
        let (env, _) = setup();
        assert!(!is_paused(&env));
    }

    #[test]
    fn test_pause_sets_flag() {
        let (env, _admin) = setup();
        SplitEscrowContract::pause(env.clone()).unwrap();
        assert!(is_paused(&env));
    }

    #[test]
    fn test_unpause_clears_flag() {
        let (env, _admin) = setup();
        SplitEscrowContract::pause(env.clone()).unwrap();
        SplitEscrowContract::unpause(env.clone()).unwrap();
        assert!(!is_paused(&env));
    }

    #[test]
    fn test_pause_emits_event() {
        let (env, _) = setup();
        SplitEscrowContract::pause(env.clone()).unwrap();
        // initialize emits nothing; pause emits 1 event
        let events = env.events().all();
        assert_eq!(events.len(), 1);
    }

    #[test]
    fn test_unpause_emits_event() {
        let (env, _) = setup();
        SplitEscrowContract::pause(env.clone()).unwrap();
        SplitEscrowContract::unpause(env.clone()).unwrap();
        assert_eq!(env.events().all().len(), 2);
    }

    #[test]
    fn test_require_unpaused_blocks_when_paused() {
        let (env, _) = setup();
        SplitEscrowContract::pause(env.clone()).unwrap();
        let result = require_unpaused(&env);
        assert_eq!(result, Err(EscrowError::ContractPaused));
    }

    #[test]
    fn test_require_unpaused_passes_when_unpaused() {
        let (env, _) = setup();
        assert!(require_unpaused(&env).is_ok());
    }

    #[test]
    fn test_pause_and_resume_cycle() {
        let (env, _) = setup();
        SplitEscrowContract::pause(env.clone()).unwrap();
        assert!(is_paused(&env));
        SplitEscrowContract::unpause(env.clone()).unwrap();
        assert!(!is_paused(&env));
        // Can pause again after unpause
        SplitEscrowContract::pause(env.clone()).unwrap();
        assert!(is_paused(&env));
    }
}
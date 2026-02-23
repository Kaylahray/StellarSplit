//! # Multi-Signature Splits Contract
//!
//! This contract implements multi-signature functionality with time-locks
//! for large splits in the StellarSplit application.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, Address, Env, String, Vec, panic_with_error,
};

mod events;
mod storage;
mod types;

#[cfg(test)]
mod test;

pub use events::*;
pub use storage::*;
pub use types::*;

/// The main Multi-Signature Splits contract
#[contract]
pub struct MultisigSplitsContract;

#[contractimpl]
impl MultisigSplitsContract {
    /// Initialize the contract with an admin address
    pub fn initialize(env: Env, admin: Address) {
        // Ensure the contract hasn't been initialized already
        if storage::has_admin(&env) {
            panic_with_error!(&env, MultisigError::NotAuthorized);
        }

        // Verify the admin is authorizing this call
        admin.require_auth();

        // Store the admin address
        storage::set_admin(&env, &admin);

        // Emit initialization event
        events::emit_initialized(&env, &admin);
    }

    /// Create a new multi-signature split
    ///
    /// This function creates a new multi-sig split with the specified
    /// signature threshold and time lock.
    pub fn create_multisig_split(
        env: Env,
        split_id: String,
        required_sigs: u32,
        time_lock: u64,
    ) -> Result<(), MultisigError> {
        // Validate inputs
        if required_sigs == 0 {
            return Err(MultisigError::InvalidThreshold);
        }

        if time_lock == 0 {
            return Err(MultisigError::InvalidThreshold);
        }

        // Check if split already exists
        if storage::split_exists(&env, &split_id) {
            return Err(MultisigError::SplitAlreadyExists);
        }

        // Create the multi-sig split
        let split = MultisigSplit {
            split_id: split_id.clone(),
            required_signatures: required_sigs,
            current_signatures: 0,
            time_lock,
            created_at: env.ledger().timestamp(),
            executed_at: 0,
            status: MultisigStatus::Pending,
            signers: Vec::new(&env),
        };

        // Save the split
        storage::save_split(&env, &split);

        // Emit creation event
        events::emit_split_created(&env, &split_id, required_sigs, time_lock);

        Ok(())
    }

    /// Sign a multi-signature split
    ///
    /// This function allows authorized signers to add their signature
    /// to a pending multi-sig split.
    pub fn sign_split(
        env: Env,
        split_id: String,
        signer: Address,
    ) -> Result<bool, MultisigError> {
        // Verify the signer is authorizing this call
        signer.require_auth();

        // Check if split exists
        if !storage::split_exists(&env, &split_id) {
            return Err(MultisigError::SplitNotFound);
        }

        let split = storage::get_split(&env, &split_id);

        // Check if split is in correct state
        if split.status != MultisigStatus::Pending && split.status != MultisigStatus::Active {
            return Err(MultisigError::SplitNotActive);
        }

        // Check if signer has already signed
        if storage::has_signed(&env, &split_id, &signer) {
            return Err(MultisigError::AlreadySigned);
        }

        // Add the signature
        storage::add_signature(&env, &split_id, &signer);

        // Update status to active if this is the first signature
        if split.status == MultisigStatus::Pending {
            storage::update_split_status(&env, &split_id, &MultisigStatus::Active);
        }

        // Emit signature event
        events::emit_signature_added(&env, &split_id, &signer);

        // Check if split can be executed now
        let updated_split = storage::get_split(&env, &split_id);
        let can_execute = storage::can_execute(&env, &updated_split);

        Ok(can_execute)
    }

    /// Execute a multi-signature split
    ///
    /// This function executes a split once all required signatures are collected
    /// and the time lock has expired.
    pub fn execute_split(
        env: Env,
        split_id: String,
    ) -> Result<(), MultisigError> {
        // Check if split exists
        if !storage::split_exists(&env, &split_id) {
            return Err(MultisigError::SplitNotFound);
        }

        let split = storage::get_split(&env, &split_id);

        // Check if split is in correct state
        if split.status != MultisigStatus::Active {
            return Err(MultisigError::SplitNotActive);
        }

        // Check if split has sufficient signatures
        if split.current_signatures < split.required_signatures {
            return Err(MultisigError::InsufficientSignatures);
        }

        // Check if time lock has expired
        if env.ledger().timestamp() < split.created_at + split.time_lock {
            return Err(MultisigError::TimeLockNotExpired);
        }

        // Execute the split
        storage::update_split_status(&env, &split_id, &MultisigStatus::Executed);

        // Emit execution event
        events::emit_split_executed(&env, &split_id);

        Ok(())
    }

    /// Cancel a multi-signature split
    ///
    /// This function allows the admin to cancel a split in emergency situations.
    pub fn cancel_split(
        env: Env,
        split_id: String,
        reason: String,
    ) -> Result<(), MultisigError> {
        // Get the admin
        let admin = storage::get_admin(&env);

        // Verify the admin is authorizing this call
        admin.require_auth();

        // Check if split exists
        if !storage::split_exists(&env, &split_id) {
            return Err(MultisigError::SplitNotFound);
        }

        let split = storage::get_split(&env, &split_id);

        // Check if split can be cancelled
        if split.status == MultisigStatus::Executed || split.status == MultisigStatus::Cancelled {
            return Err(MultisigError::SplitAlreadyExecuted);
        }

        // Cancel the split
        storage::update_split_status(&env, &split_id, &MultisigStatus::Cancelled);

        // Emit cancellation event
        events::emit_split_cancelled(&env, &split_id, &reason);

        Ok(())
    }

    /// Emergency override to execute a split
    ///
    /// This function allows the admin to execute a split immediately
    /// in emergency situations, bypassing time locks and signature requirements.
    pub fn emergency_override(
        env: Env,
        split_id: String,
    ) -> Result<(), MultisigError> {
        // Get the admin
        let admin = storage::get_admin(&env);

        // Verify the admin is authorizing this call
        admin.require_auth();

        // Check if split exists
        if !storage::split_exists(&env, &split_id) {
            return Err(MultisigError::SplitNotFound);
        }

        let split = storage::get_split(&env, &split_id);

        // Check if split can be overridden
        if split.status == MultisigStatus::Executed || split.status == MultisigStatus::Cancelled {
            return Err(MultisigError::SplitAlreadyExecuted);
        }

        // Execute the split immediately
        storage::update_split_status(&env, &split_id, &MultisigStatus::Executed);

        // Emit override event
        events::emit_emergency_override(&env, &split_id, &admin);

        Ok(())
    }

    /// Get split information
    pub fn get_split_info(
        env: Env,
        split_id: String,
    ) -> MultisigSplit {
        storage::get_split(&env, &split_id)
    }

    /// Check if a split can be executed
    pub fn can_execute_split(
        env: Env,
        split_id: String,
    ) -> bool {
        if !storage::split_exists(&env, &split_id) {
            return false;
        }
        let split = storage::get_split(&env, &split_id);
        storage::can_execute(&env, &split)
    }
}
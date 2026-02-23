//! # Types for Multi-Signature Splits Contract

use soroban_sdk::{contracterror, contracttype, Address, String, Vec};

/// Status of a multi-signature split
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MultisigStatus {
    Pending,
    Active,
    Executed,
    Cancelled,
    Expired,
}

/// Multi-signature split configuration
#[contracttype]
#[derive(Clone, Debug)]
pub struct MultisigSplit {
    /// Unique split identifier
    pub split_id: String,
    /// Required number of signatures
    pub required_signatures: u32,
    /// Current number of signatures collected
    pub current_signatures: u32,
    /// Time lock duration in seconds
    pub time_lock: u64,
    /// Creation timestamp
    pub created_at: u64,
    /// Execution timestamp (0 if not executed)
    pub executed_at: u64,
    /// Current status
    pub status: MultisigStatus,
    /// List of signers who have signed
    pub signers: Vec<Address>,
}

/// Error types for the contract
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum MultisigError {
    SplitAlreadyExists = 1,
    SplitNotFound = 2,
    InvalidThreshold = 3,
    AlreadySigned = 4,
    NotAuthorized = 5,
    TimeLockNotExpired = 6,
    InsufficientSignatures = 7,
    SplitNotActive = 8,
    SplitAlreadyExecuted = 9,
    SplitCancelled = 10,
}
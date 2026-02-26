use soroban_sdk::{contracttype, Env};

#[contracttype]
#[derive(Clone, Debug)]
pub enum DataKey {
    Escrow(String),
    PlatformStats, // NEW
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct PlatformStats {
    pub total_escrows_created: u64,
    pub total_escrows_completed: u64,
    pub total_escrows_cancelled: u64,
    pub total_volume_settled: i128,
}
use soroban_sdk::{contracttype, Address};

#[derive(Clone)]
#[contracttype]
pub struct StakerInfo {
    pub amount: i128,              // Amount currently staked
    pub pending_withdrawal: i128,  // Amount waiting for cooldown
    pub unlock_time: u64,          // Timestamp when pending withdrawal can be claimed
    pub last_reward_index: i128,   // The global reward index when staker last updated
    pub accumulated_rewards: i128, // Rewards harvested but not yet claimed
    pub delegated_to: Option<Address>,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    RewardIndex,               // Global index: total_rewards / total_staked
    TotalStaked,
    Staker(Address),
    DelegatedAmount(Address),  // Total amount delegated TO this address
}

use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Clone, Debug)]
pub struct EscrowParticipant {
    pub address: Address,
    pub amount_owed: i128,
    pub amount_paid: i128,
    pub paid_at: Option<u64>,
    pub reminder_requested: bool, // New flag
}

impl EscrowParticipant {
    pub fn new(address: Address, amount_owed: i128) -> Self {
        Self {
            address,
            amount_owed,
            amount_paid: 0,
            paid_at: None,
            reminder_requested: false,
        }
    }
}
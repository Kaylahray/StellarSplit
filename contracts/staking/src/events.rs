use soroban_sdk::{Address, Env, symbol_short};

pub fn emit_initialized(env: &Env, admin: &Address, token: &Address) {
    env.events().publish(
        (symbol_short!("staking"), symbol_short!("init")),
        (admin, token),
    );
}

pub fn emit_staked(env: &Env, staker: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("staking"), symbol_short!("stake")),
        (staker, amount),
    );
}

pub fn emit_unstaked(env: &Env, staker: &Address, amount: i128, unlock_time: u64) {
    env.events().publish(
        (symbol_short!("staking"), symbol_short!("unstake")),
        (staker, amount, unlock_time),
    );
}

pub fn emit_rewards_claimed(env: &Env, staker: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("staking"), symbol_short!("claim")),
        (staker, amount),
    );
}

pub fn emit_delegated(env: &Env, delegator: &Address, delegatee: &Option<Address>) {
    env.events().publish(
        (symbol_short!("staking"), symbol_short!("delegate")),
        (delegator.clone(), delegatee.clone()),
    );
}

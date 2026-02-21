use soroban_sdk::{Address, Env};
use crate::types::{DataKey, StakerInfo};

pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::Admin)
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn get_token(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::Token)
}

pub fn set_token(env: &Env, token: &Address) {
    env.storage().instance().set(&DataKey::Token, token);
}

pub fn get_reward_index(env: &Env) -> i128 {
    env.storage().instance().get(&DataKey::RewardIndex).unwrap_or(0)
}

pub fn set_reward_index(env: &Env, index: i128) {
    env.storage().instance().set(&DataKey::RewardIndex, &index);
}

pub fn get_total_staked(env: &Env) -> i128 {
    env.storage().instance().get(&DataKey::TotalStaked).unwrap_or(0)
}

pub fn set_total_staked(env: &Env, amount: i128) {
    env.storage().instance().set(&DataKey::TotalStaked, &amount);
}

pub fn get_staker_info(env: &Env, staker: &Address) -> Option<StakerInfo> {
    env.storage().persistent().get(&DataKey::Staker(staker.clone()))
}

pub fn set_staker_info(env: &Env, staker: &Address, info: &StakerInfo) {
    env.storage().persistent().set(&DataKey::Staker(staker.clone()), info);
}

pub fn get_delegated_amount(env: &Env, delegatee: &Address) -> i128 {
    env.storage().instance().get(&DataKey::DelegatedAmount(delegatee.clone())).unwrap_or(0)
}

pub fn set_delegated_amount(env: &Env, delegatee: &Address, amount: i128) {
    env.storage().instance().set(&DataKey::DelegatedAmount(delegatee.clone()), &amount);
}

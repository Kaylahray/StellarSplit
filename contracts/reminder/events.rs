use soroban_sdk::{Env, Address, Symbol};

pub fn emit_reminder_requested(env: &Env, participant: Address, split_id: &str) {
    env.events().publish(
        (Symbol::new("ReminderRequested"), participant.clone()),
        split_id,
    );
}

pub fn emit_reminder_cancelled(env: &Env, participant: Address, split_id: &str) {
    env.events().publish(
        (Symbol::new("ReminderCancelled"), participant.clone()),
        split_id,
    );
}
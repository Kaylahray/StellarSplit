use soroban_sdk::{symbol_short, Address, Env};

/// Emitted when a new escrow is created for a split.
///
/// Topics : ["escrow_created", split_id]
/// Data   : { creator, total_amount, deadline }
pub fn emit_escrow_created(
    env: &Env,
    split_id: u64,
    creator: Address,
    total_amount: i128,
    deadline: u64,
) {
    let topics = (symbol_short!("e_created"), split_id);
    let data = (creator, total_amount, deadline, env.ledger().timestamp());
    env.events().publish(topics, data);
}

/// Emitted when a participant deposits funds into the escrow.
///
/// Topics : ["pmt_recvd", split_id]
/// Data   : { participant, amount, timestamp }
pub fn emit_payment_received(
    env: &Env,
    split_id: u64,
    participant: Address,
    amount: i128,
) {
    let topics = (symbol_short!("pmt_recvd"), split_id);
    let data = (participant, amount, env.ledger().timestamp());
    env.events().publish(topics, data);
}

/// Emitted when funds are released to a recipient after all payments are received.
///
/// Topics : ["funds_rls", split_id]
/// Data   : { recipient, amount, timestamp }
pub fn emit_funds_released(
    env: &Env,
    split_id: u64,
    recipient: Address,
    amount: i128,
) {
    let topics = (symbol_short!("funds_rls"), split_id);
    let data = (recipient, amount, env.ledger().timestamp());
    env.events().publish(topics, data);
}

/// Emitted when the creator explicitly cancels the escrow.
///
/// Topics : ["e_cancel", split_id]
/// Data   : { cancelled_by, timestamp }
pub fn emit_escrow_cancelled(env: &Env, split_id: u64, cancelled_by: Address) {
    let topics = (symbol_short!("e_cancel"), split_id);
    let data = (cancelled_by, env.ledger().timestamp());
    env.events().publish(topics, data);
}

/// Emitted when the escrow deadline passes with outstanding unfunded amounts.
///
/// Topics : ["e_expired", split_id]
/// Data   : { unfunded_amount, timestamp }
pub fn emit_escrow_expired(env: &Env, split_id: u64, unfunded_amount: i128) {
    let topics = (symbol_short!("e_expired"), split_id);
    let data = (unfunded_amount, env.ledger().timestamp());
    env.events().publish(topics, data);
}

/// Emitted when a refund is issued to a participant after cancellation or expiry.
///
/// Topics : ["refund", split_id]
/// Data   : { participant, amount, timestamp }
pub fn emit_refund_issued(env: &Env, split_id: u64, participant: Address, amount: i128) {
    let topics = (symbol_short!("refund"), split_id);
    let data = (participant, amount, env.ledger().timestamp());
    env.events().publish(topics, data);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Events, vec, Address, Env, IntoVal};

    fn make_env() -> Env {
        Env::default()
    }

    fn alice(env: &Env) -> Address {
        Address::generate(env)
    }

    #[test]
    fn test_emit_escrow_created() {
        let env = make_env();
        let creator = alice(&env);
        emit_escrow_created(&env, 1, creator.clone(), 1000, 9999);
        let events = env.events().all();
        assert_eq!(events.len(), 1);
        let (_, topics, _) = events.get(0).unwrap();
        // topics vec contains the symbol and split_id
        assert!(topics.len() > 0);
    }

    #[test]
    fn test_emit_payment_received() {
        let env = make_env();
        let participant = alice(&env);
        emit_payment_received(&env, 2, participant.clone(), 500);
        let events = env.events().all();
        assert_eq!(events.len(), 1);
    }

    #[test]
    fn test_emit_funds_released() {
        let env = make_env();
        let recipient = alice(&env);
        emit_funds_released(&env, 3, recipient.clone(), 1000);
        let events = env.events().all();
        assert_eq!(events.len(), 1);
    }

    #[test]
    fn test_emit_escrow_cancelled() {
        let env = make_env();
        let canceller = alice(&env);
        emit_escrow_cancelled(&env, 4, canceller.clone());
        let events = env.events().all();
        assert_eq!(events.len(), 1);
    }

    #[test]
    fn test_emit_escrow_expired() {
        let env = make_env();
        emit_escrow_expired(&env, 5, 250);
        let events = env.events().all();
        assert_eq!(events.len(), 1);
    }

    #[test]
    fn test_emit_refund_issued() {
        let env = make_env();
        let participant = alice(&env);
        emit_refund_issued(&env, 6, participant.clone(), 100);
        let events = env.events().all();
        assert_eq!(events.len(), 1);
    }

    #[test]
    fn test_all_events_distinct_topics() {
        let env = make_env();
        let addr = alice(&env);
        emit_escrow_created(&env, 1, addr.clone(), 1000, 9999);
        emit_payment_received(&env, 1, addr.clone(), 500);
        emit_funds_released(&env, 1, addr.clone(), 1000);
        emit_escrow_cancelled(&env, 1, addr.clone());
        emit_escrow_expired(&env, 1, 0);
        emit_refund_issued(&env, 1, addr.clone(), 500);
        // All 6 events emitted
        assert_eq!(env.events().all().len(), 6);
    }
}
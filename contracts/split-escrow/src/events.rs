use soroban_sdk::{symbol_short, Symbol, Address, Env, String};

use soroban_sdk::{symbol_short, Address, Env, String};

/// Emit when the contract is initialized
///
/// I'm emitting this once during contract setup so indexers
/// know when the contract became operational.
pub fn emit_initialized(env: &Env, admin: &Address) {
    env.events()
        .publish((symbol_short!("init"),), (admin.clone(),));
}

/// Emit when a new split is created
///
/// I'm including the key details so the backend can create
/// a corresponding record without querying the contract.
pub fn emit_split_created(env: &Env, split_id: u64, creator: &Address, total_amount: i128) {
    env.events().publish(
        (symbol_short!("created"),),
        (split_id, creator.clone(), total_amount),
    );
}

/// Emit when a deposit is received (legacy — single-asset)
///
/// I'm emitting this for each deposit so the backend can
/// track partial payments and update participant status.
pub fn emit_deposit_received(env: &Env, split_id: u64, participant: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("deposit"),),
        (split_id, participant.clone(), amount),
    );
}

/// Emit when a payment is received in a multi-asset escrow (issue #201)
///
/// Includes the asset address so off-chain indexers can reconcile
/// which token was used for each participant's payment.
pub fn emit_payment_received(env: &Env, split_id: u64, participant: &Address, asset: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("pmtrecv"),),
        (split_id, participant.clone(), asset.clone(), amount),
    );
}

/// Emit when funds are released to the creator
///
/// I'm including the total amount released for reconciliation
/// with the backend's payment records.
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
pub fn emit_escrow_cancelled(env: &Env, split_id: u64, cancelled_by: Address) {
    let topics = (symbol_short!("e_cancel"), split_id);
    let data = (cancelled_by, env.ledger().timestamp());
    env.events().publish(topics, data);
}

/// Emitted when the escrow deadline passes with outstanding unfunded amounts.
pub fn emit_escrow_expired(env: &Env, split_id: u64, unfunded_amount: i128) {
    let topics = (symbol_short!("e_expired"), split_id);
    let data = (unfunded_amount, env.ledger().timestamp());
    env.events().publish(topics, data);
}

/// Emitted when a refund is issued to a participant.
pub fn emit_refund_issued(env: &Env, split_id: u64, participant: Address, amount: i128) {
    let topics = (symbol_short!("refund"), split_id);
    let data = (participant, amount, env.ledger().timestamp());
    env.events().publish(topics, data);
}

// ── Legacy/Compatibility Emitters ───────────────────────────────────────────

/// Emit when an insurance policy is purchased
pub fn emit_insurance_purchased(
    env: &Env,
    insurance_id: &String,
    split_id: &String,
    policy_holder: &Address,
    premium: i128,
    coverage_amount: i128,
) {
    env.events().publish(
        (symbol_short!("ins_buy"),),
        (
            insurance_id.clone(),
            split_id.clone(),
            policy_holder.clone(),
            premium,
            coverage_amount,
        ),
    );
}

pub fn emit_deposit_received(env: &Env, split_id: u64, participant: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("clm_file"),),
        (
            claim_id.clone(),
            insurance_id.clone(),
            claimant.clone(),
            claim_amount,
        ),
    );
}

/// Emit when an insurance claim is processed
pub fn emit_claim_processed(
    env: &Env,
    claim_id: &String,
    insurance_id: &String,
    approved: bool,
    payout_amount: i128,
) {
    env.events().publish(
        (symbol_short!("clm_proc"),),
        (
            claim_id.clone(),
            insurance_id.clone(),
            approved,
            payout_amount,
        ),
    );
}

/// Emit when an insurance payout is made
pub fn emit_payout_made(
    env: &Env,
    claim_id: &String,
    recipient: &Address,
    amount: i128,
) {
    env.events().publish(
        (symbol_short!("payout"),),
        (claim_id.clone(), recipient.clone(), amount),
    );
}

pub fn emit_activity_tracked(env: &Env, user: &Address, activity_type: &str, split_id: u64, amount: i128) {
    env.events()
        .publish(
            (symbol_short!("act_track"),),
            (user.clone(), activity_type, split_id, amount)
        );
}

pub fn emit_rewards_calculated(env: &Env, user: &Address, total_rewards: i128, available_rewards: i128) {
    env.events()
        .publish(
            (symbol_short!("rwd_calc"),),
            (user.clone(), total_rewards, available_rewards)
        );
}

pub fn emit_rewards_claimed(env: &Env, user: &Address, amount_claimed: i128) {
    env.events()
        .publish(
            (symbol_short!("rwd_clm"),),
            (user.clone(), amount_claimed)
        );
}

// ── Insurance & Verification ────────────────────────────────────────────────

pub fn emit_insurance_purchased(
    env: &Env,
    insurance_id: &String,
    split_id: &String,
    policy_holder: &Address,
    premium: i128,
    coverage_amount: i128,
) {
    env.events().publish(
        (Symbol::new(env, "ins_purchased"),),
        (
            insurance_id.clone(),
            split_id.clone(),
            policy_holder.clone(),
            premium,
            coverage_amount,
        ),
    );
}

pub fn emit_verification_submitted(env: &Env, verification_id: &String, split_id: &String, requester: &Address) {
    env.events()
        .publish(
            (symbol_short!("ver_sub"),),
            (verification_id.clone(), split_id.clone(), requester.clone())
        );
}

/// Emit when verification is completed
///
/// This event is emitted when an oracle processes a verification request.
pub fn emit_verification_completed(env: &Env, verification_id: &String, verified: bool, verifier: &Address) {
    env.events()
        .publish(
            (symbol_short!("ver_done"),),
            (verification_id.clone(), verified, verifier.clone())
        );
}

pub fn emit_swap_created(env: &Env, swap_id: &String, participant_a: &Address, participant_b: &Address, amount_a: i128, amount_b: i128) {
    env.events()
        .publish(
            (symbol_short!("swp_new"),),
            (swap_id.clone(), participant_a.clone(), participant_b.clone(), amount_a, amount_b)
        );
}

/// Emit when atomic swap is executed
///
/// This event is emitted when an atomic swap is successfully completed.
pub fn emit_swap_executed(env: &Env, swap_id: &String, executor: &Address) {
    env.events()
        .publish(
            (symbol_short!("swp_exec"),),
            (swap_id.clone(), executor.clone())
        );
}

/// Emit when atomic swap is refunded
///
/// This event is emitted when an atomic swap is refunded due to timeout.
pub fn emit_swap_refunded(env: &Env, swap_id: &String, refunder: &Address) {
    env.events()
        .publish(
            (symbol_short!("swp_rfnd"),),
            (swap_id.clone(), refunder.clone())
        );
}

/// Emit when oracle node is registered
///
/// This event is emitted when a new oracle node joins the network.
pub fn emit_oracle_registered(env: &Env, oracle_address: &Address, stake: i128) {
    env.events()
        .publish(
            (symbol_short!("orc_reg"),),
            (oracle_address.clone(), stake)
        );
}

/// Emit when oracle submits price
///
/// This event is emitted when an oracle submits a price for an asset pair.
pub fn emit_price_submitted(env: &Env, oracle_address: &Address, asset_pair: &String, price: i128) {
    env.events()
        .publish(
            (symbol_short!("prc_sub"),),
            (oracle_address.clone(), asset_pair.clone(), price)
        );
}

/// Emit when consensus price is calculated
///
/// This event is emitted when the network reaches consensus on a price.
pub fn emit_consensus_reached(env: &Env, asset_pair: &String, consensus_price: i128, confidence: i128, participating_oracles: u32) {
    env.events()
        .publish(
            (symbol_short!("cns_rch"),),
            (asset_pair.clone(), consensus_price, confidence, participating_oracles)
        );
}

/// Emit when bridge transaction is initiated
///
/// This event is emitted when a cross-chain bridge transaction is started.
pub fn emit_bridge_initiated(env: &Env, bridge_id: &String, source_chain: &String, destination_chain: &String, amount: i128, recipient: &String) {
    env.events()
        .publish(
            (symbol_short!("brg_init"),),
            (bridge_id.clone(), source_chain.clone(), destination_chain.clone(), amount, recipient.clone())
        );
}

/// Emit when bridge transaction is completed
///
/// This event is emitted when a bridge transaction is successfully completed.
pub fn emit_bridge_completed(env: &Env, bridge_id: &String, recipient: &String) {
    env.events()
        .publish(
            (symbol_short!("brg_done"),),
            (bridge_id.clone(), recipient.clone())
        );
}

/// Emit when bridge transaction is refunded
///
/// This event is emitted when a bridge transaction is refunded.
pub fn emit_bridge_refunded(env: &Env, bridge_id: &String, sender: &Address) {
    env.events()
        .publish(
            (symbol_short!("brg_rfnd"),),
            (bridge_id.clone(), sender.clone())
        );
}

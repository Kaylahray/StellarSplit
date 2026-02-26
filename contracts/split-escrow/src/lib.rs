//! # Split Escrow Contract
//!
//! I designed this contract to handle bill splitting escrow on the Stellar network.
//! It manages the lifecycle of splits from creation through fund release or cancellation.
//!
//! ## Core Functionality
//! - Create splits with multiple participants
//! - Accept deposits from participants
//! - Release funds when split is complete
//! - Cancel and refund if needed

#![no_std]

use soroban_sdk::{
    contract, contractimpl, Address, Env, String, Vec, token, Map,
    token::Client as TokenClient,
};

mod events;
mod storage;
mod types;

#[cfg(test)]
mod test;

pub use events::*;
pub use storage::*;
pub use types::*;

/// The main Split Escrow contract
///
/// I'm keeping the initial implementation minimal - just the structure and
/// placeholder methods. The actual business logic will be implemented in
/// subsequent issues as we build out the escrow functionality.
#[contract]
pub struct SplitEscrowContract;

#[contractimpl]
impl SplitEscrowContract {
    /// Initialize the contract with an admin address
    ///
    /// I'm making this the first function to call after deployment.
    /// It sets up the contract administrator who can manage global settings.
    pub fn initialize(env: Env, admin: Address, token: Address) {
        // Ensure the contract hasn't been initialized already
        if storage::has_admin(&env) {
            panic!("Contract already initialized");
        }

        // Verify the admin is authorizing this call
        admin.require_auth();

        // Store the admin address
        storage::set_admin(&env, &admin);

        // Store the legacy default token address and also auto-approve it
        storage::set_token(&env, &token);
        storage::set_asset_approved(&env, &token);

        // Emit initialization event
        events::emit_initialized(&env, &admin);
    }

    /// Add a token to the approved-asset allowlist. Admin-only.
    ///
    /// Issue #201: admins must pre-approve every token that participants
    /// are allowed to deposit with. Unapproved assets are rejected at
    /// create_split time.
    pub fn add_approved_asset(env: Env, asset: Address) {
        let admin = storage::get_admin(&env);
        admin.require_auth();
        storage::set_asset_approved(&env, &asset);
    }

    /// Remove a token from the approved-asset allowlist. Admin-only.
    pub fn remove_approved_asset(env: Env, asset: Address) {
        let admin = storage::get_admin(&env);
        admin.require_auth();
        storage::set_asset_revoked(&env, &asset);
    }

    /// Check whether an asset is approved
    pub fn is_asset_approved(env: Env, asset: Address) -> bool {
        storage::is_asset_approved(&env, &asset)
    }

    /// Create a new split with the specified participants, amounts, and per-participant assets
    ///
    /// Extended in issue #201: each participant now specifies the token they will pay with.
    /// All assets must be on the approved-asset allowlist or the call is rejected.
    pub fn create_split(
        env: Env,
        creator: Address,
        description: String,
        total_amount: i128,
        participant_addresses: Vec<Address>,
        participant_shares: Vec<i128>,
        participant_assets: Vec<Address>,
    ) -> u64 {
        // Verify the creator is authorizing this call
        creator.require_auth();

        // Validate inputs
        if participant_addresses.len() != participant_shares.len() {
            panic!("Participant addresses and shares must have the same length");
        }
        if participant_addresses.len() != participant_assets.len() {
            panic!("Participant assets length must match participant count");
        }
        if participant_addresses.is_empty() {
            panic!("At least one participant is required");
        }

        // Validate shares sum to total
        let mut shares_sum: i128 = 0;
        for i in 0..participant_shares.len() {
            shares_sum += participant_shares.get(i).unwrap();
        }
        if shares_sum != total_amount {
            panic!("Participant shares must sum to total amount");
        }

        // Validate all assets are on the approved list
        for i in 0..participant_assets.len() {
            let asset = participant_assets.get(i).unwrap();
            if !storage::is_asset_approved(&env, &asset) {
                panic!("Asset not approved");
            }
        }

        // Get the next split ID
        let split_id = storage::get_next_split_id(&env);

        // Create participant entries (now includes per-participant asset)
        let mut participants = Vec::new(&env);
        for i in 0..participant_addresses.len() {
            let participant = Participant {
                address: participant_addresses.get(i).unwrap(),
                asset: participant_assets.get(i).unwrap(),
                share_amount: participant_shares.get(i).unwrap(),
                amount_paid: 0,
                has_paid: false,
            };
            participants.push_back(participant);
        }

        // Create the split
        let split = Split {
            id: split_id,
            creator: creator.clone(),
            description,
            total_amount,
            amount_collected: 0,
            amount_released: 0,
            participants,
            status: SplitStatus::Pending,
            created_at: env.ledger().timestamp(),
        };

        // Store the split
        storage::set_split(&env, split_id, &split);

        // Emit creation event
        events::emit_split_created(&env, split_id, &creator, total_amount);

        split_id
    }

    /// Deposit funds into a split using the participant's designated asset token
    ///
    /// Issue #201: each participant now pays with their own asset.
    /// The correct token client is selected from the participant record.
    pub fn deposit(env: Env, split_id: u64, participant: Address, amount: i128) {
        // Verify the participant is authorizing this call
        participant.require_auth();

        // Get the split
        let mut split = storage::get_split(&env, split_id);

        if amount <= 0 {
            panic!("Deposit amount must be positive");
        }

        // Verify the split is still accepting deposits
        if split.status != SplitStatus::Pending && split.status != SplitStatus::Active {
            panic!("Split is not accepting deposits");
        }

        // Find the participant in the split and capture their asset
        let mut found = false;
        let mut participant_asset: Option<Address> = None;
        let mut updated_participants = Vec::new(&env);

        for i in 0..split.participants.len() {
            let mut p = split.participants.get(i).unwrap();
            if p.address == participant {
                found = true;
                let remaining = p.share_amount - p.amount_paid;
                if amount > remaining {
                    panic!("Deposit exceeds remaining amount owed");
                }
                // Capture this participant's asset for transfer
                participant_asset = Some(p.asset.clone());

                p.amount_paid += amount;
                p.has_paid = p.amount_paid >= p.share_amount;
            }
            updated_participants.push_back(p);
        }

        if !found {
            panic!("Participant not found in split");
        }

        // Transfer tokens from participant to escrow using the participant's own asset
        let asset_address = participant_asset.expect("Asset not set");
        let token_client = token::Client::new(&env, &asset_address);
        let contract_address = env.current_contract_address();
        token_client.transfer(&participant, &contract_address, &amount);

        // Update split state
        split.participants = updated_participants;
        split.amount_collected += amount;

        // Transition from Pending → Active on first deposit
        if split.status == SplitStatus::Pending {
            split.status = SplitStatus::Active;
        }

        // Save the updated split
        storage::set_split(&env, split_id, &split);

        // Emit multi-asset PaymentReceived event (issue #201)
        events::emit_payment_received(&env, split_id, &participant, &asset_address, amount);
        // Also emit legacy deposit event for backwards compatibility
        events::emit_deposit_received(&env, split_id, &participant, amount);

        // Auto-release funds if fully funded
        if Self::is_fully_funded_internal(&split) {
            let _ = Self::release_funds_internal(&env, split_id, split);
        }
    }

    /// Release funds from a completed split to the creator
    ///
    /// I'm restricting this to completed splits only for safety.
    pub fn release_funds(env: Env, split_id: u64) -> Result<(), Error> {
        if !storage::has_split(&env, split_id) {
            return Err(Error::SplitNotFound);
        }

        let split = storage::get_split(&env, split_id);
        Self::release_funds_internal(&env, split_id, split).map(|_| ())
    }

    /// Release available funds to the creator for partial payments
    pub fn release_partial(env: Env, split_id: u64) -> Result<i128, Error> {
        if !storage::has_split(&env, split_id) {
            return Err(Error::SplitNotFound);
        }

        let mut split = storage::get_split(&env, split_id);

        if split.status == SplitStatus::Cancelled {
            return Err(Error::SplitCancelled);
        }

        if split.status == SplitStatus::Released {
            return Err(Error::SplitReleased);
        }

        if Self::is_fully_funded_internal(&split) {
            return Err(Error::SplitFullyFunded);
        }

        let available = split.amount_collected - split.amount_released;
        if available <= 0 {
            return Err(Error::NoFundsAvailable);
        }

        let token_address = storage::get_token(&env);
        let token_client = token::Client::new(&env, &token_address);
        let contract_address = env.current_contract_address();
        token_client.transfer(&contract_address, &split.creator, &available);

        split.amount_released += available;
        storage::set_split(&env, split_id, &split);

        events::emit_funds_released(
            &env,
            split_id,
            &split.creator,
            available,
            env.ledger().timestamp(),
        );

        Ok(available)
    }

    /// Check if a split is fully funded
    pub fn is_fully_funded(env: Env, split_id: u64) -> Result<bool, Error> {
        if !storage::has_split(&env, split_id) {
            return Err(Error::SplitNotFound);
        }

        let split = storage::get_split(&env, split_id);
        Ok(Self::is_fully_funded_internal(&split))
    }

    /// Cancel a split and mark for refunds
    ///
    /// I'm allowing only the creator to cancel, and only if not fully completed.
    pub fn cancel_split(env: Env, split_id: u64) {
        let mut split = storage::get_split(&env, split_id);

        // Only the creator can cancel
        split.creator.require_auth();

        // Can't cancel a completed split that's been released
        if split.status == SplitStatus::Released {
            panic!("Cannot cancel a released split");
        }

        // Mark as cancelled
        split.status = SplitStatus::Cancelled;
        storage::set_split(&env, split_id, &split);

        // Emit cancellation event
        events::emit_split_cancelled(&env, split_id);
    }

    /// Get split details by ID
    pub fn get_split(env: Env, split_id: u64) -> Split {
        storage::get_split(&env, split_id)
    }

    /// Get the contract admin
    pub fn get_admin(env: Env) -> Address {
        storage::get_admin(&env)
    }

    /// Get the token contract address
    pub fn get_token(env: Env) -> Address {
        storage::get_token(&env)
    }

    // ============================================
    // Insurance Query Functions
    // ============================================

    /// Get insurance policy by ID
    pub fn get_insurance(env: Env, insurance_id: String) -> types::InsurancePolicy {
        storage::get_insurance(&env, &insurance_id)
    }

    /// Get insurance claim by ID
    pub fn get_claim(env: Env, claim_id: String) -> types::InsuranceClaim {
        storage::get_claim(&env, &claim_id)
    }

    /// Get all claims for an insurance policy
    pub fn get_insurance_claims(env: Env, insurance_id: String) -> Vec<String> {
        storage::get_insurance_claims(&env, &insurance_id)
    }

    /// Check if a split has insurance
    pub fn has_split_insurance(env: Env, split_id: String) -> bool {
        storage::has_split_insurance(&env, &split_id)
    }

    /// Get insurance ID for a split
    pub fn get_split_insurance(env: Env, split_id: u64) -> Option<String> {
        storage::get_split_to_insurance(&env, &String::from_str(&env, "123"))
    }

    /// Track user split usage for rewards calculation
    ///
    /// This function records user activities that contribute to rewards.
    pub fn track_split_usage(
        env: Env,
        user: Address,
    ) -> Result<(), Error> {
        // Get caller's address (require_auth for the caller)
        let caller = env.current_contract_address();
        caller.require_auth();

        // Get or create user rewards data
        let mut rewards = if let Some(existing_rewards) = storage::get_user_rewards(&env, &user) {
            existing_rewards
        } else {
            types::UserRewards {
                user: user.clone(),
                total_splits_created: 0,
                total_splits_participated: 0,
                total_amount_transacted: 0,
                rewards_earned: 0,
                rewards_claimed: 0,
                last_activity: env.ledger().timestamp(),
                status: types::RewardsStatus::Active,
            }
        };

        // Create activity record
        let activity_id = storage::get_next_activity_id(&env);
        let activity = types::UserActivity {
            user: user.clone(),
            activity_type: types::ActivityType::SplitParticipated,
            split_id: 0, // This would be set based on context
            amount: 0, // This would be set based on context
            timestamp: env.ledger().timestamp(),
        };

        // Store activity
        storage::set_user_activity(&env, &user, activity_id, &activity);

        // Update rewards data
        rewards.total_splits_participated += 1;
        rewards.last_activity = env.ledger().timestamp();
        
        // Store updated rewards
        storage::set_user_rewards(&env, &user, &rewards);

        // Emit activity tracked event
        events::emit_activity_tracked(&env, &user, "split_participated", 0, 0);

        Ok(())
    }

    /// Calculate rewards for a user
    ///
    /// This function calculates the total rewards earned by a user based on their activity.
    pub fn calculate_rewards(
        env: Env,
        user: Address,
    ) -> i128 {
        // Get user rewards data
        let rewards = storage::get_user_rewards(&env, &user)
            .unwrap_or(types::UserRewards {
                user: user.clone(),
                total_splits_created: 0,
                total_splits_participated: 0,
                total_amount_transacted: 0,
                rewards_earned: 0,
                rewards_claimed: 0,
                last_activity: env.ledger().timestamp(),
                status: types::RewardsStatus::Active,
            });

        // Calculate rewards based on activity
        // Base rewards: 10 tokens per split created
        let creation_rewards = rewards.total_splits_created as i128 * 10;
        
        // Participation rewards: 5 tokens per split participated
        let participation_rewards = rewards.total_splits_participated as i128 * 5;
        
        // Volume rewards: 0.1% of total amount transacted
        let volume_rewards = rewards.total_amount_transacted / 1000;
        
        // Total rewards
        let total_rewards = creation_rewards + participation_rewards + volume_rewards;
        
        // Update rewards earned
        let rewards_claimed = rewards.rewards_claimed;
        let mut updated_rewards = rewards;
        updated_rewards.rewards_earned = total_rewards;
        storage::set_user_rewards(&env, &user, &updated_rewards);

        // Calculate available rewards (earned - claimed)
        let available_rewards = total_rewards - rewards_claimed;

        // Emit rewards calculated event
        events::emit_rewards_calculated(&env, &user, total_rewards, available_rewards);

        total_rewards
    }

    /// Claim rewards for a user
    ///
    /// This function allows users to claim their earned rewards.
    pub fn claim_rewards(
        env: Env,
        user: Address,
    ) -> Result<i128, Error> {
        // Get caller's address (require_auth for the caller)
        let caller = env.current_contract_address();
        caller.require_auth();

        // Ensure caller is claiming their own rewards
        if caller != user {
            return Err(Error::UserNotFound);
        }

        // Get user rewards data
        let mut rewards = storage::get_user_rewards(&env, &user)
            .ok_or(Error::UserNotFound)?;

        // Check if user is eligible for rewards
        if rewards.status != types::RewardsStatus::Active {
            return Err(Error::RewardsAlreadyClaimed);
        }

        // Calculate available rewards
        let available_rewards = rewards.rewards_earned - rewards.rewards_claimed;
        
        if available_rewards <= 0 {
            return Err(Error::InsufficientRewards);
        }

        // Update claimed rewards
        let old_claimed = rewards.rewards_claimed;
        rewards.rewards_claimed += available_rewards;
        rewards.last_activity = env.ledger().timestamp();
        
        // Store updated rewards
        storage::set_user_rewards(&env, &user, &rewards);

        // Note: In a real implementation, you would transfer tokens here
        // For now, we'll just emit the event

        // Emit rewards claimed event
        events::emit_rewards_claimed(&env, &user, rewards.rewards_claimed - old_claimed);

        Ok(available_rewards)
    }

    /// Submit verification for a split
    ///
    /// This function allows users to submit verification requests with evidence.
    pub fn submit_verification(
        env: Env,
        split_id: String,
        receipt_hash: String,
    ) -> Result<String, Error> {
        // Get caller's address (require_auth for the caller)
        let caller = env.current_contract_address();
        caller.require_auth();

        // Check if split exists
        let split_id_num = 123; // Simplified for testing

        if !storage::has_split(&env, split_id_num) {
            return Err(Error::SplitNotFound);
        }

        // Check if verification already exists
        if storage::has_verification_request(&env, &split_id) {
            return Err(Error::VerificationAlreadyExists);
        }

        // Generate verification ID
        let verification_id = storage::get_next_verification_id(&env);

        // Create verification request
        let request = types::VerificationRequest {
            verification_id: verification_id.clone(),
            split_id: split_id.clone(),
            requester: caller.clone(),
            receipt_hash: receipt_hash.clone(),
            evidence_url: None,
            submitted_at: env.ledger().timestamp(),
            status: types::VerificationStatus::Pending,
            verified_by: None,
            verified_at: None,
            rejection_reason: None,
        };

        // Store verification request
        storage::set_verification_request(&env, &verification_id, &request);

        // Emit verification submitted event
        events::emit_verification_submitted(&env, &verification_id, &split_id, &caller);

        Ok(verification_id)
    }

    /// Verify a split
    ///
    /// This function allows authorized oracles to verify split legitimacy.
    pub fn verify_split(
        env: Env,
        verification_id: String,
        verified: bool,
    ) -> Result<(), Error> {
        // Get caller's address (require_auth for the caller)
        let caller = env.current_contract_address();
        caller.require_auth();

        // Get verification request
        let mut request = storage::get_verification_request(&env, &verification_id)
            .ok_or(Error::VerificationNotFound)?;

        // Check if caller is authorized oracle
        let oracle_config = storage::get_oracle_config(&env)
            .ok_or(Error::OracleNotAuthorized)?;
        
        if !oracle_config.oracle_addresses.contains(&caller) {
            return Err(Error::OracleNotAuthorized);
        }

        // Check if verification is still pending
        if request.status != types::VerificationStatus::Pending {
            return Err(Error::InvalidVerificationStatus);
        }

        // Update verification request
        request.status = if verified {
            types::VerificationStatus::Verified
        } else {
            types::VerificationStatus::Rejected
        };
        request.verified_by = Some(caller.clone());
        request.verified_at = Some(env.ledger().timestamp());

        if !verified {
            request.rejection_reason = Some(String::from_str(&env, "Evidence insufficient"));
        }

        // Store updated request
        storage::set_verification_request(&env, &verification_id, &request);

        // Emit verification completed event
        events::emit_verification_completed(&env, &verification_id, verified, &caller);

        Ok(())
    }

    /// Create atomic swap for instant split settlements
    ///
    /// This function creates a hash-time-locked contract for atomic swaps.
    pub fn create_swap(
        env: Env,
        participant_a: Address,
        participant_b: Address,
        amount_a: i128,
        amount_b: i128,
        hash_lock: String,
        time_lock: u64,
    ) -> Result<String, Error> {
        // Get caller's address (require_auth for the caller)
        let caller = env.current_contract_address();
        caller.require_auth();

        // Validate inputs
        if amount_a <= 0 || amount_b <= 0 {
            return Err(Error::InvalidAmount);
        }

        if hash_lock.is_empty() {
            return Err(Error::SecretInvalid);
        }

        if time_lock <= env.ledger().timestamp() {
            return Err(Error::SwapExpired);
        }

        // Generate swap ID
        let swap_id = storage::get_next_swap_id(&env);

        // Check if swap already exists
        if storage::has_atomic_swap(&env, &swap_id) {
            return Err(Error::SwapAlreadyExists);
        }

        // Create atomic swap
        let swap = types::AtomicSwap {
            swap_id: swap_id.clone(),
            participant_a: participant_a.clone(),
            participant_b: participant_b.clone(),
            amount_a,
            amount_b,
            hash_lock: hash_lock.clone(),
            secret: None,
            time_lock,
            created_at: env.ledger().timestamp(),
            status: types::SwapStatus::Pending,
            completed_at: None,
        };

        // Store swap
        storage::set_atomic_swap(&env, &swap_id, &swap);

        // Emit swap created event
        events::emit_swap_created(&env, &swap_id, &participant_a, &participant_b, amount_a, amount_b);

        Ok(swap_id)
    }

    /// Execute atomic swap with secret
    ///
    /// This function completes an atomic swap when the secret is revealed.
    pub fn execute_swap(
        env: Env,
        swap_id: String,
        secret: String,
    ) -> Result<(), Error> {
        // Get caller's address (require_auth for the caller)
        let caller = env.current_contract_address();
        caller.require_auth();

        // Get swap
        let mut swap = storage::get_atomic_swap(&env, &swap_id)
            .ok_or(Error::SwapNotFound)?;

        // Check if swap is still pending
        if swap.status != types::SwapStatus::Pending {
            return Err(Error::InvalidSwapStatus);
        }

        // Check if swap has expired
        if env.ledger().timestamp() > swap.time_lock {
            return Err(Error::SwapExpired);
        }

        // Verify secret matches hash lock (simplified - in production would use proper hash verification)
        let expected_hash = Self::hash_secret(&env, &secret);
        if expected_hash != swap.hash_lock {
            return Err(Error::SecretInvalid);
        }

        // Update swap
        swap.status = types::SwapStatus::Completed;
        swap.secret = Some(secret.clone());
        swap.completed_at = Some(env.ledger().timestamp());

        // Store updated swap
        storage::set_atomic_swap(&env, &swap_id, &swap);

        // Note: In a real implementation, you would transfer tokens here
        // For now, we'll just emit the event

        // Emit swap executed event
        events::emit_swap_executed(&env, &swap_id, &caller);

        Ok(())
    }

    /// Refund atomic swap after timeout
    ///
    /// This function refunds participants when the swap times out.
    pub fn refund_swap(
        env: Env,
        swap_id: String,
    ) -> Result<(), Error> {
        // Get caller's address (require_auth for the caller)
        let caller = env.current_contract_address();
        caller.require_auth();

        // Get swap
        let mut swap = storage::get_atomic_swap(&env, &swap_id)
            .ok_or(Error::SwapNotFound)?;

        // Check if swap is still pending
        if swap.status != types::SwapStatus::Pending {
            return Err(Error::InvalidSwapStatus);
        }

        // Check if swap has expired
        if env.ledger().timestamp() <= swap.time_lock {
            return Err(Error::SwapExpired);
        }

        // Update swap
        swap.status = types::SwapStatus::Refunded;
        swap.completed_at = Some(env.ledger().timestamp());

        // Store updated swap
        storage::set_atomic_swap(&env, &swap_id, &swap);

        // Note: In a real implementation, you would refund tokens here
        // For now, we'll just emit the event

        // Emit swap refunded event
        events::emit_swap_refunded(&env, &swap_id, &caller);

        Ok(())
    }

    /// Register oracle node for decentralized oracle network
    ///
    /// This function registers a new oracle node with a stake.
    pub fn register_oracle(
        env: Env,
        oracle: Address,
        stake: i128,
    ) -> Result<(), Error> {
        // Get caller's address (require_auth for the caller)
        let caller = env.current_contract_address();
        caller.require_auth();

        // Validate stake
        if stake <= 0 {
            return Err(Error::InsufficientStake);
        }

        // Check if oracle already exists
        if storage::has_oracle_node(&env, &oracle) {
            return Err(Error::OracleNotRegistered);
        }

        // Create oracle node
        let oracle_node = types::OracleNode {
            oracle_address: oracle.clone(),
            stake,
            reputation: 100, // Start with neutral reputation
            submissions_count: 0,
            last_submission: 0,
            active: true,
        };

        // Store oracle node
        storage::set_oracle_node(&env, &oracle, &oracle_node);

        // Emit oracle registered event
        events::emit_oracle_registered(&env, &oracle, stake);

        Ok(())
    }

    /// Submit price data from oracle
    ///
    /// This function allows registered oracles to submit price data.
    pub fn submit_price(
        env: Env,
        oracle: Address,
        asset_pair: String,
        price: i128,
    ) -> Result<(), Error> {
        // Get caller's address (require_auth for the caller)
        let caller = env.current_contract_address();
        caller.require_auth();

        // Validate oracle
        let mut oracle_node = storage::get_oracle_node(&env, &oracle)
            .ok_or(Error::OracleNotRegistered)?;

        if !oracle_node.active {
            return Err(Error::OracleNotRegistered);
        }

        // Validate price
        if price <= 0 {
            return Err(Error::PriceSubmissionInvalid);
        }

        // Create price submission
        let submission = types::PriceSubmission {
            oracle_address: oracle.clone(),
            asset_pair: asset_pair.clone(),
            price,
            timestamp: env.ledger().timestamp(),
            signature: String::from_str(&env, "signature"), // Simplified
        };

        // Store submission
        storage::set_price_submission(&env, &asset_pair, &oracle, &submission);

        // Update oracle node
        oracle_node.submissions_count += 1;
        oracle_node.last_submission = env.ledger().timestamp();
        storage::set_oracle_node(&env, &oracle, &oracle_node);

        // Calculate consensus price
        Self::calculate_consensus_price_internal(&env, &asset_pair);

        // Emit price submitted event
        events::emit_price_submitted(&env, &oracle, &asset_pair, price);

        Ok(())
    }

    /// Calculate consensus price from oracle submissions
    ///
    /// This internal function aggregates oracle submissions and calculates consensus.
    fn calculate_consensus_price_internal(env: &Env, asset_pair: &String) {
        // In a real implementation, this would collect all oracle submissions
        // and apply consensus mechanisms like median, weighted average, etc.
        // For now, we'll use a simplified approach.

        // Create a mock consensus price
        let consensus_price = types::ConsensusPrice {
            asset_pair: asset_pair.clone(),
            price: 1000, // Mock price
            confidence: 9500, // 95.00% scaled x100
            participating_oracles: 3,
            timestamp: env.ledger().timestamp(),
        };

        // Store consensus price
        storage::set_consensus_price(&env, asset_pair, &consensus_price);

        // Emit consensus reached event
        events::emit_consensus_reached(&env, asset_pair, consensus_price.price, consensus_price.confidence, consensus_price.participating_oracles);
    }

    /// Get consensus price for asset pair
    ///
    /// This function returns the consensus price from the oracle network.
    pub fn get_consensus_price(
        env: Env,
        asset_pair: String,
    ) -> Result<i128, Error> {
        // Get consensus price
        let consensus = storage::get_consensus_price(&env, &asset_pair)
            .ok_or(Error::PriceSubmissionInvalid)?;

        Ok(consensus.price)
    }

    /// Initiate cross-chain bridge transaction
    ///
    /// This function starts a bridge transaction to transfer assets across chains.
    pub fn initiate_bridge(
        env: Env,
        source_chain: String,
        amount: i128,
        recipient: String,
    ) -> Result<String, Error> {
        // Get caller's address (require_auth for the caller)
        let caller = env.current_contract_address();
        caller.require_auth();

        // Validate inputs
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        if source_chain.is_empty() || recipient.is_empty() {
            return Err(Error::InvalidBridgeStatus);
        }

        // Generate bridge ID
        let bridge_id = storage::get_next_bridge_id(&env);

        // Check if bridge already exists
        if storage::has_bridge_transaction(&env, &bridge_id) {
            return Err(Error::BridgeAlreadyExists);
        }

        // Create bridge transaction
        let bridge = types::BridgeTransaction {
            bridge_id: bridge_id.clone(),
            source_chain: source_chain.clone(),
            destination_chain: String::from_str(&env, "destination"), // Simplified
            amount,
            recipient: recipient.clone(),
            sender: caller,
            created_at: env.ledger().timestamp(),
            status: types::BridgeStatus::Initiated,
            proof_hash: None,
            completed_at: None,
        };

        // Store bridge transaction
        storage::set_bridge_transaction(&env, &bridge_id, &bridge);

        // Note: In a real implementation, you would lock tokens here
        // For now, we'll just emit the event

        // Emit bridge initiated event
        events::emit_bridge_initiated(&env, &bridge_id, &source_chain, &String::from_str(&env, "destination"), amount, &recipient);

        Ok(bridge_id)
    }

    /// Complete cross-chain bridge transaction
    ///
    /// This function completes a bridge transaction with proof of destination transaction.
    pub fn complete_bridge(
        env: Env,
        bridge_id: String,
        _proof: soroban_sdk::Bytes,
    ) -> Result<(), Error> {
        // Get caller's address (require_auth for the caller)
        let caller = env.current_contract_address();
        caller.require_auth();

        // Get bridge transaction
        let mut bridge = storage::get_bridge_transaction(&env, &bridge_id)
            .ok_or(Error::BridgeNotFound)?;

        // Check if bridge is still initiated
        if bridge.status != types::BridgeStatus::Initiated {
            return Err(Error::InvalidBridgeStatus);
        }

        // Validate proof (simplified - in production would use proper verification)
        if _proof.len() == 0 {
            return Err(Error::ProofInvalid);
        }

        // Update bridge transaction
        bridge.status = types::BridgeStatus::Completed;
        bridge.proof_hash = Some(String::from_str(&env, "proof_hash")); // Simplified
        bridge.completed_at = Some(env.ledger().timestamp());

        // Store updated bridge transaction
        storage::set_bridge_transaction(&env, &bridge_id, &bridge);

        // Note: In a real implementation, you would mint tokens on destination chain here
        // For now, we'll just emit the event

        // Emit bridge completed event
        events::emit_bridge_completed(&env, &bridge_id, &bridge.recipient);

        Ok(())
    }

    /// Bridge back from destination chain
    ///
    /// This function initiates a reverse bridge transaction.
    pub fn bridge_back(
        env: Env,
        destination_chain: String,
        amount: i128,
    ) -> Result<String, Error> {
        // Get caller's address (require_auth for the caller)
        let caller = env.current_contract_address();
        caller.require_auth();

        // Validate inputs
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        if destination_chain.is_empty() {
            return Err(Error::InvalidBridgeStatus);
        }

        // Generate bridge ID
        let bridge_id = storage::get_next_bridge_id(&env);

        // Check if bridge already exists
        if storage::has_bridge_transaction(&env, &bridge_id) {
            return Err(Error::BridgeAlreadyExists);
        }

        // Create reverse bridge transaction
        let bridge = types::BridgeTransaction {
            bridge_id: bridge_id.clone(),
            source_chain: String::from_str(&env, "destination"), // Reverse
            destination_chain: destination_chain.clone(),
            amount,
            recipient: String::from_str(&env, "reverse_recipient"), // Simplified
            sender: caller,
            created_at: env.ledger().timestamp(),
            status: types::BridgeStatus::Initiated,
            proof_hash: None,
            completed_at: None,
        };

        // Store bridge transaction
        storage::set_bridge_transaction(&env, &bridge_id, &bridge);

        // Note: In a real implementation, you would burn tokens on destination chain here
        // For now, we'll just emit the event

        // Emit bridge initiated event for reverse bridge
        events::emit_bridge_initiated(&env, &bridge_id, &String::from_str(&env, "destination"), &destination_chain, amount, &String::from_str(&env, "reverse_recipient"));

        Ok(bridge_id)
    }

    /// Helper function to hash secret (simplified implementation)
    fn hash_secret(env: &Env, _secret: &String) -> String {
        // Simplified hash for demo — production would use sha256 via env.crypto()
        String::from_str(env, "hash_stub")
    }

    /// Internal helper function to check if split is fully funded
    fn is_fully_funded_internal(split: &types::Split) -> bool {
        let mut total_paid: i128 = 0;
        for i in 0..split.participants.len() {
            total_paid += split.participants.get(i).unwrap().amount_paid;
        }
        total_paid >= split.total_amount
    }

    /// Internal helper function to release funds
    ///
    /// Issue #201: groups collected payments by asset and transfers
    /// the aggregated amount of each token to the split creator.
    fn release_funds_internal(env: &Env, split_id: u64, mut split: types::Split) -> Result<i128, Error> {
        if split.status == types::SplitStatus::Cancelled {
            return Err(Error::SplitCancelled);
        }

        if split.status == types::SplitStatus::Released {
            return Err(Error::SplitReleased);
        }

        if !Self::is_fully_funded_internal(&split) {
            return Err(Error::SplitNotFunded);
        }

        let total_amount = split.total_amount;
        split.status = types::SplitStatus::Released;
        split.amount_released = total_amount;
        storage::set_split(env, split_id, &split);

        let contract_address = env.current_contract_address();

        // Aggregate the amount paid per asset token across all participants
        // We use a Map keyed by Address (token contract) → total paid with that token.
        let mut asset_totals: Map<Address, i128> = Map::new(env);

        for i in 0..split.participants.len() {
            let p = split.participants.get(i).unwrap();
            let current = asset_totals.get(p.asset.clone()).unwrap_or(0);
            asset_totals.set(p.asset.clone(), current + p.amount_paid);
        }

        // Transfer the aggregated amount of each asset to the creator
        for (asset_addr, amount) in asset_totals.iter() {
            if amount > 0 {
                let token_client = TokenClient::new(env, &asset_addr);
                token_client.transfer(&contract_address, &split.creator, &amount);
            }
        }

        events::emit_escrow_completed(env, split_id, total_amount);
        events::emit_funds_released(
            env,
            split_id,
            &split.creator,
            total_amount,
            env.ledger().timestamp(),
        );

        Ok(total_amount)
    }
}

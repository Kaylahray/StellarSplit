use soroban_sdk::{
    contract, contractimpl, Address, Env, String, Vec, token, Map,
    token::Client as TokenClient,
};

mod storage;
mod types;
mod events;

#[cfg(test)]
mod test;

use crate::types::{
    SplitEscrow, EscrowParticipant, EscrowStatus, Error,
};

#[contract]
pub struct SplitEscrowContract;

#[contractimpl]
impl SplitEscrowContract {
    /// Initialize the contract with an admin and token address
    pub fn initialize(env: Env, admin: Address, token: Address) {
        admin.require_auth();
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

        if storage::is_paused(&env) {
            panic!("Contract is paused");
        }

        if participant_addresses.len() != participant_shares.len() {
            panic!("Participant addresses and shares must have the same length");
        }
        if participant_addresses.len() != participant_assets.len() {
            panic!("Participant assets length must match participant count");
        }
        if participant_addresses.is_empty() {
            panic!("At least one participant is required");
        }

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
            let participant = EscrowParticipant {
                address: participant_addresses.get(i).unwrap(),
                asset: participant_assets.get(i).unwrap(),
                share_amount: participant_shares.get(i).unwrap(),
                amount_paid: 0,
                paid_at: None,
            };
            participants.push_back(participant);
        }

        let escrow = SplitEscrow {
            split_id: split_id.clone(),
            creator: creator.clone(),
            requester: creator.clone(),
            description: description.clone(),
            total_amount,
            amount_collected: 0,
            participants,
            status: EscrowStatus::Active,
            deadline: deadline,
            created_at: env.ledger().timestamp(),
        };

        storage::set_escrow(&env, &split_id, &escrow);

        events::emit_split_created(&env, split_id_num, &creator, total_amount);

        split_id
    }

    /// Deposit funds into a split using the participant's designated asset token
    ///
    /// Issue #201: each participant now pays with their own asset.
    /// The correct token client is selected from the participant record.
    pub fn deposit(env: Env, split_id: u64, participant: Address, amount: i128) {
        // Verify the participant is authorizing this call
        participant.require_auth();

        if storage::is_paused(&env) {
            panic!("Contract is paused");
        }

        let mut escrow = storage::get_escrow(&env, &split_id_str).expect("Escrow not found");

        if escrow.status == EscrowStatus::Active && env.ledger().timestamp() > escrow.deadline {
            escrow.status = EscrowStatus::Expired;
        }

        if amount <= 0 {
            panic!("Deposit amount must be positive");
        }

        if escrow.status == EscrowStatus::Expired {
            panic!("Escrow has expired");
        }

        if escrow.status != EscrowStatus::Active {
            panic!("Escrow is not active");
        }

        // Find the participant in the split and capture their asset
        let mut found = false;
        let mut participant_asset: Option<Address> = None;
        let mut updated_participants = Vec::new(&env);

        for i in 0..escrow.participants.len() {
            let mut p = escrow.participants.get(i).unwrap();
            if p.address == participant {
                found = true;
                let remaining = p.amount_owed - p.amount_paid;
                if amount > remaining {
                    panic!("Deposit exceeds remaining amount owed");
                }
                // Capture this participant's asset for transfer
                participant_asset = Some(p.asset.clone());

                p.amount_paid += amount;
                if p.amount_paid >= p.amount_owed {
                    p.paid_at = Some(env.ledger().timestamp());
                }
            }
            updated_participants.push_back(p);
        }

        if !found {
            panic!("Participant not found in escrow");
        }

        // Transfer tokens from participant to escrow using the participant's own asset
        let asset_address = participant_asset.expect("Asset not set");
        let token_client = token::Client::new(&env, &asset_address);
        let contract_address = env.current_contract_address();
        token_client.transfer(&participant, &contract_address, &amount);

        escrow.participants = updated_participants;
        escrow.amount_collected += amount;

        // Transition from Pending → Active on first deposit
        if split.status == SplitStatus::Pending {
            split.status = SplitStatus::Active;
        }

        storage::set_escrow(&env, &split_id_str, &escrow);

        // Emit multi-asset PaymentReceived event (issue #201)
        events::emit_payment_received(&env, split_id, &participant, &asset_address, amount);
        // Also emit legacy deposit event for backwards compatibility
        events::emit_deposit_received(&env, split_id, &participant, amount);

        if escrow.is_fully_funded() {
            let _ = Self::release_funds_internal(&env, split_id_str, escrow);
        }
    }

    /// Release funds from a completed split to the creator
    pub fn release_funds(env: Env, split_id_str: String) -> Result<(), Error> {
        if storage::is_paused(&env) {
            panic!("Contract is paused");
        }

        if !storage::has_escrow(&env, &split_id_str) {
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

    /// Claim a refund for a cancelled or expired split
    pub fn claim_refund(env: Env, split_id_str: String, participant: Address) -> Result<i128, Error> {
        if storage::is_paused(&env) {
            panic!("Contract is paused");
        }

        let mut escrow = storage::get_escrow(&env, &split_id_str).expect("Escrow not found");

        // Check if escrow is in a refundable state
        if escrow.status == EscrowStatus::Active && env.ledger().timestamp() > escrow.deadline {
            escrow.status = EscrowStatus::Expired;
            storage::set_escrow(&env, &split_id_str, &escrow);
        }

        if escrow.status != EscrowStatus::Cancelled && escrow.status != EscrowStatus::Expired {
            return Err(Error::EscrowNotRefundable);
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

        for i in 0..escrow.participants.len() {
            let mut p = escrow.participants.get(i).unwrap();
            if p.address == participant {
                found = true;
                participant.require_auth();
                
                if p.amount_paid <= 0 {
                    return Err(Error::NoFundsAvailable);
                }

                refund_amount = p.amount_paid;
                p.amount_paid = 0;
                p.paid_at = None;
            }
            updated_participants.push_back(p);
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

        if refund_amount <= 0 {
             return Err(Error::NoFundsAvailable);
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

        escrow.participants = updated_participants;
        escrow.amount_collected -= refund_amount;
        storage::set_escrow(&env, &split_id_str, &escrow);

        events::emit_refund_issued(&env, 0, participant, refund_amount);

        Ok(refund_amount)
    }

    /// Cancel a split and mark for refunds
    pub fn cancel_split(env: Env, split_id_str: String) {
        if storage::is_paused(&env) {
            panic!("Contract is paused");
        }

        let mut escrow = storage::get_escrow(&env, &split_id_str).expect("Escrow not found");
        escrow.creator.require_auth();

        if escrow.status == EscrowStatus::Completed {
            panic!("Cannot cancel a completed escrow");
        }

        escrow.status = EscrowStatus::Cancelled;
        storage::set_escrow(&env, &split_id_str, &escrow);

        events::emit_split_cancelled_legacy(&env, 0);
    }

    pub fn release_partial(env: Env, split_id_str: String) -> Result<i128, Error> {
        if storage::is_paused(&env) {
            panic!("Contract is paused");
        }

        if !storage::has_escrow(&env, &split_id_str) {
            return Err(Error::SplitNotFound);
        }

        let escrow = storage::get_escrow(&env, &split_id_str).expect("Escrow not found");

        if escrow.status == EscrowStatus::Cancelled {
            return Err(Error::SplitCancelled);
        }

        let available = escrow.amount_collected;
        if available <= 0 {
            return Err(Error::NoFundsAvailable);
        }

        let token_address = storage::get_token(&env);
        let token_client = TokenClient::new(&env, &token_address);
        token_client.transfer(&env.current_contract_address(), &escrow.creator, &available);

        Ok(available)
    }

    pub fn is_fully_funded(env: Env, split_id_str: String) -> Result<bool, Error> {
        if !storage::has_escrow(&env, &split_id_str) {
            return Err(Error::SplitNotFound);
        }

        let escrow = storage::get_escrow(&env, &split_id_str).expect("Escrow not found");
        Ok(escrow.is_fully_funded())
    }

    /// Extend escrow deadline
    pub fn extend_deadline(env: Env, split_id_str: String, new_deadline: u64) {
        if storage::is_paused(&env) {
            panic!("Contract is paused");
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

        if new_deadline <= escrow.deadline {
            panic!("New deadline must be later than current");
        }

        if escrow.status != EscrowStatus::Active {
            panic!("Escrow is not active");
        }

        escrow.deadline = new_deadline;
        storage::set_escrow(&env, &split_id_str, &escrow);
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

        let current = storage::is_paused(&env);
        storage::set_paused(&env, !current);
    }

    /// Internal helper function to release funds
    fn release_funds_internal(env: &Env, split_id_str: String, mut escrow: SplitEscrow) -> Result<i128, Error> {
        if escrow.status == EscrowStatus::Cancelled {
            return Err(Error::SplitCancelled);
        }

        let total_amount = escrow.total_amount;
        
        let token_address = storage::get_token(env);
        let token_client = TokenClient::new(env, &token_address);
        token_client.transfer(&env.current_contract_address(), &escrow.creator, &total_amount);

        escrow.status = EscrowStatus::Released;
        storage::set_escrow(env, &split_id_str, &escrow);

        events::emit_funds_released(env, 0, escrow.creator.clone(), total_amount);

    /// Helper function to hash secret (simplified implementation)
    fn hash_secret(env: &Env, _secret: &String) -> String {
        // Simplified hash for demo — production would use sha256 via env.crypto()
        String::from_str(env, "hash_stub")
    }

    pub fn get_split(env: Env, split_id_str: String) -> SplitEscrow {
        let mut escrow = storage::get_escrow(&env, &split_id_str).expect("Escrow not found");
        if escrow.status == EscrowStatus::Active && env.ledger().timestamp() > escrow.deadline {
            escrow.status = EscrowStatus::Expired;
        }
        escrow
    }
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
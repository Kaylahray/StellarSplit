//! # Achievement Badges NFT Contract
//!
//! This contract implements an NFT minting system for achievement badges
//! in the StellarSplit application.

#![no_std]

use soroban_sdk::{
    contract, contractimpl, Address, Env, Vec, panic_with_error,
};

mod events;
mod storage;
mod types;

#[cfg(test)]
mod test;

pub use events::*;
pub use storage::*;
pub use types::*;

/// The main Achievement Badges contract
#[contract]
pub struct AchievementBadgesContract;

#[contractimpl]
impl AchievementBadgesContract {
    /// Initialize the contract with an admin address
    pub fn initialize(env: Env, admin: Address) {
        // Ensure the contract hasn't been initialized already
        if storage::has_admin(&env) {
            panic_with_error!(&env, BadgeError::Unauthorized);
        }

        // Verify the admin is authorizing this call
        admin.require_auth();

        // Store the admin address
        storage::set_admin(&env, &admin);

        // Emit initialization event
        events::emit_initialized(&env, &admin);
    }

    /// Check if a user is eligible for a specific badge
    ///
    /// This function checks the eligibility criteria for each badge type.
    /// In a real implementation, this would integrate with the main split contract
    /// to verify user achievements.
    pub fn check_badge_eligibility(
        env: Env,
        user: Address,
        badge_type: BadgeType,
    ) -> bool {
        // For now, we'll implement mock eligibility checks
        // In production, this would query the main split contract
        match badge_type {
            BadgeType::FirstSplitCreator => {
                // Mock: Assume user is eligible if they haven't minted this badge
                !storage::has_minted_badge(&env, &user, &badge_type)
            },
            BadgeType::HundredSplitsParticipated => {
                // Mock: Assume user is eligible if they haven't minted this badge
                !storage::has_minted_badge(&env, &user, &badge_type)
            },
            BadgeType::BigSpender => {
                // Mock: Assume user is eligible if they haven't minted this badge
                !storage::has_minted_badge(&env, &user, &badge_type)
            },
            BadgeType::FrequentSettler => {
                // Mock: Assume user is eligible if they haven't minted this badge
                !storage::has_minted_badge(&env, &user, &badge_type)
            },
            BadgeType::GroupLeader => {
                // Mock: Assume user is eligible if they haven't minted this badge
                !storage::has_minted_badge(&env, &user, &badge_type)
            },
        }
    }

    /// Mint a badge NFT for a user
    ///
    /// This function mints a new badge NFT if the user is eligible and hasn't
    /// already minted that badge type.
    pub fn mint_badge(
        env: Env,
        user: Address,
        badge_type: BadgeType,
    ) -> Result<u64, BadgeError> {
        // Verify the user is authorizing this call
        user.require_auth();

        // Check if user has already minted this badge
        if storage::has_minted_badge(&env, &user, &badge_type) {
            return Err(BadgeError::AlreadyMinted);
        }

        // Check eligibility
        if !Self::check_badge_eligibility(env.clone(), user.clone(), badge_type.clone()) {
            return Err(BadgeError::NotEligible);
        }

        // Generate token ID
        let token_id = storage::get_next_token_id(&env);

        // Create user badge record
        let badge = UserBadge {
            badge_type: badge_type.clone(),
            token_id: token_id,
            minted_at: env.ledger().timestamp(),
        };

        // Store the badge
        storage::add_user_badge(&env, &user, &badge);
        storage::set_minted_badge(&env, &user, &badge_type);

        // Emit minting event
        events::emit_badge_minted(&env, &user, &badge_type, &token_id);

        Ok(token_id)
    }

    /// Get all badges owned by a user
    pub fn get_user_badges(
        env: Env,
        user: Address,
    ) -> Vec<UserBadge> {
        storage::get_user_badges(&env, &user)
    }

    /// Get metadata for a badge type
    pub fn get_badge_metadata(
        env: Env,
        badge_type: BadgeType,
    ) -> BadgeMetadata {
        storage::get_badge_metadata(&env, &badge_type)
    }
}
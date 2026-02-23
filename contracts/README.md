# StellarSplit Smart Contracts

This directory contains the Soroban smart contracts for the StellarSplit escrow system.

## Overview

The StellarSplit contracts handle on-chain escrow for bill splitting, enabling trustless payments between participants.

## Project Structure

```
contracts/
├── achievement-badges/     # NFT achievement badges
│   ├── src/
│   │   ├── lib.rs          # Badge minting contract
│   │   ├── types.rs        # Badge types and metadata
│   │   ├── storage.rs      # Badge storage helpers
│   │   ├── events.rs       # Badge events
│   │   └── test.rs         # Badge tests
│   ├── Cargo.toml          # Rust dependencies
│   └── README.md           # Badge contract docs
├── multi-sig-splits/       # Multi-signature with time-locks
│   ├── src/
│   │   ├── lib.rs          # Multi-sig contract
│   │   ├── types.rs        # Multi-sig types
│   │   ├── storage.rs      # Multi-sig storage
│   │   ├── events.rs       # Multi-sig events
│   │   └── test.rs         # Multi-sig tests
│   ├── Cargo.toml          # Rust dependencies
│   └── README.md           # Multi-sig contract docs
├── split-escrow/           # Main escrow contract
│   ├── src/
│   │   ├── lib.rs          # Contract entry point
│   │   ├── types.rs        # Custom data types
│   │   ├── storage.rs      # Storage helpers
│   │   ├── events.rs       # Contract events
│   │   └── test.rs         # Unit tests
│   ├── Cargo.toml          # Rust dependencies
│   └── README.md           # Contract documentation
├── scripts/
│   ├── build.sh                    # Build split-escrow contract
│   ├── build-achievement-badges.sh # Build achievement badges contract
│   ├── build-multi-sig-splits.sh   # Build multi-sig splits contract
│   ├── deploy.sh                   # Deploy to network
│   └── test.sh                     # Run unit tests
└── README.md                       # This file
```

## Prerequisites

### 1. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### 2. Add WebAssembly Target

```bash
rustup target add wasm32-unknown-unknown
```

### 3. Install Soroban CLI (Optional but Recommended)

```bash
cargo install soroban-cli
```

## Quick Start

### Build Contracts

```bash
cd contracts

# Build main escrow contract
./scripts/build.sh

# Build achievement badges contract
./scripts/build-achievement-badges.sh

# Build multi-signature contract
./scripts/build-multi-sig-splits.sh
```

Each script compiles the respective contract to WebAssembly and optionally optimizes it.

### Run Tests

```bash
./scripts/test.sh
```

Run specific tests:

```bash
./scripts/test.sh create_split
./scripts/test.sh --verbose
```

### Deploy to Testnet

1. Set your admin secret key:
   ```bash
   export ADMIN_SECRET_KEY='S...your_secret_key...'
   ```

2. Deploy:
   ```bash
   ./scripts/deploy.sh testnet
   ```

3. Save the returned Contract ID for future interactions.

### Deploy to Mainnet

⚠️ **Warning**: Mainnet deployment uses real XLM!

```bash
./scripts/deploy.sh mainnet
```

## Network Configuration

| Network | RPC URL | Description |
|---------|---------|-------------|
| Testnet | https://soroban-testnet.stellar.org | Free test tokens available |
| Mainnet | https://soroban.stellar.org | Production environment |

### Getting Testnet Tokens

Use the [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test) to fund a testnet account.

## Contract Functions

| Function | Description |
|----------|-------------|
| `initialize(admin)` | Set up the contract with an admin |
| `create_split(...)` | Create a new bill split |
| `deposit(split_id, participant, amount)` | Deposit funds into a split |
| `release_funds(split_id)` | Release collected funds to creator |
| `cancel_split(split_id)` | Cancel a split |
| `get_split(split_id)` | Query split details |

## Events

The contract emits these events for off-chain tracking:

- `init` - Contract initialized
- `created` - Split created
- `deposit` - Funds deposited
- `released` - Funds released
- `cancel` - Split cancelled
- `refund` - Refund processed

## Development

### Project Layout

```
split-escrow/
├── Cargo.toml          # Dependencies and build config
└── src/
    ├── lib.rs          # Main contract + public interface
    ├── types.rs        # Split, Participant, SplitStatus
    ├── storage.rs      # DataKey enum + storage helpers
    ├── events.rs       # Event emission functions
    └── test.rs         # Unit tests
```

### Running Individual Tests

```bash
cd split-escrow
cargo test test_create_split
cargo test test_deposit -- --nocapture
```

### Checking for Warnings

```bash
cargo clippy --target wasm32-unknown-unknown
```

## Security Considerations

1. **Admin Keys**: Never commit secret keys to version control
2. **Authorization**: All sensitive operations require `require_auth()`
3. **Input Validation**: All inputs are validated before processing
4. **State Checks**: Operations verify split status before proceeding

## License

MIT License - see [LICENSE](../LICENSE) for details.

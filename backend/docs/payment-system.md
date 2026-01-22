# StellarSplit Payment System

## Overview
The payment system handles Stellar blockchain transaction verification and updates split/participant status in real-time. It ensures secure, transparent payment processing using the Stellar network.

## Architecture

### Core Components

#### 1. Stellar Service (`stellar.service.ts`)
- Interacts with Stellar Horizon API
- Verifies transactions on the Stellar network
- Extracts transaction details (sender, amount, asset)
- Supports both mainnet and testnet

#### 2. Payment Processor Service (`payment-processor.service.ts`)
- Handles payment submission workflow
- Validates payment against participant's owed amount
- Updates participant and split status
- Prevents duplicate submissions
- Manages partial payments

#### 3. Payment Service (`payments.service.ts`)
- Main service layer for payment operations
- Provides API endpoints for payment functionality
- Handles business logic and data access

#### 4. WebSocket Gateway (`payment.gateway.ts`)
- Real-time notifications for payment events
- Updates clients on payment status changes
- Broadcasts split completion events

### Data Models

#### Split Entity
- Tracks the overall bill split
- Contains total amount and payment status

#### Participant Entity
- Represents individual users in a split
- Tracks owed vs paid amounts
- Maintains payment status

#### Payment Entity
- Records individual payment transactions
- Links to Stellar transaction hashes
- Stores amount, asset, and status

## API Endpoints

### POST `/api/payments/submit`
Submit a Stellar transaction for payment verification.

Request Body:
```json
{
  "splitId": "uuid",
  "participantId": "uuid",
  "stellarTxHash": "string"
}
```

Response:
```json
{
  "success": true,
  "message": "Payment confirmed. Amount: 10.50 XLM-USDC",
  "paymentId": "uuid"
}
```

### GET `/api/payments/verify/:txHash`
Verify a Stellar transaction without creating a payment record.

Response:
```json
{
  "valid": true,
  "amount": 10.50,
  "asset": "XLM-USDC",
  "sender": "G...",
  "receiver": "G...",
  "timestamp": "2023-01-01T00:00:00Z"
}
```

### GET `/api/payments/:txHash`
Get payment details by transaction hash.

### GET `/api/payments/split/:splitId`
Get all payments for a specific split.

### GET `/api/payments/participant/:participantId`
Get all payments for a specific participant.

### GET `/api/payments/stats/:splitId`
Get payment statistics for a split.

## Features

### Transaction Verification
- Validates Stellar transaction exists on the network
- Checks transaction status (successful/failed)
- Extracts payment operation details
- Supports various payment types (direct payments, path payments)

### Payment Processing
- Matches payment amount to participant's owed amount
- Handles exact payments, partial payments, and overpayments
- Updates participant status (pending/paid/partial)
- Updates split status (active/completed/partial)

### Duplicate Prevention
- Idempotency checks using Stellar transaction hash
- Prevents double-processing of transactions

### Partial Payment Handling
- Accepts payments less than the full amount owed
- Updates participant status to 'partial'
- Continues to track remaining balance

### Real-time Notifications
- WebSocket connections for live updates
- Payment status change notifications
- Split completion notifications

## Technical Implementation

### Stellar Integration
Uses Stellar SDK to interact with Horizon API:
- Transaction verification via transaction hash
- Operation parsing to extract payment details
- Account validation to ensure active accounts

### Database Operations
- Atomic database updates for consistency
- TypeORM for database interactions
- Proper transaction isolation

### Error Handling
- Comprehensive error handling for network issues
- Invalid transaction responses
- Missing participant/split errors
- Validation errors

## Security Considerations

- Input validation on all API endpoints
- Transaction hash verification against Stellar network
- Duplicate submission prevention
- Proper authentication (to be implemented with user system)

## Testing Strategy

- Unit tests for individual services
- Integration tests for end-to-end payment flow
- Testnet integration for real Stellar transactions
- Edge case testing (partial payments, invalid transactions)
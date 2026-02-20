import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CollaborationProvider, CollaborationContext } from './CollaborationProvider';
import { useContext } from 'react';

vi.mock('socket.io-client', () => {
    const mockSocket = {
        on: vi.fn(),
        emit: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        connected: false
    };
    return {
        io: vi.fn(() => mockSocket),
        Socket: vi.fn()
    };
});

const TestComponent = () => {
    const context = useContext(CollaborationContext);
    if (!context) return <div>No Context</div>;
    return (
        <div>
            <div data-testid="connected">{context.connected.toString()}</div>
            <button onClick={() => context.joinSplit('s1', { userId: 'u1' })}>Join</button>
        </div>
    );
};

describe('CollaborationProvider', () => {
    it('provides default context values', () => {
        render(
            <CollaborationProvider>
                <TestComponent />
            </CollaborationProvider>
        );
        expect(screen.getByTestId('connected').textContent).toBe('false');
        expect(screen.getByText('Join')).toBeDefined();
    });
});

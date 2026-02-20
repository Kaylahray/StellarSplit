import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiveActivityFeed } from './LiveActivityFeed';
import * as useCollaborationModule from '../../hooks/useCollaboration';

vi.mock('../../hooks/useCollaboration');

describe('LiveActivityFeed', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders empty state when no activities', () => {
        vi.mocked(useCollaborationModule.useCollaboration).mockReturnValue({
            connected: true,
            presence: {},
            activities: [],
            conflicts: [],
            joinSplit: vi.fn(),
            leaveSplit: vi.fn(),
            setTyping: vi.fn(),
            sendUpdate: vi.fn(),
            resolveConflict: vi.fn(),
            updateCursor: vi.fn(),
        });

        render(<LiveActivityFeed />);
        expect(screen.getByText('No recent activity')).toBeDefined();
    });

    it('renders activity list when populated', () => {
        vi.mocked(useCollaborationModule.useCollaboration).mockReturnValue({
            connected: true,
            presence: {},
            activities: [
                { id: '1', type: 'payment-status', userId: 'u1', userName: 'Alice', message: 'paid their share', timestamp: new Date(), splitId: 's1' },
                { id: '2', type: 'item-added', userId: 'u2', userName: 'Bob', message: 'added a new item', timestamp: new Date(), splitId: 's1' }
            ],
            conflicts: [],
            joinSplit: vi.fn(),
            leaveSplit: vi.fn(),
            setTyping: vi.fn(),
            sendUpdate: vi.fn(),
            resolveConflict: vi.fn(),
            updateCursor: vi.fn(),
        });

        render(<LiveActivityFeed />);
        expect(screen.getByText('Live Feed')).toBeDefined();
        expect(screen.getByText('Alice')).toBeDefined();
        expect(screen.getByText('paid their share')).toBeDefined();
        expect(screen.getByText('Bob')).toBeDefined();
        expect(screen.getByText('added a new item')).toBeDefined();
    });
});

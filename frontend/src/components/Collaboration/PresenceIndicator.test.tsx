import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PresenceIndicator } from './PresenceIndicator';
import * as useCollaborationModule from '../../hooks/useCollaboration';

vi.mock('../../hooks/useCollaboration');

describe('PresenceIndicator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders nothing when disconnected and no users', () => {
        vi.mocked(useCollaborationModule.useCollaboration).mockReturnValue({
            connected: false,
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

        const { container } = render(<PresenceIndicator />);
        expect(container.firstChild).toBeNull();
    });

    it('renders connected status and user names', () => {
        vi.mocked(useCollaborationModule.useCollaboration).mockReturnValue({
            connected: true,
            presence: {
                user1: { userId: 'user1', name: 'Alice', isTyping: false, lastSeen: new Date(), activeView: 'split-details' },
                user2: { userId: 'user2', name: 'Bob', isTyping: true, lastSeen: new Date(), activeView: 'split-details' },
            },
            activities: [],
            conflicts: [],
            joinSplit: vi.fn(),
            leaveSplit: vi.fn(),
            setTyping: vi.fn(),
            sendUpdate: vi.fn(),
            resolveConflict: vi.fn(),
            updateCursor: vi.fn(),
        });

        render(<PresenceIndicator />);
        expect(screen.getByText('Live')).toBeDefined();
        // Tooltips or initials check
        expect(screen.getByText('A')).toBeDefined();
        expect(screen.getByText('B')).toBeDefined();

        // Typing indicator check
        expect(screen.getAllByText('Bob').length).toBeGreaterThan(0); // Bob is typing
    });
});

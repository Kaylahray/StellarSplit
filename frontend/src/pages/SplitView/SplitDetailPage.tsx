import { useState } from 'react';
import { Share2, ChevronLeft } from 'lucide-react';
import { SplitHeader } from '../../components/Split/SplitHeader';
import { ParticipantList } from '../../components/Split/ParticipantList';
import { ReceiptImage } from '../../components/Receipt/ReceiptImage';
import { PaymentButton } from '../../components/Payment/PaymentButton';
import { PaymentModal } from '../../components/Payment/PaymentModal';
import { ShareModal } from '../../components/Split/ShareModal';
import { Split } from '../../types';

// Mock Data
const MOCK_SPLIT: Split = {
    id: 'split_123',
    title: 'Dinner at Nobu',
    totalAmount: 450.00,
    currency: 'USD',
    date: new Date().toISOString(),
    status: 'active',
    receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600',
    participants: [
        { id: '1', name: 'You', amountOwed: 112.50, status: 'pending', isCurrentUser: true },
        { id: '2', name: 'Sarah M.', amountOwed: 112.50, status: 'paid', avatar: 'https://i.pravatar.cc/150?u=1' },
        { id: '3', name: 'Mike R.', amountOwed: 112.50, status: 'pending', avatar: 'https://i.pravatar.cc/150?u=2' },
        { id: '4', name: 'Jessica L.', amountOwed: 112.50, status: 'paid', avatar: 'https://i.pravatar.cc/150?u=3' },
    ]
};

export const SplitDetailPage = () => {
    const [split, setSplit] = useState<Split>(MOCK_SPLIT);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    const currentUser = split.participants.find(p => p.isCurrentUser);
    const shouldShowPayment = currentUser && currentUser.status === 'pending';

    const handlePayment = () => {
        setIsProcessingPayment(true);
        // Simulate API call
        setTimeout(() => {
            setIsProcessingPayment(false);
            setSplit(prev => ({
                ...prev,
                participants: prev.participants.map(p =>
                    p.isCurrentUser ? { ...p, status: 'paid' } : p
                )
            }));
            setIsPaymentModalOpen(false);
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-32 md:pb-12">
            {/* Top Navigation */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex justify-between items-center px-4 py-3 md:hidden">
                <button className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <span className="font-bold text-gray-900">Split Details</span>
                <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="p-2 -mr-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                >
                    <Share2 size={24} />
                </button>
            </div>

            <div className="max-w-lg mx-auto p-4 md:p-8">
                {/* Desktop Nav */}
                <div className="hidden md:flex justify-between items-center mb-8">
                    <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors">
                        <div className="p-1 rounded-full bg-gray-100"><ChevronLeft size={20} /></div>
                        Back to Dashboard
                    </button>
                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="flex items-center gap-2 text-purple-600 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-xl font-bold transition-colors"
                    >
                        <Share2 size={18} /> Share Split
                    </button>
                </div>

                <SplitHeader split={split} />

                <ReceiptImage imageUrl={split.receiptUrl} />

                <ParticipantList
                    participants={split.participants}
                    currency={split.currency}
                />

                {shouldShowPayment && (
                    <PaymentButton
                        amount={currentUser.amountOwed}
                        currency={split.currency}
                        onClick={() => setIsPaymentModalOpen(true)}
                    />
                )}
            </div>

            {shouldShowPayment && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    amount={currentUser.amountOwed}
                    currency={split.currency}
                    onConfirm={handlePayment}
                    isProcessing={isProcessingPayment}
                />
            )}

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                splitLink={`https://stellarsplit.app/split/${split.id}`}
            />
        </div>
    );
};

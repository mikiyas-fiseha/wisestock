import { FeedbackModal } from '@/components/ui/FeedbackModal';
import React, { createContext, ReactNode, useContext, useState } from 'react';

type FeedbackType = 'success' | 'error' | 'warning' | 'info';

interface FeedbackContextType {
    showFeedback: (type: FeedbackType, title: string, message: string) => void;
    confirmAction: (type: FeedbackType, title: string, message: string, onConfirm: () => void, confirmText?: string) => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export function FeedbackProvider({ children }: { children: ReactNode }) {
    const [visible, setVisible] = useState(false);
    const [type, setType] = useState<FeedbackType>('success');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [onConfirm, setOnConfirm] = useState<(() => void) | undefined>(undefined);
    const [confirmText, setConfirmText] = useState<string | undefined>(undefined);

    const showFeedback = (type: FeedbackType, title: string, message: string) => {
        setType(type);
        setTitle(title);
        setMessage(message);
        setOnConfirm(undefined);
        setConfirmText(undefined);
        setVisible(true);
    };

    const confirmAction = (type: FeedbackType, title: string, message: string, onConfirmAction: () => void, confirmBtnText?: string) => {
        setType(type);
        setTitle(title);
        setMessage(message);
        setOnConfirm(() => onConfirmAction);
        setConfirmText(confirmBtnText);
        setVisible(true);
    };

    const handleClose = () => {
        setVisible(false);
        // Reset state after transition? Not strictly necessary but clean.
    };

    return (
        <FeedbackContext.Provider value={{ showFeedback, confirmAction }}>
            {children}
            <FeedbackModal
                visible={visible}
                type={type}
                title={title}
                message={message}
                onClose={handleClose}
                onConfirm={onConfirm}
                confirmText={confirmText}
            />
        </FeedbackContext.Provider>
    );
}

export function useFeedback() {
    const context = useContext(FeedbackContext);
    if (!context) {
        throw new Error('useFeedback must be used within a FeedbackProvider');
    }
    return context;
}

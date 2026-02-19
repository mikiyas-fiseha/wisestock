import { Colors } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TransactionItemProps {
    date: string;
    type: string;
    amount: number;
    description: string;
}

export const TransactionItem = ({ date, type, amount, description }: TransactionItemProps) => {
    const isCredit = type === 'sale' || type === 'adjustment-plus'; // Increases debt
    // Wait, if I sell on credit, balance increases (Positive outcome for us? No, positive balance means they OWE us).
    // Ledger: Debit (They pay us) vs Credit (We sell to them).
    // Let's stick to "Balance Effect":
    // Sale -> Increases Balance (Positive)
    // Payment -> Decreases Balance (Negative)

    // Visually: 
    // Sale ($100) -> Text Black
    // Payment (-$100) -> Text Green (Good for them/us)

    // The 'amount' passed in should already be signed correctly from the DB or mapped here?
    // In DB: 
    // Sales are tracked as POSITIVE transaction amount usually? 
    // Payments are tracked as NEGATIVE in the ledger sum?
    // Let's assume the DB `customer_transactions` 'amount' column is signed. 
    // Sale: +100. Payment: -100.

    const isNegative = amount < 0;

    return (
        <View style={styles.container}>
            <View style={styles.left}>
                <Text style={styles.date}>{new Date(date).toLocaleDateString()}</Text>
                <Text style={styles.desc}>{description}</Text>
            </View>
            <View style={styles.right}>
                <Text style={[
                    styles.amount,
                    isNegative ? { color: Colors.light.success } : { color: Colors.light.text }
                ]}>
                    {amount > 0 ? '+' : ''}{amount.toFixed(2)}
                </Text>
                <Text style={styles.type}>{type.toUpperCase()}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: '#f0f0f0',
    },
    left: {
        flex: 1,
    },
    date: {
        fontSize: 12,
        color: '#888',
        marginBottom: 2,
    },
    desc: {
        fontSize: 15,
        color: '#333',
    },
    right: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    type: {
        fontSize: 11,
        color: '#666',
        marginTop: 2,
    },
});

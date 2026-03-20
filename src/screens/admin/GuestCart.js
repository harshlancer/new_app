import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useCart } from '../../context/CartContext';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function GuestCart({ navigation }) {
    const { cart, removeFromCart, total, clearCart } = useCart();
    const [loading, setLoading] = useState(false);

    const placeOrder = async () => {
        if (cart.length === 0) return;
        setLoading(true);
        try {
            const data = await AsyncStorage.getItem('guest_session');
            const guest = data ? JSON.parse(data) : { room: '402' };
            
            const orderDetails = cart.map(item => `${item.qty}x ${item.name}`).join(', ');

            await firestore().collection('requests').add({
                room: guest.room.toString(),
                guestName: guest.name || 'Guest',
                guestID: guest.guestID || '',
                type: 'order',
                category: 'Dining',
                items: cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    qty: item.qty,
                    price: item.price
                })),
                details: orderDetails,
                status: 'Pending',
                totalPrice: total,
                createdAt: firestore.FieldValue.serverTimestamp()
            });

            clearCart();
            Alert.alert('Success', 'Your order is being prepared by our chefs.');
            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    if (cart.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Icon name="shopping-bag" size={64} color="#e8e4d9" />
                <Text style={styles.emptyText}>Your cart is empty.</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>View Menu</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 15 }}>
                    <Icon name="arrow-left" size={24} color="#4a3b2c" />
                </TouchableOpacity>
                <Text style={styles.title}>Your Order</Text>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
                {cart.map(item => (
                    <View key={item.id} style={styles.cartItem}>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemQty}>Quantity: {item.qty}</Text>
                        </View>
                        <View style={styles.itemAction}>
                            <Text style={styles.itemPrice}>${(item.price * item.qty).toFixed(2)}</Text>
                            <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                                <Icon name="trash-2" size={18} color="#ef4444" style={styles.trash} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total to Room</Text>
                    <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
                </View>
                <TouchableOpacity style={styles.checkoutBtn} onPress={placeOrder} disabled={loading}>
                    <Text style={styles.checkoutText}>{loading ? 'PLACING...' : 'PLACE ORDER'}</Text>
                    <Icon name="check-circle" size={18} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f1ea' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f1ea' },
    emptyText: { fontSize: 18, color: '#94a3b8', marginTop: 20, fontWeight: '600' },
    backButton: { marginTop: 20, padding: 15, backgroundColor: '#ab9373', borderRadius: 12 },
    backButtonText: { color: '#fff', fontWeight: 'bold' },
    header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8e4d9' },
    title: { fontSize: 32, fontWeight: '900', color: '#4a3b2c' },
    list: { padding: 20 },
    cartItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 16, color: '#4a3b2c', fontWeight: '700' },
    itemQty: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
    itemAction: { alignItems: 'flex-end', justifyContent: 'center' },
    itemPrice: { fontSize: 16, fontWeight: '800', color: '#ab9373', marginBottom: 10 },
    trash: { padding: 5 },
    footer: { padding: 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e8e4d9' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
    totalLabel: { fontSize: 14, color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' },
    totalAmount: { fontSize: 32, color: '#4a3b2c', fontWeight: '900' },
    checkoutBtn: { backgroundColor: '#4a3b2c', padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    checkoutText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 }
});

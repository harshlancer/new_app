import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ImageBackground, TextInput, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useCart } from '../../context/CartContext';

const MENU_ITEMS = [
    { id: 1, name: 'Gourmet Toast', price: 16, category: 'Breakfast', icon: '🥑', img: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=400', rating: 4.9 },
    { id: 2, name: 'Truffle Pizza', price: 24, category: 'Main Course', icon: '🍕', img: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?q=80&w=400', rating: 4.8 },
    { id: 3, name: 'Wagyu Burger', price: 28, category: 'Main Course', icon: '🍔', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=400', rating: 5.0 },
    { id: 4, name: 'Vintage Red', price: 85, category: 'Drinks', icon: '🍷', img: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=400', rating: 4.7 }
];

export default function GuestDining({ navigation }) {
    const { addToCart, itemCount } = useCart();
    const [activeCat, setActiveCat] = useState('All');
    const categories = ['All', 'Breakfast', 'Main Course', 'Drinks', 'Dessert'];

    const filtered = activeCat === 'All' ? MENU_ITEMS : MENU_ITEMS.filter(it => it.category === activeCat);

    const handleAdd = (item) => {
        addToCart(item);
        Alert.alert('Added', `${item.name} added to your tray!`);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Dining</Text>
                <Text style={styles.subtitle}>Prepared by Michelin Chefs</Text>
            </View>

            <View style={styles.searchBox}>
                <Icon name="search" size={20} color="#94a3b8" />
                <TextInput style={styles.searchInput} placeholder="Search for something delicious..." placeholderTextColor="#94a3b8" />
            </View>

            <View style={styles.tabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {categories.map(cat => (
                        <TouchableOpacity 
                            key={cat} 
                            style={[styles.tab, activeCat === cat && styles.activeTab]}
                            onPress={() => setActiveCat(cat)}
                        >
                            <Text style={[styles.tabText, activeCat === cat && styles.activeTabText]}>{cat.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
                {filtered.map(item => (
                    <View key={item.id} style={styles.card}>
                        <ImageBackground source={{ uri: item.img }} style={styles.cardImg}>
                            <View style={styles.ratingBox}>
                                <Icon name="star" size={12} color="#f97316" />
                                <Text style={styles.ratingText}>{item.rating}</Text>
                            </View>
                        </ImageBackground>
                        <View style={styles.cardContent}>
                            <View style={styles.cardRow}>
                                <View>
                                    <Text style={styles.cardTitle}>{item.name}</Text>
                                    <Text style={styles.cardSub}>{item.category.toUpperCase()}</Text>
                                </View>
                                <Text style={styles.cardPrice}>${item.price}</Text>
                            </View>
                            <TouchableOpacity style={styles.addButton} onPress={() => handleAdd(item)}>
                                <Text style={styles.addText}>Add to Order</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {itemCount > 0 && (
                <View style={styles.floatingCart}>
                    <TouchableOpacity style={styles.cartButton} onPress={() => navigation.navigate('GuestCart')}>
                        <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{itemCount}</Text></View>
                        <View>
                            <Text style={styles.cartButtonTitle}>YOUR ORDER</Text>
                            <Text style={styles.cartButtonSub}>Ready for checkout</Text>
                        </View>
                        <Icon name="arrow-right" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f1ea', paddingTop: 60 },
    header: { paddingHorizontal: 20 },
    title: { fontSize: 36, color: '#ab9373', fontWeight: '900' },
    subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
    searchBox: { flexDirection: 'row', backgroundColor: '#fff', margin: 20, padding: 16, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1e293b' },
    tabsContainer: { paddingLeft: 20, paddingBottom: 10 },
    tab: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: '#e8e4d9' },
    activeTab: { backgroundColor: '#ab9373', borderColor: '#ab9373' },
    tabText: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 1 },
    activeTabText: { color: '#fff' },
    list: { paddingHorizontal: 20, paddingBottom: 50 },
    card: { backgroundColor: '#fff', borderRadius: 24, marginBottom: 20, overflow: 'hidden', shadowColor: '#ab9373', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
    cardImg: { height: 180, justifyContent: 'flex-start', padding: 16 },
    ratingBox: { alignSelf: 'flex-start', flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, alignItems: 'center' },
    ratingText: { color: '#ab9373', fontWeight: 'bold', fontSize: 12, marginLeft: 4 },
    cardContent: { padding: 20 },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardTitle: { fontSize: 18, color: '#4a3b2c', fontWeight: '800' },
    cardSub: { fontSize: 10, color: '#94a3b8', marginTop: 4, letterSpacing: 1, fontWeight: '700' },
    cardPrice: { fontSize: 24, color: '#ab9373', fontWeight: '900' },
    addButton: { backgroundColor: '#ab9373', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    addText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    floatingCart: { position: 'absolute', bottom: 30, left: 20, right: 20 },
    cartButton: { backgroundColor: '#ab9373', padding: 20, borderRadius: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#ab9373', shadowOpacity: 0.4, shadowRadius: 20, elevation: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    cartBadge: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    cartBadgeText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    cartButtonTitle: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
    cartButtonSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' }
});

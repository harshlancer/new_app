import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Image, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Feather';
import { showToast } from '../../../App';

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Evergreen', 'Water', 'Drinks', 'Dessert'];

export default function MenuManagement() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [catFilter, setCatFilter] = useState('All');

    // Add Item Modal
    const [addModal, setAddModal] = useState(false);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [imgUrl, setImgUrl] = useState('');
    const [iconEmoji, setIconEmoji] = useState('🍽️');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const unsub = firestore().collection('menu_items')
            .orderBy('category')
            .onSnapshot(snap => {
                if (snap) {
                    setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                }
                setLoading(false);
            }, err => {
                console.log(err);
                setLoading(false);
            });
        return unsub;
    }, []);

    const filtered = catFilter === 'All' ? items : items.filter(it => it.category === catFilter);

    const handleSave = async () => {
        if (!name.trim()) return showToast('Name is required', 'warning');
        if (!price.trim() || isNaN(parseFloat(price))) return showToast('Valid price is required', 'warning');

        setSaving(true);
        try {
            await firestore().collection('menu_items').add({
                name: name.trim(),
                price: parseFloat(price),
                category,
                img: imgUrl.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400',
                icon: iconEmoji.trim() || '🍽️',
                rating: 5.0, // Default premium rating
                createdAt: firestore.FieldValue.serverTimestamp()
            });
            showToast('Item added successfully', 'success');
            setAddModal(false);
            resetForm();
        } catch (e) {
            showToast('Failed to save item', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id) => {
        firestore().collection('menu_items').doc(id).delete()
            .then(() => showToast('Item deleted', 'success'))
            .catch(() => showToast('Failed to delete', 'error'));
    };

    const resetForm = () => {
        setName('');
        setPrice('');
        setCategory(CATEGORIES[0]);
        setImgUrl('');
        setIconEmoji('🍽️');
    };

    if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#4a3b2c" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Dining Menu</Text>
                    <Text style={styles.subtitle}>Manage your property's culinary offerings</Text>
                </View>
                <TouchableOpacity style={styles.fab} onPress={() => setAddModal(true)}>
                    <Icon name="plus" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.tabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {['All', ...CATEGORIES].map(cat => (
                        <TouchableOpacity 
                            key={cat} 
                            style={[styles.tab, catFilter === cat && styles.activeTab]}
                            onPress={() => setCatFilter(cat)}
                        >
                            <Text style={[styles.tabText, catFilter === cat && styles.activeTabText]}>{cat.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
                {filtered.map(item => (
                    <View key={item.id} style={styles.card}>
                        <Image source={{ uri: item.img }} style={styles.cardImg} />
                        <View style={styles.cardContent}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>{item.icon} {item.name}</Text>
                                <Text style={styles.cardSub}>{item.category.toUpperCase()}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.cardPrice}>${item.price}</Text>
                                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                                    <Icon name="trash-2" size={16} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ))}
                {filtered.length === 0 && (
                    <View style={styles.emptyBox}>
                        <Icon name="coffee" size={40} color="#cbd5e1" />
                        <Text style={styles.emptyBoxText}>No items found in {catFilter}.</Text>
                    </View>
                )}
            </ScrollView>

            {/* Add Modal */}
            <Modal visible={addModal} animationType="slide" presentationStyle="pageSheet">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>New Menu Item</Text>
                        <TouchableOpacity onPress={() => { setAddModal(false); resetForm(); }}>
                            <Icon name="x" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <Text style={styles.label}>ITEM NAME</Text>
                        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Avocado Toast" placeholderTextColor="#94a3b8" />

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <Text style={styles.label}>PRICE ($)</Text>
                                <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="e.g. 18.50" keyboardType="decimal-pad" placeholderTextColor="#94a3b8" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>EMOJI ICON</Text>
                                <TextInput style={styles.input} value={iconEmoji} onChangeText={setIconEmoji} placeholder="🍽️" placeholderTextColor="#94a3b8" />
                            </View>
                        </View>

                        <Text style={styles.label}>CATEGORY</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                            {CATEGORIES.map(c => (
                                <TouchableOpacity 
                                    key={c} 
                                    style={[styles.catChip, category === c && styles.catChipActive]}
                                    onPress={() => setCategory(c)}
                                >
                                    <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>{c}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>IMAGE URL (Optional)</Text>
                        <TextInput style={styles.input} value={imgUrl} onChangeText={setImgUrl} placeholder="https://..." autoCapitalize="none" placeholderTextColor="#94a3b8" />

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Item</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
    fab: { backgroundColor: '#4a3b2c', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    tabsContainer: { paddingLeft: 24, paddingBottom: 10 },
    tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    activeTab: { backgroundColor: '#4a3b2c', borderColor: '#4a3b2c' },
    tabText: { fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 1 },
    activeTabText: { color: '#fff' },
    list: { padding: 24, paddingBottom: 60 },
    card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    cardImg: { width: 100, height: 100, backgroundColor: '#f1f5f9' },
    cardContent: { flex: 1, padding: 16, flexDirection: 'row', justifyContent: 'space-between' },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    cardSub: { fontSize: 11, fontWeight: '700', color: '#94a3b8', marginTop: 6, letterSpacing: 0.5 },
    cardPrice: { fontSize: 18, fontWeight: '900', color: '#ab9373' },
    deleteBtn: { marginTop: 16, padding: 8, backgroundColor: '#fef2f2', borderRadius: 8 },
    emptyBox: { alignItems: 'center', marginTop: 40 },
    emptyBoxText: { marginTop: 12, color: '#94a3b8', fontWeight: '600' },
    
    // Modal
    modalHeader: { padding: 24, paddingTop: Platform.OS === 'ios' ? 24 : 24, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
    modalContent: { padding: 24 },
    label: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 8, letterSpacing: 1 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, fontSize: 15, marginBottom: 20, color: '#0f172a' },
    row: { flexDirection: 'row' },
    catScroll: { marginBottom: 20 },
    catChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9', marginRight: 10 },
    catChipActive: { backgroundColor: '#4a3b2c' },
    catChipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    catChipTextActive: { color: '#fff' },
    saveBtn: { backgroundColor: '#4a3b2c', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' }
});

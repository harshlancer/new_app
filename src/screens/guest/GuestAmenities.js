import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../../../App';

const AMENITIES = [
    { id: 'spa', name: 'Spa Appointment', icon: 'sparkles', desc: 'Book a 60-min deep tissue massage.' },
    { id: 'pool', name: 'Pool Towels', icon: 'droplet', desc: 'Request fresh towels by the cabana.' },
    { id: 'gym', name: 'Fitness Center', icon: 'activity', desc: 'Reserve a personal trainer.' },
    { id: 'car', name: 'Valet Retrieval', icon: 'truck', desc: 'Bring your car to the front desk.' }
];

export default function GuestAmenities() {
    const [loading, setLoading] = useState(false);

    const [selectedAmenity, setSelectedAmenity] = useState(null);

    const requestAmenity = (item) => {
        setSelectedAmenity(item);
    };

    const submitRequest = async () => {
        if (!selectedAmenity) return;
        setLoading(true);
        try {
            const data = await AsyncStorage.getItem('guest_session');
            const guest = data ? JSON.parse(data) : { room: '402', name: 'Guest' };
            
            await firestore().collection('requests').add({
                room: guest.room.toString(),
                guestName: guest.name || 'Guest',
                type: 'amenity',
                category: 'Wellness',
                details: selectedAmenity.name,
                status: 'Pending',
                createdAt: firestore.FieldValue.serverTimestamp()
            });
            showToast(`${selectedAmenity.name} has been requested.`, 'success');
            setSelectedAmenity(null);
        } catch (e) {
            showToast(e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <ScrollView style={styles.container} contentContainerStyle={styles.list}>
                <View style={styles.header}>
                    <Text style={styles.title}>Wellness & Comfort</Text>
                    <Text style={styles.subtitle}>Premium amenities for your stay</Text>
                </View>

            {AMENITIES.map(item => (
                <TouchableOpacity key={item.id} style={styles.card} onPress={() => requestAmenity(item)} disabled={loading}>
                    <View style={styles.iconBox}>
                        <Icon name={item.icon} size={22} color="#6366f1" />
                    </View>
                    <View style={styles.contentBox}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <Text style={styles.cardDesc}>{item.desc}</Text>
                    </View>
                    <View style={styles.addBtnCircle}>
                        <Icon name="plus" size={16} color="#6366f1" />
                    </View>
                </TouchableOpacity>
            ))}
            </ScrollView>

            <Modal 
                visible={!!selectedAmenity} 
                transparent 
                animationType="fade" 
                onRequestClose={() => setSelectedAmenity(null)}
            >
                <View style={styles.modalOverlay}>
                    {selectedAmenity && (
                        <View style={styles.modalContent}>
                            <View style={styles.modalIconBox}>
                                <Icon name={selectedAmenity.icon} size={28} color="#6366f1" />
                            </View>
                            <Text style={styles.modalTitle}>{selectedAmenity.name}</Text>
                            <Text style={styles.modalDesc}>
                                Would you like to confirm your request for {selectedAmenity.name.toLowerCase()}? Our concierge team will arrange this for you immediately.
                            </Text>
                            
                            <View style={styles.modalActions}>
                                <TouchableOpacity 
                                    style={styles.modalBtnCancel} 
                                    onPress={() => setSelectedAmenity(null)}
                                    disabled={loading}
                                >
                                    <Text style={styles.modalBtnCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalBtnConfirm} onPress={submitRequest} disabled={loading}>
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.modalBtnConfirmText}>Confirm Order</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 24, paddingTop: 60, marginBottom: 10 },
    title: { fontSize: 28, color: '#0f172a', fontWeight: '900' },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: '600' },
    list: { paddingBottom: 50 },
    card: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 16, padding: 20, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, borderWidth: 1, borderColor: '#f1f5f9' },
    iconBox: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    contentBox: { flex: 1 },
    cardTitle: { fontSize: 16, color: '#0f172a', fontWeight: '800' },
    cardDesc: { fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 18 },
    addBtnCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '100%', backgroundColor: '#fff', borderRadius: 32, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
    modalIconBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 12, textAlign: 'center' },
    modalDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 30 },
    modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
    modalBtnCancel: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    modalBtnCancelText: { color: '#64748b', fontSize: 15, fontWeight: '800' },
    modalBtnConfirm: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
    modalBtnConfirmText: { color: '#fff', fontSize: 15, fontWeight: '900' }
});

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ImageBackground } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../../../App';

const LAUNDRY_SERVICES = [
    { id: 'l1', name: 'Wash & Fold', desc: 'Standard professional wash and machine dry, neatly folded.', icon: 'wind', img: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?q=80&w=400' },
    { id: 'l2', name: 'Dry Cleaning', desc: 'Premium dry cleaning for your delicate fabrics and suits.', icon: 'star', img: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?q=80&w=400' },
    { id: 'l3', name: 'Press & Ironing', desc: 'Hand-pressed and steam-ironed to perfection.', icon: 'sun', img: 'https://images.unsplash.com/photo-1544248455-ce7afcc767ea?q=80&w=400' },
];

export default function GuestLaundry({ navigation }) {
    const [guest, setGuest] = useState(null);
    const [selectedService, setSelectedService] = useState('l1');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            const data = await AsyncStorage.getItem('guest_session');
            if (data) setGuest(JSON.parse(data));
        })();
    }, []);

    const handleRequest = async () => {
        if (!guest) return showToast('Session not found', 'error');
        setLoading(true);

        try {
            const serviceObj = LAUNDRY_SERVICES.find(s => s.id === selectedService);
            
            await firestore().collection('requests').add({
                room: guest.room.toString(),
                guestName: guest.name || 'Guest',
                guestID: guest.guestID || '',
                type: 'Laundry',
                category: 'Housekeeping',
                details: `${serviceObj.name} Pickup ${note ? `\nNote: ${note}` : ''}`,
                status: 'Pending',
                createdAt: firestore.FieldValue.serverTimestamp()
            });

            showToast('Laundry pickup requested!', 'success');
            navigation.goBack();
        } catch (e) {
            showToast('Failed to request pickup', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 10 }}>
                    <Icon name="arrow-left" size={24} color="#0f172a" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Laundry Pickup</Text>
                    <Text style={styles.subtitle}>On-demand wardrobe care</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionLabel}>SELECT SERVICE TYPE</Text>
                
                {LAUNDRY_SERVICES.map(srv => {
                    const isSelected = selectedService === srv.id;
                    return (
                        <TouchableOpacity 
                            key={srv.id} 
                            style={[styles.serviceCard, isSelected && styles.serviceCardActive]}
                            onPress={() => setSelectedService(srv.id)}
                            activeOpacity={0.9}
                        >
                            <ImageBackground source={{ uri: srv.img }} style={styles.srvImg} imageStyle={{ opacity: isSelected ? 0.9 : 0.6 }}>
                                <View style={styles.srvImgOverlay}>
                                    <View style={[styles.iconBox, isSelected && { backgroundColor: '#6366f1' }]}>
                                        <Icon name={srv.icon} size={20} color={isSelected ? '#fff' : '#6366f1'} />
                                    </View>
                                </View>
                            </ImageBackground>
                            <View style={styles.srvInfo}>
                                <Text style={[styles.srvTitle, isSelected && { color: '#6366f1' }]}>{srv.name}</Text>
                                <Text style={styles.srvDesc}>{srv.desc}</Text>
                            </View>
                            <View style={styles.checkCircle}>
                                {isSelected && <Icon name="check" size={16} color="#6366f1" />}
                            </View>
                        </TouchableOpacity>
                    );
                })}

                <Text style={styles.sectionLabel}>SPECIAL INSTRUCTIONS (OPTIONAL)</Text>
                <TextInput
                    style={styles.noteInput}
                    placeholder="e.g., Heavy starch on shirts, please knock loudly..."
                    placeholderTextColor="#94a3b8"
                    value={note}
                    onChangeText={setNote}
                    multiline
                    numberOfLines={3}
                />

                <View style={styles.infoBox}>
                    <Icon name="info" size={16} color="#6366f1" style={{ marginTop: 2 }} />
                    <Text style={styles.infoText}>
                        A staff member will arrive at Room {guest?.room || 'your room'} shortly to collect your items. Final charges will be automatically billed to your room based on weight and itemized count.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.submitBtn} onPress={handleRequest} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.submitText}>REQUEST PICKUP</Text>
                            <Icon name="arrow-right" size={18} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
    subtitle: { fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 2 },
    
    content: { padding: 20, paddingBottom: 40 },
    sectionLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 16, marginTop: 10 },
    
    serviceCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, marginBottom: 16, padding: 12, borderWidth: 2, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, alignItems: 'center' },
    serviceCardActive: { borderColor: '#c7d2fe', backgroundColor: '#f5f7ff' },
    
    srvImg: { width: 70, height: 70, borderRadius: 14, overflow: 'hidden', backgroundColor: '#e2e8f0' },
    srvImgOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.2)', justifyContent: 'center', alignItems: 'center' },
    iconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    
    srvInfo: { flex: 1, marginLeft: 16 },
    srvTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
    srvDesc: { fontSize: 12, color: '#64748b', lineHeight: 18 },
    
    checkCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    
    noteInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, fontSize: 14, color: '#0f172a', minHeight: 100, textAlignVertical: 'top', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
    
    infoBox: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#eef2ff', borderRadius: 16, marginTop: 24, borderWidth: 1, borderColor: '#c7d2fe' },
    infoText: { flex: 1, fontSize: 12, color: '#4338ca', lineHeight: 20 },
    
    footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    submitBtn: { backgroundColor: '#6366f1', padding: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, shadowColor: '#6366f1', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
    submitText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
});

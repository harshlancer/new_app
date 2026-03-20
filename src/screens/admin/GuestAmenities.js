import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AMENITIES = [
    { id: 'spa', name: 'Spa Appointment', icon: 'sparkles', desc: 'Book a 60-min deep tissue massage.' },
    { id: 'pool', name: 'Pool Towels', icon: 'droplet', desc: 'Request fresh towels by the cabana.' },
    { id: 'gym', name: 'Fitness Center', icon: 'activity', desc: 'Reserve a personal trainer.' },
    { id: 'car', name: 'Valet Retrieval', icon: 'truck', desc: 'Bring your car to the front desk.' }
];

export default function GuestAmenities() {
    const [loading, setLoading] = useState(false);

    const requestAmenity = async (item) => {
        Alert.alert(
            'Confirm Request',
            `Would you like to request ${item.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Request', onPress: () => submitRequest(item) }
            ]
        );
    };

    const submitRequest = async (item) => {
        setLoading(true);
        try {
            const data = await AsyncStorage.getItem('guest_session');
            const guest = data ? JSON.parse(data) : { room: '402', name: 'Guest' };
            
            await firestore().collection('requests').add({
                room: guest.room.toString(),
                guestName: guest.name,
                type: 'amenity',
                details: item.name,
                status: 'Pending',
                createdAt: firestore.FieldValue.serverTimestamp()
            });
            Alert.alert('Success', `${item.name} has been requested.`);
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.list}>
            <View style={styles.header}>
                <Text style={styles.title}>Amenities</Text>
                <Text style={styles.subtitle}>Elevate your stay</Text>
            </View>

            {AMENITIES.map(item => (
                <TouchableOpacity key={item.id} style={styles.card} onPress={() => requestAmenity(item)} disabled={loading}>
                    <View style={styles.iconBox}>
                        <Icon name={item.icon} size={24} color="#5a4634" />
                    </View>
                    <View style={styles.contentBox}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <Text style={styles.cardDesc}>{item.desc}</Text>
                    </View>
                    <Icon name="plus" size={20} color="#ab9373" />
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f1ea' },
    header: { padding: 20, paddingTop: 60, marginBottom: 10 },
    title: { fontSize: 36, color: '#ab9373', fontWeight: '900' },
    subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
    list: { paddingBottom: 50 },
    card: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 15, padding: 20, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
    iconBox: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#f4f1ea', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    contentBox: { flex: 1 },
    cardTitle: { fontSize: 16, color: '#4a3b2c', fontWeight: '700' },
    cardDesc: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 16 }
});

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function GuestHome({ navigation }) {
    const [guest, setGuest] = useState(null);
    const [activities, setActivities] = useState([]);
    
    useEffect(() => {
        loadGuest();
    }, []);

    const loadGuest = async () => {
        const data = await AsyncStorage.getItem('guest_session');
        if (data) {
            const parsed = JSON.parse(data);
            setGuest(parsed);
            subscribeToActivities(parsed.room || '101');
        } else {
            setGuest({ name: 'Anderson', room: '402', checkOut: new Date().toISOString() });
            subscribeToActivities('402');
        }
    };

    const subscribeToActivities = (roomNum) => {
        return firestore()
            .collection('requests')
            .where('room', '==', roomNum.toString())
            .orderBy('createdAt', 'desc')
            .limit(5)
            .onSnapshot(snapshot => {
                if (snapshot) {
                    const acts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setActivities(acts);
                }
            }, error => console.log('Snapshot error', error));
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
    };

    if (!guest) return <View style={styles.loader}><ActivityIndicator size="large" color="#ab9373"/></View>;

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} bounces={false}>
            {/* Hero Section */}
            <ImageBackground 
                source={{ uri: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=800' }} 
                style={styles.hero}
            >
                <View style={styles.heroOverlay}>
                    <View style={styles.residencyBadge}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.residencyText}>ACTIVE RESIDENCY</Text>
                    </View>
                    <Text style={styles.heroWelcome}>Welcome,</Text>
                    <Text style={styles.heroName}>Mr. {guest.name ? guest.name.split(' ')[0] : 'Guest'}</Text>
                    <View style={styles.locationRow}>
                        <Icon name="map-pin" size={14} color="#ab9373" />
                        <Text style={styles.locationText}>Vishnu Suites</Text>
                    </View>
                </View>
            </ImageBackground>

            {/* Status Row */}
            <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>YOUR ROOM</Text>
                    <View style={styles.statusValRow}>
                        <Icon name="key" size={14} color="#5a4634" />
                        <Text style={styles.statusValue}>{guest.room || 'N/A'}</Text>
                    </View>
                </View>
                <View style={[styles.statusItem, styles.statusBorder]}>
                    <Text style={styles.statusLabel}>CHECKOUT</Text>
                    <View style={styles.statusValRow}>
                        <Icon name="calendar" size={14} color="#5a4634" />
                        <Text style={styles.statusValue}>{formatDate(guest.checkOut)}</Text>
                    </View>
                </View>
                <View style={[styles.statusItem, styles.statusBorder]}>
                    <Text style={styles.statusLabel}>WEATHER</Text>
                    <View style={styles.statusValRow}>
                        <Icon name="sun" size={14} color="#5a4634" />
                        <Text style={styles.statusValue}>72°F</Text>
                    </View>
                </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Signature Services</Text>
                </View>
                <View style={styles.grid}>
                    <QuickAction icon="coffee" label="Dining" onPress={() => navigation.navigate('Services')} />
                    <QuickAction icon="message-square" label="Concierge" onPress={() => navigation.navigate('Chat')} />
                    <QuickAction icon="award" label="Wellness" onPress={() => navigation.navigate('Amenities')} />
                    <QuickAction icon="briefcase" label="Laundry" />
                </View>
            </View>

            {/* Live Updates */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Live Updates</Text>
                </View>
                <View style={styles.feedCard}>
                    {activities.length === 0 ? (
                        <View style={styles.emptyFeed}>
                            <Icon name="activity" size={24} color="#cbd5e1" />
                            <Text style={styles.emptyFeedText}>No recent activity</Text>
                        </View>
                    ) : (
                        activities.map((act, i) => (
                            <View key={act.id} style={[styles.feedItem, i !== activities.length -1 && styles.feedBorder]}>
                                <Icon name={act.status === 'Completed' ? "check-circle" : "clock"} size={16} color="#ab9373" />
                                <View style={styles.feedContent}>
                                    <Text style={styles.feedTitle}>{act.type === 'order' ? 'Room Service' : act.details || 'Request'}</Text>
                                    <Text style={styles.feedStatus}>{act.status || 'Pending'}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </View>
        </ScrollView>
    );
}

const QuickAction = ({ icon, label, onPress }) => (
    <TouchableOpacity style={styles.gridItem} onPress={onPress}>
        <View style={styles.iconBox}>
            <Icon name={icon} size={20} color="#5a4634" />
        </View>
        <Text style={styles.gridLabel}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    loader: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#f4f1ea' },
    container: { flex: 1, backgroundColor: '#f4f1ea' },
    hero: { width: '100%', height: 400 },
    heroOverlay: { flex: 1, backgroundColor: 'rgba(42,34,26,0.5)', justifyContent: 'flex-end', padding: 30 },
    residencyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(244,241,234,0.2)', paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(171,147,115,0.4)' },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ab9373', marginRight: 8 },
    residencyText: { color: '#fff', fontSize: 10, letterSpacing: 2, fontWeight: '700' },
    heroWelcome: { fontSize: 36, color: '#f4f1ea', fontWeight: '300' },
    heroName: { fontSize: 36, color: '#ab9373', fontStyle: 'italic', fontWeight: '400', marginBottom: 16 },
    locationRow: { flexDirection: 'row', alignItems: 'center' },
    locationText: { color: 'rgba(244,241,234,0.8)', fontSize: 12, letterSpacing: 2, marginLeft: 8, textTransform: 'uppercase' },
    statusRow: { flexDirection: 'row', backgroundColor: '#fdfdfc', marginHorizontal: 20, marginTop: -30, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    statusItem: { flex: 1, paddingVertical: 20, alignItems: 'center' },
    statusBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(171,147,115,0.2)' },
    statusLabel: { fontSize: 10, color: '#ab9373', letterSpacing: 2, marginBottom: 8 },
    statusValRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusValue: { fontSize: 16, color: '#4a3b2c', fontWeight: '600' },
    section: { paddingHorizontal: 20, marginTop: 30 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 22, color: '#4a3b2c', fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    gridItem: { width: '48%', backgroundColor: '#fdfdfc', padding: 20, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#e8e4d9' },
    iconBox: { padding: 10, borderWidth: 1, borderColor: '#e8e4d9', marginBottom: 12 },
    gridLabel: { fontSize: 10, color: '#8b7355', letterSpacing: 2, textTransform: 'uppercase' },
    feedCard: { backgroundColor: '#fdfdfc', borderWidth: 1, borderColor: 'rgba(171,147,115,0.2)', padding: 10 },
    emptyFeed: { padding: 30, alignItems: 'center' },
    emptyFeedText: { color: '#cbd5e1', fontSize: 12, marginTop: 8, fontWeight: '600' },
    feedItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
    feedBorder: { borderBottomWidth: 1, borderBottomColor: '#e8e4d9' },
    feedContent: { marginLeft: 15 },
    feedTitle: { fontSize: 14, color: '#4a3b2c', fontWeight: '600' },
    feedStatus: { fontSize: 10, color: '#ab9373', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }
});

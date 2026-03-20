import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Feather';

export default function CRM() {
    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchGuests = async () => {
        try {
            const snap = await firestore().collection('guests')
                // .where('status', '==', 'Active') // Optional: only show active
                .orderBy('checkIn', 'desc')
                .get();
            
            const list = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setGuests(list);
        } catch (error) {
            console.log('CRM Fetch Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchGuests();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchGuests();
    };

    const renderGuest = ({ item }) => (
        <View style={styles.guestCard}>
            <View style={styles.guestHeader}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name ? item.name[0] : 'G'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.guestName}>{item.name || 'Anonymous Guest'}</Text>
                    <Text style={styles.guestId}>{item.guestID}</Text>
                </View>
                <View style={styles.roomBadge}>
                    <Text style={styles.roomText}>Room {item.room}</Text>
                </View>
            </View>
            
            <View style={styles.cardFooter}>
                <View style={styles.infoRow}>
                    <Icon name="calendar" size={12} color="#64748b" />
                    <Text style={styles.infoText}>In: {new Date(item.checkIn).toLocaleDateString()}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Icon name="clock" size={12} color="#64748b" />
                    <Text style={styles.infoText}>Out: {new Date(item.checkOut).toLocaleDateString()}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>CRM Dashboard</Text>
                <Text style={styles.subtitle}>Guest Relationship Management</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0f172a" />
                </View>
            ) : (
                <FlatList
                    data={guests}
                    keyExtractor={item => item.id}
                    renderItem={renderGuest}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Icon name="users" size={48} color="#e2e8f0" />
                            <Text style={styles.emptyText}>No Guest Records Found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { padding: 24, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9' },
    title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
    subtitle: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16 },
    guestCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
    guestHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
    guestName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    guestId: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    roomBadge: { backgroundColor: '#0f172a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    roomText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    cardFooter: { flexDirection: 'row', gap: 20, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 12, fontSize: 14, color: '#94a3b8', fontWeight: '700' }
});

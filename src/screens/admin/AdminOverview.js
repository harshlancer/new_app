import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Feather';
import { getHotelConfigRef, getStoredHotelId, withHotelScope } from '../../utils/hotelSession';

export default function AdminOverview({ navigation }) {
    const [stats, setStats] = useState({ activeRooms: 0, activeGuests: 0, cleaning: 0, revenue: 0 });
    const [pulse, setPulse] = useState([]);
    const [topStaff, setTopStaff] = useState(null);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [pendingLC, setPendingLC] = useState(0);
    const [hotelConfig, setHotelConfig] = useState({ hotelName: 'RoomFlow Hotel' });

    useEffect(() => {
        let unsubscribers = [];

        const init = async () => {
            const hotelId = await getStoredHotelId();

            unsubscribers = [
                withHotelScope(firestore().collection('rooms'), hotelId).onSnapshot(snap => {
                    if (snap) {
                        const activeRooms = snap.docs.filter(d => d.data().status === 'Ready' || d.data().status === 'Occupied').length;
                        const occupied = snap.docs.filter(d => d.data().status === 'Occupied').length;
                        const activeGuests = occupied;
                        const cleaning = snap.docs.filter(d => d.data().status === 'Cleaning').length;
                        const revenue = occupied * 150;

                        setStats({ activeRooms, activeGuests, cleaning, revenue });
                    }
                }),
                withHotelScope(firestore().collection('requests'), hotelId)
                    .orderBy('createdAt', 'desc')
                    .limit(5)
                    .onSnapshot(snap => {
                        if (snap) {
                            setPulse(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                            setLoading(false);
                        }
                    }),
                withHotelScope(firestore().collection('messages'), hotelId)
                    .where('sender', '==', 'Guest')
                    .orderBy('timestamp', 'desc')
                    .limit(20)
                    .onSnapshot(snap => {
                        if (snap) {
                            const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                            const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
                            const recent = msgs.filter(m => {
                                const t = m.timestamp?.toDate ? m.timestamp.toDate().getTime() : 0;
                                return t >= twoHoursAgo;
                            });
                            setUnreadCount(recent.length);
                        }
                    }),
                withHotelScope(firestore().collection('late_checkout_requests'), hotelId)
                    .where('status', '==', 'pending')
                    .onSnapshot(snap => setPendingLC(snap ? snap.size : 0)),
                withHotelScope(firestore().collection('staff_accounts'), hotelId)
                    .orderBy('points', 'desc')
                    .limit(1)
                    .onSnapshot(snap => {
                        if (snap && !snap.empty) {
                            setTopStaff(snap.docs[0].data());
                        }
                    }),
                getHotelConfigRef(hotelId).onSnapshot(snap => {
                    if (snap && snap.exists) {
                        setHotelConfig(snap.data());
                    }
                }),
            ];
        };

        init();

        return () => {
            unsubscribers.forEach((unsubscribe) => unsubscribe && unsubscribe());
        };
    }, []);

    if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#5a4634"/></View>;

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Executive Dashboard</Text>
                <Text style={styles.subtitle}>Property overview for <Text style={{color: '#5a4634', fontWeight: '800'}}>{hotelConfig.hotelName || 'RoomFlow Hotel'}</Text></Text>
                
                <View style={styles.quickAccessRow}>
                    <TouchableOpacity style={styles.inboxBtn} onPress={() => navigation.navigate('AdminChat')}>
                        <View style={styles.inboxIconWrap}>
                            <Icon name="message-square" size={16} color="#0f172a" />
                            {unreadCount > 0 && (
                                <View style={styles.inboxBadge}>
                                    <Text style={styles.inboxBadgeText}>{unreadCount}</Text>
                                </View>
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.inboxLabel}>Concierge Inbox</Text>
                            <Text style={styles.inboxSub}>{unreadCount > 0 ? `${unreadCount} new messages` : 'Guest chat updates'}</Text>
                        </View>
                        <Icon name="chevron-right" size={14} color="#94a3b8" />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.inboxBtn, styles.lcBtn, pendingLC > 0 && styles.lcBtnActive]} onPress={() => navigation.navigate('LateCheckoutRequests')}>
                        <View style={[styles.inboxIconWrap, { backgroundColor: pendingLC > 0 ? '#fff1f2' : '#f8fafc' }]}>
                            <Icon name="clock" size={16} color={pendingLC > 0 ? '#ef4444' : '#0f172a'} />
                            {pendingLC > 0 && (
                                <View style={[styles.inboxBadge, { backgroundColor: '#ef4444' }]}>
                                    <Text style={styles.inboxBadgeText}>{pendingLC}</Text>
                                </View>
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.inboxLabel, pendingLC > 0 && { color: '#ef4444' }]}>Late Checkout</Text>
                            <Text style={styles.inboxSub}>{pendingLC > 0 ? `${pendingLC} pending requests` : 'Stay extension queue'}</Text>
                        </View>
                        <Icon name="chevron-right" size={14} color="#94a3b8" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stat Widgets */}
            <View style={styles.grid}>
                <StatCard 
                    icon="grid" 
                    label="ACTIVE ROOMS" 
                    value={stats.activeRooms.toString()} 
                    trend="+5% Occupied" 
                    color="#10b981" 
                />
                <StatCard 
                    icon="users" 
                    label="ACTIVE GUESTS" 
                    value={stats.activeGuests.toString()} 
                    trend="Currently Inhouse" 
                    color="#10b981" 
                />
                <StatCard 
                    icon="tool" 
                    label="CLEANING" 
                    value={stats.cleaning.toString()} 
                    trend="In Progress" 
                    color="#f43f5e" 
                />
                <StatCard 
                    icon="dollar-sign" 
                    label="REVENUE (EST)" 
                    value={`$${stats.revenue}`} 
                    trend="+12% from yesterday" 
                    color="#10b981" 
                />
            </View>

            {/* Staff MVP Highlight */}
            {topStaff && (
                <View style={styles.mvpCard}>
                    <View style={styles.mvpInfo}>
                        <Icon name="award" size={32} color="#f59e0b" />
                        <View>
                            <Text style={styles.mvpLabel}>CURRENT STAFF MVP</Text>
                            <Text style={styles.mvpName}>{topStaff.name}</Text>
                        </View>
                    </View>
                    <View style={styles.mvpPoints}>
                        <Text style={styles.mvpPointsVal}>{topStaff.points || 0}</Text>
                        <Text style={styles.mvpPointsLabel}>POINTS</Text>
                    </View>
                </View>
            )}

            <View style={styles.bottomSection}>
                {/* Visual Chart Placeholder */}
                <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <View>
                            <Text style={styles.chartTitle}>Service Activity</Text>
                            <Text style={styles.chartSub}>LAST 7 DAYS</Text>
                        </View>
                        <View style={styles.chartToggles}>
                            <Text style={styles.toggleActive}>Volume</Text>
                            <Text style={styles.toggleInactive}>Revenue</Text>
                        </View>
                    </View>
                    
                    <View style={styles.chartMock}>
                        <Text style={styles.chartMockText}>Graph rendering enabled on tablet UI</Text>
                        <View style={styles.lineMock} />
                    </View>
                </View>

                {/* Live Pulse Card */}
                <View style={styles.pulseCard}>
                    <View style={styles.pulseHeader}>
                        <Text style={styles.pulseTitle}>Live Pulse</Text>
                        <View style={styles.pulseBadge}>
                            <View style={styles.pulseDot} />
                            <Text style={styles.pulseBadgeText}>LIVE</Text>
                        </View>
                    </View>
                    
                    <View style={styles.pulseContent}>
                        {pulse.length === 0 ? (
                            <Text style={styles.emptyText}>No recent activity...</Text>
                        ) : pulse.map((item, idx) => (
                            <View key={item.id} style={styles.pulseItem}>
                                <View style={[styles.pulseIcon, { backgroundColor: item.status === 'Completed' ? '#dcfce7' : '#fef3c7' }]} />
                                <View style={styles.pulseTextBlock}>
                                    <Text style={styles.pulseItemText}>Room {item.room} {item.type}: {item.details}</Text>
                                    <View style={[styles.itemBadge, { backgroundColor: item.status === 'Completed' ? '#dcfce7' : '#fef3c7' }]}>
                                        <Text style={[styles.itemBadgeText, { color: item.status === 'Completed' ? '#16a34a' : '#d97706' }]}>
                                            {item.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                <View style={styles.pulseFooter}>
                    <Text style={styles.pulseFooterText}>DETAILED ACTIVITY LOG</Text>
                </View>
            </View>
        </View>

            {/* Floating inbox launcher */}
            <TouchableOpacity style={styles.inboxFab} onPress={() => navigation.navigate('AdminChat')}>
                <Icon name="message-square" size={22} color="#fff" />
                {unreadCount > 0 && (
                    <View style={styles.inboxFabBadge}>
                        <Text style={styles.inboxFabBadgeText}>{unreadCount}</Text>
                    </View>
                )}
            </TouchableOpacity>

        </ScrollView>
    );
}

const StatCard = ({ icon, label, value, trend, color }) => (
    <View style={styles.statCard}>
        <View style={styles.statTop}>
            <View style={styles.iconBox}>
                <Icon name={icon} size={16} color="#475569" />
            </View>
            <View style={styles.trendBox}>
                <Icon name="trending-up" size={10} color={color} />
                <Text style={[styles.statTrend, { color }]}>{trend}</Text>
            </View>
        </View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statVal}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
    container: { flex: 1, backgroundColor: '#f9fafb' }, // Match Vercel off-white background
    header: { padding: 24, paddingTop: 40, backgroundColor: '#f9fafb' },
    title: { fontSize: 26, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#64748b', marginBottom: 20 },
    quickAccessRow: { gap: 12 },
    inboxBtn: { backgroundColor: '#fff', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
    lcBtn: { marginTop: 0 },
    lcBtnActive: { borderColor: '#fecaca', backgroundColor: '#fffcfc' },
    inboxIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
    inboxBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
    inboxBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    inboxLabel: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
    inboxSub: { fontSize: 11, color: '#94a3b8' },
    inboxFab: { position: 'absolute', right: 24, bottom: 32, width: 56, height: 56, borderRadius: 28, backgroundColor: '#5a4634', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
    inboxFabBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
    inboxFabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    
    // Stat Widgets Grid
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, justifyContent: 'space-between', gap: 12 },
    statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
    statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    iconBox: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 12 },
    trendBox: { flexDirection: 'row', gap: 4, alignItems: 'center' },
    statTrend: { fontSize: 10, fontWeight: '800' },
    statLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    statVal: { fontSize: 28, fontWeight: '900', color: '#4a3b2c' },
    
    // Bottom Section
    bottomSection: { padding: 20, marginTop: 10, gap: 20 },
    
    // Chart Card
    chartCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    chartTitle: { fontSize: 18, fontWeight: '900', color: '#4a3b2c' },
    chartSub: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
    chartToggles: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 12, padding: 4 },
    toggleActive: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#fff', borderRadius: 10, fontSize: 10, fontWeight: '800', color: '#4a3b2c', shadowColor: '#000', shadowOpacity: 0.05, elevation: 1 },
    toggleInactive: { paddingHorizontal: 16, paddingVertical: 6, fontSize: 10, fontWeight: '800', color: '#94a3b8' },
    chartMock: { height: 150, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
    chartMockText: { fontSize: 10, fontWeight: '700', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 1 },
    lineMock: { width: '100%', height: 2, backgroundColor: '#f1f5f9', marginTop: 10 },
    
    // Live Pulse Card
    pulseCard: { backgroundColor: '#fff', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 4, overflow: 'hidden' },
    pulseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    pulseTitle: { fontSize: 18, fontWeight: '900', color: '#4a3b2c' },
    pulseBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a', marginRight: 6 },
    pulseBadgeText: { fontSize: 10, fontWeight: '900', color: '#15803d', textTransform: 'uppercase', letterSpacing: 1 },
    pulseContent: { padding: 24, minHeight: 200 },
    pulseItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
    pulseIcon: { width: 10, height: 10, borderRadius: 5, marginTop: 6, marginRight: 16 },
    pulseTextBlock: { flex: 1 },
    pulseItemText: { fontSize: 13, fontWeight: '700', color: '#4a3b2c', lineHeight: 20, marginBottom: 6 },
    itemBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    itemBadgeText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    emptyText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginTop: 40 },
    pulseFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'center' },
    pulseFooterText: { fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2 },

    // MVP Card Styles
    mvpCard: { margin: 20, marginTop: 0, backgroundColor: '#0f172a', borderRadius: 24, padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, elevation: 10 },
    mvpInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    mvpLabel: { fontSize: 9, fontWeight: '900', color: '#6366f1', letterSpacing: 2 },
    mvpName: { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 4 },
    mvpPoints: { alignItems: 'center', backgroundColor: 'rgba(99, 102, 241, 0.1)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderLeftWidth: 1, borderLeftColor: '#334155' },
    mvpPointsVal: { fontSize: 20, fontWeight: '900', color: '#6366f1' },
    mvpPointsLabel: { fontSize: 8, fontWeight: '900', color: '#94a3b8', marginTop: 2 },

    // Inbox modal styles
    inboxOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', padding: 20 },
    inboxCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 18, elevation: 12 },
    inboxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    inboxHeaderLeft: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    inboxTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    roomSelector: { marginBottom: 10 },
    roomSelectorLabel: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 6 },
    roomInput: { backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0' },
    roomChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f1f5f9' },
    roomChipActive: { backgroundColor: '#5a4634' },
    roomChipText: { fontSize: 12, fontWeight: '800', color: '#475569' },
    roomChipTextActive: { color: '#fff' },
    inboxItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    inboxItemTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    inboxRoom: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
    inboxTime: { fontSize: 11, color: '#94a3b8' },
    inboxMessage: { fontSize: 13, color: '#475569' },
    replyBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
    replyInput: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#0f172a' },
    replyBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#5a4634', justifyContent: 'center', alignItems: 'center' },
    replyHint: { fontSize: 11, color: '#94a3b8', marginTop: 6, textAlign: 'right' }
});

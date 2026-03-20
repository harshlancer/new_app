import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, Animated, Modal, TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import firestore from '@react-native-firebase/firestore';
import { showToast } from '../../../App';
import { NotificationService } from '../../utils/NotificationService';
import { getHotelConfigRef, getStoredHotelId, withHotelScope } from '../../utils/hotelSession';

const STATUS_CONFIG = {
    pending:  { label: 'Pending',  bg: '#fef3c7', text: '#d97706', dot: '#f59e0b', icon: 'clock' },
    approved: { label: 'Approved', bg: '#dcfce7', text: '#16a34a', dot: '#22c55e', icon: 'check-circle' },
    denied:   { label: 'Denied',   bg: '#fee2e2', text: '#dc2626', dot: '#ef4444', icon: 'x-circle' },
};

const fmtTime = (iso) => {
    if (!iso) return '--';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const fmtDate = (ts) => {
    if (!ts) return '--';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function LateCheckoutRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [fee, setFee] = useState(0);
    const [actionLoading, setActionLoading] = useState(null);
    const [hotelId, setHotelId] = useState(null);

    useEffect(() => {
        let unsubConf;
        let unsubReq;

        const init = async () => {
            const activeHotelId = await getStoredHotelId();
            setHotelId(activeHotelId);

            unsubConf = getHotelConfigRef(activeHotelId).onSnapshot(snap => {
                if (snap && snap.exists) {
                    const data = snap.data();
                    if (data && data.lateCheckoutFee) setFee(data.lateCheckoutFee);
                    else setFee(0);
                }
            });

            unsubReq = withHotelScope(firestore().collection('late_checkout_requests'), activeHotelId)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .onSnapshot(snap => {
                    if (snap) {
                        setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                    }
                    setLoading(false);
                });
        };

        init();

        return () => {
            unsubConf && unsubConf();
            unsubReq && unsubReq();
        };
    }, []);

    const handleApprove = async (req) => {
        setActionLoading(req.id + '_approve');
        try {
            const extraHours = req.extraHours || 1;
            const totalFee = extraHours * fee;

            await firestore().collection('late_checkout_requests').doc(req.id).update({
                status: 'approved',
                totalFee,
                approvedAt: firestore.FieldValue.serverTimestamp(),
            });

            // Update the actual checkout time in the room and guest records
            const roomSnap = await withHotelScope(firestore().collection('rooms'), hotelId)
                .where('roomNumber', '==', req.room.toString())
                .get();
            if (!roomSnap.empty) {
                const roomDoc = roomSnap.docs[0];
                const roomData = roomDoc.data();
                if (roomData.currentGuest) {
                    await roomDoc.ref.update({
                        'currentGuest.checkOut': req.requestedTime
                    });
                    
                    const gid = roomData.currentGuest.guestID;
                    if (gid) {
                        await firestore().collection('guests').doc(gid).update({
                            checkOut: req.requestedTime
                        });
                    }
                }
            }

            // Notify the guest via a messages write (guest listens on their chat)
            await firestore().collection('messages').add({
                hotelId,
                room: req.room,
                sender: 'Admin',
                text: `Your late checkout request has been approved! You may now check out at ${req.requestedTime}. A fee of ₹${totalFee} (₹${fee}/hr × ${extraHours} hr${extraHours > 1 ? 's' : ''}) will be added to your bill.`,
                timestamp: firestore.FieldValue.serverTimestamp(),
                seen: false,
                type: 'late_checkout_approved',
            });

            showToast(`Late checkout approved for Room ${req.room}`, 'success');
        } catch (e) {
            showToast('Failed to approve', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeny = async (req) => {
        setActionLoading(req.id + '_deny');
        try {
            await firestore().collection('late_checkout_requests').doc(req.id).update({
                status: 'denied',
                deniedAt: firestore.FieldValue.serverTimestamp(),
            });

            await firestore().collection('messages').add({
                hotelId,
                room: req.room,
                sender: 'Admin',
                text: `We're sorry, your late checkout request for Room ${req.room} could not be accommodated at this time. Please proceed with your original checkout time. Thank you for your understanding.`,
                timestamp: firestore.FieldValue.serverTimestamp(),
                seen: false,
                type: 'late_checkout_denied',
            });

            showToast(`Request denied for Room ${req.room}`, 'success');
        } catch (e) {
            showToast('Failed to deny', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = requests.filter(r => r.status === filter);

    const counts = {
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        denied: requests.filter(r => r.status === 'denied').length,
    };

    if (loading) return (
        <View style={styles.loader}>
            <ActivityIndicator size="large" color="#ec4899" />
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.title}>Late Checkout</Text>
                        <Text style={styles.subtitle}>Guest requests · Fee: ₹{fee}/hr</Text>
                    </View>
                    {counts.pending > 0 && (
                        <View style={styles.pendingBadge}>
                            <View style={styles.pendingDot} />
                            <Text style={styles.pendingBadgeText}>{counts.pending} PENDING</Text>
                        </View>
                    )}
                </View>

                {/* Filter tabs */}
                <View style={styles.tabs}>
                    {['pending', 'approved', 'denied'].map(tab => {
                        const sc = STATUS_CONFIG[tab];
                        const active = filter === tab;
                        return (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tab, active && { backgroundColor: sc.bg, borderColor: sc.dot }]}
                                onPress={() => setFilter(tab)}
                            >
                                <Icon name={sc.icon} size={12} color={active ? sc.text : '#94a3b8'} />
                                <Text style={[styles.tabText, active && { color: sc.text }]}>
                                    {sc.label} {counts[tab] > 0 ? `(${counts[tab]})` : ''}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
                {filtered.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Icon name="clock" size={28} color="#94a3b8" />
                        </View>
                        <Text style={styles.emptyTitle}>No {filter} requests</Text>
                        <Text style={styles.emptySub}>
                            {filter === 'pending' ? 'All clear — no guests waiting for late checkout approval.' :
                             filter === 'approved' ? 'No approved late checkouts yet.' :
                             'No denied requests.'}
                        </Text>
                    </View>
                ) : filtered.map(req => {
                    const sc = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                    const extraHours = req.extraHours || 1;
                    const totalFee = req.totalFee ?? (extraHours * fee);
                    return (
                        <View key={req.id} style={styles.card}>
                            {/* Card Header */}
                            <View style={styles.cardHeader}>
                                <View style={styles.cardRoomBadge}>
                                    <Text style={styles.cardRoomText}>RM</Text>
                                    <Text style={styles.cardRoomNum}>{req.room}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardGuest}>{req.guestName || 'Guest'}</Text>
                                    <Text style={styles.cardRequested}>Requested {fmtDate(req.createdAt)}</Text>
                                </View>
                                <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                                    <View style={[styles.statusDot, { backgroundColor: sc.dot }]} />
                                    <Text style={[styles.statusText, { color: sc.text }]}>{sc.label.toUpperCase()}</Text>
                                </View>
                            </View>

                            {/* Details */}
                            <View style={styles.detailsRow}>
                                <View style={styles.detailItem}>
                                    <Icon name="clock" size={12} color="#94a3b8" />
                                    <Text style={styles.detailLabel}>Original checkout</Text>
                                    <Text style={styles.detailValue}>{fmtTime(req.originalCheckout)}</Text>
                                </View>
                                <View style={styles.detailDivider} />
                                <View style={styles.detailItem}>
                                    <Icon name="arrow-right" size={12} color="#ec4899" />
                                    <Text style={styles.detailLabel}>Requested time</Text>
                                    <Text style={[styles.detailValue, { color: '#ec4899' }]}>{fmtTime(req.requestedTime)}</Text>
                                </View>
                                <View style={styles.detailDivider} />
                                <View style={styles.detailItem}>
                                    <Icon name="plus" size={12} color="#94a3b8" />
                                    <Text style={styles.detailLabel}>Extra hours</Text>
                                    <Text style={styles.detailValue}>{extraHours} hr{extraHours > 1 ? 's' : ''}</Text>
                                </View>
                            </View>

                            {/* Fee Preview */}
                            <View style={styles.feeRow}>
                                <View style={styles.feeLeft}>
                                    <Icon name="dollar-sign" size={13} color="#ec4899" />
                                    <Text style={styles.feeLabel}>Late checkout fee</Text>
                                    {req.note ? (
                                        <Text style={styles.noteText} numberOfLines={1}>· "{req.note}"</Text>
                                    ) : null}
                                </View>
                                <Text style={styles.feeValue}>₹{totalFee}</Text>
                            </View>

                            {/* Actions (only for pending) */}
                            {req.status === 'pending' && (
                                <View style={styles.cardActions}>
                                    <TouchableOpacity
                                        style={styles.denyBtn}
                                        onPress={() => handleDeny(req)}
                                        disabled={!!actionLoading}
                                    >
                                        {actionLoading === req.id + '_deny' ? (
                                            <ActivityIndicator size="small" color="#ef4444" />
                                        ) : (
                                            <>
                                                <Icon name="x" size={14} color="#ef4444" />
                                                <Text style={styles.denyBtnText}>Decline</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.approveBtn}
                                        onPress={() => handleApprove(req)}
                                        disabled={!!actionLoading}
                                    >
                                        {actionLoading === req.id + '_approve' ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <>
                                                <Icon name="check" size={14} color="#fff" />
                                                <Text style={styles.approveBtnText}>Approve · ₹{extraHours * fee}</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Approved/Denied info */}
                            {req.status === 'approved' && (
                                <View style={styles.resolvedBox}>
                                    <Icon name="check-circle" size={13} color="#16a34a" />
                                    <Text style={styles.resolvedText}>Approved · ₹{req.totalFee} collected · Guest notified via chat</Text>
                                </View>
                            )}
                            {req.status === 'denied' && (
                                <View style={[styles.resolvedBox, { backgroundColor: '#fef2f2' }]}>
                                    <Icon name="x-circle" size={13} color="#dc2626" />
                                    <Text style={[styles.resolvedText, { color: '#dc2626' }]}>Denied · Guest notified via chat</Text>
                                </View>
                            )}
                        </View>
                    );
                })}
                <View style={{ height: 32 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
    container: { flex: 1, backgroundColor: '#f9fafb' },

    header: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    title: { fontSize: 26, fontWeight: '900', color: '#0f172a' },
    subtitle: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '600' },
    pendingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 6 },
    pendingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b' },
    pendingBadgeText: { fontSize: 10, fontWeight: '900', color: '#d97706', letterSpacing: 1 },

    tabs: { flexDirection: 'row', gap: 8 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0' },
    tabText: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' },

    list: { padding: 16, gap: 14 },

    emptyState: { alignItems: 'center', paddingVertical: 80 },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    emptySub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 6, lineHeight: 18, paddingHorizontal: 32 },

    card: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, elevation: 2 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    cardRoomBadge: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    cardRoomText: { fontSize: 7, fontWeight: '900', color: '#94a3b8', letterSpacing: 0.5 },
    cardRoomNum: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
    cardGuest: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
    cardRequested: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusDot: { width: 5, height: 5, borderRadius: 3 },
    statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },

    detailsRow: { flexDirection: 'row', padding: 14 },
    detailItem: { flex: 1, alignItems: 'center', gap: 4 },
    detailDivider: { width: 1, backgroundColor: '#f1f5f9' },
    detailLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
    detailValue: { fontSize: 14, fontWeight: '900', color: '#0f172a' },

    feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 14, marginBottom: 14, backgroundColor: '#fff5fb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
    feeLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    feeLabel: { fontSize: 12, fontWeight: '700', color: '#9d174d' },
    noteText: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', flex: 1 },
    feeValue: { fontSize: 18, fontWeight: '900', color: '#ec4899' },

    cardActions: { flexDirection: 'row', gap: 10, padding: 14, paddingTop: 0 },
    denyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 14, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
    denyBtnText: { fontSize: 13, fontWeight: '800', color: '#ef4444' },
    approveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 14, backgroundColor: '#ec4899', shadowColor: '#ec4899', shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
    approveBtnText: { fontSize: 13, fontWeight: '900', color: '#fff' },

    resolvedBox: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 14, marginTop: 0, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12 },
    resolvedText: { fontSize: 11, fontWeight: '700', color: '#16a34a', flex: 1 },
});

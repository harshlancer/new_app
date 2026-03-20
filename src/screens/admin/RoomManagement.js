import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal,
    TextInput, ActivityIndicator, Platform, Vibration, Animated,
    Easing, Pressable, KeyboardAvoidingView, ActionSheetIOS, Image
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Feather';
import { showToast } from '../../../App';
import { getStoredHotelId, withHotelScope } from '../../utils/hotelSession';

// ─── Room Type Options ───────────────────────────────────────────────────────
const ROOM_TYPES = [
    { label: 'Deluxe Room',       icon: 'home',       color: '#6366f1' },
    { label: 'Junior Suite',      icon: 'star',       color: '#f59e0b' },
    { label: 'Executive Suite',   icon: 'briefcase',  color: '#0ea5e9' },
    { label: 'Presidential Suite',icon: 'award',      color: '#ec4899' },
    { label: 'Standard Room',     icon: 'square',     color: '#10b981' },
    { label: 'Family Room',       icon: 'users',      color: '#8b5cf6' },
];

const STATUS_COLORS = {
    Ready:       { bg: '#f0fdf4', text: '#166534', dot: '#22c55e', badge: '#dcfce7' },
    Occupied:    { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6', badge: '#dbeafe' },
    Cleaning:    { bg: '#fff7ed', text: '#c2410c', dot: '#f59e0b', badge: '#ffedd5' },
    Maintenance: { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444', badge: '#fee2e2' },
};

export default function RoomManagement() {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [hotelId, setHotelId] = useState(null);

    // ─── Room Detail ───────────────────────────────────────────────────────
    const [detailRoom, setDetailRoom] = useState(null);
    const [roomOrders, setRoomOrders] = useState([]);
    const detailSheetAnim = useRef(new Animated.Value(900)).current;
    const detailOverlayAnim = useRef(new Animated.Value(0)).current;

    // ─── Add Room ──────────────────────────────────────────────────────────
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [newRoomNumber, setNewRoomNumber] = useState('');
    const [newFloor, setNewFloor] = useState('');
    const [newType, setNewType] = useState(ROOM_TYPES[0]);
    const [newImageUrl, setNewImageUrl] = useState('');
    const [addLoading, setAddLoading] = useState(false);
    const sheetAnim = useRef(new Animated.Value(900)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;
    
    // ─── Animations ───────────────────────────────────────────────────────
    const fabAnim = useRef(new Animated.Value(0)).current;
    const fabRotate = useRef(new Animated.Value(0)).current;
    const deleteShake = useRef(new Animated.Value(0)).current;

    // ─── Modals State ──────────────────────────────────────────────────────
    const [deleteRoom, setDeleteRoom] = useState(null);
    const [allotRoom, setAllotRoom] = useState(null);
    const [maintRoom, setMaintRoom] = useState(null);
    const [checkoutRoom, setCheckoutRoom] = useState(null);
    const [guestKeyModal, setGuestKeyModal] = useState(null);

    // ─── Form Inputs ───────────────────────────────────────────────────────
    const [guestName, setGuestName] = useState('');
    const [checkIn, setCheckIn] = useState(new Date());
    const [checkOut, setCheckOut] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() + 2); return d;
    });
    const [maintIssue, setMaintIssue] = useState('');
    const [showCheckIn, setShowCheckIn] = useState(false);
    const [showCheckOut, setShowCheckOut] = useState(false);
    const [showGuestIdModal, setShowGuestIdModal] = useState(null); // { id: 'GUEST123', room: '101' }

    // ─── Helpers ──────────────────────────────────────────────────────────
    const toDate = (val) => {
        if (!val) return null;
        if (val instanceof Date) return val;
        if (val?.toDate) return val.toDate();
        const p = new Date(val); return isNaN(p.getTime()) ? null : p;
    };

    const formatTime = (iso) => {
        const d = toDate(iso);
        return d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
    };

    const formatDateTime = (dateObj) => {
        const d = toDate(dateObj);
        return d ? d.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '--';
    };

    const handleCopyGuestId = (id) => {
        Clipboard.setString(id);
        Vibration.vibrate(10);
        showToast('Guest ID copied to clipboard!', 'success');
    };

    const triggerDeleteShake = () => {
        Animated.sequence([
            Animated.timing(deleteShake, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(deleteShake, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(deleteShake, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(deleteShake, { toValue: -6, duration: 60, useNativeDriver: true }),
            Animated.timing(deleteShake, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    // ─── Effects ──────────────────────────────────────────────────────────
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(fabAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
                Animated.timing(fabAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    useEffect(() => {
        let unsubscribe;

        const init = async () => {
            const activeHotelId = await getStoredHotelId();
            setHotelId(activeHotelId);
            unsubscribe = withHotelScope(firestore().collection('rooms'), activeHotelId)
                .orderBy('roomNumber', 'asc')
                .onSnapshot(snap => {
                    if (snap) {
                        if (snap.empty) {
                            seedRooms(activeHotelId);
                        } else {
                            setRooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                            setLoading(false);
                        }
                    }
                });
        };

        init();
        return () => unsubscribe && unsubscribe();
    }, []);

    // Listen for orders when a room is selected
    useEffect(() => {
        if (detailRoom) {
            const unsub = withHotelScope(firestore().collection('orders'), hotelId)
                .where('room', '==', detailRoom.roomNumber.toString())
                .orderBy('createdAt', 'desc')
                .limit(10)
                .onSnapshot(snap => {
                    if (snap) {
                        setRoomOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                    }
                }, err => console.log('Order fetch err', err));
            return unsub;
        }
    }, [detailRoom]);

    const seedRooms = async (activeHotelId) => {
        const batch = firestore().batch();
        const initial = [
            { roomNumber: '101', type: 'Deluxe Room', status: 'Ready', floor: '1', hotelId: activeHotelId },
            { roomNumber: '102', type: 'Junior Suite', status: 'Ready', floor: '1', hotelId: activeHotelId },
            { roomNumber: '201', type: 'Executive Suite', status: 'Ready', floor: '2', hotelId: activeHotelId },
        ];
        initial.forEach(r => batch.set(firestore().collection('rooms').doc(r.roomNumber), r));
        await batch.commit();
        setLoading(false);
    };

    // ─── Add Room Sheet ───────────────────────────────────────────────────
    const openAddModal = () => {
        setAddModalVisible(true);
        Vibration.vibrate(15);
        Animated.parallel([
            Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }),
            Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.timing(fabRotate, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
    };

    const closeAddModal = () => {
        Animated.parallel([
            Animated.timing(sheetAnim, { toValue: 900, duration: 320, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
            Animated.timing(overlayAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
            Animated.timing(fabRotate, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => {
            setAddModalVisible(false);
            setNewRoomNumber(''); setNewFloor(''); setNewType(ROOM_TYPES[0]); setNewImageUrl('');
        });
    };

    const handleAddRoom = async () => {
        if (!newRoomNumber.trim()) return showToast('Enter room number', 'warning');
        if (!newFloor.trim()) return showToast('Enter floor', 'warning');
        if (rooms.find(r => r.roomNumber === newRoomNumber.trim())) return showToast('Room exists!', 'warning');

        setAddLoading(true);
        try {
            await firestore().collection('rooms').doc(newRoomNumber.trim()).set({
                roomNumber: newRoomNumber.trim(), floor: newFloor.trim(),
                type: newType.label, status: 'Ready',
                imageUrl: newImageUrl.trim(),
                hotelId,
            });
            Vibration.vibrate([0, 20, 50, 20]);
            showToast('Room added!', 'success');
            closeAddModal();
        } catch (e) { showToast('Add failed', 'error'); } finally { setAddLoading(false); }
    };

    // ─── Room Detail Sheet ──────────────────────────────────────────────────
    const openDetail = (room) => {
        setDetailRoom(room);
        Animated.parallel([
            Animated.spring(detailSheetAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
            Animated.timing(detailOverlayAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
        ]).start();
    };

    const closeDetail = () => {
        Animated.parallel([
            Animated.timing(detailSheetAnim, { toValue: 900, duration: 300, useNativeDriver: true }),
            Animated.timing(detailOverlayAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]).start(() => setDetailRoom(null));
    };

    // ─── Room Actions ─────────────────────────────────────────────────────
    const handleCheckOutSubmit = async () => {
        if (!checkoutRoom) return;
        const gid = checkoutRoom.currentGuest?.guestID;
        
        try {
            // Update guest record for CRM/History
            if (gid) {
                await firestore().collection('guests').doc(gid).update({ 
                    status: 'Inactive', 
                    checkedOutAt: new Date().toISOString() 
                });
            }

            // Update room status
            await firestore().collection('rooms').doc(checkoutRoom.id).update({
                status: 'Cleaning', 
                currentGuest: firestore.FieldValue.delete()
            });

            showToast(`Room ${checkoutRoom.roomNumber} is now cleaning`, 'success');
        } catch (error) {
            showToast('Checkout failed', 'error');
        } finally {
            setCheckoutRoom(null);
            closeDetail();
        }
    };

    const markReady = async (room) => {
        await firestore().collection('rooms').doc(room.id).update({ status: 'Ready' });
        showToast(`Room ${room.roomNumber} is Ready`, 'success');
        if (detailRoom?.id === room.id) closeDetail();
    };

    const deleteConfirm = async () => {
        if (!deleteRoom) return;
        await firestore().collection('rooms').doc(deleteRoom.id).delete();
        showToast('Room removed', 'success');
        setDeleteRoom(null);
        closeDetail();
    };

    const filtered = filter === 'All' ? rooms : rooms.filter(r => r.status === filter);
    const fabRotateVal = fabRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
    const fabScale = fabAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

    if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#6366f1" /></View>;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.headerTitle}>Inventory</Text>
                        <Text style={styles.headerSub}>{rooms.length} Rooms Total</Text>
                    </View>
                    <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                    {['All', 'Ready', 'Occupied', 'Cleaning', 'Maintenance'].map(f => (
                        <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
                            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Grid */}
            <ScrollView contentContainerStyle={styles.grid}>
                {filtered.map(room => {
                    const sc = STATUS_COLORS[room.status] || STATUS_COLORS.Ready;
                    return (
                        <TouchableOpacity key={room.id} style={styles.card} activeOpacity={0.9} onPress={() => openDetail(room)}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.roomBadge, { backgroundColor: sc.bg }]}>
                                    <Text style={[styles.roomBadgeNum, { color: sc.text }]}>{room.roomNumber}</Text>
                                </View>
                                <View style={[styles.statusTag, { backgroundColor: sc.badge }]}>
                                    <View style={[styles.statusDot, { backgroundColor: sc.dot }]} />
                                    <Text style={[styles.statusTagText, { color: sc.text }]}>{room.status}</Text>
                                </View>
                            </View>
                            <Text style={styles.cardType}>{room.type}</Text>
                            {room.status === 'Occupied' && room.currentGuest && (
                                <View style={styles.guestRow}>
                                    <Icon name="user" size={10} color="#64748b" />
                                    <Text style={styles.guestName} numberOfLines={1}>{room.currentGuest.name}</Text>
                                </View>
                            )}
                            <View style={styles.cardFooter}>
                                <Text style={styles.floorText}>FLOOR {room.floor}</Text>
                                <Icon name="chevron-right" size={12} color="#cbd5e1" />
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity 
                style={styles.fabContainer} 
                activeOpacity={0.9} 
                onPress={openAddModal}
            >
                <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
                    <Animated.View style={{ transform: [{ rotate: fabRotateVal }] }}>
                        <Icon name="plus" size={28} color="#fff" />
                    </Animated.View>
                </Animated.View>
            </TouchableOpacity>

            {/* ── Add Modal ── */}
            <Modal visible={addModalVisible} transparent animationType="none">
                <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
                    <Pressable style={{ flex: 1 }} onPress={closeAddModal} />
                </Animated.View>
                <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetAnim }] }]}>
                    <View style={styles.sheetHandle} />
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>New Room Registration</Text>
                        <TouchableOpacity onPress={closeAddModal} style={styles.closeBtn}><Icon name="x" size={20} color="#94a3b8" /></TouchableOpacity>
                    </View>
                    <ScrollView style={{ padding: 24 }}>
                        <View style={styles.inputGroup}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>ROOM NO</Text>
                                <TextInput style={styles.textInput} placeholder="101" value={newRoomNumber} onChangeText={setNewRoomNumber} />
                            </View>
                            <View style={{ width: 16 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>FLOOR</Text>
                                <TextInput style={styles.textInput} placeholder="1" value={newFloor} onChangeText={setNewFloor} keyboardType="numeric" />
                            </View>
                        </View>
                        
                        <Text style={styles.inputLabel}>ROOM IMAGE URL (OPTIONAL)</Text>
                        <TextInput 
                            style={[styles.textInput, { marginBottom: 12 }]} 
                            placeholder="https://..." 
                            value={newImageUrl} 
                            onChangeText={setNewImageUrl} 
                            autoCapitalize="none" 
                        />

                        <Text style={styles.inputLabel}>ROOM TYPE</Text>
                        <View style={styles.typeGrid}>
                            {ROOM_TYPES.map(rt => (
                                <TouchableOpacity 
                                    key={rt.label} 
                                    style={[styles.typeBtn, newType.label === rt.label && { backgroundColor: rt.color, borderColor: rt.color }]} 
                                    onPress={() => setNewType(rt)}
                                >
                                    <Icon name={rt.icon} size={14} color={newType.label === rt.label ? '#fff' : rt.color} />
                                    <Text style={[styles.typeBtnText, newType.label === rt.label && { color: '#fff' }]}>{rt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.submitBtn} onPress={handleAddRoom} disabled={addLoading}>
                            {addLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Add Room</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </Modal>

            {/* ── Detail Modal ── */}
            <Modal visible={!!detailRoom} transparent animationType="none">
                <Animated.View style={[styles.overlay, { opacity: detailOverlayAnim }]}>
                    <Pressable style={{ flex: 1 }} onPress={closeDetail} />
                </Animated.View>
                <Animated.View style={[styles.sheet, { transform: [{ translateY: detailSheetAnim }], minHeight: '60%' }]}>
                    <View style={styles.sheetHandle} />
                    {detailRoom && (
                        <ScrollView style={{ padding: 24 }}>
                            {detailRoom.imageUrl ? (
                                <Image source={{ uri: detailRoom.imageUrl }} style={{ width: '100%', height: 160, borderRadius: 16, marginBottom: 16 }} />
                            ) : null}
                            <View style={styles.detailHeader}>
                                <View>
                                    <Text style={styles.detailRoomNum}>Room {detailRoom.roomNumber}</Text>
                                    <Text style={styles.detailType}>{detailRoom.type}</Text>
                                </View>
                                <View style={[styles.statusLarge, { backgroundColor: STATUS_COLORS[detailRoom.status].bg }]}>
                                    <Text style={[styles.statusLargeText, { color: STATUS_COLORS[detailRoom.status].text }]}>{detailRoom.status}</Text>
                                </View>
                            </View>

                            {detailRoom.status === 'Occupied' && (
                                <View style={styles.detailSection}>
                                    <Text style={styles.sectionTitle}>RESIDENT GUEST</Text>
                                    <View style={styles.guestCard}>
                                        <View style={styles.guestMain}>
                                            <View style={styles.avatar}><Text style={styles.avatarText}>{detailRoom.currentGuest.name[0]}</Text></View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.guestNameLarge}>{detailRoom.currentGuest.name}</Text>
                                                <TouchableOpacity style={styles.copyId} onPress={() => handleCopyGuestId(detailRoom.currentGuest.guestID)}>
                                                    <Text style={styles.idText}>ID: {detailRoom.currentGuest.guestID}</Text>
                                                    <Icon name="copy" size={10} color="#3b82f6" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                        <View style={styles.timeRow}>
                                            <View style={styles.timeBox}>
                                                <Text style={styles.timeLabel}>CHECK-IN</Text>
                                                <Text style={styles.timeVal}>{formatDateTime(detailRoom.currentGuest.checkIn)}</Text>
                                            </View>
                                            <View style={styles.timeBox}>
                                                <Text style={styles.timeLabel}>CHECK-OUT</Text>
                                                <Text style={styles.timeVal}>{formatDateTime(detailRoom.currentGuest.checkOut)}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <Text style={styles.sectionTitle}>RECENT ORDERS</Text>
                                    <View style={styles.orderList}>
                                        {roomOrders.length === 0 ? <Text style={styles.emptyText}>No recent orders</Text> : 
                                            roomOrders.map(order => (
                                                <View key={order.id} style={styles.orderItem}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.orderDesc} numberOfLines={1}>{order.items?.map(i => i.name).join(', ') || order.type}</Text>
                                                        <Text style={styles.orderTime}>{formatTime(order.createdAt)}</Text>
                                                    </View>
                                                    <Text style={styles.orderPrice}>₹{order.total || 0}</Text>
                                                </View>
                                            ))
                                        }
                                    </View>
                                </View>
                            )}

                            <View style={styles.actionsGrid}>
                                {detailRoom.status === 'Ready' && (
                                    <TouchableOpacity style={styles.actionBtnLarge} onPress={() => { setAllotRoom(detailRoom); closeDetail(); }}>
                                        <Icon name="user-plus" size={20} color="#3b82f6" />
                                        <Text style={[styles.actionBtnText, { color: '#3b82f6' }]}>Allot Guest</Text>
                                    </TouchableOpacity>
                                )}
                                {detailRoom.status === 'Occupied' && (
                                    <TouchableOpacity style={[styles.actionBtnLarge, { borderColor: '#fecaca' }]} onPress={() => setCheckoutRoom(detailRoom)}>
                                        <Icon name="log-out" size={20} color="#ef4444" />
                                        <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Guest Checkout</Text>
                                    </TouchableOpacity>
                                )}
                                {(detailRoom.status === 'Cleaning' || detailRoom.status === 'Maintenance') && (
                                    <TouchableOpacity style={[styles.actionBtnLarge, { borderColor: '#bbf7d0' }]} onPress={() => markReady(detailRoom)}>
                                        <Icon name="check-circle" size={20} color="#10b981" />
                                        <Text style={[styles.actionBtnText, { color: '#10b981' }]}>Mark Ready</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity style={[styles.actionBtnLarge, { borderColor: '#fed7aa' }]} onPress={() => { setMaintRoom(detailRoom); closeDetail(); }}>
                                    <Icon name="tool" size={20} color="#f59e0b" />
                                    <Text style={[styles.actionBtnText, { color: '#f59e0b' }]}>Maintenance</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={styles.dangerBtn} onPress={() => { setDeleteRoom(detailRoom); triggerDeleteShake(); }}>
                                <Icon name="trash-2" size={16} color="#ef4444" />
                                <Text style={styles.dangerBtnText}>Delete Room from Inventory</Text>
                            </TouchableOpacity>
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    )}
                </Animated.View>
            </Modal>

            {/* Delete Modal */}
            <Modal visible={!!deleteRoom} transparent animationType="fade">
                <View style={styles.deleteOverlay}>
                    <Animated.View style={[styles.deleteCard, { transform: [{ translateX: deleteShake }] }]}>
                        <Icon name="alert-triangle" size={40} color="#ef4444" />
                        <Text style={styles.deleteTitle}>Delete {deleteRoom?.roomNumber}?</Text>
                        <Text style={styles.deleteSub}>This action is permanent and will remove all room history.</Text>
                        <View style={styles.deleteActions}>
                            <TouchableOpacity style={styles.cancelLink} onPress={() => setDeleteRoom(null)}><Text style={styles.cancelText}>CANCEL</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.confirmDelete} onPress={deleteConfirm}><Text style={styles.confirmText}>DELETE</Text></TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* Standard Modals (Allot, Checkout, Maint) omitted for brevity or integrated above */}
            {/* ── Maintenance Modal ── */}
            <Modal visible={!!maintRoom} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Maintenance: {maintRoom?.roomNumber}</Text>
                        <TextInput style={styles.textInput} placeholder="Describe the issue..." value={maintIssue} onChangeText={setMaintIssue} />
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setMaintRoom(null)}><Text style={styles.cancelLinkText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={async () => {
                                await firestore().collection('rooms').doc(maintRoom.id).update({ status: 'Maintenance' });
                                await firestore().collection('maintenance').add({ room: maintRoom.roomNumber, issue: maintIssue, status: 'Active', createdAt: firestore.FieldValue.serverTimestamp(), hotelId });
                                setMaintRoom(null); setMaintIssue(''); showToast('Maintenance logged', 'success');
                            }}><Text style={styles.saveBtnText}>Log Task</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Checkout Modal ── */}
            <Modal visible={!!checkoutRoom} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Checkout Guest?</Text>
                        <Text style={styles.modalSub}>Finalize stay for Room {checkoutRoom?.roomNumber}. Room will be marked for Cleaning.</Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setCheckoutRoom(null)}><Text style={styles.cancelLinkText}>Close</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#ef4444' }]} onPress={handleCheckOutSubmit}><Text style={styles.saveBtnText}>Confirm Checkout</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Allot Modal ── */}
            <Modal visible={!!allotRoom} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.allotHeader}>
                            <View style={[styles.allotIcon, { backgroundColor: '#f1f5f9' }]}>
                                <Icon name="user-plus" size={24} color="#6366f1" />
                            </View>
                            <View>
                                <Text style={styles.allotTitle}>New Allotment</Text>
                                <Text style={styles.allotSub}>Room {allotRoom?.roomNumber} · {allotRoom?.type}</Text>
                            </View>
                        </View>

                        <Text style={styles.inputLabel}>GUEST INFORMATION</Text>
                        <TextInput 
                            style={styles.textInput} 
                            placeholder="Enter Guest Full Name" 
                            placeholderTextColor="#94a3b8"
                            value={guestName} 
                            onChangeText={setGuestName} 
                        />
                        
                        <View style={styles.dtGrid}>
                            <View style={styles.dtSection}>
                                <Text style={styles.dtLabel}>SCHEDULED CHECK-IN</Text>
                                <View style={styles.dtRow}>
                                    <TouchableOpacity style={styles.dtBtn} onPress={() => {
                                        if (Platform.OS === 'android') DateTimePickerAndroid.open({ value: checkIn, mode: 'date', onChange: (e, d) => d && setCheckIn(d) });
                                    }}>
                                        <Icon name="calendar" size={14} color="#6366f1" />
                                        <Text style={styles.dtText}>{checkIn.toLocaleDateString()}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.dtBtn} onPress={() => {
                                        if (Platform.OS === 'android') DateTimePickerAndroid.open({ value: checkIn, mode: 'time', is24Hour: true, onChange: (e, d) => d && setCheckIn(d) });
                                    }}>
                                        <Icon name="clock" size={14} color="#6366f1" />
                                        <Text style={styles.dtText}>{checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.dtSection}>
                                <Text style={styles.dtLabel}>SCHEDULED CHECK-OUT</Text>
                                <View style={styles.dtRow}>
                                    <TouchableOpacity style={styles.dtBtn} onPress={() => {
                                        if (Platform.OS === 'android') DateTimePickerAndroid.open({ value: checkOut, mode: 'date', onChange: (e, d) => d && setCheckOut(d) });
                                    }}>
                                        <Icon name="calendar" size={14} color="#ef4444" />
                                        <Text style={styles.dtText}>{checkOut.toLocaleDateString()}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.dtBtn} onPress={() => {
                                        if (Platform.OS === 'android') DateTimePickerAndroid.open({ value: checkOut, mode: 'time', is24Hour: true, onChange: (e, d) => d && setCheckOut(d) });
                                    }}>
                                        <Icon name="clock" size={14} color="#ef4444" />
                                        <Text style={styles.dtText}>{checkOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelAction} onPress={() => setAllotRoom(null)}>
                                <Text style={styles.cancelActionText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmAction} onPress={async () => {
                                if (!guestName) return showToast('Enter name', 'warning');
                                const gid = `GUEST${Math.floor(Math.random() * 899) + 100}`;
                                
                                const guestInfo = { 
                                    name: guestName, 
                                    guestID: gid, 
                                    checkIn: checkIn.toISOString(), 
                                    checkOut: checkOut.toISOString(),
                                    room: allotRoom.roomNumber,
                                    status: 'Active',
                                    hotelId,
                                };

                                try {
                                    await firestore().collection('rooms').doc(allotRoom.id).update({
                                        status: 'Occupied',
                                        currentGuest: guestInfo
                                    });
                                    await firestore().collection('guests').doc(gid).set(guestInfo);
                                    showToast('Guest successfully allotted!', 'success');
                                    setShowGuestIdModal({ id: gid, room: allotRoom.roomNumber });
                                } catch (e) {
                                    showToast('Error allotting guest', 'error');
                                } finally {
                                    setAllotRoom(null); 
                                    setGuestName('');
                                }
                            }}>
                                <Text style={styles.confirmActionText}>Process Allotment</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Success Modal with Guest ID */}
            <Modal visible={!!showGuestIdModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.successModal}>
                        <View style={styles.successIcon}>
                            <Icon name="check-circle" size={40} color="#10b981" />
                        </View>
                        <Text style={styles.successTitle}>Allotment Successful!</Text>
                        <Text style={styles.successSub}>Room {showGuestIdModal?.room} is now occupied.</Text>
                        
                        <View style={styles.idBox}>
                            <Text style={styles.idLabel}>SHARE THIS GUEST ID</Text>
                            <Text style={styles.idVal}>{showGuestIdModal?.id}</Text>
                        </View>

                        <TouchableOpacity 
                            style={styles.copyLongBtn}
                            onPress={() => {
                                Clipboard.setString(showGuestIdModal?.id || '');
                                showToast('Guest ID copied', 'success');
                            }}
                        >
                            <Icon name="copy" size={16} color="#fff" />
                            <Text style={styles.copyLongBtnText}>Copy & Close</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.closeLink}
                            onPress={() => setShowGuestIdModal(null)}
                        >
                            <Text style={styles.closeLinkText}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Success Modal with Guest ID */}
            <Modal visible={!!showGuestIdModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.successModal}>
                        <View style={styles.successIcon}>
                            <Icon name="check-circle" size={40} color="#10b981" />
                        </View>
                        <Text style={styles.successTitle}>Allotment Successful!</Text>
                        <Text style={styles.successSub}>Room {showGuestIdModal?.room} is now occupied.</Text>
                        
                        <View style={styles.idBox}>
                            <Text style={styles.idLabel}>SHARE THIS GUEST ID</Text>
                            <Text style={styles.idVal}>{showGuestIdModal?.id}</Text>
                        </View>

                        <TouchableOpacity 
                            style={styles.copyLongBtn}
                            onPress={() => {
                                Clipboard.setString(showGuestIdModal?.id || '');
                                showToast('Guest ID copied', 'success');
                            }}
                        >
                            <Icon name="copy" size={16} color="#fff" />
                            <Text style={styles.copyLongBtnText}>Copy & Close</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.closeLink}
                            onPress={() => setShowGuestIdModal(null)}
                        >
                            <Text style={styles.closeLinkText}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 24, paddingTop: 60, backgroundColor: '#fff' },
    headerTitle: { fontSize: 32, fontWeight: '900', color: '#0f172a' },
    headerSub: { fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 4 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e', marginRight: 6 },
    liveText: { fontSize: 10, fontWeight: '900', color: '#16a34a' },
    filterRow: { marginTop: 24, flexDirection: 'row' },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 10 },
    filterChipActive: { backgroundColor: '#0f172a' },
    filterChipText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
    filterChipTextActive: { color: '#fff' },
    grid: { padding: 12, flexDirection: 'row', flexWrap: 'wrap' },
    card: { width: '46.5%', backgroundColor: '#fff', margin: '1.75%', borderRadius: 24, padding: 18, shadowColor: '#000', shadowOpacity: 0.05, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    roomBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    roomBadgeNum: { fontSize: 18, fontWeight: '900' },
    statusTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusDot: { width: 5, height: 5, borderRadius: 3, marginRight: 5 },
    statusTagText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
    cardType: { fontSize: 12, fontWeight: '900', color: '#475569', marginBottom: 8 },
    guestRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 8, borderRadius: 10, marginBottom: 10 },
    guestName: { fontSize: 10, fontWeight: '700', color: '#1e40af', flex: 1, marginLeft: 6 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, marginTop: 4 },
    floorText: { fontSize: 9, fontWeight: '900', color: '#94a3b8' },
    fabContainer: { position: 'absolute', bottom: 30, right: 30, zIndex: 999 },
    fab: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.6)' },
    sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 40 },
    sheetHandle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    sheetTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
    closeBtn: { padding: 5 },
    inputGroup: { flexDirection: 'row', marginBottom: 20 },
    inputLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 8 },
    textInput: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 15, fontWeight: '700', color: '#0f172a' },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    typeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: '#f1f5f9', gap: 8 },
    typeBtnText: { fontSize: 12, fontWeight: '800' },
    submitBtn: { backgroundColor: '#0f172a', padding: 18, borderRadius: 18, alignItems: 'center' },
    submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    detailRoomNum: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
    detailType: { fontSize: 14, fontWeight: '700', color: '#64748b' },
    statusLarge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    statusLargeText: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
    sectionTitle: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 12, marginTop: 16 },
    guestCard: { backgroundColor: '#f8fafc', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#e2e8f0' },
    guestMain: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
    guestNameLarge: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    copyId: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    idText: { fontSize: 11, color: '#3b82f6', fontWeight: '800' },
    timeRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 16 },
    timeBox: { flex: 1 },
    timeLabel: { fontSize: 8, fontWeight: '900', color: '#94a3b8' },
    timeVal: { fontSize: 12, fontWeight: '800', color: '#1e293b', marginTop: 2 },
    orderList: { backgroundColor: '#fff', borderRadius: 20, padding: 4 },
    orderItem: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
    orderDesc: { fontSize: 13, fontWeight: '700', color: '#334155' },
    orderTime: { fontSize: 10, color: '#94a3b8' },
    orderPrice: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
    emptyText: { fontSize: 12, color: '#94a3b8', padding: 12 },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 24 },
    actionBtnLarge: { flex: 1, minWidth: '45%', backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center', gap: 8 },
    actionBtnText: { fontSize: 12, fontWeight: '900' },
    dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24, padding: 16, borderRadius: 20, backgroundColor: '#fff1f2' },
    dangerBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '900' },
    deleteOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 30 },
    deleteCard: { backgroundColor: '#fff', padding: 30, borderRadius: 32, alignItems: 'center', width: '100%' },
    deleteTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginTop: 16 },
    deleteSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 20 },
    deleteActions: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 30 },
    cancelText: { fontSize: 13, fontWeight: '900', color: '#94a3b8' },
    confirmDelete: { backgroundColor: '#ef4444', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
    confirmText: { color: '#fff', fontWeight: '900' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', padding: 40, borderRadius: 32, width: '95%', maxWidth: 540 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 20 },
    modalSub: { fontSize: 13, color: '#64748b', marginBottom: 16 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20, marginTop: 24 },
    cancelLinkText: { fontSize: 14, fontWeight: '800', color: '#94a3b8' },
    saveBtn: { backgroundColor: '#0f172a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
    saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, backgroundColor: '#f1f5f9', padding: 14, borderRadius: 14 },
    dateText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
    
    // Success Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    successModal: { backgroundColor: '#fff', borderRadius: 32, padding: 32, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    successTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
    successSub: { fontSize: 14, color: '#64748b', marginBottom: 24 },
    idBox: { width: '100%', backgroundColor: '#f8fafc', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', marginBottom: 20 },
    idLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 8 },
    idVal: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: 2 },
    copyLongBtn: { backgroundColor: '#0f172a', width: '100%', padding: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    copyLongBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    closeLink: { marginTop: 16, padding: 10 },
    closeLinkText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
    
    // Allotment Redesign Styles
    allotHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    allotIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    allotTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
    allotSub: { fontSize: 13, color: '#64748b', fontWeight: '700', marginTop: 2 },
    cancelAction: { flex: 1, padding: 18, alignItems: 'center' },
    cancelActionText: { fontSize: 14, fontWeight: '800', color: '#94a3b8' },
    confirmAction: { flex: 1, backgroundColor: '#0f172a', padding: 18, borderRadius: 18, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
    confirmActionText: { color: '#fff', fontSize: 14, fontWeight: '900' },

    // Date/Time styles
    dtGrid: { gap: 16, marginTop: 16, marginBottom: 8 },
    dtSection: {},
    dtLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 8 },
    dtRow: { flexDirection: 'row', gap: 10 },
    dtBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
    dtText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
});

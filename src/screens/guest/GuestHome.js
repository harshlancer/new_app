import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ImageBackground, ActivityIndicator, Modal, TextInput,
    Animated, Easing, Vibration, StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../../../App';
import { NotificationService } from '../../utils/NotificationService';
import { openExternalLink } from '../../utils/externalLinks';

export default function GuestHome({ navigation }) {
    const insets = useSafeAreaInsets();
    const [guest, setGuest] = useState(null);
    const [reqActivities, setReqActivities] = useState([]);
    const [lcActivities, setLcActivities] = useState([]);
    const [hotelName, setHotelName] = useState('RoomFlow Hotel');
    const [lateCheckoutFee, setLateCheckoutFee] = useState(0);
    const [googleMapsLink, setGoogleMapsLink] = useState('');

    // Late Checkout modal state
    const [lcModalVisible, setLcModalVisible] = useState(false);
    const [lcHours, setLcHours] = useState('1');
    const [lcNote, setLcNote] = useState('');
    const [lcLoading, setLcLoading] = useState(false);
    const [existingLcReq, setExistingLcReq] = useState(null);

    const sheetAnim = useRef(new Animated.Value(600)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadInitialSession();

        const unsubConfig = firestore().collection('hotel_config').doc('settings').onSnapshot(snap => {
            if (!snap?.exists) {
                setHotelName('RoomFlow Hotel');
                setLateCheckoutFee(0);
                return;
            }

            const d = snap.data() || {};
            setHotelName(d.hotelName || 'RoomFlow Hotel');
            setLateCheckoutFee(d.lateCheckoutFee != null ? d.lateCheckoutFee : 0);
            setGoogleMapsLink(d.googleMapsLink || '');
        });

        return unsubConfig;
    }, []);

    const loadInitialSession = async () => {
        const stored = await AsyncStorage.getItem('guest_session');
        if (!stored) return;
        setGuest(JSON.parse(stored));
    };

    useEffect(() => {
        if (!guest?.room) return;
        const roomNum = guest.room.toString();
        
        // 1. Room Status Listener (Check-out/Sync)
        const unsubRoom = firestore().collection('rooms').where('roomNumber', '==', roomNum).onSnapshot(snap => {
            if (snap && !snap.empty) {
                const roomData = snap.docs[0].data();
                if (roomData.currentGuest && roomData.currentGuest.guestID === guest.guestID) {
                    setGuest(prev => ({ ...prev, ...roomData.currentGuest, roomImageUrl: roomData.imageUrl }));
                } else {
                    setGuest(null);
                    AsyncStorage.removeItem('guest_session');
                    navigation.replace('Login');
                }
            }
        });

        // 2. Service Requests Listener (Orders/Amenities)
        const unsubReqs = firestore()
            .collection('requests')
            .where('room', '==', roomNum)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .onSnapshot(snap => {
                if (snap) {
                    setReqActivities(snap.docs.map(doc => ({ id: doc.id, feedType: 'request', ...doc.data() })));
                }
            });

        // 3. Late Checkout Requests Listener
        const unsubLC = firestore()
            .collection('late_checkout_requests')
            .where('room', '==', roomNum)
            .orderBy('createdAt', 'desc')
            .limit(3)
            .onSnapshot(snap => {
                if (snap) {
                    const lcs = snap.docs.map(doc => ({ id: doc.id, feedType: 'late_checkout', ...doc.data() }));
                    setLcActivities(lcs);
                    // Update the banner state too
                    const pendingOrApproved = lcs.find(l => l.status === 'pending' || l.status === 'approved');
                    setExistingLcReq(pendingOrApproved || null);
                }
            });

        return () => {
            unsubRoom();
            unsubReqs();
            unsubLC();
        };
    }, [guest?.room, guest?.guestID, navigation]);

    // Combine and sort activities for the feed
    const activities = [...reqActivities, ...lcActivities]
        .sort((a,b) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt || 0);
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt || 0);
            return timeB - timeA;
        })
        .slice(0, 7);

    // ─── 1-Hour Checkout Reminder ──────────────────────────────────────────
    useEffect(() => {
        if (!guest?.checkOut) return;
        
        const checkoutMs = new Date(guest.checkOut).getTime();
        const now = Date.now();
        const oneHourBefore = checkoutMs - (60 * 60 * 1000);
        const delay = oneHourBefore - now;

        if (delay > 0 && delay < 48 * 60 * 60 * 1000) {
            const timer = setTimeout(() => {
                const co = new Date(guest.checkOut);
                const timeStr = co.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                NotificationService.showUpdateNotification(
                    'Checkout Reminder',
                    `Dear ${guest.name?.split(' ')[0] || 'Guest'}, your checkout is at ${timeStr}. Need more time? Request a late checkout now!`
                );
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [guest?.checkOut, guest?.name]);

    // ─── Listen for existing LC request ───────────────────────────────────

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // ─── Late Checkout Request ─────────────────────────────────────────────
    const openLcModal = () => {
        setLcModalVisible(true);
        Animated.parallel([
            Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 10 }),
            Animated.timing(overlayAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
        ]).start();
    };

    const closeLcModal = () => {
        Animated.parallel([
            Animated.timing(sheetAnim, { toValue: 600, duration: 320, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
            Animated.timing(overlayAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]).start(() => {
            setLcModalVisible(false);
            setLcHours('1');
            setLcNote('');
        });
    };

    const handleRequestLateCheckout = async () => {
        const hours = parseInt(lcHours, 10);
        if (isNaN(hours) || hours < 1 || hours > 12) {
            return showToast('Please enter between 1-12 extra hours', 'warning');
        }
        if (!guest?.checkOut) return showToast('Checkout date not set', 'warning');

        setLcLoading(true);
        try {
            const originalCheckout = guest.checkOut;
            const originalMs = new Date(originalCheckout).getTime();
            const requestedMs = originalMs + hours * 60 * 60 * 1000;
            const requestedTime = new Date(requestedMs).toISOString();
            const totalFee = hours * lateCheckoutFee;

            await firestore().collection('late_checkout_requests').add({
                room: guest.room?.toString(),
                guestName: guest.name || 'Guest',
                guestID: guest.guestID || '',
                originalCheckout,
                requestedTime,
                extraHours: hours,
                note: lcNote.trim(),
                totalFee,
                status: 'pending',
                createdAt: firestore.FieldValue.serverTimestamp(),
            });

            Vibration.vibrate([0, 20, 60, 20]);
            showToast('Late checkout request sent to the hotel!', 'success');
            closeLcModal();
        } catch (e) {
            showToast('Failed to send request', 'error');
        } finally {
            setLcLoading(false);
        }
    };

    const fmtTime = (iso) => {
        if (!iso) return '--';
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!guest) return <View style={styles.loader}><ActivityIndicator size="large" color="#6366f1" /></View>;

    return (
        <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <ScrollView style={styles.container} contentContainerStyle={styles.content} bounces={false}>
                {/* Hero Section */}
                <ImageBackground
                    source={{ uri: guest.roomImageUrl || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=800' }}
                    style={styles.hero}
                    imageStyle={styles.heroImage}
                >
                    <View style={[styles.heroOverlay, { paddingTop: insets.top + 18 }]}>
                        <View style={styles.residencyBadge}>
                            <View style={styles.pulseDot} />
                            <Text style={styles.residencyText}>ACTIVE RESIDENCY</Text>
                        </View>
                        <Text style={styles.heroHotelName} numberOfLines={2}>{hotelName}</Text>
                        <Text style={styles.heroWelcome}>Everything you need, one tap away</Text>
                        <Text style={styles.heroName}>{guest.name ? guest.name.split(' ')[0] : 'Guest'}</Text>
                        <View style={styles.locationRow}>
                            <Icon name="map-pin" size={14} color="#c7d2fe" />
                            <Text style={styles.locationText}>Premium guest panel</Text>
                        </View>
                    </View>
                </ImageBackground>

                {/* Status Row */}
                <View style={styles.statusRow}>
                    <View style={styles.statusItem}>
                        <Text style={styles.statusLabel}>YOUR ROOM</Text>
                        <View style={styles.statusValRow}>
                            <Icon name="key" size={14} color="#6366f1" />
                            <Text style={styles.statusValue}>{guest.room || 'N/A'}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusItem, styles.statusBorder]}>
                        <Text style={styles.statusLabel}>CHECKOUT</Text>
                        <View style={styles.statusValRow}>
                            <Icon name="calendar" size={14} color="#6366f1" />
                            <Text style={styles.statusValue}>{formatDate(guest.checkOut)}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusItem, styles.statusBorder]}>
                        <Text style={styles.statusLabel}>CONCIERGE</Text>
                        <View style={styles.statusValRow}>
                            <Icon name="message-square" size={14} color="#6366f1" />
                            <Text style={styles.statusValue}>24/7 Live</Text>
                        </View>
                    </View>
                </View>

                {/* ── Late Checkout Banner ── */}
                {existingLcReq ? (
                    <View style={[styles.lcBanner, existingLcReq.status === 'approved' ? styles.lcBannerApproved : styles.lcBannerPending]}>
                        <Icon
                            name={existingLcReq.status === 'approved' ? 'check-circle' : 'clock'}
                            size={18}
                            color={existingLcReq.status === 'approved' ? '#16a34a' : '#d97706'}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.lcBannerTitle, { color: existingLcReq.status === 'approved' ? '#16a34a' : '#d97706' }]}>
                                {existingLcReq.status === 'approved' ? 'Late checkout approved' : 'Late checkout requested'}
                            </Text>
                            <Text style={styles.lcBannerSub}>
                                {existingLcReq.status === 'approved'
                                    ? `You may check out at ${fmtTime(existingLcReq.requestedTime)}. Fee: INR ${existingLcReq.totalFee}`
                                    : `Awaiting hotel confirmation - New checkout: ${fmtTime(existingLcReq.requestedTime)}`}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.lcRequestCard} onPress={openLcModal} activeOpacity={0.85}>
                        <View style={styles.lcRequestLeft}>
                            <View style={styles.lcRequestIcon}>
                                <Icon name="clock" size={20} color="#6366f1" />
                            </View>
                            <View>
                                <Text style={styles.lcRequestTitle}>Need more time?</Text>
                                <Text style={styles.lcRequestSub}>
                                    Request a late checkout. INR {lateCheckoutFee}/hr
                                </Text>
                            </View>
                        </View>
                        <View style={styles.lcRequestArrow}>
                            <Icon name="arrow-right" size={16} color="#6366f1" />
                        </View>
                    </TouchableOpacity>
                )}

                {/* Google Maps Review Banner */}
                {googleMapsLink ? (
                    <TouchableOpacity style={[styles.lcRequestCard, { marginTop: 0, marginBottom: 16 }]} onPress={() => openExternalLink(googleMapsLink, 'Could not open Google Maps.')}>
                        <View style={styles.lcRequestLeft}>
                            <View style={[styles.lcRequestIcon, { backgroundColor: '#fef3c7' }]}>
                                <Icon name="star" size={20} color="#d97706" />
                            </View>
                            <View>
                                <Text style={styles.lcRequestTitle}>Enjoying your stay?</Text>
                                <Text style={styles.lcRequestSub}>Leave a quick review on Google Maps</Text>
                            </View>
                        </View>
                        <View style={styles.lcRequestArrow}>
                            <Icon name="external-link" size={16} color="#d97706" />
                        </View>
                    </TouchableOpacity>
                ) : null}

                {/* Quick Actions */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Signature Services</Text>
                        <Text style={styles.sectionMeta}>Curated for your stay</Text>
                    </View>
                    <View style={styles.grid}>
                        <QuickAction icon="coffee" label="Dining" subLabel="Chef-curated menus" onPress={() => navigation.navigate('Services')} />
                        <QuickAction icon="message-square" label="Concierge" subLabel="Real-time support" onPress={() => navigation.navigate('Chat')} />
                        <QuickAction icon="award" label="Wellness" subLabel="Amenities and recovery" onPress={() => navigation.navigate('Amenities')} />
                        <QuickAction icon="briefcase" label="Laundry" subLabel="Pickup on demand" onPress={() => navigation.navigate('GuestLaundry')} />
                    </View>
                </View>

                {/* Live Updates */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Live Updates</Text>
                        <Text style={styles.sectionMeta}>Recent service activity</Text>
                    </View>
                    <View style={styles.feedCard}>
                        {activities.length === 0 ? (
                            <View style={styles.emptyFeed}>
                                <Icon name="activity" size={24} color="#cbd5e1" />
                                <Text style={styles.emptyFeedText}>No recent activity</Text>
                            </View>
                        ) : (
                            activities.map((act, i) => (
                                <View key={act.id} style={[styles.feedItem, i !== activities.length - 1 && styles.feedBorder]}>
                                    <View
                                        style={[
                                            styles.feedIconWrap,
                                            {
                                                backgroundColor:
                                                    act.status === 'Completed' || act.status === 'approved'
                                                        ? '#dcfce7'
                                                        : act.status === 'denied'
                                                            ? '#fee2e2'
                                                            : act.status === 'Fulfilling' || act.status === 'Repairing' || act.status === 'pending'
                                                                ? '#e0e7ff'
                                                                : '#f1f5f9'
                                            }
                                        ]}
                                    >
                                        <Icon
                                            name={
                                                act.status === 'Completed' || act.status === 'approved' ? 'check-circle' :
                                                act.status === 'denied' ? 'x-circle' :
                                                act.status === 'Fulfilling' || act.status === 'Repairing' || act.status === 'pending' ? 'loader' :
                                                'clock'
                                            }
                                            size={16}
                                            color={
                                                act.status === 'approved' || act.status === 'Completed'
                                                    ? '#16a34a'
                                                    : act.status === 'denied'
                                                        ? '#dc2626'
                                                        : act.status === 'Fulfilling' || act.status === 'Repairing' || act.status === 'pending'
                                                            ? '#6366f1'
                                                            : '#64748b'
                                            }
                                        />
                                    </View>
                                    <View style={styles.feedContent}>
                                        <Text style={styles.feedTitle}>
                                            {act.feedType === 'late_checkout' ? 'Late Checkout Extension' : (act.type === 'order' ? 'Room Service Order' : act.details || 'Service Request')}
                                        </Text>
                                        <Text style={styles.feedStatus}>{renderStatusLine(act)}</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Support and Privacy</Text>
                        <Text style={styles.sectionMeta}>Stay informed</Text>
                    </View>
                    <View style={styles.supportCard}>
                        <TouchableOpacity style={styles.supportAction} onPress={() => navigation.navigate('ContactUs')}>
                            <View style={styles.supportIcon}>
                                <Icon name="mail" size={18} color="#6366f1" />
                            </View>
                            <View style={styles.supportActionText}>
                                <Text style={styles.supportActionTitle}>Contact Us</Text>
                                <Text style={styles.supportActionBody}>roomflow.in@gmail.com</Text>
                            </View>
                            <Icon name="arrow-right" size={18} color="#94a3b8" />
                        </TouchableOpacity>
                        <View style={styles.supportDivider} />
                        <TouchableOpacity style={styles.supportAction} onPress={() => navigation.navigate('PrivacyPolicy')}>
                            <View style={styles.supportIcon}>
                                <Icon name="shield" size={18} color="#6366f1" />
                            </View>
                            <View style={styles.supportActionText}>
                                <Text style={styles.supportActionTitle}>Privacy Policy</Text>
                                <Text style={styles.supportActionBody}>Review how RoomFlow handles app data.</Text>
                            </View>
                            <Icon name="arrow-right" size={18} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* ── Late Checkout Modal ── */}
            <Modal visible={lcModalVisible} transparent animationType="none" onRequestClose={closeLcModal}>
                <Animated.View style={[styles.lcOverlay, { opacity: overlayAnim }]}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeLcModal} />
                </Animated.View>
                <Animated.View style={[styles.lcSheet, { transform: [{ translateY: sheetAnim }] }]}>
                    <View style={styles.lcSheetHandle} />

                    {/* Sheet header */}
                    <View style={styles.lcSheetHeader}>
                        <View style={styles.lcSheetIcon}>
                            <Icon name="clock" size={22} color="#6366f1" />
                        </View>
                        <View>
                            <Text style={styles.lcSheetTitle}>Request Late Checkout</Text>
                            <Text style={styles.lcSheetSub}>Fee: INR {lateCheckoutFee} per extra hour</Text>
                        </View>
                        <TouchableOpacity style={styles.lcSheetClose} onPress={closeLcModal}>
                            <Icon name="x" size={17} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                        {/* Current checkout info */}
                        <View style={styles.lcCurrentBox}>
                            <Icon name="calendar" size={13} color="#6366f1" />
                            <Text style={styles.lcCurrentText}>
                                Your current checkout: <Text style={{ fontWeight: '900', color: '#0f172a' }}>{formatDate(guest?.checkOut)}</Text>
                            </Text>
                        </View>

                        {/* Hour selector */}
                        <Text style={styles.lcInputLabel}>EXTRA HOURS NEEDED</Text>
                        <View style={styles.lcHourRow}>
                            {[1, 2, 3, 4, 6].map(h => (
                                <TouchableOpacity
                                    key={h}
                                    style={[styles.lcHourChip, lcHours === String(h) && styles.lcHourChipActive]}
                                    onPress={() => { setLcHours(String(h)); Vibration.vibrate(8); }}
                                >
                                    <Text style={[styles.lcHourChipText, lcHours === String(h) && styles.lcHourChipTextActive]}>
                                        {h}h
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Fee preview */}
                        <View style={styles.lcFeePreview}>
                            <View>
                                <Text style={styles.lcFeeLabel}>Total Additional Fee</Text>
                                <Text style={styles.lcFeeSub}>
                                    {lcHours || '?'} hr{Number(lcHours) > 1 ? 's' : ''} x INR {lateCheckoutFee}
                                </Text>
                            </View>
                            <Text style={styles.lcFeeValue}>INR {(Number(lcHours) || 0) * lateCheckoutFee}</Text>
                        </View>

                        {/* Optional note */}
                        <Text style={styles.lcInputLabel}>SPECIAL REQUEST (OPTIONAL)</Text>
                        <TextInput
                            style={styles.lcNoteInput}
                            value={lcNote}
                            onChangeText={setLcNote}
                            placeholder="e.g. Flight at 6 PM, need extra time to pack..."
                            placeholderTextColor="#94a3b8"
                            multiline
                            numberOfLines={2}
                        />

                        <View style={styles.lcInfoBox}>
                            <Icon name="info" size={13} color="#5a4634" />
                            <Text style={styles.lcInfoText}>
                                Your request will be sent to the hotel. You'll receive a confirmation via your concierge chat once the hotel approves it.
                            </Text>
                        </View>

                        <View style={{ height: 20 }} />
                    </ScrollView>

                    <View style={styles.lcSheetFooter}>
                        <TouchableOpacity
                            style={[styles.lcSubmitBtn, lcLoading && { opacity: 0.7 }]}
                            onPress={handleRequestLateCheckout}
                            disabled={lcLoading}
                        >
                            {lcLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Icon name="send" size={17} color="#fff" />
                                    <Text style={styles.lcSubmitBtnText}>Send Request to Hotel</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </Modal>
        </SafeAreaView>
    );
}

const renderStatusLine = (act) => {
    if (act.feedType === 'late_checkout') {
        if (act.status === 'approved') return 'Approved by Front Desk ✓';
        if (act.status === 'denied') return 'Request declined by Front Desk';
        return 'Request sent · Awaiting approval';
    }

    const staff = act.startedBy || act.completedBy || 'Staff';
    switch (act.status) {
        case 'Fulfilling':
        case 'Repairing':
            return `Accepted & En Route · ${staff}`;
        case 'Completed':
            return `Service Complete · ${staff}`;
        case 'Active':
            return `Assigned to ${staff}`;
        case 'Pending':
            return 'Received by Concierge';
        default:
            return act.status || 'Received';
    }
};

const QuickAction = ({ icon, label, subLabel, onPress }) => (
    <TouchableOpacity style={styles.gridItem} onPress={onPress} activeOpacity={0.9}>
        <View style={styles.gridTop}>
            <View style={styles.iconBox}>
                <Icon name={icon} size={20} color="#6366f1" />
            </View>
            <View style={styles.gridArrow}>
                <Icon name="arrow-up-right" size={16} color="#94a3b8" />
            </View>
        </View>
        <Text style={styles.gridLabel}>{label}</Text>
        <Text style={styles.gridSubLabel}>{subLabel}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f8fafc' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { paddingBottom: 40 },

    hero: { height: 360, marginHorizontal: 20, marginTop: 0, borderRadius: 32, overflow: 'hidden' },
    heroImage: { borderRadius: 32 },
    heroOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.48)', justifyContent: 'space-between', padding: 24 },
    residencyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.36)', paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start', marginBottom: 18, borderWidth: 1, borderColor: 'rgba(129,140,248,0.45)', borderRadius: 999 },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#818cf8', marginRight: 8 },
    residencyText: { color: '#fff', fontSize: 10, letterSpacing: 2, fontWeight: '800' },
    heroHotelName: { color: '#ffffff', fontSize: 28, fontWeight: '900', letterSpacing: -0.8, maxWidth: '82%', textShadowColor: 'rgba(15,23,42,0.45)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 14 },
    heroWelcome: { fontSize: 13, color: '#cbd5e1', fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
    heroName: { fontSize: 34, color: '#fff', fontWeight: '900', marginBottom: 16, marginTop: 10, letterSpacing: -1 },
    locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    locationText: { color: 'rgba(255,255,255,0.84)', fontSize: 12, letterSpacing: 1.2, marginLeft: 8, textTransform: 'uppercase', fontWeight: '700' },

    statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginTop: -28 },
    statusItem: { flex: 1, backgroundColor: '#fff', paddingVertical: 18, paddingHorizontal: 14, alignItems: 'flex-start', borderRadius: 22, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
    statusBorder: { marginLeft: 10 },
    statusLabel: { fontSize: 10, color: '#94a3b8', letterSpacing: 1.3, marginBottom: 10, fontWeight: '800' },
    statusValRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusValue: { fontSize: 13, color: '#0f172a', fontWeight: '800', flexShrink: 1 },

    // Late Checkout Banner / Card
    lcBanner: { marginHorizontal: 20, marginTop: 16, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    lcBannerPending: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a' },
    lcBannerApproved: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
    lcBannerTitle: { fontSize: 14, fontWeight: '900' },
    lcBannerSub: { fontSize: 11, color: '#64748b', marginTop: 3, lineHeight: 16 },

    lcRequestCard: { marginHorizontal: 20, marginTop: 18, backgroundColor: '#fff', borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e0e7ff', shadowColor: '#6366f1', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
    lcRequestLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    lcRequestIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
    lcRequestTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
    lcRequestSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    lcRequestArrow: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },

    section: { paddingHorizontal: 20, marginTop: 28 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 22, color: '#0f172a', fontWeight: '900', letterSpacing: -0.5 },
    sectionMeta: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    gridItem: { width: '48%', backgroundColor: '#fff', padding: 18, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 24, minHeight: 148, shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
    gridTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    iconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
    gridArrow: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    gridLabel: { fontSize: 15, color: '#0f172a', fontWeight: '800' },
    gridSubLabel: { marginTop: 8, fontSize: 12, color: '#64748b', lineHeight: 18 },

    feedCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', padding: 8, borderRadius: 28, shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
    emptyFeed: { padding: 30, alignItems: 'center' },
    emptyFeedText: { color: '#cbd5e1', fontSize: 12, marginTop: 8, fontWeight: '600' },
    feedItem: { flexDirection: 'row', alignItems: 'flex-start', padding: 16 },
    feedBorder: { borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
    feedIconWrap: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    feedContent: { flex: 1, marginLeft: 14 },
    feedTitle: { fontSize: 14, color: '#0f172a', fontWeight: '700' },
    feedStatus: { fontSize: 11, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4, fontWeight: '700' },

    supportCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', padding: 8, borderRadius: 28, shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
    supportAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
    supportIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    supportActionText: { flex: 1, marginRight: 12 },
    supportActionTitle: { fontSize: 15, color: '#0f172a', fontWeight: '800' },
    supportActionBody: { marginTop: 4, fontSize: 12, color: '#64748b', letterSpacing: 0.2 },
    supportDivider: { height: 1, backgroundColor: '#eef2f7', marginHorizontal: 6 },

    // Late Checkout Modal
    lcOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.5)' },
    lcSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingBottom: 40, maxHeight: '90%',
    },
    lcSheetHandle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
    lcSheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    lcSheetIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
    lcSheetTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', flex: 1 },
    lcSheetSub: { fontSize: 11, color: '#94a3b8' },
    lcSheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },

    lcCurrentBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eef2ff', marginHorizontal: 20, marginTop: 16, borderRadius: 14, padding: 12 },
    lcCurrentText: { fontSize: 12, color: '#475569' },

    lcInputLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginHorizontal: 20, marginTop: 18, marginBottom: 10 },

    lcHourRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8 },
    lcHourChip: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center' },
    lcHourChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    lcHourChipText: { fontSize: 14, fontWeight: '900', color: '#64748b' },
    lcHourChipTextActive: { color: '#fff' },

    lcFeePreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginTop: 14, backgroundColor: '#eef2ff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#c7d2fe' },
    lcFeeLabel: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
    lcFeeSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    lcFeeValue: { fontSize: 22, fontWeight: '900', color: '#6366f1' },

    lcNoteInput: { marginHorizontal: 20, backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, fontSize: 14, fontWeight: '600', color: '#0f172a', borderWidth: 1.5, borderColor: '#e2e8f0', minHeight: 70, textAlignVertical: 'top' },

    lcInfoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 20, marginTop: 14, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    lcInfoText: { flex: 1, fontSize: 11, color: '#475569', lineHeight: 16 },

    lcSheetFooter: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    lcSubmitBtn: { backgroundColor: '#6366f1', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#6366f1', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    lcSubmitBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
});



import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Animated, Easing, Vibration } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast } from '../../../App';

const TaskCard = ({ item, onStart, onComplete, busyTaskId }) => {
    const swipeRef = useRef(null);
    const isBusy = busyTaskId === item.id;

    const handleAccept = async () => {
        if (isBusy) return;
        Vibration.vibrate(25);
        await onStart(item);
        swipeRef.current?.close();
    };

    const handleComplete = async () => {
        if (isBusy) return;
        Vibration.vibrate(30);
        await onComplete(item);
        swipeRef.current?.close();
    };
    const isOrder = item.type === 'order';
    const isAmenity = item.type === 'amenity';

    const getIcon = () => {
        if (isOrder) return 'shopping-cart';
        if (isAmenity) return 'award';
        return 'tool';
    };

    const getColor = () => {
        if (isOrder) return '#3b82f6';
        if (isAmenity) return '#8b5cf6';
        return '#ea580c';
    };

    const getBg = () => {
        if (isOrder) return '#eff6ff';
        if (isAmenity) return '#f5f3ff';
        return '#fff7ed';
    };

    const getTitle = () => {
        if (isOrder) return 'Room Service';
        if (isAmenity) return 'Amenity';
        return 'Maintenance';
    };

    const isFulfilling = item.status === 'Fulfilling' || item.status === 'Repairing';
    const statusLabel = isFulfilling ? 'LIVE' : 'NEW';
    const actionLabel = isFulfilling ? 'Done' : 'Start';
    const swipeLabel = isFulfilling ? 'Swipe to finish' : 'Swipe to start';

    return (
        <Swipeable
            ref={swipeRef}
            renderLeftActions={() => (
                <TouchableOpacity
                    style={[
                        styles.swipeAction,
                        isFulfilling ? styles.swipeActionComplete : styles.swipeActionAccept
                    ]}
                    onPress={() => (isFulfilling ? handleComplete() : handleAccept())}
                >
                    <Icon
                        name={isFulfilling ? 'check-circle' : 'play-circle'}
                        size={24}
                        color="#fff"
                    />
                    <Text style={styles.swipeText}>
                        {isFulfilling ? 'COMPLETE' : 'ACCEPT'}
                    </Text>
                </TouchableOpacity>
            )}
            overshootLeft={false}
            onSwipeableLeftOpen={() => (isFulfilling ? handleComplete() : handleAccept())}
        >
            <View style={styles.cardShell}>
                <View style={[styles.swipeHandle, isFulfilling && styles.swipeHandleComplete]}>
                    <Icon
                        name="chevrons-right"
                        size={16}
                        color="#fff"
                    />
                </View>
                <View style={styles.taskCard}>
                    <View style={[styles.taskIcon, { backgroundColor: getBg() }]}>
                        <Icon name={getIcon()} size={24} color={getColor()} />
                    </View>
                    <View style={styles.taskInfo}>
                        <View style={styles.taskRow}>
                            <Text style={styles.taskTitle}>{getTitle()}</Text>
                            <Text style={styles.roomBadge}>Room {item.room || item.roomNumber}</Text>
                        </View>
                        <Text style={styles.taskDetails} numberOfLines={2}>
                            {item.details || item.issue || 'No details provided'}
                        </Text>

                        <View style={styles.taskMetaRow}>
                            <View style={[styles.stateBadge, isFulfilling ? styles.stateBadgeLive : styles.stateBadgeNew]}>
                                <View style={[styles.stateDot, isFulfilling && styles.stateDotLive]} />
                                <Text style={[styles.stateText, isFulfilling && styles.stateTextLive]}>{statusLabel}</Text>
                            </View>
                            <View style={styles.rewardBadge}>
                                <Icon name="zap" size={10} color="#f59e0b" />
                                <Text style={styles.rewardText}>+10</Text>
                            </View>
                        </View>

                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[
                                    styles.actionBtn,
                                    isFulfilling ? styles.actionBtnDone : styles.actionBtnStart,
                                    isBusy && styles.actionBtnDisabled
                                ]}
                                onPress={() => (isFulfilling ? handleComplete() : handleAccept())}
                                disabled={isBusy}
                            >
                                {isBusy ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Icon name={isFulfilling ? 'check' : 'play'} size={14} color="#fff" />
                                        <Text style={styles.actionBtnText}>{actionLabel}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <View style={styles.swipeHintPill}>
                                <Text style={styles.swipeHintText}>{swipeLabel}</Text>
                                <Icon name="chevron-right" size={14} color="#64748b" />
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </Swipeable>
    );
};

export default function StaffDashboard({ navigation }) {
    const [tasks, setTasks] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [staffData, setStaffData] = useState(null);
    const [busyTaskId, setBusyTaskId] = useState(null);
    const insets = useSafeAreaInsets();
    const rewardAnim = useRef(new Animated.Value(0)).current;
    const [rewardVisible, setRewardVisible] = useState(false);
    const [rewardLabel, setRewardLabel] = useState('+10');
    const refreshStaffPoints = async () => {
        if (!staffData?.username) return;
        const snap = await firestore().collection('staff_accounts').where('username', '==', staffData.username).limit(1).get();
        if (!snap.empty) {
            const doc = snap.docs[0];
            setStaffData(prev => ({ ...prev, ...doc.data(), id: doc.id }));
        }
    };

    useEffect(() => {
        let unsubscribeAll;
        loadData().then(fn => { unsubscribeAll = fn; });
        return () => {
            if (unsubscribeAll) unsubscribeAll();
        };
    }, []);

    const loadData = async () => {
        const cleanup = [];

        const session = await AsyncStorage.getItem('staff_session');
        const sessionData = session ? JSON.parse(session) : null;
        if (sessionData) {
            setStaffData(sessionData);
            // Live listen to this staff member so points stay in sync
            const meSub = firestore().collection('staff_accounts')
                .where('username', '==', sessionData.username)
                .limit(1)
                .onSnapshot(snap => {
                    if (!snap.empty) {
                        const doc = snap.docs[0];
                        setStaffData(prev => ({ ...prev, ...doc.data(), id: doc.id }));
                    }
                });
            cleanup.push(meSub);
        }

        // Listen for active Guest Requests and Active Maintenance
        const unsubRequests = firestore().collection('requests')
            .where('status', 'in', ['Pending', 'Fulfilling'])
            .onSnapshot(snap1 => {
                const reqs = snap1 ? snap1.docs.map(doc => {
                    const data = doc.data();
                    let type = 'request';
                    if (data.requestType === 'Order') {
                        type = 'order';
                    } else if (data.requestType === 'Amenity') {
                        type = 'amenity';
                    }
                    return { id: doc.id, type, ...data };
                }) : [];
                
                firestore().collection('maintenance')
                .where('status', 'in', ['Active', 'Repairing'])
                .onSnapshot(snap2 => {
                    const maint = snap2 ? snap2.docs.map(doc => ({ id: doc.id, type: 'maintenance', ...doc.data() })) : [];
                    
                    // Combine and sort
                    const combined = [...reqs, ...maint].sort((a,b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
                    setTasks(combined);
                    setLoading(false);
                });
            });
        cleanup.push(unsubRequests);

        // Listen for Leaderboard (Top 3 staff)
        const unsubLeaderboard = firestore().collection('staff_accounts')
            .orderBy('points', 'desc')
            .limit(3)
            .onSnapshot(snap => {
                if (snap) {
                    setLeaderboard(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                }
            });
        cleanup.push(unsubLeaderboard);

        return () => cleanup.forEach(fn => fn && fn());
    };

    const triggerReward = (points = 10) => {
        setRewardLabel(`+${points}`);
        setRewardVisible(true);
        rewardAnim.setValue(0);
        Animated.sequence([
            Animated.timing(rewardAnim, { toValue: 1, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.delay(400),
            Animated.timing(rewardAnim, { toValue: 0, duration: 250, easing: Easing.in(Easing.ease), useNativeDriver: true })
        ]).start(() => setRewardVisible(false));
    };

    const handleStartTask = async (task) => {
        setBusyTaskId(task.id);
        try {
            const nextStatus = task.type === 'maintenance' ? 'Repairing' : 'Fulfilling';
            if (task.type === 'order' || task.type === 'amenity') {
                await firestore().collection('requests').doc(task.id).update({ 
                    status: nextStatus, 
                    startedAt: firestore.FieldValue.serverTimestamp(),
                    startedBy: staffData?.username || 'Staff' 
                });
            } else if (task.type === 'maintenance') {
                await firestore().collection('maintenance').doc(task.id).update({ 
                    status: nextStatus,
                    startedAt: firestore.FieldValue.serverTimestamp(),
                    startedBy: staffData?.username || 'Staff' 
                });
            }
            // Optimistic UI: update local task status so swipe handle switches to COMPLETE
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
            showToast('Started', 'success');
        } catch (error) {
            showToast('Could not start task.', 'error');
        } finally {
            setBusyTaskId(null);
        }
    };

    const handleCompleteTask = async (task) => {
        setBusyTaskId(task.id);
        try {
            if (task.type === 'order' || task.type === 'amenity') {
                await firestore().collection('requests').doc(task.id).update({ status: 'Completed', completedBy: staffData?.username || 'Staff' });
            } else if (task.type === 'maintenance') {
                await firestore().collection('maintenance').doc(task.id).update({ status: 'Completed', completedBy: staffData?.username || 'Staff' });
                // Also update Room status
                const roomNum = task.room || task.roomNumber;
                const roomSnap = await firestore().collection('rooms').where('roomNumber', '==', roomNum.toString()).get();
                if (!roomSnap.empty) {
                    await firestore().collection('rooms').doc(roomSnap.docs[0].id).update({ status: 'Ready' });
                }
            }

            // Reward Staff Points!
            if (staffData && staffData.username) {
                // Prefer direct doc id if we have it
                if (staffData.id) {
                    await firestore().collection('staff_accounts').doc(staffData.id)
                        .update({ points: firestore.FieldValue.increment(10) });
                } else {
                    const staffQuery = await firestore().collection('staff_accounts').where('username', '==', staffData.username).limit(1).get();
                    if (!staffQuery.empty) {
                        const doc = staffQuery.docs[0];
                        await firestore().collection('staff_accounts').doc(doc.id)
                            .update({ points: firestore.FieldValue.increment(10) });
                        setStaffData(prev => prev ? ({ ...prev, id: doc.id }) : prev);
                    }
                }
                // Optimistic local bump
                setStaffData(prev => prev ? ({ ...prev, points: (prev.points || 0) + 10 }) : prev);
                // Hard refresh to keep UI in sync with server
                refreshStaffPoints();
            }
            // Always show reward animation on completion
            triggerReward(10);
            showToast('Done +10', 'success');
            // Remove completed task from local list
            setTasks(prev => prev.filter(t => t.id !== task.id));
        } catch (error) {
            showToast('Could not complete task.', 'error');
        } finally {
            setBusyTaskId(null);
        }
    };

    const handleSignOut = async () => {
        await AsyncStorage.removeItem('staff_session');
        navigation.replace('Login');
    };

    if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#3b82f6" /></View>;

    return (
        <SafeAreaView
            edges={['top', 'left', 'right']}
            style={[styles.container, { paddingTop: insets.top + 8 }]}
        >
            {rewardVisible && (
                <View pointerEvents="none" style={styles.rewardOverlay}>
                    <Animated.View
                        style={[
                            styles.rewardToast,
                            {
                                opacity: rewardAnim,
                                transform: [
                                    {
                                        translateY: rewardAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [16, -24]
                                        })
                                    },
                                    {
                                        scale: rewardAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.9, 1.05]
                                        })
                                    }
                                ]
                            }
                        ]}
                    >
                        <Icon name="zap" size={14} color="#f59e0b" />
                        <Text style={styles.rewardToastText}>{rewardLabel}</Text>
                    </Animated.View>
                </View>
            )}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Tasks</Text>
                    <Text style={styles.subtitle}>Hi, {staffData?.name || 'Staff'}</Text>
                </View>
                <TouchableOpacity onPress={handleSignOut} style={styles.logoutBtn}>
                    <Icon name="log-out" size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>

            {/* Gamification Stats */}
            <View style={styles.statsCard}>
                <View style={styles.pointRing}>
                    <Icon name="award" size={28} color="#f59e0b" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.statLabel}>POINTS</Text>
                    <Text style={styles.statPoints}>{staffData?.points || 0}</Text>
                </View>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>+10</Text>
                </View>
            </View>

            <View style={styles.taskContainer}>
                <Text style={styles.sectionTitle}>OPEN TASKS ({tasks.length})</Text>
                <Text style={styles.helpText}>Tap or swipe</Text>

                <FlatList
                    data={tasks}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    renderItem={({ item }) => (
                        <TaskCard 
                            item={item} 
                            onStart={handleStartTask} 
                            onComplete={handleCompleteTask}
                            busyTaskId={busyTaskId}
                        />
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Icon name="check-square" size={48} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No open tasks</Text>
                        </View>
                    }
                />
            </View>

            {/* Leaderboard Section */}
            <View style={styles.leaderboardSection}>
                <View style={styles.lbHeader}>
                    <Icon name="trending-up" size={16} color="#475569" />
                    <Text style={styles.lbTitle}>TOP STAFF</Text>
                </View>
                <View style={styles.lbScroll}>
                    {leaderboard.map((staff, idx) => (
                        <View key={staff.id} style={[styles.lbItem, idx === 0 && styles.lbItemAlpha]}>
                            <View style={styles.lbRankWrap}>
                                <Text style={[styles.lbRank, idx === 0 && { color: '#f59e0b' }]}>#{idx + 1}</Text>
                            </View>
                            <Text style={styles.lbName} numberOfLines={1}>{staff.name}</Text>
                            <Text style={styles.lbPoints}>{staff.points || 0} pts</Text>
                        </View>
                    ))}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    header: { padding: 24, paddingVertical: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 26, fontWeight: '900', color: '#0f172a' },
    subtitle: { fontSize: 13, color: '#64748b', fontWeight: '500', marginTop: 4 },
    logoutBtn: { width: 44, height: 44, backgroundColor: '#fee2e2', borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    statsCard: { margin: 24, marginTop: 0, padding: 24, backgroundColor: '#2e1065', borderRadius: 24, flexDirection: 'row', alignItems: 'center', shadowColor: '#4c1d95', shadowOpacity: 0.3, shadowRadius: 15, elevation: 8, gap: 16 },
    pointRing: { width: 56, height: 56, backgroundColor: '#4c1d95', borderRadius: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#8b5cf6' },
    statLabel: { fontSize: 9, fontWeight: '900', color: '#a78bfa', letterSpacing: 1.5, marginBottom: 4 },
    statPoints: { fontSize: 32, fontWeight: '900', color: '#fff' },
    badge: { backgroundColor: '#8b5cf6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    badgeText: { fontSize: 8, fontWeight: '900', color: '#fff' },
    taskContainer: { flex: 1, paddingHorizontal: 20 },
    sectionTitle: { fontSize: 12, fontWeight: '900', color: '#475569', letterSpacing: 1.5, marginBottom: 4 },
    helpText: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginBottom: 16 },
    cardShell: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 16 },
    swipeHandle: { width: 34, borderTopLeftRadius: 20, borderBottomLeftRadius: 20, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', paddingVertical: 18 },
    swipeHandleComplete: { backgroundColor: '#10b981' },
    taskCard: { backgroundColor: '#fff', padding: 18, borderRadius: 20, flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 14, shadowColor: '#000', shadowOpacity: 0.04, elevation: 2 },
    taskIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
    taskInfo: { flex: 1 },
    taskRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
    taskTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', flex: 1, lineHeight: 18 },
    roomBadge: { fontSize: 10, fontWeight: '900', color: '#fff', backgroundColor: '#0f172a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
    taskDetails: { fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 18 },
    taskMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
    rewardText: { fontSize: 9, fontWeight: '900', color: '#d97706' },
    swipeAction: { justifyContent: 'center', alignItems: 'center', width: 98, borderRadius: 20, marginBottom: 16, marginRight: 16 },
    swipeActionAccept: { backgroundColor: '#3b82f6' },
    swipeActionComplete: { backgroundColor: '#10b981' },
    swipeText: { color: '#fff', fontSize: 9, fontWeight: '900', marginTop: 4, letterSpacing: 1 },
    emptyWrap: { alignItems: 'center', marginTop: 60, opacity: 0.5 },
    emptyText: { marginTop: 12, color: '#475569', fontWeight: '800', fontSize: 14 },
    rewardOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', zIndex: 9 },
    rewardToast: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef3c7', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderColor: '#f59e0b', borderWidth: 1, elevation: 9, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    rewardToastText: { color: '#b45309', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
    
    // Leaderboard
    leaderboardSection: { padding: 20, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
    lbHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    lbTitle: { fontSize: 10, fontWeight: '900', color: '#475569', letterSpacing: 1.5 },
    lbScroll: { flexDirection: 'row', gap: 12 },
    lbItem: { flex: 1, backgroundColor: '#f8fafc', padding: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    lbItemAlpha: { borderColor: '#fde68a', backgroundColor: '#fffdf5' },
    lbRankWrap: { marginBottom: 4 },
    lbRank: { fontSize: 10, fontWeight: '900', color: '#94a3b8' },
    lbName: { fontSize: 12, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
    lbPoints: { fontSize: 11, fontWeight: '900', color: '#3b82f6' },
    
    stateBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    stateBadgeNew: { backgroundColor: '#e0f2fe' },
    stateBadgeLive: { backgroundColor: '#ecfdf5' },
    stateDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0284c7' },
    stateDotLive: { backgroundColor: '#10b981' },
    stateText: { fontSize: 9, fontWeight: '900', color: '#0369a1', letterSpacing: 0.8 },
    stateTextLive: { color: '#047857' },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    actionBtn: { minWidth: 94, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    actionBtnStart: { backgroundColor: '#2563eb', shadowColor: '#2563eb', shadowOpacity: 0.18, shadowRadius: 12, elevation: 4 },
    actionBtnDone: { backgroundColor: '#10b981', shadowColor: '#10b981', shadowOpacity: 0.16, shadowRadius: 12, elevation: 4 },
    actionBtnDisabled: { opacity: 0.7 },
    actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.2 },
    swipeHintPill: { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.9, backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    swipeHintText: { fontSize: 9, color: '#64748b', fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' }
});

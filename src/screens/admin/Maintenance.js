import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Feather';

export default function Maintenance() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        const sub = firestore().collection('maintenance')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                if(snap) {
                    setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    setLoading(false);
                }
            });
        return () => sub();
    }, []);

    const handleComplete = async (task) => {
        Alert.alert('Resolve Issue', `Mark maintenance for Room ${task.room} as completed?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Resolve', onPress: async () => {
                await firestore().collection('maintenance').doc(task.id).update({ status: 'Completed' });
                // Attempt to update room status automatically to 'Ready'
                const roomsSnap = await firestore().collection('rooms').where('roomNumber', '==', task.room).get();
                if (!roomsSnap.empty) {
                    await firestore().collection('rooms').doc(roomsSnap.docs[0].id).update({ status: 'Ready' });
                }
            }}
        ]);
    };

    const activeTasks = tasks.filter(t => t.status === 'Active');
    const resolvedTasks = tasks.filter(t => t.status === 'Completed');
    const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);

    if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#3b82f6"/></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Maintenance Hub</Text>
                <Text style={styles.subtitle}>Track property repairs and serviceability.</Text>

                <View style={styles.filtersWrapper}>
                    {['All', 'Active', 'Completed'].map(f => (
                        <TouchableOpacity 
                            key={f}
                            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                            onPress={() => setFilter(f)}
                        >
                            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.statsRow}>
                    <HighlightCard label="Active Issues" value={activeTasks.length} icon="tool" color="#f97316" bg="#fff7ed" border="#ffedd5" />
                    <HighlightCard label="Resolved" value={resolvedTasks.length} icon="check-circle" color="#10b981" bg="#f0fdf4" border="#dcfce7" />
                    <HighlightCard label="System Health" value="94%" icon="activity" color="#3b82f6" bg="#eff6ff" border="#dbeafe" />
                </View>

                {filteredTasks.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <View style={styles.emptyIconBox}><Icon name="check-circle" size={32} color="#94a3b8" /></View>
                        <Text style={styles.emptyTitle}>Operational Excellence</Text>
                        <Text style={styles.emptySub}>No maintenance tasks found for selected filter.</Text>
                    </View>
                ) : (
                    filteredTasks.map(task => (
                        <View key={task.id} style={styles.taskCard}>
                            <View style={styles.taskTop}>
                                <View style={[styles.roomBox, task.status === 'Active' ? {backgroundColor:'#fff7ed'} : {backgroundColor:'#f0fdf4'}]}>
                                    <Text style={[styles.roomBoxLabel, task.status === 'Active' ? {color:'#ea580c'} : {color:'#16a34a'}]}>ROOM</Text>
                                    <Text style={[styles.roomBoxValue, task.status === 'Active' ? {color:'#ea580c'} : {color:'#16a34a'}]}>{task.room}</Text>
                                </View>
                                
                                <View style={styles.taskInfo}>
                                    <Text style={styles.taskIssue}>{task.issue}</Text>
                                    <View style={[styles.badge, task.status === 'Active' ? {backgroundColor:'#fef3c7'} : {backgroundColor:'#dcfce7'}]}>
                                    <Text style={[styles.badgeText, task.status === 'Active' ? {color:'#d97706'} : {color:'#15803d'}]}>{task.status}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.taskMeta}>
                                <View style={styles.metaBadge}>
                                    <Icon name="clock" size={12} color="#3b82f6" />
                                    <Text style={styles.metaText}>
                                        {task.createdAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.metaBadge}>
                                    <Icon name="alert-triangle" size={12} color={task.priority === 'High' ? '#ef4444' : '#f59e0b'} />
                                    <Text style={styles.metaText}>{task.priority || 'Medium'} Priority</Text>
                                </View>
                            </View>

                            {task.status === 'Active' ? (
                                <TouchableOpacity style={styles.resolveBtn} onPress={() => handleComplete(task)}>
                                    <Text style={styles.resolveText}>MARK RESOLVED</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.resolvedBtn}>
                                    <Icon name="check-circle" size={16} color="#16a34a" />
                                    <Text style={styles.resolvedText}>RESOLVED</Text>
                                </View>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const HighlightCard = ({ label, value, icon, color, bg, border }) => (
    <View style={[styles.statCard, { backgroundColor: bg, borderColor: border }]}>
        <View>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue}>{value}</Text>
        </View>
        <View style={styles.statIconBox}>
            <Icon name={icon} size={24} color={color} />
        </View>
    </View>
);

const styles = StyleSheet.create({
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 24, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9' },
    title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
    subtitle: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '600' },
    filtersWrapper: { flexDirection: 'row', marginTop: 16 },
    filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f1f5f9', marginRight: 10 },
    filterBtnActive: { backgroundColor: '#0f172a' },
    filterText: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
    filterTextActive: { color: '#fff' },
    scrollContent: { padding: 16, paddingBottom: 40 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    statCard: { width: '31%', borderWidth: 2, borderRadius: 20, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statLabel: { fontSize: 8, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    statValue: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
    statIconBox: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    emptyCard: { backgroundColor: '#fff', borderRadius: 24, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    emptyIconBox: { width: 64, height: 64, backgroundColor: '#f8fafc', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
    emptySub: { fontSize: 12, color: '#64748b', marginTop: 4, textAlign: 'center' },
    taskCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
    taskTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    roomBox: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    roomBoxLabel: { fontSize: 8, fontWeight: '900', opacity: 0.5, letterSpacing: 1, marginBottom: 4 },
    roomBoxValue: { fontSize: 24, fontWeight: '900' },
    taskInfo: { flex: 1 },
    taskIssue: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    taskMeta: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
    resolveBtn: { backgroundColor: '#0f172a', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
    resolveText: { color: '#fff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
    resolvedBtn: { flexDirection: 'row', backgroundColor: '#f0fdf4', paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
    resolvedText: { color: '#16a34a', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 }
});

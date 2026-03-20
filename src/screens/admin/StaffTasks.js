import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Feather';
import { showToast, showConfirm } from '../../../App';

export default function StaffTasks() {
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    
    // Form for new staff
    const [newName, setNewName] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        const sub = firestore().collection('staff_accounts').onSnapshot(snap => {
            if(snap) {
                setStaffList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setLoading(false);
            }
        });
        return () => sub();
    }, []);

    const handleCreateStaff = async () => {
        if (!newName || !newUsername || !newPassword) {
            return showToast('Please fill all fields.', 'warning');
        }

        setAdding(true);
        try {
            // Check if username exists
            const existing = await firestore().collection('staff_accounts')
                .where('username', '==', newUsername.trim().toLowerCase())
                .get();

            if (!existing.empty) {
                setAdding(false);
                return showToast('Username already taken.', 'error');
            }

            await firestore().collection('staff_accounts').add({
                name: newName.trim(),
                username: newUsername.trim().toLowerCase(),
                password: newPassword,
                role: 'Staff',
                createdAt: firestore.FieldValue.serverTimestamp()
            });

            setModalVisible(false);
            setNewName('');
            setNewUsername('');
            setNewPassword('');
            showToast('Staff account generated successfully!');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteStaff = async (id, name) => {
        showConfirm('Remove Staff', `Are you sure you want to revoke access for ${name}?`, async () => {
            await firestore().collection('staff_accounts').doc(id).delete();
            showToast('Staff removed', 'success');
        });
    };

    if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#3b82f6" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.title}>Workforce Panel</Text>
                    <Text style={styles.subtitle}>Manage staff credentials and access</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                    <Icon name="plus" size={16} color="#fff" />
                    <Text style={styles.addBtnText}>ADD STAFF</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={staffList}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <View style={styles.staffCard}>
                        <View style={styles.staffInfo}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View>
                                <Text style={styles.staffName}>{item.name}</Text>
                                <View style={styles.pointsBadge}>
                                    <Icon name="award" size={12} color="#f59e0b" />
                                    <Text style={styles.pointsText}>{item.points || 0} PTS</Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteStaff(item.id, item.name)}>
                            <Icon name="trash-2" size={18} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyWrap}>
                        <Icon name="users" size={48} color="#cbd5e1" />
                        <Text style={styles.emptyText}>No staff accounts registered yet.</Text>
                    </View>
                }
            />

            {/* Create Staff Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Generate Access Key</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Icon name="x" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput style={styles.input} value={newName} onChangeText={setNewName} placeholder="e.g. John Doe" placeholderTextColor="#cbd5e1" />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Staff Username</Text>
                            <TextInput style={styles.input} value={newUsername} onChangeText={setNewUsername} placeholder="e.g. john.doe" autoCapitalize="none" placeholderTextColor="#cbd5e1" />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Access Password</Text>
                            <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="Generate temporary password" secureTextEntry placeholderTextColor="#cbd5e1" />
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleCreateStaff} disabled={adding}>
                            {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>CREATE STAFF CREDENTIAL</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: '#f8fafc' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9' },
    title: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
    subtitle: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '600' },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 6 },
    addBtnText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    list: { padding: 20, gap: 12 },
    staffCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.03, elevation: 2 },
    staffInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatar: { width: 48, height: 48, backgroundColor: '#f1f5f9', borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 18, fontWeight: '900', color: '#3b82f6' },
    staffName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
    pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, backgroundColor: '#fff7ed', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
    pointsText: { fontSize: 10, fontWeight: '900', color: '#d97706' },
    deleteBtn: { padding: 12, backgroundColor: '#fef2f2', borderRadius: 12 },
    emptyWrap: { alignItems: 'center', marginTop: 60 },
    emptyText: { marginTop: 12, color: '#94a3b8', fontWeight: '600' },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', width: '100%', borderRadius: 32, padding: 30 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
    formGroup: { marginBottom: 20 },
    label: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
    input: { backgroundColor: '#f8fafc', height: 56, borderRadius: 16, paddingHorizontal: 20, fontSize: 15, fontWeight: '600', color: '#0f172a' },
    submitBtn: { backgroundColor: '#0f172a', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    submitText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 }
});

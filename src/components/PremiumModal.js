import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const PremiumModal = forwardRef((props, ref) => {
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState({ title: '', message: '', onConfirm: () => {} });

    useImperativeHandle(ref, () => ({
        confirm: (title, message, onConfirm) => {
            setConfig({ title, message, onConfirm });
            setVisible(true);
        }
    }));

    const handleConfirm = () => {
        setVisible(false);
        config.onConfirm && config.onConfirm();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.iconBox}>
                        <Icon name="help-circle" size={32} color="#3b82f6" />
                    </View>
                    <Text style={styles.title}>{config.title}</Text>
                    <Text style={styles.message}>{config.message}</Text>
                    
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setVisible(false)}>
                            <Text style={styles.cancelText}>CANCEL</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                            <Text style={styles.confirmText}>CONFIRM</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    content: { backgroundColor: '#fff', width: '100%', borderRadius: 32, padding: 30, alignItems: 'center' },
    iconBox: { width: 64, height: 64, backgroundColor: '#eff6ff', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 22, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
    message: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 10, lineHeight: 20, marginBottom: 30 },
    actions: { flexDirection: 'row', gap: 12, width: '100%' },
    cancelBtn: { flex: 1, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
    cancelText: { color: '#475569', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    confirmBtn: { flex: 1, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
    confirmText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 }
});

export default PremiumModal;

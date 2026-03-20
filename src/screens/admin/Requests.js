import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

export default function Requests() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Live Feed</Text>
                <Text style={styles.subtitle}>Premium Module</Text>
            </View>
            <View style={styles.content}>
                <Icon name="cloud-off" size={64} color="#e2e8f0" />
                <Text style={styles.emptyText}>Data syncing with Firebase...</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: { padding: 24, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f1f5f9' },
    title: { fontSize: 32, fontWeight: '900', color: '#5a4634', letterSpacing: -0.5 },
    subtitle: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { marginTop: 16, fontSize: 14, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }
});

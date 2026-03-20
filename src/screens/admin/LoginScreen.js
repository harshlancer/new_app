import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import { showToast } from '../../../App';

export default function LoginScreen({ navigation }) {
    const [guestID, setGuestID] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGuestLogin = async () => {
        const raw = guestID.trim();
        const id = raw.toUpperCase();
        if (!id) return;
        setLoading(true);
        try {
            const guestSnapshot = await firestore().collection('guests').where('guestID', '==', id).get();
            
            if (guestSnapshot.empty) {
                if (id === 'DEMO') {
                    const demoSession = { guestID: 'DEMO', room: '101' };
                    await AsyncStorage.setItem('guest_session', JSON.stringify(demoSession));
                    navigation.replace('GuestTabs');
                } else {
                    showToast('Invalid Guest ID. Please check with reception.', 'error');
                }
            } else {
                const guestData = guestSnapshot.docs[0].data();
                await AsyncStorage.setItem('guest_session', JSON.stringify(guestData));
                navigation.replace('GuestTabs');
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.logoWrap}>
                        <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
                    </View>
                    <Text style={styles.title}>Guest Login</Text>
                    <Text style={styles.subtitle}>Enter the Guest ID provided by reception</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.inputContainer}>
                        <Icon name="user" size={20} color="#94a3b8" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. GUEST123"
                            placeholderTextColor="#94a3b8"
                            value={guestID}
                            onChangeText={(t) => setGuestID(t.toUpperCase())}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="off"
                            inputMode="text"
                            keyboardType="default"
                        />
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleGuestLogin} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <View style={styles.buttonInner}>
                                <Text style={styles.buttonText}>ENTER ROOM</Text>
                                <Icon name="arrow-right" size={20} color="#fff" />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.adminButton} onPress={() => navigation.navigate('StaffLogin')}>
                    <Icon name="shield" size={16} color="#475569" />
                    <Text style={styles.adminButtonText}>Staff / Admin Login</Text>
                </TouchableOpacity>

                <View style={styles.footerLinks}>
                    <TouchableOpacity onPress={() => navigation.navigate('ContactUs')}>
                        <Text style={styles.footerLinkText}>Contact Us</Text>
                    </TouchableOpacity>
                    <Text style={styles.footerDivider}>|</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                        <Text style={styles.footerLinkText}>Privacy Policy</Text>
                    </TouchableOpacity>
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 40 },
    logoWrap: { width: 126, height: 126, borderRadius: 34, overflow: 'hidden', marginBottom: 16, padding: 14, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.16, shadowRadius: 24, elevation: 8, backgroundColor: '#ffffff' },
    logo: { width: '100%', height: '100%' },
    title: { fontSize: 32, fontWeight: '900', color: '#1e293b', marginTop: 16 },
    subtitle: { fontSize: 14, color: '#64748b', marginTop: 8, fontWeight: '500' },
    card: { backgroundColor: '#fff', width: '100%', padding: 24, borderRadius: 24, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 16, paddingHorizontal: 16, marginBottom: 24 },
    icon: { marginRight: 12 },
    input: { flex: 1, height: 56, fontSize: 16, fontWeight: '700', color: '#1e293b' },
    button: { backgroundColor: '#6366f1', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    buttonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    buttonText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
    adminButton: { flexDirection: 'row', alignItems: 'center', marginTop: 40, padding: 12, gap: 8 },
    adminButtonText: { color: '#475569', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    footerLinks: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    footerLinkText: { color: '#64748b', fontSize: 13, fontWeight: '700' },
    footerDivider: { marginHorizontal: 10, color: '#94a3b8', fontSize: 12, fontWeight: '700' }
});

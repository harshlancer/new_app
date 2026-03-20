import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import { showToast } from '../../../App';

export default function StaffLoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleStaffLogin = async () => {
        if (!email || !password) return showToast('Fields cannot be empty.', 'warning');
        
        // DEMO BYPASS ACCOUNT
        if (email.trim().toLowerCase() === 'admin' && password === 'Password123') {
            const dummyAdmin = { name: 'Demo Admin', role: 'Admin', email: 'admin@roomflow.demo', hotelId: 'hotel_grand' };
            await AsyncStorage.setItem('staff_session', JSON.stringify(dummyAdmin));
            return navigation.replace('AdminTabs');
        }
        if (email.trim().toLowerCase() === 'staff' && password === 'Password123') {
            const dummyStaff = { name: 'Demo Staff', role: 'Staff', email: 'staff@roomflow.demo', points: 150, username: 'staff' };
            await AsyncStorage.setItem('staff_session', JSON.stringify(dummyStaff));
            return navigation.replace('StaffStack');
        }
        
        setLoading(true);
        try {
            if (!email.includes('@')) {
                const adminQuery = await firestore().collection('admins')
                    .where('username', '==', email.trim().toLowerCase())
                    .where('password', '==', password)
                    .limit(1)
                    .get();

                if (!adminQuery.empty) {
                    const adminData = adminQuery.docs[0].data();
                    await AsyncStorage.setItem('staff_session', JSON.stringify(adminData));
                    navigation.replace('AdminTabs');
                    return;
                }

                const staffQuery = await firestore().collection('staff_accounts')
                    .where('username', '==', email.trim().toLowerCase())
                    .where('password', '==', password)
                    .get();

                if (!staffQuery.empty) {
                    const staffUser = staffQuery.docs[0].data();
                    const sessionData = { ...staffUser, role: 'Staff' };
                    await AsyncStorage.setItem('staff_session', JSON.stringify(sessionData));
                    navigation.replace('StaffStack');
                    return;
                } else {
                    throw new Error('Invalid staff username or password.');
                }
            }

            const userCredential = await auth().signInWithEmailAndPassword(email.trim(), password);
            const userDoc = await firestore().collection('users').doc(userCredential.user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.role === 'Admin') {
                    await AsyncStorage.setItem('staff_session', JSON.stringify(userData));
                    navigation.replace('AdminTabs');
                } else if (userData.role === 'Staff') {
                    await AsyncStorage.setItem('staff_session', JSON.stringify(userData));
                    navigation.replace('StaffStack');
                } else {
                    await auth().signOut();
                    showToast('Access Denied: Non-staff account.', 'error');
                }
            } else {
                await auth().signOut();
                showToast('User record not found.', 'error');
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
                <View style={styles.hero}>
                    <View style={styles.logoWrap}>
                        <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
                    </View>
                    <Text style={styles.title}>Team Access</Text>
                    <Text style={styles.subtitle}>Staff and admin authentication</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.inputContainer}>
                        <Icon name="user" size={18} color="#94a3b8" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Username or Email"
                            placeholderTextColor="#94a3b8"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="lock" size={18} color="#94a3b8" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#94a3b8"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleStaffLogin} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <View style={styles.buttonInner}>
                                <Text style={styles.buttonText}>SIGN IN</Text>
                                <Icon name="arrow-right" size={18} color="#fff" />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={14} color="#cbd5e1" />
                    <Text style={styles.backButtonText}>Back to Guest Login</Text>
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
    container: { flex: 1, backgroundColor: '#0b1224' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    hero: { width: '100%', alignItems: 'center', marginBottom: 20 },
    logoWrap: { width: 126, height: 126, borderRadius: 34, overflow: 'hidden', marginBottom: 14, padding: 14, shadowColor: '#38bdf8', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 9, backgroundColor: '#ffffff' },
    logo: { width: '100%', height: '100%' },
    title: { fontSize: 28, fontWeight: '900', color: '#e2e8f0', letterSpacing: 1 },
    subtitle: { fontSize: 12, color: '#94a3b8', marginTop: 6, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
    card: { backgroundColor: '#0f172a', width: '100%', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#1f2937', marginTop: 20, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, elevation: 8 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 14, paddingHorizontal: 14, marginBottom: 14, borderWidth: 1, borderColor: '#1f2937' },
    icon: { marginRight: 10 },
    input: { flex: 1, height: 52, fontSize: 15, fontWeight: '600', color: '#e5e7eb' },
    button: { backgroundColor: '#22c55e', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 12, shadowColor: '#22c55e', shadowOpacity: 0.25, shadowRadius: 12, elevation: 5 },
    buttonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    buttonText: { color: '#0b1224', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
    backButton: { flexDirection: 'row', alignItems: 'center', marginTop: 24, padding: 10, gap: 8 },
    backButtonText: { color: '#9ca3af', fontSize: 13, fontWeight: '700' },
    footerLinks: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    footerLinkText: { color: '#cbd5e1', fontSize: 13, fontWeight: '700' },
    footerDivider: { marginHorizontal: 10, color: '#64748b', fontSize: 12, fontWeight: '700' }
});

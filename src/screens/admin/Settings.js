import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    TextInput, ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import firestore from '@react-native-firebase/firestore';
import { showToast } from '../../../App';
import { getHotelConfigRef, getStoredHotelId } from '../../utils/hotelSession';

const quickLinks = [
    { icon: 'mail', label: 'Contact Us', description: 'Email and website details for RoomFlow support.', route: 'ContactUs' },
    { icon: 'shield', label: 'Privacy Policy', description: 'See the current policy used for Play Store and in-app disclosure.', route: 'PrivacyPolicy' },
];

const FieldLabel = ({ icon, label }) => (
    <View style={styles.fieldLabelRow}>
        <Icon name={icon} size={13} color="#6366f1" />
        <Text style={styles.fieldLabel}>{label}</Text>
    </View>
);

export default function Settings({ navigation }) {
    const [hotelName, setHotelName] = useState('');
    const [hotelId, setHotelId] = useState('');
    const [googleMapsLink, setGoogleMapsLink] = useState('');
    const [taxRate, setTaxRate] = useState('');
    const [lateCheckoutFee, setLateCheckoutFee] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const successAnim = useRef(new Animated.Value(0)).current;
    const [sessionHotelId, setSessionHotelId] = useState(null);

    // Load hotel config from Firestore
    useEffect(() => {
        let unsubscribe;

        const init = async () => {
            const activeHotelId = await getStoredHotelId();
            setSessionHotelId(activeHotelId);
            unsubscribe = getHotelConfigRef(activeHotelId).onSnapshot(snap => {
                if (snap && snap.exists) {
                    const d = snap.data();
                    if (d) {
                        setHotelName(d.hotelName || '');
                        setHotelId(d.hotelId || activeHotelId || '');
                        setGoogleMapsLink(d.googleMapsLink || '');
                        setTaxRate(d.taxRate != null ? String(d.taxRate) : '');
                        setLateCheckoutFee(d.lateCheckoutFee != null ? String(d.lateCheckoutFee) : '');
                    }
                }
                setLoading(false);
            });
        };

        init();
        return () => unsubscribe && unsubscribe();
    }, []);

    const handleSave = async () => {
        if (!hotelName.trim()) return showToast('Hotel name is required', 'warning');
        if (!hotelId.trim()) return showToast('Hotel ID is required', 'warning');
        const taxNum = parseFloat(taxRate);
        if (isNaN(taxNum) || taxNum < 0 || taxNum > 100) return showToast('Tax rate must be 0–100%', 'warning');
        const feeNum = parseFloat(lateCheckoutFee);
        if (isNaN(feeNum) || feeNum < 0) return showToast('Late checkout fee must be a valid amount', 'warning');

        setSaving(true);
        try {
            await getHotelConfigRef(sessionHotelId || hotelId.trim()).set({
                hotelName: hotelName.trim(),
                hotelId: sessionHotelId || hotelId.trim(),
                googleMapsLink: googleMapsLink.trim(),
                taxRate: taxNum,
                lateCheckoutFee: feeNum,
                updatedAt: firestore.FieldValue.serverTimestamp(),
            });
            setIsEditing(false);
            showToast('Hotel settings saved!', 'success');
            Animated.sequence([
                Animated.timing(successAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.delay(1400),
                Animated.timing(successAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start();
        } catch (e) {
            showToast('Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <View style={styles.loader}>
            <ActivityIndicator size="large" color="#6366f1" />
        </View>
    );

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Property Settings</Text>
                    <Text style={styles.subtitle}>Hotel configuration & system preferences</Text>
                </View>

                {!isEditing ? (
                    /* ── Read-only Summary Card ── */
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryHeader}>
                            <View style={styles.summaryBrandRow}>
                                <View style={styles.summaryLogo}>
                                    <Text style={styles.summaryLogoText}>{hotelName?.charAt(0) || 'H'}</Text>
                                </View>
                                <View>
                                    <Text style={styles.summaryHotelName}>{hotelName || 'Set Hotel Name'}</Text>
                                    <Text style={styles.summaryHotelId}>ID: {hotelId || 'N/A'}</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.editIconBtn} onPress={() => setIsEditing(true)}>
                                <Icon name="edit-3" size={18} color="#6366f1" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.summaryGrid}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>TAX RATE</Text>
                                <Text style={styles.summaryValue}>{taxRate || '0'}%</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>LC FEE</Text>
                                <Text style={styles.summaryValue}>₹{lateCheckoutFee || '0'}/hr</Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.primaryEditBtn} onPress={() => setIsEditing(true)}>
                            <Icon name="sliders" size={16} color="#fff" />
                            <Text style={styles.primaryEditBtnText}>Manage Configuration</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* ── Hotel Identity ── */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={styles.sectionIconCircle}>
                                    <Icon name="home" size={18} color="#6366f1" />
                                </View>
                                <View>
                                    <Text style={styles.sectionTitle}>Hotel Identity</Text>
                                    <Text style={styles.sectionSub}>Visible on guest-facing screens & reports</Text>
                                </View>
                            </View>

                            <FieldLabel icon="tag" label="HOTEL NAME" />
                            <TextInput
                                style={styles.input}
                                value={hotelName}
                                onChangeText={setHotelName}
                                placeholder="e.g. Grand Hyatt Mumbai"
                                placeholderTextColor="#94a3b8"
                            />

                            <FieldLabel icon="hash" label="HOTEL ID / CODE" />
                            <TextInput
                                style={styles.input}
                                value={hotelId}
                                onChangeText={setHotelId}
                                placeholder="e.g. GH-MUM-001"
                                placeholderTextColor="#94a3b8"
                                autoCapitalize="characters"
                            />

                            <FieldLabel icon="map-pin" label="GOOGLE MAPS / REVIEW LINK (Optional)" />
                            <TextInput
                                style={styles.input}
                                value={googleMapsLink}
                                onChangeText={setGoogleMapsLink}
                                placeholder="e.g. https://g.page/r/.../review"
                                placeholderTextColor="#94a3b8"
                                autoCapitalize="none"
                            />
                        </View>

                        {/* ── Financial Config ── */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIconCircle, { backgroundColor: '#fef3c7' }]}>
                                    <Icon name="dollar-sign" size={18} color="#d97706" />
                                </View>
                                <View>
                                    <Text style={styles.sectionTitle}>Financial Configuration</Text>
                                    <Text style={styles.sectionSub}>Applied to billing & revenue reports</Text>
                                </View>
                            </View>

                            <FieldLabel icon="percent" label="TAX RATE (%)" />
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    value={taxRate}
                                    onChangeText={setTaxRate}
                                    placeholder="e.g. 18"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="decimal-pad"
                                />
                                <View style={styles.inputSuffix}>
                                    <Text style={styles.inputSuffixText}>%</Text>
                                </View>
                            </View>
                        </View>

                        {/* ── Late Checkout Policy ── */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIconCircle, { backgroundColor: '#fce7f3' }]}>
                                    <Icon name="clock" size={18} color="#db2777" />
                                </View>
                                <View>
                                    <Text style={styles.sectionTitle}>Late Checkout Policy</Text>
                                    <Text style={styles.sectionSub}>Fee charged per extra hour beyond checkout time</Text>
                                </View>
                            </View>

                            <FieldLabel icon="clock" label="FEE PER EXTRA HOUR (₹ or $)" />
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    value={lateCheckoutFee}
                                    onChangeText={setLateCheckoutFee}
                                    placeholder="e.g. 500"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="decimal-pad"
                                />
                                <View style={styles.inputSuffix}>
                                    <Text style={styles.inputSuffixText}>/hr</Text>
                                </View>
                            </View>

                            <View style={styles.infoBox}>
                                <Icon name="info" size={13} color="#db2777" />
                                <Text style={styles.infoText}>
                                    Guests can request late checkout from their portal. Admin approves each request.
                                    This fee is shown to guests before they request.
                                </Text>
                            </View>
                        </View>

                        {/* ── Save Button ── */}
                        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Icon name="check" size={18} color="#fff" />
                                    <Text style={styles.saveBtnText}>Apply Changes</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)} disabled={saving}>
                            <Text style={styles.cancelBtnText}>Discard Changes</Text>
                        </TouchableOpacity>
                    </>
                )}

                {/* ── Support Links ── */}
                <View style={styles.supportSection}>
                    <Text style={styles.supportSectionLabel}>SUPPORT & LEGAL</Text>
                    <View style={styles.panel}>
                        <View style={styles.panelHeader}>
                            <Icon name="life-buoy" size={18} color="#5a4634" />
                            <Text style={styles.panelTitle}>Support Desk</Text>
                        </View>
                        <Text style={styles.panelBody}>
                            RoomFlow support is available at roomflow.in@gmail.com and www.roomflow.in.
                        </Text>
                    </View>

                    {quickLinks.map((item) => (
                        <TouchableOpacity
                            key={item.label}
                            activeOpacity={0.9}
                            style={styles.linkCard}
                            onPress={() => navigation.navigate(item.route)}
                        >
                            <View style={styles.linkIcon}>
                                <Icon name={item.icon} size={18} color="#5a4634" />
                            </View>
                            <View style={styles.linkText}>
                                <Text style={styles.linkTitle}>{item.label}</Text>
                                <Text style={styles.linkDescription}>{item.description}</Text>
                            </View>
                            <Icon name="chevron-right" size={18} color="#8b7355" />
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
    container: { flex: 1, backgroundColor: '#f9fafb' },
    content: { padding: 20, gap: 0 },

    header: { paddingTop: 50, paddingBottom: 20, marginBottom: 8 },
    title: { fontSize: 30, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
    subtitle: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '600' },

    section: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.04, elevation: 2 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    sectionIconCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
    sectionSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

    fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    fieldLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5 },

    input: { backgroundColor: '#f8fafc', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontWeight: '700', color: '#0f172a', borderWidth: 1.5, borderColor: '#e2e8f0', marginBottom: 16 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    inputSuffix: { paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#f1f5f9', borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0' },
    inputSuffixText: { fontSize: 14, fontWeight: '800', color: '#475569' },

    infoBox: { flexDirection: 'row', gap: 8, backgroundColor: '#fff0f9', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#fbcfe8', alignItems: 'flex-start' },
    infoText: { flex: 1, fontSize: 11, color: '#9d174d', lineHeight: 16 },

    saveBtn: { backgroundColor: '#6366f1', borderRadius: 18, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16, shadowColor: '#6366f1', shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
    cancelBtn: { paddingVertical: 14, alignItems: 'center' },
    cancelBtnText: { color: '#64748b', fontSize: 13, fontWeight: '700' },

    summaryCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: '#eceff3', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 4 },
    summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    summaryBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    summaryLogo: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
    summaryLogoText: { fontSize: 24, fontWeight: '900', color: '#6366f1' },
    summaryHotelName: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    summaryHotelId: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
    editIconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    summaryGrid: { flexDirection: 'row', gap: 24, marginBottom: 24 },
    summaryItem: { flex: 1 },
    summaryLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 4 },
    summaryValue: { fontSize: 20, fontWeight: '900', color: '#4a3b2c' },
    primaryEditBtn: { backgroundColor: '#6366f1', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    primaryEditBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },

    supportSection: { gap: 12 },
    supportSectionLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 2, marginBottom: 4 },
    panel: { backgroundColor: '#fff8ef', borderWidth: 1, borderColor: '#ead8bf', borderRadius: 20, padding: 20 },
    panelHeader: { flexDirection: 'row', alignItems: 'center' },
    panelTitle: { marginLeft: 10, fontSize: 16, fontWeight: '800', color: '#5a4634' },
    panelBody: { marginTop: 10, fontSize: 13, lineHeight: 20, color: '#6b5a46' },
    linkCard: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#eceff3', padding: 18, flexDirection: 'row', alignItems: 'center' },
    linkIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#f4ede3', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    linkText: { flex: 1 },
    linkTitle: { fontSize: 16, fontWeight: '800', color: '#4a3b2c' },
    linkDescription: { marginTop: 4, fontSize: 13, lineHeight: 20, color: '#64748b' },
});

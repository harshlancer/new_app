import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { openEmailLink, openExternalLink } from '../utils/externalLinks';

const SUPPORT_EMAIL = 'roomflow.in@gmail.com';
const WEBSITE_URL = 'https://www.roomflow.in';
const LAST_UPDATED = 'March 20, 2026';

const policySections = [
    {
        title: 'Scope',
        body: 'This Privacy Policy applies to the RoomFlow mobile application and related support services operated under the RoomFlow brand.',
    },
    {
        title: 'Information We Collect',
        bullets: [
            'Guest and staff details entered into the app (names, usernames, business emails).',
            'Operational content (service requests, concierge chat, maintenance logs).',
            'Local session data to keep you signed in securely.',
            'Notification tokens for real-time status updates.',
        ],
    },
    {
        title: 'How We Use Information',
        bullets: [
            'To authenticate users and provide role-based access.',
            'To manage hospitality workflows (dining, amenities, room readiness).',
            'To deliver real-time service notifications.',
            'To maintain security and improve app reliability.',
        ],
    },
    {
        title: 'Storage And Sharing',
        bullets: [
            'Data is stored securely using industry-standard cloud providers.',
            'We strictly do not sell your personal information.',
            'Information is shared only with essential infrastructure providers.',
        ],
    },
];

export default function PrivacyPolicyScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                style={styles.container} 
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backButton} 
                        onPress={() => navigation?.goBack()}
                    >
                        <Icon name="arrow-left" size={24} color="#f8fafc" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Legal & Privacy</Text>
                </View>

                {/* Hero */}
                <View style={styles.heroCard}>
                    <LinearGradient
                        colors={['#1e293b', '#0f172a']}
                        style={styles.heroGradient}
                    >
                        <View style={styles.heroIconContainer}>
                            <Icon name="shield" size={32} color="#10b981" />
                        </View>
                        <Text style={styles.heroTitle}>Your Privacy Matters</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Last Updated: {LAST_UPDATED}</Text>
                        </View>
                        <Text style={styles.heroSubtitle}>
                            We are committed to protecting your data and being transparent about how we use it to enhance your experience.
                        </Text>
                    </LinearGradient>
                </View>

                {/* Policy Sections */}
                {policySections.map((section) => (
                    <View key={section.title} style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        {section.body ? <Text style={styles.sectionBody}>{section.body}</Text> : null}
                        {section.bullets
                            ? section.bullets.map((bullet) => (
                                <View key={bullet} style={styles.bulletRow}>
                                    <View style={styles.bulletCircle}>
                                        <Icon name="check" size={12} color="#10b981" />
                                    </View>
                                    <Text style={styles.bulletText}>{bullet}</Text>
                                </View>
                            ))
                            : null}
                    </View>
                ))}

                {/* Contact Footer */}
                <View style={styles.contactCard}>
                    <Text style={styles.contactTitle}>Questions?</Text>
                    <Text style={styles.contactText}>
                        If you have any questions about this policy, please reach out to our privacy team.
                    </Text>
                    
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.primaryButton}
                            onPress={() => openEmailLink(SUPPORT_EMAIL)}
                        >
                            <Icon name="mail" size={16} color="#0b1224" />
                            <Text style={styles.primaryButtonText}>Email Us</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.secondaryButton}
                            onPress={() => openExternalLink(WEBSITE_URL, 'Unable to open website.')}
                        >
                            <Icon name="globe" size={16} color="#94a3b8" />
                            <Text style={styles.secondaryButtonText}>Website</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>© 2026 RoomFlow Hospitality Systems</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0b1224' },
    content: { padding: 20, paddingBottom: 40 },
    
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: Platform.OS === 'android' ? 10 : 0,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#1e293b',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#f8fafc',
    },

    heroCard: {
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#334155',
    },
    heroGradient: {
        padding: 24,
        alignItems: 'center',
    },
    heroIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: '#10b98115',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#10b98130',
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#f8fafc',
        marginBottom: 12,
    },
    badge: {
        backgroundColor: '#1e293b',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    heroSubtitle: {
        fontSize: 14,
        lineHeight: 22,
        color: '#94a3b8',
        textAlign: 'center',
    },

    sectionCard: {
        backgroundColor: '#0f172a',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1e293b',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#f1f5f9',
        marginBottom: 12,
    },
    sectionBody: {
        fontSize: 14,
        lineHeight: 22,
        color: '#94a3b8',
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 12,
    },
    bulletCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#10b98115',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    bulletText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        color: '#cbd5e1',
    },

    contactCard: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 24,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#334155',
    },
    contactTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#f8fafc',
        marginBottom: 8,
    },
    contactText: {
        fontSize: 14,
        color: '#94a3b8',
        lineHeight: 20,
        marginBottom: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    primaryButton: {
        flex: 1.5,
        backgroundColor: '#10b981',
        height: 48,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    secondaryButton: {
        flex: 1,
        backgroundColor: '#0f172a',
        height: 48,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#334155',
        gap: 8,
    },
    primaryButtonText: {
        color: '#0b1224',
        fontSize: 13,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    secondaryButtonText: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: '800',
        textTransform: 'uppercase',
    },

    footer: {
        marginTop: 32,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 11,
        color: '#475569',
        fontWeight: '700',
    },
});

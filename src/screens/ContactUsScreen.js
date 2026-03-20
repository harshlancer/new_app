import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { openEmailLink, openExternalLink } from '../utils/externalLinks';

const SUPPORT_EMAIL = 'roomflow.in@gmail.com';
const WEBSITE_URL = 'https://www.roomflow.in';
const WEBSITE_LABEL = 'www.roomflow.in';

const contactChannels = [
    {
        icon: 'mail',
        label: 'Email Support',
        value: SUPPORT_EMAIL,
        description: 'Best for technical support and account inquiries.',
        actionLabel: 'Send Message',
        color: '#3b82f6',
        onPress: () => openEmailLink(SUPPORT_EMAIL),
    },
    {
        icon: 'globe',
        label: 'Official Website',
        value: WEBSITE_LABEL,
        description: 'Explore more about our features and updates.',
        actionLabel: 'Visit Website',
        color: '#10b981',
        onPress: () => openExternalLink(WEBSITE_URL, 'Unable to open the RoomFlow website right now.'),
    },
];

export default function ContactUsScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                style={styles.container} 
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backButton} 
                        onPress={() => navigation?.goBack()}
                    >
                        <Icon name="arrow-left" size={24} color="#f8fafc" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Support Center</Text>
                </View>

                {/* Hero Section */}
                <View style={styles.heroCard}>
                    <LinearGradient
                        colors={['#1e293b', '#0f172a']}
                        style={styles.heroGradient}
                    >
                        <View style={styles.heroIconContainer}>
                            <Icon name="help-circle" size={32} color="#38bdf8" />
                        </View>
                        <Text style={styles.heroTitle}>How can we help?</Text>
                        <Text style={styles.heroSubtitle}>
                            Our team is here to assist you with onboarding, technical support, or any questions about RoomFlow.
                        </Text>
                    </LinearGradient>
                </View>

                {/* Contact Options */}
                <Text style={styles.sectionLabel}>Direct Channels</Text>
                
                {contactChannels.map((channel) => (
                    <TouchableOpacity 
                        key={channel.label} 
                        style={styles.infoCard}
                        onPress={channel.onPress}
                        activeOpacity={0.7}
                    >
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconBox, { backgroundColor: channel.color + '15' }]}>
                                <Icon name={channel.icon} size={22} color={channel.color} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.infoLabel}>{channel.label}</Text>
                                <Text style={styles.infoValue}>{channel.value}</Text>
                            </View>
                        </View>
                        
                        <Text style={styles.description}>{channel.description}</Text>
                        
                        <View style={[styles.inlineButton, { borderColor: channel.color + '30' }]}>
                            <Text style={[styles.inlineButtonText, { color: channel.color }]}>{channel.actionLabel}</Text>
                            <Icon name="chevron-right" size={16} color={channel.color} />
                        </View>
                    </TouchableOpacity>
                ))}

                {/* Note Card */}
                <View style={styles.availabilityCard}>
                    <View style={styles.availabilityHeader}>
                        <Icon name="clock" size={18} color="#94a3b8" />
                        <Text style={styles.availabilityTitle}>Response Policy</Text>
                    </View>
                    <Text style={styles.availabilityText}>
                        We typically respond within 24 hours. For faster resolution, please include your <Text style={{fontWeight: '700', color: '#e2e8f0'}}>Hotel Name</Text> and a brief description of the issue.
                    </Text>
                </View>
                
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Version 1.2.0 • Made with ❤️ for Hospitality</Text>
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
        letterSpacing: 0.5,
    },

    heroCard: {
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#334155',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    heroGradient: {
        padding: 24,
        alignItems: 'center',
    },
    heroIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: '#0ea5e920',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#0ea5e940',
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#f8fafc',
        marginBottom: 8,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: 14,
        lineHeight: 22,
        color: '#94a3b8',
        textAlign: 'center',
        paddingHorizontal: 10,
    },

    sectionLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 16,
        marginLeft: 4,
    },

    infoCard: {
        backgroundColor: '#0f172a',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1e293b',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    textContainer: { flex: 1 },
    infoLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#f1f5f9',
        marginTop: 2,
    },
    description: {
        fontSize: 13,
        color: '#64748b',
        lineHeight: 18,
        marginBottom: 16,
    },
    inlineButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: '#1e293b50',
        borderRadius: 12,
        borderWidth: 1,
    },
    inlineButtonText: {
        fontSize: 13,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    availabilityCard: {
        backgroundColor: '#0f172a',
        borderRadius: 20,
        padding: 20,
        marginTop: 16,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#334155',
    },
    availabilityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    availabilityTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#cbd5e1',
    },
    availabilityText: {
        fontSize: 13,
        lineHeight: 20,
        color: '#94a3b8',
    },

    footer: {
        marginTop: 32,
        alignItems: 'center',
        paddingVertical: 20,
    },
    footerText: {
        fontSize: 11,
        color: '#475569',
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});

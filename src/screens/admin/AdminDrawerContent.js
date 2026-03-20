import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function AdminDrawerContent(props) {
    const { state, navigation } = props;

    const [pendingLC, setPendingLC] = React.useState(0);

    React.useEffect(() => {
        const unsub = firestore().collection('late_checkout_requests')
            .where('status', '==', 'pending')
            .onSnapshot(snap => {
                if (snap) setPendingLC(snap.size);
            });
        return unsub;
    }, []);

    const navItems = [
        { label: 'Overview', route: 'Dashboard', icon: 'grid' },
        { label: 'Active Rooms', route: 'Rooms', icon: 'square' },
        { label: 'Late Checkout', route: 'LateCheckoutRequests', icon: 'clock', badge: pendingLC },
        { label: 'Maintenance', route: 'Maintenance', icon: 'tool' },
        { label: 'Live Requests', route: 'Requests', icon: 'clipboard' },
        { label: 'CRM Dashboard', route: 'CRM', icon: 'shield' },
        { label: 'Staff Panel', route: 'Staff', icon: 'users' },
        { label: 'Analytics', route: 'Analytics', icon: 'bar-chart-2' },
    ];

    const currentRouteName = state && state.routeNames ? state.routeNames[state.index] : 'Dashboard';

    const handleSignOut = async () => {
        try {
            await AsyncStorage.removeItem('staff_session');
            if (auth().currentUser) {
                await auth().signOut();
            }
            navigation.replace('Login');
        } catch(e) {
            console.log(e);
        }
    };

    return (
        <View style={styles.container}>
            <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
                {/* Brand Logo Area */}
                <View style={styles.brandContainer}>
                    <View style={styles.logoBox}>
                        <Text style={styles.logoChar}>R</Text>
                    </View>
                    <Text style={styles.brandText}>RoomFlow</Text>
                </View>

                {/* Main Menu Label */}
                <Text style={styles.sectionLabel}>MAIN MENU</Text>

                <View style={styles.menuGroup}>
                    {navItems.map((item, index) => {
                        const isActive = currentRouteName === item.route;
                        return (
                            <TouchableOpacity
                                key={index}
                                activeOpacity={0.8}
                                onPress={() => navigation.navigate(item.route)}
                                style={[styles.navItem, isActive && styles.navItemActive]}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <Icon 
                                        name={item.icon} 
                                        size={18} 
                                        color={isActive ? '#fff' : '#475569'} 
                                        style={styles.icon}
                                    />
                                    <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
                                </View>
                                {item.badge > 0 && (
                                    <View style={[styles.itemBadge, isActive && { backgroundColor: '#fff' }]}>
                                        <Text style={[styles.itemBadgeText, isActive && { color: '#5a4634' }]}>{item.badge}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.divider} />
                <Text style={styles.sectionLabel}>SYSTEM</Text>

                <View style={styles.menuGroup}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('Settings')}
                        style={[styles.navItem, currentRouteName === 'Settings' && styles.navItemActive]}
                    >
                        <Icon name="settings" size={18} color={currentRouteName === 'Settings' ? '#fff' : '#475569'} style={styles.icon} />
                        <Text style={[styles.navLabel, currentRouteName === 'Settings' && styles.navLabelActive]}>Settings</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleSignOut}
                        style={styles.navItem}
                    >
                        <Icon name="log-out" size={18} color="#ef4444" style={styles.icon} />
                        <Text style={[styles.navLabel, { color: '#ef4444' }]}>Sign Out</Text>
                    </TouchableOpacity>
                </View>

            </DrawerContentScrollView>

            <View style={styles.footer}>
                <View style={styles.userBadge}>
                    <Text style={styles.userInitials}>AR</Text>
                    <View style={styles.statusDot}></View>
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>Alex Rivera</Text>
                    <Text style={styles.userRole}>ADMIN</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fdfdfc' },
    brandContainer: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingTop: 40, marginBottom: 10 },
    logoBox: { width: 32, height: 32, backgroundColor: '#f4f1ea', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    logoChar: { color: '#5a4634', fontSize: 18, fontWeight: '900' },
    brandText: { fontSize: 24, fontWeight: '900', color: '#5a4634', letterSpacing: -0.5 },
    
    sectionLabel: { paddingHorizontal: 28, fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 2, marginBottom: 12, marginTop: 10 },
    menuGroup: { paddingHorizontal: 16 },
    
    navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4 },
    navItemActive: { backgroundColor: '#5a4634', shadowColor: '#5a4634', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
    icon: { marginRight: 16 },
    navLabel: { fontSize: 14, fontWeight: '700', color: '#4a3b2c' },
    navLabelActive: { color: '#fff' },
    
    divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12, marginHorizontal: 24 },
    
    footer: { padding: 24, borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center' },
    userBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginRight: 12, position: 'relative' },
    userInitials: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    statusDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, backgroundColor: '#10b981', borderRadius: 5, borderWidth: 2, borderColor: '#fff' },
    userInfo: { flex: 1 },
    userName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
    userRole: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },

    itemBadge: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, minWidth: 20, alignItems: 'center', justifyContent: 'center' },
    itemBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
});

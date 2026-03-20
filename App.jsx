import React, { useEffect, useState, useRef } from 'react';
import { TouchableOpacity, View, StatusBar, Image, Text, Animated, Easing } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/Feather';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

import { SocketProvider, useSocket } from './src/context/SocketContext';
import { CartProvider } from './src/context/CartContext';
import AdminDrawerContent from './src/components/AdminDrawerContent';
import { NotificationService } from './src/utils/NotificationService';
import firestore from '@react-native-firebase/firestore';
import PremiumToast from './src/components/PremiumToast';
import PremiumModal from './src/components/PremiumModal';

// Global Toast Ref
export const toastRef = React.createRef();
export const showToast = (msg, type) => toastRef.current?.show(msg, type);

export const modalRef = React.createRef();
export const showConfirm = (title, msg, onConfirm) => modalRef.current?.confirm(title, msg, onConfirm);

// Screens
import LoginScreen from './src/screens/LoginScreen';
import StaffLoginScreen from './src/screens/staff/StaffLoginScreen';
import GuestHome from './src/screens/guest/GuestHome';
import GuestDining from './src/screens/guest/GuestDining';
import GuestCart from './src/screens/guest/GuestCart';
import GuestLaundry from './src/screens/guest/GuestLaundry';
import GuestAmenities from './src/screens/guest/GuestAmenities';
import GuestChat from './src/screens/guest/GuestChat';
import AdminOverview from './src/screens/admin/AdminOverview';
import AdminOnboarding from './src/screens/admin/AdminOnboarding';
import RoomManagement from './src/screens/admin/RoomManagement';
import Requests from './src/screens/admin/Requests';
import CRM from './src/screens/admin/CRM';
import Analytics from './src/screens/admin/Analytics';
import Maintenance from './src/screens/admin/Maintenance';
import StaffTasks from './src/screens/admin/StaffTasks';
import StaffProfile from './src/screens/admin/StaffProfile';
import MenuManagement from './src/screens/admin/MenuManagement';
import Settings from './src/screens/admin/Settings';
import AdminChat from './src/screens/admin/AdminChat';
import LateCheckoutRequests from './src/screens/admin/LateCheckoutRequests';
import StaffDashboard from './src/screens/staff/StaffDashboard';
import ComingSoon from './src/screens/ComingSoon';
import ContactUsScreen from './src/screens/ContactUsScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const legalScreenOptions = {
    headerShown: true,
    headerTintColor: '#0f172a',
    headerStyle: {
        backgroundColor: '#fff',
    },
    headerShadowVisible: false,
    headerTitleStyle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0f172a',
    },
};

const NotificationController = () => {
  const notifiedLCIds = useRef(new Set());
  useEffect(() => {
    NotificationService.initialize();

    let unsubRequests;
    let unsubMessages;
    let unsubLC;

    const setupListeners = async () => {
        const staffSessionStr = await AsyncStorage.getItem('staff_session');
        const guestSessionStr = await AsyncStorage.getItem('guest_session');
        
        // Use a timestamp to only notify about VERY recent events (ignore old history on startup)
        const startupTime = firestore.Timestamp.now().toMillis();

        if (staffSessionStr) {
            unsubRequests = firestore().collection('requests')
                .onSnapshot(snap => {
                    if (!snap) return;
                    snap.docChanges().forEach(change => {
                        if (change.type === 'added') {
                            const data = change.doc.data();
                            const docTime = data.timestamp?.toMillis ? data.timestamp.toMillis() : startupTime;
                            
                            // Only notify if it's Pending and roughly within the last 30 seconds of starting
                            if (data.status === 'Pending' && docTime > (startupTime - 30000)) {
                                NotificationService.showUpdateNotification(
                                    data.type === 'Dining' ? 'New Room Service Order' : `New ${data.type} Task`,
                                    `Room ${data.room}: ${data.details}`
                                );
                            }
                        }
                    });
                });

            unsubMessages = firestore().collection('messages')
                .onSnapshot(snap => {
                    if (!snap) return;
                    snap.docChanges().forEach(change => {
                        const data = change.doc.data();
                        
                        // ONLY notify if it's a Guest message and NOT already seen 
                        if (change.type === 'added' && data.sender === 'Guest' && !data.seen) {
                            const docTime = data.timestamp?.toMillis ? data.timestamp.toMillis() : startupTime;
                            
                            // Also ensure it's relatively recent (prevents history spam)
                            if (docTime > (startupTime - 30000)) {
                                NotificationService.showUpdateNotification(
                                    'New Message',
                                    `Room ${data.room}: ${data.text}`
                                );
                            }
                        }
                    });
                });
        } else if (guestSessionStr) {
            const guest = JSON.parse(guestSessionStr);
            unsubRequests = firestore().collection('requests')
                .where('room', '==', (guest.room || '').toString())
                .onSnapshot(snap => {
                    if (!snap) return;
                    snap.docChanges().forEach(change => {
                        const data = change.doc.data();
                        if (change.type === 'modified') {
                            if (data.status === 'Fulfilling') {
                                NotificationService.showUpdateNotification(
                                    'Request Accepted',
                                    `Our staff is now fulfilling your ${data.type || 'request'}.`
                                );
                            } else if (data.status === 'Completed') {
                                NotificationService.showUpdateNotification(
                                    'Service Completed',
                                    `Your ${data.type || 'request'} has been delivered/completed.`
                                );
                            }
                        }
                    });
                });

            // Listen for late checkout approval/denial
            unsubLC = firestore().collection('late_checkout_requests')
                .where('room', '==', (guest.room || '').toString())
                .onSnapshot(snap => {
                    if (!snap) return;
                    snap.docChanges().forEach(change => {
                        if (change.type === 'modified') {
                            const d = change.doc.data();
                            const docTime = d.approvedAt?.toMillis ? d.approvedAt.toMillis() :
                                            d.deniedAt?.toMillis ? d.deniedAt.toMillis() : 0;
                            if (docTime > (startupTime - 30000) && !notifiedLCIds.current.has(change.doc.id)) {
                                notifiedLCIds.current.add(change.doc.id);
                                if (d.status === 'approved') {
                                    const newTime = d.requestedTime
                                        ? new Date(d.requestedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        : 'your requested time';
                                    NotificationService.showUpdateNotification(
                                        '✅ Late Checkout Approved',
                                        `Great news! The hotel has approved your late checkout. New checkout time: ${newTime}. Additional fee: ₹${d.totalFee || 0}.`
                                    );
                                } else if (d.status === 'denied') {
                                    NotificationService.showUpdateNotification(
                                        'Late Checkout Update',
                                        `Your late checkout request for Room ${d.room} was not approved this time. Please proceed with your original checkout time.`
                                    );
                                }
                            }
                        }
                    });
                }, () => {});
        }
    };

    setupListeners();

    return () => {
        if (unsubRequests) unsubRequests();
        if (unsubMessages) unsubMessages();
        if (unsubLC) unsubLC();
    };
  }, []);

  return null;
};

/* ─────────────────────────────────────────── */
/*  Hamburger button shown in Admin screens    */
/* ─────────────────────────────────────────── */
const MenuButton = ({ navigation }) => (
    <TouchableOpacity
        onPress={() => navigation.openDrawer()}
        style={{ paddingLeft: 16, paddingRight: 8 }}
    >
        <Icon name="menu" size={22} color="#0f172a" />
    </TouchableOpacity>
);

/* ─────────────────────────────────────────── */
/*                 GUEST TABS                  */
/* ─────────────────────────────────────────── */
const GuestTabs = () => (
    <Tab.Navigator
        screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ color, size }) => {
                const icons = { Home: 'home', Services: 'coffee', Amenities: 'award', Chat: 'message-square' };
                return <Icon name={icons[route.name] || 'circle'} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#6366f1',
            tabBarInactiveTintColor: '#94a3b8',
            tabBarStyle: {
                backgroundColor: '#ffffff',
                borderTopWidth: 0,
                height: 72,
                paddingBottom: 10,
                paddingTop: 8,
                shadowColor: '#0f172a',
                shadowOpacity: 0.08,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: -6 },
                elevation: 12,
            },
            tabBarItemStyle: {
                paddingTop: 2,
            },
            tabBarHideOnKeyboard: true,
            tabBarLabelStyle: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
        })}
    >
        <Tab.Screen name="Home" component={GuestHome} />
        <Tab.Screen name="Services" component={GuestDining} />
        <Tab.Screen name="Amenities" component={GuestAmenities} />
        <Tab.Screen name="Chat" component={GuestChat} />
    </Tab.Navigator>
);

/* ─────────────────────────────────────────── */
/*               ADMIN DRAWER                  */
/* ─────────────────────────────────────────── */
const AdminDrawer = () => (
    <Drawer.Navigator
        drawerContent={(props) => <AdminDrawerContent {...props} />}
        screenOptions={({ navigation }) => ({
            headerLeft: () => <MenuButton navigation={navigation} />,
            headerStyle: {
                backgroundColor: '#fff',
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9',
            },
            headerTitleStyle: {
                fontSize: 17,
                fontWeight: '800',
                color: '#0f172a',
            },
            drawerType: 'slide',
            drawerStyle: { width: 300, backgroundColor: '#fff' },
            overlayColor: 'rgba(15, 23, 42, 0.4)',
        })}
    >
        <Drawer.Screen
            name="Dashboard"
            component={AdminOverview}
            options={{ title: 'Premium Overview' }}
        />
        <Drawer.Screen
            name="Rooms"
            component={RoomManagement}
            options={{ title: 'Inventory Control' }}
        />
        <Drawer.Screen
            name="Maintenance"
            component={Maintenance}
            options={{ title: 'Engineering Logs' }}
        />
        <Drawer.Screen
            name="Requests"
            component={Requests}
            options={{ title: 'Live Service Stream' }}
        />
        <Drawer.Screen
            name="CRM"
            component={CRM}
            options={{ title: 'Elite Guests' }}
        />
        <Drawer.Screen
            name="Staff"
            component={StaffTasks}
            options={{ title: 'Workforce Panel' }}
        />
        <Drawer.Screen
            name="Menu"
            component={MenuManagement}
            options={{ title: 'Dining Menu' }}
        />
        <Drawer.Screen
            name="Analytics"
            component={Analytics}
            options={{ title: 'Fiscal Growth' }}
        />
        <Drawer.Screen 
            name="Profile" 
            component={StaffProfile} 
            options={{ title: 'Admin Account' }}
        />
        <Drawer.Screen
            name="Settings"
            component={Settings}
            options={{ title: 'System Engine' }}
        />
        <Drawer.Screen
            name="AdminChat"
            component={AdminChat}
            options={{ title: 'Concierge Chat' }}
        />
        <Drawer.Screen
            name="LateCheckout"
            component={LateCheckoutRequests}
            options={{ title: 'Late Checkout' }}
        />
    </Drawer.Navigator>
);

/* ─────────────────────────────────────────── */
/*               STAFF STACK                  */
/* ─────────────────────────────────────────── */
const StaffStack = () => (
    <Stack.Navigator>
        <Stack.Screen 
            name="StaffHome" 
            component={StaffDashboard} 
            options={{ headerShown: false }}
        />
    </Stack.Navigator>
);

/* ─────────────────────────────────────────── */
/*               ROOT NAVIGATOR               */
/* ─────────────────────────────────────────── */
const App = () => {
    const [booting, setBooting] = useState(true);
    const fade = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(12)).current;

    useEffect(() => {
        Animated.timing(fade, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(slide, { toValue: -12, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(slide, { toValue: 12, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
            ])
        ).start();
        const t = setTimeout(() => setBooting(false), 1500);
        return () => clearTimeout(t);
    }, [fade, slide]);

    if (booting) {
        return (
            <LinearGradient colors={['#0b1224', '#111827']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <StatusBar barStyle="light-content" backgroundColor="#0b1224" />
                <Animated.View style={{ alignItems: 'center', opacity: fade, transform: [{ translateY: slide }] }}>
                    <View style={{ width: 180, height: 180, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.08)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 }}>
                        <Image source={require('./assets/logo.png')} style={{ width: 152, height: 152, resizeMode: 'contain', borderRadius: 38 }} />
                    </View>
                    <Text style={{ marginTop: 18, fontSize: 18, fontWeight: '900', color: '#e5e7eb', letterSpacing: 2 }}>ROOMFLOW</Text>
                    <Text style={{ marginTop: 6, fontSize: 13, fontWeight: '600', color: '#cbd5e1', letterSpacing: 0.5 }}>Hospitality Control Center</Text>
                </Animated.View>
            </LinearGradient>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <SocketProvider>
                    <CartProvider>
                        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                        <NavigationContainer>
                            <NotificationController />
                            <Stack.Navigator screenOptions={{ headerShown: false }}>
                                <Stack.Screen name="Login" component={LoginScreen} />
                                <Stack.Screen name="StaffLogin" component={StaffLoginScreen} />
                                <Stack.Screen name="ContactUs" component={ContactUsScreen} options={{ ...legalScreenOptions, title: 'Contact Us' }} />
                                <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ ...legalScreenOptions, title: 'Privacy Policy' }} />
                                <Stack.Screen name="GuestTabs" component={GuestTabs} />
                                <Stack.Screen name="GuestCart" component={GuestCart} />
                                <Stack.Screen name="GuestLaundry" component={GuestLaundry} />
                                <Stack.Screen name="AdminOnboarding" component={AdminOnboarding} />
                                <Stack.Screen name="AdminTabs" component={AdminDrawer} />
                                <Stack.Screen name="StaffStack" component={StaffStack} />
                            </Stack.Navigator>
                            <PremiumToast ref={toastRef} />
                            <PremiumModal ref={modalRef} />
                        </NavigationContainer>
                    </CartProvider>
                </SocketProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
};

export default App;

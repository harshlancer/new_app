import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

export async function getStoredStaffSession() {
    const raw = await AsyncStorage.getItem('staff_session');
    return raw ? JSON.parse(raw) : null;
}

export async function getStoredHotelId() {
    const session = await getStoredStaffSession();
    return session?.hotelId || null;
}

export function withHotelScope(query, hotelId) {
    return hotelId ? query.where('hotelId', '==', hotelId) : query;
}

export function getHotelConfigRef(hotelId) {
    return firestore().collection('hotel_config').doc(hotelId || 'settings');
}

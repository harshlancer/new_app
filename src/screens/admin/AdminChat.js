import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Feather';
import { showToast } from '../../../App';
import { getStoredHotelId, withHotelScope } from '../../utils/hotelSession';

export default function AdminChat() {
    const insets = useSafeAreaInsets();
    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const flatListRef = useRef();
    const [hotelId, setHotelId] = useState(null);

    // get recent rooms from guest messages
    useEffect(() => {
        let unsubscribe;

        const init = async () => {
            const activeHotelId = await getStoredHotelId();
            setHotelId(activeHotelId);
            unsubscribe = withHotelScope(firestore().collection('messages'), activeHotelId)
                .orderBy('timestamp', 'desc')
                .limit(40)
                .onSnapshot(snap => {
                    if (!snap) return;
                    const unique = [];
                    snap.docs.forEach(doc => {
                        const data = doc.data();
                        const room = data.room?.toString();
                        if (room && !unique.includes(room)) unique.push(room);
                    });
                    setRooms(unique);
                    if (!selectedRoom && unique.length > 0) setSelectedRoom(unique[0]);
                });
        };

        init();
        return () => unsubscribe && unsubscribe();
    }, [selectedRoom]);

    // messages for selected room
    useEffect(() => {
        if (!selectedRoom) return;
        const sub = withHotelScope(firestore().collection('messages'), hotelId)
            .where('room', '==', selectedRoom)
            .orderBy('timestamp', 'asc')
            .onSnapshot(snap => {
                if (snap) {
                    const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setMessages(msgs);
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);

                    // Mark guest messages as seen
                    snap.docs.forEach(doc => {
                        const data = doc.data();
                        if (data.sender === 'Guest' && !data.seen) {
                            doc.ref.update({ seen: true }).catch(() => {});
                        }
                    });
                }
            });
        return () => sub && sub();
    }, [selectedRoom]);

    const send = async () => {
        if (!input.trim() || !selectedRoom) return;
        const text = input.trim();
        setInput('');
        await firestore().collection('messages').add({
            hotelId,
            room: selectedRoom,
            sender: 'Admin',
            text,
            timestamp: firestore.FieldValue.serverTimestamp()
        });
        showToast('Message sent', 'success');
    };

    const renderMessage = ({ item }) => {
        const isAdmin = item.sender === 'Admin';
        return (
            <View style={[styles.msgRow, isAdmin ? styles.msgRowRight : styles.msgRowLeft]}>
                <View style={[styles.msgBubble, isAdmin ? styles.bubbleAdmin : styles.bubbleGuest]}>
                    <Text style={[styles.msgText, isAdmin && styles.msgTextAdmin]}>{item.text}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
            <KeyboardAvoidingView
                style={styles.keyboardWrap}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.select({ ios: insets.top + 12, android: 0 })}
            >
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Concierge Desk</Text>
                            <Text style={styles.subtitle}>Respond to guest chats in real time</Text>
                        </View>
                        <Icon name="message-square" size={22} color="#0f172a" />
                    </View>

                    <View style={styles.roomChips}>
                        <Text style={styles.roomLabel}>Rooms</Text>
                        <FlatList
                            data={rooms}
                            horizontal
                            keyExtractor={(r) => r}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.roomChipList}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.chip, selectedRoom === item && styles.chipActive]}
                                    onPress={() => setSelectedRoom(item)}
                                >
                                    <Text style={[styles.chipText, selectedRoom === item && styles.chipTextActive]}>Room {item}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.emptyRooms}>No guest chats yet</Text>}
                        />
                    </View>

                    <FlatList
                        ref={flatListRef}
                        style={styles.messageList}
                        data={messages}
                        keyExtractor={item => item.id}
                        renderItem={renderMessage}
                        contentContainerStyle={styles.messageContent}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    />

                    <View style={[styles.inputBar, { paddingBottom: Math.max(14, insets.bottom + 10) }]}>
                        <TextInput
                            style={styles.input}
                            placeholder={selectedRoom ? `Reply to Room ${selectedRoom}` : 'Select a room to reply'}
                            placeholderTextColor="#94a3b8"
                            value={input}
                            onChangeText={setInput}
                            editable={!!selectedRoom}
                        />
                        <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={!selectedRoom || !input.trim()}>
                            <Icon name="send" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f8fafc' },
    keyboardWrap: { flex: 1 },
    container: { flex: 1 },
    header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
    subtitle: { fontSize: 12, color: '#64748b', marginTop: 4 },
    roomChips: { paddingHorizontal: 16, paddingBottom: 8 },
    roomLabel: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    roomChipList: { gap: 10 },
    chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#e2e8f0' },
    chipActive: { backgroundColor: '#0f172a' },
    chipText: { fontSize: 12, fontWeight: '800', color: '#475569' },
    chipTextActive: { color: '#fff' },
    emptyRooms: { fontSize: 12, color: '#94a3b8' },
    messageList: { flex: 1 },
    messageContent: { padding: 16, paddingBottom: 28, flexGrow: 1 },
    msgRow: { width: '100%', marginBottom: 12 },
    msgRowLeft: { alignItems: 'flex-start' },
    msgRowRight: { alignItems: 'flex-end' },
    msgBubble: { maxWidth: '78%', padding: 14, borderRadius: 16 },
    bubbleGuest: { backgroundColor: '#fff', borderTopLeftRadius: 2, shadowColor: '#000', shadowOpacity: 0.04, elevation: 1 },
    bubbleAdmin: { backgroundColor: '#0f172a', borderTopRightRadius: 2 },
    msgText: { fontSize: 14, color: '#0f172a' },
    msgTextAdmin: { color: '#fff' },
    inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
    input: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: '#0f172a' },
    sendBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }
});

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';

export default function GuestChat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [guest, setGuest] = useState(null);
    const flatListRef = useRef();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        let unsub;
        setupChat().then(fn => { unsub = fn; });
        return () => unsub && unsub();
    }, []);

    const setupChat = async () => {
        const data = await AsyncStorage.getItem('guest_session');
        const user = data ? JSON.parse(data) : { room: '402' };
        setGuest(user);

        return firestore()
            .collection('messages')
            .where('room', '==', user.room.toString())
            .orderBy('timestamp', 'asc')
            .onSnapshot(snapshot => {
                if (snapshot) {
                    const ordered = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setMessages(ordered);
                }
            });
    };

    const sendMessage = async () => {
        if (!input.trim() || !guest) return;
        const text = input.trim();
        setInput('');

        // optimistic insert so user sees it instantly
        const tempId = `local-${Date.now()}`;
        const optimisticMsg = { id: tempId, room: guest.room.toString(), sender: 'Guest', text, timestamp: new Date() };
        setMessages(prev => [...prev, optimisticMsg]);

        await firestore().collection('messages').add({
            room: guest.room.toString(),
            sender: 'Guest',
            text: text,
            timestamp: firestore.FieldValue.serverTimestamp()
        });
    };

    const renderMessage = ({ item }) => {
        const isUser = item.sender === 'Guest';
        return (
            <View style={[styles.msgContainer, isUser ? styles.msgRight : styles.msgLeft]}>
                <View style={[styles.msgBubble, isUser ? styles.bubbleRight : styles.bubbleLeft]}>
                    <Text style={[styles.msgText, isUser && styles.msgTextRight]}>{item.text}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.select({ ios: insets.top + 8, android: 0 })}
            >
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Concierge</Text>
                        <Text style={styles.subtitle}>Always at your service</Text>
                    </View>

                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={item => item.id}
                        renderItem={renderMessage}
                        contentContainerStyle={styles.chatArea}
                        inverted
                        keyboardShouldPersistTaps="handled"
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    />

                    <View style={[styles.inputArea, { paddingBottom: Math.max(12, insets.bottom + 6) }]}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            placeholderTextColor="#94a3b8"
                            value={input}
                            onChangeText={setInput}
                        />
                        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
                            <Icon name="send" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f4f1ea' },
    container: { flex: 1, backgroundColor: '#f4f1ea' },
    header: { padding: 20, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: '#e8e4d9', backgroundColor: '#fff' },
    title: { fontSize: 24, fontWeight: '800', color: '#4a3b2c' },
    subtitle: { fontSize: 12, color: '#ab9373', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
    chatArea: { padding: 20 },
    msgContainer: { width: '100%', marginBottom: 15 },
    msgLeft: { alignItems: 'flex-start' },
    msgRight: { alignItems: 'flex-end' },
    msgBubble: { padding: 16, borderRadius: 20, maxWidth: '80%' },
    bubbleLeft: { backgroundColor: '#fff', borderBottomLeftRadius: 0, shadowColor: '#000', shadowOpacity: 0.05, elevation: 1 },
    bubbleRight: { backgroundColor: '#ab9373', borderBottomRightRadius: 0, shadowColor: '#ab9373', shadowOpacity: 0.2, elevation: 2 },
    msgText: { fontSize: 14, color: '#4a3b2c' },
    msgTextRight: { color: '#fff' },
    inputArea: { flexDirection: 'row', padding: 15, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e8e4d9', alignItems: 'center' },
    input: { flex: 1, backgroundColor: '#f4f1ea', borderRadius: 20, paddingHorizontal: 20, height: 50, fontSize: 14, color: '#1e293b' },
    sendBtn: { width: 50, height: 50, backgroundColor: '#4a3b2c', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginLeft: 10 }
});

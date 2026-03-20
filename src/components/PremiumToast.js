import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const { width } = Dimensions.get('window');

const PremiumToast = forwardRef((props, ref) => {
    const [visible, setVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [type, setType] = useState('success');
    const opacity = useState(new Animated.Value(0))[0];
    const translateY = useState(new Animated.Value(-100))[0];

    useImperativeHandle(ref, () => ({
        show: (msg, toastType = 'success') => {
            setMessage(msg);
            setType(toastType);
            setVisible(true);
            
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 50, duration: 400, useNativeDriver: true })
            ]).start();

            setTimeout(() => {
                hide();
            }, 3000);
        }
    }));

    const hide = () => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: -100, duration: 400, useNativeDriver: true })
        ]).start(() => setVisible(false));
    };

    if (!visible) return null;

    const getColors = () => {
        switch (type) {
            case 'error': return { bg: '#fee2e2', text: '#ef4444', icon: 'x-circle' };
            case 'warning': return { bg: '#fef3c7', text: '#f59e0b', icon: 'alert-triangle' };
            default: return { bg: '#0f172a', text: '#fff', icon: 'check-circle' };
        }
    };

    const colors = getColors();

    return (
        <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }, { backgroundColor: colors.bg }]}>
            <Icon name={colors.icon} size={18} color={colors.text} />
            <Text style={[styles.text, { color: colors.text }]}>{message}</Text>
        </Animated.View>
    );
});

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        padding: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
        zIndex: 9999,
    },
    text: {
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
    }
});

export default PremiumToast;

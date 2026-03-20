import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
    const [cart, setCart] = useState([]);

    const addToCart = (item) => {
        setCart(current => {
            const existing = current.find(i => i.id === item.id);
            if (existing) {
                return current.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
            }
            return [...current, { ...item, qty: 1 }];
        });
    };

    const removeFromCart = (id) => {
        setCart(current => current.filter(i => i.id !== id));
    };

    const clearCart = () => setCart([]);

    const total = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);
    const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, total, itemCount }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);

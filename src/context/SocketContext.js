import React from 'react'; export const SocketProvider = ({children}) => {return <>{children}</>}; export const useSocket = () => ({socket: {on: ()=>{}, off: ()=>{}}});

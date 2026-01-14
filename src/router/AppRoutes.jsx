import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Login from '../pages/Login'
import TextToSpeech from '../pages/TextToSpeech'

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/text-to-speech" element={<TextToSpeech />} />
            
        </Routes>
    )
}

export default AppRoutes

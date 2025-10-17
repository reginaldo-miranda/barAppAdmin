import React, { useState, useEffect } from 'react';
import { Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SafeIconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  fallbackText?: string;
}

export function SafeIcon({ name, size = 24, color = '#000', fallbackText }: SafeIconProps) {
  const [fontLoaded, setFontLoaded] = useState(Platform.OS !== 'web');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Timeout mais curto para web
      const timer = setTimeout(() => {
        setFontLoaded(true);
      }, 100);

      // Verificar se as fontes estão carregadas
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          clearTimeout(timer);
          setFontLoaded(true);
        }).catch(() => {
          setHasError(true);
          setFontLoaded(true);
        });
      }

      return () => clearTimeout(timer);
    }
  }, []);

  if (!fontLoaded) {
    return (
      <Text style={{ fontSize: size, color, width: size, height: size, textAlign: 'center' }}>
        {fallbackText || '•'}
      </Text>
    );
  }

  if (hasError && fallbackText) {
    return (
      <Text style={{ fontSize: size, color, width: size, height: size, textAlign: 'center' }}>
        {fallbackText}
      </Text>
    );
  }

  try {
    return <Ionicons name={name} size={size} color={color} />;
  } catch (error) {
    return (
      <Text style={{ fontSize: size, color, width: size, height: size, textAlign: 'center' }}>
        {fallbackText || '•'}
      </Text>
    );
  }
}
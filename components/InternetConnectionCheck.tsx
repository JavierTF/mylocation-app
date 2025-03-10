import React, { useState, useEffect, FC } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// Interfaces para los estilos
interface Styles {
  container: ViewStyle;
  statusContainer: ViewStyle;
  statusTitle: TextStyle;
  statusIndicator: ViewStyle;
  statusText: TextStyle;
  timestampText: TextStyle;
  button: ViewStyle;
  buttonText: TextStyle;
  loadingIndicator: ViewStyle;
}

const InternetConnectionCheck: FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Función para verificar la conexión a Internet con un ping real
  const checkConnection = async (): Promise<void> => {
    setIsChecking(true);
    try {
      // Primero verificamos con NetInfo
      const netInfoState: NetInfoState = await NetInfo.fetch();
      
      // Si NetInfo dice que no hay conexión, confiamos en él
      if (!netInfoState.isConnected) {
        setIsConnected(false);
        setLastChecked(new Date());
        setIsChecking(false);
        return;
      }
      
      // Si NetInfo dice que hay conexión, verificamos haciendo una petición real
      // Utilizamos un servicio confiable con un timeout corto
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Google es un buen sitio para verificar conectividad
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal,
        // Evitamos caché
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      clearTimeout(timeoutId);
      setIsConnected(response.ok);
    } catch (error) {
      // Si hay un error en la petición, asumimos que no hay conexión
      console.log('Error al verificar conexión:', error);
      setIsConnected(false);
    } finally {
      setLastChecked(new Date());
      setIsChecking(false);
    }
  };

  // Verificar periódicamente la conexión
  useEffect(() => {
    checkConnection();
    
    // Verificar cada 30 segundos
    const intervalId = setInterval(checkConnection, 30000);
    
    // También nos suscribimos a cambios de NetInfo para detección inmediata
    const unsubscribe = NetInfo.addEventListener(async (state: NetInfoState) => {
      // Si NetInfo detecta cambio a sin conexión, lo actualizamos inmediatamente
      if (!state.isConnected) {
        setIsConnected(false);
        setLastChecked(new Date());
      } else {
        // Si detecta cambio a conectado, verificamos con fetch para confirmar
        checkConnection();
      }
    });
    
    // Limpiar al desmontar
    return () => {
      clearInterval(intervalId);
      unsubscribe();
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>Estado de la conexión:</Text>
        {isChecking ? (
          <ActivityIndicator style={styles.loadingIndicator} size="small" color="#007BFF" />
        ) : (
          <View 
            style={[
              styles.statusIndicator, 
              { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }
            ]} 
          />
        )}
        <Text style={styles.statusText}>
          {isChecking 
            ? 'Verificando...' 
            : isConnected === null 
              ? 'Desconocido' 
              : isConnected 
                ? 'Conectado' 
                : 'Sin conexión'}
        </Text>
      </View>

      {lastChecked && (
        <Text style={styles.timestampText}>
          Última verificación: {lastChecked.toLocaleTimeString()}
        </Text>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={checkConnection}
        disabled={isChecking}
      >
        <Text style={styles.buttonText}>
          {isChecking ? 'Verificando...' : 'Verificar conexión'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    margin: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  loadingIndicator: {
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
  },
  timestampText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default InternetConnectionCheck;
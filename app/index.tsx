import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import MapView, { Marker, Region, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';

import InternetConnectionCheck from '../components/InternetConnectionCheck';

interface LocationObject {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  };
}

export default function LocationApp(): JSX.Element {
  const [location, setLocation] = useState<LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [region, setRegion] = useState<Region | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    const checkInternetConnection = async () => {
      const netInfoState = await NetInfo.fetch();
      setIsConnected(netInfoState.isConnected);
      
      if (!netInfoState.isConnected) {
        Alert.alert(
          'Sin conexión a Internet',
          'Algunas funciones del mapa pueden no estar disponibles sin conexión a Internet.',
          [{ text: 'Entendido' }]
        );
      }
    };
    
    checkInternetConnection();
    
    // Suscribirse a cambios en la conectividad
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      
      if (state.isConnected && !isConnected) {
        Alert.alert('Conexión restablecida', 'La conexión a Internet ha sido restablecida.');
      } else if (!state.isConnected && isConnected) {
        Alert.alert('Conexión perdida', 'Se ha perdido la conexión a Internet.');
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [isConnected]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Se requiere permiso para acceder a la ubicación');
        setLoading(false);
        return;
      }

      try {
        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });

        setLocation(currentLocation);
        
        const newRegion: Region = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        
        setRegion(newRegion);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        setErrorMsg('Error al obtener la ubicación: ' + errorMessage);
        Alert.alert('Error', 'No se pudo obtener la ubicación actual');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const centerMapOnLocation = (): void => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const startLocationTracking = async (): Promise<void> => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'No se puede seguir la ubicación sin permiso');
        return;
      }

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLocation) => {
          setLocation(newLocation);
          
          if (mapRef.current) {
            const newRegion: Region = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              latitudeDelta: region ? region.latitudeDelta : 0.01,
              longitudeDelta: region ? region.longitudeDelta : 0.01,
            };
            setRegion(newRegion);
          }
        }
      );
      
      Alert.alert('Seguimiento activado', 'Ahora se está siguiendo tu ubicación en tiempo real');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Alert.alert('Error', `No se pudo iniciar el seguimiento: ${errorMessage}`);
    }
  };

  // Renderizado de carga
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Obteniendo tu ubicación...</Text>
      </View>
    );
  }

  // Renderizado de error
  if (errorMsg) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  // Renderizado principal con estructura de columna
  return (
    <View style={styles.mainContainer}>
      {/* Componente de verificación de Internet - Ahora como primera sección */}
      <View style={styles.internetCheckSection}>
        <InternetConnectionCheck />
      </View>
      
      {/* Sección del mapa como segunda sección */}
      <View style={styles.mapSection}>
        {location ? (
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_DEFAULT} // Usa el proveedor por defecto del sistema
              initialRegion={region || undefined}
              showsUserLocation={true}
              showsMyLocationButton={true}
              showsCompass={true}
              showsScale={true}
              zoomEnabled={true}
              rotateEnabled={true}
              loadingEnabled={true}
              loadingIndicatorColor="#007BFF"
              loadingBackgroundColor="#FFFFFF"
            >
              <Marker
                coordinate={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }}
                title="Mi ubicación"
                description={`Lat: ${location.coords.latitude.toFixed(6)}, Lng: ${location.coords.longitude.toFixed(6)}`}
                pinColor="red"
              />
            </MapView>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.button} onPress={centerMapOnLocation}>
                <Text style={styles.buttonText}>Centrar mapa</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.trackButton]} 
                onPress={startLocationTracking}
              >
                <Text style={styles.buttonText}>Seguimiento en tiempo real</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Latitud: {location.coords.latitude.toFixed(6)}
              </Text>
              <Text style={styles.infoText}>
                Longitud: {location.coords.longitude.toFixed(6)}
              </Text>
              <Text style={styles.infoText}>
                Precisión: ±{location.coords.accuracy?.toFixed(0)} metros
              </Text>
              <Text style={styles.infoText}>
                Internet: {isConnected ? 'Conectado' : 'Sin conexión'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.centered}>
            <Text style={styles.errorText}>No se pudo obtener la ubicación</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  internetCheckSection: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  mapSection: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginHorizontal: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  trackButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  infoBox: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 10,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 3,
  },
});
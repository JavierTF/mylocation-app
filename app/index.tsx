import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, Dimensions, SafeAreaView, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
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
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [trackingActive, setTrackingActive] = useState<boolean>(false);
  const [watchId, setWatchId] = useState<Location.LocationSubscription | null>(null);
  const [mapError, setMapError] = useState<boolean>(false);

  // Obtener dimensiones de la pantalla para el mapa
  const screenWidth = Dimensions.get('window').width;
  const mapHeight = Math.round(screenWidth * 0.8); // Proporción 4:3 para el mapa

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
        setMapError(false); // Reiniciar el estado de error del mapa cuando se restablece la conexión
      } else if (!state.isConnected && isConnected) {
        Alert.alert('Conexión perdida', 'Se ha perdido la conexión a Internet.');
      }
    });
    
    return () => {
      unsubscribe();
      // Limpiar el seguimiento de ubicación al desmontar
      if (watchId) {
        watchId.remove();
      }
    };
  }, [isConnected, watchId]);

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
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        setErrorMsg('Error al obtener la ubicación: ' + errorMessage);
        Alert.alert('Error', 'No se pudo obtener la ubicación actual');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refreshLocation = async (): Promise<void> => {
    setLoading(true);
    setMapError(false);
    
    try {
      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      setLocation(currentLocation);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Alert.alert('Error', `No se pudo actualizar la ubicación: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = async (): Promise<void> => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'No se puede seguir la ubicación sin permiso');
        return;
      }

      // Detener el seguimiento anterior si existe
      if (watchId) {
        watchId.remove();
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLocation) => {
          setLocation(newLocation);
        }
      );
      
      setWatchId(subscription);
      setTrackingActive(true);
      Alert.alert('Seguimiento activado', 'Ahora se está siguiendo tu ubicación en tiempo real');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Alert.alert('Error', `No se pudo iniciar el seguimiento: ${errorMessage}`);
    }
  };

  const stopLocationTracking = (): void => {
    if (watchId) {
      watchId.remove();
      setWatchId(null);
      setTrackingActive(false);
      Alert.alert('Seguimiento desactivado', 'Se ha detenido el seguimiento de ubicación');
    }
  };

  // Generar HTML para OpenStreetMap en WebView
  const getMapHTML = (): string => {
    if (!location) return '';
    
    const latitude = location.coords.latitude;
    const longitude = location.coords.longitude;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
          <style>
            body, html, #map {
              margin: 0;
              padding: 0;
              height: 100%;
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            document.addEventListener('DOMContentLoaded', function() {
              const map = L.map('map').setView([${latitude}, ${longitude}], 15);
              
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              }).addTo(map);
              
              const marker = L.marker([${latitude}, ${longitude}]).addTo(map);
              marker.bindPopup("Mi ubicación actual").openPopup();
              
              // Actualizar el marcador cuando recibamos una nueva ubicación
              window.updateMarker = function(lat, lng) {
                marker.setLatLng([lat, lng]);
                map.setView([lat, lng], 15);
              };
            });
          </script>
        </body>
      </html>
    `;
  };

  // Función para manejar errores de WebView
  const handleWebViewError = () => {
    setMapError(true);
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
    <SafeAreaView style={styles.mainContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Componente de verificación de Internet - Ahora como primera sección */}
        <View style={styles.internetCheckSection}>
          <InternetConnectionCheck />
        </View>
        
        {/* Sección de la ubicación */}
        <View style={styles.locationSection}>
          {location ? (
            <>
              {/* Información de la ubicación */}
              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>Información de ubicación:</Text>
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
              
              {/* Visualización de la ubicación - OpenStreetMap con WebView */}
              <View style={styles.mapContainer}>
                <Text style={styles.mapTitle}>Tu ubicación en el mapa:</Text>
                {isConnected && !mapError ? (
                  <View style={[styles.webViewContainer, { height: mapHeight }]}>
                    <WebView
                      originWhitelist={['*']}
                      source={{ html: getMapHTML() }}
                      style={styles.webView}
                      onError={handleWebViewError}
                      javaScriptEnabled={true}
                      domStorageEnabled={true}
                    />
                  </View>
                ) : (
                  <View style={[styles.noMapContainer, { height: mapHeight }]}>
                    <Text style={styles.noMapText}>
                      {isConnected 
                        ? 'No se pudo cargar el mapa. Intente de nuevo más tarde.' 
                        : 'Mapa no disponible sin conexión a internet'}
                    </Text>
                    <View style={styles.mapMarker} />
                  </View>
                )}
              </View>
              
              {/* Botones de acción */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={refreshLocation}>
                  <Text style={styles.buttonText}>Actualizar ubicación</Text>
                </TouchableOpacity>
                
                {trackingActive ? (
                  <TouchableOpacity 
                    style={[styles.button, styles.stopButton]} 
                    onPress={stopLocationTracking}
                  >
                    <Text style={styles.buttonText}>Detener seguimiento</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.button, styles.trackButton]} 
                    onPress={startLocationTracking}
                  >
                    <Text style={styles.buttonText}>Seguimiento en tiempo real</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.errorText}>No se pudo obtener la ubicación</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  internetCheckSection: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  locationSection: {
    flex: 1,
    padding: 15,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoBox: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#444',
  },
  mapContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    position: 'relative',
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  webViewContainer: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
  },
  mapMarker: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.5)',
    borderWidth: 3,
    borderColor: 'red',
    marginLeft: -10,
    marginTop: -10,
    zIndex: 2,
  },
  noMapContainer: {
    width: '100%',
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  noMapText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    flex: 1,
    backgroundColor: '#007BFF',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 25,
    marginHorizontal: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackButton: {
    backgroundColor: '#28a745',
  },
  stopButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 15,
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
});
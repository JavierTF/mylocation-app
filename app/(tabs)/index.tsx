import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Region, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';

interface LocationObject {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  };
}

export default function LocationMap(): JSX.Element {
  const [location, setLocation] = useState<LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [region, setRegion] = useState<Region | null>(null);
  const mapRef = useRef<MapView | null>(null);

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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Obteniendo tu ubicación...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {location ? (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={region || undefined}
            showsUserLocation={true}
            showsMyLocationButton={true}
            showsCompass={true}
            showsScale={true}
            zoomEnabled={true}
            rotateEnabled={true}
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
          </View>
        </>
      ) : (
        <Text style={styles.errorText}>No se pudo obtener la ubicación</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    bottom: 100,
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
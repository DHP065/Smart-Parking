'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ParkingLocation {
  _id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  availableSlots: number;
  totalSlots: number;
  status: 'available' | 'full' | 'reserved';
}

interface ParkingMapProps {
  locations: ParkingLocation[];
  center?: [number, number];
  userLocation?: [number, number];
  onSelectLocation?: (id: string) => void;
}

const STATUS_COLORS = {
  available: '#22c55e',
  full: '#ef4444',
  reserved: '#f59e0b'
};

const createMarkerIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width: 36px; height: 36px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    ">
      <div style="
        position: absolute; inset: 0;
        display: flex; align-items: center; justify-content: center;
        transform: rotate(45deg);
        font-size: 14px;
      ">🅿️</div>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });

export default function ParkingMap({ locations, center = [28.6139, 77.2090], userLocation, onSelectLocation }: ParkingMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center,
      zoom: 13,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Add/update markers when locations change
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing markers
    mapRef.current.eachLayer(layer => {
      // Use instanceof L.Marker and skip our custom user marker
      if (layer instanceof L.Marker && !(layer as any).options?.isUserLocation) {
        layer.remove();
      }
    });

    locations.forEach(loc => {
      const color = STATUS_COLORS[loc.status];
      const marker = L.marker([loc.coordinates.lat, loc.coordinates.lng], {
        icon: createMarkerIcon(color)
      }).addTo(mapRef.current!);

      const statusLabel = loc.status.charAt(0).toUpperCase() + loc.status.slice(1);
      const dotColor = STATUS_COLORS[loc.status];

      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 200px; padding: 4px;">
          <h3 style="font-size: 14px; font-weight: 700; color: #111827; margin: 0 0 4px;">${loc.name}</h3>
          <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px;">${loc.address}</p>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${dotColor};"></span>
            <span style="font-size: 12px; color: ${dotColor}; font-weight: 600;">${statusLabel}</span>
            <span style="font-size: 12px; color: #6b7280; margin-left: auto;">${loc.availableSlots}/${loc.totalSlots} spots</span>
          </div>
          <a href="/parking/${loc._id}" style="
            display: block; text-align: center; padding: 8px 16px;
            background: #2563eb; color: white; border-radius: 8px;
            font-size: 13px; font-weight: 600; text-decoration: none;
          ">View Details →</a>
        </div>
      `, { maxWidth: 280 });
    });
  }, [locations]);

  // Handle User Location marker & radius
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    // Remove any previously drawn user location features
    mapRef.current.eachLayer(layer => {
      if ((layer as any).options?.isUserLocation) {
        layer.remove();
      }
    });

    // Create the central dot
    const userMarkerIcon = L.divIcon({
      className: '',
      html: `<div style="
        width: 16px; height: 16px;
        background: #3b82f6; /* blue-500 */
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4);
      "></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    L.marker(userLocation, {
      icon: userMarkerIcon,
      zIndexOffset: 1000,
      isUserLocation: true
    } as any)
      .bindPopup('<b>You are here</b><br>You must be within 2km to reserve.')
      .addTo(mapRef.current);

    // Create the 2km radius
    L.circle(userLocation, {
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      weight: 1,
      radius: 2000, // in meters
      isUserLocation: true
    } as any).addTo(mapRef.current);

    // Pan viewport over to center on user
    mapRef.current.setView(userLocation, 13);
  }, [userLocation]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-2xl overflow-hidden"
      style={{ minHeight: '400px' }}
    />
  );
}

import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function Map({ userPos, requests, selectedId, onSelectRequest }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef({});

  useEffect(() => {
    if (map.current) return;

    const defaultPosition = userPos || [34.7818, 32.0853];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: defaultPosition,
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
  }, []);

  useEffect(() => {
    if (!map.current || !userPos) return;
    
    const [lat, lng] = userPos;
    map.current.setCenter([lng, lat]);
    map.current.setZoom(14);
  }, [userPos]);

  useEffect(() => {
    if (!map.current || !userPos) return;

    const [lat, lng] = userPos;

    const userMarker = new mapboxgl.Marker({ color: "blue" })
      .setLngLat([lng, lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          "<strong>You are here</strong>"
        )
      )
      .addTo(map.current);

    return () => userMarker.remove();
  }, [userPos]);

  useEffect(() => {
    if (!map.current) return;

    Object.values(markers.current).forEach((marker) => marker.remove());
    markers.current = {};

    requests.forEach((req) => {
      if (!req.location || !req.location.coordinates) return;

      const [lng, lat] = req.location.coordinates;
      const urgencyColor = req.urgency === "high" ? "#dc2626" : req.urgency === "low" ? "#16a34a" : "red";

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 5px;">
          <strong>${req.title}</strong><br/>
          Age: ${req.createdBy?.age ?? "N/A"}<br/>
          Posted: ${new Date(req.createdAt).toLocaleString()}<br/>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
        </div>
      `);

      const marker = new mapboxgl.Marker({ color: urgencyColor })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current);

      marker.getElement().addEventListener("click", () => {
        if (onSelectRequest) {
          onSelectRequest(req._id);
        }
      });

      markers.current[req._id] = marker;
    });

    return () => {
      Object.values(markers.current).forEach((marker) => marker.remove());
    };
  }, [requests, onSelectRequest]);

  useEffect(() => {
    if (!map.current || !selectedId) return;

    const req = requests.find((r) => r._id === selectedId);
    if (!req || !req.location || !req.location.coordinates) return;

    const [lng, lat] = req.location.coordinates;

    const currentZoom = map.current.getZoom();
    const targetZoom = Math.max(currentZoom, 15);

    map.current.flyTo({
      center: [lng, lat],
      zoom: targetZoom,
      essential: true,
    });

    const marker = markers.current[selectedId];
    if (marker) {
      const activeEl = document.activeElement;
      marker.togglePopup();
      if (activeEl && typeof activeEl.focus === "function") {
        const isEditable =
          activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable;
        if (isEditable) {
          setTimeout(() => activeEl.focus(), 0);
        }
      }
    }
  }, [selectedId, requests]);

  return (
    <div
      ref={mapContainer}
      className="map-container-style"
      style={{
        width: "100%",
        height: "min(70vh, 520px)",
        minHeight: "320px",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    />
  );
}

export default Map;

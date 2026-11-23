
import React from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
  Circle,
} from "react-leaflet";
import L from "leaflet";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { MapPin, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

import "leaflet/dist/leaflet.css";

// Leaflet default marker icon fix
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLat?: number;
  initialLng?: number;
  initialRadius?: number;
  initialLocationName?: string;
  onConfirm: (
    lat: number,
    lng: number,
    radius: number,
    locationName: string
  ) => void;
}

interface MapClickHandlerProps {
  onLocationSelect: (lat: number, lng: number) => void;
}

const DEFAULT_POSITION: [number, number] = [
  28.6139,
  77.209,
];

function MapClickHandler({
  onLocationSelect,
}: MapClickHandlerProps) {
  useMapEvents({
    click: (event) => {
      onLocationSelect(
        event.latlng.lat,
        event.latlng.lng
      );
    },
  });

  return null;
}

// Fix map dimensions when Dialog opens or its size changes.
function MapResizeHandler({ open }: { open: boolean }) {
  const map = useMap();

  React.useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => window.clearTimeout(timer);
  }, [map, open]);

  return null;
}

const LocationPicker = ({
  open,
  onOpenChange,
  initialLat,
  initialLng,
  initialRadius,
  initialLocationName,
  onConfirm,
}: LocationPickerProps) => {
  const [position, setPosition] =
    React.useState<[number, number]>(DEFAULT_POSITION);

  const [radius, setRadius] = React.useState(100);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [locationLoading, setLocationLoading] =
    React.useState(false);
  const [locationName, setLocationName] = React.useState("");

  React.useEffect(() => {
    if (!open) return;

    setPosition([
      initialLat ?? DEFAULT_POSITION[0],
      initialLng ?? DEFAULT_POSITION[1],
    ]);

    setRadius(initialRadius ?? 100);
    setLocationName(initialLocationName ?? "");
    setSearchQuery("");
  }, [
    open,
    initialLat,
    initialLng,
    initialRadius,
    initialLocationName,
  ]);

  // Reverse geocoding after selecting a map point.
  const handleMapClick = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    setLocationLoading(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en`
      );

      if (!response.ok) {
        throw new Error("Unable to get location details");
      }

      const data = await response.json();
      setLocationName(data.display_name ?? "");
    } catch (error: any) {
      toast.error(
        error?.message || "Failed to get location name"
      );
      setLocationName("");
    } finally {
      setLocationLoading(false);
    }
  };

  // Search location using Nominatim.
  const handleSearch = async () => {
    const query = searchQuery.trim();

    if (!query) {
      toast.error("Please enter a location to search");
      return;
    }

    setSearching(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=1&countrycodes=in&accept-language=en`
      );

      if (!response.ok) {
        throw new Error("Unable to search location");
      }

      const data = await response.json();

      if (!data.length) {
        toast.error(
          "Location not found. Try a nearby landmark or area name."
        );
        return;
      }

      const lat = Number(data[0].lat);
      const lng = Number(data[0].lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        toast.error("Invalid location coordinates");
        return;
      }

      setPosition([lat, lng]);
      setLocationName(data[0].display_name ?? "");
    } catch (error: any) {
      toast.error(
        error?.message || "Failed to search location"
      );
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = () => {
    const [lat, lng] = position;

    if (
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90
    ) {
      toast.error("Invalid latitude");
      return;
    }

    if (
      !Number.isFinite(lng) ||
      lng < -180 ||
      lng > 180
    ) {
      toast.error("Invalid longitude");
      return;
    }

    if (radius <= 0) {
      toast.error("Geo radius must be greater than 0");
      return;
    }

    onConfirm(lat, lng, radius, locationName);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          flex
          w-[calc(100vw-1rem)]
          max-w-3xl
          max-h-[calc(100dvh-1rem)]
          flex-col
          gap-0
          overflow-hidden
          p-0
          sm:w-[calc(100vw-2rem)]
        "
      >
        <DialogHeader className="shrink-0 border-b px-4 py-3 sm:px-5">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            Set Branch Location
          </DialogTitle>

          <DialogDescription>
            Search for your branch or select a location directly on the map.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          {/* Search */}
          <div className="flex min-w-0 gap-2">
            <Input
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSearch();
                }
              }}
              placeholder="Search address or area..."
              className="min-w-0 flex-1"
              autoComplete="off"
            />

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => void handleSearch()}
              disabled={searching}
              aria-label="Search location"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Map */}
          <div
            className="
              relative
              z-0
              h-[min(45dvh,420px)]
              min-h-52
              w-full
              overflow-hidden
              rounded-lg
              border
              bg-muted
              sm:h-[min(50dvh,460px)]
            "
          >
            <MapContainer
              center={position}
              zoom={15}
              scrollWheelZoom
              style={{
                height: "100%",
                width: "100%",
              }}
              key={`${position[0]}-${position[1]}`}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapResizeHandler open={open} />

              <MapClickHandler
                onLocationSelect={handleMapClick}
              />

              <Marker position={position} />

              <Circle
                center={position}
                radius={radius}
                pathOptions={{
                  color: "#2563eb",
                  fillColor: "#3b82f6",
                  fillOpacity: 0.15,
                }}
              />
            </MapContainer>
          </div>

          {/* Selected location */}
          {locationName && (
            <div className="rounded-md bg-muted p-3">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                <p className="min-w-0 break-words text-sm">
                  {locationName}
                </p>
              </div>
            </div>
          )}

          {locationLoading && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Getting location details...
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Click anywhere on the map to select the branch location,
            or search for an address above.
          </p>

          {/* Radius */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="geo-radius">
                Geo Fence Radius
              </Label>

              <span className="text-sm font-medium tabular-nums">
                {radius} m
              </span>
            </div>

            <input
              id="geo-radius"
              type="range"
              min={50}
              max={1000}
              step={50}
              value={radius}
              onChange={(event) =>
                setRadius(Number(event.target.value))
              }
              className="w-full cursor-pointer"
            />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50 m</span>
              <span>1000 m</span>
            </div>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-1 gap-2 rounded-md border p-3 text-sm sm:grid-cols-2">
            <p className="min-w-0 break-all text-muted-foreground">
              <span className="font-medium text-foreground">
                Latitude:
              </span>{" "}
              {position[0].toFixed(6)}
            </p>

            <p className="min-w-0 break-all text-muted-foreground">
              <span className="font-medium text-foreground">
                Longitude:
              </span>{" "}
              {position[1].toFixed(6)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t bg-background p-3 sm:px-5">
          <Button
            type="button"
            variant="add"
            className="w-full"
            onClick={handleConfirm}
            disabled={searching || locationLoading}
          >
            Confirm Location
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPicker;

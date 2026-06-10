# Private Indoor Maps Platform  
  
A multi-tenant web platform for creating private, interactive indoor maps for businesses, campuses, and organizations using customer-provided building plans. The goal is to provide a general framework similar to `maps.ucv.ro`, where each organization can publish searchable building and floor maps under its own domain or private tenant URL.  
  
## Concept  
  
The platform allows a private organization to upload or define its own building maps, floor plans, room layouts, and related metadata. Google Maps can be used as the outdoor/campus base layer, while indoor maps are rendered from the organization’s own floor-plan data.  
  
Each customer owns and provides the map assets, such as floor plans, building outlines, room layouts, or CAD/SVG/image files. The application then turns those assets into searchable, interactive maps with rooms, floors, labels, and optional booking functionality.

- 4.1 Multi-Tenant Organization Model [[Multi-Tenant Organization Model]]
	- Support multiple businesses or organizations inside the same platform.
- 4.2 Building and Floor Hierarchy [[Building and Floor Hierarchy]]
	- Move from standalone maps to a structured building/floor model.
-  4.3 Tenant-Specific Private Map Publishing [[Tenant-Specific Private Map Publishing]]
	- Allow each customer to publish maps privately under their own domain or controlled tenant URL.
-  4.4 Role-Based Access Control [[Role-Based Access Control]]
	- Introduce clear permissions for map editing, viewing, administration, and booking.
- [ ] 4.5 Improved Map Editor [[Improved Map Editor]]
	- Expand the current room editor from rectangle-based editing to a full polygon-based indoor map editor.
- 4.6 Floor-Plan Import Pipeline [[Floor Plan Import Pipeline]]
	- Allow organizations to import existing plans instead of manually recreating everything.
- 4.7 Google Maps- Mapbox Integration [[Google Maps Integration]]
	- Use Google Maps as the outdoor/campus context while keeping indoor data owned and rendered by the platform.
- [ ]  4.8 Indoor Search
	- Allow users to find locations quickly.
- 4.9 Points of Interest
	- Support map objects that are not rooms.
		- stairs
		- entrances
- 4.10 Indoor Routing
	- Add navigation between rooms, entrances, floors, and buildings.
- 4.12 Room Booking Enhancements [[Room Booking Enhancements]]
	- Expand the current meeting scheduling functionality into a more complete room-booking module.
- 4.18  Frontend Application Areas
	- Split the frontend into clear product areas.
		- Organization dashboard.
		- Campus/building list.
		- Map editor.
		- Public/private map viewer.
		- Room booking page.
		- Admin settings.
		- User management.
		- Domain management.    
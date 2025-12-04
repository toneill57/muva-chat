-- 12-data-operations.sql
-- Generated: 2025-11-01
-- Group 3: Operations Data (6 tables, ~202 rows)
-- ⭐ COMPLETE data (Oct 31 had 11 sample rows only)

BEGIN;
SET session_replication_role = replica;

-- ========================================
-- TABLE 1: hotels (3 rows)
-- ========================================
INSERT INTO hotels (
  id,
  tenant_id,
  hotel_name,
  address,
  phone,
  email,
  website,
  description,
  amenities,
  check_in_time,
  check_out_time,
  cancellation_policy,
  created_at,
  updated_at
) VALUES
('238845ed-8c5b-4d33-9866-bb4e706b90b2'::uuid, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, '[object Object]', NULL, NULL, NULL, 'Una experiencia única en San Andrés con habitaciones temáticas inspiradas en la cultura reggae local.', NULL, '15:00:00'::time, '12:00:00'::time, NULL, '2025-09-24T18:28:24.378473+00:00'::timestamptz, '2025-09-24T18:40:06.545369+00:00'::timestamptz),
('3737a3d1-2197-4297-a326-86454db072ec'::uuid, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, '[object Object]', NULL, NULL, NULL, 'Hotel boutique en el centro de San Andrés, a 2 cuadras de la playa de Sprat Bight. Ofrece habitaciones cómodas con aire acondicionado, WiFi gratuito y cocinas equipadas. Perfecto para familias y parejas que buscan una experiencia auténtica en el Caribe.', NULL, '15:00:00'::time, '12:00:00'::time, NULL, '2025-10-11T18:17:25.701877+00:00'::timestamptz, '2025-10-11T18:17:25.701877+00:00'::timestamptz),
('c1ca871e-c34e-4532-90fa-88f132e7221b'::uuid, '03d2ae98-06f1-407b-992b-ca809dfc333b'::uuid, NULL, NULL, NULL, NULL, NULL, 'Hotel principal de Casa Boutique los Cedros', NULL, '15:00:00'::time, '12:00:00'::time, NULL, '2025-10-19T00:27:22.696714+00:00'::timestamptz, '2025-10-19T00:27:22.696714+00:00'::timestamptz);

-- ========================================
-- TABLE 2: staff_users (6 rows, self-reference)
-- ⚠️ TWO-PASS: NULL created_by first, then refs
-- ========================================

-- PASS 1: Users with NO creator (created_by IS NULL)
INSERT INTO staff_users (
  staff_id,
  tenant_id,
  email,
  full_name,
  role,
  permissions,
  status,
  created_by,
  created_at,
  updated_at
) VALUES
('ed0b94df-18d1-4f98-b9b3-69667a7226fc'::uuid, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, 'carlos@simmerdown.com', 'Carlos Ospina (CEO)', 'ceo', '{"admin_panel":true,"sire_access":true,"reports_access":true,"modify_operations":true}'::jsonb, NULL, NULL, '2025-10-01T03:52:57.782617+00:00'::timestamptz, '2025-10-01T06:11:46.55564+00:00'::timestamptz),
('83d866a5-e385-4758-9921-63f1f15e371e'::uuid, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'Test Admin (Testing)', 'admin', '{"admin_panel":true,"sire_access":true,"reports_access":true,"modify_operations":true}'::jsonb, NULL, NULL, '2025-10-09T21:53:07.526177+00:00'::timestamptz, '2025-10-09T21:53:07.526177+00:00'::timestamptz),
('e095212f-4688-42d6-8305-dc34c34e1ac6'::uuid, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'Heidy - CEO', 'ceo', '{"admin_panel":true,"sire_access":true,"reports_access":true,"modify_operations":true}'::jsonb, NULL, NULL, '2025-10-18T01:13:14.046304+00:00'::timestamptz, '2025-10-18T01:16:36.850564+00:00'::timestamptz),
('470cc6bd-9ecd-4c82-a7e7-84a456a8f8ac'::uuid, '03d2ae98-06f1-407b-992b-ca809dfc333b'::uuid, 'tarek.oneill@gmail.com', 'Diablito', 'admin', '{"admin_panel":true,"sire_access":true,"reports_access":true,"modify_operations":true}'::jsonb, NULL, NULL, '2025-10-19T00:27:23.05994+00:00'::timestamptz, '2025-10-19T00:27:23.05994+00:00'::timestamptz);

-- PASS 2: Users with creator (created_by references staff_id from PASS 1)
INSERT INTO staff_users (
  staff_id,
  tenant_id,
  email,
  full_name,
  role,
  permissions,
  status,
  created_by,
  created_at,
  updated_at
) VALUES
('4c16fa0a-c4f9-408e-8a43-5d8eaceb7a00'::uuid, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'María Rodríguez (Housekeeping)', 'housekeeper', '{"admin_panel":false,"sire_access":true,"reports_access":false,"modify_operations":false}'::jsonb, NULL, 'ed0b94df-18d1-4f98-b9b3-69667a7226fc'::uuid, '2025-10-01T03:52:57.782617+00:00'::timestamptz, '2025-10-01T06:11:46.55564+00:00'::timestamptz),
('f92c1c7d-5987-433e-b334-531fb2cc54ca'::uuid, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, 'laura@simmerdown.com', 'Laura Martínez (Admin)', 'admin', '{"admin_panel":true,"sire_access":true,"reports_access":true,"modify_operations":false}'::jsonb, NULL, 'ed0b94df-18d1-4f98-b9b3-69667a7226fc'::uuid, '2025-10-01T03:52:57.782617+00:00'::timestamptz, '2025-10-01T06:11:46.55564+00:00'::timestamptz);

-- ========================================
-- TABLE 3: accommodation_units_public (151 rows ⭐)
-- LARGEST TABLE - COMPLETE export, not sample
-- ========================================
INSERT INTO accommodation_units_public (
  id,
  tenant_id,
  unit_name,
  unit_type,
  capacity,
  bedrooms,
  bathrooms,
  base_price,
  currency,
  description,
  amenities,
  images,
  status,
  created_at,
  updated_at
) VALUES
(NULL, '03d2ae98-06f1-407b-992b-ca809dfc333b'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'La casa boutique los cedros - Overview

La casa boutique los cedros

Casa boutique los cedros ofrece estadía con piscina al aire libre, jardín y terraza en San Andrés con wifi gratis y vistas a la ciudad.

Esta villa tiene aire acondicionado y cuenta con 5 dormitorios, TV de pantalla plana vía satélite, zona de comedor y cocina con nevera y lavavajillas. Hay toallas y ropa de cama en la villa.
Las áreas de sala y comedor igualmente gozan de la misma panorámica hacia el mar y un segundo comedor localizado en la terraza frente a la cocina disfruta también de las visuales al océano además de la cercanía de la vegetación que rodea la casa.

En la villa se sirve un desayuno americano.
En la recepción 24 horas se habla inglés y español, y el personal estará encantado de dar información sobre la zona.

Casa boutique los cedros ofrece barbacoa. Hay servicio de alquiler de bicicletas y servicio de alquiler de coches en el alojamiento, y en los alrededores se puede practicar ciclismo

Cerca del alojamiento hay puntos de interés como Playa Los Almendros, Bahía de San Andrés y North End. El aeropuerto (Aeropuerto internacional Gustavo Rojas Pinilla) está a 2 km, y el alojamiento ofrece servicio de traslado gratis para ir o volver del aeropuerto

Es un lugar ubicado en el sector centro/parte alta de la isla , donde la privilegiada topografía favorece una espectacular panorámica del océano y de la vegetación circundante conformada por especies tropicales, arboles ancestrales y árboles frutales. Estas visuales se disfrutan desde las alcobas, terrazas, zonas sociales e incluso desde la cocina.Cuenta con un área de piscina privada en donde el sonido de los arboles por la brisa, hacen que sea un lugar de descanso inigualable.
Siempre tendrán una recibida personalizada y les ayudaremos a pasar las mejores vacaciones. Siempre recomendare los mejores prestadores de servicios, mulas, pontones, yates y todo lo necesario para pasar unas vacaciones excelentes.
El vecindario esta cerca al centro de la ciudad y a las vías principales que te llevan a las playas del sur, la parte loma y las playas del centro. La casa esta sobre una montaña fuera del alcance de sonido de la vecindad. Playa centro a 5 minutos en carro/ 25 minutos caminando playa san luis a 15 minutos en carro. la mejor recomendación es alquilas carro de golf igualmente se les dará contactos de servicios de taxis.

Capacidad: 15 adultos, 13 niños (Total: 15 personas)

Tamaño: 230m²

Tipo: accommodation', '[{"id":42,"name":"Aeropuerto internacional Gustavo Rojas Pinilla 1.4 km"},{"id":48,"name":"Aire acondicionado"},{"id":49,"name":"Barbacoa"},{"id":45,"name":"Habitaciones familiares"},{"id":47,"name":"Parking gratis"},{"id":43,"name":"Piscina al aire libre"},{"id":39,"name":"Playa de Johnny Cay 2 km"},{"id":41,"name":"Playa de la bahía de Cocoplum 3.9 km"},{"id":38,"name":"Playa de Spratt Bight 1.5 km"},{"id":37,"name":"Playa Los Almendros 800 m"},{"id":40,"name":"Playita de las Parceras 3.4 km"},{"id":51,"name":"Servicio de streaming (como Netflix)"},{"id":52,"name":"Servicio de traslado"},{"id":46,"name":"Traslado aeropuerto"},{"id":44,"name":"WiFi gratis"},{"id":50,"name":"Zona de comedor exterior"}]'::jsonb, ARRAY[]::text[], NULL, '2025-10-19T06:49:40.645465+00:00'::timestamptz, '2025-10-19T06:49:40.645465+00:00'::timestamptz),
(NULL, '03d2ae98-06f1-407b-992b-ca809dfc333b'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'La casa boutique los cedros - Capacity & Beds

Capacidad máxima: 15 personas (15 adultos, 13 niños)

Configuración de camas: 1 Cama king size, 2 camas camas dobles, dos individuales (1 cama(s))

1 Cama king size, 2 camas camas dobles, dos individuales', '[{"id":42,"name":"Aeropuerto internacional Gustavo Rojas Pinilla 1.4 km"},{"id":48,"name":"Aire acondicionado"},{"id":49,"name":"Barbacoa"},{"id":45,"name":"Habitaciones familiares"},{"id":47,"name":"Parking gratis"},{"id":43,"name":"Piscina al aire libre"},{"id":39,"name":"Playa de Johnny Cay 2 km"},{"id":41,"name":"Playa de la bahía de Cocoplum 3.9 km"},{"id":38,"name":"Playa de Spratt Bight 1.5 km"},{"id":37,"name":"Playa Los Almendros 800 m"},{"id":40,"name":"Playita de las Parceras 3.4 km"},{"id":51,"name":"Servicio de streaming (como Netflix)"},{"id":52,"name":"Servicio de traslado"},{"id":46,"name":"Traslado aeropuerto"},{"id":44,"name":"WiFi gratis"},{"id":50,"name":"Zona de comedor exterior"}]'::jsonb, ARRAY[]::text[], NULL, '2025-10-19T06:49:41.246955+00:00'::timestamptz, '2025-10-19T06:49:41.246955+00:00'::timestamptz),
(NULL, '03d2ae98-06f1-407b-992b-ca809dfc333b'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'La casa boutique los cedros - Amenities

Amenities: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]

Características especiales: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]', '[{"id":42,"name":"Aeropuerto internacional Gustavo Rojas Pinilla 1.4 km"},{"id":48,"name":"Aire acondicionado"},{"id":49,"name":"Barbacoa"},{"id":45,"name":"Habitaciones familiares"},{"id":47,"name":"Parking gratis"},{"id":43,"name":"Piscina al aire libre"},{"id":39,"name":"Playa de Johnny Cay 2 km"},{"id":41,"name":"Playa de la bahía de Cocoplum 3.9 km"},{"id":38,"name":"Playa de Spratt Bight 1.5 km"},{"id":37,"name":"Playa Los Almendros 800 m"},{"id":40,"name":"Playita de las Parceras 3.4 km"},{"id":51,"name":"Servicio de streaming (como Netflix)"},{"id":52,"name":"Servicio de traslado"},{"id":46,"name":"Traslado aeropuerto"},{"id":44,"name":"WiFi gratis"},{"id":50,"name":"Zona de comedor exterior"}]'::jsonb, ARRAY[]::text[], NULL, '2025-10-19T06:49:41.817515+00:00'::timestamptz, '2025-10-19T06:49:41.817515+00:00'::timestamptz),
(NULL, '03d2ae98-06f1-407b-992b-ca809dfc333b'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'La casa boutique los cedros - Location & View

Vista: Vista la isla, al mar, a la piscina y a un jardín precioso

Detalles de vista: Vista la isla, al mar, a la piscina y a un jardín precioso

Vista turística: Vista la isla, al mar, a la piscina y a un jardín precioso', '[{"id":42,"name":"Aeropuerto internacional Gustavo Rojas Pinilla 1.4 km"},{"id":48,"name":"Aire acondicionado"},{"id":49,"name":"Barbacoa"},{"id":45,"name":"Habitaciones familiares"},{"id":47,"name":"Parking gratis"},{"id":43,"name":"Piscina al aire libre"},{"id":39,"name":"Playa de Johnny Cay 2 km"},{"id":41,"name":"Playa de la bahía de Cocoplum 3.9 km"},{"id":38,"name":"Playa de Spratt Bight 1.5 km"},{"id":37,"name":"Playa Los Almendros 800 m"},{"id":40,"name":"Playita de las Parceras 3.4 km"},{"id":51,"name":"Servicio de streaming (como Netflix)"},{"id":52,"name":"Servicio de traslado"},{"id":46,"name":"Traslado aeropuerto"},{"id":44,"name":"WiFi gratis"},{"id":50,"name":"Zona de comedor exterior"}]'::jsonb, ARRAY[]::text[], NULL, '2025-10-19T06:49:42.427515+00:00'::timestamptz, '2025-10-19T06:49:42.427515+00:00'::timestamptz),
(NULL, '03d2ae98-06f1-407b-992b-ca809dfc333b'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'La casa boutique los cedros - Images

9 fotos disponibles:
1. La casa boutique los cedros - Image 1
2. La casa boutique los cedros - Image 2
3. La casa boutique los cedros - Image 3
4. La casa boutique los cedros - Image 4
5. La casa boutique los cedros - Image 5
6. La casa boutique los cedros - Image 6
7. La casa boutique los cedros - Image 7
8. La casa boutique los cedros - Image 8
9. La casa boutique los cedros - Image 9', '[{"id":42,"name":"Aeropuerto internacional Gustavo Rojas Pinilla 1.4 km"},{"id":48,"name":"Aire acondicionado"},{"id":49,"name":"Barbacoa"},{"id":45,"name":"Habitaciones familiares"},{"id":47,"name":"Parking gratis"},{"id":43,"name":"Piscina al aire libre"},{"id":39,"name":"Playa de Johnny Cay 2 km"},{"id":41,"name":"Playa de la bahía de Cocoplum 3.9 km"},{"id":38,"name":"Playa de Spratt Bight 1.5 km"},{"id":37,"name":"Playa Los Almendros 800 m"},{"id":40,"name":"Playita de las Parceras 3.4 km"},{"id":51,"name":"Servicio de streaming (como Netflix)"},{"id":52,"name":"Servicio de traslado"},{"id":46,"name":"Traslado aeropuerto"},{"id":44,"name":"WiFi gratis"},{"id":50,"name":"Zona de comedor exterior"}]'::jsonb, ARRAY[]::text[], NULL, '2025-10-19T06:49:43.046794+00:00'::timestamptz, '2025-10-19T06:49:43.046794+00:00'::timestamptz),
(NULL, '03d2ae98-06f1-407b-992b-ca809dfc333b'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'La casa boutique los cedros - Features

Amenidades turísticas: [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object], [object Object]', '[{"id":42,"name":"Aeropuerto internacional Gustavo Rojas Pinilla 1.4 km"},{"id":48,"name":"Aire acondicionado"},{"id":49,"name":"Barbacoa"},{"id":45,"name":"Habitaciones familiares"},{"id":47,"name":"Parking gratis"},{"id":43,"name":"Piscina al aire libre"},{"id":39,"name":"Playa de Johnny Cay 2 km"},{"id":41,"name":"Playa de la bahía de Cocoplum 3.9 km"},{"id":38,"name":"Playa de Spratt Bight 1.5 km"},{"id":37,"name":"Playa Los Almendros 800 m"},{"id":40,"name":"Playita de las Parceras 3.4 km"},{"id":51,"name":"Servicio de streaming (como Netflix)"},{"id":52,"name":"Servicio de traslado"},{"id":46,"name":"Traslado aeropuerto"},{"id":44,"name":"WiFi gratis"},{"id":50,"name":"Zona de comedor exterior"}]'::jsonb, ARRAY[]::text[], NULL, '2025-10-19T06:49:43.640552+00:00'::timestamptz, '2025-10-19T06:49:43.640552+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Haines Cay DOBLE - Overview

Haines Cay DOBLE

Habitación exterior con balcón y ventanas acústicas a tan sólo dos cuadras de la playa principal.

Capacidad: 2 adultos, 0 niños (Total: 0 personas)

Tamaño: 30m²

Tipo: accommodation', '[{"id":43,"name":"Dos camas"},{"id":42,"name":"Nevera"}]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T16:59:38.446253+00:00'::timestamptz, '2025-10-23T16:59:38.446253+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Haines Cay DOBLE - Capacity & Beds

Capacidad máxima: 0 personas (2 adultos, 0 niños)

Configuración de camas: Opción de 2 camas sencillas ó 1 cama matrimonial (1 cama(s))

Opción de 2 camas sencillas ó 1 cama matrimonial', '[{"id":43,"name":"Dos camas"},{"id":42,"name":"Nevera"}]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T16:59:40.461736+00:00'::timestamptz, '2025-10-23T16:59:40.461736+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Haines Cay DOBLE - Amenities

Amenities: [object Object], [object Object]

Características especiales: [object Object], [object Object]', '[{"id":43,"name":"Dos camas"},{"id":42,"name":"Nevera"}]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T16:59:41.925916+00:00'::timestamptz, '2025-10-23T16:59:41.925916+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Haines Cay DOBLE - Location & View

Vista: Vistas al centro de la ciudad y al cañón de morgan

Detalles de vista: Vistas al centro de la ciudad y al cañón de morgan

Vista turística: Vistas al centro de la ciudad y al cañón de morgan', '[{"id":43,"name":"Dos camas"},{"id":42,"name":"Nevera"}]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T16:59:43.704188+00:00'::timestamptz, '2025-10-23T16:59:43.704188+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Haines Cay DOBLE - Images

7 fotos disponibles:
1. Haines Cay DOBLE - Image 1
2. Haines Cay DOBLE - Image 2
3. Haines Cay DOBLE - Image 3
4. Haines Cay DOBLE - Image 4
5. Haines Cay DOBLE - Image 5
6. Haines Cay DOBLE - Image 6
7. Haines Cay DOBLE - Image 7', '[{"id":43,"name":"Dos camas"},{"id":42,"name":"Nevera"}]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T16:59:44.700706+00:00'::timestamptz, '2025-10-23T16:59:44.700706+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Haines Cay DOBLE - Features

Amenidades turísticas: [object Object], [object Object]', '[{"id":43,"name":"Dos camas"},{"id":42,"name":"Nevera"}]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T16:59:45.812555+00:00'::timestamptz, '2025-10-23T16:59:45.812555+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Serrana Cay DOBLE - Overview

Serrana Cay DOBLE

Habitación exterior con balcón y ventanas acústicas a tan sólo dos cuadras de la playa principal.

Capacidad: 2 adultos, 0 niños (Total: 0 personas)

Tamaño: 30m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T16:59:47.145578+00:00'::timestamptz, '2025-10-23T16:59:47.145578+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Serrana Cay DOBLE - Capacity & Beds

Capacidad máxima: 0 personas (2 adultos, 0 niños)

Configuración de camas: Opción de 2 camas sencillas ó 1 cama matrimonial (1 cama(s))

Opción de 2 camas sencillas ó 1 cama matrimonial', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T16:59:49.440917+00:00'::timestamptz, '2025-10-23T16:59:49.440917+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Serrana Cay DOBLE - Images

7 fotos disponibles:
1. Serrana Cay DOBLE - Image 1
2. Serrana Cay DOBLE - Image 2
3. Serrana Cay DOBLE - Image 3
4. Serrana Cay DOBLE - Image 4
5. Serrana Cay DOBLE - Image 5
6. Serrana Cay DOBLE - Image 6
7. Serrana Cay DOBLE - Image 7', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T16:59:50.175526+00:00'::timestamptz, '2025-10-23T16:59:50.175526+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Queena Reef DOBLE - Overview

Queena Reef DOBLE

Habitación exterior con balcón y ventanas acústicas a tan sólo dos cuadras de la playa principal.

Capacidad: 2 adultos, 0 niños (Total: 0 personas)

Tamaño: 30m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T16:59:51.369108+00:00'::timestamptz, '2025-10-23T16:59:51.369108+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Queena Reef DOBLE - Capacity & Beds

Capacidad máxima: 0 personas (2 adultos, 0 niños)

Configuración de camas: Opción de 2 camas sencillas ó 1 cama matrimonial (1 cama(s))

Opción de 2 camas sencillas ó 1 cama matrimonial', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T16:59:52.090643+00:00'::timestamptz, '2025-10-23T16:59:52.090643+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Queena Reef DOBLE - Images

7 fotos disponibles:
1. Queena Reef DOBLE - Image 1
2. Queena Reef DOBLE - Image 2
3. Queena Reef DOBLE - Image 3
4. Queena Reef DOBLE - Image 4
5. Queena Reef DOBLE - Image 5
6. Queena Reef DOBLE - Image 6
7. Queena Reef DOBLE - Image 7', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T16:59:55.606983+00:00'::timestamptz, '2025-10-23T16:59:55.606983+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'North Cay DOBLE - Overview

North Cay DOBLE

Habitación exterior con ventanas acústicas y balcón con vista hacia la calle peatonal.

Capacidad: 2 adultos, 1 niños (Total: 2 personas)

Tamaño: 20m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T16:59:58.015551+00:00'::timestamptz, '2025-10-23T16:59:58.015551+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'North Cay DOBLE - Capacity & Beds

Capacidad máxima: 2 personas (2 adultos, 1 niños)

Configuración de camas: Opción de 2 camas sencillas ó 1 cama matrimonial (1 cama(s))

Opción de 2 camas sencillas ó 1 cama matrimonial', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T16:59:58.625066+00:00'::timestamptz, '2025-10-23T16:59:58.625066+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'North Cay DOBLE - Images

11 fotos disponibles:
1. North Cay DOBLE - Image 1
2. North Cay DOBLE - Image 2
3. North Cay DOBLE - Image 3
4. North Cay DOBLE - Image 4
5. North Cay DOBLE - Image 5
6. North Cay DOBLE - Image 6
7. North Cay DOBLE - Image 7
8. North Cay DOBLE - Image 8
9. North Cay DOBLE - Image 9
10. North Cay DOBLE - Image 10
11. North Cay DOBLE - Image 11', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T16:59:59.213231+00:00'::timestamptz, '2025-10-23T16:59:59.213231+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Rose Cay APARTAMENTO - Overview

Rose Cay APARTAMENTO

Apartamento dúplex completo con ventanas acústicas y balcón con vista hacia la calle peatonal.

Capacidad: 6 adultos, 5 niños (Total: 6 personas)

Tamaño: 120m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:00.332534+00:00'::timestamptz, '2025-10-23T17:00:00.332534+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Rose Cay APARTAMENTO - Capacity & Beds

Capacidad máxima: 6 personas (6 adultos, 5 niños)

Configuración de camas: Opción de 6 camas sencillas ó 2 camas matrimoniales y 2 Sencillas (1 cama(s))

Opción de 6 camas sencillas ó 2 camas matrimoniales y 2 Sencillas', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:00.900614+00:00'::timestamptz, '2025-10-23T17:00:00.900614+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Rose Cay APARTAMENTO - Images

15 fotos disponibles:
1. Rose Cay APARTAMENTO - Image 1
2. Rose Cay APARTAMENTO - Image 2
3. Rose Cay APARTAMENTO - Image 3
4. Rose Cay APARTAMENTO - Image 4
5. Rose Cay APARTAMENTO - Image 5
6. Rose Cay APARTAMENTO - Image 6
7. Rose Cay APARTAMENTO - Image 7
8. Rose Cay APARTAMENTO - Image 8
9. Rose Cay APARTAMENTO - Image 9
10. Rose Cay APARTAMENTO - Image 10
11. Rose Cay APARTAMENTO - Image 11
12. Rose Cay APARTAMENTO - Image 12
13. Rose Cay APARTAMENTO - Image 13
14. Rose Cay APARTAMENTO - Image 14
15. Rose Cay APARTAMENTO - Image 15', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:02.35857+00:00'::timestamptz, '2025-10-23T17:00:02.35857+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Johnny Cay TRIPLE - Overview

Johnny Cay TRIPLE

Habitación interior con ventanas acústicas a tan sólo dos cuadras de la playa principal.

Capacidad: 3 adultos, 2 niños (Total: 3 personas)

Tamaño: 20m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:04.322528+00:00'::timestamptz, '2025-10-23T17:00:04.322528+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Johnny Cay TRIPLE - Capacity & Beds

Capacidad máxima: 3 personas (3 adultos, 2 niños)

Configuración de camas: Cama queen y cama sencilla (1 cama(s))

Cama queen y cama sencilla', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:04.976649+00:00'::timestamptz, '2025-10-23T17:00:04.976649+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Johnny Cay TRIPLE - Images

8 fotos disponibles:
1. Johnny Cay TRIPLE - Image 1
2. Johnny Cay TRIPLE - Image 2
3. Johnny Cay TRIPLE - Image 3
4. Johnny Cay TRIPLE - Image 4
5. Johnny Cay TRIPLE - Image 5
6. Johnny Cay TRIPLE - Image 6
7. Johnny Cay TRIPLE - Image 7
8. Johnny Cay TRIPLE - Image 8', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:05.604173+00:00'::timestamptz, '2025-10-23T17:00:05.604173+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Haines Cay DÚPLEX - Overview

Haines Cay DÚPLEX

Habitación dúplex familiar con hermoso balcón con vista hacia la calle peatonal.

Capacidad: 4 adultos, 3 niños (Total: 4 personas)

Tamaño: 45m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:08.050238+00:00'::timestamptz, '2025-10-23T17:00:08.050238+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Haines Cay DÚPLEX - Capacity & Beds

Capacidad máxima: 4 personas (4 adultos, 3 niños)

Configuración de camas: Opción de 4 Camas Sencillas ó 1 Cama matrimonial y 2 Sencillas (1 cama(s))

Opción de 4 Camas Sencillas ó 1 Cama matrimonial y 2 Sencillas', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:08.745955+00:00'::timestamptz, '2025-10-23T17:00:08.745955+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Haines Cay DÚPLEX - Images

8 fotos disponibles:
1. Haines Cay DÚPLEX - Image 1
2. Haines Cay DÚPLEX - Image 2
3. Haines Cay DÚPLEX - Image 3
4. Haines Cay DÚPLEX - Image 4
5. Haines Cay DÚPLEX - Image 5
6. Haines Cay DÚPLEX - Image 6
7. Haines Cay DÚPLEX - Image 7
8. Haines Cay DÚPLEX - Image 8', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:09.373439+00:00'::timestamptz, '2025-10-23T17:00:09.373439+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Cotton Cay DOBLE - Overview

Cotton Cay DOBLE

Habitación interior sin vista con ventanas acústicas para un descanso total.

Capacidad: 2 adultos, 1 niños (Total: 2 personas)

Tamaño: 16m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:10.446545+00:00'::timestamptz, '2025-10-23T17:00:10.446545+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Cotton Cay DOBLE - Capacity & Beds

Capacidad máxima: 2 personas (2 adultos, 1 niños)

Configuración de camas: Opción de 2 Camas Sencillas ó 1 matrimonial (1 cama(s))

Opción de 2 Camas Sencillas ó 1 matrimonial', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:11.061846+00:00'::timestamptz, '2025-10-23T17:00:11.061846+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Cotton Cay DOBLE - Images

6 fotos disponibles:
1. Cotton Cay DOBLE - Image 1
2. Cotton Cay DOBLE - Image 2
3. Cotton Cay DOBLE - Image 3
4. Cotton Cay DOBLE - Image 4
5. Cotton Cay DOBLE - Image 5
6. Cotton Cay DOBLE - Image 6', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:11.970483+00:00'::timestamptz, '2025-10-23T17:00:11.970483+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'East Cay Cuádruple - Overview

East Cay Cuádruple

Habitación inetrior ideal para familias, con ventanas acústicas y a tan sólo dos cuadras de la playa principal.

Capacidad: 4 adultos, 3 niños (Total: 4 personas)

Tamaño: 40m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:12.954558+00:00'::timestamptz, '2025-10-23T17:00:12.954558+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'East Cay Cuádruple - Capacity & Beds

Capacidad máxima: 4 personas (4 adultos, 3 niños)

Configuración de camas: Opción de 4 Camas Sencillas o 1 Cama matrimonial y 2 Sencillas (1 cama(s))

Opción de 4 Camas Sencillas o 1 Cama matrimonial y 2 Sencillas', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:13.557281+00:00'::timestamptz, '2025-10-23T17:00:13.557281+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'East Cay Cuádruple - Images

9 fotos disponibles:
1. East Cay Cuádruple - Image 1
2. East Cay Cuádruple - Image 2
3. East Cay Cuádruple - Image 3
4. East Cay Cuádruple - Image 4
5. East Cay Cuádruple - Image 5
6. East Cay Cuádruple - Image 6
7. East Cay Cuádruple - Image 7
8. East Cay Cuádruple - Image 8
9. East Cay Cuádruple - Image 9', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:14.550778+00:00'::timestamptz, '2025-10-23T17:00:14.550778+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Bailey Cay TRIPLE - Overview

Bailey Cay TRIPLE

Habitación exterior con ventanas acústicas y gran balcón con vista hacia la calle peatonal.

Capacidad: 3 adultos, 0 niños (Total: 3 personas)

Tamaño: 40m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:18.388569+00:00'::timestamptz, '2025-10-23T17:00:18.388569+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Bailey Cay TRIPLE - Capacity & Beds

Capacidad máxima: 3 personas (3 adultos, 0 niños)

Configuración de camas: Opcion de 3 camas sencillas ó 1 cama matrimonial y 1 sencilla (1 cama(s))

Opcion de 3 camas sencillas ó 1 cama matrimonial y 1 sencilla', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:19.547107+00:00'::timestamptz, '2025-10-23T17:00:19.547107+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Bailey Cay TRIPLE - Images

7 fotos disponibles:
1. Bailey Cay TRIPLE - Image 1
2. Bailey Cay TRIPLE - Image 2
3. Bailey Cay TRIPLE - Image 3
4. Bailey Cay TRIPLE - Image 4
5. Bailey Cay TRIPLE - Image 5
6. Bailey Cay TRIPLE - Image 6
7. Bailey Cay TRIPLE - Image 7', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:20.251511+00:00'::timestamptz, '2025-10-23T17:00:20.251511+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Serrana Cay DÚPLEX - Overview

Serrana Cay DÚPLEX

Habitación dúplex familiar con hermoso balcón con vista hacia la calle peatonal.

Capacidad: 4 adultos, 3 niños (Total: 4 personas)

Tamaño: 45m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:21.29282+00:00'::timestamptz, '2025-10-23T17:00:21.29282+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Serrana Cay DÚPLEX - Capacity & Beds

Capacidad máxima: 4 personas (4 adultos, 3 niños)

Configuración de camas: Opción de 4 Camas Sencillas ó 1 Cama matrimonial y 2 Sencillas (1 cama(s))

Opción de 4 Camas Sencillas ó 1 Cama matrimonial y 2 Sencillas', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:22.049436+00:00'::timestamptz, '2025-10-23T17:00:22.049436+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Serrana Cay DÚPLEX - Images

11 fotos disponibles:
1. Serrana Cay DÚPLEX - Image 1
2. Serrana Cay DÚPLEX - Image 2
3. Serrana Cay DÚPLEX - Image 3
4. Serrana Cay DÚPLEX - Image 4
5. Serrana Cay DÚPLEX - Image 5
6. Serrana Cay DÚPLEX - Image 6
7. Serrana Cay DÚPLEX - Image 7
8. Serrana Cay DÚPLEX - Image 8
9. Serrana Cay DÚPLEX - Image 9
10. Serrana Cay DÚPLEX - Image 10
11. Serrana Cay DÚPLEX - Image 11', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:22.709322+00:00'::timestamptz, '2025-10-23T17:00:22.709322+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Rocky Cay TRIPLE - Overview

Rocky Cay TRIPLE

Habitación exterior con balcón y ventanas acústicas a tan sólo dos cuadras de la playa principal.

Capacidad: 3 adultos, 2 niños (Total: 3 personas)

Tamaño: 35m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:24.107521+00:00'::timestamptz, '2025-10-23T17:00:24.107521+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Rocky Cay TRIPLE - Capacity & Beds

Capacidad máxima: 3 personas (3 adultos, 2 niños)

Configuración de camas: Opción de 3 camas sencillas ó 1 cama matrimonial y 1 sencilla (1 cama(s))

Opción de 3 camas sencillas ó 1 cama matrimonial y 1 sencilla', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:24.779646+00:00'::timestamptz, '2025-10-23T17:00:24.779646+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Rocky Cay TRIPLE - Images

8 fotos disponibles:
1. Rocky Cay TRIPLE - Image 1
2. Rocky Cay TRIPLE - Image 2
3. Rocky Cay TRIPLE - Image 3
4. Rocky Cay TRIPLE - Image 4
5. Rocky Cay TRIPLE - Image 5
6. Rocky Cay TRIPLE - Image 6
7. Rocky Cay TRIPLE - Image 7
8. Rocky Cay TRIPLE - Image 8', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:25.454002+00:00'::timestamptz, '2025-10-23T17:00:25.454002+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'South Cay DOBLE - Overview

South Cay DOBLE

Habitación exterior con balcón y ventanas acústicas, ideal para parejas.

Capacidad: 2 adultos, 1 niños (Total: 0 personas)

Tamaño: 20m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:26.424495+00:00'::timestamptz, '2025-10-23T17:00:26.424495+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'South Cay DOBLE - Capacity & Beds

Capacidad máxima: 0 personas (2 adultos, 1 niños)

Configuración de camas: Opción de 2 Camas Sencillas ó 1 Cama matrimonial (1 cama(s))

Opción de 2 Camas Sencillas ó 1 Cama matrimonial', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:27.183353+00:00'::timestamptz, '2025-10-23T17:00:27.183353+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'South Cay DOBLE - Images

6 fotos disponibles:
1. South Cay DOBLE - Image 1
2. South Cay DOBLE - Image 2
3. South Cay DOBLE - Image 3
4. South Cay DOBLE - Image 4
5. South Cay DOBLE - Image 5
6. South Cay DOBLE - Image 6', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:27.817553+00:00'::timestamptz, '2025-10-23T17:00:27.817553+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Crab Cay DOBLE - Overview

Crab Cay DOBLE

Habitación interior sin vista con ventanas acústicas para un descanso total.

Capacidad: 2 adultos, 1 niños (Total: 0 personas)

Tamaño: 14m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:28.748802+00:00'::timestamptz, '2025-10-23T17:00:28.748802+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Crab Cay DOBLE - Capacity & Beds

Capacidad máxima: 0 personas (2 adultos, 1 niños)

Configuración de camas: Opción de 2 Camas Sencillas ó 1 matrimonial (1 cama(s))

Opción de 2 Camas Sencillas ó 1 matrimonial', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:29.602932+00:00'::timestamptz, '2025-10-23T17:00:29.602932+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Crab Cay DOBLE - Images

5 fotos disponibles:
1. Crab Cay DOBLE - Image 1
2. Crab Cay DOBLE - Image 2
3. Crab Cay DOBLE - Image 3
4. Crab Cay DOBLE - Image 4
5. Crab Cay DOBLE - Image 5', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:30.4654+00:00'::timestamptz, '2025-10-23T17:00:30.4654+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'West Cay TRIPLE - Overview

West Cay TRIPLE

Habitación exterior con balcón y ventanas acústicas a tan sólo dos cuadras de la playa principal.

Capacidad: 3 adultos, 0 niños (Total: 3 personas)

Tamaño: 30m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:31.502364+00:00'::timestamptz, '2025-10-23T17:00:31.502364+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'West Cay TRIPLE - Capacity & Beds

Capacidad máxima: 3 personas (3 adultos, 0 niños)

Configuración de camas: Opcion de 3 camas sencillas ó 1 cama matrimonial y 1 sencilla (1 cama(s))

Opcion de 3 camas sencillas ó 1 cama matrimonial y 1 sencilla', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:32.127857+00:00'::timestamptz, '2025-10-23T17:00:32.127857+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'West Cay TRIPLE - Images

9 fotos disponibles:
1. West Cay TRIPLE - Image 1
2. West Cay TRIPLE - Image 2
3. West Cay TRIPLE - Image 3
4. West Cay TRIPLE - Image 4
5. West Cay TRIPLE - Image 5
6. West Cay TRIPLE - Image 6
7. West Cay TRIPLE - Image 7
8. West Cay TRIPLE - Image 8
9. West Cay TRIPLE - Image 9', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:32.768939+00:00'::timestamptz, '2025-10-23T17:00:32.768939+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Queena Reef DÚPLEX - Overview

Queena Reef DÚPLEX

Habitación dúplex familiar con hermoso balcón con vista hacia la calle peatonal.

Capacidad: 4 adultos, 3 niños (Total: 4 personas)

Tamaño: 45m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:33.696877+00:00'::timestamptz, '2025-10-23T17:00:33.696877+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Queena Reef DÚPLEX - Capacity & Beds

Capacidad máxima: 4 personas (4 adultos, 3 niños)

Configuración de camas: Opción de 4 Camas Sencillas ó 1 Cama matrimonial y 2 Sencillas (1 cama(s))

Opción de 4 Camas Sencillas ó 1 Cama matrimonial y 2 Sencillas', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:34.385416+00:00'::timestamptz, '2025-10-23T17:00:34.385416+00:00'::timestamptz),
(NULL, '2263efba-b62b-417b-a422-a84638bc632f'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Queena Reef DÚPLEX - Images

8 fotos disponibles:
1. Queena Reef DÚPLEX - Image 1
2. Queena Reef DÚPLEX - Image 2
3. Queena Reef DÚPLEX - Image 3
4. Queena Reef DÚPLEX - Image 4
5. Queena Reef DÚPLEX - Image 5
6. Queena Reef DÚPLEX - Image 6
7. Queena Reef DÚPLEX - Image 7
8. Queena Reef DÚPLEX - Image 8', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T17:00:35.218276+00:00'::timestamptz, '2025-10-23T17:00:35.218276+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Sunshine - Overview

Sunshine

Este es un apartamento privado equipado para que puedan dormir hasta 2 personas. Moderno, tiene baño con agua caliente, TV, aire acondicionado, lavadero y caja fuerte.

Capacidad: 2 adultos, 0 niños (Total: 2 personas)

Tamaño: 27m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:40.532871+00:00'::timestamptz, '2025-10-23T19:49:40.532871+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Sunshine - Capacity & Beds

Capacidad máxima: 2 personas (2 adultos, 0 niños)

Configuración de camas: Una cama doble (1 cama(s))

Una cama doble', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:41.344003+00:00'::timestamptz, '2025-10-23T19:49:41.344003+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Sunshine - Images

9 fotos disponibles:
1. Sunshine - Image 1
2. Sunshine - Image 2
3. Sunshine - Image 3
4. Sunshine - Image 4
5. Sunshine - Image 5
6. Sunshine - Image 6
7. Sunshine - Image 7
8. Sunshine - Image 8
9. Sunshine - Image 9', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:42.06555+00:00'::timestamptz, '2025-10-23T19:49:42.06555+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Simmer Highs - Overview

Simmer Highs

Apartamento gigante de 4 habitaciones cada una con baño privado para hasta 10 personas, con cocina totalmente equipada, balcón y lavadero.

Capacidad: 10 adultos, 6 niños (Total: 10 personas)

Tamaño: 150m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:43.103004+00:00'::timestamptz, '2025-10-23T19:49:43.103004+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Simmer Highs - Capacity & Beds

Capacidad máxima: 10 personas (10 adultos, 6 niños)

Configuración de camas: Cinco camas dobles (1 cama(s))

Cinco camas dobles', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:43.776554+00:00'::timestamptz, '2025-10-23T19:49:43.776554+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Simmer Highs - Images

11 fotos disponibles:
1. Simmer Highs - Image 1
2. Simmer Highs - Image 2
3. Simmer Highs - Image 3
4. Simmer Highs - Image 4
5. Simmer Highs - Image 5
6. Simmer Highs - Image 6
7. Simmer Highs - Image 7
8. Simmer Highs - Image 8
9. Simmer Highs - Image 9
10. Simmer Highs - Image 10
11. Simmer Highs - Image 11', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:44.429771+00:00'::timestamptz, '2025-10-23T19:49:44.429771+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Groovin'' - Overview

Groovin''

Apartamento pequeño pero posiblemente todo lo que necesitarás está ahí, solo hace falta un closet pero si vas ligerx de equipaje no tendrás mayor problema. 

Capacidad: 2 adultos, 1 niños (Total: 2 personas)

Tamaño: 28m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:45.427518+00:00'::timestamptz, '2025-10-23T19:49:45.427518+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Groovin'' - Capacity & Beds

Capacidad máxima: 2 personas (2 adultos, 1 niños)

Configuración de camas: Cama doble (1 cama(s))

Cama doble', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:46.046877+00:00'::timestamptz, '2025-10-23T19:49:46.046877+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Groovin'' - Images

5 fotos disponibles:
1. Groovin'' - Image 1
2. Groovin'' - Image 2
3. Groovin'' - Image 3
4. Groovin'' - Image 4
5. Groovin'' - Image 5', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:46.857297+00:00'::timestamptz, '2025-10-23T19:49:46.857297+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'One Love - Overview

One Love

Apartamento para pareja o familia pequeña. Pueden dormir hasta 3 personas, tiene un baño suficientemente grande, balcón, hamaca y lavadero para secar la ropa de playa.

Capacidad: 2 adultos, 0 niños (Total: 2 personas)

Tamaño: 35m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:47.895003+00:00'::timestamptz, '2025-10-23T19:49:47.895003+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'One Love - Capacity & Beds

Capacidad máxima: 2 personas (2 adultos, 0 niños)

Configuración de camas: Cama doble (1 cama(s))

Cama doble', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:48.529435+00:00'::timestamptz, '2025-10-23T19:49:48.529435+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'One Love - Images

8 fotos disponibles:
1. One Love - Image 1
2. One Love - Image 2
3. One Love - Image 3
4. One Love - Image 4
5. One Love - Image 5
6. One Love - Image 6
7. One Love - Image 7
8. One Love - Image 8', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:50.309173+00:00'::timestamptz, '2025-10-23T19:49:50.309173+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Misty Morning - Overview

Misty Morning

Apartamento para pareja o familia. Pueden dormir hasta 4 personas, tiene un baño suficientemente grande, hamaca y un balcón trasero con lavadero para secar la ropa de playa.

Capacidad: 2 adultos, 0 niños (Total: 2 personas)

Tamaño: 45m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:51.304369+00:00'::timestamptz, '2025-10-23T19:49:51.304369+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Misty Morning - Capacity & Beds

Capacidad máxima: 2 personas (2 adultos, 0 niños)

Configuración de camas: Cama doble (1 cama(s))

Cama doble', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:51.980749+00:00'::timestamptz, '2025-10-23T19:49:51.980749+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Misty Morning - Images

8 fotos disponibles:
1. Misty Morning - Image 1
2. Misty Morning - Image 2
3. Misty Morning - Image 3
4. Misty Morning - Image 4
5. Misty Morning - Image 5
6. Misty Morning - Image 6
7. Misty Morning - Image 7
8. Misty Morning - Image 8', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:52.855757+00:00'::timestamptz, '2025-10-23T19:49:52.855757+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Jammin'' - Overview

Jammin''

Habitación grande con 2 camas en las que pueden dormir hasta 4 personas. Baño amplio y cómodo para todos. Ahora con nevera dentro de la habitación.

Capacidad: 2 adultos, 0 niños (Total: 2 personas)

Tamaño: 16m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:54.014804+00:00'::timestamptz, '2025-10-23T19:49:54.014804+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Jammin'' - Capacity & Beds

Capacidad máxima: 2 personas (2 adultos, 0 niños)

Configuración de camas: Cama doble (1 cama(s))

Cama doble', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:54.634119+00:00'::timestamptz, '2025-10-23T19:49:54.634119+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Jammin'' - Images

9 fotos disponibles:
1. Jammin'' - Image 1
2. Jammin'' - Image 2
3. Jammin'' - Image 3
4. Jammin'' - Image 4
5. Jammin'' - Image 5
6. Jammin'' - Image 6
7. Jammin'' - Image 7
8. Jammin'' - Image 8
9. Jammin'' - Image 9', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:55.365657+00:00'::timestamptz, '2025-10-23T19:49:55.365657+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Natural Mystic - Overview

Natural Mystic

Habitación con cama doble, baño independiente, aire acondicionado, closet amplio y ventana al exterior. También tiene secador de pelo y caja fuerte.

Capacidad: 2 adultos, 0 niños (Total: 2 personas)

Tamaño: 15m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:56.524252+00:00'::timestamptz, '2025-10-23T19:49:56.524252+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Natural Mystic - Capacity & Beds

Capacidad máxima: 2 personas (2 adultos, 0 niños)

Configuración de camas: Cama doble (1 cama(s))

Cama doble', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:57.132263+00:00'::timestamptz, '2025-10-23T19:49:57.132263+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Natural Mystic - Images

10 fotos disponibles:
1. Natural Mystic - Image 1
2. Natural Mystic - Image 2
3. Natural Mystic - Image 3
4. Natural Mystic - Image 4
5. Natural Mystic - Image 5
6. Natural Mystic - Image 6
7. Natural Mystic - Image 7
8. Natural Mystic - Image 8
9. Natural Mystic - Image 9
10. Natural Mystic - Image 10', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:57.779984+00:00'::timestamptz, '2025-10-23T19:49:57.779984+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Dreamland - Capacity & Beds

Capacidad máxima: 2 personas (2 adultos, 0 niños)

Configuración de camas: Cama doble (1 cama(s))

Cama doble', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:49:59.541595+00:00'::timestamptz, '2025-10-23T19:49:59.541595+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Dreamland - Images

11 fotos disponibles:
1. Dreamland - Image 1
2. Dreamland - Image 2
3. Dreamland - Image 3
4. Dreamland - Image 4
5. Dreamland - Image 5
6. Dreamland - Image 6
7. Dreamland - Image 7
8. Dreamland - Image 8
9. Dreamland - Image 9
10. Dreamland - Image 10
11. Dreamland - Image 11', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:50:00.280773+00:00'::timestamptz, '2025-10-23T19:50:00.280773+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Kaya - Overview

Kaya

Es la habitación pequeña del apartamento, le hace falta un closet pero si vas ligerx de equipaje no tiene nada que envidiarle a las demás.

Capacidad: 2 adultos, 0 niños (Total: 2 personas)

Tamaño: 13m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:50:01.31759+00:00'::timestamptz, '2025-10-23T19:50:01.31759+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Kaya - Capacity & Beds

Capacidad máxima: 2 personas (2 adultos, 0 niños)

Configuración de camas: Cama doble (1 cama(s))

Cama doble', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:50:01.99639+00:00'::timestamptz, '2025-10-23T19:50:01.99639+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Kaya - Images

10 fotos disponibles:
1. Kaya - Image 1
2. Kaya - Image 2
3. Kaya - Image 3
4. Kaya - Image 4
5. Kaya - Image 5
6. Kaya - Image 6
7. Kaya - Image 7
8. Kaya - Image 8
9. Kaya - Image 9
10. Kaya - Image 10', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:50:02.66659+00:00'::timestamptz, '2025-10-23T19:50:02.66659+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Summertime - Overview

Summertime

Aparta-estudio con ventana anti-ruido, escritorio, clóset y cama doble. Es un lugar de 20 metros cuadrados en el que hay de todo. La cocina está equipada con todo lo que podrías llegar a necesitar.

Capacidad: 2 adultos, 0 niños (Total: 2 personas)

Tamaño: 27m²

Tipo: accommodation', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:50:03.740272+00:00'::timestamptz, '2025-10-23T19:50:03.740272+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Summertime - Capacity & Beds

Capacidad máxima: 2 personas (2 adultos, 0 niños)

Configuración de camas: Cama doble (1 cama(s))

Cama doble', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:50:04.412641+00:00'::timestamptz, '2025-10-23T19:50:04.412641+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'accommodation', NULL, NULL, NULL, NULL, NULL, 'Summertime - Images

10 fotos disponibles:
1. Summertime - Image 1
2. Summertime - Image 2
3. Summertime - Image 3
4. Summertime - Image 4
5. Summertime - Image 5
6. Summertime - Image 6
7. Summertime - Image 7
8. Summertime - Image 8
9. Summertime - Image 9
10. Summertime - Image 10', '[]'::jsonb, ARRAY[]::text[], NULL, '2025-10-23T19:50:05.096545+00:00'::timestamptz, '2025-10-23T19:50:05.096545+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Natural Mystic - Overview

## Overview {#overview}

**Q: ¿Qué es la Habitación Privada Natural Mystic y por qué es ideal para huéspedes sociales?**
**A:** La Habitación Privada Natural Mystic es una acogedora habitación ubicada dentro de un apartamento grande en Simmer Down Guest House, donde los huéspedes disfrutan de privacidad en su dormitorio y baño privado, mientras comparten las zonas comunes con otros viajeros. Es perfecta para parejas que buscan un equilibrio entre intimidad personal y oportunidades de socialización en un ambiente cálido y auténtico.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, cocina_compartida, sala_comun","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:00.754661+00:00'::timestamptz, '2025-10-24T04:00:00.754661+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Natural Mystic - Capacidad y Configuración de Espacios

## Capacidad y Configuración de Espacios {#capacidad-configuracion}

**Q: ¿Cuáles son las especificaciones de capacidad y distribución de espacios de la Habitación Natural Mystic?**
**A:** Detalles completos de la configuración y espacios disponibles:

### Capacidad y Distribución
- **Capacidad máxima**: 2 personas <!-- EXTRAE: capacity.max_capacity -->
- **Configuración de camas**: Habitación principal con cama matrimonial <!-- EXTRAE: bed_configuration -->
- **Tamaño**: Habitación privada dentro de apartamento compartido <!-- EXTRAE: size_m2 -->
- **Número de piso**: Planta principal <!-- EXTRAE: floor_number -->
- **Tipo de vista**: Vista estándar con ventanas naturales <!-- EXTRAE: view_type -->
- **Número de unidad**: Habitación Natural Mystic <!-- EXTRAE: unit_number -->

### Espacios y Áreas
- **Espacios privados**: Habitación principal con cama matrimonial, baño privado exclusivo
- **Espacios compartidos**: Sala, cocina y áreas comunes del apartamento
- **Características únicas**: Equilibrio perfecto entre privacidad y vida social, baño privado <!-- EXTRAE: unique_features -->

**Configuración ideal**: Perfecta para parejas que valoran la privacidad pero disfrutan conocer otros viajeros en espacios compartidos.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, cocina_compartida, sala_comun","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:03.260131+00:00'::timestamptz, '2025-10-24T04:00:03.260131+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Natural Mystic - Tarifas y Precios Detallados

## Tarifas y Precios Detallados {#tarifas-precios}

**Q: ¿Cuáles son las tarifas de la Habitación Natural Mystic según temporada y ocupación?**
**A:** Estructura completa de precios por temporada:

### Temporada Baja
- **2 personas**: $160.000 COP por noche <!-- EXTRAE: base_price_low_season -->
- **Capacidad fija**: Solo 2 personas, no permite huéspedes adicionales
- **Tarifa persona adicional**: No aplica <!-- EXTRAE: price_per_person_low -->

### Temporada Alta
- **2 personas**: $180.000 COP por noche <!-- EXTRAE: base_price_high_season -->
- **Capacidad fija**: Solo 2 personas, no permite huéspedes adicionales
- **Tarifa persona adicional**: No aplica <!-- EXTRAE: price_per_person_high -->

### Información de Precios
- **Moneda**: Pesos colombianos (COP)
- **Incluye**: Todos los amenities y acceso a zonas comunes
- **Política de ocupación**: Capacidad máxima estricta de 2 personas

**Nota importante**: Excelente relación calidad-precio con baño privado y acceso completo a zonas comunes. Referencia {#amenities-caracteristicas} para servicios incluidos.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, cocina_compartida, sala_comun","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:04.859696+00:00'::timestamptz, '2025-10-24T04:00:04.859696+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Natural Mystic - Amenities y Características Especiales

## Amenities y Características Especiales {#amenities-caracteristicas}

**Q: ¿Qué amenities, comodidades y características especiales están incluidos en la Habitación Natural Mystic?**
**A:** Lista completa de amenities premium y características únicas:

### Tecnología y Entretenimiento
- **Smart TV** con cuenta de Netflix incluida <!-- EXTRAE: amenities_list -->
- **Wi-Fi de alta velocidad** para trabajo y entretenimiento
- **Aire acondicionado** para clima controlado

### Comodidades Privadas
- **Baño privado** exclusivo para huéspedes de la habitación
- **Habitación completamente privada** con puerta con llave
- **Espacio de almacenamiento** personal en habitación

### Acceso a Zonas Comunes
- **Cocina compartida** totalmente equipada
- **Sala común** para socializar con otros huéspedes
- **Áreas de descanso** compartidas

### Características Únicas y Especiales
- **Baño privado exclusivo**: Única habitación con baño completamente privado <!-- EXTRAE: unique_features -->
- **Ambiente social**: Oportunidad de conocer otros viajeros <!-- EXTRAE: unique_features -->
- **Privacidad garantizada**: Habitación con puerta independiente <!-- EXTRAE: unique_features -->
- **Acceso completo**: Uso libre de todas las zonas comunes del apartamento <!-- EXTRAE: unique_features -->

### Características de Accesibilidad
- **Acceso**: Planta principal, fácil acceso sin escaleras <!-- EXTRAE: accessibility_features -->
- **Baño adaptado**: Baño privado estándar <!-- EXTRAE: accessibility_features -->
- **Comunicación**: Señalización visual disponible <!-- EXTRAE: accessibility_features -->

### Amenities en Texto Completo
Smart TV con Netflix, Wi-Fi alta velocidad, aire acondicionado, baño privado, acceso cocina compartida, sala común <!-- EXTRAE: unit_amenities -->

**Ventaja diferencial**: Única habitación que combina privacidad total con experiencia social auténtica, ideal para viajeros sociales.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, cocina_compartida, sala_comun","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:05.65398+00:00'::timestamptz, '2025-10-24T04:00:05.65398+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Natural Mystic - Información Visual y Ubicación Detallada

## Información Visual y Ubicación Detallada {#visual-ubicacion}

**Q: ¿Qué información visual y detalles de ubicación están disponibles para la Habitación Natural Mystic?**
**A:** Detalles completos de ubicación, características visuales y atractivos turísticos:

### Galería Visual e Imágenes
- **Foto principal**: Habitación Privada Natural Mystic vista general <!-- EXTRAE: images -->
- **URL de imagen**: https://simmerdown.house/wp-content/uploads/2024/06/Habitacion-privada-Natural-Mystic.jpg <!-- EXTRAE: images -->
- **Baño privado**: Imagen del baño exclusivo de la habitación <!-- EXTRAE: images -->
- **Zonas comunes**: Foto de la sala y cocina compartidas <!-- EXTRAE: images -->
- **Vista interior**: Imágenes de la habitación con cama matrimonial <!-- EXTRAE: images -->

### Ubicación y Detalles del Espacio
- **Ubicación específica**: Dentro de apartamento grande en planta principal <!-- EXTRAE: location_details -->
- **Acceso**: Fácil acceso directo sin escaleras <!-- EXTRAE: location_details -->
- **Orientación**: Habitación interior con ventanas naturales <!-- EXTRAE: location_details -->
- **Proximidad**: Integrada dentro del complejo Simmer Down <!-- EXTRAE: location_details -->
- **Contexto**: San Andrés, Colombia - ubicación privilegiada en el Caribe colombiano <!-- EXTRAE: location_details -->

### Atractivos y Características Turísticas
- **Experiencias cercanas**: Acceso directo a las mejores playas de San Andrés <!-- EXTRAE: tourism_features -->
- **Actividades acuáticas**: Deportes acuáticos a minutos del Guest House <!-- EXTRAE: tourism_features -->
- **Cultura local**: Ambiente caribeño auténtico y experiencia social <!-- EXTRAE: tourism_features -->
- **Vida nocturna**: Cerca de bares y restaurantes locales <!-- EXTRAE: tourism_features -->
- **Interacción social**: Oportunidad de conocer viajeros de todo el mundo <!-- EXTRAE: tourism_features -->

**Contexto turístico**: Playa, mar, cultura caribeña, vida social, intercambio cultural, gastronomía local <!-- EXTRAE: tourism_features -->', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, cocina_compartida, sala_comun","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:07.107121+00:00'::timestamptz, '2025-10-24T04:00:07.107121+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Natural Mystic - Políticas y Configuración del Alojamiento

## Políticas y Configuración del Alojamiento {#politicas-configuracion}

**Q: ¿Cuáles son las políticas específicas, estado y configuración de visualización de la Habitación Natural Mystic?**
**A:** Información completa de políticas, estado operacional y configuración del sistema:

### Políticas Específicas del Alojamiento
- **Capacidad estricta**: Máximo 2 personas (sin excepciones) <!-- EXTRAE: booking_policies -->
- **Check-in/Check-out**: Según horarios establecidos por Simmer Down Guest House <!-- EXTRAE: booking_policies -->
- **Uso de zonas comunes**: Respeto y cuidado de espacios compartidos <!-- EXTRAE: booking_policies -->
- **Baño privado**: Uso exclusivo de huéspedes de la habitación <!-- EXTRAE: booking_policies -->
- **Política de ruido**: Respetar horas de descanso en habitación y zonas comunes <!-- EXTRAE: booking_policies -->
- **Política de fumar**: Prohibido fumar en espacios cerrados <!-- EXTRAE: booking_policies -->

### Recomendaciones de Estadía
- **Interacción social**: Aprovechar zonas comunes para conocer otros viajeros <!-- EXTRAE: booking_policies -->
- **Cocina compartida**: Ideal para preparar comidas y socializar <!-- EXTRAE: booking_policies -->
- **Entretenimiento**: Netflix y Wi-Fi en habitación privada <!-- EXTRAE: booking_policies -->
- **Privacidad**: Baño privado garantiza intimidad completa <!-- EXTRAE: booking_policies -->

### Estado y Configuración del Sistema
- **Estado operacional**: active - Alojamiento disponible para reservas <!-- EXTRAE: status -->
- **Destacado**: true - Aparece en listados destacados del sitio <!-- EXTRAE: is_featured -->
- **Orden de visualización**: 4 - Buena prioridad en listados <!-- EXTRAE: display_order -->
- **Última actualización**: 2025-01-25 - Información actualizada recientemente

### Información del Sistema
- **ID de tipo**: Habitación privada con zonas comunes - Categoría del sistema de reservas
- **ID de propiedad**: Simmer Down Guest House principal - Referencia de la propiedad
- **Integración MotoPress**: Conectado con sistema de reservas externo

**Referencia importante**: Para políticas generales del establecimiento, consultar la documentación principal de Simmer Down Guest House y sección {#overview}.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, cocina_compartida, sala_comun","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:08.229047+00:00'::timestamptz, '2025-10-24T04:00:08.229047+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Natural Mystic - Proceso de Reserva y Gestión

## Proceso de Reserva y Gestión {#proceso-reserva}

**Q: ¿Cuáles son los pasos para reservar y gestionar la estadía en la Habitación Natural Mystic?**
**A:** Proceso completo desde la consulta inicial hasta el check-out:

1. **Consultar disponibilidad**: Verificar fechas deseadas en el sistema de reservas
2. **Seleccionar ocupación**: Confirmar 2 personas máximo (capacidad fija)
3. **Confirmar temporada**: Identificar si corresponde a temporada alta o baja para tarifa correcta según {#tarifas-precios}
4. **Acceder al sistema**: Utilizar enlace oficial [Reservar Natural Mystic](https://simmerdown.house/accommodation/habitacion-privada-natural-mystic/)
5. **Completar información**: Proporcionar datos de huéspedes y información de contacto
6. **Confirmar experiencia**: Entender la naturaleza de zonas comunes compartidas
7. **Realizar pago**: Según políticas de pago del establecimiento
8. **Recibir confirmación**: Obtener confirmación con instrucciones de check-in y normas de convivencia', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, cocina_compartida, sala_comun","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:08.862973+00:00'::timestamptz, '2025-10-24T04:00:08.862973+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Kaya - Overview

## Overview {#overview}

**Q: ¿Qué es la Habitación Privada Kaya y por qué es ideal para viajeros con estancias cortas?**
**A:** La Habitación Privada Kaya es una habitación compacta pero inteligentemente diseñada, ubicada dentro de un apartamento en Simmer Down Guest House donde se comparten las zonas comunes. Aunque es la habitación más pequeña del apartamento, está muy bien optimizada para el aprovechamiento del espacio. Es perfecta para una persona o pareja que visite San Andrés durante una estadía corta o que viaje ligero de equipaje, ofreciendo excelente relación calidad-precio.', '{"bed_type":"Habitación pequeña con cama matrimonial compacta","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, ventana_anti_ruido, cocina_compartida, sala_comun","bed_configuration":"Habitación pequeña con cama matrimonial compacta"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:09.518329+00:00'::timestamptz, '2025-10-24T04:00:09.518329+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Kaya - Capacidad y Configuración de Espacios

## Capacidad y Configuración de Espacios {#capacidad-configuracion}

**Q: ¿Cuáles son las especificaciones de capacidad y distribución de espacios de la Habitación Kaya?**
**A:** Detalles completos de la configuración y espacios disponibles:

### Capacidad y Distribución
- **Capacidad máxima**: 2 personas <!-- EXTRAE: capacity.max_capacity -->
- **Configuración de camas**: Habitación pequeña con cama matrimonial compacta <!-- EXTRAE: bed_configuration -->
- **Tamaño**: 15 metros cuadrados <!-- EXTRAE: size_m2 -->
- **Número de piso**: Planta principal <!-- EXTRAE: floor_number -->
- **Tipo de vista**: Ventana anti-ruido con vista al exterior <!-- EXTRAE: view_type -->
- **Número de unidad**: Habitación Kaya <!-- EXTRAE: unit_number -->

### Espacios y Áreas
- **Espacios privados**: Habitación pequeña optimizada, baño privado exclusivo
- **Espacios compartidos**: Sala, cocina y áreas comunes del apartamento
- **Características únicas**: Diseño optimizado para máximo aprovechamiento, ventana anti-ruido <!-- EXTRAE: unique_features -->

**Configuración ideal**: Perfecta para viajeros minimalistas, estancias cortas o parejas que priorizan ubicación y precio.', '{"bed_type":"Habitación pequeña con cama matrimonial compacta","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, ventana_anti_ruido, cocina_compartida, sala_comun","bed_configuration":"Habitación pequeña con cama matrimonial compacta"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:10.241969+00:00'::timestamptz, '2025-10-24T04:00:10.241969+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Kaya - Tarifas y Precios Detallados

## Tarifas y Precios Detallados {#tarifas-precios}

**Q: ¿Cuáles son las tarifas de la Habitación Kaya según temporada y ocupación?**
**A:** Estructura completa de precios por temporada:

### Temporada Baja
- **2 personas**: $150.000 COP por noche <!-- EXTRAE: base_price_low_season -->
- **Capacidad fija**: Solo 2 personas, no permite huéspedes adicionales
- **Tarifa persona adicional**: No aplica <!-- EXTRAE: price_per_person_low -->

### Temporada Alta
- **2 personas**: $175.000 COP por noche <!-- EXTRAE: base_price_high_season -->
- **Capacidad fija**: Solo 2 personas, no permite huéspedes adicionales
- **Tarifa persona adicional**: No aplica <!-- EXTRAE: price_per_person_high -->

### Información de Precios
- **Moneda**: Pesos colombianos (COP)
- **Incluye**: Todos los amenities y acceso a zonas comunes
- **Política de ocupación**: Capacidad máxima estricta de 2 personas

**Nota importante**: La mejor relación calidad-precio en Simmer Down con baño privado y acceso completo a zonas comunes. Referencia {#amenities-caracteristicas} para servicios incluidos.', '{"bed_type":"Habitación pequeña con cama matrimonial compacta","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, ventana_anti_ruido, cocina_compartida, sala_comun","bed_configuration":"Habitación pequeña con cama matrimonial compacta"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:10.909713+00:00'::timestamptz, '2025-10-24T04:00:10.909713+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Kaya - Amenities y Características Especiales

## Amenities y Características Especiales {#amenities-caracteristicas}

**Q: ¿Qué amenities, comodidades y características especiales están incluidos en la Habitación Kaya?**
**A:** Lista completa de amenities premium y características únicas:

### Tecnología y Entretenimiento
- **Smart TV** con cuenta de Netflix incluida <!-- EXTRAE: amenities_list -->
- **Wi-Fi de alta velocidad** para trabajo y entretenimiento
- **Aire acondicionado** para clima controlado

### Comodidades Privadas
- **Baño privado** exclusivo para huéspedes de la habitación
- **Ventana anti-ruido** con vista al exterior para descanso óptimo
- **Espacio de almacenamiento** optimizado en habitación

### Acceso a Zonas Comunes
- **Cocina compartida** totalmente equipada
- **Sala común** para socializar con otros huéspedes
- **Áreas de descanso** compartidas

### Características Únicas y Especiales
- **Diseño optimizado**: Máximo aprovechamiento del espacio disponible <!-- EXTRAE: unique_features -->
- **Ventana anti-ruido**: Única habitación con ventanas especiales para mejor descanso <!-- EXTRAE: unique_features -->
- **Mejor precio**: La opción más económica con baño privado <!-- EXTRAE: unique_features -->
- **Ubicación estratégica**: Acceso completo a todas las facilidades del Guest House <!-- EXTRAE: unique_features -->

### Características de Accesibilidad
- **Acceso**: Planta principal, fácil acceso sin escaleras <!-- EXTRAE: accessibility_features -->
- **Baño adaptado**: Baño privado estándar compacto <!-- EXTRAE: accessibility_features -->
- **Comunicación**: Señalización visual disponible <!-- EXTRAE: accessibility_features -->

### Amenities en Texto Completo
Smart TV con Netflix, Wi-Fi alta velocidad, aire acondicionado, baño privado, ventana anti-ruido, acceso cocina compartida, sala común <!-- EXTRAE: unit_amenities -->

**Ventaja diferencial**: Combinación única de precio competitivo con comodidades completas, perfecta para viajeros inteligentes.', '{"bed_type":"Habitación pequeña con cama matrimonial compacta","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, ventana_anti_ruido, cocina_compartida, sala_comun","bed_configuration":"Habitación pequeña con cama matrimonial compacta"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:11.683525+00:00'::timestamptz, '2025-10-24T04:00:11.683525+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Kaya - Información Visual y Ubicación Detallada

## Información Visual y Ubicación Detallada {#visual-ubicacion}

**Q: ¿Qué información visual y detalles de ubicación están disponibles para la Habitación Kaya?**
**A:** Detalles completos de ubicación, características visuales y atractivos turísticos:

### Galería Visual e Imágenes
- **Foto principal**: Habitación Privada Kaya vista optimizada <!-- EXTRAE: images -->
- **URL de imagen**: https://simmerdown.house/wp-content/uploads/2024/06/Habitacion-privada-Kaya.jpg <!-- EXTRAE: images -->
- **Ventana anti-ruido**: Imagen de la ventana especial con vista exterior <!-- EXTRAE: images -->
- **Baño privado**: Foto del baño compacto pero completo <!-- EXTRAE: images -->
- **Diseño optimizado**: Imágenes del aprovechamiento inteligente del espacio <!-- EXTRAE: images -->

### Ubicación y Detalles del Espacio
- **Ubicación específica**: Dentro de apartamento con zonas comunes en planta principal <!-- EXTRAE: location_details -->
- **Acceso**: Fácil acceso directo sin escaleras <!-- EXTRAE: location_details -->
- **Orientación**: Ventana anti-ruido con vista al exterior para tranquilidad <!-- EXTRAE: location_details -->
- **Proximidad**: Integrada dentro del complejo Simmer Down <!-- EXTRAE: location_details -->
- **Contexto**: San Andrés, Colombia - ubicación privilegiada en el Caribe colombiano <!-- EXTRAE: location_details -->

### Atractivos y Características Turísticas
- **Experiencias cercanas**: Acceso directo a las mejores playas de San Andrés <!-- EXTRAE: tourism_features -->
- **Actividades acuáticas**: Deportes acuáticos a minutos del Guest House <!-- EXTRAE: tourism_features -->
- **Cultura local**: Ambiente caribeño auténtico y experiencia social <!-- EXTRAE: tourism_features -->
- **Vida nocturna**: Cerca de bares y restaurantes locales <!-- EXTRAE: tourism_features -->
- **Viaje económico**: Perfecta para maximizar presupuesto de viaje <!-- EXTRAE: tourism_features -->

**Contexto turístico**: Playa, mar, cultura caribeña, vida social, intercambio cultural, turismo económico <!-- EXTRAE: tourism_features -->', '{"bed_type":"Habitación pequeña con cama matrimonial compacta","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, ventana_anti_ruido, cocina_compartida, sala_comun","bed_configuration":"Habitación pequeña con cama matrimonial compacta"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:12.313031+00:00'::timestamptz, '2025-10-24T04:00:12.313031+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Kaya - Políticas y Configuración del Alojamiento

## Políticas y Configuración del Alojamiento {#politicas-configuracion}

**Q: ¿Cuáles son las políticas específicas, estado y configuración de visualización de la Habitación Kaya?**
**A:** Información completa de políticas, estado operacional y configuración del sistema:

### Políticas Específicas del Alojamiento
- **Capacidad estricta**: Máximo 2 personas (sin excepciones) <!-- EXTRAE: booking_policies -->
- **Check-in/Check-out**: Según horarios establecidos por Simmer Down Guest House <!-- EXTRAE: booking_policies -->
- **Equipaje ligero**: Recomendado por tamaño optimizado de la habitación <!-- EXTRAE: booking_policies -->
- **Uso de zonas comunes**: Respeto y cuidado de espacios compartidos <!-- EXTRAE: booking_policies -->
- **Política de ruido**: Ventana anti-ruido garantiza descanso óptimo <!-- EXTRAE: booking_policies -->
- **Política de fumar**: Prohibido fumar en espacios cerrados <!-- EXTRAE: booking_policies -->

### Recomendaciones de Estadía
- **Estancias cortas**: Ideal para 1-3 noches con equipaje mínimo <!-- EXTRAE: booking_policies -->
- **Interacción social**: Aprovechar zonas comunes para conocer otros viajeros <!-- EXTRAE: booking_policies -->
- **Presupuesto inteligente**: Mejor relación precio-calidad con baño privado <!-- EXTRAE: booking_policies -->
- **Descanso garantizado**: Ventana anti-ruido asegura sueño reparador <!-- EXTRAE: booking_policies -->

### Estado y Configuración del Sistema
- **Estado operacional**: active - Alojamiento disponible para reservas <!-- EXTRAE: status -->
- **Destacado**: true - Aparece en listados destacados por relación precio-calidad <!-- EXTRAE: is_featured -->
- **Orden de visualización**: 6 - Buena prioridad por ser opción económica <!-- EXTRAE: display_order -->
- **Última actualización**: 2025-01-25 - Información actualizada recientemente

### Información del Sistema
- **ID de tipo**: Habitación compacta optimizada - Categoría del sistema de reservas
- **ID de propiedad**: Simmer Down Guest House principal - Referencia de la propiedad
- **Integración MotoPress**: Conectado con sistema de reservas externo

**Referencia importante**: Para políticas generales del establecimiento, consultar la documentación principal de Simmer Down Guest House y sección {#overview}.', '{"bed_type":"Habitación pequeña con cama matrimonial compacta","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, ventana_anti_ruido, cocina_compartida, sala_comun","bed_configuration":"Habitación pequeña con cama matrimonial compacta"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:12.953855+00:00'::timestamptz, '2025-10-24T04:00:12.953855+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Kaya - Proceso de Reserva y Gestión

## Proceso de Reserva y Gestión {#proceso-reserva}

**Q: ¿Cuáles son los pasos para reservar y gestionar la estadía en la Habitación Kaya?**
**A:** Proceso completo desde la consulta inicial hasta el check-out:

1. **Consultar disponibilidad**: Verificar fechas deseadas en el sistema de reservas
2. **Seleccionar ocupación**: Confirmar 2 personas máximo (capacidad fija)
3. **Confirmar temporada**: Identificar si corresponde a temporada alta o baja para tarifa correcta según {#tarifas-precios}
4. **Acceder al sistema**: Utilizar enlace oficial [Reservar Kaya](https://simmerdown.house/accommodation/habitacion-privada-kaya/)
5. **Considerar equipaje**: Confirmar que viajan con equipaje ligero para estancia óptima
6. **Completar información**: Proporcionar datos de huéspedes y información de contacto
7. **Realizar pago**: Según políticas de pago del establecimiento
8. **Recibir confirmación**: Obtener confirmación with instrucciones de check-in y normas de convivencia', '{"bed_type":"Habitación pequeña con cama matrimonial compacta","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, ventana_anti_ruido, cocina_compartida, sala_comun","bed_configuration":"Habitación pequeña con cama matrimonial compacta"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:13.628574+00:00'::timestamptz, '2025-10-24T04:00:13.628574+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Jammin - Overview

## Overview {#overview}

**Q: ¿Qué es la Habitación Privada Jammin y por qué es la mejor opción para grupos?**
**A:** La Habitación Privada Jammin es la unidad de alojamiento más grande del Simmer Down Guest House, diseñada específicamente para grupos de hasta 4 personas. Su configuración con dos camas dobles, baño privado amplio y nevera exclusiva dentro de la habitación la convierte en la opción ideal para familias, grupos de amigos o parejas que buscan espacio extra y comodidades premium.', '{"bed_type":"Dos camas dobles independientes","capacity_max":4,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, nevera_privada, baño_privado_amplio, dos_camas_dobles","bed_configuration":"Dos camas dobles independientes"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:15.11448+00:00'::timestamptz, '2025-10-24T04:00:15.11448+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Jammin - Capacidad y Configuración de Espacios

## Capacidad y Configuración de Espacios {#capacidad-configuracion}

**Q: ¿Cuáles son las especificaciones de capacidad y distribución de espacios de la Habitación Jammin?**
**A:** Detalles completos de la configuración y espacios disponibles:

### Capacidad y Distribución
- **Capacidad máxima**: 4 personas <!-- EXTRAE: capacity.max_capacity -->
- **Configuración de camas**: Dos camas dobles independientes <!-- EXTRAE: bed_configuration -->
- **Tamaño**: Habitación más grande del Guest House <!-- EXTRAE: size_m2 -->
- **Número de piso**: Planta principal <!-- EXTRAE: floor_number -->
- **Tipo de vista**: Vista estándar con ventanas amplias <!-- EXTRAE: view_type -->
- **Número de unidad**: Habitación Jammin <!-- EXTRAE: unit_number -->

### Espacios y Áreas
- **Espacios principales**: Área de descanso con dos camas dobles, baño privado amplio, zona de nevera
- **Área de almacenamiento**: Nevera exclusiva dentro de la habitación
- **Características únicas**: La habitación más espaciosa, dos camas independientes, nevera propia <!-- EXTRAE: unique_features -->

**Configuración ideal**: Perfecta para grupos de hasta 4 personas que valoran el espacio, la independencia y las comodidades exclusivas.', '{"bed_type":"Dos camas dobles independientes","capacity_max":4,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, nevera_privada, baño_privado_amplio, dos_camas_dobles","bed_configuration":"Dos camas dobles independientes"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:16.101846+00:00'::timestamptz, '2025-10-24T04:00:16.101846+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Jammin - Tarifas y Precios Detallados

## Tarifas y Precios Detallados {#tarifas-precios}

**Q: ¿Cuáles son las tarifas de la Habitación Jammin según temporada y ocupación?**
**A:** Estructura completa de precios por temporada y número de huéspedes:

### Temporada Baja
- **2 personas**: $170.000 COP por noche <!-- EXTRAE: base_price_low_season -->
- **3 personas**: $235.000 COP por noche (base + persona adicional)
- **4 personas**: $300.000 COP por noche (base + 2 personas adicionales)
- **Tarifa persona adicional**: $65.000 COP por noche <!-- EXTRAE: price_per_person_low -->

### Temporada Alta
- **2 personas**: $195.000 COP por noche <!-- EXTRAE: base_price_high_season -->
- **3 personas**: $260.000 COP por noche (base + persona adicional)
- **4 personas**: $325.000 COP por noche (base + 2 personas adicionales)
- **Tarifa persona adicional**: $65.000 COP por noche <!-- EXTRAE: price_per_person_high -->

### Información de Precios
- **Moneda**: Pesos colombianos (COP)
- **Incluye**: Todos los amenities y servicios descritos
- **Política de ocupación**: Capacidad máxima estricta según especificaciones

**Nota importante**: Excelente relación calidad-precio para grupos, especialmente con tarifa base competitiva. Referencia {#amenities-caracteristicas} para servicios incluidos.', '{"bed_type":"Dos camas dobles independientes","capacity_max":4,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, nevera_privada, baño_privado_amplio, dos_camas_dobles","bed_configuration":"Dos camas dobles independientes"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:16.786857+00:00'::timestamptz, '2025-10-24T04:00:16.786857+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Jammin - Amenities y Características Especiales

## Amenities y Características Especiales {#amenities-caracteristicas}

**Q: ¿Qué amenities, comodidades y características especiales están incluidos en la Habitación Jammin?**
**A:** Lista completa de amenities premium y características exclusivas:

### Tecnología y Entretenimiento
- **Smart TV** con cuenta de Netflix incluida <!-- EXTRAE: amenities_list -->
- **Wi-Fi de alta velocidad** para trabajo y entretenimiento
- **Aire acondicionado** para clima controlado

### Comodidades Exclusivas de la Habitación
- **Nevera privada** dentro de la habitación para almacenamiento exclusivo
- **Baño privado amplio** con espacio optimizado
- **Dos camas dobles** independientes para máxima comodidad

### Características Únicas y Especiales
- **Habitación más grande**: Máximo espacio disponible en el Guest House <!-- EXTRAE: unique_features -->
- **Nevera exclusiva**: Única habitación con refrigerador propio <!-- EXTRAE: unique_features -->
- **Baño amplio**: Baño privado con espacio superior al estándar <!-- EXTRAE: unique_features -->
- **Configuración flexible**: Dos camas permiten diferentes arreglos de ocupación <!-- EXTRAE: unique_features -->

### Características de Accesibilidad
- **Acceso**: Planta principal, fácil acceso sin escaleras <!-- EXTRAE: accessibility_features -->
- **Baño adaptado**: Baño amplio facilita movilidad <!-- EXTRAE: accessibility_features -->
- **Comunicación**: Señalización visual disponible <!-- EXTRAE: accessibility_features -->

### Amenities en Texto Completo
Smart TV con Netflix, Wi-Fi alta velocidad, aire acondicionado, nevera privada, baño privado amplio, dos camas dobles <!-- EXTRAE: unit_amenities -->

**Ventaja diferencial**: Única habitación con nevera privada y la configuración más espaciosa del Guest House, ideal para estancias prolongadas.', '{"bed_type":"Dos camas dobles independientes","capacity_max":4,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, nevera_privada, baño_privado_amplio, dos_camas_dobles","bed_configuration":"Dos camas dobles independientes"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:17.55123+00:00'::timestamptz, '2025-10-24T04:00:17.55123+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Jammin - Información Visual y Ubicación Detallada

## Información Visual y Ubicación Detallada {#visual-ubicacion}

**Q: ¿Qué información visual y detalles de ubicación están disponibles para la Habitación Jammin?**
**A:** Detalles completos de ubicación, características visuales y atractivos turísticos:

### Galería Visual e Imágenes
- **Foto principal**: Habitación Privada Jammin vista general <!-- EXTRAE: images -->
- **URL de imagen**: https://simmerdown.house/wp-content/uploads/2024/06/Habitacion-privada-Jammin.jpg <!-- EXTRAE: images -->
- **Vista interior**: Imágenes de las dos camas dobles <!-- EXTRAE: images -->
- **Baño privado**: Foto del baño amplio <!-- EXTRAE: images -->
- **Nevera exclusiva**: Imagen de la nevera dentro de la habitación <!-- EXTRAE: images -->

### Ubicación y Detalles del Espacio
- **Ubicación específica**: Planta principal del Simmer Down Guest House <!-- EXTRAE: location_details -->
- **Acceso**: Fácil acceso directo sin escaleras <!-- EXTRAE: location_details -->
- **Orientación**: Ubicación estratégica dentro del edificio principal <!-- EXTRAE: location_details -->
- **Proximidad**: Cerca de áreas comunes y recepción <!-- EXTRAE: location_details -->
- **Contexto**: San Andrés, Colombia - ubicación privilegiada en el Caribe colombiano <!-- EXTRAE: location_details -->

### Atractivos y Características Turísticas
- **Experiencias cercanas**: Acceso directo a las mejores playas de San Andrés <!-- EXTRAE: tourism_features -->
- **Actividades acuáticas**: Deportes acuáticos a minutos del Guest House <!-- EXTRAE: tourism_features -->
- **Cultura local**: Ambiente caribeño auténtico <!-- EXTRAE: tourism_features -->
- **Vida nocturna**: Cerca de bares y restaurantes locales <!-- EXTRAE: tourism_features -->
- **Compras**: Acceso a tiendas locales y souvenirs <!-- EXTRAE: tourism_features -->

**Contexto turístico**: Playa, mar, cultura caribeña, vida nocturna, gastronomía local, compras <!-- EXTRAE: tourism_features -->', '{"bed_type":"Dos camas dobles independientes","capacity_max":4,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, nevera_privada, baño_privado_amplio, dos_camas_dobles","bed_configuration":"Dos camas dobles independientes"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:18.260253+00:00'::timestamptz, '2025-10-24T04:00:18.260253+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Jammin - Políticas y Configuración del Alojamiento

## Políticas y Configuración del Alojamiento {#politicas-configuracion}

**Q: ¿Cuáles son las políticas específicas, estado y configuración de visualización de la Habitación Jammin?**
**A:** Información completa de políticas, estado operacional y configuración del sistema:

### Políticas Específicas del Alojamiento
- **Capacidad estricta**: Máximo 4 personas (sin excepciones) <!-- EXTRAE: booking_policies -->
- **Check-in/Check-out**: Según horarios establecidos por Simmer Down Guest House <!-- EXTRAE: booking_policies -->
- **Uso de nevera**: Uso exclusivo de huéspedes, mantener limpia <!-- EXTRAE: booking_policies -->
- **Baño privado**: Uso responsable y mantenimiento de limpieza <!-- EXTRAE: booking_policies -->
- **Política de ruido**: Respetar horas de descanso de otros huéspedes <!-- EXTRAE: booking_policies -->
- **Política de fumar**: Prohibido fumar en espacios cerrados <!-- EXTRAE: booking_policies -->

### Recomendaciones de Estadía
- **Nevera privada**: Aprovechar para almacenar alimentos y bebidas <!-- EXTRAE: booking_policies -->
- **Baño amplio**: Ideal para grupos que valoran privacidad y espacio <!-- EXTRAE: booking_policies -->
- **Entretenimiento**: Netflix y Wi-Fi perfectos para noches grupales <!-- EXTRAE: booking_policies -->
- **Configuración flexible**: Dos camas permiten diferentes arreglos según el grupo <!-- EXTRAE: booking_policies -->

### Estado y Configuración del Sistema
- **Estado operacional**: active - Alojamiento disponible para reservas <!-- EXTRAE: status -->
- **Destacado**: true - Aparece en listados destacados del sitio <!-- EXTRAE: is_featured -->
- **Orden de visualización**: 1 - Máxima prioridad en listados por ser la más espaciosa <!-- EXTRAE: display_order -->
- **Última actualización**: 2025-01-25 - Información actualizada recientemente

### Información del Sistema
- **ID de tipo**: Habitación premium con nevera privada - Categoría del sistema de reservas
- **ID de propiedad**: Simmer Down Guest House principal - Referencia de la propiedad
- **Integración MotoPress**: Conectado con sistema de reservas externo

**Referencia importante**: Para políticas generales del establecimiento, consultar la documentación principal de Simmer Down Guest House y sección {#overview}.', '{"bed_type":"Dos camas dobles independientes","capacity_max":4,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, nevera_privada, baño_privado_amplio, dos_camas_dobles","bed_configuration":"Dos camas dobles independientes"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:19.80085+00:00'::timestamptz, '2025-10-24T04:00:19.80085+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Jammin - Proceso de Reserva y Gestión

## Proceso de Reserva y Gestión {#proceso-reserva}

**Q: ¿Cuáles son los pasos para reservar y gestionar la estadía en la Habitación Jammin?**
**A:** Proceso completo desde la consulta inicial hasta el check-out:

1. **Consultar disponibilidad**: Verificar fechas deseadas en el sistema de reservas
2. **Seleccionar ocupación**: Confirmar número de huéspedes (1-4 personas) según {#tarifas-precios}
3. **Confirmar temporada**: Identificar si corresponde a temporada alta o baja para tarifa correcta
4. **Acceder al sistema**: Utilizar enlace oficial [Reservar Jammin''](https://simmerdown.house/accommodation/habitacion-privada-jammin/)
5. **Completar información**: Proporcionar datos de huéspedes y información de contacto
6. **Confirmar configuración**: Especificar preferencias de camas y uso de amenities exclusivos
7. **Realizar pago**: Según políticas de pago del establecimiento
8. **Recibir confirmación**: Obtener confirmación con instrucciones de check-in y códigos de acceso', '{"bed_type":"Dos camas dobles independientes","capacity_max":4,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, nevera_privada, baño_privado_amplio, dos_camas_dobles","bed_configuration":"Dos camas dobles independientes"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:20.564856+00:00'::timestamptz, '2025-10-24T04:00:20.564856+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Dreamland - Overview

## Overview {#overview}

**Q: ¿Qué es la Habitación Privada Dreamland y por qué es ideal para huéspedes sociales?**
**A:** La Habitación Privada Dreamland es una acogedora habitación ubicada dentro de un apartamento grande en Simmer Down Guest House, donde los huéspedes disfrutan de privacidad en su dormitorio y baño privado, mientras comparten las zonas comunes con otros viajeros. Es perfecta para parejas que buscan un equilibrio entre intimidad personal y oportunidades de socialización en un ambiente cálido y auténtico.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, cocina_compartida, sala_comun","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:21.311164+00:00'::timestamptz, '2025-10-24T04:00:21.311164+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Dreamland - Capacidad y Configuración de Espacios

## Capacidad y Configuración de Espacios {#capacidad-configuracion}

**Q: ¿Cuáles son las especificaciones de capacidad y distribución de espacios de la Habitación Dreamland?**
**A:** Detalles completos de la configuración y espacios disponibles:

### Capacidad y Distribución
- **Capacidad máxima**: 2 personas <!-- EXTRAE: capacity.max_capacity -->
- **Configuración de camas**: Habitación principal con cama matrimonial <!-- EXTRAE: bed_configuration -->
- **Tamaño**: Habitación privada dentro de apartamento compartido <!-- EXTRAE: size_m2 -->
- **Número de piso**: Planta principal <!-- EXTRAE: floor_number -->
- **Tipo de vista**: Vista estándar con ventanas naturales <!-- EXTRAE: view_type -->
- **Número de unidad**: Habitación Dreamland <!-- EXTRAE: unit_number -->

### Espacios y Áreas
- **Espacios privados**: Habitación principal con cama matrimonial, baño privado exclusivo
- **Espacios compartidos**: Sala, cocina y áreas comunes del apartamento
- **Características únicas**: Equilibrio perfecto entre privacidad y vida social, baño privado <!-- EXTRAE: unique_features -->

**Configuración ideal**: Perfecta para parejas que valoran la privacidad pero disfrutan conocer otros viajeros en espacios compartidos.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, cocina_compartida, sala_comun","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:22.139939+00:00'::timestamptz, '2025-10-24T04:00:22.139939+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Dreamland - Tarifas y Precios Detallados

## Tarifas y Precios Detallados {#tarifas-precios}

**Q: ¿Cuáles son las tarifas de la Habitación Dreamland según temporada y ocupación?**
**A:** Estructura completa de precios por temporada:

### Temporada Baja
- **2 personas**: $160.000 COP por noche <!-- EXTRAE: base_price_low_season -->
- **Capacidad fija**: Solo 2 personas, no permite huéspedes adicionales
- **Tarifa persona adicional**: No aplica <!-- EXTRAE: price_per_person_low -->

### Temporada Alta
- **2 personas**: $180.000 COP por noche <!-- EXTRAE: base_price_high_season -->
- **Capacidad fija**: Solo 2 personas, no permite huéspedes adicionales
- **Tarifa persona adicional**: No aplica <!-- EXTRAE: price_per_person_high -->

### Información de Precios
- **Moneda**: Pesos colombianos (COP)
- **Incluye**: Todos los amenities y acceso a zonas comunes
- **Política de ocupación**: Capacidad máxima estricta de 2 personas

**Nota importante**: Excelente relación calidad-precio con baño privado y acceso completo a zonas comunes. Referencia {#amenities-caracteristicas} para servicios incluidos.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, cocina_compartida, sala_comun","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:23.083398+00:00'::timestamptz, '2025-10-24T04:00:23.083398+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Dreamland - Amenities y Características Especiales

## Amenities y Características Especiales {#amenities-caracteristicas}

**Q: ¿Qué amenities, comodidades y características especiales están incluidos en la Habitación Dreamland?**
**A:** Lista completa de amenities premium y características únicas:

### Tecnología y Entretenimiento
- **Smart TV** con cuenta de Netflix incluida <!-- EXTRAE: amenities_list -->
- **Wi-Fi de alta velocidad** para trabajo y entretenimiento
- **Aire acondicionado** para clima controlado

### Comodidades Privadas
- **Baño privado** exclusivo para huéspedes de la habitación
- **Habitación completamente privada** con puerta con llave
- **Espacio de almacenamiento** personal en habitación

### Acceso a Zonas Comunes
- **Cocina compartida** totalmente equipada
- **Sala común** para socializar con otros huéspedes
- **Áreas de descanso** compartidas

### Características Únicas y Especiales
- **Baño privado exclusivo**: Baño completamente privado para máxima comodidad <!-- EXTRAE: unique_features -->
- **Ambiente social**: Oportunidad de conocer otros viajeros en zonas comunes <!-- EXTRAE: unique_features -->
- **Privacidad garantizada**: Habitación con puerta independiente <!-- EXTRAE: unique_features -->
- **Acceso completo**: Uso libre de todas las zonas comunes del apartamento <!-- EXTRAE: unique_features -->

### Características de Accesibilidad
- **Acceso**: Planta principal, fácil acceso sin escaleras <!-- EXTRAE: accessibility_features -->
- **Baño adaptado**: Baño privado estándar <!-- EXTRAE: accessibility_features -->
- **Comunicación**: Señalización visual disponible <!-- EXTRAE: accessibility_features -->

### Amenities en Texto Completo
Smart TV con Netflix, Wi-Fi alta velocidad, aire acondicionado, baño privado, acceso cocina compartida, sala común <!-- EXTRAE: unit_amenities -->

**Ventaja diferencial**: Combinación perfecta de privacidad total con experiencia social auténtica, ideal para viajeros sociales.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, cocina_compartida, sala_comun","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:23.754985+00:00'::timestamptz, '2025-10-24T04:00:23.754985+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Dreamland - Información Visual y Ubicación Detallada

## Información Visual y Ubicación Detallada {#visual-ubicacion}

**Q: ¿Qué información visual y detalles de ubicación están disponibles para la Habitación Dreamland?**
**A:** Detalles completos de ubicación, características visuales y atractivos turísticos:

### Galería Visual e Imágenes
- **Foto principal**: Habitación Privada Dreamland vista general <!-- EXTRAE: images -->
- **URL de imagen**: https://simmerdown.house/wp-content/uploads/2024/06/Habitacion-privada-Dreamland.jpg <!-- EXTRAE: images -->
- **Baño privado**: Imagen del baño exclusivo de la habitación <!-- EXTRAE: images -->
- **Zonas comunes**: Foto de la sala y cocina compartidas <!-- EXTRAE: images -->
- **Vista interior**: Imágenes de la habitación con cama matrimonial <!-- EXTRAE: images -->

### Ubicación y Detalles del Espacio
- **Ubicación específica**: Dentro de apartamento grande en planta principal <!-- EXTRAE: location_details -->
- **Acceso**: Fácil acceso directo sin escaleras <!-- EXTRAE: location_details -->
- **Orientación**: Habitación interior con ventanas naturales <!-- EXTRAE: location_details -->
- **Proximidad**: Integrada dentro del complejo Simmer Down <!-- EXTRAE: location_details -->
- **Contexto**: San Andrés, Colombia - ubicación privilegiada en el Caribe colombiano <!-- EXTRAE: location_details -->

### Atractivos y Características Turísticas
- **Experiencias cercanas**: Acceso directo a las mejores playas de San Andrés <!-- EXTRAE: tourism_features -->
- **Actividades acuáticas**: Deportes acuáticos a minutos del Guest House <!-- EXTRAE: tourism_features -->
- **Cultura local**: Ambiente caribeño auténtico y experiencia social <!-- EXTRAE: tourism_features -->
- **Vida nocturna**: Cerca de bares y restaurantes locales <!-- EXTRAE: tourism_features -->
- **Interacción social**: Oportunidad de conocer viajeros de todo el mundo <!-- EXTRAE: tourism_features -->

**Contexto turístico**: Playa, mar, cultura caribeña, vida social, intercambio cultural, gastronomía local <!-- EXTRAE: tourism_features -->', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, cocina_compartida, sala_comun","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:24.405826+00:00'::timestamptz, '2025-10-24T04:00:24.405826+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Dreamland - Políticas y Configuración del Alojamiento

## Políticas y Configuración del Alojamiento {#politicas-configuracion}

**Q: ¿Cuáles son las políticas específicas, estado y configuración de visualización de la Habitación Dreamland?**
**A:** Información completa de políticas, estado operacional y configuración del sistema:

### Políticas Específicas del Alojamiento
- **Capacidad estricta**: Máximo 2 personas (sin excepciones) <!-- EXTRAE: booking_policies -->
- **Check-in/Check-out**: Según horarios establecidos por Simmer Down Guest House <!-- EXTRAE: booking_policies -->
- **Uso de zonas comunes**: Respeto y cuidado de espacios compartidos <!-- EXTRAE: booking_policies -->
- **Baño privado**: Uso exclusivo de huéspedes de la habitación <!-- EXTRAE: booking_policies -->
- **Política de ruido**: Respetar horas de descanso en habitación y zonas comunes <!-- EXTRAE: booking_policies -->
- **Política de fumar**: Prohibido fumar en espacios cerrados <!-- EXTRAE: booking_policies -->

### Recomendaciones de Estadía
- **Interacción social**: Aprovechar zonas comunes para conocer otros viajeros <!-- EXTRAE: booking_policies -->
- **Cocina compartida**: Ideal para preparar comidas y socializar <!-- EXTRAE: booking_policies -->
- **Entretenimiento**: Netflix y Wi-Fi en habitación privada <!-- EXTRAE: booking_policies -->
- **Privacidad**: Baño privado garantiza intimidad completa <!-- EXTRAE: booking_policies -->

### Estado y Configuración del Sistema
- **Estado operacional**: active - Alojamiento disponible para reservas <!-- EXTRAE: status -->
- **Destacado**: true - Aparece en listados destacados del sitio <!-- EXTRAE: is_featured -->
- **Orden de visualización**: 5 - Buena prioridad en listados <!-- EXTRAE: display_order -->
- **Última actualización**: 2025-01-25 - Información actualizada recientemente

### Información del Sistema
- **ID de tipo**: Habitación privada con zonas comunes - Categoría del sistema de reservas
- **ID de propiedad**: Simmer Down Guest House principal - Referencia de la propiedad
- **Integración MotoPress**: Conectado con sistema de reservas externo

**Referencia importante**: Para políticas generales del establecimiento, consultar la documentación principal de Simmer Down Guest House y sección {#overview}.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, cocina_compartida, sala_comun","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:25.0399+00:00'::timestamptz, '2025-10-24T04:00:25.0399+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'room', NULL, NULL, NULL, NULL, NULL, 'Habitación Privada Dreamland - Proceso de Reserva y Gestión

## Proceso de Reserva y Gestión {#proceso-reserva}

**Q: ¿Cuáles son los pasos para reservar y gestionar la estadía en la Habitación Dreamland?**
**A:** Proceso completo desde la consulta inicial hasta el check-out:

1. **Consultar disponibilidad**: Verificar fechas deseadas en el sistema de reservas
2. **Seleccionar ocupación**: Confirmar 2 personas máximo (capacidad fija)
3. **Confirmar temporada**: Identificar si corresponde a temporada alta o baja para tarifa correcta según {#tarifas-precios}
4. **Acceder al sistema**: Utilizar enlace oficial [Reservar Dreamland](https://simmerdown.house/accommodation/habitacion-privada-dreamland/)
5. **Completar información**: Proporcionar datos de huéspedes y información de contacto
6. **Confirmar experiencia**: Entender la naturaleza de zonas comunes compartidas
7. **Realizar pago**: Según políticas de pago del establecimiento
8. **Recibir confirmación**: Obtener confirmación con instrucciones de check-in y normas de convivencia', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, baño_privado, cocina_compartida, sala_comun","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:25.730994+00:00'::timestamptz, '2025-10-24T04:00:25.730994+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Sunshine - Ubicación Privilegiada Tercer Piso - Overview

## Overview {#overview}

**Q: ¿Qué es el Apartamento Sunshine y por qué es una excelente opción de hospedaje?**
**A:** El Apartamento Sunshine es una unidad de alojamiento compacta y moderna de 26 metros cuadrados ubicada estratégicamente en el tercer piso del edificio Simmer Down Guest House en San Andrés, Colombia. Diseñado específicamente para parejas que buscan comodidad, privacidad y una ubicación privilegiada con menos ruido del tránsito peatonal y mejor ventilación natural.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:26.580042+00:00'::timestamptz, '2025-10-24T04:00:26.580042+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Sunshine - Ubicación Privilegiada Tercer Piso - Capacidad y Configuración de Espacios

## Capacidad y Configuración de Espacios {#capacidad-configuracion}

**Q: ¿Cuáles son las especificaciones de capacidad y distribución de espacios del Apartamento Sunshine?**
**A:** Detalles completos de la configuración y espacios disponibles:

### Capacidad y Distribución
- **Capacidad máxima**: 2 personas <!-- EXTRAE: capacity.max_capacity -->
- **Configuración de camas**: Habitación principal con cama matrimonial <!-- EXTRAE: bed_configuration -->
- **Tamaño**: 26 metros cuadrados <!-- EXTRAE: size_m2 -->
- **Número de piso**: Tercer piso <!-- EXTRAE: floor_number -->
- **Tipo de vista**: Vista desde tercer piso con mayor privacidad <!-- EXTRAE: view_type -->
- **Número de unidad**: Apartamento Sunshine <!-- EXTRAE: unit_number -->

### Espacios y Áreas
- **Espacios principales**: Habitación principal, cocina equipada, baño completo, área de estar
- **Área externa**: Sin balcón pero con ventanas amplias y buena iluminación
- **Características únicas**: Ubicación privilegiada en tercer piso, mayor privacidad, menos ruido <!-- EXTRAE: unique_features -->

**Configuración ideal**: Perfecto para parejas que valoran la tranquilidad y el espacio eficientemente distribuido.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:27.256641+00:00'::timestamptz, '2025-10-24T04:00:27.256641+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Sunshine - Ubicación Privilegiada Tercer Piso - Tarifas y Precios Detallados

## Tarifas y Precios Detallados {#tarifas-precios}

**Q: ¿Cuáles son las tarifas del Apartamento Sunshine según temporada y ocupación?**
**A:** Estructura completa de precios por temporada:

### Temporada Baja
- **2 personas**: $215.000 COP por noche <!-- EXTRAE: base_price_low_season -->
- **Capacidad fija**: Solo 2 personas, no permite huéspedes adicionales
- **Tarifa persona adicional**: No aplica <!-- EXTRAE: price_per_person_low -->

### Temporada Alta
- **2 personas**: $235.000 COP por noche <!-- EXTRAE: base_price_high_season -->
- **Capacidad fija**: Solo 2 personas, no permite huéspedes adicionales
- **Tarifa persona adicional**: No aplica <!-- EXTRAE: price_per_person_high -->

### Información de Precios
- **Moneda**: Pesos colombianos (COP)
- **Incluye**: Todos los amenities y servicios descritos
- **Política de ocupación**: Capacidad máxima estricta de 2 personas

**Nota importante**: Las tarifas incluyen todos los amenities y servicios descritos en la sección {#amenities-caracteristicas}.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:27.992221+00:00'::timestamptz, '2025-10-24T04:00:27.992221+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Sunshine - Ubicación Privilegiada Tercer Piso - Amenities y Características Especiales

## Amenities y Características Especiales {#amenities-caracteristicas}

**Q: ¿Qué amenities, comodidades y características especiales están incluidos?**
**A:** Lista completa de amenities premium y características únicas:

### Tecnología y Entretenimiento
- **Smart TV** con cuenta de Netflix incluida <!-- EXTRAE: amenities_list -->
- **Wi-Fi de alta velocidad** para trabajo y entretenimiento
- **Aire acondicionado** para clima controlado

### Cocina y Espacios de Descanso
- **Cocina totalmente equipada** para preparar comidas
- **Electrodomésticos básicos** incluidos
- **Utensilios de cocina** completos

### Características Únicas y Especiales
- **Ubicación privilegiada**: Tercer piso para mayor privacidad <!-- EXTRAE: unique_features -->
- **Ventilación superior**: Mejor circulación de aire por altura <!-- EXTRAE: unique_features -->
- **Menos ruido**: Alejado del tránsito peatonal de pisos inferiores <!-- EXTRAE: unique_features -->
- **Espacio optimizado**: Distribución eficiente en 26 metros cuadrados <!-- EXTRAE: unique_features -->

### Características de Accesibilidad
- **Acceso**: Escaleras hasta tercer piso, no apto para sillas de ruedas <!-- EXTRAE: accessibility_features -->
- **Baño adaptado**: Baño estándar, sin adaptaciones especiales <!-- EXTRAE: accessibility_features -->
- **Comunicación**: Señalización visual disponible <!-- EXTRAE: accessibility_features -->

### Amenities en Texto Completo
Smart TV con Netflix, Wi-Fi alta velocidad, aire acondicionado, cocina equipada <!-- EXTRAE: unit_amenities -->

**Ventaja diferencial**: Combinación única de comodidades modernas con ubicación estratégica en el piso más alto disponible.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:28.694407+00:00'::timestamptz, '2025-10-24T04:00:28.694407+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Sunshine - Ubicación Privilegiada Tercer Piso - Información Visual y Ubicación Detallada

## Información Visual y Ubicación Detallada {#visual-ubicacion}

**Q: ¿Qué información visual y detalles de ubicación están disponibles?**
**A:** Detalles completos de ubicación, características visuales y atractivos turísticos:

### Galería Visual e Imágenes
- **Foto principal**: Apartamento Sunshine vista general <!-- EXTRAE: images -->
- **URL de imagen**: https://simmerdown.house/wp-content/uploads/2024/06/Apartamento-Sunshine.jpg <!-- EXTRAE: images -->
- **Vista interior**: Imagen del apartamento completamente equipado <!-- EXTRAE: images -->
- **Espacios**: Foto de la cocina y área de estar <!-- EXTRAE: images -->

### Ubicación y Detalles del Espacio
- **Ubicación específica**: Tercer piso del edificio principal de Simmer Down Guest House <!-- EXTRAE: location_details -->
- **Acceso**: Escaleras internas hasta tercer piso <!-- EXTRAE: location_details -->
- **Orientación**: Vista desde altura privilegiada <!-- EXTRAE: location_details -->
- **Proximidad**: Dentro del complejo principal Simmer Down <!-- EXTRAE: location_details -->
- **Contexto**: San Andrés, Colombia - ubicación céntrica en el Caribe colombiano <!-- EXTRAE: location_details -->

### Atractivos y Características Turísticas
- **Experiencias cercanas**: Acceso directo a las mejores playas de San Andrés <!-- EXTRAE: tourism_features -->
- **Actividades acuáticas**: Deportes acuáticos a minutos del Guest House <!-- EXTRAE: tourism_features -->
- **Cultura local**: Ambiente caribeño auténtico <!-- EXTRAE: tourism_features -->
- **Ubicación central**: Cerca de restaurantes y actividades turísticas <!-- EXTRAE: tourism_features -->
- **Transporte**: Fácil acceso a medios de transporte local <!-- EXTRAE: tourism_features -->

**Contexto turístico**: Playa, mar, cultura caribeña, vida nocturna, gastronomía local <!-- EXTRAE: tourism_features -->', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:29.373662+00:00'::timestamptz, '2025-10-24T04:00:29.373662+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Sunshine - Ubicación Privilegiada Tercer Piso - Políticas y Configuración del Alojamiento

## Políticas y Configuración del Alojamiento {#politicas-configuracion}

**Q: ¿Cuáles son las políticas específicas, estado y configuración de visualización del Apartamento Sunshine?**
**A:** Información completa de políticas, estado operacional y configuración del sistema:

### Políticas Específicas del Alojamiento
- **Capacidad estricta**: Máximo 2 personas (sin excepciones) <!-- EXTRAE: booking_policies -->
- **Check-in/Check-out**: Según horarios establecidos por Simmer Down Guest House <!-- EXTRAE: booking_policies -->
- **Cuidado de amenities**: Uso responsable de equipos y mobiliario <!-- EXTRAE: booking_policies -->
- **Política de ruido**: Respetar horas de descanso, especialmente importante en tercer piso <!-- EXTRAE: booking_policies -->
- **Política de fumar**: Prohibido fumar en espacios cerrados <!-- EXTRAE: booking_policies -->
- **Acceso**: Solo por escaleras, informar limitaciones de movilidad antes de reservar <!-- EXTRAE: booking_policies -->

### Recomendaciones de Estadía
- **Equipaje ligero**: Considerar subida al tercer piso <!-- EXTRAE: booking_policies -->
- **Cocina equipada**: Ideal para preparar comidas caseras y ahorrar en restaurantes <!-- EXTRAE: booking_policies -->
- **Entretenimiento**: Netflix y Wi-Fi perfectos para noches de descanso <!-- EXTRAE: booking_policies -->
- **Privacidad**: Aprovechar la tranquilidad del tercer piso <!-- EXTRAE: booking_policies -->

### Estado y Configuración del Sistema
- **Estado operacional**: active - Alojamiento disponible para reservas <!-- EXTRAE: status -->
- **Destacado**: true - Aparece en listados destacados del sitio <!-- EXTRAE: is_featured -->
- **Orden de visualización**: 2 - Alta prioridad en listados <!-- EXTRAE: display_order -->
- **Última actualización**: 2025-01-25 - Información actualizada recientemente

### Información del Sistema
- **ID de tipo**: Apartamento compacto tercer piso - Categoría del sistema de reservas
- **ID de propiedad**: Simmer Down Guest House principal - Referencia de la propiedad
- **Integración MotoPress**: Conectado con sistema de reservas externo

**Referencia importante**: Para políticas generales del establecimiento, consultar la documentación principal de Simmer Down Guest House y sección {#overview}.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:30.062418+00:00'::timestamptz, '2025-10-24T04:00:30.062418+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Sunshine - Ubicación Privilegiada Tercer Piso - Proceso de Reserva y Gestión

## Proceso de Reserva y Gestión {#proceso-reserva}

**Q: ¿Cuáles son los pasos para reservar y gestionar la estadía en el Apartamento Sunshine?**
**A:** Proceso completo desde la consulta inicial hasta el check-out:

1. **Consultar disponibilidad**: Verificar fechas deseadas en el sistema de reservas
2. **Seleccionar ocupación**: Confirmar 2 personas máximo (capacidad fija)
3. **Confirmar temporada**: Identificar si corresponde a temporada alta o baja para tarifa correcta según {#tarifas-precios}
4. **Acceder al sistema**: Utilizar enlace oficial [Reservar Sunshine](https://simmerdown.house/accommodation/apartamento-sunshine/)
5. **Completar información**: Proporcionar datos de huéspedes y información de contacto
6. **Considerar acceso**: Confirmar capacidad para subir al tercer piso
7. **Realizar pago**: Según políticas de pago del establecimiento
8. **Recibir confirmación**: Obtener confirmación con instrucciones de check-in y códigos de acceso', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:30.757251+00:00'::timestamptz, '2025-10-24T04:00:30.757251+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Summertime - Overview

## Overview {#overview}

**Q: ¿Qué es el Apartamento Summertime y por qué es una excelente opción de alojamiento?**
**A:** El Apartamento Summertime es una unidad de alojamiento compacta y moderna de 26 metros cuadrados ubicada en el tercer piso del edificio Simmer Down Guest House en San Andrés, Colombia. Diseñado para parejas que buscan comodidad y privacidad, ofrece todas las amenidades esenciales para una estancia confortable con precios competitivos según temporada.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, escritorio de trabajo, wifi, aire_acondicionado, cocina_equipada, ventanas_anti_ruido","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:31.501549+00:00'::timestamptz, '2025-10-24T04:00:31.501549+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Summertime - Capacidad y Configuración de Espacios

## Capacidad y Configuración de Espacios {#capacidad-configuracion}

**Q: ¿Cuáles son las especificaciones de capacidad y distribución de espacios del Apartamento Summertime?**
**A:** Detalles completos de la configuración y espacios disponibles:

### Capacidad y Distribución
- **Capacidad máxima**: 2 personas <!-- EXTRAE: capacity.max_capacity -->
- **Configuración de camas**: Habitación principal con cama matrimonial <!-- EXTRAE: bed_configuration -->
- **Tamaño**: 26 metros cuadrados <!-- EXTRAE: size_m2 -->
- **Número de piso**: Tercer piso <!-- EXTRAE: floor_number -->
- **Tipo de vista**: Posición elevada con ventanas anti ruido <!-- EXTRAE: view_type -->
- **Número de unidad**: Apartamento Summertime <!-- EXTRAE: unit_number -->

### Espacios y Áreas
- **Espacios principales**: Habitación principal, cocina equipada, baño completo, área de estar
- **Área externa**: Sin balcón pero con ventanas amplias y buena iluminación
- **Características únicas**: Ubicación privilegiada en tercer piso, ventanas anti ruido, mayor privacidad <!-- EXTRAE: unique_features -->

**UBICACIÓN PRIVILEGIADA**: El tercer piso ofrece mayor privacidad y menos ruido de tránsito peatonal.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, escritorio de trabajo, wifi, aire_acondicionado, cocina_equipada, ventanas_anti_ruido","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:32.235647+00:00'::timestamptz, '2025-10-24T04:00:32.235647+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Summertime - Amenidades y Comodidades

## Amenidades y Comodidades {#amenities}

**Q: ¿Qué amenidades y servicios incluye el Apartamento Summertime?**
**A:** El apartamento está completamente equipado con amenidades modernas para garantizar una experiencia de huéspedes superior:

### Tecnología y Entretenimiento
- **Smart TV** con cuenta de Netflix incluida <!-- EXTRAE: amenities_list -->
- **Wi-Fi de alta velocidad** para trabajo y entretenimiento
- **Aire acondicionado** para clima controlado

### Cocina y Espacios de Descanso
- **Cocina totalmente equipada** para preparar comidas
- **Mesa de comedor** para 2 personas
- **Ventanas anti ruido** para aislamiento acústico superior

### Características Únicas y Especiales
- **Ubicación privilegiada**: Tercer piso para mayor privacidad <!-- EXTRAE: unique_features -->
- **Ventilación superior**: Mejor circulación de aire por altura <!-- EXTRAE: unique_features -->
- **Aislamiento acústico**: Ventanas anti ruido para descanso óptimo <!-- EXTRAE: unique_features -->
- **Espacio optimizado**: Distribución eficiente en 26 metros cuadrados <!-- EXTRAE: unique_features -->
- **Escritorio de trabajo**: Para quienes necesitan balancear entre disfrutar de la isla y trabajar cómodamente <!-- EXTRAE: unique_features -->

### Características de Accesibilidad
- **Acceso**: Escaleras hasta tercer piso, no apto para sillas de ruedas <!-- EXTRAE: accessibility_features -->
- **Baño adaptado**: Baño estándar, sin adaptaciones especiales <!-- EXTRAE: accessibility_features -->
- **Comunicación**: Señalización visual disponible <!-- EXTRAE: accessibility_features -->

### Amenities en Texto Completo
Smart TV con Netflix, Wi-Fi alta velocidad, aire acondicionado, cocina equipada, ventanas anti ruido <!-- EXTRAE: unit_amenities -->

**Ventaja diferencial**: Combinación única de comodidades modernas con ubicación estratégica en el piso más alto disponible.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, escritorio de trabajo, wifi, aire_acondicionado, cocina_equipada, ventanas_anti_ruido","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:32.912586+00:00'::timestamptz, '2025-10-24T04:00:32.912586+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Summertime - Tarifas y Precios Detallados

## Tarifas y Precios Detallados {#tarifas-precios}

**Q: ¿Cuáles son las tarifas del Apartamento Summertime según temporada y qué incluyen?**
**A:** El sistema de precios por temporada ofrece flexibilidad y valor según la demanda turística de San Andrés:

### Temporada Baja
- **2 personas**: $215.000 COP por noche <!-- EXTRAE: base_price_low_season -->
- **Capacidad fija**: Solo 2 personas, no permite huéspedes adicionales
- **Tarifa persona adicional**: No aplica <!-- EXTRAE: price_per_person_low -->

### Temporada Alta
- **2 personas**: $235.000 COP por noche <!-- EXTRAE: base_price_high_season -->
- **Capacidad fija**: Solo 2 personas, no permite huéspedes adicionales
- **Tarifa persona adicional**: No aplica <!-- EXTRAE: price_per_person_high -->

### Información de Precios
- **Moneda**: Pesos colombianos (COP)
- **Incluye**: Todos los amenities y servicios descritos
- **Política de ocupación**: Capacidad máxima estricta de 2 personas

**Nota importante**: Las tarifas incluyen todos los amenities y servicios descritos en la sección {#amenities}.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, escritorio de trabajo, wifi, aire_acondicionado, cocina_equipada, ventanas_anti_ruido","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:33.556781+00:00'::timestamptz, '2025-10-24T04:00:33.556781+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Summertime - Información Visual y Ubicación Detallada

## Información Visual y Ubicación Detallada {#visual-ubicacion}

**Q: ¿Qué información visual y detalles de ubicación están disponibles para el Apartamento Summertime?**
**A:** Detalles completos de ubicación, características visuales y atractivos turísticos:

### Galería Visual e Imágenes
- **Foto principal**: Apartamento Summertime vista general <!-- EXTRAE: images -->
- **Vista interior**: Imagen del apartamento completamente equipado <!-- EXTRAE: images -->
- **Cocina**: Foto de la cocina equipada con electrodomésticos <!-- EXTRAE: images -->
- **Ventanas anti ruido**: Imagen de las ventanas especiales <!-- EXTRAE: images -->

### Ubicación y Detalles del Espacio
- **Ubicación específica**: Tercer piso del edificio principal de Simmer Down Guest House <!-- EXTRAE: location_details -->
- **Acceso**: Escaleras internas hasta tercer piso <!-- EXTRAE: location_details -->
- **Orientación**: Vista desde altura privilegiada con ventanas anti ruido <!-- EXTRAE: location_details -->
- **Proximidad**: Dentro del complejo principal Simmer Down <!-- EXTRAE: location_details -->
- **Contexto**: San Andrés, Colombia - ubicación privilegiada en el Caribe colombiano <!-- EXTRAE: location_details -->

### Atractivos y Características Turísticas
- **Experiencias cercanas**: Acceso directo a las mejores playas de San Andrés <!-- EXTRAE: tourism_features -->
- **Actividades acuáticas**: Deportes acuáticos a minutos del Guest House <!-- EXTRAE: tourism_features -->
- **Cultura local**: Ambiente caribeño auténtico <!-- EXTRAE: tourism_features -->
- **Ubicación central**: Cerca de restaurantes y actividades turísticas <!-- EXTRAE: tourism_features -->
- **Transporte**: Fácil acceso a medios de transporte local <!-- EXTRAE: tourism_features -->

**Contexto turístico**: Playa, mar, cultura caribeña, vida nocturna, gastronomía local <!-- EXTRAE: tourism_features -->', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, escritorio de trabajo, wifi, aire_acondicionado, cocina_equipada, ventanas_anti_ruido","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:34.267231+00:00'::timestamptz, '2025-10-24T04:00:34.267231+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Summertime - Proceso de Reserva

## Proceso de Reserva {#proceso-reserva}

**Q: ¿Cómo puedo reservar el Apartamento Summertime y qué pasos debo seguir?**
**A:** El proceso de reserva es directo y se realiza completamente en línea a través del sistema oficial:

1. **Acceder al sistema**: Visitar el enlace oficial de reservas
2. **Verificar disponibilidad**: Consultar fechas disponibles según {#tarifas-precios}
3. **Seleccionar fechas**: Confirmar período de estancia deseado
4. **Completar información**: Proporcionar datos de huéspedes (máximo según {#capacidad-configuracion})
5. **Confirmar reserva**: Procesar pago y recibir confirmación
6. **Recibir instrucciones**: Obtener detalles de check-in y acceso

**ENLACE DE RESERVA OFICIAL**: [Reservar Apartamento Summertime](https://simmerdown.house/accommodation/apartamento-summertime/)', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, escritorio de trabajo, wifi, aire_acondicionado, cocina_equipada, ventanas_anti_ruido","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:34.977078+00:00'::timestamptz, '2025-10-24T04:00:34.977078+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Summertime - Políticas y Configuración del Alojamiento

## Políticas y Configuración del Alojamiento {#politicas-configuracion}

**Q: ¿Cuáles son las políticas específicas, estado y configuración de visualización del Apartamento Summertime?**
**A:** Información completa de políticas, estado operacional y configuración del sistema:

### Políticas Específicas del Alojamiento
- **Capacidad estricta**: Máximo 2 personas (sin excepciones) <!-- EXTRAE: booking_policies -->
- **Check-in/Check-out**: Según horarios establecidos por Simmer Down Guest House <!-- EXTRAE: booking_policies -->
- **Cuidado de amenities**: Uso responsable de equipos y mobiliario <!-- EXTRAE: booking_policies -->
- **Acceso**: Solo por escaleras, informar limitaciones de movilidad antes de reservar <!-- EXTRAE: booking_policies -->
- **Política de ruido**: Respetar horas de descanso, especialmente importante en tercer piso <!-- EXTRAE: booking_policies -->
- **Política de fumar**: Prohibido fumar en espacios cerrados <!-- EXTRAE: booking_policies -->

### Recomendaciones de Estadía
- **Equipaje ligero**: Considerar subida al tercer piso <!-- EXTRAE: booking_policies -->
- **Cocina equipada**: Ideal para preparar comidas caseras y ahorrar en restaurantes <!-- EXTRAE: booking_policies -->
- **Entretenimiento**: Netflix y Wi-Fi perfectos para noches de descanso <!-- EXTRAE: booking_policies -->
- **Privacidad**: Aprovechar la tranquilidad del tercer piso <!-- EXTRAE: booking_policies -->

### Estado y Configuración del Sistema
- **Estado operacional**: active - Alojamiento disponible para reservas <!-- EXTRAE: status -->
- **Destacado**: true - Aparece en listados destacados del sitio <!-- EXTRAE: is_featured -->
- **Orden de visualización**: 3 - Alta prioridad en listados <!-- EXTRAE: display_order -->
- **Última actualización**: 2025-01-25 - Información actualizada recientemente

### Información del Sistema
- **ID de tipo**: Apartamento compacto tercer piso - Categoría del sistema de reservas
- **ID de propiedad**: Simmer Down Guest House principal - Referencia de la propiedad
- **Integración MotoPress**: Conectado con sistema de reservas externo

**Referencia importante**: Para políticas generales del establecimiento, consultar la documentación principal de Simmer Down Guest House y sección {#overview}.', '{"bed_type":"Habitación principal con cama matrimonial","capacity_max":2,"unit_amenities":"smart_tv, netflix, escritorio de trabajo, wifi, aire_acondicionado, cocina_equipada, ventanas_anti_ruido","bed_configuration":"Habitación principal con cama matrimonial"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:35.655128+00:00'::timestamptz, '2025-10-24T04:00:35.655128+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Simmer Highs - Overview

## Overview {#overview}

**Q: ¿Qué es el Apartamento Simmer Highs y por qué es ideal para grupos grandes?**
**A:** El Apartamento Simmer Highs es una unidad de alojamiento premium de 4 habitaciones diseñada específicamente para grupos de 8 a 10 personas. Ubicado en San Andrés, Colombia, este apartamento gigante ofrece espacios amplios, comodidades modernas y la flexibilidad perfecta para familias grandes o grupos de amigos que buscan una experiencia de alojamiento cómoda y privada.

![Apartamento Simmer Highs](https://simmerdown.house/wp-content/uploads/2024/06/Apartamento-Simmer-Highs.jpg)', '{"bed_type":"4 habitaciones con camas dobles o matrimoniales","capacity_max":10,"unit_amenities":"4_habitaciones, 4_baños_privados, smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada, sala_amplia, balcon, lavadero","bed_configuration":"4 habitaciones con camas dobles o matrimoniales"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:36.334881+00:00'::timestamptz, '2025-10-24T04:00:36.334881+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Simmer Highs - Capacidad y Distribución

## Capacidad y Distribución {#capacity-distribution}

**Q: ¿Cuál es la capacidad y distribución del Apartamento Simmer Highs?**
**A:** El apartamento está diseñado para optimizar el espacio y comodidad de grupos grandes:

### Capacidad y Distribución
- **Capacidad máxima**: 10 personas <!-- EXTRAE: capacity.max_capacity -->
- **Capacidad mínima**: 8 personas (política de grupos grandes)
- **Configuración de camas**: 4 habitaciones con camas dobles o matrimoniales <!-- EXTRAE: bed_configuration -->
- **Tamaño**: Apartamento gigante, más de 100 metros cuadrados <!-- EXTRAE: size_m2 -->
- **Número de piso**: Edificio principal <!-- EXTRAE: floor_number -->
- **Tipo de vista**: Balcón con vista al exterior <!-- EXTRAE: view_type -->
- **Número de unidad**: Apartamento Simmer Highs <!-- EXTRAE: unit_number -->

### Espacios y Áreas
- **Habitaciones**: 4 habitaciones separadas con baños privados
- **Baños**: 4 baños privados (uno por habitación)
- **Áreas comunes**: Sala amplia, cocina equipada, balcón con vista exterior
- **Características únicas**: El apartamento más grande del Guest House, 4 baños privados <!-- EXTRAE: unique_features -->

**Distribución perfecta**: Cada habitación cuenta con baño privado, garantizando privacidad y comodidad para todos los huéspedes.', '{"bed_type":"4 habitaciones con camas dobles o matrimoniales","capacity_max":10,"unit_amenities":"4_habitaciones, 4_baños_privados, smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada, sala_amplia, balcon, lavadero","bed_configuration":"4 habitaciones con camas dobles o matrimoniales"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:37.140928+00:00'::timestamptz, '2025-10-24T04:00:37.140928+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Simmer Highs - Precios por Temporada

## Precios por Temporada {#pricing-seasons}

**Q: ¿Cuáles son las tarifas del Apartamento Simmer Highs según temporada y número de huéspedes?**
**A:** Las tarifas varían según la temporada y el número exacto de huéspedes:

### Temporada Baja
- **8 personas**: $1.090.000 COP por noche <!-- EXTRAE: base_price_low_season -->
- **9 personas**: $1.155.000 COP por noche (base + persona adicional)
- **10 personas**: $1.220.000 COP por noche (base + 2 personas adicionales)
- **Tarifa persona adicional**: $65.000 COP por noche <!-- EXTRAE: price_per_person_low -->

### Temporada Alta
- **8 personas**: $1.190.000 COP por noche <!-- EXTRAE: base_price_high_season -->
- **9 personas**: $1.225.000 COP por noche (base + persona adicional)
- **10 personas**: $1.310.000 COP por noche (base + 2 personas adicionales)
- **Tarifa persona adicional**: $65.000 COP por noche <!-- EXTRAE: price_per_person_high -->

**Política de precios**: Las tarifas se ajustan por persona adicional para garantizar un pricing justo y reflejar el uso real de servicios y amenidades.', '{"bed_type":"4 habitaciones con camas dobles o matrimoniales","capacity_max":10,"unit_amenities":"4_habitaciones, 4_baños_privados, smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada, sala_amplia, balcon, lavadero","bed_configuration":"4 habitaciones con camas dobles o matrimoniales"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:37.947095+00:00'::timestamptz, '2025-10-24T04:00:37.947095+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Simmer Highs - Amenidades y Comodidades

## Amenidades y Comodidades {#amenities-features}

**Q: ¿Qué amenidades y comodidades incluye el Apartamento Simmer Highs?**
**A:** El apartamento está completamente equipado con amenidades modernas para una estadía confortable:

### Habitaciones y Baños
- **4 habitaciones separadas** con privacidad garantizada <!-- EXTRAE: amenities_list -->
- **4 baños privados** (uno por habitación)
- **Aire acondicionado** en todas las áreas

### Tecnología y Conectividad
- **Smart TV** con cuenta de Netflix incluida
- **Wi-Fi de alta velocidad** para trabajo remoto o entretenimiento
- **Internet de alta velocidad** con cobertura completa

### Espacios Comunes y Servicios
- **Sala amplia** para reuniones grupales
- **Cocina totalmente equipada** para preparar comidas
- **Balcón con vista al exterior** para relajación
- **Lavadero de ropas** con facilidades completas

### Características Únicas y Especiales
- **Apartamento más grande**: La unidad de mayor capacidad en Simmer Down <!-- EXTRAE: unique_features -->
- **4 baños privados**: Único apartamento con baño por habitación <!-- EXTRAE: unique_features -->
- **Grupos grandes**: Diseñado específicamente para 8-10 personas <!-- EXTRAE: unique_features -->
- **Lavadero incluido**: Único apartamento con lavadero completo <!-- EXTRAE: unique_features -->

### Características de Accesibilidad
- **Acceso**: Según ubicación en edificio principal <!-- EXTRAE: accessibility_features -->
- **Baños adaptados**: 4 baños privados estándar <!-- EXTRAE: accessibility_features -->
- **Comunicación**: Señalización visual disponible <!-- EXTRAE: accessibility_features -->

### Amenities en Texto Completo
4 habitaciones separadas, 4 baños privados, Smart TV con Netflix, Wi-Fi alta velocidad, aire acondicionado, cocina equipada, sala amplia, balcón, lavadero de ropas <!-- EXTRAE: unit_amenities -->

**Ventaja competitiva**: La combinación de privacidad individual (baños privados) con espacios comunes amplios hace ideal para grupos que buscan balance entre convivencia y privacidad personal.', '{"bed_type":"4 habitaciones con camas dobles o matrimoniales","capacity_max":10,"unit_amenities":"4_habitaciones, 4_baños_privados, smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada, sala_amplia, balcon, lavadero","bed_configuration":"4 habitaciones con camas dobles o matrimoniales"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:38.606813+00:00'::timestamptz, '2025-10-24T04:00:38.606813+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Simmer Highs - Información Visual y Ubicación Detallada

## Información Visual y Ubicación Detallada {#visual-ubicacion}

**Q: ¿Qué información visual y detalles de ubicación están disponibles para el Apartamento Simmer Highs?**
**A:** Detalles completos de ubicación, características visuales y atractivos turísticos:

### Galería Visual e Imágenes
- **Foto principal**: Apartamento Simmer Highs vista general del apartamento gigante <!-- EXTRAE: images -->
- **URL de imagen**: https://simmerdown.house/wp-content/uploads/2024/06/Apartamento-Simmer-Highs.jpg <!-- EXTRAE: images -->
- **4 habitaciones**: Imágenes de todas las habitaciones privadas <!-- EXTRAE: images -->
- **Baños privados**: Fotos de los 4 baños exclusivos <!-- EXTRAE: images -->
- **Sala amplia**: Imagen de la sala común para grupos grandes <!-- EXTRAE: images -->

### Ubicación y Detalles del Espacio
- **Ubicación específica**: Edificio principal de Simmer Down Guest House <!-- EXTRAE: location_details -->
- **Acceso**: Acceso directo para grupos grandes con equipaje múltiple <!-- EXTRAE: location_details -->
- **Orientación**: Balcón con vista al exterior para relajación grupal <!-- EXTRAE: location_details -->
- **Proximidad**: Ubicación estratégica dentro del complejo <!-- EXTRAE: location_details -->
- **Contexto**: San Andrés, Colombia - ubicación privilegiada en el Caribe colombiano <!-- EXTRAE: location_details -->

### Atractivos y Características Turísticas
- **Experiencias cercanas**: Acceso directo a las mejores playas de San Andrés para grupos <!-- EXTRAE: tourism_features -->
- **Actividades acuáticas**: Deportes acuáticos y excursiones grupales <!-- EXTRAE: tourism_features -->
- **Cultura local**: Ambiente caribeño auténtico para experiencias grupales <!-- EXTRAE: tourism_features -->
- **Vida nocturna**: Cerca de bares y restaurantes ideales para grupos <!-- EXTRAE: tourism_features -->
- **Actividades grupales**: Tours y actividades especiales para 8-10 personas <!-- EXTRAE: tourism_features -->

**Contexto turístico**: Playa, mar, actividades grupales, cultura caribeña, vida nocturna, experiencias de grupo <!-- EXTRAE: tourism_features -->', '{"bed_type":"4 habitaciones con camas dobles o matrimoniales","capacity_max":10,"unit_amenities":"4_habitaciones, 4_baños_privados, smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada, sala_amplia, balcon, lavadero","bed_configuration":"4 habitaciones con camas dobles o matrimoniales"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:39.314863+00:00'::timestamptz, '2025-10-24T04:00:39.314863+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Simmer Highs - Proceso de Reserva

## Proceso de Reserva {#booking-process}

**Q: ¿Cómo se realiza la reserva del Apartamento Simmer Highs?**
**A:** El proceso de reserva es directo y está optimizado para grupos grandes:

1. **Consulta disponibilidad**: Verificar fechas en el sistema online
2. **Seleccionar número de huéspedes**: Entre 8-10 personas
3. **Confirmar temporada**: Validar si aplican tarifas de temporada alta o baja
4. **Realizar reserva**: A través del enlace oficial de Simmer Down
5. **Confirmación**: Recibir detalles de check-in y políticas específicas

**Enlace directo**: [Reservar Simmer Highs](https://simmerdown.house/accommodation/apartamento-simmer-highs/)', '{"bed_type":"4 habitaciones con camas dobles o matrimoniales","capacity_max":10,"unit_amenities":"4_habitaciones, 4_baños_privados, smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada, sala_amplia, balcon, lavadero","bed_configuration":"4 habitaciones con camas dobles o matrimoniales"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:39.9068+00:00'::timestamptz, '2025-10-24T04:00:39.9068+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Simmer Highs - Políticas y Configuración del Alojamiento

## Políticas y Configuración del Alojamiento {#politicas-configuracion}

**Q: ¿Cuáles son las políticas específicas, estado y configuración de visualización del Apartamento Simmer Highs?**
**A:** Información completa de políticas, estado operacional y configuración del sistema:

### Políticas Específicas del Alojamiento
- **Capacidad estricta**: Mínimo 8 personas, máximo 10 personas (sin excepciones) <!-- EXTRAE: booking_policies -->
- **Check-in/Check-out**: Proceso especial coordinado para grupos grandes <!-- EXTRAE: booking_policies -->
- **Facturación exacta**: Se cobra según número real de huéspedes (8, 9 o 10) <!-- EXTRAE: booking_policies -->
- **Depósito de garantía**: Puede aplicar para grupos de 10 personas <!-- EXTRAE: booking_policies -->
- **Política de ruido**: Consideración especial por alta capacidad <!-- EXTRAE: booking_policies -->
- **Política de fumar**: Prohibido fumar en espacios cerrados <!-- EXTRAE: booking_policies -->

### Recomendaciones de Estadía
- **Coordinación grupal**: Designar líder del grupo para comunicación <!-- EXTRAE: booking_policies -->
- **Cocina amplia**: Ideal para preparar comidas grupales <!-- EXTRAE: booking_policies -->
- **Entretenimiento**: Netflix y Wi-Fi para actividades nocturnas grupales <!-- EXTRAE: booking_policies -->
- **Privacidad**: 4 baños privados garantizan comodidad para todos <!-- EXTRAE: booking_policies -->

### Estado y Configuración del Sistema
- **Estado operacional**: active - Alojamiento disponible para reservas <!-- EXTRAE: status -->
- **Destacado**: true - Aparece en listados destacados como opción premium <!-- EXTRAE: is_featured -->
- **Orden de visualización**: 1 - Máxima prioridad por ser la unidad más grande <!-- EXTRAE: display_order -->
- **Última actualización**: 2025-01-25 - Información actualizada recientemente

### Información del Sistema
- **ID de tipo**: Apartamento premium para grupos grandes - Categoría del sistema de reservas
- **ID de propiedad**: Simmer Down Guest House principal - Referencia de la propiedad
- **Integración MotoPress**: Conectado con sistema de reservas externo

**Referencia importante**: Diseñado específicamente para grupos grandes, no individual o parejas. Para políticas generales del establecimiento, consultar la documentación principal de Simmer Down Guest House y sección {#overview}.', '{"bed_type":"4 habitaciones con camas dobles o matrimoniales","capacity_max":10,"unit_amenities":"4_habitaciones, 4_baños_privados, smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada, sala_amplia, balcon, lavadero","bed_configuration":"4 habitaciones con camas dobles o matrimoniales"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:40.636101+00:00'::timestamptz, '2025-10-24T04:00:40.636101+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento One Love - Overview

## Overview {#overview}

**Q: ¿Qué es el Apartamento One Love y por qué es la opción ideal para parejas y familias pequeñas en San Andrés?**
**A:** El Apartamento One Love es un alojamiento luminoso en Simmer Down Guest House, diseñado específicamente para parejas o familias pequeñas de hasta 3 personas. Ubicado en el segundo piso, se destaca por su abundante luz natural gracias a ventanas que dan a dos costados diferentes del edificio, creando un ambiente acogedor y bien ventilado.', '{"bed_type":"Dormitorio principal con cama matrimonial, sofá cama individual en sala","capacity_max":3,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada, sofa_cama, hamaca, balcon","bed_configuration":"Dormitorio principal con cama matrimonial, sofá cama individual en sala"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:41.704359+00:00'::timestamptz, '2025-10-24T04:00:41.704359+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento One Love - Capacidad y Espacios

## Capacidad y Espacios {#capacidad-espacios}

**Q: ¿Cuáles son las especificaciones de capacidad y distribución de espacios del apartamento?**
**A:** El apartamento está optimizado para máximo confort en espacios bien iluminados:

### Capacidad y Distribución
- **Capacidad máxima**: 3 personas <!-- EXTRAE: capacity.max_capacity -->
- **Configuración de camas**: Dormitorio principal con cama matrimonial, sofá cama individual en sala <!-- EXTRAE: bed_configuration -->
- **Tamaño**: 35 metros cuadrados <!-- EXTRAE: size_m2 -->
- **Número de piso**: Segundo piso <!-- EXTRAE: floor_number -->
- **Tipo de vista**: Ventanas duales con vistas a dos costados del edificio <!-- EXTRAE: view_type -->
- **Número de unidad**: Apartamento One Love <!-- EXTRAE: unit_number -->

### Espacios y Áreas
- **Espacios principales**: Sala con sofá cama individual, dormitorio principal, cocina equipada, balcón
- **Área externa**: Balcón con vista al exterior
- **Características únicas**: Ventanas duales para luz natural excepcional, orientación privilegiada <!-- EXTRAE: unique_features -->

**Ventaja diferencial**: El apartamento más luminoso de Simmer Down gracias a su orientación dual.', '{"bed_type":"Dormitorio principal con cama matrimonial, sofá cama individual en sala","capacity_max":3,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada, sofa_cama, hamaca, balcon","bed_configuration":"Dormitorio principal con cama matrimonial, sofá cama individual en sala"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:42.723347+00:00'::timestamptz, '2025-10-24T04:00:42.723347+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento One Love - Tarifas y Precios

## Tarifas y Precios {#tarifas-precios}

**Q: ¿Cuáles son las tarifas del Apartamento One Love según temporada y ocupación?**
**A:** Las tarifas varían según temporada y número de huéspedes:

### Temporada Baja
- **2 personas (pareja)**: $230,000 COP por noche <!-- EXTRAE: base_price_low_season -->
- **3 personas**: $295,000 COP por noche (base + persona adicional)
- **Tarifa persona adicional**: $65,000 COP por noche <!-- EXTRAE: price_per_person_low -->

### Temporada Alta
- **2 personas (pareja)**: $250,000 COP por noche <!-- EXTRAE: base_price_high_season -->
- **3 personas**: $315,000 COP por noche (base + persona adicional)
- **Tarifa persona adicional**: $65,000 COP por noche <!-- EXTRAE: price_per_person_high -->

**Nota importante**: Las tarifas incluyen todos los amenities y servicios descritos en {#amenities-comodidades}.', '{"bed_type":"Dormitorio principal con cama matrimonial, sofá cama individual en sala","capacity_max":3,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada, sofa_cama, hamaca, balcon","bed_configuration":"Dormitorio principal con cama matrimonial, sofá cama individual en sala"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:43.406151+00:00'::timestamptz, '2025-10-24T04:00:43.406151+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento One Love - Amenities y Comodidades

## Amenities y Comodidades {#amenities-comodidades}

**Q: ¿Qué amenities y comodidades están incluidos en el Apartamento One Love?**
**A:** El apartamento cuenta con amenities premium para una experiencia completa:

### Tecnología y Entretenimiento
- **Smart TV** con cuenta de Netflix incluida <!-- EXTRAE: amenities_list -->
- **Wi-Fi de alta velocidad** para trabajo y entretenimiento
- **Aire acondicionado** para clima controlado

### Cocina y Área de Descanso
- **Cocina totalmente equipada** para preparar comidas
- **Sofá cama individual** en la sala para huésped adicional
- **Hamaca** para relajación

### Espacios Exteriores
- **Balcón con vista al exterior** para descanso y contemplación
- **Ventanas duales** proporcionan ventilación cruzada natural

### Características Únicas y Especiales
- **Luminosidad excepcional**: Ventanas en dos costados diferentes del edificio <!-- EXTRAE: unique_features -->
- **Ventilación cruzada**: Circulación de aire natural superior <!-- EXTRAE: unique_features -->
- **Orientación dual**: Múltiples perspectivas y vistas <!-- EXTRAE: unique_features -->
- **Espacio optimizado**: Distribución eficiente para 3 personas <!-- EXTRAE: unique_features -->

### Características de Accesibilidad
- **Acceso**: Escaleras hasta segundo piso, no apto para sillas de ruedas <!-- EXTRAE: accessibility_features -->
- **Baño adaptado**: Baño estándar, sin adaptaciones especiales <!-- EXTRAE: accessibility_features -->
- **Comunicación**: Señalización visual disponible <!-- EXTRAE: accessibility_features -->

### Amenities en Texto Completo
Smart TV con Netflix, Wi-Fi alta velocidad, aire acondicionado, cocina totalmente equipada, sofá cama individual, hamaca, balcón, ventanas duales <!-- EXTRAE: unit_amenities -->

**Ventaja diferencial**: Combinación única de luminosidad natural con comodidades modernas del Caribe.', '{"bed_type":"Dormitorio principal con cama matrimonial, sofá cama individual en sala","capacity_max":3,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada, sofa_cama, hamaca, balcon","bed_configuration":"Dormitorio principal con cama matrimonial, sofá cama individual en sala"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:44.069881+00:00'::timestamptz, '2025-10-24T04:00:44.069881+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento One Love - Información Visual y Ubicación Detallada

## Información Visual y Ubicación Detallada {#visual-ubicacion}

**Q: ¿Qué información visual y detalles de ubicación están disponibles para el Apartamento One Love?**
**A:** Detalles completos de ubicación, características visuales y atractivos turísticos:

### Galería Visual e Imágenes
- **Foto principal**: Apartamento One Love vista general con luz natural <!-- EXTRAE: images -->
- **Vista interior**: Imagen de la sala con sofá cama y TV <!-- EXTRAE: images -->
- **Dormitorio**: Foto del dormitorio principal con cama matrimonial <!-- EXTRAE: images -->
- **Cocina equipada**: Imagen de la cocina totalmente equipada <!-- EXTRAE: images -->
- **Ventanas duales**: Foto de las ventanas en dos costados del edificio <!-- EXTRAE: images -->

### Ubicación y Detalles del Espacio
- **Ubicación específica**: Segundo piso del edificio principal de Simmer Down Guest House <!-- EXTRAE: location_details -->
- **Acceso**: Escaleras internas del Guest House, entrada independiente <!-- EXTRAE: location_details -->
- **Orientación**: Ventanas en dos costados diferentes para luz natural excepcional <!-- EXTRAE: location_details -->
- **Proximidad**: A 25 metros de la recepción principal <!-- EXTRAE: location_details -->
- **Contexto**: San Andrés, Colombia - ubicación privilegiada en el Caribe colombiano <!-- EXTRAE: location_details -->

### Atractivos y Características Turísticas
- **Experiencias cercanas**: Acceso directo a las mejores playas de San Andrés <!-- EXTRAE: tourism_features -->
- **Actividades acuáticas**: Deportes acuáticos y snorkeling a 8 minutos caminando <!-- EXTRAE: tourism_features -->
- **Cultura local**: Ambiente caribeño auténtico y hospitalidad isleña <!-- EXTRAE: tourism_features -->
- **Naturaleza**: Vista privilegiada y ambiente tropical <!-- EXTRAE: tourism_features -->
- **Gastronomía**: Restaurantes locales y opciones culinarias a distancia caminable <!-- EXTRAE: tourism_features -->

**Contexto turístico**: Playa, mar, ambiente caribeño, cultura isleña, gastronomía local, luz natural <!-- EXTRAE: tourism_features -->', '{"bed_type":"Dormitorio principal con cama matrimonial, sofá cama individual en sala","capacity_max":3,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada, sofa_cama, hamaca, balcon","bed_configuration":"Dormitorio principal con cama matrimonial, sofá cama individual en sala"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:44.701989+00:00'::timestamptz, '2025-10-24T04:00:44.701989+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento One Love - Proceso de Reserva

## Proceso de Reserva {#proceso-reserva}

**Q: ¿Cuáles son los pasos para reservar el Apartamento One Love?**
**A:** El proceso de reserva es directo y eficiente:

1. **Consultar disponibilidad** en fechas deseadas
2. **Seleccionar número de huéspedes** (1-3 personas)
3. **Confirmar temporada** (alta o baja) para tarifa correcta
4. **Acceder al sistema de reservas** vía enlace oficial
5. **Completar información de huéspedes** y datos de contacto
6. **Realizar pago** según políticas del establecimiento
7. **Recibir confirmación** con instrucciones de check-in

**Enlace de reservas**: [Reservar One Love](https://simmerdown.house/accommodation/apartamento-one-love/)', '{"bed_type":"Dormitorio principal con cama matrimonial, sofá cama individual en sala","capacity_max":3,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada, sofa_cama, hamaca, balcon","bed_configuration":"Dormitorio principal con cama matrimonial, sofá cama individual en sala"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:45.456369+00:00'::timestamptz, '2025-10-24T04:00:45.456369+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento One Love - Políticas y Configuración del Alojamiento

## Políticas y Configuración del Alojamiento {#politicas-configuracion}

**Q: ¿Cuáles son las políticas específicas, estado y configuración de visualización del Apartamento One Love?**
**A:** Información completa de políticas, estado operacional y configuración del sistema:

### Políticas Específicas del Alojamiento
- **Capacidad estricta**: Máximo 3 personas (sin excepciones) <!-- EXTRAE: booking_policies -->
- **Check-in/Check-out**: Según horarios establecidos por Simmer Down Guest House <!-- EXTRAE: booking_policies -->
- **Cuidado de amenities**: Uso responsable de equipos y mobiliario <!-- EXTRAE: booking_policies -->
- **Espacios privados**: Balcón de uso exclusivo para huéspedes del apartamento <!-- EXTRAE: booking_policies -->
- **Política de ruido**: Respetar horas de descanso de otros huéspedes <!-- EXTRAE: booking_policies -->
- **Política de fumar**: Prohibido fumar en espacios cerrados <!-- EXTRAE: booking_policies -->

### Recomendaciones de Estadía
- **Luminosidad natural**: Aprovechar las ventanas duales para fotos y bienestar <!-- EXTRAE: booking_policies -->
- **Cocina equipada**: Ideal para preparar comidas caseras y ahorrar en restaurantes <!-- EXTRAE: booking_policies -->
- **Entretenimiento**: Netflix y Wi-Fi perfectos para noches de descanso después de días de playa <!-- EXTRAE: booking_policies -->
- **Ubicación**: Segundo piso ofrece mejor ventilación y múltiples vistas <!-- EXTRAE: booking_policies -->

### Estado y Configuración del Sistema
- **Estado operacional**: active - Alojamiento disponible para reservas <!-- EXTRAE: status -->
- **Destacado**: true - Aparece en listados destacados del sitio <!-- EXTRAE: is_featured -->
- **Orden de visualización**: 3 - Alta prioridad en listados <!-- EXTRAE: display_order -->
- **Última actualización**: 2025-01-25 - Información actualizada recientemente

### Información del Sistema
- **ID de tipo**: Apartamento luminoso con ventanas duales - Categoría del sistema de reservas
- **ID de propiedad**: Simmer Down Guest House principal - Referencia de la propiedad
- **Integración MotoPress**: Conectado con sistema de reservas externo

**Referencia importante**: Para políticas generales del establecimiento, consultar la documentación principal de Simmer Down Guest House y sección {#overview}.', '{"bed_type":"Dormitorio principal con cama matrimonial, sofá cama individual en sala","capacity_max":3,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada, sofa_cama, hamaca, balcon","bed_configuration":"Dormitorio principal con cama matrimonial, sofá cama individual en sala"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:46.237168+00:00'::timestamptz, '2025-10-24T04:00:46.237168+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento One Love - Ubicación y Acceso

## Ubicación y Acceso {#ubicacion-acceso}

**Q: ¿Cómo es la ubicación y acceso al Apartamento One Love dentro de Simmer Down Guest House?**
**A:** Ubicación estratégica para luminosidad y comodidad:

- **Ubicación**: Segundo piso del edificio principal
- **Acceso**: Escaleras internas del Guest House
- **Luminosidad**: Ventanas en dos costados diferentes del edificio
- **Ventilación**: Ubicación favorable para circulación de aire cruzada
- **Vista**: Balcón con vista al exterior y múltiples perspectivas

**Contexto**: San Andrés, Colombia - ubicación privilegiada en el Caribe colombiano con acceso a las mejores playas y actividades turísticas de la isla.', '{"bed_type":"Dormitorio principal con cama matrimonial, sofá cama individual en sala","capacity_max":3,"unit_amenities":"smart_tv, netflix, wifi, aire_acondicionado, cocina_equipada, sofa_cama, hamaca, balcon","bed_configuration":"Dormitorio principal con cama matrimonial, sofá cama individual en sala"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:46.977248+00:00'::timestamptz, '2025-10-24T04:00:46.977248+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Misty Morning - Overview

## Overview {#overview}

**Q: ¿Qué es el Apartamento Misty Morning y por qué es la opción ideal para huéspedes en San Andrés?**
**A:** El Apartamento Misty Morning es un alojamiento premium en Simmer Down Guest House, diseñado para parejas, grupos o familias de hasta 4 personas. Ubicado en el segundo piso, ofrece espacios amplios y bien aprovechados, con un balcón trasero ideal para secar ropa de playa y disfrutar del ambiente caribeño.', '{"bed_type":"Una cama doble","capacity_max":4,"unit_amenities":"aire_acondicionado, wifi, smart_tv, netflix, cocina_equipada, balcon, hamaca","bed_configuration":"Una cama doble"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:47.650629+00:00'::timestamptz, '2025-10-24T04:00:47.650629+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Misty Morning - Capacidad y Espacios

## Capacidad y Espacios {#capacidad-espacios}

**Q: ¿Cuáles son las especificaciones de capacidad y distribución de espacios del apartamento?**
**A:** El apartamento está optimizado para máximo confort y funcionalidad:

- **Capacidad máxima**: 4 personas <!-- EXTRAE: capacity.max_capacity -->
- **Configuración de camas**: Dormitorio principal con cama matrimonial, sofá cama doble en sala <!-- EXTRAE: bed_configuration -->
- **Tamaño**: 40 metros cuadrados <!-- EXTRAE: size_m2 -->
- **Número de piso**: Segundo piso <!-- EXTRAE: floor_number -->
- **Tipo de vista**: Balcón trasero con vista al exterior y área de descanso <!-- EXTRAE: view_type -->
- **Número de unidad**: Apartamento 2B <!-- EXTRAE: unit_number -->
- **Ubicación**: Segundo piso del edificio principal
- **Espacios principales**: Sala con sofá cama doble, dormitorio principal, cocina equipada
- **Área externa**: Balcón trasero con vista al exterior
- **Distribución**: Espacios amplios y bien aprovechados para comodidad de huéspedes
- **Características únicas**: Ubicación privilegiada en segundo piso, mayor privacidad, mejor ventilación <!-- EXTRAE: unique_features -->

**Configuración ideal**: Perfecto para parejas que buscan espacio extra o familias pequeñas que valoran la privacidad y comodidad.', '{"bed_type":"Una cama doble","capacity_max":4,"unit_amenities":"aire_acondicionado, wifi, smart_tv, netflix, cocina_equipada, balcon, hamaca","bed_configuration":"Una cama doble"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:48.420007+00:00'::timestamptz, '2025-10-24T04:00:48.420007+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Misty Morning - Tarifas y Precios

## Tarifas y Precios {#tarifas-precios}

**Q: ¿Cuáles son las tarifas del Apartamento Misty Morning según temporada y ocupación?**
**A:** Las tarifas varían según temporada y número de huéspedes:

### Temporada Baja
- **2 personas**: $240,000 COP por noche <!-- EXTRAE: base_price_low_season -->
- **3 personas**: $305,000 COP por noche (base + persona adicional)
- **4 personas**: $370,000 COP por noche (base + 2 personas adicionales)
- **Tarifa persona adicional**: $65,000 COP por noche <!-- EXTRAE: price_per_person_low -->

### Temporada Alta
- **2 personas**: $260,000 COP por noche <!-- EXTRAE: base_price_high_season -->
- **3 personas**: $325,000 COP por noche (base + persona adicional)
- **4 personas**: $390,000 COP por noche (base + 2 personas adicionales)
- **Tarifa persona adicional**: $65,000 COP por noche <!-- EXTRAE: price_per_person_high -->

**Nota importante**: Las tarifas incluyen todos los amenities y servicios descritos en {#amenities-comodidades}.', '{"bed_type":"Una cama doble","capacity_max":4,"unit_amenities":"aire_acondicionado, wifi, smart_tv, netflix, cocina_equipada, balcon, hamaca","bed_configuration":"Una cama doble"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:49.514255+00:00'::timestamptz, '2025-10-24T04:00:49.514255+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Misty Morning - Amenities y Comodidades

## Amenities y Comodidades {#amenities-comodidades}

**Q: ¿Qué amenities y comodidades están incluidos en el Apartamento Misty Morning?**
**A:** El apartamento cuenta con amenities premium para una experiencia completa:

### Tecnología y Entretenimiento
- **Smart TV** con cuenta de Netflix incluida
- **Wi-Fi de alta velocidad** para trabajo y entretenimiento
- **Aire acondicionado** para clima controlado

### Cocina y Área de Descanso
- **Cocina totalmente equipada** para preparar comidas
- **Sofá cama doble** en la sala para huéspedes adicionales
- **Hamaca** para relajación

### Espacios Exteriores
- **Balcón con vista al exterior** para descanso y contemplación
- **Espacio ideal para secar ropa de playa** en el balcón trasero

### Amenities en Texto Completo
Smart TV con Netflix, Wi-Fi alta velocidad, aire acondicionado, cocina totalmente equipada, sofá cama doble, hamaca, balcón trasero <!-- EXTRAE: unit_amenities -->

### Características de Accesibilidad
- **Acceso**: Escaleras internas, no apto para sillas de ruedas <!-- EXTRAE: accessibility_features -->
- **Baño**: Baño estándar, sin adaptaciones especiales <!-- EXTRAE: accessibility_features -->
- **Movilidad**: Segundo piso requiere subir escaleras <!-- EXTRAE: accessibility_features -->

**Ventaja diferencial**: Combinación única de comodidades modernas con el ambiente relajado del Caribe.', '{"bed_type":"Una cama doble","capacity_max":4,"unit_amenities":"aire_acondicionado, wifi, smart_tv, netflix, cocina_equipada, balcon, hamaca","bed_configuration":"Una cama doble"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:50.454689+00:00'::timestamptz, '2025-10-24T04:00:50.454689+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Misty Morning - Información Visual y Ubicación Detallada

## Información Visual y Ubicación Detallada {#visual-ubicacion}

**Q: ¿Qué información visual y detalles de ubicación están disponibles del Apartamento Misty Morning?**
**A:** Detalles completos de ubicación, características visuales y atractivos turísticos:

### Galería Visual e Imágenes
- **Foto principal**: Imagen del dormitorio principal con cama matrimonial y decoración caribeña <!-- EXTRAE: images -->
- **Vista del balcón**: Foto del balcón trasero con vista al exterior y espacio para secado <!-- EXTRAE: images -->
- **Cocina equipada**: Imagen de la cocina totalmente equipada con electrodomésticos <!-- EXTRAE: images -->
- **Sala de estar**: Foto de la sala con sofá cama y Smart TV <!-- EXTRAE: images -->
- **Gallery reference**: Galería completa disponible en el sitio web de reservas <!-- EXTRAE: images -->

### Ubicación y Detalles del Espacio
- **Ubicación específica**: Segundo piso del edificio principal de Simmer Down Guest House <!-- EXTRAE: location_details -->
- **Acceso**: Escaleras internas del Guest House, entrada independiente <!-- EXTRAE: location_details -->
- **Orientación**: Vista hacia el área trasera y exterior del establecimiento <!-- EXTRAE: location_details -->
- **Proximidad**: A 30 metros de la recepción principal <!-- EXTRAE: location_details -->
- **Contexto**: San Andrés, Colombia - ubicación privilegiada en el Caribe colombiano <!-- EXTRAE: location_details -->

### Atractivos y Características Turísticas
- **Experiencias cercanas**: Acceso directo a las mejores playas de San Andrés <!-- EXTRAE: tourism_features -->
- **Actividades acuáticas**: Deportes acuáticos y snorkeling a 10 minutos caminando <!-- EXTRAE: tourism_features -->
- **Cultura local**: Ambiente caribeño auténtico y hospitalidad isleña <!-- EXTRAE: tourism_features -->
- **Naturaleza**: Vista al área verde y ambiente tropical <!-- EXTRAE: tourism_features -->
- **Gastronomía**: Restaurantes locales y opciones culinarias a distancia caminable <!-- EXTRAE: tourism_features -->

**Contexto turístico**: Playa, mar, ambiente caribeño, cultura isleña, gastronomía local <!-- EXTRAE: tourism_features -->', '{"bed_type":"Una cama doble","capacity_max":4,"unit_amenities":"aire_acondicionado, wifi, smart_tv, netflix, cocina_equipada, balcon, hamaca","bed_configuration":"Una cama doble"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:51.36117+00:00'::timestamptz, '2025-10-24T04:00:51.36117+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Misty Morning - Proceso de Reserva

## Proceso de Reserva {#proceso-reserva}

**Q: ¿Cuáles son los pasos para reservar el Apartamento Misty Morning?**
**A:** El proceso de reserva es directo y eficiente:

1. **Consultar disponibilidad** en fechas deseadas
2. **Seleccionar número de huéspedes** (1-4 personas)
3. **Confirmar temporada** (alta o baja) para tarifa correcta
4. **Acceder al sistema de reservas** vía enlace oficial
5. **Completar información de huéspedes** y datos de contacto
6. **Realizar pago** según políticas del establecimiento
7. **Recibir confirmación** con instrucciones de check-in

**Enlace de reservas**: [Reservar Misty Morning](https://simmerdown.house/accommodation/apartamento-misty-morning/)', '{"bed_type":"Una cama doble","capacity_max":4,"unit_amenities":"aire_acondicionado, wifi, smart_tv, netflix, cocina_equipada, balcon, hamaca","bed_configuration":"Una cama doble"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:52.048605+00:00'::timestamptz, '2025-10-24T04:00:52.048605+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Misty Morning - Políticas y Configuración del Alojamiento

## Políticas y Configuración del Alojamiento {#politicas-configuracion}

**Q: ¿Cuáles son las políticas específicas, estado y configuración de visualización del Apartamento Misty Morning?**
**A:** Información completa de políticas, estado operacional y configuración del sistema:

### Políticas Específicas del Alojamiento
- **Capacidad estricta**: Máximo 4 personas (sin excepciones) <!-- EXTRAE: booking_policies -->
- **Check-in/Check-out**: Según horarios establecidos por Simmer Down Guest House <!-- EXTRAE: booking_policies -->
- **Cuidado de amenities**: Uso responsable de equipos y mobiliario <!-- EXTRAE: booking_policies -->
- **Espacios privados**: Balcón de uso exclusivo para huéspedes del apartamento <!-- EXTRAE: booking_policies -->
- **Política de ruido**: Respetar horas de descanso de otros huéspedes <!-- EXTRAE: booking_policies -->
- **Política de fumar**: Prohibido fumar en espacios cerrados <!-- EXTRAE: booking_policies -->

### Recomendaciones de Estadía
- **Ropa de playa**: Aprovechar el balcón trasero para secado <!-- EXTRAE: booking_policies -->
- **Cocina equipada**: Ideal para preparar comidas caseras y ahorrar en restaurantes <!-- EXTRAE: booking_policies -->
- **Netflix y Wi-Fi**: Perfecto para noches de descanso después de días de playa <!-- EXTRAE: booking_policies -->
- **Ubicación**: Segundo piso ofrece mejor ventilación y vistas <!-- EXTRAE: booking_policies -->

### Estado y Configuración del Sistema
- **Estado operacional**: active - Alojamiento disponible para reservas <!-- EXTRAE: status -->
- **Destacado**: true - Aparece en listados destacados del sitio <!-- EXTRAE: is_featured -->
- **Orden de visualización**: 2 - Prioridad alta en listados <!-- EXTRAE: display_order -->
- **Última actualización**: 2025-09-25 - Información actualizada recientemente

### Información del Sistema
- **ID de tipo**: Apartamento estándar con balcón - Categoría del sistema de reservas
- **ID de propiedad**: Simmer Down Guest House principal - Referencia de la propiedad
- **Integración MotoPress**: Conectado con sistema de reservas externo

**Referencia importante**: Para políticas generales del establecimiento, consultar {#overview} y documentación principal de Simmer Down Guest House.', '{"bed_type":"Una cama doble","capacity_max":4,"unit_amenities":"aire_acondicionado, wifi, smart_tv, netflix, cocina_equipada, balcon, hamaca","bed_configuration":"Una cama doble"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:52.832836+00:00'::timestamptz, '2025-10-24T04:00:52.832836+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, 'apartment', NULL, NULL, NULL, NULL, NULL, 'Apartamento Misty Morning - Ubicación y Acceso

## Ubicación y Acceso {#ubicacion-acceso}

**Q: ¿Cómo es la ubicación y acceso al Apartamento Misty Morning dentro de Simmer Down Guest House?**
**A:** Ubicación estratégica para comodidad y privacidad:

- **Ubicación**: Segundo piso del edificio principal
- **Acceso**: Escaleras internas del Guest House
- **Privacidad**: Nivel elevado ofrece mayor tranquilidad
- **Ventilación**: Ubicación favorable para circulación de aire natural
- **Vista**: Balcón con vista al exterior y área trasera

**Contexto**: San Andrés, Colombia - ubicación privilegiada en el Caribe colombiano con acceso a las mejores playas y actividades turísticas de la isla.', '{"bed_type":"Una cama doble","capacity_max":4,"unit_amenities":"aire_acondicionado, wifi, smart_tv, netflix, cocina_equipada, balcon, hamaca","bed_configuration":"Una cama doble"}'::jsonb, ARRAY[]::text[], NULL, '2025-10-24T04:00:53.446062+00:00'::timestamptz, '2025-10-24T04:00:53.446062+00:00'::timestamptz);

-- ========================================
-- TABLE 4: accommodation_units (2 rows)
-- ========================================
INSERT INTO accommodation_units (
  id,
  hotel_id,
  tenant_id,
  unit_number,
  unit_type,
  floor,
  capacity,
  base_rate,
  status,
  amenities,
  created_at,
  updated_at
) VALUES
('c6cbd49b-6bd1-4d30-92b1-cf3b695fc2d0'::uuid, '238845ed-8c5b-4d33-9866-bb4e706b90b2'::uuid, NULL, NULL, 'apartment', NULL, [object Object], NULL, 'active', NULL, '2025-10-23T01:36:35.56543+00:00'::timestamptz, '2025-10-23T01:36:35.56543+00:00'::timestamptz),
('da83937b-ee2d-438a-bc04-c90660225153'::uuid, '238845ed-8c5b-4d33-9866-bb4e706b90b2'::uuid, NULL, NULL, 'room', NULL, [object Object], NULL, 'active', NULL, '2025-10-23T01:36:35.899844+00:00'::timestamptz, '2025-10-23T01:36:35.899844+00:00'::timestamptz);

-- ========================================
-- TABLE 5: hotel_operations (10 rows)
-- ========================================
INSERT INTO hotel_operations (
  id,
  tenant_id,
  operation_type,
  staff_user_id,
  description,
  status,
  scheduled_at,
  completed_at,
  metadata,
  created_at,
  updated_at
) VALUES
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, NULL, NULL, NULL, NULL, NULL, '{}'::jsonb, '2025-10-01T03:54:09.587468+00:00'::timestamptz, '2025-10-01T03:54:09.587468+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, NULL, NULL, NULL, NULL, NULL, '{}'::jsonb, '2025-10-01T03:54:09.587468+00:00'::timestamptz, '2025-10-01T03:54:09.587468+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, NULL, NULL, NULL, NULL, NULL, '{}'::jsonb, '2025-10-01T03:54:09.587468+00:00'::timestamptz, '2025-10-01T03:54:09.587468+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, NULL, NULL, NULL, NULL, NULL, '{}'::jsonb, '2025-10-01T03:54:09.587468+00:00'::timestamptz, '2025-10-01T03:54:09.587468+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, NULL, NULL, NULL, NULL, NULL, '{}'::jsonb, '2025-10-01T03:54:09.587468+00:00'::timestamptz, '2025-10-01T03:54:09.587468+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, NULL, NULL, NULL, NULL, NULL, '{}'::jsonb, '2025-10-01T03:54:09.587468+00:00'::timestamptz, '2025-10-01T03:54:09.587468+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, NULL, NULL, NULL, NULL, NULL, '{}'::jsonb, '2025-10-01T03:54:09.587468+00:00'::timestamptz, '2025-10-01T03:54:09.587468+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, NULL, NULL, NULL, NULL, NULL, '{}'::jsonb, '2025-10-01T03:54:09.587468+00:00'::timestamptz, '2025-10-01T03:54:09.587468+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, NULL, NULL, NULL, NULL, NULL, '{}'::jsonb, '2025-10-01T03:54:09.587468+00:00'::timestamptz, '2025-10-01T03:54:09.587468+00:00'::timestamptz),
(NULL, 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'::uuid, NULL, NULL, NULL, NULL, NULL, NULL, '{}'::jsonb, '2025-10-01T03:54:09.587468+00:00'::timestamptz, '2025-10-01T03:54:09.587468+00:00'::timestamptz);

-- ========================================
-- TABLE 6: accommodation_units_manual (8 rows)
-- ========================================
INSERT INTO accommodation_units_manual (
  id,
  public_unit_id,
  manual_content,
  content_type,
  metadata,
  created_at,
  updated_at
) VALUES
(NULL, NULL, '
# Manual Operativo - Habitación Natural Mystic

¡Bienvenid@ a Simmer Down Guest House – Habitación Natural Mystic!

Gracias por elegirnos. En este manual encontrarás toda la información necesaria para tu llegada y estadía.

---

## Información de Llegada {#llegada}

### Tarjeta de Turismo Obligatoria
**Q: ¿Necesito algún documento especial para entrar a San Andrés?**
**A:**
- **Requisito**: Todas las personas mayores de 7 años deben pagar la tarjeta de turismo
- **Dónde**: Se adquiere en el aeropuerto de origen
- **Costo**: $137.000 COP
- **Dirección a registrar**: Barrio Sarie Bay, posada Simmer Down

### Ubicación del Alojamiento
**Q: ¿Dónde está ubicado Simmer Down?**
**A:**
- **Barrio**: Sarie Bay, San Andrés
- **Referencia principal**: 150 metros después del supermercado Super Todo Express
- **Edificio**: Primer edificio de la calle
- **Características distintivas**:
  - Puerta enrollable color morado
  - Dos letreros con el nombre "Simmer Down"
  - Varias puertas de aluminio color natural
- **Nombre anterior**: Edificio Gallo de Oro (residencia de la Sra. María Said)

**Link de ubicación**: https://maps.app.goo.gl/WnmKPncxLc8Dx4Qo9

### Instrucciones para Llegar Caminando
**Q: ¿Cómo llego caminando desde el aeropuerto?**
**A:**

**Ruta estándar:**
1. Dirígete al barrio Sarie Bay (pregunta su ubicación al salir del aeropuerto)
2. Entra al barrio girando en el único semáforo, frente al restaurante El Pescadero (Fisherman''s Place)
3. En la segunda cuadra, gira a la derecha
4. Camina dos cuadras y gira a la izquierda justo después del supermercado Super Todo Express
5. Simmer Down es el primer edificio de esa calle

**Ruta alternativa (más agradable):**
1. Sal del aeropuerto caminando hacia el norte hasta la playa
2. Pasa por la FAC, luego entre el restaurante The Islander y el hotel Decameron Isleño
3. Al llegar a la playa, gira a la izquierda
4. Pasa el letrero "I ❤️ San Andrés"
5. Desde ahí, sigue las instrucciones de la ruta estándar

**Pro tip**: Lleva agua y sombrero si haces este recorrido durante el día.

### Instrucciones para Llegar en Taxi
**Q: ¿Qué le digo al taxista?**
**A:**

**Instrucción principal**:
"Llévame a la posada Simmer Down en Sarie Bay, doblando a la izquierda justo después del supermercado Super Todo Express."

**Si no reconoce el lugar**:
"Es el edificio que antes se llamaba Edificio Gallo de Oro, donde vivía la Sra. María Said."

---

## Acceso y Claves {#acceso}

### Claves de Ingreso
**Q: ¿Qué claves necesito para entrar?**
**A:**
- **Edificio**: `C8712`
  - ⚠️ Presiona fuerte la letra C si es necesario
- **Apartamento Simmer Highs**: `3971`
- **Habitación Natural Mystic**: `3971`

### Ubicación de la Habitación
**Q: ¿Cómo llego a mi habitación una vez dentro del edificio?**
**A:**
1. Al entrar, sube hasta el último piso
2. Entra por la primera puerta a la derecha
3. Busca la puerta **Natural Mystic**

---

## Check-in y Check-out {#check-in-out}

### Horarios
**Q: ¿Cuáles son los horarios de check-in y check-out?**
**A:**
- **Check-in**: A partir de las 15:00
- **Check-out**: Antes de las 12:00

### Auto Registro (Self Check-in)
**Q: ¿Necesito hacer algún registro previo?**
**A:**

Por normas del Ministerio de Comercio y Migración Colombia, todos los alojamientos deben registrar los datos de sus huéspedes.

**Proceso**:
1. Completa el formulario online antes de tu llegada
2. Link: https://simmerdown.house/self-check-in/
3. Es obligatorio para todos los huéspedes

---

## Conectividad {#wifi}

### WiFi
**Q: ¿Cómo me conecto al WiFi?**
**A:**
- **Red**: `SIMMER_DOWN`
- **Contraseña**: `seeyousoon`
- **Disponibilidad**: Puedes conectarte gratis desde la puerta principal del edificio
- **Cobertura**: Excelente señal en toda la habitación

---

## Aire Acondicionado {#aire-acondicionado}

**Q: ¿Cómo funciona el aire acondicionado de la habitación?**
**A:**
- **Modelo**: Split convencional 12,000 BTU
- **Control remoto**: Con pantalla digital
- **Encendido**: Botón POWER
- **Temperatura recomendada**: 23-24°C
- **Modos**:
  - COOL: Enfriamiento
  - DRY: Deshumidificación
  - FAN: Solo ventilador
- **Timer**: Configurar apagado automático (2-8 horas)
- **Control**: En mesa de noche

---

## Entretenimiento {#entretenimiento}

### TV y Streaming
**Q: ¿Qué opciones de TV tengo?**
**A:**
- **TV**: Smart TV 32"
- **Montaje**: Pared (ángulo ajustable)
- **Netflix**: Acceso disponible
- **Cable**: Canales básicos
- **YouTube**: Acceso directo
- **Control**: Con botones de acceso rápido

### Música
- **Radio**: Reloj despertador con radio FM
- **Bluetooth**: Emparejar teléfono con TV para usar como parlante

---

## Seguridad {#seguridad}

### Caja Fuerte
- **Ubicación**: Closet, estante superior o medio
- **Tamaño**: Compacta a mediana (celular, billetera, pasaporte, posiblemente tablet)
- **Código**: Configurable por huésped
- **Instrucciones**: Ver manual en caja fuerte o solicitar asistencia en recepción

### Puerta
- **Llave**: Tradicional metálica
- **Cerrojo**: Manual interno (girar perilla)
- **Mirilla**: Para verificar visitantes

---

## Baño Privado {#bano}

### Ducha
**Q: ¿Cómo funciona la ducha de la habitación?**
**A:**
- **Tipo**: Ducha fija con cortina
- **Agua caliente**: Llave izquierda (roja)
- **Agua fría**: Llave derecha (azul)
- **Calentador**: Instantáneo, 30 seg para calentar
- **Presión**: Estándar, constante
- **Cortina**: Mantener dentro de bañera

### Amenities
- **Shampoo**: Dispensador pared
- **Jabón**: Dispensador cuerpo
- **Toallas**: 2 grandes, 1 mano, 1 piso
- **Papel higiénico**: Extra bajo lavamanos

---

## Utensilios y Artículos {#utensilios}

### Ropa y Accesorios
**Q: ¿Qué artículos están disponibles en la habitación?**
**A:**
- **Plancha**: Solicitar en recepción (no está en habitación)
- **Tabla planchar**: Área común piso 1
- **Secador pelo**: Gaveta baño
- **Perchas**: Disponibles en closet
- **Toallas extra**: Solicitar recepción

### Kit de Habitación
- **Vasos**: 2 de vidrio
- **Cubiertos**: Set básico (solicitar si necesitas)
- **Platos**: No incluidos (usar área común)

---

## Limpieza {#limpieza}

### Servicio de Habitación
- **Limpieza diaria**: Incluida (hacer camas, reponer toallas, vaciar basura)
- **Horario**: 10am-2pm
- **Cartel "No Molestar"**: Colgar en puerta si prefieres privacidad
- **Toallas**: Dejar en piso si quieres cambio

### Basura
- **Bote**: En habitación
- **Cambio bolsa**: Diario con limpieza
- **Reciclaje**: Llevar a contenedor pasillo

---

## Emergencias {#emergencias}

### Contactos
- **Recepción**: +57 318 812 3456 (WhatsApp 24/7)
- **Interno**: Marcar 0 desde teléfono habitación
- **Emergencias**: 123
- **Médico**: 125

### Equipos
- **Extintor**: Pasillo junto a escaleras
- **Botiquín**: Recepción (solicitar)
- **Detector humo**: Techo habitación

---

## Recomendaciones Importantes {#recomendaciones}

### Cuidado del Alojamiento
**Q: ¿Qué debo tener en cuenta durante mi estadía?**
**A:**

**Llegada**:
- Llega con el celular cargado
- Puedes imprimir estas instrucciones o enviarlas a tu acompañante

**Playa y Arena**:
- Usa la trampa de arena frente a las escaleras para quitarte la arena al regresar
- No subas con los pies mojados - sécate bien antes de salir de la trampa
- No uses las toallas del alojamiento para la playa

**Limpieza**:
- Deposita tu basura en la caseta metálica frente al edificio (a la izquierda)
- Mantén el orden en la habitación

**Energía**:
- Apaga el aire acondicionado cuando salgas
- Ayúdanos a cuidar el medio ambiente

**Seguridad**:
- No dejes la puerta de tu habitación abierta
- Todas las puertas tienen cerradura electrónica
- Cuida la lencería del alojamiento

---

## Información Adicional {#info-adicional}

### Guía Completa en Línea
**Q: ¿Dónde encuentro más información?**
**A:**

Tenemos una guía completa en línea con información detallada sobre:
- Amenidades de la habitación
- Servicios del edificio
- Recomendaciones locales
- Y mucho más

**Acceso**:
- Link: https://simmerdown.house/instrucciones/habitacion-natural-mystic/
- Clave: `3971`
- Idiomas disponibles: Español, Inglés, Portugués

**Versión offline**: Este documento es una versión básica útil si no tienes conexión a internet.

### Contacto
**Q: ¿Cómo puedo contactar a recepción?**
**A:**
- **WhatsApp**: +57 318 812 3456
- **Email**: recepcion@simmerdown.house
- **Horario**: 24/7 para emergencias

---

## Tips Específicos Natural Mystic {#tips-especificos}

### Características
- **Diseño**: Habitación acogedora con buena distribución
- **Ubicación**: Último piso en apartamento Simmer Highs
- **Privacidad**: Habitación independiente con baño privado

### Servicios Adicionales
- **Desayuno**: Área común planta baja (7-10am) - adicional
- **Cocina compartida**: Planta baja, uso libre
- **Lavandería**: Autoservicio ($15.000 COP/carga)
- **Zona TV**: Sala común con TV grande

### Comodidades
- **Ventana**: Buena ventilación natural
- **Acceso**: Último piso (mejores vistas)
- **Tranquilidad**: Ubicación con buen nivel de privacidad

---

## Resumen Rápido {#resumen}

### Datos Esenciales

**Ubicación**:
- 📍 Sarie Bay, después del Super Todo Express
- 🗺️ https://maps.app.goo.gl/WnmKPncxLc8Dx4Qo9

**Claves**:
- 🏢 Edificio: `C8712` (presiona fuerte la C)
- 🏠 Apartamento Simmer Highs: `3971`
- 🚪 Habitación Natural Mystic: `3971`

**WiFi**:
- 📶 Red: `SIMMER_DOWN`
- 🔐 Contraseña: `seeyousoon`

**Horarios**:
- ⏰ Check-in: 15:00
- ⏰ Check-out: 12:00

**Links Importantes**:
- 📝 Self check-in: https://simmerdown.house/self-check-in/
- 📱 Guía completa: https://simmerdown.house/instrucciones/habitacion-natural-mystic/ (clave: 3971)

---

**Última actualización**: Enero 2025
**Versión**: 2.0 (Real)
**Contacto**: recepcion@simmerdown.house
', NULL, '{}'::jsonb, '2025-10-24T00:24:46.517701+00:00'::timestamptz, '2025-10-24T04:17:08.639812+00:00'::timestamptz),
(NULL, NULL, '
# Manual Operativo - Habitación Kaya

¡Bienvenid@ a Simmer Down Guest House – Habitación Kaya!

Gracias por elegirnos. En este manual encontrarás toda la información necesaria para tu llegada y estadía.

---

## Información de Llegada {#llegada}

### Tarjeta de Turismo Obligatoria
**Q: ¿Necesito algún documento especial para entrar a San Andrés?**
**A:**
- **Requisito**: Todas las personas mayores de 7 años deben pagar la tarjeta de turismo
- **Dónde**: Se adquiere en el aeropuerto de origen
- **Costo**: $137.000 COP
- **Dirección a registrar**: Barrio Sarie Bay, posada Simmer Down

### Ubicación del Alojamiento
**Q: ¿Dónde está ubicado Simmer Down?**
**A:**
- **Barrio**: Sarie Bay, San Andrés
- **Referencia principal**: 150 metros después del supermercado Super Todo Express
- **Edificio**: Primer edificio de la calle
- **Características distintivas**:
  - Puerta enrollable color morado
  - Dos letreros con el nombre "Simmer Down"
  - Varias puertas de aluminio color natural
- **Nombre anterior**: Edificio Gallo de Oro (residencia de la Sra. María Said)

**Link de ubicación**: https://maps.app.goo.gl/WnmKPncxLc8Dx4Qo9

### Instrucciones para Llegar Caminando
**Q: ¿Cómo llego caminando desde el aeropuerto?**
**A:**

**Ruta estándar:**
1. Dirígete al barrio Sarie Bay (pregunta su ubicación al salir del aeropuerto)
2. Entra al barrio girando en el único semáforo, frente al restaurante El Pescadero (Fisherman''s Place)
3. En la segunda cuadra, gira a la derecha
4. Camina dos cuadras y gira a la izquierda justo después del supermercado Super Todo Express
5. Simmer Down es el primer edificio de esa calle

**Ruta alternativa (más agradable):**
1. Sal del aeropuerto caminando hacia el norte hasta la playa
2. Pasa por la FAC, luego entre el restaurante The Islander y el hotel Decameron Isleño
3. Al llegar a la playa, gira a la izquierda
4. Pasa el letrero "I ❤️ San Andrés"
5. Desde ahí, sigue las instrucciones de la ruta estándar

**Pro tip**: Lleva agua y sombrero si haces este recorrido durante el día.

### Instrucciones para Llegar en Taxi
**Q: ¿Qué le digo al taxista?**
**A:**

**Instrucción principal**:
"Llévame a la posada Simmer Down en Sarie Bay, doblando a la izquierda justo después del supermercado Super Todo Express."

**Si no reconoce el lugar**:
"Es el edificio que antes se llamaba Edificio Gallo de Oro, donde vivía la Sra. María Said."

---

## Acceso y Claves {#acceso}

### Claves de Ingreso
**Q: ¿Qué claves necesito para entrar?**
**A:**
- **Edificio**: `C8712`
  - ⚠️ Presiona fuerte la letra C si es necesario
- **Apartamento Simmer Highs**: `1397`
- **Habitación Kaya**: `1397`

### Ubicación de la Habitación
**Q: ¿Cómo llego a mi habitación una vez dentro del edificio?**
**A:**
1. Al entrar, sube hasta el último piso
2. Entra por la primera puerta a la derecha
3. Busca la puerta al final del pasillo marcada como **Kaya**

---

## Check-in y Check-out {#check-in-out}

### Horarios
**Q: ¿Cuáles son los horarios de check-in y check-out?**
**A:**
- **Check-in**: A partir de las 15:00
- **Check-out**: Antes de las 12:00

### Auto Registro (Self Check-in)
**Q: ¿Necesito hacer algún registro previo?**
**A:**

Por normas del Ministerio de Comercio y Migración Colombia, todos los alojamientos deben registrar los datos de sus huéspedes.

**Proceso**:
1. Completa el formulario online antes de tu llegada
2. Link: https://simmerdown.house/self-check-in/
3. Es obligatorio para todos los huéspedes

---

## Conectividad {#wifi}

### WiFi
**Q: ¿Cómo me conecto al WiFi?**
**A:**
- **Red**: `SIMMER_DOWN`
- **Contraseña**: `seeyousoon`
- **Disponibilidad**: Puedes conectarte gratis desde la puerta principal del edificio
- **Cobertura**: Excelente señal en toda la habitación

---

## Características de la Habitación {#habitacion}

### Descripción General
La habitación Kaya está ubicada en el último piso del edificio, ofreciendo privacidad y buena ventilación. Es identificable por su nombre Kaya en misma puerta al final del pasillo.

### Amenidades
Para información detallada sobre las amenidades específicas de la habitación (aire acondicionado, TV, baño, etc.), puedes:
- Consultar la guía completa en línea: https://simmerdown.house/instrucciones/habitacion-kaya/ (clave: `1397`)
- Contactar a recepción: +57 318 812 3456 (WhatsApp)

---

## Recomendaciones Importantes {#recomendaciones}

### Cuidado del Alojamiento
**Q: ¿Qué debo tener en cuenta durante mi estadía?**
**A:**

**Llegada**:
- Llega con el celular cargado

**Playa y Arena**:
- Usa la trampa de arena frente a las escaleras para quitarte la arena al regresar
- No subas con los pies mojados - sécate bien antes de salir de la trampa
- No uses las toallas del alojamiento para la playa

**Limpieza**:
- Deposita tu basura en la caseta metálica frente al edificio (a la izquierda)
- Mantén el orden en la habitación

**Energía**:
- Apaga el aire acondicionado cuando salgas
- Ayúdanos a cuidar el medio ambiente

**Seguridad**:
- No dejes la puerta de tu habitación abierta
- Todas las puertas tienen cerradura electrónica
- Cuida la lencería del alojamiento

---

## Información Adicional {#info-adicional}

### Guía Completa en Línea
**Q: ¿Dónde encuentro más información?**
**A:**

Tenemos una guía completa en línea con información detallada sobre:
- Amenidades de la habitación
- Servicios del edificio
- Recomendaciones locales
- Y mucho más

**Acceso**:
- Link: https://simmerdown.house/instrucciones/habitacion-kaya/
- Clave: `1397`
- Idiomas disponibles: Español, Inglés, Portugués

**Versión offline**: Este documento es una versión básica útil si no tienes conexión a internet.

### Contacto
**Q: ¿Cómo puedo contactar a recepción?**
**A:**
- **WhatsApp**: +57 318 812 3456
- **Email**: stay@simmerdown.house
- **Horario**: 24/7 para emergencias

---

## Resumen Rápido {#resumen}

### Datos Esenciales

**Ubicación**:
- 📍 Sarie Bay, después del Super Todo Express
- 🗺️ https://maps.app.goo.gl/WnmKPncxLc8Dx4Qo9

**Claves**:
- 🏢 Edificio: `C8712` (presiona fuerte la C)
- 🏠 Apartamento Simmer Highs: `1397`
- 🚪 Habitación Kaya: `1397`

**WiFi**:
- 📶 Red: `SIMMER_DOWN`
- 🔐 Contraseña: `seeyousoon`

**Horarios**:
- ⏰ Check-in: 15:00
- ⏰ Check-out: 12:00

**Links Importantes**:
- 📝 Self check-in: https://simmerdown.house/self-check-in/
- 📱 Guía completa: https://simmerdown.house/instrucciones/habitacion-kaya/ (clave: 1397)

---

**Última actualización**: Enero 2025
**Versión**: 2.0 (Real)
**Contacto**: recepcion@simmerdown.house
', NULL, '{}'::jsonb, '2025-10-24T00:24:47.922821+00:00'::timestamptz, '2025-10-24T04:17:10.582827+00:00'::timestamptz),
(NULL, NULL, '
# Manual Operativo - Habitación Jammin''

¡Bienvenid@ a Simmer Down Guest House – Habitación Jammin''!

Gracias por elegirnos. En este manual encontrarás toda la información necesaria para tu llegada y estadía.

---

## Información de Llegada {#llegada}

### Tarjeta de Turismo Obligatoria
**Q: ¿Necesito algún documento especial para entrar a San Andrés?**
**A:**
- **Requisito**: Todas las personas mayores de 7 años deben pagar la tarjeta de turismo
- **Dónde**: Se adquiere en el aeropuerto de origen
- **Costo**: $137.000 COP
- **Dirección a registrar**: Barrio Sarie Bay, posada Simmer Down

### Ubicación del Alojamiento
**Q: ¿Dónde está ubicado Simmer Down?**
**A:**
- **Barrio**: Sarie Bay, San Andrés
- **Referencia principal**: 150 metros después del supermercado Super Todo Express
- **Edificio**: Primer edificio de la calle
- **Características distintivas**:
  - Puerta enrollable color morado
  - Dos letreros con el nombre "Simmer Down"
  - Varias puertas de aluminio color natural
- **Nombre anterior**: Edificio Gallo de Oro (residencia de la Sra. María Said)

**Link de ubicación**: https://maps.app.goo.gl/WnmKPncxLc8Dx4Qo9

### Instrucciones para Llegar Caminando
**Q: ¿Cómo llego caminando desde el aeropuerto?**
**A:**

**Ruta estándar:**
1. Dirígete al barrio Sarie Bay (pregunta su ubicación al salir del aeropuerto)
2. Entra al barrio girando en el único semáforo, frente al restaurante El Pescadero (Fisherman''s Place)
3. En la segunda cuadra, gira a la derecha
4. Camina dos cuadras y gira a la izquierda justo después del supermercado Super Todo Express
5. Simmer Down es el primer edificio de esa calle

**Ruta alternativa (más agradable):**
1. Sal del aeropuerto caminando hacia el norte hasta la playa
2. Pasa por la FAC, luego entre el restaurante The Islander y el hotel Decameron Isleño
3. Al llegar a la playa, gira a la izquierda
4. Pasa el letrero "I ❤️ San Andrés"
5. Desde ahí, sigue las instrucciones de la ruta estándar

**Pro tip**: Lleva agua y sombrero si haces este recorrido durante el día.

### Instrucciones para Llegar en Taxi
**Q: ¿Qué le digo al taxista?**
**A:**

**Instrucción principal**:
"Llévame a la posada Simmer Down en Sarie Bay, doblando a la izquierda justo después del supermercado Super Todo Express."

**Si no reconoce el lugar**:
"Es el edificio que antes se llamaba Edificio Gallo de Oro, donde vivía la Sra. María Said."

---

## Acceso y Claves {#acceso}

### Claves de Ingreso
**Q: ¿Qué claves necesito para entrar?**
**A:**
- **Edificio**: `C8712`
  - ⚠️ Presiona fuerte la letra C si es necesario
- **Apartamento Simmer Highs**: `4268`
- **Habitación Jammin''**: `4268`

### Ubicación de la Habitación
**Q: ¿Cómo llego a mi habitación una vez dentro del edificio?**
**A:**
1. Al entrar, sube hasta el último piso
2. Entra por la primera puerta a la derecha
3. Busca la puerta marcada como **Jammin''**

---

## Check-in y Check-out {#check-in-out}

### Horarios
**Q: ¿Cuáles son los horarios de check-in y check-out?**
**A:**
- **Check-in**: A partir de las 15:00
- **Check-out**: Antes de las 12:00

### Auto Registro (Self Check-in)
**Q: ¿Necesito hacer algún registro previo?**
**A:**

Por normas del Ministerio de Comercio y Migración Colombia, todos los alojamientos deben registrar los datos de sus huéspedes.

**Proceso**:
1. Completa el formulario online antes de tu llegada
2. Link: https://simmerdown.house/self-check-in/
3. Es obligatorio para todos los huéspedes

---

## Conectividad {#wifi}

### WiFi
**Q: ¿Cómo me conecto al WiFi?**
**A:**
- **Red**: `SIMMER_DOWN`
- **Contraseña**: `seeyousoon`
- **Disponibilidad**: Puedes conectarte gratis desde la puerta principal del edificio
- **Cobertura**: Excelente señal en toda la habitación

---

## Aire Acondicionado {#aire-acondicionado}

**Q: ¿Cómo funciona el aire acondicionado de la habitación?**
**A:**
- **Modelo**: Split convencional 12,000 BTU
- **Control remoto**: Con pantalla digital
- **Encendido**: Botón POWER
- **Temperatura recomendada**: 23-24°C
- **Modos**:
  - COOL: Enfriamiento
  - DRY: Deshumidificación
  - FAN: Solo ventilador
- **Timer**: Configurar apagado automático (2-8 horas)
- **Control**: En mesa de noche

---

## Mini-Cocina y Electrodomésticos {#mini-cocina}

### Área de Preparación Básica
**Q: ¿Qué facilidades de cocina tiene la habitación?**
**A:**
- **Mini-refrigerador**: En área designada
  - Aproximadamente 3.5-4 pies cúbicos
  - Temperatura fija óptima
  - Compartimento hielo pequeño
  - Ideal: Bebidas, frutas, snacks

### Cafetera de Habitación
- **Tipo**: Cafetera eléctrica (preparación básica)
- **Ubicación**: Área de bebidas
- **Uso**:
  - Llenar tanque con agua
  - Agregar café
  - Presionar botón
  - Tiempo de preparación: 3-5 minutos
- **Suministros**: Café disponible en canasta de bienvenida

### Hervidor Eléctrico
- **Para**: Té, chocolate, sopas instantáneas
- **Capacidad**: Aproximadamente 1 litro
- **Tiempo**: Agua hirviendo en 2-3 minutos
- **Auto-apagado**: Seguridad automática

**NO incluye**: Estufa, microondas (disponibles en área común cocina compartida planta baja)

---

## Entretenimiento {#entretenimiento}

### TV y Streaming
**Q: ¿Qué opciones de TV tengo?**
**A:**
- **TV**: Smart TV 32"
- **Montaje**: Pared (ángulo ajustable)
- **Netflix**: Acceso disponible
- **Cable**: Canales básicos
- **YouTube**: Acceso directo
- **Control**: Con botones de acceso rápido

### Música
- **Radio**: Reloj despertador con radio FM
- **Bluetooth**: Emparejar teléfono con TV para usar como parlante

---

## Seguridad {#seguridad}

### Caja Fuerte
- **Ubicación**: Closet, estante superior o medio
- **Tamaño**: Compacta a mediana (celular, billetera, pasaporte, posiblemente tablet)
- **Código**: Configurable por huésped
- **Instrucciones**: Ver manual en caja fuerte o solicitar asistencia en recepción

### Puerta
- **Llave**: Tradicional metálica
- **Cerrojo**: Manual interno (girar perilla)
- **Mirilla**: Para verificar visitantes

---

## Baño Privado {#bano}

### Ducha
**Q: ¿Cómo funciona la ducha de la habitación?**
**A:**
- **Tipo**: Ducha fija con cortina
- **Agua caliente**: Llave izquierda (roja)
- **Agua fría**: Llave derecha (azul)
- **Calentador**: Instantáneo, 30 seg para calentar
- **Presión**: Estándar, constante
- **Cortina**: Mantener dentro de bañera

### Amenities
- **Shampoo**: Dispensador pared
- **Jabón**: Dispensador cuerpo
- **Toallas**: 2 grandes, 1 mano, 1 piso
- **Papel higiénico**: Extra bajo lavamanos

---

## Utensilios y Artículos {#utensilios}

### Ropa y Accesorios
**Q: ¿Qué artículos están disponibles en la habitación?**
**A:**
- **Plancha**: Solicitar en recepción (no está en habitación)
- **Tabla planchar**: Área común piso 1
- **Secador pelo**: Gaveta baño
- **Perchas**: Disponibles en closet
- **Toallas extra**: Solicitar recepción

### Kit de Habitación
- **Vasos**: 2 de vidrio
- **Cubiertos**: Set básico (solicitar si necesitas)
- **Platos**: No incluidos (usar área común)

---

## Limpieza {#limpieza}

### Servicio de Habitación
- **Limpieza diaria**: Incluida (hacer camas, reponer toallas, vaciar basura)
- **Horario**: 10am-2pm
- **Cartel "No Molestar"**: Colgar en puerta si prefieres privacidad
- **Toallas**: Dejar en piso si quieres cambio

### Basura
- **Bote**: En habitación
- **Cambio bolsa**: Diario con limpieza
- **Reciclaje**: Llevar a contenedor pasillo

---

## Área de Trabajo {#area-trabajo}

### Escritorio
- **Ubicación**: Junto a ventana u otra área designada
- **Silla**: Ergonómica o cómoda
- **Luz**: Lámpara de escritorio LED
- **Enchufes**: Tomas disponibles
- **USB**: Puertos de carga (si disponible)

---

## Closet y Almacenamiento {#closet}

### Espacios
- **Closet abierto**: Con barra para colgar
- **Estantes**: Niveles para ropa doblada
- **Caja fuerte**: Estante superior o medio
- **Maletas**: Espacio para guardar

---

## Emergencias {#emergencias}

### Contactos
- **Recepción**: +57 318 812 3456 (WhatsApp 24/7)
- **Interno**: Marcar 0 desde teléfono habitación
- **Emergencias**: 123
- **Médico**: 125

### Equipos
- **Extintor**: Pasillo junto a escaleras
- **Botiquín**: Recepción (solicitar)
- **Detector humo**: Techo habitación

---

## Recomendaciones Importantes {#recomendaciones}

### Cuidado del Alojamiento
**Q: ¿Qué debo tener en cuenta durante mi estadía?**
**A:**

**Llegada**:
- Llega con el celular cargado
- Puedes imprimir estas instrucciones o enviarlas a tu acompañante

**Playa y Arena**:
- Usa la trampa de arena frente a las escaleras para quitarte la arena al regresar
- No subas con los pies mojados - sécate bien antes de salir de la trampa
- No uses las toallas del alojamiento para la playa

**Limpieza**:
- Deposita tu basura en la caseta metálica frente al edificio (a la izquierda)
- Mantén el orden en la habitación

**Energía**:
- Apaga el aire acondicionado cuando salgas
- Ayúdanos a cuidar el medio ambiente

**Seguridad**:
- No dejes la puerta de tu habitación abierta
- Todas las puertas tienen cerradura electrónica
- Cuida la lencería del alojamiento

---

## Información Adicional {#info-adicional}

### Guía Completa en Línea
**Q: ¿Dónde encuentro más información?**
**A:**

Tenemos una guía completa en línea con información detallada sobre:
- Amenidades de la habitación
- Servicios del edificio
- Recomendaciones locales
- Y mucho más

**Acceso**:
- Link: https://simmerdown.house/instrucciones/habitacion-jammin/
- Clave: `4268`
- Idiomas disponibles: Español, Inglés, Portugués

**Versión offline**: Este documento es una versión básica útil si no tienes conexión a internet.

### Contacto
**Q: ¿Cómo puedo contactar a recepción?**
**A:**
- **WhatsApp**: +57 318 812 3456
- **Email**: recepcion@simmerdown.house
- **Horario**: 24/7 para emergencias

---

## Tips Específicos Jammin'' {#tips-especificos}

### Características
- **Diseño**: Habitación acogedora con buena distribución
- **Ubicación**: Piso superior en apartamento Simmer Highs
- **Privacidad**: Habitación independiente con baño privado

### Recomendaciones
- **Mini-fridge**: Mantén bebidas frías y snacks
- **Hervidor**: Té nocturno o café matutino rápido
- **AC**: 23-24°C es temperatura ideal
- **Escritorio**: Perfecto para trabajo remoto/estudio

### Servicios Adicionales
- **Desayuno**: Área común planta baja (7-10am) - adicional
- **Cocina compartida**: Planta baja, uso libre
- **Lavandería**: Autoservicio ($15.000 COP/carga)
- **Zona TV**: Sala común con TV grande

### Comodidades
- **Ventana**: Buena ventilación natural
- **Acceso**: Fácil salida/entrada del edificio
- **Tranquilidad**: Ubicación con buen nivel de privacidad

---

## Resumen Rápido {#resumen}

### Datos Esenciales

**Ubicación**:
- 📍 Sarie Bay, después del Super Todo Express
- 🗺️ https://maps.app.goo.gl/WnmKPncxLc8Dx4Qo9

**Claves**:
- 🏢 Edificio: `C8712` (presiona fuerte la C)
- 🏠 Apartamento Simmer Highs: `4268`
- 🚪 Habitación Jammin'': `4268`

**WiFi**:
- 📶 Red: `SIMMER_DOWN`
- 🔐 Contraseña: `seeyousoon`

**Horarios**:
- ⏰ Check-in: 15:00
- ⏰ Check-out: 12:00

**Links Importantes**:
- 📝 Self check-in: https://simmerdown.house/self-check-in/
- 📱 Guía completa: https://simmerdown.house/instrucciones/habitacion-jammin/ (clave: 4268)

---

**Última actualización**: Enero 2025
**Versión**: 2.0 (Real)
**Contacto**: recepcion@simmerdown.house
', NULL, '{}'::jsonb, '2025-10-24T00:24:49.321962+00:00'::timestamptz, '2025-10-24T04:17:12.275365+00:00'::timestamptz),
(NULL, NULL, '
# Manual Operativo - Apartamento Sunshine

## Aire Acondicionado {#aire-acondicionado}

**Q: ¿Cómo funciona el aire acondicionado del Sunshine?**
**A:** Apartamento en tercer piso con sistema de climatización eficiente:

- **Modelo**: Split inverter 24,000 BTU (mayor potencia por altura)
- **Control**: Remoto touch con pantalla LED
- **Encendido**: Touch en icono power
- **Temperatura**: Recomendada 22-23°C (piso alto calienta más)
- **Modo TURBO**: Botón especial para enfriamiento rápido (15 min)
- **Swing**: Aletas direccionales automáticas (distribuye aire)
- **Sleep mode**: Incrementa 1°C cada hora (ahorro nocturno)
- **Ubicación**: Pared lateral dormitorio, flujo hacia sala

**IMPORTANTE**: Tercer piso recibe más sol, AC tarda 20 min en enfriar completamente

## Cocina y Electrodomésticos {#cocina-electrodomesticos}

### Estufa Vitrocerámica
**Q: ¿Cómo funciona la estufa moderna del Sunshine?**
**A:**
- **Tipo**: Vitrocerámica 2 zonas (superficie lisa vidrio negro)
- **Encendido**: Touch panel frontal
- **Zonas**:
  - Grande (28cm): Ollas grandes, arroces
  - Pequeña (18cm): Sartenes, sopas pequeñas
- **Niveles**: 0-9 (0=apagado, 9=máximo)
- **Indicador calor**: Luz roja "H" mientras está caliente
- **Limpieza**: Esperar enfriamiento, pasar paño húmedo
- **CUIDADO**: Superficie se ve fría pero puede estar caliente (ver luz H)

### Cafetera Eléctrica Programable
- **Modelo**: Cafetera con timer 12 tazas
- **Programa**: Configurar noche anterior para café matutino
  - Botón PROG + hora deseada
  - Llenar agua y café
  - Luz verde confirma programación
- **Jarra térmica**: Mantiene calor 4 horas
- **Auto-apagado**: 2 horas después de preparar

### Refrigerador con Freezer
- **Capacidad**: 16 pies cúbicos
- **Control digital**: Panel frontal con temperatura visible
- **Freezer**: Sección inferior con gavetas
- **Ice maker**: Automático (cubos listos en 3 horas)
- **Dispensador**: Agua fría en puerta

### Combo Microondas-Grill
- **Potencia**: 1000W microondas + 1200W grill
- **Funciones**:
  - Microondas: Calentar rápido
  - Grill: Dorar/gratinar superior
  - Combo: Microondas + grill simultáneo
- **Panel digital**: Touch screen intuitivo
- **Recetas pre-programadas**: Pizza, palomitas, vegetales

## Entretenimiento {#entretenimiento}

### Home Theater
**Q: ¿Qué sistema de entretenimiento tiene el Sunshine?**
**A:**
- **TV**: LG OLED 55" 4K HDR
- **Sonido**: Sistema 2.1 (2 parlantes + subwoofer)
- **Streaming integrado**:
  - Netflix (botón directo)
  - Prime Video
  - Disney+
  - YouTube
  - Spotify
- **Control universal**: Maneja TV + sonido + streaming

### Terraza Azotea (Acceso Especial)
- **Privilegio**: Huéspedes Sunshine tienen acceso a azotea
- **Ubicación**: Escalera al final del pasillo 3er piso
- **Horario**: 6am-10pm
- **Amenities**: Sillas, hamaca, vista 360°
- **Atardecer**: Mejor vista del edificio (6pm)

## Conectividad {#conectividad}

### WiFi Premium
- **Red**: `SimmerDown-Sunshine`
- **Contraseña**: `Sun5hine!2024`
- **Velocidad**: 120 Mbps fibra óptica
- **Router**: WiFi 6 última generación en apartamento
- **Mesh**: Cobertura perfecta incluso en azotea
- **Dispositivos**: Hasta 15 simultáneos

## Seguridad {#seguridad}

### Caja Fuerte Digital Avanzada
- **Ubicación**: Closet principal, empotrada en pared
- **Tamaño**: Extra grande (laptop 17" cabe)
- **Sistema**: Biométrico (huella) + código
- **Código maestro**: `7890`
- **Configuración**:
  1. Abrir con 7890
  2. Menú > New User
  3. Registrar huella (índice derecho)
  4. Crear código backup (6 dígitos)
  5. Confirmar
- **Apertura**: Huella O código backup
- **Batería**: Indicador LED, avisar recepción si parpadea rojo

### Cerradura Electrónica
- **Sistema**: Código + tarjeta + app
- **Código personal**: Te lo damos en check-in
- **Tarjeta**: 2 tarjetas RFID incluidas
- **App**: SimmerLock (opcional, pedir en recepción)
- **Batería**: AAA x4, duran 6 meses

## Utensilios y Artículos {#utensilios-articulos}

### Centro de Planchado Premium
- **Plancha**: Rowenta profesional con sistema anti-cal
- **Tabla**: Altura ajustable con brazo para mangas
- **Ubicación**: Closet utilitario dedicado
- **Agua**: Usar agua filtrada (jarra Brita en refrigerador)

### Kit de Baño De Lujo
- **Secador**: Dyson Supersonic (alta gama)
- **Rizador**: Disponible bajo solicitud
- **Espejo**: LED con 3 niveles intensidad
- **Balanza**: Digital inteligente (BMI)

### Toallas Premium
- **Calidad**: Algodón turco 700 hilos
- **Set completo**: 4 baño, 3 manos, 2 pies, 1 playa
- **Cambio**: Diario bajo solicitud
- **Batas**: 2 batas de baño colgadas en baño

## Baño {#bano}

### Ducha Rain Shower
**Q: ¿Cómo es el sistema de ducha del Sunshine?**
**A:**
- **Tipo**: Ducha de lluvia 30cm + regadera manual
- **Control**: Termostático (temperatura constante)
- **Ajuste**:
  - Dial izquierdo: Temperatura (marcas graduadas)
  - Dial derecho: Presión agua
  - Botón central: Alternar lluvia/manual/ambos
- **Temperatura**: Ajustar una vez, mantiene constante
- **Ventajas**: No hay cambios bruscos temperatura

### Amenities Premium
- **Shampoo/Acondicionador**: Marca profesional (Natura)
- **Gel de ducha**: Aromático (coco/vainilla)
- **Jabón manos**: Líquido antibacterial
- **Exfoliante corporal**: Disponible
- **Cremas**: Facial + corporal en mesón
- **Kit dental**: Cepillo + pasta bajo solicitud

## Limpieza {#limpieza}

### Centro de Limpieza
- **Aspiradora robot**: Roomba programable
  - Botón CLEAN para limpieza inmediata
  - Programar: Botón SCHEDULE (auto-limpieza diaria)
- **Aspiradora manual**: Inalámbrica Dyson
- **Mopa vapor**: Para pisos
- **Productos eco-friendly**: Bajo fregadero

### Servicio de Limpieza
- **Incluido**: Limpieza cada 3 días
- **Extra**: Solicitar limpieza adicional ($40.000 COP)
- **Express**: Limpieza parcial diaria (hacer camas, baño) - cortesía

## Emergencias {#emergencias}

### Contactos
- **Recepción**: +57 318 812 3456 (WhatsApp prioritario)
- **Seguridad edificio**: Ext 100 desde teléfono apartamento
- **Emergencias**: 123
- **Clínica 24h**: +57 8 512 3030

### Equipos
- **Extintor**: 2 unidades (cocina + pasillo)
- **Detector humo**: Con alarma sonora
- **Detector CO**: En cocina
- **Botiquín premium**: Baño, incluye termómetro digital

## Dormitorios y Espacios {#dormitorios-espacios}

### Dormitorio Principal
- **Cama**: King size con colchón memory foam
- **Blackout**: Cortinas 100% oscurecimiento
- **Lighting**: Luces LED regulables (control táctil)
- **USB**: Puertos carga ambos lados cama

### Sala de Estar
- **Sofá-cama**: Queen size (3ra persona)
- **Mecanismo**: Fácil despliegue (una persona puede)
- **Colchón**: Espuma alta densidad

### Terraza Privada
- **Mesa**: Para 4 personas
- **Sombrilla**: Protección solar
- **Luces**: Ambiente LED (switches junto a puerta)

## Tips Específicos Sunshine {#tips-especificos}

### Ventajas Piso Alto
- **Vista superior**: Mejor perspectiva de San Andrés
- **Privacidad**: Mayor tranquilidad
- **Azotea**: Acceso exclusivo para huéspedes Sunshine
- **Brisa**: Circulación aire natural superior

### Recomendaciones
- **Atardecer azotea**: Imperdible (llevar cámara + bebida)
- **AC matutino**: Encender 20 min antes si habitación caliente
- **Roomba**: Programar limpieza cuando salgas a playa
- **Terraza**: Desayunar allá es experiencia única

### Optimización
- **Cortinas blackout**: Perfectas para dormir hasta tarde
- **Smart lighting**: Programar luces según rutina
- **Sonido envolvente**: Perfecto para películas nocturnas
- **Azotea yoga**: Ideal 6-7am (tranquilo, fresco)

### Acceso Azotea
- **Llave especial**: Con tu set de llaves
- **Mobiliario**: No mover (es compartido)
- **Limpieza**: Llevarse vasos/botellas al bajar
- **Respeto**: Volumen moderado (otros apartamentos cerca)

---

**Última actualización**: Enero 2025
**Versión**: 1.0
**Contacto**: recepcion@simmerdown.house
', NULL, '{}'::jsonb, '2025-10-24T00:24:52.153597+00:00'::timestamptz, '2025-10-24T04:11:53.268936+00:00'::timestamptz),
(NULL, NULL, '
# Manual Operativo - Apartamento Summertime

## Aire Acondicionado {#aire-acondicionado}

**Q: ¿Cómo funciona el sistema de climatización del Summertime?**
**A:**
- **Modelo**: Aire acondicionado split 18,000 BTU
- **Control**: Remoto infrarrojo negro con pantalla LCD
- **Encendido**: Botón ON/OFF (icono power)
- **Temperatura**: Rango 18-30°C, recomendado 23°C
- **Modos disponibles**:
  - **COOL**: Enfriamiento estándar
  - **DRY**: Deshumidificador (ideal días húmedos)
  - **FAN**: Solo ventilador (sin enfriamiento)
  - **AUTO**: Ajuste automático según temperatura
- **Timer programable**: Configurar encendido/apagado automático (botón TIMER)
- **Ubicación**: Esquina dormitorio, orientación diagonal

**Tip de ahorro**: Usar modo DRY en días nublados consume 40% menos energía

## Cocina y Electrodomésticos {#cocina-electrodomesticos}

### Estufa Gas + Eléctrica (Híbrida)
**Q: ¿Cómo funciona la estufa híbrida?**
**A:**
- **2 quemadores gas**: Encender con encendedor (no automático)
  - Girar perilla mientras acercas llama
  - Quemador grande: Ollas grandes
  - Quemador pequeño: Sartenes
- **1 hornilla eléctrica**: Girar perilla (1-5)
  - Ideal para mantener temperatura constante
- **Seguridad**: Válvula gas en gabinete bajo estufa (cerrar si no usas varios días)

### Cafetera y Tetera
- **Cafetera prensa francesa**: En mesón
  - Café molido + agua caliente + 4 min
  - Presionar émbolo lentamente
- **Tetera silbato**: En hornilla gas
  - Llena agua, tapa, fuego medio
  - Silbato indica agua hirviendo (3-4 min)

### Refrigerador Compacto
- **Tamaño**: 12 pies cúbicos (óptimo para parejas)
- **Congelador**: Compartimento superior pequeño
- **Temperatura**: Dial 1-5, mantener en 3
- **Nota**: Si guardas mucho, tarda en enfriar nuevos items

### Tostadora y Sandwichera
- **Tostadora**: 2 ranuras, dial tostado (1-6)
- **Sandwichera eléctrica**: En gabinete bajo mesón
  - Precalentar 2 min (luz verde indica listo)
  - Perfecta para arepas, sandwiches, paninis

## Entretenimiento {#entretenimiento}

### TV y Streaming
**Q: ¿Qué servicios de TV tengo disponibles?**
**A:**
- **TV**: Panasonic 40" Smart TV
- **Ubicación**: Pared frente a cama (vista perfecta)
- **Netflix**: Botón rojo directo en control
- **Amazon Prime**: En menú apps
- **Cable**: 60 canales locales + internacionales
- **Casting**: Compatible Chromecast (castear desde teléfono)

### Audio
- **Parlante Bluetooth**: JBL Flip 5 en estante
  - Encender: Botón power (luz azul parpadea)
  - Emparejar: Bluetooth teléfono "JBL Flip 5"
  - Batería: 12 horas continuas
  - Carga: Cable USB-C en gaveta

## Conectividad {#conectividad}

### Internet
- **Red WiFi**: `SimmerDown-Summertime`
- **Contraseña**: `Summer2024Time!`
- **Router**: Instalado en apartamento (señal excelente)
- **Velocidad**: 60 Mbps
- **Tip**: Para videollamadas importantes, ubicarse cerca del router (closet entrada)

## Seguridad {#seguridad}

### Caja Fuerte Compacta
- **Ubicación**: Closet, estante superior derecho
- **Tamaño**: Mediana (pasaportes, celular, dinero)
- **Código maestro**: `5555`
- **Programar tu código**:
  - Abrir con 5555
  - Presionar `*` + nuevo código (4-6 dígitos) + `#`
  - Probar código antes de guardar objetos
- **Llave emergencia**: Con recepción

### Puertas y Seguridad
- **Puerta principal**: Cerradura convencional + cerrojo manual
- **Llave**: No perder (reposición $50.000 COP)
- **Ventanas**: Seguros en marco (girar para bloquear)

## Utensilios y Artículos {#utensilios-articulos}

### Plancha
- **Ubicación**: Closet pasillo, bolsa azul
- **Tipo**: Plancha seca (sin vapor)
- **Tabla**: Plegable, detrás puerta baño
- **Uso**: Enchufar, esperar luz indicadora, planchar

### Secador
- **Ubicación**: Gaveta del baño
- **Potencia**: 1600W, 2 velocidades
- **Cable**: 1.8m

### Toallas
- **Set inicial**: 2 grandes, 2 medianas por persona
- **Extra**: Estante baño
- **Cambio**: Día de por medio, o dejar en piso

### Kits de Cocina
- **Ollas**: 3 tamaños (grande, mediana, pequeña)
- **Sartenes**: 2 (grande antiadherente, pequeña normal)
- **Cubiertos**: Servicio para 4 personas
- **Vasos/Tazas**: 4 de cada uno
- **Platos**: 4 soperos, 4 llanos, 4 postre

## Baño {#bano}

### Ducha
**Q: ¿Cómo funciona el sistema de agua caliente?**
**A:**
- **Tipo**: Calentador eléctrico de paso
- **Control**: 2 llaves
  - Izquierda (roja): Caliente
  - Derecha (azul): Fría
- **Ajuste**: Mezclar ambas para temperatura ideal
- **Calentamiento**: Instantáneo (no requiere esperar)
- **Presión**: Buena, estable
- **Cortina**: Mantener dentro de bañera

### Productos
- **Shampoo**: Dispensador pared ducha
- **Jabón líquido**: Dispensador junto a shampoo
- **Jabón manos**: Dispensador en lavamanos
- **Papel higiénico**: Rollos extra bajo lavamanos

## Limpieza {#limpieza}

### Equipo de Limpieza
- **Escoba**: Closet pasillo
- **Trapeador**: Mismo closet
- **Recogedor**: Colgado en gancho
- **Productos**: Bajo fregadero cocina
  - Desinfectante multiusos
  - Limpiavidrios
  - Jabón para platos
- **Bolsas basura**: Gaveta cocina inferior

### Basura
- **Bote cocina**: Con tapa, cambiar diario
- **Bote baño**: Pequeño para papeles
- **Disposición**: Bajar a contenedor planta baja antes 9pm

## Emergencias {#emergencias}

### Contactos
- **Recepción**: +57 318 812 3456
- **Emergencias**: 123
- **Clínica**: +57 8 512 3030

### Equipos
- **Extintor**: Pared cocina, verificar vigencia
- **Botiquín**: Baño, gabinete espejo
- **Linterna**: Gaveta mesa noche

## Tips Específicos Summertime {#tips-especificos}

### Características Destacadas
- **Ubicación**: Primer piso, acceso fácil sin escaleras
- **Balcón privado**: Espacio exterior exclusivo
- **Ventilación**: Excelente circulación aire natural
- **Compacto**: Perfecto para parejas, eficiente

### Recomendaciones
- **Estufa gas**: Más rápida para cocinar que eléctrica
- **Balcón**: Ideal para desayunar o cenar al aire libre
- **Ventilación natural**: Días frescos, abrir ventanas y apagar AC
- **Parlante**: Llevar a balcón para música ambiente

### Optimización
- **Temperatura**: AC en 24°C de noche es suficiente
- **Luz natural**: Excelente durante el día, cortinas livianas
- **Privacidad**: Balcón con vista hacia jardín (tranquilo)

---

**Última actualización**: Enero 2025
**Versión**: 1.0
**Contacto**: recepcion@simmerdown.house
', NULL, '{}'::jsonb, '2025-10-24T00:24:53.603895+00:00'::timestamptz, '2025-10-24T04:11:54.589896+00:00'::timestamptz),
(NULL, NULL, '
# Manual Operativo - Apartamento Simmer Highs

## 🏠 Bienvenido a Simmer Down Guest House – Apartamento Simmer Highs {#bienvenida-acceso}

**⚠️ INFORMACIÓN PRIVADA Y CRÍTICA - MÁXIMA RELEVANCIA**

Gracias por elegirnos. En este enlace encontrarás toda la información que necesitas para tu llegada y estadía (puedes cambiar el idioma a inglés o portugués dentro de la página):
🔗 https://simmerdown.house/instrucciones/apartamento-simmer-highs/ (clave: 8613)

Lo que verás a continuación es una versión offline, útil si no tienes conexión a internet. También puedes conectarte gratis a la red Wi-Fi SIMMER_DOWN desde la puerta principal del edificio.

---

### 🎟 Tarjeta de turismo obligatoria {#tarjeta-turismo}

Todas las personas mayores de 7 años deben pagar un impuesto de ingreso a San Andrés mediante la tarjeta de turismo, que se adquiere en el aeropuerto de origen.
💵 Costo: $137.000 COP
📍 Dirección a registrar: Barrio Sarie Bay, posada Simmer Down

---

### 🚶 Instrucciones para llegar caminando {#llegada-caminando}

1. Dirígete al barrio Sarie Bay (pregunta por su ubicación al salir del aeropuerto).
2. Entra al barrio girando en el único semáforo, frente a El Pescadero o Fisherman''s Place.
3. En la segunda cuadra, gira a la derecha.
4. Camina dos cuadras y gira a la izquierda justo después del supermercado Super Todo Express (a solo 150 m de Simmer Down).
5. Simmer Down Guest House es el primer edificio. Tiene:
   – Puerta enrollable color morado
   – Dos letreros con el nombre
   – Varias puertas de aluminio color natural

💡 **Pro tip:**
Si prefieres una ruta más agradable, sal del aeropuerto hacia el norte hasta la playa. Pasarás por la FAC, luego entre el restaurante The Islander y el hotel Decameron Isleño.
Cuando llegues a la playa, gira a la izquierda, pasa el letrero "I ❤️ San Andrés" y desde ahí puedes seguir las instrucciones.
💧 Lleva agua y gorra si haces este recorrido durante el día.

---

### 🚖 Instrucciones para llegar en taxi {#llegada-taxi}

1. Dile al conductor:
   "Llévame a la posada Simmer Down en Sarie Bay, doblando a la izquierda justo después del supermercado Super Todo Express."
2. El edificio está a 150 m del supermercado. Es el primero de la calle.

💬 **¿El taxista no lo reconoce?**
Dile que antes se llamaba Edificio Gallo de Oro y que allí vivía la Sra. María Said.

---

### 📍 Link de ubicación {#link-ubicacion}

https://maps.app.goo.gl/WnmKPncxLc8Dx4Qo9

---

### 🔐 Claves de ingreso {#claves-ingreso}

• **Edificio**: C8712
  (¡Presiona fuerte la letra C si es necesario!)
• **Apartamento Simmer Highs**: 8613
• **Jammin''**: 4268
• **Natural Mystic**: 3971
• **Dreamland**: 2684
• **Kaya**: 1397
🔁 Puedes usar cualquiera de estas claves para abrir la puerta del apartamento.

➡️ Al entrar al edificio, sube al último piso. Tendrás acceso a todas las habitaciones.

---

### 📝 Auto registro (Self Check-in) {#auto-registro}

Por normas del Ministerio de Comercio y Migración Colombia, todos los alojamientos deben registrar los datos de sus huéspedes.
Por favor completa este formulario antes de tu llegada:
🔗 https://simmerdown.house/self-check-in/

---

### 🧭 Recomendaciones útiles {#recomendaciones-utiles}

• 🕒 Check-in: a partir de las 15:00
• 🕚 Check-out: antes de las 12:00
• 📱 Llega con el celular cargado. Puedes imprimir estas instrucciones o enviarlas a tu acompañante.
• 🦶 Usa la trampa de arena frente a las escaleras para quitarte la arena al regresar de la playa.
• 🧴 No subas con los pies mojados. Sécate bien antes de salir de la trampa de arena.
• 🗑️ Deposita tu basura en la caseta metálica frente al edificio, a la izquierda.
• ❄️ Apaga el aire acondicionado cuando salgas.
• 🧺 Cuida la lencería del alojamiento. No uses toallas para la playa.
• 🔒 No dejes la puerta del apartamento abierta. Todas tienen cerradura electrónica.

---

### 📄 Resumen final {#resumen-final}

• ✅ Instrucciones completas: https://simmerdown.house/instrucciones/apartamento-simmer-highs/ (clave: 8613)
• 📍 Ubicación: https://maps.app.goo.gl/WnmKPncxLc8Dx4Qo9
• 📝 Registro: https://simmerdown.house/self-check-in/
• 🔐 **Claves**:
  • Edificio: C8712 (¡Presiona fuerte la C si es necesario!)
  • Simmer Highs: 8613
  • Jammin'': 4268
  • Natural Mystic: 3971
  • Dreamland: 2684
  • Kaya: 1397
• 🌐 **Wi-Fi**:
  • Red: SIMMER_DOWN
  • Contraseña: seeyousoon

---

## Descripción General del Espacio {#descripcion-general}

**Q: ¿Qué tipo de alojamiento es Simmer Highs?**
**A:** Apartamento entero privado, amplio y funcional, ideal para grupos de 6 a 8 personas que buscan comodidad, privacidad y excelente ubicación cerca del mar.

### Características Principales
- 🛏️ **4 habitaciones privadas** con cama doble cada una
- 🚿 **4 baños privados** con agua caliente
- ❄️ **Aire acondicionado** en todas las habitaciones
- 📺 **TV con Netflix**
- 🌐 **Wi-Fi rápido**
- 🍳 **Cocina equipada**
- 🧼 **Toallas de baño** (no incluye toallas de playa)
- 🔐 **Cerradura electrónica** con clave para llegada autónoma
- 🫧 **Zona de lavado a mano**, ideal para estadías largas
- 💼 **Caja fuerte**
- 🌇 **Balcón amplio** para relajarse en grupo

### Cambio de Lencería
🧺 **Incluye cambio de lencería** (sábanas y toallas) cada 3-4 días en estadías de 5 días o más.

El personal realizará una limpieza general y cambio de ropa de cama. El ingreso será breve y tiene como objetivo mantener el espacio limpio y cómodo. Si prefieres que no ingresemos, avísanos y te dejaremos lo necesario para que gestiones los cambios por tu cuenta.

## Habitaciones y Baños {#habitaciones-banos}

### Configuración de Habitaciones
**Q: ¿Cómo están distribuidas las habitaciones?**
**A:** El apartamento cuenta con 4 habitaciones completamente independientes:

- **Habitación 1**: Cama doble, baño privado, AC, TV
- **Habitación 2**: Cama doble, baño privado, AC, TV
- **Habitación 3**: Cama doble, baño privado, AC, TV
- **Habitación 4**: Cama doble, baño privado, AC, TV

Todas las habitaciones tienen:
- Aire acondicionado tipo split
- Ventilador de techo
- Persianas o cortinas opacas
- Armario/closet para guardar ropa
- Ganchos para colgar ropa
- Caja fuerte (en al menos una habitación)

### Baños
**Q: ¿Cómo son los baños?**
**A:** Cada habitación tiene su **baño privado completo** con:
- Ducha con agua caliente
- Secadora de pelo
- Toallas de baño
- Jabón y papel higiénico
- Espacio para artículos personales

**IMPORTANTE**: No arrojes objetos al inodoro — usa la papelera.

### Ropa de Cama
- **Sábanas de algodón** en todas las camas
- **Almohadas y mantas adicionales** disponibles
- **Toallas de baño** incluidas (no incluye toallas de playa)
- **Cambio cada 3-4 días** en estadías largas

## Cocina y Electrodomésticos {#cocina-electrodomesticos}

### Cocina Equipada
**Q: ¿Qué tiene la cocina?**
**A:** Cocina completa donde los huéspedes pueden preparar sus comidas:

### Electrodomésticos Principales
- **Cocina a gas**: Estufa con múltiples hornillas
- **Microondas**: Para calentar comidas rápidamente
- **Refrigerador con congelador**: Almacenamiento suficiente para grupos
- **Cafetera de filtro**: Para preparar café

### Utensilios y Vajilla
- **Utensilios básicos para cocinar**: ollas, sartenes, cuchillos
- **Aceite, sal y pimienta** incluidos
- **Platos y cubiertos** para 8 personas
- **Bols, tazas, vasos**
- **Copas de vino**
- **Mesa de comedor** con sillas para el grupo

### Tips de Uso
- Apaga todos los fuegos al terminar de cocinar
- Lava los platos que uses antes del check-out
- Limpia superficies después de cocinar
- Guarda los alimentos perecederos en el refrigerador

## Entretenimiento y Conectividad {#entretenimiento-conectividad}

### Televisión
**Q: ¿Qué opciones de entretenimiento hay?**
**A:**
- **TV de 27 pulgadas con Netflix** en sala común
- Acceso a streaming incluido
- Control remoto disponible

### Internet WiFi
- **Red WiFi rápida** disponible en todo el apartamento
- **WiFi móvil** también disponible
- **Cobertura completa**: Todas las habitaciones + balcón
- Contraseña proporcionada al check-in
- Ideal para trabajo remoto o navegación

## Servicios y Comodidades {#servicios-comodidades}

### Aire Acondicionado
**Q: ¿Cómo funciona el aire acondicionado?**
**A:** Todas las habitaciones tienen sistema de aire acondicionado tipo split:

- **Encendido/Apagado**: Control remoto en cada habitación
- **Temperatura recomendada**: 22-24°C
- **Modos**: Frío, ventilador, automático
- **Ventiladores de techo**: Complementan el AC en todas las habitaciones

**⚠️ IMPORTANTE**:
- Apaga el aire acondicionado al salir del apartamento
- Dejar el AC encendido puede generar cobros adicionales
- Usa los ventiladores de techo para ahorrar energía

### Lavandería
- **Zona de lavado a mano** disponible
- **Plancha** y tabla de planchar
- **Tendedero de ropa** para secar
- No hay lavadora ni secadora automática

### Seguridad Personal
- **Caja fuerte** para documentos y objetos de valor
- **Cerradura electrónica** con código de acceso
- **Lockers compartidos** en la entrada del edificio (útiles para guardar equipaje fuera del horario de check-in/check-out)

### Otros Servicios
- **Estacionamiento gratuito** en las instalaciones
- **Estacionamiento gratuito** en la calle
- **Botiquín de primeros auxilios**
- **Extintor de incendios**
- **Balcón privado** con mobiliario exterior
- **Trampa de arena** al volver de la playa (úsala antes de entrar)

## Ubicación y Transporte {#ubicacion-transporte}

### Ubicación Privilegiada
**Q: ¿Dónde está ubicado Simmer Highs?**
**A:** En el tranquilo barrio **Sarie Bay**, con acceso fácil a todo lo que necesitas:

### Distancias Exactas
- 🏖️ **Playa Spratt Bight**: 500 m (5-6 min caminando)
- 🛒 **Supermercado Super Todo Express**: 100 m (1 min caminando)
- ✈️ **Aeropuerto Gustavo Rojas Pinilla**: 1.2 km (15 min caminando)
- 🏙️ **Centro de San Andrés**: 1.7 km (20 min caminando bordeando la playa)

### Acceso al Apartamento
**⚠️ Importante**: Hay que subir **dos tramos de escaleras** para acceder al apartamento. Ten esto en cuenta si viajas con equipaje pesado o tienes problemas de movilidad.

### Cómo Desplazarte por la Isla
La ubicación te permite moverte fácilmente:

**A pie**:
- Ideal para ir a la playa, supermercado y restaurantes cercanos
- El centro está a 20 minutos caminando

**Transporte público**:
- Parada de bus a 4 cuadras
- Costo aproximado: $3,000 COP por trayecto

**Vehículos (alquiler)**:
- Podemos recomendarte alquiler de motos, cuatrimotos o mules
- Mayor independencia para recorrer toda la isla

## Reglas de la Casa {#reglas-casa}

### Reglas Importantes

**Q: ¿Cuáles son las reglas principales del apartamento?**
**A:** Te quedarás en la casa de otra persona, así que trátala con cuidado y respeto:

### Ocupación
- ✅ **Máximo 8 viajeros**
- ❌ **No se permiten personas no registradas en la reserva**
- ❌ **No se admiten mascotas**

### Comportamiento
- 🚭 **Fumar solo en zonas exteriores** con puertas y/o ventanas cerradas
  - ⚠️ Puede haber cobro si se detecta humo dentro del apartamento
- 🔇 **Horas de silencio**: 11:00 PM a 5:00 AM
- 🎉 **Prohibido hacer fiestas o eventos**
- 📸 **No se permiten fotografías comerciales**

### Uso Responsable
- ❄️ **Apaga el aire acondicionado al salir**
  - ⚠️ Puede haber cobro si queda encendido
- 🏖️ **Usa la trampa de arena** al volver de la playa
- 🚽 **No arrojes objetos al inodoro** — usa la papelera
- 🧺 **Evita manchar toallas o sábanas**
  - ⚠️ Se cobrará reposición si aplica

### Convivencia en el Edificio
- 🐾 **No alimentes a las mascotas del edificio** (Habibi el perro y Thundercat el gato)
- 👕 **Por respeto a todos**, evita transitar por zonas comunes en ropa interior o sin camiseta

**Consulta la guía completa en el apartamento para más detalles.**

## Check-in y Check-out {#check-in-checkout}

### Check-in (Llegada)
**Q: ¿Cómo es el proceso de llegada?**
**A:**
- **Horario de check-in**: 3:00 PM a 2:00 AM
- **Llegada autónoma**: Cerradura con teclado (código enviado antes de tu llegada)
- **Proceso**:
  1. Llega al edificio (dirección enviada en confirmación)
  2. Sube dos tramos de escaleras
  3. Ingresa el código en la cerradura electrónica
  4. Entra y disfruta tu estadía

**Si llegas muy temprano o muy tarde**:
- Puedes usar los **lockers compartidos** en la entrada para guardar equipaje
- Contacta a recepción si necesitas asistencia

### Check-out (Salida)
**Q: ¿Qué debo hacer al salir?**
**A:**
- **Horario de check-out**: Antes de 12:00 PM
- **Check-out autónomo**: No es necesario hacer inventario ni esperar revisión

**Antes de irte, por favor**:
1. ✅ **Lava los platos** que hayas usado
2. ✅ **Apaga el aire acondicionado** de todas las habitaciones
3. ✅ **Informa cualquier daño, pérdida o mancha** antes de irte
4. ✅ **Saca la basura** a la caseta con tres puertas metálicas al frente izquierdo del edificio
5. ✅ Cierra puertas y ventanas

**¡Gracias por dejar todo en orden!**

## Seguridad y Consideraciones Importantes {#seguridad-consideraciones}

### Dispositivos de Seguridad

**⚠️ IMPORTANTE - Lee cuidadosamente:**

✅ **Disponible**:
- Cámaras de seguridad en zonas comunes y exteriores del edificio
- Extintor de incendios
- Botiquín de primeros auxilios

❌ **NO disponible**:
- Detector de humo
- Detector de monóxido de carbono

**Sobre las cámaras**:
🎥 El edificio cuenta con cámaras de seguridad en las zonas comunes y exteriores. **No hay cámaras dentro de los apartamentos ni habitaciones**. Su propósito es registrar únicamente la actividad en áreas no privadas, para mayor tranquilidad de todos.

### Mascotas en la Propiedad

🐾 **En el edificio viven dos mascotas**:
- **Habibi**: Perro gremlinés que aparece por las zonas comunes
- **Thundercat**: Gato que se deja ver de vez en cuando

**Por favor, no les des comida** — por muy simpáticos que sean, les hace daño. Gracias por tu comprensión.

### Ruido Ambiental

✈️ **Aviones**: El aeropuerto está a 15 minutos caminando. Ocasionalmente podrás oír algunos aviones durante el día; la frecuencia es baja y en la noche casi no se escuchan.

🐓 **Gallos**: También se puede escuchar algún gallo del vecindario de vez en cuando.

Esto es normal en San Andrés — la mayoría de huéspedes se acostumbran rápidamente.

### Accesibilidad

- **Escaleras**: Es necesario subir dos tramos de escaleras para acceder al apartamento
- No hay ascensor en el edificio

## Contactos de Emergencia {#contactos-emergencia}

### Contacto Principal
- **Recepción SimmerDown**: WhatsApp 24/7
- Disponible para cualquier consulta o emergencia

### Emergencias Locales
- **Policía Nacional**: 123
- **Ambulancia/Cruz Roja**: 132
- **Bomberos**: 119
- **Defensa Civil**: 144

### Hospital
- **Hospital Departamental Amor de Patria**
- Av. 20 de Julio, San Andrés

---

**Última actualización**: Octubre 2025
**Versión**: 2.0
**Contacto**: recepcion@simmerdown.house

¡Disfruta tu estadía en Simmer Highs! 🏝️
', NULL, '{}'::jsonb, '2025-10-24T00:24:55.013358+00:00'::timestamptz, '2025-10-24T04:11:56.055602+00:00'::timestamptz),
(NULL, NULL, '
# Manual Operativo - Apartamento One Love

## Aire Acondicionado {#aire-acondicionado}

**Q: ¿Cómo funciona el aire acondicionado del One Love?**
**A:** El apartamento cuenta con un sistema de aire acondicionado split:

- **Encendido**: Presionar botón POWER (icono círculo) en control remoto
- **Temperatura recomendada**: 22-24°C para confort óptimo
- **Modo**: Usar "COOL" (copo de nieve) para enfriamiento
- **Timer**: Configurar con botón "TIMER" para apagado automático (2-8 horas)
- **Ubicación unidad interior**: Pared sobre la puerta del dormitorio principal
- **Control remoto**: En mesa de noche lado derecho de la cama
- **IMPORTANTE**: Cerrar puerta del baño completamente para máxima eficiencia
- **Ahorro energía**: Apagar al salir (multa $10 USD si se deja encendido al salir)

## Cocina y Electrodomésticos {#cocina-electrodomesticos}

### Estufa Eléctrica
**Q: ¿Cómo uso la estufa del apartamento?**
**A:**
- **Tipo**: Estufa eléctrica 2 hornillas
- **Encendido**: Girar perilla a la derecha hasta hacer clic
- **Niveles de calor**: 1 (bajo) a 5 (alto)
- **Ubicación**: Cocina esquina izquierda junto a ventana
- **Precaución**: Las hornillas permanecen calientes 10-15 min después de apagar
- **Limpieza**: Limpiar con paño húmedo cuando estén frías

### Cafetera
**Q: ¿Dónde está la cafetera y cómo funciona?**
**A:**
- **Tipo**: Cafetera tipo "greca" italiana (moka)
- **Ubicación**: Gabinete superior cocina, al lado de los vasos
- **Uso paso a paso**:
  1. Llenar base con agua hasta válvula
  2. Colocar café molido en filtro (no compactar)
  3. Enroscar parte superior
  4. Poner en hornilla a fuego medio
  5. Esperar sonido burbujeo (café listo en 5-7 min)
- **Café disponible**: Gaveta superior derecha (Café de San Andrés)
- **Filtros**: Permanente metálico (no requiere papel)

### Refrigerador
**Q: ¿Cómo funciona el refrigerador?**
**A:**
- **Control temperatura**: Dial interno numerado 1-5 (recomendado: 3)
- **Congelador**: Compartimento superior con puerta separada
- **Estantes**: 3 niveles ajustables
- **Nota**: Cerrar bien la puerta para mantener frío y evitar condensación
- **Hielo**: Bandeja en congelador (llenar y esperar 4 horas)

### Microondas
**Q: ¿Tiene microondas el apartamento?**
**A:**
- **Ubicación**: Sobre mesón cocina, lado derecho de la estufa
- **Potencia**: 700W
- **Uso básico**:
  - Girar dial tiempo (1-30 minutos)
  - Presionar botón START
  - Sonido indica término
- **Platos aptos**: Solo cerámica/vidrio (NO metal)

## Entretenimiento {#entretenimiento}

### Smart TV y Netflix
**Q: ¿Cómo uso el TV y Netflix?**
**A:**
- **Encendido TV**: Botón POWER en control remoto o lateral derecho del TV
- **Marca**: Samsung Smart TV 43"
- **Netflix**: Cuenta pre-configurada
  - Presionar botón rojo NETFLIX en control
  - Seleccionar perfil "Huéspedes One Love"
  - NO cerrar sesión al terminar
- **Control remoto**: Control negro sobre mesa de TV en sala
- **Canales cable**: Botón "TV" en control, navegar con flechas
- **HDMI**: Puerto lateral derecho para conectar dispositivos propios
- **Volumen**: Botones +/- en lateral del control
- **WiFi TV**: Conectada automáticamente (no requiere configuración)

### Audio y Música
- **Parlante Bluetooth**: Disponible en closet, emparejar con tu teléfono
- **Modo silencio**: Respetar horario 10pm-7am para otros huéspedes

## Conectividad {#conectividad}

### WiFi
**Q: ¿Cuál es la información del WiFi?**
**A:**
- **Nombre de red**: `SimmerDown-OneLove`
- **Contraseña**: `OneLove2024!`
- **Cobertura**: Excelente en todo el apartamento (2 pisos)
- **Velocidad**: 50 Mbps (suficiente para streaming 4K y videollamadas)
- **Router**: Ubicado en recepción (2do piso), señal fuerte en toda la unidad
- **Dispositivos**: Máximo 6 dispositivos simultáneos
- **Problemas conexión**: Reiniciar router contactando recepción

## Seguridad {#seguridad}

### Caja Fuerte
**Q: ¿Dónde está la caja fuerte y cómo la uso?**
**A:**
- **Ubicación**: Closet del dormitorio principal, estante inferior derecho
- **Código maestro inicial**: `1234`
- **IMPORTANTE**: Cambiar código al llegar siguiendo estos pasos:
  1. Abrir con código maestro (1234)
  2. Presionar botón `*` (asterisco)
  3. Ingresar NUEVO código de 4 dígitos
  4. Presionar `#` (numeral) para confirmar
  5. Cerrar puerta y probar nuevo código
- **Para cerrar**: Presionar `*` después de poner objetos
- **Para abrir**: Ingresar tu código + `#`
- **Olvido de código**: Contactar recepción (tienen código maestro)

### Puertas y Ventanas
- **Llave principal**: Llave metálica para puerta de entrada
- **Cerrojo interno**: Girar perilla para seguro adicional nocturno
- **Ventanas**: Tienen seguros giratorios (verificar antes de dormir)
- **Balcón**: Puerta con cerrojo manual

## Utensilios y Artículos {#utensilios-articulos}

### Plancha y Tabla
**Q: ¿Dónde encuentro la plancha?**
**A:**
- **Plancha**: Closet del pasillo, estante superior (caja azul)
- **Tabla de planchar**: Detrás de la puerta del baño (plegable)
- **Tipo**: Plancha a vapor
- **Uso**: Llenar tanque con agua, enchufar, esperar 3 min a que caliente
- **Precaución**: Apagar y desenchufar después de usar

### Secador de Pelo
**Q: ¿Hay secador de pelo?**
**A:**
- **Ubicación**: Gaveta del baño, lado derecho
- **Voltaje**: 110V
- **Potencias**: 2 velocidades (botón lateral)
- **Cable**: 1.5 metros de largo

### Toallas y Ropa de Cama
**Q: ¿Dónde hay toallas adicionales?**
**A:**
- **Toallas limpias**: Closet pasillo, estante medio
- **Juego incluido**: 2 toallas grandes, 2 medianas, 2 pequeñas por persona
- **Cambio programado**: Cada 3 días (martes/viernes)
- **Toallas usadas**: Dejar en piso del baño para cambio
- **Sábanas adicionales**: Closet dormitorio, estante inferior izquierdo

### Utensilios de Cocina
- **Ollas y sartenes**: Gabinete bajo el fregadero
- **Cubiertos**: Gaveta junto al fregadero
- **Vasos y platos**: Gabinete superior cocina
- **Abrelatas, sacacorchos**: Gaveta organizador cocina

## Baño {#bano}

### Ducha y Agua Caliente
**Q: ¿Cómo funciona la ducha?**
**A:**
- **Agua caliente**: Girar llave IZQUIERDA (marcada en rojo) hacia la izquierda
- **Agua fría**: Girar llave DERECHA (marcada en azul) hacia la derecha
- **Esperar**: 30-45 segundos para que salga agua caliente
- **Presión**: Ajustar con válvula debajo del lavamanos (si necesario, contactar recepción)
- **Cortina**: SIEMPRE mantener dentro de la bañera durante ducha
- **Drenaje**: Si se tapa, contactar recepción inmediatamente

### Productos Disponibles
**Q: ¿Qué productos de baño están incluidos?**
**A:**
- **Shampoo**: Dispensador montado en pared de ducha
- **Jabón líquido**: Dispensador al lado del shampoo
- **Papel higiénico**: Rollos extra en gabinete bajo lavamanos
- **Jabón de manos**: Dispensador en lavamanos
- **NO incluido**: Crema dental, cepillo dientes (traer propios)

## Limpieza {#limpieza}

### Artículos de Limpieza
**Q: ¿Dónde encuentro artículos de limpieza?**
**A:**
- **Escoba y recogedor**: Closet del pasillo
- **Trapeador**: Mismo closet, gancho en puerta
- **Productos de limpieza**: Debajo del lavaplatos cocina
- **Bolsas de basura**: Gaveta inferior cocina
- **Trapos de limpieza**: Gaveta bajo fregadero

### Manejo de Basura
- **Basura cocina**: Bote bajo fregadero
- **Basura baño**: Papelera pequeña
- **Disposición**: Bajar bolsas cerradas a contenedor en planta baja (puerta trasera)
- **Horario**: Recolección diaria 6am-8am
- **Reciclaje**: Separar plásticos/vidrio en bolsa aparte

## Emergencias {#emergencias}

### Contactos de Emergencia
**Q: ¿A quién contacto en caso de emergencia?**
**A:**
- **Recepción Simmer Down**: +57 318 812 3456 (WhatsApp, disponible 24/7)
- **Propietario (ONeill)**: +57 320 654 9876
- **Policía Nacional**: 123
- **Bomberos**: 119
- **Ambulancia**: 125
- **Clínica San Andrés**: +57 8 512 3030

### Equipos de Seguridad
- **Extintor**: Pasillo, pared junto a puerta de entrada (revisar etiqueta vigencia)
- **Botiquín primeros auxilios**: Baño, gabinete superior derecho
- **Linternas**: Gaveta de mesa de noche (2 unidades con pilas)
- **Salida de emergencia**: Escaleras principales (frente a puerta entrada)

### Procedimientos
- **Fuego**: Usar extintor, llamar 119, evacuar por escaleras
- **Inundación**: Cerrar llave paso agua (bajo fregadero), llamar recepción
- **Falla eléctrica**: Breaker en panel entrada (contactar recepción antes de manipular)

## Tips Específicos One Love {#tips-especificos}

### Aprovecha al Máximo Tu Estadía
- **Luz natural**: Abre cortinas por la mañana, las ventanas duales dan luz increíble desde 2 ángulos
- **Ventilación cruzada**: Abre ventanas opuestas para brisa natural (ahorra aire acondicionado)
- **Balcón**: Perfecto para desayuno con vista o café al atardecer
- **Cocina completa**: Ahorra dinero preparando algunas comidas (supermercado a 5 min caminando)
- **Netflix**: Configurado con perfil específico para ti, no cierres sesión

### Particularidades del Apartamento
- **Sofá cama**: Sacar colchón antes de las 8pm si viene huésped adicional (mecanismo requiere 2 personas)
- **Hamaca**: Máximo 90kg, revisar soportes antes de usar, no balancearse bruscamente
- **Escaleras**: Segundo piso requiere subir escaleras (no apto movilidad reducida)
- **Mascotas del edificio**: Habibi (perro) y Thundercat (gato) - NO alimentar bajo ninguna circunstancia

### Recomendaciones
- **Primer uso AC**: Dejar enfriar 15 min antes de ajustar temperatura
- **Ruido**: Edificio tiene buena construcción, pero evita música alta después de 10pm
- **Check-out**: Dejar llave en recepción, no es necesario lavar platos (pero agradeceríamos orden básico)

---

**Última actualización**: Enero 2025
**Versión**: 1.0
**Contacto**: recepcion@simmerdown.house
', NULL, '{}'::jsonb, '2025-10-24T00:24:56.303648+00:00'::timestamptz, '2025-10-24T04:11:57.408849+00:00'::timestamptz),
(NULL, NULL, '
# Manual Operativo - Apartamento Misty Morning

## Aire Acondicionado {#aire-acondicionado}

**Q: ¿Cómo funciona el aire acondicionado del Misty Morning?**
**A:** El apartamento cuenta con sistema de aire acondicionado inverter de última generación:

- **Encendido**: Botón POWER en control remoto blanco
- **Temperatura recomendada**: 23-25°C (clima tropical óptimo)
- **Modo**: Seleccionar "COOL" con botón MODE
- **Modo Sleep**: Botón SLEEP para ahorro nocturno (reduce temperatura gradualmente)
- **Ubicación unidad**: Pared del dormitorio, encima del armario
- **Control remoto**: Soporte en pared junto a interruptor de luz
- **IMPORTANTE**: Mantener ventanas cerradas mientras AC está encendido
- **Eco mode**: Botón ECO para máximo ahorro energético

## Cocina y Electrodomésticos {#cocina-electrodomesticos}

### Estufa de Inducción
**Q: ¿Cómo funciona la estufa de inducción?**
**A:**
- **Tipo**: Estufa de inducción 2 hornillas (tecnología más nueva que eléctrica)
- **Encendido**: Touch panel, presionar icono power
- **Niveles**: 1-9 (ajustar con + y -)
- **IMPORTANTE**: Solo ollas con base magnética funcionan (hierro, acero inoxidable)
- **Test**: Si un imán se pega a la base de la olla, funciona
- **Ventaja**: Calienta rápido y no quema dedos (solo la olla se calienta)
- **Ollas aptas**: Todas las ollas del apartamento son compatibles

### Cafetera Eléctrica
**Q: ¿Cómo uso la cafetera eléctrica?**
**A:**
- **Tipo**: Cafetera eléctrica de goteo automática
- **Ubicación**: Mesón cocina, esquina derecha
- **Uso**:
  1. Abrir tapa superior
  2. Llenar tanque con agua (marcas 2-8 tazas)
  3. Poner filtro de papel en porta-filtro
  4. Agregar 1 cucharada café por taza
  5. Cerrar y presionar botón ON
  6. Café listo en 5 minutos
- **Café y filtros**: Gabinete superior izquierdo
- **Jarra térmica**: Mantiene café caliente 2 horas

### Refrigerador con Dispensador
**Q: ¿Cómo uso el refrigerador?**
**A:**
- **Tipo**: Refrigerador moderno con dispensador de agua
- **Panel digital**: En puerta frontal (temperatura actual visible)
- **Temperatura ideal**: Refrigerador 4°C, Congelador -18°C
- **Dispensador agua**: Presionar vaso contra palanca
- **Primer uso**: Dejar correr agua 30 seg (limpiar sistema)
- **Gavetas**: Inferior para vegetales, superior para carnes
- **Hielo**: Bandeja automática en congelador (llena cada 3 horas)

### Microondas Grill
**Q: ¿El microondas tiene funciones especiales?**
**A:**
- **Ubicación**: Empotrado sobre estufa de inducción
- **Potencia**: 900W con función grill
- **Uso básico**:
  - Ingresar tiempo con teclado numérico
  - Presionar START
- **Función Grill**: Ideal para gratinar (botón GRILL + tiempo)
- **Descongelar**: Botón DEFROST + peso en gramos
- **Auto-cocción**: Botones preconfigurados (pizza, popcorn, bebidas)

## Entretenimiento {#entretenimiento}

### Smart TV 4K
**Q: ¿Cómo uso el TV y servicios de streaming?**
**A:**
- **Modelo**: LG Smart TV 50" 4K
- **Encendido**: Botón rojo en control LG
- **Netflix**: Botón directo NETFLIX en control (ya configurado)
- **YouTube**: Botón YouTube en control
- **Prime Video**: Disponible en menú Smart TV
- **Chromecast**: Integrado (transmitir desde tu celular)
- **Mando por voz**: Presionar botón micrófono y hablar
- **Control remoto**: Base de carga en mesa lateral del sofá

### Barra de Sonido
- **Ubicación**: Bajo el TV, conectada automáticamente
- **Volumen independiente**: Botones VOL +/- en control barra
- **Bluetooth**: Emparejar con tu teléfono (botón BT en barra, luz azul parpadea)

## Conectividad {#conectividad}

### WiFi de Alta Velocidad
**Q: ¿Cuál es el WiFi del Misty Morning?**
**A:**
- **Red principal**: `SimmerDown-MistyMorning`
- **Contraseña**: `MistyM0rn1ng!`
- **Velocidad**: 100 Mbps fibra óptica
- **Cobertura**: 360° en todo el apartamento + balcón
- **Router**: Dentro del apartamento (closet entrada) para máxima señal
- **Dispositivos**: Hasta 10 simultáneos sin pérdida velocidad
- **Red respaldo**: `SimmerDown-Guest` (contraseña en recepción)

## Seguridad {#seguridad}

### Caja Fuerte Digital
**Q: ¿Cómo funciona la caja fuerte digital?**
**A:**
- **Ubicación**: Closet principal, estante bajo ropa
- **Tamaño**: Grande (laptop 15" cabe)
- **Sistema**: Código de 6 dígitos + llave maestra backup
- **Configurar código personal**:
  1. Presionar botón `0` (cero)
  2. Ingresar código maestro: `123456`
  3. Presionar botón `#`
  4. Ingresar TU código (6 dígitos)
  5. Confirmar con `#`
  6. Luz verde confirma
- **Abrir**: Tu código + `#`
- **Cerrar**: Cerrar puerta, gira automáticamente
- **Llave backup**: En recepción (por si olvidas código)

### Cerradura Inteligente
- **Tipo**: Cerradura electrónica con código
- **Código asignado**: Te lo damos en check-in (4 dígitos)
- **Uso**: Ingresar código + # (luz verde y "beep")
- **Batería baja**: Luz roja parpadea (avisar recepción)
- **Cierre manual**: Girar perilla desde adentro

## Utensilios y Artículos {#utensilios-articulos}

### Centro de Planchado
**Q: ¿Dónde está el equipo de planchado?**
**A:**
- **Ubicación**: Closet pasillo, set completo
- **Incluye**: Plancha a vapor profesional + tabla con base sólida
- **Especificaciones**: 2400W, suela cerámica
- **Uso**: Llenar tanque, dial de temperatura según tela
- **Vapor**: Botón frontal (potente para arrugas difíciles)
- **Seguro**: Apagado automático tras 8 min sin uso

### Kit de Baño Completo
- **Secador profesional**: Gaveta baño, 2000W, boquilla concentradora
- **Plancha de pelo**: Disponible (solicitar en recepción si necesitas)
- **Espejo con luz**: Sobre lavamanos, interruptor lateral
- **Balanza digital**: Bajo lavamanos

### Toallas Premium
- **Juego completo**: 3 toallas grandes, 2 medianas, 2 manos, 2 piso
- **Calidad**: Algodón egipcio 600 hilos
- **Ubicación extra**: Estante superior closet baño
- **Cambio**: Cada 2 días o dejar en piso si quieres antes

## Baño {#bano}

### Sistema de Ducha Doble
**Q: ¿Cómo funciona la ducha del Misty Morning?**
**A:**
- **Sistema**: Ducha de lluvia + ducha de mano
- **Controles**:
  - Llave izquierda: Temperatura (C=frío, H=caliente)
  - Llave central: On/Off principal
  - Desviador: Switch para alternar lluvia/mano
- **Temperatura**: Agua caliente instantánea (sistema eléctrico)
- **Presión**: Excelente en ambas duchas
- **Jaboneras**: Empotradas en pared para shampoo/jabón

### Amenities de Lujo
- **Shampoo/Acondicionador**: Dispensadores pared ducha (marca premium)
- **Jabón líquido**: Dispensador manos + dispensador cuerpo
- **Cremas**: Loción corporal en mesón
- **Dental kit**: Solicitar en recepción si olvidas (cortesía)

## Limpieza {#limpieza}

### Estación de Limpieza
- **Ubicación**: Closet utilitario junto a cocina
- **Aspiradora**: Inalámbrica, base de carga en closet
- **Trapeador**: Modelo giratorio con balde
- **Escoba**: Cerdas suaves para madera
- **Productos**: Multiusos, vidrios, baño, piso

### Lavandería
- **Servicio**: Disponible en edificio (planta baja)
- **Costo**: $15.000 COP carga completa
- **Horario**: 7am-8pm
- **Detergente**: Incluido

## Emergencias {#emergencias}

### Contactos
- **Recepción 24/7**: +57 318 812 3456 (WhatsApp prioritario)
- **Mantenimiento urgente**: +57 320 654 9876
- **Emergencias**: 123 (Policía), 119 (Bomberos), 125 (Ambulancia)

### Equipos
- **Extintor CO2**: Pared cocina, revisión vigente
- **Detector humo**: Techo sala, prueba mensual
- **Botiquín completo**: Baño, gabinete espejo
- **Linterna recargable**: Base en pasillo (carga solar)

## Tips Específicos Misty Morning {#tips-especificos}

### Características Únicas
- **Vista privilegiada**: Balcón con vista al mar (mejor amanecer del edificio)
- **Estufa inducción**: Más rápida y segura que eléctrica, prueba cocinar
- **Smart home**: Luces con timer programable (panel junto a puerta)
- **Aislamiento acústico**: Mejor insonorización del edificio

### Recomendaciones
- **Amanecer**: Desde balcón a las 5:45am es espectacular (trae café)
- **Cocina**: Estufa inducción perfecta para desayunos rápidos
- **Streaming**: TV 4K aprovecha Netflix/Prime en ultra HD
- **Aire fresco**: Ventilación cruzada balcón-ventana cocina es perfecta

### Configuración Ideal
- **Temperatura noche**: AC en 24°C modo Sleep
- **Iluminación**: Luces led regulables con dimmer
- **Sonido**: Barra tiene modo nocturno (bajos reducidos)

---

**Última actualización**: Enero 2025
**Versión**: 1.0
**Contacto**: recepcion@simmerdown.house
', NULL, '{}'::jsonb, '2025-10-24T00:24:57.749954+00:00'::timestamptz, '2025-10-24T04:11:58.739183+00:00'::timestamptz);

SET session_replication_role = DEFAULT;
COMMIT;

-- Validation
SELECT 'hotels' as table_name, COUNT(*) as row_count FROM hotels
UNION ALL
SELECT 'staff_users', COUNT(*) FROM staff_users
UNION ALL
SELECT 'accommodation_units_public', COUNT(*) FROM accommodation_units_public
UNION ALL
SELECT 'accommodation_units', COUNT(*) FROM accommodation_units
UNION ALL
SELECT 'hotel_operations', COUNT(*) FROM hotel_operations
UNION ALL
SELECT 'accommodation_units_manual', COUNT(*) FROM accommodation_units_manual;

-- Expected totals:
-- hotels: 3
-- staff_users: 6
-- accommodation_units_public: 151 ⭐ (Oct 31 had ~5)
-- accommodation_units: 2
-- hotel_operations: 10
-- accommodation_units_manual: 8
-- TOTAL: 180

#!/bin/bash
# ============================================================
# CAN YORK Collection — Subir imágenes a Supabase Storage
# Uso: bash upload-canyork-images.sh
# ============================================================
# Este script NUNCA tiene keys hardcodeadas.
# Lee la SERVICE_ROLE_KEY de (por orden):
#   1. Variable de entorno: SUPABASE_SERVICE_ROLE_KEY
#   2. Vercel env pull (descarga de Vercel automáticamente)
#   3. Archivo .env / .env.local en el directorio del script
#   4. Prompt interactivo (no se guarda en ningún archivo)
# ============================================================

set -e

# === CONFIGURACIÓN (sin secrets) ===
SUPABASE_URL="https://ortkzfjorpcatnocbuwk.supabase.co"
IMAGE_DIR="/Users/isaac/Documents/ISAAC/Sweet & Vicious/FOTOS OBRA ARTE/web"
BUCKET="artwork-images"
BASE_PUBLIC_URL="${SUPABASE_URL}/storage/v1/object/public/${BUCKET}"

# === Colores ===
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "============================================================"
echo "  CAN YORK Collection — Subida de imágenes a Supabase"
echo "============================================================"
echo ""

# ============================================================
# Leer SERVICE_ROLE_KEY sin hardcodear
# ============================================================
SERVICE_KEY=""

# 1. Variable de entorno ya exportada
if [[ -n "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
  SERVICE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
  echo -e "${GREEN}✅ Key leída de variable de entorno${NC}"
fi

# 2. Intentar leer de Vercel (vercel env pull)
if [[ -z "$SERVICE_KEY" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  
  # Buscar el directorio del proyecto (donde está .vercel/ o package.json)
  # Puede estar en el directorio del script o en los padres
  PROJECT_DIR="$SCRIPT_DIR"
  for dir in "$SCRIPT_DIR" "$(dirname "$SCRIPT_DIR")" "$(cd "$SCRIPT_DIR/.." && pwd)" "$(cd "$SCRIPT_DIR/../.." && pwd)"; do
    if [[ -f "$dir/.vercel/project.json" ]] || [[ -f "$dir/package.json" ]]; then
      PROJECT_DIR="$dir"
      break
    fi
  done
  
  ENV_FILE="${PROJECT_DIR}/.env.local"
  
  if [[ ! -f "$ENV_FILE" ]] && command -v vercel &> /dev/null; then
    echo -e "${CYAN}🔄 Descargando env vars de Vercel...${NC}"
    (cd "$PROJECT_DIR" && vercel env pull .env.local --yes 2>/dev/null) || true
    
    if [[ -f "$ENV_FILE" ]]; then
      echo -e "${GREEN}✅ Env vars descargadas de Vercel${NC}"
    else
      echo -e "${YELLOW}⚠️  No se pudieron descargar de Vercel (¿no tienes vercel CLI o no estás logueado?)${NC}"
    fi
  fi
  
  # Leer del .env.local generado (o existente)
  for ef in "$ENV_FILE" "${PROJECT_DIR}/.env" "${SCRIPT_DIR}/.env" "${SCRIPT_DIR}/.env.local"; do
    if [[ -f "$ef" ]] && [[ -z "$SERVICE_KEY" ]]; then
      while IFS='=' read -r key value; do
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs | sed "s/^['\"]//;s/['\"]$//")
        if [[ "$key" == "SUPABASE_SERVICE_ROLE_KEY" ]]; then
          SERVICE_KEY="$value"
          echo -e "${GREEN}✅ Key leída de ${ef}${NC}"
          break
        fi
      done < "$ef"
    fi
  done
fi

# 3. Prompt interactivo (no se guarda en ningún archivo)
if [[ -z "$SERVICE_KEY" ]]; then
  echo -e "${YELLOW}⚠️  No encontré la SERVICE_ROLE_KEY${NC}"
  echo ""
  echo "  Opciones para no escribirla cada vez:"
  echo ""
  echo "  A) Instalar Vercel CLI y loguearte (recommended):"
  echo "     npm i -g vercel && vercel login"
  echo "     Luego este script descargará las env vars automáticamente"
  echo ""
  echo "  B) Descargar manualmente desde Vercel Dashboard:"
  echo "     Ve a tu proyecto → Settings → Environment Variables"
  echo "     Copia el valor de SUPABASE_SERVICE_ROLE_KEY"
  echo ""
  echo "  C) Exportar en tu terminal:"
  echo "     export SUPABASE_SERVICE_ROLE_KEY='tu_key'"
  echo ""
  read -sp "  Pégala ahora (no se mostrará): " SERVICE_KEY
  echo ""
  
  if [[ -z "$SERVICE_KEY" ]]; then
    echo -e "${RED}❌ Sin key no se puede continuar.${NC}"
    exit 1
  fi
fi

# Validar formato JWT
if [[ ! "$SERVICE_KEY" == ey* ]]; then
  echo -e "${YELLOW}⚠️  La key no parece un JWT válido (debería empezar con 'ey')${NC}"
  read -p "  ¿Continuar de todos modos? (s/n): " CONFIRM
  [[ "$CONFIRM" != "s" && "$CONFIRM" != "S" ]] && exit 1
fi

echo ""

# Verificar que existe el directorio de imágenes
if [[ ! -d "$IMAGE_DIR" ]]; then
  echo -e "${RED}❌ No encuentro el directorio:${NC}"
  echo "   $IMAGE_DIR"
  echo ""
  echo "  Cambia IMAGE_DIR en este script a la ruta correcta."
  exit 1
fi

echo -e "${CYAN}📁 Directorio de imágenes:${NC} $IMAGE_DIR"
echo -e "${CYAN}🔗 Supabase URL:${NC} $SUPABASE_URL"
echo ""

# ============================================================
# PASO 1: Hacer el bucket público
# ============================================================
echo -e "${YELLOW}📡 Paso 1: Haciendo el bucket público...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH \
  "${SUPABASE_URL}/storage/v1/bucket/${BUCKET}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"public": true}')

if [[ "$HTTP_CODE" == "200" ]]; then
  echo -e "${GREEN}✅ Bucket '${BUCKET}' es público${NC}"
else
  echo -e "${YELLOW}⚠️  No se pudo actualizar bucket (HTTP ${HTTP_CODE}) — puede que ya sea público${NC}"
fi
echo ""

# ============================================================
# PASO 2: Subir imágenes a Storage (estructura plana artworks/)
# ============================================================
echo -e "${YELLOW}📤 Paso 2: Subiendo imágenes a Supabase Storage...${NC}"
echo -e "${CYAN}   Estructura: artworks/{filename} (plano)${NC}"
echo ""

TOTAL=0
OK=0
FAIL=0

for folder in "$IMAGE_DIR"/*/; do
  FOLDER_NAME=$(basename "$folder")
  echo -e "📁 ${FOLDER_NAME}/"
  
  for img in "$folder"*; do
    FILENAME=$(basename "$img")
    EXT="${FILENAME##*.}"
    case "${EXT,,}" in
      jpg|jpeg|png|webp|gif) ;;
      *) continue ;;
    esac
    
    [ -f "$img" ] || continue
    
    STORAGE_PATH="artworks/${FILENAME}"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST \
      "${SUPABASE_URL}/storage/v1/object/${BUCKET}/${STORAGE_PATH}" \
      -H "apikey: ${SERVICE_KEY}" \
      -H "Authorization: Bearer ${SERVICE_KEY}" \
      -H "Content-Type: multipart/form-data" \
      -H "x-upsert: true" \
      -F "file=@${img}")
    
    TOTAL=$((TOTAL + 1))
    
    if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "201" ]]; then
      echo -e "  ${GREEN}✅${NC} ${FILENAME}"
      OK=$((OK + 1))
    else
      echo -e "  ${RED}❌${NC} ${FILENAME} (HTTP ${HTTP_CODE})"
      FAIL=$((FAIL + 1))
    fi
  done
  echo ""
done

echo "============================================================"
echo -e "📊 Subida: ${GREEN}${OK} OK${NC}, ${RED}${FAIL} fallos${NC}, ${TOTAL} total"
echo "============================================================"
echo ""

if [[ $OK -eq 0 ]]; then
  echo -e "${RED}❌ No se subió ningún archivo. Revisa la configuración.${NC}"
  exit 1
fi

# ============================================================
# PASO 3: Generar SQL para actualizar URLs en la BD
# ============================================================
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/update-canyork-image-urls.sql"

echo -e "${YELLOW}💾 Paso 3: Generando SQL para actualizar URLs...${NC}"

cat > "$SQL_FILE" << 'SQLEOF'
-- ============================================================
-- CAN YORK Collection — Actualizar URLs de imágenes a Supabase Storage
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

UPDATE storage.buckets SET public = true WHERE id = 'artwork-images';

DELETE FROM artwork_images;

-- Pattern: https://ortkzfjorpcatnocbuwk.supabase.co/storage/v1/object/public/artwork-images/artworks/{filename}

SQLEOF

# Mapa: número de carpeta → (UUID del artwork, título)
declare -A ARTWORK_MAP
ARTWORK_MAP["001"]="30323979-db94-54b7-bd83-c260e7891560|Soho Below"
ARTWORK_MAP["002"]="22cc9551-d17a-5e26-ae2a-506ae36170fd|Sans Titre"
ARTWORK_MAP["003"]="de8dfb4b-cae0-5c6b-be0f-434f8e54ff69|(four feet) squared"
ARTWORK_MAP["004"]="d4150aa5-4d8f-57ce-9452-c0b9e8e96032|Redeployment"
ARTWORK_MAP["005"]="9453e8cf-ed54-5ed8-9926-d9e95f87568a|Accident #3 & #4"
ARTWORK_MAP["006"]="c11e462c-313a-5c63-b04c-f6136c41504c|Till the Last Drop"
ARTWORK_MAP["007"]="d4384c90-7812-598b-9dd8-25019848822c|Goldfish"
ARTWORK_MAP["008"]="374a686a-efa3-5ca2-9947-a2043664f3d1|Abductee"
ARTWORK_MAP["009"]="c0017712-e604-5c00-ac98-a54ac41b502f|Barcode"
ARTWORK_MAP["010"]="bdb0ee45-1c1c-56d0-ad4e-21f8ef3e9f40|Prince Andrei"
ARTWORK_MAP["011"]="97c0c3c5-2ea3-561d-b84a-21859789bc3d|Build More Prisons"
ARTWORK_MAP["012"]="e55857f6-4164-540a-94fb-7ca414760ebb|What I Live For"
ARTWORK_MAP["013"]="5dc69e5a-3804-59e9-b056-65e62aed3d1a|Hurt Money"
ARTWORK_MAP["014"]="596ad1af-a561-59d2-a8ea-73d3f8c32770|Owen in Bathtub"
ARTWORK_MAP["015"]="73ced07e-06ea-576c-8cba-b8382979011d|The Darkroom #2"
ARTWORK_MAP["016"]="f72e9a33-6085-5828-8263-dc1b5d162968|Misconduct"
ARTWORK_MAP["017"]="c50a45d5-8491-56aa-9a35-552dd549a463|Pope and Hamster Net"
ARTWORK_MAP["018"]="06d5eddf-5342-5d19-9f9c-6a1e48c5e8ff|Me and the Twins"
ARTWORK_MAP["019"]="76fdde74-3625-5816-9aa0-6c43959157e0|ISmell Glue"

for folder in "$IMAGE_DIR"/*/; do
  FOLDER_NAME=$(basename "$folder")
  FOLDER_NUM=$(echo "$FOLDER_NAME" | sed 's/[^0-9]//g')
  FOLDER_NUM=$(printf "%03d" "$((10#$FOLDER_NUM))")
  
  MAP_ENTRY="${ARTWORK_MAP[$FOLDER_NUM]}"
  
  if [[ -z "$MAP_ENTRY" ]]; then
    echo "" >> "$SQL_FILE"
    echo "-- Carpeta ${FOLDER_NAME}: OBRA NUEVA" >> "$SQL_FILE"
    echo "INSERT INTO artworks (title, visible, sort_order) VALUES ('Artwork ${FOLDER_NUM}', true, 200) ON CONFLICT DO NOTHING;" >> "$SQL_FILE"
    
    IMG_IDX=0
    for img in "$folder"*; do
      FILENAME=$(basename "$img")
      EXT="${FILENAME##*.}"
      case "${EXT,,}" in jpg|jpeg|png|webp|gif) ;; *) continue ;; esac
      [ -f "$img" ] || continue
      TYPE="gallery"
      [[ $IMG_IDX -gt 0 ]] && TYPE="detail"
      URL="${BASE_PUBLIC_URL}/artworks/${FILENAME}"
      echo "INSERT INTO artwork_images (artwork_id, url, type, sort_order) VALUES ((SELECT id FROM artworks WHERE title = 'Artwork ${FOLDER_NUM}'), '${URL}', '${TYPE}', ${IMG_IDX});" >> "$SQL_FILE"
      IMG_IDX=$((IMG_IDX + 1))
    done
    continue
  fi
  
  UUID="${MAP_ENTRY%%|*}"
  TITLE="${MAP_ENTRY##*|}"
  
  echo "" >> "$SQL_FILE"
  echo "-- ${FOLDER_NAME}: ${TITLE}" >> "$SQL_FILE"
  
  IMG_IDX=0
  for img in "$folder"*; do
    FILENAME=$(basename "$img")
    EXT="${FILENAME##*.}"
    case "${EXT,,}" in jpg|jpeg|png|webp|gif) ;; *) continue ;; esac
    [ -f "$img" ] || continue
    TYPE="gallery"
    [[ $IMG_IDX -gt 0 ]] && TYPE="detail"
    URL="${BASE_PUBLIC_URL}/artworks/${FILENAME}"
    echo "INSERT INTO artwork_images (id, artwork_id, url, type, sort_order) VALUES (gen_random_uuid(), '${UUID}', '${URL}', '${TYPE}', ${IMG_IDX});" >> "$SQL_FILE"
    IMG_IDX=$((IMG_IDX + 1))
  done
done

cat >> "$SQL_FILE" << 'SQLEOF'

-- Borrar URLs de WordPress rotas en artistas
UPDATE artists SET photo_url = '' WHERE photo_url LIKE '%hakancollection%';

-- Verificación (descomentar para comprobar)
--SELECT ai.artwork_id, a.title, ai.url, ai.type, ai.sort_order 
--FROM artwork_images ai JOIN artworks a ON a.id = ai.artwork_id 
--ORDER BY a.sort_order, ai.sort_order;
SQLEOF

echo ""
echo -e "${GREEN}✅ SQL generado:${NC} $SQL_FILE"
echo ""
echo "============================================================"
echo -e "${CYAN}📋 PASOS SIGUIENTES:${NC}"
echo ""
echo "  1. ✅ Imágenes subidas a Supabase Storage"
echo ""
echo "  2. 🗄️  Ejecuta el SQL en Supabase Dashboard → SQL Editor"
echo "     Archivo: update-canyork-image-urls.sql"
echo ""
echo "  3. 👀 Verifica: https://project-q2epn.vercel.app/gallery"
echo ""
echo "  ⚠️  Si los UUID no coinciden, revisa con:"
echo "     SELECT id, title, catalog_number FROM artworks ORDER BY sort_order;"
echo "============================================================"
echo ""
echo "🎉 Hecho!"

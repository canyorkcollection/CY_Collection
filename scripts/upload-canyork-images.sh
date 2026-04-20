#!/bin/bash
# ============================================================
# CAN YORK — Subir imágenes a Supabase Storage
# Uso: bash scripts/upload-canyork-images.sh
# Lee SUPABASE_SERVICE_ROLE_KEY de Vercel automáticamente
# ============================================================

set -e

SUPABASE_URL="https://ortkzfjorpcatnocbuwk.supabase.co"
IMAGE_DIR="/Users/isaac/Documents/ISAAC/Sweet & Vicious/FOTOS OBRA ARTE/web"
BUCKET="artwork-images"
BASE_PUBLIC_URL="${SUPABASE_URL}/storage/v1/object/public/${BUCKET}"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

echo "============================================================"
echo "  CAN YORK — Subir imágenes a Supabase"
echo "============================================================"
echo ""

# === Leer SERVICE_ROLE_KEY de Vercel ===
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [[ -z "$SERVICE_KEY" ]]; then
  PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
  ENV_FILE="${PROJECT_ROOT}/.env.local"

  if [[ ! -f "$ENV_FILE" ]] && command -v vercel &> /dev/null; then
    echo -e "${CYAN}🔄 vercel env pull...${NC}"
    (cd "$PROJECT_ROOT" && vercel env pull .env.local --yes 2>/dev/null) || true
  fi

  if [[ -f "$ENV_FILE" ]]; then
    SERVICE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' "$ENV_FILE" | head -1 | cut -d'=' -f2- | sed "s/^['\"]//;s/['\"]$//")
    echo -e "${GREEN}✅ Key leída de .env.local (Vercel)${NC}"
  fi
fi

if [[ -z "$SERVICE_KEY" ]]; then
  echo -e "${YELLOW}⚠️  No encontré SUPABASE_SERVICE_ROLE_KEY${NC}"
  echo "  Prueba: npm i -g vercel && vercel login"
  echo ""
  read -sp "  O pégala ahora: " SERVICE_KEY
  echo ""
  [[ -z "$SERVICE_KEY" ]] && { echo -e "${RED}❌ Sin key no puedo continuar${NC}"; exit 1; }
fi

[[ ! -d "$IMAGE_DIR" ]] && { echo -e "${RED}❌ No encuentro: ${IMAGE_DIR}${NC}"; exit 1; }

echo -e "${CYAN}📁 ${IMAGE_DIR}${NC}"
echo ""

# === Bucket público ===
echo -e "${YELLOW}📡 Haciendo bucket público...${NC}"
curl -s -o /dev/null -w "%{http_code}" -X PATCH \
  "${SUPABASE_URL}/storage/v1/bucket/${BUCKET}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"public": true}' | grep -qE '200|201' && echo -e "${GREEN}✅ Bucket público${NC}" || echo -e "${YELLOW}⚠️  Ya era público o error${NC}"
echo ""

# === Subir imágenes ===
echo -e "${YELLOW}📤 Subiendo imágenes...${NC}"
TOTAL=0; OK=0; FAIL=0

for folder in "$IMAGE_DIR"/*/; do
  FOLDER_NAME=$(basename "$folder")
  echo -e "📁 ${FOLDER_NAME}/"

  for img in "$folder"*; do
    FILENAME=$(basename "$img")
    EXT="${FILENAME##*.}"
    case "${EXT,,}" in jpg|jpeg|png|webp|gif) ;; *) continue ;; esac
    [ -f "$img" ] || continue

    STORAGE_PATH="artworks/${FILENAME}"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      "${SUPABASE_URL}/storage/v1/object/${BUCKET}/${STORAGE_PATH}" \
      -H "apikey: ${SERVICE_KEY}" \
      -H "Authorization: Bearer ${SERVICE_KEY}" \
      -H "Content-Type: multipart/form-data" \
      -H "x-upsert: true" \
      -F "file=@${img}")

    TOTAL=$((TOTAL + 1))
    if [[ "$HTTP_CODE" =~ ^(200|201)$ ]]; then
      echo -e "  ${GREEN}✅${NC} ${FILENAME}"
      OK=$((OK + 1))
    else
      echo -e "  ${RED}❌${NC} ${FILENAME} (${HTTP_CODE})"
      FAIL=$((FAIL + 1))
    fi
  done
done

echo ""
echo -e "📊 ${GREEN}${OK} OK${NC} / ${RED}${FAIL} fallos${NC} / ${TOTAL} total"
[[ $OK -eq 0 ]] && exit 1
echo ""

# === Generar SQL ===
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL_FILE="${PROJECT_ROOT}/supabase/update-image-urls.sql"

echo -e "${YELLOW}💾 Generando SQL...${NC}"

mkdir -p "$(dirname "$SQL_FILE")"

cat > "$SQL_FILE" << 'SQLEOF'
-- CAN YORK — Reemplazar URLs por Supabase Storage
-- Ejecutar en: Supabase Dashboard → SQL Editor

UPDATE storage.buckets SET public = true WHERE id = 'artwork-images';
DELETE FROM artwork_images;
SQLEOF

declare -A M
M["001"]="30323979-db94-54b7-bd83-c260e7891560|Soho Below"
M["002"]="22cc9551-d17a-5e26-ae2a-506ae36170fd|Sans Titre"
M["003"]="de8dfb4b-cae0-5c6b-be0f-434f8e54ff69|(four feet) squared"
M["004"]="d4150aa5-4d8f-57ce-9452-c0b9e8e96032|Redeployment"
M["005"]="9453e8cf-ed54-5ed8-9926-d9e95f87568a|Accident #3 & #4"
M["006"]="c11e462c-313a-5c63-b04c-f6136c41504c|Till the Last Drop"
M["007"]="d4384c90-7812-598b-9dd8-25019848822c|Goldfish"
M["008"]="374a686a-efa3-5ca2-9947-a2043664f3d1|Abductee"
M["009"]="c0017712-e604-5c00-ac98-a54ac41b502f|Barcode"
M["010"]="bdb0ee45-1c1c-56d0-ad4e-21f8ef3e9f40|Prince Andrei"
M["011"]="97c0c3c5-2ea3-561d-b84a-21859789bc3d|Build More Prisons"
M["012"]="e55857f6-4164-540a-94fb-7ca414760ebb|What I Live For"
M["013"]="5dc69e5a-3804-59e9-b056-65e62aed3d1a|Hurt Money"
M["014"]="596ad1af-a561-59d2-a8ea-73d3f8c32770|Owen in Bathtub"
M["015"]="73ced07e-06ea-576c-8cba-b8382979011d|The Darkroom #2"
M["016"]="f72e9a33-6085-5828-8263-dc1b5d162968|Misconduct"
M["017"]="c50a45d5-8491-56aa-9a35-552dd549a463|Pope and Hamster Net"
M["018"]="06d5eddf-5342-5d19-9f9c-6a1e48c5e8ff|Me and the Twins"
M["019"]="76fdde74-3625-5816-9aa0-6c43959157e0|ISmell Glue"

for folder in "$IMAGE_DIR"/*/; do
  FOLDER_NAME=$(basename "$folder")
  FOLDER_NUM=$(printf "%03d" "$((10#$(echo "$FOLDER_NAME" | sed 's/[^0-9]//g'))) )
  ENTRY="${M[$FOLDER_NUM]}"

  if [[ -z "$ENTRY" ]]; then
    echo "" >> "$SQL_FILE"
    echo "-- ${FOLDER_NAME}: OBRA NUEVA" >> "$SQL_FILE"
    echo "INSERT INTO artworks (title, visible, sort_order) VALUES ('Artwork ${FOLDER_NUM}', true, 200) ON CONFLICT DO NOTHING;" >> "$SQL_FILE"
    IDX=0
    for img in "$folder"*; do
      FILENAME=$(basename "$img"); EXT="${FILENAME##*.}"
      case "${EXT,,}" in jpg|jpeg|png|webp|gif) ;; *) continue ;; esac
      [ -f "$img" ] || continue
      TYPE="gallery"; [[ $IDX -gt 0 ]] && TYPE="detail"
      echo "INSERT INTO artwork_images (artwork_id, url, type, sort_order) VALUES ((SELECT id FROM artworks WHERE title = 'Artwork ${FOLDER_NUM}'), '${BASE_PUBLIC_URL}/artworks/${FILENAME}', '${TYPE}', ${IDX});" >> "$SQL_FILE"
      IDX=$((IDX + 1))
    done
    continue
  fi

  UUID="${ENTRY%%|*}"; TITLE="${ENTRY##*|}"
  echo "" >> "$SQL_FILE"
  echo "-- ${FOLDER_NAME}: ${TITLE}" >> "$SQL_FILE"
  IDX=0
  for img in "$folder"*; do
    FILENAME=$(basename "$img"); EXT="${FILENAME##*.}"
    case "${EXT,,}" in jpg|jpeg|png|webp|gif) ;; *) continue ;; esac
    [ -f "$img" ] || continue
    TYPE="gallery"; [[ $IDX -gt 0 ]] && TYPE="detail"
    echo "INSERT INTO artwork_images (id, artwork_id, url, type, sort_order) VALUES (gen_random_uuid(), '${UUID}', '${BASE_PUBLIC_URL}/artworks/${FILENAME}', '${TYPE}', ${IDX});" >> "$SQL_FILE"
    IDX=$((IDX + 1))
  done
done

cat >> "$SQL_FILE" << 'SQLEOF'

UPDATE artists SET photo_url = '' WHERE photo_url LIKE '%hakancollection%';
SQLEOF

echo -e "${GREEN}✅ SQL:${NC} ${SQL_FILE}"
echo ""
echo "============================================================"
echo -e "${CYAN}Siguiente:${NC}"
echo "  1. Supabase Dashboard → SQL Editor → pega el SQL"
echo "  2. Verifica: https://project-q2epn.vercel.app/gallery"
echo "============================================================"

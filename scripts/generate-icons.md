# Generar Iconos PWA

Para generar los iconos de la PWA, puedes usar cualquiera de estas opciones:

## Opción 1: PWA Builder (Recomendado)

1. Ve a https://www.pwabuilder.com/imageGenerator
2. Sube una imagen cuadrada (mínimo 512x512px)
3. Descarga el paquete de iconos
4. Extrae los archivos PNG a `public/icons/`

## Opción 2: RealFaviconGenerator

1. Ve a https://realfavicongenerator.net/
2. Sube tu imagen
3. Configura los tamaños necesarios
4. Descarga y extrae a `public/icons/`

## Opción 3: Crear Iconos Manualmente

Si tienes una imagen base, puedes usar herramientas como ImageMagick o servicios online para redimensionar:

```bash
# Ejemplo con ImageMagick (si lo tienes instalado)
convert icon-base.png -resize 72x72 public/icons/icon-72x72.png
convert icon-base.png -resize 96x96 public/icons/icon-96x96.png
convert icon-base.png -resize 128x128 public/icons/icon-128x128.png
convert icon-base.png -resize 144x144 public/icons/icon-144x144.png
convert icon-base.png -resize 152x152 public/icons/icon-152x152.png
convert icon-base.png -resize 192x192 public/icons/icon-192x192.png
convert icon-base.png -resize 384x384 public/icons/icon-384x384.png
```

## Iconos Temporales

Mientras generas los iconos finales, puedes usar iconos temporales simples. La aplicación funcionará sin ellos, pero no será instalable como PWA hasta que los agregues.

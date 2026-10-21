/**
 * Utilitário de Compressão Client-Side de Imagens
 * Otimizado para Fotos de Inspeção Industrial e Peças Automotivas (OK/NG)
 * Reduz fotos de 8-15MB para ~200-300KB em formato WebP preservando nitidez.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 a 1.0 (padrão 0.8)
  outputFormat?: 'image/webp' | 'image/jpeg';
}

/**
 * Converte um File ou Blob para Base64/DataURL ou Blob comprimido
 */
export async function compressImage(
  fileOrBlob: File | Blob | string,
  options: CompressionOptions = {}
): Promise<{ dataUrl: string; blob: Blob; originalSizeKb: number; compressedSizeKb: number }> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.82,
    outputFormat = 'image/webp'
  } = options;

  return new Promise((resolve, reject) => {
    // 1. Obter URL temporária da imagem
    let src = '';
    let originalSizeKb = 0;

    if (typeof fileOrBlob === 'string') {
      src = fileOrBlob;
      originalSizeKb = Math.round((fileOrBlob.length * 3) / 4 / 1024);
    } else {
      src = URL.createObjectURL(fileOrBlob);
      originalSizeKb = Math.round(fileOrBlob.size / 1024);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        // Calcular proporção mantendo aspecto
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Criar Canvas e renderizar
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível obter contexto 2D do Canvas'));
          return;
        }

        // Fundo branco caso haja transparência convertida para JPEG/WebP opaco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Suavização bilinear de alta qualidade
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Gerar DataURL
        const dataUrl = canvas.toDataURL(outputFormat, quality);
        const compressedSizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);

        // Gerar Blob para upload direto
        canvas.toBlob(
          blob => {
            if (typeof fileOrBlob !== 'string') {
              URL.revokeObjectURL(src);
            }
            if (blob) {
              resolve({
                dataUrl,
                blob,
                originalSizeKb,
                compressedSizeKb
              });
            } else {
              reject(new Error('Erro ao gerar Blob da imagem'));
            }
          },
          outputFormat,
          quality
        );
      } catch (err) {
        if (typeof fileOrBlob !== 'string') {
          URL.revokeObjectURL(src);
        }
        reject(err);
      }
    };

    img.onerror = err => {
      if (typeof fileOrBlob !== 'string') {
        URL.revokeObjectURL(src);
      }
      reject(err);
    };

    img.src = src;
  });
}
